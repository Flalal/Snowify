// ─── Sync service: push/pull local state to/from backend ───

import { apiFetch, isAuthenticated } from './api.js';
import { mapTrack, mapLikedSong, mapHistoryEntry, mapPlaylist } from '../../shared/fieldMapping.js';

let _lastSyncAt = null;

export function getLastSyncAt() {
  return _lastSyncAt;
}

export function setLastSyncAt(ts) {
  _lastSyncAt = ts;
}

/**
 * Push local changes to server.
 * @param {Object} localState - { playlists, likedSongs, recentTracks, settings }
 */
export async function syncPush(localState) {
  if (!isAuthenticated()) throw new Error('Not authenticated');

  const payload = {
    playlists: (localState.playlists || []).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      coverUrl: p.coverUrl || '',
      position: p.position ?? 0,
      tracks: (p.tracks || []).map((t, i) => ({
        id: t.id,
        track_id: t.id,
        title: t.title,
        artist: t.artist,
        artistId: t.artistId,
        artists: t.artists || [],
        album: t.album,
        albumId: t.albumId,
        thumbnail: t.thumbnail,
        duration: t.duration,
        durationMs: t.durationMs,
        url: t.url,
        position: i
      })),
      updated_at: p.updated_at || new Date().toISOString(),
      deleted_at: p.deleted_at || null
    })),
    likedSongs: (localState.likedSongs || []).map(s => ({
      id: s.id,
      track_id: s.id,
      title: s.title,
      artist: s.artist,
      artistId: s.artistId,
      artists: s.artists || [],
      album: s.album,
      albumId: s.albumId,
      thumbnail: s.thumbnail,
      duration: s.duration,
      durationMs: s.durationMs,
      url: s.url,
      liked_at: s.liked_at || new Date().toISOString()
    })),
    history: (localState.recentTracks || []).map(h => ({
      id: h.id,
      track_id: h.id,
      title: h.title,
      artist: h.artist,
      artistId: h.artistId,
      artists: h.artists || [],
      album: h.album,
      albumId: h.albumId,
      thumbnail: h.thumbnail,
      duration: h.duration,
      durationMs: h.durationMs,
      url: h.url,
      played_at: h.played_at || new Date().toISOString()
    })),
    settings: localState.settings || undefined
  };

  return apiFetch('/sync/push', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Pull remote changes since last sync.
 * Returns merged data.
 */
export async function syncPull() {
  if (!isAuthenticated()) throw new Error('Not authenticated');

  const since = _lastSyncAt || '1970-01-01T00:00:00Z';
  const data = await apiFetch(`/sync/pull?since=${encodeURIComponent(since)}`);

  _lastSyncAt = data.syncTimestamp;
  return data;
}

/**
 * Merge remote data with local state using LWW.
 */
export function mergeState(local, remote) {
  // Playlists: merge by id, remote wins if updated_at is newer
  const localPlaylistMap = new Map(local.playlists.map(p => [p.id, p]));
  for (const rp of (remote.playlists || [])) {
    const lp = localPlaylistMap.get(rp.id);
    if (!lp || (rp.updated_at && rp.updated_at > (lp.updated_at || ''))) {
      localPlaylistMap.set(rp.id, mapPlaylist(rp));
    }
  }
  const playlists = [...localPlaylistMap.values()].filter(p => !p.deleted_at);

  // Liked songs: merge by track id
  const localLikedMap = new Map(local.likedSongs.map(s => [s.id, s]));
  for (const rs of (remote.likedSongs || [])) {
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

  // History: just append new entries (dedupe by id)
  const historyIds = new Set(local.recentTracks.map(h => h.id));
  const newHistory = (remote.history || [])
    .filter(h => !historyIds.has(h.track_id || h.id))
    .map(h => mapHistoryEntry(h));
  const recentTracks = [...newHistory, ...local.recentTracks];

  return { playlists, likedSongs, recentTracks };
}
