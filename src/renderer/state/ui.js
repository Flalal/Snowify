import { signal } from '@preact/signals';

// ─── Toast ───
const toastMessage = signal('');
const toastVisible = signal(false);
const toastShow = signal(false);
let toastTimeout = null;

export function showToast(message) {
  toastMessage.value = message;
  toastVisible.value = true;
  clearTimeout(toastTimeout);
  requestAnimationFrame(() => {
    toastShow.value = true;
  });
  toastTimeout = setTimeout(() => {
    toastShow.value = false;
    setTimeout(() => {
      toastVisible.value = false;
    }, 300);
  }, 2500);
}

export { toastMessage, toastVisible, toastShow };

// ─── Error state ───
export const lastError = signal(null);

// ─── Overlay panels ───
export const lyricsVisible = signal(false);
export const queueVisible = signal(false);

export function toggleLyricsPanel() {
  const opening = !lyricsVisible.value;
  lyricsVisible.value = !lyricsVisible.value;
  if (opening) queueVisible.value = false;
}

export function toggleQueuePanel() {
  const opening = !queueVisible.value;
  queueVisible.value = !queueVisible.value;
  if (opening) lyricsVisible.value = false;
}

// ─── Now Playing view (mobile full-screen) ───
export const nowPlayingViewVisible = signal(false);

// ─── ContextMenu ───
const menuVisible = signal(false);
const menuX = signal(0);
const menuY = signal(0);
const menuTrack = signal(null);
const menuOptions = signal({});

export function showContextMenu(e, track, options = {}) {
  e.preventDefault();
  menuTrack.value = track;
  menuOptions.value = options;
  menuX.value = e.clientX;
  menuY.value = e.clientY;
  menuVisible.value = true;
}

export function removeContextMenu() {
  menuVisible.value = false;
  menuTrack.value = null;
}

export { menuVisible, menuX, menuY, menuTrack, menuOptions };

// ─── PlaylistContextMenu ───
const plMenuVisible = signal(false);
const plMenuX = signal(0);
const plMenuY = signal(0);
const plMenuPlaylist = signal(null);
const plMenuIndex = signal(0);
const plMenuTotal = signal(0);

export function showPlaylistContextMenu(e, playlist, index, total) {
  e.preventDefault();
  removeContextMenu();
  plMenuPlaylist.value = playlist;
  plMenuIndex.value = index;
  plMenuTotal.value = total;
  plMenuX.value = e.clientX;
  plMenuY.value = e.clientY;
  plMenuVisible.value = true;
}

export function removePlaylistContextMenu() {
  plMenuVisible.value = false;
  plMenuPlaylist.value = null;
}

export { plMenuVisible, plMenuX, plMenuY, plMenuPlaylist, plMenuIndex, plMenuTotal };

// ─── InputModal ───
const modalVisible = signal(false);
const modalTitle = signal('');
const modalDefaultValue = signal('');
let _inputResolve = null;

export function showInputModal(title, defaultValue = '') {
  return new Promise((resolve) => {
    _inputResolve = resolve;
    modalTitle.value = title;
    modalDefaultValue.value = defaultValue;
    modalVisible.value = true;
  });
}

export function cleanupInputModal(result) {
  modalVisible.value = false;
  if (_inputResolve) {
    _inputResolve(result);
    _inputResolve = null;
  }
}

export { modalVisible, modalTitle, modalDefaultValue };

// ─── PlaylistPickerModal ───
const pickerVisible = signal(false);
const pickerTracks = signal([]);
let _pickerResolve = null;

export function showPlaylistPicker(tracks) {
  return new Promise((resolve) => {
    _pickerResolve = resolve;
    pickerTracks.value = Array.isArray(tracks) ? tracks : [tracks];
    pickerVisible.value = true;
  });
}

export function cleanupPicker(result) {
  pickerVisible.value = false;
  pickerTracks.value = [];
  if (_pickerResolve) {
    _pickerResolve(result);
    _pickerResolve = null;
  }
}

export { pickerVisible, pickerTracks };
