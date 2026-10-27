// More Last Drop textures: the chapter 1 surfaces and props, and the cook's body parts.
// Pure pixel painters like textures.js (ported from the art direction test), so they run in Node tests too.
import { image, rect, grain, text, textWidth, rng } from './pixels.js';
import { PAL } from './palette.js';

const flat = (w, h, base, seed, amt, detail) => { const i = image(w, h, base); if (detail) detail(i); if (amt) grain(i, amt, seed); return i; };
const stripes = (i, cols, seed) => { const r = rng(seed); for (let y = 0; y < i.h; y++) rect(i, r() > 0.5 ? cols[0] : cols[1], 0, y, i.w, 1); };

// ---- walls, floors, ceilings ----
export const ceiling = () => flat(32, 32, '#5d5c57', 7, 22, i => { for (const k of [0, 16]) { rect(i, '#3a3936', 0, k, 32, 1); rect(i, '#3a3936', k, 0, 1, 32); } });
export const frp = () => flat(16, 16, '#3c4740', 6, 14, i => { rect(i, '#59665e', 0, 0, 16, 1); for (const [x, y] of [[3, 4], [12, 4], [3, 12], [12, 12]]) rect(i, '#7b877f', x, y, 1, 1); });
export const steelDark = () => { const i = image(32, 32, PAL.steelDark); stripes(i, ['rgba(255,255,255,0.06)', 'rgba(0,0,0,0.1)'], 13); grain(i, 14, 14); return i; };
export const steelPlate = () => flat(32, 32, '#6e757b', 15, 18, i => {
  for (let y = 0; y < 32; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < 32; x += 4) rect(i, '#8b9298', x, y, 2, 1);
  rect(i, '#3e4347', 0, 31, 32, 1); rect(i, '#3e4347', 31, 0, 1, 32);
});
export const freezerPanel = () => flat(32, 32, '#c9d3d8', 16, 12, i => {
  for (let x = 0; x < 32; x += 8) rect(i, '#9eabb2', x, 0, 1, 32);
  const r = rng(17); for (let n = 0; n < 10; n++) rect(i, 'rgba(255,255,255,0.6)', r() * 32 | 0, r() * 32 | 0, 2, 1);
});
export const concrete = () => flat(32, 32, PAL.concrete, 23, 28, i => {
  const r = rng(24); let x = 8, y = 0; for (let n = 0; n < 30; n++) { rect(i, '#2c2d30', x, y, 1, 1); x += r() > 0.5 ? 1 : 0; y++; if (y > 31) break; }
  rect(i, '#2c2d30', 0, 31, 32, 1); rect(i, '#2c2d30', 31, 0, 1, 32);
});
export const corrugated = () => flat(32, 32, '#59606a', 18, 14, i => { for (let x = 0; x < 32; x += 4) { rect(i, '#444a52', x, 0, 1, 32); rect(i, '#6f7782', x + 2, 0, 1, 32); } rect(i, 'rgba(120,60,20,0.45)', 6, 20, 3, 6); });
export const asphalt = () => flat(32, 32, '#17191d', 25, 20, i => { const r = rng(26); for (let n = 0; n < 5; n++) { const x = r() * 28 | 0, y = r() * 28 | 0; rect(i, 'rgba(120,140,170,0.25)', x, y, 5, 2); rect(i, 'rgba(160,180,210,0.25)', x + 1, y, 2, 1); } });
export const facade = () => flat(32, 32, '#141519', 28, 10, i => { const r = rng(27); for (let y = 2; y < 32; y += 8) for (let x = 2; x < 32; x += 8) { const lit = r(); rect(i, lit > 0.55 ? (lit > 0.8 ? '#9fc4e8' : '#e8b55a') : '#202228', x, y, 4, 5); } });
export const darkWall = () => flat(16, 16, '#1d1e22', 32, 10);
export const roller = () => flat(16, 16, '#6f7377', 22, 18, i => { for (let y = 0; y < 16; y += 2) rect(i, '#4f5357', 0, y, 16, 1); rect(i, 'rgba(120,60,20,0.5)', 4, 9, 3, 2); rect(i, 'rgba(120,60,20,0.5)', 11, 3, 2, 3); });
export const swingDoor = () => flat(16, 32, '#8a9197', 19, 12, i => { rect(i, '#5f666b', 0, 0, 16, 1); rect(i, '#5f666b', 0, 31, 16, 1); rect(i, '#141618', 4, 6, 8, 6); rect(i, '#2a3a48', 5, 7, 6, 4); rect(i, '#3a3a3c', 1, 22, 14, 4); });

