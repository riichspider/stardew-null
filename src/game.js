// Game orchestrator: state, update, render.

import { Input } from './input.js';
import { Audio } from './audio.js';
import { TILE, SPR, drawCrop } from './sprites.js';
import { createWorld, tileAt, setTile, T, objectAt, isPassable, endOfDay } from './world.js';
import { CROPS, getCrop } from './crops.js';
import { ITEMS } from './items.js';
import { createPlayer, updatePlayer, tileInFront, describeTargetAction, playerTile } from './player.js';
import { createInventory, addItem, selectedDef, selectedItem, removeFromSlot } from './inventory.js';
import * as UI from './ui.js';
import { saveGame, loadGame, hasSave, clearSave } from './save.js';

// ---------------- Constants ----------------

const CANVAS_W = 960, CANVAS_H = 640;
const VIEW_W_TILES = CANVAS_W / TILE; // 30
const VIEW_H_TILES = CANVAS_H / TILE; // 20

// Day length: 6:00 → 26:00 = 20 in-game hours.
// Real-time: tunable. 1 in-game minute = X real seconds.
const REAL_SECONDS_PER_GAME_MIN = 0.6; // ~12 minutes per real-time game day

const ACTION_LABELS = {
  till: 'Arar',
  untill: 'Desfazer',
  plant: 'Plantar',
  fill: 'Encher',
  water: 'Regar',
  chop: 'Cortar',
  chopStump: 'Cortar toco',
  rock: 'Quebrar',
  cut: 'Ceifar',
  harvest: 'Colher',
  shop: 'Loja',
  enter: 'Entrar',
  sleep: 'Dormir',
  chest: 'Baú',
  talk: 'Falar',
};

const SEASONS = ['spring', 'summer', 'fall', 'winter'];

// ---------------- State factory ----------------

