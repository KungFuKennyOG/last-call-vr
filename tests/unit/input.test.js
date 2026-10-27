// engine/input.js: controller button edges, thumbstick mapping and rumble, with fake controllers (no browser needed).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BTN, pressed, readStick, buzz, controllers } from '../../engine/input.js';

function pad({ buttons = [], axes = [] } = {}) {
  const pulses = [];
  return { buttons: buttons.map(p => ({ pressed: p })), axes, hapticActuators: [{ pulse: (v, ms) => pulses.push([v, ms]) }], pulses };
}
const ctrl = (hand, gamepad) => ({ userData: { hand, gamepad } });

test('pressed fires once on the frame a button goes down', () => {
  const gp = pad({ buttons: [false, false, false, false, false] }), c = ctrl('left', gp);
  assert.equal(pressed(c, BTN.A), false);
  gp.buttons[BTN.A].pressed = true;
  assert.equal(pressed(c, BTN.A), true);
  assert.equal(pressed(c, BTN.A), false, 'held is not a new press');
  gp.buttons[BTN.A].pressed = false;
  assert.equal(pressed(c, BTN.A), false);
  gp.buttons[BTN.A].pressed = true;
  assert.equal(pressed(c, BTN.A), true, 'released and pressed again');
});

test('pressed keeps hands apart and tolerates a missing gamepad', () => {
  const l = ctrl('left', pad({ buttons: [false, false, false, false, false, true] }));
  const r = ctrl('right', pad({ buttons: [false, false, false, false, false, false] }));
  assert.equal(pressed(l, BTN.B), true);
  assert.equal(pressed(r, BTN.B), false);
  assert.equal(pressed(ctrl('right', null), BTN.B), false);
});

test('readStick uses axes 2/3 on Quest and 0/1 on older pads', () => {
  const out = { x: 0, y: 0 };
  assert.equal(readStick(ctrl('left', pad({ axes: [0, 0, .5, -.25] })), out), true);
  assert.deepEqual(out, { x: .5, y: -.25 });
  readStick(ctrl('left', pad({ axes: [.1, .2] })), out);
  assert.deepEqual(out, { x: .1, y: .2 });
  assert.equal(readStick(ctrl('left', null), out), false);
});

test('buzz rumbles the hand asked for, or both', () => {
  const l = pad(), r = pad();
  controllers.length = 0; controllers.push(ctrl('left', l), ctrl('right', r), ctrl('right', null));
  buzz('left', .5, 40);
  assert.deepEqual(l.pulses, [[.5, 40]]); assert.deepEqual(r.pulses, []);
  buzz('both', 1, 90);
  assert.equal(l.pulses.length, 2); assert.deepEqual(r.pulses, [[1, 90]]);
  controllers.length = 0;
});
