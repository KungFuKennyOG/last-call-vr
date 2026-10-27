// Unit tests run in Node with no browser: `npm test`.
// Only modules that don't import three can be tested here, which is why game rules live in their own pure modules.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { vrSupported, enterVR, SESSION_INIT } from '../../engine/xr.js';

const realNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
function fakeNavigator(value) { Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true }); }
afterEach(() => { Object.defineProperty(globalThis, 'navigator', realNavigator); });

test('vrSupported is false with no WebXR', async () => {
  fakeNavigator({});
  assert.equal(await vrSupported(), false);
});

test('vrSupported asks for immersive-vr and passes the answer on', async () => {
  const asked = [];
  fakeNavigator({ xr: { isSessionSupported: async mode => { asked.push(mode); return true; } } });
  assert.equal(await vrSupported(), true);
  assert.deepEqual(asked, ['immersive-vr']);
});

test('vrSupported is false when the browser throws', async () => {
  fakeNavigator({ xr: { isSessionSupported: async () => { throw new Error('blocked'); } } });
  assert.equal(await vrSupported(), false);
});

function fakeRenderer({ foveationThrows = false } = {}) {
  const calls = [];
  return {
    calls,
    xr: {
      setReferenceSpaceType: t => calls.push(['space', t]),
      setSession: async s => calls.push(['session', s]),
      setFoveation: f => { if (foveationThrows) throw new Error('no foveation'); calls.push(['foveation', f]); },
    },
  };
}

test('enterVR starts a local-floor session with the shared options', async () => {
  const session = { id: 1 }; let opts;
  fakeNavigator({ xr: { requestSession: async (mode, o) => { assert.equal(mode, 'immersive-vr'); opts = o; return session; } } });
  const r = fakeRenderer();
  assert.equal(await enterVR(r, { foveation: 0.5 }), session);
  assert.deepEqual(opts, SESSION_INIT);
  assert.deepEqual(r.calls, [['space', 'local-floor'], ['session', session], ['foveation', 0.5]]);
});

test('enterVR still works when foveation is not supported', async () => {
  fakeNavigator({ xr: { requestSession: async () => ({}) } });
  await assert.doesNotReject(enterVR(fakeRenderer({ foveationThrows: true })));
});

test('enterVR rejects when the browser refuses the session', async () => {
  fakeNavigator({ xr: { requestSession: async () => { throw new Error('NotAllowedError'); } } });
  await assert.rejects(enterVR(fakeRenderer()), /NotAllowedError/);
});
