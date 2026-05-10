// Scene: street01 — the first noir street the detective walks down.
//
// Composed in 5 parallax layers: sky, far skyline, mid buildings, street
// (ground), foreground (posts/hydrants). Each layer is either a hand-drawn
// PNG loaded via the asset registry or a procedural canvas generated at boot.
//
// The procedural layers are generated once and cached so the scene file
// doesn't allocate canvases every frame.

import { CANVAS_H } from '../config.js';
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

export const street01 = {
  id: 'street01',
  width: SCENE_WIDTH,
  groundY: GROUND_Y,
  walkable: [40, SCENE_WIDTH - 40],
  layers: [
    { id: 'sky',    parallax: 0.10, get: () => pickLayer('scene.street01.sky',    'sky') },
    { id: 'far',    parallax: 0.40, get: () => pickLayer('scene.street01.far',    'far') },
    { id: 'mid',    parallax: 0.80, get: () => pickLayer('scene.street01.mid',    'mid') },
    { id: 'street', parallax: 1.00, get: () => pickLayer('scene.street01.street', 'street') },
    { id: 'fg',     parallax: 1.20, get: () => pickLayer('scene.street01.fg',     'fg') },
  ],
  hotspots: [
    // Placeholder hotspots — wired up to dialog/door actions in PR #7+.
    { id: 'apartment_door', x: 680,  w: 60, label: 'Entrar no prédio', action: 'enter:apartment' },
    { id: 'bar_door',       x: 1640, w: 60, label: 'Entrar no bar',    action: 'enter:bar' },
  ],
  npcs: [
    // Empty for now; NPCs come with the dialog-tree PR.
  ],
  ambient: { tint: 'rgba(20, 10, 40, 0.18)', alpha: 1.0 },
};
