import { useState, useEffect, useCallback } from 'preact/hooks';
import { recentTracks, followedArtists, likedSongs, saveState } from '../../state/index.js';
import { TrackCard } from '../shared/TrackCard.jsx';
import { AlbumCard } from '../shared/AlbumCard.jsx';
import { ScrollContainer } from '../shared/ScrollContainer.jsx';
import { Spinner } from '../shared/Spinner.jsx';
import { useNavigation } from '../../hooks/useNavigation.js';
import { getCachedReleases, setCachedReleases } from '../../services/releasesCache.js';
import { api } from '../../services/api.js';

export function HomeView() {
  const { playFromList, showAlbumDetail, playAlbum } = useNavigation();

  const [greeting, setGreeting] = useState('');
  const [releases, setReleases] = useState(null);
  const [releasesLoading, setReleasesLoading] = useState(false);
  const [recommendedSongs, setRecommendedSongs] = useState([]);

  const recent = recentTracks.value;
  const followed = followedArtists.value;
  const liked = likedSongs.value;

  // Update greeting based on time of day
  useEffect(() => {
    const h = new Date().getHours();
    const text = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
    setGreeting(text);
  }, []);

  // Backfill missing artistIds in recent tracks
  useEffect(() => {
    async function backfillArtistIds() {
      const needsId = recent.filter((t) => t.artist && !t.artistId);
      if (!needsId.length) return;

      const uniqueNames = [...new Set(needsId.map((t) => t.artist))];
      const lookups = await Promise.all(
        uniqueNames.map((n) => api.searchArtists(n).catch(() => []))
      );
      const nameToId = {};
      uniqueNames.forEach((name, i) => {
        if (lookups[i]?.length) nameToId[name] = lookups[i][0].artistId;
      });

      let changed = false;
      const updated = recent.map((t) => {
        if (!t.artistId && nameToId[t.artist]) {
          changed = true;
          return { ...t, artistId: nameToId[t.artist] };
        }
        return t;
      });
      if (changed) {
        recentTracks.value = updated;
        saveState();
      }
    }
    backfillArtistIds();
  }, [recent]);

  // Fetch new releases from followed artists
  useEffect(() => {
    let cancelled = false;

    async function fetchNewReleases() {
      if (!followed.length) {
        setReleases([]);
        return;
      }

      const cached = getCachedReleases();
      if (cached) {
        setReleases(cached);
        return;
      }

      setReleasesLoading(true);
      try {
        const currentYear = new Date().getFullYear();
        const results = await Promise.allSettled(followed.map((a) => api.artistInfo(a.artistId)));

        if (cancelled) return;

        const seen = new Set();
        const releasesList = [];

        results.forEach((r, i) => {
          if (r.status !== 'fulfilled' || !r.value) return;
          const info = r.value;
          const followedArtistId = followed[i].artistId;
          const all = [...(info.topAlbums || []), ...(info.topSingles || [])];
          all.forEach((rel) => {
            if (rel.year >= currentYear && !seen.has(rel.albumId)) {
              seen.add(rel.albumId);
              releasesList.push({ ...rel, artistName: info.name, artistId: followedArtistId });
            }
          });
        });

        releasesList.sort((a, b) => (b.year || 0) - (a.year || 0));
        setCachedReleases(releasesList);
        setReleases(releasesList);
      } catch (err) {
        console.error('New releases error:', err);
        setReleases([]);
      } finally {
        if (!cancelled) setReleasesLoading(false);
      }
    }

    fetchNewReleases();
    return () => {
      cancelled = true;
    };
  }, [followed]);

  // Fetch recommendations based on top listened artists
  useEffect(() => {
    let cancelled = false;

    async function fetchRecommendations() {
      const allTracks = [...recent, ...liked];
      if (!allTracks.length) {
        setRecommendedSongs([]);
        return;
      }

      const artistCounts = {};
      allTracks.forEach((t) => {
        const trackArtists = t.artists?.length
          ? t.artists
          : t.artistId
            ? [{ name: t.artist, id: t.artistId }]
            : [];
        trackArtists.forEach((a) => {
          if (a.id) {
            if (!artistCounts[a.id])
              artistCounts[a.id] = { name: a.name, artistId: a.id, count: 0 };
            artistCounts[a.id].count++;
          }
        });
      });

      const topArtists = Object.values(artistCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      if (!topArtists.length) {
        setRecommendedSongs([]);
        return;
      }

      const knownTrackIds = new Set(allTracks.map((t) => t.id));
      const songs = [];

      const results = await Promise.allSettled(topArtists.map((a) => api.artistInfo(a.artistId)));

      if (cancelled) return;

      results.forEach((r) => {
        if (r.status !== 'fulfilled' || !r.value) return;
        const info = r.value;
        (info.topSongs || []).forEach((song) => {
          if (!knownTrackIds.has(song.id) && songs.length < 8) {
            songs.push(song);
            knownTrackIds.add(song.id);
          }
        });
      });

      setRecommendedSongs(songs);
    }

    fetchRecommendations();
    return () => {
      cancelled = true;
    };
  }, [recent, liked]);

  const handleTrackPlay = useCallback(
    (track) => {
      playFromList([track], 0);
    },
    [playFromList]
  );

  const handleAlbumClick = useCallback(
    (albumId, album) => {
      showAlbumDetail(albumId, album);
    },
    [showAlbumDetail]
  );

  const handleAlbumPlayClick = useCallback(
    (albumId) => {
      playAlbum(albumId);
    },
    [playAlbum]
  );

  const quickPicks = recent.slice(0, 6);
  const recentCards = recent.slice(0, 8);

  return (
    <div>
      {/* Greeting */}
      <h1 className="home-greeting">
        Good <span id="greeting-time">{greeting}</span>
      </h1>

      {/* Quick Picks */}
      {quickPicks.length > 0 && (
        <div id="quick-picks" className="quick-picks">
          {quickPicks.map((track) => (
            <div
              key={track.id}
              className="quick-pick-card"
              data-track-id={track.id}
              draggable="true"
              tabIndex={0}
              onClick={() => handleTrackPlay(track)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleTrackPlay(track);
                }
              }}
            >
              <img src={track.thumbnail} alt={track.title} loading="lazy" />
              <span>{track.title}</span>
              <button
                className="qp-play"
                title="Play"
                aria-label="Play"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTrackPlay(track);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7L8 5z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Recently Played */}
      <div id="recent-section">
        <h2>Recently Played</h2>
        <div id="recent-tracks" className="card-grid">
          {recentCards.length === 0 ? (
            <div className="empty-state">
              <p>Your recently played tracks will show up here.</p>
              <p>Start by searching for something!</p>
            </div>
          ) : (
            recentCards.map((track) => (
              <TrackCard key={track.id} track={track} onPlay={handleTrackPlay} />
            ))
          )}
        </div>
      </div>

      {/* New Releases from Followed Artists */}
      {followed.length > 0 && (
        <div
          id="new-releases-section"
          style={{ display: releases && releases.length > 0 ? '' : releasesLoading ? '' : 'none' }}
        >
          <h2>New Releases</h2>
          <div id="new-releases" className="album-scroll">
            {releasesLoading ? (
              <div className="loading" style={{ padding: '20px' }}>
                <Spinner />
              </div>
            ) : releases && releases.length > 0 ? (
              <ScrollContainer>
                {releases.map((album) => (
                  <AlbumCard
                    key={album.albumId}
                    album={album}
                    onPlay={handleAlbumPlayClick}
                    onClick={handleAlbumClick}
                  />
                ))}
              </ScrollContainer>
            ) : null}
          </div>
        </div>
      )}

      {/* Recommended Songs */}
      {recommendedSongs.length > 0 && (
        <div id="recommended-songs-section">
          <h2>Recommended For You</h2>
          <div id="recommended-songs" className="card-grid">
            {recommendedSongs.map((track) => (
              <TrackCard key={track.id} track={track} onPlay={handleTrackPlay} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
