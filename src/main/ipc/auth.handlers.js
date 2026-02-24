// ─── Auth & Sync IPC Handlers ───

import * as api from '../services/api.js';
import * as sync from '../services/sync.js';

export function register(ipcMain) {
  ipcMain.handle('auth:login', async (_event, email, password) => {
    try {
      const data = await api.login(email, password);
      return { ok: true, user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('auth:register', async (_event, username, email, password) => {
    try {
      const data = await api.register(username, email, password);
      return { ok: true, user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('auth:logout', async () => {
    await api.logout();
    sync.setLastSyncAt(null);
    return { ok: true };
  });

  ipcMain.handle('auth:configure', async (_event, { baseUrl, accessToken, refreshToken, apiKey }) => {
    api.configure({
      baseUrl,
      accessToken,
      refreshToken,
      apiKey,
      onTokensUpdated: (tokens) => {
        // Tokens will be sent back to renderer for storage
        const win = require('electron').BrowserWindow.getAllWindows()[0];
        if (win) win.webContents.send('auth:tokens-updated', tokens);
      }
    });
    if (accessToken) api.setTokens(accessToken, refreshToken);
    return { ok: true };
  });

  ipcMain.handle('auth:getState', () => {
    return {
      isConfigured: api.isConfigured(),
      isAuthenticated: api.isAuthenticated(),
      tokens: api.getTokens()
    };
  });

  ipcMain.handle('sync:push', async (_event, localState) => {
    try {
      const result = await sync.syncPush(localState);
      return { ok: true, syncTimestamp: result.syncTimestamp };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('sync:pull', async () => {
    try {
      const data = await sync.syncPull();
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('sync:merge', (_event, local, remote) => {
    return sync.mergeState(local, remote);
  });
}
