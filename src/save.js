// localStorage save/load.
//
// Save key bumped to v3 with the side-view pivot. v2 saves serialised the
// old top-down tile world; the new format only persists scene id + player
// position because the scene definition itself is code-driven.

const KEY = 'stardew-null:save:v3';

export function saveGame(state) {
  try {
    const payload = {
      version: 3,
      ts: Date.now(),
      sceneId: state.sceneId,
      playerX: state.player.x,
      playerDir: state.player.dir,
      money: state.money,
      energy: state.energy,
      energyMax: state.energyMax,
      day: state.day,
      hour: state.hour,
      minute: state.minute,
      inventory: state.inventory,
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
    return true;
  } catch (e) {
    console.error('save error', e);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('load error', e);
    return null;
  }
}

export function hasSave() {
  return !!localStorage.getItem(KEY);
}

export function clearSave() {
  localStorage.removeItem(KEY);
}
