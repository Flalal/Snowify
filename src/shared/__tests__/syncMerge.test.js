import { describe, it, expect } from 'vitest';
import { syncMerge } from '../syncMerge.js';

const EMPTY = { playlists: [], likedSongs: [], recentTracks: [] };

describe('syncMerge', () => {
  describe('playlists', () => {
    it('keeps local playlist when remote is older', () => {
      const local = {
        ...EMPTY,
        playlists: [{ id: 'p1', name: 'Local', updated_at: '2025-06-02', tracks: [] }]
      };
      const remote = {
        ...EMPTY,
        playlists: [{ id: 'p1', name: 'Remote', updated_at: '2025-06-01', tracks: [] }]
      };
      const result = syncMerge(local, remote);
      expect(result.playlists[0].name).toBe('Local');
    });

    it('overwrites local playlist when remote is newer', () => {
      const local = {
        ...EMPTY,
        playlists: [{ id: 'p1', name: 'Local', updated_at: '2025-06-01', tracks: [] }]
      };
      const remote = {
        ...EMPTY,
        playlists: [{ id: 'p1', name: 'Remote', updated_at: '2025-06-02', tracks: [] }]
      };
      const result = syncMerge(local, remote);
      expect(result.playlists[0].name).toBe('Remote');
    });

    it('adds new remote playlists', () => {
      const local = { ...EMPTY };
      const remote = {
        ...EMPTY,
        playlists: [{ id: 'p1', name: 'New', updated_at: '2025-06-01', tracks: [] }]
      };
      const result = syncMerge(local, remote);
      expect(result.playlists).toHaveLength(1);
      expect(result.playlists[0].name).toBe('New');
    });

    it('filters out deleted playlists', () => {
      const local = {
        ...EMPTY,
        playlists: [
          {
            id: 'p1',
            name: 'Del',
            updated_at: '2025-06-01',
            deleted_at: '2025-06-02',
            tracks: []
          }
        ]
      };
      const remote = { ...EMPTY };
      const result = syncMerge(local, remote);
      expect(result.playlists).toHaveLength(0);
    });
  });

  describe('liked songs', () => {
    it('merges liked songs by id, remote wins if newer', () => {
      const local = {
        ...EMPTY,
        likedSongs: [{ id: 's1', title: 'Local', liked_at: '2025-06-01' }]
      };
      const remote = {
        ...EMPTY,
        likedSongs: [{ track_id: 's1', title: 'Remote', liked_at: '2025-06-02' }]
      };
      const result = syncMerge(local, remote);
      expect(result.likedSongs).toHaveLength(1);
      expect(result.likedSongs[0].title).toBe('Remote');
    });

    it('removes liked song if remote has deleted_at', () => {
      const local = {
        ...EMPTY,
        likedSongs: [{ id: 's1', title: 'Song', liked_at: '2025-06-01' }]
      };
      const remote = {
        ...EMPTY,
        likedSongs: [{ track_id: 's1', liked_at: '2025-06-02', deleted_at: '2025-06-02' }]
      };
      const result = syncMerge(local, remote);
      expect(result.likedSongs).toHaveLength(0);
    });

    it('adds new remote liked songs', () => {
      const local = { ...EMPTY };
      const remote = {
        ...EMPTY,
        likedSongs: [{ track_id: 's1', title: 'New Song', liked_at: '2025-06-01' }]
      };
      const result = syncMerge(local, remote);
      expect(result.likedSongs).toHaveLength(1);
    });
  });

  describe('history', () => {
    it('appends new remote history entries', () => {
      const local = {
        ...EMPTY,
        recentTracks: [{ id: 'h1', title: 'Old' }]
      };
      const remote = {
        ...EMPTY,
        history: [{ track_id: 'h2', title: 'New', played_at: '2025-06-01' }]
      };
      const result = syncMerge(local, remote);
      expect(result.recentTracks).toHaveLength(2);
      expect(result.recentTracks[0].id).toBe('h2');
    });

    it('deduplicates by id', () => {
      const local = {
        ...EMPTY,
        recentTracks: [{ id: 'h1', title: 'Existing' }]
      };
      const remote = {
        ...EMPTY,
        history: [{ track_id: 'h1', title: 'Dupe', played_at: '2025-06-01' }]
      };
      const result = syncMerge(local, remote);
      expect(result.recentTracks).toHaveLength(1);
      expect(result.recentTracks[0].title).toBe('Existing');
    });
  });

  describe('edge cases', () => {
    it('handles empty local and remote', () => {
      const result = syncMerge({}, {});
      expect(result.playlists).toEqual([]);
      expect(result.likedSongs).toEqual([]);
      expect(result.recentTracks).toEqual([]);
    });
  });
});
