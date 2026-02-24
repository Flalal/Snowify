// ─── Explore (New Releases, Trending, Charts, Moods) IPC Handlers ───

import { parseArtistsFromRuns, buildArtistFields } from '../utils/parse.js';
import { getBestThumbnail, getSquareThumbnail } from '../utils/format.js';
import { createHandler } from './middleware.js';

let _currentCountry = '';

export function register(ipcMain, deps) {
  const { getYtMusic } = deps;

  ipcMain.handle(
    'yt:setCountry',
    createHandler(
      'yt:setCountry',
      async (_event, countryCode) => {
        const ytmusic = getYtMusic();
        if (!ytmusic?.config) return false;
        const code = countryCode || '';
        if (code) {
          ytmusic.config.GL = code;
          ytmusic.config.INNERTUBE_CONTEXT_GL = code;
          if (ytmusic.config.INNERTUBE_CONTEXT?.client) {
            ytmusic.config.INNERTUBE_CONTEXT.client.gl = code;
          }
        }
        ytmusic.config.HL = 'en';
        ytmusic.config.INNERTUBE_CONTEXT_HL = 'en';
        if (ytmusic.config.INNERTUBE_CONTEXT?.client) {
          ytmusic.config.INNERTUBE_CONTEXT.client.hl = 'en';
        }
        _currentCountry = code;
        return true;
      },
      false
    )
  );

  ipcMain.handle(
    'yt:explore',
    createHandler('yt:explore', async () => {
      const ytmusic = getYtMusic();
      const rawData = await ytmusic.constructRequest('browse', { browseId: 'FEmusic_explore' });
      const sections =
        rawData?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
          ?.sectionListRenderer?.contents || [];

      const result = { newAlbums: [], moods: [], newMusicVideos: [] };

      for (const section of sections) {
        const carousel = section?.musicCarouselShelfRenderer;
        if (!carousel) continue;
        const title = (
          carousel?.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text || ''
        ).toLowerCase();

        if (title.includes('new albums') || title.includes('new release')) {
          result.newAlbums = (carousel.contents || [])
            .map((item) => {
              const r = item?.musicTwoRowItemRenderer;
              if (!r) return null;
              const albumId = r?.navigationEndpoint?.browseEndpoint?.browseId || '';
              if (!albumId) return null;
              const subtitleRuns = r?.subtitle?.runs || [];
              const artists = parseArtistsFromRuns(subtitleRuns);
              const artistFields = artists.length
                ? buildArtistFields(artists)
                : { artist: subtitleRuns.map((s) => s.text).join(''), artistId: null };
              return {
                albumId,
                name: r?.title?.runs?.[0]?.text || 'Unknown',
                ...artistFields,
                thumbnail: getSquareThumbnail(
                  r?.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails || [],
                  300
                ),
                year: null,
                type: 'Album'
              };
            })
            .filter(Boolean);
        } else if (title.includes('music video')) {
          result.newMusicVideos = (carousel.contents || [])
            .map((item) => {
              const r = item?.musicTwoRowItemRenderer;
              if (!r) return null;
              const videoId = r?.navigationEndpoint?.watchEndpoint?.videoId || '';
              if (!videoId) return null;
              const subtitleRuns = r?.subtitle?.runs || [];
              const artists = parseArtistsFromRuns(subtitleRuns);
              const artistFields = artists.length
                ? buildArtistFields(artists)
                : { artist: subtitleRuns.map((s) => s.text).join(''), artistId: null };
              return {
                id: videoId,
                title: r?.title?.runs?.[0]?.text || 'Unknown',
                ...artistFields,
                thumbnail: getBestThumbnail(
                  r?.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails || []
                ),
                duration: '',
                durationMs: 0,
                url: `https://music.youtube.com/watch?v=${videoId}`
              };
            })
            .filter(Boolean);
        } else if (title.includes('mood') || title.includes('genre')) {
          result.moods = (carousel.contents || [])
            .map((item) => {
              const r = item?.musicNavigationButtonRenderer || item?.musicTwoRowItemRenderer;
              if (!r) return null;
              const browseId =
                r?.clickCommand?.browseEndpoint?.browseId ||
                r?.navigationEndpoint?.browseEndpoint?.browseId ||
                '';
              const params =
                r?.clickCommand?.browseEndpoint?.params ||
                r?.navigationEndpoint?.browseEndpoint?.params ||
                '';
              const label = r?.buttonText?.runs?.[0]?.text || r?.title?.runs?.[0]?.text || '';
              const color = r?.solid?.leftStripeColor;
              if (!browseId || !label) return null;
              return {
                browseId,
                params,
                label,
                color: color ? `#${(color >>> 0).toString(16).padStart(8, '0').slice(0, 6)}` : null
              };
            })
            .filter(Boolean);
        }
      }

      return result;
    })
  );

  ipcMain.handle(
    'yt:charts',
    createHandler('yt:charts', async () => {
      const ytmusic = getYtMusic();
      const rawData = await ytmusic.constructRequest('browse', { browseId: 'FEmusic_charts' });
      let sections =
        rawData?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
          ?.sectionListRenderer?.contents || [];
      if (!sections.length) {
        sections = rawData?.contents?.sectionListRenderer?.contents || [];
      }

      const result = { topSongs: [], topVideos: [], topArtists: [] };

      // Extract chart playlist IDs from the "Video charts" carousel
      let trendingPlaylistId = null;
      for (const section of sections) {
        const carousel = section?.musicCarouselShelfRenderer;
        if (!carousel) continue;
        const title = (
          carousel?.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text || ''
        ).toLowerCase();

        if (title.includes('video chart') || title.includes('trending')) {
          for (const item of carousel.contents || []) {
            const r = item?.musicTwoRowItemRenderer;
            if (!r) continue;
            const itemTitle = (r?.title?.runs || [])
              .map((run) => run.text)
              .join('')
              .toLowerCase();
            const browseId = r?.navigationEndpoint?.browseEndpoint?.browseId || '';
            if (itemTitle.includes('trending') && browseId) {
              trendingPlaylistId = browseId;
              break;
            }
          }
        } else if (title.includes('top artist') || title.includes('trending artist')) {
          result.topArtists = (carousel.contents || [])
            .slice(0, 20)
            .map((item) => {
              const r = item?.musicResponsiveListItemRenderer || item?.musicTwoRowItemRenderer;
              if (!r) return null;
              const artistId = r?.navigationEndpoint?.browseEndpoint?.browseId || '';
              if (!artistId || !artistId.startsWith('UC')) return null;
              const name =
                r?.title?.runs?.[0]?.text ||
                r?.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]
                  ?.text ||
                'Unknown';
              return {
                artistId,
                name,
                thumbnail: getSquareThumbnail(
                  r?.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
                    r?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
                    [],
                  226
                )
              };
            })
            .filter(Boolean);
        }
      }

      // Fetch top songs from the Trending chart playlist
      if (trendingPlaylistId) {
        const plRaw = await ytmusic.constructRequest('browse', { browseId: trendingPlaylistId });
        const plShelf =
          plRaw?.contents?.twoColumnBrowseResultsRenderer?.secondaryContents?.sectionListRenderer
            ?.contents?.[0]?.musicPlaylistShelfRenderer;
        result.topSongs = (plShelf?.contents || [])
          .map((item) => {
            const r = item?.musicResponsiveListItemRenderer;
            if (!r) return null;
            const cols = r.flexColumns || [];
            const videoId =
              r?.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer
                ?.playNavigationEndpoint?.watchEndpoint?.videoId ||
              cols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]
                ?.navigationEndpoint?.watchEndpoint?.videoId;
            if (!videoId) return null;
            const trackName =
              cols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text ||
              'Unknown';
            const artistRuns = cols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
            const artists = parseArtistsFromRuns(artistRuns);
            const artistFields = artists.length
              ? buildArtistFields(artists)
              : { artist: artistRuns.map((s) => s.text).join(''), artistId: null };
            const thumbs = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
            const rank =
              r?.customIndexColumn?.musicCustomIndexColumnRenderer?.text?.runs?.[0]?.text || '';
            return {
              id: videoId,
              title: trackName,
              ...artistFields,
              thumbnail: getSquareThumbnail(thumbs),
              rank: parseInt(rank, 10) || 0,
              duration:
                r?.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]
                  ?.text || '',
              url: `https://music.youtube.com/watch?v=${videoId}`
            };
          })
          .filter(Boolean);
      }

      return result;
    })
  );

  ipcMain.handle(
    'yt:browseMood',
    createHandler(
      'yt:browseMood',
      async (_event, browseId, params) => {
        const ytmusic = getYtMusic();
        const rawData = await ytmusic.constructRequest('browse', { browseId, params });
        const grid =
          rawData?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
            ?.sectionListRenderer?.contents || [];
        const playlists = [];
        for (const section of grid) {
          const items =
            section?.gridRenderer?.items || section?.musicCarouselShelfRenderer?.contents || [];
          for (const item of items) {
            const r = item?.musicTwoRowItemRenderer;
            if (!r) continue;
            const playlistId = r?.navigationEndpoint?.browseEndpoint?.browseId || '';
            if (!playlistId) continue;
            playlists.push({
              playlistId,
              name: r?.title?.runs?.[0]?.text || 'Unknown',
              subtitle: (r?.subtitle?.runs || []).map((s) => s.text).join(''),
              thumbnail: getSquareThumbnail(
                r?.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
                  r?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
                  [],
                300
              )
            });
          }
        }
        return playlists;
      },
      []
    )
  );

  ipcMain.handle(
    'yt:getPlaylistVideos',
    createHandler(
      'yt:getPlaylistVideos',
      async (_event, browseId) => {
        const ytmusic = getYtMusic();
        const rawData = await ytmusic.constructRequest('browse', { browseId });

        const plShelf =
          rawData?.contents?.twoColumnBrowseResultsRenderer?.secondaryContents?.sectionListRenderer
            ?.contents?.[0]?.musicPlaylistShelfRenderer ||
          rawData?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
            ?.sectionListRenderer?.contents?.[0]?.musicPlaylistShelfRenderer;

        if (!plShelf) return [];

        return (plShelf.contents || [])
          .map((item) => {
            const r = item?.musicResponsiveListItemRenderer;
            if (!r) return null;

            const cols = r.flexColumns || [];
            const videoId =
              r?.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer
                ?.playNavigationEndpoint?.watchEndpoint?.videoId ||
              cols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]
                ?.navigationEndpoint?.watchEndpoint?.videoId;
            if (!videoId) return null;

            const trackName =
              cols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text ||
              'Unknown';
            const artistRuns = cols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
            const artists = parseArtistsFromRuns(artistRuns);
            const artistFields = artists.length
              ? buildArtistFields(artists)
              : { artist: artistRuns.map((s) => s.text).join(''), artistId: null };

            const thumbs = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
            const durationText =
              r?.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]
                ?.text || '';

            return {
              id: videoId,
              title: trackName,
              ...artistFields,
              thumbnail: getSquareThumbnail(thumbs),
              duration: durationText,
              url: `https://music.youtube.com/watch?v=${videoId}`
            };
          })
          .filter(Boolean);
      },
      []
    )
  );
}
