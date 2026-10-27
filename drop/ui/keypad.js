// The VR title: a big chunky keypad floating in front of you, for password codes and cheats, and a START key.
// Press keys by poking them with the tip of a gun, or point at one and pull the trigger.
// Everything on it is drawn with the 3×5 pixel font, like the rest of the in-world text.
import * as THREE from 'three';
import { FONT } from '../art/pixels.js';
import { ALPHABET, normalize } from '../codes.js';
import { canvasTex } from '../render/ps1.js';

const W = 256, H = 216, PW = .96, PH = PW * H / W;
const COLS = 8, KW = 28, KH = 18, GX = 4, X0 = (W - (COLS * KW + (COLS - 1) * GX)) / 2, Y0 = 70;

/** Draws pixel-font text on a 2D canvas. */
export function pixelText(g, str, x, y, col, s = 1) {
  g.fillStyle = col; let cx = x;
  for (const ch of String(str).toUpperCase()) { const gl = FONT[ch]; if (gl) for (let i = 0; i < 15; i++) if (gl[i] === '1') g.fillRect(cx + (i % 3) * s, y + Math.floor(i / 3) * s, s, s); cx += 4 * s; }
}
export const pixelWidth = (str, s = 1) => (str.length ? str.length * 4 * s - s : 0);

/**
 * @param {{ onSubmit: (code: string) => { ok: boolean, msg: string }, onStart: () => void }} o
 */
