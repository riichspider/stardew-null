// Camera director + cinematic overlays for the cutscene system.
//
// The director knows nothing about timing — it gets a *shot* and a *t* (time
// elapsed since the shot started) and produces:
//
//   1. The camera transform (translation + scale) given the shot's `camera`
//      config and `t / dur` progress
//   2. The composite frame: parallax layers at the camera offset, fg actors
//      drawn with shot-aware positions (e.g. detective walking)
//   3. Cinematic overlays: letterbox bars, vignette, subtitle box
//
// All draw calls go through the canvas 2D ctx. No DOM overlays — the cutscene
// uses the same canvas as the game so the swap to gameplay is seamless.

import { CANVAS_W, CANVAS_H, PALETTE, PLAYER_W, PLAYER_H } from './config.js';
import { SPR } from './sprites.js';
import { applyLighting } from './lighting.js';
import { getAsset } from './assets.js';

// ---------- Easings ----------

const EASES = {
  linear:     (t) => t,
  easeIn:     (t) => t * t,
  easeOut:    (t) => 1 - (1 - t) * (1 - t),
  easeInOut:  (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
};

function ease(name, t) {
  const fn = EASES[name] || EASES.linear;
  return fn(Math.max(0, Math.min(1, t)));
}

// ---------- Camera resolution ----------
//
// Returns { offsetX, scale } for a given shot at a given local time.
// The cutscene framing is always centered: scale > 1 zooms toward the
// `pivotX/pivotY` (or canvas center if absent).

export function resolveCamera(shot, t) {
  const cam = shot.camera || { type: 'static' };
  const dur = shot.dur || 1;
  const p = ease(cam.ease || 'linear', t / dur);

  switch (cam.type) {
    case 'pan': {
      const fromX = cam.fromX ?? 0;
      const toX   = cam.toX ?? 0;
      return { offsetX: fromX + (toX - fromX) * p, scale: 1, pivotX: CANVAS_W / 2, pivotY: CANVAS_H / 2 };
    }
    case 'zoom': {
      const fromS = cam.fromScale ?? 1;
      const toS   = cam.toScale ?? 1;
      return {
        offsetX: cam.offsetX ?? 0,
        scale: fromS + (toS - fromS) * p,
        pivotX: cam.pivotX ?? CANVAS_W / 2,
        pivotY: cam.pivotY ?? CANVAS_H / 2,
      };
    }
    case 'focusPull': {
      // Subtle scale ramp + slight translation drift
      const fromS = cam.fromScale ?? 1.00;
      const toS   = cam.toScale ?? 1.18;
      const fromX = cam.fromX ?? 0;
      const toX   = cam.toX ?? 0;
      return {
        offsetX: fromX + (toX - fromX) * p,
        scale: fromS + (toS - fromS) * p,
        pivotX: cam.pivotX ?? CANVAS_W / 2,
        pivotY: cam.pivotY ?? CANVAS_H / 2,
      };
    }
    case 'track': {
      // Camera follows the first foreground actor that has a `walk` config
      const fg = (shot.fg || []).find((a) => a.walk);
      if (!fg) return { offsetX: 0, scale: 1, pivotX: CANVAS_W / 2, pivotY: CANVAS_H / 2 };
      const aP = ease(fg.walk.ease || 'linear', t / dur);
      const ax = fg.walk.fromX + (fg.walk.toX - fg.walk.fromX) * aP;
      // Want the actor in the centerline of the frame
      let desired = ax - CANVAS_W / 2;
      // Clamp to the layer bounds so we never expose empty margins past the
      // edges of the painted background. Falls back to the shot's declared
      // width or to the canvas width.
      const maxPan = Math.max(0, (shot.width || CANVAS_W) - CANVAS_W);
      if (desired < 0)        desired = 0;
      else if (desired > maxPan) desired = maxPan;
      return { offsetX: desired, scale: 1.08, pivotX: CANVAS_W / 2, pivotY: CANVAS_H / 2 };
    }
    case 'static':
    default:
      return { offsetX: 0, scale: 1, pivotX: CANVAS_W / 2, pivotY: CANVAS_H / 2 };
  }
}

// Camera shake (small additive offset, used for the "tense" beat in shot 3)
export function shakeOffset(shake, t) {
  if (!shake || !shake.amplitude) return [0, 0];
  const amp = shake.amplitude;
  const freq = shake.frequency || 30;
  return [
    Math.sin(t * freq) * amp,
    Math.cos(t * freq * 0.83 + 1.3) * amp * 0.6,
  ];
}

// ---------- Shot rendering ----------

export function drawShot(ctx, shot, t, dt) {
  const cam = resolveCamera(shot, t);
  const [shakeX, shakeY] = shakeOffset(shot.shake, t);

  ctx.save();
  // Apply scale around (pivotX, pivotY)
  ctx.translate(cam.pivotX + shakeX, cam.pivotY + shakeY);
  ctx.scale(cam.scale, cam.scale);
  ctx.translate(-cam.pivotX, -cam.pivotY);
  // Then the parallax offset
  // (handled per-layer below since each layer has its own parallax factor)

  // Background layers (parallax)
  for (const layer of shot.layers) {
    const lx = -cam.offsetX * (layer.parallax ?? 1);
    const ly = layer.y || 0;
    ctx.drawImage(layer.img, lx, ly);
    // Tile-wrap for layers wider than the viewport when panned far
    if (layer.img.width < (cam.offsetX * (layer.parallax ?? 1) + CANVAS_W)) {
      // shouldn't happen with our 1800×640 layers and a max pan of ~1200,
      // but kept as safety against future longer pans
    }
  }

  // Foreground actors / props
  for (const a of (shot.fg || [])) {
    drawForeground(ctx, a, shot, t);
  }

  ctx.restore();

  // Lighting (rain, point lights, fog) is rendered in *screen space* — it
  // shouldn't be scaled with the camera, otherwise raindrop spacing changes
  // when zoomed.
  applyLighting(ctx, sceneAdapter(shot, cam.offsetX), cam.offsetX, t, dt);

  // Vignette overlay (always in screen space)
  if (shot.ambient && shot.ambient.vignette) {
    drawVignette(ctx, shot.ambient.vignette);
  }
}

// `applyLighting` was written for game scenes; adapt the cutscene shot to
// the same shape. The shot-level lights array already mirrors the format.
function sceneAdapter(shot, cameraX) {
  return {
    id: 'cutscene-' + (shot.id || 'shot'),
    seed: shot.seed || 0,
    groundY: shot.groundY || CANVAS_H,
    lights: shot.lights || [],
    ambient: shot.ambient || {},
  };
}

function drawForeground(ctx, actor, shot, t) {
  switch (actor.kind) {
    case 'detective': drawDetective(ctx, actor, shot, t); break;
    case 'smoke':     drawSmoke(ctx, actor, shot, t);     break;
  }
}

function drawDetective(ctx, a, shot, t) {
  const sprPack = SPR.player;
  if (!sprPack) return;
  let frame, frames;
  if (a.pose === 'walk') {
    frames = sprPack.walk;
    // ~6 fps walk cycle
    frame = Math.floor(t * 6) % frames.length;
  } else {
    frames = sprPack.idle;
    // 1.5 fps cigarette pulse
    frame = Math.floor(t * 1.5) % frames.length;
  }
  const img = frames[frame];
  const scale = a.scale || 1;

  // Resolve actor X (walk move overrides static x)
  let ax = a.x;
  if (a.walk) {
    const dur = shot.dur || 1;
    const p = ease(a.walk.ease || 'linear', t / dur);
    ax = a.walk.fromX + (a.walk.toX - a.walk.fromX) * p;
  }
  const ay = a.y;
  const w = PLAYER_W * scale;
  const h = PLAYER_H * scale;
  // Anchor: feet at (ax, ay)
  const drawX = ax - w / 2;
  const drawY = ay - h;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (a.facing === 'left') {
    ctx.translate(drawX + w, drawY);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, w, h);
  } else {
    ctx.drawImage(img, drawX, drawY, w, h);
  }
  ctx.restore();
}

