// Item registry. Engine-level scaffold — gameplay-specific items live here.
//
// With the side-view pivot, the open-world tree/rock loot is gone too. The
// registry is now empty by design; the noir RPG inventory (gadgets, evidence,
// notes, key items) will be plugged in by upcoming PRs.
//
// `icon` is an emoji shown in HUD; world rendering uses procedural sprites.

export const ITEMS = {
  // No items defined yet. PR #9 will add gadgets (lanterna UV, scanner,
  // gravador, taser); PR #8 will add evidence/case-file pieces.
};

export function getItem(id) {
  const it = ITEMS[id];
  if (!it) throw new Error(`Unknown item: ${id}`);
  return it;
}
