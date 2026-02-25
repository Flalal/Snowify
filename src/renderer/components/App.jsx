import { useMemo } from 'preact/hooks';
import { currentView, currentTrack } from '../state/index.js';
import { queueVisible } from '../state/ui.js';

import { Titlebar } from './Titlebar.jsx';
import { Sidebar } from './Sidebar/Sidebar.jsx';
import { NowPlayingBar } from './NowPlayingBar/NowPlayingBar.jsx';
import { ViewRouter } from './ViewRouter.jsx';
import { OverlayLayer } from './OverlayLayer.jsx';
import { QueuePanel } from './overlays/QueuePanel.jsx';
import { Toast } from './shared/Toast.jsx';
import { ContextMenu } from './shared/ContextMenu.jsx';
import { PlaylistContextMenu } from './shared/PlaylistContextMenu.jsx';
import { InputModal } from './shared/InputModal.jsx';
import { PlaylistPickerModal } from './shared/PlaylistPickerModal.jsx';
import { usePlayback } from '../hooks/usePlayback.js';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js';
import { useAppInit } from '../hooks/useAppInit.js';
import { useAppNavigation } from '../hooks/useAppNavigation.js';
import { useMobileBridge } from '../hooks/useMobileBridge.js';
import { NavigationProvider } from '../hooks/useNavigation.js';
import { PlaybackProvider } from '../hooks/usePlaybackContext.js';

export function App() {
  const {
    getAudio,
    playFromList,
    playNext,
    playPrev,
    togglePlay,
    setVolumeLevel,
    toggleShuffle,
    toggleRepeat
  } = usePlayback();

  const playback = useMemo(
    () => ({
      getAudio,
      togglePlay,
      playNext,
      playPrev,
      setVolumeLevel,
      toggleShuffle,
      toggleRepeat
    }),
    [getAudio, togglePlay, playNext, playPrev, setVolumeLevel, toggleShuffle, toggleRepeat]
  );

  const initialized = useAppInit(getAudio);
  const { switchView, showPlaylistDetail, closeVideoPlayer, nav } = useAppNavigation(
    playFromList,
    getAudio
  );

  useMobileBridge({ togglePlay, playNext, playPrev });

  // ─── Keyboard shortcuts ───
  useKeyboardShortcuts({ getAudio, togglePlay, playNext, playPrev, setVolumeLevel, switchView });

  // ─── Floating search ───
  const showFloatingSearch = ['home', 'explore', 'library', 'artist', 'album', 'playlist'].includes(
    currentView.value
  );

  const view = currentView.value;
  const track = currentTrack.value;
  const hasPlayer = !!track;

  return (
    <PlaybackProvider value={playback}>
      <NavigationProvider value={nav}>
        <Titlebar />

        <div id="app" className={hasPlayer ? '' : 'no-player'}>
          <Sidebar
            onNavigate={switchView}
            onShowPlaylist={showPlaylistDetail}
          />

          <main id="main-content">
            {showFloatingSearch && (
              <div className="floating-search" onClick={() => switchView('search')}>
                <svg
                  className="floating-search-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M16 16l4.5 4.5" strokeLinecap="round" />
                </svg>
                <span className="floating-search-text">Search</span>
              </div>
            )}

            <ViewRouter view={view} initialized={initialized} />
          </main>
        </div>

        {hasPlayer && <NowPlayingBar />}

        <QueuePanel
          visible={queueVisible.value}
          onClose={() => {
            queueVisible.value = false;
          }}
        />

        <OverlayLayer getAudio={getAudio} closeVideoPlayer={closeVideoPlayer} />

        <ContextMenu />
        <PlaylistContextMenu />
        <Toast />
        <InputModal />
        <PlaylistPickerModal />
      </NavigationProvider>
    </PlaybackProvider>
  );
}
