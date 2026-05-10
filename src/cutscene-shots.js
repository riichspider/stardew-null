// Procedural backgrounds + foreground composites for each opening-cutscene
// shot. Each `build*` function returns a *shot package*:
//
//   {
//     width, height, groundY,
//     layers: [{ img: HTMLCanvasElement, parallax: number, y?: number }],
//     fg?:    [{ kind, ...params }],   // foreground actors / props rendered
//                                       // dynamically per frame (e.g. a sprite
//                                       // walking across the shot)
//     ambient?: { fog, rain, vignette },
//     lights?: [{ x, y, color, radius, intensity, flicker }],
//   }
//
// The cutscene-director renders these with parallax + camera transforms
// (pan/zoom/shake) and overlays subtitles + letterbox.
//
// Everything here is procedural canvas — no PNGs required. Hand-drawn assets
// can later substitute via the asset manifest, same pattern as scenes/.

import { CANVAS_W, CANVAS_H, PALETTE } from './config.js';
import {
  makeSkyLayer,
  makeFarBuildingsLayer,
  makeMidBuildingsLayer,
  makeStreetLayer,
  makeForegroundLayer,
  makeInteriorWallLayer,
  makeInteriorFloorLayer,
  makeInteriorPropsLayer,
} from './sprites.js';

function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// ---------- Shot 1: cityPan ----------
// Wide 1800×640 cityscape with parallax layers. Camera pans left → right.
// Reuses the same layer generators as street01 so the visual language is
// continuous with gameplay, but at a different seed so it doesn't read as
// "the same street".

export function buildCityPanShot() {
  const W = 1800;
  const H = CANVAS_H;
  const groundY = 540;
  return {
    width: W,
    height: H,
    groundY,
    layers: [
      { img: makeSkyLayer(W, H, 211),                  parallax: 0.10 },
      { img: makeFarBuildingsLayer(W, H, 217),         parallax: 0.40 },
      { img: makeMidBuildingsLayer(W, H, 223),         parallax: 0.80 },
      { img: makeStreetLayer(W, H, 229, groundY),      parallax: 1.00 },
      { img: makeForegroundLayer(W, H, 233, groundY),  parallax: 1.20 },
    ],
    // Spread neon / lamp lights along the pan so the camera move keeps
    // revealing fresh glow. parallax matches the layer they belong to.
    lights: [
      { x: 200,  y: 280, color: PALETTE.neonPink,  radius: 150, intensity: 0.65, parallax: 0.80, flicker: { rate: 4.2, seed: 0.3 } },
      { x: 520,  y: 320, color: PALETTE.neonCyan,  radius: 170, intensity: 0.60, parallax: 0.80, flicker: { rate: 3.5, seed: 1.1 } },
      { x: 880,  y: 260, color: PALETTE.neonAmber, radius: 140, intensity: 0.55, parallax: 0.80, flicker: { rate: 5.0, seed: 1.7 } },
      { x: 1240, y: 340, color: PALETTE.neonRed,   radius: 130, intensity: 0.55, parallax: 0.80, flicker: { rate: 6.0, seed: 0.9 } },
      { x: 1580, y: 290, color: PALETTE.neonPink,  radius: 160, intensity: 0.60, parallax: 0.80, flicker: { rate: 4.0, seed: 2.3 } },
      // Street lamps (closer parallax, brighter pools)
      { x: 320,  y: groundY - 8, color: '#ffd680', radius: 110, intensity: 0.85, parallax: 1.00, flicker: { rate: 2.0, seed: 0.5 } },
      { x: 700,  y: groundY - 8, color: '#ffd680', radius: 110, intensity: 0.85, parallax: 1.00, flicker: { rate: 2.4, seed: 1.3 } },
      { x: 1080, y: groundY - 8, color: '#ffd680', radius: 110, intensity: 0.85, parallax: 1.00, flicker: { rate: 2.2, seed: 1.9 } },
      { x: 1460, y: groundY - 8, color: '#ffd680', radius: 110, intensity: 0.85, parallax: 1.00, flicker: { rate: 2.6, seed: 2.5 } },
    ],
    ambient: {
      rain: { density: 0.95, speed: 760, length: 18, color: 'rgba(180, 200, 255, 0.42)' },
      fog:  { tint: 'rgba(40, 30, 80, 0.45)', alpha: 0.30 },
      vignette: 0.55,
    },
  };
}

