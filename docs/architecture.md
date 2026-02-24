# Snowify — Architecture Reference

## Project metrics
- **Source:** 612 KB across 96 JS/JSX files
- **CSS:** 30+ files, 6 theme palettes
- **Dependencies:** 5 runtime + 12 dev (minimalist stack + ESLint/Prettier)
- **node_modules:** ~669 MB

## Directory structure
```
snowify-front/
├── src/
│   ├── main/                        # Electron main process
│   │   ├── index.js                 # Entry: window, IPC, services init
│   │   ├── ipc/                     # 10 IPC handler modules
│   │   │   ├── middleware.js         # createHandler / createOkHandler wrappers
│   │   │   ├── auth.handlers.js     # Login, register, logout, sync, secure tokens
│   │   │   ├── discord.handlers.js  # Discord RPC
│   │   │   ├── explore.handlers.js  # Home/explore data (heaviest)
│   │   │   ├── lyrics.handlers.js   # Lyrics fetching
│   │   │   ├── playlist.handlers.js # Playlist CRUD
│   │   │   ├── search.handlers.js   # Search queries
│   │   │   ├── shell.handlers.js    # Shell/OS operations
│   │   │   ├── spotify.handlers.js  # Spotify import
│   │   │   ├── stream.handlers.js   # Stream URL resolution
│   │   │   └── updater.handlers.js  # Auto-update events
│   │   ├── services/
│   │   │   ├── logger.js            # electron-log config (first import, patches console.*)
│   │   │   ├── secureStore.js       # safeStorage encryption for tokens
│   │   │   ├── ytmusic.js           # YTMusic API wrapper
│   │   │   ├── stream.js            # yt-dlp extraction + cache (4h TTL, 200 max)
│   │   │   ├── lyrics.js            # Synclyrics LRU cache
│   │   │   ├── discord.js           # Discord RPC (lazy-loaded)
│   │   │   ├── sync.js              # Cloud sync push/pull/merge
│   │   │   ├── api.js               # Backend API client + token refresh
│   │   │   └── updater.js           # electron-updater config
│   │   └── utils/
│   │       └── parse.js             # mapSongToTrack, extractArtistMap
│   │
│   ├── preload/
│   │   └── index.js                 # contextBridge → window.snowify (70+ methods, CommonJS)
│   │
│   ├── renderer/
│   │   ├── index.jsx                # Renderer entry
│   │   ├── components/
│   │   │   ├── App.jsx              # Root (~640 lines, god component)
│   │   │   ├── views/               # Lazy-loaded route views
│   │   │   │   ├── HomeView.jsx
│   │   │   │   ├── SearchView.jsx
│   │   │   │   ├── ExploreView.jsx
│   │   │   │   ├── LibraryView.jsx
│   │   │   │   ├── PlaylistView.jsx
│   │   │   │   ├── AlbumView.jsx
│   │   │   │   ├── ArtistView.jsx
│   │   │   │   └── SettingsView.jsx
│   │   │   ├── overlays/            # Modal overlays
│   │   │   │   ├── LyricsOverlay.jsx
│   │   │   │   ├── QueuePanel.jsx
│   │   │   │   └── VideoPlayer.jsx
│   │   │   ├── shared/              # Reusable components
│   │   │   │   ├── TrackRow.jsx
│   │   │   │   ├── TrackCard.jsx
│   │   │   │   ├── AlbumCard.jsx
│   │   │   │   ├── ArtistCard.jsx
│   │   │   │   ├── Toast.jsx
│   │   │   │   ├── Spinner.jsx
│   │   │   │   ├── ContextMenu.jsx
│   │   │   │   └── ...modals
│   │   │   ├── NowPlayingBar/       # Playback control bar
│   │   │   ├── Sidebar.jsx
│   │   │   └── Titlebar.jsx
│   │   ├── hooks/                   # 15 custom hooks
│   │   │   ├── usePlayback.js       # Orchestrator (play, pause, next, prev)
│   │   │   ├── useTrackPlayer.js    # Audio element management
│   │   │   ├── useQueueControls.js  # Queue manipulation
│   │   │   ├── useNavigation.js     # View routing
│   │   │   ├── useKeyboardShortcuts.js
│   │   │   ├── usePlaybackWatchdog.js  # Stall detection (2s interval)
│   │   │   ├── useLyrics.js         # Lyrics fetch + AbortController
│   │   │   ├── useVideoLoader.js    # Video player loading
│   │   │   ├── useFocusTrap.js      # Modal focus trap (a11y)
│   │   │   ├── useSpotifyImport.js  # Spotify import with useReducer
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── api.js               # dedup() pattern, inflight Map
│   │   │   └── exploreCache.js      # Explore data cache (30min TTL)
│   │   ├── state/
│   │   │   └── index.js             # All signals: queue, isPlaying, theme, etc. + saveState()
│   │   ├── styles/                  # 30+ CSS files by feature
│   │   │   ├── variables.css        # Theme palettes, CSS custom props
│   │   │   ├── global.css           # Resets, focus-visible, truncation
│   │   │   ├── cards.css, nowplaying.css, sidebar.css, ...
│   │   │   └── ...
│   │   └── utils/
│   │       ├── applyThemeToDOM.js
│   │       └── ...helpers
│   │
│   └── shared/
│       ├── constants.js             # STREAM_CACHE_TTL, QUEUE_MAX_SIZE, WATCHDOG_INTERVAL_MS
│       └── fieldMapping.js          # Sync field mapping (client ↔ server)
│
├── mobile/                          # Capacitor mobile app
│   └── src/api-adapter.js           # Bridges renderer to mobile APIs
│
├── resources/                       # yt-dlp binaries, icons
├── docs/                            # Project documentation
├── CLAUDE.md                        # Claude Code instructions
├── eslint.config.js                 # ESLint 9 flat config
├── .prettierrc.json                 # Prettier config
├── .prettierignore                  # Prettier ignore patterns
├── electron-vite.config.mjs         # Build config (main + preload + renderer)
├── electron-builder.yml             # Packaging config
└── package.json
```

