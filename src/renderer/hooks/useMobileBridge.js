import { useCallback, useEffect, useRef } from 'preact/hooks';
import { currentTrack, likedSongs } from '../state/index.js';
import { nowPlayingViewVisible } from '../state/ui.js';
import { useLikeTrack } from './useLikeTrack.js';

/**
 * Side-effect hook for mobile bridge:
 * - Exposes playback controls on window.__snowifyPlayback
 * - Syncs like state to mobile media session
 * - Auto-opens NowPlayingView on track change (mobile only)
 */
export function useMobileBridge({ togglePlay, playNext, playPrev }) {
  const handleLikeToggle = useLikeTrack();

  const toggleLikeCurrentTrack = useCallback(() => {
    const track = currentTrack.value;
    if (track) {
      handleLikeToggle(track);
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
}
