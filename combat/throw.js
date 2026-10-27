// Thrown guns: an empty gun thrown at someone's face still stuns or drops them.
// The throw gets a little aim help toward whoever it's roughly heading for.
import * as THREE from 'three';

// thrown: the game's list of guns in flight (it clears it between levels).
// enemies(): live enemies. meleeTargets: from combat/melee.js. solidAt(x,y,z), groundAt(x,z,y): the level.
// onHit(hit, dir): a gun in flight hit an enemy part (damage, sound, score are the game's call).
// onLand(): it hit a wall or the floor.
export function createThrows({ scene, thrown, enemies, meleeTargets, solidAt, groundAt, onHit, onLand }) {
  const vB = new THREE.Vector3(), vC = new THREE.Vector3();
  // src: the gun model to copy. from: the muzzle. v: initial velocity (m/s), changed in place by the aim help.
  function launch(src, from, v) {
    const m = src.clone(); m.visible = true; m.position.copy(from); m.scale.setScalar(1.15); scene.add(m);
    // a little help: a throw roughly at someone goes at them
    const sp = Math.max(12, v.length()); vC.copy(v).normalize();
    /** @type {any} */
    let best = null;
    let ba = .3;
    enemies().forEach(e => {
      if (!e.alive || e.dummy) return; e.torso.getWorldPosition(vB); vB.y += .15;
      const d = vB.clone().sub(from), L = d.length(); if (L > 18) return;
      const ang = Math.acos(Math.max(-1, Math.min(1, d.normalize().dot(vC)))); if (ang < ba) { ba = ang; best = e; }
    });
    if (best) { best.torso.getWorldPosition(vB); vB.y += .15; v = vB.sub(from).normalize().multiplyScalar(sp).clone(); const tt = from.distanceTo(best.torso.getWorldPosition(vC)) / sp; v.y += 4 * tt * .5; }
    thrown.push({ m, v, spin: new THREE.Vector3(10 + Math.random() * 8, Math.random() * 6, 0), life: 6, live: true });
  }
  function update(dt) {
    for (let i = thrown.length - 1; i >= 0; i--) {
      const t = thrown[i]; t.life -= dt;
      if (t.live) {
        t.v.y -= 4 * dt; t.m.position.addScaledVector(t.v, dt); t.m.rotation.x += t.spin.x * dt; t.m.rotation.y += t.spin.y * dt;
        const hit = meleeTargets(t.m.position, .24);
        if (hit && hit.e) { const dir = t.v.clone().normalize(); t.live = false; t.v.multiplyScalar(-.2); onHit(hit, dir); }
        else if (solidAt(t.m.position.x, t.m.position.y, t.m.position.z)) {
          t.live = false; t.v.set(0, 0, 0); t.m.position.y = Math.max(groundAt(t.m.position.x, t.m.position.z, t.m.position.y) + .05, t.m.position.y); onLand();
        }
      }
      if (t.life <= 0) { scene.remove(t.m); thrown.splice(i, 1); }
    }
  }
  return { launch, update };
}
