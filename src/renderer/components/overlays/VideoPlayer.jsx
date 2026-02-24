import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { isPlaying, volume, videoQuality, videoPremuxed } from '../../state/index.js';
import { showToast } from '../../state/ui.js';
import { api } from '../../services/api.js';

/**
 * VideoPlayer -- Full-screen overlay for music video playback.
 *
 * Props:
 *   - videoId: YouTube video ID to play
 *   - title: video title to display
 *   - artist: artist name to display
 *   - onClose: callback to close the overlay
 *
 * Uses videoQuality and videoPremuxed signals from state.
 */
export function VideoPlayer({ videoId, title, artist, onClose }) {
  const [loading, setLoading] = useState(true);
  const videoRef = useRef(null);
  const videoAudioRef = useRef(null);
  const wasPlayingRef = useRef(false);
  const overlayRef = useRef(null);

  // ── Sync helpers (stable refs to avoid stale closures) ──
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

    // Resume audio if it was playing before
    if (wasPlayingRef.current && mainAudio) {
      mainAudio.play().then(() => {
        isPlaying.value = true;
      }).catch(() => {});
    }

    if (onClose) onClose();
  }, [onClose, syncVideoAudio, onVideoPause, onVideoPlay]);

  // ── Escape key to close ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        doClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [doClose]);

  // ── Click overlay background to close ──
  const handleOverlayClick = useCallback((e) => {
    if (e.target === overlayRef.current) {
      doClose();
    }
  }, [doClose]);

  // ── Open and load video ──
  useEffect(() => {
    if (!videoId) return;

    const mainAudio = document.getElementById('audio-player');
    const videoEl = videoRef.current;

    // Reset
    if (videoEl) {
      videoEl.src = '';
      videoEl.poster = '';
    }
    if (videoAudioRef.current) {
      videoAudioRef.current.pause();
      videoAudioRef.current = null;
    }
    setLoading(true);

    // Pause audio playback while watching video
    wasPlayingRef.current = isPlaying.value;
    if (isPlaying.value && mainAudio) {
      mainAudio.pause();
      isPlaying.value = false;
    }

    let cancelled = false;

    (async () => {
      try {
        const result = await api.getVideoStreamUrl(videoId, videoQuality.value, videoPremuxed.value);
        if (cancelled) return;

        videoEl.src = result.videoUrl;
        setLoading(false);

        if (result.audioUrl) {
          // Split streams: sync a separate audio element
          const splitAudio = new Audio(result.audioUrl);
          splitAudio.volume = volume.value * 0.3;
          videoAudioRef.current = splitAudio;

          videoEl.muted = true;

          // Wait for video to actually start playing before starting audio
          const onVideoPlaying = () => {
            videoEl.removeEventListener('playing', onVideoPlaying);
            if (videoAudioRef.current) {
              videoAudioRef.current.currentTime = videoEl.currentTime;
              videoAudioRef.current.play();
            }
          };
          videoEl.addEventListener('playing', onVideoPlaying);
          videoEl.play();

          // Keep audio in sync with video
          videoEl.addEventListener('seeked', syncVideoAudio);
          videoEl.addEventListener('pause', onVideoPause);
          videoEl.addEventListener('play', onVideoPlay);

          // Periodic drift correction
          videoEl.addEventListener('timeupdate', syncVideoAudio);
        } else {
          // Muxed stream: play directly
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

  return (
    <div
      id="video-overlay"
      className="video-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
    >
      <div className="video-overlay-content">
        <div className="video-overlay-header">
          <div className="video-overlay-info">
            <span id="video-overlay-title">{title || 'Music Video'}</span>
            <span id="video-overlay-artist">{artist || ''}</span>
          </div>
          <button id="btn-close-video" className="icon-btn" onClick={doClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <video
          id="video-player"
          ref={videoRef}
          controls
        />

        {loading && (
          <div id="video-loading" className="video-loading">
            <div className="spinner"></div>
          </div>
        )}
      </div>
    </div>
  );
}
