// What gets said, and when: picks the lines for a trigger from a chapter's script and plays them one after another.
// Pure rules, no three.js.
//
// On a trigger, lines from different speakers play as a short exchange in script order; several lines from the
// same speaker are variants, and one is picked (never the one picked last time, when there's a choice).
// Lines queue so they never talk over each other; a line takes about as long as it takes to read.

/** @typedef {{ on: string, who: string, text: string, mode?: string }} Line */
/** @typedef {{ who: string, text: string, on: string, dur: number }} Queued */

export const READ_BASE = 1.1;    // s
export const READ_PER_CHAR = .055;
export const MAX_QUEUE = 4;      // lines waiting; older barks drop first when it fills
const BARKERS = new Set(['cook', 'grabber', 'expediter']);

/** Seconds a line stays up. */
export const lineDuration = text => READ_BASE + text.length * READ_PER_CHAR;

/**
 * The lines to say for a trigger.
 * @param {Line[]} script
 * @param {string} on
 * @param {'solo' | 'coop'} mode
 * @param {() => number} rand
 * @param {Record<string, string>} [last] what was picked last time per trigger+speaker; updated in place
 * @returns {Queued[]}
 */
export function pickLines(script, on, mode, rand, last = {}) {
  const lines = script.filter(l => l.on === on && (!l.mode || l.mode === mode));
  const order = [], by = {};
  for (const l of lines) { if (!by[l.who]) { by[l.who] = []; order.push(l.who); } by[l.who].push(l); }
  return order.map(who => {
    const opts = by[who], key = on + '|' + who;
    let pick = opts[Math.floor(rand() * opts.length) % opts.length];
    if (opts.length > 1 && pick.text === last[key]) pick = opts[(opts.indexOf(pick) + 1) % opts.length];
    last[key] = pick.text;
    return { who, text: pick.text, on, dur: lineDuration(pick.text) };
  });
}

/** @returns {{ queue: Queued[], now: Queued | null, until: number }} */
export function initialRadio() { return { queue: [], now: null, until: 0 }; }

/** Adds lines to the queue. When it's full, enemy barks waiting in it go first, then the oldest. */
export function radioPush(state, lines) {
  const queue = state.queue.concat(lines);
  while (queue.length > MAX_QUEUE) {
    const i = queue.findIndex(q => BARKERS.has(q.who));
    queue.splice(i >= 0 ? i : 0, 1);
  }
  return { ...state, queue };
}

/** Every frame with real time. `started` is the line that just came up (to voice it), or null. */
export function radioTick(state, t) {
  if (state.now && t < state.until) return { state, started: null };
  if (!state.queue.length) return { state: state.now ? { ...state, now: null } : state, started: null };
  const [next, ...rest] = state.queue;
  return { state: { queue: rest, now: next, until: t + next.dur }, started: next };
}

/** Drops everything (a checkpoint restart). */
export const radioClear = () => initialRadio();
