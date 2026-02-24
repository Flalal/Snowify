// ─── Shared constants used across desktop & mobile ───

// Playback
export const VOLUME_SCALE = 0.3;           // Cap actual audio volume to prevent distortion
export const WATCHDOG_INTERVAL_MS = 2000;   // Playback stall detection interval
export const WATCHDOG_STALL_TICKS = 4;      // Stall ticks before auto-advance
export const SEEK_STEP_S = 5;               // Arrow key seek step in seconds
export const VOLUME_STEP = 0.05;            // Arrow key volume step
export const RESTART_THRESHOLD_S = 3;       // Seconds before "prev" restarts current track

// Queue
export const QUEUE_MAX_SIZE = 200;          // Max queue length before trimming
export const AUTOPLAY_ADD_COUNT = 20;       // Max tracks to add via autoplay
export const AUTOPLAY_MIN_POOL = 10;        // Min pool size before fetching more suggestions
export const RECENT_TRACKS_MAX = 20;        // Max recent tracks to keep

// Cache TTL
export const EXPLORE_CACHE_TTL = 30 * 60 * 1000;     // 30 min for explore/charts data
export const HOME_RELEASES_CACHE_TTL = 30 * 60 * 1000; // 30 min for new releases
export const STREAM_CACHE_TTL = 4 * 60 * 60 * 1000;  // 4 hours for stream URLs

// UI
export const SEARCH_DEBOUNCE_MS = 400;      // Search input debounce
export const SAVE_STATE_DEBOUNCE_MS = 300;  // State persistence debounce

// Virtualization (TrackList)
export const ROW_HEIGHT = 56;
export const VIRTUALIZE_OVERSCAN = 10;
export const VIRTUALIZE_THRESHOLD = 80;

// YTMusic
export const YTMUSIC_MAX_RETRIES = 3;
export const YTMUSIC_RETRY_DELAYS = [1000, 3000, 8000];

// Stream cache
export const STREAM_CACHE_MAX_SIZE = 200;
