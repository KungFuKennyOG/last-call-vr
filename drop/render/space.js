// Builds one space from the chapter data: floor, walls with door openings, ceiling, cover, props, lights and rain.
// Everything that doesn't move is merged into a few meshes. Doors, order screens, fryers and the extinguisher
// stay separate and are handed back so the game can open, flip, shoot and grab them.
import * as THREE from 'three';
import { box, plane, F, mk, mergeInto, meshesUnder } from './geo.js';
import { M, C, flatRemap, flatColor } from './mats.js';
import { ps1, setLights } from './ps1.js';
import { COVER, PROPS } from './props.js';

/** Opening width and height for each door kind, in meters. */
export const DOOR_SIZE = { swing: [1.6, 2.2], roller: [2.4, 2.6], freezer: [1.2, 2.1], bay: [3.4, 3.2] };
const WALL_TEX = { subwayTile: 'subwayTile', freezerPanel: 'freezerPanel', corrugated: 'corrugated' };
const FLOOR_TEX = { quarryTile: 'quarryTile', steelPlate: 'steelPlate', concrete: 'concrete' };

/**
 * Which wall a door is on, from its position: 'n' (−z), 's' (+z), 'w' (−x) or 'e' (+x),
 * and the direction pointing into the room.
 */
export function doorWall(sp, at) {
  const [W, D] = sp.size;
  /** @type {[string, number][]} */
  const cand = [['n', Math.abs(at[2] + D / 2)], ['s', Math.abs(at[2] - D / 2)], ['w', Math.abs(at[0] + W / 2)], ['e', Math.abs(at[0] - W / 2)]];
  cand.sort((a, b) => a[1] - b[1]);
  const side = cand[0][0];
  const inward = { n: [0, 1], s: [0, -1], w: [1, 0], e: [-1, 0] }[side];
  return { side, inward };
}

/**
 * @param {any} sp a space from drop/ch1/spaces.js
 * @param {any} world from game/world.js (reset here)
 * @param {any} scene
 */
