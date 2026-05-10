// Procedural pixel-art sprites drawn into offscreen canvases at boot.
// Tile size: 32x32 px. Player: 24x32 px (rendered centered in 32x32).
//
// Engine-level scaffold: tile, world-object, and player sprite generators
// remain. Crop, bed, chest, shop-sign, and shopkeeper sprites were removed
// with the farming gut. New noir RPG sprites (rain, neon, gadgets, suspects)
// will be added in subsequent PRs.

import { TILE } from './config.js';
export { TILE };
export const PLAYER_W = 24;
export const PLAYER_H = 32;

export const SPR = {};

function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function drawDot(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

// ---------- Tile sprites ----------

function makeGrass(seed) {
  const c = mkCanvas(TILE, TILE);
  const g = c.getContext('2d');
  g.fillStyle = '#5fa83a';
  g.fillRect(0, 0, TILE, TILE);
  let s = seed;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < 36; i++) {
    const x = Math.floor(rand() * TILE);
    const y = Math.floor(rand() * TILE);
    drawDot(g, x, y, rand() < 0.5 ? '#4d8e2d' : '#6fbb44');
  }
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(rand() * (TILE - 2)) + 1;
    const y = Math.floor(rand() * (TILE - 4)) + 2;
    g.fillStyle = '#82c953';
    g.fillRect(x, y, 1, 2);
    g.fillStyle = '#3e6f1c';
    g.fillRect(x, y + 2, 1, 1);
  }
  return c;
}

function makePath() {
  const c = mkCanvas(TILE, TILE);
  const g = c.getContext('2d');
  g.fillStyle = '#bd9b6d';
  g.fillRect(0, 0, TILE, TILE);
  let s = 7;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < 50; i++) {
    drawDot(g, Math.floor(rand() * TILE), Math.floor(rand() * TILE), rand() < 0.5 ? '#a8855a' : '#cdaa7a');
  }
  return c;
}

function makeWater(t) {
  const c = mkCanvas(TILE, TILE);
  const g = c.getContext('2d');
  g.fillStyle = '#3a72c4';
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle = '#5b9be0';
  for (let y = 2; y < TILE; y += 6) {
    const off = (t * 2 + y) % 8;
    g.fillRect(off, y, 4, 1);
    g.fillRect(off + 12, y + 2, 5, 1);
    g.fillRect(off + 22, y + 1, 3, 1);
  }
  g.fillStyle = '#83c1ff';
  for (let i = 0; i < 4; i++) {
    g.fillRect((t * 3 + i * 9) % TILE, (i * 7 + 3) % TILE, 1, 1);
  }
  return c;
}

function makeStoneFloor() {
  const c = mkCanvas(TILE, TILE);
  const g = c.getContext('2d');
  g.fillStyle = '#8a8a8a';
  g.fillRect(0, 0, TILE, TILE);
  g.strokeStyle = '#6a6a6a';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, 12); g.lineTo(TILE, 12);
  g.moveTo(0, 24); g.lineTo(TILE, 24);
  g.moveTo(8, 0); g.lineTo(8, 12);
  g.moveTo(20, 12); g.lineTo(20, 24);
  g.moveTo(14, 24); g.lineTo(14, TILE);
  g.stroke();
  return c;
}

function makeWood() {
  const c = mkCanvas(TILE, TILE);
  const g = c.getContext('2d');
  g.fillStyle = '#9a6a3a';
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle = '#7a4e22';
  g.fillRect(0, 10, TILE, 1);
  g.fillRect(0, 20, TILE, 1);
  g.fillStyle = '#b88a55';
  for (let y = 3; y < TILE; y += 10) {
    for (let x = 1; x < TILE; x += 6) g.fillRect(x, y, 2, 1);
  }
  return c;
}

function makeBuildingRoof() {
  const c = mkCanvas(TILE, TILE);
  const g = c.getContext('2d');
  g.fillStyle = '#a83c3c';
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle = '#7c2828';
  for (let y = 3; y < TILE; y += 6) g.fillRect(0, y, TILE, 1);
  for (let x = 0; x < TILE; x += 8) g.fillRect(x, 0, 1, TILE);
  return c;
}

