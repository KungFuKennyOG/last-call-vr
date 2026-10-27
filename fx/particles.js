// Flying bits: blood droplets, sparks, dust, feathers. Every one is an instance of a single tiny cube (one draw call).
// Blood droplets that hit a surface leave a decal there.
import * as THREE from 'three';

// surfaceNormal(p): the level's answer to "is this point on a surface, and which way does it face?" (it may snap p onto it).
// decals: from createDecals, for droplets that land.
export function createParticles({ scene, surfaceNormal, decals, max = 700 }) {
  const parts = [], m4 = new THREE.Matrix4(), tmp = new THREE.Vector3();
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(.02, .02, .02), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), max);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.count = 0;
  for (let i = 0; i < max; i++) mesh.setColorAt(i, new THREE.Color(0));
  scene.add(mesh);

  // col: a Color or hex. size: scale of the 2 cm cube. grav: m/s² down (default 6). blood: leaves a decal where it lands.
  function addPart(pos, v, col, size, life, grav, blood) {
    if (parts.length >= max) parts.shift();
    parts.push({ p: pos.clone(), v: v.clone(), c: col.isColor ? col : new THREE.Color(col), s: size, life, g: grav === undefined ? 6 : grav, blood: !!blood });
  }
  function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i]; q.life -= dt; q.v.y -= q.g * dt; q.p.addScaledVector(q.v, dt);
      if (q.blood) { tmp.copy(q.p); const n = surfaceNormal(tmp); if (n || q.life <= 0) { if (n && Math.random() < .45) decals.decal(tmp, n.clone(), .08 + Math.random() * .16, 0, 'blood'); parts.splice(i, 1); } }
      else if (q.life <= 0) parts.splice(i, 1);
    }
    for (let i = 0; i < parts.length; i++) { const q = parts[i]; m4.makeScale(q.s, q.s, q.s).setPosition(q.p); mesh.setMatrixAt(i, m4); mesh.setColorAt(i, q.c); }
    mesh.count = parts.length; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    decals.flush();
  }
  // hot sparks off metal; dust: every other one is concrete-grey dust instead
  function sparkBurst(pos, n, dust) {
    for (let i = 0; i < n; i++) addPart(pos, tmp.randomDirection().multiplyScalar(1.5 + Math.random() * 2.5), dust && i % 2 ? 0x9a9894 : 0xffc070, 1, .3 + Math.random() * .3, 6);
  }
  // older code builds a throwaway mesh per shard and pushes it here; it becomes a particle with the mesh's colour and size
  const sparks = { push(o) { if (o.m.parent) o.m.parent.remove(o.m); addPart(o.m.position, o.v, o.m.material.color, o.m.scale.x, o.life, 6); } };
  const sparkGeo = new THREE.BoxGeometry(.02, .02, .02);
  const dustMat = new THREE.MeshBasicMaterial({ color: 0x9a9894 });
  return { parts, mesh, tmp, addPart, updateParts, sparkBurst, sparks, sparkGeo, dustMat };
}
