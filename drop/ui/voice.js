// Placeholder voices until real ones are recorded: each speaker babbles in their own register while their line
// is up, the way old games did it. Mo and the dispatcher come through a crackly courier radio; the GOFR app
// chimes; the cooks shout from where they stand.
import { actx, sfxBus, now, osc, noise, filt, gain, env, outAt } from '../../audio/index.js';

/** pitch (Hz), syllables per second, wave, formant (Hz), radio filter */
const VOICES = {
  mo: { f: 105, rate: 7, wave: 'sawtooth', formant: 650, radio: true },
  vee: { f: 230, rate: 10, wave: 'triangle', formant: 1300 },
  dispatch: { f: 160, rate: 9, wave: 'square', formant: 900, radio: true },
  cook: { f: 130, rate: 8, wave: 'sawtooth', formant: 800 },
  grabber: { f: 170, rate: 12, wave: 'sawtooth', formant: 1000 },
  expediter: { f: 75, rate: 6, wave: 'sawtooth', formant: 500 },
};

/** @param {{ where?: (who: string) => any }} [o] where(who): a position for voices that come from someone in the room */
export function createVoice({ where } = {}) {
  let on = true;
  function chime() {
    const t = now();
    [[0, 1046.5], [.09, 1568], [.18, 2093]].forEach(([d, f]) => { const o = osc('sine', f, t + d, .18), g = gain(); env(g, t + d, .004, .1, .16); o.connect(g).connect(sfxBus); });
  }
  function radioClick(t, out) { const n = noise(t, .05), f = filt('highpass', 2500), g = gain(); env(g, t, .001, .25, .04); n.connect(f).connect(g).connect(out); }
  /** Speak a line: { who, text, dur }. */
  function say(line) {
    if (!on || !actx) return;
    if (line.who === 'app') { chime(); return; }
    const V = VOICES[line.who] || VOICES.cook, t0 = now();
    const pos = !V.radio && where ? where(line.who) : null, out = pos ? outAt(pos) : sfxBus;
    const bus = gain(); bus.gain.value = V.radio ? .5 : .7;
    if (V.radio) { const bp = filt('bandpass', 1500, 1.2), hp = filt('highpass', 500); bus.connect(hp).connect(bp).connect(out); radioClick(t0, out); }
    else bus.connect(out);
    const dur = Math.min(line.dur * .75, 4.5), n = Math.max(2, Math.round(dur * V.rate));
    let seed = line.text.length * 97;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    // syllables follow the words: a short pause where the text has a space, a lift on a question
    const rises = /\?$/.test(line.text), shout = /[A-Z]{3,}|!$/.test(line.text);
    for (let i = 0; i < n; i++) {
      const t = t0 + .05 + i / V.rate + (rnd() - .5) * .02, len = .06 + rnd() * .05;
      const f = V.f * (1 + (rnd() - .5) * .35) * (rises && i > n - 3 ? 1.3 : 1) * (shout ? 1.15 : 1);
      const o = osc(V.wave, f, t, len), form = filt('bandpass', V.formant * (.8 + rnd() * .5), 3), g = gain();
      env(g, t, .008, shout ? .5 : .32, len); o.connect(form).connect(g).connect(bus);
    }
    if (V.radio) radioClick(t0 + .05 + n / V.rate, out);
  }
  return { say, set: v => { on = v; }, get on() { return on; } };
}
