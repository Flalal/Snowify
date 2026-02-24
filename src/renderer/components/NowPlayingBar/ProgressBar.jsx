import { useRef } from 'preact/hooks';
import { formatTime } from '../../utils/formatTime.js';

export function ProgressBar({ currentTime, duration, onSeek }) {
  const barRef = useRef(null);
  const dragging = useRef(false);

  const pct = duration ? (currentTime / duration) * 100 : 0;

  const seekTo = (e) => {
    const rect = barRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (onSeek) onSeek(ratio);
  };

  const onMouseDown = (e) => {
    dragging.current = true;
    seekTo(e);
    const onMove = (e) => {
      if (dragging.current) seekTo(e);
    };
    const onUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const onKeyDown = (e) => {
    if (!duration || !onSeek) return;
    const step = 5;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      onSeek(Math.min(1, (currentTime + step) / duration));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onSeek(Math.max(0, (currentTime - step) / duration));
    }
  };

  return (
    <div className="np-progress">
      <span className="time">{formatTime(currentTime)}</span>
      <div
        className="progress-bar"
        ref={barRef}
        role="slider"
        aria-label="Seek"
        aria-valuenow={Math.round(currentTime)}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration) || 0}
        tabIndex={0}
        onMouseDown={onMouseDown}
        onKeyDown={onKeyDown}
      >
        <div className="progress-fill" style={{ width: pct + '%' }}>
          <div className="progress-handle"></div>
        </div>
      </div>
      <span className="time">{formatTime(duration)}</span>
    </div>
  );
}
