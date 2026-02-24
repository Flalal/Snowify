import {
  playlists,
  likedSongs,
  currentView,
  currentPlaylistId,
  draggedTrack,
  saveState
} from '../../state/index.js';
import { PlaylistItem } from './PlaylistItem.jsx';
import { showInputModal, showToast, showPlaylistContextMenu, nowPlayingViewVisible } from '../../state/ui.js';

export function Sidebar({ onNavigate, onShowPlaylist, onOpenSpotifyImport }) {
  const navItems = [
    {
      view: 'home',
      label: 'Home',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3L4 9v12h5v-7h6v7h5V9l-8-6z" />
        </svg>
      )
    },
    {
      view: 'explore',
      label: 'Explore',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
      )
    },
    {
      view: 'search',
      label: 'Search',
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M16 16l4.5 4.5" strokeLinecap="round" />
        </svg>
      ),
      hidden: true
    },
    {
      view: 'library',
      label: 'Library',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 4h2v16H4V4zm5 0h2v16H9V4zm5 2h2v14h-2V6zm5-2h2v16h-2V4z" />
        </svg>
      )
    },
    {
      view: 'settings',
      label: 'Settings',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96a7.04 7.04 0 00-1.62-.94l-.36-2.54a.48.48 0 00-.48-.41h-3.84a.48.48 0 00-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87a.48.48 0 00.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.26.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 00-.12-.61l-2.03-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.6 3.6 0 0112 15.6z" />
        </svg>
      )
    }
  ];

  const handleCreatePlaylist = async () => {
    const name = await showInputModal('Create playlist', 'My Playlist');
    if (name) {
      const id = 'pl_' + Date.now();
      const playlist = { id, name, tracks: [] };
      playlists.value = [...playlists.value, playlist];
      saveState();
      showToast(`Created "${name}"`);
    }
  };

  const handlePlaylistClick = (playlist, isLiked) => {
    if (onShowPlaylist) onShowPlaylist(playlist, isLiked);
  };

  const handleTrackDrop = (e, playlistId) => {
    const track = draggedTrack.value;
    if (!track || !track.id) return;

    if (playlistId === 'liked') {
      if (likedSongs.value.some((t) => t.id === track.id)) {
        showToast('Already in Liked Songs');
        return;
      }
      likedSongs.value = [...likedSongs.value, track];
      saveState();
      showToast('Added to Liked Songs');
    } else {
      const pl = playlists.value.find((p) => p.id === playlistId);
      if (!pl) return;
      if (pl.tracks.some((t) => t.id === track.id)) {
        showToast(`Already in "${pl.name}"`);
        return;
      }
      pl.tracks.push(track);
      playlists.value = [...playlists.value];
      saveState();
      showToast(`Added to "${pl.name}"`);
    }
  };

  const liked = likedSongs.value;
  const pls = playlists.value;

  return (
    <aside id="sidebar">
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.view}
            className={`nav-btn${currentView.value === item.view ? ' active' : ''}`}
            data-view={item.view}
            style={item.hidden ? { display: 'none' } : undefined}
            onClick={() => {
              nowPlayingViewVisible.value = false;
              onNavigate(item.view);
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <h3>Playlists</h3>
          <div className="sidebar-header-actions">
            <button
              className="icon-btn"
              onClick={onOpenSpotifyImport}
              title="Import from Spotify"
              aria-label="Import from Spotify"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.52 17.28c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.7 1.32.36.24.48.66.24 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-.99-.12-1.14-.6-.12-.48.12-.99.6-1.14 4.38-1.32 9.78-.66 13.5 1.62.36.18.54.78.24 1.2zm.12-3.36C15.24 8.4 8.88 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z" />
              </svg>
            </button>
            <button
              className="icon-btn"
              onClick={handleCreatePlaylist}
              title="Create playlist"
              aria-label="Create playlist"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path
                  d="M10 3v14M3 10h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </button>
          </div>
        </div>
        <div className="playlist-list">
          <PlaylistItem
            playlist={{ id: 'liked', name: 'Liked Songs', tracks: liked }}
            isLiked={true}
            isActive={currentPlaylistId.value === 'liked'}
            onClick={() =>
              handlePlaylistClick({ id: 'liked', name: 'Liked Songs', tracks: liked }, true)
            }
            onDrop={(e) => handleTrackDrop(e, 'liked')}
          />
          {pls.map((pl, index) => (
            <PlaylistItem
              key={pl.id}
              playlist={pl}
              isLiked={false}
              isActive={currentPlaylistId.value === pl.id}
              onClick={() => handlePlaylistClick(pl, false)}
              onContextMenu={(e) => showPlaylistContextMenu(e, pl, index, pls.length)}
              onDrop={(e) => handleTrackDrop(e, pl.id)}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
