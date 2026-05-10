// Scene: street01 — the first noir street the detective walks down.
//
// Composed in 5 parallax layers: sky, far skyline, mid buildings, street
// (ground), foreground (posts/hydrants). Each layer is either a hand-drawn
// PNG loaded via the asset registry or a procedural canvas generated at boot.
//
// The procedural layers are generated once and cached so the scene file
// doesn't allocate canvases every frame.

import { CANVAS_H, PALETTE } from '../config.js';
import { getAsset } from '../assets.js';
import {
  makeSkyLayer,
  makeFarBuildingsLayer,
  makeMidBuildingsLayer,
  makeStreetLayer,
  makeForegroundLayer,
} from '../sprites.js';

const SCENE_WIDTH = 2400;
const GROUND_Y = 540;

let _cache = null;

function buildLayers() {
  if (_cache) return _cache;
  _cache = {
    sky:    makeSkyLayer(SCENE_WIDTH, CANVAS_H, 7),
    far:    makeFarBuildingsLayer(SCENE_WIDTH, CANVAS_H, 17),
    mid:    makeMidBuildingsLayer(SCENE_WIDTH, CANVAS_H, 31),
    street: makeStreetLayer(SCENE_WIDTH, CANVAS_H, 53, GROUND_Y),
    fg:     makeForegroundLayer(SCENE_WIDTH, CANVAS_H, 71, GROUND_Y),
  };
  return _cache;
}

// Each layer's `get()` returns either the loaded PNG (if dropped into
// `assets/scenes/street01/...`) or the procedural canvas fallback.
function pickLayer(assetId, fallbackKey) {
  const asset = getAsset(assetId);
  if (asset && asset.img) return asset.img;
  return buildLayers()[fallbackKey];
}

// Lights are placed in scene-space (x, y in scene coordinates). The lighting
// pass reads `parallax` per-light; foreground props (lamps, hydrants) sit in
// the fg layer (parallax 1.20), while neon signs are baked into the mid layer
// (parallax 0.80) so their halos must scroll at those rates to feel attached.
//
// The lamp post X positions match `makeForegroundLayer(seed=71, …)` —
// changing the seed there means re-listing them here.
const LAMP_XS = [120, 360, 600, 840, 1080, 1320, 1560, 1800, 2040, 2280];

const STREET_LAMPS = LAMP_XS.map((x, i) => ({
  id: `lamp_${i}`,
  x,
  y: GROUND_Y - 96,           // lamp head height
  parallax: 1.20,             // matches fg layer
  color: PALETTE.neonAmber,
  radius: 110,
  intensity: 0.55,
  flicker: { rate: 4.2, seed: i * 1.31 },
}));

// Neon signs baked into the mid building silhouettes. The sprite generator
// for mid-buildings paints a few coloured strips at deterministic positions;
// these halo entries sit at those positions so the signs visibly bloom.
const NEON_SIGNS = [
  { id: 'neon_pink_a',  x: 156,  y: 336, parallax: 0.80, color: PALETTE.neonPink,  radius: 130, intensity: 0.60, flicker: { rate: 9.0,  seed: 0.4 } },
  { id: 'neon_amber_a', x: 298,  y: 263, parallax: 0.80, color: PALETTE.neonAmber, radius: 130, intensity: 0.60, flicker: { rate: 10.4, seed: 1.2 } },
  { id: 'neon_pink_b',  x: 513,  y: 268, parallax: 0.80, color: PALETTE.neonPink,  radius: 120, intensity: 0.55, flicker: { rate: 8.2,  seed: 2.1 } },
  { id: 'neon_red_a',   x: 950,  y: 325, parallax: 0.80, color: PALETTE.neonRed,   radius: 120, intensity: 0.55, flicker: { rate: 6.6,  seed: 3.0 } },
  { id: 'neon_red_b',   x: 1104, y: 424, parallax: 0.80, color: PALETTE.neonRed,   radius: 120, intensity: 0.55, flicker: { rate: 7.5,  seed: 3.8 } },
  { id: 'neon_cyan_a',  x: 1208, y: 277, parallax: 0.80, color: PALETTE.neonCyan,  radius: 140, intensity: 0.55, flicker: { rate: 11.2, seed: 4.9 } },
  { id: 'neon_pink_c',  x: 1970, y: 292, parallax: 0.80, color: PALETTE.neonPink,  radius: 130, intensity: 0.55, flicker: { rate: 9.8,  seed: 5.7 } },
];

