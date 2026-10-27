// Chapter 1 in play: builds every system, connects them through one hub (G), and reacts to the beat runner:
// lines on the radio, enemies through doors, the bounty set piece, the boss, checkpoints and the results.
import * as THREE from 'three';
import { BTN, pressed } from '../../engine/index.js';
import { sfxHurt } from '../../audio/index.js';
import { createFx } from './fx.js';
import { createCast } from '../render/cast.js';
import { createEnemies } from './enemies.js';
import { createProjectiles } from './projectiles.js';
import { createCombat } from './combat.js';
import { createPickups } from './pickups.js';
import { createArms } from './arms.js';
import { createBag } from './bag-world.js';
import { createStunned } from './stunned.js';
import { createHazards } from './hazards.js';
import { createBoss } from './boss.js';
import { createChapter } from './chapter.js';
import { createSetPiece } from './setpiece.js';
import { createWrist } from '../ui/wrist.js';
import { createVoice } from '../ui/voice.js';
import { createCards } from '../ui/cards.js';
import { pickLines, initialRadio, radioPush, radioTick, radioClear } from '../radio.js';
import { takeCheckpoint, restoreCheckpoint } from '../checkpoint.js';
import { finishChapter } from '../save.js';
import { SPACES } from '../ch1/spaces.js';
import { BEATS, SET_PIECES } from '../ch1/beats.js';
import { LINES } from '../ch1/script.js';

const LABEL = { mo: 'MO · RADIO', vee: 'VEE', app: 'GOFR', dispatch: 'DISPATCH', cook: 'COOK', grabber: 'GRABBER', expediter: 'THE EXPEDITER' };
const RESTART_MSG = { bagLost: 'THE BAG GOT AWAY', noShotLeft: 'OUT COLD', timedOut: 'OUT COLD', nobodyStanding: 'OUT COLD' };

