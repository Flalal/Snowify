import { useState, useCallback } from 'preact/hooks';
import { country } from '../../state/index.js';
import { ArtistCard } from '../shared/ArtistCard.jsx';
import { VideoCard } from '../shared/VideoCard.jsx';
import { ScrollContainer } from '../shared/ScrollContainer.jsx';
import { Spinner } from '../shared/Spinner.jsx';
import { ArtistLink } from '../shared/ArtistLink.jsx';
import { showToast } from '../../state/ui.js';
import { useNavigation } from '../../hooks/useNavigation.js';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import { EXPLORE_CACHE_TTL } from '../../../shared/constants.js';
import { api } from '../../services/api.js';

const MOOD_COLORS = [
  '#1db954', '#e13300', '#8c67ab', '#e8115b', '#1e90ff',
  '#f59b23', '#158a43', '#ba55d3', '#e05050', '#509bf5',
  '#ff6437', '#7358ff', '#27856a', '#e91e63', '#1db4e8',
  '#af2896', '#148a08', '#dc5b2e', '#5080ff', '#d84000',
];

const POPULAR_MOODS = new Set([
  'pop', 'hip-hop', 'r&b', 'rock', 'chill', 'workout', 'party',
  'focus', 'romance', 'sad', 'feel good', 'jazz', 'classical',
  'country', 'electronic', 'indie', 'sleep', 'energy booster',
  'commute', 'latin', 'k-pop', 'metal',
]);

// Module-level caches
let _exploreCache = null;
let _chartsCache = null;
let _exploreCacheTime = 0;
let _chartsCacheTime = 0;

async function fetchExploreData() {
  const now = Date.now();
  if (_exploreCache && now - _exploreCacheTime < EXPLORE_CACHE_TTL) return _exploreCache;
  _exploreCache = await api.explore();
  _exploreCacheTime = now;
  return _exploreCache;
}

async function fetchChartsData() {
  const now = Date.now();
  if (_chartsCache && now - _chartsCacheTime < EXPLORE_CACHE_TTL) return _chartsCache;
  _chartsCache = await api.charts();
  _chartsCacheTime = now;
  return _chartsCache;
}

