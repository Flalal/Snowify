const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('snowify', {
  // Logging
  log: (level, ...args) => ipcRenderer.send('log:renderer', level, ...args),

  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // YouTube Music
  search: (query, musicOnly) => ipcRenderer.invoke('yt:search', query, musicOnly),
  searchArtists: (query) => ipcRenderer.invoke('yt:searchArtists', query),
  getStreamUrl: (videoUrl, quality) => ipcRenderer.invoke('yt:getStreamUrl', videoUrl, quality),
  artistInfo: (artistId) => ipcRenderer.invoke('yt:artistInfo', artistId),
  albumTracks: (albumId) => ipcRenderer.invoke('yt:albumTracks', albumId),
  getUpNexts: (videoId) => ipcRenderer.invoke('yt:getUpNexts', videoId),
  getVideoStreamUrl: (videoId, quality, premuxed) =>
    ipcRenderer.invoke('yt:getVideoStreamUrl', videoId, quality, premuxed),
  explore: () => ipcRenderer.invoke('yt:explore'),
  charts: () => ipcRenderer.invoke('yt:charts'),
  browseMood: (browseId, params) => ipcRenderer.invoke('yt:browseMood', browseId, params),
  getPlaylistVideos: (browseId) => ipcRenderer.invoke('yt:getPlaylistVideos', browseId),
  setCountry: (code) => ipcRenderer.invoke('yt:setCountry', code),
  getLyrics: (trackName, artistName, albumName, duration) =>
    ipcRenderer.invoke('lyrics:get', trackName, artistName, albumName, duration),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // Playlist covers
  pickImage: () => ipcRenderer.invoke('playlist:pickImage'),
  saveImage: (playlistId, sourcePath) =>
    ipcRenderer.invoke('playlist:saveImage', playlistId, sourcePath),
  deleteImage: (imagePath) => ipcRenderer.invoke('playlist:deleteImage', imagePath),

  // Spotify import (CSV)
  spotifyPickCsv: () => ipcRenderer.invoke('spotify:pickCsv'),
  spotifyMatchTrack: (title, artist) => ipcRenderer.invoke('spotify:matchTrack', title, artist),

  // Discord RPC
  connectDiscord: () => ipcRenderer.invoke('discord:connect'),
  disconnectDiscord: () => ipcRenderer.invoke('discord:disconnect'),
  updatePresence: (data) => ipcRenderer.invoke('discord:updatePresence', data),
  clearPresence: () => ipcRenderer.invoke('discord:clearPresence'),

  // Auto-update
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_, info) => cb(info)),
  onDownloadProgress: (cb) => ipcRenderer.on('download-progress', (_, info) => cb(info)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', (_, info) => cb(info)),
  onUpdateNotAvailable: (cb) => ipcRenderer.on('update-not-available', () => cb()),
  onUpdateError: (cb) => ipcRenderer.on('update-error', (_, info) => cb(info)),
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.removeAllListeners('update-not-available');
    ipcRenderer.removeAllListeners('download-progress');
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.removeAllListeners('update-error');
  },
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  onYtMusicInitError: (cb) => ipcRenderer.on('ytmusic-init-error', () => cb()),

  // Secure Token Storage
  authSaveTokens: (tokens) => ipcRenderer.invoke('auth:saveTokens', tokens),
  authLoadTokens: () => ipcRenderer.invoke('auth:loadTokens'),
  authClearTokens: () => ipcRenderer.invoke('auth:clearTokens'),

  // Cloud Sync & Auth
  authConfigure: (config) => ipcRenderer.invoke('auth:configure', config),
  authLogin: (email, password) => ipcRenderer.invoke('auth:login', email, password),
  authRegister: (username, email, password) =>
    ipcRenderer.invoke('auth:register', username, email, password),
  authLogout: () => ipcRenderer.invoke('auth:logout'),
  authGetState: () => ipcRenderer.invoke('auth:getState'),
  syncPush: (localState) => ipcRenderer.invoke('sync:push', localState),
  syncPull: () => ipcRenderer.invoke('sync:pull'),
  syncMerge: (local, remote) => ipcRenderer.invoke('sync:merge', local, remote),
  onTokensUpdated: (cb) => ipcRenderer.on('auth:tokens-updated', (_, tokens) => cb(tokens))
});
