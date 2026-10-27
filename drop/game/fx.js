// Blood, decals, sparks, tracers and floating text for Last Drop, from the shared fx/ and combat/ modules.
// The gore is the cartoon kind: chunky bright drops, big flat splats.
import * as THREE from 'three';
import { createDecals, createParticles, createBlood, createPopups, createFireSmoke } from '../../fx/index.js';
import { createTracers } from '../../combat/index.js';

function canvasTex(size, draw) { const cv = document.createElement('canvas'); cv.width = cv.height = size; draw(cv.getContext('2d'), size); const t = new THREE.CanvasTexture(cv); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; }
/** pixel splats: blocky, so they read as PS1 sprites rather than soft paint */
function splatTex(seed) {
  return canvasTex(32, (g, S) => {
    let s = seed; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    g.fillStyle = '#fff';
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const d = Math.hypot(x - 15.5, y - 15.5); if (d < 8 + r() * 2.5) g.fillRect(x, y, 1, 1); }
    for (let i = 0; i < 10; i++) { const a = r() * 6.28, d = 9 + r() * 6, w = 1 + (r() * 3 | 0); g.fillRect(Math.round(15 + Math.cos(a) * d), Math.round(15 + Math.sin(a) * d), w, w); }
  });
}

export function createFx({ scene, world, headPos, headDir, slowmo }) {
  const glowTex = canvasTex(32, (g, S) => { const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); });
  glowTex.magFilter = glowTex.minFilter = THREE.LinearFilter;
  const holeTex = canvasTex(16, g => { g.fillStyle = '#111'; g.fillRect(5, 5, 6, 6); g.fillStyle = '#000'; g.fillRect(6, 6, 4, 4); g.fillStyle = 'rgba(80,80,80,.6)'; g.fillRect(4, 7, 1, 2); g.fillRect(11, 7, 1, 2); g.fillRect(7, 4, 2, 1); g.fillRect(7, 11, 2, 1); });
  const decals = createDecals({ scene, atlas: [splatTex(3), splatTex(7), splatTex(11), holeTex], groundAt: world.groundAt });
  const particles = createParticles({ scene, surfaceNormal: world.surfaceNormal, decals });
  const blood = createBlood({ scene, particles, decals, glowTex });
  const tracers = createTracers(scene, { slow: slowmo });
  const popups = createPopups({ scene, headPos: () => headPos, headDir: () => headDir });
  const fires = [], smokes = [], staticGlows = [];
  const fireSmoke = createFireSmoke({ scene, glowTex, fires, smokes, staticGlows });
  return {
    glowTex, decals, particles, blood, tracers, popups, fireSmoke, fires, smokes,
    decal: decals.decal, spray: blood.spray, mist: blood.mist, sparkBurst: particles.sparkBurst, addPart: particles.addPart, tracer: tracers.tracer,
    popup: popups.popup, popupFront: popups.popupFront,
    update(dt, realDt) { blood.updateBlood(dt); particles.updateParts(dt); tracers.update(realDt); popups.update(realDt); fireSmoke.update(dt); },
    reset() { decals.reset(); particles.parts.length = 0; popups.clear(); fires.length = 0; smokes.length = 0; fireSmoke.reset(); },
  };
}
