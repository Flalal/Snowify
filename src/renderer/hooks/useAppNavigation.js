import { useCallback, useEffect, useMemo } from 'preact/hooks';
import { currentView, isPlaying, currentPlaylistId, pendingRadioNav } from '../state/index.js';
import {
  albumViewState,
  artistViewState,
  playlistViewState,
  videoPlayerState,
  navigationHistory,
  captureNavSnapshot,
  restoreNavSnapshot
} from '../state/navigation.js';
import { showToast, lyricsVisible, nowPlayingViewVisible } from '../state/ui.js';
import { api } from '../services/api.js';
import { NAV_HISTORY_MAX } from '../../shared/constants.js';

export function useAppNavigation(playFromList, getAudio) {
  const switchView = useCallback((name) => {
    currentView.value = name;
    navigationHistory.value = [];
    if (lyricsVisible.value) lyricsVisible.value = false;
    if (nowPlayingViewVisible.value) nowPlayingViewVisible.value = false;
  }, []);

  const pushHistory = useCallback(() => {
    const snapshot = captureNavSnapshot();
    const stack = navigationHistory.value.slice(0, NAV_HISTORY_MAX - 1);
    navigationHistory.value = [...stack, snapshot];
  }, []);

  const showPlaylistDetail = useCallback(
    (playlist, isLiked) => {
      pushHistory();
      currentPlaylistId.value = playlist.id;
      playlistViewState.value = { playlist, isLiked };
      currentView.value = 'playlist';
      if (lyricsVisible.value) lyricsVisible.value = false;
      if (nowPlayingViewVisible.value) nowPlayingViewVisible.value = false;
    },
    [pushHistory]
  );

  // ─── Radio navigation (from ContextMenu) ───
  useEffect(() => {
    const pl = pendingRadioNav.value;
    if (pl) {
      pendingRadioNav.value = null;
      showPlaylistDetail(pl, false);
    }
  }, [pendingRadioNav.value, showPlaylistDetail]);

  const showAlbumDetail = useCallback(
    (albumId, albumMeta) => {
      pushHistory();
      albumViewState.value = { albumId, albumMeta };
      currentView.value = 'album';
      if (lyricsVisible.value) lyricsVisible.value = false;
      if (nowPlayingViewVisible.value) nowPlayingViewVisible.value = false;
    },
    [pushHistory]
  );

  const openArtistPage = useCallback(
    (artistId) => {
      if (!artistId) return;
      pushHistory();
      artistViewState.value = { artistId };
      currentView.value = 'artist';
      if (lyricsVisible.value) lyricsVisible.value = false;
      if (nowPlayingViewVisible.value) nowPlayingViewVisible.value = false;
    },
    [pushHistory]
  );

  const goBack = useCallback(() => {
    const stack = navigationHistory.value;
    if (!stack.length) return;
    const entry = stack[stack.length - 1];
    navigationHistory.value = stack.slice(0, -1);
    restoreNavSnapshot(entry);
    currentView.value = entry.view;
    if (lyricsVisible.value) lyricsVisible.value = false;
    if (nowPlayingViewVisible.value) nowPlayingViewVisible.value = false;
  }, []);

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

  const playAlbum = useCallback(
    async (albumId) => {
      try {
        showToast('Loading album...');
        const album = await api.albumTracks(albumId);
        if (album?.tracks?.length) {
          playFromList(album.tracks, 0);
        } else {
          showToast('Could not load album tracks');
        }
      } catch (err) {
        console.error('Album play error:', err);
        showToast('Could not load album');
      }
    },
    [playFromList]
  );

  const nav = useMemo(
    () => ({
      playFromList,
      playAlbum,
      showAlbumDetail,
      openArtistPage,
      openVideoPlayer,
      showPlaylistDetail,
      goBack
    }),
    [playFromList, playAlbum, showAlbumDetail, openArtistPage, openVideoPlayer, showPlaylistDetail, goBack]
  );

  return {
    switchView,
    showPlaylistDetail,
    showAlbumDetail,
    openVideoPlayer,
    closeVideoPlayer,
    goBack,
    nav
  };
}
