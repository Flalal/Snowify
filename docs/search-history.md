# Search History — Historique des recherches ✅ DONE (v1.7.0)

> Implémenté dans v1.7.0 — commit `479a6f6`

## Résumé de l'implémentation

- **Signal** `searchHistory` dans `state/index.js` (persisté via `PERSISTENT_KEYS` + `saveState`)
- **`addSearchTerm(term)`** — dédup case-insensitive, prepend, cap 20 entrées
- **`removeSearchTerm(term)`** — suppression individuelle
- **`clearSearchHistory()`** — vide tout
- **SearchView.jsx** — appelle `addSearchTerm(q)` après un `Promise.all` réussi
- **UI** — quand input vide : "Recent searches" + "Clear all" + liste clickable, sinon placeholder par défaut
- **Chaque item** — bouton clickable (icône loupe + texte) → remplir input + relancer la recherche, bouton × → supprimer
- **Mobile** — touch targets agrandis (44px) dans `mobile-overrides.css`

## Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/shared/constants.js` | `SEARCH_HISTORY_MAX = 20` |
| `src/renderer/state/index.js` | Signal + PERSISTENT_KEYS + loadState + helpers |
| `src/renderer/components/views/SearchView.jsx` | addSearchTerm après recherche, UI historique |
| `src/renderer/styles/search.css` | `.search-history-*` styles + light theme |
| `mobile/src/mobile-overrides.css` | Touch target overrides |
