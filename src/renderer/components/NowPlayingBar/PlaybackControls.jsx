import { shuffle, repeat, isPlaying } from '../../state/index.js';
import { usePlaybackContext } from '../../hooks/usePlaybackContext.js';

export function PlaybackControls({ loading }) {
  const { togglePlay, playNext, playPrev, toggleShuffle, toggleRepeat } = usePlaybackContext();
  const rep = repeat.value;
  const shuf = shuffle.value;
  const playing = isPlaying.value;

  const repeatIcon =
    rep === 'one' ? (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 1l4 4-4 4" />
        <path d="M3 11V9a4 4 0 014-4h14" />
        <path d="M7 23l-4-4 4-4" />
        <path d="M21 13v2a4 4 0 01-4 4H3" />
        <text
          x="12"
          y="15"
          textAnchor="middle"
          fontSize="8"
          fill="currentColor"
          stroke="none"
          fontWeight="bold"
        >
          1
        </text>
      </svg>
    ) : rep === 'all' ? (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 1l4 4-4 4" />
        <path d="M3 11V9a4 4 0 014-4h14" />
        <path d="M7 23l-4-4 4-4" />
        <path d="M21 13v2a4 4 0 01-4 4H3" />
        <text
          x="12"
          y="15"
          textAnchor="middle"
          fontSize="7"
          fill="currentColor"
          stroke="none"
          fontWeight="bold"
        >
          ∞
        </text>
      </svg>
    ) : (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 1l4 4-4 4" />
        <path d="M3 11V9a4 4 0 014-4h14" />
        <path d="M7 23l-4-4 4-4" />
        <path d="M21 13v2a4 4 0 01-4 4H3" />
      </svg>
    );

  return (
    <div className="np-buttons">
      <button
        className={`icon-btn${shuf ? ' active' : ''}`}
        onClick={toggleShuffle}
        title="Shuffle"
        aria-label="Shuffle"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
          <path
            d="M4 20L9 15"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M4 4L9 9"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M15 15L21 21"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M21 3L14 10"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M16 3H21V8"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M21 16V21H16"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button className="icon-btn" onClick={playPrev} title="Previous" aria-label="Previous">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
        </svg>
      </button>
      <button
        className={`play-btn${loading ? ' loading' : ''}`}
        onClick={togglePlay}
        title={loading ? 'Loading...' : playing ? 'Pause' : 'Play'}
        aria-label={loading ? 'Loading' : playing ? 'Pause' : 'Play'}
      >
        {loading ? (
          <div className="play-btn-spinner"></div>
        ) : playing ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7L8 5z" />
          </svg>
        )}
      </button>
      <button className="icon-btn" onClick={playNext} title="Next" aria-label="Next">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 6h2v12h-2V6zM6 18l8.5-6L6 6v12z" />
        </svg>
      </button>
      <button
        className={`icon-btn${rep !== 'off' ? ' active' : ''}`}
        onClick={toggleRepeat}
        title={rep === 'one' ? 'Repeat One' : rep === 'all' ? 'Repeat All' : 'Repeat'}
        aria-label={rep === 'one' ? 'Repeat one' : rep === 'all' ? 'Repeat all' : 'Repeat'}
      >
        {repeatIcon}
      </button>
    </div>
  );
}
