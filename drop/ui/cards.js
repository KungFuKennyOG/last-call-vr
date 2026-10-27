// Cards that float in front of you: the chapter intro and the end-of-chapter results with your new code.
// Drawn in the pixel font onto one canvas, the same in VR and in the browser.
import * as THREE from 'three';
import { canvasTex } from '../render/ps1.js';
import { pixelText, pixelWidth } from './keypad.js';

const W = 256, H = 160;
const STAR = ['00100', '00100', '11111', '01110', '01010'];

export function createCards({ scene, camera }) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const tex = canvasTex(cv);
  const card = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, fog: false }));
  card.renderOrder = 1000; card.visible = false; scene.add(card);
  const vA = new THREE.Vector3(), vB = new THREE.Vector3();
  function star(x, y, s, col) { g.fillStyle = col; STAR.forEach((r, j) => { for (let i = 0; i < 5; i++) if (r[i] === '1') g.fillRect(x + i * s, y + j * s, s, s); }); }

  /**
   * @param {{ kicker?: string, title: string, accent?: string, stars?: number, gold?: boolean, lines?: string[], code?: string, foot?: string }} o
   */
  function show(o) {
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(8,8,10,.94)'; g.fillRect(0, 0, W, H);
    g.fillStyle = o.accent || '#ff7a1a'; g.fillRect(0, 0, 4, H);
    let y = 10;
    if (o.kicker) { pixelText(g, o.kicker, 12, y, '#8d8a83'); y += 10; }
    pixelText(g, o.title, 12, y, '#ebe8e1', 4); y += 26;
    if (o.stars !== undefined) {
      for (let i = 0; i < 5; i++) star(12 + i * 18, y, 3, i < o.stars ? (o.gold ? '#ffd23a' : '#ff7a1a') : '#2a2928');
      if (o.gold) pixelText(g, 'GOLD', 106, y + 5, '#ffd23a', 2);
      y += 22;
    }
    for (const l of o.lines || []) { pixelText(g, l, 12, y, '#c9c6be'); y += 8; }
    if (o.code) {
      y += 4; pixelText(g, 'YOUR CODE', 12, y, '#8d8a83'); y += 9;
      g.fillStyle = '#16161a'; g.fillRect(10, y - 2, pixelWidth(o.code, 3) + 8, 20);
      pixelText(g, o.code, 14, y + 1, '#ebe8e1', 3); y += 24;
    }
    if (o.foot) pixelText(g, o.foot, 12, H - 12, '#8d8a83');
    tex.needsUpdate = true;
    // 1.7 m in front of where you look, level with your eyes
    camera.getWorldPosition(vA); camera.getWorldDirection(vB); vB.y = 0; if (vB.lengthSq() < 1e-4) vB.set(0, 0, -1); vB.normalize();
    card.position.copy(vA).addScaledVector(vB, 1.7); card.position.y = vA.y - .05; card.lookAt(vA.x, card.position.y, vA.z);
    card.visible = true;
  }
  return { show, hide() { card.visible = false; }, get visible() { return card.visible; }, card };
}

