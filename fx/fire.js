// Fire and smoke drawn with two billboard batches: flickering flames (additive glow) and rising smoke puffs.
import * as THREE from 'three';
import { makeBB } from './billboards.js';

const FIRE_COLS = [new THREE.Color(0xff7a1a), new THREE.Color(0xffb03a)];

// The level fills these arrays (the game clears them between levels):
//  fires:       { x, y, z, s (size), fl: 6 flame phases, l: optional PointLight that flickers }
//  smokes:      { x, y, z, s, col, life? } smoke sources; ones with life burn out
//  staticGlows: { p, s, c, a } glow sprites that just sit there (lamp halos)
export function createFireSmoke({ scene, glowTex, fires, smokes, staticGlows = [] }) {
  const glowBB = makeBB(scene, glowTex, 400, THREE.AdditiveBlending), smokeBB = makeBB(scene, glowTex, 160, THREE.NormalBlending);
  const smokeParts = [], v = new THREE.Vector3();
  let smokeT = 0;
  // each fire is 6 flame sprites rising and drifting, sizes pulsing
  function update(dt) {
    glowBB.begin(); staticGlows.forEach(g => glowBB.put(g.p, g.s, g.c, g.a));
    fires.forEach(f => {
      f.fl.forEach((fl, i) => {
        fl.ph += dt * (5 + i); const h = (.3 + .7 * ((i * .37 + fl.ph * .1) % 1)) * f.s;
        v.set(f.x + Math.sin(fl.ph + i) * .15 * f.s, f.y + h, f.z + Math.cos(fl.ph * 1.3 + i) * .15 * f.s);
        glowBB.put(v, (.7 + .4 * Math.sin(fl.ph * 2)) * f.s * (1.2 - h / f.s * .5), FIRE_COLS[i % 2], .8, fl.ph);
      });
      if (f.l) f.l.intensity = 1.6 + Math.random() * .8;
    });
    glowBB.end();
    // every fire smokes, plus the free-standing smoke sources
    smokeT -= dt;
    if (smokeT <= 0) {
      smokeT = .12;
      [...fires.map(f => ({ x: f.x, y: f.y + f.s, z: f.z, s: f.s * 1.4, col: 0x1e1c1a })), ...smokes].forEach(src => {
        if (Math.random() < .5 || smokeParts.length >= 150) return;
        const life = 3 + Math.random() * 2;
        smokeParts.push({ p: new THREE.Vector3(src.x + (Math.random() - .5) * .4, src.y + .4, src.z + (Math.random() - .5) * .4), c: new THREE.Color(src.col), life, max: life, sz: src.s, r: Math.random() * 6 });
      });
    }
    smokeBB.begin();
    for (let i = smokeParts.length - 1; i >= 0; i--) {
      const sp = smokeParts[i]; sp.life -= dt; if (sp.life <= 0) { smokeParts.splice(i, 1); continue; }
      const k = 1 - sp.life / sp.max; sp.p.y += dt * (.8 + k * .4); sp.p.x += dt * .25;
      smokeBB.put(sp.p, sp.sz * (.6 + k * 2), sp.c, .32 * (1 - k), sp.r + k);
    }
    smokeBB.end();
    for (let i = smokes.length - 1; i >= 0; i--) { if (smokes[i].life !== undefined) { smokes[i].life -= dt; if (smokes[i].life <= 0) smokes.splice(i, 1); } }
  }
  return { update, smokeParts, glowBB, smokeBB, reset() { staticGlows.length = 0; smokeParts.length = 0; } };
}
