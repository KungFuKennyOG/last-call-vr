// The Expediter: chapter 1's boss, working the pass between the fryer lines behind a steel tray.
// The fight's rules are drop/bosses/expediter.js; this puts a body to them: the big cook, the tray, the pans,
// the wind-up and the swing, and the health bar.
import * as THREE from 'three';
import { bodyMarks, bodyState, poseBody, faceExpression } from '../../actors/index.js';
import { sfxSwing, sfxWhack, sfxDeflect, sfxSplat } from '../../audio/index.js';
import { buzz } from '../../engine/index.js';
import { initialBoss, bossTick, bossHit, bossGunStun, LANE, bossPos } from '../bosses/expediter.js';
import { TYPES } from './enemies.js';

const PART = { head: 'head', body: 'torso', arm: 'arm', leg: 'leg' };

/** @param {{ scene: any, cast: any, enemies: any, fx: any, player: any, G: any }} o */
export function createBoss({ scene, cast, enemies, fx, player, G }) {
  const B = { e: null, state: null, started: false, windup: 0, swingT: 0, throwT: 0 };
  const v = new THREE.Vector3(), from = new THREE.Vector3();
  const mark = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };

  /** Puts him in the pass, waiting; the fight starts on 'expediter:start'. */
  B.spawn = () => {
    B.clear();
    const e = { id: 'expediter', type: 'expediter', kind: 'heavy', def: TYPES.expediter, hp: 99, hits: [], age: 0, alive: true, boss: true, wave: null,
      walk: 0, aim: 0, aiming: false, flinch: 0, vel: new THREE.Vector3(), alert: true, expr: 'neutral', blinkT: 2, scaredT: 0, strafe: 0, mats: null };
    e.mats = cast.matsFor({ side: 'chefSide', pants: 'houndstooth', sleeve: 'chefSleeve' });
    const g = new THREE.Group(); e.group = g; g.position.set(0, 0, LANE.z);
    e.s = 1.38; const inner = new THREE.Group(); inner.scale.setScalar(e.s); g.add(inner); e.inner = inner;
    const J = cast.buildBody(e, inner); Object.assign(e, J, bodyState());
    if (G.cheats.has('bigHeads')) J.head.scale.setScalar(1.8);
    e.weaponMesh = cast.weaponFor(e, J.foreR);
    e.tray = cast.trayFor(J.torso);
    e.tray.traverse(m => { if (m.isMesh) { m.userData = { enemy: e, tray: true, part: 'body', side: '' }; e.hits.push(m); } });
    e.marks = bodyMarks(J, mark);
    scene.add(g); enemies.list.push(e); enemies.hittables.push(...e.hits);
    B.e = e; B.state = initialBoss(7); B.started = false;
    G.hud.boss = { name: 'THE EXPEDITER', hp: 1 }; G.hud.dirty = true;
  };
  B.start = () => { if (B.e) B.started = true; };
  B.clear = () => { if (B.e && B.e.alive) enemies.remove(B.e); B.e = null; B.state = null; G.hud.boss = null; };

  function apply(r) {
    B.state = r.state; const e = B.e;
    for (const o of r.out) {
      if (o.type === 'say') G.say(o.line);
      else if (o.type === 'throwPan') { e.foreR.localToWorld(from.set(0, -.3, 0)); G.projectiles.pan(from.clone(), o.target, o.speed); B.throwT = .45; sfxSwing(from.clone()); }
      else if (o.type === 'windup') { B.windup = .6; sfxSwing(e.group.position.clone().setY(2)); }
      else if (o.type === 'swing') {
        B.windup = 0; B.swingT = .35; sfxWhack();
        const p = bossPos(B.state);
        if (Math.hypot(player.headPos.x - p.x, player.headPos.z - p.z) < o.reach + .2) G.hurtPlayer(2, e);
      }
      else if (o.type === 'blocked') { sfxDeflect(); }
      else if (o.type === 'hurt') { e.flinch = 1; }
      else if (o.type === 'staggered') { e.stunT = o.until - G.chapter.t; G.hud.message('TRAY DOWN', 1); }
      else if (o.type === 'enraged') { G.chapter.fire('expediter:enraged'); fx.popupFront('ENRAGED', '', '#e0162b', 1.1, 1.2); }
      else if (o.type === 'defeated') defeated();
    }
    if (G.hud.boss) { G.hud.boss.hp = B.state.hp; G.hud.dirty = true; G.wristDirty = true; }
  }
  function defeated() {
    const e = B.e;
    G.stats.kills++; G.combat.style(e.group.position.clone().setY(2.6), 'EXPEDITED', 1000);
    G.bt.slowmo(.15, 2.4); buzz('both', 1, 400);
    enemies.remove(e);
    e.torso.getWorldPosition(v);
    enemies.ragdoll(e, v.clone(), new THREE.Vector3(0, .2, -1), 'body', '', 7, false);
    G.hud.boss = null; G.hud.dirty = true;
    G.chapter.fire('expediter:defeated');
  }

  /** A round or a strike lands on him. mult: a cleaver hits like three rounds. */
  B.hit = (part, point, dir, mult = 1) => {
    if (!B.e || !B.state || B.state.defeated) return;
    const shooter = { x: player.headPos.x, z: player.headPos.z };
    let r = { state: B.state, out: [] };
    for (let i = 0; i < mult && !r.state.defeated; i++) { const s = bossHit(r.state, { part: /** @type {any} */ (PART[part] || 'torso'), shooter, t: G.chapter.t }); r = { state: s.state, out: r.out.concat(s.out) }; }
    if (r.out.some(o => o.type === 'blocked')) { fx.sparkBurst(point, 8); fx.popup(point.clone(), 'BLOCKED', '', '#8d8a83', .7, .6); }
    else { fx.spray(point, dir, 14, 3.5, .5); fx.mist(point, .5); sfxSplat(); }
    apply(r);
  };
  /** The tray takes it. */
  B.trayHit = point => { fx.sparkBurst(point, 8); sfxDeflect(); };
  B.gunStun = () => { if (B.state && !B.state.defeated) apply(bossGunStun(B.state, { t: G.chapter.t })); };

  B.update = (dt, t) => {
    const e = B.e; if (!e || !e.alive) return;
    if (B.started && G.state === 'playing') apply(bossTick(B.state, { t: G.chapter.t, dt, player: { x: player.headPos.x, z: player.headPos.z } }));
    if (!e.alive) return;
    const s = B.state, ox = e.group.position.x;
    e.group.position.set(s.x, 0, LANE.z); e.group.rotation.y = s.facing;
    const moving = Math.abs(s.x - ox) > .001;
    poseBody(e, dt, t, moving, false, false);
    // tray up in the left hand, unless he's staggered; the cleaver arm winds up, swings, throws
    const stag = G.chapter.t < s.staggerUntil;
    e.armL.rotation.x = stag ? -.3 : -1.25; e.foreL.rotation.x = stag ? -.2 : -1.3; e.armL.rotation.z = stag ? .1 : -.35;
    e.tray.rotation.x = stag ? 1.1 : 0; e.tray.position.y = stag ? .05 : .35;
    B.windup = Math.max(0, B.windup - dt); B.swingT = Math.max(0, B.swingT - dt); B.throwT = Math.max(0, B.throwT - dt);
    if (B.windup > 0) { e.armR.rotation.x = -2.8; e.foreR.rotation.x = -.6; }
    else if (B.swingT > 0) { const k = B.swingT / .35; e.armR.rotation.x = -2.8 * k + .3 * (1 - k); e.foreR.rotation.x = -.2; }
    else if (B.throwT > 0) { const k = B.throwT / .45; e.armR.rotation.x = -2.4 * k; }
    e.inner.scale.setScalar(e.s * (s.enraged ? 1 + Math.sin(t * 20) * .005 : 1));
    e.scaredT = 0; faceExpression(e, dt, moving, true, cast.setExpr);
    if (s.enraged && e.face) cast.setExpr(e, 'pain');
  };
  return B;
}
