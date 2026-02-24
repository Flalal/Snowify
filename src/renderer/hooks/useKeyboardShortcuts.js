import { useEffect, useRef } from 'preact/hooks';
import { volume } from '../state/index.js';
import { videoPlayerState } from '../state/navigation.js';
import { SEEK_STEP_S, VOLUME_STEP } from '../../shared/constants.js';

export function useKeyboardShortcuts(callbacks) {
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') e.target.blur();
        return;
      }
      const { getAudio, togglePlay, playNext, playPrev, setVolumeLevel, switchView } =
        cbRef.current;
      const audio = getAudio();
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          if (e.ctrlKey) playNext();
          else if (audio?.duration)
            audio.currentTime = Math.min(audio.duration, audio.currentTime + SEEK_STEP_S);
          break;
        case 'ArrowLeft':
          if (e.ctrlKey) playPrev();
          else if (audio?.duration)
            audio.currentTime = Math.max(0, audio.currentTime - SEEK_STEP_S);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolumeLevel(volume.value + VOLUME_STEP);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolumeLevel(volume.value - VOLUME_STEP);
          break;
        case '/':
          e.preventDefault();
          switchView('search');
          break;
        case 'Escape':
          if (videoPlayerState.value) videoPlayerState.value = null;
          break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}