// ---------- Shot 2: officeIntro ----------
// Detective standing in the middle of his apartment, looking out. Camera
// starts pulled in tight on the detective and slowly zooms out to reveal
// the room.
//
// We render this as a 960×640 single-screen composite (no panning), with the
// cutscene director controlling zoom level instead.

export function buildOfficeIntroShot() {
  const W = CANVAS_W;
  const H = CANVAS_H;
  const groundY = 480;

  // Compose all interior layers into one image. Then add a "window" hole on
  // the right wall showing the rainy night outside.
  const composite = mkCanvas(W, H);
  const g = composite.getContext('2d');
  // 1) Wallpaper / ceiling / pictures
  g.drawImage(makeInteriorWallLayer(W, H, 311, groundY), 0, 0);
  // 2) Wood floor planks
  g.drawImage(makeInteriorFloorLayer(W, H, 313, groundY), 0, 0);
  // 3) Cut a tall window into the right side of the wall before drawing
  //    props. The window shows a slice of the city skyline + rain.
  drawWindow(g, W - 220, 100, 160, 220);
  // 4) Office props (bed, desk, lamp, typewriter, chair, cabinet, books)
  g.drawImage(makeInteriorPropsLayer(W, H, 317, groundY), 0, 0);

  return {
    width: W,
    height: H,
    groundY,
    layers: [
      { img: composite, parallax: 1.00 },
    ],
    fg: [
      // Detective standing near the desk, side-profile facing right (toward
      // the window). Drawn dynamically by the director so we can scale him
      // with the zoom move.
      {
        kind: 'detective',
        x: 460,                 // base scene-X
        y: groundY - 6,         // feet on ground
        scale: 4,               // 4× the gameplay sprite
        pose: 'idle',
        frame: 1,               // cigarette glowing
        facing: 'right',
      },
      // Curling smoke wisps over the detective's head — small bobbing
      // particles drawn each frame.
      { kind: 'smoke', x: 478, y: groundY - 130, scale: 4 },
    ],
    lights: [
      // Window backlight (cool blue spill from the city)
      { x: W - 140, y: 210, color: PALETTE.neonCyan,  radius: 220, intensity: 0.45, parallax: 1.00 },
      // Desk lamp (warm, primary key light on detective)
      { x: 540, y: groundY - 50, color: PALETTE.neonAmber, radius: 180, intensity: 0.95, parallax: 1.00, flicker: { rate: 2.4, seed: 0.6 } },
      // Soft pendant
      { x: 320, y: 200, color: '#ffe7b0', radius: 140, intensity: 0.20, parallax: 1.00 },
      // Pink neon spill from outside, hits the corner of the wall
      { x: W - 60, y: 360, color: PALETTE.neonPink, radius: 140, intensity: 0.30, parallax: 1.00, flicker: { rate: 5.0, seed: 1.4 } },
    ],
    ambient: {
      // Heavy interior smoke
      fog:  { tint: 'rgba(60, 40, 30, 0.40)', alpha: 0.25 },
      // No rain inside the apartment — but the window pane itself shows rain
      // (drawn in drawWindow above).
      vignette: 0.65,
    },
  };
}