function drawSmoke(ctx, a, _shot, t) {
  const baseX = a.x;
  const baseY = a.y;
  const scale = a.scale || 1;
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const phase = t * 0.7 + i * 0.5;
    const wob = Math.sin(phase * 1.4) * 6;
    const lift = (phase % 3) / 3;
    const py = baseY - lift * 70 - i * 10;
    const px = baseX + wob + i * 2;
    const alpha = (1 - lift) * 0.18;
    ctx.fillStyle = `rgba(220, 220, 230, ${alpha})`;
    const r = (3 + lift * 6) * scale;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------- Vignette ----------

function drawVignette(ctx, strength) {
  const cx = CANVAS_W / 2;
  const cy = CANVAS_H / 2;
  const r0 = Math.min(CANVAS_W, CANVAS_H) * 0.35;
  const r1 = Math.max(CANVAS_W, CANVAS_H) * 0.85;
  const grad = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

// ---------- Letterbox ----------

export function drawLetterbox(ctx, opening) {
  // `opening` is 0..1 of how "open" the letterbox is. 0 = bars at full size
  // (cinematic), 1 = bars off-screen.
  const fullBar = 64;
  const bar = fullBar * (1 - opening);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CANVAS_W, bar);
  ctx.fillRect(0, CANVAS_H - bar, CANVAS_W, bar);
}

// ---------- Subtitles ----------

// Renders a subtitle box at the bottom-center of the canvas with a portrait
// + speaker name + typewriter-revealed text. `sub` is:
//   { speaker, text, localT, dur, portrait? }

const SUB_BOX_W = 720;
const SUB_BOX_H = 110;

export function drawSubtitle(ctx, sub) {
  const x = (CANVAS_W - SUB_BOX_W) / 2;
  const y = CANVAS_H - SUB_BOX_H - 80;

  // Background panel
  ctx.save();
  ctx.fillStyle = 'rgba(8, 6, 14, 0.82)';
  ctx.fillRect(x, y, SUB_BOX_W, SUB_BOX_H);
  // Top accent line (neon)
  const accent = sub.accent || PALETTE.neonAmber;
  ctx.fillStyle = accent;
  ctx.fillRect(x, y, SUB_BOX_W, 2);
  // Bottom accent
  ctx.fillStyle = 'rgba(255, 170, 60, 0.30)';
  ctx.fillRect(x, y + SUB_BOX_H - 1, SUB_BOX_W, 1);

  // Portrait box (left)
  drawPortrait(ctx, x + 10, y + 10, 88, 90, sub.speaker);

  // Speaker name
  ctx.fillStyle = accent;
  ctx.font = 'bold 14px monospace';
  ctx.textBaseline = 'top';
  ctx.fillText(speakerLabel(sub.speaker), x + 110, y + 12);

  // Typewriter reveal
  const revealRate = sub.revealRate || 38;     // chars/sec
  const visibleChars = Math.min(sub.text.length, Math.floor(sub.localT * revealRate));
  const visibleText = sub.text.slice(0, visibleChars);
  // Word-wrapped subtitle text
  ctx.fillStyle = '#e8e0d0';
  ctx.font = '15px monospace';
  ctx.textBaseline = 'top';
  const maxW = SUB_BOX_W - 130;
  wrapText(ctx, visibleText, x + 110, y + 36, maxW, 18);

  ctx.restore();
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(/(\s+)/);
  let line = '';
  let cy = y;
  for (const w of words) {
    const test = line + w;
    if (ctx.measureText(test).width > maxW && line.length > 0) {
      ctx.fillText(line, x, cy);
      line = w.replace(/^\s+/, '');
      cy += lineH;
    } else {
      line = test;
    }
  }
  if (line.length > 0) ctx.fillText(line, x, cy);
}

function speakerLabel(speaker) {
  switch (speaker) {
    case 'detective': return 'KESSLER';
    case 'narrator':  return '';
    case 'client':    return 'CLIENTE';
    case 'chief':     return 'CHEFE';
    default:          return (speaker || '').toUpperCase();
  }
}

function drawPortrait(ctx, x, y, w, h, speaker) {
  // Frame
  ctx.fillStyle = '#1a1a22';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#0a0a10';
  ctx.fillRect(x, y, w, h);
  // If a hand-drawn PNG is registered via the asset manifest, use it.
  // Otherwise fall through to the procedural bust.
  const png = getAsset(`cutscene.portrait.${speaker}`);
  if (png && png.img) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(png.img, x, y, w, h);
    return;
  }
  if (speaker === 'detective') drawDetectivePortrait(ctx, x, y, w, h);
  else if (speaker === 'client') drawClientPortrait(ctx, x, y, w, h);
  else if (speaker === 'chief') drawChiefPortrait(ctx, x, y, w, h);
  else {
    // Narrator: blank with a neon line
    ctx.fillStyle = PALETTE.neonAmber;
    ctx.fillRect(x + w / 2 - 1, y + 12, 2, h - 24);
  }
}

