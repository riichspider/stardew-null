// Procedural pixel-art sprites drawn into offscreen canvases at boot.
//
// Side-view (Backbone-style): the player is a side-profile detective and
// scenes are composed of horizontally-scrolling layers. Procedural generators
// here are the *fallback* for when hand-drawn PNGs are absent from
// `assets/`. When a PNG is present (see `src/assets.js`), the renderer uses
// the image instead of the matching procedural sprite.

import { CANVAS_H, PALETTE, PLAYER_W, PLAYER_H } from './config.js';

export { PLAYER_W, PLAYER_H };
export const SPR = {};

function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// ---------- Detective (side-profile, facing right) ----------
//
// 24×32 sprite. The renderer flips horizontally for left-facing.
// Frames produced: idle×2, walk×4. Fedora + sobretudo + cigarro acesso.

function makeDetectiveFrame(kind, frame) {
  const c = mkCanvas(PLAYER_W, PLAYER_H);
  const g = c.getContext('2d');

  const COAT = PALETTE.detectiveCoat;
  const COAT_LIT = PALETTE.detectiveCoatLit;
  const PANTS = PALETTE.detectivePants;
  const HAT = PALETTE.detectiveHat;
  const SKIN = PALETTE.detectiveSkin;
  const CIGAR = PALETTE.detectiveCigar;

  // shadow
  g.fillStyle = 'rgba(0,0,0,0.4)';
  g.beginPath();
  g.ellipse(PLAYER_W / 2, PLAYER_H - 1, 8, 2, 0, 0, Math.PI * 2);
  g.fill();

  // walk bob: y offset + leg phase
  const bob = (kind === 'walk' && (frame === 1 || frame === 3)) ? -1 : 0;
  const legPhase = (kind === 'walk') ? frame : 0;

  // legs (pants)
  g.fillStyle = PANTS;
  // back leg
  const backLegOffsetX = (legPhase === 0) ? 0 : (legPhase === 2 ? -1 : 0);
  // front leg
  const frontLegOffsetX = (legPhase === 0) ? 0 : (legPhase === 2 ? 1 : 0);
  g.fillRect(10 + backLegOffsetX, 24 + bob, 3, 6);
  g.fillRect(13 + frontLegOffsetX, 24 + bob, 3, 6);
  // boots
  g.fillStyle = '#0a0a0e';
  g.fillRect(10 + backLegOffsetX, 30 + bob, 3, 1);
  g.fillRect(13 + frontLegOffsetX, 30 + bob, 4, 1);

  // sobretudo (long coat) — silhouette covering torso + upper legs
  g.fillStyle = COAT;
  // main coat block
  g.fillRect(8, 13 + bob, 10, 12);
  // shoulder slope
  g.fillRect(9, 12 + bob, 8, 1);
  // belt cinched
  g.fillStyle = '#15151a';
  g.fillRect(8, 19 + bob, 10, 1);
  // coat highlight (rim from neon backlight)
  g.fillStyle = COAT_LIT;
  g.fillRect(17, 13 + bob, 1, 10);

  // collar (raised)
  g.fillStyle = COAT;
  g.fillRect(11, 10 + bob, 5, 3);
  g.fillStyle = COAT_LIT;
  g.fillRect(15, 10 + bob, 1, 3);

  // arm (right arm, in front, holding cigarette near face on idle frame 1)
  g.fillStyle = COAT;
  if (kind === 'walk') {
    // arm swinging
    const armSwing = (frame === 0 || frame === 2) ? 0 : (frame === 1 ? -1 : 1);
    g.fillRect(15, 16 + bob, 2, 7 + armSwing);
  } else {
    g.fillRect(15, 16 + bob, 2, 7);
  }
  // hand (skin)
  g.fillStyle = SKIN;
  g.fillRect(15, 22 + bob + (kind === 'walk' ? (frame === 1 ? -1 : 0) : 0), 2, 1);

  // head
  g.fillStyle = SKIN;
  g.fillRect(11, 5 + bob, 5, 6);
  // jaw line shadow
  g.fillStyle = '#a07560';
  g.fillRect(11, 10 + bob, 5, 1);

  // fedora (wide brim + crown, side view)
  g.fillStyle = HAT;
  // brim
  g.fillRect(8, 4 + bob, 10, 1);
  g.fillRect(9, 5 + bob, 8, 1);
  // crown
  g.fillRect(11, 1 + bob, 6, 4);
  // crown band
  g.fillStyle = '#000';
  g.fillRect(11, 4 + bob, 6, 1);
  // crown highlight
  g.fillStyle = '#2a2a30';
  g.fillRect(16, 2 + bob, 1, 2);

  // eye (single pixel, side view)
  g.fillStyle = '#000';
  g.fillRect(15, 7 + bob, 1, 1);

  // cigarette tip (small glowing dot near mouth)
  // flickers on idle.1 frame
  const showCigar = (kind === 'idle' && frame === 1) || kind === 'walk';
  if (showCigar) {
    g.fillStyle = CIGAR;
    g.fillRect(17, 9 + bob, 1, 1);
    // smoke wisp
    g.fillStyle = 'rgba(200,200,210,0.4)';
    g.fillRect(18, 7 + bob, 1, 1);
  }

  return c;
}

