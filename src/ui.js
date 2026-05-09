// HUD + overlay menus. The DOM elements live in index.html; we read/write them.

import { ITEMS, SHOP_BUY_LIST } from './items.js';
import { Audio } from './audio.js';

const $ = (sel) => document.querySelector(sel);

let toastTimer = null;
export function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  // restart animation
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = '';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2000);
}

export function updateHUD(state) {
  const seasonNames = { spring: 'Primavera', summer: 'Verão', fall: 'Outono', winter: 'Inverno' };
  const hh = String(state.hour).padStart(2, '0');
  const mm = String(Math.floor(state.minute / 10) * 10).padStart(2, '0');
  $('#clock').textContent = `${seasonNames[state.season]} ${state.day} — ${hh}:${mm}`;
  $('#weather').textContent = state.weather === 'rain' ? '🌧️ Chuva' : state.weather === 'storm' ? '⛈️ Tempestade' : '☀️ Sol';
  $('#money').textContent = `💰 ${state.money}g`;

  const e = $('#energy');
  const pct = Math.max(0, state.energy / state.energyMax);
  e.style.width = `${pct * 100}%`;
  e.classList.toggle('low', pct < 0.25);
  $('#energy-num').textContent = `${Math.max(0, Math.round(state.energy))}/${state.energyMax}`;

  // Hotbar
  const hb = $('#hotbar');
  if (hb.children.length !== state.inventory.slots.length || hb.dataset.size !== '9') {
    hb.innerHTML = '';
    hb.dataset.size = '9';
    for (let i = 0; i < 9; i++) {
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
  for (let i = 0; i < 9; i++) {
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
      // For watering can, show water level
      if (def.tool === 'watering' && typeof s.water === 'number') {
        const cnt = document.createElement('span');
        cnt.className = 'count';
        cnt.textContent = s.water;
        cnt.style.color = '#83c1ff';
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

// ---------- Shop ----------

let shopState = { tab: 'buy', state: null };

function renderShop() {
  const grid = $('#shop-items');
  grid.innerHTML = '';
  $('#shop-money').textContent = `${shopState.state.money}g`;

  if (shopState.tab === 'buy') {
    for (const id of SHOP_BUY_LIST) {
      const def = ITEMS[id];
      const seasonOK = !def.season || def.season.includes(shopState.state.season);
      const item = document.createElement('div');
      item.className = 'shop-item';
      item.style.opacity = seasonOK ? 1 : 0.45;
      item.title = seasonOK ? '' : 'Fora de estação';
      item.innerHTML = `
        <span class="icon">${def.icon}</span>
        <span class="meta"><span class="name">${def.name}</span><span class="price">${def.buy}g</span></span>
      `;
      item.addEventListener('click', () => {
        if (!seasonOK) { Audio.cantDo(); toast('Fora de estação'); return; }
        if (shopState.state.money < def.buy) { Audio.cantDo(); toast('Sem dinheiro'); return; }
        shopState.state.money -= def.buy;
        const overflow = shopState.onAdd(id, 1);
        if (overflow) {
          shopState.state.money += def.buy; // refund
          Audio.cantDo();
          toast('Inventário cheio');
          return;
        }
        Audio.buy();
        renderShop();
      });
      grid.appendChild(item);
    }
  } else {
    // Sellable items: anything in inventory with sell value, excluding tools.
    const inv = shopState.state.inventory;
    for (let i = 0; i < inv.slots.length; i++) {
      const s = inv.slots[i];
      if (!s) continue;
      const def = ITEMS[s.id];
      if (!def.sell) continue;
      if (def.tool) continue;
      const item = document.createElement('div');
      item.className = 'shop-item';
      item.innerHTML = `
        <span class="icon">${def.icon}</span>
        <span class="meta"><span class="name">${def.name} ×${s.qty}</span><span class="price">+${def.sell}g</span></span>
      `;
      item.addEventListener('click', () => {
        shopState.state.money += def.sell;
        s.qty -= 1;
        if (s.qty <= 0) inv.slots[i] = null;
        Audio.sell();
        renderShop();
      });
      grid.appendChild(item);
    }
    if (!grid.children.length) {
      const empty = document.createElement('div');
      empty.style.gridColumn = '1 / -1';
      empty.style.padding = '12px';
      empty.style.textAlign = 'center';
      empty.style.color = '#4d2b1a';
      empty.textContent = 'Nada para vender ainda. Plante e colha!';
      grid.appendChild(empty);
    }
  }
}

export function showShop(state, onAdd) {
  shopState = { tab: 'buy', state, onAdd };
  $('#shop').classList.remove('hidden');
  $('#shop-tabs button[data-tab=buy]')?.classList.add('active');
  $('#shop-tabs button[data-tab=sell]')?.classList.remove('active');
  // Bind tabs once
  $('#shop').querySelectorAll('.shop-tabs button').forEach((b) => {
    b.onclick = () => {
      $('#shop').querySelectorAll('.shop-tabs button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      shopState.tab = b.dataset.tab;
      renderShop();
    };
  });
  renderShop();
}
export function hideShop() { $('#shop').classList.add('hidden'); }
export function isShopOpen() { return !$('#shop').classList.contains('hidden'); }

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
      cell.innerHTML = `
        <span class="icon">${def.icon}</span>
        <span class="meta"><span class="name">${def.name}</span><span class="qty">${
          def.tool === 'watering' ? `água ${s.water || 0}/${def.waterMax}` : `×${s.qty}`
        }</span></span>
      `;
      cell.addEventListener('click', () => {
        // If clicking a hotbar slot, equip; else move into hotbar selected.
        if (i < 9) {
          inv.selected = i;
        } else {
          // swap with currently selected hotbar slot
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

// ---------- Sleep ----------

export function showSleepMenu(onYes) {
  const el = $('#sleep-menu');
  el.classList.remove('hidden');
  const yes = $('#sleep-yes');
  const no = $('#sleep-no');
  yes.onclick = () => { hideSleepMenu(); onYes(); };
  no.onclick = () => hideSleepMenu();
}
export function hideSleepMenu() { $('#sleep-menu').classList.add('hidden'); }
export function isSleepOpen() { return !$('#sleep-menu').classList.contains('hidden'); }

// ---------- Title ----------

export function hideTitle() { $('#title').classList.add('hidden'); }
export function showTitle() { $('#title').classList.remove('hidden'); }
export function isTitleOpen() { return !$('#title').classList.contains('hidden'); }

export function isAnyOverlayOpen() {
  return isShopOpen() || isInventoryOpen() || isDialogOpen() || isSleepOpen() || isTitleOpen();
}
