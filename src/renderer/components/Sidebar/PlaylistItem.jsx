import { PlaylistCover } from '../shared/PlaylistCover.jsx';

export function PlaylistItem({ playlist, isLiked, isActive, onClick, onContextMenu, onDrop }) {
  const count = playlist.tracks.length;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (onDrop) onDrop(e, playlist.id);
  };

  return (
    <div
      className={`playlist-item${isActive ? ' active' : ''}`}
      data-playlist={playlist.id}
      onClick={onClick}
      onContextMenu={isLiked ? undefined : onContextMenu}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`playlist-cover${isLiked ? ' liked-cover' : ''}`}>
        {isLiked ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        ) : (
          <PlaylistCover playlist={playlist} size="sm" />
        )}
      </div>
      <div className="playlist-info">
        <span className="playlist-name">{playlist.name}</span>
        <span className="playlist-count">
          {count} song{count !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
