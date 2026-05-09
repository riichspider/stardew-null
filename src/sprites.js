// Procedural pixel-art sprites drawn into offscreen canvases at boot.
// Tile size: 32x32 px. Player: 24x32 px (rendered centered in 32x32).

export const TILE = 32;
export const PLAYER_W = 24;
export const PLAYER_H = 32;

// Cache of created bitmaps by name
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

function drawRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// Pixel pattern from a string array using a palette key.
function paint(ctx, x0, y0, rows, palette) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const c = palette[ch];
      if (c) drawDot(ctx, x0 + x, y0 + y, c);
    }
  }
}

// ---------- Tile sprites ----------

function makeGrass(seed) {
  const c = mkCanvas(TILE, TILE);
  const g = c.getContext('2d');
  // Base
  g.fillStyle = '#5fa83a';
  g.fillRect(0, 0, TILE, TILE);
  // Noisy darker patches
  let s = seed;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < 36; i++) {
    const x = Math.floor(rand() * TILE);
    const y = Math.floor(rand() * TILE);
    drawDot(g, x, y, rand() < 0.5 ? '#4d8e2d' : '#6fbb44');
  }
  // tiny grass blades
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

function makeTilled() {
  const c = mkCanvas(TILE, TILE);
  const g = c.getContext('2d');
  g.fillStyle = '#6e4524';
  g.fillRect(0, 0, TILE, TILE);
  // ridges
  g.fillStyle = '#4f2f15';
  for (let y = 4; y < TILE; y += 8) {
    g.fillRect(2, y, TILE - 4, 2);
  }
  g.fillStyle = '#8a5a32';
  for (let y = 6; y < TILE; y += 8) {
    g.fillRect(2, y, TILE - 4, 1);
  }
  // border
  g.fillStyle = '#3a2210';
  g.fillRect(0, 0, TILE, 1);
  g.fillRect(0, TILE - 1, TILE, 1);
  g.fillRect(0, 0, 1, TILE);
  g.fillRect(TILE - 1, 0, 1, TILE);
  return c;
}

function makeWatered() {
  const c = mkCanvas(TILE, TILE);
  const g = c.getContext('2d');
  g.drawImage(makeTilled(), 0, 0);
  // dark wet overlay
  g.fillStyle = 'rgba(20, 30, 60, 0.5)';
  g.fillRect(0, 0, TILE, TILE);
  // shine
  g.fillStyle = 'rgba(150, 200, 255, 0.35)';
  for (let i = 0; i < 6; i++) {
    g.fillRect(2 + i * 5, 4 + (i % 2) * 14, 2, 1);
  }
  return c;
}

