// actors/animate.js: the enemy body poses and expressions, on a fake body made of plain objects.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { poseBody, faceExpression } from '../../actors/animate.js';

const joint = () => ({ rotation: { x: 0, y: 0, z: 0 }, position: { x: 0, y: 0, z: 0 } });
function enemy(over = {}) {
  const e = { kind: 'shooter', flinch: 0, swing: 0, aim: 0, walk: 0, strafe: 0, react: null, dodgeT: 0, stunT: 0, scaredT: 0, blinkT: 2,
    aiming: false, los: false, expr: 'neutral', glint: null, armHurt: { L: false, R: false }, legHurt: { L: 0, R: 0 }, gutHurt: false, ...over };
  for (const k of ['legL', 'legR', 'shinL', 'shinR', 'armL', 'armR', 'foreL', 'foreR', 'torso', 'head', 'inner']) e[k] = joint();
  return e;
}
const set = [];
const setExpr = (e, ex) => { e.expr = ex; set.push(ex); };

test('walking swings the legs opposite ways and bobs the torso', () => {
  const e = enemy();
  poseBody(e, .1, 0, true, false, false);
  assert.ok(e.walk > 0);
  assert.equal(e.legL.rotation.x, -e.legR.rotation.x);
  assert.ok(e.torso.position.y >= .86);
});

test('a gun comes up when standing and fighting, less with a hurt gun arm', () => {
  const a = enemy(), b = enemy({ armHurt: { L: false, R: true } });
  for (let i = 0; i < 60; i++) { poseBody(a, 1 / 60, i / 60, false, true, false); poseBody(b, 1 / 60, i / 60, false, true, false); }
  assert.ok(a.aim > .9);
  assert.ok(b.aim < .6 && b.aim > .4);
});

test('a gut wound pulls the left hand to the stomach', () => {
  const e = enemy({ gutHurt: true });
  poseBody(e, .016, 0, false, false, false);
  assert.equal(e.foreL.rotation.x, -1.55);
  assert.ok(e.armL.rotation.z > 0);
});

test('a hit reaction plays for its duration and then clears', () => {
  const e = enemy({ react: { type: 'gut', t: 0, dur: .5, sx: 1, side: 'R' } });
  poseBody(e, .1, 0, false, false, false);
  assert.ok(e.torso.rotation.x > .3, 'doubles over');
  assert.ok(e.inner.position.y < 0, 'drops');
  for (let i = 0; i < 5; i++) poseBody(e, .1, 0, false, false, false);
  assert.equal(e.react, null);
});

test('expressions: pain when stunned, scared after a death nearby, angry when aiming, and blinking', () => {
  set.length = 0;
  faceExpression(enemy({ stunT: 1 }), .016, false, true, setExpr);
  faceExpression(enemy({ scaredT: 1 }), .016, false, true, setExpr);
  faceExpression(enemy({ aiming: true }), .016, false, true, setExpr);
  faceExpression(enemy({ kind: 'rusher' }), .016, true, true, setExpr);
  faceExpression(enemy({ blinkT: -.05 }), .016, false, false, setExpr);
  assert.deepEqual(set, ['pain', 'scared', 'angry', 'scream', 'neutral_blink']);
});
