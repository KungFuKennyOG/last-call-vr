// The music system: a step sequencer scheduled a little ahead of the audio clock, and the on/off preference
// (shared by every page, so turning music off in one mode turns it off in all). The scores themselves live with each game.
import { actx } from './core.js';

const KEY = 'lastcall-music';
// stored preference; on unless the player turned it off
export function loadMusicOn() { try { return localStorage.getItem(KEY) !== 'off'; } catch (e) { return true; } }
export function saveMusicOn(on) { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {} }

// mus: the game's music state, with bus (a GainNode), t0 (audio time of step 0) and step (next step to play).
// Call every frame: plays every step due in the next 0.15 s by calling playStep(i, when).
export function scheduleSteps(mus, stepSec, playStep) {
  if (!mus) return;
  const ahead = actx.currentTime + .15;
  while (mus.t0 + mus.step * stepSec < ahead) { playStep(mus.step, mus.t0 + mus.step * stepSec); mus.step++; }
}
// fade the music bus in or out
export function fadeMusic(mus, on, level = .62) { if (mus) mus.bus.gain.setTargetAtTime(on ? level : 0, actx.currentTime, .05); }
