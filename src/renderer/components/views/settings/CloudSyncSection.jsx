import { useState } from 'preact/hooks';
import {
  playlists,
  likedSongs,
  recentTracks,
  volume,
  theme,
  audioQuality,
  cloudSyncEnabled,
  cloudApiUrl,
  cloudApiKey,
  cloudUser,
  cloudAccessToken,
  cloudRefreshToken,
  lastSyncAt,
  saveState
} from '../../../state/index.js';
import { showToast } from '../../../state/ui.js';

export function CloudSyncSection() {
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | done | error
  const [authMode, setAuthMode] = useState(null); // null | 'login' | 'register'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authError, setAuthError] = useState('');

  function handleApiUrlChange(e) {
    cloudApiUrl.value = e.currentTarget.value;
    saveState();
  }

  function handleApiKeyChange(e) {
    cloudApiKey.value = e.currentTarget.value;
    window.snowify.authSaveTokens({
      accessToken: cloudAccessToken.value,
      refreshToken: cloudRefreshToken.value,
      apiKey: cloudApiKey.value
    });
  }

  async function handleSyncToggle(e) {
    cloudSyncEnabled.value = e.currentTarget.checked;
    saveState();
    if (cloudSyncEnabled.value && cloudApiUrl.value && cloudAccessToken.value) {
      await window.snowify.authConfigure({
        baseUrl: cloudApiUrl.value,
        accessToken: cloudAccessToken.value,
        refreshToken: cloudRefreshToken.value,
        apiKey: cloudApiKey.value
      });
    }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthError('');
    if (!cloudApiUrl.value) {
      setAuthError('Please set API URL first');
      return;
    }

    await window.snowify.authConfigure({
      baseUrl: cloudApiUrl.value,
      accessToken: '',
      refreshToken: '',
      apiKey: cloudApiKey.value
    });

    let result;
    if (authMode === 'login') {
      result = await window.snowify.authLogin(authEmail, authPassword);
    } else {
      result = await window.snowify.authRegister(authUsername, authEmail, authPassword);
    }

    if (result.ok) {
      cloudUser.value = result.user;
      cloudAccessToken.value = result.accessToken;
      cloudRefreshToken.value = result.refreshToken;
      cloudSyncEnabled.value = true;
      window.snowify.authSaveTokens({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        apiKey: cloudApiKey.value
      });
      saveState();
      setAuthMode(null);
      setAuthEmail('');
      setAuthPassword('');
      setAuthUsername('');
      showToast('Logged in as ' + result.user.username);
    } else {
      setAuthError(result.error || 'Auth failed');
    }
  }

  async function handleLogout() {
    await window.snowify.authLogout();
    cloudUser.value = null;
    cloudAccessToken.value = '';
    cloudRefreshToken.value = '';
    cloudSyncEnabled.value = false;
    lastSyncAt.value = '';
    window.snowify.authClearTokens();
    saveState();
    showToast('Logged out');
  }

  async function configureAuth() {
    await window.snowify.authConfigure({
      baseUrl: cloudApiUrl.value,
      accessToken: cloudAccessToken.value,
      refreshToken: cloudRefreshToken.value,
      apiKey: cloudApiKey.value
    });
  }

  async function handleSyncNow() {
    if (!cloudAccessToken.value || !cloudApiUrl.value) return;
    setSyncStatus('syncing');
    try {
      await configureAuth();

      // Push local state
      const localState = {
        playlists: playlists.value,
        likedSongs: likedSongs.value,
        recentTracks: recentTracks.value,
        settings: { volume: volume.value, theme: theme.value, audioQuality: audioQuality.value }
      };
      const pushResult = await window.snowify.syncPush(localState);

      // Pull remote changes
      const pullResult = await window.snowify.syncPull();
      if (!pullResult.ok) throw new Error(pullResult.error || 'Pull failed');
      if (pullResult.data) {
        const merged = await window.snowify.syncMerge(
          {
            playlists: playlists.value,
            likedSongs: likedSongs.value,
            recentTracks: recentTracks.value
          },
          pullResult.data
        );
        playlists.value = merged.playlists;
        likedSongs.value = merged.likedSongs;
        recentTracks.value = merged.recentTracks;
      }
      lastSyncAt.value =
        (pullResult.data && pullResult.data.syncTimestamp) ||
        pushResult.syncTimestamp ||
        new Date().toISOString();
      saveState();
      setSyncStatus('done');
      showToast('Sync complete');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err) {
      setSyncStatus('error');
      showToast('Sync failed: ' + err.message);
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }

  async function handleSyncPullOnly() {
    if (!cloudAccessToken.value || !cloudApiUrl.value) return;
    setSyncStatus('syncing');
    try {
      await configureAuth();
      const pullResult = await window.snowify.syncPull();
      if (!pullResult.ok) throw new Error(pullResult.error || 'Pull failed');
      if (pullResult.data) {
        const merged = await window.snowify.syncMerge(
          {
            playlists: playlists.value,
            likedSongs: likedSongs.value,
            recentTracks: recentTracks.value
          },
          pullResult.data
        );
        playlists.value = merged.playlists;
        likedSongs.value = merged.likedSongs;
        recentTracks.value = merged.recentTracks;
        lastSyncAt.value = pullResult.data.syncTimestamp;
        saveState();
      }
      setSyncStatus('done');
      showToast('Pull complete');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err) {
      setSyncStatus('error');
      showToast('Pull failed: ' + err.message);
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }

  return (
    <div className="settings-section">
      <h2>Cloud Sync</h2>
      <div className="settings-row">
        <label htmlFor="setting-api-url">API URL</label>
        <input
          id="setting-api-url"
          type="text"
          className="settings-input"
          placeholder="https://api.snowify.example.com"
          value={cloudApiUrl.value}
          onInput={handleApiUrlChange}
        />
      </div>
      <div className="settings-row">
        <label htmlFor="setting-api-key">API Key</label>
        <input
          id="setting-api-key"
          type="password"
          className="settings-input"
          placeholder="Optional"
          value={cloudApiKey.value}
          onInput={handleApiKeyChange}
        />
      </div>

      {cloudUser.value ? (
        <>
          <div className="settings-row">
            <label>Account</label>
            <span>
              {cloudUser.value.username} ({cloudUser.value.email})
            </span>
          </div>
          <div className="settings-row">
            <label htmlFor="setting-sync-enabled">Enable sync</label>
            <input
              id="setting-sync-enabled"
              type="checkbox"
              className="settings-toggle"
              checked={cloudSyncEnabled.value}
              onChange={handleSyncToggle}
            />
          </div>
          {lastSyncAt.value && (
            <div className="settings-row">
              <label>Last sync</label>
              <span>{new Date(lastSyncAt.value).toLocaleString()}</span>
            </div>
          )}
          <div className="settings-row" style={{ gap: '8px' }}>
            <button
              className="btn-secondary"
              onClick={handleSyncNow}
              disabled={syncStatus === 'syncing'}
            >
              {syncStatus === 'syncing'
                ? 'Syncing...'
                : syncStatus === 'done'
                  ? 'Done!'
                  : 'Sync now'}
            </button>
            <button
              className="btn-secondary"
              onClick={handleSyncPullOnly}
              disabled={syncStatus === 'syncing'}
            >
              {syncStatus === 'syncing' ? 'Pulling...' : 'Pull'}
            </button>
            <button
              className="btn-secondary"
              style={{ color: 'var(--red)' }}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </>
      ) : (
        <>
          {!authMode ? (
            <div className="settings-row" style={{ gap: '8px' }}>
              <button className="btn-secondary" onClick={() => setAuthMode('login')}>
                Login
              </button>
              <button className="btn-secondary" onClick={() => setAuthMode('register')}>
                Register
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleAuthSubmit}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '0 16px 8px'
              }}
            >
              {authMode === 'register' && (
                <input
                  type="text"
                  className="settings-input"
                  placeholder="Username"
                  value={authUsername}
                  onInput={(e) => setAuthUsername(e.currentTarget.value)}
                  required
                />
              )}
              <input
                type="email"
                className="settings-input"
                placeholder="Email"
                value={authEmail}
                onInput={(e) => setAuthEmail(e.currentTarget.value)}
                required
              />
              <input
                type="password"
                className="settings-input"
                placeholder="Password"
                value={authPassword}
                onInput={(e) => setAuthPassword(e.currentTarget.value)}
                required
              />
              {authError && (
                <span style={{ color: 'var(--red)', fontSize: '13px' }}>{authError}</span>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn-secondary">
                  {authMode === 'login' ? 'Login' : 'Register'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setAuthMode(null);
                    setAuthError('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
