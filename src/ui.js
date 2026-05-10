// HUD + overlay menus. The DOM elements live in index.html; we read/write them.
//
// Engine-level scaffold: dialog + inventory + title overlays remain. Shop and
// sleep-menu overlays were removed with the farming gut and will be replaced
// by noir-RPG narrative overlays (case file, gadget select, conversation tree).

import { ITEMS } from './items.js';
import { Audio } from './audio.js';
import { HOTBAR_SIZE } from './inventory.js';

const $ = (sel) => document.querySelector(sel);

let toastTimer = null;
export function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = '';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2000);
}

export function updateHUD(state) {
  const hh = String(state.hour).padStart(2, '0');
  const mm = String(Math.floor(state.minute / 10) * 10).padStart(2, '0');
  $('#clock').textContent = `Noite ${state.day} — ${hh}:${mm}`;
  $('#money').textContent = `💰 ${state.money}g`;

  const e = $('#energy');
  const pct = Math.max(0, state.energy / state.energyMax);
  e.style.width = `${pct * 100}%`;
  e.classList.toggle('low', pct < 0.25);
  $('#energy-num').textContent = `${Math.max(0, Math.round(state.energy))}/${state.energyMax}`;

  // Hotbar
  const hb = $('#hotbar');
  if (hb.children.length !== HOTBAR_SIZE) {
    hb.innerHTML = '';
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.dataset.idx = i;
      slot.addEventListener('click', () => {
        state.inventory.selected = i;
        Audio.step();
      });
      hb.appendChild(slot);
    }
  }
  for (let i = 0; i < HOTBAR_SIZE; i++) {
    const s = state.inventory.slots[i];
    const el = hb.children[i];
    el.classList.toggle('active', state.inventory.selected === i);
    el.innerHTML = '';
    const key = document.createElement('span');
    key.className = 'key';
    key.textContent = i + 1;
    el.appendChild(key);
    if (s) {
      const def = ITEMS[s.id];
      if (!def) continue;
      const ic = document.createElement('span');
      ic.className = 'icon';
      ic.textContent = def.icon;
      el.appendChild(ic);
      if (s.qty > 1) {
        const cnt = document.createElement('span');
        cnt.className = 'count';
        cnt.textContent = s.qty;
        el.appendChild(cnt);
      }
    }
  }
}

// ---------- Dialog ----------

export function showDialog(name, text, onClose) {
  const el = $('#dialog');
  $('#dialog-name').textContent = name;
  $('#dialog-text').textContent = text;
  el.classList.remove('hidden');
  el._onClose = onClose;
}
export function hideDialog() {
  const el = $('#dialog');
  if (el.classList.contains('hidden')) return;
  el.classList.add('hidden');
  const cb = el._onClose;
  el._onClose = null;
  if (cb) cb();
}
export function isDialogOpen() { return !$('#dialog').classList.contains('hidden'); }

// ---------- Inventory ----------

export function showInventory(state) {
  const el = $('#inventory');
  el.classList.remove('hidden');
  const grid = $('#inv-grid');
  grid.innerHTML = '';
  const inv = state.inventory;
  inv.slots.forEach((s, i) => {
    const cell = document.createElement('div');
    cell.className = 'inv-item';
    cell.classList.toggle('equipped', i === inv.selected);
    if (!s) {
      cell.style.opacity = 0.35;
      cell.innerHTML = `<span class="icon">·</span><span class="meta"><span class="name">— vazio —</span><span class="qty">slot ${i + 1}</span></span>`;
    } else {
      const def = ITEMS[s.id];
      if (!def) { grid.appendChild(cell); return; }
      cell.innerHTML = `
        <span class="icon">${def.icon}</span>
        <span class="meta"><span class="name">${def.name}</span><span class="qty">×${s.qty}</span></span>
      `;
      cell.addEventListener('click', () => {
        if (i < HOTBAR_SIZE) {
          inv.selected = i;
        } else {
          const tmp = inv.slots[inv.selected];
          inv.slots[inv.selected] = s;
          inv.slots[i] = tmp;
        }
        showInventory(state);
      });
    }
    grid.appendChild(cell);
  });
}
export function hideInventory() { $('#inventory').classList.add('hidden'); }
export function isInventoryOpen() { return !$('#inventory').classList.contains('hidden'); }

// ---------- Title ----------

export function hideTitle() { $('#title').classList.add('hidden'); }
export function showTitle() { $('#title').classList.remove('hidden'); }
export function isTitleOpen() { return !$('#title').classList.contains('hidden'); }

export function isAnyOverlayOpen() {
  return isInventoryOpen() || isDialogOpen() || isTitleOpen();
}
