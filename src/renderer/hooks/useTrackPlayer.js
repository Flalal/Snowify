import { useRef, useCallback } from 'preact/hooks';
import {
  queue,
  originalQueue,
  queueIndex,
  isPlaying,
  isLoading,
  shuffle,
  volume,
  audioQuality,
  recentTracks,
  saveState
} from '../state/index.js';
import { shuffleArray } from '../utils/shuffleArray.js';
import { showToast } from '../state/ui.js';
import { updateDiscordPresence } from '../utils/discordPresence.js';
import { VOLUME_SCALE, RECENT_TRACKS_MAX } from '../../shared/constants.js';
import { api } from '../services/api.js';

export function useTrackPlayer() {
  const audioRef = useRef(null);
  const skipAdvanceRef = useRef(false);
  const onTrackPlayedRef = useRef(null);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = document.getElementById('audio-player');
    }
    return audioRef.current;
  }, []);

  const addToRecent = useCallback((track) => {
    recentTracks.value = [track, ...recentTracks.value.filter((t) => t.id !== track.id)].slice(
      0,
      RECENT_TRACKS_MAX
    );
    saveState();
  }, []);

  const prefetchNextTrack = useCallback(() => {
    const nextIdx = queueIndex.value + 1;
    if (nextIdx >= queue.value.length) return;
    const next = queue.value[nextIdx];
    if (!next || (!next.url && !next.id)) return;
    const url = next.url || `https://music.youtube.com/watch?v=${next.id}`;
    api.getStreamUrl(url, audioQuality.value).catch(() => {});
  }, []);

  const playTrack = useCallback(async (track) => {
    const audio = getAudio();
    if (!audio) return;

    isLoading.value = true;
    showToast(`Loading: ${track.title}`);

    try {
      const directUrl = await api.getStreamUrl(track.url, audioQuality.value);
      audio.src = directUrl;
      audio.volume = volume.value * VOLUME_SCALE;
      audio.load();
      await audio.play();
      isPlaying.value = true;
      isLoading.value = false;
      addToRecent(track);
      updateDiscordPresence(track, audio);
      saveState();
      prefetchNextTrack();
      onTrackPlayedRef.current?.(track);
    } catch (err) {
      console.error('Playback error:', err);
      const msg = typeof err === 'string' ? err : err.message || 'unknown error';
      showToast('Playback failed: ' + msg);
      isPlaying.value = false;
      isLoading.value = false;
      if (!skipAdvanceRef.current) {
        const q = queue.value;
        const nextIdx = queueIndex.value + 1;
        if (nextIdx < q.length) {
          skipAdvanceRef.current = true;
          queueIndex.value = nextIdx;
          playTrack(q[nextIdx]).finally(() => {
            skipAdvanceRef.current = false;
          });
        }
      }
    }
  }, []);

  const playFromList = useCallback(
    (tracks, index) => {
      originalQueue.value = [...tracks];
      if (shuffle.value) {
        const picked = tracks[index];
        const rest = tracks.filter((_, i) => i !== index);
        queue.value = [picked, ...shuffleArray(rest)];
        queueIndex.value = 0;
      } else {
        queue.value = [...tracks];
        queueIndex.value = index;
      }
      playTrack(queue.value[queueIndex.value]);
    },
    [playTrack]
  );

  return { getAudio, playTrack, playFromList, prefetchNextTrack, onTrackPlayedRef };
}