export function ExploreView() {
  const { playFromList, showAlbumDetail, openArtistPage, openVideoPlayer, playAlbum } = useNavigation();

  const [moodPlaylists, setMoodPlaylists] = useState(null);
  const [moodLabel, setMoodLabel] = useState('');
  const [moodLoading, setMoodLoading] = useState(false);

  const countryVal = country.value;

  const { data: exploreAndCharts, loading } = useAsyncData(async () => {
    await api.setCountry(countryVal || '');
    const [explore, charts] = await Promise.all([fetchExploreData(), fetchChartsData()]);
    return { explore, charts };
  }, [countryVal]);
  const exploreData = exploreAndCharts?.explore || null;
  const chartsData = exploreAndCharts?.charts || null;

  const handleAlbumClick = useCallback((albumId, album) => {
    showAlbumDetail(albumId, album);
  }, [showAlbumDetail]);

  const handleAlbumPlayClick = useCallback((albumId) => {
    playAlbum(albumId);
  }, [playAlbum]);

  const handleArtistClick = useCallback((artistId) => {
    openArtistPage(artistId);
  }, [openArtistPage]);

  const handleVideoClick = useCallback((video) => {
    const id = video.videoId || video.id;
    const name = video.name || video.title;
    openVideoPlayer(id, name, video.artist);
  }, [openVideoPlayer]);

  const handleTopSongClick = useCallback((track, index, topSongsList) => {
    playFromList(topSongsList, index);
  }, [playFromList]);

  const handleMusicVideoClick = useCallback((video) => {
    // Explore music videos play as audio via playFromList
    playFromList([video], 0);
  }, [playFromList]);

  async function handleMoodClick(browseId, params, label) {
    setMoodLoading(true);
    setMoodLabel(label);
    try {
      const playlists = await api.browseMood(browseId, params);
      if (!playlists?.length) {
        showToast('No playlists found for this mood');
        setMoodLoading(false);
        return;
      }
      setMoodPlaylists(playlists);
    } catch {
      showToast('No playlists found for this mood');
    } finally {
      setMoodLoading(false);
    }
  }

  function handleMoodBack() {
    setMoodPlaylists(null);
    setMoodLabel('');
  }

  async function handleMoodPlaylistClick(playlistId) {
    try {
      const vids = await api.getPlaylistVideos(playlistId);
      if (vids?.length) {
        playFromList(vids, 0);
      } else {
        showToast('Could not load playlist');
      }
    } catch {
      showToast('Could not load playlist');
    }
  }

  if (loading) {
    return (
      <div id="explore-content">
        <Spinner />
      </div>
    );
  }

  if (!exploreData && !chartsData) {
    return (
      <div id="explore-content">
        <div className="empty-state"><p>Could not load explore data.</p></div>
      </div>
    );
  }

  const topSongs = chartsData?.topSongs || [];
  const topArtists = chartsData?.topArtists || [];
  const newMusicVideos = (exploreData?.newMusicVideos || []).slice(0, 15);
  const moods = exploreData?.moods || [];

  const filteredMoods = moods.filter(m => POPULAR_MOODS.has(m.label.toLowerCase()));
  const displayMoods = filteredMoods.length ? filteredMoods : moods.slice(0, 16);

  return (
    <div id="explore-content">
      {/* Country hint banner */}
      {!countryVal && (
        <div className="explore-country-hint">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
          <span>
            Set your country in Settings for more relevant recommendations
          </span>
        </div>
      )}

      {/* Trending (from charts) */}
      {topSongs.length > 0 && (
        <div className="explore-section">
          <h2>Trending</h2>
          <div className="top-songs-grid">
            {topSongs.map((track, i) => (
              <div
                key={track.id}
                className="top-song-item"
                data-track-id={track.id}
                onClick={() => handleTopSongClick(track, i, topSongs)}
              >
                <div className="top-song-rank">{track.rank || i + 1}</div>
                <div className="top-song-thumb-wrap">
                  <img className="top-song-thumb" src={track.thumbnail} alt="" loading="lazy" />
                  <div className="top-song-play">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7L8 5z" />
                    </svg>
                  </div>
                </div>
                <div className="top-song-info">
                  <div className="top-song-title">{track.title}</div>
                  <div className="top-song-artist">
                    <ArtistLink track={track} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Artists (from charts) */}
      {topArtists.length > 0 && (
        <div className="explore-section">
          <h2>Top Artists</h2>
          <ScrollContainer>
            <div className="album-scroll top-artists-scroll">
              {topArtists.map((a, i) => (
                <ArtistCard
                  key={a.artistId}
                  artist={a}
                  rank={i + 1}
                  onClick={handleArtistClick}
                />
              ))}
            </div>
          </ScrollContainer>
        </div>
      )}

      {/* New Music Videos */}
      {newMusicVideos.length > 0 && (
        <div className="explore-section">
          <h2>New Music Videos</h2>
          <ScrollContainer>
            <div className="album-scroll music-video-scroll">
              {newMusicVideos.map(v => {
                const videoId = v.videoId || v.id;
                return (
                  <div
                    key={videoId}
                    className="video-card"
                    data-video-id={videoId}
                    onClick={() => handleMusicVideoClick(v)}
                  >
                    <img className="video-card-thumb" src={v.thumbnail} alt="" loading="lazy" />
                    <button
                      className="video-card-play"
                      title="Watch"
                      onClick={(e) => { e.stopPropagation(); handleMusicVideoClick(v); }}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7L8 5z" />
                      </svg>
                    </button>
                    <div className="video-card-name" title={v.title || v.name}>{v.title || v.name}</div>
                    <div className="video-card-duration">
                      <ArtistLink track={v} />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollContainer>
        </div>
      )}

      {/* Moods & Genres */}
      {displayMoods.length > 0 && (
        <div className="explore-section" id="explore-moods-section">
          {moodPlaylists ? (
            <>
              <h2>{moodLabel}</h2>
              <button className="explore-back-btn" onClick={handleMoodBack}>
                {'\u2190'} Back to Moods & Genres
              </button>
              <ScrollContainer>
                <div className="album-scroll">
                  {moodPlaylists.map(p => (
                    <div
                      key={p.playlistId}
                      className="album-card"
                      data-playlist-id={p.playlistId}
                      onClick={() => handleMoodPlaylistClick(p.playlistId)}
                    >
                      <img className="album-card-cover" src={p.thumbnail} alt="" loading="lazy" />
                      <div className="album-card-name" title={p.name}>{p.name}</div>
                      <div className="album-card-meta">{p.subtitle || ''}</div>
                    </div>
                  ))}
                </div>
              </ScrollContainer>
            </>
          ) : moodLoading ? (
            <Spinner />
          ) : (
            <>
              <h2>Moods & Genres</h2>
              <div className="mood-grid">
                {displayMoods.map((m, i) => {
                  const bg = MOOD_COLORS[i % MOOD_COLORS.length];
                  return (
                    <div
                      key={m.browseId || i}
                      className="mood-card"
                      data-browse-id={m.browseId}
                      data-params={m.params || ''}
                      style={{ borderLeftColor: bg }}
                      onClick={() => handleMoodClick(m.browseId, m.params || '', m.label)}
                    >
                      {m.label}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Fallback if absolutely nothing loaded */}
      {!topSongs.length && !topArtists.length &&
       !newMusicVideos.length && !displayMoods.length && (
        <div className="empty-state"><p>No explore data available.</p></div>
      )}
    </div>
  );
}

// Export for cache invalidation from settings
export function invalidateExploreCache() {
  _exploreCache = null;
  _chartsCache = null;
  _exploreCacheTime = 0;
  _chartsCacheTime = 0;
}
