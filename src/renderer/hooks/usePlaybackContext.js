import { createContext } from 'preact';
import { useContext } from 'preact/hooks';

const PlaybackContext = createContext(null);
export const PlaybackProvider = PlaybackContext.Provider;

export function usePlaybackContext() {
  return useContext(PlaybackContext);
}
