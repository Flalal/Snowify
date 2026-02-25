# Casting — Chromecast (Desktop + Mobile natif)

## Statut : v1.8.0 — Implémenté

---

## Architecture

### Desktop (Electron)
```
┌─────────────────────────────────────────────────────────┐
│                    ELECTRON MAIN PROCESS                 │
│                                                          │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ yt-dlp   │  │ Cast Manager │  │ Local Proxy Server │  │
│  │ stream.js│──│ cast.js      │──│ castProxy.js       │  │
│  └──────────┘  │ - mDNS disc. │  │ (http, port 45100) │  │
│                │ - chromecast │  │ - pipe yt-dlp URL  │  │
│                │              │  │ - headers/cookies  │  │
│                └──────────────┘  │ - range requests   │  │
│                       │          └───────────────────┘   │
│                       │ IPC                              │
├───────────────────────┼──────────────────────────────────┤
│  RENDERER             │                                  │
│  ┌────────────────────┴──┐                               │
│  │ Cast UI               │                               │
│  │ - CastPicker modal    │                               │
│  │ - casting indicator   │                               │
│  │ - useCast hook        │                               │
│  └───────────────────────┘                               │
└──────────────────────────────────────────────────────────┘
                            │  LAN
              ┌─────────────┴──────────────┐
              │   Google Home / Chromecast  │
              │   fetch audio depuis proxy  │
              └────────────────────────────┘
```

### Mobile (Capacitor)
```
┌────────────────────────────────────────────────────┐
│  ANDROID APP (Capacitor)                            │
│                                                     │
│  ┌──────────────────┐  ┌────────────────────────┐  │
│  │ WebView          │  │ capacitor-chromecast    │  │
│  │ api-adapter.js   │──│ (Google Cast SDK natif) │  │
│  │ - ensureChromecast│  │ - requestSession()     │  │
│  │ - loadMedia()    │  │ - loadMedia()           │  │
│  │ - JS poll 1s     │  │ - ProgressListener 1s   │  │
│  └──────────────────┘  └────────────────────────┘  │
│         │                        │                  │
│  ┌──────┴──────┐     ┌──────────┴───────────┐     │
│  │ CastPicker  │     │ Native Cast Dialog    │     │
│  │ détecte     │────→│ (MediaRouteChooser)   │     │
│  │ Capacitor   │     └──────────────────────┘     │
│  └─────────────┘                                   │
└────────────────────────────────────────────────────┘
                    │  Wi-Fi
          ┌─────────┴──────────────┐
          │  Google Home / Cast    │
          │  stream depuis API     │
          └────────────────────────┘
```

---

## Fichiers implémentés

### Desktop (Electron main process)
| Fichier | Rôle |
|---------|------|
| `src/main/services/cast.js` | mDNS discovery + contrôle Chromecast via `chromecast-api` |
| `src/main/services/castProxy.js` | Serveur HTTP local proxy (port 45100) pour streams audio |
| `src/main/ipc/cast.handlers.js` | 13 IPC handlers (discover, connect, loadMedia, play, pause, seek, stop, volume, status) |

### Desktop (Preload)
| Fichier | Modification |
|---------|-------------|
| `src/preload/index.js` | 13 méthodes cast exposées sur `window.snowify` |

### Renderer (partagé desktop/mobile)
| Fichier | Rôle |
|---------|------|
| `src/renderer/hooks/useCast.js` | Hook : discovery, connect, disconnect, status listener |
| `src/renderer/components/shared/CastPicker.jsx` | Modal device picker (desktop) + détection Capacitor (mobile) |
| `src/renderer/styles/cast.css` | Styles picker + indicateur casting |
| `src/renderer/state/ui.js` | Signaux : `isCasting`, `castDevice`, `castDevices`, `castPickerVisible`, `castPosition`, `castDuration` |
| `src/renderer/components/NowPlayingBar/NowPlayingBar.jsx` | Bouton cast + indicateur |
| `src/renderer/components/overlays/NowPlayingView.jsx` | Bouton cast + label dans la vue NowPlaying |

### Mobile (Capacitor)
| Fichier | Rôle |
|---------|------|
| `capacitor-chromecast/` | Plugin Capacitor forké — Google Cast SDK natif Android |
| `mobile/src/api-adapter.js` | Implémentation cast via plugin natif + polling JS 1s |
| `mobile/src/mobile-overrides.css` | Cache les labels texte cast, garde l'icône |

---

## Flux de cast

