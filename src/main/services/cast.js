// ─── Cast Service — mDNS discovery + Chromecast control via CASTv2 ───

import { Client, DefaultMediaReceiver } from 'castv2-client';
import { Bonjour } from 'bonjour-service';

let bonjour = null;
let browser = null;
let devices = [];
let client = null;
let player = null;
let statusInterval = null;
let mainWindowRef = null;
let connectedDevice = null;

// ─── Discovery ───

export function startDiscovery() {
  // If already browsing, just return current devices
  if (browser) return [...devices];

  devices = [];
  bonjour = new Bonjour();
  browser = bonjour.find({ type: 'googlecast' }, (service) => {
    const existing = devices.find((d) => d.id === service.txt?.id);
    if (existing) return;

    const device = {
      name: service.txt?.fn || service.name || 'Chromecast',
      host: service.referer?.address || service.addresses?.[0],
      port: service.port || 8009,
      id: service.txt?.id || `${service.name}-${service.port}`
    };

    if (device.host) {
      devices.push(device);
      console.log(`[cast] discovered: ${device.name} @ ${device.host}:${device.port}`);
      emitDevices();
    }
  });

  return [...devices];
}

function emitDevices() {
  if (!mainWindowRef) return;
  const win = typeof mainWindowRef === 'function' ? mainWindowRef() : mainWindowRef;
  if (!win?.webContents) return;
  win.webContents.send('cast:devices', [...devices]);
}

export function stopDiscovery() {
  if (browser) {
    browser.stop();
    browser = null;
  }
  if (bonjour) {
    bonjour.destroy();
    bonjour = null;
  }
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
