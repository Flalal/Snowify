// ─── Cast Hook — Chromecast discovery, connection, and media control ───

import { useEffect, useCallback } from 'preact/hooks';
import { isPlaying, currentTrack, audioQuality } from '../state/index.js';
import {
  isCasting,
  castDevice,
  castDevices,
  castPickerVisible,
  castPosition,
  castDuration,
  showToast
} from '../state/ui.js';
import { api } from '../services/api.js';

export function useCast() {
  const startDiscovery = useCallback(async () => {
    try {
      const initial = await window.snowify.castDiscover();
      if (initial.length) castDevices.value = initial;
    } catch (err) {
      console.error('Cast discovery error:', err);
    }
  }, []);

  const connectDevice = useCallback(async (device) => {
    try {
      const track = currentTrack.value;
      const audio = document.getElementById('audio-player');
      // Capture position and play state before any state change
      const wasPlaying = isPlaying.value;
      const position = isCasting.value ? castPosition.value : (audio?.currentTime || 0);

      const result = await window.snowify.castConnect(device?.id);

      // Pause local audio — sound now goes through Chromecast
      if (audio && !audio.paused) audio.pause();

      isCasting.value = true;
      castDevice.value = { name: result.name, host: result.host, id: result.id };
      castPickerVisible.value = false;
      showToast(`Connected to ${result.name}`);

      // Load current track on the new device and seek to saved position
      if (track) {
        const directUrl = await api.getStreamUrl(track.url, audioQuality.value);
        await window.snowify.castLoadMedia(directUrl, {
          title: track.title,
          artist: track.artist,
          thumbnail: track.thumbnail
        });
        if (position > 1) await window.snowify.castSeek(position);
        if (!wasPlaying) await window.snowify.castPause();
      }
    } catch (err) {
      console.error('Cast connect error:', err);
      showToast('Failed to connect to cast device');
    }
  }, []);

  const disconnectCast = useCallback(async () => {
    // Capture state before reset
    const track = currentTrack.value;
    const position = castPosition.value;
    const wasPlaying = isPlaying.value;

    try {
      await window.snowify.castDisconnect();
    } catch (_) {
      /* ignore */
    }

    isCasting.value = false;
    castDevice.value = null;
    castPosition.value = 0;
    castDuration.value = 0;
    showToast('Disconnected from cast device');

    // Resume local audio at the same position
    if (track) {
      const audio = document.getElementById('audio-player');
      if (audio) {
        const directUrl = await api.getStreamUrl(track.url, audioQuality.value);
        audio.src = directUrl;
        audio.load();
        audio.addEventListener(
          'canplay',
          () => {
            audio.currentTime = position;
            if (wasPlaying) audio.play();
          },
          { once: true }
        );
      }
    }
  }, []);

  // Listen for progressive device discovery from main process
  useEffect(() => {
    const handleDevices = (devices) => {
      castDevices.value = devices;
    };
    window.snowify.onCastDevices(handleDevices);
    return () => window.snowify.offCastDevices();
  }, []);

  // Listen for cast status updates from main process
  useEffect(() => {
    const handleStatus = (status) => {
      if (!isCasting.value) return;
      castPosition.value = status.currentTime || 0;
      castDuration.value = status.duration || 0;

      // Sync play state from Chromecast
      if (status.playerState === 'PLAYING') {
        isPlaying.value = true;
      } else if (status.playerState === 'PAUSED') {
        isPlaying.value = false;
      } else if (status.playerState === 'IDLE') {
        // Track ended on Chromecast — let playNext handle it
        // Only if we were actually playing (avoid triggering on initial idle)
        if (isPlaying.value && castDuration.value > 0) {
          isPlaying.value = false;
        }
      }
    };

    window.snowify.onCastStatus(handleStatus);
    return () => window.snowify.offCastStatus();
  }, []);

  return {
    startDiscovery,
    connectDevice,
    disconnectCast
  };
}
