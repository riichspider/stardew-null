// Scene registry.
//
// A "scene" replaces the old top-down tile world. Each scene is a horizontal
// corridor the player walks through left-to-right (Backbone-style noir
// adventure). Scenes are composed of parallax background layers (rendered by
// `game.js`) plus walkable bounds, hotspots, NPCs, and ambient lighting.
//
// Scene shape:
// {
//   id:           string,
//   seed:         number,           // optional, used by lighting RNG
//   width:        number,           // total scene width in px
//   groundY:      number,           // y of the player's feet ground line
//   walkable:     [leftPx, rightPx],
//   layers:       [{ id, parallax, get(): HTMLCanvasElement|HTMLImageElement }],
//   spawns:       { spawnId: x, ... },   // optional, target X for changeScene
//   hotspots:     [{ id, x, w, label, action }],
//   npcs:         [{ id, x, name, sprite }],
//   lights:       [{ id, x, y, parallax, color, radius, intensity, flicker }],
//   ambient:      { tint, fog, rain },   // optional fog/rain overlays
// }
//
// Hotspot.action can be:
//   string starting with "enter:" / "examine:" / "talk:" — currently
//     surfaced as a toast (placeholder for evidence/dialog wiring later)
//   { goto: sceneId, spawn?: spawnId } — triggers Game.changeScene() with a
//     fade transition. spawn defaults to "default" if omitted.

import { street01 } from './scenes/street01.js';
import { apartment01 } from './scenes/apartment01.js';

const REGISTRY = {
  street01,
  apartment01,
};

export function getScene(id) {
  if (!Object.hasOwn(REGISTRY, id)) throw new Error(`Unknown scene: ${id}`);
  return REGISTRY[id];
}

export function listSceneIds() {
  return Object.keys(REGISTRY);
}
