// ─── Sync service: push/pull local state to/from backend ───

import { apiFetch, isAuthenticated } from './api.js';
import { mapTrackToServer } from '../../shared/fieldMapping.js';

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
    playlists: (localState.playlists || []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      coverUrl: p.coverUrl || '',
      position: p.position ?? 0,
      tracks: (p.tracks || []).map((t, i) => mapTrackToServer(t, { position: i })),
      updated_at: p.updated_at || new Date().toISOString(),
      deleted_at: p.deleted_at || null
    })),
    likedSongs: (localState.likedSongs || []).map((s) =>
      mapTrackToServer(s, { liked_at: s.liked_at || new Date().toISOString() })
    ),
    history: (localState.recentTracks || []).map((h) =>
      mapTrackToServer(h, { played_at: h.played_at || new Date().toISOString() })
    ),
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

export { syncMerge as mergeState } from '../../shared/syncMerge.js';
