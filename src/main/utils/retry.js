// ─── Generic retry utility ───

/**
 * Retry an async function with configurable delays.
 * @param {Function} fn - async function to attempt
 * @param {Object} opts
 * @param {number} opts.maxRetries - total attempts (default 3)
 * @param {number[]} opts.delays - delay before each retry in ms (default [1000, 3000, 8000])
 * @param {Function} [opts.onError] - called with (error, attempt) on each failure
 */
export async function withRetry(fn, { maxRetries = 3, delays = [1000, 3000, 8000], onError } = {}) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      onError?.(err, attempt);
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, delays[attempt] ?? delays[delays.length - 1]));
      } else {
        throw err;
      }
    }
  }
}
