import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRunner, initialRunner, runnerStart, runnerFire, runnerDown, runnerTick, exitDoor, PIECE_TAIL } from '../../drop/runner.js';
import { BEATS, SET_PIECES } from '../../drop/ch1/beats.js';
import { SPACES } from '../../drop/ch1/spaces.js';

const R = createRunner(BEATS, SET_PIECES);

/** a little driver: keeps the state, collects every out, kills spawned enemies on request */
function play() {
  let t = 0, s = initialRunner();
  const all = [], alive = [];
  const take = r => { s = r.state; all.push(...r.out); for (const o of r.out) if (o.type === 'spawn') alive.push(o.wave); return r.out; };
  return {
    get s() { return s; }, all, alive,
    start(i = 0) { return take(runnerStart(R, s, i, t, SPACES)); },
    fire(id) { return take(runnerFire(R, s, id, t, SPACES)); },
    tick(dt) { t += dt; return take(runnerTick(R, s, t, SPACES)); },
    killAll() { const out = []; while (alive.length) out.push(...take(runnerDown(R, s, alive.shift(), t, SPACES))); return out; },
    has: (type, k, v) => all.some(o => o.type === type && (k === undefined || o[k] === v)),
  };
}

test('the counter: the door stays shut until the bag is on your back', () => {
  const p = play();
  const out = p.start();
  assert.ok(out.some(o => o.type === 'beat' && o.id === 'pickup'));
  assert.ok(out.some(o => o.type === 'lock' && o.door === 'counter>fryerLine'));
  assert.ok(!p.has('unlock'));
  p.fire('bag:onBack');
  assert.ok(p.has('unlock', 'door', 'counter>fryerLine'));
  p.tick(3); assert.ok(p.has('trigger', 'id', 'pickup:noticed'));
  p.tick(2.6); assert.ok(p.has('trigger', 'id', 'pickup:quiet'));
});

test('the fryer line: cooks wait idle through the bounty set piece, then wake up', () => {
  const p = play(); p.start(); p.fire('bag:onBack');
  const out = p.fire('door:counter>fryerLine');
  assert.ok(out.some(o => o.type === 'trigger' && o.id === 'pickup:rollerDoor'), 'the roller door line fires on the way through');
  const spawns = out.filter(o => o.type === 'spawn');
  assert.equal(spawns.length, 5); assert.ok(spawns.every(o => o.idle && o.wave === 'fryerFight:wave1'));
  assert.ok(out.some(o => o.type === 'beat' && o.id === 'fryerFight' && o.checkpoint));
  const steps = [];
  for (let i = 0; i < 60; i++) steps.push(...p.tick(.1).filter(o => o.type === 'step').map(o => o.do));
  assert.deepEqual(steps, SET_PIECES.bounty.steps.map(s => s.do));
  assert.ok(p.has('trigger', 'id', 'setpiece:bounty:done'));
  assert.ok(p.has('alert', 'wave', 'fryerFight:wave1'));
  assert.ok(!p.has('unlock', 'door', 'fryerLine>freezer'), 'still locked mid-fight');
});

test('waves feed in as enemies go down, and the exit opens when the last wave is clear', () => {
  const p = play(); p.start(); p.fire('bag:onBack'); p.fire('door:counter>fryerLine'); p.tick(6);
  p.killAll();
  assert.ok(p.has('trigger', 'id', 'fryerFight:wave1:cleared'));
  const w2 = p.all.filter(o => o.type === 'spawn' && o.wave === 'fryerFight:wave2');
  assert.equal(w2.length, 6, 'wave 2 trickles in: 5 at once, the 6th after one goes down');
  assert.ok(p.has('unlock', 'door', 'fryerLine>freezer'));
});

test('the freezer seals, the cooks kick in, and the way back opens after', () => {
  const p = play(); p.start(); p.fire('bag:onBack'); p.fire('door:counter>fryerLine'); p.tick(6); p.killAll();
  p.fire('door:fryerLine>freezer');
  assert.ok(p.has('lock', 'door', 'freezer>fryerLine'));
  p.tick(1.6); assert.ok(p.has('trigger', 'id', 'freezer:sealed'));
  p.tick(8.1); assert.ok(p.has('spawn', 'wave', 'freezer:breach'));
  p.killAll();
  assert.ok(p.has('unlock', 'door', 'freezer>fryerLine'));
});

test('the Expediter: no way out until he goes down, then the dock door opens and the dock beat starts there', () => {
  const p = play(); p.start(); p.fire('bag:onBack'); p.fire('door:counter>fryerLine'); p.tick(6); p.killAll();
  p.fire('door:fryerLine>freezer'); p.tick(10); p.killAll();
  p.fire('door:freezer>fryerLine');
  assert.ok(p.has('beat', 'id', 'expediter'));
  assert.ok(p.has('lock', 'door', 'fryerLine>dock'));
  p.tick(2.1); assert.ok(p.has('trigger', 'id', 'expediter:start'));
  p.fire('expediter:enraged'); assert.ok(p.has('spawn', 'wave', 'expediter:adds'));
  p.fire('expediter:defeated');
  assert.ok(p.has('unlock', 'door', 'fryerLine>dock'));
  assert.ok(!p.has('beat', 'id', 'dock'), 'the dock beat waits for the door');
  p.fire('door:fryerLine>dock');
  assert.ok(p.has('beat', 'id', 'dock'));
  assert.ok(p.has('spawn', 'wave', 'dock:wave1'));
});

test('the dock: clear it, go through the bay, and the chapter ends', () => {
  const p = play(); p.start(4);
  assert.ok(p.has('beat', 'id', 'dock'));
  p.killAll();
  assert.ok(p.has('unlock', 'door', 'dock>street'));
  p.fire('door:dock>street');
  assert.ok(p.has('trigger', 'id', 'chapter:end'));
  assert.ok(p.has('chapterEnd'));
  assert.ok(p.s.over);
});

test('a checkpoint restart replays a beat from the top with the same spawns', () => {
  const a = play(); a.start(); a.fire('bag:onBack'); const first = a.fire('door:counter>fryerLine').filter(o => o.type === 'spawn');
  const b = play(); const again = b.start(1).filter(o => o.type === 'spawn');
  assert.deepEqual(again, first);
});

test('stray triggers, double kills and kills from another beat are harmless', () => {
  const p = play(); p.start();
  p.fire('nonsense'); p.fire('door:fryerLine>dock');
  const r = runnerDown(R, p.s, 'dock:wave1', 0, SPACES);
  assert.deepEqual(r.out, []);
  assert.equal(r.state.beat, 0);
});

test('exitDoor finds the door to the next beat\'s space', () => {
  const s = initialRunner(); s.beat = 3;
  assert.equal(exitDoor(R, s, SPACES), 'fryerLine>dock');
  s.beat = 0; assert.equal(exitDoor(R, s, SPACES), 'counter>fryerLine');
  assert.ok(PIECE_TAIL > 0);
});
