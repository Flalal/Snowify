// ─── YTMusic API instance ───

import { YTMUSIC_MAX_RETRIES, YTMUSIC_RETRY_DELAYS } from '../../shared/constants.js';
import { withRetry } from '../utils/retry.js';

let ytmusic = null;

export async function initYTMusic() {
  const YTMusic = (await import('ytmusic-api')).default;
  await withRetry(
    async () => {
      ytmusic = new YTMusic();
      await ytmusic.initialize();
    },
    {
      maxRetries: YTMUSIC_MAX_RETRIES,
      delays: YTMUSIC_RETRY_DELAYS,
      onError(err, attempt) {
        console.error(
          `YTMusic init attempt ${attempt + 1}/${YTMUSIC_MAX_RETRIES} failed:`,
          err.message
        );
        ytmusic = null;
      }
    }
  );
}

export function getYtMusic() {
  return ytmusic;
}
