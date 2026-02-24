import { useState, useEffect } from 'preact/hooks';
import {
  volume,
  discordRpc,
  theme,
  animations,
  effects,
  country,
  cloudAccessToken,
  cloudRefreshToken,
  cloudApiKey,
  saveStateNow,
  loadState
} from '../state/index.js';
import { showToast } from '../state/ui.js';
import { api } from '../services/api.js';
import { VOLUME_SCALE } from '../../shared/constants.js';
import { applyThemeToDOM } from '../utils/applyThemeToDOM.js';

export function useAppInit(getAudio) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    loadState();

    // ─── Migrate tokens from localStorage to secure store ───
    try {
      const saved = JSON.parse(localStorage.getItem('snowify_state') || '{}');
      if (saved.cloudAccessToken || saved.cloudRefreshToken || saved.cloudApiKey) {
        window.snowify.authSaveTokens({
          accessToken: saved.cloudAccessToken || '',
          refreshToken: saved.cloudRefreshToken || '',
          apiKey: saved.cloudApiKey || ''
        });
        // Purge tokens from localStorage (they've been removed from PERSISTENT_KEYS,
        // so next saveStateNow() will drop them)
        saveStateNow();
      }
    } catch (_) {
      /* migration is best-effort */
    }

    // ─── Load tokens from secure store ───
    window.snowify.authLoadTokens().then((tokens) => {
      if (tokens.accessToken) cloudAccessToken.value = tokens.accessToken;
      if (tokens.refreshToken) cloudRefreshToken.value = tokens.refreshToken;
      if (tokens.apiKey) cloudApiKey.value = tokens.apiKey;
    });

    const audio = getAudio();
    if (audio) audio.volume = volume.value * VOLUME_SCALE;
    if (discordRpc.value) window.snowify.connectDiscord();
    applyThemeToDOM(theme.value);
    document.documentElement.classList.toggle('no-animations', !animations.value);
    document.documentElement.classList.toggle('no-effects', !effects.value);
    if (country.value) api.setCountry(country.value);
    window.snowify.onYtMusicInitError?.(() => {
      showToast('Music service failed to initialize — restart the app');
    });
    window.snowify.onTokensUpdated?.((tokens) => {
      cloudAccessToken.value = tokens.accessToken;
      cloudRefreshToken.value = tokens.refreshToken;
      // Save refreshed tokens to secure store (main process also does this,
      // but belt-and-suspenders for token rotation)
      window.snowify.authSaveTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        apiKey: cloudApiKey.value
      });
    });
    setInitialized(true);

    const flushState = () => saveStateNow();
    window.addEventListener('beforeunload', flushState);
    return () => window.removeEventListener('beforeunload', flushState);
  }, []);

  return initialized;
}
