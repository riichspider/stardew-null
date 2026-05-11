// Player (side-view): horizontal movement only, 2 facing directions.
//
// "Up" / "down" inputs do NOT move the player — instead, "up" near a hotspot
// is the dedicated interact action (open door, talk to NPC, examine evidence).

import { Input } from './input.js';
import { PLAYER_W, PLAYER_H, PLAYER_SPEED } from './config.js';

export function createPlayer(scene) {
  return {
    // Pixel position in scene-space. Feet rest on `scene.groundY`.
    x: Math.floor((scene.walkable[0] + scene.walkable[1]) / 2 - PLAYER_W / 2),
    y: scene.groundY - PLAYER_H,
    dir: 'right', // 'left' | 'right'
    moving: false,
    animTime: 0,
    animFrame: 0,
    actionAnimT: 0,
  };
}

export function updatePlayer(player, scene, dt) {
  let dx = 0;
  if (Input.isDown('left')) dx -= 1;
  if (Input.isDown('right')) dx += 1;

  if (dx !== 0) {
    player.dir = dx < 0 ? 'left' : 'right';
    const step = PLAYER_SPEED * dt * dx;
    let nx = player.x + step;
    // Clamp to scene walkable bounds.
    nx = Math.max(scene.walkable[0], Math.min(scene.walkable[1] - PLAYER_W, nx));
    player.x = nx;
    player.moving = true;
    player.animTime += dt;
    if (player.animTime > 0.12) {
      player.animTime = 0;
      player.animFrame = (player.animFrame + 1) % 4;
    }
  } else {
    player.moving = false;
    player.animFrame = 0;
    player.animTime = 0;
  }

  // Pin Y to ground every frame (insurance for any future scene swaps).
  player.y = scene.groundY - PLAYER_H;

  if (player.actionAnimT > 0) player.actionAnimT -= dt;
}

// Returns the hotspot or NPC the player's center is currently overlapping, or null.
export function hotspotInFront(player, scene) {
  const cx = player.x + PLAYER_W / 2;
  const INTERACT_DIST = 50;
  
  // Check NPCs first (they have a larger interaction zone)
  if (scene.npcs) {
    for (const npc of scene.npcs) {
      if (cx >= npc.x - INTERACT_DIST && cx <= npc.x + INTERACT_DIST) {
        return npc;
      }
    }
  }
  
  // Check hotspots
  for (const h of scene.hotspots) {
    if (cx >= h.x && cx <= h.x + h.w) return h;
  }
  return null;
}
