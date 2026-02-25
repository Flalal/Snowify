import { render } from 'preact';
import { App } from './components/App.jsx';
import { ErrorBoundary } from './components/shared/ErrorBoundary.jsx';

// Import all CSS modules
import './styles/variables.css';
import './styles/global.css';
import './styles/titlebar.css';
import './styles/sidebar.css';
import './styles/nowplaying.css';
import './styles/nowplaying-view.css';
import './styles/queue.css';
import './styles/tracklist.css';
import './styles/cards.css';
import './styles/search.css';
import './styles/context-menu.css';
import './styles/playlist.css';
import './styles/album.css';
import './styles/artist.css';
import './styles/explore.css';
import './styles/settings.css';
import './styles/library.css';
import './styles/modal.css';
import './styles/playlist-picker.css';
import './styles/spotify.css';
import './styles/lyrics.css';
import './styles/video.css';
import './styles/toast.css';
import './styles/scroll-arrows.css';
import './styles/animations.css';
import './styles/quickpicks.css';
import './styles/views.css';
import './styles/cast.css';

render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
  document.getElementById('root')
);
