import { ArtistLink } from './ArtistLink.jsx';
import { showContextMenu } from '../../state/ui.js';

/**
 * A single row in a track list.
 *
 * Props:
 *   track      - track object { id, title, thumbnail, artist, artists, artistId, plays, ... }
 *   index      - numeric index in the list (0-based)
 *   context    - context string (e.g. 'search', 'album', 'playlist')
 *   isPlaying  - whether this track is the currently playing track
 *   isLiked    - whether the current user has liked this track
 *   showPlays  - whether to show the plays column
 *   onPlay     - callback when the row is clicked to play
 *   onLike     - callback when the like button is clicked
 *   onContextMenu - callback for right-click context menu
 *   onDragStart   - callback for drag start
 */
export function TrackRow({
  track,
  index,
  context,
  isPlaying,
  isLiked,
  showPlays,
  onPlay,
  onLike,
  onAddToPlaylist,
  onContextMenu,
  onDragStart
}) {
  const modifier = showPlays ? ' has-plays' : '';

  function handleClick() {
    if (onPlay) onPlay(index);
  }

  function handleContextMenu(e) {
    if (onContextMenu) {
      onContextMenu(e, track);
    } else {
      showContextMenu(e, track);
    }
  }

  function handleDragStart(e) {
    if (onDragStart) onDragStart(e, track);
  }

  function handleLikeClick(e) {
    e.stopPropagation();
    if (onLike) onLike(track, e.currentTarget);
  }

  function handleAddToPlaylist(e) {
    e.stopPropagation();
    if (onAddToPlaylist) onAddToPlaylist(track);
  }

  return (
    <div
      className={`track-row${isPlaying ? ' playing' : ''}${modifier}`}
      data-track-id={track.id}
      data-context={context}
      data-index={index}
      draggable="true"
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
    >
      <div className="track-num">
        <span className="track-num-text">{isPlaying ? '\u266B' : index + 1}</span>
        <span className="track-num-play">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7L8 5z" />
          </svg>
        </span>
      </div>
      <div className="track-main">
        <img className="track-thumb" src={track.thumbnail} alt={track.title} loading="lazy" />
        <div className="track-details">
          <div className="track-title">{track.title}</div>
        </div>
      </div>
      <div className="track-artist-col">
        <ArtistLink track={track} />
      </div>
      <div className="track-like-col">
        <button
          className={`track-like-btn${isLiked ? ' liked' : ''}`}
          title="Like"
          aria-label="Like"
          onClick={handleLikeClick}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>
      </div>
      <div className="track-add-col">
        <button
          className="track-add-btn"
          title="Add to playlist"
          aria-label="Add to playlist"
          onClick={handleAddToPlaylist}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
      {showPlays && <div className="track-plays">{track.plays || ''}</div>}
    </div>
  );
}
