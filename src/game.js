// Game orchestrator: state, update, side-view scene render.
//
// The world is now a registry of side-view scenes (see `src/scenes.js`),
// not a top-down tile grid. Each scene is a horizontally-scrolling corridor
// with parallax background layers, walkable bounds, and hotspots.

import { Input } from './input.js';
import { Audio } from './audio.js';
import { SPR, PLAYER_W, PLAYER_H } from './sprites.js';
import { getScene } from './scenes.js';
import { createPlayer, updatePlayer, hotspotInFront } from './player.js';
import { createInventory } from './inventory.js';
import * as UI from './ui.js';
import { saveGame, loadGame } from './save.js';
import { applyLighting } from './lighting.js';
import {
  CANVAS_W, CANVAS_H,
  REAL_SECONDS_PER_GAME_MIN,
  DAY_START_HOUR, DAY_FAINT_HOUR,
  STARTING_MONEY, ENERGY_MAX, FAINT_ENERGY_RATIO,
  DEFAULT_SCENE,
  PALETTE,
} from './config.js';

// ---------------- State factory ----------------

export function createInitialState(sceneId = DEFAULT_SCENE) {
  const scene = getScene(sceneId);
  const inv = createInventory();
  return {
    sceneId,
    inventory: inv,
    player: createPlayer(scene),
    money: STARTING_MONEY,
    energy: ENERGY_MAX,
    energyMax: ENERGY_MAX,
    day: 1,
    hour: DAY_START_HOUR,
    minute: 0,
    timeAccum: 0,
    paused: false,
    fainted: false,
    flash: 0,
  };
}

export function loadStateFromSave() {
  const data = loadGame();
  if (!data) return null;
  const sceneId = data.sceneId || DEFAULT_SCENE;
  const scene = getScene(sceneId);
  const player = createPlayer(scene);
  if (typeof data.playerX === 'number') player.x = data.playerX;
  if (data.playerDir === 'left' || data.playerDir === 'right') player.dir = data.playerDir;
  return {
    sceneId,
    inventory: data.inventory,
    player,
    money: data.money,
    energy: data.energy,
    energyMax: data.energyMax,
    day: data.day,
    hour: data.hour,
    minute: data.minute,
    timeAccum: 0,
    paused: false,
    fainted: false,
    flash: 0,
  };
}

