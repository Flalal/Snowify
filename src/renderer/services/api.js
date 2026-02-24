const _inflight = new Map();

function dedup(key, fn) {
  if (_inflight.has(key)) return _inflight.get(key);
  const p = fn().finally(() => _inflight.delete(key));
  _inflight.set(key, p);
  return p;
}

export const api = {
  search: (query, musicOnly) => window.snowify.search(query, musicOnly),
  searchArtists: (query) => window.snowify.searchArtists(query),
  artistInfo: (id) => dedup(`artist:${id}`, () => window.snowify.artistInfo(id)),
  albumTracks: (id) => dedup(`album:${id}`, () => window.snowify.albumTracks(id)),
  getUpNexts: (id) => window.snowify.getUpNexts(id),
  explore: () => window.snowify.explore(),
  charts: () => window.snowify.charts(),
  browseMood: (browseId, params) => window.snowify.browseMood(browseId, params),
  getPlaylistVideos: (id) => window.snowify.getPlaylistVideos(id),
  setCountry: (code) => window.snowify.setCountry(code),
  getStreamUrl: (url, quality) => window.snowify.getStreamUrl(url, quality),
  getVideoStreamUrl: (id, quality, premuxed) =>
    window.snowify.getVideoStreamUrl(id, quality, premuxed),
  getLyrics: (...args) => window.snowify.getLyrics(...args)
};