export function createInitialState() {
  const world = createWorld(20260509);
  const inv = createInventory();
  // Starter loadout: tools in slots 0-4, parsnip seeds in 5
  inv.slots[0] = { id: 'hoe',      qty: 1 };
  inv.slots[1] = { id: 'watering', qty: 1, water: 0 };
  inv.slots[2] = { id: 'axe',      qty: 1 };
  inv.slots[3] = { id: 'pickaxe',  qty: 1 };
  inv.slots[4] = { id: 'scythe',   qty: 1 };
  addItem(inv, 'parsnip_seed', 8);
  inv.selected = 0;

  return {
    world,
    inventory: inv,
    player: createPlayer(world.spawn),
    money: 500,
    energy: 100,
    energyMax: 100,
    day: 1,
    season: 'spring',
    year: 1,
    hour: 6,
    minute: 0,
    weather: 'sun', // unused for now
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
  const world = createWorld(20260509); // base
  // Replace tiles + objects with saved
  if (data.tiles) {
    world.tiles = new Uint8Array(data.tiles);
  }
  if (Array.isArray(data.objects)) {
    world.objects = data.objects;
  }
  return {
    world,
    inventory: data.inventory,
    player: createPlayer({ x: 5, y: 6 }),
    money: data.money,
    energy: data.energy,
    energyMax: data.energyMax,
    day: data.day,
    season: data.season,
    year: data.year,
    hour: data.hour,
    minute: data.minute,
    weather: data.weather,
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
      // pass out at 26:00 (2am) if not slept
      if (s.hour >= 26 && !s.fainted) {
        s.fainted = true;
        s.energy = Math.max(0, s.energy * 0.5);
        Audio.faint();
        UI.toast('Você desmaiou! Acordou no dia seguinte.');
        // simulate sleep transition
        setTimeout(() => this.sleep(true), 600);
      }
    }
  }

  spendEnergy(n) {
    this.state.energy -= n;
    if (this.state.energy <= 0) {
      this.state.energy = 0;
      // Force faint
      if (!this.state.fainted) {
        this.state.fainted = true;
        Audio.faint();
        UI.toast('Sem energia! Você desmaiou.');
        setTimeout(() => this.sleep(true), 600);
      }
    }
  }

  // ---------- Sleep / new day ----------

  sleep(forced = false) {
    const s = this.state;
    s.fainted = false;
    // End-of-day world tick
    endOfDay(s.world);
    // Update crop readiness based on daysGrown
    for (const o of s.world.objects) {
      if (o.removed || o.type !== 'crop') continue;
      const def = getCrop(o.cropId);
      if ((o.daysGrown || 0) >= (def.stages - 1) * def.daysPerStage) {
        o.ready = true;
      }
    }
    s.day += 1;
    if (s.day > 28) {
      s.day = 1;
      const idx = SEASONS.indexOf(s.season);
      s.season = SEASONS[(idx + 1) % 4];
      if (s.season === 'spring') s.year += 1;
    }
    s.hour = 6;
    s.minute = 0;
    s.energy = forced ? Math.round(s.energyMax * 0.6) : s.energyMax;
    s.flash = 1.0;
    Audio.newDay();
    // Move player back to bed area
    const p = s.player;
    // place at the path tile just south of the bed
    p.x = (3 + 1) * TILE + 4;
    p.y = (3 + 4) * TILE;
    p.dir = 'down';
    saveGame(s);
    UI.toast(`${seasonName(s.season)} ${s.day}, ano ${s.year}`);
  }

  // ---------- Update ----------

  update(dt) {
    const s = this.state;
    if (UI.isTitleOpen()) return;

    // Toggle inventory
    if (Input.consumePress('inventory')) {
      if (UI.isInventoryOpen()) UI.hideInventory();
      else if (!UI.isAnyOverlayOpen()) UI.showInventory(s);
    }

    // ESC closes overlays
    if (Input.consumePress('escape')) {
      if (UI.isShopOpen()) UI.hideShop();
      else if (UI.isInventoryOpen()) UI.hideInventory();
      else if (UI.isSleepOpen()) UI.hideSleepMenu();
      else if (UI.isDialogOpen()) UI.hideDialog();
    }

    // Action / interact
    if (Input.consumePress('action')) {
      if (UI.isDialogOpen()) UI.hideDialog();
      else if (UI.isSleepOpen()) {
        UI.hideSleepMenu();
        this.sleep(false);
      } else if (!UI.isAnyOverlayOpen()) {
        this.useTool();
      }
    }

    // Hotbar selection
    const hb = Input.takeHotbarPress();
    if (hb >= 0 && !UI.isAnyOverlayOpen()) {
      s.inventory.selected = hb;
      Audio.step();
    }

    // Re-render inventory if open (selected may have changed)
    if (UI.isInventoryOpen()) {
      // Cheap; UI.showInventory rebuilds DOM. Skip frame-by-frame to save work; only rebuild on actions.
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

  // ---------- Tool use ----------

  useTool() {
    const s = this.state;
    const def = selectedDef(s.inventory);
    const item = selectedItem(s.inventory);
    const target = describeTargetAction(s.player, s.world, def, item);
    s.player.actionAnimT = 0.18;

    switch (target.kind) {
      case 'till':
        setTile(s.world, target.tx, target.ty, T.TILLED);
        Audio.till();
        this.spendEnergy(2);
        break;
      case 'untill':
        setTile(s.world, target.tx, target.ty, T.GRASS);
        Audio.till();
        this.spendEnergy(1);
        break;
      case 'fill':
        if (item && def.tool === 'watering') {
          item.water = def.waterMax;
          Audio.water();
          UI.toast('Regador cheio');
        }
        break;
      case 'water':
        if (item && item.water > 0) {
          setTile(s.world, target.tx, target.ty, T.WATERED);
          item.water -= 1;
          // also water any planted crop on this tile
          const obj = objectAt(s.world, target.tx, target.ty);
          if (obj && obj.type === 'crop') obj.watered = true;
          Audio.water();
          this.spendEnergy(2);
        }
        break;
      case 'plant': {
        // selectedItem is a seed; def.plants is the crop id
        const cropId = def.plants;
        // season check
        const seasonOK = !def.season || def.season.includes(s.season);
        if (!seasonOK) { Audio.cantDo(); UI.toast('Fora de estação'); break; }
        s.world.objects.push({
          type: 'crop',
          cropId,
          x: target.tx, y: target.ty,
          daysGrown: 0,
          watered: tileAt(s.world, target.tx, target.ty) === T.WATERED,
          ready: false,
        });
        removeFromSlot(s.inventory, s.inventory.selected, 1);
        Audio.plant();
        break;
      }
      case 'chop': {
        const o = target.obj;
        o.hp = (o.hp || 3) - 1;
        Audio.chop();
        this.spendEnergy(4);
        if (o.hp <= 0) {
          o.removed = true;
          // drop wood
          const overflow = addItem(s.inventory, 'wood', 4);
          UI.toast('+4 Madeira');
        }
        break;
      }
      case 'chopStump': {
        const o = target.obj;
        o.removed = true;
        addItem(s.inventory, 'wood', 1);
        Audio.chop();
        this.spendEnergy(3);
        UI.toast('+1 Madeira');
        break;
      }
      case 'rock': {
        const o = target.obj;
        o.hp = (o.hp || 2) - 1;
        Audio.rock();
        this.spendEnergy(4);
        if (o.hp <= 0) {
          o.removed = true;
          addItem(s.inventory, 'stone', 2);
          UI.toast('+2 Pedra');
        }
        break;
      }
      case 'cut': {
        const o = target.obj;
        o.removed = true;
        Audio.cut();
        this.spendEnergy(1);
        if (o.type === 'weed') {
          addItem(s.inventory, 'fiber', 1);
          UI.toast('+1 Fibra');
        } else {
          addItem(s.inventory, 'hay', 1);
          UI.toast('+1 Feno');
        }
        break;
      }
      case 'harvest': {
        const o = target.obj;
        const def = getCrop(o.cropId);
        addItem(s.inventory, def.item, 1);
        Audio.pickup();
        UI.toast(`+1 ${ITEMS[def.item].name}`);
        if (def.regrow) {
          // Regrowing crops: reset to (stages-2) so they ripen again in `regrow` days
          o.daysGrown = (def.stages - 1) * def.daysPerStage - def.regrow * def.daysPerStage;
          if (o.daysGrown < 0) o.daysGrown = 0;
          o.ready = false;
          o.watered = false;
        } else {
          o.removed = true;
          // Soil reverts to plain tilled
          if (tileAt(s.world, target.tx, target.ty) === T.WATERED) {
            setTile(s.world, target.tx, target.ty, T.TILLED);
          }
        }
        break;
      }
      case 'shop':
        UI.showShop(s, (id, qty) => addItem(s.inventory, id, qty));
        break;
      case 'sleep':
        UI.showSleepMenu(() => this.sleep(false));
        break;
      case 'enter':
        UI.toast('A casa está trancada... volte na próxima atualização!');
        break;
      case 'chest':
        UI.toast('Baú vazio (em breve!)');
        break;
      case 'talk':
        if (target.obj.name === 'Pierre') {
          UI.showDialog('Pierre', 'Bem-vindo à Loja Geral! Vendemos sementes para você plantar. Aperte espaço na porta da loja para abrir o catálogo.');
        }
        break;
      default:
        if (def && def.tool) {
          Audio.cantDo();
        }
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

    // Visible tile range
    const x0 = Math.max(0, Math.floor(cx / TILE));
    const y0 = Math.max(0, Math.floor(cy / TILE));
    const x1 = Math.min(s.world.width - 1, Math.ceil((cx + CANVAS_W) / TILE));
    const y1 = Math.min(s.world.height - 1, Math.ceil((cy + CANVAS_H) / TILE));

    // Pass 1: tiles
    const waterFrame = ((Math.floor(s.waterAnimT * 4) % 4) + 4) % 4;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        this.drawTile(tx, ty, cx, cy, waterFrame);
      }
    }

    // Pass 2: objects + player, sorted by Y for pseudo-depth
    const drawables = [];
    // player
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
      case T.TILLED: img = SPR.tilled; break;
      case T.WATERED: img = SPR.watered; break;
      case T.WATER: img = SPR.water[waterFrame]; break;
      case T.STONE_FLOOR: img = SPR.stoneFloor; break;
      case T.WOOD_FLOOR: img = SPR.wood; break;
      case T.HOUSE_ROOF: img = SPR.houseRoof; break;
      case T.SHOP_ROOF: img = SPR.shopRoof; break;
      case T.WALL: img = SPR.wall; break;
      case T.HOUSE_DOOR:
      case T.SHOP_DOOR: img = SPR.door; break;
      case T.FENCE: img = SPR.fence; break;
      case T.SHOP_SIGN: img = SPR.shopSign; break;
      case T.BED:
        // bed is 2 tiles wide: only draw on the leftmost cell
        ctx.drawImage(SPR.grass[0], dx, dy);
        ctx.drawImage(SPR.bed, dx, dy);
        return;
      case T.CHEST:
        ctx.drawImage(SPR.grass[0], dx, dy);
        ctx.drawImage(SPR.chest, dx, dy);
        return;
      default: img = SPR.grass[0];
    }
    if (!img) img = SPR.grass[0];
    if (img) ctx.drawImage(img, dx, dy);
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
    } else if (o.type === 'weed') {
      ctx.drawImage(SPR.weed, dx, dy);
    } else if (o.type === 'grassTuft') {
      ctx.drawImage(SPR.grassTuft, dx, dy);
    } else if (o.type === 'crop') {
      const def = getCrop(o.cropId);
      const stage = Math.min(def.stages - 1, Math.floor((o.daysGrown || 0) / def.daysPerStage));
      drawCrop(ctx, dx, dy, def, stage, o.watered);
    } else if (o.type === 'npc') {
      ctx.drawImage(SPR.shopkeeper, dx + 4, dy);
      // name tag
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
    // Soft shadow under the player for visibility/depth
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0,0,0,0.32)';
    this.ctx.beginPath();
    this.ctx.ellipse(dx + 12, dy + 31, 9, 3, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
    const frames = SPR.player[p.dir];
    const fi = p.moving ? p.animFrame : 0;
    this.ctx.drawImage(frames[fi], dx, dy);

    // Tool swing arc
    if (p.actionAnimT > 0) {
      const def = selectedDef(s.inventory);
      if (def && def.tool) {
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
  }

  drawLighting() {
    const s = this.state;
    const ctx = this.ctx;
    // 0 (full day) at 8:00, 1 (full night) at 22:00; partial in between
    const totalMin = s.hour * 60 + s.minute;
    const sunrise = 6 * 60, dayBright = 8 * 60, dusk = 19 * 60, fullDark = 22 * 60;
    let darkness;
    if (totalMin <= sunrise) darkness = 0.30;
    else if (totalMin <= dayBright) darkness = lerp(0.30, 0, (totalMin - sunrise) / (dayBright - sunrise));
    else if (totalMin <= dusk) darkness = 0;
    else if (totalMin <= fullDark) darkness = lerp(0, 0.55, (totalMin - dusk) / (fullDark - dusk));
    else darkness = 0.55 + Math.min(0.15, (totalMin - fullDark) / (60 * 4) * 0.15);

    if (darkness > 0.001) {
      // bluish night
      ctx.fillStyle = `rgba(20, 30, 80, ${darkness})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
  }
}

function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
function seasonName(s) { return ({ spring: 'Primavera', summer: 'Verão', fall: 'Outono', winter: 'Inverno' })[s]; }
