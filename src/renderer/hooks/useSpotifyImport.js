import { useReducer, useRef, useCallback, useEffect } from 'preact/hooks';
import { playlists, saveState } from '../state/index.js';
import { showToast } from '../state/ui.js';

const BATCH_SIZE = 3;

const initialState = {
  step: 'select', // 'select' | 'progress'
  error: '',
  pendingPlaylists: null,
  modalTitle: 'Import Spotify Playlists',
  startDisabled: true,
  startText: 'Import',
  progressFill: 0,
  progressText: '',
  progressCount: '',
  trackItems: [],
  showDoneButtons: false
};

function reducer(state, action) {
  switch (action.type) {
    case 'RESET':
      return { ...initialState };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_PENDING': {
      const pending = action.payload;
      return { ...state, pendingPlaylists: pending, startDisabled: !pending?.length, error: '' };
    }
    case 'REMOVE_PENDING': {
      const updated = state.pendingPlaylists.filter((_, i) => i !== action.payload);
      return updated.length
        ? { ...state, pendingPlaylists: updated }
        : { ...state, pendingPlaylists: null, startDisabled: true };
    }
    case 'START_IMPORT':
      return {
        ...state,
        error: '',
        startDisabled: true,
        startText: 'Importing...',
        step: 'progress'
      };
    case 'SET_PROGRESS':
      return { ...state, ...action.payload };
    case 'UPDATE_TRACK_ITEMS':
      return { ...state, trackItems: action.payload(state.trackItems) };
    case 'SET_TRACK_ITEMS':
      return { ...state, trackItems: action.payload };
    case 'IMPORT_DONE':
      return { ...state, ...action.payload, showDoneButtons: true };
    default:
      return state;
  }
}

