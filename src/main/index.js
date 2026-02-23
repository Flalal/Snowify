// ─── Main Entry Point ───

import { app, BrowserWindow, ipcMain, session, nativeImage } from 'electron';
import path from 'path';

// ─── Services ───
import { initYTMusic, getYtMusic } from './services/ytmusic.js';
import * as stream from './services/stream.js';
import * as lyrics from './services/lyrics.js';

// ─── IPC Handler Modules ───
import * as discordHandlers from './ipc/discord.handlers.js';
import * as exploreHandlers from './ipc/explore.handlers.js';
import * as lyricsHandlers from './ipc/lyrics.handlers.js';
import * as playlistHandlers from './ipc/playlist.handlers.js';
import * as searchHandlers from './ipc/search.handlers.js';
import * as shellHandlers from './ipc/shell.handlers.js';
import * as spotifyHandlers from './ipc/spotify.handlers.js';
import * as streamHandlers from './ipc/stream.handlers.js';
import * as updaterHandlers from './ipc/updater.handlers.js';

// ─── Auto-Update ───
import { initUpdater } from './services/updater.js';

// ─── Window State ───
let mainWindow;

function getMainWindow() {
  return mainWindow;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#121212',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(import.meta.dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    icon: nativeImage.createFromPath(path.join(import.meta.dirname, '../../assets/logo.ico'))
  });

  // In dev mode, use the dev server URL; in production, load the built file
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(import.meta.dirname, '../renderer/index.html'));
  }

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com; " +
          "img-src 'self' https: data: file:; " +
          "media-src 'self' blob: https:; " +
          "connect-src 'self' https: http:;"
        ]
      }
    });
  });
}

// ─── Shared dependencies for IPC handlers ───
const deps = {
  getMainWindow,
  getYtMusic,
  stream,
  lyrics
};

// ─── Register all IPC handlers ───
discordHandlers.register(ipcMain, deps);
exploreHandlers.register(ipcMain, deps);
lyricsHandlers.register(ipcMain, deps);
playlistHandlers.register(ipcMain, deps);
searchHandlers.register(ipcMain, deps);
shellHandlers.register(ipcMain, deps);
spotifyHandlers.register(ipcMain, deps);
streamHandlers.register(ipcMain, deps);
updaterHandlers.register(ipcMain, deps);

// ─── App Version ───
ipcMain.handle('app:version', () => app.getVersion());

// ─── GPU cache fix (Windows permission errors) ───
if (process.env.ELECTRON_RENDERER_URL) {
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
} else {
  app.commandLine.appendSwitch('disk-cache-dir', path.join(app.getPath('userData'), 'cache'));
}

// ─── App Lifecycle ───
app.whenReady().then(async () => {
  createWindow();
  initUpdater(mainWindow);
  initYTMusic().catch(err => console.error('YTMusic init failed:', err));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
