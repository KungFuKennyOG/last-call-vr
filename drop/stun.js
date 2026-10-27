// Stunned, not dead: what happens when a player's health runs out. Pure rules, no three.js.
//
// Solo: you stay on your feet, stunned, with grey vision and no shooting. Stab the adrenaline shot (one per
// chapter) within SOLO_WINDOW seconds to get back up. Run out of time, or get stunned with no shot left, and the
// checkpoint restarts.
// Co-op: you're stunned for up to COOP_WINDOW seconds and enemies ignore you. Your partner slaps you back with a
// real swing (hand speed at least SLAP_SPEED). Run out of time and you sit out until the next checkpoint.
// If nobody is left standing, the checkpoint restarts.
// The view never moves in any of this: these rules only say who is stunned; the camera stays where the player put it.

export const SOLO_WINDOW = 10;   // s to stab the adrenaline shot
export const COOP_WINDOW = 20;   // s for your partner to slap you back
export const SLAP_SPEED = 2.2;   // m/s: hand speed that counts as a real slap (pistol-whip territory)
export const SHOTS_PER_CHAPTER = 1;

/**
 * @typedef {'up' | 'stunned' | 'out'} Status
 * @typedef {{ status: Status, until: number, since: number, shots: number, shotsAtCheckpoint: number, stuns: number }} PlayerStun
 * @typedef {{ mode: 'solo' | 'coop', players: Record<string, PlayerStun> }} StunState
 * @typedef {{ type: 'chapterStarted' }
 *   | { type: 'downed', player: string, t: number }
 *   | { type: 'adrenaline', player: string, t: number }
 *   | { type: 'slapped', player: string, by: string, speed: number, t: number }
 *   | { type: 'tick', t: number }
 *   | { type: 'checkpointReached' }
 *   | { type: 'checkpointRestored' }} StunEvent
 * @typedef {{ type: 'stunned', player: string, until: number }
 *   | { type: 'recovered', player: string, how: 'adrenaline' | 'slap', by?: string }
 *   | { type: 'satOut', player: string }
 *   | { type: 'restartCheckpoint', reason: 'noShotLeft' | 'timedOut' | 'nobodyStanding' }} StunOut
 */

const fresh = () => ({ status: /** @type {Status} */ ('up'), until: 0, since: 0, shots: SHOTS_PER_CHAPTER, shotsAtCheckpoint: SHOTS_PER_CHAPTER, stuns: 0 });

/** @returns {StunState} */
export function initialStun(players = ['p1']) {
  return { mode: players.length > 1 ? 'coop' : 'solo', players: Object.fromEntries(players.map(id => [id, fresh()])) };
}

/** @param {StunState} s @param {string} id @param {Partial<PlayerStun>} patch */
const set = (s, id, patch) => ({ ...s, players: { ...s.players, [id]: { ...s.players[id], ...patch } } });
/** @param {StunState} s */
const nobodyUp = s => Object.values(s.players).every(p => p.status !== 'up');

/**
 * @param {StunState} state
 * @param {StunEvent} ev
 * @returns {{ state: StunState, out: StunOut[] }}
 */
export function stunEvent(state, ev) {
  const none = { state, out: [] };
  switch (ev.type) {
    case 'chapterStarted':
      return { state: { ...state, players: Object.fromEntries(Object.keys(state.players).map(id => [id, fresh()])) }, out: [] };

    case 'downed': {
      const p = state.players[ev.player];
      if (!p || p.status !== 'up') return none;
      if (state.mode === 'solo' && p.shots <= 0) {
        return { state: set(state, ev.player, { status: 'stunned', since: ev.t, until: ev.t, stuns: p.stuns + 1 }), out: [{ type: 'restartCheckpoint', reason: 'noShotLeft' }] };
      }
      const until = ev.t + (state.mode === 'solo' ? SOLO_WINDOW : COOP_WINDOW);
      const s = set(state, ev.player, { status: 'stunned', since: ev.t, until, stuns: p.stuns + 1 });
      /** @type {StunOut[]} */ const out = [{ type: 'stunned', player: ev.player, until }];
      if (state.mode === 'coop' && nobodyUp(s)) out.push({ type: 'restartCheckpoint', reason: 'nobodyStanding' });
      return { state: s, out };
    }

    case 'adrenaline': {
      const p = state.players[ev.player];
      if (!p || p.status !== 'stunned' || p.shots <= 0 || ev.t > p.until) return none;
      return { state: set(state, ev.player, { status: 'up', shots: p.shots - 1 }), out: [{ type: 'recovered', player: ev.player, how: 'adrenaline' }] };
    }

    case 'slapped': {
      const p = state.players[ev.player], by = state.players[ev.by];
      if (state.mode !== 'coop' || !p || !by || ev.by === ev.player) return none;
      if (p.status !== 'stunned' || by.status !== 'up' || ev.speed < SLAP_SPEED || ev.t > p.until) return none;
      return { state: set(state, ev.player, { status: 'up' }), out: [{ type: 'recovered', player: ev.player, how: 'slap', by: ev.by }] };
    }

    case 'tick': {
      let s = state; /** @type {StunOut[]} */ const out = [];
      for (const [id, p] of Object.entries(state.players)) {
        if (p.status !== 'stunned' || ev.t <= p.until) continue;
        if (state.mode === 'solo') return { state: s, out: [{ type: 'restartCheckpoint', reason: 'timedOut' }] };
        s = set(s, id, { status: 'out' }); out.push({ type: 'satOut', player: id });
      }
      if (out.length && nobodyUp(s)) out.push({ type: 'restartCheckpoint', reason: 'nobodyStanding' });
      return { state: s, out };
    }

    case 'checkpointReached':
      return { state: { ...state, players: Object.fromEntries(Object.entries(state.players).map(([id, p]) => [id, { ...p, shotsAtCheckpoint: p.shots }])) }, out: [] };

    case 'checkpointRestored':
      // everyone back on their feet, with the shots they had when the checkpoint was taken
      return { state: { ...state, players: Object.fromEntries(Object.entries(state.players).map(([id, p]) => [id, { ...p, status: 'up', until: 0, shots: p.shotsAtCheckpoint }])) }, out: [] };
  }
  return none;
}

/** True when the player can fire. */
export const canShoot = (state, id) => state.players[id]?.status === 'up';
/** True when enemies should ignore the player (stunned in co-op, or sitting out). */
export const ignoredByEnemies = (state, id) => state.mode === 'coop' && state.players[id]?.status !== 'up';
/** 0..1: how far through the stun window the player is, for the grey-out and the countdown on the wrist. */
export function stunProgress(state, id, t) {
  const p = state.players[id];
  if (!p || p.status !== 'stunned' || p.until <= p.since) return p?.status === 'out' ? 1 : 0;
  return Math.min(1, Math.max(0, (t - p.since) / (p.until - p.since)));
}
