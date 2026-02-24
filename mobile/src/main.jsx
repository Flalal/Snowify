// ─── Mobile entry point ───
// Loads the shared renderer but with mobile overrides

import './mobile-overrides.css';

// Import shared renderer styles (same as desktop)
import '@renderer/styles/variables.css';
import '@renderer/styles/global.css';
import '@renderer/styles/titlebar.css';
import '@renderer/styles/sidebar.css';
import '@renderer/styles/nowplaying.css';
import '@renderer/styles/nowplaying-view.css';
import '@renderer/styles/queue.css';
import '@renderer/styles/tracklist.css';
import '@renderer/styles/cards.css';
import '@renderer/styles/search.css';
import '@renderer/styles/context-menu.css';
import '@renderer/styles/playlist.css';
import '@renderer/styles/album.css';
import '@renderer/styles/artist.css';
import '@renderer/styles/explore.css';
import '@renderer/styles/settings.css';
import '@renderer/styles/library.css';
import '@renderer/styles/modal.css';
import '@renderer/styles/playlist-picker.css';
import '@renderer/styles/spotify.css';
import '@renderer/styles/lyrics.css';
import '@renderer/styles/video.css';
import '@renderer/styles/toast.css';
import '@renderer/styles/scroll-arrows.css';
import '@renderer/styles/animations.css';
import '@renderer/styles/quickpicks.css';
import '@renderer/styles/views.css';

// Load state (from localStorage, same as desktop)
import { loadState, saveState, cloudApiUrl, cloudApiKey, cloudUser, cloudAccessToken, cloudRefreshToken, cloudSyncEnabled } from '@state/index.js';
loadState();

// Check auth before rendering
import { isLoggedIn, getApiUrl } from './auth.js';
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

// Mobile media session (Android notification controls)
import { initMediaSession, updateMobileMediaSession, setMobileLiked, registerMobileMediaHandlers } from './media-session.js';
import { initAudioFocus } from './audio-focus.js';
window.__mobileMediaSession = { update: updateMobileMediaSession, setLiked: setMobileLiked };


// Import the main app (shared with desktop)
import { App } from '@components/App.jsx';

// Login screen component for mobile
function MobileLogin({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [apiUrl, setApiUrl] = useState(getApiUrl() || '');
  const [apiKey, setApiKey] = useState(localStorage.getItem('snowify_api_key') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!apiUrl) { setError('API URL is required'); return; }
    setError('');
    setLoading(true);

    localStorage.setItem('snowify_api_url', apiUrl);
    localStorage.setItem('snowify_api_key', apiKey);
    // Re-run adapter config
    await window.snowify.authConfigure({ baseUrl: apiUrl });

    let result;
    if (mode === 'login') {
      result = await window.snowify.authLogin(email, password);
    } else {
      result = await window.snowify.authRegister(username, email, password);
    }

    setLoading(false);
    if (result.ok) {
      // Persist login info into Cloud Sync signals so Settings shows them
      cloudApiUrl.value = apiUrl;
      cloudApiKey.value = apiKey;
      cloudUser.value = result.user;
      cloudAccessToken.value = result.accessToken;
      cloudRefreshToken.value = result.refreshToken;
      cloudSyncEnabled.value = true;
      saveState();

      onLogin(result);
    } else {
      setError(result.error || 'Authentication failed');
    }
  }

  return (
    <div className="mobile-login">
      <h1>Snowify</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
        {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '320px' }}>
        <input
          type="url"
          placeholder="API URL (https://api.snowify.example.com)"
          value={apiUrl}
          onInput={e => setApiUrl(e.currentTarget.value)}
          required
        />
        <input
          type="password"
          placeholder="API Key (optional)"
          value={apiKey}
          onInput={e => setApiKey(e.currentTarget.value)}
        />
        {mode === 'register' && (
          <input
            type="text"
            placeholder="Username"
            value={username}
            onInput={e => setUsername(e.currentTarget.value)}
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onInput={e => setEmail(e.currentTarget.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onInput={e => setPassword(e.currentTarget.value)}
          required
        />
        {error && <span className="error">{error}</span>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>
      <button
        className="btn-link"
        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
      >
        {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign in'}
      </button>
    </div>
  );
}

// Root wrapper: show login if not authenticated, app otherwise
function MobileRoot() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());

  useEffect(() => {
    // Init native media session once the audio element exists
    initMediaSession();
    registerMobileMediaHandlers();
    initAudioFocus();
  }, []);

  if (!loggedIn) {
    return <MobileLogin onLogin={() => setLoggedIn(true)} />;
  }

  return <App />;
}

render(<MobileRoot />, document.getElementById('app'));
