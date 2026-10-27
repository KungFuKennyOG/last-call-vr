// Decals: blood splats, pools, bullet holes and scorch marks, all in one batched mesh (one draw call).
// The oldest decal is recycled once the buffer is full.
import * as THREE from 'three';

const ZAXIS = new THREE.Vector3(0, 0, 1);
const DCOL = { hole: 0xffffff, blood: 0xb3001a, pool: 0x8a0012, scorch: 0x080706 };

// atlas: four textures drawn into a 2x2 atlas (three splats, then the bullet hole).
// groundAt(x, z, y): floor height under a point, so floor decals sit on stairs and slabs.
export function createDecals({ scene, atlas, groundAt, max = 320 }) {
  const decals = [];
  let decalY = 0, decalNext = 0, dirty = false;
  const atlasTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
    atlas.forEach((t, i) => { g.drawImage(t.image, (i % 2) * 128, Math.floor(i / 2) * 128, 128, 128); });
    return new THREE.CanvasTexture(cv);
  })();
  const dPos = new Float32Array(max * 12), dUv = new Float32Array(max * 8), dCol = new Float32Array(max * 12), dIdx = new Uint16Array(max * 6);
  for (let i = 0; i < max; i++) dIdx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(dPos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('uv', new THREE.BufferAttribute(dUv, 2).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(dCol, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setIndex(new THREE.BufferAttribute(dIdx, 1));
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true, transparent: true, depthWrite: false, fog: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  mesh.frustumCulled = false; mesh.renderOrder = 1; scene.add(mesh);
  const dQ = new THREE.Quaternion();

  function write(d, s) {
    const i = d.slot, h = s / 2;
    for (let k = 0; k < 4; k++) {
      const sx = k === 0 || k === 3 ? -1 : 1, sy = k < 2 ? -1 : 1;
      dPos[i * 12 + k * 3] = d.c.x + d.r.x * sx * h + d.u.x * sy * h; dPos[i * 12 + k * 3 + 1] = d.c.y + d.r.y * sx * h + d.u.y * sy * h; dPos[i * 12 + k * 3 + 2] = d.c.z + d.r.z * sx * h + d.u.z * sy * h;
      const cu = (d.cell % 2) * .5, cv = 1 - Math.floor(d.cell / 2) * .5;
      dUv[i * 8 + k * 2] = cu + (sx > 0 ? .495 : .005); dUv[i * 8 + k * 2 + 1] = cv - (sy > 0 ? .005 : .495);
      dCol[i * 12 + k * 3] = d.col.r; dCol[i * 12 + k * 3 + 1] = d.col.g; dCol[i * 12 + k * 3 + 2] = d.col.b;
    }
    dirty = true;
  }
  return {
    decals, mesh,
    // kind: 'blood' | 'pool' | 'hole' | 'scorch'. grow > 0: spreads out to full size over that many seconds (pools).
    decal(pos, normal, size, grow, kind) {
      const slot = decalNext++ % max; const old = decals.findIndex(o => o.slot === slot); if (old >= 0) decals.splice(old, 1);
      dQ.setFromUnitVectors(ZAXIS, normal); const a = Math.random() * 6.28;
      const d = { slot, size, grow: grow || 0, t: 0, cell: kind === 'hole' ? 3 : Math.floor(Math.random() * 3), col: new THREE.Color(DCOL[kind] || DCOL.blood),
        c: pos.clone().addScaledVector(normal, .006), r: new THREE.Vector3(Math.cos(a), Math.sin(a), 0).applyQuaternion(dQ), u: new THREE.Vector3(-Math.sin(a), Math.cos(a), 0).applyQuaternion(dQ) };
      // floor decals stack a hair apart so overlapping pools don't flicker
      if (normal.y > .9) { decalY = (decalY + 1) % 40; d.c.y = groundAt(pos.x, pos.z, pos.y + .3) + .002 + decalY * .0002; }
      write(d, grow ? size * .15 : size); decals.push(d); return d;
    },
    reset() { dPos.fill(0); decals.length = 0; decalNext = 0; dirty = true; },
    // growing pools spread out
    grow(dt) { decals.forEach(d => { if (d.grow > 0 && d.t < d.grow) { d.t += dt; const k = Math.min(1, d.t / d.grow); write(d, d.size * (.15 + .85 * (1 - Math.pow(1 - k, 2)))); } }); },
    // upload changes once a frame
    flush() { if (!dirty) return; dirty = false; geo.attributes.position.needsUpdate = true; geo.attributes.uv.needsUpdate = true; geo.attributes.color.needsUpdate = true; },
  };
}
