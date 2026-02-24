// ─── Audio Focus management (Android) ───
// Handles pause on phone call, ducking on notifications, resume on regain.

import { registerPlugin } from '@capacitor/core';

const AudioFocus = registerPlugin('AudioFocus');

let wasPlayingBeforeLoss = false;
let originalVolume = 1;
let isDucked = false;

/**
 * Initialize audio focus handling.
 * Call once after the <audio> element and __snowifyPlayback are available.
 */
export function initAudioFocus() {
  AudioFocus.addListener('audioFocusChange', (event) => {
    const audio = document.getElementById('audio-player');
    if (!audio) return;

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

  // Request audio focus on init
  AudioFocus.requestFocus();
}