function drawWindow(g, x, y, w, h) {
  // Frame
  g.fillStyle = '#0a0608';
  g.fillRect(x - 6, y - 6, w + 12, h + 12);
  // Glass: cool dark blue with neon hints from the street outside
  const grad = g.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0,    '#0a0a18');
  grad.addColorStop(0.45, '#1a1030');
  grad.addColorStop(1,    '#0a0a18');
  g.fillStyle = grad;
  g.fillRect(x, y, w, h);
  // City silhouette through glass — three building bands
  g.fillStyle = 'rgba(20, 20, 40, 0.85)';
  g.fillRect(x + 6,  y + 60,  28, h - 80);
  g.fillRect(x + 42, y + 100, 36, h - 120);
  g.fillRect(x + 88, y + 80,  32, h - 100);
  g.fillRect(x + 128, y + 110, 28, h - 130);
  // Lit windows in the buildings outside (random small dots)
  g.fillStyle = PALETTE.windowOn;
  const litSpec = [
    [10, 90], [20, 130], [10, 170], [20, 210],
    [50, 130], [60, 170], [50, 210],
    [90, 110], [100, 150], [90, 190],
    [130, 140], [140, 180],
  ];
  for (const [dx, dy] of litSpec) {
    if (Math.random() > 0.35) {
      g.fillRect(x + dx, y + dy, 2, 2);
    }
  }
  // Faint neon haze on the window pane (pink + cyan smear)
  g.fillStyle = 'rgba(255, 58, 140, 0.12)';
  g.fillRect(x + 4, y + 30, w - 8, 30);
  g.fillStyle = 'rgba(58, 255, 240, 0.10)';
  g.fillRect(x + 4, y + h - 70, w - 8, 30);
  // Diagonal rain streaks on the *outside* of the glass — drawn baked here
  // (the cutscene's rain particle system handles the *inside* viewport).
  g.strokeStyle = 'rgba(180, 200, 255, 0.45)';
  g.lineWidth = 1;
  for (let i = 0; i < 60; i++) {
    const sx = x + 4 + Math.random() * (w - 8);
    const sy = y + 8 + Math.random() * (h - 16);
    g.beginPath();
    g.moveTo(sx, sy);
    g.lineTo(sx - 3, sy + 14);
    g.stroke();
  }
  // Window cross frame
  g.fillStyle = '#1a1208';
  g.fillRect(x + w / 2 - 1, y, 2, h);
  g.fillRect(x, y + h / 2 - 1, w, 2);
  // Sill
  g.fillStyle = '#3a2818';
  g.fillRect(x - 8, y + h, w + 16, 6);
  // Faint reflection of desk lamp on the glass
  g.fillStyle = 'rgba(255, 170, 60, 0.18)';
  g.fillRect(x + 10, y + h - 40, w - 20, 6);
}

// ---------- Shot 3: caseFile ----------
// Top-down view of the desk: papers, a photo, a key, a notebook. Composed
// onto a single 960×640 canvas, lit moodily. Camera does a slow scale ramp
// (focus pull) on the case file center.

export function buildCaseFileShot() {
  const W = CANVAS_W;
  const H = CANVAS_H;

  const c = mkCanvas(W, H);
  const g = c.getContext('2d');

  // Desk surface (dark walnut wood, warm grain)
  g.fillStyle = '#1a1208';
  g.fillRect(0, 0, W, H);
  // Plank seams
  g.fillStyle = '#0a0604';
  for (let y = 0; y < H; y += 80) {
    g.fillRect(0, y, W, 1);
  }
  for (let x = 0; x < W; x += 200) {
    g.fillRect(x, 0, 1, H);
  }
  // Grain streaks
  g.fillStyle = 'rgba(180, 130, 70, 0.05)';
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    g.fillRect(x, y, 30 + Math.random() * 40, 1);
  }

  // ---- Manila folder under everything ----
  drawManilaFolder(g, 220, 180, 540, 320);

  // ---- Crime-scene photograph (black-and-white) ----
  drawPhoto(g, 280, 220, 220, 160);

  // ---- Case-file paper, partially overlapping the photo ----
  drawPaper(g, 460, 260, 280, 200);

  // ---- A small notebook ----
  drawNotebook(g, 250, 410, 130, 80);

  // ---- A key ----
  drawKey(g, 700, 430, 60);

  // ---- A coffee ring (light stain) ----
  g.strokeStyle = 'rgba(60, 30, 10, 0.4)';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(150, 360, 24, 0, Math.PI * 2);
  g.stroke();

  return {
    width: W,
    height: H,
    groundY: H,
    layers: [{ img: c, parallax: 1.00 }],
    lights: [
      // Spotlight pool centered on the case file (warm desk lamp from above)
      { x: 540, y: 320, color: PALETTE.neonAmber, radius: 320, intensity: 0.85, parallax: 1.00, flicker: { rate: 1.5, seed: 0.8 } },
      // Edge falloff (cool blue ambient) so the corners read as deep shadow
      { x: 100, y: 100, color: PALETTE.neonCyan, radius: 180, intensity: 0.10, parallax: 1.00 },
    ],
    ambient: {
      // Strong vignette for the noir desk-lamp look
      fog:  { tint: 'rgba(10, 5, 0, 0.50)', alpha: 0.35 },
      vignette: 0.85,
    },
  };
}

