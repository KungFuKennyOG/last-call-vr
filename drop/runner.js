// Runs a chapter's beats: which trigger starts which wave, when timed events fire, when set pieces step, when a
// door opens, and when the chapter is over. Pure rules, no three.js; the same triggers in give the same outputs.
//
// The game feeds it three things:
//   runnerFire(state, trigger, t)      something happened: 'bag:onBack', 'door:counter>fryerLine', 'fryer:shot'…
//   runnerDown(state, wave, t)         an enemy from that wave died, fled or got away
//   runnerTick(state, t)               every frame, with the world clock
// and reacts to what comes back in `out`:
//   { type: 'trigger', id }                  lines, set piece visuals, anything that hangs on a trigger
//   { type: 'beat', id, space, checkpoint }  a beat started (take a checkpoint when asked)
//   { type: 'spawn', wave, spawn, idle }     put an enemy in (idle ones wait for an 'alert')
//   { type: 'alert', wave }                  the idle enemies of that wave wake up
//   { type: 'step', piece, do }              a set piece step
//   { type: 'unlock', door } / { type: 'lock', door }
//   { type: 'chapterEnd' }
// The state is plain data, so a checkpoint can keep a copy and put it back.

/**
 * @typedef {import('./ch1/beats.js').Beat} Beat
 * @typedef {{ id: string, on: string, steps: { at: number, do: string }[], done: string }} SetPiece
 * @typedef {{ queued: any[], alive: number, started: boolean, cleared: boolean, idle: number }} WaveState
 * @typedef {{ beat: number, waiting: string | null, pending: { id: string, at: number }[], waves: Record<string, WaveState>,
 *   fired: string[], piece: { id: string, t0: number, next: number } | null, exitOpen: boolean, over: boolean }} RunnerState
 * @typedef {{ type: string, [k: string]: any }} Out
 */

export const PIECE_TAIL = 0.6; // s after a set piece's last step before its done trigger

/** @param {Beat[]} beats */
export function createRunner(beats, setPieces = {}) {
  return { beats, setPieces };
}

/** A fresh run, before the first beat. Call runnerStart to begin. @returns {RunnerState} */
export function initialRunner() {
  return { beat: -1, waiting: null, pending: [], waves: {}, fired: [], piece: null, exitOpen: false, over: false };
}

const clone = s => structuredClone(s);
const beatOf = (R, s) => R.beats[s.beat];

/** The door out of the current beat's space toward the next beat, if the next beat is somewhere else. */
export function exitDoor(R, s, spaces) {
  const b = beatOf(R, s); if (!b) return null;
  if (b.ends.startsWith('door:')) return b.ends.slice(5);
  const next = R.beats[s.beat + 1];
  if (!next || next.space === b.space) return null;
  const sp = spaces.find(x => x.id === b.space);
  const d = sp && sp.doors.find(x => x.to === next.space);
  return d ? d.id : null;
}

/** Begins beat i (0 for the start of the chapter, or the beat a checkpoint restarts). */
export function runnerStart(R, state, i, t, spaces) {
  const s = clone(state); const out = [];
  startBeat(R, s, i, t, out, spaces);
  return { state: s, out };
}

function startBeat(R, s, i, t, out, spaces) {
  s.beat = i; s.waiting = null; s.pending = []; s.waves = {}; s.fired = []; s.piece = null; s.exitOpen = false;
  const b = beatOf(R, s);
  if (!b) { s.over = true; out.push({ type: 'chapterEnd' }); return; }
  for (const w of b.waves) s.waves[w.id] = { queued: w.spawns.map(sp => ({ ...sp })), alive: 0, started: false, cleared: false, idle: 0 };
  out.push({ type: 'beat', id: b.id, space: b.space, checkpoint: b.checkpointOnEnter, index: i });
  const ex = exitDoor(R, s, spaces);
  if (ex) out.push({ type: 'lock', door: ex });
  // a set piece whose done trigger starts a wave: those enemies are already there, idle, while it plays
  if (b.setPiece) {
    const sp = R.setPieces[b.setPiece];
    for (const w of b.waves) if (sp && w.on === sp.done) spawnSome(s, w, out, true);
  }
  fire(R, s, b.enter, t, out, spaces);
  checkExit(R, s, out, spaces);
}

function spawnSome(s, w, out, idle) {
  const ws = s.waves[w.id];
  ws.started = true;
  while (ws.queued.length && ws.alive < w.maxAlive) {
    const sp = ws.queued.shift(); ws.alive++; if (idle) ws.idle++;
    out.push({ type: 'spawn', wave: w.id, spawn: sp, idle: !!idle });
  }
}

