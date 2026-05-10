// Opening cutscene timeline.
//
// Four shots, ~68s total before fade-out. Cinematic noir Blade-Runner-ish
// flow that introduces the city → the detective → the case → the call to
// adventure, then drops the player into the gameplay scene.
//
// Each shot has:
//   id, dur, buildBg, camera, shake?, subtitles, audio
//
// The audio cues are *symbolic strings* — the audio module decides whether
// to start/stop a synth pattern when the cutscene runtime emits the cue.
// This keeps the timeline data declarative and free of WebAudio internals.

import {
  buildCityPanShot,
  buildOfficeIntroShot,
  buildCaseFileShot,
  buildPrepExitShot,
} from './cutscene-shots.js';

export function buildOpeningTimeline() {
  return [
    // ---------- Shot 1: cityPan (18s) ----------
    {
      id: 'cityPan',
      dur: 18,
      buildBg: buildCityPanShot,
      camera: { type: 'pan', fromX: 0, toX: 840, ease: 'easeInOut' },
      audio: {
        onEnter: ['noir.padStart', 'noir.rainStart'],
        cues:    [
          { t: 4,  cue: 'noir.neonBuzz' },
          { t: 11, cue: 'noir.neonBuzz' },
        ],
      },
      subtitles: [
        { t: 2.5, dur: 5.5, speaker: 'detective',
          text: '"A cidade nunca dorme. E nem eu, ultimamente."' },
        { t: 9,   dur: 6.0, speaker: 'detective',
          text: '"Chuva. Neon. Sirenes longe demais pra serem minhas."' },
      ],
    },

    // ---------- Shot 2: officeIntro (22s) ----------
    {
      id: 'officeIntro',
      dur: 22,
      buildBg: buildOfficeIntroShot,
      // Camera starts pulled in tight on the detective's face/shoulder, then
      // pulls back over 16s to reveal the full office.
      camera: {
        type: 'zoom',
        fromScale: 2.4,
        toScale: 1.0,
        ease: 'easeOut',
        // Pivot on the detective's head (matches officeIntro fg actor at
        // x≈478, head at y≈340)
        pivotX: 478,
        pivotY: 340,
      },
      audio: {
        onEnter: ['noir.padHold', 'noir.rainSoft'],
      },
      subtitles: [
        { t: 1.5, dur: 6.0, speaker: 'detective',
          text: '"Vinte anos no departamento. Mais cinco como detetive particular."' },
        { t: 8.5, dur: 6.0, speaker: 'detective',
          text: '"Pensei que tinha visto tudo. A cidade sempre prova que eu errei."' },
        { t: 15.5, dur: 5.5, speaker: 'detective',
          text: '"E essa noite... essa noite cheirava errado desde o crepúsculo."' },
      ],
    },

    // ---------- Shot 3: caseFile (16s) ----------
    {
      id: 'caseFile',
      dur: 16,
      buildBg: buildCaseFileShot,
      camera: {
        type: 'focusPull',
        fromScale: 1.05,
        toScale:   1.20,
        fromX: -20,
        toX:    20,
        ease: 'easeInOut',
        pivotX: 540,
        pivotY: 320,
      },
      // Subtle uneasy tremor when the chief drops the file
      shake: { amplitude: 0.6, frequency: 18 },
      audio: {
        onEnter: ['noir.tense', 'noir.paperSwoosh'],
        cues: [
          { t: 1, cue: 'noir.paperDrop' },
        ],
      },
      subtitles: [
        { t: 1.5, dur: 5.5, speaker: 'chief',
          text: '"Encontraram a vítima às quatro da manhã. Sem documento, sem digital."' },
        { t: 7.5, dur: 5.0, speaker: 'chief',
          text: '"Só essa chave no bolso. E uma foto que ninguém quer reconhecer."' },
        { t: 13.0, dur: 2.8, speaker: 'detective',
          text: '"...quem mandou ela aqui pra mim?"' },
      ],
    },

    // ---------- Shot 4: prepExit (12s) ----------
    {
      id: 'prepExit',
      dur: 12,
      buildBg: buildPrepExitShot,
      // Camera tracks the detective walking left toward the highlighted door
      camera: { type: 'track', ease: 'linear' },
      audio: {
        onEnter: ['noir.tenseRise', 'noir.footstepsWet'],
      },
      subtitles: [
        { t: 1.0, dur: 4.5, speaker: 'detective',
          text: '"Sobretudo. Revólver. Lanterna."' },
        { t: 6.0, dur: 5.0, speaker: 'detective',
          text: '"A cidade me deu um caso. E eu vou fazer o que sempre faço."' },
      ],
    },
  ];
}

// Convenience: total duration of the timeline (without fade-in/out tails).
export function timelineDuration(timeline) {
  return timeline.reduce((s, sh) => s + (sh.dur || 0), 0);
}
