import { useCallback } from 'preact/hooks';
import {
  queue, originalQueue, queueIndex, isPlaying, isLoading,
  shuffle, repeat, volume, autoplay, currentTrack, saveState
} from '../state/index.js';
import { shuffleArray } from '../utils/shuffleArray.js';
import { showToast } from '../state/ui.js';
import { updateDiscordPresence, clearDiscordPresence } from '../utils/discordPresence.js';
import {
  VOLUME_SCALE, QUEUE_MAX_SIZE, AUTOPLAY_ADD_COUNT,
  AUTOPLAY_MIN_POOL, RESTART_THRESHOLD_S
} from '../../shared/constants.js';
import { api } from '../services/api.js';

export function useQueueControls(getAudio, playTrack) {
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
      const upNexts = await api.getUpNexts(current.id);
      addToPool(upNexts);
      if (pool.length < AUTOPLAY_MIN_POOL && current.artistId) {
        const info = await api.artistInfo(current.artistId);
        if (info) addToPool(info.topSongs || []);
      }
      if (!pool.length) {
        showToast('Autoplay: no similar songs found');
        isPlaying.value = false;
        return;
      }
      pool = shuffleArray(pool);
      const maxAdd = Math.min(AUTOPLAY_ADD_COUNT, QUEUE_MAX_SIZE - queue.value.length);
      if (maxAdd <= 0) {
        const trim = Math.min(queueIndex.value, queue.value.length - (QUEUE_MAX_SIZE / 2));
        if (trim > 0) {
          queue.value = queue.value.slice(trim);
          queueIndex.value = queueIndex.value - trim;
        }
      }
      const newTracks = pool.slice(0, Math.max(maxAdd, AUTOPLAY_MIN_POOL));
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
  }, [playTrack, smartQueueFill]);

  const playPrev = useCallback(() => {
    const audio = getAudio();
    if (!queue.value.length) return;
    if (audio && audio.currentTime > RESTART_THRESHOLD_S) {
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
      if (track) updateDiscordPresence(track, audio);
    } else {
      audio.pause();
      isPlaying.value = false;
      clearDiscordPresence();
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
    }
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
        queue.value = [current, ...shuffleArray(rest)];
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

  return {
    smartQueueFill, playNext, playPrev, togglePlay,
    setVolumeLevel, toggleShuffle, toggleRepeat
  };
}
