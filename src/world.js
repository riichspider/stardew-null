// World map: tile grid + sparse objects layer.
// Tile IDs:
//   0 grass, 1 path, 2 tilled, 3 watered, 4 water, 5 stone floor (interior),
//   6 wood floor (interior), 7 house roof (solid), 8 shop roof (solid),
//   9 wall (solid), 10 house-door, 11 shop-door, 12 fence (solid), 13 bed,
//   14 shop sign (solid), 15 chest (solid)
// Objects: { type, x, y, hp?, watered?, planted?, stage?, regrowDays? }
//   types: 'tree','stump','rock','weed','grassTuft','npc'

import { WORLD_W, WORLD_H, WORLD_SEED } from './config.js';

export const T = {
  GRASS: 0, PATH: 1, TILLED: 2, WATERED: 3, WATER: 4, STONE_FLOOR: 5, WOOD_FLOOR: 6,
  HOUSE_ROOF: 7, SHOP_ROOF: 8, WALL: 9, HOUSE_DOOR: 10, SHOP_DOOR: 11, FENCE: 12, BED: 13,
  SHOP_SIGN: 14, CHEST: 15,
};

export const SOLID_TILES = new Set([T.WATER, T.HOUSE_ROOF, T.SHOP_ROOF, T.WALL, T.FENCE, T.SHOP_SIGN, T.CHEST]);
// BED is interactable but walkable so player can press space on it.
// HOUSE_DOOR / SHOP_DOOR walkable; SHOP_DOOR triggers shop.

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
  const objects = []; // sparse list

  // fill grass
  for (let i = 0; i < W * H; i++) tiles[i] = T.GRASS;

  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) tiles[y * W + x] = v; };
  const getT = (x, y) => (x >= 0 && y >= 0 && x < W && y < H) ? tiles[y * W + x] : -1;

  // Fences along the border
  for (let x = 0; x < W; x++) { set(x, 0, T.FENCE); set(x, H - 1, T.FENCE); }
  for (let y = 0; y < H; y++) { set(0, y, T.FENCE); set(W - 1, y, T.FENCE); }

  // ---------- Player house (NW area) ----------
  // House is 4 wide, 3 tall
  const hx = 3, hy = 3;
  for (let dx = 0; dx < 4; dx++) {
    set(hx + dx, hy, T.HOUSE_ROOF);
    set(hx + dx, hy + 1, T.WALL);
    set(hx + dx, hy + 2, T.WALL);
  }
  set(hx + 1, hy + 2, T.HOUSE_DOOR); // door
  // bed outside the house (porch) so player can sleep without an interior
  set(hx + 4, hy + 2, T.PATH);
  set(hx + 4, hy + 1, T.PATH);
  set(hx + 4, hy, T.PATH);
  // Bed placed on porch right next to door
  set(hx + 4, hy + 1, T.BED);
  // Chest next to bed
  set(hx + 5, hy + 2, T.CHEST);

  // path leading from door
  for (let dy = 0; dy < 5; dy++) set(hx + 1, hy + 3 + dy, T.PATH);
  // path branching to farm area
  for (let dx = 0; dx < 8; dx++) set(hx + 1 + dx, hy + 7, T.PATH);
  // porch access lane: connect the bed/chest column down to the y-branch path,
  // so the player can walk to the bed without trees blocking the way.
  for (let dy = 3; dy < 7; dy++) set(hx + 4, hy + dy, T.PATH);

  // ---------- Shop building (SW) ----------
  const sx = 4, sy = 22;
  for (let dx = 0; dx < 5; dx++) {
    set(sx + dx, sy, T.SHOP_ROOF);
    set(sx + dx, sy + 1, dx === 1 ? T.SHOP_SIGN : T.WALL);
    set(sx + dx, sy + 2, T.WALL);
  }
  set(sx + 2, sy + 2, T.SHOP_DOOR);
  // path from shop
  for (let dy = 1; dy < 6; dy++) set(sx + 2, sy + 2 + dy, T.PATH);

  // ---------- Pond ----------
  const cx = 28, cy = 20;
  for (let y = -2; y <= 2; y++) {
    for (let x = -3; x <= 3; x++) {
      if (x * x + y * y * 1.5 <= 7) set(cx + x, cy + y, T.WATER);
    }
  }

  // ---------- Farm area ----------
  // Mark area as "farmable" — currently it's just grass, player tills it manually.

  // ---------- Forest (random trees, north + east) ----------
  const rand = mulberry32(seed);
  function placeObj(type, x, y, extra = {}) {
    if (getT(x, y) !== T.GRASS) return false;
    if (objects.some((o) => o.x === x && o.y === y)) return false;
    objects.push({ type, x, y, ...extra });
    return true;
  }

  // Trees (avoid farm zone roughly between x=12..30, y=10..22).
  // House/shop exclusion zones extend a couple of tiles past the building so the
  // walking lanes between path branches and porches are guaranteed clear.
  for (let i = 0; i < 60; i++) {
    const x = 1 + Math.floor(rand() * (W - 2));
    const y = 1 + Math.floor(rand() * (H - 2));
    const inFarm = x >= 12 && x <= 30 && y >= 10 && y <= 22;
    const inHouse = x >= hx - 1 && x <= hx + 6 && y >= hy - 1 && y <= hy + 8;
    const inShop = x >= sx - 1 && x <= sx + 6 && y >= sy - 1 && y <= sy + 7;
    const nearPath = getT(x, y) === T.PATH;
    if (inFarm || inHouse || inShop || nearPath) continue;
    placeObj('tree', x, y, { hp: 3 });
  }

  // Rocks
  for (let i = 0; i < 25; i++) {
    const x = 30 + Math.floor(rand() * (W - 32));
    const y = 1 + Math.floor(rand() * (H - 2));
    placeObj('rock', x, y, { hp: 2 });
  }
  // a few rocks scattered everywhere too
  for (let i = 0; i < 8; i++) {
    const x = 1 + Math.floor(rand() * (W - 2));
    const y = 1 + Math.floor(rand() * (H - 2));
    const inFarm = x >= 12 && x <= 30 && y >= 10 && y <= 22;
    if (inFarm) continue;
    placeObj('rock', x, y, { hp: 2 });
  }

  // Weeds + grass tufts
  for (let i = 0; i < 50; i++) {
    const x = 1 + Math.floor(rand() * (W - 2));
    const y = 1 + Math.floor(rand() * (H - 2));
    placeObj(rand() < 0.4 ? 'weed' : 'grassTuft', x, y);
  }

  // NPC shopkeeper in front of shop
  objects.push({ type: 'npc', name: 'Pierre', x: sx + 2, y: sy + 4, dir: 'down', solid: false });

  return {
    width: W,
    height: H,
    tiles,
    objects,
    spawn: { x: hx + 1, y: hy + 4 }, // just below the door
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
  // Returns first non-removed object at tile.
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

// Per-day update: trees regrow stumps to trees (skip), crops grow if watered, weeds spread (skip for now).
export function endOfDay(world) {
  for (const o of world.objects) {
    if (o.removed) continue;
    if (o.type === 'crop') {
      if (o.watered && !o.ready) {
        o.daysGrown = (o.daysGrown || 0) + 1;
      }
      o.watered = false; // dries overnight
    }
  }
  // dry watered tiles back to tilled
  for (let i = 0; i < world.tiles.length; i++) {
    if (world.tiles[i] === T.WATERED) world.tiles[i] = T.TILLED;
  }
}