### Connexion (mobile)
1. User clique icône cast → `castPickerVisible = true` → CastPicker monte
2. CastPicker détecte `window.Capacitor` → ferme picker → `onConnect(null)`
3. `connectDevice(null)` capture position + état play
4. `castConnect()` → `Chromecast.requestSession()` → **dialogue natif Android**
5. User choisit un device → session démarre → `{ name, id, host }` retourné
6. Pause audio local, set `isCasting = true`, charge track sur Chromecast avec `currentTime`

### Connexion (desktop)
1. User clique icône cast → CastPicker s'ouvre → discovery mDNS
2. Devices apparaissent progressivement (onCastDevices callback)
3. User sélectionne un device → `connectDevice(device)`
4. `castConnect(device.id)` → proxy démarre → cast connect → load media

### Pendant le cast
- Desktop : `onCastStatus` callback depuis main process (1s updates)
- Mobile : `MEDIA_UPDATE` events natifs + JS polling fallback (1s)
- Contrôles play/pause/seek passent par `castPlay/castPause/castSeek`

### Déconnexion
1. Desktop : CastPicker → "Disconnect" → `castDisconnect()` → proxy stop
2. Mobile : Cast icon → `onDisconnect()` → `sessionStop()`
3. Audio local reprend à la position du Chromecast

---

## Plugin capacitor-chromecast

Repo : `github.com/Flalal/capacitor-chromecast` (fork de @caprockapps)

### Corrections appliquées
- **Race condition** : `this.media` était null car `getChromecastSession()` appelé avant `runOnUiThread`. Fix : accès dynamique via `connection.getChromecastSession()`.
- **currentTime getInt→getDouble** : `getInt` retournait 0 pour les floats JS. Fix : `getDouble`.
- **Mini-controller désactivé** : `setNotificationOptions(null)` dans CastOptionsProvider.
- **ProgressListener** : Ajout d'un listener 1s pour les mises à jour de position.
- **Capacitor 6** : Migration depuis Cordova, types TypeScript.

### API du plugin
```
initialize({appId?})          → void
requestSession()              → SessionResult {sessionId, receiver: {friendlyName}}
selectRoute({routeId})        → SessionResult
loadMedia({contentId, contentType, currentTime, autoPlay, metadata}) → void
mediaPlay/Pause/Seek/Stop()   → void
setReceiverVolumeLevel({level}) → void
setReceiverMuted({muted})     → void
sessionStop/Leave()           → void
startRouteScan(callback)      → string
stopRouteScan()               → void
addListener('MEDIA_UPDATE'|'SESSION_ENDED'|...) → PluginListenerHandle
```

---

## Limitations connues

| Problème | Sévérité | Détail |
|----------|----------|--------|
| URLs YouTube IP-bound | Résolu (desktop) | Proxy local fetch depuis la bonne IP |
| Mobile : pas de proxy | Faible | L'API backend sert le stream directement au Chromecast |
| Expiration URLs (6h) | Faible | Cache Snowify = 4h |
| Même réseau Wi-Fi requis | Config user | mDNS/Cast SDK nécessitent le même sous-réseau |
| Position polling approximatif | Faible | JS poll ±1s, corrigé par native MEDIA_UPDATE |

---

## Améliorations futures (backlog)

### 1. Queue Chromecast
Envoyer toute la play queue au Chromecast via `queueLoad()`. Le device enchaîne les tracks sans intervention du téléphone (pas de latence entre tracks). Utiliser `queueJumpToItem()` pour skip.

### 2. Mute/Unmute
`setReceiverMuted({ muted: true/false })`. Accrocher au bouton volume de la NowPlayingBar quand en cast.

### 3. Détection de devices en arrière-plan
`startRouteScan()` en background pour scanner périodiquement. Afficher un badge sur l'icône cast quand un Chromecast est détecté sur le réseau (comme YouTube/Spotify).

### 4. Session Leave (garder le cast actif)
`sessionLeave()` déconnecte le téléphone/PC mais le Chromecast continue de jouer. Utile pour fermer l'app sans couper la musique.

### 5. Custom Receiver
Créer une app Cast receiver custom (HTML/CSS/JS hébergé, enregistré sur Google Cast Console) qui affiche l'album art, le titre, l'artiste sur le TV/écran au lieu du receiver par défaut.

### 6. Lyrics sur Chromecast
Via text tracks (`mediaEditTracksInfo`) ou via custom receiver + `sendMessage()` pour pousser les paroles synchronisées sur l'écran du Chromecast.

### 7. DLNA / Smart TVs
Étendre le cast aux Smart TVs via `dlnacasts` (SSDP discovery + UPnP). Desktop only (pas de support natif Capacitor).
