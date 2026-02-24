import { useState, useRef, useCallback } from 'preact/hooks';
import { playlists, saveState } from '../../state/index.js';
import { showToast } from '../../state/ui.js';

/**
 * SpotifyImport -- Modal overlay for importing Spotify playlists from CSV files.
 *
 * Props:
 *   - visible: boolean controlling modal visibility
 *   - onClose: callback to close the modal
 */
export function SpotifyImport({ visible, onClose }) {
  const [step, setStep] = useState('select'); // 'select' | 'progress'
  const [error, setError] = useState('');
  const [pendingPlaylists, setPendingPlaylists] = useState(null);
  const [modalTitle, setModalTitle] = useState('Import Spotify Playlists');
  const [startDisabled, setStartDisabled] = useState(true);
  const [startText, setStartText] = useState('Import');
  const [progressFill, setProgressFill] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [progressCount, setProgressCount] = useState('');
  const [trackItems, setTrackItems] = useState([]);
  const [showDoneButtons, setShowDoneButtons] = useState(false);

  const cancelledRef = useRef(false);

  // ── Helper: create a playlist (mirrors original createPlaylist) ──
  function createPlaylist(name) {
    const id = 'pl_' + Date.now();
    const playlist = { id, name: name || `My Playlist #${playlists.value.length + 1}`, tracks: [] };
    playlists.value = [...playlists.value, playlist];
    saveState();
    showToast(`Created "${playlist.name}"`);
    return playlist;
  }

  // ── Reset modal to initial state ──
  function resetModal() {
    setStep('select');
    setError('');
    setPendingPlaylists(null);
    setModalTitle('Import Spotify Playlists');
    setStartDisabled(true);
    setStartText('Import');
    setProgressFill(0);
    setProgressText('');
    setProgressCount('');
    setTrackItems([]);
    setShowDoneButtons(false);
  }

  // ── Cleanup (close + reset) ──
  const cleanup = useCallback(() => {
    cancelledRef.current = true;
    resetModal();
    if (onClose) onClose();
  }, [onClose]);

  // ── Click overlay background to close ──
  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      cleanup();
    }
  }, [cleanup]);

  // ── Open PlaylistExport in system browser ──
  const handleExportifyLink = useCallback((e) => {
    e.preventDefault();
    window.snowify.openExternal('https://playlistexport.com');
  }, []);

  // ── Pick CSV files via system dialog (accumulate) ──
  const handlePickFiles = useCallback(async () => {
    const result = await window.snowify.spotifyPickCsv();
    if (!result || !result.length) return;

    setPendingPlaylists(prev => {
      const existing = prev || [];
      // Avoid duplicates by name
      const existingNames = new Set(existing.map(p => p.name));
      const newOnes = result.filter(p => !existingNames.has(p.name));
      return [...existing, ...newOnes];
    });
    setStartDisabled(false);
    setError('');
  }, []);

  // ── Remove a file from the pending list ──
  const handleRemoveFile = useCallback((index) => {
    setPendingPlaylists(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (!updated.length) {
        setStartDisabled(true);
        return null;
      }
      return updated;
    });
  }, []);

  // ── Start import ──
  const handleStart = useCallback(async () => {
    if (!pendingPlaylists || !pendingPlaylists.length) {
      setError('Please select at least one CSV file');
      return;
    }

    setError('');
    setStartDisabled(true);
    setStartText('Importing...');

    // Switch to progress view
    setStep('progress');

    cancelledRef.current = false;

    let totalImported = 0;
    let totalPlaylistCount = 0;
    const allFailedTracks = [];

    for (let pi = 0; pi < pendingPlaylists.length; pi++) {
      if (cancelledRef.current) break;

      const pl = pendingPlaylists[pi];

      if (pendingPlaylists.length > 1) {
        setModalTitle(`Importing ${pi + 1} of ${pendingPlaylists.length}: ${pl.name}`);
      } else {
        setModalTitle(pl.name);
      }

      setProgressFill(0);
      setProgressCount('');
      setProgressText('Matching tracks...');

      const total = pl.tracks.length;
      const BATCH_SIZE = 3;

      // Populate track list with pending items
      const initialItems = pl.tracks.map((t, i) => ({
        id: i,
        title: t.title,
        artist: t.artist,
        status: 'pending'
      }));
      setTrackItems([...initialItems]);

      // Match tracks in concurrent batches for speed
      const matchedTracks = [];
      const failedTracks = [];
      let matched = 0;
      let failed = 0;

      for (let i = 0; i < total; i += BATCH_SIZE) {
        if (cancelledRef.current) break;

        const batch = pl.tracks.slice(i, Math.min(i + BATCH_SIZE, total));
        const promises = batch.map((t, bi) => {
          const idx = i + bi;
          return window.snowify.spotifyMatchTrack(t.title, t.artist)
            .catch(() => null)
            .then(result => ({ idx, result }));
        });

        const results = await Promise.all(promises);
        if (cancelledRef.current) break;

        // Process results outside the state updater to keep counters in sync
        const statusUpdates = {};
        for (const { idx, result } of results) {
          if (result) {
            matchedTracks.push(result);
            matched++;
            statusUpdates[idx] = 'matched';
          } else {
            failedTracks.push({ title: pl.tracks[idx].title, artist: pl.tracks[idx].artist });
            failed++;
            statusUpdates[idx] = 'unmatched';
          }
        }

        // Update track items state
        setTrackItems(prev => {
          const updated = [...prev];
          for (const [idx, status] of Object.entries(statusUpdates)) {
            updated[idx] = { ...updated[idx], status };
          }
          return updated;
        });

        // Update progress after each batch
        const done = Math.min(i + BATCH_SIZE, total);
        setProgressCount(`${done} / ${total}`);
        setProgressFill((done / total) * 100);
        setProgressText(
          pendingPlaylists.length > 1
            ? `Playlist ${pi + 1}/${pendingPlaylists.length} \u2014 Matching tracks...`
            : 'Matching tracks...'
        );
      }

      if (cancelledRef.current) {
        if (matchedTracks.length) {
          const playlist = createPlaylist(pl.name);
          playlist.tracks = matchedTracks;
          // Update the playlists signal with modified playlist
          playlists.value = playlists.value.map(p => p.id === playlist.id ? playlist : p);
          saveState();
        }
        break;
      }

      // Create the playlist
      if (matchedTracks.length) {
        const playlist = createPlaylist(pl.name);
        playlist.tracks = matchedTracks;
        // Update the playlists signal with modified playlist
        playlists.value = playlists.value.map(p => p.id === playlist.id ? playlist : p);
        saveState();
        totalImported += matched;
        totalPlaylistCount++;
      }

      allFailedTracks.push(...failedTracks);
      setProgressText(`Matched ${matched} of ${total}` + (failed ? ` (${failed} not found)` : ''));
    }

    if (cancelledRef.current) {
      showToast('Import cancelled');
      return;
    }

    // Final summary
    if (pendingPlaylists.length > 1) {
      setModalTitle('Import Complete');
      setProgressText(`Imported ${totalPlaylistCount} playlist${totalPlaylistCount !== 1 ? 's' : ''} \u2014 ${totalImported} tracks total`);
      setProgressFill(100);
      setProgressCount('');
      showToast(`Imported ${totalPlaylistCount} playlist${totalPlaylistCount !== 1 ? 's' : ''} \u2014 ${totalImported} tracks`);
    } else if (totalPlaylistCount) {
      showToast(`Imported ${totalImported} tracks`);
    } else {
      showToast('No tracks could be matched');
    }

    // Show failed tracks summary
    if (allFailedTracks.length) {
      const failedItems = allFailedTracks.map((t, i) => ({
        id: `failed-${i}`,
        title: t.title,
        artist: t.artist,
        status: 'unmatched'
      }));
      setTrackItems([
        { id: 'failed-header', title: `Failed to match (${allFailedTracks.length})`, artist: '', status: 'header' },
        ...failedItems
      ]);
    } else {
      setTrackItems([]);
    }

    // Show done button
    setShowDoneButtons(true);
  }, [pendingPlaylists]);

  const handleDone = useCallback(() => {
    cleanup();
    resetModal();
  }, [cleanup]);

  if (!visible) return null;

  return (
    <div
      id="spotify-modal"
      className="spotify-modal"
      onClick={handleOverlayClick}
    >
      <div className="spotify-modal-content">
        <div className="spotify-modal-header">
          <h2 id="spotify-modal-title">{modalTitle}</h2>
          <button id="spotify-cancel" className="icon-btn" onClick={cleanup}>
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
            <div className="spotify-progress-bar">
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

            <div id="spotify-track-list" className="spotify-track-list">
              {trackItems.map((item) => {
                if (item.status === 'header') {
                  return (
                    <div key={item.id} className="spotify-failed-header">
                      {item.title}
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    id={`sp-track-${item.id}`}
                    className={`spotify-track-item ${item.status}`}
                  >
                    <span className="spotify-track-status">
                      {item.status === 'pending' && (
                        <span className="dots">{'\u2022\u2022\u2022'}</span>
                      )}
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
              })}
            </div>

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
