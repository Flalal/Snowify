# Casting — Chromecast / DLNA / Google Home

## Objectif

Permettre de streamer la musique depuis Snowify vers des appareils externes (Google Home, Chromecast, Smart TVs) sur le réseau local.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ELECTRON MAIN PROCESS                 │
│                                                          │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ yt-dlp   │  │ Cast Manager │  │ Local Proxy Server │  │
│  │ stream.js│──│ cast.js      │──│ castProxy.js       │  │
│  └──────────┘  │ - discovery  │  │ (http, port 45100) │  │
│                │ - chromecast │  │ - pipe yt-dlp URL  │  │
│                │ - DLNA       │  │ - headers/cookies  │  │
│                └──────────────┘  │ - range requests   │  │
│                       │          └───────────────────┘   │
│                       │ IPC                              │
├───────────────────────┼──────────────────────────────────┤
│  RENDERER             │                                  │
│  ┌────────────────────┴──┐                               │
│  │ Cast UI               │                               │
│  │ - device picker       │                               │
│  │ - casting indicator   │                               │
│  │ - redirected controls │                               │
│  └───────────────────────┘                               │
└──────────────────────────────────────────────────────────┘
                            │  LAN
              ┌─────────────┴──────────────┐
              │   Google Home / Chromecast  │
              │   ou Smart TV (DLNA)        │
              │   fetch audio depuis proxy  │
              └────────────────────────────┘
```

---

## Pourquoi un proxy local ?

Les URLs yt-dlp (`googlevideo.com`) sont **liées à l'IP** du demandeur. Le Chromecast fait sa propre requête HTTP depuis une IP locale différente — ça peut échouer. Le proxy local résout ce problème :

1. Snowify extrait l'URL via yt-dlp (comme aujourd'hui)
2. Un serveur HTTP local sert le flux au Chromecast
3. Le proxy fetch YouTube avec les bons headers depuis la machine Snowify
4. Le Chromecast accède à `http://192.168.x.x:45100/stream`

~100-150 lignes de code (`http.createServer` dans le main process).

---

## Librairies

| Lib | Rôle | npm | Notes |
|-----|------|-----|-------|
| `chromecast-api` | Découverte mDNS + cast Chromecast | `^0.4.2` | Wrapper haut-niveau, inclut discovery. 158 stars |
| `dlnacasts` | Découverte SSDP + cast DLNA/UPnP | `^0.1.0` | Pour Smart TVs (Samsung, LG, Sony) |
| `castv2-client` | Protocole CASTv2 bas-niveau | dep de chromecast-api | Alternative si plus de contrôle nécessaire |

**Pas de deps natives** — les deux libs sont pure JS (mDNS/SSDP intégrés).

### Formats audio supportés par Chromecast/Google Home

MP3, AAC (HE/LC), Opus, Vorbis, FLAC, WAV, WebM — tous compatibles avec ce que yt-dlp extrait.

---

## Fichiers à créer/modifier

### Nouveaux fichiers

| # | Fichier | Rôle |
|---|---------|------|
| 1 | `src/main/services/cast.js` | Service de découverte et contrôle (Chromecast + DLNA) |
| 2 | `src/main/services/castProxy.js` | Serveur HTTP local proxy pour les streams audio |
| 3 | `src/main/ipc/cast.handlers.js` | IPC handlers : discover, cast, pause, stop, volume, status |
| 4 | `src/renderer/components/shared/CastPicker.jsx` | Modal de sélection d'appareil |
| 5 | `src/renderer/styles/cast.css` | Styles du picker + indicateur casting |

### Fichiers existants à modifier

| # | Fichier | Modification |
|---|---------|-------------|
| 6 | `src/preload/index.js` | Ajouter les méthodes cast (`castDiscover`, `castPlay`, `castPause`, `castStop`, `castVolume`) |
| 7 | `src/main/index.js` | Importer et register `cast.handlers.js` |
| 8 | `src/renderer/components/NowPlayingBar/PlaybackControls.jsx` | Ajouter bouton cast (icône) |
| 9 | `src/renderer/hooks/usePlayback.js` ou nouveau `useCast.js` | Hook pour gérer l'état casting (mute local, redirect controls) |
| 10 | `src/renderer/state/ui.js` | Signaux : `isCasting`, `castDevice`, `castPickerVisible` |

---

## Implémentation détaillée

### 1. `cast.js` — Service de découverte

