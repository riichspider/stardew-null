// HUD + overlay menus. The DOM elements live in index.html; we read/write them.
//
// Engine-level scaffold: dialog + inventory + title overlays remain. Shop and
// sleep-menu overlays were removed with the farming gut and will be replaced
// by noir-RPG narrative overlays (case file, gadget select, conversation tree).

import { ITEMS } from './items.js';
import { Audio } from './audio.js';
import { HOTBAR_SIZE } from './inventory.js';
import { EVIDENCE, getAvailableCombinations, tryCombineEvidence, isDialogUnlocked } from './evidence.js';
import { saveGame, setFlag } from './save.js';
import { getDialog, advanceNode, getAvailableChoices, DIALOGS } from './dialogs.js';

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

// ---------- Dialog Tree ----------

let _currentDialog = null;
let _dialogState = null;

export function showDialogTree(tree, state) {
  _currentDialog = tree;
  _dialogState = state;
  renderDialogNode(tree);
}

function renderDialogNode(node) {
  const el = $('#dialog');
  const nameEl = $('#dialog-name');
  const textEl = $('#dialog-text');
  const hintEl = $('#dialog-hint');
  
  nameEl.textContent = ''; // NPC name hidden for now
  textEl.textContent = node.text;
  
  // Clear old choices
  const oldChoices = el.querySelectorAll('.dialog-choice');
  oldChoices.forEach(c => c.remove());
  
  // Show only choices whose evidence requirements are met
  const choices = getAvailableChoices(node, _dialogState);
  if (choices.length > 0) {
    hintEl.textContent = '';
    choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.className = 'dialog-choice';
      btn.textContent = choice.text;
      btn.addEventListener('click', () => handleChoice(choice));
      textEl.parentNode.appendChild(btn);
    });
  } else {
    hintEl.textContent = '[Espaço] continuar';
  }
  
  el.classList.remove('hidden');
}

function handleChoice(choice) {
  if (!_currentDialog) return;
  if (choice.requiresEvidence && !isDialogUnlocked(choice.requiresEvidence)) return;

  if (choice.setFlag) {
    setFlag(choice.setFlag, true);
  }
  
  // Navigate to next
  if (choice.next) {
    const nextNode = DIALOGS[choice.next];
    if (nextNode) {
      _currentDialog = nextNode;
      renderDialogNode(nextNode);
    } else {
      hideDialog();
    }
  } else {
    hideDialog();
  }
}

export function advanceOrCloseDialog() {
  if (!_currentDialog) return;
  const nextNode = advanceNode(_currentDialog);
  if (nextNode) {
    _currentDialog = nextNode;
    renderDialogNode(nextNode);
  } else {
    hideDialog();
  }
}

export function hideDialog() {
  const el = $('#dialog');
  if (el.classList.contains('hidden')) return;
  el.classList.add('hidden');
  const choices = el.querySelectorAll('.dialog-choice');
  choices.forEach(c => c.remove());
  const cb = el._onClose;
  el._onClose = null;
  if (cb) cb();
  _currentDialog = null;
  _dialogState = null;
}
export function isDialogOpen() { return !$('#dialog').classList.contains('hidden'); }

// ---------- Inventory ----------

let _combineMode = null; // { slotA, state }

