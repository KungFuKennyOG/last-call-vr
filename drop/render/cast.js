// The Kitchen's people as PS1 bodies: segmented rigid boxes on the same joints the shared actors/ code animates
// (legL, shinL, torso, armL, foreL, head…), so walking, wounds, hit reactions and ragdolls all work unchanged.
// Each joint is merged into one mesh on the character atlas; the face is a separate quad that swaps expression.
import * as THREE from 'three';
import { TEXTURES, face as faceImg } from '../art/textures.js';
import { SURFACES } from '../art/surfaces.js';
import { createAtlas, tintFor } from './atlas.js';
import { box, cyl, plane, F, mk, mergeInto, meshesUnder } from './geo.js';

const T = { ...TEXTURES, ...SURFACES };
const NEEDED = ['chefFront', 'apron', 'houndstooth', 'hairnet', 'chefSide', 'chefSleeve', 'cookSide', 'cookBack', 'hair', 'clog', 'skinCook', 'black', 'wood',
  'cleaver', 'tray', 'pants', 'apronRed', 'bandana', 'chefBlackFront', 'chefBlackSide', 'chefBlackSleeve', 'slide', 'brushedSteel', 'pan'];

/** How each enemy type dresses and what it carries. kind is the shared AI/animation class. */
export const OUTFITS = {
  lineCook: { front: 'chefFront', side: 'chefSide', sleeve: 'chefSleeve', pants: 'houndstooth', apron: 'apron', hat: 'hairnet', weapon: 'cleaver', kind: 'rusher', scale: 1.02, wide: 1.1 },
  pistolCook: { front: 'chefFront', side: 'chefSide', sleeve: 'chefSleeve', pants: 'pants', apron: 'apron', hat: 'hairnet', weapon: 'pistol', kind: 'shooter', scale: 1, wide: 1 },
  kitchenGunner: { front: 'chefBlackFront', side: 'chefBlackSide', sleeve: 'chefBlackSleeve', pants: 'pants', apron: 'apronRed', hat: 'bandana', weapon: 'smg', kind: 'gunner', scale: 1.04, wide: 1.05 },
  grabber: { front: 'chefSide', side: 'chefSide', sleeve: 'skinCook', pants: 'houndstooth', apron: 'apronRed', hat: 'bandana', weapon: null, kind: 'rusher', scale: .94, wide: .92 },
  expediter: { front: 'chefFront', side: 'chefSide', sleeve: 'chefSleeve', pants: 'houndstooth', apron: 'apron', hat: 'hair', weapon: 'bigCleaver', kind: 'heavy', scale: 1.38, wide: 1.25 },
};

