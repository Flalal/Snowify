# Snowify — Claude Code Instructions

## Project overview
Electron 33 + Preact 10.28 + electron-vite 5 desktop music player streaming from free sources (yt-dlp).
Version: 1.7.0 | Repo: github.com/Flalal/Snowify

## Tech stack
- **Runtime:** Electron 33, Preact 10.28, @preact/signals 2.8
- **Build:** electron-vite 5, electron-builder 26.7, @preact/preset-vite
- **Services:** ytmusic-api 5.3.1, @stef-0012/synclyrics 2.5.10, @xhayper/discord-rpc 1.3, electron-updater 6.8, electron-log 5
- **Linting:** ESLint 9 (flat config), Prettier, eslint-plugin-react-hooks
- **Testing:** Vitest 4 — 56 unit tests (retry, format, parse, fieldMapping, syncMerge)
- **No:** React, jQuery, lodash, TypeScript, CSS-in-JS

## Architecture

### Process separation
```
src/main/          → Electron main process (Node.js)
src/preload/       → Context bridge (CommonJS, 70+ methods on window.snowify)
src/renderer/      → Preact UI (ES modules)
src/shared/        → Constants + field mapping (shared between main/renderer)
```

### Main process (`src/main/`)
- `index.js` — entry point, window creation, IPC registration, crash handlers
- `services/` — logger.js (electron-log, first import), secureStore.js (safeStorage encryption), ytmusic.js, stream.js (yt-dlp + cache 4h/200 max), lyrics.js (LRU), discord.js (lazy), sync.js, api.js (token refresh), updater.js
- `ipc/` — 10 handler modules + middleware.js (`createHandler`/`createOkHandler` wrappers)
- `utils/` — parse.js (track mapping, artist extraction), format.js, retry.js (generic withRetry)
- Handler pattern: `register(ipcMain, { getMainWindow, getYtMusic, stream, lyrics })`, all wrapped via `createHandler(channel, fn, fallback)`

### Renderer (`src/renderer/`)
- `state/index.js` — all state as Preact signals, persisted to localStorage (debounced). Tokens excluded from localStorage — stored via secureStore. Includes `searchHistory` signal + helpers (`addSearchTerm`, `removeSearchTerm`, `clearSearchHistory`)
- `hooks/` — 18 custom hooks (usePlayback, usePlaybackContext, useQueueControls, useTrackPlayer, useNavigation, useAppNavigation, useKeyboardShortcuts, usePlaybackWatchdog, useMobileBridge, useError, useLyrics, useVideoLoader, useFocusTrap, useSpotifyImport...)
- `components/App.jsx` — Pure orchestrator (~130 lines): providers, layout shell, hooks, back button, floating search
- `components/ViewRouter.jsx` — Renders 8 view sections (2 eager + 6 lazy-loaded)
- `components/OverlayLayer.jsx` — Renders 4 lazy overlay panels (Lyrics, NowPlaying, VideoPlayer, SpotifyImport)
- `components/views/` — lazy-loaded: Home, Search, Explore, Library, Playlist, Album, Artist, Settings
- `components/overlays/` — Lyrics, Queue, VideoPlayer, NowPlayingView, SpotifyImport
- `components/shared/` — TrackRow, TrackCard, AlbumCard, ArtistCard, Toast, Spinner, ContextMenu, ViewErrorBoundary
- `components/NowPlayingBar/` — playback controls (0 props, uses PlaybackContext + signal-based panel toggles)
- `services/api.js` — dedup() pattern with inflight Map, exploreCache.js (30min TTL)
- `state/navigation.js` — view state signals (album, artist, playlist, video) + `navigationHistory` signal + `captureNavSnapshot()`/`restoreNavSnapshot()` helpers
- `state/ui.js` — toast, error state (`lastError` signal), overlay panels (`lyricsVisible`/`queueVisible`/`spotifyImportVisible`/`nowPlayingViewVisible` signals), context menus, modals
- `utils/playbackError.js` — centralized playback error handler (reset + error state + toast + advance)
- `styles/` — 30+ CSS files, 10 themes via CSS custom properties + `data-theme` attribute (incl. "system" auto-detect)