```js
// Pseudo-code
import ChromecastAPI from 'chromecast-api';
import dlnacasts from 'dlnacasts';

const chromecastBrowser = new ChromecastAPI();
const dlnaBrowser = dlnacasts();

// Écouter les appareils détectés
chromecastBrowser.on('device', device => { ... });
dlnaBrowser.on('update', device => { ... });

// API exposée
export function discoverDevices() { ... }
export function castToDevice(deviceId, streamUrl, metadata) { ... }
export function pauseCast() { ... }
export function stopCast() { ... }
export function setCastVolume(level) { ... }
export function getCastStatus() { ... }
```

### 2. `castProxy.js` — Serveur HTTP local

```js
// Pseudo-code
import http from 'http';
import https from 'https';

let server = null;
let currentStreamUrl = null;

export function startProxy(ytStreamUrl, port = 45100) {
  currentStreamUrl = ytStreamUrl;
  server = http.createServer((req, res) => {
    // Proxy la requête vers YouTube avec les bons headers
    const proxyReq = https.get(currentStreamUrl, {
      headers: { Range: req.headers.range || '' }
    });
    proxyReq.on('response', (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'],
        'Content-Length': proxyRes.headers['content-length'],
        'Content-Range': proxyRes.headers['content-range'],
        'Accept-Ranges': 'bytes'
      });
      proxyRes.pipe(res);
    });
  });
  server.listen(port);
  return `http://${getLocalIP()}:${port}/stream`;
}

export function stopProxy() { ... }
export function updateStreamUrl(newUrl) { ... }
```

### 3. IPC handlers

```js
// cast.handlers.js — channels
'cast:discover'     // → [{ id, name, type: 'chromecast'|'dlna' }]
'cast:play'         // (deviceId, trackInfo) → void
'cast:pause'        // → void
'cast:stop'         // → void
'cast:volume'       // (level: 0-1) → void
'cast:status'       // → { state, currentTime, duration }
```

### 4. Cast UI — Comportement

- **Bouton cast** dans `PlaybackControls.jsx` (icône screencast, grisé si aucun appareil)
- **Au clic** → ouvre `CastPicker` modal avec la liste des appareils découverts
- **Pendant le casting** :
  - L'`<audio>` local est muté (pas pausé, pour garder le tracking de position)
  - Les contrôles play/pause/next/prev envoient des commandes IPC cast au lieu du local
  - Un indicateur "Casting to [Device]" s'affiche dans la NowPlayingBar
  - Le volume slider contrôle le volume du cast
- **Stop cast** → unmute local, reprendre la lecture locale à la position actuelle

### 5. Gestion du changement de piste

Quand `playTrack()` est appelé pendant un casting actif :
1. yt-dlp extrait la nouvelle URL
2. `castProxy.js` met à jour l'URL stream
3. `cast.js` envoie `media.load()` avec la nouvelle URL proxy au device
4. Les métadonnées (titre, artiste, thumbnail) sont envoyées au device pour l'affichage

---

## Limitations connues

| Problème | Sévérité | Détail |
|----------|----------|--------|
| **URLs YouTube IP-bound** | Résolu | Le proxy local fetch depuis la bonne IP |
| **Expiration URLs (6h)** | Faible | Cache Snowify = 4h, dans les limites. Re-extraire si nécessaire |
| **DRM Widevine** | Faible (pour l'instant) | YouTube teste le DRM sur les clients TV, pas encore sur le client web utilisé par yt-dlp |
| **Segmentation réseau** | Config user | Le PC et le Chromecast doivent être sur le même sous-réseau (mDNS/SSDP bloqués par les VLANs IoT) |
| **Libs peu maintenues** | Moyen | `castv2-client` date de ~9 ans mais le protocole CASTv2 n'a pas changé. Fork `@cast-web/client` disponible si besoin |
| **Sync playback controls** | Moyen | Nécessite un "casting mode" qui redirige tous les contrôles vers le device cast |
| **YouTube SABR** | Moyen | YouTube migre vers SABR pour certains clients. `--get-url` de yt-dlp fonctionne encore mais à surveiller |

---

## Ordre d'implémentation suggéré

1. **Proxy local** (`castProxy.js`) — le fondement, testable indépendamment
2. **Chromecast** (`cast.js` + `chromecast-api`) — le cas d'usage principal
3. **IPC + preload** — connecter main ↔ renderer
4. **UI** — bouton cast + device picker + indicateur
5. **Casting mode** — mute local, redirect controls
6. **Gestion piste suivante** — auto-update proxy + reload cast
7. **DLNA** (`dlnacasts`) — étendre aux Smart TVs
8. **Volume cast** — slider dans l'UI
9. **Tests** — mock devices, test proxy, test IPC
