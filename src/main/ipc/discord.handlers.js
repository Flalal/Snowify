// ─── Discord RPC IPC Handlers (lazy-loaded) ───

import { createHandler } from './middleware.js';

let discord = null;

async function getDiscord() {
  if (!discord) {
    discord = await import('../services/discord.js');
  }
  return discord;
}

export function register(ipcMain) {
  ipcMain.handle(
    'discord:connect',
    createHandler('discord:connect', async () => {
      const d = await getDiscord();
      await d.connectDiscordRPC();
      return d.getRpcReady();
    })
  );

  ipcMain.handle(
    'discord:disconnect',
    createHandler('discord:disconnect', async () => {
      const d = await getDiscord();
      d.disconnectDiscordRPC();
    })
  );

  ipcMain.handle(
    'discord:updatePresence',
    createHandler('discord:updatePresence', async (_event, data) => {
      const d = await getDiscord();
      const rpcClient = d.getRpcClient();
      const rpcReady = d.getRpcReady();
      if (!rpcClient || !rpcReady) return;
      await rpcClient.user?.setActivity({
        type: 2, // "Listening to"
        details: data.title || 'Unknown',
        state: data.artist || 'Unknown Artist',
        largeImageKey: data.thumbnail || 'logo',
        smallImageKey: 'logo',
        smallImageText: 'Snowify',
        startTimestamp: data.startTimestamp ? new Date(data.startTimestamp) : undefined,
        endTimestamp: data.endTimestamp ? new Date(data.endTimestamp) : undefined,
        instance: false
      });
    })
  );

  ipcMain.handle(
    'discord:clearPresence',
    createHandler('discord:clearPresence', async () => {
      const d = await getDiscord();
      const rpcClient = d.getRpcClient();
      const rpcReady = d.getRpcReady();
      if (!rpcClient || !rpcReady) return;
      await rpcClient.user?.clearActivity();
    })
  );
}
