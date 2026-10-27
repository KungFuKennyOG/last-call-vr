// Chapter 1 data checks: the spaces fit the Quest budgets, doors and triggers all connect, and the script covers
// every line the rules can ask for.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPACES, OUTSIDE, space } from '../../drop/ch1/spaces.js';
import { BEATS, SET_PIECES } from '../../drop/ch1/beats.js';
import { LINES, linesFor } from '../../drop/ch1/script.js';
import { reaction } from '../../drop/disarm.js';
import { LANE } from '../../drop/bosses/expediter.js';

const inside = (sp, [x, , z], margin = 0) => Math.abs(x) <= sp.size[0] / 2 - margin && Math.abs(z) <= sp.size[1] / 2 - margin;
const inBox = (b, [x, , z]) => Math.abs(x - b.at[0]) < b.size[0] / 2 && Math.abs(z - b.at[2]) < b.size[2] / 2;

test('every space stays within the light budget', () => {
  for (const s of SPACES) assert.ok(s.lights.points.length <= 4, `${s.id}: ${s.lights.points.length} point lights`);
});

test('doors lead somewhere real, both ways', () => {
  for (const s of SPACES) for (const d of s.doors) {
    if (OUTSIDE.includes(d.to)) continue;
    const other = space(d.to);
    assert.ok(other, `${d.id} leads to missing space ${d.to}`);
    assert.ok(other.doors.some(o => o.to === s.id), `${d.to} has no door back to ${s.id}`);
  }
});

test('doors, checkpoints and cover sit inside their space', () => {
  for (const s of SPACES) {
    for (const d of s.doors) assert.ok(inside(s, d.at), `${d.id} outside ${s.id}`);
    assert.ok(inside(s, s.checkpoint.at, 0.3), `${s.id} checkpoint`);
    for (const c of s.cover) assert.ok(inside(s, c.at), `${s.id} ${c.kind}`);
  }
});

test('the Expediter\'s pass fits between the fryer lines with room to flank at both ends', () => {
  const s = space('fryerLine');
  const lines = s.cover.filter(c => c.kind === 'fryerLine').sort((a, b) => b.at[2] - a.at[2]);
  assert.equal(lines.length, 2);
  assert.ok(LANE.z < lines[0].at[2] - lines[0].size[2] / 2 && LANE.z > lines[1].at[2] + lines[1].size[2] / 2, 'lane is between the lines');
  const lineEnd = lines[0].at[0] + lines[0].size[0] / 2;
  assert.ok(s.size[0] / 2 - lineEnd >= 1.5, 'at least 1.5 m to walk round the near line');
  assert.ok(LANE.maxX < lineEnd && LANE.minX > -lineEnd, 'he stays behind the line');
});

test('beats use real spaces, real doors, and never more than 10 enemies up at once', () => {
  const doors = new Set(SPACES.flatMap(s => s.doors.map(d => d.id)));
  for (const b of BEATS) {
    const s = space(b.space); assert.ok(s, b.id);
    for (const w of b.waves) {
      assert.ok(w.maxAlive <= 10, `${w.id} maxAlive ${w.maxAlive}`);
      for (const sp of w.spawns) {
        if (sp.door) assert.ok(doors.has(sp.door), `${w.id}: door ${sp.door}`);
        assert.ok(inside(s, sp.at), `${w.id}: spawn at ${sp.at} outside ${s.id}`);
        for (const c of s.cover) assert.ok(!inBox(c, sp.at), `${w.id}: spawn inside ${c.kind}`);
      }
    }
    if (b.ends.startsWith('door:')) assert.ok(doors.has(b.ends.slice(5)), `${b.id} ends at a missing door`);
  }
});

test('the beats run in order through the spaces, starting at the counter and ending at the street', () => {
  assert.deepEqual(BEATS.map(b => b.space), ['counter', 'fryerLine', 'freezer', 'fryerLine', 'dock']);
  assert.equal(BEATS.at(-1).ends, 'door:dock>street');
  assert.equal(SET_PIECES.bounty.on, BEATS[1].enter);
});

/** every trigger the data and the rules modules can fire */
function knownTriggers() {
  const t = new Set();
  for (const b of BEATS) {
    t.add(b.enter); t.add(b.ends);
    for (const e of b.events) t.add(e.id);
    for (const w of b.waves) { t.add(w.id); t.add(w.id + ':cleared'); }
  }
  for (const sp of Object.values(SET_PIECES)) t.add(sp.done);
  for (const k of ['bagStolen', 'bagRecovered', 'bagLost', 'stunned', 'recovered.adrenaline', 'recovered.slap',
    'expediter.intro', 'expediter.staggered', 'expediter.enraged', 'expediter.defeated']) t.add(k);
  for (const type of ['lineCook', 'pistolCook', 'kitchenGunner', 'grabber']) t.add('crawl.' + type);
  for (const r of ['flee', 'beg', 'rushBareHanded', 'pickUp']) for (const type of ['lineCook', 'pistolCook', 'kitchenGunner']) t.add(`disarm.${r}.${type}`);
  return t;
}

test('every line hangs on a trigger that exists', () => {
  const t = knownTriggers();
  for (const l of LINES) assert.ok(t.has(l.on), `"${l.text}" is on unknown trigger ${l.on}`);
});

test('every disarm reaction a chapter 1 enemy can have has a line', () => {
  const situations = [{ distToPlayer: 8, weaponDist: 1, alliesNearby: 2 }, { distToPlayer: 1, weaponDist: 9, alliesNearby: 0 }, { distToPlayer: 5, weaponDist: 9, alliesNearby: 1 }];
  for (const type of ['lineCook', 'pistolCook', 'kitchenGunner']) for (const hp of [1, 0.2]) for (const s of situations) {
    const r = reaction({ id: 'x', type: /** @type {any} */ (type), weapon: 'pistol', gunHand: 'R', hp }, s);
    assert.ok(linesFor(`disarm.${r}.${type}`).length, `no line for disarm.${r}.${type}`);
  }
});

test('the boss, the bag, stuns and every crawling enemy type have lines in both modes', () => {
  for (const on of ['expediter.intro', 'expediter.enraged', 'expediter.defeated', 'expediter.staggered', 'bagStolen', 'bagRecovered', 'bagLost',
    'crawl.lineCook', 'crawl.pistolCook', 'crawl.kitchenGunner', 'crawl.grabber']) {
    assert.ok(linesFor(on, 'solo').length, `solo: ${on}`); assert.ok(linesFor(on, 'coop').length, `coop: ${on}`);
  }
  assert.ok(linesFor('stunned', 'solo').length && linesFor('stunned', 'coop').length);
  assert.ok(linesFor('recovered.slap', 'coop').length);
  assert.equal(linesFor('recovered.slap', 'solo').length, 0, 'no slapping in solo');
});

test('lines fit the wrist screen', () => {
  for (const l of LINES) assert.ok(l.text.length <= 90, `${l.text.length} chars: ${l.text}`);
});