export function showInventory(state, combineMode = null) {
  _combineMode = combineMode;
  const el = $('#inventory');
  el.classList.remove('hidden');
  const grid = $('#inv-grid');
  grid.innerHTML = '';
  const inv = state.inventory;
  
  // Header with mode indicator
  const header = $('#inv-header-text');
  if (header) {
    header.textContent = combineMode ? 'Combinando — clique no segundo item' : 'Inventário';
  }
  
  inv.slots.forEach((s, i) => {
    const cell = document.createElement('div');
    cell.className = 'inv-item';
    cell.classList.toggle('equipped', i === inv.selected);
    cell.dataset.slot = i;
    
    // In combine mode: highlight source slot
    if (combineMode && combineMode.slotA === i) {
      cell.classList.add('combine-source');
    }
    
    if (!s) {
      cell.style.opacity = 0.35;
      cell.innerHTML = `<span class="icon">·</span><span class="meta"><span class="name">— vazio —</span><span class="qty">slot ${i + 1}</span></span>`;
    } else {
      const def = ITEMS[s.id];
      if (!def) return;
      
      const isEvidence = def.evidence === true;
      
      let html = `
        <span class="icon">${def.icon}</span>
        <span class="meta"><span class="name">${def.name}</span><span class="qty">×${s.qty}</span></span>
      `;
      
      // Evidence description tooltip
      if (isEvidence && def.description) {
        html += `<div class="evidence-desc">${def.description}</div>`;
      }
      
      cell.innerHTML = html;
      
      // Click handler
      cell.addEventListener('click', () => {
        if (_combineMode && _combineMode.slotA !== i) {
          const result = tryCombineEvidence(state, _combineMode.slotA, i);
          _combineMode = null;
          if (result && result.success) {
            saveGame(state);
          }
          showInventory(state);
        } else if (_combineMode && _combineMode.slotA === i) {
          _combineMode = null;
          showInventory(state);
        } else if (isEvidence && def.combinableWith && def.combinableWith.length > 0) {
          showInventory(state, { slotA: i });
        } else if (i < HOTBAR_SIZE) {
          inv.selected = i;
          showInventory(state, _combineMode);
        } else {
          const tmp = inv.slots[inv.selected];
          inv.slots[inv.selected] = s;
          inv.slots[i] = tmp;
          showInventory(state, _combineMode);
        }
      });
      
      // Right-click: show evidence detail (zoom)
      if (isEvidence) {
        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          showEvidenceDetail(def);
        });
      }
    }
    grid.appendChild(cell);
  });
  
  // Available combinations for current slot (if in combine mode)
  if (combineMode) {
    const combos = getAvailableCombinations(state, combineMode.slotA);
    if (combos.length > 0) {
      const info = $('#inv-info');
      if (info) {
        info.textContent = `Combine "${combos[0].withDef.name}" com este item?`;
      }
    }
  }
}

// Show evidence detail in modal
let _evidenceDetail = null;
function showEvidenceDetail(def) {
  let modal = $('#evidence-detail');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'evidence-detail';
    modal.className = 'overlay';
    modal.innerHTML = `
      <div class="evidence-detail-box">
        <div class="detail-icon"></div>
        <div class="detail-name"></div>
        <div class="detail-desc"></div>
        <div class="detail-hint">[click/ESC] fechar</div>
      </div>
    `;
    modal.addEventListener('click', hideEvidenceDetail);
    document.body.appendChild(modal);
  }
  
  modal.querySelector('.detail-icon').textContent = def.icon;
  modal.querySelector('.detail-name').textContent = def.name;
  modal.querySelector('.detail-desc').textContent = def.description || 'Sem descrição.';
  modal.classList.remove('hidden');
  _evidenceDetail = modal;
}

function hideEvidenceDetail() {
  const modal = $('#evidence-detail');
  if (modal) modal.classList.add('hidden');
  _evidenceDetail = null;
}

export function hideInventory() { 
  $('#inventory').classList.add('hidden'); 
  hideEvidenceDetail();
  _combineMode = null;
}
export function isInventoryOpen() { return !$('#inventory').classList.contains('hidden'); }

// Combine mode API for game.js
export function getCombineMode() { return _combineMode; }

export function attemptCombine(state) {
  if (!_combineMode || _combineMode.slotA === undefined) return;
  const selected = state.inventory.selected;
  if (selected === _combineMode.slotA) {
    // Cancel combine mode
    _combineMode = null;
    showInventory(state);
    return;
  }
  const result = tryCombineEvidence(state, _combineMode.slotA, selected);
  if (result && result.success) {
    // Success: refresh and exit combine mode
    _combineMode = null;
    saveGame(state); // Auto-save
    showInventory(state);
  }
}

// ---------- Title ----------

export function hideTitle() { $('#title').classList.add('hidden'); }
export function showTitle() { $('#title').classList.remove('hidden'); }
export function isTitleOpen() { return !$('#title').classList.contains('hidden'); }

export function isAnyOverlayOpen() {
  return isInventoryOpen() || isDialogOpen() || isTitleOpen();
}

// ---------- HUD visibility ----------
//
// The cutscene system takes over the canvas and renders its own cinematic
// frames; the gameplay HUD (clock, money, energy, hotbar) is irrelevant
// during a cutscene and would visually leak through. These two helpers
// toggle a class on `#hud` that hides it via CSS.

export function hideHUD() { $('#hud').classList.add('cutscene-hidden'); }
export function showHUD() { $('#hud').classList.remove('cutscene-hidden'); }
