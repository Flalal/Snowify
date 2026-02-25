import { useRef, useEffect } from 'preact/hooks';
import { useContextMenu } from '../../hooks/useContextMenu.js';
import {
  playlists,
  likedSongs,
  recentTracks,
  queue,
  queueIndex,
  pendingRadioNav,
  saveState
} from '../../state/index.js';
import {
  showToast,
  menuVisible,
  menuX,
  menuY,
  menuTrack,
  menuOptions,
  removeContextMenu
} from '../../state/ui.js';
import { api } from '../../services/api.js';

export { showContextMenu, removeContextMenu } from '../../state/ui.js';

export function ContextMenu() {
  const menuRef = useRef(null);
  const track = menuTrack.value;
  const visible = menuVisible.value;
  const options = menuOptions.value;

  useContextMenu(menuRef, visible, menuX.value, menuY.value, removeContextMenu);

  // Auto-focus first menu item when opened
  useEffect(() => {
    if (visible && menuRef.current) {
      requestAnimationFrame(() => {
        const first = menuRef.current?.querySelector('[role="menuitem"]');
        if (first) first.focus();
      });
    }
  }, [visible]);

  if (!visible || !track) return null;

  const isLiked = likedSongs.value.some((t) => t.id === track.id);
  const isRecent = recentTracks.value.some((t) => t.id === track.id);
  const playlistList = playlists.value;

  function handleMenuKeyDown(e) {
    const items = menuRef.current?.querySelectorAll('[role="menuitem"]');
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
        removeContextMenu();
        break;
    }
  }

  function handleAction(action, pid) {
    switch (action) {
      case 'play':
        if (options.onPlay) options.onPlay(track);
        break;
      case 'play-next':
        if (options.onPlayNext) {
          options.onPlayNext(track);
        } else {
          const q = [...queue.value];
          const idx = queueIndex.value;
          if (idx >= 0) {
            q.splice(idx + 1, 0, track);
          } else {
            q.push(track);
          }
          queue.value = q;
        }
        break;
      case 'add-queue':
        if (options.onAddQueue) {
          options.onAddQueue(track);
        } else {
          queue.value = [...queue.value, track];
        }
        break;
      case 'watch-video':
        if (options.onWatchVideo) options.onWatchVideo(track);
        break;
      case 'like':
        if (options.onLike) options.onLike(track);
        break;
      case 'add-to-playlist':
        if (options.onAddToPlaylist) options.onAddToPlaylist(pid, track);
        break;
      case 'start-radio': {
        const radioName = `Radio: ${track.title}`;
        const existing = playlists.value.find((p) => p.name === radioName);
        if (existing) {
          pendingRadioNav.value = existing;
        } else {
          showToast('Creating radio...');
          api
            .getUpNexts(track.id)
            .then((upNexts) => {
              const newPlaylist = {
                id: 'pl_' + Date.now(),
                name: radioName,
                tracks: [track, ...upNexts].slice(0, 21)
              };
              playlists.value = [...playlists.value, newPlaylist];
              saveState();
              pendingRadioNav.value = newPlaylist;
            })
            .catch(() => {
              showToast('Failed to create radio');
            });
        }
        break;
      }
      case 'remove-from-recent':
        recentTracks.value = recentTracks.value.filter((t) => t.id !== track.id);
        saveState();
        showToast('Removed from Recently Played');
        break;
      case 'remove':
        if (options.onRemove) options.onRemove(track);
        break;
      case 'share':
        if (options.onShare) {
          options.onShare(track);
        } else {
          navigator.clipboard.writeText(
            track.url || `https://music.youtube.com/watch?v=${track.id}`
          );
        }
        break;
    }
    removeContextMenu();
  }

  // Build playlist section
  let playlistSection = null;
  if (playlistList.length >= 5) {
    // Submenu for many playlists
    playlistSection = (
      <>
        <div className="context-menu-divider" role="separator" />
        <div
          className="context-menu-has-sub"
          role="menuitem"
          tabIndex={-1}
          aria-haspopup="true"
          onClick={(e) => e.stopPropagation()}
        >
          <span>Add to playlist</span>
          <span className="sub-arrow">{'\u25B8'}</span>
          <div className="context-submenu" role="menu">
            {playlistList.map((p) => (
              <div
                key={p.id}
                className="context-menu-item context-sub-item"
                role="menuitem"
                tabIndex={-1}
                data-action="add-to-playlist"
                data-pid={p.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction('add-to-playlist', p.id);
                }}
              >
                {p.name}
              </div>
            ))}
          </div>
        </div>
      </>
    );
  } else if (playlistList.length) {
    playlistSection = (
      <>
        <div className="context-menu-divider" role="separator" />
        {playlistList.map((p) => (
          <div
            key={p.id}
            className="context-menu-item"
            role="menuitem"
            tabIndex={-1}
            data-action="add-to-playlist"
            data-pid={p.id}
            onClick={() => handleAction('add-to-playlist', p.id)}
          >
            {p.name}
          </div>
        ))}
      </>
    );
  }

  return (
    <div
      ref={menuRef}
      className="context-menu"
      role="menu"
      style={{ left: menuX.value + 'px', top: menuY.value + 'px' }}
      onKeyDown={handleMenuKeyDown}
    >
      <div
        className="context-menu-item"
        role="menuitem"
        tabIndex={-1}
        data-action="play"
        onClick={() => handleAction('play')}
      >
        Play
      </div>
      <div
        className="context-menu-item"
        role="menuitem"
        tabIndex={-1}
        data-action="play-next"
        onClick={() => handleAction('play-next')}
      >
        Play Next
      </div>
      <div
        className="context-menu-item"
        role="menuitem"
        tabIndex={-1}
        data-action="add-queue"
        onClick={() => handleAction('add-queue')}
      >
        Add to Queue
      </div>
      <div className="context-menu-divider" role="separator" />
      <div
        className="context-menu-item"
        role="menuitem"
        tabIndex={-1}
        data-action="watch-video"
        onClick={() => handleAction('watch-video')}
      >
        Watch Video
      </div>
      <div
        className="context-menu-item"
        role="menuitem"
        tabIndex={-1}
        data-action="like"
        onClick={() => handleAction('like')}
      >
        {isLiked ? 'Unlike' : 'Like'}
      </div>
      <div
        className="context-menu-item"
        role="menuitem"
        tabIndex={-1}
        data-action="start-radio"
        onClick={() => handleAction('start-radio')}
      >
        Start Radio
      </div>
      {playlistSection}
      <div className="context-menu-divider" role="separator" />
      {options.onRemove && (
        <div
          className="context-menu-item"
          role="menuitem"
          tabIndex={-1}
          data-action="remove"
          onClick={() => handleAction('remove')}
        >
          Remove from playlist
        </div>
      )}
      {isRecent && (
        <div
          className="context-menu-item"
          role="menuitem"
          tabIndex={-1}
          data-action="remove-from-recent"
          onClick={() => handleAction('remove-from-recent')}
        >
          Remove from Recently Played
        </div>
      )}
      <div
        className="context-menu-item"
        role="menuitem"
        tabIndex={-1}
        data-action="share"
        onClick={() => handleAction('share')}
      >
        Copy Link
      </div>
    </div>
  );
}
