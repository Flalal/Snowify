export function PlaylistCover({ playlist, size = 'sm' }) {
  if (playlist.coverImage) {
    return <img src={`file://${encodeURI(playlist.coverImage)}`} alt={playlist.name} />;
  }
  if (playlist.tracks.length >= 4) {
    const thumbs = playlist.tracks.slice(0, 4).map((t) => t.thumbnail);
    return (
      <div className={`playlist-cover-grid${size === 'lg' ? ' playlist-cover-lg' : ''}`}>
        {thumbs.map((t, i) => (
          <img key={i} src={t} alt="" />
        ))}
      </div>
    );
  }
  if (playlist.tracks.length > 0) {
    return <img src={playlist.tracks[0].thumbnail} alt={playlist.name} />;
  }
  const iconSize = size === 'lg' ? 64 : size === 'md' ? 32 : 20;
  return (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="#535353">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
    </svg>
  );
}
