import { describe, it, expect } from 'vitest';
import {
  parseArtistsFromRuns,
  buildArtistFields,
  mapSongToTrack,
  extractArtistMap,
  parseCsvLine
} from '../parse.js';

describe('parseArtistsFromRuns', () => {
  it('returns empty array for null/empty runs', () => {
    expect(parseArtistsFromRuns(null)).toEqual([]);
    expect(parseArtistsFromRuns([])).toEqual([]);
  });

  it('extracts artists with browseId navigation endpoints', () => {
    const runs = [
      {
        text: 'Artist One',
        navigationEndpoint: {
          browseEndpoint: {
            browseId: 'UC123',
            browseEndpointContextSupportedConfigs: {
              browseEndpointContextMusicConfig: { pageType: 'MUSIC_PAGE_TYPE_ARTIST' }
            }
          }
        }
      }
    ];
    expect(parseArtistsFromRuns(runs)).toEqual([{ name: 'Artist One', id: 'UC123' }]);
  });

  it('falls back to text parsing when no browseIds', () => {
    const runs = [{ text: 'Artist A, Artist B' }];
    expect(parseArtistsFromRuns(runs)).toEqual([
      { name: 'Artist A', id: null },
      { name: 'Artist B', id: null }
    ]);
  });

  it('strips text after bullet separator', () => {
    const runs = [{ text: 'Some Artist \u2022 Album Name' }];
    expect(parseArtistsFromRuns(runs)).toEqual([{ name: 'Some Artist', id: null }]);
  });

  it('splits by ampersand', () => {
    const runs = [{ text: 'A & B' }];
    expect(parseArtistsFromRuns(runs)).toEqual([
      { name: 'A', id: null },
      { name: 'B', id: null }
    ]);
  });
});

describe('buildArtistFields', () => {
  it('returns Unknown Artist for null/empty', () => {
    expect(buildArtistFields(null)).toEqual({
      artist: 'Unknown Artist',
      artistId: null,
      artists: []
    });
    expect(buildArtistFields([])).toEqual({
      artist: 'Unknown Artist',
      artistId: null,
      artists: []
    });
  });

  it('joins multiple artist names', () => {
    const artists = [
      { name: 'A', id: 'id1' },
      { name: 'B', id: 'id2' }
    ];
    expect(buildArtistFields(artists)).toEqual({
      artist: 'A, B',
      artistId: 'id1',
      artists
    });
  });

  it('uses first artist id as artistId', () => {
    const artists = [
      { name: 'A', id: null },
      { name: 'B', id: 'id2' }
    ];
    expect(buildArtistFields(artists).artistId).toBeNull();
  });
});

describe('mapSongToTrack', () => {
  const baseSong = {
    videoId: 'vid1',
    name: 'Song Name',
    artist: { name: 'Artist', artistId: 'art1' },
    album: { name: 'Album', albumId: 'alb1' },
    thumbnails: [],
    duration: 180
  };

  it('maps basic song to track format', () => {
    const track = mapSongToTrack(baseSong);
    expect(track.id).toBe('vid1');
    expect(track.title).toBe('Song Name');
    expect(track.artist).toBe('Artist');
    expect(track.album).toBe('Album');
    expect(track.duration).toBe('3:00');
    expect(track.durationMs).toBe(180000);
    expect(track.url).toBe('https://music.youtube.com/watch?v=vid1');
  });

  it('uses provided artists override', () => {
    const artists = [{ name: 'Override', id: 'ovr1' }];
    const track = mapSongToTrack(baseSong, artists);
    expect(track.artist).toBe('Override');
    expect(track.artistId).toBe('ovr1');
  });

  it('handles missing album and duration', () => {
    const song = { videoId: 'v2', name: 'X', artist: null, thumbnails: [], duration: null };
    const track = mapSongToTrack(song);
    expect(track.album).toBeNull();
    expect(track.duration).toBe('');
    expect(track.durationMs).toBe(0);
    expect(track.artist).toBe('Unknown Artist');
  });
});

describe('extractArtistMap', () => {
  it('returns empty object for entries without valid videoId', () => {
    expect(extractArtistMap([{}])).toEqual({});
    expect(extractArtistMap([{ musicResponsiveListItemRenderer: {} }])).toEqual({});
  });

  it('extracts videoId to artists mapping', () => {
    const contents = [
      {
        musicResponsiveListItemRenderer: {
          flexColumns: [
            {
              musicResponsiveListItemFlexColumnRenderer: {
                text: {
                  runs: [
                    { text: 'Song', navigationEndpoint: { watchEndpoint: { videoId: 'vid1' } } }
                  ]
                }
              }
            },
            {
              musicResponsiveListItemFlexColumnRenderer: {
                text: { runs: [{ text: 'ArtistX' }] }
              }
            }
          ]
        }
      }
    ];
    const map = extractArtistMap(contents);
    expect(map.vid1).toEqual([{ name: 'ArtistX', id: null }]);
  });
});

describe('parseCsvLine', () => {
  it('parses simple CSV', () => {
    expect(parseCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('handles quoted fields with commas', () => {
    expect(parseCsvLine('"a,b",c')).toEqual(['a,b', 'c']);
  });

  it('handles escaped quotes', () => {
    expect(parseCsvLine('"a""b",c')).toEqual(['a"b', 'c']);
  });

  it('handles empty fields', () => {
    expect(parseCsvLine(',,')).toEqual(['', '', '']);
  });

  it('handles single field', () => {
    expect(parseCsvLine('hello')).toEqual(['hello']);
  });
});
