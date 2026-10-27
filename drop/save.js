// Saving the old-school way: what a typed code means, and the new code at the end of a chapter.
// Pure rules (no three.js) on top of codes.js and rating.js.
import { decode, encode, newProgress, startChapter, MESSAGES, CHEATS, GOLD } from './codes.js';
import { rateChapter, bestRating, CHAPTER_TUNING } from './rating.js';

/** The chapters this build has. */
export const BUILT = [1];

export const CHEAT_NAMES = { bigHeads: 'BIG HEADS', alwaysSlowMo: 'ALWAYS SLOW-MO', oneHitKills: 'ONE-HIT KILLS' };

/**
 * What a typed code does.
 * @param {string} typed
 * @param {Set<string>} cheats the cheats on now (a cheat code toggles itself)
 * @returns {{ ok: true, kind: 'progress', progress: any, chapter: number, msg: string }
 *   | { ok: true, kind: 'cheat', cheat: string, on: boolean, msg: string }
 *   | { ok: false, msg: string }}
 */
export function useCode(typed, cheats) {
  const r = decode(typed);
  if (r.ok === false) return { ok: false, msg: MESSAGES[r.reason] };
  if (r.kind === 'cheat') {
    const on = !cheats.has(r.cheat);
    return { ok: true, kind: 'cheat', cheat: r.cheat, on, msg: `${CHEAT_NAMES[r.cheat] || r.cheat} ${on ? 'ON' : 'OFF'}` };
  }
  const want = startChapter(r.progress);
  const chapter = BUILT.includes(want) ? want : BUILT[BUILT.length - 1];
  const msg = want === chapter ? `DELIVERED: CHAPTER ${chapter}` : `DELIVERED. CHAPTER ${want} ISN'T BUILT YET: PLAYING ${chapter}`;
  return { ok: true, kind: 'progress', progress: r.progress, chapter, msg };
}

/**
 * The end of a chapter: the rating, the progress it leaves you with, and its code.
 * Replaying an earlier chapter never loses progress: the best rating stays, cleared never goes down.
 * @param {any} progress what you started with (newProgress() for a fresh game)
 * @param {number} chapter 1..7
 * @param {import('./rating.js').ChapterStats} stats
 */
export function finishChapter(progress, chapter, stats) {
  const p = structuredClone(progress || newProgress());
  const rating = rateChapter(stats, CHAPTER_TUNING[chapter]);
  p.cleared = Math.max(p.cleared, chapter);
  for (let i = 0; i < p.cleared; i++) if (!p.ratings[i]) p.ratings[i] = 1; // a chapter skipped past by code still counts as delivered
  p.ratings[chapter - 1] = bestRating(p.ratings[chapter - 1], rating.value);
  return { rating, progress: p, code: encode(p) };
}

/** Stars for a stored rating: '★★★☆☆', with a G for gold. */
export function starsText(value) {
  if (!value) return '-----';
  const n = Math.min(5, value);
  return '*'.repeat(n) + '-'.repeat(5 - n) + (value === GOLD ? ' G' : '');
}

/** One line about a save, for the title screen. */
export function describe(progress) {
  if (!progress || !progress.cleared) return '';
  return `CLEARED ${progress.cleared}/7  CH1 ${starsText(progress.ratings[0])}`;
}

export { newProgress, CHEATS };
