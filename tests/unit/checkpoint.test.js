import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canMoveOn, takeCheckpoint, restoreCheckpoint, MIN_HP_ON_RESTART } from '../../drop/checkpoint.js';
import { initialBag, bagEvent } from '../../drop/bag.js';
import { initialStun, stunEvent } from '../../drop/stun.js';

const hands = () => /** @type {[any, any]} */ ([{ weapon: 'pistol', ammo: 9 }, { weapon: 'uzi', ammo: 31 }]);
const snap = (over = {}) => ({ chapter: 1, space: 'fryerLine', players: { p1: { hp: 30, maxHp: 100, hands: hands() } }, bag: initialBag('p1'), stun: initialStun(['p1']), ...over });

test('solo: you can move on with the bag', () => {
  assert.deepEqual(canMoveOn({ from: 'counter', to: 'fryerLine', playersIn: { p1: 'fryerLine' }, stun: initialStun(), bag: initialBag() }), { ok: true });
});

test('you can not leave the bag behind', () => {
  const bag = bagEvent(initialBag(), { type: 'grabbed', enemy: 'g1' }).state;
  assert.deepEqual(canMoveOn({ from: 'counter', to: 'fryerLine', playersIn: { p1: 'fryerLine' }, stun: initialStun(), bag }), { ok: false, reason: 'bagMissing' });
});

test('co-op: both standing players have to be through the door', () => {
  const stun = initialStun(['p1', 'p2']), bag = initialBag('p1');
  assert.deepEqual(canMoveOn({ from: 'a', to: 'b', playersIn: { p1: 'b', p2: 'a' }, stun, bag }), { ok: false, reason: 'waitingForPartner' });
  assert.deepEqual(canMoveOn({ from: 'a', to: 'b', playersIn: { p1: 'b', p2: 'b' }, stun, bag }), { ok: true });
});

test('co-op: a partner sitting out does not hold the group back', () => {
  let stun = initialStun(['p1', 'p2']);
  stun = stunEvent(stun, { type: 'downed', player: 'p2', t: 0 }).state;
  stun = stunEvent(stun, { type: 'tick', t: 999 }).state;
  assert.deepEqual(canMoveOn({ from: 'a', to: 'b', playersIn: { p1: 'b', p2: 'a' }, stun, bag: initialBag('p1') }), { ok: true });
});

test('co-op: the bag carrier has to come through too', () => {
  let stun = initialStun(['p1', 'p2']);
  stun = stunEvent(stun, { type: 'downed', player: 'p2', t: 0 }).state;
  stun = stunEvent(stun, { type: 'tick', t: 999 }).state;
  assert.deepEqual(canMoveOn({ from: 'a', to: 'b', playersIn: { p1: 'b', p2: 'a' }, stun, bag: initialBag('p2') }), { ok: false, reason: 'bagMissing' });
});

test('a checkpoint is a frozen copy the game can not change', () => {
  const s = snap(); const cp = takeCheckpoint(s);
  s.players.p1.hp = 1; s.players.p1.hands[0].ammo = 0;
  assert.equal(cp.players.p1.hp, 30);
  assert.equal(cp.players.p1.hands[0].ammo, 9);
  assert.ok(Object.isFrozen(cp.players.p1.hands[0]));
});

test('restoring tops health up to the minimum and keeps what was in your hands', () => {
  const live = restoreCheckpoint(takeCheckpoint(snap()));
  assert.equal(live.players.p1.hp, Math.ceil(100 * MIN_HP_ON_RESTART));
  assert.deepEqual(live.players.p1.hands, hands());
  live.players.p1.hp = 5; // live state is editable again
  const healthy = restoreCheckpoint(takeCheckpoint(snap({ players: { p1: { hp: 90, maxHp: 100, hands: hands() } } })));
  assert.equal(healthy.players.p1.hp, 90);
});

test('restoring gives back the adrenaline shot held at the checkpoint and stands everyone up', () => {
  const cp = takeCheckpoint(snap());
  let live = restoreCheckpoint(cp);
  live.stun = stunEvent(live.stun, { type: 'downed', player: 'p1', t: 0 }).state;
  live.stun = stunEvent(live.stun, { type: 'adrenaline', player: 'p1', t: 1 }).state;
  assert.equal(live.stun.players.p1.shots, 0);
  live = restoreCheckpoint(cp);
  assert.equal(live.stun.players.p1.shots, 1);
  assert.equal(live.stun.players.p1.status, 'up');
});

test('a checkpoint without the bag is refused', () => {
  const bag = bagEvent(initialBag(), { type: 'grabbed', enemy: 'g1' }).state;
  assert.throws(() => takeCheckpoint(snap({ bag })));
});
