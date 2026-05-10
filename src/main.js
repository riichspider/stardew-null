// Boot.

import { buildSprites } from './sprites.js';
import { loadAssets } from './assets.js';
import { Audio } from './audio.js';
import { Game, createInitialState, loadStateFromSave } from './game.js';
import { hasSave, getFlag, setFlag } from './save.js';
import * as UI from './ui.js';
import { Cutscene } from './cutscene.js';
import { buildOpeningTimeline } from './cutscene-timeline.js';
// Load evidence definitions (registers items into ITEMS)
import './evidence.js';
// Load dialog system
import './dialogs.js';

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
const replayBtn = document.getElementById('replay-cutscene-btn');
if (hasSave()) continueBtn.classList.remove('hidden');
// "Rever abertura" only makes sense after the cutscene was already seen
if (getFlag('cutsceneSeen', false)) replayBtn.classList.remove('hidden');

function startGameplay(state) {
  game.start(state);
  window._game = game;
}

function playCutsceneThen(onComplete) {
  // Hide title + gameplay HUD; the cutscene takes over the whole canvas
  UI.hideTitle();
  UI.hideHUD();
  // Defensively stop any leftover audio (e.g. on hot reload)
  Audio.cutsceneStopAll && Audio.cutsceneStopAll();
  const cs = new Cutscene(canvas, buildOpeningTimeline(), { skippable: true });
  cs.on('complete', () => {
    setFlag('cutsceneSeen', true);
    // Show the replay button next time the title is opened
    replayBtn.classList.remove('hidden');
    UI.showHUD();
    onComplete();
  });
  cs.start();
  // Expose for debugging
  window._cutscene = cs;
}

function startNew() {
  Audio.init();
  // "Começar [Espaço]" always plays the opening cutscene. It's skippable at
  // any time via Space/Enter/Esc, so even returning players get the option.
  // The `cutsceneSeen` flag is still set the first time, so the
  // "Rever abertura" button on the title stays available.
  playCutsceneThen(() => startGameplay(createInitialState()));
}

function continueSave() {
  Audio.init();
  const st = loadStateFromSave();
  if (!st) { startNew(); return; }
  // Returning player skips the cutscene by default — they've already booted
  // the world before. Replay button stays available on the title.
  UI.hideTitle();
  startGameplay(st);
}

function replayCutscene() {
  Audio.init();
  // Replay always plays from the title screen back to the title screen.
  // We don't auto-start gameplay afterwards.
  playCutsceneThen(() => {
    UI.showTitle();
  });
}

startBtn.addEventListener('click', startNew);
continueBtn.addEventListener('click', continueSave);
replayBtn.addEventListener('click', replayCutscene);

// Title-screen keyboard: Space / Enter mirror the visible "Começar [Espaço]"
// button — they always trigger a new game (which plays the opening cutscene).
// Continuing a save is a deliberate mouse-click on "Continuar save", so we
// don't shortcut it here.
window.addEventListener('keydown', (e) => {
  if (UI.isTitleOpen() && (e.code === 'Space' || e.code === 'Enter')) {
    e.preventDefault();
    startNew();
  }
});
