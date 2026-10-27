// The bag: who has it, and what grabbers do about it. Pure rules, no three.js.
//
// Everything that changes the bag goes through bagEvent(state, event) -> { state, out }.
// Rendering, sound and AI react to the `out` events; nothing else writes to the bag.
// That keeps it network-ready: in co-op the host applies the same events and sends them on.
//
// Solo: the bag is worn on the player's back. A grabber can rip it off and run for an exit.
// Kill him and it drops; walk over and pick it up. If he gets out, the bag is lost and the checkpoint restarts.

export const GRAB_RANGE = 0.9;    // m: a grabber this close to the carrier takes the bag
export const PICKUP_RANGE = 1.2;  // m: how close you need to be to pick it up off the floor
export const EXIT_RANGE = 0.8;    // m: a grabber this close to an exit with the bag gets away

/**
 * @typedef {[number, number, number]} Vec3
 * @typedef {{ kind: 'player', id: string } | { kind: 'enemy', id: string } | { kind: 'ground', at: Vec3 } | { kind: 'lost' }} Holder
 * @typedef {{ holder: Holder, steals: number }} BagState
 * @typedef {{ type: 'grabbed', enemy: string, at?: Vec3 }
 *   | { type: 'enemyDown', enemy: string, at: Vec3 }
 *   | { type: 'pickedUp', player: string, at: Vec3 }
 *   | { type: 'escaped', enemy: string }
 *   | { type: 'checkpointRestored', player: string }} BagEvent
 * @typedef {{ type: 'bagStolen', enemy: string, from: string }
 *   | { type: 'bagGrabbedOffFloor', enemy: string }
 *   | { type: 'bagDropped', at: Vec3 }
 *   | { type: 'bagRecovered', player: string }
 *   | { type: 'bagLost', enemy: string }} BagOut
 */

/** @returns {BagState} */
export function initialBag(player = 'p1') {
  return { holder: { kind: 'player', id: player }, steals: 0 };
}

const flat = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);

/**
 * Applies one event. Events that don't fit the current state are ignored, so late or doubled messages are harmless.
 * @param {BagState} state
 * @param {BagEvent} ev
 * @returns {{ state: BagState, out: BagOut[] }}
 */
export function bagEvent(state, ev) {
  const h = state.holder;
  switch (ev.type) {
    case 'grabbed':
      if (h.kind === 'player') {
        return { state: { holder: { kind: 'enemy', id: ev.enemy }, steals: state.steals + 1 }, out: [{ type: 'bagStolen', enemy: ev.enemy, from: h.id }] };
      }
      if (h.kind === 'ground' && ev.at && flat(ev.at, h.at) <= PICKUP_RANGE) {
        return { state: { ...state, holder: { kind: 'enemy', id: ev.enemy } }, out: [{ type: 'bagGrabbedOffFloor', enemy: ev.enemy }] };
      }
      break;
    case 'enemyDown':
      if (h.kind === 'enemy' && h.id === ev.enemy) {
        return { state: { ...state, holder: { kind: 'ground', at: ev.at } }, out: [{ type: 'bagDropped', at: ev.at }] };
      }
      break;
    case 'pickedUp':
      if (h.kind === 'ground' && flat(ev.at, h.at) <= PICKUP_RANGE) {
        return { state: { ...state, holder: { kind: 'player', id: ev.player } }, out: [{ type: 'bagRecovered', player: ev.player }] };
      }
      break;
    case 'escaped':
      if (h.kind === 'enemy' && h.id === ev.enemy) {
        return { state: { ...state, holder: { kind: 'lost' } }, out: [{ type: 'bagLost', enemy: ev.enemy }] };
      }
      break;
    case 'checkpointRestored':
      return { state: { ...state, holder: { kind: 'player', id: ev.player } }, out: [] };
  }
  return { state, out: [] };
}

/** Runs a list of events from a starting state. Same events in, same bag out: the basis for co-op sync and replays. */
export function replay(state, events) {
  const out = [];
  for (const ev of events) { const r = bagEvent(state, ev); state = r.state; out.push(...r.out); }
  return { state, out };
}

/**
 * What a grabber wants to do this tick. The AI moves him toward `target`; `grab` and `escape` mean "send that event now".
 * @param {{ bag: BagState, self: { id: string, pos: Vec3 }, players: { id: string, pos: Vec3 }[], exits: Vec3[] }} q
 * @returns {{ action: 'chase' | 'grab' | 'fetch' | 'flee' | 'escape' | 'hang back', target?: Vec3 }}
 */
export function grabberIntent({ bag, self, players, exits }) {
  const h = bag.holder;
  if (h.kind === 'enemy' && h.id === self.id) {
    if (!exits.length) return { action: 'hang back' };
    // the exit that best keeps him away from the players: near him, far from them
    let best = exits[0], bestScore = -Infinity;
    for (const e of exits) {
      const nearestPlayer = Math.min(...players.map(p => flat(p.pos, e)), Infinity);
      const score = Math.min(nearestPlayer, 12) - flat(self.pos, e);
      if (score > bestScore) { bestScore = score; best = e; }
    }
    return flat(self.pos, best) <= EXIT_RANGE ? { action: 'escape', target: best } : { action: 'flee', target: best };
  }
  if (h.kind === 'ground') {
    return flat(self.pos, h.at) <= PICKUP_RANGE ? { action: 'grab', target: h.at } : { action: 'fetch', target: h.at };
  }
  if (h.kind === 'player') {
    const carrier = players.find(p => p.id === h.id);
    if (!carrier) return { action: 'hang back' };
    return flat(self.pos, carrier.pos) <= GRAB_RANGE ? { action: 'grab', target: carrier.pos } : { action: 'chase', target: carrier.pos };
  }
  return { action: 'hang back' }; // another grabber has it, or it's lost
}