function makeWater(t) {
  const c = mkCanvas(TILE, TILE);
  const g = c.getContext('2d');
  g.fillStyle = '#3a72c4';
  g.fillRect(0, 0, TILE, TILE);
  // ripples (animation frame index t)
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

function makeHouseRoof() {
  const c = mkCanvas(TILE, TILE);
  const g = c.getContext('2d');
  g.fillStyle = '#a83c3c';
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle = '#7c2828';
  for (let y = 3; y < TILE; y += 6) g.fillRect(0, y, TILE, 1);
  for (let x = 0; x < TILE; x += 8) g.fillRect(x, 0, 1, TILE);
  return c;
}

function makeShopRoof() {
  const c = mkCanvas(TILE, TILE);
  const g = c.getContext('2d');
  g.fillStyle = '#7a4a22';
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle = '#5a3414';
  for (let y = 3; y < TILE; y += 6) g.fillRect(0, y, TILE, 1);
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

function makeShopSign() {
  const c = mkCanvas(TILE, TILE);
  const g = c.getContext('2d');
  g.fillStyle = '#e0c590';
  g.fillRect(0, 0, TILE, TILE);
  // sign on wall
  g.fillStyle = '#5a3414';
  g.fillRect(4, 6, 24, 14);
  g.fillStyle = '#ffd34d';
  g.font = 'bold 10px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('LOJA', TILE / 2, 13);
  return c;
}

function makeFence(side) {
  const c = mkCanvas(TILE, TILE);
  const g = c.getContext('2d');
  g.fillStyle = '#9a6a3a';
  // posts
  g.fillRect(2, 8, 4, 18);
  g.fillRect(TILE - 6, 8, 4, 18);
  // rails
  g.fillRect(0, 12, TILE, 3);
  g.fillRect(0, 22, TILE, 3);
  g.fillStyle = '#7a4a22';
  g.fillRect(0, 14, TILE, 1);
  g.fillRect(0, 24, TILE, 1);
  return c;
}

function makeBed() {
  const c = mkCanvas(TILE * 2, TILE);
  const g = c.getContext('2d');
  // frame
  g.fillStyle = '#7a4a22';
  g.fillRect(0, 4, TILE * 2, TILE - 4);
  // mattress
  g.fillStyle = '#f0d9a4';
  g.fillRect(2, 6, TILE * 2 - 4, TILE - 10);
  // pillow
  g.fillStyle = '#fff';
  g.fillRect(4, 8, 16, TILE - 14);
  // blanket
  g.fillStyle = '#3a72c4';
  g.fillRect(24, 8, TILE * 2 - 28, TILE - 14);
  g.fillStyle = '#5b9be0';
  for (let x = 26; x < TILE * 2 - 4; x += 5) g.fillRect(x, 12, 2, 6);
  return c;
}

function makeChest() {
  const c = mkCanvas(TILE, TILE);
  const g = c.getContext('2d');
  g.fillStyle = '#7a4a22';
  g.fillRect(4, 8, 24, 20);
  g.fillStyle = '#5a3414';
  g.fillRect(4, 8, 24, 4);
  g.fillStyle = '#ffd34d';
  g.fillRect(14, 14, 4, 6);
  g.fillRect(15, 16, 2, 2);
  return c;
}

// ---------- World objects (drawn over a base tile) ----------

function makeTree(stage) {
  // stage: 0 = sapling, 1..3 = growing, 4 = mature; we'll just provide mature.
  const c = mkCanvas(TILE * 2, TILE * 3);
  const g = c.getContext('2d');
  // canopy
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
  // trunk
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

function makeWeed() {
  const c = mkCanvas(TILE, TILE);
  const g = c.getContext('2d');
  g.fillStyle = '#3e6f1c';
  for (let i = 0; i < 5; i++) {
    g.fillRect(8 + i * 3, 16 - i * 2, 2, 12 + i);
  }
  g.fillStyle = '#62a83a';
  for (let i = 0; i < 5; i++) {
    g.fillRect(9 + i * 3, 14 - i * 2, 1, 10 + i);
  }
  return c;
}

function makeGrassTuft() {
  const c = mkCanvas(TILE, TILE);
  const g = c.getContext('2d');
  g.fillStyle = '#82c953';
  g.fillRect(8, 18, 2, 8);
  g.fillRect(12, 14, 2, 12);
  g.fillRect(16, 16, 2, 10);
  g.fillRect(20, 13, 2, 13);
  g.fillRect(24, 17, 2, 9);
  g.fillStyle = '#3e6f1c';
  g.fillRect(8, 24, 18, 2);
  return c;
}

// Crop sprites — generated dynamically based on stage / data
export function drawCrop(ctx, dx, dy, cropDef, stage, watered) {
  const total = cropDef.stages;
  const ratio = stage / (total - 1);
  // base soil tint already there. Draw plant
  const cx = dx + TILE / 2;
  const cy = dy + TILE - 4;
  if (stage === 0) {
    // sprout
    ctx.fillStyle = '#4a8a2c';
    ctx.fillRect(cx - 1, cy - 6, 2, 6);
    ctx.fillStyle = '#82c953';
    ctx.fillRect(cx - 3, cy - 6, 2, 2);
    ctx.fillRect(cx + 1, cy - 6, 2, 2);
  } else if (stage < total - 2) {
    const h = 6 + Math.floor(ratio * 16);
    ctx.fillStyle = '#3e6f1c';
    ctx.fillRect(cx - 1, cy - h, 2, h);
    ctx.fillStyle = '#62a83a';
    ctx.fillRect(cx - 4, cy - h + 4, 3, 2);
    ctx.fillRect(cx + 1, cy - h + 6, 3, 2);
    ctx.fillRect(cx - 5, cy - h + 10, 4, 2);
    ctx.fillRect(cx + 1, cy - h + 12, 4, 2);
  } else if (stage < total - 1) {
    // budding stage
    ctx.fillStyle = '#3e6f1c';
    ctx.fillRect(cx - 1, cy - 18, 2, 18);
    ctx.fillStyle = '#62a83a';
    ctx.fillRect(cx - 5, cy - 14, 4, 2);
    ctx.fillRect(cx + 1, cy - 12, 4, 2);
    ctx.fillRect(cx - 5, cy - 8, 4, 2);
    ctx.fillRect(cx + 1, cy - 6, 4, 2);
    // bud
    ctx.fillStyle = cropDef.flower || '#ffe066';
    ctx.beginPath();
    ctx.arc(cx, cy - 20, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // ready
    ctx.fillStyle = '#3e6f1c';
    ctx.fillRect(cx - 1, cy - 18, 2, 18);
    ctx.fillStyle = '#62a83a';
    ctx.fillRect(cx - 6, cy - 14, 5, 2);
    ctx.fillRect(cx + 1, cy - 12, 5, 2);
    ctx.fillStyle = cropDef.color;
    ctx.beginPath();
    ctx.arc(cx, cy - 22, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(cx, cy - 22, 6, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ---------- Player ----------

function makePlayerFrame(dir, frame) {
  // dir: 'down','up','left','right'; frame: 0/1/2 (idle/step1/step2)
  const c = mkCanvas(PLAYER_W, PLAYER_H);
  const g = c.getContext('2d');
  // shadow
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath();
  g.ellipse(PLAYER_W / 2, PLAYER_H - 1, 8, 2, 0, 0, Math.PI * 2);
  g.fill();
  // body (overall shirt blue)
  const SHIRT = '#3a72c4';
  const PANTS = '#5a3414';
  const SKIN = '#f5d3a5';
  const HAIR = '#5a3414';
  const HAT = '#a83c3c';
  const BOOT = '#2a1408';

  // legs
  const legOffset = frame === 1 ? 1 : (frame === 2 ? -1 : 0);
  g.fillStyle = PANTS;
  g.fillRect(8, 22, 4, 6 + legOffset);
  g.fillRect(12, 22, 4, 6 - legOffset);
  // boots
  g.fillStyle = BOOT;
  g.fillRect(8, 28 + legOffset, 4, 2);
  g.fillRect(12, 28 - legOffset, 4, 2);

  // torso
  g.fillStyle = SHIRT;
  g.fillRect(7, 14, 10, 9);
  g.fillStyle = '#2a548a';
  g.fillRect(7, 14, 10, 1);

  // arms
  g.fillStyle = SHIRT;
  if (dir === 'left') {
    g.fillRect(5, 15, 2, 6);
  } else if (dir === 'right') {
    g.fillRect(17, 15, 2, 6);
  } else {
    g.fillRect(5, 15, 2, 6);
    g.fillRect(17, 15, 2, 6);
  }
  // hands
  g.fillStyle = SKIN;
  if (dir === 'left') { g.fillRect(5, 21, 2, 2); }
  else if (dir === 'right') { g.fillRect(17, 21, 2, 2); }
  else { g.fillRect(5, 21, 2, 2); g.fillRect(17, 21, 2, 2); }

  // head
  g.fillStyle = SKIN;
  g.fillRect(7, 6, 10, 9);
  // hair
  g.fillStyle = HAIR;
  g.fillRect(6, 5, 12, 4);
  // hat
  g.fillStyle = HAT;
  g.fillRect(5, 3, 14, 3);
  g.fillRect(6, 1, 12, 2);
  // hat band
  g.fillStyle = '#2a1408';
  g.fillRect(5, 5, 14, 1);

  // face (depends on direction)
  if (dir === 'down') {
    g.fillStyle = '#000';
    g.fillRect(9, 11, 1, 2);
    g.fillRect(14, 11, 1, 2);
    g.fillStyle = '#a8542a';
    g.fillRect(11, 13, 2, 1);
  } else if (dir === 'up') {
    // back of head, no eyes
    g.fillStyle = HAIR;
    g.fillRect(6, 9, 12, 4);
  } else if (dir === 'left') {
    g.fillStyle = '#000';
    g.fillRect(8, 11, 1, 2);
    // mouth
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

// ---------- NPC (shopkeeper) ----------

function makeShopkeeper() {
  const c = mkCanvas(PLAYER_W, PLAYER_H);
  const g = c.getContext('2d');
  // shadow
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath();
  g.ellipse(PLAYER_W / 2, PLAYER_H - 1, 8, 2, 0, 0, Math.PI * 2);
  g.fill();
  // pants
  g.fillStyle = '#1f1a14';
  g.fillRect(8, 22, 4, 8);
  g.fillRect(12, 22, 4, 8);
  // apron
  g.fillStyle = '#f0d9a4';
  g.fillRect(7, 16, 10, 8);
  // shirt (visible above apron)
  g.fillStyle = '#5a3414';
  g.fillRect(7, 14, 10, 3);
  // arms
  g.fillStyle = '#5a3414';
  g.fillRect(5, 15, 2, 6);
  g.fillRect(17, 15, 2, 6);
  // hands
  g.fillStyle = '#f5d3a5';
  g.fillRect(5, 21, 2, 2);
  g.fillRect(17, 21, 2, 2);
  // head
  g.fillStyle = '#f5d3a5';
  g.fillRect(7, 6, 10, 9);
  // bald + ring of grey hair
  g.fillStyle = '#c8c8c8';
  g.fillRect(6, 9, 12, 2);
  // beard
  g.fillStyle = '#c8c8c8';
  g.fillRect(7, 13, 10, 2);
  // eyes
  g.fillStyle = '#000';
  g.fillRect(9, 11, 1, 1);
  g.fillRect(14, 11, 1, 1);
  return c;
}

// ---------- Item icons (small 24x24) ----------

function makeSeedBag(color) {
  const c = mkCanvas(24, 24);
  const g = c.getContext('2d');
  g.fillStyle = '#d8b97a';
  g.beginPath();
  g.moveTo(4, 8); g.lineTo(20, 8); g.lineTo(18, 22); g.lineTo(6, 22);
  g.closePath();
  g.fill();
  g.fillStyle = '#a8855a';
  g.fillRect(4, 8, 16, 2);
  g.fillStyle = color;
  g.fillRect(10, 12, 4, 4);
  return c;
}

// ---------- Build all sprites ----------

export function buildSprites() {
  // tiles
  SPR.grass = [makeGrass(11), makeGrass(73), makeGrass(127), makeGrass(199)];
  SPR.path = makePath();
  SPR.tilled = makeTilled();
  SPR.watered = makeWatered();
  SPR.water = [makeWater(0), makeWater(2), makeWater(4), makeWater(6)];
  SPR.stoneFloor = makeStoneFloor();
  SPR.wood = makeWood();
  SPR.houseRoof = makeHouseRoof();
  SPR.shopRoof = makeShopRoof();
  SPR.wall = makeWall();
  SPR.door = makeDoor();
  SPR.shopSign = makeShopSign();
  SPR.fence = makeFence();
  SPR.bed = makeBed();
  SPR.chest = makeChest();

  // objects
  SPR.tree = makeTree();
  SPR.stump = makeStump();
  SPR.rock = makeRock();
  SPR.weed = makeWeed();
  SPR.grassTuft = makeGrassTuft();

  // entities
  SPR.player = {
    down:  [makePlayerFrame('down', 0),  makePlayerFrame('down', 1),  makePlayerFrame('down', 2)],
    up:    [makePlayerFrame('up', 0),    makePlayerFrame('up', 1),    makePlayerFrame('up', 2)],
    left:  [makePlayerFrame('left', 0),  makePlayerFrame('left', 1),  makePlayerFrame('left', 2)],
    right: [makePlayerFrame('right', 0), makePlayerFrame('right', 1), makePlayerFrame('right', 2)],
  };
  SPR.shopkeeper = makeShopkeeper();

  SPR.seedBag = makeSeedBag('#62a83a');
}