function fire(R, s, id, t, out, spaces) {
  if (s.over) return;
  const b = beatOf(R, s);
  // a door the run is waiting for: the next beat starts on the other side
  if (s.waiting && id === s.waiting) {
    out.push({ type: 'trigger', id });
    startBeat(R, s, s.beat + 1, t, out, spaces);
    return;
  }
  if (!b) return;
  s.fired.push(id);
  out.push({ type: 'trigger', id });
  for (const e of b.events) if (e.on === id) {
    if (e.after) s.pending.push({ id: e.id, at: t + e.after });
    else fire(R, s, e.id, t, out, spaces);
  }
  for (const w of b.waves) {
    if (w.on !== id) continue;
    const ws = s.waves[w.id];
    if (ws.idle) { ws.idle = 0; out.push({ type: 'alert', wave: w.id }); }
    if (!ws.started || ws.queued.length) spawnSome(s, w, out, false);
  }
  for (const [pid, sp] of Object.entries(R.setPieces)) if (sp.on === id && b.setPiece === pid) s.piece = { id: pid, t0: t, next: 0 };
  if (id === b.ends) endBeat(R, s, t, out, spaces);
  else checkExit(R, s, out, spaces);
}

function endBeat(R, s, t, out, spaces) {
  const b = beatOf(R, s);
  if (b.ends.startsWith('door:')) { startBeat(R, s, s.beat + 1, t, out, spaces); return; }
  const ex = exitDoor(R, s, spaces);
  if (!ex) { startBeat(R, s, s.beat + 1, t, out, spaces); return; }
  s.waiting = 'door:' + ex; s.exitOpen = true;
  out.push({ type: 'unlock', door: ex });
}

/** The exit opens once every wave of the beat has been started and cleared, and nothing is still timed. */
function checkExit(R, s, out, spaces) {
  const b = beatOf(R, s);
  if (!b || s.exitOpen || s.waiting || !b.ends.startsWith('door:')) return;
  const allClear = b.waves.every(w => s.waves[w.id].cleared);
  if (!allClear || s.piece) return;
  if (b.id === 'pickup' && !s.fired.includes('bag:onBack')) return;
  s.exitOpen = true;
  out.push({ type: 'unlock', door: b.ends.slice(5) });
}

/** An enemy of `wave` is out of the fight. Feeds the next one in, and clears the wave when it's empty. */
export function runnerDown(R, state, wave, t, spaces = []) {
  const s = clone(state), out = [];
  const b = beatOf(R, s), w = b && b.waves.find(x => x.id === wave), ws = s.waves[wave];
  if (!w || !ws || ws.cleared) return { state: s, out };
  ws.alive = Math.max(0, ws.alive - 1); if (ws.idle > ws.alive) ws.idle = ws.alive;
  if (ws.queued.length) spawnSome(s, w, out, false);
  if (!ws.queued.length && ws.alive === 0) { ws.cleared = true; fire(R, s, wave + ':cleared', t, out, spaces); }
  return { state: s, out };
}

/** Something happened in the world. */
export function runnerFire(R, state, id, t, spaces = []) {
  const s = clone(state), out = [];
  fire(R, s, id, t, out, spaces);
  return { state: s, out };
}

/** Every frame: timed events and set piece steps. */
export function runnerTick(R, state, t, spaces = []) {
  if (state.over || (!state.pending.length && !state.piece)) return { state, out: [] };
  const s = clone(state), out = [];
  const due = s.pending.filter(p => p.at <= t).sort((a, b) => a.at - b.at);
  s.pending = s.pending.filter(p => p.at > t);
  for (const p of due) fire(R, s, p.id, t, out, spaces);
  if (s.piece) {
    const sp = R.setPieces[s.piece.id];
    while (s.piece && s.piece.next < sp.steps.length && t >= s.piece.t0 + sp.steps[s.piece.next].at) {
      out.push({ type: 'step', piece: s.piece.id, do: sp.steps[s.piece.next].do }); s.piece.next++;
    }
    if (s.piece && s.piece.next >= sp.steps.length && t >= s.piece.t0 + sp.steps[sp.steps.length - 1].at + PIECE_TAIL) {
      s.piece = null; fire(R, s, sp.done, t, out, spaces);
    }
  }
  return { state: s, out };
}

/** True while the run is in this beat and that wave is still in the fight. */
export const waveLive = (state, wave) => !!state.waves[wave] && !state.waves[wave].cleared;
