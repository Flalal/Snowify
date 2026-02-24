import { mapPlaylist, mapLikedSong, mapHistoryEntry } from './fieldMapping.js';

/**
 * Merge remote data with local state using LWW (Last-Write-Wins).
 * Shared between desktop (sync.js) and mobile (api-adapter.js).
 */
export function syncMerge(local, remote) {
  // Playlists: merge by id, remote wins if updated_at is newer
  const localPlaylistMap = new Map((local.playlists || []).map((p) => [p.id, p]));
  for (const rp of remote.playlists || []) {
    const lp = localPlaylistMap.get(rp.id);
    if (!lp || (rp.updated_at && rp.updated_at > (lp.updated_at || ''))) {
      localPlaylistMap.set(rp.id, mapPlaylist(rp));
    }
  }
  const playlists = [...localPlaylistMap.values()].filter((p) => !p.deleted_at);

  // Liked songs: merge by track id
  const localLikedMap = new Map((local.likedSongs || []).map((s) => [s.id, s]));
  for (const rs of remote.likedSongs || []) {
    const trackId = rs.track_id || rs.id;
    const ls = localLikedMap.get(trackId);
    if (!ls || (rs.liked_at && rs.liked_at > (ls.liked_at || ''))) {
      if (rs.deleted_at) {
        localLikedMap.delete(trackId);
      } else {
        localLikedMap.set(trackId, mapLikedSong(rs));
      }
    }
  }
  const likedSongs = [...localLikedMap.values()];

  // History: append new entries (dedupe by id)
  const historyIds = new Set((local.recentTracks || []).map((h) => h.id));
  const newHistory = (remote.history || [])
    .filter((h) => !historyIds.has(h.track_id || h.id))
    .map((h) => mapHistoryEntry(h));
  const recentTracks = [...newHistory, ...local.recentTracks];

  return { playlists, likedSongs, recentTracks };
}
