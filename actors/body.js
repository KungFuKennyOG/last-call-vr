// Enemy bodies: cached geometry, shared materials, and the jointed body every enemy is built from.
import * as THREE from 'three';

export const SKINS = [0xc58c6b, 0x8d5a3b, 0xe0b090, 0x6b4128, 0xd9a07a];
export const HAIRS = [0x15100c, 0x2a1c12, 0x0c0c0c, 0x5a4632, 0x8a8a88];

// Call once, where the game sets up its enemies. Geometry is cached by size, so every enemy shares it.
export function createBodyKit() {
  const matCache = {};
  const lam = c => matCache[c] || (matCache[c] = new THREE.MeshLambertMaterial({ color: c }));
  const glassesMat = new THREE.MeshPhongMaterial({ color: 0x050505, specular: 0x8888aa, shininess: 90 });
  const stumpMat = new THREE.MeshLambertMaterial({ color: 0xb00018, emissive: 0x5a0008 });
  const shoeMat = new THREE.MeshLambertMaterial({ color: 0x0b0b0b }), beltMat = new THREE.MeshLambertMaterial({ color: 0x1c1510 });
  const geoCache = {}, geoC = {};
  const boxGeo = (w, h, d) => { const k = w.toFixed(3) + '_' + h.toFixed(3) + '_' + d.toFixed(3); return geoCache[k] || (geoCache[k] = new THREE.BoxGeometry(w, h, d)); };
  const capGeo = (r, len) => { const k = 'c' + r.toFixed(3) + '_' + len.toFixed(3); return geoC[k] || (geoC[k] = new THREE.CapsuleGeometry(r, Math.max(.005, len - 2 * r), 3, 10)); };
  const cylGeo = (r, h) => { const k = 'y' + r.toFixed(3) + '_' + h.toFixed(3); return geoC[k] || (geoC[k] = new THREE.CylinderGeometry(r, r * 1.06, h, 10)); };
  const sphGeo = r => { const k = 's' + r.toFixed(3); return geoC[k] || (geoC[k] = new THREE.SphereGeometry(r, 10, 8)); };
  // a box with rounded edges and smooth normals; taper narrows it toward the bottom (a chest into a waist)
  function rbox(w, h, d, r, taper) {
    const k = 'r' + [w, h, d, r, taper || 0].map(v => v.toFixed(4)).join('_'); if (geoC[k]) return geoC[k];
    const g = new THREE.BoxGeometry(w, h, d, 4, 4, 4), pos = g.attributes.position, nor = g.attributes.normal, v = new THREE.Vector3(), inn = new THREE.Vector3();
    const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      inn.set(Math.max(-hx, Math.min(hx, v.x)), Math.max(-hy, Math.min(hy, v.y)), Math.max(-hz, Math.min(hz, v.z)));
      v.sub(inn); if (v.lengthSq() < 1e-12) v.set(0, 0, 1); v.normalize();
      const py = inn.y + v.y * r, tf = taper ? 1 - taper * (.5 - py / h) : 1;
      pos.setXYZ(i, (inn.x + v.x * r) * tf, py, (inn.z + v.z * r) * (taper ? .86 + .14 * tf : 1)); nor.setXYZ(i, v.x, v.y, v.z);
    }
    return geoC[k] = g;
  }
  const chestGeo = () => rbox(.4, .5, .23, .08, .18);
  // the chest as one rigid piece for a ragdoll of scale s, pivot moved to the middle
  const torsoRagGeo = s => { const k = 't' + s.toFixed(3); if (geoC[k]) return geoC[k]; return geoC[k] = rbox(.4 * s, .5 * s, .23 * s, .08 * s, .18).clone().translate(0, .085 * s, 0); };
  // a hit box: shootable, tagged with its enemy, body part and side
  function part(parent, w, h, d, x, y, z, mat, e, name, side) {
    const m = new THREE.Mesh(boxGeo(w, h, d), mat); m.position.set(x, y, z); m.userData = { enemy: e, part: name, side }; parent.add(m); e.hits.push(m); return m;
  }
  function mark(parent, x, y, z) { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; }
  return { lam, matCache, glassesMat, stumpMat, shoeMat, beltMat, boxGeo, capGeo, cylGeo, sphGeo, rbox, chestGeo, torsoRagGeo, part, mark };
}

// Builds the jointed body inside `inner` (already scaled to the enemy): legs, hips, chest, neck, arms, head.
// e.mats needs top, pants, skin, sleeve. Every shootable mesh goes into e.hits tagged with its part.
// torsoDeco(torso, deco): add shirt fronts, chains and so on to the chest before the arms go on.
// Returns the joints: { legL, shinL, legR, shinR, torso, armL, foreL, armR, foreR, head }.
/**
 * @param {any} e
 * @param {any} inner
 * @param {any} kit
 * @param {Function} buildHead
 * @param {{ torsoDeco?: (torso: any, deco: Function) => void }} [opts]
 */
