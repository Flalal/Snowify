import { lazy, Suspense } from 'preact/compat';
import { videoPlayerState } from '../state/navigation.js';
import { lyricsVisible, nowPlayingViewVisible, spotifyImportVisible } from '../state/ui.js';
import { ViewErrorBoundary } from './shared/ViewErrorBoundary.jsx';

const LyricsPanel = lazy(() =>
  import('./overlays/LyricsPanel.jsx').then((m) => ({ default: m.LyricsPanel }))
);
const VideoPlayer = lazy(() =>
  import('./overlays/VideoPlayer.jsx').then((m) => ({ default: m.VideoPlayer }))
);
const SpotifyImport = lazy(() =>
  import('./overlays/SpotifyImport.jsx').then((m) => ({ default: m.SpotifyImport }))
);
const NowPlayingView = lazy(() =>
  import('./overlays/NowPlayingView.jsx').then((m) => ({ default: m.NowPlayingView }))
);

export function OverlayLayer({ getAudio, closeVideoPlayer }) {
  return (
    <Suspense fallback={null}>
      {lyricsVisible.value && (
        <ViewErrorBoundary>
          <LyricsPanel
            visible={lyricsVisible.value}
            onClose={() => {
              lyricsVisible.value = false;
            }}
            audio={getAudio()}
          />
        </ViewErrorBoundary>
      )}

      {nowPlayingViewVisible.value && (
        <ViewErrorBoundary>
          <NowPlayingView visible={nowPlayingViewVisible.value} />
        </ViewErrorBoundary>
      )}

      {videoPlayerState.value && (
        <ViewErrorBoundary>
          <VideoPlayer
            videoId={videoPlayerState.value.videoId}
            title={videoPlayerState.value.title}
            artist={videoPlayerState.value.artist}
            onClose={closeVideoPlayer}
          />
        </ViewErrorBoundary>
      )}

      {spotifyImportVisible.value && (
        <ViewErrorBoundary>
          <SpotifyImport
            visible={spotifyImportVisible.value}
            onClose={() => { spotifyImportVisible.value = false; }}
          />
        </ViewErrorBoundary>
      )}
    </Suspense>
  );
}
