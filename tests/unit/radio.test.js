import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickLines, initialRadio, radioPush, radioTick, lineDuration, MAX_QUEUE, STALE } from '../../drop/radio.js';
import { LINES } from '../../drop/ch1/script.js';

const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

test('different speakers on one trigger play as an exchange, in script order', () => {
  const l = pickLines(LINES, 'expediter.defeated', 'solo', seq(0));
  assert.deepEqual(l.map(x => x.who), ['expediter', 'vee']);
  const b = pickLines(LINES, 'bagStolen', 'solo', seq(0));
  assert.deepEqual(b.map(x => x.who), ['grabber', 'vee', 'mo']);
});

test('lines for the other mode stay out', () => {
  assert.deepEqual(pickLines(LINES, 'pickup:rollerDoor', 'solo', seq(0)).map(x => x.who), ['mo']);
  assert.deepEqual(pickLines(LINES, 'pickup:rollerDoor', 'coop', seq(0)).map(x => x.who), ['dispatch']);
  assert.equal(pickLines(LINES, 'recovered.slap', 'solo', seq(0)).length, 0);
});

test('one speaker\'s variants: one is picked, never the same one twice running', () => {
  const last = {};
  const a = pickLines(LINES, 'crawl.lineCook', 'solo', seq(0), last);
  const b = pickLines(LINES, 'crawl.lineCook', 'solo', seq(0), last);
  assert.equal(a.length, 1); assert.equal(b.length, 1);
  assert.notEqual(a[0].text, b[0].text);
});

test('lines queue and play one at a time for about as long as they take to read', () => {
  let s = radioPush(initialRadio(), pickLines(LINES, 'pickup:enter', 'solo', seq(0)));
  let r = radioTick(s, 0); s = r.state;
  assert.equal(r.started.who, 'app');
  r = radioTick(s, 1); s = r.state; assert.equal(r.started, null, 'still reading the first');
  const d = lineDuration(s.now.text);
  r = radioTick(s, d + .01); s = r.state; assert.equal(r.started.who, 'mo');
  r = radioTick(s, 100); s = r.state; assert.equal(s.now, null);
});

test('a full queue drops enemy barks before radio lines', () => {
  let s = initialRadio();
  s = radioPush(s, [{ who: 'cook', text: 'a', on: 'x', dur: 1 }, { who: 'mo', text: 'b', on: 'x', dur: 1 }, { who: 'cook', text: 'c', on: 'x', dur: 1 },
    { who: 'app', text: 'd', on: 'x', dur: 1 }, { who: 'vee', text: 'e', on: 'x', dur: 1 }, { who: 'mo', text: 'f', on: 'x', dur: 1 }]);
  assert.equal(s.queue.length, MAX_QUEUE);
  assert.deepEqual(s.queue.map(q => q.text), ['b', 'd', 'e', 'f']);
});

test('lines that waited too long in the queue are skipped, not said late', () => {
  let s = radioPush(initialRadio(), [{ who: 'mo', text: 'old news', on: 'x', dur: 1 }], 0);
  s = radioPush(s, [{ who: 'vee', text: 'now', on: 'y', dur: 1 }], STALE + 1);
  const r = radioTick(s, STALE + 1.5);
  assert.equal(r.started.text, 'now');
});
