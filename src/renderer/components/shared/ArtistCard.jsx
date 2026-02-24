/**
 * A card-style artist display. Supports two variants:
 *   - "similar-artist-card" (fans also like, default)
 *   - "top-artist-card" (top artist charts, when rank is provided)
 *
 * Props:
 *   artist  - artist object { artistId, name, thumbnail, rank? }
 *   onClick - callback(artistId) when the card is clicked
 *   rank    - optional rank number (renders the top-artist variant when provided)
 */
export function ArtistCard({ artist, onClick, rank }) {
  function handleClick() {
    if (onClick) onClick(artist.artistId);
  }

  // Top artist variant (used in charts / explore)
  if (rank != null) {
    return (
      <div
        className="top-artist-card"
        data-artist-id={artist.artistId}
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <img
          className="top-artist-avatar"
          src={artist.thumbnail || ''}
          alt={artist.name}
          loading="lazy"
        />
        <div className="top-artist-name">{artist.name}</div>
        <div className="top-artist-rank">#{rank}</div>
      </div>
    );
  }

  // Similar artist / fans-also-like variant (default)
  return (
    <div
      className="similar-artist-card"
      data-artist-id={artist.artistId}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <img
        className="similar-artist-avatar"
        src={artist.thumbnail || ''}
        alt={artist.name}
        loading="lazy"
      />
      <div className="similar-artist-name" title={artist.name}>
        {artist.name}
      </div>
    </div>
  );
}
