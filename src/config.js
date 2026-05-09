// Centralised tuning knobs. Anything a designer (or future Devin) is likely to
// tweak when balancing the game lives here, instead of being a magic number
// scattered across modules.

// ---- Rendering / world geometry ----
export const TILE = 32;             // pixels per tile (re-exported by sprites.js for callers that already import from there)
export const CANVAS_W = 960;        // viewport width in pixels (30 tiles)
export const CANVAS_H = 640;        // viewport height in pixels (20 tiles)
export const WORLD_W = 50;          // world width in tiles
export const WORLD_H = 32;          // world height in tiles
export const WORLD_SEED = 20260509; // deterministic map seed

// ---- Time ----
export const REAL_SECONDS_PER_GAME_MIN = 0.6; // ~12 real minutes per in-game day
export const DAY_START_HOUR = 6;              // hour the player wakes up
export const DAY_FAINT_HOUR = 26;             // 02:00; pass-out time if not slept
export const SEASON_LENGTH_DAYS = 28;
export const SEASONS = ['spring', 'summer', 'fall', 'winter'];

// ---- Economy / progression ----
export const STARTING_MONEY = 500;
export const ENERGY_MAX = 100;
export const FAINT_ENERGY_RATIO = 0.6; // fraction of max restored after a forced sleep
