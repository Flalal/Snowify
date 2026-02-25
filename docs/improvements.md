# Snowify Frontend — Pending Improvements

Stack audit: 2026-02-24 on v1.4.8. Global score: **7.1/10**.
Updated: 2026-02-24 on v1.4.9 — items 1–8, 10, 14, 16 resolved.
Updated: 2026-02-25 on v1.6.4 — App.jsx refactored from god component to orchestrator.

Scores by category:

| Category | Score | Notes |
|----------|-------|-------|
| Architecture | 8/10 | Good main/renderer/preload separation |
| Performance | 7/10 | Good caches, but watchdog too frequent |
| Security | 9/10 | Sandbox good, tokens encrypted via safeStorage, CSP tightened |
| Code Quality | 7.5/10 | Dedup done, Vitest + 56 tests, linting |
| State Management | 8/10 | Signals excellent, IPC middleware in place |
| Error Handling | 8/10 | Centralized IPC middleware + structured logging + error state signal |
| CSS | 7/10 | Well organized, but not scoped |
| Dependencies | 8/10 | Minimalist, modern, up to date |

---

## Critical (before production) — DONE (v1.4.9)

### ~~1. Sensitive data stored in plaintext~~ DONE
- **Fix applied:** Tokens encrypted via `electron.safeStorage` in `userData/secure-tokens.json`. Removed from `PERSISTENT_KEYS` / localStorage. Auto-migration on first launch.
- **Files:** `src/main/services/secureStore.js` (new), `src/main/ipc/auth.handlers.js`, `src/renderer/state/index.js`, `src/renderer/hooks/useAppInit.js`, `src/renderer/components/views/settings/CloudSyncSection.jsx`, `src/preload/index.js`

### ~~2. No IPC middleware~~ DONE
- **Fix applied:** `createHandler(channel, fn, fallback)` and `createOkHandler(channel, fn)` in `src/main/ipc/middleware.js`. All 10 handler files wrapped. Centralized try/catch + structured error logging via `[IPC:channel]` prefix.
- **Files:** `src/main/ipc/middleware.js` (new), all 10 `*.handlers.js`

### ~~3. No structured logging~~ DONE
- **Fix applied:** `electron-log` patches `console.*` globally in main process. Logs to `userData/logs/main.log`. Renderer can log via `window.snowify.log(level, ...args)` IPC. Global crash handlers for `uncaughtException` + `unhandledRejection`.
- **Files:** `src/main/services/logger.js` (new), `src/main/index.js`, `src/preload/index.js`

---

## Important (before v1.5)

### ~~4. No linting or formatting~~ DONE
- **Fix applied:** ESLint 9 (flat config) + Prettier. `eslint-plugin-react` (jsx-uses-vars only) + `eslint-plugin-react-hooks`. Strict `no-unused-vars`, `eqeqeq`, `prefer-const`, `no-var`. Prettier: single quotes, semicolons, no trailing commas, 100 printWidth.
- **Files:** `eslint.config.js` (new), `.prettierrc.json` (new), `.prettierignore` (new), `package.json` (scripts + devDeps), ~99 source files reformatted

### ~~5. Zero test coverage~~ DONE
- **Fix applied:** Vitest 4 added. 56 unit tests across 5 test suites covering all pure-logic modules: `retry.js` (7 tests), `format.js` (11 tests), `parse.js` (18 tests), `fieldMapping.js` (10 tests), `syncMerge.js` (10 tests). Bugfix: `syncMerge` spread of `local.recentTracks` without fallback.
- **Files:** `vitest.config.js` (new), `package.json` (scripts + devDep), `src/main/utils/__tests__/retry.test.js`, `src/main/utils/__tests__/format.test.js`, `src/main/utils/__tests__/parse.test.js`, `src/shared/__tests__/fieldMapping.test.js`, `src/shared/__tests__/syncMerge.test.js`, `src/shared/syncMerge.js` (bugfix)

