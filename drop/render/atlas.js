// The character atlas: every texture a body uses, packed into one image, so each joint of a body (and each
// corpse once it stops moving) draws as one mesh with one material.
//
// Each named texture also gets its own small material (`mat(name)`) for the pieces that stay separate:
// ragdoll limbs while they fall, the face that changes expression. Those materials remember their place in
// the atlas, so merging can move their uvs into it.
import { image, rect } from '../art/pixels.js';
import { ps1, texFrom } from './ps1.js';

const SIZE = 256, PAD = 1;

/**
 * @param {Record<string, { w: number, h: number, data: Uint8ClampedArray }>} imgs
 * @param {{ cut?: boolean }} [o] cut: the atlas material cuts out transparent pixels (hairnets)
 */
export function createAtlas(imgs, o = {}) {
  const sheet = image(SIZE, SIZE, '#ffffff');
  /** @type {Record<string, [number, number, number, number]>} u0, v0, u1, v1 in texture space (v up) */
  const rects = {};
  let x = 0, y = 0, row = 0;
  // a white swatch first: flat colored parts use it with a vertex color
  const all = { white: image(4, 4, '#ffffff'), ...imgs };
  const order = Object.keys(all).sort((a, b) => all[b].h - all[a].h);
  for (const name of order) {
    const im = all[name], w = im.w + PAD * 2, h = im.h + PAD * 2;
    if (x + w > SIZE) { x = 0; y += row; row = 0; }
    if (y + h > SIZE) throw new Error('character atlas is full at ' + name);
    blit(sheet, im, x + PAD, y + PAD);
    rects[name] = [(x + PAD) / SIZE, 1 - (y + PAD + im.h) / SIZE, (x + PAD + im.w) / SIZE, 1 - (y + PAD) / SIZE];
    x += w; row = Math.max(row, h);
  }
  const tex = texFrom(sheet);
  const atlasMat = ps1({ map: tex, vcol: true, cut: !!o.cut });
  atlasMat.userData.atlas = true;
  const mats = {};
  /** A standalone material for one texture, which knows its atlas rectangle. */
  function mat(name, extra = {}) {
    const key = name + JSON.stringify(extra);
    if (mats[key]) return mats[key];
    if (!all[name]) throw new Error('no atlas texture ' + name);
    const m = ps1({ map: texFrom(all[name]), ...extra });
    m.userData.rect = rects[name];
    return mats[key] = m;
  }
  /** A flat color material that merges onto the white swatch. */
  function color(hex) {
    const key = 'c' + hex;
    if (mats[key]) return mats[key];
    const m = ps1({ color: hex });
    m.userData.rect = rects.white; m.userData.tint = hex;
    return mats[key] = m;
  }
  /**
   * For mergeInto: moves a vertex's uv into the atlas and files it under the atlas material.
   * uvs outside 0..1 (repeats) are wrapped, which works for 0..1 parts and degrades gently otherwise.
   */
  function remap(src, uv) {
    const r = src.userData.rect;
    if (!r) return src;
    const u = uv[0] - Math.floor(uv[0] * .9999), v = uv[1] - Math.floor(uv[1] * .9999);
    uv[0] = r[0] + (r[2] - r[0]) * Math.min(1, Math.max(0, u));
    uv[1] = r[1] + (r[3] - r[1]) * Math.min(1, Math.max(0, v));
    return atlasMat;
  }
  return { tex, atlasMat, rects, mat, color, remap, sheet };
}

/** Copies an image in, then repeats its edge pixels one pixel out so nearest sampling never bleeds. */
function blit(dst, src, ox, oy) {
  for (let j = -PAD; j < src.h + PAD; j++) for (let i = -PAD; i < src.w + PAD; i++) {
    const sx = Math.min(src.w - 1, Math.max(0, i)), sy = Math.min(src.h - 1, Math.max(0, j));
    const s = (sy * src.w + sx) * 4, d = ((oy + j) * dst.w + ox + i) * 4;
    dst.data[d] = src.data[s]; dst.data[d + 1] = src.data[s + 1]; dst.data[d + 2] = src.data[s + 2]; dst.data[d + 3] = src.data[s + 3];
  }
}

/** Flat colors on merged meshes: tint each vertex by its source material's color (atlas parts stay white). */
export function tintFor(src) {
  const hex = src.userData.tint;
  return hex === undefined ? [1, 1, 1] : [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}

export { rect };
