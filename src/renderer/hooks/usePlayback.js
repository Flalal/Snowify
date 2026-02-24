import { useEffect } from 'preact/hooks';
import { queue, queueIndex, isPlaying, isLoading, currentTrack } from '../state/index.js';
import { showToast } from '../state/ui.js';
import { updateDiscordPresence, clearDiscordPresence } from '../utils/discordPresence.js';
import { updateMediaSession, syncPositionState } from '../utils/mediaSession.js';
import { useTrackPlayer } from './useTrackPlayer.js';
import { useQueueControls } from './useQueueControls.js';
import { usePlaybackWatchdog } from './usePlaybackWatchdog.js';

export function usePlayback() {
  const { getAudio, playTrack, playFromList, prefetchNextTrack, onTrackPlayedRef } = useTrackPlayer();
  const {
    smartQueueFill, playNext, playPrev, togglePlay,
    setVolumeLevel, toggleShuffle, toggleRepeat
  } = useQueueControls(getAudio, playTrack);

  // Wire up media session update (breaks circular dep between playTrack and playNext/playPrev)
  onTrackPlayedRef.current = (track) => {
    updateMediaSession(track, { getAudio, playPrev, playNext });
  };

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
        if (track) updateDiscordPresence(track, audio);
      }
      syncPositionState(audio);
    };
    const onDurationChange = () => syncPositionState(audio);
    const onTimeUpdate = () => syncPositionState(audio);

    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('seeked', onSeeked);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('seeked', onSeeked);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, []);

  // ─── Playback watchdog ───
  usePlaybackWatchdog(getAudio, playNext);

  return {
    getAudio,
    playTrack, playFromList, playNext, playPrev, togglePlay,
    smartQueueFill, prefetchNextTrack,
    setVolumeLevel, toggleShuffle, toggleRepeat,
    updateMediaSession: (track) => updateMediaSession(track, { getAudio, playPrev, playNext })
  };
}
