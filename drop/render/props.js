// Chapter 1's props, built the PS1 way (ported from the art direction test). Each builder returns a group with its
// base on y = 0, centered on its origin, facing +z. Cover pieces take their size from the chapter data.
// Pieces that do something later (order screens, fryers, the extinguisher) are tagged in userData so the space
// builder can hand them to the game; everything else gets merged into a few meshes.
import * as THREE from 'three';
import { box, cyl, dome, plane, F, mk } from './geo.js';
import { M, C } from './mats.js';
import { rng } from '../art/pixels.js';

const G = () => new THREE.Group();

/* ---------- cover: sized from the data ---------- */

export function counter([w, h, d]) {
  const g = G(), st = M('brushedSteel');
  mk(g, box(w, h, d, { at: [0, h / 2, 0] }), F(st, M('counterFront', { repeat: [w / 2, 1] }), st, M('brushedSteel', { repeat: [w, 1] })));
  return g;
}

export function shelfRack([w, h, d]) {
  const g = G(), st = M('brushedSteel'), long = Math.max(w, d), deep = Math.min(w, d), turned = d > w;
  const inner = G(); if (turned) inner.rotation.y = Math.PI / 2; g.add(inner);
  for (const x of [-long / 2 + .04, long / 2 - .04]) for (const z of [-deep / 2 + .04, deep / 2 - .04]) mk(inner, box(.04, h, .04, { at: [0, h / 2, 0] }), st, x, 0, z);
  const r = rng(90);
  for (const y of [.3, .9, 1.5, h - .1]) {
    mk(inner, box(long, .03, deep), st, 0, y, 0);
    let x = -long / 2 + .1;
    while (x < long / 2 - .3) { const bw = .18 + r() * .24, bh = .14 + r() * .3; if (r() > .15) mk(inner, box(bw, bh, deep * .66, { at: [0, bh / 2, 0] }), M('cardboard'), x + bw / 2, y + .015, (r() - .5) * .1, 0, (r() - .5) * .2, 0); x += bw + .03; }
  }
  return g;
}

export function trashCan([w, h]) {
  const g = G();
  mk(g, cyl(w * .47, w * .4, h, 8, { at: [0, h / 2, 0] }), [M('steelDark', { double: true }), C(0x1b1c1e), C(0x1b1c1e)]);
  return g;
}

/** A line of steel stations, waist high. Fryers sit in it as separate props. */
export function fryerLine([w, h, d]) {
  const g = G(), st = M('brushedSteel');
  mk(g, box(w, h - .04, d, { at: [0, (h - .04) / 2, 0] }), F(st, M('brushedSteel', { repeat: [w / 1.5, 1] }), M('brushedSteel', { repeat: [w / 1.5, 1] }), M('steelDark', { repeat: [w, 1] })));
  mk(g, box(w + .04, .04, d + .04), M('brushedSteel', { repeat: [w, 1] }), 0, h - .02, 0);
  for (let x = -w / 2 + .6; x < w / 2; x += 1.2) mk(g, box(.02, h - .2, .01), C(0x3e4347), x, (h - .04) / 2, d / 2 + .005);
  return g;
}

export function prepTable([w, h, d]) {
  const g = G(), st = M('brushedSteel');
  mk(g, box(w, .05, d), st, 0, h - .025, 0);
  mk(g, box(w - .1, .03, d - .1), st, 0, .2, 0);
  for (const x of [-w / 2 + .05, w / 2 - .05]) for (const z of [-d / 2 + .05, d / 2 - .05]) mk(g, box(.04, h, .04, { at: [0, h / 2, 0] }), st, x, 0, z);
  mk(g, box(.4, .06, .28), C(0xcfc9b8), -.3, h + .03, 0);              // cutting board
  mk(g, box(.24, .12, .24, { at: [0, .06, 0] }), M('steelDark'), .35, h, .05); // a pan of something
  return g;
}

