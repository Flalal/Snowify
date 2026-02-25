// ─── Chromecast IPC Handlers ───

import { createHandler } from './middleware.js';

export function register(ipcMain, deps) {
  const { cast, castProxy, getMainWindow } = deps;

  // Wire up the main window ref for status events
  cast.setMainWindow(getMainWindow);

  ipcMain.handle(
    'cast:discover',
    createHandler('cast:discover', () => {
      return cast.startDiscovery();
    }, [])
  );

  ipcMain.handle(
    'cast:connect',
    createHandler('cast:connect', async (_event, deviceId) => {
      return await cast.connectToDevice(deviceId);
    })
  );

  ipcMain.handle(
    'cast:disconnect',
    createHandler('cast:disconnect', async () => {
      await cast.disconnect();
      castProxy.stopProxy();
      return true;
    })
  );

  ipcMain.handle(
    'cast:loadMedia',
    createHandler('cast:loadMedia', async (_event, streamUrl, metadata) => {
      const proxyUrl = await castProxy.startProxy(streamUrl);
      return await cast.loadMedia(proxyUrl, metadata);
    })
  );

  ipcMain.handle(
    'cast:play',
    createHandler('cast:play', async () => {
      return await cast.play();
    })
  );

  ipcMain.handle(
    'cast:pause',
    createHandler('cast:pause', async () => {
      return await cast.pause();
    })
  );

  ipcMain.handle(
    'cast:seek',
    createHandler('cast:seek', async (_event, time) => {
      return await cast.seek(time);
    })
  );

  ipcMain.handle(
    'cast:setVolume',
    createHandler('cast:setVolume', async (_event, level) => {
      await cast.setVolume(level);
      return true;
    })
  );
}