// ---------- Building silhouette generators (procedural fallback) ----------
//
// Drawn into a wide canvas (sceneWidth × CANVAS_H) so the layer can be
// rendered with a single drawImage call offset by `-cameraX * parallax`.
//
// `seed` is a deterministic int. All randomness comes from a mulberry32 PRNG
// keyed on it so the layer looks the same every boot.

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeSkyLayer(width, height = CANVAS_H, seed = 7) {
  const c = mkCanvas(width, height);
  const g = c.getContext('2d');
  // gradient
  const grad = g.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, PALETTE.sky[0]);
  grad.addColorStop(0.5, PALETTE.sky[1]);
  grad.addColorStop(1, PALETTE.sky[2]);
  g.fillStyle = grad;
  g.fillRect(0, 0, width, height);
  // stars
  const r = mulberry32(seed);
  for (let i = 0; i < Math.floor(width / 4); i++) {
    const x = Math.floor(r() * width);
    const y = Math.floor(r() * height * 0.55);
    const alpha = 0.3 + r() * 0.7;
    g.fillStyle = `rgba(220, 220, 240, ${alpha.toFixed(2)})`;
    g.fillRect(x, y, 1, 1);
  }
  // moon (one per scene)
  const mx = Math.floor(width * 0.78);
  const my = 70;
  g.fillStyle = '#f0e6c8';
  g.beginPath();
  g.arc(mx, my, 18, 0, Math.PI * 2);
  g.fill();
  // crescent shadow
  g.fillStyle = PALETTE.sky[1];
  g.beginPath();
  g.arc(mx + 6, my - 2, 17, 0, Math.PI * 2);
  g.fill();
  return c;
}

export function makeFarBuildingsLayer(width, height = CANVAS_H, seed = 17) {
  const c = mkCanvas(width, height);
  const g = c.getContext('2d');
  const r = mulberry32(seed);
  // distant skyline silhouette
  let x = 0;
  while (x < width) {
    const w = 30 + Math.floor(r() * 50);
    const h = 90 + Math.floor(r() * 160);
    const top = height - h - 40;
    g.fillStyle = PALETTE.buildingFar;
    g.fillRect(x, top, w, h);
    // tiny window dots
    for (let yy = top + 8; yy < top + h - 8; yy += 8) {
      for (let xx = x + 4; xx < x + w - 4; xx += 6) {
        if (r() < 0.18) {
          g.fillStyle = r() < 0.5 ? PALETTE.windowOn : PALETTE.windowOnAlt;
          g.fillRect(xx, yy, 2, 2);
        }
      }
    }
    x += w;
  }
  return c;
}

