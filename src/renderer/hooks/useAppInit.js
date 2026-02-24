import { useState, useEffect } from 'preact/hooks';
import {
  volume, discordRpc, theme, animations, effects, country,
  cloudAccessToken, cloudRefreshToken, saveState, saveStateNow, loadState
} from '../state/index.js';
import { showToast } from '../state/ui.js';
import { api } from '../services/api.js';
import { VOLUME_SCALE } from '../../shared/constants.js';

function applyThemeToDOM(themeName) {
  if (themeName === 'dark') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', themeName);
  }
}

export function useAppInit(getAudio) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    loadState();

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
      saveState();
    });
    setInitialized(true);

    const flushState = () => saveStateNow();
    window.addEventListener('beforeunload', flushState);
    return () => window.removeEventListener('beforeunload', flushState);
  }, []);

  return initialized;
}