function drawPhoto(g, x, y, w, h) {
  // White border
  g.fillStyle = '#e8e0c8';
  g.fillRect(x, y, w, h);
  // Image area (sepia/B&W)
  g.fillStyle = '#1a1820';
  g.fillRect(x + 8, y + 8, w - 16, h - 28);
  // Subject silhouette — a body lying on the floor, chalk outline style
  g.fillStyle = '#0a0a14';
  g.fillRect(x + 32, y + 60, w - 64, 12);
  g.fillRect(x + 50, y + 50, 12, 30);  // head
  g.fillRect(x + 32, y + 72, 30, 30);  // torso
  g.fillRect(x + 32, y + 94, 50, 8);   // legs
  // Chalk outline strokes
  g.strokeStyle = 'rgba(220, 220, 220, 0.5)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x + 28, y + 50);
  g.lineTo(x + 90, y + 48);
  g.lineTo(x + 110, y + 105);
  g.lineTo(x + 30, y + 110);
  g.closePath();
  g.stroke();
  // Caption strip
  g.fillStyle = '#d8d0b8';
  g.fillRect(x + 8, y + h - 18, w - 16, 12);
  g.fillStyle = '#3a2818';
  g.fillRect(x + 14, y + h - 14, 6, 1);
  g.fillRect(x + 22, y + h - 14, 12, 1);
  g.fillRect(x + 36, y + h - 14, 8, 1);
  g.fillRect(x + 46, y + h - 14, 14, 1);
  // Photo creases
  g.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  g.beginPath();
  g.moveTo(x, y + 4); g.lineTo(x + w, y + 4);
  g.moveTo(x, y + h - 4); g.lineTo(x + w, y + h - 4);
  g.stroke();
}

function drawPaper(g, x, y, w, h) {
  // Off-white paper
  g.fillStyle = '#e8e0c8';
  g.fillRect(x, y, w, h);
  // Header bar
  g.fillStyle = '#3a2818';
  g.fillRect(x + 14, y + 14, w - 28, 4);
  g.fillRect(x + 14, y + 22, w - 60, 3);
  // "STAMP" — red ink
  g.save();
  g.translate(x + w - 70, y + 40);
  g.rotate(-0.18);
  g.strokeStyle = '#a01818';
  g.lineWidth = 2;
  g.strokeRect(0, 0, 56, 22);
  g.fillStyle = '#a01818';
  for (let i = 0; i < 6; i++) {
    g.fillRect(4 + i * 9, 8, 6, 2);
  }
  g.restore();
  // Body lines (text simulation)
  g.fillStyle = '#1a1010';
  for (let i = 0; i < 9; i++) {
    const lineY = y + 50 + i * 12;
    const lineW = (w - 40) * (0.55 + Math.random() * 0.4);
    g.fillRect(x + 18, lineY, lineW, 2);
  }
  // Signature scrawl
  g.strokeStyle = '#1a1010';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(x + 22, y + h - 24);
  g.bezierCurveTo(x + 60, y + h - 10, x + 90, y + h - 36, x + 130, y + h - 22);
  g.stroke();
  // Crease
  g.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  g.beginPath();
  g.moveTo(x, y + h / 2);
  g.lineTo(x + w, y + h / 2);
  g.stroke();
}

function drawManilaFolder(g, x, y, w, h) {
  // Folder body
  g.fillStyle = '#5a4828';
  g.fillRect(x, y, w, h);
  // Shadow
  g.fillStyle = 'rgba(0, 0, 0, 0.4)';
  g.fillRect(x + 6, y + h, w, 6);
  // Tab
  g.fillStyle = '#5a4828';
  g.fillRect(x + 50, y - 14, 120, 16);
  // Tab label area
  g.fillStyle = '#e8e0c8';
  g.fillRect(x + 60, y - 10, 100, 8);
  // Label text (simulated with bars)
  g.fillStyle = '#1a1010';
  g.fillRect(x + 64, y - 7, 8, 2);
  g.fillRect(x + 76, y - 7, 14, 2);
  g.fillRect(x + 94, y - 7, 10, 2);
  g.fillRect(x + 108, y - 7, 16, 2);
  // Edge highlight
  g.fillStyle = '#7a6038';
  g.fillRect(x, y, w, 2);
}

