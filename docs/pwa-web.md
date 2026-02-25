# PWA Web — Snowify pour iOS (et tout navigateur)

## Objectif

Héberger le frontend Preact en tant que Progressive Web App (PWA) accessible depuis un navigateur. Permet aux utilisateurs iOS d'avoir Snowify via Safari → "Add to Home Screen" sans passer par l'App Store.

---

## Pourquoi c'est faisable rapidement

Le travail le plus lourd est déjà fait :

- **Renderer Preact** — framework web standard, pas de dépendance Electron dans le code UI
- **`api-adapter.js`** — la version mobile Capacitor remplace déjà `window.snowify` (IPC Electron) par des appels HTTP vers `snowify-api`. La PWA peut réutiliser exactement le même adaptateur
- **`snowify-api`** — backend Fastify + yt-dlp déjà déployé sur Proxmox, expose toutes les API nécessaires (search, stream, explore, lyrics, sync, auth)

---

## Architecture

```
┌──────────────────────────┐
│   Navigateur (Safari/    │
│   Chrome/Firefox)        │
│                          │
│  ┌────────────────────┐  │
│  │ Preact Renderer    │  │
│  │ (même code que     │  │
│  │  desktop/mobile)   │  │
│  │                    │  │
│  │ window.snowify =   │  │
│  │  api-adapter.js    │  │
│  └────────┬───────────┘  │
└───────────┼──────────────┘
            │ HTTPS
            ▼
┌──────────────────────────┐
│   snowify-api            │
│   (Fastify + yt-dlp)     │
│   Proxmox / VPS          │
└──────────────────────────┘
```

---

## Fichiers à créer

| # | Fichier | Rôle |
|---|---------|------|
| 1 | `web/index.html` | Point d'entrée HTML (charge le bundle Preact) |
| 2 | `web/manifest.json` | PWA manifest (nom, icônes, theme_color, display: standalone) |
| 3 | `web/sw.js` | Service worker (cache statique, offline shell) |
| 4 | `web/vite.config.js` | Config Vite pour build web (sans electron-vite) |
| 5 | `web/src/entry.js` | Entry point : injecte `api-adapter.js` comme `window.snowify` puis monte `<App />` |

### Fichiers existants réutilisés tels quels

- `src/renderer/components/**` — tout le UI
- `src/renderer/hooks/**` — tous les hooks
- `src/renderer/state/**` — tous les signaux
- `src/renderer/styles/**` — tous les CSS
- `mobile/src/api-adapter.js` — l'adaptateur API (partagé mobile ↔ web)

---

## Config Vite (web)

```js
// web/vite.config.js
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  root: '.',
  resolve: {
    alias: {
      // Pointer vers le renderer existant
      '@': '/src/renderer'
    }
  },
  build: {
    outDir: 'dist',
  }
});
```

---

## PWA Manifest

```json
{
  "name": "Snowify",
  "short_name": "Snowify",
  "description": "Music streaming player",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#1db954",
  "icons": [
    { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## Adaptations nécessaires

### 1. Entry point web

```js
// web/src/entry.js
import { initApiAdapter } from '../../mobile/src/api-adapter.js';

// Configurer l'API backend
initApiAdapter({ baseUrl: 'https://api.snowify.example.com' });

// Monter l'app Preact
import { render } from 'preact';
import { App } from '../../src/renderer/components/App.jsx';
render(<App />, document.getElementById('app'));
```

### 2. Fonctionnalités Electron à stubber

Certaines méthodes `window.snowify` n'ont pas de sens sur le web :

| Méthode | Web | Action |
|---------|-----|--------|
| `minimize()`, `maximize()`, `close()` | N/A | No-op |
| `pickImage()` | Remplacer | `<input type="file" accept="image/*">` |
| `saveImage()` | Remplacer | Upload vers snowify-api |
| `isMaximized()` | N/A | Return false |
| `onMaximizeChange()` | N/A | No-op |
| `openExternal()` | Remplacer | `window.open(url, '_blank')` |
| `secureStore` | N/A | Utiliser localStorage (tokens en mémoire ou cookie httpOnly via api) |

### 3. CSS mobile-overrides

Réutiliser `mobile/src/mobile-overrides.css` pour les petits écrans. Éventuellement le charger conditionnellement via media query ou via le build.

### 4. Audio

L'audio fonctionne nativement dans le navigateur (`<audio>` + URL stream). Aucun changement nécessaire — le renderer utilise déjà un élément `<audio>` HTML standard.

---

## Déploiement

### Option A — Vercel / Cloudflare Pages (recommandé)

- Push le dossier `web/dist/` → déployé automatiquement
- HTTPS gratuit, CDN global, custom domain
- Zero config

### Option B — Proxmox (self-hosted)

- Nginx sert les fichiers statiques `web/dist/`
- Même machine que snowify-api (ou reverse proxy)
- Contrôle total, pas de dépendance externe

### Option C — GitHub Pages

- Gratuit, custom domain possible
- Limité au statique (OK pour une PWA)

---

## Limitations iOS Safari

| Limitation | Détail | Contournement |
|-----------|--------|---------------|
| **Pas d'audio en arrière-plan** | Safari coupe l'audio quand l'app est en background | Aucun — limitation hard d'Apple |
| **MediaSession limitée** | Lock screen controls partiellement supportés depuis iOS 16+ | Tester, implémenter ce qui marche |
| **Pas de notifications push** | Supporté depuis iOS 16.4 mais avec restrictions | Implémenter si besoin (web push) |
| **Storage limité** | ~50MB localStorage, service worker cache limité | Suffisant pour Snowify |
| **Pas de lecture auto** | Safari bloque l'autoplay sans interaction user | Déjà géré (click to play) |
| **Pas de background sync** | Service worker limité en background | Sync au retour dans l'app |

---

## Ordre d'implémentation

1. **Setup Vite web** — `web/vite.config.js`, `index.html`, `entry.js`
2. **Adapter api-adapter.js** — stubber les méthodes Electron-only
3. **Build et tester localement** — `vite dev` dans le navigateur
4. **PWA** — `manifest.json`, `sw.js`, icônes
5. **Déployer** — Vercel ou Proxmox
6. **Tester iOS** — Safari → Add to Home Screen
7. **CSS tweaks** — ajuster les overrides mobile pour Safari iOS si nécessaire
