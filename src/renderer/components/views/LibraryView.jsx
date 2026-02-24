import { useCallback } from 'preact/hooks';
import { playlists, likedSongs, saveState } from '../../state/index.js';
import { showInputModal, showToast } from '../../state/ui.js';
import { useNavigation } from '../../hooks/useNavigation.js';
import { PlaylistCover } from '../shared/PlaylistCover.jsx';

export function LibraryView() {
  const { showPlaylistDetail } = useNavigation();

  const playlistList = playlists.value;
  const liked = likedSongs.value;

  const allPlaylists = [
    { id: 'liked', name: 'Liked Songs', tracks: liked, isLiked: true },
    ...playlistList.map(p => ({ ...p, isLiked: false }))
  ];

  const handleCardClick = useCallback((pid) => {
    if (pid === 'liked') {
      showPlaylistDetail({ id: 'liked', name: 'Liked Songs', tracks: liked }, true);
    } else {
      const pl = playlistList.find(p => p.id === pid);
      if (pl) showPlaylistDetail(pl, false);
    }
  }, [showPlaylistDetail, playlistList, liked]);

  async function handleCreatePlaylist() {
    const name = await showInputModal('Create playlist', 'My Playlist');
    if (name) {
      playlists.value = [...playlists.value, { id: 'pl_' + Date.now(), name, tracks: [] }];
      saveState();
      showToast(`Created "${name}"`);
    }
  }

  // Empty state: no playlists and no liked songs
  const hasContent = allPlaylists.some(p => p.tracks.length) || playlistList.length > 0;

  if (!hasContent) {
    return (
      <div id="library-content">
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="#535353">
            <path d="M4 4h2v16H4V4zm5 0h2v16H9V4zm5 2h2v14h-2V6zm5-2h2v16h-2V4z" />
          </svg>
          <h3>Create your first playlist</h3>
          <p>It's easy -- we'll help you</p>
          <button className="btn-primary" onClick={handleCreatePlaylist}>
            Create playlist
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="library-content">
      <div className="library-grid">
        {allPlaylists.map(p => {
          const coverContent = p.isLiked ? (
            <div className="lib-card-cover liked-cover">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
          ) : (
            <div className="lib-card-cover">
              <PlaylistCover playlist={p} size="md" />
            </div>
          );

          return (
            <div
              key={p.id}
              className="lib-card"
              data-playlist={p.id}
              onClick={() => handleCardClick(p.id)}
            >
              {coverContent}
              <div className="lib-card-name">{p.name}</div>
              <div className="lib-card-meta">
                Playlist {'\u00B7'} {p.tracks.length} song{p.tracks.length !== 1 ? 's' : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
