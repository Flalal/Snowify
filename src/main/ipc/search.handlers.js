// ─── Search & Artist/Album IPC Handlers ───

import {
  parseArtistsFromRuns,
  buildArtistFields,
  mapSongToTrack,
  extractArtistMap
} from '../utils/parse.js';
import { formatDuration, getBestThumbnail, getSquareThumbnail } from '../utils/format.js';
import { createHandler } from './middleware.js';

export function register(ipcMain, deps) {
  const { getYtMusic } = deps;

  ipcMain.handle(
    'yt:search',
    createHandler(
      'yt:search',
      async (_event, query, musicOnly) => {
        const ytmusic = getYtMusic();
        if (musicOnly) {
          // Filter: music songs only, exclude videos
          const rawParams = 'EgWKAQIIAWoOEAMQBBAJEAoQBRAREBU%3D';
          const [songs, rawData] = await Promise.all([
            ytmusic.searchSongs(query),
            ytmusic.constructRequest('search', { query, params: rawParams }).catch(() => null)
          ]);

          const rawArtistsMap = {};
          if (rawData) {
            const shelves =
              rawData?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content
                ?.sectionListRenderer?.contents || [];
            for (const s of shelves) {
              Object.assign(rawArtistsMap, extractArtistMap(s?.musicShelfRenderer?.contents || []));
            }
          }

          return songs
            .filter((s) => s.videoId)
            .map((song) => {
              const artists = rawArtistsMap[song.videoId] || null;
              return mapSongToTrack(song, artists);
            });
        } else {
          const [results, rawData] = await Promise.all([
            ytmusic.search(query),
            ytmusic.constructRequest('search', { query }).catch(() => null)
          ]);

          const rawArtistsMap = {};
          if (rawData) {
            const shelves =
              rawData?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content
                ?.sectionListRenderer?.contents || [];
            for (const s of shelves) {
              Object.assign(rawArtistsMap, extractArtistMap(s?.musicShelfRenderer?.contents || []));
            }
          }

          return results
            .filter((r) => (r.type === 'SONG' || r.type === 'VIDEO') && r.videoId)
            .map((r) => {
              const artists = rawArtistsMap[r.videoId] || null;
              const artistFields = artists
                ? buildArtistFields(artists)
                : {
                    artist: r.artist?.name || 'Unknown Artist',
                    artistId: r.artist?.artistId || null,
                    artists: r.artist
                      ? [{ name: r.artist.name, id: r.artist.artistId || null }]
                      : []
                  };
              return {
                id: r.videoId,
                title: r.name || 'Unknown',
                ...artistFields,
                thumbnail: getSquareThumbnail(r.thumbnails),
                duration: formatDuration(r.duration),
                durationMs: r.duration ? Math.round(r.duration * 1000) : 0,
                url: `https://music.youtube.com/watch?v=${r.videoId}`
              };
            });
        }
      },
      []
    )
  );

  ipcMain.handle(
    'yt:searchArtists',
    createHandler(
      'yt:searchArtists',
      async (_event, query) => {
        const ytmusic = getYtMusic();
        // Use raw API to get subscriber/listener info alongside artist data
        // Filter: artists only
        const rawData = await ytmusic.constructRequest('search', {
          query,
          params: 'Eg-KAQwIABAAGAAgASgAMABqChAEEAMQCRAFEAo%3D'
        });

        const items = [];
        const shelf =
          rawData?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content
            ?.sectionListRenderer?.contents || [];
        for (const s of shelf) {
          const entries = s?.musicShelfRenderer?.contents || [];
          for (const entry of entries) {
            const r = entry?.musicResponsiveListItemRenderer;
            if (!r) continue;
            const cols = r.flexColumns || [];
            const runs = cols.flatMap(
              (c) => c?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || []
            );
            const browseId = r.navigationEndpoint?.browseEndpoint?.browseId || '';
            const name = runs[0]?.text || '';
            const subtitle = runs
              .slice(1)
              .map((r) => r.text)
              .join('')
              .replace(/^\s*•\s*/, '')
              .trim();
            const thumbnails = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
            if (browseId && name) {
              items.push({
                artistId: browseId,
                name,
                thumbnail: getBestThumbnail(thumbnails),
                subtitle: subtitle.replace(/^Artist\s*•?\s*/i, '').trim()
              });
            }
          }
        }
        return items;
      },
      []
    )
  );

  ipcMain.handle(
    'yt:artistInfo',
    createHandler('yt:artistInfo', async (_event, artistId) => {
      const ytmusic = getYtMusic();
      const artist = await ytmusic.getArtist(artistId);

      // Fetch raw browse data to extract fields the library parser misses
      let monthlyListeners = '';
      let banner = '';
      let fansAlsoLike = [];
      let livePerformances = [];
      const rawTopSongsArtists = {};
      const rawTopSongsPlays = {};
      try {
        const rawData = await ytmusic.constructRequest('browse', { browseId: artistId });
        const header =
          rawData?.header?.musicImmersiveHeaderRenderer ||
          rawData?.header?.musicVisualHeaderRenderer;
        monthlyListeners = header?.monthlyListenerCount?.runs?.[0]?.text || '';
        const bannerThumbs = header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
        const bannerUrl = getBestThumbnail(bannerThumbs);
        if (bannerUrl && bannerUrl.includes('lh3.googleusercontent.com')) {
          banner = bannerUrl.replace(/=(?:w\d+-h\d+|s\d+|p-w\d+).*$/, '=w1440-h600-p-l90-rj');
        } else {
          banner = bannerUrl;
        }

        // Parse carousel sections by title instead of hardcoded index
        const sections =
          rawData?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
            ?.sectionListRenderer?.contents || [];

        for (const section of sections) {
          const carousel = section?.musicCarouselShelfRenderer;
          if (!carousel) continue;
          const title =
            carousel?.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text?.toLowerCase() ||
            '';

          if (title.includes('fans might also like')) {
            fansAlsoLike = (carousel.contents || [])
              .map((item) => {
                const r = item?.musicTwoRowItemRenderer;
                if (!r) return null;
                const browseId = r?.navigationEndpoint?.browseEndpoint?.browseId || '';
                if (!browseId.startsWith('UC')) return null;
                return {
                  artistId: browseId,
                  name: r?.title?.runs?.[0]?.text || 'Unknown',
                  thumbnail: getSquareThumbnail(
                    r?.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails || [],
                    226
                  )
                };
              })
              .filter(Boolean);
          } else if (title.includes('live performance')) {
            livePerformances = (carousel.contents || [])
              .map((item) => {
                const r = item?.musicTwoRowItemRenderer;
                if (!r) return null;
                const videoId = r?.navigationEndpoint?.watchEndpoint?.videoId || '';
                if (!videoId) return null;
                return {
                  videoId,
                  name: r?.title?.runs?.[0]?.text || 'Untitled',
                  artist: artist.name || 'Unknown Artist',
                  artistId: artistId,
                  thumbnail: getBestThumbnail(
                    r?.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails || []
                  ),
                  duration: ''
                };
              })
              .filter(Boolean);
          }
        }
        // Parse multi-artist data + plays from Songs shelf (first musicShelfRenderer, may have no title)
        for (const section of sections) {
          const shelf = section?.musicShelfRenderer;
          if (!shelf) continue;
          for (const item of shelf.contents || []) {
            const r = item?.musicResponsiveListItemRenderer;
            if (!r) continue;
            const cols = r.flexColumns || [];
            const videoId =
              cols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]
                ?.navigationEndpoint?.watchEndpoint?.videoId;
            if (!videoId) continue;
            const artistRuns = cols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
            const artists = parseArtistsFromRuns(artistRuns);
            if (artists.length) rawTopSongsArtists[videoId] = artists;
            const playsText =
              cols[2]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || '';
            if (playsText) rawTopSongsPlays[videoId] = playsText;
          }
          break;
        }
      } catch (_) {
        /* raw data extraction is best-effort */
      }

      return {
        name: artist.name || 'Unknown',
        artistId: artist.artistId || '',
        description: '',
        followers: 0,
        monthlyListeners,
        banner,
        tags: [],
        avatar: getSquareThumbnail(artist.thumbnails, 512),
        topSongs: (artist.topSongs || [])
          .filter((s) => s.videoId)
          .map((song) => {
            const artists = rawTopSongsArtists[song.videoId] || null;
            const track = mapSongToTrack(song, artists);
            if (rawTopSongsPlays[song.videoId]) track.plays = rawTopSongsPlays[song.videoId];
            return track;
          }),
        topAlbums: (artist.topAlbums || []).map((a) => ({
          albumId: a.albumId,
          playlistId: a.playlistId,
          name: a.name,
          year: a.year,
          type: 'Album',
          thumbnail: getSquareThumbnail(a.thumbnails, 300)
        })),
        topSingles: (artist.topSingles || []).map((a) => ({
          albumId: a.albumId,
          playlistId: a.playlistId,
          name: a.name,
          year: a.year,
          type: 'Single',
          thumbnail: getSquareThumbnail(a.thumbnails, 300)
        })),
        topVideos: (artist.topVideos || []).map((v) => ({
          videoId: v.videoId,
          name: v.name || 'Untitled Video',
          artist: v.artist?.name || 'Unknown Artist',
          artistId: v.artist?.artistId || null,
          thumbnail: getBestThumbnail(v.thumbnails),
          duration: formatDuration(v.duration)
        })),
        fansAlsoLike,
        livePerformances
      };
    })
  );

  ipcMain.handle(
    'yt:albumTracks',
    createHandler('yt:albumTracks', async (_event, albumId) => {
      const ytmusic = getYtMusic();
      const [album, rawData] = await Promise.all([
        ytmusic.getAlbum(albumId),
        ytmusic.constructRequest('browse', { browseId: albumId }).catch(() => null)
      ]);

      const rawArtistsMap = {};
      let albumArtists = [];
      if (rawData) {
        const headerRuns =
          rawData?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
            ?.sectionListRenderer?.contents?.[0]?.musicResponsiveHeaderRenderer?.straplineTextOne
            ?.runs || [];
        albumArtists = parseArtistsFromRuns(headerRuns);

        const shelfItems =
          rawData?.contents?.twoColumnBrowseResultsRenderer?.secondaryContents?.sectionListRenderer
            ?.contents?.[0]?.musicShelfRenderer?.contents || [];
        for (const item of shelfItems) {
          const r = item?.musicResponsiveListItemRenderer;
          if (!r) continue;
          const cols = r.flexColumns || [];
          const videoId =
            cols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint
              ?.watchEndpoint?.videoId;
          if (!videoId) continue;
          const artistRuns = cols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
          const artists = parseArtistsFromRuns(artistRuns);
          if (artists.length) rawArtistsMap[videoId] = artists;
        }
      }

      const tracks = (album.songs || [])
        .filter((s) => s.videoId)
        .map((song) => {
          const artists =
            rawArtistsMap[song.videoId] || (albumArtists.length ? albumArtists : null);
          return mapSongToTrack(song, artists);
        });

      const albumArtistFields = albumArtists.length
        ? buildArtistFields(albumArtists)
        : buildArtistFields(
            album.artist?.id ? [{ name: album.artist.name, id: album.artist.id }] : []
          );

      return {
        name: album.name || 'Unknown Album',
        ...albumArtistFields,
        year: album.year || null,
        thumbnail: getSquareThumbnail(album.thumbnails, 300),
        tracks
      };
    })
  );

  ipcMain.handle(
    'yt:getUpNexts',
    createHandler(
      'yt:getUpNexts',
      async (_event, videoId) => {
        const ytmusic = getYtMusic();
        const rawData = await ytmusic.constructRequest('next', {
          videoId,
          playlistId: `RDAMVM${videoId}`,
          isAudioOnly: true
        });

        const contents =
          rawData?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer
            ?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer
            ?.content?.playlistPanelRenderer?.contents || [];

        return contents
          .slice(1)
          .map((item) => {
            const r = item?.playlistPanelVideoRenderer;
            if (!r) return null;
            const vid = r.navigationEndpoint?.watchEndpoint?.videoId;
            if (!vid) return null;

            const allRuns = r.longBylineText?.runs || [];
            const dotIdx = allRuns.findIndex((run) => run.text === ' \u2022 ');
            const artistRuns = dotIdx >= 0 ? allRuns.slice(0, dotIdx) : allRuns;
            const artists = parseArtistsFromRuns(artistRuns);

            const durationText = r.lengthText?.runs?.[0]?.text || '';
            const durationParts = durationText.split(':').map(Number);
            let durationMs = 0;
            if (durationParts.length === 2)
              durationMs = (durationParts[0] * 60 + durationParts[1]) * 1000;
            else if (durationParts.length === 3)
              durationMs =
                (durationParts[0] * 3600 + durationParts[1] * 60 + durationParts[2]) * 1000;

            const thumbnail = getSquareThumbnail(r.thumbnail?.thumbnails || []);

            return {
              id: vid,
              title: r.title?.runs?.[0]?.text || 'Unknown',
              ...buildArtistFields(artists),
              thumbnail,
              duration: durationText,
              durationMs,
              url: `https://music.youtube.com/watch?v=${vid}`
            };
          })
          .filter(Boolean);
      },
      []
    )
  );
}
