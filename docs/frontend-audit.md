# Frontend Audit — Snowify v1.4.8

> Date: 2026-02-24 | Score: ~~6.5~~ → **9 / 10**

| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Architecture & Code | ~~8~~ → 9.5/10 | 35% | All HIGH/MEDIUM fixed; 1 LOW remaining (NowPlayingBar prop drilling) |
| CSS & Theming | ~~5.5~~ → 9/10 | 20% | Light theme complete, responsive breakpoints added; 2 LOW remaining |
| Accessibility | ~~4~~ → 9.5/10 | 25% | All items fixed — ARIA, alt, labels, focus-trap, contrast |
| Performance | ~~7.5~~ → 9/10 | 20% | All MEDIUM fixed — lazy images, virtualization, useCallback; 2 LOW remaining |

---

## 1. Architecture & Code (8/10 → **9.5/10**)

### What's good

- Clean dependency chain: state → hooks → components → services, zero circular deps
- Hooks well decomposed (useTrackPlayer, useQueueControls, usePlayback orchestrator)
- Code splitting via `lazy()` on all heavy views
- TrackList virtualization above threshold
- API request dedup in `services/api.js`
- Fresh closure refs (usePlayback, watchdog, keyboard shortcuts)
- AbortController on lyrics fetch
- Event listener cleanup: 100% correct everywhere
- Unmount guards on async hooks (useLyrics, useSpotifyImport)

### To fix

#### HIGH

- [x] **Duplicated `applyThemeToDOM`** — Fixed: extracted to `utils/applyThemeToDOM.js`

- [x] **`draggedTrack` signal exported from component** — Fixed: moved to `state/index.js`

- [x] **Cross-module import violation** — Fixed: cache + invalidation moved to `services/exploreCache.js`

- [x] **Module-level cache in component** — Fixed: moved to `services/exploreCache.js`

#### MEDIUM

- [x] **`handleStart` is 148 lines of async** — Kept inline (business logic tightly coupled to reducer dispatch), refactored with useReducer

- [x] **VideoPlayer useEffect is 78 lines** — Fixed: extracted to `hooks/useVideoLoader.js`

- [x] **11 useState in useSpotifyImport** — Fixed: consolidated into `useReducer`

#### LOW

- [x] **Prop drilling NowPlayingBar (10 props)** — Fixed (v1.4.9): `PlaybackContext` + signals, NowPlayingBar now 0 props
- [x] **App.jsx god component (~640 lines)** — Fixed (v1.6.4): refactored to ~120 lines orchestrator. Views extracted to `ViewRouter.jsx`, overlays to `OverlayLayer.jsx`, mobile bridge to `useMobileBridge.js`, radio nav to `useAppNavigation.js`, spotify visibility to `spotifyImportVisible` signal

---

## 2. CSS & Theming (5.5/10 → **9/10**)

### What's good

- 6 complete theme palettes in variables.css
- Centralized truncate selector (25 selectors in global.css)
- Shadow variables (`--shadow-card-hover`, `--shadow-accent-sm`, etc.)
- All animations use GPU-friendly transform/opacity
- Scrollbar themed per-theme
- All CSS variables defined (`--bg-elevated-hover`, `--border`, `--ease-bounce`) ✓
- Dead selectors fixed (context-menu.css, nowplaying.css) ✓
- `--liked-gradient` variable deduplicates gradient across 3 files ✓
- `:focus-visible` on all 23 interactive elements ✓
- `playlist-cover-grid` consolidated (redundant scoped rules removed) ✓

### To fix

#### CRITICAL

- [x] **3 undefined CSS variables** — Fixed: defined in `:root` + all theme blocks
- [x] **Dead selectors** — Fixed: `.flyout-menu` → `.context-submenu`, `.flyout-item` → `.context-sub-item`
- [x] **Wrong ID selector** — Fixed: `#now-playing` → `#now-playing-bar`, `.progress-track` → `.progress-bar`, `.volume-track` → `.volume-slider`

#### HIGH

- [x] **9 CSS files missing light theme overrides** — Fixed: `[data-theme="light"]` overrides added to all 9 files (artist, explore, library, lyrics, modal, playlist, scroll-arrows, video, views)

- [x] **Only 1 @media query for 3,339 lines of CSS** — Fixed: added breakpoints at 1200px, 900px, 600px (sidebar collapse, card grids, view padding, modal widths, queue panel)

#### MEDIUM

- [x] **Liked-cover gradient hardcoded 3 times** — Fixed: `--liked-gradient` variable
- [x] **12 interactive elements missing `:focus-visible`** — Fixed: 23 selectors in global.css
- [x] **`playlist-cover-grid` defined in 3 files** — Fixed: redundant scoped rules removed

#### LOW

- [ ] **4 unused variables in variables.css**
  - `--glass-border` (line 29), `--glass-blur` (line 30)
  - Fix: remove or start using them

- [ ] **28 `!important` declarations (8-10 avoidable)**
  - Justified: `.no-animations`, `.no-effects`, `.hidden`
  - Avoidable: lyrics.css:72,75,93 (opacity), tracklist.css:46,48 (display), sidebar.css:178-180 (drag-over)
  - Fix: increase selector specificity instead

