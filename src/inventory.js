// Inventory: hotbar (9 slots) + bag (rest). Items stack up to ITEMS[id].stack.
// Tools start in hotbar, take dedicated slots.

import { ITEMS } from './items.js';

export const HOTBAR_SIZE = 9;
export const BAG_SIZE = 18;

export function createInventory() {
  const slots = new Array(HOTBAR_SIZE + BAG_SIZE).fill(null);
  return { slots, selected: 0 };
}

export function addItem(inv, id, qty = 1) {
  const def = ITEMS[id];
  if (!def) return qty; // unknown
  let remaining = qty;
  // Stack into existing
  for (let i = 0; i < inv.slots.length && remaining > 0; i++) {
    const s = inv.slots[i];
    if (s && s.id === id && s.qty < def.stack) {
      const can = Math.min(def.stack - s.qty, remaining);
      s.qty += can;
      remaining -= can;
    }
  }
  // New stacks
  for (let i = 0; i < inv.slots.length && remaining > 0; i++) {
    if (!inv.slots[i]) {
      const can = Math.min(def.stack, remaining);
      inv.slots[i] = { id, qty: can };
      // tools get extra fields
      if (def.tool === 'watering') inv.slots[i].water = 0;
      remaining -= can;
    }
  }
  return remaining; // overflow
}

export function removeFromSlot(inv, slot, qty = 1) {
  const s = inv.slots[slot];
  if (!s) return false;
  if (s.qty < qty) return false;
  s.qty -= qty;
  if (s.qty <= 0) inv.slots[slot] = null;
  return true;
}

export function totalQty(inv, id) {
  let n = 0;
  for (const s of inv.slots) if (s && s.id === id) n += s.qty;
  return n;
}

export function selectedItem(inv) {
  return inv.slots[inv.selected] || null;
}

export function selectedDef(inv) {
  const s = selectedItem(inv);
  return s ? ITEMS[s.id] : null;
}

export function findSlot(inv, id) {
  for (let i = 0; i < inv.slots.length; i++) {
    if (inv.slots[i] && inv.slots[i].id === id) return i;
  }
  return -1;
}

export function moveSlot(inv, fromIdx, toIdx) {
  if (fromIdx === toIdx) return;
  const a = inv.slots[fromIdx];
  const b = inv.slots[toIdx];
  inv.slots[fromIdx] = b;
  inv.slots[toIdx] = a;
}