function makeWall() {
  const c = mkCanvas(TILE, TILE);
  const g = c.getContext('2d');
  g.fillStyle = '#e0c590';
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle = '#b89a64';
  g.fillRect(0, 0, TILE, 2);
  g.fillRect(0, TILE - 2, TILE, 2);
  return c;
}

function makeDoor() {
  const c = mkCanvas(TILE, TILE);
  const g = c.getContext('2d');
  g.fillStyle = '#e0c590';
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle = '#5a3414';
  g.fillRect(8, 6, 16, 26);
  g.fillStyle = '#3a200a';
  g.fillRect(9, 7, 14, 24);
  g.fillStyle = '#ffd34d';
  g.fillRect(20, 18, 2, 2);
  return c;
}

function makeFence() {
  const c = mkCanvas(TILE, TILE);
  const g = c.getContext('2d');
  g.fillStyle = '#9a6a3a';
  g.fillRect(2, 8, 4, 18);
  g.fillRect(TILE - 6, 8, 4, 18);
  g.fillRect(0, 12, TILE, 3);
  g.fillRect(0, 22, TILE, 3);
  g.fillStyle = '#7a4a22';
  g.fillRect(0, 14, TILE, 1);
  g.fillRect(0, 24, TILE, 1);
  return c;
}

// ---------- World objects ----------

