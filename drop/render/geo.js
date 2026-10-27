// Low-poly geometry the PS1 way, and merging so a space or a body costs few draw calls.
// Boxes are flat shaded with one material group per face, in three's order: +x, -x, +y, -y, +z, -z.
// F(side, front, back, top, bottom) builds the six-material array for a box from the faces you care about.
import * as THREE from 'three';

class Builder {
  constructor() { this.P = []; this.N = []; this.T = []; this.I = []; this.groups = []; }
  v(p, n, t) { this.P.push(p[0], p[1], p[2]); this.N.push(n[0], n[1], n[2]); this.T.push(t[0], t[1]); return this.P.length / 3 - 1; }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.T, 2));
    g.setIndex(this.I);
    for (const gr of this.groups) g.addGroup(gr.start, gr.count, gr.mi);
    g.computeBoundingSphere();
    return g;
  }
}
const norm3 = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

/** @type {any[]} normal, U (right), V (up), size keys */
const FACES = [
  [[1, 0, 0], [0, 0, -1], [0, 1, 0], 'd', 'h', 'w'], [[-1, 0, 0], [0, 0, 1], [0, 1, 0], 'd', 'h', 'w'],
  [[0, 1, 0], [1, 0, 0], [0, 0, -1], 'w', 'd', 'h'], [[0, -1, 0], [1, 0, 0], [0, 0, 1], 'w', 'd', 'h'],
  [[0, 0, 1], [1, 0, 0], [0, 1, 0], 'w', 'h', 'd'], [[0, 0, -1], [-1, 0, 0], [0, 1, 0], 'w', 'h', 'd']];

/**
 * @param {number} w @param {number} h @param {number} d
 * @param {{ tw?: number, td?: number, pivot?: 't' | 'b', at?: number[] }} [o]
 *   tw/td scale the top face (a tapered box); pivot 't' puts the origin at the top, 'b' at the bottom.
 */
export function box(w, h, d, o = {}) {
  const b = new Builder(), S = { w, h, d };
  FACES.forEach(([n, U, V, ku, kv, ko], fi) => {
    const start = b.I.length, base = b.P.length / 3, du = S[ku] / 2, dv = S[kv] / 2, off = S[ko] / 2;
    for (const [a, c] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.v([0, 1, 2].map(k => n[k] * off + U[k] * a * du + V[k] * c * dv), n, [(a + 1) / 2, (c + 1) / 2]);
    b.I.push(base, base + 1, base + 2, base, base + 2, base + 3); b.groups.push({ start, count: 6, mi: fi });
  });
  if (o.tw !== undefined || o.td !== undefined) {
    const tw = o.tw ?? 1, td = o.td ?? 1;
    for (let i = 0; i < b.P.length; i += 3) if (b.P[i + 1] > 0) { b.P[i] *= tw; b.P[i + 2] *= td; }
    flatNormals(b);
  }
  if (o.pivot === 't') shift(b, 0, -h / 2, 0); else if (o.pivot === 'b') shift(b, 0, h / 2, 0);
  if (o.at) shift(b, o.at[0], o.at[1], o.at[2]);
  return b.geo();
}

/** A flat plane facing +z, split into sx × sy quads so affine warping stays a wobble. */
export function plane(w, h, sx = 1, sy = 1) {
  const b = new Builder();
  for (let j = 0; j <= sy; j++) for (let i = 0; i <= sx; i++) b.v([(i / sx - .5) * w, (j / sy - .5) * h, 0], [0, 0, 1], [i / sx, j / sy]);
  for (let j = 0; j < sy; j++) for (let i = 0; i < sx; i++) { const a = j * (sx + 1) + i, c = a + 1, e = a + sx + 2, f = a + sx + 1; b.I.push(a, c, e, a, e, f); }
  b.groups.push({ start: 0, count: b.I.length, mi: 0 });
  return b.geo();
}

/** A cylinder with `seg` sides: group 0 the side, 1 the top, 2 the bottom (unless open). */
export function cyl(rt, rb, h, seg, o = {}) {
  const b = new Builder(), hh = h / 2, slope = (rb - rt) / h;
  for (let j = 0; j <= 1; j++) {
    const y = j ? hh : -hh, r = j ? rt : rb;
    for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2, sx = Math.sin(a), cz = Math.cos(a); b.v([r * sx, y, r * cz], norm3([sx, slope, cz]), [i / seg, j]); }
  }
  for (let i = 0; i < seg; i++) { const a = i, c = i + 1, e = i + seg + 2, f = i + seg + 1; b.I.push(a, c, e, a, e, f); }
  b.groups.push({ start: 0, count: b.I.length, mi: 0 });
  if (!o.open) for (const top of [1, 0]) {
    const start = b.I.length, y = top ? hh : -hh, r = top ? rt : rb, ny = top ? 1 : -1;
    const c = b.v([0, y, 0], [0, ny, 0], [.5, .5]);
    for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2; b.v([r * Math.sin(a), y, r * Math.cos(a)], [0, ny, 0], [.5 + Math.sin(a) / 2, .5 + Math.cos(a) / 2]); }
    for (let i = 0; i < seg; i++) { if (top) b.I.push(c, c + 1 + i, c + 2 + i); else b.I.push(c, c + 2 + i, c + 1 + i); }
    b.groups.push({ start, count: b.I.length - start, mi: top ? 1 : 2 });
  }
  if (o.at) shift(b, o.at[0], o.at[1], o.at[2]);
  return b.geo();
}

