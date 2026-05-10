// Cinematic noir lighting layer.
//
// Three rendering passes, called by Game.render() between the foreground
// parallax layer and the HUD:
//
//   1. Point lights (additive 'screen' blend) — street lamps, neon halos
//   2. Rain (overlay) — diagonal streaks falling across the viewport with
//      splashes at ground level
//   3. Volumetric fog (overlay) — desaturated blue tint pulsing slightly to
//      sell the wet-air look
//
// Each scene declares an optional `lights` array, an `ambient.fog` config
// (tint string + alpha), and an `ambient.rain` config (density 0..1 +
// optional speed/length). When fields are missing, the pass is skipped, so
// indoor scenes (apartments, bars) cost nothing here.

import { CANVAS_W, CANVAS_H, PALETTE } from './config.js';

// Deterministic PRNG so lights/rain look identical across reloads of the
// same scene. (Time-based phase still animates them.)
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------- Rain ----------------

// Particle pool. Each entry: { x, y, vx, vy, life, ttl, splash }.
// We allocate a fixed-size pool per scene and recycle entries instead of
// pushing/popping per frame.
const _rainPools = new Map();

function getRainPool(sceneId, density, speed, length, rng) {
  const key = `${sceneId}:${density}:${speed}:${length}`;
  if (_rainPools.has(key)) return _rainPools.get(key);

  // density 0..1 → 40..220 drops. The viewport is 960×640 so this density
  // is comfortable without choking the canvas.
  const count = Math.floor(40 + density * 180);
  const pool = new Array(count);
  for (let i = 0; i < count; i++) {
    pool[i] = {
      x: rng() * CANVAS_W,
      y: rng() * CANVAS_H,
      vx: speed * 0.25,        // slight horizontal drift (looks like wind)
      vy: speed * (0.85 + rng() * 0.3),
      len: length * (0.7 + rng() * 0.6),
      splash: 0,
    };
  }
  _rainPools.set(key, pool);
  return pool;
}

function drawRain(ctx, scene, dt) {
  const r = scene.ambient && scene.ambient.rain;
  if (!r) return;
  const density = typeof r.density === 'number' ? r.density : 0.6;
  const speed   = typeof r.speed === 'number'   ? r.speed   : 720;
  const length  = typeof r.length === 'number'  ? r.length  : 14;
  const color   = r.color || 'rgba(180, 200, 255, 0.35)';
  const groundY = scene.groundY;

  const rng = mulberry32((scene.seed || 0) + 0xBEEF);
  const pool = getRainPool(scene.id, density, speed, length, rng);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const d of pool) {
    if (d.splash > 0) {
      d.splash -= dt;
      // splash circle (drawn separately below to keep stroke path clean)
      continue;
    }
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    if (d.y >= groundY) {
      d.splash = 0.18;
      d.x = rng() * CANVAS_W;
      d.y = -10 - rng() * 60;
      continue;
    }
    if (d.x > CANVAS_W + 20) d.x -= CANVAS_W + 40;
    ctx.moveTo(d.x, d.y);
    // Streak heading down-right (matching vx/vy ratio).
    ctx.lineTo(d.x - d.len * 0.25, d.y + d.len);
  }
  ctx.stroke();

  // Splashes — cheap dim circles at ground level.
  ctx.fillStyle = 'rgba(180, 200, 255, 0.25)';
  for (const d of pool) {
    if (d.splash > 0) {
      const a = d.splash / 0.18;
      ctx.globalAlpha = a * 0.6;
      ctx.beginPath();
      ctx.arc(d.x, groundY, 2.5 * (1 - a) + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ---------------- Point lights ----------------

// Additive radial gradients ("screen" blend) painted at light positions.
// Lights flicker on a deterministic phase so two playthroughs see the same
// pulse pattern, but it still feels alive.

function drawLights(ctx, scene, cameraX, t) {
  const lights = scene.lights;
  if (!lights || !lights.length) return;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  for (const L of lights) {
    const sx = L.x - cameraX * (L.parallax != null ? L.parallax : 1.0);
    if (sx < -L.radius || sx > CANVAS_W + L.radius) continue;
    const sy = L.y;
    const radius = L.radius;
    const baseAlpha = L.intensity != null ? L.intensity : 0.7;

    // Flicker: smooth low-amplitude sine + occasional dip for buzzing neons.
    let alpha = baseAlpha;
    if (L.flicker) {
      const phase = t * (L.flicker.rate || 6) + (L.flicker.seed || 0);
      const wob = 0.85 + 0.15 * Math.sin(phase);
      const dip = (Math.sin(phase * 3.2 + 1.7) > 0.97) ? 0.4 : 1.0;
      alpha = baseAlpha * wob * dip;
    }

    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
    grad.addColorStop(0,    hexToRgba(L.color, alpha));
    grad.addColorStop(0.45, hexToRgba(L.color, alpha * 0.45));
    grad.addColorStop(1,    hexToRgba(L.color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function hexToRgba(hex, a) {
  // Accept '#rrggbb' or 'rgb(...)' or 'rgba(...)' passthrough.
  if (hex.startsWith('rgba(') || hex.startsWith('rgb(')) return hex;
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// ---------------- Volumetric fog ----------------

function drawFog(ctx, scene, t) {
  const f = scene.ambient && scene.ambient.fog;
  if (!f) return;
  const baseAlpha = typeof f.alpha === 'number' ? f.alpha : 0.18;
  // Subtle breathing pulse to hint at moving air.
  const a = baseAlpha * (0.92 + 0.08 * Math.sin(t * 0.6));
  ctx.save();
  ctx.fillStyle = f.tint || PALETTE.fog;
  ctx.globalAlpha = a;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.restore();
}

// ---------------- Public API ----------------

// Compose all noir lighting passes. Call from Game.render() after the
// foreground parallax layer has been drawn but before the HUD overlays.
//   ctx: 2D context for the canvas
//   scene: current scene object (must have .id; optionally .lights, .ambient)
//   cameraX: current horizontal scroll
//   tSec: elapsed wall-clock seconds (used for flicker / pulse animation)
//   dt: frame delta in seconds (used to integrate rain)
export function applyLighting(ctx, scene, cameraX, tSec, dt) {
  drawLights(ctx, scene, cameraX, tSec);
  drawRain(ctx, scene, dt);
  drawFog(ctx, scene, tSec);
}
