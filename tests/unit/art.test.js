import { test } from 'node:test';
import assert from 'node:assert/strict';
import { image, rect, px, parse, text, textWidth, FONT, grain } from '../../drop/art/pixels.js';
import { FACES, faceRows } from '../../drop/art/faces.js';
import { TEXTURES, face, bountyScreen, neon, hairnet } from '../../drop/art/textures.js';
import { PAL } from '../../drop/art/palette.js';
import { ALPHABET } from '../../drop/codes.js';

test('colors parse in every form the art uses', () => {
  assert.deepEqual(parse('#fff'), [255, 255, 255, 1]);
  assert.deepEqual(parse('#e8631c'), [232, 99, 28, 1]);
  assert.deepEqual(parse('rgba(18,10,6,0.55)'), [18, 10, 6, 0.55]);
  for (const c of Object.values(PAL)) assert.doesNotThrow(() => parse(c), c);
});

test('rect fills, blends and clips', () => {
  const i = image(4, 4);
  rect(i, '#ff0000', -2, -2, 4, 4);
  assert.deepEqual(px(i, 1, 1), [255, 0, 0, 255]);
  assert.deepEqual(px(i, 2, 2), [0, 0, 0, 0]);
  rect(i, 'rgba(0,0,255,0.5)', 0, 0, 1, 1);
  assert.deepEqual(px(i, 0, 0), [128, 0, 128, 255]);
});

test('every face and expression is a full 16×16 grid using only its palette', () => {
  for (const [who, f] of Object.entries(FACES)) {
    for (const expr of ['neutral', 'hurt', 'scared', 'dazed']) {
      const rows = faceRows(/** @type {any} */ (who), /** @type {any} */ (expr));
      assert.equal(rows.length, 16, `${who} ${expr}`);
      rows.forEach((r, y) => {
        assert.equal(r.length, 16, `${who} ${expr} row ${y}: "${r}"`);
        for (const ch of r) assert.ok(f.pal[ch], `${who} ${expr} row ${y} uses "${ch}" with no color`);
      });
    }
  }
});

test('expressions change the face, and only where they say', () => {
  for (const who of ['mo', 'vee', 'cook']) {
    const base = faceRows(/** @type {any} */ (who));
    for (const expr of ['hurt', 'scared', 'dazed']) {
      const e = faceRows(/** @type {any} */ (who), /** @type {any} */ (expr));
      const changed = e.map((r, i) => r !== base[i]).filter(Boolean).length;
      assert.ok(changed >= 2, `${who} ${expr} changes ${changed} rows`);
      assert.equal(e[0], base[0], 'the top of the head stays');
    }
  }
  assert.throws(() => faceRows('mo', /** @type {any} */ ('smug')));
});

test('a face texture puts Mo\'s eye where the grid says', () => {
  const f = face('mo');
  assert.deepEqual(px(f, 4, 6).slice(0, 3), [0xd8, 0xcf, 0xc0]); // eye white
  assert.deepEqual(px(f, 5, 6).slice(0, 3), [0x1a, 0x0f, 0x0a]); // pupil
});

test('the pixel font covers the code alphabet and the script\'s punctuation', () => {
  for (const ch of ALPHABET + '0123456789 #$!.-:/+?,\'') if (ch !== ' ') assert.ok(FONT[ch], `no glyph for ${ch}`);
  for (const g of Object.values(FONT)) assert.equal(g.length, 15);
  assert.equal(textWidth('GOFR'), 15); assert.equal(textWidth('GOFR', 2), 30); assert.equal(textWidth(''), 0);
  const i = image(8, 6); text(i, 'l', 0, 0, '#fff');
  assert.equal(px(i, 0, 4)[3], 255, 'lowercase draws as uppercase L');
});

test('every texture paints at an art-direction size, fully opaque unless it is a cut-out', () => {
  const cutouts = new Set(['hairnet', 'neon']);
  for (const [name, paint] of Object.entries(TEXTURES)) {
    const img = /** @type {any} */ (paint)();
    assert.ok(img.w >= 4 && img.w <= 64 && img.h >= 4 && img.h <= 64, `${name} is ${img.w}×${img.h}`);
    let clear = 0; for (let k = 3; k < img.data.length; k += 4) if (img.data[k] < 128) clear++;
    if (cutouts.has(name)) assert.ok(clear > 0, `${name} should have holes`); else assert.equal(clear, 0, `${name} has ${clear} clear pixels`);
  }
});

test('textures are the same every time', () => {
  for (const [name, paint] of Object.entries(TEXTURES)) assert.deepEqual(/** @type {any} */ (paint)().data, /** @type {any} */ (paint)().data, name);
  const a = image(8, 8, '#808080'), b = image(8, 8, '#808080'); grain(a, 20, 3); grain(b, 20, 4);
  assert.notDeepEqual(a.data, b.data, 'different seeds, different grain');
});

test('the bounty screen has its white title and the hairnet and neon are mostly see-through', () => {
  const b = bountyScreen();
  let white = 0; for (let x = 0; x < 64; x++) for (let y = 2; y < 7; y++) { const p = px(b, x, y); if (p[0] > 250 && p[1] > 250 && p[2] > 250) white++; }
  assert.ok(white > 20, 'BOUNTY is written across the top');
  for (const img of [hairnet(), neon()]) { let clear = 0; for (let k = 3; k < img.data.length; k += 4) if (!img.data[k]) clear++; assert.ok(clear / (img.w * img.h) > 0.3); }
});
