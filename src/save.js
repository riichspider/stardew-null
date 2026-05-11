// localStorage save/load.
//
// Save key bumped to v3 with the side-view pivot. v2 saves serialised the
// old top-down tile world; the new format only persists scene id + player
// position because the scene definition itself is code-driven.
//
// `cutsceneSeen` (boolean, default false) was added with the opening
// cutscene. Older v3 saves without the field are upgraded transparently —
// missing values default to `false`, which means a new game played the
// cutscene; a returning player who never finished it will see it again on
// "Começar".

const KEY = 'stardew-null:save:v3';
const FLAGS_KEY = 'stardew-null:flags:v1';

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

// ---------- Flags ----------
//
// Cross-save persistent flags (e.g. cutsceneSeen) live in their own key so
// they survive a `clearSave()`. The shape is { cutsceneSeen, ... } and is
// extended by future PRs for world flags from dialog choices.
//
// Cache flags in memory to avoid excessive localStorage I/O
let _flagsCache = null;

// Load flags into cache on first access
function _ensureFlags() {
  if (_flagsCache === null) {
    try {
      const raw = localStorage.getItem(FLAGS_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          _flagsCache = obj;
        }
      }
    } catch (e) { /* ignore */ }
    if (_flagsCache === null) _flagsCache = {};
  }
  return _flagsCache;
}

function _readFlags() {
  return _ensureFlags();
}

function _writeFlags(obj) {
  _flagsCache = obj; // Update cache
  try {
    localStorage.setItem(FLAGS_KEY, JSON.stringify(obj));
    return true;
  } catch (e) {
    console.error('flags write error', e);
    return false;
  }
}

// Clear the cache to force re-read from localStorage
export function clearFlagCache() {
  _flagsCache = null;
}

export function getFlag(key, fallback = false) {
  const f = _readFlags();
  return Object.prototype.hasOwnProperty.call(f, key) ? f[key] : fallback;
}

export function setFlag(key, value) {
  const f = _readFlags();
  f[key] = value;
  return _writeFlags(f);
}

export function clearFlags() {
  _flagsCache = null;
  try { localStorage.removeItem(FLAGS_KEY); return true; } catch (e) { return false; }
}