// ---- props ----
export const counterFront = () => { const i = image(64, 32, PAL.steel); stripes(i, ['rgba(255,255,255,0.08)', 'rgba(0,0,0,0.09)'], 15);
  rect(i, PAL.moOrange, 0, 3, 64, 5); rect(i, PAL.moOrangeDark, 0, 8, 64, 1); text(i, 'PICKUP', (64 - textWidth('PICKUP', 2)) >> 1, 13, '#1b1b1d', 2); rect(i, '#4a4f53', 0, 26, 64, 6);
  grain(i, 16, 16); const r = rng(15); for (let n = 0; n < 10; n++) rect(i, 'rgba(0,0,0,0.35)', r() * 64 | 0, 26 + (r() * 6 | 0), 3, 1); return i; };
export const cardboard = () => flat(16, 16, PAL.cardboard, 21, 18, i => { rect(i, '#c9b07a', 0, 7, 16, 2); rect(i, '#7a5a32', 0, 0, 16, 1); rect(i, '#3a2a1a', 3, 11, 4, 1); rect(i, '#3a2a1a', 3, 13, 6, 1); });
export const oil = () => flat(16, 16, '#9a6a1c', 29, 30, i => { const r = rng(30); for (let n = 0; n < 8; n++) rect(i, '#c79a3a', r() * 16 | 0, r() * 16 | 0, 1, 1); });
export function wire() { const i = image(16, 16); for (let k = 0; k < 16; k += 4) { rect(i, '#a8aeb3', k, 0, 1, 16); rect(i, '#a8aeb3', 0, k, 16, 1); } rect(i, '#a8aeb3', 0, 15, 16, 1); rect(i, '#a8aeb3', 15, 0, 1, 16); return i; }
export const lamp = () => flat(8, 8, '#ff9a3a', 0, 0, i => rect(i, '#ffd08a', 2, 2, 4, 4));
export const fluo = () => flat(8, 8, '#dfe9f2', 0, 0, i => rect(i, '#ffffff', 1, 3, 6, 2));
export const frostLight = () => flat(8, 8, '#bfe6ff', 0, 0, i => rect(i, '#ffffff', 1, 2, 6, 4));
export const kraft = () => flat(16, 16, '#a8834e', 31, 18, i => { rect(i, '#8a6a3a', 0, 13, 16, 3); rect(i, PAL.gofr, 4, 4, 8, 5); rect(i, '#1b1b1d', 5, 6, 6, 1); });
export const pos = () => flat(16, 12, '#101418', 0, 0, i => { const c = ['#3bb26b', PAL.gofr, '#4f8fd8', '#d8c23b', '#e8e2cf']; for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) rect(i, c[(x + y * 2) % 5], 1 + x * 4, 1 + y * 4, 3, 3); });
export const black = () => flat(8, 8, '#1b1c1e', 36, 10);
export const slide = () => flat(16, 8, '#232427', 37, 10, i => { for (let x = 11; x < 16; x += 2) rect(i, '#0e0f10', x, 1, 1, 6); });
export const wood = () => flat(8, 8, '#4a2e1c', 38, 14, i => { rect(i, '#3a2214', 0, 2, 8, 1); rect(i, '#3a2214', 0, 6, 8, 1); });
export const cleaver = () => flat(16, 16, '#b4b8bc', 39, 14, i => { rect(i, '#e2e6ea', 0, 13, 16, 3); rect(i, '#6e0d0d', 2, 5, 7, 3); rect(i, '#6e0d0d', 8, 8, 3, 4); rect(i, '#4a0808', 4, 6, 2, 1); rect(i, '#6e0d0d', 12, 12, 2, 2); });
export const extinguisher = () => flat(16, 16, '#b81818', 41, 16, i => { rect(i, '#e8e2cf', 4, 6, 8, 6); rect(i, '#1b1b1d', 5, 7, 6, 1); rect(i, '#1b1b1d', 5, 9, 4, 1); rect(i, '#e01b28', 5, 11, 6, 1); });
export const teal = () => flat(8, 8, PAL.veeTeal, 42, 12);
export const frame = () => flat(8, 8, '#26282c', 43, 10);
export const tire = () => flat(8, 8, '#121214', 0, 0, i => { rect(i, '#1e1e22', 0, 0, 8, 2); rect(i, '#1e1e22', 0, 4, 8, 2); });
export const pallet = () => flat(16, 16, '#8a6a42', 44, 16, i => { for (let y = 0; y < 16; y += 4) rect(i, '#4a3420', 0, y + 3, 16, 1); });
export const tray = () => { const i = image(32, 32, '#9aa1a6'); stripes(i, ['rgba(255,255,255,0.1)', 'rgba(0,0,0,0.08)'], 45); rect(i, '#5d6368', 0, 0, 32, 2); rect(i, '#5d6368', 0, 30, 32, 2); rect(i, '#5d6368', 0, 0, 2, 32); rect(i, '#5d6368', 30, 0, 2, 32); rect(i, PAL.bloodDark, 20, 9, 4, 2); rect(i, PAL.bloodDark, 22, 11, 2, 3); grain(i, 10, 46); return i; };
export const pan = () => flat(16, 16, '#2a2b2e', 47, 10, i => { rect(i, '#45474c', 2, 2, 12, 12); rect(i, '#2a2b2e', 4, 4, 8, 8); });
export const syringe = () => flat(8, 16, '#d8e6f0', 48, 6, i => { rect(i, '#ffd23a', 1, 4, 6, 7); rect(i, '#e8e2cf', 0, 0, 8, 2); rect(i, '#8a9197', 3, 12, 2, 4); });
export const rain = () => flat(4, 4, '#8fa2b8', 0, 0);

