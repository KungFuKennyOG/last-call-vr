import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SURFACES } from '../../drop/art/surfaces.js';
import { px } from '../../drop/art/pixels.js';

test('every surface and prop texture is 4 to 64 pixels across, as the art direction says', () => {
  for (const [name, paint] of Object.entries(SURFACES)) {
    const i = paint();
    assert.ok(i.w >= 4 && i.w <= 64 && i.h >= 4 && i.h <= 64, `${name} is ${i.w}×${i.h}`);
    assert.equal(i.data.length, i.w * i.h * 4, name);
  }
});

test('textures are seeded: same painter, same pixels', () => {
  for (const [name, paint] of Object.entries(SURFACES)) assert.deepEqual(paint().data, paint().data, name);
});

test('only cut-out textures have holes', () => {
  const holes = name => { const i = SURFACES[name](); for (let y = 0; y < i.h; y++) for (let x = 0; x < i.w; x++) if (px(i, x, y)[3] < 128) return true; return false; };
  assert.ok(holes('wire'), 'wire mesh has gaps');
  for (const name of ['ceiling', 'concrete', 'counterFront', 'chefSide', 'tray', 'swingDoor']) assert.ok(!holes(name), name + ' is solid');
});
