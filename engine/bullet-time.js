// The game clock: how fast the world runs this frame. Two things slow it down:
//  - bullet time, which the player turns on and off and which drains a meter
//  - short slow-mo bursts the game triggers on big moments (a headshot, a boss going down)
// The player never slows: move and aim with real time, run the world with dt = realDt * bt.scale.
import * as THREE from 'three';

// camera: gets the faint blue sphere around your head while bullet time is on.
// drain: seconds a full meter lasts. refill: meter per second while live (kills add more, see game code).
// btScale: world speed in bullet time. minMeter: the least meter you need to turn it on.
// endWhenIdle: also turn bullet time off whenever the game isn't live (the arena between rounds).
// onStart / onEnd: sounds, rumble, HUD. onMuffle(on): duck the mix while anything is slowed.
/**
 * @typedef {object} BulletTimeOptions
 * @property {any} [camera]
 * @property {number} [drain]
 * @property {number} [refill]
 * @property {number} [btScale]
 * @property {number} [minMeter]
 * @property {number} [smoothing]
 * @property {boolean} [endWhenIdle]
 * @property {() => void} [onStart]
 * @property {() => void} [onEnd]
 * @property {(on: boolean) => void} [onMuffle]
 */
/** @param {BulletTimeOptions} [opts] */
export function createBulletTime({
  camera, drain = 5, refill = .02, btScale = .26, minMeter = .15, smoothing = 12,
  endWhenIdle = false, onStart, onEnd, onMuffle = () => {},
} = {}) {
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(.24, 16, 12), new THREE.MeshBasicMaterial({
    color: 0x9db8ff, transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false, depthWrite: false }));
  sphere.renderOrder = 997; sphere.visible = false;
  if (camera) camera.add(sphere);

  let t = 0;
  const bt = {
    meter: 1,       // 0..1
    active: false,  // player bullet time on
    slowT: 0,       // seconds left on the current slow-mo burst
    slowScale: 1,   // world speed during that burst
    scale: 1,       // world speed right now, eased toward the target
    sphere,

    // player button: on if there's meter and the game is live, off if already on
    toggle(live) {
      if (bt.active) { bt.end(); return; }
      if (bt.meter < minMeter || !live) return;
      bt.active = true; onMuffle(true); if (onStart) onStart();
    },
    end() {
      if (!bt.active) return;
      bt.active = false; if (onEnd) onEnd();
      if (bt.slowT <= 0) onMuffle(false);
    },
    // a burst: the slowest scale asked for wins, the longest duration wins
    slowmo(scale, dur) {
      bt.slowScale = Math.min(bt.slowT > 0 ? bt.slowScale : 1, scale);
      bt.slowT = Math.max(bt.slowT, dur);
      onMuffle(true);
    },
    // once per frame with real time; live = the game is being played (refills the meter). Returns the world speed.
    update(realDt, live) {
      t += realDt;
      let target = 1;
      if (bt.slowT > 0) { bt.slowT -= realDt; target = bt.slowScale; if (bt.slowT <= 0) { bt.slowScale = 1; onMuffle(bt.active); } }
      if (bt.active) { target = Math.min(target, btScale); bt.meter -= realDt / drain; if (bt.meter <= 0) { bt.meter = 0; bt.end(); } }
      else if (live) bt.meter = Math.min(1, bt.meter + realDt * refill);
      if (endWhenIdle && !live) bt.end();
      sphere.visible = bt.active; sphere.material.opacity = bt.active ? .07 + .02 * Math.sin(t * 3) : 0;
      bt.scale += (target - bt.scale) * Math.min(1, realDt * smoothing);
      return bt.scale;
    },
  };
  return bt;
}
