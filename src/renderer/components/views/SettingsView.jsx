import { useEffect, useState } from 'preact/hooks';
import {
  autoplay, audioQuality, videoQuality, videoPremuxed,
  animations, effects, theme, discordRpc, country, volume,
  recentTracks, playlists, likedSongs, saveState,
  isPlaying, queue, queueIndex,
  cloudSyncEnabled, cloudApiUrl, cloudApiKey, cloudUser,
  cloudAccessToken, cloudRefreshToken, lastSyncAt
} from '../../state/index.js';
import { showToast } from '../shared/Toast.jsx';
import { invalidateExploreCache } from './ExploreView.jsx';

function applyThemeToDOM(themeName) {
  if (themeName === 'dark') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', themeName);
  }
}

/**
 * SettingsView - Playback, video, appearance, and data settings.
 *
 * Props:
 *   onRenderHome - callback() to re-render home after clearing history
 */
export function SettingsView({ onRenderHome }) {
  // ── Auto-update state ──
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle | checking | available | downloading | ready
  const [updateVersion, setUpdateVersion] = useState('');
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [appVersion, setAppVersion] = useState('');

  // ── Cloud Sync state ──
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | done | error
  const [authMode, setAuthMode] = useState(null); // null | 'login' | 'register'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authError, setAuthError] = useState('');

  // Apply theme on mount + listen for update events
  useEffect(() => {
    applyThemeToDOM(theme.value);
    document.documentElement.classList.toggle('no-animations', !animations.value);
    document.documentElement.classList.toggle('no-effects', !effects.value);
    if (country.value) window.snowify.setCountry(country.value);

    window.snowify.getAppVersion().then((v) => setAppVersion(v));

    window.snowify.onUpdateAvailable((info) => {
      setUpdateVersion(info.version);
      setUpdateStatus('available');
    });
    window.snowify.onUpdateNotAvailable(() => {
      setUpdateStatus('idle');
    });
    window.snowify.onDownloadProgress((info) => {
      setDownloadPercent(Math.round(info.percent));
    });
    window.snowify.onUpdateDownloaded(() => {
      setUpdateStatus('ready');
    });
    window.snowify.onUpdateError((info) => {
      setUpdateStatus('available');
      showToast('Update error: ' + info.message);
    });

    return () => {
      window.snowify.removeUpdateListeners();
    };
  }, []);

  // ── Settings change handlers ──
  function handleAutoplayChange(e) {
    autoplay.value = e.currentTarget.checked;
    saveState();
  }

  async function handleDiscordRpcChange(e) {
    const checked = e.currentTarget.checked;
    discordRpc.value = checked;
    saveState();
    if (checked) {
      const ok = await window.snowify.connectDiscord();
      if (!ok) {
        showToast('Could not connect to Discord -- is it running?');
        discordRpc.value = false;
        saveState();
        return;
      }
      const track = queue.value[queueIndex.value];
      if (track && isPlaying.value) {
        window.snowify.updatePresence({
          title: track.title,
          artist: track.artist,
          thumbnail: track.thumbnail || '',
          startTimestamp: Date.now()
        });
      }
    } else {
      window.snowify.clearPresence();
      window.snowify.disconnectDiscord();
    }
  }

  function handleAudioQualityChange(e) {
    audioQuality.value = e.currentTarget.value;
    saveState();
  }

  function handleVideoQualityChange(e) {
    videoQuality.value = e.currentTarget.value;
    saveState();
  }

  function handleVideoPremuxedChange(e) {
    videoPremuxed.value = e.currentTarget.checked;
    saveState();
  }

  function handleAnimationsChange(e) {
    animations.value = e.currentTarget.checked;
    document.documentElement.classList.toggle('no-animations', !animations.value);
    saveState();
  }

  function handleEffectsChange(e) {
    effects.value = e.currentTarget.checked;
    document.documentElement.classList.toggle('no-effects', !effects.value);
    saveState();
  }

  function handleThemeChange(e) {
    theme.value = e.currentTarget.value;
    applyThemeToDOM(theme.value);
    saveState();
  }

  function handleCountryChange(e) {
    country.value = e.currentTarget.value;
    window.snowify.setCountry(country.value);
    invalidateExploreCache();
    saveState();
    if (country.value) {
      const select = e.currentTarget;
      const text = select.options[select.selectedIndex].text;
      showToast(`Explore region set to ${text}`);
    } else {
      showToast('Explore region cleared');
    }
  }

  function handleClearHistory() {
    if (confirm('Clear play history?')) {
      recentTracks.value = [];
      saveState();
      if (onRenderHome) onRenderHome();
      showToast('Play history cleared');
    }
  }

  async function handleCheckForUpdates() {
    setUpdateStatus('checking');
    try {
      await window.snowify.checkForUpdates();
    } catch {
      setUpdateStatus('idle');
    }
  }

  async function handleDownloadUpdate() {
    setUpdateStatus('downloading');
    setDownloadPercent(0);
    try {
      await window.snowify.downloadUpdate();
    } catch (err) {
      setUpdateStatus('available');
      showToast('Download failed: ' + (err?.message || 'unknown error'));
    }
  }

  function handleInstallUpdate() {
    window.snowify.installUpdate();
  }

  function handleResetAll() {
    if (confirm('Reset ALL data? This will delete all playlists, liked songs, and settings.')) {
      localStorage.removeItem('snowify_state');
      location.reload();
    }
  }

  // ── Cloud Sync handlers ──
  function handleApiUrlChange(e) {
    cloudApiUrl.value = e.currentTarget.value;
    saveState();
  }

  function handleApiKeyChange(e) {
    cloudApiKey.value = e.currentTarget.value;
    saveState();
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
    if (!cloudApiUrl.value) { setAuthError('Please set API URL first'); return; }

    await window.snowify.authConfigure({ baseUrl: cloudApiUrl.value, accessToken: '', refreshToken: '', apiKey: cloudApiKey.value });

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
    saveState();
    showToast('Logged out');
  }

  async function handleSyncNow() {
    if (!cloudAccessToken.value || !cloudApiUrl.value) return;
    setSyncStatus('syncing');
    try {
      await window.snowify.authConfigure({
        baseUrl: cloudApiUrl.value,
        accessToken: cloudAccessToken.value,
        refreshToken: cloudRefreshToken.value,
        apiKey: cloudApiKey.value
      });

      // Push local state
      const localState = {
        playlists: playlists.value,
        likedSongs: likedSongs.value,
        recentTracks: recentTracks.value,
        settings: { volume: volume.value, theme: theme.value, audioQuality: audioQuality.value }
      };
      await window.snowify.syncPush(localState);

      // Pull remote changes
      const pullResult = await window.snowify.syncPull();
      if (pullResult.ok && pullResult.data) {
        const merged = await window.snowify.syncMerge(
          { playlists: playlists.value, likedSongs: likedSongs.value, recentTracks: recentTracks.value },
          pullResult.data
        );
        playlists.value = merged.playlists;
        likedSongs.value = merged.likedSongs;
        recentTracks.value = merged.recentTracks;
        lastSyncAt.value = pullResult.data.syncTimestamp;
        saveState();
      }
      setSyncStatus('done');
      showToast('Sync complete');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err) {
      setSyncStatus('error');
      showToast('Sync failed: ' + err.message);
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }

  return (
    <div className="settings-content">
      {/* ── Updates ── */}
      <div className="settings-section">
        <h2>Updates</h2>
        <div className="settings-row">
          <label>Current version</label>
          <span>Snowify {appVersion ? `v${appVersion}` : '...'}</span>
        </div>
        <div className="settings-row">
          {updateStatus === 'idle' && (
            <button className="btn-secondary" onClick={handleCheckForUpdates}>
              Check for updates
            </button>
          )}
          {updateStatus === 'checking' && (
            <span>Checking for updates...</span>
          )}
          {updateStatus === 'available' && (
            <>
              <span>v{updateVersion} available</span>
              <button className="btn-secondary" onClick={handleDownloadUpdate}>
                Download
              </button>
            </>
          )}
          {updateStatus === 'downloading' && (
            <span>Downloading... {downloadPercent}%</span>
          )}
          {updateStatus === 'ready' && (
            <button className="btn-secondary" onClick={handleInstallUpdate}>
              Restart & Update
            </button>
          )}
        </div>
      </div>

      {/* ── Country ── */}
      <div className="settings-section">
        <h2>Region</h2>
        <div className="settings-row">
          <label htmlFor="setting-country">Country</label>
          <select
            id="setting-country"
            className="settings-select"
            value={country.value || ''}
            onChange={handleCountryChange}
          >
            <option value="">Auto-detect</option>
            <option value="US">United States</option>
            <option value="GB">United Kingdom</option>
            <option value="CA">Canada</option>
            <option value="AU">Australia</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="JP">Japan</option>
            <option value="KR">South Korea</option>
            <option value="BR">Brazil</option>
            <option value="MX">Mexico</option>
            <option value="IN">India</option>
            <option value="ES">Spain</option>
            <option value="IT">Italy</option>
            <option value="NL">Netherlands</option>
            <option value="SE">Sweden</option>
            <option value="NO">Norway</option>
            <option value="DK">Denmark</option>
            <option value="FI">Finland</option>
            <option value="PL">Poland</option>
            <option value="RU">Russia</option>
            <option value="TR">Turkey</option>
            <option value="ID">Indonesia</option>
            <option value="PH">Philippines</option>
            <option value="TH">Thailand</option>
            <option value="VN">Vietnam</option>
            <option value="ZA">South Africa</option>
            <option value="NG">Nigeria</option>
            <option value="EG">Egypt</option>
            <option value="AR">Argentina</option>
            <option value="CL">Chile</option>
            <option value="CO">Colombia</option>
            <option value="PE">Peru</option>
          </select>
        </div>
      </div>

      {/* ── Playback Settings ── */}
      <div className="settings-section">
        <h2>Playback</h2>
        <div className="settings-row">
          <label htmlFor="setting-autoplay">Autoplay similar songs</label>
          <input
            id="setting-autoplay"
            type="checkbox"
            className="settings-toggle"
            checked={autoplay.value}
            onChange={handleAutoplayChange}
          />
        </div>
        <div className="settings-row">
          <label htmlFor="setting-discord-rpc">Discord Rich Presence</label>
          <input
            id="setting-discord-rpc"
            type="checkbox"
            className="settings-toggle"
            checked={discordRpc.value}
            onChange={handleDiscordRpcChange}
          />
        </div>
        <div className="settings-row">
          <label htmlFor="setting-quality">Audio quality</label>
          <select
            id="setting-quality"
            className="settings-select"
            value={audioQuality.value}
            onChange={handleAudioQualityChange}
          >
            <option value="bestaudio">Best</option>
            <option value="worstaudio">Low (save data)</option>
          </select>
        </div>
      </div>

      {/* ── Video Settings ── */}
      <div className="settings-section">
        <h2>Video</h2>
        <div className="settings-row">
          <label htmlFor="setting-video-quality">Video quality</label>
          <select
            id="setting-video-quality"
            className="settings-select"
            value={videoQuality.value}
            onChange={handleVideoQualityChange}
            disabled={videoPremuxed.value}
          >
            <option value="360">360p</option>
            <option value="480">480p</option>
            <option value="720">720p</option>
            <option value="1080">1080p</option>
          </select>
        </div>
        <div className="settings-row">
          <label htmlFor="setting-video-premuxed">Use premuxed streams (faster, lower quality)</label>
          <input
            id="setting-video-premuxed"
            type="checkbox"
            className="settings-toggle"
            checked={videoPremuxed.value}
            onChange={handleVideoPremuxedChange}
          />
        </div>
      </div>

      {/* ── Appearance Settings ── */}
      <div className="settings-section">
        <h2>Appearance</h2>
        <div className="settings-row">
          <label htmlFor="theme-select">Theme</label>
          <select
            id="theme-select"
            className="settings-select"
            value={theme.value}
            onChange={handleThemeChange}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="midnight">Midnight</option>
            <option value="catppuccin">Catppuccin</option>
            <option value="nord">Nord</option>
            <option value="dracula">Dracula</option>
            <option value="gruvbox">Gruvbox</option>
            <option value="solarized">Solarized</option>
            <option value="rosepine">Rose Pine</option>
          </select>
        </div>
        <div className="settings-row">
          <label htmlFor="setting-animations">Animations</label>
          <input
            id="setting-animations"
            type="checkbox"
            className="settings-toggle"
            checked={animations.value}
            onChange={handleAnimationsChange}
          />
        </div>
        <div className="settings-row">
          <label htmlFor="setting-effects">Visual effects</label>
          <input
            id="setting-effects"
            type="checkbox"
            className="settings-toggle"
            checked={effects.value}
            onChange={handleEffectsChange}
          />
        </div>
      </div>

      {/* ── Cloud Sync ── */}
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
            style={{ width: '280px' }}
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
            style={{ width: '280px' }}
          />
        </div>

        {cloudUser.value ? (
          <>
            <div className="settings-row">
              <label>Account</label>
              <span>{cloudUser.value.username} ({cloudUser.value.email})</span>
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
                {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'done' ? 'Done!' : 'Sync now'}
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
                <button className="btn-secondary" onClick={() => setAuthMode('login')}>Login</button>
                <button className="btn-secondary" onClick={() => setAuthMode('register')}>Register</button>
              </div>
            ) : (
              <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px 8px' }}>
                {authMode === 'register' && (
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="Username"
                    value={authUsername}
                    onInput={e => setAuthUsername(e.currentTarget.value)}
                    required
                  />
                )}
                <input
                  type="email"
                  className="settings-input"
                  placeholder="Email"
                  value={authEmail}
                  onInput={e => setAuthEmail(e.currentTarget.value)}
                  required
                />
                <input
                  type="password"
                  className="settings-input"
                  placeholder="Password"
                  value={authPassword}
                  onInput={e => setAuthPassword(e.currentTarget.value)}
                  required
                />
                {authError && <span style={{ color: 'var(--red)', fontSize: '13px' }}>{authError}</span>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn-secondary">
                    {authMode === 'login' ? 'Login' : 'Register'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => { setAuthMode(null); setAuthError(''); }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      {/* ── Data Section ── */}
      <div className="settings-section">
        <h2>Data</h2>
        <div className="settings-row">
          <button id="setting-clear-history" className="btn-secondary" onClick={handleClearHistory}>
            Clear play history
          </button>
        </div>
        <div className="settings-row">
          <button
            id="setting-reset-all"
            className="btn-secondary"
            style={{ color: 'var(--red)' }}
            onClick={handleResetAll}
          >
            Reset all data
          </button>
        </div>
      </div>
    </div>
  );
}
