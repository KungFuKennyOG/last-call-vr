// Things flying at you: the cooks' rounds (slow glowing tracers you can dodge or shoot out of the air) and the
// Expediter's pans (shoot them down). A close miss gives a slow-mo beat and style points.
import * as THREE from 'three';
import { sfxDeflect, sfxWhoosh, sfxWhack, sfxThud } from '../../audio/index.js';
import { buzz } from '../../engine/index.js';
import { ps1 } from '../render/ps1.js';

/** @param {{ scene: any, world: any, fx: any, player: any, cast: any, G: any }} o */
export function createProjectiles({ scene, world, fx, player, cast, G }) {
  const P = { list: [], hittables: [] };
  const geo = new THREE.SphereGeometry(.045, 6, 4), mat = ps1({ color: 0xff4a3a, unlit: true, noFog: true });
  const proxyGeo = new THREE.SphereGeometry(.3, 6, 4), proxyMat = new THREE.MeshBasicMaterial({ visible: false });
  const glowMat = new THREE.SpriteMaterial({ map: fx.glowTex, color: 0xff2030, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const trailGeo = new THREE.CylinderGeometry(.012, .002, .7, 4, 1, true); trailGeo.rotateX(-Math.PI / 2); trailGeo.translate(0, 0, .35);
  const trailMat = new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false });
  const prev = new THREE.Vector3(), q = new THREE.Vector3(), cp = new THREE.Vector3(), dirV = new THREE.Vector3();

  /** A cook's round from `from` toward `to`. */
  P.fire = (from, to, owner) => {
    const m = new THREE.Mesh(geo, mat); m.position.copy(from);
    const gl = new THREE.Sprite(glowMat); gl.scale.setScalar(.45); m.add(gl);
    m.add(new THREE.Mesh(trailGeo, trailMat));
    const proxy = new THREE.Mesh(proxyGeo, proxyMat); m.add(proxy);
    const pr = { kind: 'round', owner, m, proxy, v: to.clone().sub(from).normalize().multiplyScalar(10), life: 7, minD: 99, prevD: 99, passed: false, dmg: 1 };
    m.lookAt(q.copy(from).add(pr.v)); proxy.userData = { proj: pr };
    scene.add(m); P.list.push(pr); P.hittables.push(proxy);
    return pr;
  };
  /** A pan thrown in an arc: lands near `target` (x, z) at chest height. */
  P.pan = (from, target, speed) => {
    const m = cast.panMesh(); m.position.copy(from);
    const to = new THREE.Vector3(target.x, 1.2, target.z), d = from.distanceTo(to), T = Math.max(.45, d / speed);
    const v = to.clone().sub(from).divideScalar(T); v.y += 4.9 * T; // gravity 9.8 over the flight
    const proxy = new THREE.Mesh(proxyGeo, proxyMat); proxy.scale.setScalar(.9); m.add(proxy);
    const pr = { kind: 'pan', m, proxy, v, life: 4, minD: 99, prevD: 99, passed: false, dmg: 2, spin: 9 + Math.random() * 6, g: 9.8 };
    proxy.userData = { proj: pr }; scene.add(m); P.list.push(pr); P.hittables.push(proxy);
    return pr;
  };
  P.remove = pr => { scene.remove(pr.m); P.list = P.list.filter(x => x !== pr); P.hittables = P.hittables.filter(h => h !== pr.proxy); };
  P.clear = () => P.list.slice().forEach(P.remove);

  /** Shot out of the air. */
  P.deflect = pr => {
    fx.sparkBurst(pr.m.position, 10); (pr.kind === 'pan' ? sfxWhack : sfxDeflect)();
    G.combat.style(pr.m.position.clone(), pr.kind === 'pan' ? 'PAN DOWN' : 'DEFLECT', pr.kind === 'pan' ? 80 : 50);
    if (pr.kind === 'pan') { // knocked away, clatters to the floor
      const m = pr.m; P.remove(pr); scene.add(m);
      const v = pr.v.clone().multiplyScalar(-.3); v.y = 2;
      G.debris.push({ m, v, life: 3 });
    } else P.remove(pr);
  };

  P.update = dt => {
    for (const pr of P.list.slice()) {
      prev.copy(pr.m.position);
      if (pr.g) pr.v.y -= pr.g * dt;
      pr.m.position.addScaledVector(pr.v, dt); pr.life -= dt;
      if (pr.spin) { pr.m.rotation.x += pr.spin * dt; pr.m.rotation.y += pr.spin * .4 * dt; }
      const p = pr.m.position;
      if (world.solidAt(p.x, p.y, p.z) || p.y < .03) {
        const s = p.clone(), n = world.surfaceNormal(s); if (n && pr.kind === 'round') fx.decal(s, n.clone(), .06, 0, 'hole');
        fx.sparkBurst(p, 5, true); if (pr.kind === 'pan') sfxThud();
        P.remove(pr); continue;
      }
      // closest approach to your head along this frame's path
      dirV.copy(pr.v); const sl = dirV.length() * dt; dirV.normalize();
      q.copy(player.headPos).sub(prev); const tt = Math.max(0, Math.min(sl, q.dot(dirV)));
      cp.copy(prev).addScaledVector(dirV, tt); const d = cp.distanceTo(player.headPos);
      if (d < (pr.kind === 'pan' ? .32 : .2)) { G.hurtPlayer(pr.dmg, pr.owner); P.remove(pr); continue; }
      pr.minD = Math.min(pr.minD, d);
      if (!pr.passed && d > pr.prevD + .001 && pr.minD < 2) { pr.passed = true; if (pr.minD < .55) nearMiss(pr); }
      pr.prevD = d;
      if (pr.life <= 0) P.remove(pr);
    }
  };
  function nearMiss(pr) {
    G.combat.style(pr.m.position.clone(), 'CLOSE', 75);
    G.bt.slowmo(.3, .7); sfxWhoosh(); buzz('both', .3, 60);
  }
  return P;
}
