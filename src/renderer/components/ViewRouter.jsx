import { lazy, Suspense } from 'preact/compat';
import { albumViewState, artistViewState, playlistViewState } from '../state/navigation.js';
import { HomeView } from './views/HomeView.jsx';
import { SearchView } from './views/SearchView.jsx';
import { Spinner } from './shared/Spinner.jsx';
import { ViewErrorBoundary } from './shared/ViewErrorBoundary.jsx';

// ─── Lazy-loaded views ───
const ExploreView = lazy(() =>
  import('./views/ExploreView.jsx').then((m) => ({ default: m.ExploreView }))
);
const LibraryView = lazy(() =>
  import('./views/LibraryView.jsx').then((m) => ({ default: m.LibraryView }))
);
const PlaylistView = lazy(() =>
  import('./views/PlaylistView.jsx').then((m) => ({ default: m.PlaylistView }))
);
const AlbumView = lazy(() =>
  import('./views/AlbumView.jsx').then((m) => ({ default: m.AlbumView }))
);
const ArtistView = lazy(() =>
  import('./views/ArtistView.jsx').then((m) => ({ default: m.ArtistView }))
);
const SettingsView = lazy(() =>
  import('./views/SettingsView.jsx').then((m) => ({ default: m.SettingsView }))
);

export function ViewRouter({ view, initialized }) {
  return (
    <>
      <section className={`view${view === 'home' ? ' active' : ''}`} id="view-home">
        {initialized && view === 'home' && (
          <ViewErrorBoundary>
            <HomeView />
          </ViewErrorBoundary>
        )}
      </section>

      <section className={`view${view === 'search' ? ' active' : ''}`} id="view-search">
        {view === 'search' && (
          <ViewErrorBoundary>
            <SearchView />
          </ViewErrorBoundary>
        )}
      </section>

      <Suspense fallback={<Spinner />}>
        <section className={`view${view === 'explore' ? ' active' : ''}`} id="view-explore">
          {view === 'explore' && (
            <ViewErrorBoundary>
              <ExploreView />
            </ViewErrorBoundary>
          )}
        </section>

        <section className={`view${view === 'library' ? ' active' : ''}`} id="view-library">
          {view === 'library' && (
            <ViewErrorBoundary>
              <LibraryView />
            </ViewErrorBoundary>
          )}
        </section>

        <section className={`view${view === 'playlist' ? ' active' : ''}`} id="view-playlist">
          {view === 'playlist' && playlistViewState.value && (
            <ViewErrorBoundary>
              <PlaylistView
                playlist={playlistViewState.value.playlist}
                isLiked={playlistViewState.value.isLiked}
              />
            </ViewErrorBoundary>
          )}
        </section>

        <section className={`view${view === 'album' ? ' active' : ''}`} id="view-album">
          {view === 'album' && albumViewState.value && (
            <ViewErrorBoundary>
              <AlbumView
                albumId={albumViewState.value.albumId}
                albumMeta={albumViewState.value.albumMeta}
              />
            </ViewErrorBoundary>
          )}
        </section>

        <section className={`view${view === 'artist' ? ' active' : ''}`} id="view-artist">
          {view === 'artist' && artistViewState.value && (
            <ViewErrorBoundary>
              <ArtistView artistId={artistViewState.value.artistId} />
            </ViewErrorBoundary>
          )}
        </section>

        <section className={`view${view === 'settings' ? ' active' : ''}`} id="view-settings">
          {view === 'settings' && (
            <ViewErrorBoundary>
              <SettingsView />
            </ViewErrorBoundary>
          )}
        </section>
      </Suspense>
    </>
  );
}
