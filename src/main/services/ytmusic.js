// ─── YTMusic API instance ───

import { YTMUSIC_MAX_RETRIES, YTMUSIC_RETRY_DELAYS } from '../../shared/constants.js';

let ytmusic = null;

export async function initYTMusic() {
  const YTMusic = (await import('ytmusic-api')).default;
  for (let attempt = 0; attempt < YTMUSIC_MAX_RETRIES; attempt++) {
    try {
      ytmusic = new YTMusic();
      await ytmusic.initialize();
      return;
    } catch (err) {
      console.error(
        `YTMusic init attempt ${attempt + 1}/${YTMUSIC_MAX_RETRIES} failed:`,
        err.message
      );
      ytmusic = null;
      if (attempt < YTMUSIC_MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, YTMUSIC_RETRY_DELAYS[attempt]));
      }
    }
  }
  throw new Error('YTMusic initialization failed after all retries');
}

export function getYtMusic() {
  return ytmusic;
}
