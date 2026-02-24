// ─── Mobile Media Session (Android notification controls) ───
// Uses @jofr/capacitor-media-session to create a native MediaSession
// with foreground service for background audio playback.
// Patched to support a "like" custom action in the notification.

import { MediaSession } from '@jofr/capacitor-media-session';

let audioEl = null;

/**
 * Initialize media session listeners on the <audio> element.
 * Automatically syncs playbackState and positionState with the native plugin.
 */
export function initMediaSession() {
  audioEl = document.getElementById('audio-player');
  if (!audioEl) return;

  const syncPlaybackState = () => {
    MediaSession.setPlaybackState({
      playbackState: audioEl.paused ? 'paused' : 'playing'
    });
  };

  const syncPositionState = () => {
    if (!audioEl.duration || !isFinite(audioEl.duration)) return;
    MediaSession.setPositionState({
      duration: audioEl.duration,
      playbackRate: audioEl.playbackRate,
      position: audioEl.currentTime
    });
  };

  audioEl.addEventListener('play', syncPlaybackState);
  audioEl.addEventListener('pause', syncPlaybackState);
  audioEl.addEventListener('ended', () => {
    MediaSession.setPlaybackState({ playbackState: 'none' });
  });
  audioEl.addEventListener('durationchange', syncPositionState);
  audioEl.addEventListener('seeked', syncPositionState);
}

/**
 * Update the native media session metadata (title, artist, artwork).
 * Called by App.jsx whenever the current track changes.
 */
export function updateMobileMediaSession(track) {
  if (!track) return;

  const artwork = track.thumbnail
    ? [{ src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
    : [];

  MediaSession.setMetadata({
    title: track.title || '',
    artist: track.artist || '',
    album: track.album || '',
    artwork
  });
}

/**
 * Update the like state in the native media notification.
 * Toggles the heart icon (filled/outline) in the notification.
 */
export function setMobileLiked(liked) {
  MediaSession.setLiked({ liked });
}

/**
 * Register native action handlers that delegate to the app's playback controls.
 * Must be called after window.__snowifyPlayback is set.
 */
export function registerMobileMediaHandlers() {
  MediaSession.setActionHandler({ action: 'play' }, () => {
    const cb = window.__snowifyPlayback;
    if (cb) cb.togglePlay();
  });

  MediaSession.setActionHandler({ action: 'pause' }, () => {
    const cb = window.__snowifyPlayback;
    if (cb) cb.togglePlay();
  });

  MediaSession.setActionHandler({ action: 'nexttrack' }, () => {
    const cb = window.__snowifyPlayback;
    if (cb) cb.playNext();
  });

  MediaSession.setActionHandler({ action: 'previoustrack' }, () => {
    const cb = window.__snowifyPlayback;
    if (cb) cb.playPrev();
  });

  MediaSession.setActionHandler({ action: 'seekto' }, (details) => {
    const audio = document.getElementById('audio-player');
    if (audio && details.seekTime != null) {
      audio.currentTime = details.seekTime;
    }
  });

  MediaSession.setActionHandler({ action: 'stop' }, () => {
    const audio = document.getElementById('audio-player');
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    MediaSession.setPlaybackState({ playbackState: 'none' });
  });

  // Like button — delegates to handleLikeToggle in App.jsx
  MediaSession.setActionHandler({ action: 'like' }, () => {
    const cb = window.__snowifyPlayback;
    if (cb) cb.toggleLike();
  });
}
