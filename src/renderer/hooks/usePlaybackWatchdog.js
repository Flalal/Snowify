import { useEffect, useRef } from 'preact/hooks';
import { isPlaying, isLoading } from '../state/index.js';
import { handlePlaybackError } from '../utils/playbackError.js';
import { WATCHDOG_INTERVAL_MS, WATCHDOG_STALL_TICKS } from '../../shared/constants.js';

export function usePlaybackWatchdog(getAudio, playNext) {
  const playNextRef = useRef(playNext);
  playNextRef.current = playNext;
  const watchdogRef = useRef({ lastTime: -1, stallTicks: 0 });

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
        if (watchdogRef.current.stallTicks >= WATCHDOG_STALL_TICKS) {
          console.warn('Watchdog: playback stalled at', ct, '— advancing');
          watchdogRef.current.stallTicks = 0;
          watchdogRef.current.lastTime = -1;
          handlePlaybackError({ reason: 'stream_stalled', playNext: playNextRef.current });
        }
      } else {
        watchdogRef.current.stallTicks = 0;
      }
      watchdogRef.current.lastTime = ct;
    }, WATCHDOG_INTERVAL_MS);
    return () => clearInterval(handle);
  }, []);
}
