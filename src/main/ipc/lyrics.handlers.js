// ─── Lyrics IPC Handlers ───

import { createHandler } from './middleware.js';

export function register(ipcMain, deps) {
  const { lyrics } = deps;

  ipcMain.handle(
    'lyrics:get',
    createHandler('lyrics:get', async (_event, trackName, artistName, albumName, durationSec) => {
      const data = await lyrics.lyricsManager.getLyrics({
        track: trackName || '',
        artist: artistName || '',
        album: albumName || '',
        length: durationSec ? Math.round(durationSec * 1000) : undefined
      });

      if (!data) return null;

      const synced = data.lyrics?.lineSynced?.lyrics || null;
      const plain = data.lyrics?.plain?.lyrics || null;
      const source = data.lyrics?.lineSynced?.source || data.lyrics?.plain?.source || 'Unknown';

      if (!synced && !plain) return null;

      return { synced, plain, source };
    })
  );
}
