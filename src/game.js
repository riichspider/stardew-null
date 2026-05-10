// Game orchestrator: state, update, render.
//
// Engine-level scaffold post-farming gut: keeps the loop, camera, day/night
// cycle, save/load, HUD, dialog, inventory, and a placeholder "use" action
// for chopping trees / breaking rocks. All farming, shop, sleep, and seasonal
// systems were removed; they will be replaced by noir RPG mechanics.

import { Input } from './input.js';
import { Audio } from './audio.js';
import { TILE, SPR } from './sprites.js';
import { createWorld, tileAt, T, endOfDay } from './world.js';
import { createPlayer, updatePlayer, describeTargetAction } from './player.js';
import { createInventory, addItem, selectedDef, selectedItem } from './inventory.js';
import * as UI from './ui.js';
import { saveGame, loadGame } from './save.js';
import {
  CANVAS_W, CANVAS_H,
  REAL_SECONDS_PER_GAME_MIN,
  DAY_START_HOUR, DAY_FAINT_HOUR,
  STARTING_MONEY, ENERGY_MAX, FAINT_ENERGY_RATIO,
} from './config.js';

// ---------------- Constants ----------------

const ACTION_LABELS = {
  chop: 'Cortar',
  chopStump: 'Cortar toco',
  rock: 'Quebrar',
  enter: 'Entrar',
  talk: 'Falar',
};

// ---------------- State factory ----------------

export function createInitialState() {
  const world = createWorld();
  const inv = createInventory();
  return {
    world,
    inventory: inv,
    player: createPlayer(world.spawn),
    money: STARTING_MONEY,
    energy: ENERGY_MAX,
    energyMax: ENERGY_MAX,
    day: 1,
    hour: DAY_START_HOUR,
    minute: 0,
    timeAccum: 0,
    paused: false,
    fainted: false,
    waterAnimT: 0,
    flash: 0, // screen flash for transitions
  };
}

