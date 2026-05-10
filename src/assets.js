// Asset loader.
//
// Tries to fetch hand-drawn PNGs declared in the manifest. If a file is
// missing (404) or fails to load, the slot is left empty — render code in
// `sprites.js` and `scenes/*.js` falls back to procedural canvas generators.
//
// This means the `assets/` folder can stay empty and the engine still works;
// dropping a single PNG immediately swaps in the hand-drawn version.

export const ASSETS = {};

// Each entry: id -> { url, repeat?: boolean }
// `repeat: true` is a hint for tileable horizontal backgrounds; the renderer
// uses `ctx.createPattern` instead of a single drawImage for those.
export const ASSET_MANIFEST = {
  // ---- Player (side-profile, drawn facing RIGHT; engine flips for left) ----
  'player.idle.0':  { url: 'assets/sprites/detective_idle_0.png' },
  'player.idle.1':  { url: 'assets/sprites/detective_idle_1.png' },
  'player.walk.0':  { url: 'assets/sprites/detective_walk_0.png' },
  'player.walk.1':  { url: 'assets/sprites/detective_walk_1.png' },
  'player.walk.2':  { url: 'assets/sprites/detective_walk_2.png' },
  'player.walk.3':  { url: 'assets/sprites/detective_walk_3.png' },

  // ---- Scene: street01 ----
  'scene.street01.sky':    { url: 'assets/scenes/street01/sky.png' },
  'scene.street01.far':    { url: 'assets/scenes/street01/far.png' },
  'scene.street01.mid':    { url: 'assets/scenes/street01/mid.png' },
  'scene.street01.street': { url: 'assets/scenes/street01/street.png' },
  'scene.street01.fg':     { url: 'assets/scenes/street01/fg.png' },
};

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${url}`));
    img.src = url;
  });
}

// Returns when every manifest entry has either resolved or been skipped.
// Never throws — missing assets are silently fall-through to procedural.
export async function loadAssets(manifest = ASSET_MANIFEST) {
  const entries = Object.entries(manifest);
  const results = await Promise.allSettled(
    entries.map(async ([id, spec]) => {
      const img = await loadImage(spec.url);
      ASSETS[id] = { img, repeat: !!spec.repeat };
      return id;
    })
  );
  const loaded = results.filter((r) => r.status === 'fulfilled').length;
  return { loaded, total: entries.length };
}

// Returns the loaded asset entry, or null if the slot has no PNG.
// Render code should test the return and fall through to procedural drawing.
export function getAsset(id) {
  return ASSETS[id] || null;
}

// Convenience: did the slot load successfully?
export function hasAsset(id) {
  return !!ASSETS[id];
}
