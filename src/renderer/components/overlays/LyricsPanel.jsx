import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { queue, queueIndex, isPlaying } from '../../state/index.js';
import { showToast } from '../../state/ui.js';
import { api } from '../../services/api.js';

/**
 * LyricsPanel -- Slide-out panel displaying synced or plain lyrics.
 *
 * Props:
 *   - visible: boolean controlling panel visibility
 *   - onClose: callback to close the panel
 *   - audio: the HTML audio element used for playback
 */
export function LyricsPanel({ visible, onClose, audio }) {
  const [lyricsLines, setLyricsLines] = useState([]);
  const [lyricsType, setLyricsType] = useState(null); // 'synced' | 'plain' | 'empty' | 'error' | 'loading'
  const [plainText, setPlainText] = useState('');
  const [activeIdx, setActiveIdx] = useState(-1);

  const trackIdRef = useRef(null);
  const lyricsLinesRef = useRef([]);
  const lastActiveIdxRef = useRef(-1);
  const syncIntervalRef = useRef(null);
  const bodyRef = useRef(null);

  const currentTrack = (() => {
    const q = queue.value;
    const idx = queueIndex.value;
    return (idx >= 0 && idx < q.length) ? q[idx] : null;
  })();

  // ── LRC parser ──
  const parseLRC = useCallback((lrcText) => {
    const lines = [];
    const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)/;
    lrcText.split('\n').forEach(line => {
      const match = line.match(regex);
      if (match) {
        const min = parseInt(match[1]);
        const sec = parseInt(match[2]);
        let ms = parseInt(match[3]);
        if (match[3].length === 2) ms *= 10;
        const time = min * 60 + sec + ms / 1000;
        const text = match[4].trim();
        if (text) lines.push({ time, text });
      }
    });
    return lines.sort((a, b) => a.time - b.time);
  }, []);

  // ── Sync lyrics with audio playback ──
  const syncLyrics = useCallback(() => {
    if (!lyricsLinesRef.current.length || !audio) return;
    const ct = audio.currentTime;

    // Find current line index
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
  const fetchAndShowLyrics = useCallback(async (track) => {
    if (!track) return;
    trackIdRef.current = track.id;
    lyricsLinesRef.current = [];
    lastActiveIdxRef.current = -1;
    setLyricsLines([]);
    setActiveIdx(-1);
    setLyricsType('loading');

    // Parse duration: try audio.duration first, then the track string "m:ss"
    let durationSec = null;
    if (audio && audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
      durationSec = Math.round(audio.duration);
    } else if (track.duration) {
      const parts = track.duration.split(':');
      if (parts.length === 2) durationSec = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }

    try {
      const result = await api.getLyrics(track.title, track.artist, track.album || '', durationSec);

      // Ensure we're still viewing the same track
      if (trackIdRef.current !== track.id) return;

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
      console.error('Lyrics error:', err);
      if (trackIdRef.current === track.id) {
        setLyricsType('error');
      }
    }
  }, [audio, parseLRC, startLyricsSync]);

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

  // ── Auto-scroll active line to center ──
  useEffect(() => {
    if (lyricsType !== 'synced' || activeIdx < 0 || !bodyRef.current) return;
    const allLines = bodyRef.current.querySelectorAll('.lyrics-line');
    if (allLines[activeIdx]) {
      allLines[activeIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIdx, lyricsType]);

  // ── Click on synced line seeks audio ──
  const handleLineClick = useCallback((time) => {
    if (audio && audio.duration && !isNaN(time)) {
      audio.currentTime = time;
      if (audio.paused) {
        audio.play();
        isPlaying.value = true;
      }
    }
  }, [audio]);

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
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-subdued)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
      const lines = plainText.split('\n').filter(l => l.trim());
      return (
        <div className="lyrics-content plain">
          <div className="lyrics-spacer"></div>
          {lines.map((l, i) => (
            <div key={i} className="lyrics-line plain-line">{l}</div>
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
    >
      <div className="lyrics-header">
        <h3>Lyrics</h3>
        <button id="btn-close-lyrics" className="icon-btn" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