export function loadStateFromSave() {
  const data = loadGame();
  if (!data) return null;
  const world = createWorld();
  if (data.tiles) world.tiles = new Uint8Array(data.tiles);
  if (Array.isArray(data.objects)) world.objects = data.objects;
  return {
    world,
    inventory: data.inventory,
    player: createPlayer(world.spawn),
    money: data.money,
    energy: data.energy,
    energyMax: data.energyMax,
    day: data.day,
    hour: data.hour,
    minute: data.minute,
    timeAccum: 0,
    paused: false,
    fainted: false,
    waterAnimT: 0,
    flash: 0,
    _restorePlayer: data.player,
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
    this._cameraY = 0;
  }

  start(state) {
    this.state = state;
    if (state._restorePlayer) {
      state.player.x = state._restorePlayer.x;
      state.player.y = state._restorePlayer.y;
      state.player.dir = state._restorePlayer.dir;
      delete state._restorePlayer;
    }
    this.lastT = performance.now();
    this.running = true;
    cancelAnimationFrame(this._raf);
    const loop = (t) => {
      if (!this.running) return;
      const dt = Math.max(0, Math.min(0.05, (t - this.lastT) / 1000));
      this.lastT = t;
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
      // Auto-recover at the late-night cutoff (placeholder until the noir
      // sleep / safe-house mechanic replaces this).
      if (s.hour >= DAY_FAINT_HOUR && !s.fainted) {
        s.fainted = true;
        Audio.faint();
        UI.toast('Você apagou. Acordou no dia seguinte.');
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
        UI.toast('Sem energia! Você apagou.');
        setTimeout(() => this.recoverDay(true), 600);
      }
    }
  }

  // ---------- Day reset ----------
  // Placeholder for "rest/sleep". Triggered automatically on faint or when
  // running out of energy. Will be replaced by a dedicated safe-house /
  // narrative beat in the noir RPG.

  recoverDay(forced = false) {
    const s = this.state;
    s.fainted = false;
    endOfDay(s.world);
    s.day += 1;
    s.hour = DAY_START_HOUR;
    s.minute = 0;
    s.energy = forced ? Math.round(s.energyMax * FAINT_ENERGY_RATIO) : s.energyMax;
    s.flash = 1.0;
    Audio.newDay();
    // Send the player back to spawn after a faint.
    const p = s.player;
    p.x = s.world.spawn.x * TILE + 4;
    p.y = s.world.spawn.y * TILE;
    p.dir = 'down';
    saveGame(s);
    UI.toast(`Dia ${s.day}`);
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

    if (Input.consumePress('action')) {
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

    updatePlayer(s.player, s.world, dt);
    this.advanceTime(dt);
    s.waterAnimT += dt;

    UI.updateHUD(s);
    if (s.flash > 0) s.flash -= dt * 2;
  }

  // ---------- Action / interact ----------

  useTool() {
    const s = this.state;
    const def = selectedDef(s.inventory);
    const item = selectedItem(s.inventory);
    const target = describeTargetAction(s.player, s.world, def, item);
    s.player.actionAnimT = 0.18;

    switch (target.kind) {
      case 'chop': {
        const o = target.obj;
        o.hp = (o.hp || 3) - 1;
        Audio.chop();
        this.spendEnergy(2);
        if (o.hp <= 0) {
          o.removed = true;
          addItem(s.inventory, 'wood', 4);
          UI.toast('+4 Madeira');
        }
        break;
      }
      case 'chopStump': {
        target.obj.removed = true;
        Audio.chop();
        this.spendEnergy(1);
        addItem(s.inventory, 'wood', 1);
        UI.toast('+1 Madeira');
        break;
      }
      case 'rock': {
        const o = target.obj;
        o.hp = (o.hp || 2) - 1;
        Audio.rock();
        this.spendEnergy(2);
        if (o.hp <= 0) {
          o.removed = true;
          addItem(s.inventory, 'stone', 2);
          UI.toast('+2 Pedra');
        }
        break;
      }
      case 'enter':
        UI.toast('Porta trancada (em breve!)');
        break;
      case 'talk':
        UI.showDialog(target.obj.name || 'Estranho', '...');
        break;
      default:
        // No-op: nothing actionable in front of the player.
        break;
    }
  }

  // ---------- Rendering ----------

  computeCamera() {
    const s = this.state;
    const px = s.player.x + 12;
    const py = s.player.y + 16;
    let cx = px - CANVAS_W / 2;
    let cy = py - CANVAS_H / 2;
    const maxX = s.world.width * TILE - CANVAS_W;
    const maxY = s.world.height * TILE - CANVAS_H;
    cx = Math.max(0, Math.min(maxX, cx));
    cy = Math.max(0, Math.min(maxY, cy));
    this._cameraX = Math.floor(cx);
    this._cameraY = Math.floor(cy);
  }

  render() {
    const s = this.state;
    const ctx = this.ctx;
    ctx.fillStyle = '#0d100b';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    this.computeCamera();
    const cx = this._cameraX, cy = this._cameraY;

    const x0 = Math.max(0, Math.floor(cx / TILE));
    const y0 = Math.max(0, Math.floor(cy / TILE));
    const x1 = Math.min(s.world.width - 1, Math.ceil((cx + CANVAS_W) / TILE));
    const y1 = Math.min(s.world.height - 1, Math.ceil((cy + CANVAS_H) / TILE));

    const waterFrame = ((Math.floor(s.waterAnimT * 4) % 4) + 4) % 4;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        this.drawTile(tx, ty, cx, cy, waterFrame);
      }
    }

    // Pass 2: objects + player, sorted by Y for pseudo-depth.
    const drawables = [];
    drawables.push({ y: s.player.y + 32, draw: () => this.drawPlayer(cx, cy) });
    for (const o of s.world.objects) {
      if (o.removed) continue;
      if (o.x < x0 - 1 || o.x > x1 + 1 || o.y < y0 - 2 || o.y > y1 + 1) continue;
      drawables.push({ y: o.y * TILE + TILE, draw: () => this.drawObject(o, cx, cy) });
    }
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw();

    // Pass 3: action target highlight + label
    if (!UI.isAnyOverlayOpen()) {
      const def = selectedDef(s.inventory);
      const item = selectedItem(s.inventory);
      const target = describeTargetAction(s.player, s.world, def, item);
      if (target.kind !== 'none') {
        const tx = target.tx, ty = target.ty;
        ctx.strokeStyle = 'rgba(255, 230, 100, 0.95)';
        ctx.lineWidth = 2;
        ctx.strokeRect(tx * TILE - cx + 1, ty * TILE - cy + 1, TILE - 2, TILE - 2);
        const label = ACTION_LABELS[target.kind];
        if (label) {
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const lx = tx * TILE - cx + TILE / 2;
          const ly = ty * TILE - cy - 10;
          const w = ctx.measureText(label).width + 10;
          ctx.fillStyle = 'rgba(35, 26, 16, 0.85)';
          ctx.fillRect(lx - w / 2, ly - 9, w, 18);
          ctx.fillStyle = '#ffe69b';
          ctx.fillText(label, lx, ly);
        }
      }
    }

    // Pass 4: lighting / day-night tint
    this.drawLighting();

    // Pass 5: flash
    if (s.flash > 0) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, s.flash)})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
  }

  drawTile(tx, ty, cx, cy, waterFrame) {
    const s = this.state;
    const t = tileAt(s.world, tx, ty);
    const dx = tx * TILE - cx;
    const dy = ty * TILE - cy;
    const ctx = this.ctx;
    let img;
    switch (t) {
      case T.GRASS: img = SPR.grass[(tx * 7 + ty * 13) % 4]; break;
      case T.PATH: img = SPR.path; break;
      case T.WATER: img = SPR.water[waterFrame]; break;
      case T.STONE_FLOOR: img = SPR.stoneFloor; break;
      case T.WOOD_FLOOR: img = SPR.wood; break;
      case T.FENCE: img = SPR.fence; break;
      case T.WALL: img = SPR.wall; break;
      case T.BUILDING_ROOF: img = SPR.buildingRoof; break;
      case T.BUILDING_DOOR: img = SPR.door; break;
      default: img = SPR.grass[0];
    }
    if (!img) img = SPR.grass[0];
    ctx.drawImage(img, dx, dy);
  }

  drawObject(o, cx, cy) {
    const ctx = this.ctx;
    const dx = o.x * TILE - cx;
    const dy = o.y * TILE - cy;
    if (o.type === 'tree') {
      ctx.drawImage(SPR.tree, dx - TILE / 2, dy - TILE * 2);
    } else if (o.type === 'stump') {
      ctx.drawImage(SPR.stump, dx, dy);
    } else if (o.type === 'rock') {
      ctx.drawImage(SPR.rock, dx, dy);
    } else if (o.type === 'npc') {
      ctx.drawImage(SPR.npc, dx + 4, dy);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      const w = ctx.measureText(o.name).width + 8;
      ctx.fillRect(dx + 16 - w / 2, dy - 14, w, 12);
      ctx.fillStyle = '#ffe7ad';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(o.name, dx + 16, dy - 8);
    }
  }

  drawPlayer(cx, cy) {
    const s = this.state;
    const p = s.player;
    const dx = Math.floor(p.x - cx);
    const dy = Math.floor(p.y - cy);
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0,0,0,0.32)';
    this.ctx.beginPath();
    this.ctx.ellipse(dx + 12, dy + 31, 9, 3, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
    const frames = SPR.player[p.dir];
    const fi = p.moving ? p.animFrame : 0;
    this.ctx.drawImage(frames[fi], dx, dy);

    // Tool swing arc — kept as a generic "did something" feedback hook.
    if (p.actionAnimT > 0) {
      const t = 1 - (p.actionAnimT / 0.18);
      const arc = Math.sin(t * Math.PI);
      this.ctx.fillStyle = '#ffd34d';
      let ax = dx + 12, ay = dy + 16;
      if (p.dir === 'up') ay -= 14 * arc;
      else if (p.dir === 'down') ay += 14 * arc;
      else if (p.dir === 'left') ax -= 14 * arc;
      else if (p.dir === 'right') ax += 14 * arc;
      this.ctx.fillRect(ax - 2, ay - 2, 4, 4);
    }
  }

  drawLighting() {
    const s = this.state;
    const ctx = this.ctx;
    // 0 (full day) at 8:00, 1 (full night) at 22:00; partial in between.
    const totalMin = s.hour * 60 + s.minute;
    const sunrise = 6 * 60, dayBright = 8 * 60, dusk = 19 * 60, fullDark = 22 * 60;
    let darkness;
    if (totalMin <= sunrise) darkness = 0.30;
    else if (totalMin <= dayBright) darkness = lerp(0.30, 0, (totalMin - sunrise) / (dayBright - sunrise));
    else if (totalMin <= dusk) darkness = 0;
    else if (totalMin <= fullDark) darkness = lerp(0, 0.55, (totalMin - dusk) / (fullDark - dusk));
    else darkness = 0.55 + Math.min(0.15, (totalMin - fullDark) / (60 * 4) * 0.15);

    if (darkness > 0.001) {
      ctx.fillStyle = `rgba(20, 30, 80, ${darkness})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
  }
}

function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
