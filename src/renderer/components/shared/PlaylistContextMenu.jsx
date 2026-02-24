import { useRef } from 'preact/hooks';
import { useContextMenu } from '../../hooks/useContextMenu.js';
import { playlists, currentView, currentPlaylistId, saveState } from '../../state/index.js';
import {
  showInputModal, removeContextMenu,
  plMenuVisible, plMenuX, plMenuY, plMenuPlaylist, plMenuIndex, plMenuTotal,
  removePlaylistContextMenu
} from '../../state/ui.js';

export { showPlaylistContextMenu, removePlaylistContextMenu } from '../../state/ui.js';

export function PlaylistContextMenu() {
  const menuRef = useRef(null);
  const visible = plMenuVisible.value;
  const playlist = plMenuPlaylist.value;
  const index = plMenuIndex.value;
  const total = plMenuTotal.value;

  useContextMenu(menuRef, visible, plMenuX.value, plMenuY.value, removePlaylistContextMenu);

  if (!visible || !playlist) return null;

  const isFirst = index === 0;
  const isLast = index === total - 1;

  async function handleRename() {
    const newName = await showInputModal('Rename playlist', playlist.name);
    if (newName) {
      const pls = [...playlists.value];
      pls[index] = { ...pls[index], name: newName };
      playlists.value = pls;
      saveState();
    }
    removePlaylistContextMenu();
  }

  function handleDelete() {
    const ok = confirm(`Delete "${playlist.name}"?`);
    if (ok) {
      playlists.value = playlists.value.filter(p => p.id !== playlist.id);
      saveState();
      if (currentPlaylistId.value === playlist.id) {
        currentView.value = 'library';
        currentPlaylistId.value = null;
      }
    }
    removePlaylistContextMenu();
  }

  function handleMoveUp() {
    if (isFirst) return;
    const pls = [...playlists.value];
    [pls[index - 1], pls[index]] = [pls[index], pls[index - 1]];
    playlists.value = pls;
    saveState();
    removePlaylistContextMenu();
  }

  function handleMoveDown() {
    if (isLast) return;
    const pls = [...playlists.value];
    [pls[index], pls[index + 1]] = [pls[index + 1], pls[index]];
    playlists.value = pls;
    saveState();
    removePlaylistContextMenu();
  }

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: plMenuX.value + 'px', top: plMenuY.value + 'px' }}
    >
      <div className="context-menu-item" onClick={handleRename}>
        Rename
      </div>
      <div className="context-menu-item" onClick={handleDelete}>
        Delete
      </div>
      <div className="context-menu-divider" />
      <div
        className={`context-menu-item${isFirst ? ' context-menu-item-disabled' : ''}`}
        onClick={handleMoveUp}
      >
        Move Up
      </div>
      <div
        className={`context-menu-item${isLast ? ' context-menu-item-disabled' : ''}`}
        onClick={handleMoveDown}
      >
        Move Down
      </div>
    </div>
  );
}
