import { useEffect, useRef, useCallback } from 'preact/hooks';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';
import { useVideoLoader } from '../../hooks/useVideoLoader.js';

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
  const overlayRef = useRef(null);
  const { loading, videoRef, doClose } = useVideoLoader(videoId, onClose);

  useFocusTrap(overlayRef, !!videoId);

  // ── Escape key to close ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') doClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [doClose]);

  // ── Click overlay background to close ──
  const handleOverlayClick = useCallback(
    (e) => {
      if (e.target === overlayRef.current) doClose();
    },
    [doClose]
  );

  return (
    <div
      id="video-overlay"
      className="video-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Video player"
      ref={overlayRef}
      onClick={handleOverlayClick}
    >
      <div className="video-overlay-content">
        <div className="video-overlay-header">
          <div className="video-overlay-info">
            <span id="video-overlay-title">{title || 'Music Video'}</span>
            <span id="video-overlay-artist">{artist || ''}</span>
          </div>
          <button
            id="btn-close-video"
            className="icon-btn"
            aria-label="Close video"
            onClick={doClose}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <video id="video-player" ref={videoRef} controls />

        {loading && (
          <div id="video-loading" className="video-loading">
            <div className="spinner"></div>
          </div>
        )}
      </div>
    </div>
  );
}
