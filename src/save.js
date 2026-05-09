// localStorage save/load.

const KEY = 'stardew-null:save:v1';

export function saveGame(state) {
  try {
    const payload = {
      version: 1,
      ts: Date.now(),
      money: state.money,
      energy: state.energy,
      energyMax: state.energyMax,
      day: state.day,
      season: state.season,
      year: state.year,
      hour: state.hour,
      minute: state.minute,
      weather: state.weather,
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