export function buildBody(e, inner, kit, buildHead, { torsoDeco } = {}) {
  const { capGeo, cylGeo, sphGeo, rbox, chestGeo, shoeMat, beltMat } = kit;
  const M = e.mats;
  const hit = (mesh, parent, x, y, z, name, side) => { mesh.position.set(x, y, z); mesh.userData = { enemy: e, part: name, side }; parent.add(mesh); e.hits.push(mesh); return mesh; };
  const deco = (mesh, parent, x, y, z) => { mesh.position.set(x, y, z); parent.add(mesh); return mesh; };
  const mkLeg = (sx, sd) => {
    const leg = new THREE.Group(); leg.position.set(sx * .1, .86, 0); inner.add(leg);
    hit(new THREE.Mesh(capGeo(.078, .44), M.pants), leg, 0, -.21, 0, 'leg', sd);
    const shin = new THREE.Group(); shin.position.y = -.42; leg.add(shin);
    hit(new THREE.Mesh(capGeo(.062, .42), M.pants), shin, 0, -.2, 0, 'leg', sd);
    hit(new THREE.Mesh(rbox(.1, .08, .25, .03), shoeMat), shin, 0, -.41, .045, 'leg', sd);
    return [leg, shin];
  };
  const [legL, shinL] = mkLeg(-1, 'L'), [legR, shinR] = mkLeg(1, 'R');
  const torso = new THREE.Group(); torso.position.y = .86; inner.add(torso);
  hit(new THREE.Mesh(rbox(.33, .2, .22, .07), M.pants), torso, 0, .02, 0, 'body', '');
  deco(new THREE.Mesh(rbox(.335, .04, .225, .015), beltMat), torso, 0, .12, 0);
  hit(new THREE.Mesh(chestGeo(), M.top), torso, 0, .36, 0, 'body', '');
  deco(new THREE.Mesh(cylGeo(.055, .14), M.skin), torso, 0, .64, 0);
  if (torsoDeco) torsoDeco(torso, deco);
  const mkArm = (sx, sd) => {
    const arm = new THREE.Group(); arm.position.set(sx * .245, .55, 0); torso.add(arm);
    deco(new THREE.Mesh(sphGeo(.068), M.sleeve), arm, 0, 0, 0);
    hit(new THREE.Mesh(capGeo(.056, .32), M.sleeve), arm, 0, -.15, 0, 'arm', sd);
    const fore = new THREE.Group(); fore.position.y = -.3; arm.add(fore);
    hit(new THREE.Mesh(capGeo(.047, .3), M.sleeve), fore, 0, -.14, 0, 'arm', sd);
    hit(new THREE.Mesh(rbox(.075, .1, .035, .015), M.skin), fore, 0, -.33, 0, 'arm', sd);
    return [arm, fore];
  };
  const [armL, foreL] = mkArm(-1, 'L'), [armR, foreR] = mkArm(1, 'R');
  const head = new THREE.Group(); head.position.y = .68; torso.add(head);
  hit(buildHead(e, 1, false), head, 0, .13, 0, 'head', '');
  return { legL, shinL, legR, shinR, torso, armL, foreL, armR, foreR, head };
}

// The 15 ragdoll joints, in the order the ragdoll expects (see actors/ragdoll.js).
export function bodyMarks(J, mark) {
  return [mark(J.head, 0, .255, 0), mark(J.torso, 0, .66, 0), mark(J.torso, 0, .02, 0),
    mark(J.armL, 0, 0, 0), mark(J.foreL, 0, 0, 0), mark(J.foreL, 0, -.32, 0),
    mark(J.armR, 0, 0, 0), mark(J.foreR, 0, 0, 0), mark(J.foreR, 0, -.32, 0),
    mark(J.legL, 0, 0, 0), mark(J.shinL, 0, 0, 0), mark(J.shinL, 0, -.42, 0),
    mark(J.legR, 0, 0, 0), mark(J.shinR, 0, 0, 0), mark(J.shinR, 0, -.42, 0)];
}

// Fresh per-enemy state for hit reactions and wounds.
export function bodyState() {
  return { downed: false, stunT: 0, re: { tx: 0, vx: 0, ty: 0, vy: 0, tz: 0, vz: 0, aL: 0, vaL: 0, aR: 0, vaR: 0, kn: 0, vkn: 0 }, legHurt: { L: 0, R: 0 }, armHurt: { L: false, R: false }, gutHurt: false };
}
