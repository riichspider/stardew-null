// Tiny WebAudio SFX. No external assets — everything is synthesized.
let ctx = null;
let muted = false;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq = 440, dur = 0.1, type = 'sine', vol = 0.15, slide = 0 }) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  const t0 = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.12, vol = 0.12, freq = 800, q = 5 }) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  const t0 = c.currentTime;
  const sr = c.sampleRate;
  const len = Math.floor(sr * dur);
  const buf = c.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = freq;
  filt.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt).connect(g).connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

export const Audio = {
  init() { ensureCtx(); },
  setMuted(v) { muted = !!v; },
  isMuted() { return muted; },

  // Generic SFX kept after the farming gut. Farm-specific cues (till, water,
  // plant, buy, sell) were removed; the noir-RPG SFX (footsteps on wet
  // pavement, gadget beeps, neon hum, ricochets, etc) will be added later.
  step()       { tone({ freq: 220 + Math.random() * 80, dur: 0.04, type: 'square', vol: 0.04 }); },
  chop()       { noise({ freq: 600, dur: 0.12, vol: 0.18 }); tone({ freq: 140, dur: 0.1, type: 'sawtooth', vol: 0.08 }); },
  rock()       { noise({ freq: 220, dur: 0.18, vol: 0.2 }); },
  pickup()     { tone({ freq: 880, dur: 0.06, type: 'square', vol: 0.1 }); tone({ freq: 1320, dur: 0.06, type: 'square', vol: 0.08, slide: 80 }); },
  cantDo()     { tone({ freq: 180, dur: 0.12, type: 'square', vol: 0.1, slide: -40 }); },
  newDay()     { tone({ freq: 523, dur: 0.16, type: 'sine', vol: 0.1 }); setTimeout(() => tone({ freq: 659, dur: 0.16, type: 'sine', vol: 0.1 }), 120); setTimeout(() => tone({ freq: 784, dur: 0.24, type: 'sine', vol: 0.1 }), 240); },
  faint()      { tone({ freq: 220, dur: 0.4, type: 'sawtooth', vol: 0.12, slide: -150 }); },
};
