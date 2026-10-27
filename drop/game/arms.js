// Your hands: a pistol in each (one in the browser), the Uzi or a cleaver or the extinguisher when you pick one up,
// reloading by pointing at the floor, throwing what you hold, and pistol-whipping with a hard swing.
// The guns are the shared combat/ kit, redrawn in the PS1 material.
import * as THREE from 'three';
import { controllers, setupControllers, buzz } from '../../engine/index.js';
import { createGunKit, createMelee, createThrows, MAG } from '../../combat/index.js';
import { sfxShot, sfxMG, sfxEmpty, sfxReload, sfxRack, sfxSwing, sfxWhack, sfxThud } from '../../audio/index.js';
import { ps1, ps1ify } from '../render/ps1.js';
import { box, cyl, mk } from '../render/geo.js';
import { M, C } from '../render/mats.js';
import { MAX_HP } from './player.js';
import { STYLE } from '../rating.js';

const EXT_SECONDS = 6;

/** @param {{ scene: any, camera: any, rig: any, renderer: any, fx: any, enemies: any, world: any, player: any, wristTex: any, G: any }} o */
export function createArms({ scene, camera, rig, renderer, fx, enemies, world, player, wristTex, G }) {
  const basicC = {}; const basic = c => basicC[c] || (basicC[c] = ps1({ color: c, unlit: true, noFog: true }));
  const kit = createGunKit({ glowTex: fx.glowTex, basic, pipColor: 0xebe8e1, hpColor: 0xe0162b, maxHp: MAX_HP, onChange() { A.sync(); } });
  const { WEAPONS } = kit;
  WEAPONS.cleaver = { name: 'CLEAVER', auto: false, cool: .3, pellets: 0, spread: 0, ammo: 1, kick: 0, force: 1, buzz: [.5, 40], muz: -.2 };
  WEAPONS.extinguisher = { name: 'EXTINGUISHER', auto: true, cool: 0, pellets: 0, spread: 0, ammo: EXT_SECONDS, kick: 0, force: 1, buzz: [.2, 20], muz: -.3 };
  const A = { kit, WEAPONS, muzzleNow: new THREE.Vector3(), thrown: [], flying: [] };
  let lastYaw = 0; const lastRig = new THREE.Vector3();
  const tO = new THREE.Vector3(), tD = new THREE.Vector3(), tQ = new THREE.Quaternion(), vA = new THREE.Vector3();

  function extras(g) {
    const cl = new THREE.Group(); mk(cl, cyl(.017, .017, .12, 6), M('wood'), 0, -.03, .04, Math.PI / 2 - .3, 0, 0); mk(cl, box(.012, .11, .24), M('cleaver'), 0, .03, -.1);
    const ex = new THREE.Group(); mk(ex, cyl(.07, .07, .36, 8), M('extinguisher'), 0, -.05, .02); mk(ex, box(.03, .02, .16), C(0x1b1c1e), 0, .15, -.07);
    const sy = new THREE.Group(); mk(sy, cyl(.018, .018, .14, 6), M('syringe'), 0, 0, -.05, Math.PI / 2, 0, 0); mk(sy, cyl(.003, .003, .06, 4), C(0x8a9197), 0, 0, -.15, Math.PI / 2, 0, 0);
    for (const x of [cl, ex, sy]) { x.visible = false; g.body.add(x); }
    g.cleaverG = cl; g.extG = ex; g.syringeG = sy;
    const pm = new THREE.Group(); g.pistolParts.forEach(m => pm.add(m.clone())); ps1ify(pm); g.pistolModel = pm; // what flies when you throw a pistol
  }
  const make = (accent, wrist) => { const g = kit.makeGun(accent, wrist ? wristTex : null); kit.addAmmoDisplay(g); extras(g); ps1ify(g.root); return g; };
  const guns = { left: make(0xe0162b, true), right: make(0xebe8e1, false) };
  const desk = make(0xebe8e1, false); desk.root.position.set(.15, -.15, -.42); desk.root.rotation.y = .06; desk.root.visible = false; camera.add(desk.root);
  A.all = [guns.left, guns.right, desk]; A.guns = guns; A.desk = desk;

  /** What a hand holds: 'pistol', 'mg' (Uzi), 'cleaver' or 'extinguisher'. */
  A.hold = (g, kind) => {
    kit.setWeapon(g, kind === 'mg' ? 'mg' : 'pistol');
    const special = kind === 'cleaver' || kind === 'extinguisher';
    if (special) { g.pistolParts.forEach(m => { m.visible = false; }); g.weapon = kind; g.wAmmo = WEAPONS[kind].ammo; g.extT = WEAPONS[kind].ammo; }
    g.cleaverG.visible = kind === 'cleaver'; g.extG.visible = kind === 'extinguisher';
    g.laser.visible = kind === 'pistol' || kind === 'mg';
    A.sync();
  };
  A.sync = () => {
    for (const g of A.all) {
      const n = g.weapon === 'pistol' ? g.ammo : Math.ceil(g.wAmmo / WEAPONS[g.weapon].ammo * MAG);
      g.ammoPips.count = Math.max(0, Math.min(MAG, n)); g.hpPips.count = Math.max(0, Math.min(MAX_HP, player.hp));
    }
    const g = G.mode() === 'desktop' ? desk : [guns.right, guns.left].find(x => x.weapon !== 'pistol');
    G.hud.ammo = !g || g.weapon === 'pistol' ? String((g || desk).ammo) : WEAPONS[g.weapon].name + (g.weapon === 'mg' ? ' ' + g.wAmmo : '');
    G.hud.dirty = true; G.wristDirty = true;
  };
  A.clearFlying = () => { A.thrown.forEach(t => scene.remove(t.m)); A.thrown.length = 0; A.flying.forEach(f => scene.remove(f.m)); A.flying.length = 0; };
  A.reset = () => { for (const g of A.all) { A.hold(g, 'pistol'); g.ammo = MAG; g.spin = 0; g.syringe = false; } A.thrown.forEach(t => scene.remove(t.m)); A.thrown.length = 0; A.flying.forEach(f => scene.remove(f.m)); A.flying.length = 0; };

  /* ---------- firing ---------- */
  A.fire = (g, origin, dir, hand) => {
    if (G.state !== 'playing') { if (G.onIdleTrigger) G.onIdleTrigger(hand); return; }
    if (!G.canShoot() || g.cool > 0 || g.spin > 0 || g.syringe) return;
    const W = WEAPONS[g.weapon];
    if (g.weapon === 'cleaver') { throwCleaver(g, hand); return; }
    if (g.weapon === 'extinguisher') return; // sprays while held, see update
    if (g.weapon === 'pistol' && g.ammo <= 0) { sfxEmpty(); buzz(hand, .15, 20); if (g.emptyT <= 0) { g.muzzle.getWorldPosition(vA); fx.popup(vA.clone().add(new THREE.Vector3(0, .12, 0)), 'POINT DOWN', '', '#ebe8e1', .5, .8); g.emptyT = 1.2; } return; }
    G.lastGun = g; G.shots = (G.shots || 0) + 1;
    if (g.weapon === 'pistol') g.ammo--; else g.wAmmo--;
    g.cool = W.cool; g.kick = W.kick; g.flashT = .05;
    (g.weapon === 'mg' ? sfxMG : sfxShot)(); buzz(hand, W.buzz[0], W.buzz[1]);
    g.muzzle.getWorldPosition(A.muzzleNow); G.muzzleFlash(A.muzzleNow);
    G.combat.shoot(origin, dir, W, hand);
    if (g.weapon !== 'pistol' && g.wAmmo <= 0) { g.muzzle.getWorldPosition(vA); fx.popup(vA.clone().add(new THREE.Vector3(0, .15, 0)), 'EMPTY', '', '#ebe8e1', .55, .9); sfxEmpty(); A.hold(g, 'pistol'); }
    A.sync();
  };
  const aimOf = c => { c.userData.gun.muzzle.getWorldPosition(tO); tD.set(0, 0, -1).applyQuaternion(c.getWorldQuaternion(tQ)); };
  A.deskFire = () => { camera.getWorldPosition(tO); camera.getWorldDirection(tD); A.fire(desk, tO, tD, 'right'); };
  A.reload = (g, hand) => {
    if (g.weapon !== 'pistol' || g.ammo >= MAG || g.spin > 0) return;
    g.ammo = MAG; g.spin = Math.PI * 2; sfxReload(); buzz(hand, .5, 40); A.sync();
  };

  /* ---------- throwing ---------- */
  const throws = createThrows({ scene, thrown: A.thrown, enemies: () => enemies.list, meleeTargets: (p, r) => melee.meleeTargets(p, r), solidAt: world.solidAt, groundAt: world.groundAt, onLand: sfxThud,
    onHit(hit, dir) {
      const e = hit.e; sfxWhack(); buzz('both', .4, 50); G.stats.gunStuns++; G.combat.style(hit.point, 'THROWN', STYLE.gunStun);
      if (e.boss) { G.boss.gunStun(); return; }
      enemies.alertOne(e); e.hp -= hit.m.userData.part === 'head' ? 2 : 1;
      if (e.hp <= 0) { G.combat.kill(e, hit.point, dir, hit.m.userData.part, hit.m.userData.side, 7); return; }
      e.react = { type: hit.m.userData.part === 'head' ? 'chest' : 'gut', t: 0, dur: 1.3, sx: 1, side: 'R' }; e.stunT = 2.2; e.aiming = false;
      world.moveEntity(e.group.position, dir.x * .5, dir.z * .5, .35, 0); fx.spray(hit.point, dir, 8, 2, .6);
    } });
  function throwVel(g, hand, vel, speed = 14) {
    let v = vel && vel.length() > 2.5 ? vel.clone().multiplyScalar(1.15) : null;
    if (!v) {
      if (renderer.xr.isPresenting) { const c = controllers.find(x => x.userData.gun === g); v = new THREE.Vector3(0, 0, -1).applyQuaternion(c.getWorldQuaternion(tQ)).multiplyScalar(speed); }
      else { camera.getWorldDirection(vA); v = vA.clone().multiplyScalar(speed); }
      v.y += .9;
    }
    return v;
  }
  /** Throws what's in the hand. A pistol comes back with a twirl: you always have one. */
  A.throw = (g, hand, vel) => {
    if (G.state !== 'playing' || g.spin > 0 || g.syringe) return false;
    if (g.weapon === 'cleaver') return throwCleaver(g, hand, vel);
    const src = g.weapon === 'mg' ? g.mgG : g.weapon === 'extinguisher' ? g.extG : g.pistolModel;
    g.muzzle.getWorldPosition(vA);
    throws.launch(src, vA.clone(), throwVel(g, hand, vel));
    if (g.weapon === 'pistol') { g.spin = Math.PI * 4; g.ammo = MAG; } else A.hold(g, 'pistol');
    sfxSwing(vA.clone()); buzz(hand, .6, 60); A.sync();
    return true;
  };
  function throwCleaver(g, hand, vel) {
    g.muzzle.getWorldPosition(vA);
    const m = g.cleaverG.clone(); m.visible = true; m.position.copy(vA); m.scale.setScalar(1.3); scene.add(m);
    A.flying.push({ m, v: throwVel(g, hand, vel, 16), spin: 16, life: 4, live: true });
    A.hold(g, 'pistol'); sfxSwing(vA.clone()); buzz(hand, .6, 60);
    return true;
  }
  function updateCleavers(dt) {
    for (const f of A.flying.slice()) {
      f.life -= dt;
      if (f.live) {
        f.v.y -= 6 * dt; f.m.position.addScaledVector(f.v, dt); f.m.rotation.x -= f.spin * dt;
        const hit = melee.meleeTargets(f.m.position, .2), p = f.m.position;
        if (hit && hit.e) { // thrown cleavers kill, and take what they hit with them
          f.live = false; const dir = f.v.clone().normalize(); G.combat.style(hit.point, 'CLEAVER', STYLE.kill);
          if (hit.e.boss) { G.boss.hit(hit.m.userData.part, hit.point, dir, 3); }
          else { hit.e.hp = 0; G.combat.kill(hit.e, hit.point, dir, hit.m.userData.part, hit.m.userData.side, 8); }
          scene.remove(f.m); A.flying.splice(A.flying.indexOf(f), 1); continue;
        }
        if (hit && hit.r) { f.live = false; const dir = f.v.clone().normalize(); G.combat.hitCorpse(hit.r, hit.m.userData.part, hit.m.userData.side, hit.point, dir); }
        if (world.solidAt(p.x, p.y, p.z) || p.y < .05) { f.live = false; sfxThud(); fx.sparkBurst(p, 4, true); f.life = 30; } // stuck where it landed
      }
      if (f.life <= 0) { scene.remove(f.m); A.flying.splice(A.flying.indexOf(f), 1); }
    }
  }

  /* ---------- melee ---------- */
  const melee = createMelee({ enemies: () => enemies.list, ragdolls: enemies.ragdolls });
  A.melee = melee;
  function strike(g, hit, dir, speed, hand) {
    g.meleeCd = .35; buzz(hand, 1, 90); sfxWhack();
    const ud = hit.m.userData, point = hit.point;
    fx.spray(point, dir, 12, 3, .6); fx.mist(point, .45); fx.sparkBurst(point, 3);
    if (hit.r) { enemies.R.impulse(hit.r, point, dir, speed * 1.4); if (hit.r.living) G.combat.finish(hit.r, point); else if (ud.part === 'head' && hit.r.headOn && speed > 4) enemies.R.sever(hit.r, 'head', dir); return; }
    const e = hit.e;
    if (e.boss) { G.boss.hit(ud.part, point, dir, g.weapon === 'cleaver' ? 3 : 1); return; }
    enemies.alertOne(e);
    e.hp -= g.weapon === 'cleaver' ? 99 : ud.part === 'head' ? 2 : 1;
    if (e.hp <= 0) { G.combat.kill(e, point, dir, ud.part, ud.side, Math.min(9, speed * 1.8)); return; }
    e.flinch = 1.3; e.stunT = .9; e.aiming = false; world.moveEntity(e.group.position, dir.x * .45, dir.z * .45, .35, 0);
    G.combat.style(point, 'PISTOL WHIP', 25);
  }
  A.deskMelee = () => {
    if (G.state !== 'playing' || desk.meleeCd > 0 || desk.spin > 0 || !G.canShoot()) return;
    desk.whip = 1; desk.meleeCd = .45; sfxSwing();
    camera.getWorldPosition(tO); camera.getWorldDirection(tD);
    const best = melee.aimTarget(tO, tD), d = tD.clone();
    if (best) setTimeout(() => { if (best.e && !best.e.alive) return; strike(desk, best, d, 5.5, 'right'); }, 90);
  };

  /* ---------- grabbing ---------- */
  /** Grip: something near your hand wants it first (the adrenaline shot, the extinguisher on the wall, a pickup); otherwise throw. */
  A.grip = (g, pos, reach, hand, vel) => {
    for (const f of G.gripHandlers) if (f(g, pos, hand)) return;
    const pk = G.pickups.near(pos, reach);
    if (pk) { A.hold(g, pk.kind); G.pickups.remove(pk); sfxRack(); buzz(hand, .7, 80); fx.popupFront(WEAPONS[pk.kind].name, pk.kind === 'mg' ? '50 ROUNDS' : 'TRIGGER TO THROW', '#ebe8e1', 1, 1.1); return; }
    if (G.canShoot() && g.weapon !== 'pistol') A.throw(g, hand, vel); // a bare grip never throws your pistol: B does
  };

  /* ---------- controllers ---------- */
  setupControllers(renderer, rig, {
    connected(c) { const g = guns[c.userData.hand]; if (c.userData.gun) c.remove(c.userData.gun.root); c.userData.gun = g; c.add(g.root); },
    disconnected(c) { if (c.userData.gun) c.remove(c.userData.gun.root); c.userData.gun = null; },
    selectstart(c) { const g = c.userData.gun; if (!g) return; g.held = true; if (G.state === 'title') { G.title.keypad.aim(c); return; } aimOf(c); A.fire(g, tO.clone(), tD.clone(), c.userData.hand); },
    selectend(c) { const g = c.userData.gun; if (g) g.held = false; },
    squeezestart(c) { const g = c.userData.gun; if (!g || G.state !== 'playing') return; c.getWorldPosition(tO); A.grip(g, tO.clone(), .6, c.userData.hand, c.userData.vel); },
  });

  /** Every frame. */
  A.update = (dt, realDt) => {
    for (const g of A.all) { kit.animateGun(g, realDt); if (g.weapon === 'cleaver' || g.weapon === 'extinguisher') g.laser.visible = false; }
    const rigMoved = Math.abs(rig.rotation.y - lastYaw) > 1e-4 || rig.position.distanceTo(lastRig) > .4;
    lastYaw = rig.rotation.y; lastRig.copy(rig.position);
    if (renderer.xr.isPresenting) {
      for (const c of controllers) {
        const g = c.userData.gun; if (!g) continue;
        vA.copy(c.position); c.userData.vel = c.userData.vel || new THREE.Vector3();
        if (c.userData.prevP && realDt > 0) c.userData.vel.copy(vA).sub(c.userData.prevP).divideScalar(realDt).applyQuaternion(rig.quaternion);
        c.userData.prevP = (c.userData.prevP || new THREE.Vector3()).copy(vA);
        if (rigMoved) g.prevTip = null; // a snap turn or a teleport isn't a swing
        if (G.state !== 'playing') continue;
        tD.set(0, 0, -1).applyQuaternion(c.getWorldQuaternion(tQ));
        g.downT = tD.y < -.8 && !g.held ? (g.downT || 0) + realDt : 0;
        if (tD.y < -.8 && (g.ammo <= 0 || g.downT > .25)) A.reload(g, c.userData.hand);
        const sw = G.canShoot() && melee.swing(g, rig, realDt, true); if (sw) strike(g, sw.hit, sw.dir, sw.speed, c.userData.hand);
        if (g.held && WEAPONS[g.weapon].auto && g.cool <= 0 && g.weapon === 'mg') { aimOf(c); A.fire(g, tO.clone(), tD.clone(), c.userData.hand); }
        if (g.held && g.weapon === 'extinguisher') { aimOf(c); spray(g, tO, tD, dt); }
      }
    } else if (G.mode() === 'desktop' && G.state === 'playing') {
      if (desk.weapon === 'pistol' && desk.ammo <= 0 && desk.cool < -.5) A.reload(desk, 'right');
      if (desk.held && desk.weapon === 'mg' && desk.cool <= 0) A.deskFire();
      if (desk.held && desk.weapon === 'extinguisher') { camera.getWorldPosition(tO); camera.getWorldDirection(tD); desk.muzzle.getWorldPosition(tO); spray(desk, tO, tD, dt); }
    }
    throws.update(dt); updateCleavers(dt);
  };
  function spray(g, from, dir, dt) {
    if (g.wAmmo <= 0) { A.hold(g, 'pistol'); return; }
    g.extT = Math.max(0, (g.extT ?? WEAPONS.extinguisher.ammo) - dt); g.wAmmo = Math.ceil(g.extT);
    G.hazards.spray(from, dir, dt);
    if (Math.random() < dt * 8) A.sync();
  }
  return A;
}
