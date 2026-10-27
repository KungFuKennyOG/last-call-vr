// Tracers: a thin glowing streak from the muzzle to where the round landed. A pool of 40, reused in turn.
import * as THREE from 'three';

// slow(): true while bullet time is on; tracers hang in the air longer so you can watch them.
export function createTracers(scene, { slow = () => false, count = 40 } = {}) {
  const geo = new THREE.CylinderGeometry(.006, .006, 1, 5, 1, true); geo.rotateX(Math.PI / 2);
  const tracers = []; let idx = 0;
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.visible = false; m.frustumCulled = false; scene.add(m); tracers.push({ m, life: 0 });
  }
  function tracer(a, b) {
    const t = tracers[idx++ % tracers.length];
    t.m.position.copy(a).add(b).multiplyScalar(.5); t.m.lookAt(b); t.m.scale.set(1.5, 1.5, a.distanceTo(b));
    t.m.material.opacity = 1; t.m.visible = true; t.life = t.max = slow() ? .35 : .07;
  }
  // fade out; call once a frame with real time
  function update(realDt) {
    tracers.forEach(t => { if (t.life > 0) { t.life -= realDt; t.m.material.opacity = Math.max(0, t.life / (t.max || .07)); if (t.life <= 0) t.m.visible = false; } });
  }
  return { tracer, update, tracers };
}
