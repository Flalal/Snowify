import { useEffect, useState, useRef, useCallback } from 'preact/hooks';
import { currentTrack, isCurrentLiked, isLoading } from '../../state/index.js';
import { nowPlayingViewVisible } from '../../state/ui.js';
import { usePlaybackContext } from '../../hooks/usePlaybackContext.js';
import { useLikeTrack } from '../../hooks/useLikeTrack.js';
import { PlaybackControls } from '../NowPlayingBar/PlaybackControls.jsx';
import { ProgressBar } from '../NowPlayingBar/ProgressBar.jsx';
import { ArtistLink } from '../shared/ArtistLink.jsx';
import { formatTime } from '../../utils/formatTime.js';

export function NowPlayingView({ visible }) {
  const { getAudio } = usePlaybackContext();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [show, setShow] = useState(false);
  const viewRef = useRef(null);
  const touchRef = useRef({ startY: 0, currentY: 0, swiping: false, started: false });

  const audio = getAudio();
  const toggleLike = useLikeTrack();

  const animateClose = useCallback(() => {
    if (viewRef.current) {
      viewRef.current.style.transition = 'transform 0.35s ease-out';
      viewRef.current.style.transform = 'translateY(100%)';
      setTimeout(() => {
        nowPlayingViewVisible.value = false;
        if (viewRef.current) {
          viewRef.current.style.transform = '';
          viewRef.current.style.transition = '';
        }
      }, 350);
    } else {
      nowPlayingViewVisible.value = false;
    }
  }, []);

  // Entrance animation
  useEffect(() => {
    if (visible) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setShow(true));
      });
    } else {
      setShow(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!audio) return;
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
    };
    audio.addEventListener('timeupdate', onTimeUpdate);
    return () => audio.removeEventListener('timeupdate', onTimeUpdate);
  }, [audio]);

  // Swipe-to-close: native listener with { passive: false }
  useEffect(() => {
    const el = viewRef.current;
    if (!el || !show) return;

    const onTouchMove = (e) => {
      if (!touchRef.current.started) return;
      const deltaY = e.touches[0].clientY - touchRef.current.startY;

      if (!touchRef.current.swiping) {
        const content = el.querySelector('.np-view-content');
        if (deltaY > 10 && (!content || content.scrollTop <= 0)) {
          touchRef.current.swiping = true;
        } else {
          return;
        }
      }

      e.preventDefault();
      touchRef.current.currentY = e.touches[0].clientY;
      const dy = Math.max(0, touchRef.current.currentY - touchRef.current.startY);
      el.style.transition = 'none';
      el.style.transform = `translateY(${dy}px)`;
    };

    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, [show]);

  const track = currentTrack.value;
  const liked = isCurrentLiked.value;
  const loading = isLoading.value;

  if (!track) return null;

  const handleSeek = (ratio) => {
    if (audio && audio.duration) {
      audio.currentTime = ratio * audio.duration;
    }
  };

  const handleLike = () => {
    toggleLike(track);
  };

  const handleTouchStart = (e) => {
    if (e.target.closest('button') || e.target.closest('.progress-bar')) return;
    touchRef.current = {
      startY: e.touches[0].clientY,
      currentY: e.touches[0].clientY,
      swiping: false,
      started: true
    };
  };

  const handleTouchEnd = () => {
    if (!touchRef.current.swiping) {
      touchRef.current.started = false;
      return;
    }
    touchRef.current.started = false;
    touchRef.current.swiping = false;
    const deltaY = touchRef.current.currentY - touchRef.current.startY;
    if (viewRef.current) {
      viewRef.current.style.transition = 'transform 0.35s ease-out';
      if (deltaY > 120) {
        viewRef.current.style.transform = 'translateY(100%)';
        setTimeout(() => {
          nowPlayingViewVisible.value = false;
          if (viewRef.current) {
            viewRef.current.style.transform = '';
            viewRef.current.style.transition = '';
          }
        }, 350);
      } else {
        viewRef.current.style.transform = 'translateY(0)';
      }
    }
  };

  const handleTouchCancel = () => {
    touchRef.current.started = false;
    touchRef.current.swiping = false;
    if (viewRef.current) {
      viewRef.current.style.transition = 'transform 0.35s ease-out';
      viewRef.current.style.transform = 'translateY(0)';
    }
  };

  return (
    <div
      ref={viewRef}
      className={`now-playing-view${show ? ' visible' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      <div
        className="np-view-bg"
        style={{ backgroundImage: `url(${track.thumbnail})` }}
      />
      <div className="np-view-overlay" />

      <div className="np-view-content">
        {/* Drag indicator */}
        <div className="np-view-drag" onClick={animateClose}>
          <div className="np-view-pill" />
        </div>

        {/* Artwork — fills available space */}
        <div className="np-view-art-wrap">
          <img
            className="np-view-art"
            src={track.thumbnail}
            alt={track.title}
          />
        </div>

        {/* Track info + like */}
        <div className="np-view-info">
          <div className="np-view-meta">
            <div className="np-view-title">{track.title}</div>
            <div className="np-view-artist">
              <ArtistLink track={track} />
            </div>
          </div>
          <button
            className={`np-view-like${liked ? ' liked' : ''}`}
            onClick={handleLike}
            aria-label="Like"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
        </div>

        {/* Progress */}
        <div className="np-view-progress">
          <ProgressBar currentTime={currentTime} duration={duration} onSeek={handleSeek} />
          <div className="np-view-times">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="np-view-controls">
          <PlaybackControls loading={loading} />
        </div>
      </div>
    </div>
  );
}
