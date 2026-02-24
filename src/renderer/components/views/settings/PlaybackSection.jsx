import {
  autoplay, audioQuality, videoQuality, videoPremuxed,
  discordRpc, country, isPlaying, queue, queueIndex, saveState
} from '../../../state/index.js';
import { showToast } from '../../../state/ui.js';
import { invalidateExploreCache } from '../ExploreView.jsx';

export function PlaybackSection() {
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

  return (
    <>
      {/* ── Region ── */}
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

      {/* ── Playback ── */}
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

      {/* ── Video ── */}
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
    </>
  );
}