export function createKeypad({ onSubmit, onStart }) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const tex = canvasTex(cv);
  const group = new THREE.Group();
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  group.add(panel);
  const back = new THREE.Mesh(new THREE.BoxGeometry(PW + .04, PH + .04, .03), new THREE.MeshBasicMaterial({ color: 0x111114 })); back.position.z = -.02; group.add(back);

  /** keys in canvas pixels */
  const keys = [];
  [...ALPHABET].forEach((ch, i) => keys.push({ label: ch, x: X0 + (i % COLS) * (KW + GX), y: Y0 + Math.floor(i / COLS) * (KH + GX), w: KW, h: KH }));
  // I and O never appear in save codes, but cheat codes are real words
  const ry = Y0 + 4 * (KH + GX), dbl = KW * 2 + GX, col = n => X0 + n * (KW + GX);
  keys.push({ label: 'I', x: col(0), y: ry, w: KW, h: KH }, { label: 'O', x: col(1), y: ry, w: KW, h: KH },
    { label: 'DEL', x: col(2), y: ry, w: dbl, h: KH }, { label: 'CLEAR', x: col(4), y: ry, w: dbl, h: KH }, { label: 'ENTER', x: col(6), y: ry, w: dbl, h: KH },
    { label: 'START CHAPTER 1', x: col(0), y: ry + KH + GX, w: col(8) - GX - col(0), h: KH, big: true });
  const K = { typed: '', msg: 'TYPE A CODE, OR START', msgOk: true, lit: -1, litT: 0, cheats: '', progress: '' };

  function draw() {
    g.fillStyle = '#08080a'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ff7a1a'; g.fillRect(0, 0, W, 3);
    pixelText(g, 'LAST', 10, 10, '#ebe8e1', 3); pixelText(g, 'DROP', 10 + pixelWidth('LAST ', 3), 10, '#ff7a1a', 3);
    pixelText(g, 'CH 1 WRONG ORDER  11PM', W - 10 - pixelWidth('CH 1 WRONG ORDER  11PM'), 12, '#8d8a83');
    if (K.progress) pixelText(g, K.progress, W - 10 - pixelWidth(K.progress), 20, '#17a597');
    // the code so far, as XXXX-XXXX with blanks
    const shown = (K.typed + '________').slice(0, 8), disp = shown.slice(0, 4) + '-' + shown.slice(4);
    g.fillStyle = '#16161a'; g.fillRect(10, 34, W - 20, 18);
    pixelText(g, disp, 16, 37, '#ebe8e1', 2);
    pixelText(g, K.msg.slice(0, 30), 10, 57, K.msgOk ? '#8d8a83' : '#e0162b');
    if (K.cheats) pixelText(g, K.cheats.slice(0, 26), W - 10 - pixelWidth(K.cheats.slice(0, 26)), 57, '#17a597');
    keys.forEach((k, i) => {
      const lit = i === K.lit && K.litT > 0;
      g.fillStyle = lit ? '#ff7a1a' : k.big ? '#ff7a1a' : '#26262b'; g.fillRect(k.x, k.y, k.w, k.h);
      g.fillStyle = lit ? '#ffd0a0' : k.big ? '#ffb070' : '#3a3a40'; g.fillRect(k.x, k.y, k.w, 2);
      const s = k.label.length === 1 ? 2 : 1, col = k.big || lit ? '#0a0a0a' : '#ebe8e1';
      pixelText(g, k.label, k.x + ((k.w - pixelWidth(k.label, s)) >> 1), k.y + ((k.h - 5 * s) >> 1) + 1, col, s);
    });
    tex.needsUpdate = true;
  }
  draw();

  function press(i) {
    const k = keys[i]; K.lit = i; K.litT = .18;
    if (k.label === 'DEL') K.typed = K.typed.slice(0, -1);
    else if (k.label === 'CLEAR') { K.typed = ''; K.msg = 'TYPE A CODE, OR START'; K.msgOk = true; }
    else if (k.label === 'ENTER') { const r = onSubmit(K.typed); K.msg = r.msg; K.msgOk = r.ok; if (r.ok) K.typed = ''; }
    else if (k.big) onStart();
    else if (K.typed.length < 8) K.typed += k.label;
    draw();
    return k;
  }
  /** Canvas pixel → key index, or -1. */
  function keyAt(px, py) { return keys.findIndex(k => px >= k.x && px <= k.x + k.w && py >= k.y && py <= k.y + k.h); }

  const ray = new THREE.Raycaster(), local = new THREE.Vector3(), tip = new THREE.Vector3(), dir = new THREE.Vector3(), q = new THREE.Quaternion();
  const prevDepth = new Map();
  function hitToKey(worldPoint) {
    local.copy(worldPoint); panel.worldToLocal(local);
    return keyAt((local.x / PW + .5) * W, (.5 - local.y / PH) * H);
  }
  return {
    group, K, draw, press,
    /** Puts the keypad at a comfortable height in front of where you stand, facing you. */
    place(headPos, yaw) {
      group.position.set(headPos.x - Math.sin(yaw) * .62, Math.max(1.05, headPos.y - .32), headPos.z - Math.cos(yaw) * .62);
      group.rotation.set(-.35, yaw, 0, 'YXZ');
    },
    /** Trigger pulled with this controller: the key it points at, if any. */
    aim(c) {
      if (!group.visible) return null;
      c.getWorldPosition(tip); dir.set(0, 0, -1).applyQuaternion(c.getWorldQuaternion(q));
      ray.set(tip, dir); const h = ray.intersectObject(panel, false)[0];
      if (!h) return null; const i = hitToKey(h.point); return i >= 0 ? press(i) : null;
    },
    /** Every frame: pokes with the tip of each gun. tips: [{ id, pos: Vector3 }] */
    poke(tips, realDt) {
      if (K.litT > 0) { K.litT -= realDt; if (K.litT <= 0) draw(); }
      if (!group.visible) return;
      for (const t of tips) {
        local.copy(t.pos); panel.worldToLocal(local);
        const was = prevDepth.get(t.id) ?? 1; prevDepth.set(t.id, local.z);
        if (was > .015 && local.z <= .015 && local.z > -.08) { const i = keyAt((local.x / PW + .5) * W, (.5 - local.y / PH) * H); if (i >= 0) press(i); }
      }
    },
    /** For the desktop form and tests. */
    type(code) { K.typed = normalize(code).slice(0, 8); draw(); },
  };
}
