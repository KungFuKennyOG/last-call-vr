// Melee: pistol-whips. In VR a fast swing of the gun hits whatever its tip passes through;
// on desktop a whip hits the closest body part roughly in front of you.
import * as THREE from 'three';

export const MELEE_SPEED = 2.4; // m/s of gun tip, rig movement removed
const PART_R = { head: .2, body: .34, arm: .16, leg: .19 };

// enemies(): the live enemy list (the game replaces the array, so pass a getter). ragdolls: the ragdoll list.
// A target found is { e, m, point } for an enemy or { r, m, point } for a ragdoll, m being the part's mesh.
export function createMelee({ enemies, ragdolls }) {
  const partPos = new THREE.Vector3(), tipNow = new THREE.Vector3(), swingV = new THREE.Vector3(), tO = new THREE.Vector3();
  const ragParts = r => [r.torso, ...r.segs.map(s => s.m)];
  // the body part nearest a point, within reach of its surface
  function meleeTargets(tip, reach) {
    let best = null, bd = 1e9;
    enemies().forEach(e => {
      if (!e.alive || e.dummy) return; if (e.group.position.distanceTo(tip) > 3) return;
      e.hits.forEach(m => { m.getWorldPosition(partPos); const d = partPos.distanceTo(tip) - PART_R[m.userData.part]; if (d < reach && d < bd) { bd = d; best = { e, m, point: partPos.clone() }; } });
    });
    ragdolls.forEach(r => { ragParts(r).forEach(m => { m.getWorldPosition(partPos); const d = partPos.distanceTo(tip) - PART_R[m.userData.part]; if (d < reach && d < bd) { bd = d; best = { r, m, point: partPos.clone() }; } }); });
    return best;
  }
  // desktop: the best part within 1.9 m and about 37° of where you look
  function aimTarget(from, dir) {
    let best = null, bs = -1;
    const cand = [];
    enemies().forEach(e => { if (e.alive && !e.dummy) e.hits.forEach(m => cand.push({ e, m })); });
    ragdolls.forEach(r => ragParts(r).forEach(m => cand.push({ r, m })));
    cand.forEach(c => {
      c.m.getWorldPosition(partPos); const v = partPos.clone().sub(from), d = v.length(); if (d > 1.9) return; const dot = v.normalize().dot(dir); if (dot < .8) return;
      const sc = dot - d * .15; if (sc > bs) { bs = sc; best = { ...c, point: partPos.clone() }; }
    });
    return best;
  }
  // VR: call every frame for each held gun. live: swings count right now.
  // Returns { hit, dir, speed } when this frame's swing connects, else null.
  function swing(g, rig, realDt, live) {
    let out = null;
    g.muzzle.getWorldPosition(tipNow); tipNow.sub(rig.position);
    if (g.prevTip && realDt > 0) {
      swingV.copy(tipNow).sub(g.prevTip).divideScalar(realDt); const sp = swingV.length();
      if (sp > MELEE_SPEED && g.meleeCd <= 0 && live) {
        tO.copy(tipNow).add(rig.position); const hit = meleeTargets(tO, .1);
        if (hit) out = { hit, dir: swingV.clone().normalize(), speed: sp };
      }
    }
    g.prevTip = (g.prevTip || new THREE.Vector3()).copy(tipNow);
    return out;
  }
  return { meleeTargets, aimTarget, swing };
}
