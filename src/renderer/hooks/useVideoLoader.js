import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { isPlaying, volume, videoQuality, videoPremuxed } from '../state/index.js';
import { showToast } from '../state/ui.js';
import { api } from '../services/api.js';

/**
 * Manages video stream loading, split-audio sync, and cleanup.
 *
 * Returns { loading, videoRef, doClose }
 */
export function useVideoLoader(videoId, onClose) {
  const [loading, setLoading] = useState(true);
  const videoRef = useRef(null);
  const videoAudioRef = useRef(null);
  const wasPlayingRef = useRef(false);

  // ── Sync helpers ──
  const syncVideoAudio = useCallback(() => {
    const videoEl = videoRef.current;
    const audioEl = videoAudioRef.current;
    if (audioEl && videoEl && Math.abs(videoEl.currentTime - audioEl.currentTime) > 0.3) {
      audioEl.currentTime = videoEl.currentTime;
    }
  }, []);

  const onVideoPause = useCallback(() => {
    if (videoAudioRef.current) videoAudioRef.current.pause();
  }, []);

  const onVideoPlay = useCallback(() => {
    const audioEl = videoAudioRef.current;
    const videoEl = videoRef.current;
    if (audioEl && videoEl) {
      audioEl.currentTime = videoEl.currentTime;
      audioEl.play();
    }
  }, []);

  // ── Close handler ──
  const doClose = useCallback(() => {
    const videoEl = videoRef.current;
    const audioEl = videoAudioRef.current;
    const mainAudio = document.getElementById('audio-player');

    if (videoEl) {
      videoEl.pause();
      videoEl.removeEventListener('seeked', syncVideoAudio);
      videoEl.removeEventListener('timeupdate', syncVideoAudio);
      videoEl.removeEventListener('pause', onVideoPause);
      videoEl.removeEventListener('play', onVideoPlay);
      videoEl.src = '';
    }

    if (audioEl) {
      audioEl.pause();
      audioEl.src = '';
      videoAudioRef.current = null;
    }

    if (wasPlayingRef.current && mainAudio) {
      mainAudio
        .play()
        .then(() => {
          isPlaying.value = true;
        })
        .catch(() => {});
    }

    if (onClose) onClose();
  }, [onClose, syncVideoAudio, onVideoPause, onVideoPlay]);

  // ── Load video stream ──
  useEffect(() => {
    if (!videoId) return;

    const mainAudio = document.getElementById('audio-player');
    const videoEl = videoRef.current;

    if (videoEl) {
      videoEl.src = '';
      videoEl.poster = '';
    }
    if (videoAudioRef.current) {
      videoAudioRef.current.pause();
      videoAudioRef.current = null;
    }
    setLoading(true);

    wasPlayingRef.current = isPlaying.value;
    if (isPlaying.value && mainAudio) {
      mainAudio.pause();
      isPlaying.value = false;
    }

    let cancelled = false;

    (async () => {
      try {
        const result = await api.getVideoStreamUrl(
          videoId,
          videoQuality.value,
          videoPremuxed.value
        );
        if (cancelled) return;

        videoEl.src = result.videoUrl;
        setLoading(false);

        if (result.audioUrl) {
          const splitAudio = new Audio(result.audioUrl);
          splitAudio.volume = volume.value * 0.3;
          videoAudioRef.current = splitAudio;

          videoEl.muted = true;

          const onVideoPlaying = () => {
            videoEl.removeEventListener('playing', onVideoPlaying);
            if (videoAudioRef.current) {
              videoAudioRef.current.currentTime = videoEl.currentTime;
              videoAudioRef.current.play();
            }
          };
          videoEl.addEventListener('playing', onVideoPlaying);
          videoEl.play();

          videoEl.addEventListener('seeked', syncVideoAudio);
          videoEl.addEventListener('pause', onVideoPause);
          videoEl.addEventListener('play', onVideoPlay);
          videoEl.addEventListener('timeupdate', syncVideoAudio);
        } else {
          videoEl.muted = false;
          videoEl.play();
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Video playback error:', err);
        setLoading(false);
        showToast('Failed to load video');
        doClose();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [videoId, syncVideoAudio, onVideoPause, onVideoPlay, doClose]);

  return { loading, videoRef, doClose };
}