### Key patterns
- **State:** `@preact/signals` — `signal()`, `computed()`, accessed via `.value`
- **IPC:** `register(ipcMain, deps)` exports, no classes. All handlers wrapped via `createHandler(channel, fn, fallback)` or `createOkHandler(channel, fn)` from `ipc/middleware.js`
- **Logging:** `electron-log` patches `console.*` globally in main process. Renderer logs via `window.snowify.log(level, ...args)` IPC. Logs in `userData/logs/main.log`
- **Secure storage:** Tokens encrypted via `safeStorage` in `userData/secure-tokens.json`, not in localStorage
- **Lazy loading:** `lazy(() => import('./views/X.jsx'))` + `<Suspense>` — views in `ViewRouter.jsx`, overlays in `OverlayLayer.jsx`
- **API dedup:** `dedup(key, fn)` prevents duplicate concurrent requests
- **Theming:** CSS custom properties, `[data-theme="X"]` selectors, 10 themes + "system" (auto `prefers-color-scheme`)
- **Error state:** `lastError` signal + `setError(code, msg, ctx)` in `useError.js` — observable + auto-toast
- **Playback context:** `PlaybackProvider` + `usePlaybackContext()` — shares playback controls without prop drilling
- **Navigation history:** `navigationHistory` signal in `state/navigation.js`. Deep nav (album/artist/playlist) pushes snapshot via `captureNavSnapshot()`, sidebar tabs clear the stack. `goBack()` pops + `restoreNavSnapshot()`. Cap 50 entries, transient (not persisted). Backspace shortcut in `useKeyboardShortcuts.js`
- **Navigation dismisses now-playing:** `switchView()` in `useAppNavigation.js` sets `nowPlayingViewVisible = false`, so navigating away auto-closes the now-playing view
- **Context menu `onRemove`:** ContextMenu accepts an optional `onRemove` callback — when provided, a "Remove from playlist" action is shown. Used by PlaylistView via `handleRemoveTrack`
- **Preact, not React:** use `import { useState } from 'preact/hooks'`, NOT `react`

### Security
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- ASAR enabled, CSP in main process — `connect-src 'self'` in production, permissive in dev for HMR
- Tokens/API keys encrypted via `electron.safeStorage` in `userData/secure-tokens.json` (not localStorage)
- Global crash handlers: `uncaughtException` + `unhandledRejection` logged to file

## Build commands
- `npm run dev` — dev server with HMR
- `npm run build` — electron-vite build to `out/`
- `npm run build:win` — Windows NSIS
- `npm run build:linux` — Linux AppImage
- `npm run build:mac` — macOS
- `npm run build:all` — all platforms

## Lint & format
- `npm run lint` — ESLint check
- `npm run lint:fix` — ESLint auto-fix
- `npm run format` — Prettier write
- `npm run format:check` — Prettier check
- `npm run test` — Vitest run (56 tests)
- `npm run test:watch` — Vitest watch mode
- Config: `eslint.config.js` (flat config), `.prettierrc.json`
- 18 `react-hooks/exhaustive-deps` warnings are expected (Preact signals as deps + stable refs)

## Conventions
- Language: French (conversations), English (code/commits)
- Commits: conventional (`feat:`, `fix:`, `chore:`)
- Always bump `package.json` version BEFORE tagging for releases
- Never delete/recreate tags — always bump to new patch version

## Documentation
- `docs/frontend-audit.md` — Previous detailed audit (CSS, a11y, performance) with fixes
- `docs/architecture.md` — Full architecture reference
- `docs/improvements.md` — Pending improvement backlog from stack audit

## Known gotchas
- Mobile CSS: when overriding `left: 50%` + `translateX(-50%)`, MUST also override `transform`
- Cloud Sync: see `src/shared/fieldMapping.js` — client/server format mapping is critical
- Token refresh: `useAppInit.js` listens for `auth:tokens-updated` IPC to sync renderer signals + save to secureStore
- Token migration: `useAppInit.js` auto-migrates tokens from old localStorage to secureStore on first launch
- Watchdog at 4s interval / 2 ticks (8s detection window)
- localStorage has no size limit — large liked songs collections can grow to 5MB+
