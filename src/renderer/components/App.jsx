import { useEffect, useRef, useState, useCallback } from 'preact/hooks';
import { lazy, Suspense } from 'preact/compat';
import { signal } from '@preact/signals';
import {
  currentView, queue, originalQueue, queueIndex, isPlaying, isLoading,
  shuffle, repeat, volume, autoplay, audioQuality, discordRpc,
  likedSongs, recentTracks, playlists, followedArtists,
  currentTrack, currentPlaylistId, animations, effects, theme, country,
  pendingRadioNav, cloudAccessToken, cloudRefreshToken,
  saveState, saveStateNow, loadState
} from '../state/index.js';

import { Titlebar } from './Titlebar.jsx';
import { Sidebar } from './Sidebar/Sidebar.jsx';
import { NowPlayingBar, spawnHeartParticles } from './NowPlayingBar/NowPlayingBar.jsx';
import { HomeView } from './views/HomeView.jsx';
import { SearchView } from './views/SearchView.jsx';
import { QueuePanel } from './overlays/QueuePanel.jsx';
import { showToast } from './shared/Toast.jsx';
import { Toast } from './shared/Toast.jsx';
import { ContextMenu } from './shared/ContextMenu.jsx';
import { PlaylistContextMenu } from './shared/PlaylistContextMenu.jsx';
import { InputModal } from './shared/InputModal.jsx';
import { PlaylistPickerModal } from './shared/PlaylistPickerModal.jsx';
import { Spinner } from './shared/Spinner.jsx';
import { shuffleArray } from '../utils/shuffleArray.js';

// ─── Lazy-loaded views & overlays ───
const ExploreView = lazy(() => import('./views/ExploreView.jsx').then(m => ({ default: m.ExploreView })));
const LibraryView = lazy(() => import('./views/LibraryView.jsx').then(m => ({ default: m.LibraryView })));
const PlaylistView = lazy(() => import('./views/PlaylistView.jsx').then(m => ({ default: m.PlaylistView })));
const AlbumView = lazy(() => import('./views/AlbumView.jsx').then(m => ({ default: m.AlbumView })));
const ArtistView = lazy(() => import('./views/ArtistView.jsx').then(m => ({ default: m.ArtistView })));
const SettingsView = lazy(() => import('./views/SettingsView.jsx').then(m => ({ default: m.SettingsView })));
const LyricsPanel = lazy(() => import('./overlays/LyricsPanel.jsx').then(m => ({ default: m.LyricsPanel })));
const VideoPlayer = lazy(() => import('./overlays/VideoPlayer.jsx').then(m => ({ default: m.VideoPlayer })));
const SpotifyImport = lazy(() => import('./overlays/SpotifyImport.jsx').then(m => ({ default: m.SpotifyImport })));

// View-specific navigation state
const albumViewState = signal(null); // { albumId, albumMeta }
const artistViewState = signal(null); // { artistId }
const playlistViewState = signal(null); // { playlist, isLiked }
const videoPlayerState = signal(null); // { videoId, title, artist }

// Cap actual audio volume at 30% to prevent distortion at max slider
const VOLUME_SCALE = 0.3;

function applyThemeToDOM(themeName) {
  if (themeName === 'dark') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', themeName);
  }
}

