// The kitchen fights back: shoot a fryer and a grease fire blocks the lane in front of it; grab the extinguisher
// off the wall to put fires out (and choke anyone in the spray), or shoot it for a white cloud.
// The freezer breathes fog from its vent.
import * as THREE from 'three';
import { buzz } from '../../engine/index.js';
import { setPoint } from '../render/ps1.js';
import { actx, now, noise, filt, gain, env, outAt, sfxBreak } from '../../audio/index.js';

const FIRE_SECONDS = 12, FIRE_RADIUS = .55, BURN_EVERY = .6;

/** @param {{ fx: any, player: any, enemies: any, G: any }} o */
export function createHazards({ fx, player, enemies, G }) {
  const H = { fires: [], clouds: [] };
  const v = new THREE.Vector3(), p2 = new THREE.Vector3();
  let burnT = 0, lightOn = false;

  function whoosh(pos, dur, freq) {
    if (!actx) return; const t = now(), out = outAt(pos);
    const n = noise(t, dur), f = filt('lowpass', freq), g = gain(); env(g, t, .05, .7, dur); n.connect(f).connect(g).connect(out);
  }
  /** A round into the oil. */
  H.shootFryer = (f, point) => {
    fx.sparkBurst(point, 6); fx.spray(point, v.set(0, 1, 0), 10, 2.5, .8);
    if (f.burning > 0) return;
    f.burning = FIRE_SECONDS;
    const at = f.group.position;
    // the vat goes up, and burning oil spills along the floor in front of the line
    const spill = [];
    for (let i = 0; i < 4; i++) spill.push({ x: at.x - .9 + i * .6, y: 0, z: at.z + .75, s: .55 + Math.random() * .2 });
    const vat = { x: at.x, y: 1.0, z: at.z, s: .8 };
    for (const s of [vat, ...spill]) { const fire = { ...s, fl: [0, 1, 2, 3, 4, 5].map(() => ({ ph: Math.random() * 6 })), life: FIRE_SECONDS + Math.random() * 2, fryer: f }; fx.fires.push(fire); H.fires.push(fire); }
    whoosh(at.clone().setY(1), 1.4, 900); buzz('both', .6, 160);
    fx.decal(new THREE.Vector3(at.x, 0, at.z + .75), new THREE.Vector3(0, 1, 0), 2.2, 0, 'scorch');
    G.chapter.fire('fryer:shot');
  };
  /** A round into the extinguisher: a white cloud, and anyone close chokes on it. */
  H.burstExtinguisher = ex => {
    if (ex.used) return;
    ex.used = true; ex.group.visible = false;
    cloud(ex.at.clone().setY(.8), 2.8, 5);
    whoosh(ex.at, 1.2, 3200); sfxBreak();
    for (const e of enemies.list) if (e.group.position.distanceTo(ex.at) < 3) { e.stunT = Math.max(e.stunT, 2.5); e.aiming = false; e.scaredT = 2; }
  };
  function cloud(at, size, life) {
    for (let k = 0; k < 4; k++) fx.smokes.push({ x: at.x + (Math.random() - .5) * size * .5, y: at.y, z: at.z + (Math.random() - .5) * size * .5, s: size, col: 0xe8ecf0, life });
  }

  /** Grip next to the wall extinguisher takes it. */
  G.gripHandlers.push((g, pos) => {
    const space = G.chapter.space; if (!space) return false;
    for (const ex of space.extinguishers) {
      if (ex.used) continue;
      p2.copy(ex.at); p2.y += .3;
      if (pos.distanceTo(p2) < .55 || (G.mode() === 'desktop' && Math.hypot(pos.x - ex.at.x, pos.z - ex.at.z) < 1.3)) {
        ex.used = true; ex.group.visible = false; G.arms.hold(g, 'extinguisher'); G.fx.popupFront('EXTINGUISHER', 'HOLD THE TRIGGER', '#ebe8e1', 1, 1.1); return true;
      }
    }
    return false;
  });

  /** Spraying: puts out fires in the cone and chokes cooks caught in it. */
  H.spray = (from, dir, dt) => {
    for (let i = 0; i < 3; i++) fx.addPart(from, v.copy(dir).multiplyScalar(5 + Math.random() * 3).add(p2.randomDirection().multiplyScalar(.9)), 0xe8ecf0, 3 + Math.random() * 3, .5 + Math.random() * .4, .5);
    if (Math.random() < dt * 6) fx.smokes.push({ x: from.x + dir.x * 1.6, y: from.y + dir.y * 1.6, z: from.z + dir.z * 1.6, s: .9, col: 0xe8ecf0, life: 1.4 });
    for (const f of H.fires) { v.set(f.x - from.x, f.y + .3 - from.y, f.z - from.z); const d = v.length(); if (d < 4.5 && v.normalize().dot(dir) > .82) f.life -= dt * 6; }
    for (const e of enemies.list) { v.copy(e.group.position).setY(1.4).sub(from); const d = v.length(); if (d < 4 && v.normalize().dot(dir) > .85) { e.stunT = Math.max(e.stunT, .8); e.aiming = false; e.flinch = 1; } }
    if (Math.random() < dt * 3) whoosh(from, .5, 4200);
  };

  H.update = dt => {
    // fires burn down; the flicker lights the kitchen through point light 3
    for (const f of H.fires.slice()) {
      f.life -= dt;
      if (f.life <= 0) { H.fires.splice(H.fires.indexOf(f), 1); fx.fires.splice(fx.fires.indexOf(f), 1); if (f.fryer && !H.fires.some(o => o.fryer === f.fryer)) f.fryer.burning = 0; fx.smokes.push({ x: f.x, y: f.y, z: f.z, s: 1, col: 0x2a2624, life: 3 }); }
    }
    if (H.fires.length) {
      const a = H.fires[0]; lightOn = true;
      setPoint(3, v.set(a.x, 1.1, a.z), [1.8 + Math.random() * .5, .8 + Math.random() * .2, .2], 5.5);
    } else if (lightOn) { lightOn = false; setPoint(3, v.set(0, -100, 0), [0, 0, 0], 1); }
    // fire hurts: you, every so often; the cooks, fast
    burnT -= dt;
    for (const f of H.fires) {
      if (f.y > .5) continue;
      if (burnT <= 0 && Math.hypot(player.headPos.x - f.x, player.headPos.z - f.z) < FIRE_RADIUS && player.headPos.y - G.player.feetY < 2.2 && G.player.feetY < .3) { G.hurtPlayer(1, null); burnT = BURN_EVERY; }
      for (const e of enemies.list.slice()) {
        if (e.boss || !e.alive) continue;
        if (Math.hypot(e.group.position.x - f.x, e.group.position.z - f.z) < FIRE_RADIUS + .1) {
          e.burnT = (e.burnT || 0) + dt; e.scaredT = 1;
          if (e.burnT > .5) { e.burnT = 0; e.hp -= 1; fx.sparkBurst(e.group.position.clone().setY(1), 6); if (e.hp <= 0) G.combat.kill(e, e.group.position.clone().setY(1.1), v.set(0, .3, 1).normalize(), 'body', ''); }
        }
      }
    }
    if (burnT <= 0) burnT = 0;
    // the freezer vent breathes out cold fog
    const space = G.chapter.space;
    if (space && space.sp.id === 'freezer') { H.ventT = (H.ventT || 0) - dt; if (H.ventT <= 0) { H.ventT = .5; fx.smokes.push({ x: (Math.random() - .5) * 1.4, y: 2.6, z: (Math.random() - .5) * .8, s: 1.6, col: 0xd8e4ee, life: 2.2 }); } }
  };
  H.reset = () => { H.fires.length = 0; burnT = 0; if (lightOn) { lightOn = false; setPoint(3, v.set(0, -100, 0), [0, 0, 0], 1); } };
  return H;
}