export function makeMidBuildingsLayer(width, height = CANVAS_H, seed = 31) {
  const c = mkCanvas(width, height);
  const g = c.getContext('2d');
  const r = mulberry32(seed);
  let x = 0;
  while (x < width) {
    const w = 80 + Math.floor(r() * 120);
    const h = 180 + Math.floor(r() * 200);
    const top = height - h - 80;
    g.fillStyle = PALETTE.buildingMid;
    g.fillRect(x, top, w, h);
    // window grid
    for (let yy = top + 12; yy < top + h - 16; yy += 14) {
      for (let xx = x + 8; xx < x + w - 8; xx += 12) {
        const on = r() < 0.45;
        g.fillStyle = on ? (r() < 0.7 ? PALETTE.windowOn : PALETTE.windowOnAlt) : PALETTE.windowOff;
        g.fillRect(xx, yy, 4, 6);
        if (on) {
          // soft glow trail
          g.fillStyle = 'rgba(255, 200, 100, 0.08)';
          g.fillRect(xx - 2, yy - 1, 8, 8);
        }
      }
    }
    // occasional neon strip on side
    if (r() < 0.35) {
      const colors = [PALETTE.neonPink, PALETTE.neonCyan, PALETTE.neonAmber, PALETTE.neonRed];
      const color = colors[Math.floor(r() * colors.length)];
      g.fillStyle = color;
      const sx = x + w - 4;
      const sy = top + 20 + Math.floor(r() * 60);
      const sh = 40 + Math.floor(r() * 100);
      g.fillRect(sx, sy, 2, sh);
      g.fillStyle = `${color}55`;
      g.fillRect(sx - 1, sy, 4, sh);
    }
    x += w;
  }
  return c;
}

export function makeStreetLayer(width, height = CANVAS_H, seed = 53, groundY = 540) {
  const c = mkCanvas(width, height);
  const g = c.getContext('2d');
  const r = mulberry32(seed);

  // near-buildings band (foundations behind sidewalk)
  g.fillStyle = PALETTE.buildingNear;
  g.fillRect(0, groundY - 120, width, 120);
  // illuminated ground-floor windows (storefronts)
  for (let xx = 20; xx < width - 20; xx += 80) {
    if (r() < 0.55) {
      const on = r() < 0.7;
      g.fillStyle = on ? PALETTE.windowOn : PALETTE.windowOff;
      g.fillRect(xx, groundY - 70, 30, 24);
      g.fillStyle = '#000';
      g.fillRect(xx, groundY - 70, 30, 1);
      g.fillRect(xx, groundY - 47, 30, 1);
      g.fillRect(xx, groundY - 70, 1, 24);
      g.fillRect(xx + 29, groundY - 70, 1, 24);
      // door frame (some storefronts)
      if (r() < 0.4) {
        g.fillStyle = '#2a2018';
        g.fillRect(xx + 32, groundY - 70, 14, 70);
        g.fillStyle = '#0a0a10';
        g.fillRect(xx + 34, groundY - 68, 10, 68);
      }
      // soft glow
      if (on) {
        g.fillStyle = 'rgba(255, 200, 100, 0.10)';
        g.fillRect(xx - 4, groundY - 75, 38, 80);
      }
    }
  }

  // curb
  g.fillStyle = PALETTE.curb;
  g.fillRect(0, groundY, width, 4);

  // street (asphalt)
  g.fillStyle = PALETTE.street;
  g.fillRect(0, groundY + 4, width, height - groundY - 4);
  // wet pavement streaks
  g.fillStyle = PALETTE.streetWet;
  for (let i = 0; i < width / 6; i++) {
    const sx = Math.floor(r() * width);
    const sy = groundY + 8 + Math.floor(r() * (height - groundY - 12));
    const sw = 3 + Math.floor(r() * 6);
    g.fillRect(sx, sy, sw, 1);
  }
  // neon reflections in puddles
  for (let i = 0; i < 10; i++) {
    const px = Math.floor(r() * width);
    const py = groundY + 20 + Math.floor(r() * (height - groundY - 30));
    const colors = [PALETTE.neonPink, PALETTE.neonCyan, PALETTE.neonAmber];
    g.fillStyle = colors[Math.floor(r() * colors.length)] + '33';
    g.fillRect(px, py, 8, 1);
    g.fillRect(px + 2, py + 1, 4, 1);
  }
  return c;
}

