// ─── Lyrics (Musixmatch + LrcLib + Netease via SyncLyrics) ───

import { SyncLyrics } from '@stef-0012/synclyrics';

let _mxmTokenData = null;

// LRU cache for lyrics (max 50 entries)
const _lyricsCache = new Map();
const _lyricsCacheLimit = 50;
const lyricsCacheProxy = {
  get(key) {
    if (!_lyricsCache.has(key)) return undefined;
    // Promote to most-recent by re-inserting
    const value = _lyricsCache.get(key);
    _lyricsCache.delete(key);
    _lyricsCache.set(key, value);
    return value;
  },
  set(key, value) {
    _lyricsCache.delete(key);
    if (_lyricsCache.size >= _lyricsCacheLimit) {
      _lyricsCache.delete(_lyricsCache.keys().next().value);
    }
    _lyricsCache.set(key, value);
  },
  has(key) {
    return _lyricsCache.has(key);
  },
  delete(key) {
    return _lyricsCache.delete(key);
  },
  clear() {
    _lyricsCache.clear();
  },
  get size() {
    return _lyricsCache.size;
  }
};

export const lyricsManager = new SyncLyrics({
  cache: lyricsCacheProxy,
  logLevel: 'none',
  sources: ['musixmatch', 'lrclib', 'netease'],
  saveMusixmatchToken: (tokenData) => {
    _mxmTokenData = tokenData;
  },
  getMusixmatchToken: () => _mxmTokenData
});