### ~~6. Code duplication~~ DONE
- **Fix applied:** `mapTrackToServer(t, extra)` in `src/shared/fieldMapping.js` — deduplicates 3 inline blocks in sync.js. `withRetry(fn, opts)` in `src/main/utils/retry.js` — replaces ad-hoc retry loop in ytmusic.js. `handlePlaybackError()` in `src/renderer/utils/playbackError.js` — centralizes 3 error handlers (usePlayback, usePlaybackWatchdog, useTrackPlayer). Toast messages left as-is (minor, not worth a catalog).
- **Files:** `src/shared/fieldMapping.js`, `src/main/services/sync.js`, `src/main/utils/retry.js` (new), `src/main/services/ytmusic.js`, `src/renderer/utils/playbackError.js` (new), `src/renderer/hooks/usePlayback.js`, `src/renderer/hooks/usePlaybackWatchdog.js`, `src/renderer/hooks/useTrackPlayer.js`

### ~~7. CSP too permissive~~ DONE
- **Fix applied:** `connect-src 'self'` in production (renderer uses IPC only, no direct fetch). Dev mode keeps `https: http: ws:` for HMR. Other directives unchanged (`img-src https:`, `media-src https:` needed for YouTube CDNs).
- **File:** `src/main/index.js`

### ~~8. No centralized error state~~ DONE
- **Fix applied:** `ErrorCode` enum in `src/shared/constants.js`. `lastError` signal in `src/renderer/state/ui.js`. `setError(code, message, context)` / `clearError()` in `src/renderer/hooks/useError.js` (new). Integrated in `playbackError.js` (3 error types) and `useAppInit.js` (YTMusic init failure).
- **Files:** `src/shared/constants.js`, `src/renderer/state/ui.js`, `src/renderer/hooks/useError.js` (new), `src/renderer/utils/playbackError.js`, `src/renderer/hooks/useAppInit.js`

---

## Nice-to-have (backlog)

### 9. CSS not scoped
- 30+ global CSS files with no selector scoping — risk of conflicts
- Themes repeated as boilerplate across 7 `[data-theme]` blocks
- **Fix:** Migrate to CSS Modules or PostCSS for auto-scoping

### ~~10. Watchdog too frequent~~ DONE
- **Fix applied:** `WATCHDOG_INTERVAL_MS` 2000→4000ms, `WATCHDOG_STALL_TICKS` 4→2 (same 8s detection window, half the CPU wake-ups).
- **File:** `src/shared/constants.js`

### 11. localStorage has no size limit
- 10,000+ liked songs ≈ 5MB+ — problematic on mobile (Capacitor)
- No atomic transactions — risk of corruption on crash
- **Fix:** Migrate large collections to IndexedDB, or add compression

### 12. Preload still in CommonJS
- `src/preload/index.js` uses `require('electron')` (legacy pattern)
- **Fix:** Convert to ES modules

### 13. Bridge surface too large
- 70+ methods exposed to renderer via `window.snowify`
- **Fix:** Group by namespace, consider permission-based exposure

### ~~14. No OS theme detection~~ DONE
- **Fix applied:** "System" theme option added. `applyThemeToDOM` resolves `'system'` to dark/light via `prefers-color-scheme`. Live listener in `useAppInit` auto-switches when OS preference changes.
- **Files:** `src/renderer/utils/applyThemeToDOM.js`, `src/renderer/hooks/useAppInit.js`, `src/renderer/components/views/settings/AppearanceSection.jsx`

### 15. No request batching
- 100 tracks searched = 100 parallel requests
- **Fix:** Batch API on server side, or client-side request queue with concurrency limit

### ~~16. Prop drilling NowPlayingBar~~ DONE
- **Fix applied:** NowPlayingBar reduced from 10 props to 0. `PlaybackContext` (matching `NavigationContext` pattern) provides playback controls. Panel visibility (`lyricsVisible`, `queueVisible`) moved to signals in `state/ui.js` with `toggleLyricsPanel`/`toggleQueuePanel` helpers. `showAlbumDetail` accessed via existing `useNavigation()`. Sub-components (`PlaybackControls`, `VolumeControl`) also refactored to use context.
- **Files:** `src/renderer/hooks/usePlaybackContext.js` (new), `src/renderer/state/ui.js`, `src/renderer/components/App.jsx`, `src/renderer/components/NowPlayingBar/NowPlayingBar.jsx`, `src/renderer/components/NowPlayingBar/PlaybackControls.jsx`, `src/renderer/components/NowPlayingBar/VolumeControl.jsx`
