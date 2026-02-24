// ─── Centralized playback error handling ───

import { isPlaying, isLoading } from '../state/index.js';
import { clearDiscordPresence } from './discordPresence.js';
import { setError } from '../hooks/useError.js';

const ERROR_MESSAGES = {
  audio_error: 'Audio error — skipping to next track',
  stream_stalled: 'Stream stalled — skipping to next',
  playback_failed: 'Playback failed'
};

/**
 * Handle a playback error uniformly: reset state, set observable error, optionally advance.
 * @param {Object} opts
 * @param {string} opts.reason - ErrorCode value (audio_error | stream_stalled | playback_failed)
 * @param {Error} [opts.error] - original error object
 * @param {Function} [opts.playNext] - queue advance function
 * @param {boolean} [opts.shouldAdvance=true] - whether to auto-advance to next track
 */
export function handlePlaybackError({ reason, error, playNext, shouldAdvance = true }) {
  isPlaying.value = false;
  isLoading.value = false;
  clearDiscordPresence();

  const detail = error?.message ? `: ${error.message}` : '';
  const message = (ERROR_MESSAGES[reason] || 'Playback error') + detail;

  setError(reason, message, error ? { error: error.message } : undefined);

  if (shouldAdvance && playNext) {
    playNext();
  }
}