export function createCast() {
  /** @type {Record<string, any>} */
  const imgs = {};
  for (const n of NEEDED) imgs[n] = T[n]();
  for (const ex of /** @type {const} */ (['neutral', 'hurt', 'scared', 'dazed'])) imgs['face_' + ex] = faceImg('cook', ex);
  const atlas = createAtlas(imgs, { cut: true });
  const A = (n, o) => atlas.mat(n, o);

  // the face quad, one material per expression; the shared animation code asks for these names
  const FACE = { neutral: A('face_neutral', { cut: true }), hurt: A('face_hurt', { cut: true }), scared: A('face_scared', { cut: true }), dazed: A('face_dazed', { cut: true }) };
  const faceMats = { neutral: FACE.neutral, neutral_blink: FACE.neutral, angry: FACE.neutral, angry_blink: FACE.neutral, pain: FACE.hurt,
    scared: FACE.scared, scream: FACE.scared, dead: FACE.dazed, agony: FACE.hurt, plead: FACE.scared };
  const faceGeo = plane(.2, .23);

  // geometry the ragdolls ask for (actors/ragdoll.js), as low-poly boxes
  const gc = new Map(), cached = (k, f) => gc.get(k) || (gc.set(k, f()), gc.get(k));
  const capGeo = (r, len) => cached('c' + r.toFixed(3) + len.toFixed(3), () => box(r * 2, len, r * 2));
  const rbox = (w, h, d) => cached('b' + [w, h, d].map(v => v.toFixed(3)).join(), () => box(w, h, d));
  const boxGeo = rbox;
  const cylGeo = (r, h) => cached('y' + r.toFixed(3) + h.toFixed(3), () => cyl(r, r, h, 6));
  const torsoRagGeo = s => cached('t' + s.toFixed(3), () => box(.4 * s, .5 * s, .23 * s, { tw: 1.15, td: 1.05 }).translate(0, .085 * s, 0));
  const shoeMat = A('clog'), beltMat = A('black'), gunMat = A('black'), stumpMat = atlas.color(0xb00018);
  const ENEMY_GUN = { shooter: [rbox(.045, .17, .07), -.43, -.53], gunner: [rbox(.055, .24, .09), -.44, -.58], heavy: [rbox(.01, .01, .01), -.4, -.5] };

  /** e.mats for an outfit: the standalone materials the ragdoll uses for its loose limbs. */
  function matsFor(o) { return { top: A(o.side), pants: A(o.pants), skin: A('skinCook'), sleeve: A(o.sleeve) }; }

  /** The head, centered, with its face quad: for the living (dead = false sets e.face) and for ragdolls. */
  function buildHead(e, k, dead) {
    const o = OUTFITS[e.type] || OUTFITS.lineCook;
    const m = new THREE.Mesh(box(.21 * k, .24 * k, .23 * k), F(A('cookSide'), A('skinCook'), A('cookBack'), A('hair'), A('skinCook')));
    const fq = new THREE.Mesh(faceGeo, dead ? FACE.dazed : FACE.neutral); fq.scale.setScalar(k); fq.position.z = .1155 * k; m.add(fq);
    if (o.hat === 'hairnet') mk(m, box(.225 * k, .1 * k, .245 * k), A('hairnet', { cut: true, double: true }), 0, .085 * k, 0);
    else if (o.hat === 'bandana') mk(m, box(.225 * k, .07 * k, .245 * k), A('bandana'), 0, .09 * k, 0);
    if (!dead) e.face = fq;
    return m;
  }

  /** Builds the jointed body for enemy e (e.type picks the outfit) inside `inner`. Fills e.hits. Returns the joints. */
  function buildBody(e, inner) {
    const o = OUTFITS[e.type] || OUTFITS.lineCook, W = o.wide;
    const pants = A(o.pants), sleeve = A(o.sleeve), skin = A('skinCook'), side = A(o.side), front = A(o.front), apron = A(o.apron);
    const J = {};
    const leg = (sx, sd) => {
      const L = new THREE.Group(); L.position.set(sx * .1 * W, .86, 0); inner.add(L);
      mk(L, box(.15 * W, .44, .16, { tw: 1.1, td: 1.08 }), pants, 0, -.21, 0);
      const S = new THREE.Group(); S.position.y = -.42; L.add(S);
      mk(S, box(.13 * W, .42, .14, { tw: 1.14, td: 1.1 }), pants, 0, -.2, 0);
      mk(S, box(.12, .08, .27), A('clog'), 0, -.41, .045);
      J['leg' + sd] = L; J['shin' + sd] = S;
    };
    leg(-1, 'L'); leg(1, 'R');
    const torso = new THREE.Group(); torso.position.y = .86; inner.add(torso); J.torso = torso;
    mk(torso, box(.33 * W, .2, .23), pants, 0, .02, 0);
    mk(torso, box(.42 * W, .52, .25, { tw: 1.12, td: 1.04, pivot: 'b' }), F(side, front, side, side), 0, .1, 0);
    mk(torso, box(.3 * W, .32, .015, { pivot: 'b' }), apron, 0, .13, .13);
    mk(torso, box(.38 * W, .52, .02, { pivot: 't' }), apron, 0, .16, .125);
    mk(torso, cyl(.055, .06, .12, 6), skin, 0, .66, 0);
    mk(torso, box(.3 * W, .07, .27, { tw: .85, td: .85 }), side, 0, .6, 0);
    const arm = (sx, sd) => {
      const Ar = new THREE.Group(); Ar.position.set(sx * .245 * W, .55, 0); torso.add(Ar);
      mk(Ar, box(.12, .32, .12, { tw: 1.1, td: 1.1 }), sleeve, 0, -.15, 0);
      const Fo = new THREE.Group(); Fo.position.y = -.3; Ar.add(Fo);
      mk(Fo, box(.1, .28, .1, { tw: 1.12, td: 1.1 }), sleeve, 0, -.14, 0);
      mk(Fo, box(.08, .1, .05), skin, 0, -.33, 0);
      J['arm' + sd] = Ar; J['fore' + sd] = Fo;
    };
    arm(-1, 'L'); arm(1, 'R');
    const head = new THREE.Group(); head.position.y = .68; torso.add(head); J.head = head;
    const hm = buildHead(e, 1, false); hm.position.y = .13; head.add(hm);
    // merge each joint into one atlas mesh, tagged for hits; the face stays its own quad
    inner.updateMatrixWorld(true);
    const parts = { legL: ['leg', 'L'], shinL: ['leg', 'L'], legR: ['leg', 'R'], shinR: ['leg', 'R'], torso: ['body', ''], armL: ['arm', 'L'], foreL: ['arm', 'L'], armR: ['arm', 'R'], foreR: ['arm', 'R'], head: ['head', ''] };
    const jointSet = new Set(Object.values(J));
    for (const [name, [part, sd]] of Object.entries(parts)) {
      const joint = J[name];
      const own = meshesUnder(joint, m => m === e.face || ownerJoint(m, jointSet) !== joint);
      for (const m of mergeInto(joint, own, atlas.remap, tintFor)) {
        m.geometry.computeBoundingSphere(); const c = m.geometry.boundingSphere.center.clone();
        m.geometry.translate(-c.x, -c.y, -c.z); m.position.copy(c); m.geometry.computeBoundingSphere();
        m.userData = { enemy: e, part, side: sd, joint: name }; e.hits.push(m);
      }
    }
    e.face.parent.remove(e.face); J.head.add(e.face); e.face.position.set(0, .13, .1155);
    return J;
  }

  /** The weapon in an enemy's right hand, as its own mesh so a disarm can take it away. */
  function weaponFor(e, foreR) {
    const o = OUTFITS[e.type]; if (!o || !o.weapon) return null;
    const g = new THREE.Group();
    if (o.weapon === 'pistol') { mk(g, box(.045, .17, .07), F(A('black'), A('slide'))); g.position.set(0, -.43, .02); }
    else if (o.weapon === 'smg') { mk(g, box(.055, .24, .09), A('black')); mk(g, box(.03, .12, .03), A('black'), 0, .02, .07); g.position.set(0, -.44, .02); }
    else if (o.weapon === 'cleaver' || o.weapon === 'bigCleaver') {
      const k = o.weapon === 'bigCleaver' ? 1.6 : 1;
      mk(g, cyl(.017 * k, .017 * k, .12 * k, 6), A('wood')); mk(g, box(.012 * k, .24 * k, .11 * k), A('cleaver'), 0, .16 * k, .03 * k);
      g.position.set(0, -.34, .02); g.rotation.x = 1.15;
    }
    foreR.add(g);
    const merged = mergeInto(g, meshesUnder(g), atlas.remap, tintFor);
    merged.forEach(m => { m.userData = { enemy: e, part: 'arm', side: 'R', joint: 'foreR', weapon: true }; });
    return g;
  }

  /** The Expediter's steel tray: a body shield held up in front. */
  function trayFor(torso) {
    const t = new THREE.Group(); t.position.set(0, .35, .26); torso.add(t);
    mk(t, box(.62, .5, .03), F(A('brushedSteel'), A('tray'), A('tray')), 0, 0, 0);
    mergeInto(t, meshesUnder(t), atlas.remap, tintFor);
    return t;
  }

  /** A thrown pan, spinning. */
  function panMesh() {
    const g = new THREE.Group();
    mk(g, cyl(.13, .11, .05, 8), [A('pan'), A('pan'), A('black')]);
    mk(g, box(.03, .02, .22), A('black'), 0, 0, .22);
    mergeInto(g, meshesUnder(g), atlas.remap, tintFor);
    return g;
  }

  // ragdolls draw as one mesh each: every frame their parts are written into one atlas geometry, so a body costs one
  // draw call whether it's flying, crawling or lying still. The parts stay (hidden) for bullets and the physics.
  const m4 = new THREE.Matrix4(), n3 = new THREE.Matrix3(), vp = new THREE.Vector3(), vn = new THREE.Vector3();
  function layout(r, scene) {
    const meshes = []; r.g.traverse(o => { if (o.isMesh && !o.userData.hiddenStump) meshes.push(o); });
    const verts = []; // [mesh index, vertex index]
    const uvs = [], cols = [];
    meshes.forEach((o, mi) => {
      const g = o.geometry, idx = g.index, T = g.attributes.uv;
      const groups = g.groups.length ? g.groups : [{ start: 0, count: idx ? idx.count : g.attributes.position.count, materialIndex: 0 }];
      for (const gr of groups) {
        const mat = Array.isArray(o.material) ? o.material[gr.materialIndex] : o.material;
        for (let k = gr.start; k < gr.start + gr.count; k++) {
          const i = idx ? idx.getX(k) : k, uv = [T ? T.getX(i) : 0, T ? T.getY(i) : 0];
          atlas.remap(mat, uv); verts.push(mi, i); uvs.push(uv[0], uv[1]); cols.push(...tintFor(mat));
        }
      }
      o.visible = false;
    });
    const n = verts.length / 2, geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    if (r.baked) { r.baked.geometry.dispose(); r.baked.geometry = geo; }
    else { r.baked = new THREE.Mesh(geo, atlas.atlasMat); r.baked.frustumCulled = false; scene.add(r.baked); }
    r.rag = { meshes, verts, face: r.face && r.face.material, count: meshes.length };
  }
  /** After the ragdoll moved: rewrite its one mesh. Cheap: a few hundred vertices. */
  function syncRag(r, scene) {
    let L = r.rag, count = 0; r.g.traverse(o => { if (o.isMesh) count++; });
    if (!L || L.count !== count || (r.face && L.face !== r.face.material)) { layout(r, scene); L = r.rag; }
    else if (r.asleep && L.synced) return;
    r.g.updateMatrixWorld(true);
    const P = r.baked.geometry.attributes.position, N = r.baked.geometry.attributes.normal, pa = P.array, na = N.array;
    let mi = -1;
    for (let j = 0, w = 0; j < L.verts.length; j += 2, w += 3) {
      if (L.verts[j] !== mi) { mi = L.verts[j]; m4.copy(L.meshes[mi].matrixWorld); n3.getNormalMatrix(m4); }
      const g = L.meshes[mi].geometry, i = L.verts[j + 1];
      vp.fromBufferAttribute(g.attributes.position, i).applyMatrix4(m4); pa[w] = vp.x; pa[w + 1] = vp.y; pa[w + 2] = vp.z;
      vn.fromBufferAttribute(g.attributes.normal, i).applyMatrix3(n3).normalize(); na[w] = vn.x; na[w + 1] = vn.y; na[w + 2] = vn.z;
    }
    P.needsUpdate = true; N.needsUpdate = true; L.synced = r.asleep;
  }

  return { atlas, FACE, faceMats, buildHead, buildBody, weaponFor, trayFor, panMesh, matsFor, capGeo, rbox, boxGeo, cylGeo, torsoRagGeo, shoeMat, beltMat, gunMat, stumpMat, ENEMY_GUN, syncRag,
    setExpr(e, ex) { if (ex !== e.expr && e.face) { e.expr = ex; e.face.material = faceMats[ex] || FACE.neutral; } } };
}

/** The joint a mesh belongs to: the nearest ancestor that is one of the joints. */
function ownerJoint(m, joints) { let a = m.parent; while (a && !joints.has(a)) a = a.parent; return a; }
