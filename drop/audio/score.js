// Chapter 1's soundtrack: synthesized jungle at 172 BPM, the way a 1999 action game would do it.
// Chopped breakbeats, a growling detuned reese bass, minor chord stabs, a delayed arp and sirens, all generated.
// It follows the fight in levels, switching on the bar:
//   0 calm     the counter: half-time break, sub bass, a dark pad
//   1 tension  someone noticed: the pad opens, a riser, the snare starts rolling
//   2 fight    full breaks, reese bass, stabs, the arp on and off
//   3 boss     everything, harder: distorted 808 under the reese, a siren lead, double-time hats
//   4 done     the results card: the break and the pad, winding down
// It goes through the master low-pass, so bullet time muffles it with everything else.
import { actx, lowpass, osc, noise, filt, gain, env, makeIR, clipper } from '../../audio/core.js';
import { scheduleSteps, loadMusicOn, saveMusicOn } from '../../audio/music.js';

export const BPM = 172;
const STEP = 60 / BPM / 4;
const nf = m => 440 * Math.pow(2, (m - 69) / 12);
// i – VI – III – VII in A minor: Am, F, C, G
const PROG = [{ root: 33, chord: [57, 60, 64] }, { root: 29, chord: [57, 60, 65] }, { root: 36, chord: [55, 60, 64] }, { root: 31, chord: [55, 59, 62] }];
const ARP = [0, 2, 1, 2, 0, 1, 2, 1];

