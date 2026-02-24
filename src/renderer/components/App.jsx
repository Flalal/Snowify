import { useEffect, useMemo, useState, useCallback, useRef } from 'preact/hooks';
import { lazy, Suspense } from 'preact/compat';
import { currentView, likedSongs, currentTrack, pendingRadioNav } from '../state/index.js';
import {
  albumViewState,
  artistViewState,
  playlistViewState,
  videoPlayerState
} from '../state/navigation.js';
import { lyricsVisible, queueVisible, nowPlayingViewVisible } from '../state/ui.js';

import { Titlebar } from './Titlebar.jsx';
import { Sidebar } from './Sidebar/Sidebar.jsx';
import { NowPlayingBar } from './NowPlayingBar/NowPlayingBar.jsx';
import { HomeView } from './views/HomeView.jsx';
import { SearchView } from './views/SearchView.jsx';
import { QueuePanel } from './overlays/QueuePanel.jsx';
import { Toast } from './shared/Toast.jsx';
import { ContextMenu } from './shared/ContextMenu.jsx';
import { PlaylistContextMenu } from './shared/PlaylistContextMenu.jsx';
import { InputModal } from './shared/InputModal.jsx';
import { PlaylistPickerModal } from './shared/PlaylistPickerModal.jsx';
import { Spinner } from './shared/Spinner.jsx';
import { ViewErrorBoundary } from './shared/ViewErrorBoundary.jsx';
import { useLikeTrack } from '../hooks/useLikeTrack.js';
import { usePlayback } from '../hooks/usePlayback.js';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js';
import { useAppInit } from '../hooks/useAppInit.js';
import { useAppNavigation } from '../hooks/useAppNavigation.js';
import { NavigationProvider } from '../hooks/useNavigation.js';
import { PlaybackProvider } from '../hooks/usePlaybackContext.js';

// ─── Lazy-loaded views & overlays ───
const ExploreView = lazy(() =>
  import('./views/ExploreView.jsx').then((m) => ({ default: m.ExploreView }))
);
const LibraryView = lazy(() =>
  import('./views/LibraryView.jsx').then((m) => ({ default: m.LibraryView }))
);
const PlaylistView = lazy(() =>
  import('./views/PlaylistView.jsx').then((m) => ({ default: m.PlaylistView }))
);
const AlbumView = lazy(() =>
  import('./views/AlbumView.jsx').then((m) => ({ default: m.AlbumView }))
);
const ArtistView = lazy(() =>
  import('./views/ArtistView.jsx').then((m) => ({ default: m.ArtistView }))
);
const SettingsView = lazy(() =>
  import('./views/SettingsView.jsx').then((m) => ({ default: m.SettingsView }))
);
const LyricsPanel = lazy(() =>
  import('./overlays/LyricsPanel.jsx').then((m) => ({ default: m.LyricsPanel }))
);
const VideoPlayer = lazy(() =>
  import('./overlays/VideoPlayer.jsx').then((m) => ({ default: m.VideoPlayer }))
);
const SpotifyImport = lazy(() =>
  import('./overlays/SpotifyImport.jsx').then((m) => ({ default: m.SpotifyImport }))
);
const NowPlayingView = lazy(() =>
  import('./overlays/NowPlayingView.jsx').then((m) => ({ default: m.NowPlayingView }))
);

