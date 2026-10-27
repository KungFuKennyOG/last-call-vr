// What a shot does: rounds hit cooks, corpses, fryers, the extinguisher, pans, the boss's tray or a wall,
// and wounds, disarms, kills and style points follow. Enemy rounds and pans are in game/projectiles.js;
// the guns in your hands are in game/arms.js.
import * as THREE from 'three';
import { createDamage } from '../../actors/index.js';
import { launchBody } from '../../combat/index.js';
import { sfxSplat, sfxRicochet, sfxThud, sfxStreak, sfxWhack, sfxGlass } from '../../audio/index.js';
import { disarmHit, afterDisarm } from '../disarm.js';
import { STYLE } from '../rating.js';

const STREAKS = { 2: 'DOUBLE', 3: 'TRIPLE', 5: 'RAMPAGE', 8: 'MASSACRE' };

/** @param {{ world: any, enemies: any, fx: any, player: any, G: any }} o */
export function createCombat({ world, enemies, fx, player, G }) {
  const ray = new THREE.Raycaster(); ray.far = 60;
  const v = new THREE.Vector3(), up = new THREE.Vector3(0, .3, 0), local = new THREE.Vector3();
  const { wound, reactToHit, rollDown, deathForce } = createDamage({ spray: fx.spray, mist: fx.mist, sfxSplat, moveEntity: world.moveEntity });
  const C = { streak: 0, streakT: 0, blastRags: null, blastO: new THREE.Vector3(), headshotCd: 0, ricochet: false };
  const S = () => G.stats;
  const white = '#ebe8e1', orange = '#ff7a1a';

  /** One pellet from origin along dir. Returns where it ended, for the tracer. */
  C.pellet = (origin, dir) => {
    ray.set(origin, dir);
    const targets = enemies.hittables.concat(G.projectiles.hittables, world.solids);
    const hits = ray.intersectObjects(targets, false);
    const end = origin.clone().addScaledVector(dir, 40);
    const h = hits[0];
    if (!h) return end;
    end.copy(h.point);
    const ud = h.object.userData;
    if (ud.enemy && ud.enemy.alive) {
      if (ud.tray) { G.boss.trayHit(h.point, dir); return end; }
      C.hitEnemy(ud.enemy, ud.part, ud.side, h.point, dir, subPart(h.object, ud, h.point));
    } else if (ud.rag) C.hitCorpse(ud.rag, ud.part, ud.side, h.point, dir);
    else if (ud.proj) G.projectiles.deflect(ud.proj);
    else if (ud.fryerRef) G.hazards.shootFryer(ud.fryerRef, h.point);
    else if (ud.extinguisherRef) G.hazards.burstExtinguisher(ud.extinguisherRef, h.point);
    else {
      const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : v.set(0, 1, 0);
      fx.decal(h.point, n, .07, 0, 'hole'); fx.sparkBurst(h.point, 4, true);
      if (!C.ricochet) { C.ricochet = true; sfxRicochet(); }
    }
    return end;
  };
  /** Hand or forearm, from where on the forearm a round landed (for disarms). */
  function subPart(mesh, ud, point) {
    if (ud.weapon) return 'hand';
    if (ud.part !== 'arm' || ud.joint !== 'fore' + ud.side) return ud.joint === 'arm' + ud.side ? 'upperArm' : '';
    local.copy(point); mesh.parent.worldToLocal(local);
    return local.y < -.27 ? 'hand' : 'forearm';
  }

  C.hitEnemy = (e, part, side, point, dir, sub) => {
    if (e.boss) { G.boss.hit(part, point, dir); return; }
    const head = part === 'head';
    enemies.alertOne(e); G.hits = (G.hits || 0) + 1;
    // shoot the gun hand and the weapon goes flying
    if (sub === 'hand' || sub === 'forearm') {
      const ev = disarmHit({ enemy: { id: e.id, type: e.type, weapon: e.weapon, gunHand: 'R', hp: e.hp / e.def.hp }, part: sub + side, roll: Math.random(), at: [point.x, point.y, point.z],
        situation: situation(e) });
      if (ev.length) { C.disarm(e, ev[0], point, dir); return; }
    }
    e.hp -= head ? 99 : G.cheats.has('oneHitKills') ? 99 : 1;
    wound(point, dir, head);
    if (e.hp <= 0) { C.kill(e, point, dir, part, side); return; }
    e.flinch = 1; e.reaction = e.reaction === 'beg' ? 'flee' : e.reaction;
    if (reactToHit(e, part, side, point, dir)) C.kill(e, point, dir, part, side, undefined, true);
  };
  function situation(e) {
    const p = e.group.position, allies = enemies.list.filter(o => o !== e && o.alive && o.group.position.distanceTo(p) < 6).length;
    return { distToPlayer: Math.hypot(player.headPos.x - p.x, player.headPos.z - p.z), weaponDist: 1, alliesNearby: allies };
  }

  /** A disarm: the weapon flies off, the enemy reacts in character, and it's worth style points. */
  C.disarm = (e, ev, point, dir) => {
    const was = e.weapon;
    Object.assign(e, afterDisarm({ weapon: e.weapon, hasSidearm: false }, ev.reaction));
    e.reaction = ev.reaction; e.aiming = false; e.stunT = .6; e.flinch = 1;
    if (ev.reaction === 'rushBareHanded') e.kind = 'rusher';
    enemies.unarm(e);
    fx.sparkBurst(point, 6); sfxWhack(); fx.spray(point, dir, 6, 2.4, .5);
    const drop = point.clone().addScaledVector(dir, .6); drop.y = 0;
    const kind = was === 'cleaver' ? 'cleaver' : was === 'mg' ? 'mg' : 'pistolDropped';
    e.dropped = G.pickups.spawn(kind, drop, { owner: e });
    S().disarms++; C.style(point, 'DISARM', STYLE.disarm);
    G.say(ev.bark);
  };

  C.kill = (e, point, dir, part, side, meleeForce, forceDrop) => {
    const head = part === 'head', melee = meleeForce !== undefined;
    C.streak = C.streakT > 0 ? C.streak + 1 : 1; C.streakT = 3;
    S().kills++; if (head) S().headshots++;
    if (G.breachT > 0) S().breachKills++;
    const drop = !e.reaction && (forceDrop || rollDown(part, head, melee, G.forceMul || 1));
    const label = melee ? 'PISTOL WHIP' : head ? 'HEADSHOT' : drop ? 'DOWN' : '';
    C.style(point, label, STYLE.kill + (head ? STYLE.headshot : 0));
    if (STREAKS[C.streak]) { fx.popupFront(STREAKS[C.streak], '', orange, 1.2, 1.3); sfxStreak(); }
    if (G.lastGun) { G.lastGun.ammo = Math.min(12, G.lastGun.ammo + 2); G.arms.sync(); }
    G.bt.meter = Math.min(1, G.bt.meter + (head ? .16 : .1));
    for (const o of enemies.list) if (o !== e && o.group.position.distanceTo(e.group.position) < 6) o.scaredT = 1.4 + Math.random() * .6;
    enemies.remove(e);
    const force = deathForce(e, head, meleeForce, G.forceMul || 1);
    const r = enemies.ragdoll(e, point, dir, part, side, drop ? force * .45 : force, drop);
    if (!drop && !head) r.twitchT = .6 + Math.random() * .6;
    if (C.blastRags) C.blastRags.set(r, 1);
    if (e.weapon === 'mg' && Math.random() < .7) G.pickups.spawn('mg', e.group.position.clone());
    if (e.weapon === 'cleaver' && Math.random() < .5) G.pickups.spawn('cleaver', e.group.position.clone());
    sfxThud();
    if (head && C.headshotCd <= 0) { G.bt.slowmo(.4, .4); C.headshotCd = 2.5; }
    G.enemyGone(e, 'dead');
  };

  C.hitCorpse = (r, part, side, point, dir) => {
    if (C.blastRags && !C.blastRags.has(r)) C.blastRags.set(r, .5);
    enemies.R.impulse(r, point, dir, 4.5 * 1.3); wound(point, dir, part === 'head');
    if (r.living) { C.finish(r, point); if (part === 'head' && r.headOn) enemies.R.sever(r, 'head', dir); return; }
    if (part === 'head' && r.headOn) enemies.R.sever(r, 'head', dir);
    else if ((part === 'arm' || part === 'leg') && Math.random() < .35) enemies.R.sever(r, part + side, dir);
  };
  /** A downed cook finished off. */
  C.finish = (r, point) => {
    if (!r.living) return;
    r.living = null; r.face.material = G.cast.faceMats.dead; r.twitchT = .4;
    C.style(point, 'FINISHED', 50); sfxThud();
    G.bt.meter = Math.min(1, G.bt.meter + .05);
    G.crawlerGone(r);
  };

  /** Style points float up where they were earned; the total feeds the delivery rating. */
  C.style = (point, label, pts) => {
    G.score += pts;
    fx.popup(point.clone().add(up), label || '+' + pts, label ? '+' + pts : '', label ? white : '#bdbab3', 1, 1.1);
  };

  /** A sawed-off or any shot with spread: every pellet, then bodies it killed get thrown. */
  C.shoot = (origin, dir, W, hand) => {
    G.forceMul = W.force; C.ricochet = false; C.blastRags = W.pellets > 1 ? new Map() : null; C.blastO.copy(origin);
    const spreadV = new THREE.Vector3();
    for (let k = 0; k < W.pellets; k++) {
      const d = dir.clone(); if (W.spread) { spreadV.randomDirection().multiplyScalar(Math.random() * W.spread); d.add(spreadV).normalize(); }
      const end = C.pellet(origin, d); fx.tracer(G.arms.muzzleNow, end);
    }
    G.forceMul = 1;
    if (C.blastRags) { C.blastRags.forEach((k, r) => launchBody(r, dir, k, C.blastO, enemies.R.SIM_H, rr => { if (rr.rag) rr.rag.synced = false; })); C.blastRags = null; }
    enemies.noise(origin, 14);
  };

  C.update = (dt, realDt) => {
    C.headshotCd -= realDt;
    if (C.streakT > 0) { C.streakT -= dt; if (C.streakT <= 0) C.streak = 0; }
  };
  C.sfxGlass = sfxGlass;
  return C;
}