export function hangingRack([w, h, d]) {
  const g = G(), st = M('brushedSteel'), r = rng(31);
  mk(g, box(w, .05, .05), st, 0, h - .05, 0);
  for (const x of [-w / 2 + .03, w / 2 - .03]) mk(g, box(.05, h, .05, { at: [0, h / 2, 0] }), st, x, 0, 0);
  for (let x = -w / 2 + .45; x < w / 2 - .2; x += .55) {
    const len = .7 + r() * .4;
    mk(g, box(.02, .25, .02), C(0x8a9197), x, h - .2, 0);
    mk(g, box(.32, len, .2, { tw: .7, td: .8, at: [0, -len / 2, 0] }), C(r() > .5 ? 0xc77a78 : 0xb05c5a), x, h - .3, 0, 0, r() * .6, 0);
    mk(g, box(.24, .06, .16), C(0xf0e4dc), x, h - .3 - len * .35, 0);
  }
  return g;
}

export function crates([w, h, d]) {
  const g = G(), r = rng(5);
  let y = 0;
  while (y < h - .2) { const bh = .3 + r() * .15; mk(g, box(w * (.85 + r() * .15), bh, d * (.85 + r() * .15), { at: [0, bh / 2, 0] }), M('cardboard'), 0, y, 0, 0, (r() - .5) * .2, 0); y += bh; }
  mk(g, box(w * .9, .02, d * .9), C(0xe8f2f8), 0, y + .01, 0);         // frost on top
  return g;
}

export function scooter([w, h, d]) {
  const g = G(), frame = C(0x26282c), tire = M('tire', { double: true });
  for (const z of [-d / 2 + .25, d / 2 - .25]) mk(g, cyl(.22, .22, .1, 8), tire, 0, .22, z, 0, 0, Math.PI / 2);
  mk(g, box(.3, .14, d * .6), frame, 0, .34, 0);
  mk(g, box(.08, .7, .08, { at: [0, .35, 0] }), frame, 0, .3, d / 2 - .25, -.25, 0, 0);
  mk(g, box(.5, .04, .04), C(0x111111), 0, 1.0, d / 2 - .1);
  mk(g, box(.24, .1, .5), C(0x111111), 0, .55, -.1);
  mk(g, box(.4, .38, .4, { at: [0, .19, 0] }), F(M('bagSide'), M('bagFront'), M('bagFront')), 0, .62, -d / 2 + .3);
  return g;
}

export function rollCage([w, h, d]) {
  const g = G(), wire = M('wire', { cut: true, double: true, repeat: [w * 3, h * 3] });
  mk(g, box(w, h, d, { at: [0, h / 2, 0] }), F(wire, wire, wire, M('wire', { cut: true, double: true, repeat: [w * 3, d * 3] }), C(0x3e4347)));
  mk(g, box(w * .8, .5, d * .7, { at: [0, .25, 0] }), M('cardboard'), 0, .08, 0);
  mk(g, box(w * .6, .4, d * .6, { at: [0, .2, 0] }), M('cardboard'), .05, .58, 0, 0, .2, 0);
  for (const x of [-w / 2 + .1, w / 2 - .1]) for (const z of [-d / 2 + .1, d / 2 - .1]) mk(g, cyl(.05, .05, .06, 6), C(0x111111), x, .03, z, 0, 0, Math.PI / 2);
  return g;
}

export function pallets([w, h, d]) {
  const g = G();
  mk(g, box(w, .14, d, { at: [0, .07, 0] }), M('pallet'));
  mk(g, box(w * .9, h - .14, d * .9, { at: [0, (h - .14) / 2, 0] }), F(M('cardboard'), M('cardboard'), M('cardboard'), C(0xb7c0c8)), 0, .14, 0);
  return g;
}

export const COVER = { counter, shelfRack, trashCan, fryerLine, prepTable, hangingRack, crates, scooter, rollCage, pallets };

/* ---------- props ---------- */

/** A deep fryer that sits in a fryer line. The oil is tagged so shooting it starts a grease fire. */
export function fryer() {
  const g = G(), st = M('brushedSteel');
  mk(g, box(.6, .14, .7, { at: [0, .07, 0] }), F(st, st, st, M('steelDark'), st), 0, .86, 0);
  const oilM = mk(g, plane(.46, .42), M('oil', { emissive: 0x3a2208 }), 0, 1.005, .04, -Math.PI / 2);
  for (const x of [-.12, .12]) { mk(g, box(.2, .14, .26), M('wire', { cut: true, double: true }), x, 1.07, .06); mk(g, box(.02, .02, .2), C(0x1b1c1e), x, 1.11, .28, -.5, 0, 0); }
  mk(g, box(.6, .12, .06), M('steelDark'), 0, 1.06, -.32);
  oilM.userData.fryer = true; g.userData.fryer = true; g.userData.dynamicKeep = [oilM];
  return g;
}

