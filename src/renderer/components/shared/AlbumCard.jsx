import { ArtistLink } from './ArtistLink.jsx';

/**
 * A card-style album display with cover image, play button overlay, name, and meta info.
 *
 * Props:
 *   album         - album object { albumId, name, thumbnail, artistName, artistId, year, type, ... }
 *   onPlay        - callback(albumId) when the play button is clicked
 *   onClick       - callback(albumId, album) when the card itself is clicked
 *   onContextMenu - callback(e, albumId, album) for right-click
 */
export function AlbumCard({ album, onPlay, onClick, onContextMenu }) {
  function handleClick() {
    if (onClick) onClick(album.albumId, album);
  }

  function handlePlayClick(e) {
    e.stopPropagation();
    if (onPlay) onPlay(album.albumId);
  }

  function handleContextMenu(e) {
    e.preventDefault();
    if (onContextMenu) onContextMenu(e, album.albumId, album);
  }

  // Build meta text
  const metaParts = [];
  // If the album has artist link data, render ArtistLink; otherwise build meta string
  const hasArtistLink = album.artistId || (album.artists && album.artists.length);

  if (!hasArtistLink && album.artistName) {
    metaParts.push(album.artistName);
  }
  if (album.year) metaParts.push(String(album.year));
  if (album.type) metaParts.push(album.type);

  return (
    <div
      className="album-card"
      data-album-id={album.albumId}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      onContextMenu={handleContextMenu}
    >
      <img className="album-card-cover" src={album.thumbnail} alt={album.name} loading="lazy" />
      <button className="album-card-play" title="Play" aria-label="Play" onClick={handlePlayClick}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7L8 5z" />
        </svg>
      </button>
      <div className="album-card-name" title={album.name}>
        {album.name}
      </div>
      <div className="album-card-meta">
        {hasArtistLink && (
          <>
            <ArtistLink track={album} />
            {metaParts.length > 0 && ' \u00B7 ' + metaParts.join(' \u00B7 ')}
          </>
        )}
        {!hasArtistLink && metaParts.join(' \u00B7 ')}
      </div>
    </div>
  );
}