function drawNotebook(g, x, y, w, h) {
  // Cover (dark leather)
  g.fillStyle = '#1a1018';
  g.fillRect(x, y, w, h);
  g.fillStyle = '#2a1820';
  g.fillRect(x + 2, y + 2, w - 4, h - 4);
  // Spiral binding
  g.fillStyle = '#3a3a44';
  for (let i = 0; i < 8; i++) {
    g.fillRect(x + 6 + i * 16, y - 2, 8, 4);
  }
  // Paper edge
  g.fillStyle = '#e8e0c8';
  g.fillRect(x + 4, y + 6, w - 8, 2);
}

function drawKey(g, x, y, len) {
  // Bow (head ring)
  g.fillStyle = '#7a5a2a';
  g.beginPath();
  g.arc(x, y, 14, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1a1208';
  g.beginPath();
  g.arc(x, y, 7, 0, Math.PI * 2);
  g.fill();
  // Shaft
  g.fillStyle = '#7a5a2a';
  g.fillRect(x + 12, y - 3, len - 14, 6);
  // Bit (teeth)
  g.fillRect(x + len - 10, y + 3, 4, 6);
  g.fillRect(x + len - 16, y + 3, 4, 9);
}

// ---------- Shot 4: prepExit ----------
// Detective walking left → right toward the apartment door, picking up gear
// on the way. Reuses the apartment composite from shot 2.

export function buildPrepExitShot() {
  const W = CANVAS_W;
  const H = CANVAS_H;
  const groundY = 480;

  const composite = mkCanvas(W, H);
  const g = composite.getContext('2d');
  g.drawImage(makeInteriorWallLayer(W, H, 401, groundY), 0, 0);
  g.drawImage(makeInteriorFloorLayer(W, H, 403, groundY), 0, 0);
  g.drawImage(makeInteriorPropsLayer(W, H, 407, groundY), 0, 0);
  // Door highlight on the *left* wall — exit doorway
  drawHighlightedDoor(g, 30, groundY - 90, 42, 90);

  return {
    width: W,
    height: H,
    groundY,
    layers: [{ img: composite, parallax: 1.00 }],
    fg: [
      // Detective walking right→left toward the door, scaled 3x
      {
        kind: 'detective',
        // Director will animate `x` along the shot timeline; this is the
        // initial value. End position is set by the timeline's camera move
        // OR by a per-shot `walk` config (read by director).
        x: 720,
        y: groundY - 4,
        scale: 3,
        pose: 'walk',
        facing: 'left',
        walk: { fromX: 720, toX: 90, ease: 'linear' },
      },
    ],
    lights: [
      { x: 540, y: groundY - 50, color: PALETTE.neonAmber, radius: 180, intensity: 0.85, parallax: 1.00, flicker: { rate: 2.0, seed: 0.4 } },
      { x:  60, y: groundY - 60, color: PALETTE.neonCyan,  radius: 110, intensity: 0.45, parallax: 1.00 },
      // Highlighted door has a brighter pool to draw the eye
      { x:  50, y: groundY - 50, color: '#ffe7b0', radius: 140, intensity: 0.55, parallax: 1.00, flicker: { rate: 0.6, seed: 0.2 } },
    ],
    ambient: {
      fog:  { tint: 'rgba(60, 40, 30, 0.32)', alpha: 0.22 },
      vignette: 0.55,
    },
  };
}

function drawHighlightedDoor(g, x, y, w, h) {
  // Inner glow halo behind the door (warm key-light spill)
  const halo = g.createRadialGradient(x + w / 2, y + h / 2, 6, x + w / 2, y + h / 2, 110);
  halo.addColorStop(0,    'rgba(255, 200, 110, 0.35)');
  halo.addColorStop(1,    'rgba(255, 200, 110, 0)');
  g.fillStyle = halo;
  g.fillRect(x - 70, y - 30, w + 140, h + 60);
  // Door body re-stroke (props layer already drew it; we paint a brighter
  // outline so it reads as the focal point)
  g.strokeStyle = 'rgba(255, 220, 150, 0.5)';
  g.lineWidth = 1;
  g.strokeRect(x, y, w, h);
}
