import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { queue, queueIndex, isPlaying } from '../state/index.js';
import { showToast } from '../state/ui.js';
import { api } from '../services/api.js';
import { parseLRC } from '../utils/lrcParser.js';

export function useLyrics(visible, audio) {
  const [lyricsLines, setLyricsLines] = useState([]);
  const [lyricsType, setLyricsType] = useState(null); // 'synced' | 'plain' | 'empty' | 'error' | 'loading'
  const [plainText, setPlainText] = useState('');
  const [activeIdx, setActiveIdx] = useState(-1);

  const trackIdRef = useRef(null);
  const lyricsLinesRef = useRef([]);
  const lastActiveIdxRef = useRef(-1);
  const syncIntervalRef = useRef(null);
  const abortRef = useRef(null);

  const currentTrack = (() => {
    const q = queue.value;
    const idx = queueIndex.value;
    return idx >= 0 && idx < q.length ? q[idx] : null;
  })();

  // ── Sync lyrics with audio playback ──
  const syncLyrics = useCallback(() => {
    if (!lyricsLinesRef.current.length || !audio) return;
    const ct = audio.currentTime;

    let foundIdx = -1;
    for (let i = lyricsLinesRef.current.length - 1; i >= 0; i--) {
      if (ct >= lyricsLinesRef.current[i].time) {
        foundIdx = i;
        break;
      }
    }

    if (foundIdx === lastActiveIdxRef.current) return;
    lastActiveIdxRef.current = foundIdx;
    setActiveIdx(foundIdx);
  }, [audio]);

  const startLyricsSync = useCallback(() => {
    stopLyricsSync();
    if (!lyricsLinesRef.current.length || !audio) return;
    syncLyrics();
    syncIntervalRef.current = setInterval(() => {
      if (audio.paused) return;
      syncLyrics();
    }, 100);
  }, [audio, syncLyrics]);

  function stopLyricsSync() {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  }

  // ── Fetch and display lyrics ──
  const fetchAndShowLyrics = useCallback(
    async (track) => {
      if (!track) return;

      // Abort previous fetch
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      trackIdRef.current = track.id;
      lyricsLinesRef.current = [];
      lastActiveIdxRef.current = -1;
      setLyricsLines([]);
      setActiveIdx(-1);
      setLyricsType('loading');

      let durationSec = null;
      if (audio && audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        durationSec = Math.round(audio.duration);
      } else if (track.duration) {
        const parts = track.duration.split(':');
        if (parts.length === 2) durationSec = parseInt(parts[0]) * 60 + parseInt(parts[1]);
      }

      try {
        const result = await api.getLyrics(
          track.title,
          track.artist,
          track.album || '',
          durationSec
        );

        if (controller.signal.aborted) return;

        if (!result) {
          setLyricsType('empty');
          return;
        }

        if (result.synced) {
          const parsed = parseLRC(result.synced);
          lyricsLinesRef.current = parsed;
          setLyricsLines(parsed);
          setLyricsType('synced');
          startLyricsSync();
        } else if (result.plain) {
          setPlainText(result.plain);
          setLyricsType('plain');
          showToast('Synced lyrics not available for this song');
        } else {
          setLyricsType('empty');
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Lyrics error:', err);
        if (trackIdRef.current === track.id) {
          setLyricsType('error');
        }
      }
    },
    [audio, startLyricsSync]
  );

  // ── Fetch lyrics when panel becomes visible or track changes ──
  useEffect(() => {
    if (visible && currentTrack && trackIdRef.current !== currentTrack.id) {
      fetchAndShowLyrics(currentTrack);
    }
    if (visible) {
      startLyricsSync();
    } else {
      stopLyricsSync();
    }
    return () => stopLyricsSync();
  }, [visible, currentTrack?.id, fetchAndShowLyrics, startLyricsSync]);

  // ── Track change handler: reset when lyrics not visible ──
  useEffect(() => {
    lastActiveIdxRef.current = -1;
    if (!visible) {
      trackIdRef.current = null;
    }
  }, [currentTrack?.id, visible]);

  // ── Abort pending fetch on unmount ──
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      stopLyricsSync();
    };
  }, []);

  // ── Click on synced line seeks audio ──
  const handleLineClick = useCallback(
    (time) => {
      if (audio && audio.duration && !isNaN(time)) {
        audio.currentTime = time;
        if (audio.paused) {
          audio.play();
          isPlaying.value = true;
        }
      }
    },
    [audio]
  );

  return { lyricsLines, lyricsType, plainText, activeIdx, handleLineClick };
}
