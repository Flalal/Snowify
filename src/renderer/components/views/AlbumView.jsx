import { TrackList } from '../shared/TrackList.jsx';
import { ArtistLink } from '../shared/ArtistLink.jsx';
import { Spinner } from '../shared/Spinner.jsx';
import { showPlaylistPicker } from '../../state/ui.js';
import { useNavigation } from '../../hooks/useNavigation.js';
import { useLikeTrack } from '../../hooks/useLikeTrack.js';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import { shuffleArray } from '../../utils/shuffleArray.js';
import { api } from '../../services/api.js';

export function AlbumView({ albumId, albumMeta }) {
  const { playFromList } = useNavigation();
  const handleLike = useLikeTrack();

  const { data: album, loading, error } = useAsyncData(
    () => albumId ? api.albumTracks(albumId) : Promise.resolve(null),
    [albumId]
  );

  const hasError = error || (album && !album.tracks?.length);

  function handlePlayAll() {
    if (album && album.tracks.length) {
      playFromList(album.tracks, 0);
    }
  }

  function handleShuffle() {
    if (album && album.tracks.length) {
      playFromList(shuffleArray(album.tracks), 0);
    }
  }

  function handlePlay(tracks, index) {
    playFromList(tracks, index);
  }

  // Derive display values
  const displayName = album?.name || albumMeta?.name || 'Loading...';
  const displayThumbnail = album?.thumbnail || albumMeta?.thumbnail || '';
  const displayType = ((albumMeta?.type || 'ALBUM')).toUpperCase();

  // Build meta line parts
  const metaParts = [];
  if (album) {
    if (albumMeta?.year) metaParts.push(String(albumMeta.year));
    if (album.tracks) {
      metaParts.push(`${album.tracks.length} song${album.tracks.length !== 1 ? 's' : ''}`);
    }
  }

  return (
    <div>
      {/* Hero header */}
      <div className="album-hero">
        <img
          id="album-hero-img"
          className="album-hero-img"
          src={displayThumbnail}
          alt=""
        />
        <div className="album-hero-info">
          <div id="album-hero-type" className="album-hero-type">{displayType}</div>
          <h1 id="album-hero-name">{displayName}</h1>
          <p id="album-hero-meta">
            {album && album.artist && (
              <>
                <ArtistLink track={album} />
                {metaParts.length > 0 && (' \u00B7 ' + metaParts.join(' \u00B7 '))}
              </>
            )}
            {album && !album.artist && metaParts.join(' \u00B7 ')}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      {album && album.tracks.length > 0 && (
        <div className="album-actions">
          <button id="btn-album-play-all" className="btn-primary" onClick={handlePlayAll}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
            Play All
          </button>
          <button id="btn-album-shuffle" className="btn-secondary" onClick={handleShuffle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
            Shuffle
          </button>
          <button className="btn-secondary" onClick={() => showPlaylistPicker(album.tracks)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add to Playlist
          </button>
        </div>
      )}

      {/* Track list or loading/error */}
      <div id="album-tracks">
        {loading && <Spinner />}
        {hasError && !loading && (
          <div className="empty-state"><p>Could not load album tracks.</p></div>
        )}
        {!loading && !hasError && album && album.tracks.length > 0 && (
          <TrackList
            tracks={album.tracks}
            context="album"
            onPlay={handlePlay}
            onLike={handleLike}
          />
        )}
      </div>
    </div>
  );
}