export function buildSpace(sp, world, scene) {
  const root = new THREE.Group(); root.name = 'space:' + sp.id; scene.add(root);
  const [W, D] = sp.size, H = sp.height;
  world.reset(sp.size, H);
  setLights(sp.lights);
  const solid = new THREE.Group(), deco = new THREE.Group(); root.add(solid, deco);

  // floor and ceiling, about one quad per meter so the warp stays a wobble
  mk(solid, plane(W, D, Math.ceil(W), Math.ceil(D)), M(FLOOR_TEX[sp.floor] || 'concrete', { repeat: [W, D] }), 0, 0, 0, -Math.PI / 2, 0, 0);
  mk(solid, plane(W, D, Math.ceil(W / 2), Math.ceil(D / 2)), M('ceiling', { repeat: [W / 2, D / 2] }), 0, H, 0, Math.PI / 2, 0, 0);

  // walls, cut round the door openings
  const doorsBy = { n: [], s: [], w: [], e: [] };
  for (const d of sp.doors) { const wl = doorWall(sp, d.at); doorsBy[wl.side].push({ d, ...wl }); }
  const wallTex = WALL_TEX[sp.walls] || 'subwayTile', wainscot = sp.walls === 'subwayTile';
  /** one wall: length L along its own x, at a transform that faces it into the room */
  function wall(side, L, place) {
    const g = new THREE.Group(); place(g); solid.add(g);
    const openings = doorsBy[side].map(o => {
      const c = side === 'n' ? o.d.at[0] : side === 's' ? -o.d.at[0] : side === 'w' ? -o.d.at[2] : o.d.at[2];
      const [ow, oh] = DOOR_SIZE[o.d.kind]; return { a: c - ow / 2, b: c + ow / 2, h: oh };
    }).sort((p, q) => p.a - q.a);
    const pieces = []; let x = -L / 2;
    for (const o of openings) { if (o.a > x) pieces.push([x, o.a, 0, H]); pieces.push([o.a, o.b, o.h, H]); x = o.b; }
    if (x < L / 2) pieces.push([x, L / 2, 0, H]);
    for (const [a, b, y0, y1] of pieces) {
      const w = b - a, h = y1 - y0; if (w < .01 || h < .01) continue;
      mk(g, plane(w, h, Math.max(1, Math.round(w)), Math.max(1, Math.round(h))), M(wallTex, { repeat: [w / 1.4, h / 1.4] }), (a + b) / 2, (y0 + y1) / 2, 0);
      if (wainscot && y0 === 0) mk(g, box(w, 1.1, .05), F(M('frp'), M('frp', { repeat: [w * 2, 2] })), (a + b) / 2, .55, .02);
      if (y0 === 0) mk(g, box(w, .12, .06), C(0x2a2c30), (a + b) / 2, .06, .03);
    }
  }
  wall('n', W, g => { g.position.set(0, 0, -D / 2); });
  wall('s', W, g => { g.position.set(0, 0, D / 2); g.rotation.y = Math.PI; });
  wall('w', D, g => { g.position.set(-W / 2, 0, 0); g.rotation.y = Math.PI / 2; });
  wall('e', D, g => { g.position.set(W / 2, 0, 0); g.rotation.y = -Math.PI / 2; });

  // cover: blocks movement and bullets
  for (const c of sp.cover) {
    const build = COVER[c.kind]; if (!build) continue;
    const g = build(c.size); g.position.set(c.at[0], c.at[1], c.at[2]); solid.add(g);
    world.addBox(c.at, c.size, { kind: c.kind });
  }

  // props
  const keep = [], screens = [], fryers = [], extinguishers = [];
  for (const p of sp.props) {
    const build = PROPS[p.kind]; if (!build) continue;
    const g = build(); g.position.set(p.at[0], p.at[1], p.at[2]); g.rotation.y = p.facing || 0; deco.add(g);
    if (g.userData.screens) { const m = mergeInto(g, g.userData.screens); screens.push(...m); keep.push(...m); }
    if (g.userData.fryer) { fryers.push({ group: g, oil: g.userData.dynamicKeep[0], burning: 0 }); keep.push(...g.userData.dynamicKeep); }
    if (g.userData.extinguisher) { extinguishers.push({ group: g, at: new THREE.Vector3(...p.at), used: false }); g.userData.keepWhole = true; }
  }
  // a tube light at every cold light near the ceiling
  for (const L of sp.lights.points) if (L.pos[1] > H - .9 && L.pos[1] <= H && L.color[2] > 1.3) mk(deco, box(1.2, .05, .22), F(M('fluo', { unlit: true })), L.pos[0], H - .03, L.pos[2]);

  // doors
  const doors = [];
  for (const side of ['n', 's', 'w', 'e']) for (const o of doorsBy[side]) doors.push(makeDoor(o, sp, root, solid));

  // rain outside open bays
  const rain = sp.props.some(p => p.kind === 'bayDoorsRain') ? makeRain(root, sp) : null;

  // merge what never moves
  root.updateMatrixWorld(true);
  const skip = o => keep.includes(o) || isUnder(o, extinguishers.map(e => e.group));
  const solidMerged = mergeInto(solid, meshesUnder(solid, skip), flatRemap, flatColor);
  mergeInto(deco, meshesUnder(deco, skip), flatRemap, flatColor);
  for (const m of solidMerged) { m.userData.solid = true; world.solids.push(m); }
  for (const f of fryers) { f.oil.userData.fryerRef = f; world.solids.push(f.oil); }
  for (const e of extinguishers) { mergeInto(e.group, meshesUnder(e.group), flatRemap, flatColor); e.group.traverse(o => { if (o.isMesh) { o.userData.extinguisherRef = e; world.solids.push(o); } }); }
  world.navBuild();

  return {
    sp, root, doors, screens, fryers, extinguishers, rain,
    door: id => doors.find(d => d.id === id),
    update(dt) {
      for (const d of doors) d.update(dt);
      if (rain) rain.update(dt);
    },
    dispose() {
      scene.remove(root);
      root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    },
  };
}

function isUnder(o, roots) { for (let p = o; p; p = p.parent) if (roots.includes(p)) return true; return false; }

