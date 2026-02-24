// ─── Auth & Sync IPC Handlers ───

import * as api from '../services/api.js';
import * as sync from '../services/sync.js';
import * as secureStore from '../services/secureStore.js';
import { createOkHandler } from './middleware.js';

export function register(ipcMain) {
  ipcMain.handle(
    'auth:login',
    createOkHandler('auth:login', async (_event, email, password) => {
      const data = await api.login(email, password);
      secureStore.saveTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        apiKey: ''
      });
      return {
        ok: true,
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken
      };
    })
  );

  ipcMain.handle(
    'auth:register',
    createOkHandler('auth:register', async (_event, username, email, password) => {
      const data = await api.register(username, email, password);
      secureStore.saveTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        apiKey: ''
      });
      return {
        ok: true,
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken
      };
    })
  );

  ipcMain.handle(
    'auth:logout',
    createOkHandler('auth:logout', async () => {
      await api.logout();
      sync.setLastSyncAt(null);
      secureStore.clearTokens();
      return { ok: true };
    })
  );

  ipcMain.handle(
    'auth:configure',
    createOkHandler(
      'auth:configure',
      async (_event, { baseUrl, accessToken, refreshToken, apiKey }) => {
        api.configure({
          baseUrl,
          accessToken,
          refreshToken,
          apiKey,
          onTokensUpdated: (tokens) => {
            // Save refreshed tokens to secure store
            secureStore.saveTokens({
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              apiKey: apiKey || ''
            });
            // Send tokens back to renderer for in-memory signals
            const win = require('electron').BrowserWindow.getAllWindows()[0];
            if (win) win.webContents.send('auth:tokens-updated', tokens);
          }
        });
        if (accessToken) api.setTokens(accessToken, refreshToken);
        return { ok: true };
      }
    )
  );

  ipcMain.handle('auth:getState', () => {
    return {
      isConfigured: api.isConfigured(),
      isAuthenticated: api.isAuthenticated(),
      tokens: api.getTokens()
    };
  });

  ipcMain.handle(
    'sync:push',
    createOkHandler('sync:push', async (_event, localState) => {
      const result = await sync.syncPush(localState);
      return { ok: true, syncTimestamp: result.syncTimestamp };
    })
  );

  ipcMain.handle(
    'sync:pull',
    createOkHandler('sync:pull', async () => {
      const data = await sync.syncPull();
      return { ok: true, data };
    })
  );

  ipcMain.handle('sync:merge', (_event, local, remote) => {
    return sync.mergeState(local, remote);
  });

  // ─── Secure Token Storage IPC ───
  ipcMain.handle(
    'auth:saveTokens',
    createOkHandler('auth:saveTokens', async (_event, tokens) => {
      secureStore.saveTokens(tokens);
      return { ok: true };
    })
  );

  ipcMain.handle('auth:loadTokens', async () => {
    return secureStore.loadTokens();
  });

  ipcMain.handle(
    'auth:clearTokens',
    createOkHandler('auth:clearTokens', async () => {
      secureStore.clearTokens();
      return { ok: true };
    })
  );
}
