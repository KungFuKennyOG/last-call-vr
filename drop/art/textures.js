// Last Drop's textures as pure pixel painters, ported from the art direction test. Each returns an Img (see
// pixels.js) that the renderer uploads with nearest filtering. Sizes follow the art direction: 4 to 64 px.
// Same arguments, same pixels: every bit of grain is seeded.

import { image, rect, grain, grid, text, textWidth, rng } from './pixels.js';
import { PAL } from './palette.js';
import { FACES, faceRows } from './faces.js';

/**
 * A 16×16 face.
 * @param {'mo' | 'vee' | 'cook'} who
 * @param {import('./faces.js').Expression} [expr]
 */
export function face(who, expr = 'neutral') {
  const img = image(16, 16); grid(img, faceRows(who, expr), FACES[who].pal); return img;
}

/** Flat cloth: a base color, an optional detail pass, then grain. */
function cloth(w, h, base, seed, detail, amt = 16) {
  const img = image(w, h, base); if (detail) detail(img); grain(img, amt, seed); return img;
}

// ---- Mo ----
export const moShellFront = () => cloth(16, 24, PAL.moOrange, 52, i => {
  rect(i, '#3a2a20', 7, 0, 2, 24); rect(i, PAL.tape, 0, 10, 7, 2); rect(i, PAL.tape, 9, 10, 7, 2);
  rect(i, PAL.moOrangeDark, 2, 16, 4, 1); rect(i, PAL.moOrangeDark, 10, 16, 4, 1); rect(i, PAL.moOrangeDark, 0, 23, 16, 1);
});
export const moShellSide = () => cloth(16, 24, PAL.moOrange, 53, i => { rect(i, PAL.tape, 0, 10, 16, 2); rect(i, PAL.moOrangeDark, 7, 0, 1, 24); });
export const moShellBack = () => cloth(16, 24, PAL.moOrange, 54, i => { rect(i, PAL.tape, 0, 10, 16, 2); text(i, 'GOFR', 0, 3, '#5a2408'); rect(i, PAL.moOrangeDark, 0, 23, 16, 1); });
export const moSleeve = () => cloth(8, 16, PAL.moOrange, 55, i => { rect(i, PAL.tape, 0, 3, 8, 2); rect(i, PAL.moOrangeDark, 0, 0, 8, 1); });
export const jeans = () => cloth(16, 16, PAL.denim, 56, i => { rect(i, '#44567a', 0, 0, 1, 16); rect(i, '#3a4c6e', 5, 6, 6, 3); });
export const boot = () => cloth(16, 16, PAL.boot, 57, i => { rect(i, '#1e1a16', 0, 12, 16, 4); rect(i, '#c9a46a', 6, 3, 4, 1); rect(i, '#c9a46a', 6, 6, 4, 1); }, 14);
export const beanie = () => cloth(16, 16, PAL.beanie, 58, i => { for (let x = 0; x < 16; x += 2) rect(i, '#18212e', x, 0, 1, 16); }, 10);

// ---- Vee ----
const tealBands = i => { rect(i, PAL.veeTealDark, 0, 6, 16, 5); rect(i, PAL.piping, 0, 11, 16, 1); rect(i, PAL.veeTealDark, 0, 21, 16, 3); };
export const veeJacketFront = () => cloth(16, 24, PAL.veeTeal, 63, i => { tealBands(i); rect(i, PAL.piping, 7, 0, 2, 24); }, 14);
export const veeJacketSide = () => cloth(16, 24, PAL.veeTeal, 64, tealBands, 14);
export const veeJacketBack = () => cloth(16, 24, PAL.veeTeal, 65, i => { tealBands(i); text(i, 'GOFR', 0, 14, PAL.piping); }, 14);
export const veeSleeve = () => cloth(8, 16, PAL.veeTeal, 66, i => { rect(i, PAL.veeTealDark, 0, 0, 8, 3); rect(i, PAL.piping, 0, 3, 8, 1); }, 14);
export const cargo = () => cloth(16, 16, PAL.cargo, 67, i => { rect(i, '#3a3e27', 2, 6, 6, 5); rect(i, '#5d6342', 2, 6, 6, 1); });
export const sneaker = () => cloth(16, 16, PAL.sneaker, 68, i => { rect(i, '#b88a4a', 0, 12, 16, 4); rect(i, PAL.veeTeal, 2, 6, 12, 2); rect(i, '#9a978f', 6, 2, 4, 1); }, 10);
export const veeHelmet = () => cloth(32, 16, '#e6e3dc', 69, i => { rect(i, PAL.veeTeal, 14, 0, 4, 16); for (const x of [4, 10, 20, 26]) rect(i, '#1b1b1d', x, 5, 2, 5); }, 10);

// ---- the Kitchen ----
export const chefFront = () => cloth(16, 24, PAL.chefWhite, 73, i => {
  for (let y = 5; y < 20; y += 4) { rect(i, '#3a3a3a', 5, y, 1, 1); rect(i, '#3a3a3a', 10, y, 1, 1); }
  rect(i, '#cfccc2', 0, 0, 16, 2); rect(i, PAL.bloodDark, 12, 13, 2, 1); rect(i, PAL.bloodDark, 13, 14, 1, 2);
}, 10);
export const apron = () => cloth(16, 16, PAL.apron, 76, i => { rect(i, '#5a0a0a', 5, 7, 3, 2); rect(i, '#5a0a0a', 9, 11, 2, 3); rect(i, '#2a2a2c', 0, 0, 16, 1); }, 10);
export function houndstooth() {
  const i = image(16, 16, '#e2ded4');
  for (let y = 0; y < 16; y += 2) for (let x = (y / 2) % 2 * 2; x < 16; x += 4) rect(i, '#1d1d1f', x, y, 2, 2);
  return i;
}
/** Hairnet: cut-out mesh, transparent between the strands. */
export function hairnet() {
  const i = image(16, 16);
  for (let k = 0; k < 16; k += 3) { rect(i, PAL.cookHair, k, 0, 1, 16); rect(i, PAL.cookHair, 0, k, 16, 1); }
  return i;
}