export function hood() {
  const g = G();
  mk(g, box(6.6, .55, 1.1, { tw: .8, td: .8 }), M('steelDark', { repeat: [6, 1] }), 0, 0, 0);
  return g;
}

/** A wall of order screens; the screens are kept apart (userData.screens) so the bounty set piece can flip them. */
export function orderWall() {
  const g = G(), screens = [];
  [[-1.1, .32, 1], [0, .32, 2], [1.1, .32, 3], [-1.1, -.32, 3], [0, -.32, 4], [1.1, -.32, 1]].forEach(([x, y, seed]) => {
    mk(g, box(1.0, .58, .06), C(0x1b1c1e), x, y, 0);
    const s = mk(g, plane(.94, .52), M('ticketScreen', { args: [seed], unlit: true }), x, y, .031);
    s.userData.seed = seed; screens.push(s);
  });
  g.userData.screens = screens;
  return g;
}

export function gofrSign() {
  const g = G(), sign = M('gofrSign', { unlit: true });
  mk(g, box(2.4, .4, .06), F(C(0x1b1c1e), sign, sign), 0, 0, 0);
  for (const x of [-1.1, 1.1]) mk(g, box(.015, .45, .015), C(0x1b1c1e), x, .42, 0);
  return g;
}

export function neonOpen() {
  const g = G();
  mk(g, plane(1.6, .4), M('neon', { unlit: true, cut: true }), 0, 0, .01);
  return g;
}

export function heatLampPass() {
  const g = G(), st = M('brushedSteel');
  mk(g, box(3.2, .04, .45), st, 0, 0, 0);
  for (const x of [-1.55, 1.55]) mk(g, box(.04, .73, .04), st, x, -.36, 0);
  for (const x of [-.8, .8]) mk(g, box(.6, .07, .18), F(C(0x1b1c1e), C(0x1b1c1e), C(0x1b1c1e), C(0x1b1c1e), M('lamp', { unlit: true })), x, -.06, 0);
  return g;
}

export function pos() {
  const g = G();
  mk(g, box(.26, .18, .02), F(C(0x1b1c1e), M('pos', { unlit: true })), 0, .13, .05, -.5, 0, 0);
  mk(g, box(.06, .1, .06, { at: [0, .05, 0] }), C(0x1b1c1e));
  return g;
}

export function paperBags() {
  const g = G();
  [[-.8, 0], [-.4, .3], [.8, 0], [1.1, .2]].forEach(([x, ry], i) => mk(g, box(.17, .24, .12, { at: [0, .12, 0] }), F(M('kraft'), M('kraft')), x, 0, i % 2 * .08, 0, ry, 0));
  return g;
}

export function mirror() {
  const g = G();
  mk(g, box(1.2, 1.6, .04), C(0x2a2c30), 0, 0, 0);
  mk(g, plane(1.1, 1.5), C(0x6d8494, { emissive: 0x18222a }), 0, 0, .021);
  return g;
}

/** The wall-mounted extinguisher. Tagged: walk up and grab it, or shoot it for a white cloud. */
export function extinguisher() {
  const g = G(), red = M('extinguisher', { double: true });
  mk(g, cyl(.08, .08, .46, 8, { at: [0, .23, 0] }), [red, C(0x8a1010), C(0x1b1c1e)]);
  mk(g, dome(.08, 8, 2), red, 0, .46, 0);
  mk(g, box(.04, .06, .05), C(0x1b1c1e), 0, .55, 0);
  mk(g, box(.02, .012, .13), M('brushedSteel'), 0, .585, .03, -.25, 0, 0);
  mk(g, cyl(.012, .012, .32, 4, { open: true }), C(0x1b1c1e, { double: true }), .09, .36, 0, 0, 0, .08);
  g.userData.extinguisher = true;
  return g;
}

export function fogVent() {
  const g = G();
  mk(g, box(.8, .1, .5), M('steelDark'), 0, 0, 0);
  for (let x = -.3; x <= .3; x += .1) mk(g, box(.03, .02, .4), C(0x0e0f10), x, -.06, 0);
  return g;
}

