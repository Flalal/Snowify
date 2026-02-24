import { ArtistLink } from './ArtistLink.jsx';
import { showContextMenu } from '../../state/ui.js';

/**
 * A card-style track display used in home/recommendations sections.
 *
 * Props:
 *   track         - track object { id, title, thumbnail, artist, artists, artistId, ... }
 *   onPlay        - callback(track) when the card or play button is clicked
 *   onContextMenu - callback(e, track) for right-click
 *   onDragStart   - callback(e, track) for drag start
 */
export function TrackCard({ track, onPlay, onContextMenu, onDragStart }) {
  function handleClick() {
    if (onPlay) onPlay(track);
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

  return (
    <div
      className="track-card"
      data-track-id={track.id}
      draggable="true"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
    >
      <img className="card-thumb" src={track.thumbnail} alt={track.title} loading="lazy" />
      <div className="card-title">{track.title}</div>
      <div className="card-artist">
        <ArtistLink track={track} />
      </div>
      <button
        className="card-play"
        title="Play"
        aria-label="Play"
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7L8 5z" />
        </svg>
      </button>
    </div>
  );
}
