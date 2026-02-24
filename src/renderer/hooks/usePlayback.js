import { useEffect, useRef } from 'preact/hooks';
import { currentTrack, isPlaying } from '../state/index.js';
import { updateDiscordPresence } from '../utils/discordPresence.js';
import { updateMediaSession, syncPositionState } from '../utils/mediaSession.js';
import { handlePlaybackError } from '../utils/playbackError.js';
import { useTrackPlayer } from './useTrackPlayer.js';
import { useQueueControls } from './useQueueControls.js';
import { usePlaybackWatchdog } from './usePlaybackWatchdog.js';

export function usePlayback() {
  const { getAudio, playTrack, playFromList, prefetchNextTrack, onTrackPlayedRef } =
    useTrackPlayer();
  const {
    smartQueueFill,
    playNext,
    playPrev,
    togglePlay,
    setVolumeLevel,
    toggleShuffle,
    toggleRepeat
  } = useQueueControls(getAudio, playTrack);

  // Fresh refs for use in effects with stable [] deps
  const playNextRef = useRef(playNext);
  playNextRef.current = playNext;
  const playTrackRef = useRef(playTrack);
  playTrackRef.current = playTrack;

  // Wire up media session update (breaks circular dep between playTrack and playNext/playPrev)
  onTrackPlayedRef.current = (track) => {
    updateMediaSession(track, { getAudio, playPrev, playNext });
  };

  // ─── Audio event listeners ───
  useEffect(() => {
    const audio = getAudio();
    if (!audio) return;

    const onEnded = () => playNextRef.current();
    const onError = () => {
      handlePlaybackError({ reason: 'audio_error', playNext: playNextRef.current });
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
    playTrack,
    playFromList,
    playNext,
    playPrev,
    togglePlay,
    smartQueueFill,
    prefetchNextTrack,
    setVolumeLevel,
    toggleShuffle,
    toggleRepeat,
    updateMediaSession: (track) => updateMediaSession(track, { getAudio, playPrev, playNext })
  };
}
