// Centralised tuning knobs. Anything a designer (or future Devin) is likely to
// tweak when balancing the game lives here, instead of being a magic number
// scattered across modules.

// ---- Rendering ----
export const TILE = 32;             // legacy unit; some sprite generators still use it
export const CANVAS_W = 960;        // viewport width in pixels
export const CANVAS_H = 640;        // viewport height in pixels

// ---- Default scene the game boots into ----
export const DEFAULT_SCENE = 'street01';

// ---- Player (side-view) ----
export const PLAYER_W = 24;
export const PLAYER_H = 32;
export const PLAYER_SPEED = 130;    // px/sec horizontal

// ---- Time ----
// Per-day clock kept around so the noir RPG can do narrative time-of-day
// transitions later. No more seasons / years / weather.
export const REAL_SECONDS_PER_GAME_MIN = 0.6; // ~12 real minutes per in-game day
export const DAY_START_HOUR = 21;             // noir starts at night, 21:00
export const DAY_FAINT_HOUR = 30;             // 06:00 next day = forced rest

// ---- Economy / progression ----
export const STARTING_MONEY = 500;
export const ENERGY_MAX = 100;
export const FAINT_ENERGY_RATIO = 0.6;

// ---- Noir palette (Blade-Runner-ish) ----
// Used by procedural sprite generators and scene composers as fallback when
// hand-drawn PNG assets are missing.
export const PALETTE = {
  sky:        ['#0a0a14', '#1a1030', '#2a1840'], // gradient stops top → bottom
  buildingFar:    '#0e0e18',
  buildingMid:    '#15151f',
  buildingNear:   '#1d1d28',
  windowOff:      '#1a1a24',
  windowOn:       '#ffd66a',
  windowOnAlt:    '#ffaa3a',
  street:         '#1a1a22',
  streetWet:      '#2c2c34',
  curb:           '#2c2024',

  neonPink:    '#ff3a8c',
  neonCyan:    '#3afff0',
  neonAmber:   '#ffaa3a',
  neonRed:     '#ff2244',
  neonGreen:   '#3aff8c',

  fog:         'rgba(40, 30, 70, 0.35)',

  detectiveCoat:    '#3a3a44',
  detectiveCoatLit: '#4a4a55',
  detectivePants:   '#222226',
  detectiveHat:     '#1a1a20',
  detectiveSkin:    '#c8a482',
  detectiveCigar:   '#ff5522',
};
