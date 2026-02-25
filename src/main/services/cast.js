// ─── Cast Service — mDNS discovery + Chromecast control via CASTv2 ───

import { Client, DefaultMediaReceiver } from 'castv2-client';
import { Bonjour } from 'bonjour-service';

const SCAN_INTERVAL_MS = 30_000; // Re-scan every 30s
const DEVICE_TTL_MS = 60_000; // Remove devices not seen for 60s

let bonjour = null;
let browser = null;
let devices = []; // { name, host, port, id, lastSeen }
let backgroundTimer = null;
let client = null;
let player = null;
let statusInterval = null;
let mainWindowRef = null;
let connectedDevice = null;

// ─── Discovery ───

function addOrUpdateDevice(service) {
  const id = service.txt?.id || `${service.name}-${service.port}`;
  const host = service.referer?.address || service.addresses?.[0];
  if (!host) return;

  const existing = devices.find((d) => d.id === id);
  if (existing) {
    existing.lastSeen = Date.now();
    return;
  }

  const device = {
    name: service.txt?.fn || service.name || 'Chromecast',
    host,
    port: service.port || 8009,
    id,
    lastSeen: Date.now()
  };

  devices.push(device);
  console.log(`[cast] discovered: ${device.name} @ ${device.host}:${device.port}`);
  emitDevices();
}

function pruneStaleDevices() {
  const before = devices.length;
  devices = devices.filter((d) => Date.now() - d.lastSeen < DEVICE_TTL_MS);
  if (devices.length < before) emitDevices();
}

function startBrowse() {
  if (browser) return;
  bonjour = new Bonjour();
  browser = bonjour.find({ type: 'googlecast' }, addOrUpdateDevice);
}

function stopBrowse() {
  if (browser) {
    browser.stop();
    browser = null;
  }
  if (bonjour) {
    bonjour.destroy();
    bonjour = null;
  }
}

/** Start background scanning — call once at app startup. */
export function startBackgroundScan() {
  if (backgroundTimer) return;
  startBrowse();
  backgroundTimer = setInterval(() => {
    pruneStaleDevices();
    // Restart browse to re-query devices that may have appeared
    stopBrowse();
    startBrowse();
  }, SCAN_INTERVAL_MS);
}

/** Called when picker opens — return cached devices and force a fresh scan. */
export function startDiscovery() {
  // Force a fresh scan cycle
  stopBrowse();
  startBrowse();
  return devices.map(({ name, host, port, id }) => ({ name, host, port, id }));
}

function emitDevices() {
  if (!mainWindowRef) return;
  const win = typeof mainWindowRef === 'function' ? mainWindowRef() : mainWindowRef;
  if (!win?.webContents) return;
  win.webContents.send(
    'cast:devices',
    devices.map(({ name, host, port, id }) => ({ name, host, port, id }))
  );
}

export function stopDiscovery() {
  // Keep background scan alive, just stop the active browse
  stopBrowse();
  // Restart background scan if it was running
  if (backgroundTimer) startBrowse();
}

export function getDevices() {
  return [...devices];
}

// ─── Connection ───

export function setMainWindow(getMainWindow) {
  mainWindowRef = getMainWindow;
}

export function connectToDevice(deviceId) {
  return new Promise((resolve, reject) => {
    const device = devices.find((d) => d.id === deviceId);
    if (!device) return reject(new Error(`Device not found: ${deviceId}`));

    // Disconnect existing if any
    if (client) {
      disconnectSync();
    }

    client = new Client();

    client.connect(device.host, () => {
      console.log(`[cast] connected to ${device.name}`);
      connectedDevice = device;

      client.launch(DefaultMediaReceiver, (err, p) => {
        if (err) {
          console.error('[cast] launch error:', err);
          return reject(err);
        }
        player = p;

        player.on('status', (status) => {
          emitStatus(status);
        });

        startStatusPolling();
        resolve({ name: device.name, host: device.host, id: device.id });
      });
    });

    client.on('error', (err) => {
      console.error('[cast] client error:', err.message);
      disconnectSync();
    });
  });
}

export function disconnect() {
  disconnectSync();
  return Promise.resolve();
}

function disconnectSync() {
  stopStatusPolling();
  if (player) {
    try {
      player.stop();
    } catch (_) {
      /* ignore */
    }
    player = null;
  }
  if (client) {
    try {
      client.close();
    } catch (_) {
      /* ignore */
    }
    client = null;
  }
  connectedDevice = null;
}

// ─── Media control ───

export function loadMedia(proxyUrl, metadata = {}) {
  return new Promise((resolve, reject) => {
    if (!player) return reject(new Error('No active cast session'));

    const media = {
      contentId: proxyUrl,
      contentType: 'audio/webm',
      streamType: 'BUFFERED',
      metadata: {
        type: 0,
        metadataType: 0,
        title: metadata.title || 'Unknown',
        subtitle: metadata.artist || '',
        images: metadata.thumbnail ? [{ url: metadata.thumbnail }] : []
      }
    };

    player.load(media, { autoplay: true }, (err, status) => {
      if (err) {
        console.error('[cast] load error:', err);
        return reject(err);
      }
      resolve(status);
    });
  });
}

function hasMediaSession() {
  return !!player?.media?.currentSession;
}

export function play() {
  if (!hasMediaSession()) return Promise.resolve(false);
  return new Promise((resolve, reject) => {
    player.play((err) => (err ? reject(err) : resolve(true)));
  });
}

export function pause() {
  if (!hasMediaSession()) return Promise.resolve(false);
  return new Promise((resolve, reject) => {
    player.pause((err) => (err ? reject(err) : resolve(true)));
  });
}

export function seek(time) {
  if (!hasMediaSession()) return Promise.resolve(false);
  return new Promise((resolve, reject) => {
    player.seek(time, (err) => (err ? reject(err) : resolve(true)));
  });
}

export function setVolume(level) {
  return new Promise((resolve, reject) => {
    if (!client) return reject(new Error('No active cast session'));
    client.setVolume({ level: Math.max(0, Math.min(1, level)) }, (err) =>
      err ? reject(err) : resolve()
    );
  });
}

export function stop() {
  return new Promise((resolve, reject) => {
    if (!player) return reject(new Error('No active cast session'));
    player.stop((err) => (err ? reject(err) : resolve()));
  });
}

export function getStatus() {
  return new Promise((resolve, reject) => {
    if (!player) return resolve(null);
    player.getStatus((err, status) => {
      if (err) return reject(err);
      resolve(status);
    });
  });
}

export function isConnected() {
  return !!client && !!player;
}

export function getConnectedDevice() {
  return connectedDevice;
}

// ─── Status polling ───

function startStatusPolling() {
  stopStatusPolling();
  statusInterval = setInterval(async () => {
    try {
      const status = await getStatus();
      if (status) emitStatus(status);
    } catch (_) {
      /* ignore polling errors */
    }
  }, 1000);
}

function stopStatusPolling() {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
}

function emitStatus(status) {
  if (!mainWindowRef || !status) return;
  const win = typeof mainWindowRef === 'function' ? mainWindowRef() : mainWindowRef;
  if (!win?.webContents) return;

  win.webContents.send('cast:status', {
    playerState: status.playerState || 'IDLE',
    currentTime: status.currentTime || 0,
    duration: status.media?.duration || 0,
    volume: status.volume?.level ?? 1
  });
}
