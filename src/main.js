// Boot.

import { buildSprites } from './sprites.js';
import { loadAssets } from './assets.js';
import { Audio } from './audio.js';
import { Game, createInitialState, loadStateFromSave } from './game.js';
import { hasSave } from './save.js';
import * as UI from './ui.js';

const canvas = document.getElementById('game');
canvas.focus();

buildSprites();

// Procedural sprites are ready immediately; in parallel we try to load any
// hand-drawn PNGs declared in the asset manifest. Missing PNGs are silently
// skipped — the engine falls through to procedural fallbacks.
loadAssets().then((res) => {
  if (res.loaded > 0) console.info(`Assets carregados: ${res.loaded}/${res.total}`);
});

const game = new Game(canvas);

// Title buttons
const startBtn = document.getElementById('start-btn');
const continueBtn = document.getElementById('continue-btn');
if (hasSave()) continueBtn.classList.remove('hidden');

function startNew() {
  Audio.init();
  UI.hideTitle();
  const state = createInitialState();
  game.start(state);
  // expose for debugging
  window._game = game;
}

function continueSave() {
  Audio.init();
  const st = loadStateFromSave();
  if (!st) { startNew(); return; }
  UI.hideTitle();
  game.start(st);
  window._game = game;
}

startBtn.addEventListener('click', startNew);
continueBtn.addEventListener('click', continueSave);

// Title-screen keyboard: Space starts a new game (or continues if save exists)
window.addEventListener('keydown', (e) => {
  if (UI.isTitleOpen() && (e.code === 'Space' || e.code === 'Enter')) {
    e.preventDefault();
    if (hasSave()) continueSave();
    else startNew();
  }
});