export function frostLight() {
  const g = G();
  mk(g, box(1.2, .05, .25), F(M('frostLight', { unlit: true })), 0, 0, 0);
  return g;
}

export function fluo() {
  const g = G();
  mk(g, box(1.2, .05, .25), F(M('fluo', { unlit: true })), 0, 0, 0);
  return g;
}

/** Open bay doors with the street beyond: wet asphalt, a facade, a sodium lamp. The rain is added by the space. */
export function bayDoorsRain() {
  const g = G();
  mk(g, plane(10, 8, 6, 5), M('asphalt', { repeat: [6, 5] }), 0, -.02, -4.2, -Math.PI / 2, 0, 0);
  mk(g, plane(14, 9, 4, 3), M('facade', { emissive: 0xdddddd, repeat: [5, 3] }), 0, 4.5, -8.2);
  mk(g, cyl(.06, .06, 4, 6, { at: [0, 2, 0] }), C(0x1b1c1e), 2.5, 0, -4);
  mk(g, box(.5, .12, .22), F(C(0x1b1c1e), C(0x1b1c1e), C(0x1b1c1e), C(0x1b1c1e), M('lamp', { unlit: true })), 2.3, 3.95, -4, 0, 0, 0);
  return g;
}

export function eBike() {
  const g = G(), fr = C(0x26282c), tire = M('tire', { double: true });
  for (const z of [-.55, .55]) mk(g, cyl(.3, .3, .06, 10), tire, 0, .33, z, 0, 0, Math.PI / 2);
  mk(g, box(.05, .05, 1.0), fr, 0, .45, 0, .1, 0, 0);
  mk(g, box(.05, .6, .05), M('teal'), 0, .6, -.1, -.3, 0, 0);
  mk(g, box(.05, .55, .05), fr, 0, .65, .45, .3, 0, 0);
  mk(g, box(.5, .03, .03), C(0x1b1c1e), 0, 1.0, .4);
  mk(g, box(.1, .04, .22), C(0x1b1c1e), 0, .89, -.23);
  mk(g, box(.38, .34, .38), F(M('bagSide'), M('bagFront'), M('bagFront'), M('bagSide')), 0, .79, -.56);
  return g;
}

/** A queue of other couriers waiting at the counter: flat-shaded, still, there to make the room feel busy. */
export function courierQueue() {
  const g = G(), r = rng(12), jackets = [0x3b6fd8, 0xd8c23b, 0x3bb26b, 0x8a3bd8];
  [[-2.2, 0], [-1.2, .25], [1.6, -.2]].forEach(([x, ry], i) => {
    const p = G(); p.position.set(x, 0, r() * .4); p.rotation.y = Math.PI + ry; g.add(p);
    const jk = C(jackets[i % 4]), legs = C(0x23262c), skin = C([0xc58c6b, 0x8d5a3b, 0xe0b090][i % 3]);
    for (const sx of [-.09, .09]) mk(p, box(.13, .82, .14, { at: [0, .41, 0] }), legs, sx, 0, 0);
    mk(p, box(.38, .56, .24, { tw: 1.1, at: [0, .28, 0] }), jk, 0, .82, 0);
    for (const sx of [-.24, .24]) mk(p, box(.1, .56, .1, { at: [0, -.28, 0] }), jk, sx, 1.34, 0, 0, 0, sx > 0 ? -.08 : .08);
    mk(p, box(.2, .23, .21, { at: [0, .115, 0] }), skin, 0, 1.43, 0);
    mk(p, box(.22, .07, .23), C(0x1b1c1e), 0, 1.64, 0);
    if (i !== 1) mk(p, box(.4, .4, .3, { at: [0, .2, 0] }), F(M('bagSide'), M('bagFront'), M('bagFront')), 0, .95, -.28);
    else mk(p, box(.07, .13, .02), C(0x0b1622, { emissive: 0x1fb5a8 }), .12, 1.22, .18, -.6, 0, 0);
  });
  return g;
}

export const PROPS = { fryer, hood, orderWall, gofrSign, neonOpen, heatLampPass, pos, paperBags, mirror, extinguisher, fogVent, frostLight, fluo, bayDoorsRain, eBike, courierQueue };
