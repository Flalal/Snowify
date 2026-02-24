import { useRef } from 'preact/hooks';
import { volume } from '../../state/index.js';
import { usePlaybackContext } from '../../hooks/usePlaybackContext.js';

export function VolumeControl() {
  const { setVolumeLevel: onSetVolume } = usePlaybackContext();
  const sliderRef = useRef(null);
  const dragging = useRef(false);
  const prevVolume = useRef(0.7);

  const vol = volume.value;
  const isMuted = vol === 0;

  const updateVol = (e) => {
    const rect = sliderRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (onSetVolume) onSetVolume(pct);
  };

  const onMouseDown = (e) => {
    dragging.current = true;
    updateVol(e);
    const onMove = (e) => {
      if (dragging.current) updateVol(e);
    };
    const onUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const toggleMute = () => {
    if (vol > 0) {
      prevVolume.current = vol;
      onSetVolume(0);
    } else {
      onSetVolume(prevVolume.current);
    }
  };

  const onKeyDown = (e) => {
    const step = 0.05;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (onSetVolume) onSetVolume(Math.min(1, vol + step));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (onSetVolume) onSetVolume(Math.max(0, vol - step));
    }
  };

  return (
    <div className="volume-control">
      <button className="icon-btn" onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
        {isMuted ? (
          <svg
            className="vol-mute-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M3 9v6h4l5 5V4L7 9H3z" />
            <path
              d="M16 9l6 6M22 9l-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        ) : (
          <svg className="vol-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3z" />
            <path
              className="vol-wave"
              d="M14 9.64a3.99 3.99 0 010 4.72M16.5 7a7.97 7.97 0 010 10"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
      <div
        className="volume-slider"
        ref={sliderRef}
        role="slider"
        aria-label="Volume"
        aria-valuenow={Math.round(vol * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onMouseDown={onMouseDown}
        onKeyDown={onKeyDown}
      >
        <div className="volume-fill" style={{ width: vol * 100 + '%' }}>
          <div className="volume-handle"></div>
        </div>
      </div>
    </div>
  );
}
