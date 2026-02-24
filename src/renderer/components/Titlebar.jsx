import logoSrc from '../../../assets/logo.png';

export function Titlebar() {
  return (
    <div id="titlebar">
      <div className="titlebar-drag">
        <div className="app-logo">
          <img
            className="app-logo-icon"
            src={logoSrc}
            alt="Snowify"
            width="24"
            height="24"
            draggable="false"
          />
          <span>Snowify</span>
        </div>
      </div>
      <div className="titlebar-controls">
        <button className="tb-btn" onClick={() => window.snowify.minimize()} aria-label="Minimize">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect y="5" width="12" height="2" rx="1" fill="currentColor" />
          </svg>
        </button>
        <button className="tb-btn" onClick={() => window.snowify.maximize()} aria-label="Maximize">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect
              x="1"
              y="1"
              width="10"
              height="10"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </button>
        <button
          className="tb-btn tb-close"
          onClick={() => window.snowify.close()}
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path
              d="M1 1l10 10M11 1L1 11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
