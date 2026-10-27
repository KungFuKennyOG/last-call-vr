// Text popups that float up in the world: HEADSHOT +200, STOMP, a level title in front of you.
import * as THREE from 'three';

export const DISPLAY = "'Big Shoulders Display','Arial Narrow',Impact,sans-serif", MONO = "'IBM Plex Mono',ui-monospace,monospace";

// headPos / headDir: the player's head position and look direction (Vector3s the game updates every frame).
export function createPopups({ scene, headPos, headDir }) {
  // one canvas texture per distinct text; clear it once web fonts load so text is redrawn in the right font
  const textCache = new Map();
  function textTex(l1, l2, color) {
    const key = l1 + '|' + l2 + '|' + color; if (textCache.has(key)) return textCache.get(key);
    const cv = document.createElement('canvas'), g = cv.getContext('2d');
    const f1 = `900 84px ${DISPLAY}`, f2 = `600 40px ${MONO}`;
    g.font = f1; let w = g.measureText(l1).width; if (l2) { g.font = f2; w = Math.max(w, g.measureText(l2).width); }
    const W = Math.ceil(w + 60), H = l2 ? 170 : 110; cv.width = W; cv.height = H;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const y1 = l2 ? 60 : H / 2;
    g.font = f1; g.shadowColor = 'rgba(0,0,0,.9)'; g.shadowBlur = 10; g.fillStyle = color; g.fillText(l1, W / 2, y1);
    if (l2) { g.font = f2; g.fillStyle = '#e9e7e2'; g.fillText(l2, W / 2, 132); }
    const r = { tex: new THREE.CanvasTexture(cv), aspect: W / H, tall: !!l2 }; textCache.set(key, r); return r;
  }
  const popups = [];
  // big line l1, optional small line l2, in color; size scales it, life in seconds. Stays readable at any distance.
  function popup(pos, l1, l2, color, size, life) {
    size = size || 1; life = life || 1.1;
    const t = textTex(l1, l2 || '', color);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t.tex, transparent: true, depthTest: false, depthWrite: false, fog: false })); s.renderOrder = 900;
    const d = Math.max(1.5, pos.distanceTo(headPos())); const h = Math.max(.22, d * .07) * size * (t.tall ? 1.55 : 1);
    s.scale.set(h * t.aspect, h, 1); s.position.copy(pos); scene.add(s);
    popups.push({ s, life, max: life, rise: h * .5 });
  }
  const vA = new THREE.Vector3(), vB = new THREE.Vector3();
  // 3.2 m in front of you, a little above eye level
  function popupFront(l1, l2, color, size, life) {
    const hp = headPos(), hd = headDir();
    vA.copy(hd); vA.y = 0; if (vA.lengthSq() < 1e-4) vA.set(0, 0, -1); vA.normalize();
    vB.copy(hp).addScaledVector(vA, 3.2); vB.y = hp.y + .35;
    popup(vB, l1, l2, color, size || 1.4, life || 1.8);
  }
  // rise and fade; call once a frame with real time
  function update(realDt) {
    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i]; p.life -= realDt; const k = p.life / p.max;
      p.s.position.y += p.rise * realDt * .6; p.s.material.opacity = Math.min(1, k * 3);
      if (p.life <= 0) { scene.remove(p.s); p.s.material.dispose(); popups.splice(i, 1); }
    }
  }
  function clear() { popups.forEach(p => { scene.remove(p.s); p.s.material.dispose(); }); popups.length = 0; }
  return { textCache, textTex, popup, popupFront, popups, update, clear };
}
