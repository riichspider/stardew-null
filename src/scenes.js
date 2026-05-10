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
//   width:        number,           // total scene width in px
//   groundY:      number,           // y of the player's feet ground line
//   walkable:     [leftPx, rightPx],
//   layers:       [{ id, parallax, get(): HTMLCanvasElement|HTMLImageElement }],
//   hotspots:     [{ id, x, w, label, action }],
//   npcs:         [{ id, x, name, sprite }],
//   ambient:      { tint, alpha },  // optional global tint after layers
// }

import { street01 } from './scenes/street01.js';

const REGISTRY = {
  street01,
};

export function getScene(id) {
  const scene = REGISTRY[id];
  if (!scene) throw new Error(`Unknown scene: ${id}`);
  return scene;
}

export function listSceneIds() {
  return Object.keys(REGISTRY);
}