function drawDetectivePortrait(ctx, x, y, w, h) {
  // Backlit silhouette with rim light + cigarette glow
  ctx.fillStyle = '#1a1230';
  ctx.fillRect(x, y, w, h);
  // Window slats glow on the wall behind
  ctx.fillStyle = 'rgba(58, 255, 240, 0.20)';
  for (let i = 0; i < 5; i++) ctx.fillRect(x + 2 + i * 18, y + 6, 12, h - 12);
  // Coat silhouette
  ctx.fillStyle = '#0a0a10';
  ctx.fillRect(x + 18, y + 36, w - 36, h - 36);
  // Shoulders
  ctx.fillRect(x + 8, y + 50, w - 16, h - 50);
  // Head
  ctx.fillStyle = '#0a0a10';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + 30, 18, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  // Fedora
  ctx.fillStyle = '#000';
  ctx.fillRect(x + w / 2 - 26, y + 12, 52, 4);
  ctx.fillRect(x + w / 2 - 16, y + 4,  32, 12);
  // Rim light along jaw + brim (warm)
  ctx.fillStyle = PALETTE.neonAmber;
  ctx.fillRect(x + w / 2 + 16, y + 24, 1, 18);
  ctx.fillRect(x + w / 2 - 16, y + 16, 32, 1);
  // Cigarette glow + smoke
  ctx.fillStyle = PALETTE.detectiveCigar;
  ctx.fillRect(x + w / 2 + 10, y + 38, 2, 2);
  ctx.fillStyle = 'rgba(220,220,230,0.4)';
  ctx.fillRect(x + w / 2 + 13, y + 30, 1, 4);
  ctx.fillRect(x + w / 2 + 15, y + 22, 1, 4);
}

