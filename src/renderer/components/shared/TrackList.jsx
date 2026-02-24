import { useState, useEffect, useRef, useMemo } from 'preact/hooks';
import { queue, queueIndex, isPlaying, likedSongs } from '../../state/index.js';
import { TrackRow } from './TrackRow.jsx';
import { showPlaylistPicker } from './PlaylistPickerModal.jsx';
import { ROW_HEIGHT, VIRTUALIZE_OVERSCAN as OVERSCAN, VIRTUALIZE_THRESHOLD } from '../../../shared/constants.js';

/**
 * Renders a track list with header and rows.
 * Automatically virtualizes when the list exceeds VIRTUALIZE_THRESHOLD items.
 */
export function TrackList({ tracks, context, onPlay, onLike, onContextMenu, onDragStart }) {
  if (!tracks || !tracks.length) return null;

  const showPlays = tracks.some(t => t.plays);
  const modifier = showPlays ? ' has-plays' : '';

  const currentTrack = queue.value[queueIndex.value];
  const playing = isPlaying.value;
  const likedSet = useMemo(() => new Set(likedSongs.value.map(t => t.id)), [likedSongs.value]);

  function handlePlay(index) {
    if (onPlay) onPlay(tracks, index);
  }

  function handleAddToPlaylist(track) {
    showPlaylistPicker([track]);
  }

  const header = (
    <div className={`track-list-header${modifier}`}>
      <span>#</span>
      <span>Title</span>
      <span>Artist</span>
      <span></span>
      <span></span>
      {showPlays && <span style={{ textAlign: 'right' }}>Plays</span>}
    </div>
  );

  // Small lists: render all rows directly
  if (tracks.length <= VIRTUALIZE_THRESHOLD) {
    return (
      <div>
        {header}
        {tracks.map((track, i) => (
          <TrackRow
            key={track.id || i}
            track={track}
            index={i}
            context={context}
            isPlaying={currentTrack?.id === track.id && playing}
            isLiked={likedSet.has(track.id)}
            showPlays={showPlays}
            onPlay={handlePlay}
            onLike={onLike}
            onAddToPlaylist={handleAddToPlaylist}
            onContextMenu={onContextMenu}
            onDragStart={onDragStart}
          />
        ))}
      </div>
    );
  }

  // Large lists: virtualized rendering
  return (
    <VirtualTrackList
      tracks={tracks}
      context={context}
      showPlays={showPlays}
      modifier={modifier}
      currentTrack={currentTrack}
      playing={playing}
      likedSet={likedSet}
      header={header}
      onPlay={handlePlay}
      onLike={onLike}
      onAddToPlaylist={handleAddToPlaylist}
      onContextMenu={onContextMenu}
      onDragStart={onDragStart}
    />
  );
}

function VirtualTrackList({
  tracks, context, showPlays, currentTrack, playing, likedSet,
  header, onPlay, onLike, onAddToPlaylist, onContextMenu, onDragStart
}) {
  const containerRef = useRef(null);
  const [range, setRange] = useState({ start: 0, end: 40 });
  const totalHeight = tracks.length * ROW_HEIGHT;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Walk up to find the scrollable ancestor (#main-content)
    let scrollParent = el.parentElement;
    while (scrollParent && scrollParent !== document.documentElement) {
      const { overflowY } = getComputedStyle(scrollParent);
      if (overflowY === 'auto' || overflowY === 'scroll') break;
      scrollParent = scrollParent.parentElement;
    }
    if (!scrollParent) scrollParent = document.documentElement;

    function update() {
      const rect = el.getBoundingClientRect();
      const vpHeight = scrollParent === document.documentElement
        ? window.innerHeight
        : scrollParent.clientHeight;

      const above = -rect.top; // how far the container top is scrolled above viewport
      const start = Math.max(0, Math.floor(above / ROW_HEIGHT) - OVERSCAN);
      const visible = Math.ceil(vpHeight / ROW_HEIGHT) + 2 * OVERSCAN;
      const end = Math.min(tracks.length, start + visible);

      setRange(prev => (prev.start === start && prev.end === end) ? prev : { start, end });
    }

    update();
    scrollParent.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });

    return () => {
      scrollParent.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [tracks.length]);

  return (
    <div>
      {header}
      <div
        ref={containerRef}
        style={{ position: 'relative', height: totalHeight + 'px', contain: 'layout style' }}
      >
        {Array.from({ length: range.end - range.start }, (_, j) => {
          const i = range.start + j;
          const track = tracks[i];
          return (
            <div
              key={track.id || i}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: ROW_HEIGHT + 'px',
                transform: `translateY(${i * ROW_HEIGHT}px)`,
              }}
            >
              <TrackRow
                track={track}
                index={i}
                context={context}
                isPlaying={currentTrack?.id === track.id && playing}
                isLiked={likedSet.has(track.id)}
                showPlays={showPlays}
                onPlay={onPlay}
                onLike={onLike}
                onAddToPlaylist={onAddToPlaylist}
                onContextMenu={onContextMenu}
                onDragStart={onDragStart}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