export function makeForegroundLayer(width, height = CANVAS_H, seed = 71, groundY = 540) {
  const c = mkCanvas(width, height);
  const g = c.getContext('2d');
  const r = mulberry32(seed);
  // sparse posts/hydrants
  for (let x = 60; x < width; x += 160 + Math.floor(r() * 80)) {
    const kind = r();
    if (kind < 0.5) {
      // street lamp
      g.fillStyle = '#1a1a22';
      g.fillRect(x, groundY - 110, 2, 110);
      // lamp head
      g.fillStyle = '#222230';
      g.fillRect(x - 4, groundY - 116, 10, 6);
      // bulb glow
      g.fillStyle = PALETTE.neonAmber;
      g.fillRect(x - 2, groundY - 114, 6, 3);
      g.fillStyle = 'rgba(255, 170, 60, 0.18)';
      g.beginPath();
      g.arc(x + 1, groundY - 112, 24, 0, Math.PI * 2);
      g.fill();
    } else if (kind < 0.75) {
      // hydrant
      g.fillStyle = '#7c2828';
      g.fillRect(x, groundY - 14, 6, 14);
      g.fillStyle = '#a83c3c';
      g.fillRect(x + 1, groundY - 13, 4, 4);
      g.fillRect(x - 1, groundY - 8, 8, 2);
    } else {
      // trash can
      g.fillStyle = '#2a2a32';
      g.fillRect(x, groundY - 18, 10, 18);
      g.fillStyle = '#1a1a22';
      g.fillRect(x, groundY - 18, 10, 2);
    }
  }
  return c;
}

// ---------- Interior layer generators (procedural fallback) ----------
//
// Used by indoor scenes (apartment, bar, basement). The interior wall sits
// behind the player and a foreground prop strip can sit in front. Lighting
// (desk lamp, pendant, fireplace) is added by the scene as point lights —
// these generators only paint the static silhouettes.

export function makeInteriorWallLayer(width, height = CANVAS_H, seed = 91, groundY = 480) {
  const c = mkCanvas(width, height);
  const g = c.getContext('2d');
  const r = mulberry32(seed);

  // ceiling band (deep shadow)
  g.fillStyle = '#0a0a0e';
  g.fillRect(0, 0, width, 80);

  // wallpaper — vertical stripes of damp greenish-blue
  const wallTop = 80;
  const wallH = groundY - wallTop;
  const wallpaperBase = '#1a1820';
  const wallpaperAlt = '#1f1c26';
  for (let x = 0; x < width; x += 6) {
    g.fillStyle = (Math.floor(x / 6) % 2 === 0) ? wallpaperBase : wallpaperAlt;
    g.fillRect(x, wallTop, 6, wallH);
  }

  // baseboard (dark wood)
  g.fillStyle = '#0e0a08';
  g.fillRect(0, groundY - 12, width, 12);
  g.fillStyle = '#1a120c';
  g.fillRect(0, groundY - 12, width, 1);

  // wall sconces — a few framed pictures and stains
  for (let x = 40; x < width - 40; x += 130 + Math.floor(r() * 80)) {
    const kind = r();
    const fy = wallTop + 30 + Math.floor(r() * 40);
    if (kind < 0.5) {
      // picture frame
      const fw = 24 + Math.floor(r() * 24);
      const fh = 18 + Math.floor(r() * 18);
      g.fillStyle = '#0a0a0e';
      g.fillRect(x - fw / 2 - 2, fy - 2, fw + 4, fh + 4);
      g.fillStyle = '#5a3a1a';
      g.fillRect(x - fw / 2, fy, fw, fh);
      g.fillStyle = '#1a1018';
      g.fillRect(x - fw / 2 + 2, fy + 2, fw - 4, fh - 4);
    } else if (kind < 0.8) {
      // damp stain
      g.fillStyle = 'rgba(40, 28, 16, 0.4)';
      g.beginPath();
      g.ellipse(x, fy + 12, 18, 22, 0, 0, Math.PI * 2);
      g.fill();
    }
  }

  // crown molding line
  g.fillStyle = '#2a1810';
  g.fillRect(0, wallTop, width, 2);

  return c;
}