function makeTree() {
  const c = mkCanvas(TILE * 2, TILE * 3);
  const g = c.getContext('2d');
  g.fillStyle = '#2d5a18';
  g.beginPath();
  g.arc(TILE, TILE, 28, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#4a8a2c';
  g.beginPath();
  g.arc(TILE - 6, TILE - 6, 18, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#62a83a';
  g.beginPath();
  g.arc(TILE + 8, TILE - 4, 12, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#5a3414';
  g.fillRect(TILE - 4, TILE * 2 - 6, 8, TILE);
  g.fillStyle = '#3a200a';
  g.fillRect(TILE - 4, TILE * 2 - 6, 2, TILE);
  return c;
}

function makeStump() {
  const c = mkCanvas(TILE, TILE);
  const g = c.getContext('2d');
  g.fillStyle = '#5a3414';
  g.beginPath();
  g.ellipse(TILE / 2, TILE / 2 + 4, 10, 6, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#a87a48';
  g.beginPath();
  g.ellipse(TILE / 2, TILE / 2, 9, 5, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#5a3414';
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(TILE / 2, TILE / 2, 6, 3, 0, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.ellipse(TILE / 2, TILE / 2, 3, 1.5, 0, 0, Math.PI * 2);
  g.stroke();
  return c;
}

function makeRock() {
  const c = mkCanvas(TILE, TILE);
  const g = c.getContext('2d');
  g.fillStyle = '#888';
  g.beginPath();
  g.moveTo(8, TILE - 4);
  g.lineTo(4, 18);
  g.lineTo(12, 8);
  g.lineTo(20, 6);
  g.lineTo(28, 14);
  g.lineTo(26, TILE - 4);
  g.closePath();
  g.fill();
  g.fillStyle = '#a8a8a8';
  g.fillRect(10, 12, 6, 3);
  g.fillRect(18, 16, 4, 2);
  g.fillStyle = '#666';
  g.fillRect(8, 22, 14, 2);
  return c;
}

// ---------- Player ----------

function makePlayerFrame(dir, frame) {
  const c = mkCanvas(PLAYER_W, PLAYER_H);
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath();
  g.ellipse(PLAYER_W / 2, PLAYER_H - 1, 8, 2, 0, 0, Math.PI * 2);
  g.fill();
  const SHIRT = '#3a72c4';
  const PANTS = '#5a3414';
  const SKIN = '#f5d3a5';
  const HAIR = '#5a3414';
  const HAT = '#a83c3c';
  const BOOT = '#2a1408';

  const legOffset = frame === 1 ? 1 : (frame === 2 ? -1 : 0);
  g.fillStyle = PANTS;
  g.fillRect(8, 22, 4, 6 + legOffset);
  g.fillRect(12, 22, 4, 6 - legOffset);
  g.fillStyle = BOOT;
  g.fillRect(8, 28 + legOffset, 4, 2);
  g.fillRect(12, 28 - legOffset, 4, 2);

  g.fillStyle = SHIRT;
  g.fillRect(7, 14, 10, 9);
  g.fillStyle = '#2a548a';
  g.fillRect(7, 14, 10, 1);

  g.fillStyle = SHIRT;
  if (dir === 'left') {
    g.fillRect(5, 15, 2, 6);
  } else if (dir === 'right') {
    g.fillRect(17, 15, 2, 6);
  } else {
    g.fillRect(5, 15, 2, 6);
    g.fillRect(17, 15, 2, 6);
  }
  g.fillStyle = SKIN;
  if (dir === 'left') { g.fillRect(5, 21, 2, 2); }
  else if (dir === 'right') { g.fillRect(17, 21, 2, 2); }
  else { g.fillRect(5, 21, 2, 2); g.fillRect(17, 21, 2, 2); }

  g.fillStyle = SKIN;
  g.fillRect(7, 6, 10, 9);
  g.fillStyle = HAIR;
  g.fillRect(6, 5, 12, 4);
  g.fillStyle = HAT;
  g.fillRect(5, 3, 14, 3);
  g.fillRect(6, 1, 12, 2);
  g.fillStyle = '#2a1408';
  g.fillRect(5, 5, 14, 1);

  if (dir === 'down') {
    g.fillStyle = '#000';
    g.fillRect(9, 11, 1, 2);
    g.fillRect(14, 11, 1, 2);
    g.fillStyle = '#a8542a';
    g.fillRect(11, 13, 2, 1);
  } else if (dir === 'up') {
    g.fillStyle = HAIR;
    g.fillRect(6, 9, 12, 4);
  } else if (dir === 'left') {
    g.fillStyle = '#000';
    g.fillRect(8, 11, 1, 2);
    g.fillStyle = '#a8542a';
    g.fillRect(7, 13, 2, 1);
  } else if (dir === 'right') {
    g.fillStyle = '#000';
    g.fillRect(15, 11, 1, 2);
    g.fillStyle = '#a8542a';
    g.fillRect(15, 13, 2, 1);
  }

  return c;
}

// ---------- NPC (generic placeholder) ----------

function makeNPC() {
  const c = mkCanvas(PLAYER_W, PLAYER_H);
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath();
  g.ellipse(PLAYER_W / 2, PLAYER_H - 1, 8, 2, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1f1a14';
  g.fillRect(8, 22, 4, 8);
  g.fillRect(12, 22, 4, 8);
  g.fillStyle = '#5a3414';
  g.fillRect(7, 14, 10, 10);
  g.fillStyle = '#5a3414';
  g.fillRect(5, 15, 2, 6);
  g.fillRect(17, 15, 2, 6);
  g.fillStyle = '#f5d3a5';
  g.fillRect(5, 21, 2, 2);
  g.fillRect(17, 21, 2, 2);
  g.fillStyle = '#f5d3a5';
  g.fillRect(7, 6, 10, 9);
  g.fillStyle = '#c8c8c8';
  g.fillRect(6, 5, 12, 4);
  g.fillStyle = '#000';
  g.fillRect(9, 11, 1, 1);
  g.fillRect(14, 11, 1, 1);
  return c;
}

// ---------- Build all sprites ----------

export function buildSprites() {
  SPR.grass = [makeGrass(11), makeGrass(73), makeGrass(127), makeGrass(199)];
  SPR.path = makePath();
  SPR.water = [makeWater(0), makeWater(2), makeWater(4), makeWater(6)];
  SPR.stoneFloor = makeStoneFloor();
  SPR.wood = makeWood();
  SPR.buildingRoof = makeBuildingRoof();
  SPR.wall = makeWall();
  SPR.door = makeDoor();
  SPR.fence = makeFence();

  SPR.tree = makeTree();
  SPR.stump = makeStump();
  SPR.rock = makeRock();

  SPR.player = {
    down:  [makePlayerFrame('down', 0),  makePlayerFrame('down', 1),  makePlayerFrame('down', 2)],
    up:    [makePlayerFrame('up', 0),    makePlayerFrame('up', 1),    makePlayerFrame('up', 2)],
    left:  [makePlayerFrame('left', 0),  makePlayerFrame('left', 1),  makePlayerFrame('left', 2)],
    right: [makePlayerFrame('right', 0), makePlayerFrame('right', 1), makePlayerFrame('right', 2)],
  };
  SPR.npc = makeNPC();
}
