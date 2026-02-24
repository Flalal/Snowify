import { recentTracks, saveState } from '../../state/index.js';
import { showToast } from '../../state/ui.js';
import { UpdateSection } from './settings/UpdateSection.jsx';
import { PlaybackSection } from './settings/PlaybackSection.jsx';
import { AppearanceSection } from './settings/AppearanceSection.jsx';
import { CloudSyncSection } from './settings/CloudSyncSection.jsx';

export function SettingsView() {
  function handleClearHistory() {
    if (confirm('Clear play history?')) {
      recentTracks.value = [];
      saveState();
      showToast('Play history cleared');
    }
  }

  function handleResetAll() {
    if (confirm('Reset ALL data? This will delete all playlists, liked songs, and settings.')) {
      localStorage.removeItem('snowify_state');
      location.reload();
    }
  }

  return (
    <div className="settings-content">
      <UpdateSection />
      <PlaybackSection />
      <AppearanceSection />
      <CloudSyncSection />

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
