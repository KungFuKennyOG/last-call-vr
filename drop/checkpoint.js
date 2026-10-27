// Checkpoints between spaces. Pure rules, no three.js.
//
// A checkpoint is taken when everyone still standing has gone through the door into the next space with the bag.
// It saves the chapter, the space, each player's health and what's in their hands, the bag and the stun state.
// Restoring rebuilds the space from its data (enemies respawn) and puts the players back with at least
// MIN_HP_ON_RESTART of their health, so a restart never drops you into a fight at one hit from death.
// Mid-chapter checkpoints live only in memory; the password code always starts a chapter from the top.

import { stunEvent } from './stun.js';

export const MIN_HP_ON_RESTART = 0.6;

/**
 * @typedef {'pistol' | 'uzi' | 'sawedOff' | 'rifle' | 'pump' | 'cleaver' | 'flashbang' | 'extinguisher' | null} Weapon
 * @typedef {{ weapon: Weapon, ammo: number }} Hand
 * @typedef {{ hp: number, maxHp: number, hands: [Hand, Hand] }} PlayerSave
 * @typedef {import('./bag.js').BagState} BagState
 * @typedef {import('./stun.js').StunState} StunState
 * @typedef {{ chapter: number, space: string, players: Record<string, PlayerSave>, bag: BagState, stun: StunState }} Snapshot
 */

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) deepFreeze(v); }
  return o;
}

/**
 * Can the group move on to the next space, and so take a checkpoint?
 * @param {{ to: string, from: string, playersIn: Record<string, string>, stun: StunState, bag: BagState }} q
 *   playersIn maps each player to the space they're standing in
 * @returns {{ ok: true } | { ok: false, reason: 'sameSpace' | 'bagMissing' | 'waitingForPartner' }}
 */
export function canMoveOn({ to, from, playersIn, stun, bag }) {
  if (to === from) return { ok: false, reason: 'sameSpace' };
  if (bag.holder.kind !== 'player') return { ok: false, reason: 'bagMissing' };
  const standing = Object.entries(stun.players).filter(([, p]) => p.status === 'up').map(([id]) => id);
  if (standing.some(id => playersIn[id] !== to)) return { ok: false, reason: 'waitingForPartner' };
  if (playersIn[bag.holder.id] !== to) return { ok: false, reason: 'bagMissing' };
  return { ok: true };
}

/**
 * Takes a checkpoint. The result is a frozen deep copy: nothing the game does afterwards can change it.
 * Also marks the stun state so a restart gives back the adrenaline shot held right now.
 * @param {Snapshot} snap
 * @returns {Readonly<Snapshot>}
 */
export function takeCheckpoint(snap) {
  if (snap.bag.holder.kind !== 'player') throw new Error('a checkpoint needs the bag with a player');
  const stun = stunEvent(snap.stun, { type: 'checkpointReached' }).state;
  return deepFreeze(structuredClone({ ...snap, stun }));
}

/**
 * Turns a checkpoint back into live, editable game state.
 * @param {Readonly<Snapshot>} cp
 * @returns {Snapshot}
 */
export function restoreCheckpoint(cp) {
  /** @type {Snapshot} */
  const snap = structuredClone(/** @type {Snapshot} */ (cp));
  for (const p of Object.values(snap.players)) p.hp = Math.max(p.hp, Math.ceil(p.maxHp * MIN_HP_ON_RESTART));
  snap.stun = stunEvent(snap.stun, { type: 'checkpointRestored' }).state;
  return snap;
}

/** What the wrist shows when the door won't take you through. */
export const BLOCKED_MESSAGES = {
  bagMissing: "Don't forget the bag.",
  waitingForPartner: 'Wait for your partner.',
  sameSpace: '',
};
