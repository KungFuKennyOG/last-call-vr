// Blood: sprays of droplets (which leave splats where they land) and a short red mist at the wound.
import * as THREE from 'three';

export const BLOOD_COLS = [0xc4001c, 0x8a0012, 0xe6142e].map(c => new THREE.Color(c));

// particles: from createParticles. glowTex: soft round sprite texture for the mist.
export function createBlood({ scene, particles, decals, glowTex }) {
  const v = new THREE.Vector3(), tmp = particles.tmp;
  // n droplets along dir at about speed m/s; spread 0..1 widens the cone
  function spray(pos, dir, n, speed, spread) {
    for (let i = 0; i < n; i++) {
      v.copy(dir).add(tmp.randomDirection().multiplyScalar(spread)).normalize().multiplyScalar(speed * (.35 + Math.random() * .9));
      particles.addPart(pos, v, BLOOD_COLS[i % 3], (.6 + Math.random() * 1.4) * 1.5, 2.5, 9.8, true);
    }
  }
  const mistMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xaa0016, transparent: true, depthWrite: false, opacity: .9 });
  const mists = [];
  function mist(pos, size) { const s = new THREE.Sprite(mistMat.clone()); s.position.copy(pos); s.scale.setScalar(size); scene.add(s); mists.push({ s, life: .35, size }); }
  function updateBlood(dt) {
    for (let i = mists.length - 1; i >= 0; i--) {
      const m = mists[i]; m.life -= dt; const k = m.life / .35; m.s.material.opacity = k * .8; m.s.scale.setScalar(m.size * (1.8 - k * .8));
      if (m.life <= 0) { scene.remove(m.s); m.s.material.dispose(); mists.splice(i, 1); }
    }
    decals.grow(dt);
  }
  return { spray, mist, updateBlood, mists };
}