// Storefront window glow — small warm halos at the storefront row, baked
// into the street layer (parallax 1.0).
const STOREFRONT_GLOWS = [
  { x: 200,  parallax: 1.00, color: PALETTE.neonAmber, radius: 70, intensity: 0.35 },
  { x: 460,  parallax: 1.00, color: PALETTE.neonAmber, radius: 70, intensity: 0.35 },
  { x: 980,  parallax: 1.00, color: PALETTE.neonAmber, radius: 70, intensity: 0.35 },
  { x: 1440, parallax: 1.00, color: PALETTE.neonAmber, radius: 70, intensity: 0.35 },
  { x: 1880, parallax: 1.00, color: PALETTE.neonAmber, radius: 70, intensity: 0.35 },
  { x: 2200, parallax: 1.00, color: PALETTE.neonAmber, radius: 70, intensity: 0.35 },
].map((g, i) => ({
  id: `storefront_${i}`,
  y: GROUND_Y - 70,
  ...g,
}));

export const street01 = {
  id: 'street01',
  seed: 53,
  width: SCENE_WIDTH,
  groundY: GROUND_Y,
  walkable: [40, SCENE_WIDTH - 40],

  // Where the player lands when entering via Game.changeScene(). The
  // exterior door of the apartment building sits at scene-X 680, so the
  // matching `apartment_return` spawn places the player a few px to the
  // right of that door so they're not standing inside the hotspot.
  spawns: {
    default:           Math.floor((40 + (SCENE_WIDTH - 40)) / 2),
    // Land just past the right edge of each door hotspot so the player
    // appears right next to the door but doesn't immediately re-trigger
    // the entrance prompt (door zones are 60px wide starting at the X
    // listed under hotspots).
    apartment_return:  760,
    bar_return:        1720,
  },

  layers: [
    { id: 'sky',    parallax: 0.10, get: () => pickLayer('scene.street01.sky',    'sky') },
    { id: 'far',    parallax: 0.40, get: () => pickLayer('scene.street01.far',    'far') },
    { id: 'mid',    parallax: 0.80, get: () => pickLayer('scene.street01.mid',    'mid') },
    { id: 'street', parallax: 1.00, get: () => pickLayer('scene.street01.street', 'street') },
    { id: 'fg',     parallax: 1.20, get: () => pickLayer('scene.street01.fg',     'fg') },
  ],
  hotspots: [
    // The apartment door is fully wired — interacting triggers a scene
    // change to apartment01 with a fade transition.
    {
      id: 'apartment_door',
      x: 680,
      w: 60,
      label: 'Entrar no prédio',
      action: { goto: 'apartment01', spawn: 'entrance' },
    },
    // The bar interior doesn't exist yet — keep as a toast placeholder
    // until a future PR adds bar01.
    {
      id: 'bar_door',
      x: 1640,
      w: 60,
      label: 'Entrar no bar',
      action: 'enter:bar',
    },
    // Test evidence: photo on ground
    {
      id: 'evidence_photo',
      x: 400,
      w: 40,
      label: 'Pegar foto',
      action: 'collect:evidence_photo_scene',
    },
    // Test evidence: blood stain
    {
      id: 'evidence_blood',
      x: 1200,
      w: 40,
      label: 'Analisar mancha',
      action: 'collect:evidence_bloody_handprint',
    },
  ],
  npcs: [
    // Test NPC: mysterious witness
    {
      id: 'witness',
      x: 900,
      y: 440,
      label: 'Testemunha',
      action: 'talk:witness_initial',
    },
  ],
  // ---- Cinematic noir lighting ----
  lights: [
    ...STREET_LAMPS,
    ...NEON_SIGNS,
    ...STOREFRONT_GLOWS,
  ],
  ambient: {
    // Volumetric fog — desaturated cool blue at low alpha.
    fog: { tint: 'rgba(40, 50, 90, 0.35)', alpha: 0.20 },
    // Heavy rain to set the Blade-Runner mood.
    rain: { density: 0.7, speed: 720, length: 14 },
    // Optional desaturation tint kept low so lights stay punchy.
    tint: 'rgba(20, 10, 40, 0.10)',
  },
};
