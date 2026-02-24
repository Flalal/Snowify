// ─── Stream URL IPC Handlers ───

import { execFile } from 'child_process';
import { createHandler } from './middleware.js';

export function register(ipcMain, deps) {
  const { stream } = deps;

  ipcMain.handle(
    'yt:getStreamUrl',
    createHandler('yt:getStreamUrl', async (_event, videoUrl, quality) => {
      const fmt = quality === 'worstaudio' ? 'worstaudio' : 'bestaudio';
      const cacheKey = `audio:${videoUrl}:${fmt}`;
      const cached = stream.getCachedUrl(cacheKey);
      if (cached) return cached;

      return new Promise((resolve, reject) => {
        execFile(
          stream.getYtDlpPath(),
          [
            '-f',
            fmt,
            '--get-url',
            '--no-warnings',
            '--no-playlist',
            '--no-check-certificates',
            videoUrl
          ],
          { timeout: 15000 },
          (err, stdout, stderr) => {
            if (err) return reject(new Error(stderr?.trim() || err.message));
            const url = stdout.trim().split('\n')[0];
            if (!url) return reject(new Error('yt-dlp returned no URL'));
            stream.setCachedUrl(cacheKey, url);
            resolve(url);
          }
        );
      });
    })
  );

  ipcMain.handle(
    'yt:getVideoStreamUrl',
    createHandler('yt:getVideoStreamUrl', async (_event, videoId, quality, premuxed) => {
      const height = parseInt(quality) || 720;
      const fmt = premuxed
        ? `best[height<=${height}]/best`
        : `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${height}]/best`;
      const cacheKey = `video:${videoId}:${fmt}`;
      const cached = stream.getCachedUrl(cacheKey);
      if (cached) return cached;

      return new Promise((resolve, reject) => {
        execFile(
          stream.getYtDlpPath(),
          [
            '-f',
            fmt,
            '--get-url',
            '--no-warnings',
            '--no-playlist',
            '--no-check-certificates',
            `https://music.youtube.com/watch?v=${videoId}`
          ],
          { timeout: 20000 },
          (err, stdout, stderr) => {
            if (err) return reject(new Error(stderr?.trim() || err.message));
            const urls = stdout.trim().split('\n').filter(Boolean);
            if (!urls.length) return reject(new Error('yt-dlp returned no video URL'));
            const result = { videoUrl: urls[0], audioUrl: urls[1] || null };
            stream.setCachedUrl(cacheKey, result);
            resolve(result);
          }
        );
      });
    })
  );
}
