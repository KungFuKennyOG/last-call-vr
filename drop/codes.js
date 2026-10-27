// Password codes: the whole save, as 8 characters you can read off a headset and type on a phone.
// Pure module (no three.js), so it runs in Node tests and in the browser alike.
//
// Layout: 7 data characters (35 bits) + 1 check character, shown as XXXX-XXXX.
//   cleared   3 bits  chapters cleared, 0..7 (7 = the whole night)
//   ratings   7 × 3   best rating per chapter: 0 = none, 1..5 stars, 6 = gold five stars
//   endings   3 bits  one bit each: cash out, hand it in, burn it
//   version   2 bits  0 for now
//   spare     6 bits  must be 0
// The data characters are scrambled with a fixed key and a running mix in both directions, so a small change
// in progress reshuffles the whole code and early codes don't all look alike.
// The check character is Luhn mod 32: every single-character typo is caught, and so are most swaps.

/** 32 symbols with no look-alikes: no 0, O, 1 or I. L stays, since nothing left looks like it. */
export const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const CHAPTERS = 7;
export const ENDINGS = /** @type {const} */ (['cashOut', 'handItIn', 'burnIt']);
export const GOLD = 6;

const N = 32, DATA = 7, VERSION = 0;
const KEY = [19, 6, 27, 11, 30, 2, 23];
const fwd = v => (v * 7 + 3) % N, back = v => (v * 11 + 5) % N;
/** Typed characters that mean something else. */
const ALIASES = { O: null, 0: null, I: 'L', 1: 'L' };

/** Cheat codes are checked before anything is decoded, so they can use any letters. They never change progress. */
export const CHEATS = {
  BIGHEADS: 'bigHeads',
  SLOWSLOW: 'alwaysSlowMo',
  ONEHITKO: 'oneHitKills',
};

/**
 * @typedef {{ cleared: number, ratings: number[], endings: { cashOut: boolean, handItIn: boolean, burnIt: boolean } }} Progress
 * @typedef {{ ok: true, kind: 'progress', progress: Progress }
 *   | { ok: true, kind: 'cheat', cheat: string }
 *   | { ok: false, reason: 'length' | 'character' | 'check' | 'version' | 'range' }} DecodeResult
 */

/** @returns {Progress} a fresh game */
export function newProgress() {
  return { cleared: 0, ratings: Array(CHAPTERS).fill(0), endings: { cashOut: false, handItIn: false, burnIt: false } };
}

/** The chapter a code starts you on (1..7). */
export function startChapter(progress) {
  return Math.min(CHAPTERS, progress.cleared + 1);
}

/** Uppercases and drops spaces and dashes. Lowercase, spaces and the dash are all fine to type. */
export function normalize(code) {
  return String(code).toUpperCase().replace(/[\s-]/g, '');
}

/** @param {Progress} p */
function validate(p) {
  if (!Number.isInteger(p.cleared) || p.cleared < 0 || p.cleared > CHAPTERS) return false;
  if (!Array.isArray(p.ratings) || p.ratings.length !== CHAPTERS) return false;
  for (let i = 0; i < CHAPTERS; i++) {
    const r = p.ratings[i];
    if (!Number.isInteger(r) || r < 0 || r > GOLD) return false;
    if (i >= p.cleared && r !== 0) return false;      // no rating for a chapter you haven't cleared
    if (i < p.cleared && r === 0) return false;       // every cleared chapter has a rating
  }
  const anyEnding = ENDINGS.some(e => p.endings[e]);
  if (anyEnding && p.cleared !== CHAPTERS) return false; // endings only happen at the end of chapter 7
  return true;
}

function checkSymbol(values) {
  let factor = 2, sum = 0;
  for (let i = values.length - 1; i >= 0; i--) {
    const addend = factor * values[i];
    sum += Math.floor(addend / N) + (addend % N);
    factor = factor === 2 ? 1 : 2;
  }
  return (N - (sum % N)) % N;
}

/**
 * @param {Progress} progress
 * @returns {string} like "KV7R-M3XQ"
 */
export function encode(progress) {
  if (!validate(progress)) throw new RangeError('progress is out of range: ' + JSON.stringify(progress));
  // pack most significant first: cleared, ratings, endings, version, spare
  let n = progress.cleared;
  for (const r of progress.ratings) n = n * 8 + r;
  for (const e of ENDINGS) n = n * 2 + (progress.endings[e] ? 1 : 0);
  n = n * 4 + VERSION;
  n = n * 64; // spare bits
  const chunks = [];
  for (let i = DATA - 1; i >= 0; i--) { chunks[i] = n % N; n = Math.floor(n / N); }
  const values = [];
  let prev = 0;
  for (let i = 0; i < DATA; i++) { values[i] = chunks[i] ^ KEY[i] ^ fwd(prev); prev = values[i]; }
  for (let i = DATA - 2; i >= 0; i--) values[i] ^= back(values[i + 1]);
  values.push(checkSymbol(values));
  const s = values.map(v => ALPHABET[v]).join('');
  return s.slice(0, 4) + '-' + s.slice(4);
}

/**
 * @param {string} code what the player typed
 * @returns {DecodeResult}
 */
export function decode(code) {
  const raw = normalize(code);
  if (Object.hasOwn(CHEATS, raw)) return { ok: true, kind: 'cheat', cheat: CHEATS[raw] };
  if (raw.length !== DATA + 1) return { ok: false, reason: 'length' };
  const values = [];
  for (let ch of raw) {
    if (Object.hasOwn(ALIASES, ch)) ch = ALIASES[ch];
    const v = ch == null ? -1 : ALPHABET.indexOf(ch);
    if (v < 0) return { ok: false, reason: 'character' };
    values.push(v);
  }
  const check = values.pop();
  if (checkSymbol(values) !== check) return { ok: false, reason: 'check' };
  for (let i = 0; i < DATA - 1; i++) values[i] ^= back(values[i + 1]);
  let n = 0, prev = 0;
  for (let i = 0; i < DATA; i++) { n = n * N + (values[i] ^ KEY[i] ^ fwd(prev)); prev = values[i]; }
  const spare = n % 64; n = Math.floor(n / 64);
  const version = n % 4; n = Math.floor(n / 4);
  if (version !== VERSION || spare !== 0) return { ok: false, reason: 'version' };
  const endings = { cashOut: false, handItIn: false, burnIt: false };
  for (let i = ENDINGS.length - 1; i >= 0; i--) { endings[ENDINGS[i]] = n % 2 === 1; n = Math.floor(n / 2); }
  const ratings = [];
  for (let i = CHAPTERS - 1; i >= 0; i--) { ratings[i] = n % 8; n = Math.floor(n / 8); }
  const progress = { cleared: n, ratings, endings };
  if (!validate(progress)) return { ok: false, reason: 'range' };
  return { ok: true, kind: 'progress', progress };
}

/** What to show the player for a failed code. */
export const MESSAGES = {
  length: 'UNDELIVERABLE: codes are 8 characters',
  character: 'UNDELIVERABLE: that code has a character codes never use',
  check: 'UNDELIVERABLE: check the code for a typo',
  version: 'UNDELIVERABLE: that code is from another version',
  range: 'UNDELIVERABLE: check the code for a typo',
};
