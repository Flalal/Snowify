import { useEffect, useState } from 'preact/hooks';
import { showToast } from '../../../state/ui.js';

export function UpdateSection() {
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle | checking | available | downloading | ready
  const [updateVersion, setUpdateVersion] = useState('');
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
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

  return (
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
          <button className="btn-secondary" onClick={() => window.snowify.installUpdate()}>
            Restart & Update
          </button>
        )}
      </div>
    </div>
  );
}
