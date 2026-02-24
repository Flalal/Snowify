// ─── Secure Token Storage (safeStorage) ───

import { app, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';

const STORE_FILE = path.join(app.getPath('userData'), 'secure-tokens.json');

export function saveTokens({ accessToken, refreshToken, apiKey }) {
  const data = {
    accessToken: accessToken || '',
    refreshToken: refreshToken || '',
    apiKey: apiKey || ''
  };
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = {};
    for (const [key, val] of Object.entries(data)) {
      encrypted[key] = val ? safeStorage.encryptString(val).toString('base64') : '';
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify({ encrypted: true, ...encrypted }));
  } else {
    // Fallback: store in plain JSON file (still better than localStorage accessible by web layer)
    fs.writeFileSync(STORE_FILE, JSON.stringify({ encrypted: false, ...data }));
  }
}

export function loadTokens() {
  try {
    if (!fs.existsSync(STORE_FILE)) return { accessToken: '', refreshToken: '', apiKey: '' };
    const raw = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
    if (raw.encrypted && safeStorage.isEncryptionAvailable()) {
      return {
        accessToken: raw.accessToken
          ? safeStorage.decryptString(Buffer.from(raw.accessToken, 'base64'))
          : '',
        refreshToken: raw.refreshToken
          ? safeStorage.decryptString(Buffer.from(raw.refreshToken, 'base64'))
          : '',
        apiKey: raw.apiKey ? safeStorage.decryptString(Buffer.from(raw.apiKey, 'base64')) : ''
      };
    }
    // Plain fallback or encryption not available
    return {
      accessToken: raw.accessToken || '',
      refreshToken: raw.refreshToken || '',
      apiKey: raw.apiKey || ''
    };
  } catch (err) {
    console.error('Failed to load secure tokens:', err);
    return { accessToken: '', refreshToken: '', apiKey: '' };
  }
}

export function clearTokens() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      fs.writeFileSync(
        STORE_FILE,
        JSON.stringify({ encrypted: false, accessToken: '', refreshToken: '', apiKey: '' })
      );
    }
  } catch (err) {
    console.error('Failed to clear secure tokens:', err);
  }
}