/** A door: panels that swing, roll up or slide, an open amount that eases toward its target, and a lock. */
function makeDoor(o, sp, root, solid) {
  const { d, side, inward } = o, [ow, oh] = DOOR_SIZE[d.kind];
  const [W, Dp] = sp.size;
  const g = new THREE.Group(); root.add(g);
  const x = side === 'w' ? -W / 2 : side === 'e' ? W / 2 : d.at[0], z = side === 'n' ? -Dp / 2 : side === 's' ? Dp / 2 : d.at[2];
  g.position.set(x, 0, z); g.rotation.y = { n: 0, s: Math.PI, w: Math.PI / 2, e: -Math.PI / 2 }[side];
  const panels = [];
  // the frame never moves: it goes in with the walls and gets merged
  const frame = new THREE.Group(); frame.position.copy(g.position); frame.rotation.copy(g.rotation); solid.add(frame);
  const frameM = C(0x3e4347);
  mk(frame, box(.08, oh, .14), frameM, -ow / 2 - .04, oh / 2, 0); mk(frame, box(.08, oh, .14), frameM, ow / 2 + .04, oh / 2, 0);
  mk(frame, box(ow + .16, .1, .14), frameM, 0, oh + .05, 0);
  if (d.kind === 'swing') {
    for (const s of [-1, 1]) {
      const hinge = new THREE.Group(); hinge.position.set(s * ow / 2, 0, 0); g.add(hinge);
      mk(hinge, box(ow / 2 - .02, oh - .06, .05), F(M('brushedSteel'), M('swingDoor')), -s * (ow / 4), oh / 2, 0);
      panels.push({ o: hinge, kind: 'hinge', s });
    }
  } else if (d.kind === 'freezer') {
    const hinge = new THREE.Group(); hinge.position.set(-ow / 2, 0, 0); g.add(hinge);
    mk(hinge, box(ow - .04, oh - .04, .14), F(M('freezerPanel'), M('freezerPanel'), M('freezerPanel')), ow / 2, oh / 2, 0);
    mk(hinge, box(.06, .4, .1), C(0x8a9197), ow - .18, 1.05, .11);
    panels.push({ o: hinge, kind: 'hinge', s: 1 });
  } else if (d.kind === 'roller') {
    const shutter = mk(g, box(ow, oh, .06), M('roller', { repeat: [ow, oh * 2] }), 0, oh / 2, 0);
    mk(frame, box(ow + .2, .4, .4), M('roller'), 0, oh + .3, -.1);
    panels.push({ o: shutter, kind: 'roll', h: oh });
  } else if (d.kind === 'bay') {
    for (const s of [-1, 1]) { const p = mk(g, box(ow / 2, oh, .08), M('corrugated', { repeat: [ow / 2, oh] }), s * ow / 4, oh / 2, 0); panels.push({ o: p, kind: 'slide', s, w: ow / 2 }); }
  }
  // the light over the door: green when it'll let you through, red when locked
  const lampMat = { on: ps1({ color: 0x4cff7a, unlit: true }), off: ps1({ color: 0xff2a2a, unlit: true }) };
  const lamp = mk(g, box(.12, .06, .06), lampMat.off, 0, oh + .2, .06);
  const door = {
    id: d.id, to: d.to, kind: d.kind, side, inward, width: ow, height: oh,
    at: new THREE.Vector3(x, 0, z), group: g, open: 0, target: 0, locked: true, speed: 2.4,
    setLocked(v) { door.locked = v; lamp.material = v ? lampMat.off : lampMat.on; },
    update(dt) {
      door.open += Math.max(-dt * door.speed, Math.min(dt * door.speed, door.target - door.open));
      for (const p of panels) {
        if (p.kind === 'hinge') p.o.rotation.y = p.s * door.open * 1.45;
        else if (p.kind === 'roll') { p.o.position.y = p.h / 2 + door.open * (p.h - .1); }
        else if (p.kind === 'slide') p.o.position.x = p.s * (p.w / 2 + door.open * p.w);
      }
    },
  };
  if (d.kind === 'bay') { door.open = door.target = 1; door.update(0); }
  return door;
}

/** Thin unlit streaks falling outside the bay, in one instanced draw. */
function makeRain(root, sp) {
  const n = 160, geo = box(.012, .32, .012), mat = ps1({ color: 0x8fa2b8, unlit: true });
  const im = new THREE.InstancedMesh(geo, mat, n); im.frustumCulled = false; root.add(im);
  const D = sp.size[1], drops = [], m4 = new THREE.Matrix4();
  for (let i = 0; i < n; i++) drops.push({ x: (Math.random() - .5) * 8, y: Math.random() * 4.2, z: -D / 2 - .4 - Math.random() * 4, v: 8 + Math.random() * 3 });
  return {
    update(dt) {
      drops.forEach((p, i) => { p.y -= p.v * dt; if (p.y < 0) p.y += 4.2; m4.makeTranslation(p.x, p.y, p.z); im.setMatrixAt(i, m4); });
      im.instanceMatrix.needsUpdate = true;
    },
  };
}
