import { signal } from '@preact/signals';

// View-specific navigation state (extracted from App.jsx)
export const albumViewState = signal(null);    // { albumId, albumMeta }
export const artistViewState = signal(null);   // { artistId }
export const playlistViewState = signal(null); // { playlist, isLiked }
export const videoPlayerState = signal(null);  // { videoId, title, artist }
