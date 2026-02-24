import { useRef, useState, useEffect } from 'preact/hooks';
import { useSpotifyImport } from '../../hooks/useSpotifyImport.js';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';

const ITEM_HEIGHT = 38; // 36px min-height + 2px gap
const OVERSCAN = 5;

/**
 * SpotifyImport -- Modal overlay for importing Spotify playlists from CSV files.
 *
 * Props:
 *   - visible: boolean controlling modal visibility
 *   - onClose: callback to close the modal
 */
export function SpotifyImport({ visible, onClose }) {
  const trapRef = useRef(null);
  useFocusTrap(trapRef, visible);

  const {
    step, error, pendingPlaylists, modalTitle, startDisabled, startText,
    progressFill, progressText, progressCount, trackItems, showDoneButtons,
    cleanup, handleOverlayClick, handleExportifyLink,
    handlePickFiles, handleRemoveFile, handleStart, handleDone
  } = useSpotifyImport(onClose);

  if (!visible) return null;

  return (
    <div
      id="spotify-modal"
      className="spotify-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="spotify-modal-title"
      onClick={handleOverlayClick}
    >
      <div className="spotify-modal-content" ref={trapRef}>
        <div className="spotify-modal-header">
          <h2 id="spotify-modal-title">{modalTitle}</h2>
          <button id="spotify-cancel" className="icon-btn" aria-label="Close" onClick={cleanup}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Step 1: Select CSV files */}
        {step === 'select' && (
          <div id="spotify-step-url">
            <p className="spotify-instructions">
              Export your Spotify playlists as CSV files using{' '}
              <a
                id="spotify-exportify-link"
                href="#"
                onClick={handleExportifyLink}
              >
                PlaylistExport.com
              </a>
              , then select the files below.
            </p>

            <button id="spotify-pick-files" className="spotify-pick-btn" onClick={handlePickFiles}>
              Choose CSV Files
            </button>

            {pendingPlaylists && pendingPlaylists.length > 0 && (
              <div id="spotify-file-list" className="spotify-file-list">
                {pendingPlaylists.map((p, i) => (
                  <div key={i} className="spotify-file-item">
                    <span className="spotify-file-name">{p.name}</span>
                    <span className="spotify-file-count">{p.tracks.length} tracks</span>
                    <button className="spotify-file-remove" onClick={() => handleRemoveFile(i)} title="Remove">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
                <div className="spotify-file-summary">
                  {pendingPlaylists.length} playlist{pendingPlaylists.length > 1 ? 's' : ''} — {pendingPlaylists.reduce((s, p) => s + p.tracks.length, 0)} tracks total
                </div>
              </div>
            )}

            {error && (
              <div id="spotify-error" className="spotify-error">
                {error}
              </div>
            )}

            <div className="spotify-modal-actions">
              <button
                id="spotify-start"
                className="spotify-start-btn"
                disabled={startDisabled}
                onClick={handleStart}
              >
                {startText}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Progress view */}
        {step === 'progress' && (
          <div id="spotify-step-progress">
            <div
              className="spotify-progress-bar"
              role="progressbar"
              aria-valuenow={Math.round(progressFill)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Import progress"
            >
              <div
                id="spotify-progress-fill"
                className="spotify-progress-fill"
                style={{ width: `${progressFill}%` }}
              />
            </div>
            <div className="spotify-progress-info">
              <span id="spotify-progress-text">{progressText}</span>
              <span id="spotify-progress-count">{progressCount}</span>
            </div>

            <VirtualTrackItems items={trackItems} />

            {showDoneButtons && (
              <div id="spotify-done-buttons" className="spotify-done-buttons">
                <button id="spotify-done" className="spotify-done-btn" onClick={handleDone}>
                  Done
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SpotifyTrackItem({ item, style }) {
  if (item.status === 'header') {
    return <div className="spotify-failed-header" style={style}>{item.title}</div>;
  }
  return (
    <div className={`spotify-track-item ${item.status}`} style={style}>
      <span className="spotify-track-status">
        {item.status === 'pending' && <span className="dots">{'\u2022\u2022\u2022'}</span>}
        {item.status === 'matched' && (
          <svg className="check" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.5 12.5l-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4-7 7z" />
          </svg>
        )}
        {item.status === 'unmatched' && (
          <svg className="cross" width="16" height="16" viewBox="0 0 16 16">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        )}
      </span>
      <span className="spotify-track-title">{item.title}</span>
      <span className="spotify-track-artist">{item.artist}</span>
    </div>
  );
}

function VirtualTrackItems({ items }) {
  const containerRef = useRef(null);
  const [range, setRange] = useState({ start: 0, end: 20 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function update() {
      const scrollTop = el.scrollTop;
      const viewHeight = el.clientHeight;
      const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
      const visible = Math.ceil(viewHeight / ITEM_HEIGHT) + 2 * OVERSCAN;
      const end = Math.min(items.length, start + visible);
      setRange(prev => (prev.start === start && prev.end === end) ? prev : { start, end });
    }

    update();
    el.addEventListener('scroll', update, { passive: true });
    return () => el.removeEventListener('scroll', update);
  }, [items.length]);

  const totalHeight = items.length * ITEM_HEIGHT;

  return (
    <div id="spotify-track-list" className="spotify-track-list" ref={containerRef}>
      <div style={{ position: 'relative', height: totalHeight + 'px' }}>
        {Array.from({ length: range.end - range.start }, (_, j) => {
          const i = range.start + j;
          const item = items[i];
          if (!item) return null;
          return (
            <SpotifyTrackItem
              key={item.id}
              item={item}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: ITEM_HEIGHT + 'px',
                top: i * ITEM_HEIGHT + 'px',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
