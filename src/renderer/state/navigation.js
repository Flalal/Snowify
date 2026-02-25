import { signal } from '@preact/signals';
import { currentView, currentPlaylistId } from './index.js';

// View-specific navigation state (extracted from App.jsx)
export const albumViewState = signal(null); // { albumId, albumMeta }
export const artistViewState = signal(null); // { artistId }
export const playlistViewState = signal(null); // { playlist, isLiked }
export const videoPlayerState = signal(null); // { videoId, title, artist }

// ─── Navigation history (transient, not persisted) ───
export const navigationHistory = signal([]);

export function captureNavSnapshot() {
  const view = currentView.value;
  const state = {};
  if (view === 'album') state.albumViewState = albumViewState.value;
  else if (view === 'artist') state.artistViewState = artistViewState.value;
  else if (view === 'playlist') {
    state.playlistViewState = playlistViewState.value;
    state.currentPlaylistId = currentPlaylistId.value;
  }
  return { view, state };
}

export function restoreNavSnapshot(entry) {
  if (entry.view === 'album') albumViewState.value = entry.state.albumViewState;
  else if (entry.view === 'artist') artistViewState.value = entry.state.artistViewState;
  else if (entry.view === 'playlist') {
    playlistViewState.value = entry.state.playlistViewState;
    currentPlaylistId.value = entry.state.currentPlaylistId;
  }
}
