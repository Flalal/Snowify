// ─── Spotify Playlist Import (CSV) IPC Handlers ───

import { dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import { parseCsvLine, mapSongToTrack } from '../utils/parse.js';
import { createHandler } from './middleware.js';

export function register(ipcMain, deps) {
  const { getMainWindow, getYtMusic } = deps;

  ipcMain.handle(
    'spotify:pickCsv',
    createHandler('spotify:pickCsv', async () => {
      const mainWindow = getMainWindow();
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Spotify CSV export files',
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
        properties: ['openFile', 'multiSelections']
      });
      if (result.canceled || !result.filePaths.length) return null;

      const playlists = [];
      for (const filePath of result.filePaths) {
        try {
          const raw = fs.readFileSync(filePath, 'utf-8');
          const lines = raw.split(/\r?\n/).filter((l) => l.trim());
          if (lines.length < 2) continue;

          const headers = parseCsvLine(lines[0]).map((h) => h.trim());
          const titleIdx = headers.findIndex((h) =>
            /^(track.?name|title|song.?name|name)$/i.test(h)
          );
          const artistIdx = headers.findIndex((h) =>
            /^(artist.?name|artists?\(?s?\)?|artist)$/i.test(h)
          );
          if (titleIdx === -1) continue;

          const tracks = [];
          for (let i = 1; i < lines.length; i++) {
            const fields = parseCsvLine(lines[i]);
            const title = fields[titleIdx]?.trim();
            if (!title) continue;
            const artist =
              artistIdx !== -1
                ? fields[artistIdx]?.replace(/\\,/g, ', ').trim() || 'Unknown Artist'
                : 'Unknown Artist';
            tracks.push({ title, artist });
          }

          const name = path.basename(filePath, '.csv').replace(/_/g, ' ');
          playlists.push({ name, tracks });
        } catch (err) {
          console.error(`Error parsing CSV ${filePath}:`, err.message);
        }
      }

      return playlists.length ? playlists : null;
    })
  );

  ipcMain.handle(
    'spotify:matchTrack',
    createHandler('spotify:matchTrack', async (_event, title, artist) => {
      const ytmusic = getYtMusic();
      const query = `${title} ${artist}`;
      const songs = await ytmusic.searchSongs(query);
      const match = songs.find((s) => s.videoId);
      if (!match) return null;
      return mapSongToTrack(match);
    })
  );
}
