// Player: movement, animation, tool use.

import { Input } from './input.js';
import { TILE } from './sprites.js';
import { isPassable, tileAt, setTile, T, objectAt } from './world.js';

export function createPlayer(spawn) {
  return {
    // pixel position (top-left of player sprite, 24x32)
    x: spawn.x * TILE + 4,
    y: spawn.y * TILE,
    dir: 'down',
    speed: 130, // px/sec
    moving: false,
    animTime: 0,
    animFrame: 0,
    actionAnimT: 0, // when > 0, show "swing" effect briefly
  };
}

export function tileInFront(player) {
  const cx = (player.x + 12) / TILE;
  const cy = (player.y + 28) / TILE;
  let tx = Math.floor(cx);
  let ty = Math.floor(cy);
  if (player.dir === 'up') ty -= 1;
  else if (player.dir === 'down') ty += 1;
  else if (player.dir === 'left') tx -= 1;
  else if (player.dir === 'right') tx += 1;
  return { tx, ty };
}

export function playerTile(player) {
  return {
    tx: Math.floor((player.x + 12) / TILE),
    ty: Math.floor((player.y + 28) / TILE),
  };
}

export function updatePlayer(player, world, dt) {
  let dx = 0, dy = 0;
  if (Input.isDown('up')) dy -= 1;
  if (Input.isDown('down')) dy += 1;
  if (Input.isDown('left')) dx -= 1;
  if (Input.isDown('right')) dx += 1;

  if (dx || dy) {
    // facing
    if (Math.abs(dy) >= Math.abs(dx)) player.dir = dy < 0 ? 'up' : 'down';
    else player.dir = dx < 0 ? 'left' : 'right';

    // normalize diagonal
    const len = Math.hypot(dx, dy);
    dx /= len; dy /= len;
    const step = player.speed * dt;
    const nx = player.x + dx * step;
    const ny = player.y + dy * step;

    // attempt X
    if (canStandAt(nx, player.y, world)) player.x = nx;
    if (canStandAt(player.x, ny, world)) player.y = ny;

    player.moving = true;
    player.animTime += dt;
    if (player.animTime > 0.16) {
      player.animTime = 0;
      player.animFrame = (player.animFrame + 1) % 3;
      if (player.animFrame === 0) player.animFrame = 1; // skip idle frame in walk
    }
  } else {
    player.moving = false;
    player.animFrame = 0;
    player.animTime = 0;
  }

  if (player.actionAnimT > 0) player.actionAnimT -= dt;
}

function canStandAt(px, py, world) {
  // player footprint center
  const cx = px + 12;
  const cy = py + 28;
  const tx = Math.floor(cx / TILE);
  const ty = Math.floor(cy / TILE);
  return isPassable(world, tx, ty);
}

// Returns the action available for the tile/object the player is facing.
// Engine-level scaffold: only generic interactions remain. Tool-specific
// actions (till/plant/water/etc) were removed with the farming gut and will
// be replaced with noir gadgets and investigation interactions.
export function describeTargetAction(player, world, _selectedItemDef, _selectedItem) {
  const { tx, ty } = tileInFront(player);
  const t = tileAt(world, tx, ty);
  if (t === -1) return { kind: 'none', tx, ty };
  const obj = objectAt(world, tx, ty);

  if (obj && obj.type === 'npc') return { kind: 'talk', tx, ty, obj };
  if (t === T.BUILDING_DOOR) return { kind: 'enter', tx, ty };

  // Bare-hands clearing — placeholder so the world has *some* interactivity
  // before the real gadget actions land.
  if (obj && obj.type === 'tree') return { kind: 'chop', tx, ty, obj };
  if (obj && obj.type === 'stump') return { kind: 'chopStump', tx, ty, obj };
  if (obj && obj.type === 'rock') return { kind: 'rock', tx, ty, obj };

  return { kind: 'none', tx, ty };
}
