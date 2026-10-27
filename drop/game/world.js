// Collision and line of sight for the space you're in: its walls, the cover in it, and the doors (closed doors block).
// Every space is one flat floor at y = 0, so the ground is simple; walls and cover are axis-aligned boxes.
// Ported from Showdowns' level space, without ramps and raised floors.
import * as THREE from 'three';

/** @typedef {{ x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, off?: boolean, door?: any, low?: boolean }} Wall */

export function createWorld() {
  const W = {
    BX0: -5, BX1: 5, BZ0: -5, BZ1: 5, CEIL: 4,
    /** @type {Wall[]} */ walls: [],
    /** meshes bullets and sight lines stop at */ solids: [],
    nav: { ready: false, cs: .5, fields: {} },
  };
  const losRay = new THREE.Raycaster(), losDir = new THREE.Vector3();

  W.reset = (size, height) => {
    W.BX0 = -size[0] / 2; W.BX1 = size[0] / 2; W.BZ0 = -size[1] / 2; W.BZ1 = size[1] / 2; W.CEIL = height;
    W.walls.length = 0; W.solids.length = 0; W.nav.ready = false; W.nav.fields = {};
  };
  /** A box that blocks movement: { at: [x, y, z] base center, size: [w, h, d] }. */
  W.addBox = (at, size, extra = {}) => {
    const w = { x0: at[0] - size[0] / 2, x1: at[0] + size[0] / 2, z0: at[2] - size[2] / 2, z1: at[2] + size[2] / 2, y0: at[1], y1: at[1] + size[1], ...extra };
    W.walls.push(w); return w;
  };
  W.groundAt = () => 0;
  W.topAt = () => 0;

  W.pushOut = (p, r, y = p.y, tall = 1.7) => {
    if (p.x > W.BX1 - r) p.x = W.BX1 - r; if (p.x < W.BX0 + r) p.x = W.BX0 + r;
    if (p.z > W.BZ1 - r) p.z = W.BZ1 - r; if (p.z < W.BZ0 + r) p.z = W.BZ0 + r;
    for (let pass = 0; pass < 2; pass++) for (const w of W.walls) {
      if (w.off || y + tall < w.y0 || y >= w.y1) continue;
      const cx = (w.x0 + w.x1) / 2, cz = (w.z0 + w.z1) / 2, hx = (w.x1 - w.x0) / 2 + r, hz = (w.z1 - w.z0) / 2 + r, dx = p.x - cx, dz = p.z - cz, ox = hx - Math.abs(dx), oz = hz - Math.abs(dz);
      if (ox > 0 && oz > 0) { if (ox < oz) p.x += (dx < 0 ? -1 : 1) * ox; else p.z += (dz < 0 ? -1 : 1) * oz; }
    }
  };
  W.moveEntity = (p, dx, dz, r, y) => { p.x += dx; p.z += dz; W.pushOut(p, r, y); };
  W.solidAt = (x, y, z) => {
    if (x > W.BX1 || x < W.BX0 || z > W.BZ1 || z < W.BZ0 || y < 0 || y > W.CEIL) return true;
    for (const w of W.walls) if (!w.off && x > w.x0 && x < w.x1 && z > w.z0 && z < w.z1 && y > w.y0 && y < w.y1) return true;
    return false;
  };
  W.canSee = (a, b) => {
    losDir.copy(b).sub(a); const d = losDir.length(); if (d < .01) return true;
    losDir.divideScalar(d); losRay.set(a, losDir); losRay.far = d - .3;
    return losRay.intersectObjects(W.solids, false).length === 0;
  };
  /** Which way a surface faces at p, snapping p onto it (for decals and droplets), or null in open air. */
  const nTmp = new THREE.Vector3();
  W.surfaceNormal = p => {
    if (p.y < .03) { p.y = 0; return nTmp.set(0, 1, 0); }
    if (p.y > W.CEIL - .05) return nTmp.set(0, -1, 0);
    if (p.x > W.BX1 - .08) return nTmp.set(-1, 0, 0); if (p.x < W.BX0 + .08) return nTmp.set(1, 0, 0);
    if (p.z > W.BZ1 - .08) return nTmp.set(0, 0, -1); if (p.z < W.BZ0 + .08) return nTmp.set(0, 0, 1);
    for (const w of W.walls) {
      if (w.off || !(p.x > w.x0 && p.x < w.x1 && p.z > w.z0 && p.z < w.z1 && p.y > w.y0 && p.y < w.y1)) continue;
      const ox = Math.min(p.x - w.x0, w.x1 - p.x), oz = Math.min(p.z - w.z0, w.z1 - p.z), oy = w.y1 - p.y;
      if (oy < ox && oy < oz) { p.y = w.y1; return nTmp.set(0, 1, 0); }
      if (ox < oz) { const r = p.x - w.x0 > w.x1 - p.x; p.x = r ? w.x1 : w.x0; return nTmp.set(r ? 1 : -1, 0, 0); }
      const f = p.z - w.z0 > w.z1 - p.z; p.z = f ? w.z1 : w.z0; return nTmp.set(0, 0, f ? 1 : -1);
    }
    return null;
  };

  /* ---------- nav: a 0.5 m grid; a distance field from a goal, walked downhill ---------- */
  const segBox = (ax, az, bx, bz, b) => {
    const dx = bx - ax, dz = bz - az, P = [-dx, dx, -dz, dz], Q = [ax - b.x0, b.x1 - ax, az - b.z0, b.z1 - az]; let t0 = 0, t1 = 1;
    for (let i = 0; i < 4; i++) {
      if (Math.abs(P[i]) < 1e-9) { if (Q[i] < 0) return null; }
      else { const t = Q[i] / P[i]; if (P[i] < 0) { if (t > t1) return null; if (t > t0) t0 = t; } else { if (t < t0) return null; if (t < t1) t1 = t; } }
    }
    return t0;
  };
  W.navBuild = () => {
    const N = W.nav, cs = N.cs, nx = Math.ceil((W.BX1 - W.BX0) / cs), nz = Math.ceil((W.BZ1 - W.BZ0) / cs), blk = new Uint8Array(nx * nz), r = .36;
    N.obs = W.walls.filter(w => w.y0 < 1.6 && w.y1 > .1).map(b => ({ x0: b.x0 - r, x1: b.x1 + r, z0: b.z0 - r, z1: b.z1 + r, w: b }));
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const x = W.BX0 + (i + .5) * cs, z = W.BZ0 + (j + .5) * cs;
      let b = x < W.BX0 + r || x > W.BX1 - r || z < W.BZ0 + r || z > W.BZ1 - r;
      if (!b) for (const o of N.obs) { if (o.w.off || o.w.door) continue; if (x > o.x0 && x < o.x1 && z > o.z0 && z < o.z1) { b = true; break; } }
      blk[i + j * nx] = b ? 1 : 0;
    }
    Object.assign(N, { nx, nz, blk, q: new Int32Array(nx * nz), path: [], ready: true, fields: {} });
  };
  W.navField = (key, gx, gz) => {
    const { nx, nz, blk, cs, q } = W.nav; if (!W.nav.ready) return;
    const f = W.nav.fields[key] || (W.nav.fields[key] = new Float32Array(nx * nz));
    f.fill(1e9);
    const ci = Math.max(0, Math.min(nx - 1, Math.floor((gx - W.BX0) / cs))), cj = Math.max(0, Math.min(nz - 1, Math.floor((gz - W.BZ0) / cs)));
    let h = 0, t = 0; const c0 = ci + cj * nx; f[c0] = 0; q[t++] = c0;
    const step = (n, d) => { if (!blk[n] && f[n] > d) { f[n] = d; q[t++] = n; } };
    while (h < t) { const c = q[h++], i = c % nx, d = f[c] + 1; if (i > 0) step(c - 1, d); if (i < nx - 1) step(c + 1, d); if (c >= nx) step(c - nx, d); if (c < nx * (nz - 1)) step(c + nx, d); }
  };
  W.segClear = (ax, az, bx, bz) => {
    for (const b of (W.nav.obs || [])) { if (b.w.off) continue; if (segBox(ax, az, bx, bz, b) !== null) return false; }
    return true;
  };
  /** The next point to walk to on the way down the field `key`, or null. */
  W.navStep = (key, p, out) => {
    const f = W.nav.fields[key]; if (!f) return null; const { nx, nz, cs, blk } = W.nav;
    let c = Math.max(0, Math.min(nx - 1, Math.floor((p.x - W.BX0) / cs))) + Math.max(0, Math.min(nz - 1, Math.floor((p.z - W.BZ0) / cs))) * nx;
    const path = W.nav.path; path.length = 0;
    for (let s = 0; s < 12; s++) {
      const ci = c % nx, cj = (c - ci) / nx; let bn = -1, bd = f[c];
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        if (!di && !dj) continue; const ii = ci + di, jj = cj + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) continue;
        if (di && dj && (blk[ci + di + cj * nx] || blk[ci + jj * nx])) continue;
        const n = ii + jj * nx; if (f[n] < bd) { bd = f[n]; bn = n; }
      }
      if (bn < 0) break; c = bn; path.push(c); if (f[c] === 0) break;
    }
    if (!path.length) return null;
    let pick = path[0];
    for (const n of path) { const x = W.BX0 + (n % nx + .5) * cs, z = W.BZ0 + (Math.floor(n / nx) + .5) * cs; if (W.segClear(p.x, p.z, x, z)) pick = n; else break; }
    return out.set(W.BX0 + (pick % nx + .5) * cs, 0, W.BZ0 + (Math.floor(pick / nx) + .5) * cs);
  };
  return W;
}
