// Vee's wrist phone, on the back of the left gun: the GOFR app with the bounty, your health and bullet time,
// whoever's talking, the bag, the adrenaline shot and the boss's health. All in the 3×5 pixel font.
import { canvasTex } from '../render/ps1.js';
import { pixelText, pixelWidth } from './keypad.js';
import { MAX_HP } from '../game/player.js';

const W = 128, H = 64;
const WHO = { mo: 'MO', vee: 'VEE', app: 'GOFR', dispatch: 'DISPATCH', cook: 'COOK', grabber: 'GRABBER', expediter: 'EXPEDITER' };
const WHO_COL = { mo: '#ff7a1a', vee: '#17a597', app: '#ff7a1a', dispatch: '#c9d4e6', cook: '#e8e6df', grabber: '#e0162b', expediter: '#e0162b' };

/** Splits text into lines of at most n characters, on spaces. */
export function wrap(text, n) {
  const out = []; let line = '';
  for (const w of text.toUpperCase().split(' ')) {
    if ((line + ' ' + w).trim().length > n) { if (line) out.push(line); line = w; } else line = (line + ' ' + w).trim();
  }
  if (line) out.push(line);
  return out;
}

export function createWrist() {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const tex = canvasTex(cv);
  /** @param {{ hp: number, bt: number, btOn: boolean, bounty: number, fps: number, sub: any, bag: string, shots: number, stun: number, boss: any, note: string, notifyT: number }} s */
  function draw(s) {
    g.clearRect(0, 0, W, H);
    g.fillStyle = s.stun >= 0 ? 'rgba(30,30,34,.94)' : 'rgba(8,8,10,.92)'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ff7a1a'; g.fillRect(0, 0, 2, H);
    // header: the app and the bounty on you
    pixelText(g, 'GOFR', 5, 3, '#ff7a1a');
    const b = '$' + s.bounty.toLocaleString('en-US');
    pixelText(g, s.bounty ? 'BOUNTY ' + b : 'ON SHIFT', W - 4 - pixelWidth(s.bounty ? 'BOUNTY ' + b : 'ON SHIFT'), 3, s.bounty ? '#e0162b' : '#8d8a83');
    // health pips, bullet time, frame rate
    for (let i = 0; i < MAX_HP; i++) { g.fillStyle = i < s.hp ? (s.hp <= 2 ? '#ff3a2a' : '#e0162b') : '#2a2928'; g.fillRect(5 + i * 7, 11, 5, 4); }
    g.fillStyle = '#2a2928'; g.fillRect(64, 12, 40, 2); g.fillStyle = s.btOn ? '#9db8ff' : '#5f7fb0'; g.fillRect(64, 12, 40 * s.bt, 2);
    if (s.fps) pixelText(g, String(s.fps), W - 4 - pixelWidth(String(s.fps)), 10, s.fps < 65 ? '#ff5a3a' : '#5a5852');
    // the middle: stunned countdown, else whoever is talking, else a notification
    if (s.stun >= 0) {
      pixelText(g, 'STUNNED', 5, 20, '#ebe8e1', 2);
      pixelText(g, s.shots ? 'GRIP CHEST, STAB THIGH' : 'NO SHOT LEFT', 5, 33, '#ff7a1a');
      const left = Math.ceil(s.stun); pixelText(g, String(left), W - 6 - pixelWidth(String(left), 3), 20, '#e0162b', 3);
    } else if (s.sub) {
      pixelText(g, WHO[s.sub.who] || s.sub.who.toUpperCase(), 5, 20, WHO_COL[s.sub.who] || '#ebe8e1');
      wrap(s.sub.text, 30).slice(0, 4).forEach((l, i) => pixelText(g, l, 5, 28 + i * 7, '#ebe8e1'));
    } else if (s.note) {
      wrap(s.note, 30).slice(0, 3).forEach((l, i) => pixelText(g, l, 5, 22 + i * 7, '#8d8a83'));
    }
    // footer: the boss, or the bag and the shot
    if (s.boss) {
      pixelText(g, 'EXPEDITER', 5, 56, '#ebe8e1');
      g.fillStyle = '#2a2928'; g.fillRect(44, 57, 78, 3); g.fillStyle = '#e0162b'; g.fillRect(44, 57, 78 * Math.max(0, s.boss.hp), 3);
    } else {
      pixelText(g, s.bag, 5, 56, s.bag === 'BAG OK' ? '#17a597' : '#e0162b');
      pixelText(g, 'SHOT ' + s.shots, W - 4 - pixelWidth('SHOT ' + s.shots), 56, s.shots ? '#ebe8e1' : '#5a5852');
    }
    tex.needsUpdate = true;
  }
  return { tex, draw, canvas: cv };
}
