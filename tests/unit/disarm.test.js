import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDisarmed, reaction, disarmHit, afterDisarm, SAFE_GAP } from '../../drop/disarm.js';

const cook = { id: 'c1', type: /** @type {const} */ ('pistolCook'), weapon: 'pistol', gunHand: /** @type {const} */ ('R'), hp: 1 };
const far = { distToPlayer: 8, weaponDist: 1, alliesNearby: 2 };
const close = { distToPlayer: 1.5, weaponDist: 1, alliesNearby: 0 };

test('a shot to the gun hand always disarms; the forearm half the time; anywhere else never', () => {
  assert.equal(isDisarmed(cook, 'handR', 0.99), true);
  assert.equal(isDisarmed(cook, 'forearmR', 0.3), true);
  assert.equal(isDisarmed(cook, 'forearmR', 0.7), false);
  for (const part of ['handL', 'forearmL', 'upperArmR', 'head', 'torso']) assert.equal(isDisarmed(cook, part, 0), false, part);
});

test('no weapon, a gym bro, a grabber, the boss or a dead enemy can not be disarmed', () => {
  assert.equal(isDisarmed({ ...cook, weapon: null }, 'handR', 0), false);
  for (const type of ['gymBro', 'grabber', 'expediter']) assert.equal(isDisarmed({ ...cook, type: /** @type {any} */ (type) }, 'handR', 0), false, type);
  assert.equal(isDisarmed({ ...cook, hp: 0 }, 'handR', 0), false);
});

test('each faction reacts in character', () => {
  assert.equal(reaction({ ...cook, type: 'lineCook' }, close), 'rushBareHanded');
  assert.equal(reaction({ ...cook, type: 'lineCook', hp: 0.2 }, close), 'flee');
  assert.equal(reaction({ ...cook, type: 'streamer' }, far), 'beg');
  assert.equal(reaction({ ...cook, type: 'courierHunter' }, close), 'flee');
  assert.equal(reaction({ ...cook, type: 'halberdRifleman', hasSidearm: true }, close), 'drawSidearm');
  assert.equal(reaction({ ...cook, type: 'halberdRifleman', hasSidearm: false }, close), 'retreat');
  assert.equal(reaction({ ...cook, type: 'shield' }, close), 'shieldBash');
});

test('cooks go back for the gun only when it is close and you are not', () => {
  assert.equal(reaction(cook, far), 'pickUp');
  assert.equal(reaction(cook, { ...far, distToPlayer: SAFE_GAP - 1 }), 'flee');
  assert.equal(reaction(cook, { ...far, weaponDist: 9 }), 'flee');
});

test('the Task Force begs when alone and regroups when not', () => {
  const tf = { ...cook, type: /** @type {const} */ ('taskForce') };
  assert.equal(reaction(tf, close), 'beg');
  assert.equal(reaction(tf, far), 'pickUp');
  assert.equal(reaction(tf, { ...far, weaponDist: 9 }), 'retreat');
});

test('a disarming hit becomes one event with a bark id; other hits become nothing', () => {
  const ev = disarmHit({ enemy: cook, part: 'handR', roll: 0.1, at: [1, 1, 2], situation: far });
  assert.deepEqual(ev, [{ type: 'disarmed', enemy: 'c1', weapon: 'pistol', at: [1, 1, 2], reaction: 'pickUp', bark: 'disarm.pickUp.pistolCook' }]);
  assert.deepEqual(disarmHit({ enemy: cook, part: 'torso', roll: 0, at: [0, 0, 0], situation: far }), []);
});

test('Halberd draws a sidearm once, then has nothing left', () => {
  let h = { ...cook, type: /** @type {const} */ ('halberdRifleman'), weapon: 'rifle', hasSidearm: true };
  h = afterDisarm(h, reaction(h, far));
  assert.equal(h.weapon, 'pistol');
  assert.equal(reaction(h, far), 'retreat');
  assert.equal(afterDisarm(cook, 'flee').weapon, null);
});
