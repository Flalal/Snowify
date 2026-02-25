// ─── Cast Device Picker Modal ───

import { useEffect, useRef, useState } from 'preact/hooks';
import {
  isCasting,
  castDevice,
  castDevices,
  castPickerVisible
} from '../../state/ui.js';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';

export function CastPicker({ onDiscover, onConnect, onDisconnect }) {
  const visible = castPickerVisible.value;
  const devices = castDevices.value;
  const connected = isCasting.value;
  const currentDevice = castDevice.value;
  const [discovering, setDiscovering] = useState(false);
  const panelRef = useRef(null);

  useFocusTrap(panelRef, visible);

  useEffect(() => {
    if (!visible) return;

    // On mobile (Capacitor), use native Cast dialog instead of manual discovery
    if (window.Capacitor?.isNativePlatform?.()) {
      castPickerVisible.value = false;
      if (!isCasting.value) {
        // Not casting: trigger native picker to connect
        onConnect(null);
      } else {
        // Already casting: trigger native dialog (shows "Stop Casting")
        onDisconnect();
      }
      return;
    }

    // Desktop: manual discovery
    setDiscovering(true);
    onDiscover();
    // Discovery is progressive — show spinner for 5s then stop
    const timer = setTimeout(() => setDiscovering(false), 5000);
    return () => clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e) => {
      if (e.key === 'Escape') castPickerVisible.value = false;
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible]);

  if (!visible) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) castPickerVisible.value = false;
  };

  return (
    <div className="cast-picker-overlay" onClick={handleOverlayClick}>
      <div className="cast-picker" ref={panelRef} role="dialog" aria-label="Cast to device">
        <div className="cast-picker-header">
          <h3>Cast to device</h3>
          <button
            className="icon-btn"
            onClick={() => { castPickerVisible.value = false; }}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {connected && currentDevice && (
          <div className="cast-device-item connected">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
              <line x1="2" y1="20" x2="2.01" y2="20" />
            </svg>
            <div className="cast-device-info">
              <span className="cast-device-name">{currentDevice.name}</span>
              <span className="cast-device-status">Connected</span>
            </div>
            <button className="btn-secondary cast-disconnect-btn" onClick={onDisconnect}>
              Disconnect
            </button>
          </div>
        )}

        {discovering && !devices.length && (
          <div className="cast-empty">
            <div className="cast-spinner"></div>
            <span>Searching for devices...</span>
          </div>
        )}

        {!discovering && !devices.length && !connected && (
          <div className="cast-empty">
            <span>No devices found</span>
          </div>
        )}

        {devices
          .filter((d) => d.id !== currentDevice?.id)
          .map((device) => (
            <button
              key={device.id}
              className="cast-device-item"
              onClick={() => onConnect(device)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
                <line x1="2" y1="20" x2="2.01" y2="20" />
              </svg>
              <div className="cast-device-info">
                <span className="cast-device-name">{device.name}</span>
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}
