// ─── Stream URL Cache & yt-dlp path resolution ───

import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { STREAM_CACHE_TTL, STREAM_CACHE_MAX_SIZE } from '../../shared/constants.js';

// ─── Stream URL Cache ───
const _streamCache = new Map();

export function getCachedUrl(key) {
  const entry = _streamCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > STREAM_CACHE_TTL) {
    _streamCache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCachedUrl(key, value) {
  _streamCache.set(key, { value, ts: Date.now() });

  if (_streamCache.size > STREAM_CACHE_MAX_SIZE) {
    const now = Date.now();
    for (const [k, v] of _streamCache) {
      if (now - v.ts > STREAM_CACHE_TTL) _streamCache.delete(k);
    }
  }
}

export function getYtDlpPath() {
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const binName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
  const subDir = isWin ? 'win' : isMac ? 'mac' : 'linux';

  // In production: resources/bin/<platform>/yt-dlp
  const bundled = path.join(process.resourcesPath, 'bin', subDir, binName);
  if (fs.existsSync(bundled)) return bundled;

  // In development: bin/<platform>/yt-dlp relative to project root
  // After build, import.meta.dirname is out/main/, so go up 2 levels to project root
  const dev = path.join(import.meta.dirname, '..', '..', 'bin', subDir, binName);
  if (fs.existsSync(dev)) return dev;

  // Fallback to system PATH
  return binName;
}
