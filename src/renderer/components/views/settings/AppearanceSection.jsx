import { animations, effects, theme, saveState } from '../../../state/index.js';
import { applyThemeToDOM } from '../../../utils/applyThemeToDOM.js';

export function AppearanceSection() {
  function handleThemeChange(e) {
    theme.value = e.currentTarget.value;
    applyThemeToDOM(theme.value);
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

  return (
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
          <option value="system">System</option>
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
  );
}
