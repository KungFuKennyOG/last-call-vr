// The Kitchen's crew in the fight: spawning, noticing you, chasing, shooting, swinging, grabbing the bag,
// and the in-character reactions after a disarm (flee, beg, rush you bare-handed, go back for the gun).
// Bodies come from render/cast.js; animation, wounds and ragdolls from the shared actors/ modules.
import * as THREE from 'three';
import { bodyMarks, bodyState, createRagdolls, poseBody, faceExpression } from '../../actors/index.js';
import { sfxSwing, sfxEnemyShot, sfxMoan, sfxCrunch, sfxSpurt, outAt, actx, now, osc, filt, gain, env } from '../../audio/index.js';
import { grabberIntent } from '../bag.js';
import { OUTFITS } from '../render/cast.js';

/** Seconds a grabber has to hold the bag before he can get away with it: long enough for a chase. */
export const GRAB_RUN = 3.5;

/** Per type: health in hits, walking speed, seconds between shots, burst size, points. */
export const TYPES = {
  lineCook: { hp: 2, speed: 3.0, fire: 0, score: 150 },
  pistolCook: { hp: 2, speed: 1.5, fire: 2.6, score: 100 },
  kitchenGunner: { hp: 3, speed: 1.3, fire: 3.1, burst: 5, score: 220 },
  grabber: { hp: 2, speed: 3.5, fire: 0, score: 200 },
  expediter: { hp: 99, speed: 0, fire: 0, score: 1000 },
};

/**
 * @param {{ scene: any, world: any, cast: any, fx: any, player: any, G: any }} o
 *   G: the game, for G.hurtPlayer, G.bag, G.projectiles, G.state, G.cheats, G.space
 */
