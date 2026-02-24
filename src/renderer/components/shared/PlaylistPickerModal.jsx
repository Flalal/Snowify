import { playlists, likedSongs, saveState } from '../../state/index.js';
import { showToast, showInputModal, pickerVisible, pickerTracks, cleanupPicker } from '../../state/ui.js';

export { showPlaylistPicker } from '../../state/ui.js';

function addTracksToPlaylist(playlist, tracks) {
  const existingIds = new Set(playlist.tracks.map(t => t.id));
  const toAdd = tracks.filter(t => !existingIds.has(t.id));
  if (toAdd.length === 0) {
    showToast(`Already in "${playlist.name}"`);
    return 0;
  }
  playlist.tracks.push(...toAdd);
  saveState();
  const label = toAdd.length === 1 ? toAdd[0].title : `${toAdd.length} songs`;
  showToast(`Added ${label} to "${playlist.name}"`);
  return toAdd.length;
}

export function PlaylistPickerModal() {
  if (!pickerVisible.value) return null;

  const tracks = pickerTracks.value;
  const allPlaylists = playlists.value;

  function onOverlay(e) {
    if (e.target === e.currentTarget) cleanupPicker(null);
  }

  function onKey(e) {
    if (e.key === 'Escape') cleanupPicker(null);
  }

  function handleLiked() {
    const existingIds = new Set(likedSongs.value.map(t => t.id));
    const toAdd = tracks.filter(t => !existingIds.has(t.id));
    if (toAdd.length === 0) {
      showToast('Already in Liked Songs');
    } else {
      likedSongs.value = [...likedSongs.value, ...toAdd];
      saveState();
      const label = toAdd.length === 1 ? toAdd[0].title : `${toAdd.length} songs`;
      showToast(`Added ${label} to Liked Songs`);
    }
    cleanupPicker('liked');
  }

  function handlePlaylist(pl) {
    addTracksToPlaylist(pl, tracks);
    // Trigger reactivity by reassigning the array
    playlists.value = [...playlists.value];
    cleanupPicker(pl.name);
  }

  async function handleNewPlaylist() {
    // Temporarily hide picker so InputModal can show
    pickerVisible.value = false;
    const name = await showInputModal('Create playlist', 'My Playlist');
    if (!name) {
      // User cancelled — reopen picker
      pickerVisible.value = true;
      return;
    }
    const newPl = { id: 'pl_' + Date.now(), name, tracks: [] };
    playlists.value = [...playlists.value, newPl];
    addTracksToPlaylist(newPl, tracks);
    playlists.value = [...playlists.value];
    cleanupPicker(name);
  }

  return (
    <div className="modal-overlay" onClick={onOverlay} onKeyDown={onKey}>
      <div className="modal-box picker-box">
        <h3>Add to playlist</h3>
        <div className="picker-list">
          {/* Liked Songs */}
          <button className="picker-item" onClick={handleLiked}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--accent)" stroke="var(--accent)" strokeWidth="2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span>Liked Songs</span>
            <span className="picker-count">{likedSongs.value.length}</span>
          </button>

          {/* Custom playlists */}
          {allPlaylists.map(pl => (
            <button key={pl.id} className="picker-item" onClick={() => handlePlaylist(pl)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
              <span>{pl.name}</span>
              <span className="picker-count">{pl.tracks.length}</span>
            </button>
          ))}
        </div>

        {/* New playlist button */}
        <button className="picker-new" onClick={handleNewPlaylist}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Playlist
        </button>

        {/* Cancel */}
        <div className="modal-buttons">
          <button className="modal-btn cancel" onClick={() => cleanupPicker(null)}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