// ---- the cook ----
export const chefSide = () => flat(16, 24, PAL.chefWhite, 74, 10);
export const chefSleeve = () => flat(8, 16, PAL.chefWhite, 75, 10, i => { rect(i, '#cfccc2', 0, 0, 8, 2); rect(i, PAL.bloodDark, 2, 9, 2, 1); rect(i, PAL.bloodDark, 5, 11, 1, 2); });
export const cookSide = () => flat(16, 16, PAL.cookSkin, 71, 8, i => { rect(i, PAL.cookHair, 0, 0, 16, 4); rect(i, '#a26e50', 7, 6, 3, 4); });
export const cookBack = () => flat(16, 16, PAL.cookHair, 72, 10, i => rect(i, PAL.cookSkin, 0, 8, 16, 8));
export const hair = () => flat(16, 16, PAL.cookHair, 70, 12);
export const clog = () => flat(8, 8, '#141414', 0, 0, i => rect(i, '#2a2a2a', 0, 0, 8, 1));
export const skinCook = () => flat(8, 8, PAL.cookSkin, 77, 6);
export const tag = (label = 'CHEF') => flat(16, 8, '#e8e6df', 0, 0, i => text(i, label, (16 - textWidth(label)) >> 1, 2, '#18181a'));

/** Every surface and prop texture by name. */
export const SURFACES = {
  ceiling, frp, steelDark, steelPlate, freezerPanel, concrete, corrugated, asphalt, facade, darkWall, roller, swingDoor,
  counterFront, cardboard, oil, wire, lamp, fluo, frostLight, kraft, pos, black, slide, wood, cleaver, extinguisher, teal, frame, tire, pallet,
  tray, pan, syringe, rain, chefSide, chefSleeve, cookSide, cookBack, hair, clog, skinCook, tag,
};