// ---- the bag and the wallet ----
export const bagFront = () => cloth(32, 32, PAL.gofrBlack, 33, i => {
  rect(i, PAL.gofr, 0, 9, 32, 14); text(i, 'GOFR', 1, 11, PAL.gofrBlack, 2); rect(i, '#c9ccc4', 0, 3, 32, 2); rect(i, '#c9ccc4', 0, 27, 32, 2);
}, 12);
export const bagSide = () => cloth(16, 16, PAL.gofrBlack, 34, i => { rect(i, '#c9ccc4', 0, 3, 16, 2); rect(i, '#c9ccc4', 0, 11, 16, 2); rect(i, '#2e2e31', 7, 0, 2, 16); }, 12);
export function walletScreen(label = '1OF2') {
  const i = image(16, 8, '#0a0b0d'); text(i, label, (16 - textWidth(label)) >> 1, 2, '#e8f2ff'); return i;
}

// ---- screens and signs ----
const HEADS = ['#3bb26b', PAL.gofr, '#4f8fd8', '#d8c23b'];
/** An order screen with three tickets. `seed` varies the ticket numbers and lines. */
export function ticketScreen(seed = 1) {
  const i = image(64, 36, PAL.screenBlack), r = rng(seed);
  for (let k = 0; k < 3; k++) {
    const x = 3 + k * 21;
    rect(i, PAL.ticket, x, 3, 18, 30); rect(i, HEADS[(seed + k) % 4], x, 3, 18, 5);
    text(i, '#0' + (430 + ((seed * 7 + k * 3) % 40)), x + 1, 10, '#1a1a1a');
    for (let l = 0; l < 4; l++) rect(i, '#3a3a3a', x + 2, 17 + l * 4, 4 + (r() * 10 | 0), 2);
  }
  return i;
}
/** The bounty ticket that takes over the order wall. */
export function bountyScreen({ ticket = '#0447', amount = '$50000', names = 'VEE + MO' } = {}) {
  const i = image(64, 36, PAL.bountyRed);
  rect(i, PAL.bountyBright, 0, 0, 64, 8); text(i, 'BOUNTY', (64 - textWidth('BOUNTY')) >> 1, 2, '#ffffff');
  text(i, ticket, 3, 11, '#ffd9db', 2); text(i, amount, 3, 23, '#ffffff'); text(i, names, 61 - textWidth(names), 23, '#ffd9db');
  rect(i, '#ffffff', 3, 31, 58, 1);
  return i;
}
export function gofrSign() {
  const i = image(64, 16, '#121214'); text(i, 'GOFR', 3, 3, PAL.gofr, 2); text(i, 'PICKUP', 36, 6, '#ebe8e1'); rect(i, PAL.gofr, 0, 15, 64, 1); return i;
}
/** Neon letters on a transparent strip (use as a cut-out). */
export function neon(label = 'OPEN 24H') {
  const i = image(64, 16), x0 = Math.max(0, (64 - textWidth(label, 2)) >> 1);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) text(i, label, x0 + dx, 3 + dy, PAL.neonDeep, 2);
  text(i, label, x0, 3, PAL.neonPink, 2);
  return i;
}

// ---- surfaces ----
export function quarryTile() {
  const i = image(32, 32, '#5c3224');
  rect(i, PAL.quarryTile, 0, 0, 16, 16); rect(i, PAL.quarryTile, 16, 16, 16, 16);
  for (const k of [0, 16]) { rect(i, PAL.grout, 0, k, 32, 1); rect(i, PAL.grout, k, 0, 1, 32); }
  grain(i, 26, 3); const r = rng(9); for (let n = 0; n < 16; n++) rect(i, 'rgba(18,10,6,0.55)', r() * 32 | 0, r() * 32 | 0, 2, 1);
  return i;
}
export function subwayTile() {
  const i = image(32, 32, PAL.subwayTile);
  for (let y = 0; y < 32; y += 8) { rect(i, '#8f8a7d', 0, y, 32, 1); for (let x = (y / 8) % 2 ? 8 : 0; x < 32; x += 16) rect(i, '#8f8a7d', x, y, 1, 8); }
  grain(i, 22, 4); return i;
}
export function brushedSteel(seed = 11) {
  const i = image(32, 32, PAL.steel), r = rng(seed);
  for (let y = 0; y < 32; y++) rect(i, r() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)', 0, y, 32, 1);
  grain(i, 16, seed + 1); return i;
}

/** Every texture by name, for the builder and the art test page. */
export const TEXTURES = {
  moShellFront, moShellSide, moShellBack, moSleeve, jeans, boot, beanie,
  veeJacketFront, veeJacketSide, veeJacketBack, veeSleeve, cargo, sneaker, veeHelmet,
  chefFront, apron, houndstooth, hairnet, bagFront, bagSide, walletScreen,
  ticketScreen, bountyScreen, gofrSign, neon, quarryTile, subwayTile, brushedSteel,
};
