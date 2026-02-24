# Frontend Audit — Snowify v1.4.8

> Date: 2026-02-24 | Score: **6.5 / 10**

| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Architecture & Code | 8/10 | 35% | Solid hook decomposition, no leaks, clean deps |
| CSS & Theming | 5.5/10 | 20% | Broken variables, incomplete light theme, no responsive |
| Accessibility | 4/10 | 25% | ARIA basics done, missing alt/labels/focus-trap/contrast |
| Performance | 7.5/10 | 20% | Good lazy/virtual, minor image/memoization gaps |

---

## 1. Architecture & Code (8/10)

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

- [ ] **Duplicated `applyThemeToDOM`**
  - `hooks/useAppInit.js:10-16` and `views/settings/AppearanceSection.jsx:3-9`
  - Fix: extract to `utils/applyThemeToDOM.js`, import in both

- [ ] **`draggedTrack` signal exported from component**
  - `components/Sidebar/Sidebar.jsx:7`
  - Fix: move to `state/index.js` or `state/dragState.js`

- [ ] **Cross-module import violation**
  - `views/settings/PlaybackSection.jsx:6` imports `invalidateExploreCache` from `ExploreView.jsx`
  - Fix: move cache + invalidation to `services/exploreCache.js`

- [ ] **Module-level cache in component**
  - `views/ExploreView.jsx:28-48` — `_exploreCache`, `_chartsCache`, timing vars
  - Fix: move to `services/exploreCache.js`

#### MEDIUM

- [ ] **`handleStart` is 148 lines of async**
  - `hooks/useSpotifyImport.js:87-235`
  - Fix: extract batch-processing logic to a utility or split into sub-functions

- [ ] **VideoPlayer useEffect is 78 lines**
  - `overlays/VideoPlayer.jsx:96-173`
  - Fix: extract async video loading to `utils/loadVideo.js` or `hooks/useVideoLoader.js`

- [ ] **11 useState in useSpotifyImport**
  - `hooks/useSpotifyImport.js:8-18`
  - Fix: consolidate into `useReducer` — many states are derived (`startDisabled` = `!pendingPlaylists?.length`)

#### LOW

- [ ] **Prop drilling NowPlayingBar (10 props)**
  - `App.jsx:198-209` → NowPlayingBar → PlaybackControls
  - Fix: wrap playback callbacks in a context or import hooks directly

---

## 2. CSS & Theming (5.5/10 → **7/10**)

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

- [ ] **9 CSS files missing light theme overrides**
  - `artist.css` — disco-filter, show-more-btn, follow-btn, artist-tag, similar-artist all dark-only
  - `explore.css` — mood-card borders, top-song-item, top-artist-card hover
  - `library.css` — lib-card border colors
  - `lyrics.css` — lyrics-panel background
  - `modal.css` — modal-box elevation/shadow
  - `playlist.css` — hero cover, action buttons
  - `scroll-arrows.css` — arrow backgrounds/shadows
  - `video.css` — overlay background
  - `views.css` — view-error button
  - Fix: add `[data-theme="light"]` overrides in each file

- [ ] **Only 1 @media query for 3,339 lines of CSS**
  - global.css:146-150 (max-width: 1000px) is the only breakpoint
  - Fix: add breakpoints at 1200px, 900px, 600px for sidebar collapse, card grid columns, modal widths, queue panel

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

## 3. Accessibility (4/10 → **9/10**)

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

## 4. Performance (7.5/10)

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

- [ ] **`loading="lazy"` missing on 4 image groups**
  - NowPlayingBar.jsx:53 — now-playing thumbnail
  - QueuePanel.jsx:95 — queue item thumbnails
  - SearchView.jsx:170 — artist result avatar
  - HomeView.jsx:212 — quick pick card images
  - Fix: add `loading="lazy"` attribute

- [ ] **SpotifyImport track list not virtualized**
  - SpotifyImport.jsx:119-154 — renders all items in DOM
  - Can have hundreds/thousands of tracks
  - Fix: use same VirtualTrackList pattern or simple windowing

- [ ] **Missing `useCallback` on view handlers**
  - SearchView.jsx:32-60 — `performSearch` recreated each render
  - HomeView.jsx — some inline callbacks
  - Fix: wrap with `useCallback` and proper deps

#### LOW

- [ ] **Inline objects created every render**
  - NowPlayingBar.jsx:45 — `{ name: track.album, thumbnail: track.thumbnail }`
  - Sidebar.jsx:10-16 — nav items array
  - Fix: extract to constants or memoize

- [ ] **Triple text-shadow on active lyrics line**
  - lyrics.css:78-81 — 3 layered text-shadows + scale transform
  - Fix: reduce to single shadow or use `filter: drop-shadow()`

---

## Roadmap to 10/10

### Phase 1 — CSS fixes (quick wins) ✅ DONE
1. ~~Define the 3 missing variables in variables.css~~ ✅
2. ~~Fix dead selectors (context-menu.css, nowplaying.css)~~ ✅
3. ~~Add `--liked-gradient` variable, deduplicate~~ ✅
4. ~~Add `:focus-visible` to all interactive elements~~ ✅
5. ~~Consolidate `playlist-cover-grid` into one location~~ ✅

### Phase 2 — Light theme completion
6. Add `[data-theme="light"]` overrides to the 9 files listed above
7. ~~Bump `--text-subdued` contrast in all 6 themes~~ ✅ Done

### Phase 3 — Accessibility ✅ DONE
8. ~~Add `alt={name}` to all images~~ ✅
9. ~~Add `aria-label` to all icon-only buttons~~ ✅
10. ~~Add `tabIndex={0}` + keyboard handler to all clickable cards~~ ✅
11. ~~Create `useFocusTrap` hook, apply to all modals~~ ✅
12. ~~Add `aria-label` to search input, `aria-atomic` to toast~~ ✅

### Phase 4 — Architecture cleanup
13. Extract `applyThemeToDOM` to utils/
14. Move `draggedTrack` to state/
15. Create `services/exploreCache.js` (move cache + invalidation from ExploreView)
16. Refactor `useSpotifyImport` to `useReducer`
17. Extract VideoPlayer loading logic to hook

### Phase 5 — Performance polish
18. Add `loading="lazy"` to remaining images
19. Virtualize SpotifyImport track list
20. Add responsive breakpoints (1200/900/600px)
21. Wrap view handlers in `useCallback`
