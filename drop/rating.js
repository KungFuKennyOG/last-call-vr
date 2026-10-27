// The delivery rating at the end of a chapter: 1 to 5 stars, with a gold fifth star for a flawless run.
// Pure math, no three.js. In co-op each courier is rated on their own stats with the same function.
//
// score = 65% style (against the chapter's style target) + 35% time (full marks at par, zero at twice par),
// minus penalties for hitting civilians and getting stunned. Gold = five stars, no stuns, no civilians, under par.

/** Style points. Tune here; nothing else hard-codes them. */
export const STYLE = {
  kill: 100,
  headshot: 60,    // on top of the kill
  disarm: 150,
  breachKill: 120, // killed during a door breach's slow-mo
  gunStun: 50,     // a thrown gun that stuns
};
export const PENALTY = { civilian: 400, stun: 200 };

/** Score cut-offs for 5, 4, 3 and 2 stars. Anything lower is 1 star: you still delivered. */
export const THRESHOLDS = [0.9, 0.75, 0.55, 0.35];

/** Par time (seconds) and style target per chapter. Placeholders until each chapter is playtested. */
export const CHAPTER_TUNING = {
  1: { par: 600, styleTarget: 4000 },
  2: { par: 660, styleTarget: 4500 },
  3: { par: 540, styleTarget: 4000 },
  4: { par: 720, styleTarget: 5500 },
  5: { par: 660, styleTarget: 5000 },
  6: { par: 780, styleTarget: 6000 },
  7: { par: 840, styleTarget: 6500 },
};

/** Value stored in the password code for a gold rating. Matches GOLD in codes.js. */
export const GOLD_VALUE = 6;

/**
 * @typedef {{ time: number, kills: number, headshots: number, disarms: number, breachKills: number, gunStuns: number, civilians: number, stuns: number }} ChapterStats
 * @typedef {{ stars: number, gold: boolean, value: number, score: number, style: number, timeScore: number, penalty: number }} Rating
 */

const clamp01 = x => Math.max(0, Math.min(1, x));

/** @param {Partial<ChapterStats>} s */
export function styleScore(s) {
  return (s.kills || 0) * STYLE.kill + (s.headshots || 0) * STYLE.headshot + (s.disarms || 0) * STYLE.disarm
    + (s.breachKills || 0) * STYLE.breachKill + (s.gunStuns || 0) * STYLE.gunStun;
}

/**
 * @param {Partial<ChapterStats>} stats
 * @param {{ par: number, styleTarget: number }} tuning
 * @returns {Rating}
 */
export function rateChapter(stats, tuning) {
  const style = styleScore(stats);
  const time = stats.time ?? Infinity;
  const timeScore = clamp01(2 - time / tuning.par);
  const penalty = ((stats.civilians || 0) * PENALTY.civilian + (stats.stuns || 0) * PENALTY.stun) / tuning.styleTarget;
  const score = Math.max(0, 0.65 * clamp01(style / tuning.styleTarget) + 0.35 * timeScore - penalty);
  let stars = 1;
  for (let i = 0; i < THRESHOLDS.length; i++) if (score >= THRESHOLDS[i]) { stars = 5 - i; break; }
  const gold = stars === 5 && !stats.stuns && !stats.civilians && time <= tuning.par;
  return { stars, gold, value: gold ? GOLD_VALUE : stars, score, style, timeScore, penalty };
}

/** Keeps the better of two stored ratings (0 = never rated). */
export function bestRating(oldValue, newValue) {
  return Math.max(oldValue || 0, newValue || 0);
}
