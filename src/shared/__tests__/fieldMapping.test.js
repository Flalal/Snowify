import { describe, it, expect } from 'vitest';
import {
  mapTrack,
  mapTrackToServer,
  mapPlaylist,
  mapLikedSong,
  mapHistoryEntry
} from '../fieldMapping.js';

describe('mapTrack', () => {
  it('maps snake_case server fields to camelCase', () => {
    const server = {
      track_id: 'id1',
      title: 'Song',
      artist: 'A',
      artist_id: 'art1',
      artists_json: '[{"name":"A","id":"art1"}]',
      album: 'Alb',
      album_id: 'alb1',
      thumbnail: 'thumb.jpg',
      duration: '3:00',
      duration_ms: 180000,
      url: 'https://...'
    };
    const result = mapTrack(server);
    expect(result.id).toBe('id1');
    expect(result.artistId).toBe('art1');
    expect(result.albumId).toBe('alb1');
    expect(result.durationMs).toBe(180000);
    expect(result.artists).toEqual([{ name: 'A', id: 'art1' }]);
  });

  it('accepts camelCase fields (passthrough)', () => {
    const client = {
      id: 'id1',
      title: 'Song',
      artist: 'A',
      artistId: 'art1',
      artists: [{ name: 'A', id: 'art1' }],
      album: 'Alb',
      albumId: 'alb1',
      thumbnail: 'thumb.jpg',
      duration: '3:00',
      durationMs: 180000,
      url: 'https://...'
    };
    const result = mapTrack(client);
    expect(result.id).toBe('id1');
    expect(result.artistId).toBe('art1');
    expect(result.artists).toEqual([{ name: 'A', id: 'art1' }]);
  });

  it('defaults artists to empty array when missing', () => {
    const result = mapTrack({ track_id: 'x', title: 'T' });
    expect(result.artists).toEqual([]);
  });
});

describe('mapTrackToServer', () => {
  const track = {
    id: 'id1',
    title: 'Song',
    artist: 'A',
    artistId: 'art1',
    artists: [{ name: 'A', id: 'art1' }],
    album: 'Alb',
    albumId: 'alb1',
    thumbnail: 'thumb.jpg',
    duration: '3:00',
    durationMs: 180000,
    url: 'https://...'
  };

  it('maps to server format with track_id', () => {
    const result = mapTrackToServer(track);
    expect(result.track_id).toBe('id1');
    expect(result.id).toBe('id1');
    expect(result.title).toBe('Song');
  });

  it('merges extra fields', () => {
    const result = mapTrackToServer(track, { position: 5, liked_at: '2025-01-01' });
    expect(result.position).toBe(5);
    expect(result.liked_at).toBe('2025-01-01');
  });

  it('defaults artists to empty array', () => {
    const result = mapTrackToServer({ id: 'x', title: 'T' });
    expect(result.artists).toEqual([]);
  });
});

describe('mapPlaylist', () => {
  it('maps playlist with tracks', () => {
    const rp = {
      id: 'pl1',
      name: 'My Playlist',
      description: 'desc',
      coverImage: 'cover.jpg',
      position: 2,
      updated_at: '2025-01-01',
      tracks: [{ track_id: 't1', title: 'Track1', artist: 'A' }]
    };
    const result = mapPlaylist(rp);
    expect(result.id).toBe('pl1');
    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0].id).toBe('t1');
  });

  it('defaults to empty tracks and description', () => {
    const result = mapPlaylist({ id: 'pl2', name: 'Empty' });
    expect(result.tracks).toEqual([]);
    expect(result.description).toBe('');
    expect(result.coverImage).toBe('');
  });
});

describe('mapLikedSong', () => {
  it('preserves liked_at', () => {
    const result = mapLikedSong({ track_id: 'x', title: 'S', liked_at: '2025-06-01' });
    expect(result.liked_at).toBe('2025-06-01');
    expect(result.id).toBe('x');
  });
});

describe('mapHistoryEntry', () => {
  it('preserves played_at', () => {
    const result = mapHistoryEntry({ track_id: 'x', title: 'S', played_at: '2025-06-02' });
    expect(result.played_at).toBe('2025-06-02');
    expect(result.id).toBe('x');
  });
});
