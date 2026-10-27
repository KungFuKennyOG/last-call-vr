// The Expediter: chapter 1's boss. Pure rules, no three.js. Same inputs and seed, same fight.
//
// A huge cook working the pass between the two fryer lines. He holds a steel tray as a body shield that blocks
// shots from the front, turns slowly to keep it on you, and throws pans you can shoot out of the air. Flank him
// for full damage (more from behind). Get close and he winds up a cleaver swing you can step away from.
// A thrown gun staggers him and drops the tray for a moment. At 40% health he gets angry: faster turns,
// two pans at a time. Headshots always land, tray or not.
//
// The game calls bossTick() every frame and bossHit() for every bullet that touches him. Both return
// { state, out }: `out` holds what to show and play (throw a pan, wind up, swing, bark).

export const LANE = { z: -3.4, minX: -2.4, maxX: 2.4 };   // the pass runs along x behind the counter line
export const TUNING = {
  walk: 1.1,            // m/s along the pass
  turn: 1.4,            // rad/s; enraged turn is 2.2
  turnEnraged: 2.2,
  shieldArc: 1.05,      // rad either side of facing that the tray covers (60°)
  backArc: 2.3,         // rad from facing beyond which a hit counts as from behind
  throwEvery: 3.0,      // s between pans; 1.8 enraged
  throwEveryEnraged: 1.8,
  throwRange: 3,        // m: closer than this he swings instead of throwing
  panSpeed: 7,          // m/s
  swingRange: 1.8,      // m
  windup: 0.6,          // s of warning before the cleaver comes down
  swingCooldown: 2.0,   // s
  stagger: 1.5,         // s with the tray down after a thrown gun
  enrageAt: 0.4,
  damage: { head: 0.1, torso: 0.05, arm: 0.03, leg: 0.04 },
  backMultiplier: 1.5,
};

/**
 * @typedef {{ x: number, z: number }} P2
 * @typedef {{ hp: number, x: number, facing: number, nextThrow: number, swingAt: number, swingReadyAt: number,
 *   staggerUntil: number, enraged: boolean, defeated: boolean, seed: number, started: boolean }} BossState
 * @typedef {{ type: 'say', line: string }
 *   | { type: 'throwPan', from: P2, target: P2, speed: number }
 *   | { type: 'windup' } | { type: 'swing', reach: number }
 *   | { type: 'blocked', part: string } | { type: 'hurt', part: string, amount: number }
 *   | { type: 'staggered', until: number } | { type: 'enraged' } | { type: 'defeated' }} BossOut
 */

/** @returns {BossState} */
export function initialBoss(seed = 1) {
  return { hp: 1, x: 0, facing: 0, nextThrow: 1.5, swingAt: 0, swingReadyAt: 0, staggerUntil: 0, enraged: false, defeated: false, seed: seed >>> 0 || 1, started: false };
}

/** deterministic random number in [0,1) and the next seed */
function rand(seed) {
  let t = (seed + 0x6D2B79F5) >>> 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { r: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: next };
}
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
/** facing 0 means looking toward +z (out across the counter, at the player's side of the kitchen) */
const angleTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/** Where he stands. */
export const bossPos = s => ({ x: s.x, z: LANE.z });

/** How far the shooter is around him, in radians from the way he faces (0 = straight in front). */
export function shotAngle(s, shooter) {
  return Math.abs(wrap(angleTo(bossPos(s), shooter) - s.facing));
}

/**
 * One frame.
 * @param {BossState} s
 * @param {{ t: number, dt: number, player: P2 }} input
 * @returns {{ state: BossState, out: BossOut[] }}
 */
export function bossTick(s, { t, dt, player }) {
  if (s.defeated) return { state: s, out: [] };
  /** @type {BossOut[]} */ const out = [];
  let st = { ...s };
  if (!st.started) { st.started = true; st.nextThrow = t + 1.5; out.push({ type: 'say', line: 'expediter.intro' }); }
  const T = TUNING, me = bossPos(st), staggered = t < st.staggerUntil;

  // turn slowly toward the player and slide along the pass to match them
  if (!staggered) {
    const want = angleTo(me, player), turn = (st.enraged ? T.turnEnraged : T.turn) * dt;
    const d = wrap(want - st.facing);
    st.facing = wrap(st.facing + Math.max(-turn, Math.min(turn, d)));
    const dx = Math.max(LANE.minX, Math.min(LANE.maxX, player.x)) - st.x;
    st.x += Math.max(-T.walk * dt, Math.min(T.walk * dt, dx));
  }

  // a wound-up swing lands whatever the player does; stepping out of reach is the counter
  if (st.swingAt && t >= st.swingAt) {
    out.push({ type: 'swing', reach: T.swingRange });
    st.swingAt = 0; st.swingReadyAt = t + T.swingCooldown;
  }
  if (staggered) return { state: st, out };

  const d = dist(bossPos(st), player), inFront = shotAngle(st, player) < Math.PI / 2;
  if (!st.swingAt && d <= T.swingRange && inFront && t >= st.swingReadyAt) {
    st.swingAt = t + T.windup; out.push({ type: 'windup' });
  } else if (!st.swingAt && d > T.throwRange && t >= st.nextThrow) {
    const n = st.enraged ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const a = rand(st.seed); st.seed = a.seed;
      const spread = (a.r - 0.5) * (st.enraged ? 1.4 : 0.8); // m of aim error, so pans aren't laser-guided
      out.push({ type: 'throwPan', from: { x: st.x, z: LANE.z }, target: { x: player.x + spread, z: player.z }, speed: T.panSpeed });
    }
    st.nextThrow = t + (st.enraged ? T.throwEveryEnraged : T.throwEvery);
  }
  return { state: st, out };
}

/**
 * A bullet hits him.
 * @param {BossState} s
 * @param {{ part: 'head' | 'torso' | 'arm' | 'leg', shooter: P2, t: number }} hit
 * @returns {{ state: BossState, out: BossOut[] }}
 */
export function bossHit(s, { part, shooter, t }) {
  if (s.defeated) return { state: s, out: [] };
  const T = TUNING, ang = shotAngle(s, shooter), trayUp = t >= s.staggerUntil;
  if (trayUp && part !== 'head' && ang < T.shieldArc) return { state: s, out: [{ type: 'blocked', part }] };
  const amount = T.damage[part] * (ang > T.backArc ? T.backMultiplier : 1);
  const st = { ...s, hp: Math.max(0, s.hp - amount) };
  /** @type {BossOut[]} */ const out = [{ type: 'hurt', part, amount }];
  if (!st.enraged && st.hp <= T.enrageAt && st.hp > 0) { st.enraged = true; out.push({ type: 'enraged' }, { type: 'say', line: 'expediter.enraged' }); }
  if (st.hp <= 0) { st.defeated = true; st.swingAt = 0; out.push({ type: 'defeated' }, { type: 'say', line: 'expediter.defeated' }); }
  return { state: st, out };
}

/**
 * A thrown gun hits him: the tray drops for a moment and any wind-up is cancelled.
 * @param {BossState} s
 * @param {{ t: number }} ev
 */
export function bossGunStun(s, { t }) {
  if (s.defeated) return { state: s, out: [] };
  const until = t + TUNING.stagger;
  return { state: { ...s, staggerUntil: until, swingAt: 0 }, out: [{ type: 'staggered', until }, { type: 'say', line: 'expediter.staggered' }] };
}
