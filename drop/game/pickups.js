// Things on the floor you can pick up: a dropped Uzi, a cleaver. A disarmed cook's pistol lies there too, for
// him to go back for. Pickups bob and turn so they read at a glance; walk up and grip (Q in the browser).
import * as THREE from 'three';
import { box, cyl, mk, F } from '../render/geo.js';
import { M, C } from '../render/mats.js';
import { ps1 } from '../render/ps1.js';

const LABEL = { mg: 'UZI', cleaver: 'CLEAVER' };

/** @param {{ scene: any, gunKit: any }} o */
export function createPickups({ scene, gunKit }) {
  const P = { list: [] };
  const ringMat = ps1({ color: 0xff7a1a, unlit: true, double: true });
  const ringGeo = new THREE.RingGeometry(.3, .36, 8);
  function model(kind) {
    const g = new THREE.Group();
    if (kind === 'mg') { gunKit.addMG(g); g.scale.setScalar(1.7); }
    else if (kind === 'cleaver' ) { mk(g, cyl(.017, .017, .12, 6), M('wood'), 0, -.06, 0); mk(g, box(.012, .24, .11), M('cleaver'), 0, .1, .03); g.scale.setScalar(1.6); }
    else if (kind === 'pistolDropped') { mk(g, box(.045, .17, .07), F(C(0x1b1c1e), M('slide'))); g.rotation.z = Math.PI / 2; }
    g.traverse(o => { if (o.isMesh && (o.material.isMeshLambertMaterial || o.material.isMeshBasicMaterial)) o.material = ps1({ color: o.material.color.getHex() }); });
    return g;
  }
  /** kind: 'mg' | 'cleaver' | 'pistolDropped'. owner: the cook who dropped it (he may come back for it). */
  P.spawn = (kind, at, { owner = null } = {}) => {
    const g = new THREE.Group(); g.position.set(at.x, 0, at.z);
    const m = model(kind); m.position.y = kind === 'pistolDropped' ? .05 : .9; g.add(m);
    if (kind !== 'pistolDropped') { const ring = new THREE.Mesh(ringGeo, ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = .02; g.add(ring); }
    scene.add(g);
    const pk = { kind, g, m, at: g.position, owner, label: LABEL[kind] || '', t: Math.random() * 6 };
    P.list.push(pk); return pk;
  };
  P.remove = pk => { scene.remove(pk.g); P.list = P.list.filter(x => x !== pk); };
  P.clear = () => P.list.slice().forEach(P.remove);
  /** The nearest pickup the player can take within reach of a point (cooks' pistols aren't yours). */
  P.near = (pos, reach) => {
    let best = null, bd = reach;
    for (const pk of P.list) {
      if (pk.kind === 'pistolDropped') continue;
      const d = Math.hypot(pk.at.x - pos.x, pk.at.z - pos.z) + Math.max(0, Math.abs(pos.y - (pk.m.position.y)) - .6);
      if (d < bd) { bd = d; best = pk; }
    }
    return best;
  };
  P.update = realDt => {
    for (const pk of P.list) {
      if (pk.kind === 'pistolDropped') continue;
      pk.t += realDt; pk.m.rotation.y += realDt * 1.4; pk.m.position.y = .9 + Math.sin(pk.t * 2) * .05;
    }
  };
  return P;
}
