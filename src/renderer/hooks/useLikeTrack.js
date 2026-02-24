import { useCallback } from 'preact/hooks';
import { likedSongs, saveState } from '../state/index.js';
import { showToast } from '../components/shared/Toast.jsx';
import { spawnHeartParticles } from '../components/NowPlayingBar/NowPlayingBar.jsx';

/**
 * Hook that returns a toggle function for liking/unliking tracks.
 * Replaces duplicated like logic across App.jsx and NowPlayingBar.jsx.
 *
 * @returns {(track: object, buttonEl?: HTMLElement) => void} toggleLike
 */
export function useLikeTrack() {
  return useCallback((track, buttonEl) => {
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
}
