// Tiny WebAudio SFX. No external assets — everything is synthesized.
let ctx = null;
let muted = false;

// Persistent voices owned by the cutscene (or other long-running cues). Each
// entry is { source, gain, stop() }. We keep them alive until explicitly
// stopped via Audio.cutsceneStopAll() so that ambient pad / rain / footsteps
// loops don't get garbage-collected mid-cutscene.
const _voices = new Map();

// Deterministic PRNG used to fill noise buffers. Same pattern used in
// sprites.js / lighting.js / cutscene-shots.js. Seeded once per voice fill
// so that re-renders of the cutscene hear an identical noise bed instead of
// drifting on every reload.
function _mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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
  // Deterministic white-noise fill so SFX bursts sound identical on replay.
  // (A short freshly-seeded stream per call keeps successive calls distinct.)
  const rnd = _mulberry32(0x9e37 ^ Math.floor(t0 * 1000) ^ len);
  for (let i = 0; i < len; i++) data[i] = (rnd() * 2 - 1);
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

// ---------- Voice helpers (persistent loops) ----------

function _stopVoice(name, fadeS = 0.4) {
  const v = _voices.get(name);
  if (!v) return;
  _voices.delete(name);
  try {
    const c = ensureCtx();
    if (!c) return;
    const t = c.currentTime;
    v.gain.gain.cancelScheduledValues(t);
    v.gain.gain.setValueAtTime(v.gain.gain.value, t);
    v.gain.gain.exponentialRampToValueAtTime(0.0001, t + fadeS);
    v.source.stop(t + fadeS + 0.05);
  } catch (e) {
    // ignore
  }
}

function _startNoiseVoice(name, { vol, filterFreq, filterQ, type = 'lowpass' }) {
  const c = ensureCtx();
  if (!c) return;
  if (_voices.has(name)) _stopVoice(name, 0);
  const sr = c.sampleRate;
  // 2-second pink-ish noise buffer, looped
  const len = Math.floor(sr * 2);
  const buf = c.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  // Pink-ish (low-passed white) for nicer rain. Seeded so the loop sounds
  // identical on every cutscene replay; loop length (2s) is plenty long
  // for a believable rain bed.
  const rnd = _mulberry32(name.charCodeAt(0) ^ (len & 0xffff));
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = rnd() * 2 - 1;
    last = (last + w * 0.02) * 0.96;
    data[i] = last + w * 0.18;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const filt = c.createBiquadFilter();
  filt.type = type;
  filt.frequency.value = filterFreq;
  filt.Q.value = filterQ;
  const g = c.createGain();
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + 0.5);
  src.connect(filt).connect(g).connect(c.destination);
  src.start();
  _voices.set(name, { source: src, gain: g });
}

function _startPadVoice(name, freqs, vol = 0.05) {
  const c = ensureCtx();
  if (!c) return;
  if (_voices.has(name)) _stopVoice(name, 0);
  // Detuned sawtooth stack through a slow LP filter sweep — moody noir pad
  const oscs = [];
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, c.currentTime);
  gain.gain.linearRampToValueAtTime(vol, c.currentTime + 1.2);
  const filt = c.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 600;
  filt.Q.value = 0.7;
  // LFO on filter cutoff
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 0.08;
  lfoGain.gain.value = 220;
  lfo.connect(lfoGain).connect(filt.frequency);
  lfo.start();
  for (const f of freqs) {
    for (const detune of [-7, 0, 7]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = detune;
      o.connect(filt);
      o.start();
      oscs.push(o);
    }
  }
  filt.connect(gain).connect(c.destination);
  _voices.set(name, {
    source: { stop: (t) => { oscs.forEach((o) => o.stop(t)); lfo.stop(t); } },
    gain,
  });
}

// ---------- Public API ----------

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

  // ---------- Cutscene cues ----------
  //
  // The opening cutscene fires symbolic cues like 'noir.padStart'. We
  // dispatch them to internal voice helpers below. Unknown cues are silent
  // (logged to console.debug) so the cutscene can declare experimental cues
  // without crashing.
  cutsceneCue(cue) {
    if (muted) return;
    switch (cue) {
      case 'noir.padStart':
        _startPadVoice('pad', [55, 82.4, 110], 0.06); // A1, E2, A2
        break;
      case 'noir.padHold':
        // Slightly thicker chord for the office introspection beat
        _startPadVoice('pad', [55, 73.4, 98, 110], 0.07); // A1, D2, G2, A2
        break;
      case 'noir.tense':
        _startPadVoice('pad', [49, 55, 82.4], 0.07); // G1, A1, E2 — tritone-ish
        break;
      case 'noir.tenseRise':
        _startPadVoice('pad', [49, 73.4, 110, 130.8], 0.08); // G1, D2, A2, C3
        break;
      case 'noir.rainStart':
        _startNoiseVoice('rain', { vol: 0.08, filterFreq: 1800, filterQ: 0.7 });
        break;
      case 'noir.rainSoft':
        _startNoiseVoice('rain', { vol: 0.045, filterFreq: 900, filterQ: 0.6 });
        break;
      case 'noir.footstepsWet': {
        // Spawn a recurring footstep pattern via setInterval, stored under
        // a voice key so cutsceneStopAll can clear it.
        const id = setInterval(() => {
          if (muted) return;
          noise({ freq: 380, dur: 0.07, vol: 0.10, q: 1.5 });
          tone({ freq: 110, dur: 0.05, type: 'square', vol: 0.04 });
        }, 480);
        _voices.set('footsteps', {
          source: { stop: () => clearInterval(id) },
          gain: { gain: { cancelScheduledValues() {}, setValueAtTime() {}, exponentialRampToValueAtTime() {}, value: 0 } },
        });
        break;
      }
      case 'noir.neonBuzz': {
        // Quick electric crackle
        noise({ freq: 4200, dur: 0.10, vol: 0.06, q: 8 });
        tone({ freq: 60, dur: 0.06, type: 'sawtooth', vol: 0.04 });
        break;
      }
      case 'noir.paperSwoosh': {
        noise({ freq: 1600, dur: 0.18, vol: 0.06, q: 1.5 });
        break;
      }
      case 'noir.paperDrop': {
        noise({ freq: 800, dur: 0.10, vol: 0.10, q: 2.0 });
        tone({ freq: 90, dur: 0.08, type: 'sine', vol: 0.05, slide: -40 });
        break;
      }
      default:
        // Unknown cue — be permissive
        // eslint-disable-next-line no-console
        if (typeof console !== 'undefined' && console.debug) {
          console.debug('Audio: unknown cue', cue);
        }
    }
  },

  // Stop every persistent voice owned by the cutscene (rain/pad/footsteps).
  // Called when the cutscene ends or is skipped, and as a defensive cleanup
  // when the cutscene is constructed (in case a previous run left voices
  // alive).
  cutsceneStopAll() {
    for (const name of Array.from(_voices.keys())) _stopVoice(name, 0.4);
  },
};
