// ─── Shared field mapping: server (snake_case) ↔ client (camelCase) ───
// Used by both desktop (sync.js) and mobile (api-adapter.js)

/**
 * Map a server-format track to client-format.
 * Handles both snake_case DB fields and camelCase client fields gracefully.
 */
export function mapTrack(t) {
  return {
    id: t.track_id || t.id,
    title: t.title,
    artist: t.artist,
    artistId: t.artist_id || t.artistId,
    artists: t.artists || (t.artists_json ? JSON.parse(t.artists_json) : []),
    album: t.album,
    albumId: t.album_id || t.albumId,
    thumbnail: t.thumbnail,
    duration: t.duration,
    durationMs: t.duration_ms || t.durationMs,
    url: t.url
  };
}

/**
 * Map a server-format playlist to client-format.
 * Recursively maps tracks within the playlist.
 */
export function mapPlaylist(rp) {
  return {
    id: rp.id,
    name: rp.name,
    description: rp.description || '',
    coverImage: rp.coverImage || '',
    position: rp.position ?? 0,
    updated_at: rp.updated_at,
    tracks: (rp.tracks || []).map((t) => mapTrack(t))
  };
}

/**
 * Map a server-format liked song to client-format (includes liked_at).
 */
export function mapLikedSong(rs) {
  return {
    ...mapTrack(rs),
    liked_at: rs.liked_at
  };
}

/**
 * Map a server-format history entry to client-format (includes played_at).
 */
export function mapHistoryEntry(h) {
  return {
    ...mapTrack(h),
    played_at: h.played_at
  };
}
