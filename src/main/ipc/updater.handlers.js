// ─── Auto-Update IPC Handlers ───

import { autoUpdater } from 'electron-updater';
import { createHandler } from './middleware.js';

export function register(ipcMain) {
  ipcMain.handle(
    'updater:check',
    createHandler('updater:check', () => autoUpdater.checkForUpdates())
  );
  ipcMain.handle(
    'updater:download',
    createHandler('updater:download', () => autoUpdater.downloadUpdate())
  );
  ipcMain.handle(
    'updater:install',
    createHandler('updater:install', () => autoUpdater.quitAndInstall())
  );
}
