import { useRef, useEffect, useState } from 'preact/hooks';
import { currentTrack, isCurrentLiked, isPlaying, isLoading } from '../../state/index.js';
import { PlaybackControls } from './PlaybackControls.jsx';
import { ProgressBar } from './ProgressBar.jsx';
import { VolumeControl } from './VolumeControl.jsx';
import { ArtistLink } from '../shared/ArtistLink.jsx';
import { showPlaylistPicker } from '../shared/PlaylistPickerModal.jsx';
import { useLikeTrack } from '../../hooks/useLikeTrack.js';

export function NowPlayingBar({ audio, onTogglePlay, onNext, onPrev, onToggleShuffle, onToggleRepeat, onSetVolume, onToggleLyrics, onToggleQueue, onShowAlbum }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!audio) return;
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
    };
    audio.addEventListener('timeupdate', onTimeUpdate);
    return () => audio.removeEventListener('timeupdate', onTimeUpdate);
  }, [audio]);

  const track = currentTrack.value;
  const liked = isCurrentLiked.value;
  const playing = isPlaying.value;
  const loading = isLoading.value;

  const toggleLike = useLikeTrack();

  if (!track) return null;

  const handleSeek = (ratio) => {
    if (audio && audio.duration) {
      audio.currentTime = ratio * audio.duration;
    }
  };

  const handleLike = () => {
    toggleLike(track, document.getElementById('np-like'));
  };

  const handleTitleClick = () => {
    if (track.albumId && onShowAlbum) {
      onShowAlbum(track.albumId, { name: track.album, thumbnail: track.thumbnail });
    }
  };

  return (
    <footer id="now-playing-bar">
      <div className="np-track-info">
        <div className="np-thumbnail-wrap">
          <img id="np-thumbnail" src={track.thumbnail} alt="" />
          {loading && (
            <div className="np-loading-overlay">
              <div className="np-spinner"></div>
            </div>
          )}
        </div>
        <div className="np-text">
          <span className={`np-title${track.albumId ? ' clickable' : ''}`} onClick={handleTitleClick}>{track.title}</span>
          <span className="np-artist"><ArtistLink track={track} /></span>
        </div>
        <button className={`icon-btn np-like${liked ? ' liked' : ''}`} id="np-like" title="Like" onClick={handleLike}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
        <button className="icon-btn" title="Add to playlist" onClick={() => showPlaylistPicker([track])}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      <div className="np-controls">
        <PlaybackControls
          onTogglePlay={onTogglePlay}
          onNext={onNext}
          onPrev={onPrev}
          onToggleShuffle={onToggleShuffle}
          onToggleRepeat={onToggleRepeat}
          loading={loading}
        />
        <ProgressBar currentTime={currentTime} duration={duration} onSeek={handleSeek} />
      </div>

      <div className="np-extras">
        <button className="icon-btn" onClick={onToggleLyrics} title="Lyrics">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        </button>
        <button className="icon-btn" onClick={onToggleQueue} title="Queue">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2zm14-1v6l5-3-5-3z"/></svg>
        </button>
        <VolumeControl onSetVolume={onSetVolume} />
      </div>
    </footer>
  );
}

function spawnHeartParticles(originEl) {
  if (!originEl) return;
  const rect = originEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const count = 7;
  for (let i = 0; i < count; i++) {
    const heart = document.createElement('div');
    heart.className = 'heart-particle';
    heart.textContent = '\u2764';
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
    const dist = 20 + Math.random() * 25;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 15;
    const scale = 0.6 + Math.random() * 0.5;
    heart.style.left = cx + 'px';
    heart.style.top = cy + 'px';
    heart.style.setProperty('--dx', dx + 'px');
    heart.style.setProperty('--dy', dy + 'px');
    heart.style.setProperty('--s', scale);
    document.body.appendChild(heart);
    heart.addEventListener('animationend', () => heart.remove());
  }
}

export { spawnHeartParticles };
