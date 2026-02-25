import { signal, computed } from '@preact/signals';
import { SAVE_STATE_DEBOUNCE_MS, SEARCH_HISTORY_MAX } from '../../shared/constants.js';

// ─── Persistent signals (saved to localStorage) ───
export const playlists = signal([]);
export const likedSongs = signal([]);
export const recentTracks = signal([]);
export const followedArtists = signal([]);
export const volume = signal(0.7);
export const shuffle = signal(false);
export const repeat = signal('off'); // 'off' | 'all' | 'one'
export const musicOnly = signal(true);
export const autoplay = signal(false);
export const audioQuality = signal('bestaudio');
export const videoQuality = signal('720');
export const videoPremuxed = signal(true);
export const animations = signal(true);
export const effects = signal(true);
export const theme = signal('dark');
export const discordRpc = signal(false);
export const country = signal('');
export const searchHistory = signal([]);

// ─── Cloud Sync signals (persisted) ───
export const cloudSyncEnabled = signal(false);
export const cloudApiUrl = signal('');
export const cloudApiKey = signal('');
export const cloudUser = signal(null); // { id, username, email } or null
export const cloudAccessToken = signal('');
export const cloudRefreshToken = signal('');
export const lastSyncAt = signal('');

// ─── Transient signals (not persisted) ───
export const draggedTrack = signal(null);
export const pendingRadioNav = signal(null);
export const currentView = signal('home');
export const queue = signal([]);
export const originalQueue = signal([]);
export const queueIndex = signal(-1);
export const isPlaying = signal(false);
export const isLoading = signal(false);
export const currentPlaylistId = signal(null);

// ─── Computed signals ───
export const currentTrack = computed(() => {
  const q = queue.value;
  const idx = queueIndex.value;
  return idx >= 0 && idx < q.length ? q[idx] : null;
});

export const likedSongsSet = computed(() => new Set(likedSongs.value.map((t) => t.id)));

export const isCurrentLiked = computed(() => {
  const track = currentTrack.value;
  if (!track) return false;
  return likedSongsSet.value.has(track.id);
});

// ─── State persistence ───

const PERSISTENT_KEYS = {
  playlists,
  likedSongs,
  recentTracks,
  followedArtists,
  volume,
  shuffle,
  repeat,
  musicOnly,
  autoplay,
  audioQuality,
  videoQuality,
  videoPremuxed,
  animations,
  effects,
  theme,
  discordRpc,
  country,
  cloudSyncEnabled,
  cloudApiUrl,
  cloudUser,
  lastSyncAt,
  searchHistory
};

function _writeState() {
  try {
    const data = {};
    for (const [key, sig] of Object.entries(PERSISTENT_KEYS)) {
      data[key] = sig.value;
    }
    localStorage.setItem('snowify_state', JSON.stringify(data));
    localStorage.setItem('snowify_lastSave', String(Date.now()));
  } catch (err) {
    console.error('Failed to save state:', err);
  }
}

let _saveTimer = null;

export function saveState() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    _writeState();
  }, SAVE_STATE_DEBOUNCE_MS);
}

export function saveStateNow() {
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  _writeState();
}

export function loadState() {
  try {
    // Migrate old 'snowfy' localStorage keys to 'snowify'
    if (localStorage.getItem('snowfy_state') && !localStorage.getItem('snowify_state')) {
      localStorage.setItem('snowify_state', localStorage.getItem('snowfy_state'));
      localStorage.removeItem('snowfy_state');
    }
    if (
      localStorage.getItem('snowfy_migrated_v2') &&
      !localStorage.getItem('snowify_migrated_v2')
    ) {
      localStorage.setItem('snowify_migrated_v2', localStorage.getItem('snowfy_migrated_v2'));
      localStorage.removeItem('snowfy_migrated_v2');
    }
    // One-time migration: clear data from old yt-dlp implementation
    if (!localStorage.getItem('snowify_migrated_v2')) {
      localStorage.removeItem('snowify_state');
      localStorage.setItem('snowify_migrated_v2', '1');
      return;
    }
    const saved = JSON.parse(localStorage.getItem('snowify_state'));
    if (saved) {
      playlists.value = saved.playlists || [];
      likedSongs.value = saved.likedSongs || [];
      recentTracks.value = saved.recentTracks || [];
      followedArtists.value = saved.followedArtists || [];
      volume.value = saved.volume ?? 0.7;
      shuffle.value = saved.shuffle ?? false;
      repeat.value = saved.repeat || 'off';
      musicOnly.value = saved.musicOnly ?? true;
      autoplay.value = saved.autoplay ?? false;
      audioQuality.value = saved.audioQuality || 'bestaudio';
      videoQuality.value = saved.videoQuality || '720';
      videoPremuxed.value = saved.videoPremuxed ?? true;
      animations.value = saved.animations ?? true;
      effects.value = saved.effects ?? true;
      theme.value = saved.theme || 'dark';
      discordRpc.value = saved.discordRpc ?? false;
      country.value = saved.country || '';
      cloudSyncEnabled.value = saved.cloudSyncEnabled ?? false;
      cloudApiUrl.value = saved.cloudApiUrl || '';
      cloudUser.value = saved.cloudUser || null;
      lastSyncAt.value = saved.lastSyncAt || '';
      searchHistory.value = saved.searchHistory || [];
    }
  } catch (err) {
    console.error('Failed to load state:', err);
  }
}

// ─── Search history helpers ───

export function addSearchTerm(term) {
  const trimmed = term.trim();
  if (!trimmed) return;
  const lower = trimmed.toLowerCase();
  const filtered = searchHistory.value.filter((t) => t.toLowerCase() !== lower);
  searchHistory.value = [trimmed, ...filtered].slice(0, SEARCH_HISTORY_MAX);
  saveState();
}

export function removeSearchTerm(term) {
  searchHistory.value = searchHistory.value.filter((t) => t !== term);
  saveState();
}

export function clearSearchHistory() {
  searchHistory.value = [];
  saveState();
}
