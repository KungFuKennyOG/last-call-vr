// A chapter in play: which space you're in, its doors, and the beat runner that decides what happens next.
// Spaces load one at a time: walk through an open door, the view fades to black (never moves), the old space is
// thrown away, the next one is built, and you're standing just inside the matching door on the other side.
import * as THREE from 'three';
import { buildSpace } from '../render/space.js';
import { createRunner, initialRunner, runnerStart, runnerFire, runnerDown, runnerTick } from '../runner.js';

const FADE_OUT = .22, FADE_IN = .35, PASS_DIST = .65, OPEN_DIST = 2.6;

/**
 * @param {{ scene: any, camera: any, world: any, player: any, data: { SPACES: any[], BEATS: any[], SET_PIECES: any },
 *   on: { out: (o: any) => void, spaceLoaded?: (space: any) => void, blocked?: (door: any) => string | null } }} o
 *   on.out gets every runner output; on.blocked(door) returns a message when you can't go through yet (no bag).
 */
export function createChapter({ scene, camera, world, player, data, on }) {
  const R = createRunner(data.BEATS, data.SET_PIECES);
  const fadeMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false, depthWrite: false });
  const fade = new THREE.Mesh(new THREE.SphereGeometry(.3, 12, 8), fadeMat); fade.renderOrder = 999; fade.visible = false; camera.add(fade);

  const C = {
    R, run: initialRunner(), space: null, spaceId: null, t: 0,
    /** door id → unlocked */ unlocked: {},
    fading: 0, fadeDir: 0, pending: null, blockedT: 0, inTransit: false,
  };

  function apply(r) {
    C.run = r.state;
    for (const o of r.out) {
      // a new beat closes every door behind you; the runner opens the way on when it's time
      if (o.type === 'beat') { C.unlocked = {}; if (C.space) for (const d of C.space.doors) d.setLocked(true); }
      if (o.type === 'unlock' || o.type === 'lock') { C.unlocked[o.door] = o.type === 'unlock'; const d = C.space && C.space.door(o.door); if (d) d.setLocked(o.type === 'lock'); }
      on.out(o);
    }
  }
  C.fire = id => apply(runnerFire(R, C.run, id, C.t, data.SPACES));
  C.down = wave => apply(runnerDown(R, C.run, wave, C.t, data.SPACES));
  C.start = (beat = 0) => { C.run = initialRunner(); apply(runnerStart(R, C.run, beat, C.t, data.SPACES)); };
  C.beat = () => R.beats[C.run.beat];

  /** Builds a space and puts you in it: at its checkpoint, or just inside the door you came through. */
  C.load = (id, from) => {
    if (C.space) C.space.dispose();
    C.space = buildSpace(data.SPACES.find(s => s.id === id), world, scene); C.spaceId = id;
    for (const d of C.space.doors) d.setLocked(!C.unlocked[d.id]);
    const back = from && C.space.doors.find(d => d.to === from);
    if (back) {
      const x = back.at.x + back.inward[0] * 1.1, z = back.at.z + back.inward[1] * 1.1;
      player.placeAt(x, z, Math.atan2(-back.inward[0], -back.inward[1]));
      back.open = 1; back.target = 0; back.update(0);
    } else {
      const cp = C.space.sp.checkpoint;
      player.placeAt(cp.at[0], cp.at[2], cp.facing + Math.PI);
    }
    if (on.spaceLoaded) on.spaceLoaded(C.space);
  };

  /** Fade to black, run `then` in the dark, fade back in. */
  C.transit = then => { if (C.inTransit) return; C.inTransit = true; C.fadeDir = 1; C.pending = then; player.frozen = true; };

  function tryDoors(realDt) {
    const p = player.headPos;
    for (const d of C.space.doors) {
      const dx = p.x - d.at.x, dz = p.z - d.at.z;
      const depth = dx * d.inward[0] + dz * d.inward[1], lateral = Math.abs(dx * d.inward[1] - dz * d.inward[0]);
      const near = depth < OPEN_DIST && lateral < d.width;
      if (d.kind !== 'bay') d.target = near && !d.locked ? 1 : d.forceOpen > 0 ? 1 : 0;
      if (d.forceOpen > 0) d.forceOpen -= realDt;
      if (depth < PASS_DIST && lateral < d.width / 2 && !C.inTransit) {
        if (d.locked) { if (C.blockedT <= 0) { C.blockedT = 2.5; on.out({ type: 'blocked', door: d.id, msg: 'LOCKED' }); } continue; }
        const msg = on.blocked ? on.blocked(d) : null;
        if (msg) { if (C.blockedT <= 0) { C.blockedT = 2.5; on.out({ type: 'blocked', door: d.id, msg }); } continue; }
        const from = C.spaceId, to = d.to, trig = 'door:' + d.id;
        C.transit(() => {
          if (data.SPACES.some(s => s.id === to)) C.load(to, from);
          C.fire(trig);
        });
      }
    }
    C.blockedT -= realDt;
  }

  /** Every frame. dt: world time (for beats), realDt: wall time (fades, doors). */
  C.update = (dt, realDt) => {
    C.t += dt;
    if (C.fadeDir) {
      C.fading = Math.min(1, Math.max(0, C.fading + C.fadeDir * realDt / (C.fadeDir > 0 ? FADE_OUT : FADE_IN)));
      if (C.fadeDir > 0 && C.fading >= 1) { const f = C.pending; C.pending = null; if (f) f(); C.fadeDir = -1; }
      else if (C.fadeDir < 0 && C.fading <= 0) { C.fadeDir = 0; C.inTransit = false; player.frozen = false; }
    }
    fadeMat.opacity = C.fading; fade.visible = C.fading > 0;
    if (!C.space) return;
    C.space.update(realDt);
    if (!C.inTransit) tryDoors(realDt);
    const r = runnerTick(R, C.run, C.t, data.SPACES);
    if (r.out.length || r.state !== C.run) apply(r);
  };

  /** A door you can see: kicked open by enemies coming through it for a moment. */
  C.burstDoor = id => { const d = C.space && C.space.door(id); if (d) { d.forceOpen = 1.6; d.speed = 7; } };
  return C;
}
