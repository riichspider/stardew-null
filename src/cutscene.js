// Cutscene runtime.
//
// Owns its own animation loop while active, drives the timeline forward,
// dispatches audio cues, handles skip / pause input, and renders frames
// through the cutscene-director.
//
// Lifecycle:
//
//   const cs = new Cutscene(canvas, timeline, { skippable: true });
//   cs.on('complete', ({ skipped }) => { ... });
//   cs.start();
//
// While running it consumes its own RAF; on complete (natural or skipped)
// it stops the loop and fires the listener so the caller can hand off to
// gameplay. The HUD/title overlays are *not* shown during the cutscene —
// callers should hide them before `start()` and the game's own boot will
// re-show what's needed.

import { CANVAS_W, CANVAS_H } from './config.js';
import { Audio } from './audio.js';
import {
  drawShot,
  drawLetterbox,
  drawSubtitle,
  drawSkipPrompt,
  drawFade,
} from './cutscene-director.js';

const FADE_IN_S  = 0.6;   // fade from black at start
const FADE_OUT_S = 1.0;   // fade to black before completion
const LETTERBOX_OPEN_S = 0.6;  // bars slide in over this period

export class Cutscene {
  constructor(canvas, timeline, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.timeline = timeline.map((shot) => ({ ...shot }));
    this.skippable = opts.skippable !== false;

    // Pre-build all shot backgrounds up-front so we don't hitch mid-cutscene
    this._shots = this.timeline.map((shot) => ({
      ...shot,
      _bg: shot.buildBg ? shot.buildBg() : null,
    }));

    // Each shot's cues are tracked so we don't fire them twice
    this._firedCues = new Set();
    // Each shot's onEnter is tracked similarly
    this._enteredShots = new Set();

    this.shotIndex = 0;
    this.shotT = 0;
    this.totalT = 0;
    this.done = false;
    this.skipped = false;

    this._listeners = { complete: [] };
    this._raf = null;
    this._lastT = 0;
    this._running = false;

    // Bound key handler for skip
    this._onKey = (e) => {
      if (this.done) return;
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
        e.preventDefault();
        this.skip();
      }
    };
  }

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._lastT = performance.now();
    window.addEventListener('keydown', this._onKey);
    const loop = (t) => {
      if (!this._running) return;
      const dt = Math.min(0.05, Math.max(0, (t - this._lastT) / 1000));
      this._lastT = t;
      this.update(dt);
      this.render(dt);
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    if (!this._running) return;
    this._running = false;
    cancelAnimationFrame(this._raf);
    window.removeEventListener('keydown', this._onKey);
    // Stop any persistent audio loops the cutscene started
    Audio.cutsceneStopAll && Audio.cutsceneStopAll();
  }

  skip() {
    if (this.done || !this.skippable) return;
    this.skipped = true;
    this._finish();
  }

  _finish() {
    if (this.done) return;
    this.done = true;
    // Quick fade to black on skip; natural completion already faded.
    if (this.skipped) {
      // A short fade-out frame loop before stopping. Simplest approach:
      // schedule the stop a couple frames later.
      const ctx = this.ctx;
      let t = 0;
      const lastT = performance.now();
      const fadeLoop = (now) => {
        const dt = Math.min(0.05, Math.max(0, (now - lastT - t * 1000) / 1000));
        t += dt;
        const a = Math.min(1, t / 0.35);
        // Don't redraw shot — just darken what's there
        drawFade(ctx, a);
        if (a < 1) requestAnimationFrame(fadeLoop);
        else {
          this.stop();
          this._emit('complete', { skipped: true });
        }
      };
      requestAnimationFrame(fadeLoop);
      return;
    }
    this.stop();
    this._emit('complete', { skipped: false });
  }

  _emit(event, payload) {
    const ls = this._listeners[event] || [];
    for (const fn of ls) {
      try { fn(payload); } catch (e) { console.error(e); }
    }
  }

  // ---------- Update ----------

  update(dt) {
    if (this.done) return;
    this.totalT += dt;
    this.shotT += dt;

    const shot = this._shots[this.shotIndex];
    if (!shot) { this._finish(); return; }

    // Fire onEnter audio cues for this shot once
    if (!this._enteredShots.has(this.shotIndex) && shot.audio && shot.audio.onEnter) {
      this._enteredShots.add(this.shotIndex);
      for (const cue of shot.audio.onEnter) this._fire(cue);
    }

    // Fire scheduled cues whose timestamp has passed
    if (shot.audio && shot.audio.cues) {
      for (let i = 0; i < shot.audio.cues.length; i++) {
        const c = shot.audio.cues[i];
        const key = `${this.shotIndex}:${i}`;
        if (!this._firedCues.has(key) && this.shotT >= c.t) {
          this._firedCues.add(key);
          this._fire(c.cue);
        }
      }
    }

    // Advance to next shot when current one finishes
    if (this.shotT >= shot.dur) {
      this.shotIndex++;
      this.shotT = 0;
      if (this.shotIndex >= this._shots.length) {
        this.done = true;
        const lastShotIndex = this._shots.length - 1;
        const lastShotDur = this._shots[lastShotIndex].dur;
        const ctx = this.ctx;
        let t = 0;
        let last = performance.now();
        const fadeLoop = (now) => {
          const ddt = Math.min(0.05, Math.max(0, (now - last) / 1000));
          last = now;
          t += ddt;
          const a = Math.min(1, t / FADE_OUT_S);
          this.shotIndex = lastShotIndex;
          this.shotT = lastShotDur;
          this._drawCurrentFrame(0);
          drawFade(ctx, a);
          if (a < 1) requestAnimationFrame(fadeLoop);
          else {
            this.stop();
            this._emit('complete', { skipped: false });
          }
        };
        requestAnimationFrame(fadeLoop);
      }
    }
  }

  _fire(cue) {
    if (!Audio || typeof Audio.cutsceneCue !== 'function') return;
    try { Audio.cutsceneCue(cue); } catch (e) { console.warn('audio cue failed', cue, e); }
  }

  // ---------- Render ----------

  render(dt) {
    if (this.done) return;
    this._drawCurrentFrame(dt);
  }

  _drawCurrentFrame(dt) {
    const ctx = this.ctx;
    // Black backdrop (any letterbox bar shows through)
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const shot = this._shots[this.shotIndex];
    if (!shot || !shot._bg) return;

    // Pull the build product out: the shot package (layers, fg, lights, etc.)
    drawShot(ctx, { ...shot._bg, dur: shot.dur, camera: shot.camera, shake: shot.shake, id: shot.id }, this.shotT, dt);

    // Active subtitle (one at a time)
    let activeSub = null;
    if (shot.subtitles) {
      for (const sub of shot.subtitles) {
        if (this.shotT >= sub.t && this.shotT < sub.t + sub.dur) {
          activeSub = { ...sub, localT: this.shotT - sub.t };
          break;
        }
      }
    }
    if (activeSub) drawSubtitle(ctx, activeSub);

    // Letterbox bars: animate in over the first 0.6s, animate out over the
    // last 0.6s of the final shot
    let openness;
    if (this.totalT < LETTERBOX_OPEN_S) {
      openness = 1 - (this.totalT / LETTERBOX_OPEN_S);
    } else {
      openness = 0;
    }
    drawLetterbox(ctx, openness);

    // Fade-in overlay (start of cutscene)
    if (this.totalT < FADE_IN_S) {
      drawFade(ctx, 1 - (this.totalT / FADE_IN_S));
    }

    // Skip prompt
    if (this.skippable) drawSkipPrompt(ctx, this.totalT);
  }
}
