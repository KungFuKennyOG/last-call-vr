// audio/music.js: the music on/off preference, shared by every page.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadMusicOn, saveMusicOn } from '../../audio/music.js';

const real = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
function fakeStorage(store = {}, { throws = false } = {}) {
  const ls = { getItem: k => { if (throws) throw new Error('blocked'); return k in store ? store[k] : null; },
    setItem: (k, v) => { if (throws) throw new Error('blocked'); store[k] = String(v); } };
  Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true, writable: true });
  return store;
}
afterEach(() => { if (real) Object.defineProperty(globalThis, 'localStorage', real); else delete globalThis.localStorage; });

test('music is on unless it was turned off', () => {
  fakeStorage();
  assert.equal(loadMusicOn(), true);
  fakeStorage({ 'lastcall-music': 'off' });
  assert.equal(loadMusicOn(), false);
  fakeStorage({ 'lastcall-music': 'on' });
  assert.equal(loadMusicOn(), true);
});

test('the choice round-trips through storage', () => {
  const store = fakeStorage();
  saveMusicOn(false); assert.equal(store['lastcall-music'], 'off'); assert.equal(loadMusicOn(), false);
  saveMusicOn(true); assert.equal(loadMusicOn(), true);
});

test('blocked storage means music on, and saving does not throw', () => {
  fakeStorage({}, { throws: true });
  assert.equal(loadMusicOn(), true);
  assert.doesNotThrow(() => saveMusicOn(false));
});
