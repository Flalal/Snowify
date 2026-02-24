# Snowify Frontend — Pending Improvements

Stack audit: 2026-02-24 on v1.4.8. Global score: **7.1/10**.
Updated: 2026-02-24 on v1.4.9 — items 1, 2, 3, 4 resolved.

Scores by category:

| Category | Score | Notes |
|----------|-------|-------|
| Architecture | 8/10 | Good main/renderer/preload separation |
| Performance | 7/10 | Good caches, but watchdog too frequent |
| Security | 8.5/10 | Sandbox good, tokens encrypted via safeStorage |
| Code Quality | 6.5/10 | Duplication, no tests (linting added) |
| State Management | 8/10 | Signals excellent, IPC middleware in place |
| Error Handling | 7.5/10 | Centralized IPC middleware + structured logging |
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

### 5. Zero test coverage
- **Problem:** No test framework at all
- **Fix:** Add Vitest, start with `src/main/utils/` and `src/main/services/` (pure logic, easy to test)
- **Note:** Already identified in architecture-todo.md #14

### 6. Code duplication
| Pattern | Locations | Fix |
|---------|-----------|-----|
| Track mapping | `parse.js`, `sync.js`, `state/index.js`, `fieldMapping.js` | Extract `utils/trackMapper.js` |
| Retry logic | `api.js`, `explore.handlers.js`, ytmusic init | Extract `utils/retryFetch.js` |
| Audio error handling | `usePlayback.js`, `usePlaybackWatchdog.js` | Extract shared error handler |
| Toast messages | Ad-hoc strings everywhere | Standardize with error codes |

### 7. CSP too permissive
- **Problem:** `connect-src 'self' https: http:` accepts all origins
- **Fix:** Whitelist only: YouTube domains, Snowify API, fonts.googleapis.com
- **File:** `src/main/index.js` (CSP header injection)

### 8. No centralized error state
- **Problem:** Errors handled ad-hoc in each component/hook, no observable error state
- **Fix:** Create `errorState` signal + `useError` hook + standardized error code enum
- **Files:** `src/renderer/state/index.js`, create `src/renderer/hooks/useError.js`

---

## Nice-to-have (backlog)

### 9. CSS not scoped
- 30+ global CSS files with no selector scoping — risk of conflicts
- Themes repeated as boilerplate across 7 `[data-theme]` blocks
- **Fix:** Migrate to CSS Modules or PostCSS for auto-scoping

### 10. Watchdog too frequent
- `WATCHDOG_INTERVAL_MS = 2000` → 30 calls/min — battery impact
- **Fix:** Increase to 4000ms in `src/shared/constants.js`

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

### 14. No OS theme detection
- Theme always set manually — no `prefers-color-scheme` integration
- **Fix:** Read `window.matchMedia('(prefers-color-scheme: dark)')` at startup, add "System" theme option

### 15. No request batching
- 100 tracks searched = 100 parallel requests
- **Fix:** Batch API on server side, or client-side request queue with concurrency limit

### 16. Prop drilling NowPlayingBar
- Receives 10+ props from App.jsx
- **Fix:** Import playback signals/hooks directly instead of passing through props
- **Note:** Already identified in architecture-todo.md #13