function drawClientPortrait(ctx, x, y, w, h) {
  ctx.fillStyle = '#180a18';
  ctx.fillRect(x, y, w, h);
  // Pink neon backlight
  ctx.fillStyle = 'rgba(255, 58, 140, 0.20)';
  ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
  // Hair / silhouette (woman, fur collar)
  ctx.fillStyle = '#0a0a10';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + 30, 22, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  // Fur collar
  ctx.fillStyle = '#3a2a30';
  ctx.fillRect(x + 8, y + 56, w - 16, 20);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = (i & 1) ? '#5a3a40' : '#3a2a30';
    ctx.fillRect(x + 8 + i * 9, y + 56, 9, 6);
  }
  // Shoulders
  ctx.fillStyle = '#0a0a10';
  ctx.fillRect(x + 12, y + 70, w - 24, h - 70);
  // Earring (cyan stud)
  ctx.fillStyle = PALETTE.neonCyan;
  ctx.fillRect(x + w / 2 + 18, y + 38, 2, 2);
  // Lips (pink neon edge)
  ctx.fillStyle = PALETTE.neonPink;
  ctx.fillRect(x + w / 2 - 4, y + 40, 8, 2);
  // Eye glint
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + w / 2 - 6, y + 28, 2, 2);
  ctx.fillRect(x + w / 2 + 4, y + 28, 2, 2);
}

function drawChiefPortrait(ctx, x, y, w, h) {
  ctx.fillStyle = '#101820';
  ctx.fillRect(x, y, w, h);
  // Blinds shadow behind
  ctx.fillStyle = 'rgba(255, 220, 110, 0.10)';
  for (let i = 0; i < 6; i++) ctx.fillRect(x + 4, y + 4 + i * 14, w - 8, 8);
  // Older man, balding, glasses
  ctx.fillStyle = '#0a0a10';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + 32, 20, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  // Bald top highlight
  ctx.fillStyle = '#3a2a20';
  ctx.fillRect(x + w / 2 - 14, y + 14, 28, 4);
  // Glasses
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + w / 2 - 14, y + 28, 12, 8);
  ctx.strokeRect(x + w / 2 + 2,  y + 28, 12, 8);
  ctx.beginPath();
  ctx.moveTo(x + w / 2 - 2, y + 32); ctx.lineTo(x + w / 2 + 2, y + 32);
  ctx.stroke();
  // Shirt collar (white)
  ctx.fillStyle = '#e8e0c8';
  ctx.fillRect(x + 16, y + 60, w - 32, 16);
  // Tie
  ctx.fillStyle = PALETTE.neonRed;
  ctx.fillRect(x + w / 2 - 4, y + 60, 8, h - 60);
  // Suit
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(x + 6,  y + 60, 14, h - 60);
  ctx.fillRect(x + w - 20, y + 60, 14, h - 60);
}

// ---------- Skip prompt ----------

export function drawSkipPrompt(ctx, totalT) {
  // Pulsing gentle hint at the top right
  const alpha = 0.45 + 0.15 * Math.sin(totalT * 2.0);
  ctx.save();
  ctx.fillStyle = `rgba(255, 220, 150, ${alpha})`;
  ctx.font = '12px monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'right';
  ctx.fillText('[Espaço] pular', CANVAS_W - 14, 14);
  ctx.restore();
}

// ---------- Full-screen fade ----------

export function drawFade(ctx, alpha) {
  if (alpha <= 0) return;
  ctx.fillStyle = `rgba(0,0,0,${Math.min(1, Math.max(0, alpha))})`;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}
