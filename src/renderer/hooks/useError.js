// ─── Centralized error reporting ───

import { lastError, showToast } from '../state/ui.js';

/**
 * Set an observable error and show a toast.
 * @param {string} code - ErrorCode value
 * @param {string} message - user-visible message
 * @param {Object} [context] - optional debug context (error object, etc.)
 */
export function setError(code, message, context) {
  lastError.value = { code, message, context: context ?? null, timestamp: Date.now() };
  showToast(message);
}

/**
 * Clear the current error.
 */
export function clearError() {
  lastError.value = null;
}
