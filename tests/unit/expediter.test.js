import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialBoss, bossTick, bossHit, bossGunStun, bossPos, shotAngle, LANE, TUNING } from '../../drop/bosses/expediter.js';

/** runs the boss for `secs` with the player standing still, collecting outputs */
function runFor(s, secs, player, t0 = 0, dt = 1 / 60) {
  const out = []; let t = t0;
  for (let i = 0; i < Math.round(secs / dt); i++) { t += dt; const r = bossTick(s, { t, dt, player }); s = r.state; out.push(...r.out.map(o => ({ ...o, t }))); }
  return { s, out, t };
}
const front = { x: 0, z: 2 };            // across the counter, straight ahead
const behind = { x: 0, z: LANE.z - 3 };  // went round the back of the line

test('he introduces himself and throws pans at range, on a cadence', () => {
  const { out } = runFor(initialBoss(), 10, front);
  assert.equal(out[0].type, 'say');
  const pans = out.filter(o => o.type === 'throwPan');
  assert.ok(pans.length >= 2 && pans.length <= 4, `${pans.length} pans in 10 s`);
  for (let i = 1; i < pans.length; i++) assert.ok(pans[i].t - pans[i - 1].t >= TUNING.throwEvery - 0.05);
});

test('the tray blocks body shots from the front, but not headshots', () => {
  const s = runFor(initialBoss(), 2, front).s;
  assert.ok(shotAngle(s, front) < TUNING.shieldArc);
  assert.deepEqual(bossHit(s, { part: 'torso', shooter: front, t: 2 }).out, [{ type: 'blocked', part: 'torso' }]);
  assert.equal(bossHit(s, { part: 'head', shooter: front, t: 2 }).out[0].type, 'hurt');
});

test('flanking gets past the tray, and from behind it hurts more', () => {
  const s = runFor(initialBoss(), 2, front).s;
  const side = { x: bossPos(s).x + 3, z: LANE.z };
  const fromSide = bossHit(s, { part: 'torso', shooter: side, t: 2 });
  const fromBack = bossHit(s, { part: 'torso', shooter: behind, t: 2 });
  assert.equal(fromSide.out[0].type, 'hurt');
  assert.ok(fromBack.state.hp < fromSide.state.hp);
});

test('he turns slowly: running round him opens the flank before he catches up', () => {
  let s = runFor(initialBoss(), 3, front).s;
  s = bossTick(s, { t: 3.02, dt: 0.02, player: behind }).state;   // you just got round
  assert.ok(shotAngle(s, behind) > TUNING.shieldArc, 'still exposed right after flanking');
  s = runFor(s, 3, behind, 3.02).s;                                 // stand there too long
  assert.ok(shotAngle(s, behind) < TUNING.shieldArc, 'he has turned the tray back onto you');
});

test('up close he winds up first, then swings: a fair warning', () => {
  const close = { x: 0, z: LANE.z + 1.2 };
  const { out } = runFor(initialBoss(), 2, close);
  const w = out.find(o => o.type === 'windup'), sw = out.find(o => o.type === 'swing');
  assert.ok(w && sw);
  assert.ok(sw.t - w.t >= TUNING.windup - 0.02);
  assert.equal(out.filter(o => o.type === 'throwPan').length, 0, 'no pans at point-blank range');
});

test('a thrown gun staggers him: tray down, wind-up cancelled', () => {
  let s = runFor(initialBoss(), 2, front).s;
  const r = bossGunStun(s, { t: 2 });
  assert.equal(r.out[0].type, 'staggered');
  s = r.state;
  assert.equal(bossHit(s, { part: 'torso', shooter: front, t: 2.5 }).out[0].type, 'hurt');
  assert.equal(bossHit(s, { part: 'torso', shooter: front, t: 2 + TUNING.stagger + 0.1 }).out[0].type, 'blocked');
});

test('he enrages once at 40% and throws two pans at a time, faster', () => {
  let s = runFor(initialBoss(), 1, front).s, out = [];
  while (s.hp > TUNING.enrageAt) { const r = bossHit(s, { part: 'torso', shooter: behind, t: 1 }); s = r.state; out.push(...r.out); }
  assert.equal(out.filter(o => o.type === 'enraged').length, 1);
  const after = runFor(s, 6, front, 1).out.filter(o => o.type === 'throwPan');
  const times = [...new Set(after.map(p => p.t))];
  assert.ok(after.length >= times.length * 2 - 1, 'pans come in pairs');
  for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] < TUNING.throwEvery);
});

test('he goes down at zero, says his last line, and stops acting', () => {
  let s = initialBoss(), out = [];
  for (let i = 0; i < 40 && !s.defeated; i++) { const r = bossHit(s, { part: 'head', shooter: front, t: i }); s = r.state; out.push(...r.out); }
  assert.ok(s.defeated); assert.equal(s.hp, 0);
  assert.ok(out.some(o => o.type === 'defeated'));
  assert.deepEqual(bossTick(s, { t: 99, dt: 0.016, player: front }).out, []);
  assert.deepEqual(bossHit(s, { part: 'head', shooter: front, t: 99 }).out, []);
});

test('he stays in the pass', () => {
  const s = runFor(initialBoss(), 10, { x: 9, z: 2 }).s;
  assert.ok(s.x <= LANE.maxX + 1e-9 && s.x >= LANE.minX - 1e-9);
});

test('same seed, same fight', () => {
  const a = runFor(initialBoss(7), 12, front).out, b = runFor(initialBoss(7), 12, front).out;
  assert.deepEqual(a, b);
  const c = runFor(initialBoss(8), 12, front).out;
  assert.notDeepEqual(a.filter(o => o.type === 'throwPan'), c.filter(o => o.type === 'throwPan'));
});
