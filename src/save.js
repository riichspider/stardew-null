// localStorage save/load.
//
// Save key bumped to v2 with the farming gut so older v1 farming saves don't
// get half-loaded into the engine-only state shape.

const KEY = 'stardew-null:save:v2';

export function saveGame(state) {
  try {
    const payload = {
      version: 2,
      ts: Date.now(),
      money: state.money,
      energy: state.energy,
      energyMax: state.energyMax,
      day: state.day,
      hour: state.hour,
      minute: state.minute,
      inventory: state.inventory,
      player: { x: state.player.x, y: state.player.y, dir: state.player.dir },
      tiles: Array.from(state.world.tiles),
      objects: state.world.objects,
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