// ---------------- Main loop ----------------

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.state = null;
    this.lastT = 0;
    this.running = false;
    this._raf = null;
    this._cameraX = 0;
    this._tSec = 0;        // wall-clock seconds since boot, for lighting flicker
    this._lastDt = 0;
    // Active scene-change transition (or null when not transitioning).
    //   { phase: 'out'|'in', t: secondsElapsed, duration, target, spawn }
    // Player input is frozen and a black overlay is drawn for the whole
    // duration; the scene swap happens at the boundary between phases.
    this._transition = null;
  }

  start(state) {
    this.state = state;
    this.lastT = performance.now();
    this.running = true;
    cancelAnimationFrame(this._raf);
    const loop = (t) => {
      if (!this.running) return;
      const dt = Math.max(0, Math.min(0.05, (t - this.lastT) / 1000));
      this.lastT = t;
      this._tSec += dt;
      this._lastDt = dt;
      this.update(dt);
      this.render();
      Input.endFrame();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
  }

  // ---------- Time / energy ----------

  advanceTime(dt) {
    const s = this.state;
    if (s.paused) return;
    s.timeAccum += dt;
    const minsPerSec = 1 / REAL_SECONDS_PER_GAME_MIN;
    const minsToAdd = s.timeAccum * minsPerSec;
    if (minsToAdd >= 1) {
      const whole = Math.floor(minsToAdd);
      s.timeAccum -= whole * REAL_SECONDS_PER_GAME_MIN;
      s.minute += whole;
      while (s.minute >= 60) { s.minute -= 60; s.hour += 1; }
      // Auto-recover at sunrise (placeholder until the safe-house mechanic
      // replaces this in a later PR).
      if (s.hour >= DAY_FAINT_HOUR && !s.fainted) {
        s.fainted = true;
        Audio.faint();
        UI.toast('Você descansou. Acordou na noite seguinte.');
        setTimeout(() => this.recoverDay(true), 600);
      }
    }
  }

  spendEnergy(n) {
    this.state.energy -= n;
    if (this.state.energy <= 0) {
      this.state.energy = 0;
      if (!this.state.fainted) {
        this.state.fainted = true;
        Audio.faint();
        UI.toast('Sem energia! Você desmaiou.');
        setTimeout(() => this.recoverDay(true), 600);
      }
    }
  }

  recoverDay(forced = false) {
    const s = this.state;
    s.fainted = false;
    s.day += 1;
    s.hour = DAY_START_HOUR;
    s.minute = 0;
    s.energy = forced ? Math.round(s.energyMax * FAINT_ENERGY_RATIO) : s.energyMax;
    s.flash = 1.0;
    Audio.newDay();
    saveGame(s);
    UI.toast(`Noite ${s.day}`);
  }

  // ---------- Update ----------

  update(dt) {
    const s = this.state;
    if (UI.isTitleOpen()) return;

    if (Input.consumePress('inventory')) {
      if (UI.isInventoryOpen()) UI.hideInventory();
      else if (!UI.isAnyOverlayOpen()) UI.showInventory(s);
    }

    if (Input.consumePress('escape')) {
      if (UI.isInventoryOpen()) UI.hideInventory();
      else if (UI.isDialogOpen()) UI.hideDialog();
    }

    // Both Space (action) and Up (W / ↑) trigger interactions. In side-view,
    // "up" is the canonical interact verb — pressing up while standing on a
    // hotspot opens the door / talks to the NPC / examines evidence.
    const interact = Input.consumePress('action') || Input.consumePress('up');
    if (interact) {
      if (UI.isDialogOpen()) UI.hideDialog();
      else if (!UI.isAnyOverlayOpen()) this.useTool();
    }

    const hb = Input.takeHotbarPress();
    if (hb >= 0 && !UI.isAnyOverlayOpen()) {
      s.inventory.selected = hb;
      Audio.step();
    }

    if (UI.isAnyOverlayOpen()) {
      UI.updateHUD(s);
      return;
    }

    // While a transition is mid-fade, freeze the player and the clock so
    // the world doesn't drift under the black overlay.
    if (this._transition) {
      this._advanceTransition(dt);
      UI.updateHUD(s);
      return;
    }

    const scene = getScene(s.sceneId);
    updatePlayer(s.player, scene, dt);
    this.advanceTime(dt);

    UI.updateHUD(s);
    if (s.flash > 0) s.flash -= dt * 2;
  }

  // ---------- Action / interact ----------
  // Door hotspots with `{ goto, spawn }` actions trigger a scene change.
  // String actions ("enter:bar", "examine:desk", etc.) are surfaced as
  // placeholder toasts until evidence/dialog/gadget PRs wire them up.

  useTool() {
    const s = this.state;
    const scene = getScene(s.sceneId);
    const hotspot = hotspotInFront(s.player, scene);
    s.player.actionAnimT = 0.18;
    if (!hotspot) {
      // Nothing to interact with at the player's current position.
      Audio.step();
      return;
    }

    const action = hotspot.action;

    // Object form: scene change.
    if (action && typeof action === 'object' && typeof action.goto === 'string') {
      this.changeScene(action.goto, action.spawn || 'default');
      return;
    }

    // String form: placeholder verbs surfaced as toasts.
    if (typeof action === 'string') {
      if (action.startsWith('enter:')) {
        const target = action.slice(6);
        UI.toast(`Porta para "${target}" — em breve.`);
        return;
      }
      if (action.startsWith('examine:')) {
        UI.toast(`${hotspot.label || 'Examinar'} — em breve.`);
        return;
      }
      if (action === 'talk' || action.startsWith('talk:')) {
        UI.showDialog(hotspot.label || '???', '...');
        return;
      }
    }

    // Fallback: surface the label so the player gets feedback.
    UI.toast(hotspot.label || 'Interagir');
  }

  // ---------- Scene transition ----------
  // Two-phase fade. During phase 'out' the current scene is rendered with a
  // growing black overlay; at the boundary the scene is swapped and the
  // player is repositioned to the target scene's spawn; phase 'in' shrinks
  // the overlay back to transparent. Player input is frozen the whole time.

  changeScene(targetSceneId, spawn = 'default') {
    if (this._transition) return; // already transitioning
    // Validate target up-front so we surface bad scene IDs immediately
    // instead of crashing mid-fade.
    getScene(targetSceneId);
    this._transition = {
      phase: 'out',
      t: 0,
      duration: 0.35,
      target: targetSceneId,
      spawn,
    };
  }

  _advanceTransition(dt) {
    const tr = this._transition;
    if (!tr) return;
    tr.t += dt;
    if (tr.phase === 'out' && tr.t >= tr.duration) {
      // Swap scene at the boundary.
      const s = this.state;
      const newScene = getScene(tr.target);
      s.sceneId = tr.target;
      // Snap player to the requested spawn (or the scene's walkable centre).
      let spawnX;
      if (newScene.spawns && typeof newScene.spawns[tr.spawn] === 'number') {
        spawnX = newScene.spawns[tr.spawn];
      } else if (newScene.spawns && typeof newScene.spawns.default === 'number') {
        spawnX = newScene.spawns.default;
      } else {
        spawnX = Math.floor((newScene.walkable[0] + newScene.walkable[1]) / 2);
      }
      s.player.x = Math.max(
        newScene.walkable[0],
        Math.min(newScene.walkable[1] - PLAYER_W, spawnX - PLAYER_W / 2),
      );
      s.player.y = newScene.groundY - PLAYER_H;
      s.player.moving = false;
      s.player.animFrame = 0;
      s.player.animTime = 0;
      // Persist immediately — this is a strong checkpoint.
      saveGame(s);
      tr.phase = 'in';
      tr.t = 0;
    } else if (tr.phase === 'in' && tr.t >= tr.duration) {
      this._transition = null;
    }
  }

  // ---------- Rendering ----------

  computeCamera() {
    const s = this.state;
    const scene = getScene(s.sceneId);
    const px = s.player.x + PLAYER_W / 2;
    let cx = px - CANVAS_W / 2;
    cx = Math.max(0, Math.min(scene.width - CANVAS_W, cx));
    this._cameraX = Math.floor(cx);
  }

  render() {
    const s = this.state;
    const ctx = this.ctx;
    const scene = getScene(s.sceneId);

    this.computeCamera();
    const cx = this._cameraX;

    // Solid backstop in case any layer doesn't fully cover the canvas.
    ctx.fillStyle = PALETTE.sky[0];
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Pass 1: parallax background layers (sky → far → mid → street).
    // Foreground layer (parallax > 1.0) is drawn after the player.
    for (const layer of scene.layers) {
      if (layer.parallax > 1.0) continue;
      this.drawLayer(layer, cx);
    }

    // Pass 2: NPCs (drawn at scene scroll factor 1.0)
    for (const npc of scene.npcs || []) {
      this.drawNPC(npc, cx);
    }

    // Pass 3: player
    this.drawPlayer(cx);

    // Pass 4: foreground layers (parallax > 1.0, drawn over player for depth).
    for (const layer of scene.layers) {
      if (layer.parallax <= 1.0) continue;
      this.drawLayer(layer, cx);
    }

    // Pass 5: noir lighting (additive point lights, rain, fog).
    applyLighting(ctx, scene, cx, this._tSec, this._lastDt);

    // Pass 6: hotspot prompt (suppressed during transitions so the
    // outgoing scene's prompt doesn't blink while the screen fades).
    if (!UI.isAnyOverlayOpen() && !this._transition) {
      const hs = hotspotInFront(s.player, scene);
      if (hs) {
        const lx = s.player.x + PLAYER_W / 2 - cx;
        const ly = scene.groundY - PLAYER_H - 22;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = `[↑] ${hs.label}`;
        const w = ctx.measureText(label).width + 12;
        ctx.fillStyle = 'rgba(15, 10, 25, 0.85)';
        ctx.fillRect(lx - w / 2, ly - 10, w, 20);
        ctx.strokeStyle = PALETTE.neonAmber;
        ctx.lineWidth = 1;
        ctx.strokeRect(lx - w / 2 + 0.5, ly - 9.5, w - 1, 19);
        ctx.fillStyle = PALETTE.neonAmber;
        ctx.fillText(label, lx, ly);
      }
    }

    // Pass 7: ambient tint (cheap secondary tint on top of lighting; lets
    // a scene desaturate or warm the whole frame without rebuilding lights).
    if (scene.ambient && scene.ambient.tint) {
      ctx.fillStyle = scene.ambient.tint;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // Pass 8: scene-transition flash (legacy day-recovery flash kept)
    if (s.flash > 0) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, s.flash)})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // Pass 9: scene-change transition overlay
    if (this._transition) {
      const tr = this._transition;
      const k = Math.max(0, Math.min(1, tr.t / tr.duration));
      const alpha = tr.phase === 'out' ? k : 1 - k;
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha.toFixed(3)})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
  }

  drawLayer(layer, cameraX) {
    const img = layer.get();
    if (!img) return;
    const offset = -Math.floor(cameraX * layer.parallax);
    this.ctx.drawImage(img, offset, 0);
  }

  drawNPC(npc, cameraX) {
    // Placeholder. Real NPC sprites + dialog hooks land with the dialog-tree PR.
    const ctx = this.ctx;
    const dx = Math.floor(npc.x - cameraX);
    const dy = (npc.y || 0);
    ctx.fillStyle = '#3a3a44';
    ctx.fillRect(dx, dy, PLAYER_W, PLAYER_H);
  }

  drawPlayer(cameraX) {
    const s = this.state;
    const p = s.player;
    const dx = Math.floor(p.x - cameraX);
    const dy = Math.floor(p.y);
    const ctx = this.ctx;

    // pick frame
    let img;
    if (p.moving) img = SPR.player.walk[p.animFrame];
    else img = SPR.player.idle[Math.floor((Date.now() / 600) % 2)];
    if (!img) return;

    if (p.dir === 'left') {
      ctx.save();
      ctx.translate(dx + PLAYER_W, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(img, dx, dy);
    }
  }
}
