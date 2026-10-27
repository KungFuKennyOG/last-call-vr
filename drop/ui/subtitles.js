// Subtitles in the headset: a panel a little below your gaze, about 1.8 m out, in the pixel font.
// It tags along: it stays put while you look around a bit, and glides back in front when you turn away,
// so it never sticks to your face. In the browser the HTML subtitle bar does the same job.
import * as THREE from 'three';
import { canvasTex } from '../render/ps1.js';
import { pixelText, pixelWidth } from './keypad.js';
import { wrap } from './wrist.js';

const W = 512, H = 96, S = 3, DIST = 1.8, DROP = .42, FOLLOW = .45; // FOLLOW: rad off-center before it moves
const COL = { mo: '#ff7a1a', vee: '#17a597', app: '#ff7a1a', dispatch: '#c9d4e6', cook: '#e8e6df', grabber: '#e0162b', expediter: '#e0162b' };

export function createSubtitles({ scene }) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const tex = canvasTex(cv);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4 * H / W), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, fog: false }));
  mesh.renderOrder = 1001; mesh.visible = false; scene.add(mesh);
  let yaw = null, shownT = 0;
  const fwd = new THREE.Vector3(), want = new THREE.Vector3();

  /** line: { label, text, who } or null */
  function show(line) {
    if (!line) { mesh.visible = false; return; }
    g.clearRect(0, 0, W, H);
    const lines = wrap(line.text, Math.floor((W - 24) / (4 * S))).slice(0, 3);
    const h = 18 + lines.length * 6 * S + 8;
    g.fillStyle = 'rgba(8,8,10,.82)'; g.fillRect(0, H - h, W, h);
    g.fillStyle = COL[line.who] || '#ebe8e1'; g.fillRect(0, H - h, 4, h);
    pixelText(g, line.label, 12, H - h + 6, COL[line.who] || '#ebe8e1', 2);
    lines.forEach((l, i) => pixelText(g, l, (W - pixelWidth(l, S)) / 2, H - h + 18 + i * 6 * S, '#ebe8e1', S));
    tex.needsUpdate = true; mesh.visible = true; shownT = 0;
  }
  /** Every frame in VR: keep it in front of you, lazily. */
  function update(realDt, headPos, headDir) {
    if (!mesh.visible) { yaw = null; return; }
    shownT += realDt;
    const look = Math.atan2(headDir.x, headDir.z);
    if (yaw === null) yaw = look;
    const off = Math.atan2(Math.sin(look - yaw), Math.cos(look - yaw));
    if (Math.abs(off) > FOLLOW) yaw += off * Math.min(1, realDt * 4);
    fwd.set(Math.sin(yaw), 0, Math.cos(yaw));
    want.copy(headPos).addScaledVector(fwd, DIST); want.y = headPos.y - DROP;
    if (shownT < .05) mesh.position.copy(want); else mesh.position.lerp(want, Math.min(1, realDt * 6));
    mesh.lookAt(headPos.x, mesh.position.y + .15, headPos.z);
  }
  return { show, update, mesh };
}
