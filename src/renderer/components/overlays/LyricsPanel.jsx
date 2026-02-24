import { useRef, useEffect } from 'preact/hooks';
import { useLyrics } from '../../hooks/useLyrics.js';

/**
 * LyricsPanel -- Slide-out panel displaying synced or plain lyrics.
 *
 * Props:
 *   - visible: boolean controlling panel visibility
 *   - onClose: callback to close the panel
 *   - audio: the HTML audio element used for playback
 */
export function LyricsPanel({ visible, onClose, audio }) {
  const { lyricsLines, lyricsType, plainText, activeIdx, handleLineClick } = useLyrics(
    visible,
    audio
  );
  const bodyRef = useRef(null);

  // ── Auto-scroll active line to center ──
  useEffect(() => {
    if (lyricsType !== 'synced' || activeIdx < 0 || !bodyRef.current) return;
    const allLines = bodyRef.current.querySelectorAll('.lyrics-line');
    if (allLines[activeIdx]) {
      allLines[activeIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIdx, lyricsType]);

  // ── Render body content ──
  function renderBody() {
    if (lyricsType === 'loading') {
      return (
        <div className="lyrics-loading">
          <div className="spinner"></div>
          <p>Searching for lyrics{'\u2026'}</p>
        </div>
      );
    }

    if (lyricsType === 'error') {
      return (
        <div className="lyrics-empty">
          <p>Failed to load lyrics</p>
        </div>
      );
    }

    if (lyricsType === 'empty' || (!lyricsType && !lyricsLines.length)) {
      return (
        <div className="lyrics-empty">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-subdued)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <p>No lyrics found for this song</p>
        </div>
      );
    }

    if (lyricsType === 'synced') {
      return (
        <div className="lyrics-content synced">
          <div className="lyrics-spacer"></div>
          {lyricsLines.map((line, i) => {
            const dist = Math.abs(i - activeIdx);
            let opacity;
            if (activeIdx < 0) {
              opacity = '0.35';
            } else if (dist === 0) {
              opacity = '1';
            } else if (dist <= 2) {
              opacity = '0.45';
            } else {
              opacity = '0.2';
            }

            return (
              <div
                key={i}
                className={`lyrics-line${i === activeIdx ? ' active' : ''}`}
                data-index={i}
                data-time={line.time}
                style={{ opacity }}
                onClick={() => handleLineClick(line.time)}
              >
                {line.text}
              </div>
            );
          })}
          <div className="lyrics-spacer"></div>
        </div>
      );
    }

    if (lyricsType === 'plain') {
      const lines = plainText.split('\n').filter((l) => l.trim());
      return (
        <div className="lyrics-content plain">
          <div className="lyrics-spacer"></div>
          {lines.map((l, i) => (
            <div key={i} className="lyrics-line plain-line">
              {l}
            </div>
          ))}
          <div className="lyrics-spacer"></div>
        </div>
      );
    }

    return null;
  }

  return (
    <div
      id="lyrics-panel"
      className={`lyrics-panel${visible ? ' visible' : ' hidden'}`}
      role="complementary"
      aria-label="Lyrics"
    >
      <div className="lyrics-header">
        <h3>Lyrics</h3>
        <button
          id="btn-close-lyrics"
          className="icon-btn"
          aria-label="Close lyrics"
          onClick={onClose}
        >
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div id="lyrics-body" className="lyrics-body" ref={bodyRef}>
        {renderBody()}
      </div>
    </div>
  );
}
