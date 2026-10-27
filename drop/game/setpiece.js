// The bounty set piece in the fryer line: the order screens flicker, flip to one red ticket with your names on it,
// every phone in the kitchen buzzes (yours too), the cooks turn round to look at you, and the world slows for a beat.
// The camera never moves: the moment is all in what you see and hear.
import { buzz } from '../../engine/index.js';
import { actx, now, osc, gain, env, sfxBus } from '../../audio/index.js';
import { M } from '../render/mats.js';

/** @param {{ G: any }} o */
export function createSetPiece({ G }) {
  const S = { screens: [], flicker: 0, ring: 0 };
  const black = M('black', { unlit: true }), bounty = M('bountyScreen', { unlit: true });
  S.attach = space => { S.screens = space.screens.map(s => ({ s, base: s.material })); S.flicker = 0; S.ring = 0; };
  S.reset = () => { S.flicker = 0; S.ring = 0; for (const x of S.screens) x.s.material = x.base; };
  function phoneRing() {
    if (!actx) return; const t = now();
    for (let k = 0; k < 6; k++) { const tt = t + k * .14, o = osc('square', k % 2 ? 1320 : 1760, tt, .09), g = gain(); env(g, tt, .002, .05, .08); o.connect(g).connect(sfxBus); }
  }
  S.step = what => {
    if (what === 'screens:flicker') S.flicker = .8;
    else if (what === 'screens:bountyTicket') {
      S.flicker = 0; for (const x of S.screens) x.s.material = bounty;
      G.fx.popupFront('BOUNTY', '#0447 · $50,000 · VEE + MO', '#e0162b', 1.3, 2.6);
    } else if (what === 'phones:buzz') { S.ring = 1.6; phoneRing(); G.note = 'BOUNTY POSTED ON ORDER #0447'; G.wristDirty = true; }
    else if (what === 'cooks:turnToPlayer') G.enemies.turnToPlayer();
    else if (what === 'slowmo:pulse') G.bt.slowmo(.35, 1.2);
  };
  S.update = realDt => {
    if (S.flicker > 0) { S.flicker -= realDt; for (const x of S.screens) x.s.material = Math.random() < .5 ? black : x.base; }
    if (S.ring > 0) { S.ring -= realDt; if (Math.floor(S.ring * 7) % 2 === 0) buzz('both', .35, 40); }
  };
  return S;
}
