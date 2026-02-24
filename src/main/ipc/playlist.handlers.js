// ─── Playlist Cover Image Management IPC Handlers ───

import { app, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import { createHandler } from './middleware.js';

function getCoversDir() {
  const dir = path.join(app.getPath('userData'), 'playlist-covers');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function register(ipcMain, deps) {
  const { getMainWindow } = deps;

  ipcMain.handle(
    'playlist:pickImage',
    createHandler('playlist:pickImage', async () => {
      const mainWindow = getMainWindow();
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Choose playlist cover image',
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'] }],
        properties: ['openFile']
      });
      if (result.canceled || !result.filePaths.length) return null;
      return result.filePaths[0];
    })
  );

  ipcMain.handle(
    'playlist:saveImage',
    createHandler('playlist:saveImage', async (_event, playlistId, sourcePath) => {
      const coversDir = getCoversDir();
      const safeId = String(playlistId).replace(/[^a-zA-Z0-9_-]/g, '_');
      const ext = path.extname(sourcePath) || '.jpg';
      const destName = `${safeId}_${Date.now()}${ext}`;
      const destPath = path.join(coversDir, destName);
      // Verify destination resolves inside covers directory
      if (!path.resolve(destPath).startsWith(path.resolve(coversDir))) return null;
      fs.copyFileSync(sourcePath, destPath);
      return destPath;
    })
  );

  ipcMain.handle(
    'playlist:deleteImage',
    createHandler(
      'playlist:deleteImage',
      async (_event, imagePath) => {
        const coversDir = getCoversDir();
        // Only allow deleting files inside the covers directory
        if (!imagePath || !path.resolve(imagePath).startsWith(path.resolve(coversDir)))
          return false;
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
        return true;
      },
      false
    )
  );
}
