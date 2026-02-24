import { discordRpc } from '../state/index.js';

export function updateDiscordPresence(track, audio) {
  if (!discordRpc.value || !track) return;
  const startMs = Date.now() - Math.floor((audio?.currentTime || 0) * 1000);
  const durationMs = track.durationMs || (audio?.duration ? Math.round(audio.duration * 1000) : 0);
  const data = { title: track.title, artist: track.artist, thumbnail: track.thumbnail || '', startTimestamp: startMs };
  if (durationMs) data.endTimestamp = startMs + durationMs;
  window.snowify.updatePresence(data);
}

export function clearDiscordPresence() {
  if (!discordRpc.value) return;
  window.snowify.clearPresence();
}
