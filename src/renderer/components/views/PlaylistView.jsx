import { playlists, likedSongs, saveState, currentView } from '../../state/index.js';
import { TrackList } from '../shared/TrackList.jsx';
import { PlaylistCover } from '../shared/PlaylistCover.jsx';
import { showToast, showInputModal, showContextMenu } from '../../state/ui.js';
import { shuffleArray } from '../../utils/shuffleArray.js';
import { useNavigation } from '../../hooks/useNavigation.js';
import { useLikeTrack } from '../../hooks/useLikeTrack.js';

export function PlaylistView({ playlist, isLiked }) {
  const { playFromList } = useNavigation();
  const handleLike = useLikeTrack();

  if (!playlist) return null;

  // Read the live playlist from the signal to get immutable updates
  const livePlaylist = isLiked ? playlist : (playlists.value.find(p => p.id === playlist.id) || playlist);
  const tracks = isLiked ? likedSongs.value : livePlaylist.tracks;

  function handlePlayAll() {
    if (tracks.length) playFromList(tracks, 0);
  }

  function handleShuffle() {
    if (tracks.length) {
      playFromList(shuffleArray(tracks), 0);
    }
  }

  async function handleRename() {
    if (isLiked) return;
    const newName = await showInputModal('Rename playlist', livePlaylist.name);
    if (newName && newName !== livePlaylist.name) {
      playlists.value = playlists.value.map(p =>
        p.id === playlist.id ? { ...p, name: newName } : p
      );
      saveState();
      showToast(`Renamed to "${newName}"`);
    }
  }

  async function handleChangeCover() {
    if (isLiked) return;
    const filePath = await window.snowify.pickImage();
    if (!filePath) return;
    if (livePlaylist.coverImage) {
      await window.snowify.deleteImage(livePlaylist.coverImage);
    }
    const savedPath = await window.snowify.saveImage(playlist.id, filePath);
    if (savedPath) {
      playlists.value = playlists.value.map(p =>
        p.id === playlist.id ? { ...p, coverImage: savedPath } : p
      );
      saveState();
      showToast('Cover image updated');
    } else {
      showToast('Failed to save image');
    }
  }

  function handleDelete() {
    if (isLiked) return;
    if (confirm(`Delete "${livePlaylist.name}"?\nThis cannot be undone.`)) {
      if (livePlaylist.coverImage) window.snowify.deleteImage(livePlaylist.coverImage);
      playlists.value = playlists.value.filter(p => p.id !== playlist.id);
      saveState();
      currentView.value = 'library';
      showToast(`Deleted "${livePlaylist.name}"`);
    }
  }

  function handlePlay(trackList, index) {
    playFromList(trackList, index);
  }

  function handlePlaylistTrackContextMenu(e, track) {
    showContextMenu(e, track, {
      onPlay: (t) => { playFromList([t], 0); },
      onLike: (t) => { handleLike(t, null); },
    });
  }

  // Build cover content
  function renderCover() {
    if (isLiked) {
      return (
        <div
          id="playlist-hero-cover"
          className="playlist-hero-cover"
          style={{ background: 'linear-gradient(135deg, #450af5, #c4efd9)' }}
        >
          <svg width="64" height="64" viewBox="0 0 24 24" fill="#fff">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      );
    }

    const hasCover = livePlaylist.coverImage || tracks.length > 0;
    const bgStyle = hasCover ? {} : { background: 'linear-gradient(135deg, #450af5, #8e2de2)' };

    return (
      <div id="playlist-hero-cover" className="playlist-hero-cover" style={bgStyle}>
        <PlaylistCover playlist={livePlaylist} size="lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Hero header */}
      <div className="playlist-hero">
        {renderCover()}
        <div className="playlist-hero-info">
          <div className="playlist-hero-label">PLAYLIST</div>
          <h1 id="playlist-hero-name">{livePlaylist.name}</h1>
          <p id="playlist-hero-count">
            {tracks.length} song{tracks.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="playlist-actions">
        <button id="btn-play-all" className="btn-primary" onClick={handlePlayAll}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7L8 5z" />
          </svg>
          Play All
        </button>
        <button id="btn-shuffle-playlist" className="btn-secondary" onClick={handleShuffle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 3 21 3 21 8" />
            <line x1="4" y1="20" x2="21" y2="3" />
            <polyline points="21 16 21 21 16 21" />
            <line x1="15" y1="15" x2="21" y2="21" />
            <line x1="4" y1="4" x2="9" y2="9" />
          </svg>
          Shuffle
        </button>
        {!isLiked && (
          <>
            <button id="btn-rename-playlist" className="btn-secondary" onClick={handleRename}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Rename
            </button>
            <button id="btn-cover-playlist" className="btn-secondary" onClick={handleChangeCover}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              Cover
            </button>
            <button
              id="btn-delete-playlist"
              className="btn-secondary"
              style={{ color: 'var(--red)', borderColor: 'var(--red, rgba(255,255,255,0.1))' }}
              onClick={handleDelete}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6" /><path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
              Delete
            </button>
          </>
        )}
      </div>

      {/* Track list */}
      <div id="playlist-tracks">
        {tracks.length > 0 ? (
          <TrackList
            tracks={tracks}
            context="playlist"
            onPlay={handlePlay}
            onLike={handleLike}
            onContextMenu={handlePlaylistTrackContextMenu}
          />
        ) : (
          <div className="empty-state">
            <p>This playlist is empty</p>
            <p>Find songs you like and add them here</p>
          </div>
        )}
      </div>
    </div>
  );
}