export function App() {
  const [spotifyVisible, setSpotifyVisible] = useState(false);

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

  // ─── Like / Unlike (for mobile media session only) ───
  const handleLikeToggle = useLikeTrack();

  const toggleLikeCurrentTrack = useCallback(() => {
    const track = currentTrack.value;
    if (track) {
      handleLikeToggle(track);
      // Sync liked state to mobile notification
      if (window.__mobileMediaSession) {
        const isLiked = likedSongs.value.some((t) => t.id === track.id);
        window.__mobileMediaSession.setLiked(isLiked);
      }
    }
  }, [handleLikeToggle]);

  useEffect(() => {
    window.__snowifyPlayback = {
      togglePlay,
      playNext,
      playPrev,
      toggleLike: toggleLikeCurrentTrack
    };
    return () => {
      delete window.__snowifyPlayback;
    };
  }, [togglePlay, playNext, playPrev, toggleLikeCurrentTrack]);

  // ─── Auto-open Now Playing view on mobile (skip initial load) ───
  const skipAutoOpen = useRef(true);
  useEffect(() => {
    if (!window.__mobileMediaSession) return;
    if (skipAutoOpen.current) {
      skipAutoOpen.current = false;
      return;
    }
    if (currentTrack.value) nowPlayingViewVisible.value = true;
  }, [currentTrack.value]);

  // ─── Keyboard shortcuts ───
  useKeyboardShortcuts({ getAudio, togglePlay, playNext, playPrev, setVolumeLevel, switchView });

  // ─── Radio navigation (from ContextMenu) ───
  useEffect(() => {
    const pl = pendingRadioNav.value;
    if (pl) {
      pendingRadioNav.value = null;
      showPlaylistDetail(pl, false);
    }
  }, [pendingRadioNav.value, showPlaylistDetail]);

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
            onOpenSpotifyImport={() => setSpotifyVisible(true)}
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

            <section className={`view${view === 'home' ? ' active' : ''}`} id="view-home">
              {initialized && view === 'home' && (
                <ViewErrorBoundary>
                  <HomeView />
                </ViewErrorBoundary>
              )}
            </section>

            <section className={`view${view === 'search' ? ' active' : ''}`} id="view-search">
              {view === 'search' && (
                <ViewErrorBoundary>
                  <SearchView />
                </ViewErrorBoundary>
              )}
            </section>

            <Suspense fallback={<Spinner />}>
              <section className={`view${view === 'explore' ? ' active' : ''}`} id="view-explore">
                {view === 'explore' && (
                  <ViewErrorBoundary>
                    <ExploreView />
                  </ViewErrorBoundary>
                )}
              </section>

              <section className={`view${view === 'library' ? ' active' : ''}`} id="view-library">
                {view === 'library' && (
                  <ViewErrorBoundary>
                    <LibraryView />
                  </ViewErrorBoundary>
                )}
              </section>

              <section className={`view${view === 'playlist' ? ' active' : ''}`} id="view-playlist">
                {view === 'playlist' && playlistViewState.value && (
                  <ViewErrorBoundary>
                    <PlaylistView
                      playlist={playlistViewState.value.playlist}
                      isLiked={playlistViewState.value.isLiked}
                    />
                  </ViewErrorBoundary>
                )}
              </section>

              <section className={`view${view === 'album' ? ' active' : ''}`} id="view-album">
                {view === 'album' && albumViewState.value && (
                  <ViewErrorBoundary>
                    <AlbumView
                      albumId={albumViewState.value.albumId}
                      albumMeta={albumViewState.value.albumMeta}
                    />
                  </ViewErrorBoundary>
                )}
              </section>

              <section className={`view${view === 'artist' ? ' active' : ''}`} id="view-artist">
                {view === 'artist' && artistViewState.value && (
                  <ViewErrorBoundary>
                    <ArtistView artistId={artistViewState.value.artistId} />
                  </ViewErrorBoundary>
                )}
              </section>

              <section className={`view${view === 'settings' ? ' active' : ''}`} id="view-settings">
                {view === 'settings' && (
                  <ViewErrorBoundary>
                    <SettingsView />
                  </ViewErrorBoundary>
                )}
              </section>
            </Suspense>
          </main>
        </div>

        {hasPlayer && <NowPlayingBar />}

        <QueuePanel
          visible={queueVisible.value}
          onClose={() => {
            queueVisible.value = false;
          }}
        />

        <Suspense fallback={null}>
          {lyricsVisible.value && (
            <ViewErrorBoundary>
              <LyricsPanel
                visible={lyricsVisible.value}
                onClose={() => {
                  lyricsVisible.value = false;
                }}
                audio={getAudio()}
              />
            </ViewErrorBoundary>
          )}

          {nowPlayingViewVisible.value && (
            <ViewErrorBoundary>
              <NowPlayingView visible={nowPlayingViewVisible.value} />
            </ViewErrorBoundary>
          )}

          {videoPlayerState.value && (
            <ViewErrorBoundary>
              <VideoPlayer
                videoId={videoPlayerState.value.videoId}
                title={videoPlayerState.value.title}
                artist={videoPlayerState.value.artist}
                onClose={closeVideoPlayer}
              />
            </ViewErrorBoundary>
          )}

          {spotifyVisible && (
            <ViewErrorBoundary>
              <SpotifyImport visible={spotifyVisible} onClose={() => setSpotifyVisible(false)} />
            </ViewErrorBoundary>
          )}
        </Suspense>

        <ContextMenu />
        <PlaylistContextMenu />
        <Toast />
        <InputModal />
        <PlaylistPickerModal />
      </NavigationProvider>
    </PlaybackProvider>
  );
}
