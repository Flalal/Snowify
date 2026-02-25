import { useCallback, useMemo } from 'preact/hooks';
import { currentView, isPlaying, currentPlaylistId } from '../state/index.js';
import {
  albumViewState,
  artistViewState,
  playlistViewState,
  videoPlayerState
} from '../state/navigation.js';
import { showToast, lyricsVisible, nowPlayingViewVisible } from '../state/ui.js';
import { api } from '../services/api.js';

export function useAppNavigation(playFromList, getAudio) {
  const switchView = useCallback((name) => {
    currentView.value = name;
    if (lyricsVisible.value) lyricsVisible.value = false;
    if (nowPlayingViewVisible.value) nowPlayingViewVisible.value = false;
  }, []);

  const showPlaylistDetail = useCallback(
    (playlist, isLiked) => {
      currentPlaylistId.value = playlist.id;
      playlistViewState.value = { playlist, isLiked };
      switchView('playlist');
    },
    [switchView]
  );

  const showAlbumDetail = useCallback(
    (albumId, albumMeta) => {
      albumViewState.value = { albumId, albumMeta };
      switchView('album');
    },
    [switchView]
  );

  const openArtistPage = useCallback(
    (artistId) => {
      if (!artistId) return;
      artistViewState.value = { artistId };
      switchView('artist');
    },
    [switchView]
  );

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
      showPlaylistDetail
    }),
    [playFromList, playAlbum, showAlbumDetail, openArtistPage, openVideoPlayer, showPlaylistDetail]
  );

  return {
    switchView,
    showPlaylistDetail,
    showAlbumDetail,
    openVideoPlayer,
    closeVideoPlayer,
    nav
  };
}
