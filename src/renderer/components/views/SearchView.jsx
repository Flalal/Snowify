import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { musicOnly } from '../../state/index.js';
import { TrackList } from '../shared/TrackList.jsx';
import { Spinner } from '../shared/Spinner.jsx';
import { useNavigation } from '../../hooks/useNavigation.js';
import { useLikeTrack } from '../../hooks/useLikeTrack.js';
import { SEARCH_DEBOUNCE_MS } from '../../../shared/constants.js';
import { api } from '../../services/api.js';

export function SearchView() {
  const { playFromList, openArtistPage } = useNavigation();
  const handleLike = useLikeTrack();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [artists, setArtists] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [noResults, setNoResults] = useState(false);
  const [searchError, setSearchError] = useState(false);

  const inputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Focus input when view is first shown
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const performSearch = useCallback(async (q) => {
    setLoading(true);
    setNoResults(false);
    setSearchError(false);

    try {
      const [results, artistResults] = await Promise.all([
        api.search(q, musicOnly.value),
        api.searchArtists(q)
      ]);

      if (!results.length && !artistResults.length) {
        setNoResults(true);
        setArtists([]);
        setTracks([]);
        setLoading(false);
        return;
      }

      setArtists(artistResults);
      setTracks(results);
    } catch (err) {
      setSearchError(true);
      setArtists([]);
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(e) {
    const q = e.currentTarget.value;
    setQuery(q);
    const trimmed = q.trim();

    clearTimeout(searchTimeoutRef.current);
    if (!trimmed) {
      setArtists([]);
      setTracks([]);
      setNoResults(false);
      setSearchError(false);
      setLoading(false);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => performSearch(trimmed), SEARCH_DEBOUNCE_MS);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      clearTimeout(searchTimeoutRef.current);
      const trimmed = query.trim();
      if (trimmed) performSearch(trimmed);
    }
  }

  function handleClear() {
    setQuery('');
    setArtists([]);
    setTracks([]);
    setNoResults(false);
    setSearchError(false);
    setLoading(false);
    if (inputRef.current) inputRef.current.focus();
  }

  const handlePlay = useCallback(
    (trackList, index) => {
      playFromList(trackList, index);
    },
    [playFromList]
  );

  const topArtist = artists[0] || null;
  const trimmedQuery = query.trim();

  return (
    <div>
      <div className="search-input-wrap">
        <svg
          className="search-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M16 16l4.5 4.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          id="search-input"
          type="text"
          placeholder="What do you want to listen to?"
          aria-label="Search songs, artists, albums"
          value={query}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
        />
        {trimmedQuery && (
          <button className="search-clear" aria-label="Clear search" onClick={handleClear}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        )}
      </div>

      <div id="search-results">
        {/* Empty state */}
        {!trimmedQuery && !loading && (
          <div className="empty-state search-empty">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#535353"
              strokeWidth="1.5"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M16 16l4.5 4.5" strokeLinecap="round" />
            </svg>
            <p>Search for songs, artists, or albums</p>
          </div>
        )}

        {/* Loading */}
        {loading && <Spinner />}

        {/* No results */}
        {noResults && !loading && (
          <div className="empty-state">
            <p>No results found for "{trimmedQuery}"</p>
          </div>
        )}

        {/* Search error */}
        {searchError && !loading && (
          <div className="empty-state">
            <p>Search failed. Please try again.</p>
          </div>
        )}

        {/* Artist result */}
        {!loading && topArtist && (
          <div>
            <h3 className="search-section-header">Artists</h3>
            <div
              className="artist-result-card"
              data-artist-id={topArtist.artistId}
              tabIndex={0}
              onClick={() => openArtistPage(topArtist.artistId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openArtistPage(topArtist.artistId);
                }
              }}
            >
              <img
                className="artist-result-avatar"
                src={topArtist.thumbnail || ''}
                alt={topArtist.name}
                loading="lazy"
              />
              <div className="artist-result-info">
                <div className="artist-result-name">{topArtist.name}</div>
                <div className="artist-result-label">
                  Artist{topArtist.subtitle ? ' \u00B7 ' + topArtist.subtitle : ''}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Song results */}
        {!loading && tracks.length > 0 && (
          <div>
            <h3 className="search-section-header">Songs</h3>
            <TrackList tracks={tracks} context="search" onPlay={handlePlay} onLike={handleLike} />
          </div>
        )}
      </div>
    </div>
  );
}
