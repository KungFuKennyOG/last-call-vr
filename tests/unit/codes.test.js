import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALPHABET, CHAPTERS, GOLD, CHEATS, newProgress, encode, decode, normalize, startChapter } from '../../drop/codes.js';

const sample = () => ({ cleared: 4, ratings: [5, 3, GOLD, 2, 0, 0, 0], endings: { cashOut: false, handItIn: false, burnIt: false } });
const finished = () => ({ cleared: 7, ratings: [5, 4, 3, GOLD, 5, 2, 1], endings: { cashOut: true, handItIn: false, burnIt: true } });

test('alphabet has 32 symbols and no look-alikes', () => {
  assert.equal(ALPHABET.length, 32);
  assert.equal(new Set(ALPHABET).size, 32);
  for (const bad of '0O1I') assert.ok(!ALPHABET.includes(bad), bad);
});

test('codes look like XXXX-XXXX and use only the alphabet', () => {
  const code = encode(sample());
  assert.match(code, /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
});

test('a new game, a mid game and a finished game all round-trip', () => {
  for (const p of [newProgress(), sample(), finished()]) {
    const r = decode(encode(p));
    assert.equal(r.ok, true);
    assert.equal(r.ok && r.kind, 'progress');
    assert.deepEqual(r.ok && r.kind === 'progress' && r.progress, p);
  }
});

test('every valid progress state round-trips (exhaustive over cleared and one rating slot)', () => {
  for (let cleared = 0; cleared <= CHAPTERS; cleared++) {
    for (let r = 1; r <= GOLD; r++) {
      const ratings = Array.from({ length: CHAPTERS }, (_, i) => (i < cleared ? ((i * 3 + r) % GOLD) + 1 : 0));
      const p = { cleared, ratings, endings: { cashOut: cleared === 7 && r % 2 === 0, handItIn: false, burnIt: cleared === 7 && r > 3 } };
      const out = decode(encode(p));
      assert.deepEqual(out.ok && out.kind === 'progress' && out.progress, p, JSON.stringify(p));
    }
  }
});

test('typing is forgiving: lowercase, spaces, missing dash, I and 1 for L', () => {
  const code = encode(sample());
  assert.deepEqual(decode(code.toLowerCase()), decode(code));
  assert.deepEqual(decode(' ' + code.replace('-', ' ') + ' '), decode(code));
  const withL = encode(finished());
  if (withL.includes('L')) assert.deepEqual(decode(withL.replace(/L/g, '1')), decode(withL));
  assert.equal(normalize('ab-cd ef'), 'ABCDEF');
});

test('every single-character typo is rejected', () => {
  for (const p of [newProgress(), sample(), finished()]) {
    const code = normalize(encode(p));
    for (let i = 0; i < code.length; i++) {
      for (const ch of ALPHABET) {
        if (ch === code[i]) continue;
        const typo = code.slice(0, i) + ch + code.slice(i + 1);
        assert.equal(decode(typo).ok, false, `${code} -> ${typo}`);
      }
    }
  }
});

test('most swapped neighbors are rejected', () => {
  let caught = 0, total = 0;
  for (let cleared = 0; cleared <= 6; cleared++) {
    const p = newProgress(); p.cleared = cleared; for (let i = 0; i < cleared; i++) p.ratings[i] = (i % GOLD) + 1;
    const code = normalize(encode(p));
    for (let i = 0; i < code.length - 1; i++) {
      if (code[i] === code[i + 1]) continue;
      total++;
      if (!decode(code.slice(0, i) + code[i + 1] + code[i] + code.slice(i + 2)).ok) caught++;
    }
  }
  assert.ok(caught / total > 0.9, `${caught}/${total}`);
});

test('wrong length, unused characters and nonsense are rejected with a reason', () => {
  assert.deepEqual(decode('ABC'), { ok: false, reason: 'length' });
  assert.deepEqual(decode('ABCD-EFG0'), { ok: false, reason: 'character' });
  assert.deepEqual(decode('ABCD-EFGO'), { ok: false, reason: 'character' });
  let rejected = 0;
  for (let i = 0; i < 2000; i++) {
    let s = ''; for (let k = 0; k < 8; k++) s += ALPHABET[(i * 7919 + k * 104729 + k * k * 31) % 32];
    if (!decode(s).ok) rejected++;
  }
  assert.ok(rejected > 1990, `${rejected}/2000 random codes rejected`);
});

test('cheat codes work with or without a dash and never touch progress', () => {
  assert.deepEqual(decode('BIGH-EADS'), { ok: true, kind: 'cheat', cheat: 'bigHeads' });
  assert.deepEqual(decode('slowslow'), { ok: true, kind: 'cheat', cheat: 'alwaysSlowMo' });
  for (const k of Object.keys(CHEATS)) assert.equal(k.length, 8);
});

test('impossible progress cannot be encoded', () => {
  assert.throws(() => encode({ ...sample(), ratings: [5, 3, GOLD, 2, 4, 0, 0] }), RangeError); // rating past cleared
  assert.throws(() => encode({ ...sample(), ratings: [5, 0, GOLD, 2, 0, 0, 0] }), RangeError); // cleared chapter with no rating
  assert.throws(() => encode({ ...sample(), endings: { cashOut: true, handItIn: false, burnIt: false } }), RangeError); // ending before chapter 7
  assert.throws(() => encode({ ...sample(), cleared: 8 }), RangeError);
});

test('each step of progress changes most of the code', () => {
  const p = newProgress(); let prev = normalize(encode(p)), worst = 8;
  for (let c = 1; c <= CHAPTERS; c++) {
    p.cleared = c; p.ratings[c - 1] = (c % GOLD) + 1;
    const code = normalize(encode(p));
    let diff = 0; for (let i = 0; i < 8; i++) if (code[i] !== prev[i]) diff++;
    worst = Math.min(worst, diff); prev = code;
  }
  assert.ok(worst >= 4, `a step changed only ${worst} characters`);
});

test('start chapter follows progress and caps at 7', () => {
  assert.equal(startChapter(newProgress()), 1);
  assert.equal(startChapter(sample()), 5);
  assert.equal(startChapter(finished()), 7);
});