/** @param {{ renderer: any, scene: any, camera: any, rig: any, world: any, player: any, hud: any, bt: any, title: any, mode: () => string }} o */
export function createGame({ renderer, scene, camera, rig, world, player, hud, bt, title, mode }) {
  /** @type {any} */
  const G = { renderer, scene, camera, rig, world, player, hud, bt, title, mode, state: 'menu', cheats: title.cheats, gripHandlers: [], debris: [], score: 0, bounty: 0, wristDirty: true };
  const v = new THREE.Vector3();
  G.fx = createFx({ scene, world, headPos: player.headPos, headDir: player.headDir, slowmo: () => bt.active });
  G.cast = createCast();
  G.enemies = createEnemies({ scene, world, cast: G.cast, fx: G.fx, player, G });
  G.projectiles = createProjectiles({ scene, world, fx: G.fx, player, cast: G.cast, G });
  G.combat = createCombat({ world, enemies: G.enemies, fx: G.fx, player, G });
  G.wrist = createWrist();
  G.arms = createArms({ scene, camera, rig, renderer, fx: G.fx, enemies: G.enemies, world, player, wristTex: G.wrist.tex, G });
  G.pickups = createPickups({ scene, gunKit: G.arms.kit });
  G.bag = createBag({ scene, player, enemies: G.enemies, fx: G.fx, G });
  G.stun = createStunned({ player, arms: G.arms, G });
  G.hazards = createHazards({ fx: G.fx, player, enemies: G.enemies, G });
  G.boss = createBoss({ scene, cast: G.cast, enemies: G.enemies, fx: G.fx, player, G });
  G.voice = createVoice({ where: who => { const e = G.enemies.list.find(x => (who === 'expediter' ? x.boss : who === 'grabber' ? x.type === 'grabber' : !x.boss)); return e ? e.group.position.clone().setY(1.6) : null; } });
  G.cards = createCards({ scene, camera });
  G.canShoot = () => G.stun.canShoot();
  G.muzzleFlash = () => {};

  /* ---------- the chapter and its beats ---------- */
  const chapter = createChapter({ scene, camera, world, player, data: { SPACES, BEATS, SET_PIECES }, on: {
    out: o => onOut(o),
    spaceLoaded: space => { leaveSpace(); G.space = space; G.setPiece.attach(space); },
    blocked: () => (G.bag.held() ? null : G.bag.onCounter ? "DON'T FORGET THE BAG" : 'GET THE BAG BACK'),
  } });
  G.chapter = chapter;
  G.setPiece = createSetPiece({ G });

  let checkpoint = null, cpExtra = null;
  function onOut(o) {
    switch (o.type) {
      case 'trigger': onTrigger(o.id); break;
      case 'beat':
        G.beat = o.index;
        if (o.id === 'expediter') G.boss.spawn();
        if (o.checkpoint) takeCp(o.index);
        break;
      case 'spawn': {
        const e = G.enemies.spawn(o.spawn.type, o.spawn.at, o.wave, o.idle);
        if (o.spawn.door) { chapter.burstDoor(o.spawn.door); G.enemies.alertOne(e); }
        break;
      }
      case 'alert': G.enemies.wake(o.wave); break;
      case 'step': G.setPiece.step(o.do); break;
      case 'unlock': if (G.state === 'playing') G.note = 'THE WAY IS OPEN'; G.wristDirty = true; break;
      case 'blocked': hud.message(o.msg, 1.6); break;
      case 'chapterEnd': results(); break;
    }
  }
  function onTrigger(id) {
    G.say(id);
    if (id === 'expediter:start') G.boss.start();
    if (id === 'freezer:sealed') { const d = chapter.space && chapter.space.door('freezer>fryerLine'); if (d) { d.forceOpen = 0; d.target = 0; d.speed = 4; } hud.message('LOCKED IN', 1.4); }
    if (id === 'setpiece:bounty:done') { G.bounty = 50000; G.wristDirty = true; hud.bounty = 50000; hud.dirty = true; }
    if (id === 'fryerFight:enter' || id === 'dock:enter') G.note = '';
  }

  /* ---------- the radio ---------- */
  let radio = initialRadio();
  /** @type {Record<string, string>} */ const lastPick = {};
  G.say = trigger => { const lines = pickLines(LINES, trigger, 'solo', Math.random, lastPick); if (lines.length) radio = radioPush(radio, lines, realT); };
  function radioUpdate(realT) {
    const r = radioTick(radio, realT); radio = r.state;
    if (r.started) { G.voice.say(r.started); hud.subtitle({ label: LABEL[r.started.who] || r.started.who.toUpperCase(), text: r.started.text, who: r.started.who }); G.wristDirty = true; }
    else if (!radio.now && hud.sub) { hud.subtitle(null); G.wristDirty = true; }
  }

  /* ---------- hits on you, enemies leaving the fight ---------- */
  G.hurtPlayer = n => {
    if (G.state !== 'playing' || chapter.inTransit) return;
    if (G.cheats.has('oneHitKills')) n = 99;
    if (!player.hurt(n)) return;
    sfxHurt(); G.combat.streak = 0; G.arms.sync(); G.wristDirty = true; hud.dirty = true;
    if (player.hp <= 0) G.stun.downed(chapter.t);
  };
  G.enemyGone = (e, how) => {
    if (how !== 'dead') G.enemies.remove(e);
    G.bag.enemyDown(e);
    if (e.dropped) { G.pickups.remove(e.dropped); e.dropped = null; }
    if (e.wave) chapter.down(e.wave);
  };
  G.crawlerGone = () => {};
  G.rearm = e => { if (e.dropped) { G.pickups.remove(e.dropped); e.dropped = null; } G.enemies.rearm(e, e.type === 'lineCook' ? 'cleaver' : e.type === 'kitchenGunner' ? 'mg' : 'pistol'); G.say('disarm.pickUp.' + e.type); };

  /* ---------- checkpoints ---------- */
  function takeCp(index) {
    if (!G.bag.held()) return;
    const hands = /** @type {any} */ ([G.arms.guns.left, G.arms.guns.right].map(g => ({ weapon: g.weapon, ammo: g.weapon === 'pistol' ? g.ammo : g.wAmmo })));
    G.stun.checkpointReached();
    checkpoint = takeCheckpoint({ chapter: 1, space: BEATS[index].space, players: { p1: { hp: player.hp, maxHp: 8, hands } }, bag: G.bag.state, stun: G.stun.state });
    cpExtra = { index, unlocked: { ...chapter.unlocked }, bounty: G.bounty };
    hud.message('CHECKPOINT', 1.1);
  }
  /** Everything that belongs to the space you just left: bodies, blood, fires, things on the floor. */
  function leaveSpace() {
    G.enemies.clear(); G.projectiles.clear(); G.pickups.clear(); G.boss.clear(); G.hazards.reset(); G.fx.reset(); G.setPiece.reset();
    G.debris.forEach(d => scene.remove(d.m)); G.debris.length = 0;
    G.arms.clearFlying();
  }
  function clearFight() { leaveSpace(); radio = radioClear(); hud.subtitle(null); }
  /** Back to the last checkpoint: the space rebuilt, its enemies back, you on your feet with the bag. */
  G.restartCheckpoint = reason => {
    if (G.state !== 'playing' || G.restarting) return;
    if (!checkpoint) { G.start(); return; }
    G.restarting = true;
    hud.message(RESTART_MSG[reason] || 'AGAIN', 1.6);
    setTimeout(() => chapter.transit(() => {
      clearFight();
      const snap = restoreCheckpoint(checkpoint);
      player.hp = snap.players.p1.hp; player.greyTarget = 0; player.grey = 0; player.slow = 1;
      snap.players.p1.hands.forEach((h, i) => { const g = i ? G.arms.guns.right : G.arms.guns.left; G.arms.hold(g, h.weapon || 'pistol'); if (h.weapon === 'pistol') g.ammo = h.ammo; else g.wAmmo = h.ammo; });
      G.arms.hold(G.arms.desk, 'pistol');
      G.bag.toPlayer(); G.stun.restore(snap.stun);
      chapter.unlocked = { ...cpExtra.unlocked }; G.bounty = cpExtra.bounty; hud.bounty = G.bounty;
      chapter.load(snap.space);
      chapter.start(cpExtra.index);
      G.restarting = false;
    }), 900);
  };

  /* ---------- starting, ending ---------- */
  G.stats = null;
  G.start = () => {
    clearFight(); G.cards.hide(); title.keypad.group.visible = false;
    G.stats = { time: 0, kills: 0, headshots: 0, disarms: 0, breachKills: 0, gunStuns: 0, civilians: 0, stuns: 0 };
    G.score = 0; G.bounty = 0; hud.bounty = 0; G.note = 'PICK UP ORDER #0447 AT THE COUNTER';
    checkpoint = null; cpExtra = null; G.restarting = false;
    player.hp = 8; player.greyTarget = 0; player.grey = 0; player.slow = 1;
    G.arms.reset(); G.stun.chapterStart();
    chapter.unlocked = {}; chapter.t = 0;
    chapter.load('counter'); G.bag.toCounter(chapter.space);
    G.state = 'playing';
    chapter.start(0);
    G.fx.popupFront('WRONG ORDER', '11 P.M. · A GHOST KITCHEN', '#ff7a1a', .9, 3);
  };
  function results() {
    G.state = 'results';
    const r = finishChapter(title.progress, 1, { ...G.stats, time: Math.round(G.stats.time) });
    title.gotCode(r.code, r.progress);
    const s = G.stats, mm = Math.floor(s.time / 60), ss = String(Math.floor(s.time % 60)).padStart(2, '0');
    G.cards.show({ kicker: 'CHAPTER 1 · WRONG ORDER', title: 'DELIVERED', stars: r.rating.stars, gold: r.rating.gold,
      lines: [`TIME ${mm}:${ss}   KILLS ${s.kills}   HEADSHOTS ${s.headshots}`, `DISARMS ${s.disarms}   THROWN ${s.gunStuns}   STUNS ${s.stuns}`, `STYLE ${G.score}`],
      code: r.code, foot: mode() === 'vr' ? 'PULL THE TRIGGER' : 'CLICK OR PRESS ENTER' });
    G.result = r; G.resultT = 0;
  }
  /** The trigger or Enter while a card is up. */
  G.onIdleTrigger = () => { if (G.state === 'results' && G.resultT > 1.2 && G.onDone) G.onDone(); };

  /* ---------- buttons ---------- */
  G.buttons = (c, hand) => {
    if (pressed(c, BTN.B)) { if (hand === 'left') bt.toggle(G.state === 'playing'); else if (c.userData.gun) G.arms.throw(c.userData.gun, hand, c.userData.vel); }
    if (hand === 'right' && pressed(c, BTN.STICK)) bt.toggle(G.state === 'playing');
  };
  G.key = code => {
    if (G.state === 'results' && (code === 'Enter' || code === 'Space')) { G.onIdleTrigger(); return; }
    if (G.state !== 'playing') return;
    const d = G.arms.desk;
    if (code === 'KeyE') bt.toggle(true);
    if (code === 'KeyF') G.arms.deskMelee();
    if (code === 'KeyG') G.arms.throw(d, 'right');
    if (code === 'KeyR') G.arms.reload(d, 'right');
    if (code === 'KeyQ') { v.set(player.headPos.x, .9, player.headPos.z); G.arms.grip(d, v.clone(), 1.3, 'right'); }
    if (code === 'KeyH') G.stun.adrenaline(chapter.t);
  };

  /* ---------- every frame ---------- */
  let wristT = 0, realT = 0;
  G.update = (dt, realDt, t) => {
    realT += realDt;
    if (G.state === 'results') G.resultT += realDt;
    if (G.state === 'playing' && G.cheats.has('alwaysSlowMo')) bt.slowmo(.5, .15);
    if (G.state === 'playing' && !chapter.inTransit) G.stats.time += realDt;
    G.arms.update(dt, realDt);
    G.combat.update(dt, realDt);
    G.enemies.update(dt, t);
    G.boss.update(dt, t);
    G.projectiles.update(dt);
    G.pickups.update(realDt);
    G.bag.update();
    G.stun.update(chapter.t);
    G.hazards.update(dt);
    G.setPiece.update(realDt);
    chapter.update(dt, realDt);
    for (const d of G.debris.slice()) { d.life -= dt; d.v.y -= 9.8 * dt; d.m.position.addScaledVector(d.v, dt); if (d.m.position.y < .03) { d.m.position.y = .03; d.v.set(0, 0, 0); } if (d.life <= 0) { scene.remove(d.m); G.debris.splice(G.debris.indexOf(d), 1); } }
    G.fx.update(dt, realDt);
    radioUpdate(realT);
    hud.bt = bt.meter; hud.btOn = bt.active; if (bt.active) hud.dirty = true;
    wristT -= realDt;
    if ((G.wristDirty && wristT <= 0) || wristT < -.5) {
      wristT = .12; G.wristDirty = false;
      const st = G.stun.state.players.p1, stunLeft = st.status === 'stunned' ? Math.max(0, st.until - chapter.t) : -1;
      const h = G.bag.state && G.bag.state.holder.kind;
      G.wrist.draw({ hp: player.hp, bt: bt.meter, btOn: bt.active, bounty: G.bounty, fps: hud.fps, sub: hud.sub, shots: G.stun.shots(), stun: stunLeft, boss: hud.boss,
        bag: G.bag.onCounter ? 'BAG ON COUNTER' : h === 'player' ? 'BAG OK' : h === 'enemy' ? 'BAG STOLEN!' : 'BAG ON FLOOR', note: G.note || '', notifyT: 0 });
    }
  };
  return G;
}
