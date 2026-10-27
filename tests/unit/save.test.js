import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useCode, finishChapter, starsText, describe, newProgress } from '../../drop/save.js';
import { decode, encode } from '../../drop/codes.js';

const good = { time: 300, kills: 30, headshots: 15, disarms: 5, breachKills: 0, gunStuns: 2, civilians: 0, stuns: 0 };

test('finishing chapter 1 from scratch gives a code that decodes to chapter 1 cleared with that rating', () => {
  const r = finishChapter(newProgress(), 1, good);
  assert.equal(r.progress.cleared, 1);
  assert.equal(r.progress.ratings[0], r.rating.value);
  const d = decode(r.code);
  assert.ok(d.ok && d.kind === 'progress');
  assert.deepEqual(d.progress, r.progress);
});

test('replaying never loses progress: best rating kept, cleared never goes down', () => {
  const later = { cleared: 4, ratings: [6, 3, 2, 4, 0, 0, 0], endings: { cashOut: false, handItIn: false, burnIt: false } };
  const r = finishChapter(later, 1, { time: 2000, kills: 1 });
  assert.equal(r.progress.cleared, 4);
  assert.equal(r.progress.ratings[0], 6);
  assert.deepEqual(r.progress.ratings.slice(1, 4), [3, 2, 4]);
});

test('a code for a chapter not built yet starts the last built one, and says so', () => {
  const later = { cleared: 3, ratings: [5, 4, 3, 0, 0, 0, 0], endings: { cashOut: false, handItIn: false, burnIt: false } };
  const r = useCode(encode(later), new Set());
  assert.ok(r.ok && r.kind === 'progress');
  assert.equal(r.chapter, 1);
  assert.match(r.msg, /CHAPTER 4 ISN'T BUILT/);
});

test('a fresh-game code starts chapter 1', () => {
  const r = useCode(encode(newProgress()), new Set());
  assert.ok(r.ok && r.kind === 'progress'); assert.equal(r.chapter, 1); assert.match(r.msg, /CHAPTER 1/);
});

test('cheat codes toggle, with or without the dash, and typos are undeliverable', () => {
  const on = useCode('bigh-eads', new Set());
  assert.ok(on.ok && on.kind === 'cheat' && on.on); assert.equal(on.msg, 'BIG HEADS ON');
  const off = useCode('BIGHEADS', new Set(['bigHeads']));
  assert.ok(off.ok && off.kind === 'cheat' && !off.on);
  const bad = useCode('KV7R-M3X', new Set());
  assert.ok(!bad.ok); assert.match(bad.msg, /UNDELIVERABLE/);
});

test('stars and the title line', () => {
  assert.equal(starsText(0), '-----'); assert.equal(starsText(3), '***--'); assert.equal(starsText(6), '***** G');
  assert.equal(describe(newProgress()), '');
  assert.match(describe(finishChapter(newProgress(), 1, good).progress), /CLEARED 1\/7/);
});
