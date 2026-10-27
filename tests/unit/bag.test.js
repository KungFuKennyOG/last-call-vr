import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialBag, bagEvent, replay, grabberIntent, GRAB_RANGE, PICKUP_RANGE } from '../../drop/bag.js';

test('a grabber steals the bag, dies, and the player picks it back up', () => {
  let s = initialBag('p1'), r;
  r = bagEvent(s, { type: 'grabbed', enemy: 'g1' });
  assert.deepEqual(r.out, [{ type: 'bagStolen', enemy: 'g1', from: 'p1' }]);
  assert.deepEqual(r.state.holder, { kind: 'enemy', id: 'g1' });
  s = r.state;
  r = bagEvent(s, { type: 'enemyDown', enemy: 'g1', at: [3, 0, -2] });
  assert.deepEqual(r.out, [{ type: 'bagDropped', at: [3, 0, -2] }]);
  s = r.state;
  r = bagEvent(s, { type: 'pickedUp', player: 'p1', at: [3.5, 0, -2] });
  assert.deepEqual(r.out, [{ type: 'bagRecovered', player: 'p1' }]);
  assert.deepEqual(r.state.holder, { kind: 'player', id: 'p1' });
  assert.equal(r.state.steals, 1);
});

test('a grabber who reaches an exit loses you the bag', () => {
  const s = bagEvent(initialBag(), { type: 'grabbed', enemy: 'g1' }).state;
  const r = bagEvent(s, { type: 'escaped', enemy: 'g1' });
  assert.deepEqual(r.out, [{ type: 'bagLost', enemy: 'g1' }]);
  assert.deepEqual(r.state.holder, { kind: 'lost' });
  assert.deepEqual(bagEvent(r.state, { type: 'checkpointRestored', player: 'p1' }).state.holder, { kind: 'player', id: 'p1' });
});

test('events that do not fit are ignored', () => {
  const s = initialBag();
  for (const ev of [
    { type: 'enemyDown', enemy: 'g1', at: [0, 0, 0] },        // he doesn't have it
    { type: 'pickedUp', player: 'p1', at: [0, 0, 0] },        // it's not on the floor
    { type: 'escaped', enemy: 'g1' },
  ]) {
    const r = bagEvent(/** @type {any} */ (s), /** @type {any} */ (ev));
    assert.equal(r.state, s); assert.deepEqual(r.out, []);
  }
  const dropped = { holder: /** @type {const} */ ({ kind: 'ground', at: [0, 0, 0] }), steals: 1 };
  assert.deepEqual(bagEvent(dropped, { type: 'pickedUp', player: 'p1', at: [PICKUP_RANGE + 0.5, 0, 0] }).out, []); // too far
  assert.deepEqual(bagEvent(dropped, { type: 'enemyDown', enemy: 'g9', at: [0, 0, 0] }).out, []);
});

test('a second grabber can snatch it off the floor, but only up close', () => {
  const dropped = { holder: /** @type {const} */ ({ kind: 'ground', at: [0, 0, 0] }), steals: 1 };
  assert.deepEqual(bagEvent(dropped, { type: 'grabbed', enemy: 'g2', at: [5, 0, 0] }).out, []);
  const r = bagEvent(dropped, { type: 'grabbed', enemy: 'g2', at: [0.5, 0, 0] });
  assert.deepEqual(r.out, [{ type: 'bagGrabbedOffFloor', enemy: 'g2' }]);
  assert.equal(r.state.steals, 1);
});

test('state is never mutated in place', () => {
  const s = initialBag(); const before = JSON.stringify(s);
  bagEvent(s, { type: 'grabbed', enemy: 'g1' });
  assert.equal(JSON.stringify(s), before);
});

test('replaying the same events gives the same bag (co-op and replays depend on this)', () => {
  const events = [
    { type: 'grabbed', enemy: 'g1' }, { type: 'enemyDown', enemy: 'g1', at: [1, 0, 1] },
    { type: 'grabbed', enemy: 'g2', at: [1.2, 0, 1] }, { type: 'enemyDown', enemy: 'g2', at: [4, 0, 2] },
    { type: 'pickedUp', player: 'p1', at: [4, 0, 2.5] },
  ];
  const a = replay(initialBag(), /** @type {any} */ (events)), b = replay(initialBag(), /** @type {any} */ (events));
  assert.deepEqual(a, b);
  assert.deepEqual(a.state, { holder: { kind: 'player', id: 'p1' }, steals: 1 });
  assert.deepEqual(a.out.map(o => o.type), ['bagStolen', 'bagDropped', 'bagGrabbedOffFloor', 'bagDropped', 'bagRecovered']);
});

const players = [{ id: 'p1', pos: /** @type {[number,number,number]} */ ([0, 0, 0]) }];
const exits = /** @type {[number,number,number][]} */ ([[10, 0, 0], [-6, 0, 0]]);

test('grabbers chase the carrier and grab when close', () => {
  const bag = initialBag('p1');
  assert.equal(grabberIntent({ bag, self: { id: 'g1', pos: [5, 0, 0] }, players, exits }).action, 'chase');
  assert.equal(grabberIntent({ bag, self: { id: 'g1', pos: [GRAB_RANGE - 0.1, 0, 0] }, players, exits }).action, 'grab');
});

test('a grabber with the bag runs for the exit away from the player, and escapes at the door', () => {
  const bag = bagEvent(initialBag(), { type: 'grabbed', enemy: 'g1' }).state;
  // he's on the player's right: the left exit is closer to him, but the player is in the way
  const r = grabberIntent({ bag, self: { id: 'g1', pos: [1, 0, 0] }, players, exits });
  assert.deepEqual(r, { action: 'flee', target: [10, 0, 0] });
  assert.equal(grabberIntent({ bag, self: { id: 'g1', pos: [9.5, 0, 0] }, players, exits }).action, 'escape');
  assert.equal(grabberIntent({ bag, self: { id: 'g2', pos: [3, 0, 0] }, players, exits }).action, 'hang back');
});

test('grabbers go for a bag on the floor', () => {
  const bag = { holder: /** @type {const} */ ({ kind: 'ground', at: [2, 0, 2] }), steals: 1 };
  assert.deepEqual(grabberIntent({ bag, self: { id: 'g1', pos: [8, 0, 2] }, players, exits }), { action: 'fetch', target: [2, 0, 2] });
  assert.equal(grabberIntent({ bag, self: { id: 'g1', pos: [2.5, 0, 2] }, players, exits }).action, 'grab');
});