## Data flow

### Playback
```
User clicks track → usePlayback.play(track)
  → queue.value = [...] (signal update)
  → useTrackPlayer detects track change
  → window.snowify.getStreamUrl(id) → IPC → stream.js → yt-dlp
  → audio.src = streamUrl → audio.play()
  → usePlaybackWatchdog monitors for stalls (2s interval)
  → MediaSession API updated
  → Discord RPC updated (if enabled)
```

### Cloud Sync
```
Push: renderer signals → saveState() → syncPush()
  → fieldMapping.js maps client→server format
  → POST /sync/push (Bearer token)
  → 401 → auto token refresh → retry

Pull: GET /sync/pull → mergeState()
  → fieldMapping.js maps server→client format
  → signals updated → UI reacts
```

### State persistence
```
Signal change → saveState() (debounced)
  → JSON.stringify all PERSISTENT_KEYS (excludes tokens)
  → localStorage.setItem('snowify_state', data)

App start → loadState()
  → localStorage.getItem → JSON.parse
  → Restore each signal.value
  → authLoadTokens() via IPC → secureStore.loadTokens()
  → Tokens decrypted via safeStorage → signals updated

Token storage:
  → safeStorage.encryptString() → Base64 → userData/secure-tokens.json
  → Fallback: plaintext JSON if no keyring (Linux without gnome-keyring)
```

## Caching strategy
| Cache | Location | TTL | Max size | Eviction |
|-------|----------|-----|----------|----------|
| Stream URLs | main/services/stream.js | 4h | 200 | TTL sweep on overflow |
| Lyrics | main/services/lyrics.js | session | LRU | LRU eviction |
| Explore data | renderer/services/exploreCache.js | 30min | - | TTL |
| API dedup | renderer/services/api.js | request duration | - | Auto-delete on resolve |
| Log files | userData/logs/main.log | rotation by electron-log | - | Auto-rotate |

## Accessibility (implemented)
- All modals: `role="dialog"`, `aria-modal`, `aria-labelledby`, `useFocusTrap`
- Context menus: `role="menu"`, arrow/Enter/Escape keyboard nav
- Sliders: `role="slider"`, `aria-valuenow/min/max`, keyboard arrows
- Toast: `role="status"`, `aria-live="polite"`, `aria-atomic`
- All images: meaningful `alt` text
- All icon-only buttons: `aria-label`
- All clickable cards: `tabIndex={0}` + Enter/Space
- WCAG AA contrast on `--text-subdued` in all 7 themes
- `:focus-visible` on all 23 interactive elements

## Responsive breakpoints
- 1200px: card grid reduction
- 900px: sidebar collapse
- 600px: mobile layout (view padding, modal widths, queue panel)
