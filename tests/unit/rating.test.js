import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rateChapter, styleScore, bestRating, CHAPTER_TUNING, GOLD_VALUE, STYLE } from '../../drop/rating.js';
import { GOLD } from '../../drop/codes.js';

const ch1 = CHAPTER_TUNING[1];
const clean = { time: 540, kills: 24, headshots: 14, disarms: 4, breachKills: 3, gunStuns: 2, civilians: 0, stuns: 0 };

test('a fast, stylish, clean run is gold', () => {
  const r = rateChapter(clean, ch1);
  assert.equal(r.stars, 5); assert.equal(r.gold, true); assert.equal(r.value, GOLD_VALUE);
});

test('gold value matches the password code', () => assert.equal(GOLD_VALUE, GOLD));

test('five stars but stunned once is not gold', () => {
  const r = rateChapter({ ...clean, stuns: 1, kills: 30 }, ch1);
  assert.equal(r.stars, 5); assert.equal(r.gold, false); assert.equal(r.value, 5);
});

test('five stars over par is not gold', () => {
  const r = rateChapter({ ...clean, time: ch1.par + 30, kills: 40 }, ch1);
  assert.equal(r.gold, false);
});

test('slow runs lose stars, and very slow ones lose all the time score', () => {
  assert.ok(rateChapter({ ...clean, time: ch1.par * 1.5 }, ch1).stars < 5);
  assert.equal(rateChapter({ ...clean, time: ch1.par * 3 }, ch1).timeScore, 0);
});

test('shooting civilians costs stars', () => {
  assert.ok(rateChapter({ ...clean, civilians: 3 }, ch1).stars < rateChapter(clean, ch1).stars);
});

test('the worst run still gets one star', () => {
  const r = rateChapter({ time: 99999, kills: 0, civilians: 20, stuns: 5 }, ch1);
  assert.equal(r.stars, 1); assert.equal(r.score, 0);
});

test('more style never lowers the rating', () => {
  let prev = 0;
  for (let k = 0; k <= 40; k++) {
    const s = rateChapter({ ...clean, kills: k, headshots: Math.floor(k / 2) }, ch1).score;
    assert.ok(s >= prev - 1e-9); prev = s;
  }
});

test('style points add up from the table', () => {
  assert.equal(styleScore({ kills: 2, headshots: 1, disarms: 1 }), 2 * STYLE.kill + STYLE.headshot + STYLE.disarm);
  assert.equal(styleScore({}), 0);
});

test('every chapter has tuning', () => {
  for (let c = 1; c <= 7; c++) assert.ok(CHAPTER_TUNING[c].par > 0 && CHAPTER_TUNING[c].styleTarget > 0, `chapter ${c}`);
});

test('the best rating is kept', () => {
  assert.equal(bestRating(4, 2), 4); assert.equal(bestRating(0, 3), 3); assert.equal(bestRating(5, GOLD_VALUE), GOLD_VALUE);
});
