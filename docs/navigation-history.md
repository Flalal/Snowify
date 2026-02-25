# Navigation History — Bouton Retour ✅ DONE (v1.7.0)

> Implémenté dans v1.7.0 — commit `479a6f6`

## Résumé de l'implémentation

- **Signal** `navigationHistory` dans `state/navigation.js` (transient, cap 50 entrées)
- **`captureNavSnapshot()`** — capture `{ view, state }` en lisant albumViewState/artistViewState/playlistViewState
- **`restoreNavSnapshot(entry)`** — écrit dans le bon signal d'état selon `entry.view`
- **`switchView()`** — hard reset du stack (sidebar tabs clearent l'historique)
- **`pushHistory()`** — appelé avant chaque navigation profonde (album/artist/playlist)
- **`goBack()`** — pop dernier entry, restaure le snapshot, set currentView
- **Back button** — rond 36px avec chevron SVG dans `App.jsx`, visible seulement quand `navigationHistory.value.length > 0`
- **Backspace** shortcut dans `useKeyboardShortcuts.js`
- **Mobile** — touch target 44×44px dans `mobile-overrides.css`

## Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/shared/constants.js` | `NAV_HISTORY_MAX = 50` |
| `src/renderer/state/navigation.js` | Signal + snapshot helpers |
| `src/renderer/hooks/useAppNavigation.js` | pushHistory, goBack, bypass switchView pour détails |
| `src/renderer/hooks/useKeyboardShortcuts.js` | Backspace → goBack |
| `src/renderer/components/App.jsx` | Back button UI |
| `src/renderer/styles/search.css` | `.back-btn` styles |
| `mobile/src/mobile-overrides.css` | Touch target override |
