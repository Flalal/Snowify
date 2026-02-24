// ─── Discord RPC ───

import { Client } from '@xhayper/discord-rpc';

const DISCORD_CLIENT_ID = '1473620585832517644';
let rpcClient = null;
let rpcReady = false;

export async function connectDiscordRPC() {
  if (rpcClient) return;
  try {
    rpcClient = new Client({ clientId: DISCORD_CLIENT_ID });
    rpcClient.on('ready', () => {
      rpcReady = true;
    });
    rpcClient.on('disconnected', () => {
      rpcReady = false;
      rpcClient = null;
    });
    await rpcClient.login();
  } catch (_) {
    rpcReady = false;
    rpcClient = null;
  }
}

export function disconnectDiscordRPC() {
  if (rpcClient) {
    rpcClient.destroy().catch(() => {});
    rpcClient = null;
    rpcReady = false;
  }
}

export function getRpcClient() {
  return rpcClient;
}

export function getRpcReady() {
  return rpcReady;
}
