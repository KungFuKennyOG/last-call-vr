// The browser HUD: health, ammo, bullet time, the bounty, subtitles and big messages, as HTML over the canvas.
// In VR the same information goes on the wrist phone (ui/wrist.js) instead.
import { MAX_HP } from '../game/player.js';

const $ = id => document.getElementById(id);

export function createHud({ player }) {
  const H = {
    fps: 0, ammo: '12', bt: 1, btOn: false, bounty: 0, shots: 1, boss: null, sub: null, msg: '', msgT: 0, mode: 'menu', dirty: true,
  };
  /** 'menu' | 'vr' | 'desktop' */
  H.show = mode => {
    H.mode = mode; const d = mode === 'desktop';
    $('hud').hidden = !d; $('cross').hidden = !d; $('keys').hidden = !d;
    if (!d) { $('sub').hidden = true; $('msg').hidden = true; }
  };
  /** A big line in the middle of the view for a moment. */
  H.message = (text, secs = 1.6) => { H.msg = text; H.msgT = secs; H.dirty = true; };
  /** The current subtitle: { who, text } or null. */
  H.subtitle = line => { H.sub = line; H.dirty = true; };
  let t = 0;
  H.update = realDt => {
    if (H.msgT > 0) { H.msgT -= realDt; if (H.msgT <= 0) { H.msg = ''; H.dirty = true; } }
    t -= realDt; if (t > 0 && !H.dirty) return; t = .1;
    if (H.mode !== 'desktop') return;
    H.dirty = false;
    $('hHp').textContent = '■'.repeat(Math.max(0, player.hp)) + '□'.repeat(Math.max(0, MAX_HP - player.hp));
    $('hAmmo').textContent = H.ammo;
    $('hBT').textContent = (H.btOn ? 'ON ' : '') + Math.round(H.bt * 100) + '%';
    $('hBounty').textContent = '$' + H.bounty.toLocaleString('en-US');
    $('hShot').textContent = String(H.shots);
    const bw = $('hBossW'); bw.hidden = !H.boss;
    if (H.boss) { $('hBossN').textContent = H.boss.name; $('hBossBar').style.width = Math.max(0, H.boss.hp * 100) + '%'; }
    const sub = $('sub'); sub.hidden = !H.sub;
    if (H.sub) { $('subWho').textContent = H.sub.label; $('subText').textContent = H.sub.text; }
    const m = $('msg'); m.hidden = !H.msg; m.textContent = H.msg;
  };
  return H;
}