export function useSpotifyImport(onClose) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const cancelledRef = useRef(false);

  function createPlaylist(name) {
    const id = 'pl_' + Date.now();
    const playlist = { id, name: name || `My Playlist #${playlists.value.length + 1}`, tracks: [] };
    playlists.value = [...playlists.value, playlist];
    saveState();
    showToast(`Created "${playlist.name}"`);
    return playlist;
  }

  const cleanup = useCallback(() => {
    cancelledRef.current = true;
    dispatch({ type: 'RESET' });
    if (onClose) onClose();
  }, [onClose]);

  const handleOverlayClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) cleanup();
    },
    [cleanup]
  );

  const handleExportifyLink = useCallback((e) => {
    e.preventDefault();
    window.snowify.openExternal('https://playlistexport.com');
  }, []);

  const handlePickFiles = useCallback(async () => {
    const result = await window.snowify.spotifyPickCsv();
    if (!result || !result.length) return;

    dispatch({
      type: 'SET_PENDING',
      payload: ((prev) => {
        const existing = prev || [];
        const existingNames = new Set(existing.map((p) => p.name));
        const newOnes = result.filter((p) => !existingNames.has(p.name));
        return [...existing, ...newOnes];
      })(state.pendingPlaylists)
    });
  }, [state.pendingPlaylists]);

  const handleRemoveFile = useCallback((index) => {
    dispatch({ type: 'REMOVE_PENDING', payload: index });
  }, []);

  const handleStart = useCallback(async () => {
    const pending = state.pendingPlaylists;
    if (!pending || !pending.length) {
      dispatch({ type: 'SET_ERROR', payload: 'Please select at least one CSV file' });
      return;
    }

    dispatch({ type: 'START_IMPORT' });
    cancelledRef.current = false;

    let totalImported = 0;
    let totalPlaylistCount = 0;
    const allFailedTracks = [];

    for (let pi = 0; pi < pending.length; pi++) {
      if (cancelledRef.current) break;

      const pl = pending[pi];
      const title =
        pending.length > 1 ? `Importing ${pi + 1} of ${pending.length}: ${pl.name}` : pl.name;

      dispatch({
        type: 'SET_PROGRESS',
        payload: {
          modalTitle: title,
          progressFill: 0,
          progressCount: '',
          progressText: 'Matching tracks...'
        }
      });

      const total = pl.tracks.length;
      const initialItems = pl.tracks.map((t, i) => ({
        id: i,
        title: t.title,
        artist: t.artist,
        status: 'pending'
      }));
      dispatch({ type: 'SET_TRACK_ITEMS', payload: initialItems });

      const matchedTracks = [];
      const failedTracks = [];
      let matched = 0;
      let failed = 0;

      for (let i = 0; i < total; i += BATCH_SIZE) {
        if (cancelledRef.current) break;

        const batch = pl.tracks.slice(i, Math.min(i + BATCH_SIZE, total));
        const promises = batch.map((t, bi) => {
          const idx = i + bi;
          return window.snowify
            .spotifyMatchTrack(t.title, t.artist)
            .catch(() => null)
            .then((result) => ({ idx, result }));
        });

        const results = await Promise.all(promises);
        if (cancelledRef.current) break;

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

        dispatch({
          type: 'UPDATE_TRACK_ITEMS',
          payload: (prev) => {
            const updated = [...prev];
            for (const [idx, status] of Object.entries(statusUpdates)) {
              updated[idx] = { ...updated[idx], status };
            }
            return updated;
          }
        });

        const done = Math.min(i + BATCH_SIZE, total);
        dispatch({
          type: 'SET_PROGRESS',
          payload: {
            progressCount: `${done} / ${total}`,
            progressFill: (done / total) * 100,
            progressText:
              pending.length > 1
                ? `Playlist ${pi + 1}/${pending.length} \u2014 Matching tracks...`
                : 'Matching tracks...'
          }
        });
      }

      if (cancelledRef.current) {
        if (matchedTracks.length) {
          const playlist = createPlaylist(pl.name);
          playlist.tracks = matchedTracks;
          playlists.value = playlists.value.map((p) => (p.id === playlist.id ? playlist : p));
          saveState();
        }
        break;
      }

      if (matchedTracks.length) {
        const playlist = createPlaylist(pl.name);
        playlist.tracks = matchedTracks;
        playlists.value = playlists.value.map((p) => (p.id === playlist.id ? playlist : p));
        saveState();
        totalImported += matched;
        totalPlaylistCount++;
      }

      allFailedTracks.push(...failedTracks);
      dispatch({
        type: 'SET_PROGRESS',
        payload: {
          progressText: `Matched ${matched} of ${total}` + (failed ? ` (${failed} not found)` : '')
        }
      });
    }

    if (cancelledRef.current) {
      showToast('Import cancelled');
      return;
    }

    let finalTitle, finalText;
    if (pending.length > 1) {
      finalTitle = 'Import Complete';
      finalText = `Imported ${totalPlaylistCount} playlist${totalPlaylistCount !== 1 ? 's' : ''} \u2014 ${totalImported} tracks total`;
      showToast(
        `Imported ${totalPlaylistCount} playlist${totalPlaylistCount !== 1 ? 's' : ''} \u2014 ${totalImported} tracks`
      );
    } else if (totalPlaylistCount) {
      finalTitle = state.modalTitle;
      finalText = `Imported ${totalImported} tracks`;
      showToast(`Imported ${totalImported} tracks`);
    } else {
      finalTitle = state.modalTitle;
      finalText = 'No tracks could be matched';
      showToast('No tracks could be matched');
    }

    let finalItems = [];
    if (allFailedTracks.length) {
      finalItems = [
        {
          id: 'failed-header',
          title: `Failed to match (${allFailedTracks.length})`,
          artist: '',
          status: 'header'
        },
        ...allFailedTracks.map((t, i) => ({
          id: `failed-${i}`,
          title: t.title,
          artist: t.artist,
          status: 'unmatched'
        }))
      ];
    }

    dispatch({
      type: 'IMPORT_DONE',
      payload: {
        modalTitle: finalTitle,
        progressText: finalText,
        progressFill: 100,
        progressCount: '',
        trackItems: finalItems
      }
    });
  }, [state.pendingPlaylists]);

  // Cancel in-flight import on unmount
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const handleDone = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return {
    ...state,
    cleanup,
    handleOverlayClick,
    handleExportifyLink,
    handlePickFiles,
    handleRemoveFile,
    handleStart,
    handleDone
  };
}
