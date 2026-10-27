// Out of health means stunned, not dead: the world goes grey, you can't shoot, and the view never moves.
// Solo: grab the adrenaline shot off your chest strap (grip with a hand near your chest) and stab it down into
// your thigh within 10 s. In the browser, H. One shot per chapter; a second stun restarts the checkpoint.
// The rules are drop/stun.js; this is the gesture, the grey and the countdown.
import * as THREE from 'three';
import { controllers, buzz } from '../../engine/index.js';
import { stunEvent, initialStun, canShoot, stunProgress } from '../stun.js';
import { sfxHurt, sfxReload } from '../../audio/index.js';

const STAB_DROP = .3, STAB_SPEED = 1.2; // m the hand must come down from where it took the shot, m/s it must have been moving

/** @param {{ player: any, arms: any, G: any }} o */
export function createStunned({ player, arms, G }) {
  const S = { state: initialStun(['p1']), held: null, from: 0 };
  const chest = new THREE.Vector3(), hand = new THREE.Vector3();

  function apply(r) {
    S.state = r.state;
    for (const o of r.out) {
      if (o.type === 'stunned') { G.stats.stuns++; G.say('stunned'); player.greyTarget = 1; player.frozen = false; player.slow = .45; G.hud.message('STUNNED', 1.2); sfxHurt(); }
      if (o.type === 'recovered') {
        player.greyTarget = 0; player.slow = 1; player.hp = Math.ceil(player.hp + 4); player.invuln = 1.2;
        G.say('recovered.' + o.how); G.hud.message('BACK UP', 1); sfxReload(); buzz('both', 1, 300); arms.sync();
      }
      if (o.type === 'restartCheckpoint') { if (o.reason === 'noShotLeft') G.stats.stuns++; G.restartCheckpoint(o.reason); }
    }
    G.wristDirty = true; G.hud.shots = S.shots(); G.hud.dirty = true;
  }
  S.shots = () => S.state.players.p1.shots;
  S.canShoot = () => canShoot(S.state, 'p1');
  S.progress = t => stunProgress(S.state, 'p1', t);
  S.chapterStart = () => { S.dropSyringe(); S.state = initialStun(['p1']); apply(stunEvent(S.state, { type: 'chapterStarted' })); player.greyTarget = 0; player.slow = 1; };
  S.checkpointReached = () => apply(stunEvent(S.state, { type: 'checkpointReached' }));
  S.restore = st => { S.state = stunEvent(st, { type: 'checkpointRestored' }).state; player.greyTarget = 0; player.grey = 0; player.slow = 1; S.dropSyringe(); apply({ state: S.state, out: [] }); };
  /** Health ran out. */
  S.downed = t => apply(stunEvent(S.state, { type: 'downed', player: 'p1', t }));
  S.adrenaline = t => { if (S.state.players.p1.status === 'stunned') apply(stunEvent(S.state, { type: 'adrenaline', player: 'p1', t })); };
  S.dropSyringe = () => { if (S.held) { S.held.syringe = false; S.held.syringeG.visible = false; S.held = null; } };

  /** Grip near your chest while stunned takes the shot off the strap. */
  G.gripHandlers.push((g, pos) => {
    if (S.state.players.p1.status !== 'stunned' || S.shots() <= 0 || S.held) return false;
    chest.copy(player.headPos); chest.y -= .4;
    if (pos.distanceTo(chest) > .38) return false;
    S.held = g; g.syringe = true; g.syringeG.visible = true; S.from = pos.y; buzz('both', .4, 60);
    return true;
  });

  S.update = t => {
    if (S.state.players.p1.status === 'stunned') {
      const r = stunEvent(S.state, { type: 'tick', t }); if (r.out.length || r.state !== S.state) apply(r);
      G.wristDirty = true;
    }
    // the stab: the hand with the shot comes down hard toward your thigh
    if (S.held && renderer().xr.isPresenting) {
      const c = controllers.find(x => x.userData.gun === S.held);
      if (c) {
        c.getWorldPosition(hand);
        const vel = c.userData.vel; // the fastest it has moved down lately, so slowing at the bottom still counts
        S.peak = Math.max((S.peak || 0) * .85, vel ? -vel.y : 0);
        if (hand.y < S.from - STAB_DROP && S.peak > STAB_SPEED) { S.dropSyringe(); S.peak = 0; S.adrenaline(t); }
      }
    }
  };
  const renderer = () => G.renderer;
  return S;
}
