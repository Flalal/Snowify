import { queue, queueIndex } from '../../state/index.js';
import { ArtistLink } from '../shared/ArtistLink.jsx';
import { showContextMenu } from '../../state/ui.js';

/**
 * QueuePanel -- Slide-out panel on the right showing the current queue.
 *
 * Props:
 *   - visible: boolean controlling panel visibility
 *   - onClose: callback to close the panel
 */
export function QueuePanel({ visible, onClose }) {
  const q = queue.value;
  const idx = queueIndex.value;
  const current = (idx >= 0 && idx < q.length) ? q[idx] : null;
  const upcoming = (idx >= 0) ? q.slice(idx + 1) : [];

  function handleContextMenu(e, track) {
    e.preventDefault();
    showContextMenu(e, track);
  }

  function handleDragStart(e, track) {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', track.title);
    const el = e.target.closest('.queue-item');
    if (el) el.classList.add('dragging');
    document.querySelectorAll('.playlist-item').forEach(p => p.classList.add('drop-target'));
  }

  return (
    <div
      id="queue-panel"
      className={`queue-panel${visible ? ' visible' : ' hidden'}`}
    >
      <div className="queue-panel-header">
        <h3>Queue</h3>
        <button id="btn-close-queue" className="icon-btn" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="queue-section">
        <h4>Now Playing</h4>
        <div id="queue-now-playing">
          {current ? (
            <QueueItem
              track={current}
              isActive={true}
              onContextMenu={handleContextMenu}
              onDragStart={handleDragStart}
            />
          ) : (
            <p style={{ color: 'var(--text-subdued)', fontSize: '13px' }}>Nothing playing</p>
          )}
        </div>
      </div>

      <div className="queue-section">
        <h4>Up Next</h4>
        <div id="queue-up-next">
          {upcoming.length ? (
            upcoming.map((track) => (
              <QueueItem
                key={track.id}
                track={track}
                isActive={false}
                onContextMenu={handleContextMenu}
                onDragStart={handleDragStart}
              />
            ))
          ) : (
            <p style={{ color: 'var(--text-subdued)', fontSize: '13px' }}>Queue is empty</p>
          )}
        </div>
      </div>
    </div>
  );
}

function QueueItem({ track, isActive, onContextMenu, onDragStart }) {
  return (
    <div
      className={`queue-item${isActive ? ' active' : ''}`}
      data-track-id={track.id}
      draggable="true"
      onContextMenu={(e) => onContextMenu(e, track)}
      onDragStart={(e) => onDragStart(e, track)}
    >
      <img src={track.thumbnail} alt="" />
      <div className="queue-item-info">
        <div className="queue-item-title">{track.title}</div>
        <div className="queue-item-artist">
          <ArtistLink track={track} />
        </div>
      </div>
    </div>
  );
}