---

## 3. Accessibility (4/10 → **9.5/10**)

### What's good

- All modals: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` ✓
- Both context menus: `role="menu"`, `role="menuitem"`, arrow/Enter/Escape keyboard nav ✓
- ProgressBar + VolumeControl: `role="slider"`, `aria-valuenow/min/max`, keyboard arrows ✓
- Toast: `role="status"`, `aria-live="polite"`, `aria-atomic="true"` ✓
- All close buttons: `aria-label="Close ..."` ✓
- Panels: `role="complementary"`, `aria-label` ✓
- All images have meaningful `alt` text ✓
- All icon-only buttons have `aria-label` ✓
- All clickable cards have `tabIndex={0}` + keyboard support (Enter/Space) ✓
- Focus trap on all modals via `useFocusTrap` hook ✓
- `--text-subdued` contrast bumped to WCAG AA in all 7 themes ✓
- Search input has `aria-label` ✓

### To fix

#### HIGH

- [x] **Empty `alt=""` on all images (12+ instances)** — Fixed: meaningful alt text added
- [x] **15+ buttons missing `aria-label`** — Fixed: aria-label added to all icon-only buttons
- [x] **6 clickable divs without keyboard support** — Fixed: tabIndex + onKeyDown added
- [x] **No focus trap in any modal** — Fixed: `useFocusTrap` hook created and applied to all 4 modals
- [x] **`--text-subdued` fails WCAG AA contrast** — Fixed: colors bumped in all 7 themes

#### MEDIUM

- [x] **Search input has no label** — Fixed: `aria-label="Search songs, artists, albums"`
- [x] **Toast missing `aria-atomic="true"`** — Fixed

---

## 4. Performance (7.5/10 → **9/10**)

### What's good

- All views lazy-loaded via `lazy()` ✓
- TrackList virtualized above threshold ✓
- Search debounced ✓
- API dedup prevents duplicate requests ✓
- `loading="lazy"` on most card images ✓
- Event listener cleanup 100% correct ✓
- LikedSongs computed as `Set` via `useMemo` ✓

### To fix

#### MEDIUM

- [x] **`loading="lazy"` missing on 4 image groups** — Fixed: added to NowPlayingBar, QueuePanel, SearchView, HomeView

- [x] **SpotifyImport track list not virtualized** — Fixed: virtualized with scroll-based windowing (38px rows, 5-item overscan)

- [x] **Missing `useCallback` on view handlers** — Fixed: SearchView `handlePlay` wrapped; `performSearch` and HomeView handlers were already wrapped

#### LOW

- [ ] **Inline objects created every render**
  - NowPlayingBar.jsx:45 — `{ name: track.album, thumbnail: track.thumbnail }`
  - Sidebar.jsx:10-16 — nav items array
  - Fix: extract to constants or memoize

- [ ] **Triple text-shadow on active lyrics line**
  - lyrics.css:78-81 — 3 layered text-shadows + scale transform
  - Fix: reduce to single shadow or use `filter: drop-shadow()`

---

## Roadmap to 10/10 — ✅ All phases complete

### Phase 1 — CSS fixes (quick wins) ✅ DONE
1. ~~Define the 3 missing variables in variables.css~~ ✅
2. ~~Fix dead selectors (context-menu.css, nowplaying.css)~~ ✅
3. ~~Add `--liked-gradient` variable, deduplicate~~ ✅
4. ~~Add `:focus-visible` to all interactive elements~~ ✅
5. ~~Consolidate `playlist-cover-grid` into one location~~ ✅

### Phase 2 — Light theme completion ✅ DONE
6. ~~Add `[data-theme="light"]` overrides to the 9 files listed above~~ ✅
7. ~~Bump `--text-subdued` contrast in all 6 themes~~ ✅ Done

### Phase 3 — Accessibility ✅ DONE
8. ~~Add `alt={name}` to all images~~ ✅
9. ~~Add `aria-label` to all icon-only buttons~~ ✅
10. ~~Add `tabIndex={0}` + keyboard handler to all clickable cards~~ ✅
11. ~~Create `useFocusTrap` hook, apply to all modals~~ ✅
12. ~~Add `aria-label` to search input, `aria-atomic` to toast~~ ✅

### Phase 4 — Architecture cleanup ✅ DONE
13. ~~Extract `applyThemeToDOM` to utils/~~ ✅
14. ~~Move `draggedTrack` to state/~~ ✅
15. ~~Create `services/exploreCache.js` (move cache + invalidation from ExploreView)~~ ✅
16. ~~Refactor `useSpotifyImport` to `useReducer`~~ ✅
17. ~~Extract VideoPlayer loading logic to hook~~ ✅

### Phase 5 — Performance polish ✅ DONE
18. ~~Add `loading="lazy"` to remaining images~~ ✅
19. ~~Virtualize SpotifyImport track list~~ ✅
20. ~~Add responsive breakpoints (1200/900/600px)~~ ✅
21. ~~Wrap view handlers in `useCallback`~~ ✅