export function createScore() {
  let M = null, on = loadMusicOn(), want = 0, level = 0, crash = false, duckT = 0;
  function build() {
    const bus = gain(); bus.gain.value = on ? .55 : 0; bus.connect(lowpass);
    const duck = gain(); duck.connect(bus);
    const drums = clipper(2.5); const dG = gain(); dG.gain.value = .9; drums.connect(dG); dG.connect(duck);
    const grit = clipper(6); const gG = gain(); gG.gain.value = .5; grit.connect(gG); gG.connect(duck);
    const verb = actx.createConvolver(); verb.buffer = makeIR(1.8, 2.6); const verbIn = gain(), vOut = gain(); vOut.gain.value = .5; verbIn.connect(verb); verb.connect(vOut); vOut.connect(duck);
    const dIn = gain(); dIn.gain.value = .4; const dl = actx.createDelay(1); dl.delayTime.value = STEP * 3; const fb = gain(); fb.gain.value = .42; const dlp = filt('lowpass', 2600);
    dIn.connect(dl); dl.connect(dlp); dlp.connect(fb); fb.connect(dl); dlp.connect(duck);
    M = { bus, duck, drums, grit, verbIn, dIn, t0: actx.currentTime + .12, step: 0 };
  }

  /* ---------- instruments ---------- */
  function kick(t, v = 1) {
    const o = osc('sine', 170, t, .32); o.frequency.exponentialRampToValueAtTime(42, t + .09);
    const g = gain(); env(g, t, .001, 1.3 * v, .28); o.connect(g).connect(M.drums);
    const c = noise(t, .02), cf = filt('highpass', 3000), cg = gain(); env(cg, t, .001, .5 * v, .015); c.connect(cf).connect(cg).connect(M.drums);
  }
  function snare(t, v = 1, verb = .5) {
    const n = noise(t, .22), f = filt('bandpass', 1900, .7), g = gain(); env(g, t, .001, .75 * v, .16); n.connect(f).connect(g).connect(M.drums);
    const o = osc('triangle', 210, t, .1); o.frequency.exponentialRampToValueAtTime(150, t + .08); const og = gain(); env(og, t, .001, .45 * v, .08); o.connect(og).connect(M.drums);
    if (verb) { const s = gain(); s.gain.value = verb * v; g.connect(s); s.connect(M.verbIn); }
  }
  function hat(t, v = 1, open = false) {
    const n = noise(t, open ? .2 : .04), f = filt('highpass', open ? 7000 : 9000), g = gain(); env(g, t, .001, .28 * v, open ? .16 : .025); n.connect(f).connect(g).connect(M.duck);
  }
  /** the reese: two detuned saws and a sub, growling through a moving filter */
  function reese(t, m, dur, v = 1, open = 700) {
    const f = nf(m), lp = filt('lowpass', 220, 6), g = gain();
    lp.frequency.setValueAtTime(220, t); lp.frequency.linearRampToValueAtTime(open, t + dur * .45); lp.frequency.linearRampToValueAtTime(260, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.32 * v, t + .02); g.gain.setValueAtTime(.32 * v, t + dur - .05); g.gain.linearRampToValueAtTime(.0001, t + dur);
    for (const d of [.994, 1.006]) { const o = osc('sawtooth', f * d, t, dur); o.connect(lp); }
    lp.connect(g); g.connect(M.grit);
    const sub = osc('sine', f, t, dur), sg = gain(); sg.gain.setValueAtTime(.0001, t); sg.gain.linearRampToValueAtTime(.45 * v, t + .02); sg.gain.setValueAtTime(.45 * v, t + dur - .05); sg.gain.linearRampToValueAtTime(.0001, t + dur);
    sub.connect(sg).connect(M.duck);
  }
  function boom(t, m, v = 1) { // the boss's distorted 808
    const o = osc('sine', nf(m) * 2, t, .7); o.frequency.exponentialRampToValueAtTime(nf(m), t + .06);
    const g = gain(); env(g, t, .003, .8 * v, .6); o.connect(g).connect(M.grit);
  }
  function stab(t, chord, v = 1) {
    const lp = filt('lowpass', 2800, 2), g = gain(); lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(600, t + .2);
    env(g, t, .003, .09 * v, .22); lp.connect(g); g.connect(M.duck); const s = gain(); s.gain.value = .5; g.connect(s); s.connect(M.verbIn);
    for (const m of chord) for (const d of [.997, 1.003]) osc('sawtooth', nf(m) * d, t, .3).connect(lp);
  }
  function arp(t, m, v = 1) {
    const o = osc('square', nf(m), t, .12), lp = filt('lowpass', 3400, 3), g = gain(); env(g, t, .002, .06 * v, .1);
    o.connect(lp).connect(g); g.connect(M.duck); g.connect(M.dIn);
  }
  function pad(t, chord, dur, v = 1, cut = 900) {
    const lp = filt('lowpass', cut, 1), g = gain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.035 * v, t + dur * .3); g.gain.linearRampToValueAtTime(.0001, t + dur);
    lp.connect(g); g.connect(M.duck); const s = gain(); s.gain.value = .6; g.connect(s); s.connect(M.verbIn);
    for (const m of chord) for (const d of [.995, 1.005]) osc('sawtooth', nf(m - 12) * d, t, dur).connect(lp);
  }
  function riser(t, dur, v = 1) {
    const n = noise(t, dur), f = filt('bandpass', 300, 4), g = gain();
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7000, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.22 * v, t + dur); n.connect(f).connect(g).connect(M.duck);
  }
  function siren(t, dur, m = 76) {
    const o = osc('sawtooth', nf(m), t, dur), lfo = osc('sine', 5.5, t, dur), lg = gain(); lg.gain.value = nf(m) * .04; lfo.connect(lg).connect(o.frequency);
    o.frequency.setValueAtTime(nf(m), t); o.frequency.linearRampToValueAtTime(nf(m + 5), t + dur * .5); o.frequency.linearRampToValueAtTime(nf(m), t + dur);
    const lp = filt('lowpass', 2200, 2), g = gain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.05, t + .1); g.gain.linearRampToValueAtTime(.0001, t + dur);
    o.connect(lp).connect(g); g.connect(M.duck); g.connect(M.dIn);
  }
  function crashCym(t) { const n = noise(t, 1.8), f = filt('highpass', 4500), g = gain(); env(g, t, .002, .3, 1.6); n.connect(f).connect(g); g.connect(M.duck); g.connect(M.verbIn); }

  /* ---------- the patterns ---------- */
  // a chopped amen-style break: kick, snare, ghost notes; fills every 4th bar
  const KICK = [1, 0, .7, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0];
  const SNARE = [0, 0, 0, 0, 1, 0, 0, .35, 0, .4, 0, 0, 1, 0, .3, 0];
  function step(i, t) {
    const s = i % 16, bar = Math.floor(i / 16), P = PROG[bar % 4], L = level, fillBar = bar % 4 === 3;
    if (s === 0) {
      const next = want;
      if (next !== level) { if (next > level && next >= 2) crash = true; level = next; }
      if (crash) { crash = false; crashCym(t); }
    }
    if (L === 0) { // half-time: the city at night
      if (s === 0 || (s === 10 && bar % 2)) kick(t, .8);
      if (s === 8) snare(t, .7, .8);
      if (s % 4 === 2) hat(t, .5);
      if (s === 0) { reese(t, P.root, STEP * 8, .5, 380); if (bar % 2 === 0) pad(t, P.chord, STEP * 32, .9, 700); }
      if (s === 8) reese(t, P.root, STEP * 6, .35, 320);
      return;
    }
    if (L === 4) {
      if (s === 0 || s === 10) kick(t, .7); if (s === 4 || s === 12) snare(t, .6);
      if (s % 2 === 0) hat(t, .4);
      if (s === 0 && bar % 2 === 0) pad(t, P.chord, STEP * 32, 1.1, 1400);
      return;
    }
    // 1 to 3: the break
    const hard = L === 3;
    if (KICK[s] || (hard && (s === 6 || s === 13))) kick(t, KICK[s] || .8);
    if (fillBar && s >= 12) snare(t, .5 + (s - 12) * .15, .3);
    else if (SNARE[s]) snare(t, SNARE[s]);
    if (L === 1) { if (s % 2 === 0) hat(t, .4); if (s === 0 && bar % 2 === 0) riser(t, STEP * 32, .8); if (s === 0) pad(t, P.chord, STEP * 16, 1, 1600); if (s === 0 || s === 8) reese(t, P.root, STEP * 6, .55, 500); return; }
    hat(t, s % 4 === 2 ? 1 : hard ? .7 : s % 2 ? .3 : .55, s === 14 && !hard);
    // bass: the reese rides the chord, chopped in two
    if (s === 0) reese(t, P.root, STEP * 7, 1, hard ? 1300 : 950);
    if (s === 8) reese(t, P.root + (bar % 2 ? 12 : 0), STEP * 5, .85, hard ? 1500 : 1100);
    if (s === 14) reese(t, P.root + 7, STEP * 2, .6, 900);
    if (hard && (s === 0 || s === 10)) boom(t, P.root, .9);
    // stabs and the arp
    if ((s === 0 || s === 3 || s === 6) && bar % 2 === 0) stab(t, P.chord, s === 0 ? 1 : .8);
    if ((hard || bar % 8 >= 4) && s % 2 === 0) arp(t, P.chord[ARP[(s / 2) % 8]] + 12, hard ? 1 : .8);
    if (hard && s === 0 && bar % 4 === 0) siren(t, STEP * 32, 76);
  }

  return {
    /** Starts it (from a click or the trigger, once audio is running). */
    start() { if (!actx) return; if (!M) build(); M.t0 = actx.currentTime + .1; M.step = 0; },
    /** Which level to switch to on the next bar. */
    set level(v) { want = v; }, get level() { return level; },
    /** A crash on the next bar (a boss going down, the doors blowing). */
    hit() { crash = true; },
    /** Every frame. talking: someone's line is up, so the music dips under it. */
    update(talking) {
      if (!M) return;
      scheduleSteps(M, STEP, step);
      const d = talking ? .55 : 1; if (d !== duckT) { duckT = d; M.duck.gain.setTargetAtTime(d, actx.currentTime, .15); }
    },
    get on() { return on; },
    set(v) { on = v; saveMusicOn(v); if (M) M.bus.gain.setTargetAtTime(v ? .55 : 0, actx.currentTime, .05); },
  };
}
