// Item registry. Engine-level scaffold — all gameplay-specific items live here.
//
// Post-farming gut: only generic resources from open-world tile-clearing remain,
// so the world's trees and rocks still have somewhere to drop loot. Tools,
// seeds, crops, and shop items were intentionally removed and will be replaced
// with the noir RPG inventory (gadgets, evidence, key items).
//
// `icon` is an emoji shown in HUD; world rendering uses procedural sprites.

export const ITEMS = {
  // Materials (placeholder — used by chop/rock actions until the noir loot table replaces them)
  wood:  { id: 'wood',  name: 'Madeira', icon: '🪵', stack: 99, sell: 0 },
  stone: { id: 'stone', name: 'Pedra',   icon: '🪨', stack: 99, sell: 0 },
};

export function getItem(id) {
  const it = ITEMS[id];
  if (!it) throw new Error(`Unknown item: ${id}`);
  return it;
}