export function makeInteriorFloorLayer(width, height = CANVAS_H, seed = 97, groundY = 480) {
  const c = mkCanvas(width, height);
  const g = c.getContext('2d');
  const r = mulberry32(seed);

  // wood floor planks
  const plankH = 18;
  for (let y = groundY; y < height; y += plankH) {
    const baseTone = (Math.floor((y - groundY) / plankH) % 2 === 0) ? '#1a1208' : '#231810';
    g.fillStyle = baseTone;
    g.fillRect(0, y, width, plankH);

    // plank seams
    for (let x = 0; x < width; x += 60 + Math.floor(r() * 50)) {
      g.fillStyle = '#0a0606';
      g.fillRect(x, y, 1, plankH);
    }

    // grain streaks
    g.fillStyle = 'rgba(255, 200, 140, 0.04)';
    for (let i = 0; i < 6; i++) {
      const sx = Math.floor(r() * width);
      const sw = 12 + Math.floor(r() * 30);
      g.fillRect(sx, y + 2 + Math.floor(r() * (plankH - 4)), sw, 1);
    }
  }

  // floor edge under baseboard
  g.fillStyle = '#0a0608';
  g.fillRect(0, groundY, width, 2);

  // a few warm glow pools (where interior lights will sit) — baked at low alpha
  // so even without point-light bloom they read as "lit".
  g.fillStyle = 'rgba(255, 180, 80, 0.06)';
  for (let i = 0; i < 4; i++) {
    const px = Math.floor(r() * width);
    g.beginPath();
    g.ellipse(px, groundY + 16, 60, 6, 0, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

export function makeInteriorPropsLayer(width, height = CANVAS_H, seed = 103, groundY = 480) {
  const c = mkCanvas(width, height);
  const g = c.getContext('2d');
  const r = mulberry32(seed);

  // single bed against the wall (left third)
  const bedX = 80;
  const bedY = groundY - 36;
  g.fillStyle = '#3a2a1a';
  g.fillRect(bedX, bedY, 110, 32);
  // mattress
  g.fillStyle = '#5a4030';
  g.fillRect(bedX + 4, bedY - 6, 102, 8);
  // pillow
  g.fillStyle = '#a09080';
  g.fillRect(bedX + 6, bedY - 6, 26, 6);
  g.fillStyle = '#704028';
  g.fillRect(bedX + 32, bedY - 4, 70, 5);
  // headboard
  g.fillStyle = '#1a1008';
  g.fillRect(bedX, bedY - 24, 8, 30);

  // rug (under the desk)
  const rugX = 360;
  g.fillStyle = '#5a1818';
  g.fillRect(rugX, groundY - 2, 220, 6);
  g.fillStyle = '#3a0c0c';
  for (let xx = rugX; xx < rugX + 220; xx += 10) {
    if (Math.floor((xx - rugX) / 10) % 2 === 0) g.fillRect(xx, groundY - 2, 5, 6);
  }

  // detective desk (center-right)
  const deskX = 420;
  const deskY = groundY - 40;
  g.fillStyle = '#1a1208';
  g.fillRect(deskX, deskY, 130, 40);
  g.fillStyle = '#2a1810';
  g.fillRect(deskX, deskY, 130, 4);
  // drawer hints
  g.fillStyle = '#0a0604';
  g.fillRect(deskX + 6, deskY + 10, 56, 1);
  g.fillRect(deskX + 6, deskY + 22, 56, 1);
  // desk lamp base + neck
  g.fillStyle = '#2a1a10';
  g.fillRect(deskX + 14, deskY - 18, 6, 18);
  g.fillStyle = '#3a2818';
  g.fillRect(deskX + 6, deskY - 24, 22, 8);
  // lampshade — warm light source visible
  g.fillStyle = '#ffaa3a';
  g.fillRect(deskX + 9, deskY - 22, 16, 5);

  // typewriter on desk
  g.fillStyle = '#1a1a22';
  g.fillRect(deskX + 70, deskY - 14, 38, 14);
  g.fillStyle = '#2a2a32';
  g.fillRect(deskX + 74, deskY - 18, 30, 4);
  // paper sticking up
  g.fillStyle = '#c8c0a8';
  g.fillRect(deskX + 86, deskY - 26, 8, 8);

  // chair
  g.fillStyle = '#1a1208';
  g.fillRect(deskX + 50, groundY - 24, 24, 24);
  g.fillStyle = '#2a1810';
  g.fillRect(deskX + 50, groundY - 24, 24, 4);

  // file cabinet (right of desk)
  const cabX = 600;
  const cabY = groundY - 70;
  g.fillStyle = '#2a2630';
  g.fillRect(cabX, cabY, 40, 70);
  g.fillStyle = '#1a1620';
  g.fillRect(cabX, cabY, 40, 2);
  for (let dy = 0; dy < 3; dy++) {
    g.fillStyle = '#0a0a10';
    g.fillRect(cabX + 4, cabY + 8 + dy * 22, 32, 1);
    g.fillStyle = '#3a3a44';
    g.fillRect(cabX + 18, cabY + 14 + dy * 22, 4, 2);
  }

  // bookshelf (right wall)
  const shelfX = 720;
  const shelfY = groundY - 120;
  g.fillStyle = '#1a1208';
  g.fillRect(shelfX, shelfY, 90, 120);
  for (let row = 0; row < 4; row++) {
    const ry = shelfY + 8 + row * 28;
    g.fillStyle = '#0a0604';
    g.fillRect(shelfX + 2, ry + 22, 86, 2);
    // book spines
    let bx = shelfX + 4;
    while (bx < shelfX + 86) {
      const bw = 3 + Math.floor(r() * 5);
      const palette = ['#5a1818', '#1a3a5a', '#3a5a1a', '#5a3a1a', '#3a1a5a'];
      g.fillStyle = palette[Math.floor(r() * palette.length)];
      g.fillRect(bx, ry, bw, 22);
      bx += bw;
    }
  }

  // exit door (left wall — this is the doorway back to the street)
  const doorX = 30;
  const doorY = groundY - 90;
  g.fillStyle = '#0a0608';
  g.fillRect(doorX - 4, doorY - 4, 50, 94);
  g.fillStyle = '#3a2818';
  g.fillRect(doorX, doorY, 42, 90);
  // door panels
  g.fillStyle = '#2a1810';
  g.fillRect(doorX + 4, doorY + 6, 34, 38);
  g.fillRect(doorX + 4, doorY + 48, 34, 36);
  // handle
  g.fillStyle = '#a87a3a';
  g.fillRect(doorX + 34, doorY + 50, 3, 3);

  // clutter on floor (sparse trash, files)
  for (let i = 0; i < 5; i++) {
    const px = 220 + Math.floor(r() * (width - 280));
    g.fillStyle = '#2a2018';
    g.fillRect(px, groundY - 4, 8, 4);
    g.fillStyle = '#1a1208';
    g.fillRect(px, groundY - 4, 8, 1);
  }

  return c;
}

// ---------- Build all sprites ----------

export function buildSprites() {
  // Detective frames (drawn facing right; engine flips for left)
  SPR.player = {
    idle: [makeDetectiveFrame('idle', 0), makeDetectiveFrame('idle', 1)],
    walk: [
      makeDetectiveFrame('walk', 0),
      makeDetectiveFrame('walk', 1),
      makeDetectiveFrame('walk', 2),
      makeDetectiveFrame('walk', 3),
    ],
  };
}
