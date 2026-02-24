// ─── Audio Focus management (Android) ───
// Handles pause on phone call, ducking on notifications, resume on regain.
//
// Audio focus is requested lazily (on first play) to avoid conflicting with
// the MediaSession framework which also manages focus when the session is active.

import { registerPlugin } from '@capacitor/core';

const AudioFocus = registerPlugin('AudioFocus');

let wasPlayingBeforeLoss = false;
let originalVolume = 1;
let isDucked = false;
let focusRequested = false;
let playStartTime = 0;

/**
 * Initialize audio focus handling.
 * Call once after the <audio> element is available.
 */
export function initAudioFocus() {
  const audio = document.getElementById('audio-player');
  if (!audio) return;

  // Request focus lazily on first play to avoid race with MediaSession framework
  audio.addEventListener('play', () => {
    playStartTime = Date.now();
    if (!focusRequested) {
      focusRequested = true;
      AudioFocus.requestFocus();
    }
  });

  AudioFocus.addListener('audioFocusChange', (event) => {
    const audio = document.getElementById('audio-player');
    if (!audio) return;

    // Ignore loss events within 2s of play starting — the MediaSession framework
    // may briefly steal focus when activating the session, then return it.
    if (event.type !== 'gain' && Date.now() - playStartTime < 2000) return;

    switch (event.type) {
      case 'gain':
        // Regained focus — restore volume and resume if we were playing
        if (isDucked) {
          audio.volume = originalVolume;
          isDucked = false;
        }
        if (wasPlayingBeforeLoss) {
          audio.play();
          wasPlayingBeforeLoss = false;
        }
        break;

      case 'loss':
        // Permanent loss (another music app) — just pause
        wasPlayingBeforeLoss = false;
        if (!audio.paused) {
          audio.pause();
        }
        break;

      case 'lossTransient':
        // Temporary loss (phone call, voice assistant) — pause, will resume on gain
        wasPlayingBeforeLoss = !audio.paused;
        if (!audio.paused) {
          audio.pause();
        }
        break;

      case 'duck':
        // Lower volume temporarily (notification sound, navigation instruction)
        if (!isDucked) {
          originalVolume = audio.volume;
          isDucked = true;
        }
        audio.volume = Math.max(0.05, originalVolume * 0.2);
        break;
    }
  });
}
