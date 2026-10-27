// You: where your head is, walking, snap turn, the small jump, health, and how being hit or stunned looks.
// Movement is Showdowns': walk with the left stick (WASD), snap-turn 30° with the right stick, A or X (Space) to hop.
// Nothing here ever moves or tilts your view on its own: hits flash the world red, stuns turn it grey.
import * as THREE from 'three';
import { BTN, controllers, pressed, readStick, buzz } from '../../engine/index.js';
import { U } from '../render/ps1.js';

export const MAX_HP = 8;
export const WALK = 2.9;      // m/s
const JUMP_V = 4.2, GRAV = 17, SNAP = Math.PI / 6;

/**
 * @param {{ renderer: any, rig: any, camera: any, world: any, desk: any, onJump?: () => void, onLand?: (v: number) => void }} o
 */
export function createPlayer({ renderer, rig, camera, world, desk, onJump, onLand }) {
  const P = {
    headPos: new THREE.Vector3(0, 1.6, 0), headDir: new THREE.Vector3(0, 0, -1),
    hp: MAX_HP, invuln: 0, flash: 0, grey: 0, greyTarget: 0,
    frozen: false, slow: 1, grounded: true, vy: 0, feetY: 0, moveAmt: 0, jumpQueued: false,
  };
  const pv = new THREE.Vector3(), wish = new THREE.Vector3(), fwd = new THREE.Vector3(), rgt = new THREE.Vector3(), after = new THREE.Vector3();
  const stick = { x: 0, y: 0 }, q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ');
  let snapReady = true;

  /** Head position and look direction, once a frame before anything else reads them. */
  P.sense = () => { camera.getWorldPosition(P.headPos); camera.getWorldDirection(P.headDir); };

  /** The yaw the camera looks along, in the world. */
  P.yaw = () => { camera.getWorldQuaternion(q); e.setFromQuaternion(q); return e.y; };

  /** Puts your head at (x, z), looking along yaw (0 looks toward −z). */
  P.placeAt = (x, z, yaw) => {
    if (renderer.xr.isPresenting) {
      e.setFromQuaternion(camera.quaternion); // the head's turn inside the play space
      rig.rotation.set(0, yaw - e.y, 0);
    } else { rig.rotation.set(0, 0, 0); desk.yaw = yaw; desk.pitch = 0; camera.rotation.set(0, yaw, 0); }
    rig.updateMatrixWorld(true);
    camera.getWorldPosition(after);
    rig.position.x += x - after.x; rig.position.z += z - after.z; rig.position.y = 0;
    P.feetY = 0; P.vy = 0; P.grounded = true; pv.set(0, 0, 0);
    rig.updateMatrixWorld(true); P.sense();
  };

  function moveRig(dx, dz) {
    after.set(P.headPos.x, 0, P.headPos.z); world.moveEntity(after, dx, dz, .3, P.feetY);
    rig.position.x += after.x - P.headPos.x; rig.position.z += after.z - P.headPos.z; P.headPos.x = after.x; P.headPos.z = after.z;
  }
  function snapTurn(a) {
    const px = P.headPos.x, pz = P.headPos.z, ox = rig.position.x - px, oz = rig.position.z - pz, c = Math.cos(a), s = Math.sin(a);
    rig.position.x = px + ox * c + oz * s; rig.position.z = pz - ox * s + oz * c; rig.rotation.y += a;
  }
  P.jump = () => { if (P.frozen || !P.grounded) return; P.vy = JUMP_V; P.grounded = false; buzz('both', .25, 40); if (onJump) onJump(); };

  /**
   * Walking and turning, with real time (scaled by bullet time on the world, never on your head).
   * vr: read the controllers. extra(c, hand): the game's per-controller buttons (B for bullet time and the like).
   */
  P.move = (dt, mode, extra) => {
    fwd.copy(P.headDir); fwd.y = 0; if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1); fwd.normalize(); rgt.set(-fwd.z, 0, fwd.x);
    let lx = 0, ly = 0, rx = 0;
    if (renderer.xr.isPresenting) {
      for (const c of controllers) {
        if (!readStick(c, stick)) continue;
        if (c.userData.hand === 'left') { lx = stick.x; ly = stick.y; } else rx = stick.x;
        if (pressed(c, BTN.A)) P.jumpQueued = true;
        if (extra) extra(c, c.userData.hand);
      }
      if (Math.abs(rx) > .7 && snapReady && !P.frozen) { snapTurn(-Math.sign(rx) * SNAP); snapReady = false; }
      if (Math.abs(rx) < .3) snapReady = true;
    } else if (mode === 'desktop') {
      const k = desk.keys; lx = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0); ly = (k.KeyS ? 1 : 0) - (k.KeyW ? 1 : 0);
    }
    if (Math.abs(lx) < .15) lx = 0; if (Math.abs(ly) < .15) ly = 0;
    if (P.frozen) { lx = ly = 0; P.jumpQueued = false; }
    if (P.jumpQueued) { P.jumpQueued = false; P.jump(); }
    wish.copy(fwd).multiplyScalar(-ly).addScaledVector(rgt, lx);
    const m = Math.min(1, wish.length()); if (m > 0) wish.normalize().multiplyScalar(m * P.slow); else wish.set(0, 0, 0);
    const k = Math.min(1, dt * (P.grounded ? 10 : 2.5)); pv.x += (wish.x * WALK - pv.x) * k; pv.z += (wish.z * WALK - pv.z) * k;
    const dx = pv.x * dt, dz = pv.z * dt; if (Math.abs(dx) + Math.abs(dz) > 1e-6) moveRig(dx, dz);
    if (!P.grounded) { P.vy -= GRAV * dt; P.feetY += P.vy * dt; if (P.feetY <= 0 && P.vy <= 0) { if (P.vy < -6 && onLand) onLand(-P.vy); P.feetY = 0; P.vy = 0; P.grounded = true; } }
    rig.position.y = P.feetY;
    P.moveAmt += (m - P.moveAmt) * Math.min(1, dt * 8);
    P.velocity = pv;
  };

  /** Takes a hit. Returns false when invulnerable or already down. */
  P.hurt = (n = 1) => {
    if (P.invuln > 0 || P.hp <= 0) return false;
    P.hp = Math.max(0, P.hp - n); P.invuln = .45; P.flash = 1; buzz('both', 1, 220);
    return true;
  };
  P.heal = n => { P.hp = Math.min(MAX_HP, P.hp + n); };

  /** Fades: the red hit flash and the grey of being stunned. Real time. */
  P.updateLook = realDt => {
    P.invuln -= realDt; P.flash = Math.max(0, P.flash - realDt * 2.4);
    P.grey += (P.greyTarget - P.grey) * Math.min(1, realDt * 4);
    U.uGrey.value = P.grey; U.uTint.value.set(P.flash * .28, 0, 0);
  };
  return P;
}
