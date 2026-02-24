// ─── Parsing helpers for YTMusic data ───

import { formatDuration, getSquareThumbnail } from './format.js';

export function parseArtistsFromRuns(runs) {
  if (!runs?.length) return [];
  const artistRuns = runs.filter((r) => {
    const pageType =
      r.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs
        ?.browseEndpointContextMusicConfig?.pageType;
    return pageType === 'MUSIC_PAGE_TYPE_ARTIST';
  });
  if (artistRuns.length > 0) {
    return artistRuns.map((r) => ({
      name: r.text,
      id: r.navigationEndpoint.browseEndpoint.browseId
    }));
  }
  // Fallback: plain text with no browseIds
  if (runs.length >= 1 && !runs[0].navigationEndpoint) {
    const text = runs.map((r) => r.text).join('');
    const dotIdx = text.indexOf(' \u2022 ');
    const artistText = dotIdx >= 0 ? text.slice(0, dotIdx) : text;
    return artistText
      .split(/,\s*|\s*&\s*/)
      .filter(Boolean)
      .map((name) => ({ name: name.trim(), id: null }));
  }
  return [];
}

export function buildArtistFields(artists) {
  if (!artists?.length) return { artist: 'Unknown Artist', artistId: null, artists: [] };
  return {
    artist: artists.map((a) => a.name).join(', '),
    artistId: artists[0].id || null,
    artists
  };
}

export function mapSongToTrack(song, artists) {
  const artistFields = artists
    ? buildArtistFields(artists)
    : {
        artist: song.artist?.name || 'Unknown Artist',
        artistId: song.artist?.artistId || null,
        artists: song.artist ? [{ name: song.artist.name, id: song.artist.artistId || null }] : []
      };
  return {
    id: song.videoId,
    title: song.name || 'Unknown',
    ...artistFields,
    album: song.album?.name || null,
    albumId: song.album?.albumId || null,
    thumbnail: getSquareThumbnail(song.thumbnails),
    duration: formatDuration(song.duration),
    durationMs: song.duration ? Math.round(song.duration * 1000) : 0,
    url: `https://music.youtube.com/watch?v=${song.videoId}`
  };
}

/**
 * Extract artist map from raw musicShelf contents (search results / artist top songs).
 * Returns { [videoId]: [{ name, id }] }
 */
export function extractArtistMap(shelfContents) {
  const map = {};
  for (const entry of shelfContents) {
    const r = entry?.musicResponsiveListItemRenderer;
    if (!r) continue;
    const cols = r.flexColumns || [];
    const videoId =
      cols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint
        ?.watchEndpoint?.videoId;
    if (!videoId) continue;
    const allRuns = cols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
    const dotIdx = allRuns.findIndex((run) => run.text === ' \u2022 ');
    const artistRuns = dotIdx >= 0 ? allRuns.slice(0, dotIdx) : allRuns;
    const artists = parseArtistsFromRuns(artistRuns);
    if (artists.length) map[videoId] = artists;
  }
  return map;
}

export function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}