export function createEnemies({ scene, world, cast, fx, player, G }) {
  const E = { list: [], hittables: [] };
  const v = new THREE.Vector3(), eye = new THREE.Vector3(), goal = new THREE.Vector3(), tgt = new THREE.Vector3(), fwdE = new THREE.Vector3();
  const mark = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };

  let nextId = 1;
  E.spawn = (type, at, wave, idle) => {
    const def = TYPES[type], o = OUTFITS[type];
    const e = { id: 'e' + nextId++, type, kind: o.kind, def, hp: def.hp, hits: [], age: 0, alive: true, wave, stop: 4 + Math.random() * 3, strafe: Math.random() * 6.28,
      walk: 0, aim: 0, aiming: false, flinch: 0, fireT: 1 + Math.random() * 1.2, attackT: 0, vel: new THREE.Vector3(), alert: !idle, idle: !!idle,
      weapon: o.weapon === 'smg' ? 'mg' : o.weapon, gunHand: 'R', expr: 'neutral', blinkT: 1 + Math.random() * 3, scaredT: 0, los: false, losT: Math.random() * .3,
      mats: cast.matsFor(o), barkT: 2 + Math.random() * 4, reaction: null };
    const g = new THREE.Group(); e.group = g; g.position.set(at[0], 0, at[2]);
    const s = o.scale * (.96 + Math.random() * .08); e.s = s;
    const inner = new THREE.Group(); inner.scale.setScalar(s); g.add(inner); e.inner = inner;
    const J = cast.buildBody(e, inner);
    if (G.cheats.has('bigHeads')) J.head.scale.setScalar(1.8);
    Object.assign(e, J, bodyState());
    e.weaponMesh = cast.weaponFor(e, J.foreR);
    if (e.weaponMesh) e.weaponMesh.traverse(m => { if (m.isMesh) e.hits.push(m); });
    e.muzzle = mark(J.foreR, 0, o.weapon === 'smg' ? -.58 : -.53, .02);
    e.marks = bodyMarks(J, mark);
    g.rotation.y = Math.atan2(player.headPos.x - at[0], player.headPos.z - at[2]) + (idle ? Math.PI : 0);
    e.idleYaw = g.rotation.y;
    scene.add(g); E.list.push(e); E.hittables.push(...e.hits);
    poseBody(e, 0, 0, false, false, false);
    return e;
  };
  E.remove = e => {
    e.alive = false; scene.remove(e.group);
    const set = new Set(e.hits); E.hittables = E.hittables.filter(h => !set.has(h)); E.list = E.list.filter(x => x !== e);
  };
  /** The weapon leaves the hand: hide it and stop it taking hits. Rearming brings it back. */
  E.unarm = e => {
    if (!e.weaponMesh) return;
    e.weaponMesh.visible = false;
    const ws = new Set(); e.weaponMesh.traverse(m => { if (m.isMesh) ws.add(m); });
    e.hits = e.hits.filter(h => !ws.has(h)); E.hittables = E.hittables.filter(h => !ws.has(h));
  };
  E.rearm = (e, weapon) => {
    e.weapon = weapon; e.reaction = null; e.kind = OUTFITS[e.type].kind;
    if (!e.weaponMesh) return;
    e.weaponMesh.visible = true;
    e.weaponMesh.traverse(m => { if (m.isMesh) { e.hits.push(m); E.hittables.push(m); } });
  };
  E.clear = () => { E.list.slice().forEach(E.remove); ragdolls.slice().forEach(removeRagdoll); };

  /* ---------- ragdolls ---------- */
  const R = createRagdolls({
    scene, headPos: player.headPos, groundAt: world.groundAt, pushOut: world.pushOut,
    buildHead: cast.buildHead, faceMats: cast.faceMats, capGeo: cast.capGeo, rbox: cast.rbox, cylGeo: cast.cylGeo, boxGeo: cast.boxGeo, torsoRagGeo: cast.torsoRagGeo,
    shoeMat: cast.shoeMat, beltMat: cast.beltMat, stumpMat: cast.stumpMat, gunMat: cast.gunMat, ENEMY_GUN: cast.ENEMY_GUN,
    decal: fx.decal, spray: fx.spray, mist: fx.mist, sfxMoan, sfxCrunch, sfxSpurt,
    bakeRag: () => {}, unbakeRag: r => { if (r.rag) r.rag.synced = false; }, // one merged mesh per body, see render/cast.js
    addHittables: (...ms) => E.hittables.push(...ms), removeHittables: set => { E.hittables = E.hittables.filter(h => !set.has(h)); },
    forceMul: () => G.forceMul || 1, onBledOut: r => { if (G.onBledOut) G.onBledOut(r); },
  });
  const { ragdolls, removeRagdoll } = R;
  E.R = R;
  /** Turns a dead or dying enemy into a ragdoll; type and wave ride along for crawl lines and wave counts. */
  E.ragdoll = (e, point, dir, part, side, force, living) => {
    const r = R.makeRagdoll(e, point, dir, part, side, force * 1.3, living);
    cast.syncRag(r, scene);
    r.type = e.type; r.wave = e.wave; r.crawlT = 1 + Math.random() * 2;
    if (ragdolls.length > 10) { const old = ragdolls.find(x => !x.living && x !== r); if (old) removeRagdoll(old); }
    return r;
  };

  /* ---------- awareness ---------- */
  E.alertOne = (e, delay) => {
    if (!e.alive || e.alert || e.idle) return;
    if (delay) { e.alertIn = e.alertIn > 0 ? Math.min(e.alertIn, delay) : delay; return; }
    e.alert = true; e.alertIn = 0; bark(e);
    for (const o of E.list) if (o !== e && !o.alert && o.group.position.distanceTo(e.group.position) < 10) E.alertOne(o, .3 + Math.random() * .5);
  };
  E.noise = (pos, r) => { for (const e of E.list) { const d = e.group.position.distanceTo(pos); if (d < r) E.alertOne(e, .15 + d * .04); } };
  /** The idle ones of a wave wake up (after a set piece). */
  E.wake = wave => { for (const e of E.list) if (e.wave === wave && e.idle) { e.idle = false; e.alert = true; e.fireT = .8 + Math.random(); } };
  /** Idle ones stop what they're doing and look at you. */
  E.turnToPlayer = () => { for (const e of E.list) if (e.idle) e.turnTo = true; };
  function perceive(e, dt, dist) {
    if (e.alertIn > 0) { e.alertIn -= dt; if (e.alertIn <= 0) { e.alertIn = 0; E.alertOne(e); } return; }
    if (!e.los || dist > 24) { e.notice = Math.max(0, (e.notice || 0) - dt * .5); return; }
    fwdE.set(Math.sin(e.group.rotation.y), 0, Math.cos(e.group.rotation.y)); v.set(player.headPos.x - e.group.position.x, 0, player.headPos.z - e.group.position.z).normalize();
    if (fwdE.dot(v) < .2 && dist > 4.5) return;
    e.notice = (e.notice || 0) + dt * (dist < 8 ? 2.4 : 1.2);
    if (e.notice > .55) E.alertOne(e);
  }
  function bark(e) {
    if (!actx) return;
    const t = now(), out = outAt(e.group.position.clone().setY(1.6)), o = osc('sawtooth', (e.type === 'expediter' ? 85 : 135) + Math.random() * 30, t, .28);
    o.frequency.linearRampToValueAtTime(o.frequency.value * 1.35, t + .08);
    const f1 = filt('bandpass', 700, 6), g = gain(); env(g, t, .02, .3, .26); o.connect(f1); f1.connect(g); g.connect(out);
  }

  /* ---------- moving and fighting ---------- */
  const exits = () => (G.space ? G.space.doors.map(d => /** @type {[number, number, number]} */ ([d.at.x + d.inward[0] * .4, 0, d.at.z + d.inward[1] * .4])) : []);
  /** A step toward (gx, gz) round the cover: straight when the way is clear, else down a distance field. */
  function steer(e, gx, gz, speed, dt, toPlayer) {
    const p = e.group.position;
    e.navT = (e.navT || 0) - dt;
    if (e.navT <= 0 || !e.navGoal) {
      e.navT = .2; e.navGoal = e.navGoal || new THREE.Vector3();
      if (world.segClear(p.x, p.z, gx, gz)) e.navGoal.set(gx, 0, gz);
      else if (toPlayer && world.navStep('pl', p, e.navGoal)) { /* down the shared field toward you */ }
      else { world.navField(e.id, gx, gz); if (!world.navStep(e.id, p, e.navGoal)) e.navGoal.set(gx, 0, gz); }
    }
    const dx = e.navGoal.x - p.x, dz = e.navGoal.z - p.z, d = Math.max(.01, Math.hypot(dx, dz));
    return [dx / d * speed * dt, dz / d * speed * dt, Math.atan2(dx, dz)];
  }
  function separate(e, out, dt) {
    const p = e.group.position;
    for (const o of E.list) {
      if (o === e || !o.alive) continue;
      const sx = p.x - o.group.position.x, sz = p.z - o.group.position.z, sd = sx * sx + sz * sz;
      if (sd < 1.2 && sd > 1e-4) { const l = Math.sqrt(sd), f = (1.1 - l) * 1.8 * dt / l; out[0] += sx * f; out[1] += sz * f; }
    }
  }
  function melee(e, reach, dmg) {
    e.attackT = 1.1; e.swing = 1; sfxSwing(e.group.position.clone().setY(1.4));
    setTimeout(() => {
      if (!e.alive || G.state !== 'playing') return;
      if (Math.hypot(player.headPos.x - e.group.position.x, player.headPos.z - e.group.position.z) < reach) G.hurtPlayer(dmg, e);
    }, 200);
  }

  E.update = (dt, t) => {
    const live = G.state === 'playing';
    if (live && world.nav.ready) { E.navT = (E.navT || 0) - dt; if (E.navT <= 0) { E.navT = .25; world.navField('pl', player.headPos.x, player.headPos.z); } }
    for (const e of E.list.slice()) { if (e.alive && !e.boss) updateOne(e, dt, t, live); }
    for (const r of ragdolls.slice()) {
      R.updateRagdoll(r, dt); cast.syncRag(r, scene);
      if (r.living) { r.crawlT -= dt; if (r.crawlT <= 0) { r.crawlT = 5 + Math.random() * 4; if (G.say) G.say('crawl.' + r.type); } }
    }
  };

  function updateOne(e, dt, t, live) {
    e.age += dt; e.stunT = Math.max(0, e.stunT - dt);
    const p = e.group.position, s = e.s, ox = p.x, oz = p.z;
    tgt.copy(player.headPos);
    const dx = tgt.x - p.x, dz = tgt.z - p.z, dist = Math.max(.01, Math.hypot(dx, dz));
    e.losT -= dt;
    if (e.losT <= 0) { e.losT = .3; eye.set(p.x, 1.62 * s, p.z); e.los = world.canSee(eye, tgt); }
    if (!e.alert && !e.idle && live) perceive(e, dt, dist);
    const active = live && e.alert && e.stunT <= 0 && !G.ignored;
    let moving = false; const mv = [0, 0]; let face = Math.atan2(dx, dz);
    const limp = e.legHurt.L || e.legHurt.R, sp = (limp ? .55 : 1) * e.def.speed;
    const rc = e.reaction;
    if (e.idle) {
      face = e.turnTo ? Math.atan2(dx, dz) : e.idleYaw;
      e.group.rotation.y += (wrap(face - e.group.rotation.y)) * Math.min(1, dt * (e.turnTo ? 5 : 1));
      poseBody(e, dt, t, false, false, false); faceExpression(e, dt, false, false, cast.setExpr); return;
    }
    if (active && rc === 'flee') {
      const ex = exits(); let best = null, bd = 1e9;
      for (const x of ex) { const d = Math.hypot(x[0] - p.x, x[2] - p.z) - Math.hypot(x[0] - tgt.x, x[2] - tgt.z) * .5; if (d < bd) { bd = d; best = x; } }
      if (best) { const [mx, mz, f] = steer(e, best[0], best[2], sp * 1.1, dt); mv[0] = mx; mv[1] = mz; face = f; moving = true; e.scaredT = 1;
        if (Math.hypot(best[0] - p.x, best[2] - p.z) < .6) { G.enemyGone(e, 'fled'); return; } }
    } else if (active && rc === 'beg') {
      e.scaredT = 1; e.armL.rotation.x = -2.6; e.armR.rotation.x = -2.6;
    } else if (active && rc === 'pickUp' && e.dropped) {
      const w = e.dropped.at;
      const [mx, mz, f] = steer(e, w.x, w.z, sp, dt); mv[0] = mx; mv[1] = mz; face = f; moving = true;
      if (Math.hypot(w.x - p.x, w.z - p.z) < .5) G.rearm(e);
    } else if (active && e.type === 'grabber') {
      const bag = G.bag.state, intent = grabberIntent({ bag, self: { id: e.id, pos: [p.x, 0, p.z] }, players: [{ id: 'p1', pos: [tgt.x, 0, tgt.z] }], exits: exits() });
      const hasIt = bag.holder.kind === 'enemy' && bag.holder.id === e.id;
      e.holdT = hasIt ? (e.holdT || 0) + dt : 0;
      if (intent.action === 'grab') G.bag.grab(e);
      // he has to make a run for it: no slipping out of the door he's standing in the moment he has the bag
      else if (intent.action === 'escape' && e.holdT >= GRAB_RUN) { G.bag.escape(e); return; }
      else if (intent.action === 'escape') { const ax = p.x - tgt.x, az = p.z - tgt.z, l = Math.hypot(ax, az) || 1; const [mx, mz, f] = steer(e, p.x + ax / l * 2, p.z + az / l * 2, sp, dt); mv[0] = mx; mv[1] = mz; face = f; moving = true; }
      else if (intent.target) { const [mx, mz, f] = steer(e, intent.target[0], intent.target[2], sp * (intent.action === 'flee' ? 1.05 : 1), dt); mv[0] = mx; mv[1] = mz; face = f; moving = true; }
    } else if (active && e.kind === 'rusher') {
      if (dist > 1.05) {
        const [mx, mz, f] = steer(e, tgt.x, tgt.z, sp, dt, true); mv[0] = mx; mv[1] = mz; face = f; moving = true;
        if (dist > 3 && e.weapon) { const l = Math.hypot(mx, mz) || 1, w = Math.sin(t * 4.2 + e.strafe) * 1.4 * dt; mv[0] += -mz / l * w; mv[1] += mx / l * w; } // zigzag in
      } else { e.attackT -= dt; if (e.attackT <= 0) melee(e, 1.25, 1); }
    } else if (active) {
      if (dist < 1.2) { e.aiming = false; e.attackT -= dt; if (e.attackT <= 0) melee(e, 1.3, 1); }
      else if (!(e.los && dist <= e.stop)) { const [mx, mz, f] = steer(e, tgt.x, tgt.z, sp, dt, true); mv[0] = mx; mv[1] = mz; face = e.los ? face : f; moving = true; }
      else { e.strafe += dt * .7; const side = Math.cos(e.strafe) * .6 * dt; mv[0] = -dz / dist * side; mv[1] = dx / dist * side; }
      if (e.weapon && e.weapon !== 'cleaver' && e.age > 1 && e.los && dist < e.stop + 7) {
        e.fireT -= dt; if (e.fireT < .55) e.aiming = true;
        if (e.burst > 0) { e.burstT -= dt; if (e.burstT <= 0) { e.burstT = .09; e.burst--; shoot(e, .6); } }
        if (e.fireT <= 0) { e.aiming = false; e.fireT = e.def.fire * (.8 + Math.random() * .5) * (e.armHurt.R ? 1.6 : 1); if (e.def.burst) { e.burst = e.def.burst; e.burstT = 0; } else shoot(e, e.armHurt.R ? .6 : .12); }
      } else e.aiming = false;
    }
    if (active) separate(e, mv, dt);
    if (mv[0] || mv[1]) world.moveEntity(p, mv[0], mv[1], .35, 0);
    e.group.rotation.y += wrap(face - e.group.rotation.y) * Math.min(1, dt * 10);
    if (dt > 0) e.vel.set((p.x - ox) / dt, 0, (p.z - oz) / dt);
    poseBody(e, dt, t, moving, active, limp);
    if (rc === 'beg') { e.armL.rotation.x = -2.6; e.armR.rotation.x = -2.6; e.foreL.rotation.x = -.4; e.foreR.rotation.x = -.4; }
    faceExpression(e, dt, moving, active, cast.setExpr);
    e.barkT -= dt;
  }
  function shoot(e, err) {
    e.muzzle.getWorldPosition(v);
    goal.copy(player.headPos).add(eye.set((Math.random() - .5) * .25, (Math.random() - .5) * .2 - .05, 0)).addScaledVector(eye.randomDirection(), err);
    G.projectiles.fire(v.clone(), goal.clone(), e); fx.sparkBurst(v, 3); sfxEnemyShot(v.clone());
  }
  E.ragdolls = ragdolls;
  return E;
}

const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