export function App() {
  const audioRef = useRef(null);
  const [initialized, setInitialized] = useState(false);
  const [queueVisible, setQueueVisible] = useState(false);
  const [lyricsVisible, setLyricsVisible] = useState(false);
  const [spotifyVisible, setSpotifyVisible] = useState(false);

  // Watchdog state
  const watchdogRef = useRef({ lastTime: -1, stallTicks: 0 });

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = document.getElementById('audio-player');
    }
    return audioRef.current;
  }, []);

  // ─── Initialization ───
  useEffect(() => {
    loadState();

    const audio = getAudio();
    if (audio) audio.volume = volume.value * VOLUME_SCALE;
    if (discordRpc.value) window.snowify.connectDiscord();
    applyThemeToDOM(theme.value);
    document.documentElement.classList.toggle('no-animations', !animations.value);
    document.documentElement.classList.toggle('no-effects', !effects.value);
    if (country.value) window.snowify.setCountry(country.value);
    window.snowify.onYtMusicInitError?.(() => {
      showToast('Music service failed to initialize — restart the app');
    });
    window.snowify.onTokensUpdated?.((tokens) => {
      cloudAccessToken.value = tokens.accessToken;
      cloudRefreshToken.value = tokens.refreshToken;
      saveState();
    });
    setInitialized(true);

    const flushState = () => saveStateNow();
    window.addEventListener('beforeunload', flushState);
    return () => window.removeEventListener('beforeunload', flushState);
  }, []);

  // ─── Audio event listeners ───
  useEffect(() => {
    const audio = getAudio();
    if (!audio) return;

    const onEnded = () => playNext();
    const onError = () => {
      isPlaying.value = false;
      isLoading.value = false;
      clearDiscordPresence();
      showToast('Audio error — skipping to next track');
      const nextIdx = queueIndex.value + 1;
      if (nextIdx < queue.value.length) {
        queueIndex.value = nextIdx;
        playTrack(queue.value[nextIdx]);
      }
    };
    const onSeeked = () => {
      if (isPlaying.value) {
        const track = currentTrack.value;
        if (track) updateDiscordPresence(track);
      }
    };

    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('seeked', onSeeked);

    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('seeked', onSeeked);
    };
  }, []);

  // ─── Playback watchdog ───
  useEffect(() => {
    const handle = setInterval(() => {
      const audio = getAudio();
      if (!isPlaying.value || isLoading.value || !audio || audio.paused) {
        watchdogRef.current.lastTime = -1;
        watchdogRef.current.stallTicks = 0;
        return;
      }
      const ct = audio.currentTime;
      if (watchdogRef.current.lastTime >= 0 && ct === watchdogRef.current.lastTime && ct > 0) {
        watchdogRef.current.stallTicks++;
        if (watchdogRef.current.stallTicks >= 4) {
          console.warn('Watchdog: playback stalled at', ct, '— advancing');
          watchdogRef.current.stallTicks = 0;
          watchdogRef.current.lastTime = -1;
          showToast('Stream stalled — skipping to next');
          playNext();
        }
      } else {
        watchdogRef.current.stallTicks = 0;
      }
      watchdogRef.current.lastTime = ct;
    }, 2000);
    return () => clearInterval(handle);
  }, []);

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') e.target.blur();
        return;
      }
      const audio = getAudio();
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          if (e.ctrlKey) playNext();
          else if (audio?.duration) audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
          break;
        case 'ArrowLeft':
          if (e.ctrlKey) playPrev();
          else if (audio?.duration) audio.currentTime = Math.max(0, audio.currentTime - 5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolumeLevel(volume.value + 0.05);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolumeLevel(volume.value - 0.05);
          break;
        case '/':
          e.preventDefault();
          switchView('search');
          break;
        case 'Escape':
          if (videoPlayerState.value) videoPlayerState.value = null;
          break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ─── Playback functions ───
  const playTrack = useCallback(async (track) => {
    const audio = getAudio();
    if (!audio) return;

    isLoading.value = true;
    showToast(`Loading: ${track.title}`);

    try {
      const directUrl = await window.snowify.getStreamUrl(track.url, audioQuality.value);
      audio.src = directUrl;
      audio.volume = volume.value * VOLUME_SCALE;
      audio.load();
      await audio.play();
      isPlaying.value = true;
      isLoading.value = false;
      addToRecent(track);
      updateDiscordPresence(track);
      saveState();
      prefetchNextTrack();
      updateMediaSession(track);
    } catch (err) {
      console.error('Playback error:', err);
      const msg = typeof err === 'string' ? err : (err.message || 'unknown error');
      showToast('Playback failed: ' + msg);
      isPlaying.value = false;
      isLoading.value = false;
      if (!playTrack._skipAdvance) {
        const nextIdx = queueIndex.value + 1;
        if (nextIdx < queue.value.length) {
          playTrack._skipAdvance = true;
          queueIndex.value = nextIdx;
          playTrack(queue.value[nextIdx]).finally(() => { playTrack._skipAdvance = false; });
        }
      }
    }
  }, []);

  const playFromList = useCallback((tracks, index) => {
    originalQueue.value = [...tracks];
    if (shuffle.value) {
      const picked = tracks[index];
      const rest = tracks.filter((_, i) => i !== index);
      shuffleArray(rest);
      queue.value = [picked, ...rest];
      queueIndex.value = 0;
    } else {
      queue.value = [...tracks];
      queueIndex.value = index;
    }
    playTrack(queue.value[queueIndex.value]);
  }, [playTrack]);

  const playNext = useCallback(() => {
    const audio = getAudio();
    if (!queue.value.length) return;

    if (repeat.value === 'one') {
      if (audio) { audio.currentTime = 0; audio.play(); }
      isPlaying.value = true;
      return;
    }

    if (repeat.value === 'all') {
      let nextIdx = queueIndex.value + 1;
      if (nextIdx >= queue.value.length) nextIdx = 0;
      queueIndex.value = nextIdx;
      playTrack(queue.value[nextIdx]);
      return;
    }

    let nextIdx = queueIndex.value + 1;
    if (nextIdx >= queue.value.length) {
      if (autoplay.value) {
        smartQueueFill();
        return;
      }
      isPlaying.value = false;
      return;
    }
    queueIndex.value = nextIdx;
    playTrack(queue.value[nextIdx]);
  }, [playTrack]);

  const playPrev = useCallback(() => {
    const audio = getAudio();
    if (!queue.value.length) return;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    let prevIdx = queueIndex.value - 1;
    if (prevIdx < 0) prevIdx = 0;
    queueIndex.value = prevIdx;
    playTrack(queue.value[prevIdx]);
  }, [playTrack]);

  const togglePlay = useCallback(() => {
    const audio = getAudio();
    if (isLoading.value || !audio || !audio.src) return;
    if (audio.paused) {
      audio.play();
      isPlaying.value = true;
      const track = currentTrack.value;
      if (track) updateDiscordPresence(track);
    } else {
      audio.pause();
      isPlaying.value = false;
      clearDiscordPresence();
    }
  }, []);

  const smartQueueFill = useCallback(async () => {
    const current = currentTrack.value;
    if (!current) return;
    showToast('Autoplay: finding similar songs...');
    try {
      const queueIds = new Set(queue.value.map(t => t.id));
      const seen = new Set();
      let pool = [];
      const addToPool = (tracks) => {
        tracks.forEach(t => {
          if (!queueIds.has(t.id) && !seen.has(t.id)) {
            seen.add(t.id);
            pool.push(t);
          }
        });
      };
      const upNexts = await window.snowify.getUpNexts(current.id);
      addToPool(upNexts);
      if (pool.length < 10 && current.artistId) {
        const info = await window.snowify.artistInfo(current.artistId);
        if (info) addToPool(info.topSongs || []);
      }
      if (!pool.length) {
        showToast('Autoplay: no similar songs found');
        isPlaying.value = false;
        return;
      }
      shuffleArray(pool);
      const maxAdd = Math.min(20, 200 - queue.value.length);
      if (maxAdd <= 0) {
        const trim = Math.min(queueIndex.value, queue.value.length - 100);
        if (trim > 0) {
          queue.value = queue.value.slice(trim);
          queueIndex.value = queueIndex.value - trim;
        }
      }
      const newTracks = pool.slice(0, Math.max(maxAdd, 10));
      queue.value = [...queue.value, ...newTracks];
      queueIndex.value = queueIndex.value + 1;
      playTrack(queue.value[queueIndex.value]);
      showToast(`Autoplay: added ${newTracks.length} songs`);
    } catch (err) {
      console.error('Autoplay error:', err);
      showToast('Autoplay failed');
      isPlaying.value = false;
    }
  }, [playTrack]);

  const prefetchNextTrack = useCallback(() => {
    const nextIdx = queueIndex.value + 1;
    if (nextIdx >= queue.value.length) return;
    const next = queue.value[nextIdx];
    if (!next || (!next.url && !next.id)) return;
    const url = next.url || `https://music.youtube.com/watch?v=${next.id}`;
    window.snowify.getStreamUrl(url, audioQuality.value).catch(() => {});
  }, []);

  const setVolumeLevel = useCallback((vol) => {
    const audio = getAudio();
    volume.value = Math.max(0, Math.min(1, vol));
    if (audio) audio.volume = volume.value * VOLUME_SCALE;
    saveState();
  }, []);

  const toggleShuffle = useCallback(() => {
    shuffle.value = !shuffle.value;
    if (queue.value.length > 1) {
      const current = currentTrack.value;
      if (shuffle.value) {
        originalQueue.value = [...queue.value];
        const rest = queue.value.filter((_, i) => i !== queueIndex.value);
        shuffleArray(rest);
        queue.value = [current, ...rest];
        queueIndex.value = 0;
      } else {
        const idx = originalQueue.value.findIndex(t => t.id === current?.id);
        queue.value = [...originalQueue.value];
        queueIndex.value = idx >= 0 ? idx : 0;
      }
    }
    saveState();
  }, []);

  const toggleRepeat = useCallback(() => {
    const modes = ['off', 'all', 'one'];
    const i = (modes.indexOf(repeat.value) + 1) % modes.length;
    repeat.value = modes[i];
    saveState();
  }, []);

  const addToRecent = useCallback((track) => {
    recentTracks.value = [track, ...recentTracks.value.filter(t => t.id !== track.id)].slice(0, 20);
    saveState();
  }, []);

  const updateDiscordPresence = useCallback((track) => {
    if (!discordRpc.value || !track) return;
    const audio = getAudio();
    const startMs = Date.now() - Math.floor((audio?.currentTime || 0) * 1000);
    const durationMs = track.durationMs || (audio?.duration ? Math.round(audio.duration * 1000) : 0);
    const data = { title: track.title, artist: track.artist, thumbnail: track.thumbnail || '', startTimestamp: startMs };
    if (durationMs) data.endTimestamp = startMs + durationMs;
    window.snowify.updatePresence(data);
  }, []);

  const clearDiscordPresence = useCallback(() => {
    if (!discordRpc.value) return;
    window.snowify.clearPresence();
  }, []);

  const updateMediaSession = useCallback((track) => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        artwork: [{ src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
      });
      navigator.mediaSession.setActionHandler('play', () => { getAudio()?.play(); isPlaying.value = true; updateDiscordPresence(track); });
      navigator.mediaSession.setActionHandler('pause', () => { getAudio()?.pause(); isPlaying.value = false; clearDiscordPresence(); });
      navigator.mediaSession.setActionHandler('previoustrack', playPrev);
      navigator.mediaSession.setActionHandler('nexttrack', playNext);
    }
  }, [playPrev, playNext, updateDiscordPresence, clearDiscordPresence]);

  // ─── Like / Unlike ───
  const handleLikeToggle = useCallback((track, buttonEl) => {
    const idx = likedSongs.value.findIndex(t => t.id === track.id);
    if (idx >= 0) {
      likedSongs.value = likedSongs.value.filter(t => t.id !== track.id);
      showToast('Removed from Liked Songs');
    } else {
      likedSongs.value = [...likedSongs.value, track];
      showToast('Added to Liked Songs');
      if (buttonEl) spawnHeartParticles(buttonEl);
    }
    saveState();
  }, []);

  // ─── Navigation ───
  const switchView = useCallback((name) => {
    currentView.value = name;
    if (lyricsVisible) setLyricsVisible(false);
  }, [lyricsVisible]);

  const showPlaylistDetail = useCallback((playlist, isLiked) => {
    currentPlaylistId.value = playlist.id;
    playlistViewState.value = { playlist, isLiked };
    switchView('playlist');
  }, [switchView]);

  // ─── Radio navigation (from ContextMenu) ───
  useEffect(() => {
    const pl = pendingRadioNav.value;
    if (pl) {
      pendingRadioNav.value = null;
      showPlaylistDetail(pl, false);
    }
  }, [pendingRadioNav.value, showPlaylistDetail]);

  const showAlbumDetail = useCallback((albumId, albumMeta) => {
    albumViewState.value = { albumId, albumMeta };
    switchView('album');
  }, [switchView]);

  const openArtistPage = useCallback((artistId) => {
    if (!artistId) return;
    artistViewState.value = { artistId };
    switchView('artist');
  }, [switchView]);

  const openVideoPlayer = useCallback((videoId, title, artist) => {
    const audio = getAudio();
    if (isPlaying.value && audio) {
      audio.pause();
      isPlaying.value = false;
    }
    videoPlayerState.value = { videoId, title, artist };
  }, []);

  const closeVideoPlayer = useCallback(() => {
    videoPlayerState.value = null;
  }, []);

  const toggleLyrics = useCallback(() => {
    setLyricsVisible(v => !v);
    if (!lyricsVisible) setQueueVisible(false);
  }, [lyricsVisible]);

  const toggleQueue = useCallback(() => {
    setQueueVisible(v => !v);
    if (!queueVisible) setLyricsVisible(false);
  }, [queueVisible]);

  // ─── Album play ───
  const playAlbum = useCallback(async (albumId) => {
    try {
      showToast('Loading album...');
      const tracks = await window.snowify.albumTracks(albumId);
      if (tracks?.length) {
        playFromList(tracks, 0);
      } else {
        showToast('Could not load album tracks');
      }
    } catch (err) {
      console.error('Album play error:', err);
      showToast('Could not load album');
    }
  }, [playFromList]);

  // ─── Floating search ───
  const showFloatingSearch = ['home', 'explore', 'library', 'artist', 'album', 'playlist'].includes(currentView.value);

  const view = currentView.value;
  const track = currentTrack.value;
  const hasPlayer = !!track;

  return (
    <>
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
              <svg className="floating-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="7"/><path d="M16 16l4.5 4.5" strokeLinecap="round"/></svg>
              <span className="floating-search-text">Search</span>
            </div>
          )}

          <section className={`view${view === 'home' ? ' active' : ''}`} id="view-home">
            {initialized && view === 'home' && <HomeView onPlayFromList={playFromList} onShowAlbum={showAlbumDetail} onOpenArtist={openArtistPage} onAlbumPlay={playAlbum} />}
          </section>

          <section className={`view${view === 'search' ? ' active' : ''}`} id="view-search">
            {view === 'search' && <SearchView onPlayFromList={playFromList} onOpenArtist={openArtistPage} onLike={handleLikeToggle} />}
          </section>

          <Suspense fallback={<Spinner />}>
            <section className={`view${view === 'explore' ? ' active' : ''}`} id="view-explore">
              {view === 'explore' && <ExploreView onPlayFromList={playFromList} onShowAlbum={showAlbumDetail} onOpenArtist={openArtistPage} onOpenVideoPlayer={openVideoPlayer} onAlbumPlay={playAlbum} />}
            </section>

            <section className={`view${view === 'library' ? ' active' : ''}`} id="view-library">
              {view === 'library' && <LibraryView onShowPlaylist={showPlaylistDetail} />}
            </section>

            <section className={`view${view === 'playlist' ? ' active' : ''}`} id="view-playlist">
              {view === 'playlist' && playlistViewState.value && (
                <PlaylistView
                  playlist={playlistViewState.value.playlist}
                  isLiked={playlistViewState.value.isLiked}
                  onPlayFromList={playFromList}
                  onLike={handleLikeToggle}
                />
              )}
            </section>

            <section className={`view${view === 'album' ? ' active' : ''}`} id="view-album">
              {view === 'album' && albumViewState.value && (
                <AlbumView
                  albumId={albumViewState.value.albumId}
                  albumMeta={albumViewState.value.albumMeta}
                  onPlayFromList={playFromList}
                  onLike={handleLikeToggle}
                />
              )}
            </section>

            <section className={`view${view === 'artist' ? ' active' : ''}`} id="view-artist">
              {view === 'artist' && artistViewState.value && (
                <ArtistView
                  artistId={artistViewState.value.artistId}
                  onPlayFromList={playFromList}
                  onShowAlbum={showAlbumDetail}
                  onOpenVideoPlayer={openVideoPlayer}
                  onOpenArtist={openArtistPage}
                  onLike={handleLikeToggle}
                  onAlbumPlay={playAlbum}
                />
              )}
            </section>

            <section className={`view${view === 'settings' ? ' active' : ''}`} id="view-settings">
              {view === 'settings' && <SettingsView onSwitchView={switchView} />}
            </section>
          </Suspense>
        </main>
      </div>

      {hasPlayer && (
        <NowPlayingBar
          audio={getAudio()}
          onTogglePlay={togglePlay}
          onNext={playNext}
          onPrev={playPrev}
          onToggleShuffle={toggleShuffle}
          onToggleRepeat={toggleRepeat}
          onSetVolume={setVolumeLevel}
          onToggleLyrics={toggleLyrics}
          onToggleQueue={toggleQueue}
          onShowAlbum={showAlbumDetail}
        />
      )}

      <QueuePanel visible={queueVisible} onClose={() => setQueueVisible(false)} />

      <Suspense fallback={null}>
        {lyricsVisible && <LyricsPanel visible={lyricsVisible} onClose={() => setLyricsVisible(false)} audio={getAudio()} />}

        {videoPlayerState.value && (
          <VideoPlayer
            videoId={videoPlayerState.value.videoId}
            title={videoPlayerState.value.title}
            artist={videoPlayerState.value.artist}
            onClose={closeVideoPlayer}
          />
        )}

        {spotifyVisible && <SpotifyImport visible={spotifyVisible} onClose={() => setSpotifyVisible(false)} />}
      </Suspense>

      <ContextMenu />
      <PlaylistContextMenu />
      <Toast />
      <InputModal />
      <PlaylistPickerModal />
    </>
  );
}