/** The top of a sphere: helmets, the extinguisher's cap. */
export function dome(r, ws = 8, hs = 3, thetaLen = Math.PI / 2) {
  const b = new Builder();
  for (let j = 0; j <= hs; j++) {
    const th = j / hs * thetaLen;
    for (let i = 0; i <= ws; i++) { const ph = i / ws * Math.PI * 2; const p = [r * Math.sin(th) * Math.sin(ph), r * Math.cos(th), r * Math.sin(th) * Math.cos(ph)]; b.v(p, norm3(p), [i / ws, 1 - j / hs]); }
  }
  for (let j = 0; j < hs; j++) for (let i = 0; i < ws; i++) { const a = j * (ws + 1) + i, c = a + 1, e = a + ws + 2, f = a + ws + 1; b.I.push(f, e, c, f, c, a); }
  b.groups.push({ start: 0, count: b.I.length, mi: 0 });
  return b.geo();
}

function shift(b, x, y, z) { for (let i = 0; i < b.P.length; i += 3) { b.P[i] += x; b.P[i + 1] += y; b.P[i + 2] += z; } }
function flatNormals(b) {
  for (let i = 0; i < b.I.length; i += 3) {
    const a = b.I[i] * 3, c = b.I[i + 1] * 3, e = b.I[i + 2] * 3, P = b.P;
    const ux = P[c] - P[a], uy = P[c + 1] - P[a + 1], uz = P[c + 2] - P[a + 2], vx = P[e] - P[a], vy = P[e + 1] - P[a + 1], vz = P[e + 2] - P[a + 2];
    const n = norm3([uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]);
    for (const k of [a, c, e]) { b.N[k] = n[0]; b.N[k + 1] = n[1]; b.N[k + 2] = n[2]; }
  }
}

/** Six box materials from the faces you care about. */
export const F = (side, front, back = side, top = side, bottom = side) => [side, side, top, bottom, front, back];

/** A mesh with a position and rotation, added to a parent. mats is one material or the per-group array. */
export function mk(parent, geo, mats, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mats); m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  if (parent) parent.add(m);
  return m;
}

/* ---------- merging ---------- */

const mInv = new THREE.Matrix4(), mRel = new THREE.Matrix4(), nm = new THREE.Matrix3(), vP = new THREE.Vector3(), vN = new THREE.Vector3();

/**
 * Collects the triangles of every mesh under `meshes` into one geometry per material, in `parent`'s space.
 * remap(mat, uv) can rewrite each vertex's uv (into an atlas) and return the material to file it under.
 * colorOf(mat) gives each vertex a color from its source material (flat colors on the atlas's white swatch).
 * @param {any} parent
 * @param {any[]} meshes
 * @param {(mat: any, uv: number[]) => any} [remap]
 * @param {(mat: any) => number[]} [colorOf]
 * @param {boolean} [keep] leave the source meshes where they are (a corpse that may wake up again)
 * @returns {any[]} new meshes, already added to parent
 */
export function mergeInto(parent, meshes, remap, colorOf, keep) {
  parent.updateMatrixWorld(true); mInv.copy(parent.matrixWorld).invert();
  /** @type {Map<any, { P: number[], N: number[], T: number[], C: number[] | null }>} */
  const out = new Map();
  const uv = [0, 0];
  for (const o of meshes) {
    mRel.multiplyMatrices(mInv, o.matrixWorld); nm.getNormalMatrix(mRel);
    const g = o.geometry, P = g.attributes.position, Nn = g.attributes.normal, Tt = g.attributes.uv, Cc = g.attributes.color, idx = g.index;
    const groups = g.groups.length ? g.groups : [{ start: 0, count: idx ? idx.count : P.count, materialIndex: 0 }];
    for (const gr of groups) {
      const src = Array.isArray(o.material) ? o.material[gr.materialIndex] : o.material;
      if (!src || src.visible === false || src.userData.noMerge) continue;
      for (let k = gr.start; k < gr.start + gr.count; k++) {
        const i = idx ? idx.getX(k) : k;
        uv[0] = Tt ? Tt.getX(i) : 0; uv[1] = Tt ? Tt.getY(i) : 0;
        const mat = remap ? remap(src, uv) : src;
        let bucket = out.get(mat);
        if (!bucket) out.set(mat, bucket = { P: [], N: [], T: [], C: Cc || colorOf || mat.vertexColors ? [] : null });
        vP.fromBufferAttribute(P, i).applyMatrix4(mRel); bucket.P.push(vP.x, vP.y, vP.z);
        if (Nn) { vN.fromBufferAttribute(Nn, i).applyMatrix3(nm).normalize(); bucket.N.push(vN.x, vN.y, vN.z); } else bucket.N.push(0, 1, 0);
        bucket.T.push(uv[0], uv[1]);
        if (bucket.C) {
          const c = colorOf ? colorOf(src) : null;
          bucket.C.push(c ? c[0] : Cc ? Cc.getX(i) : 1, c ? c[1] : Cc ? Cc.getY(i) : 1, c ? c[2] : Cc ? Cc.getZ(i) : 1);
        }
      }
    }
    if (!keep && o.parent) o.parent.remove(o);
  }
  const made = [];
  out.forEach((b, mat) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(b.P, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.N, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.T, 2));
    if (b.C) geo.setAttribute('color', new THREE.Float32BufferAttribute(b.C, 3));
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, mat); parent.add(m); made.push(m);
  });
  return made;
}

/** Every mesh under root (not root itself), for mergeInto. */
export function meshesUnder(root, skip) {
  const list = [];
  root.traverse(o => { if (o !== root && o.isMesh && !(skip && skip(o))) list.push(o); });
  return list;
}
