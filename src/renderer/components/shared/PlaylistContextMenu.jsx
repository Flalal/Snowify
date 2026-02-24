import { useRef, useEffect } from 'preact/hooks';
import { useContextMenu } from '../../hooks/useContextMenu.js';
import { playlists, currentView, currentPlaylistId, saveState } from '../../state/index.js';
import {
  showInputModal,
  plMenuVisible,
  plMenuX,
  plMenuY,
  plMenuPlaylist,
  plMenuIndex,
  plMenuTotal,
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

  // Auto-focus first menu item when opened
  useEffect(() => {
    if (visible && menuRef.current) {
      requestAnimationFrame(() => {
        const first = menuRef.current?.querySelector('[role="menuitem"]');
        if (first) first.focus();
      });
    }
  }, [visible]);

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
      playlists.value = playlists.value.filter((p) => p.id !== playlist.id);
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

  function handleMenuKeyDown(e) {
    const items = menuRef.current?.querySelectorAll(
      '[role="menuitem"]:not([aria-disabled="true"])'
    );
    if (!items?.length) return;
    const focused = document.activeElement;
    const idx = Array.from(items).indexOf(focused);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        items[(idx + 1) % items.length]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        items[(idx - 1 + items.length) % items.length]?.focus();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        focused?.click();
        break;
      case 'Escape':
        removePlaylistContextMenu();
        break;
    }
  }

  return (
    <div
      ref={menuRef}
      className="context-menu"
      role="menu"
      style={{ left: plMenuX.value + 'px', top: plMenuY.value + 'px' }}
      onKeyDown={handleMenuKeyDown}
    >
      <div className="context-menu-item" role="menuitem" tabIndex={-1} onClick={handleRename}>
        Rename
      </div>
      <div className="context-menu-item" role="menuitem" tabIndex={-1} onClick={handleDelete}>
        Delete
      </div>
      <div className="context-menu-divider" role="separator" />
      <div
        className={`context-menu-item${isFirst ? ' context-menu-item-disabled' : ''}`}
        role="menuitem"
        tabIndex={-1}
        aria-disabled={isFirst ? 'true' : undefined}
        onClick={handleMoveUp}
      >
        Move Up
      </div>
      <div
        className={`context-menu-item${isLast ? ' context-menu-item-disabled' : ''}`}
        role="menuitem"
        tabIndex={-1}
        aria-disabled={isLast ? 'true' : undefined}
        onClick={handleMoveDown}
      >
        Move Down
      </div>
    </div>
  );
}
