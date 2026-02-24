// ─── API Adapter: replaces Electron IPC with HTTP fetch to Snowify API ───
// This file is loaded before the renderer and provides window.snowify

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
  // Returns direct URL for <audio src>
  getStreamUrl: (videoUrl, quality) => {
    const api = getApiUrl();
    const videoId = new URL(videoUrl).searchParams.get('v') || videoUrl;
    return Promise.resolve(`${api}/stream/${videoId}?quality=${quality || 'bestaudio'}`);
  },
  getVideoStreamUrl: (videoId, quality, premuxed) =>
    apiFetch(`/stream/${videoId}/video?quality=${quality || 720}&premuxed=${premuxed || false}`),

  // ─── Lyrics ───
  getLyrics: (trackName, artistName, albumName, duration) =>
    apiFetch(`/lyrics?track=${encodeURIComponent(trackName || '')}&artist=${encodeURIComponent(artistName || '')}&album=${encodeURIComponent(albumName || '')}&duration=${duration || ''}`),

  // ─── Auth ───
  authConfigure: ({ baseUrl }) => {
    localStorage.setItem(API_URL_KEY, baseUrl);
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

  // ─── Sync ───
  syncPush: (localState) => apiFetch('/sync/push', { method: 'POST', body: JSON.stringify(localState) }),
  syncPull: async () => {
    try {
      const data = await apiFetch('/sync/pull');
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  syncMerge: (local, remote) => {
    // Simple client-side merge (same logic as desktop)
    const playlists = mergeById(local.playlists, remote.playlists, 'updated_at');
    const likedSongs = mergeById(local.likedSongs, remote.likedSongs, 'liked_at');
    const historyIds = new Set(local.recentTracks.map(h => h.id));
    const newHistory = (remote.history || []).filter(h => !historyIds.has(h.track_id || h.id));
    const recentTracks = [...newHistory, ...local.recentTracks];
    return Promise.resolve({ playlists, likedSongs, recentTracks });
  },
  onTokensUpdated: () => {}, // no-op on mobile, tokens managed via localStorage

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

// ─── Helper: merge arrays by id, LWW by timestamp field ───
function mergeById(localArr, remoteArr, tsField) {
  const map = new Map((localArr || []).map(item => [item.id, item]));
  for (const rItem of (remoteArr || [])) {
    const id = rItem.track_id || rItem.id;
    const lItem = map.get(id);
    if (!lItem || (rItem[tsField] && rItem[tsField] > (lItem[tsField] || ''))) {
      if (rItem.deleted_at) {
        map.delete(id);
      } else {
        map.set(id, { ...rItem, id });
      }
    }
  }
  return [...map.values()];
}
