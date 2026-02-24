/**
 * A card-style video display with thumbnail, play overlay, name, and optional duration.
 *
 * Props:
 *   video   - video object { videoId, id, name, title, thumbnail, duration, artist, artists, artistId, ... }
 *   onClick - callback(video) when the card is clicked
 */
export function VideoCard({ video, onClick }) {
  function handleClick() {
    if (onClick) onClick(video);
  }

  // Normalize: some video objects use 'name' vs 'title', 'videoId' vs 'id'
  const displayName = video.name || video.title || '';
  const videoId = video.videoId || video.id || '';

  return (
    <div
      className="video-card"
      data-video-id={videoId}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <img className="video-card-thumb" src={video.thumbnail} alt={displayName} loading="lazy" />
      <button className="video-card-play" title="Watch" aria-label="Watch video">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7L8 5z" />
        </svg>
      </button>
      <div className="video-card-name" title={displayName}>
        {displayName}
      </div>
      {video.duration && <div className="video-card-duration">{video.duration}</div>}
    </div>
  );
}
