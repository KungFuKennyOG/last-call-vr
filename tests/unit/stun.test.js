import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialStun, stunEvent, canShoot, ignoredByEnemies, stunProgress, SOLO_WINDOW, COOP_WINDOW, SLAP_SPEED } from '../../drop/stun.js';

/** runs events, collecting every out event */
function run(state, events) {
  const out = [];
  for (const ev of events) { const r = stunEvent(state, ev); state = r.state; out.push(...r.out); }
  return { state, out };
}

test('solo: stunned, stab the shot in time, back up with no shot left', () => {
  const r = run(initialStun(), [{ type: 'downed', player: 'p1', t: 100 }, { type: 'adrenaline', player: 'p1', t: 104 }]);
  assert.deepEqual(r.out, [{ type: 'stunned', player: 'p1', until: 100 + SOLO_WINDOW }, { type: 'recovered', player: 'p1', how: 'adrenaline' }]);
  assert.equal(r.state.players.p1.shots, 0);
  assert.equal(canShoot(r.state, 'p1'), true);
});

test('solo: no shooting while stunned, and enemies still come for you', () => {
  const s = run(initialStun(), [{ type: 'downed', player: 'p1', t: 0 }]).state;
  assert.equal(canShoot(s, 'p1'), false);
  assert.equal(ignoredByEnemies(s, 'p1'), false);
});

test('solo: too slow with the shot restarts the checkpoint', () => {
  const r = run(initialStun(), [{ type: 'downed', player: 'p1', t: 0 }, { type: 'tick', t: SOLO_WINDOW + 0.1 }, { type: 'adrenaline', player: 'p1', t: SOLO_WINDOW + 0.2 }]);
  assert.deepEqual(r.out.at(-1), { type: 'restartCheckpoint', reason: 'timedOut' });
  assert.equal(r.out.filter(o => o.type === 'recovered').length, 0);
});

test('solo: a second stun with no shot left restarts at once', () => {
  const r = run(initialStun(), [{ type: 'downed', player: 'p1', t: 0 }, { type: 'adrenaline', player: 'p1', t: 1 }, { type: 'downed', player: 'p1', t: 50 }]);
  assert.deepEqual(r.out.at(-1), { type: 'restartCheckpoint', reason: 'noShotLeft' });
});

test('solo: a restart gives back the shot you had at the checkpoint', () => {
  // shot still unused when the checkpoint was taken, then used, then a restart: it comes back
  let r = run(initialStun(), [{ type: 'checkpointReached' }, { type: 'downed', player: 'p1', t: 0 }, { type: 'adrenaline', player: 'p1', t: 1 }, { type: 'checkpointRestored' }]);
  assert.equal(r.state.players.p1.shots, 1);
  // shot used before the checkpoint: it stays used
  r = run(initialStun(), [{ type: 'downed', player: 'p1', t: 0 }, { type: 'adrenaline', player: 'p1', t: 1 }, { type: 'checkpointReached' }, { type: 'checkpointRestored' }]);
  assert.equal(r.state.players.p1.shots, 0);
  assert.equal(r.state.players.p1.status, 'up');
});

test('a new chapter refills the shot', () => {
  const r = run(initialStun(), [{ type: 'downed', player: 'p1', t: 0 }, { type: 'adrenaline', player: 'p1', t: 1 }, { type: 'chapterStarted' }]);
  assert.equal(r.state.players.p1.shots, 1);
});

test('co-op: a real slap from your partner brings you back', () => {
  const r = run(initialStun(['p1', 'p2']), [
    { type: 'downed', player: 'p2', t: 10 },
    { type: 'slapped', player: 'p2', by: 'p1', speed: SLAP_SPEED - 0.5, t: 12 }, // a pat, not a slap
    { type: 'slapped', player: 'p2', by: 'p1', speed: SLAP_SPEED + 1, t: 13 },
  ]);
  assert.deepEqual(r.out, [{ type: 'stunned', player: 'p2', until: 10 + COOP_WINDOW }, { type: 'recovered', player: 'p2', how: 'slap', by: 'p1' }]);
});

test('co-op: stunned players are ignored by enemies and can not slap', () => {
  const s = run(initialStun(['p1', 'p2']), [{ type: 'downed', player: 'p2', t: 0 }]).state;
  assert.equal(ignoredByEnemies(s, 'p2'), true);
  assert.equal(ignoredByEnemies(s, 'p1'), false);
  assert.deepEqual(stunEvent(s, { type: 'slapped', player: 'p1', by: 'p2', speed: 9, t: 1 }).out, []);
});

test('co-op: no slap in time and you sit out until the next checkpoint', () => {
  const r = run(initialStun(['p1', 'p2']), [{ type: 'downed', player: 'p2', t: 0 }, { type: 'tick', t: COOP_WINDOW + 1 }]);
  assert.deepEqual(r.out.at(-1), { type: 'satOut', player: 'p2' });
  assert.equal(r.state.players.p2.status, 'out');
  assert.deepEqual(stunEvent(r.state, { type: 'slapped', player: 'p2', by: 'p1', speed: 9, t: COOP_WINDOW + 2 }).out, []);
  assert.equal(run(r.state, [{ type: 'checkpointRestored' }]).state.players.p2.status, 'up');
});

test('co-op: both stunned restarts the checkpoint', () => {
  const r = run(initialStun(['p1', 'p2']), [{ type: 'downed', player: 'p1', t: 0 }, { type: 'downed', player: 'p2', t: 3 }]);
  assert.deepEqual(r.out.at(-1), { type: 'restartCheckpoint', reason: 'nobodyStanding' });
});

test('co-op has no adrenaline window problem: the shot still works if you have one', () => {
  const r = run(initialStun(['p1', 'p2']), [{ type: 'downed', player: 'p1', t: 0 }, { type: 'adrenaline', player: 'p1', t: 5 }]);
  assert.deepEqual(r.out.at(-1), { type: 'recovered', player: 'p1', how: 'adrenaline' });
});

test('stun progress drives the grey-out from 0 to 1', () => {
  const s = run(initialStun(), [{ type: 'downed', player: 'p1', t: 0 }]).state;
  assert.equal(stunProgress(s, 'p1', 0), 0);
  assert.equal(stunProgress(s, 'p1', SOLO_WINDOW / 2), 0.5);
  assert.equal(stunProgress(s, 'p1', SOLO_WINDOW * 2), 1);
  assert.equal(stunProgress(initialStun(), 'p1', 3), 0);
});

test('events that make no sense are ignored', () => {
  const s = initialStun();
  for (const ev of [{ type: 'adrenaline', player: 'p1', t: 0 }, { type: 'slapped', player: 'p1', by: 'p1', speed: 9, t: 0 }, { type: 'downed', player: 'nobody', t: 0 }]) {
    const r = stunEvent(s, /** @type {any} */ (ev));
    assert.equal(r.state, s); assert.deepEqual(r.out, []);
  }
});
