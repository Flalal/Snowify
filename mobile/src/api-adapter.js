// ─── API Adapter: replaces Electron IPC with HTTP fetch to Snowify API ───
// This file is loaded before the renderer and provides window.snowify

import { syncMerge } from '@shared/syncMerge.js';
import { Chromecast } from '@flalal/capacitor-chromecast';

const API_URL_KEY = 'snowify_api_url';
const API_KEY_KEY = 'snowify_api_key';
const ACCESS_TOKEN_KEY = 'snowify_access_token';
const REFRESH_TOKEN_KEY = 'snowify_refresh_token';

function getApiUrl() {
  return localStorage.getItem(API_URL_KEY) || '';
}

function getApiKey() {
  return localStorage.getItem(API_KEY_KEY) || '';
}

function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || '';
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || '';
}

function setTokens(access, refresh) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function apiHeaders(extra = {}) {
  const h = { 'Content-Type': 'application/json', ...extra };
  const key = getApiKey();
  if (key) h['X-API-Key'] = key;
  return h;
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');
  const res = await fetch(`${getApiUrl()}/auth/refresh`, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({ refreshToken })
  });
  if (!res.ok) {
    clearTokens();
    throw new Error('Session expired');
  }
  const data = await res.json();
  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

async function apiFetch(path, options = {}) {
  const api = getApiUrl();
  if (!api) throw new Error('API URL not configured');

  const headers = apiHeaders(options.headers);
  const token = getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${api}${path}`, { ...options, headers });

  if (res.status === 401 && getRefreshToken()) {
    try {
      const newToken = await refreshAccessToken();
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${api}${path}`, { ...options, headers });
    } catch {
      throw new Error('Authentication expired');
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error ${res.status}`);
  }
  return res.json();
}

// ─── Chromecast state ───
let chromecastReady = false;
let castStatusCb = null;
let mediaUpdateHandle = null;
let sessionEndHandle = null;

async function ensureChromecast() {
  if (chromecastReady) return;
  await Chromecast.initialize({});
  chromecastReady = true;
}

window.snowify = {
  // ─── Search ───
  search: (query, musicOnly) =>
    apiFetch(`/search?q=${encodeURIComponent(query)}&musicOnly=${musicOnly}`),
  searchArtists: (query) =>
    apiFetch(`/search/artists?q=${encodeURIComponent(query)}`),

  // ─── Browse ───
  artistInfo: (artistId) => apiFetch(`/artists/${artistId}`),
  albumTracks: (albumId) => apiFetch(`/albums/${albumId}`),
  getUpNexts: (videoId) => apiFetch(`/upnexts/${videoId}`),
  explore: () => apiFetch('/explore'),
  charts: () => apiFetch('/charts'),
  browseMood: (browseId, params) =>
    apiFetch(`/moods/${browseId}?params=${encodeURIComponent(params || '')}`),
  getPlaylistVideos: (browseId) => apiFetch(`/yt-playlists/${browseId}/tracks`),
  setCountry: (code) =>
    apiFetch('/country', { method: 'POST', body: JSON.stringify({ code }) }).catch(() => {}),

  // ─── Stream ───
  // Return direct stream URL with API key as query param and m4a format for Android compatibility
  getStreamUrl: (videoUrl) => {
    const api = getApiUrl();
    const videoId = new URL(videoUrl).searchParams.get('v') || videoUrl;
    const params = new URLSearchParams({ quality: 'm4a' });
    const key = getApiKey();
    if (key) params.set('key', key);
    return Promise.resolve(`${api}/stream/${videoId}?${params}`);
  },
  getVideoStreamUrl: (videoId, quality, premuxed) =>
    apiFetch(`/stream/${videoId}/video?quality=${quality || 720}&premuxed=${premuxed || false}`),

  // ─── Lyrics ───
  getLyrics: (trackName, artistName, albumName, duration) =>
    apiFetch(`/lyrics?track=${encodeURIComponent(trackName || '')}&artist=${encodeURIComponent(artistName || '')}&album=${encodeURIComponent(albumName || '')}&duration=${duration || ''}`),

  // ─── Auth ───
  authConfigure: ({ baseUrl, apiKey }) => {
    localStorage.setItem(API_URL_KEY, baseUrl);
    if (apiKey !== undefined) localStorage.setItem(API_KEY_KEY, apiKey || '');
    return Promise.resolve({ ok: true });
  },
  authLogin: async (email, password) => {
    try {
      const res = await fetch(`${getApiUrl()}/auth/login`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.message };
      setTokens(data.accessToken, data.refreshToken);
      return { ok: true, user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  authRegister: async (username, email, password) => {
    try {
      const res = await fetch(`${getApiUrl()}/auth/register`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.message };
      setTokens(data.accessToken, data.refreshToken);
      return { ok: true, user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  authLogout: async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await fetch(`${getApiUrl()}/auth/logout`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ refreshToken })
      }).catch(() => {});
    }
    clearTokens();
    return { ok: true };
  },
  authGetState: () => Promise.resolve({
    isConfigured: !!getApiUrl(),
    isAuthenticated: !!getAccessToken(),
    tokens: { accessToken: getAccessToken(), refreshToken: getRefreshToken() }
  }),
  authLoadTokens: () => Promise.resolve({
    accessToken: getAccessToken(),
    refreshToken: getRefreshToken(),
    apiKey: getApiKey()
  }),
  authSaveTokens: ({ accessToken, refreshToken, apiKey }) => {
    if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    if (apiKey !== undefined) localStorage.setItem(API_KEY_KEY, apiKey || '');
    return Promise.resolve({ ok: true });
  },
  authClearTokens: () => {
    clearTokens();
    return Promise.resolve({ ok: true });
  },

  // ─── Sync ───
  syncPush: (localState) => apiFetch('/sync/push', { method: 'POST', body: JSON.stringify(localState) }),
  syncPull: async () => {
    try {
      // Read lastSyncAt from state to request delta only
      const state = JSON.parse(localStorage.getItem('snowify_state') || '{}');
      const since = state.lastSyncAt || '1970-01-01T00:00:00Z';
      const data = await apiFetch(`/sync/pull?since=${encodeURIComponent(since)}`);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  syncMerge: (local, remote) => Promise.resolve(syncMerge(local, remote)),
  onTokensUpdated: () => {}, // no-op on mobile, tokens managed via localStorage

  // ─── Cast (native Chromecast via Capacitor plugin) ───
  castDiscover: () => Promise.resolve([]), // native picker handles discovery
  castConnect: async () => {
    await ensureChromecast();
    const session = await Chromecast.requestSession();
    return {
      name: session?.receiver?.friendlyName || 'Chromecast',
      id: session?.sessionId || 'cast',
      host: ''
    };
  },
  castDisconnect: async () => {
    await Chromecast.sessionStop();
  },
  castLoadMedia: async (url, meta) => {
    await Chromecast.loadMedia({
      contentId: url,
      contentType: 'audio/mp4',
      streamType: 'buffered',
      autoPlay: true,
      currentTime: meta?.currentTime || 0,
      metadata: {
        title: meta?.title || '',
        artist: meta?.artist || '',
        images: meta?.thumbnail ? [{ url: meta.thumbnail }] : []
      }
    });
  },
  castSeek: (time) => Chromecast.mediaSeek({ position: time }),
  castPause: () => Chromecast.mediaPause(),
  castPlay: () => Chromecast.mediaPlay(),
  castStop: () => Chromecast.mediaStop(),
  castSetVolume: (level) => Chromecast.setReceiverVolumeLevel({ level }),
  onCastDevices: () => {},  // native picker handles device list
  offCastDevices: () => {},
  onCastStatus: (cb) => {
    castStatusCb = cb;
    mediaUpdateHandle = Chromecast.addListener('MEDIA_UPDATE', (data) => {
      if (castStatusCb) {
        castStatusCb({
          playerState: data.playerState,
          currentTime: data.currentTime || 0,
          duration: data.media?.duration || 0,
          volume: data.volume?.level ?? 1
        });
      }
    });
    sessionEndHandle = Chromecast.addListener('SESSION_ENDED', () => {
      if (castStatusCb) {
        castStatusCb({ playerState: 'IDLE', currentTime: 0, duration: 0, volume: 1 });
      }
    });
  },
  offCastStatus: () => {
    castStatusCb = null;
    if (mediaUpdateHandle) {
      mediaUpdateHandle.then(h => h.remove());
      mediaUpdateHandle = null;
    }
    if (sessionEndHandle) {
      sessionEndHandle.then(h => h.remove());
      sessionEndHandle = null;
    }
  },

  // ─── Desktop-only stubs ───
  minimize: () => {},
  maximize: () => {},
  close: () => {},
  pickImage: () => Promise.resolve(null),
  saveImage: () => Promise.resolve(null),
  deleteImage: () => Promise.resolve(false),
  spotifyPickCsv: () => Promise.resolve([]),
  spotifyMatchTrack: () => Promise.resolve(null),
  connectDiscord: () => Promise.resolve(false),
  disconnectDiscord: () => Promise.resolve(),
  updatePresence: () => Promise.resolve(),
  clearPresence: () => Promise.resolve(),
  checkForUpdates: () => Promise.resolve(),
  downloadUpdate: () => Promise.resolve(),
  installUpdate: () => {},
  onUpdateAvailable: () => {},
  onDownloadProgress: () => {},
  onUpdateDownloaded: () => {},
  onUpdateNotAvailable: () => {},
  onUpdateError: () => {},
  removeUpdateListeners: () => {},
  getAppVersion: () => Promise.resolve('1.0.0-mobile'),
  openExternal: (url) => { window.open(url, '_blank'); return Promise.resolve(); },
  onYtMusicInitError: () => {},
};
