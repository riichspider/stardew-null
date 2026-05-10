// Tile-based world.
//
// Engine-level scaffold post-farming gut: produces a walkable map (grass +
// fenced border + a small pond + scattered trees/rocks) so the renderer,
// camera, and movement code have something to chew on while the noir RPG
// content gets layered on in subsequent PRs.
//
// Tiles: 0 grass, 1 path, 2 water, 3 stone-floor, 4 wood-floor, 5 fence (solid),
//        6 wall (solid), 7 building-roof, 8 building-door
// Objects: { type, x, y, hp?, removed? }
//   types: 'tree','stump','rock','npc'

import { WORLD_W, WORLD_H, WORLD_SEED } from './config.js';

export const T = {
  GRASS: 0, PATH: 1, WATER: 2, STONE_FLOOR: 3, WOOD_FLOOR: 4,
  FENCE: 5, WALL: 6, BUILDING_ROOF: 7, BUILDING_DOOR: 8,
};

export const SOLID_TILES = new Set([T.WATER, T.FENCE, T.WALL, T.BUILDING_ROOF]);

export function tileIsSolid(t) { return SOLID_TILES.has(t); }

// Hash-based PRNG so the map is deterministic.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createWorld(seed = WORLD_SEED) {
  const W = WORLD_W, H = WORLD_H;
  const tiles = new Uint8Array(W * H);
  const objects = [];

  // Fill grass
  for (let i = 0; i < W * H; i++) tiles[i] = T.GRASS;

  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) tiles[y * W + x] = v; };
  const getT = (x, y) => (x >= 0 && y >= 0 && x < W && y < H) ? tiles[y * W + x] : -1;

  // Fences along the border
  for (let x = 0; x < W; x++) { set(x, 0, T.FENCE); set(x, H - 1, T.FENCE); }
  for (let y = 0; y < H; y++) { set(0, y, T.FENCE); set(W - 1, y, T.FENCE); }

  // A simple cross-shaped path so the empty map has *some* structure for
  // navigation and so the action-target highlighter has different tile types
  // to render. Will be replaced by a noir city-block layout later.
  const cxT = Math.floor(W / 2);
  const cyT = Math.floor(H / 2);
  for (let x = 4; x < W - 4; x++) set(x, cyT, T.PATH);
  for (let y = 4; y < H - 4; y++) set(cxT, y, T.PATH);

  // Pond (kept — a body of water is generic terrain)
  const pondX = Math.floor(W * 0.6);
  const pondY = Math.floor(H * 0.7);
  for (let y = -2; y <= 2; y++) {
    for (let x = -3; x <= 3; x++) {
      if (x * x + y * y * 1.5 <= 7) set(pondX + x, pondY + y, T.WATER);
    }
  }

  // Scatter trees and rocks as decoration / clearable obstacles
  const rand = mulberry32(seed);
  function placeObj(type, x, y, extra = {}) {
    if (getT(x, y) !== T.GRASS) return false;
    if (objects.some((o) => o.x === x && o.y === y)) return false;
    objects.push({ type, x, y, ...extra });
    return true;
  }

  for (let i = 0; i < 60; i++) {
    const x = 1 + Math.floor(rand() * (W - 2));
    const y = 1 + Math.floor(rand() * (H - 2));
    placeObj('tree', x, y, { hp: 3 });
  }
  for (let i = 0; i < 25; i++) {
    const x = 1 + Math.floor(rand() * (W - 2));
    const y = 1 + Math.floor(rand() * (H - 2));
    placeObj('rock', x, y, { hp: 2 });
  }

  return {
    width: W,
    height: H,
    tiles,
    objects,
    spawn: { x: cxT, y: cyT },
  };
}

export function tileAt(world, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= world.width || ty >= world.height) return -1;
  return world.tiles[ty * world.width + tx];
}

export function setTile(world, tx, ty, v) {
  if (tx < 0 || ty < 0 || tx >= world.width || ty >= world.height) return;
  world.tiles[ty * world.width + tx] = v;
}

export function objectAt(world, tx, ty) {
  for (const o of world.objects) if (!o.removed && o.x === tx && o.y === ty) return o;
  return null;
}

export function removeObject(world, obj) {
  obj.removed = true;
}

export function isPassable(world, tx, ty) {
  const t = tileAt(world, tx, ty);
  if (t === -1) return false;
  if (tileIsSolid(t)) return false;
  const o = objectAt(world, tx, ty);
  if (o && (o.type === 'tree' || o.type === 'rock' || (o.type === 'npc' && o.solid !== false))) return false;
  return true;
}

// Per-day update. Empty for now — was previously growing crops; will be
// repurposed for noir-side "world tick" later (NPC schedules, decay, etc).
export function endOfDay(_world) {}
