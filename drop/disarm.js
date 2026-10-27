// Disarming: shoot the gun hand and the enemy drops the weapon, then reacts in character. Pure rules, no three.js.
// The reaction picks an animation and a bark; the AI then runs it. Disarms score style points (see rating.js).

/** Chance a hit on this part knocks the weapon out of that hand. */
export const DISARM_CHANCE = { hand: 1, forearm: 0.5 };
export const PICKUP_REACH = 3;   // m: close enough to go back for the dropped weapon
export const SAFE_GAP = 4;       // m: the player has to be at least this far for that to feel safe
export const ALONE_RADIUS = 6;   // m: no allies within this counts as alone

/**
 * @typedef {'lineCook' | 'pistolCook' | 'kitchenGunner' | 'grabber' | 'courierHunter' | 'streamer' | 'gymBro'
 *   | 'halberdRifleman' | 'halberdBreacher' | 'shield' | 'taskForce' | 'drone' | 'expediter'} EnemyType
 * @typedef {'flee' | 'beg' | 'rushBareHanded' | 'pickUp' | 'drawSidearm' | 'retreat' | 'shieldBash'} Reaction
 * @typedef {{ id: string, type: EnemyType, weapon: string | null, gunHand: 'L' | 'R', hasSidearm?: boolean, hp: number }} Enemy
 *   hp is a fraction, 1 = unhurt
 * @typedef {{ distToPlayer: number, weaponDist: number, alliesNearby: number }} Situation
 */

/** Types that can be disarmed at all (no weapon, a bolted-on weapon, or a boss whose weapon is the fight). */
const UNDISARMABLE = new Set(['gymBro', 'grabber', 'drone', 'expediter']);

/**
 * Does this hit knock the weapon away?
 * @param {Enemy} enemy
 * @param {string} part a hit-location name like 'handR' or 'forearmL'
 * @param {number} roll a random number in [0, 1), passed in so the result can be replayed
 */
export function isDisarmed(enemy, part, roll) {
  if (!enemy.weapon || UNDISARMABLE.has(enemy.type) || enemy.hp <= 0) return false;
  const m = /^(hand|forearm)([LR])$/.exec(part);
  if (!m || m[2] !== enemy.gunHand) return false;
  return roll < DISARM_CHANCE[m[1]];
}

/**
 * How a disarmed enemy reacts. Same inputs, same answer.
 * @param {Enemy} enemy
 * @param {Situation} s
 * @returns {Reaction}
 */
export function reaction(enemy, s) {
  const canFetch = s.weaponDist <= PICKUP_REACH && s.distToPlayer >= SAFE_GAP;
  const alone = s.alliesNearby === 0;
  switch (enemy.type) {
    case 'lineCook': return enemy.hp < 0.4 ? 'flee' : 'rushBareHanded';           // angry, then sensible
    case 'pistolCook': return canFetch ? 'pickUp' : 'flee';
    case 'kitchenGunner': return canFetch ? 'pickUp' : s.distToPlayer < 3 ? 'beg' : 'flee';
    case 'courierHunter': return 'flee';                                          // it was never worth it
    case 'streamer': return 'beg';                                                // "I'm live! I'm LIVE!"
    case 'halberdRifleman':
    case 'halberdBreacher': return enemy.hasSidearm ? 'drawSidearm' : 'retreat'; // professionals
    case 'shield': return 'shieldBash';
    case 'taskForce': return alone ? 'beg' : canFetch ? 'pickUp' : 'retreat';
    default: return 'flee';
  }
}

/**
 * One hit on an enemy, as an event. Returns the disarm event to apply, or nothing.
 * @param {{ enemy: Enemy, part: string, roll: number, at: [number, number, number], situation: Situation }} hit
 * @returns {{ type: 'disarmed', enemy: string, weapon: string, at: [number, number, number], reaction: Reaction, bark: string }[]}
 */
export function disarmHit({ enemy, part, roll, at, situation }) {
  if (!isDisarmed(enemy, part, roll)) return [];
  const r = reaction(enemy, situation);
  return [{ type: 'disarmed', enemy: enemy.id, weapon: enemy.weapon, at, reaction: r, bark: `disarm.${r}.${enemy.type}` }];
}

/** The enemy after a disarm: no weapon, and a Halberd sidearm only gets drawn once. */
export function afterDisarm(enemy, r) {
  if (r === 'drawSidearm') return { ...enemy, weapon: 'pistol', hasSidearm: false };
  return { ...enemy, weapon: null };
}
