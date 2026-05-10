// Scene: apartment01 — the detective's small, smoky office/apartment.
//
// Interior counterpart to street01. Reached by interacting with the
// `apartment_door` hotspot on the street. The exit door (left wall, x≈30
// inside the props layer) sends the player back to street01 at the
// `apartment_return` spawn — which sits right next to the building's
// exterior door so the world feels continuous.
//
// Composition is simpler than street scenes:
//   wall  (parallax 0.10) — distant wallpaper / pictures, drifts slightly
//   floor (parallax 1.00) — wood planks, baked warm pools
//   props (parallax 1.00) — bed, desk + lamp, chair, file cabinet, exit door
// No sky / far skyline / rain. Light fog at low alpha sells the smoky air.

import { CANVAS_H, PALETTE } from '../config.js';
import { getAsset } from '../assets.js';
import {
  makeInteriorWallLayer,
  makeInteriorFloorLayer,
  makeInteriorPropsLayer,
} from '../sprites.js';

const SCENE_WIDTH = 1200;
const GROUND_Y = 480;

let _cache = null;

function buildLayers() {
  if (_cache) return _cache;
  _cache = {
    wall:  makeInteriorWallLayer(SCENE_WIDTH, CANVAS_H, 91, GROUND_Y),
    floor: makeInteriorFloorLayer(SCENE_WIDTH, CANVAS_H, 97, GROUND_Y),
    props: makeInteriorPropsLayer(SCENE_WIDTH, CANVAS_H, 103, GROUND_Y),
  };
  return _cache;
}

function pickLayer(assetId, fallbackKey) {
  const asset = getAsset(assetId);
  if (asset && asset.img) return asset.img;
  return buildLayers()[fallbackKey];
}

export const apartment01 = {
  id: 'apartment01',
  seed: 103,
  width: SCENE_WIDTH,
  groundY: GROUND_Y,
  walkable: [40, SCENE_WIDTH - 40],

  layers: [
    { id: 'wall',  parallax: 0.10, get: () => pickLayer('scene.apartment01.wall',  'wall')  },
    { id: 'floor', parallax: 1.00, get: () => pickLayer('scene.apartment01.floor', 'floor') },
    { id: 'props', parallax: 1.00, get: () => pickLayer('scene.apartment01.props', 'props') },
  ],

  // Spawns are scene-space X coordinates the player snaps to when entering.
  // `entrance` is right inside the doorway (left wall); `default` is a
  // fallback used when no spawn is supplied.
  spawns: {
    // Land just to the right of the exit door so the player isn't
    // immediately overlapping the exit hotspot — otherwise pressing W
    // again would bounce them straight back to the street.
    entrance: 130,
    default:  300,
  },

  hotspots: [
    // The exit door is painted at x≈30 in the props layer with width ~50.
    // Hotspot zone slightly wider so the player can interact even if they
    // overshoot a pixel or two.
    {
      id: 'exit_door',
      x: 30,
      w: 60,
      label: 'Sair para a rua',
      action: { goto: 'street01', spawn: 'apartment_return' },
    },
    // Desk hotspot — placeholder for "examine desk" / future evidence.
    {
      id: 'desk',
      x: 440,
      w: 110,
      label: 'Examinar mesa',
      action: 'examine:desk',
    },
  ],

  npcs: [],

  lights: [
    // Desk lamp — warm, weakly flickering. The brightest interior light.
    {
      id: 'desk_lamp',
      x: 440,
      y: GROUND_Y - 60,
      parallax: 1.00,
      color: PALETTE.neonAmber,
      radius: 130,
      intensity: 0.85,
      flicker: { rate: 3.5, seed: 0.7 },
    },
    // Overhead pendant — colder, steadier.
    {
      id: 'pendant',
      x: 600,
      y: 220,
      parallax: 1.00,
      color: '#ffe7b0',
      radius: 200,
      intensity: 0.30,
      flicker: { rate: 0.4, seed: 1.4 },
    },
    // Spillover from the street through the door (cool blue, hints at neon
    // outside the window).
    {
      id: 'doorway_spill',
      x: 50,
      y: GROUND_Y - 50,
      parallax: 1.00,
      color: PALETTE.neonCyan,
      radius: 80,
      intensity: 0.20,
    },
  ],

  ambient: {
    // Smoky-air interior — warmer than street fog.
    fog: { tint: 'rgba(60, 40, 30, 0.30)', alpha: 0.18 },
    // No rain inside.
    // Subtle warm tint to unify the frame.
    tint: 'rgba(40, 25, 15, 0.10)',
  },
};
