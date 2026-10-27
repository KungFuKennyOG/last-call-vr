// Tiny pixel images in plain memory: the building block for every Last Drop texture. No canvas, no three.js,
// so textures can be painted and tested in Node. The renderer uploads `data` as an RGBA texture (no filtering).

/** @typedef {{ w: number, h: number, data: Uint8ClampedArray }} Img */

/** @returns {Img} a transparent image */
export function image(w, h, fill) {
  const img = { w, h, data: new Uint8ClampedArray(w * h * 4) };
  if (fill) rect(img, fill, 0, 0, w, h);
  return img;
}

const cache = new Map();
/** '#rgb', '#rrggbb' or 'rgba(r,g,b,a)' to [r, g, b, a] with a in 0..1 */
export function parse(col) {
  let c = cache.get(col);
  if (c) return c;
  let m;
  if ((m = /^#([0-9a-f]{3})$/i.exec(col))) c = [...m[1]].map(h => parseInt(h + h, 16)).concat(1);
  else if ((m = /^#([0-9a-f]{6})$/i.exec(col))) c = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
  else if ((m = /^rgba?\(([^)]+)\)$/i.exec(col))) { const p = m[1].split(',').map(Number); c = [p[0], p[1], p[2], p[3] ?? 1]; }
  else throw new Error('unknown color ' + col);
  cache.set(col, c);
  return c;
}

/** Fills a rectangle, blending if the color has alpha. Top-left origin, like a canvas. Clipped to the image. */
export function rect(img, col, x, y, w, h) {
  const [r, g, b, a] = parse(col);
  const x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0), x1 = Math.min(img.w, (x + w) | 0), y1 = Math.min(img.h, (y + h) | 0);
  for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
    const k = (j * img.w + i) * 4, d = img.data;
    if (a >= 1) { d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = 255; continue; }
    d[k] = d[k] + (r - d[k]) * a; d[k + 1] = d[k + 1] + (g - d[k + 1]) * a; d[k + 2] = d[k + 2] + (b - d[k + 2]) * a;
    d[k + 3] = Math.max(d[k + 3], a * 255);
  }
}

/** Reads one pixel as [r, g, b, a]. */
export function px(img, x, y) {
  const k = (y * img.w + x) * 4; return [img.data[k], img.data[k + 1], img.data[k + 2], img.data[k + 3]];
}

/** Seeded random numbers in [0, 1): same seed, same texture. */
export function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

/** Adds ±amt/2 of brightness noise to every opaque pixel. */
export function grain(img, amt, seed = 1) {
  const r = rng(seed), d = img.data;
  for (let k = 0; k < d.length; k += 4) { if (!d[k + 3]) continue; const n = (r() - 0.5) * amt; d[k] += n; d[k + 1] += n; d[k + 2] += n; }
}

/** Paints a pixel grid: one string per row, one character per pixel, looked up in `pal`. Unknown characters are skipped. */
export function grid(img, rows, pal, ox = 0, oy = 0) {
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const c = pal[row[x]]; if (c) rect(img, c, ox + x, oy + y, 1, 1); } });
}

/** The 3×5 pixel font used for every in-world text (signs, tickets, the wrist phone, password codes). */
export const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
  '-': '000000111000000', ':': '000010000010000', '#': '101111101111101', $: '011110010011110', '!': '010010010000010', '.': '000000000000010',
  '/': '001001010100100', '+': '000010111010000', '>': '100010001010100', '?': '110001010000010', "'": '010010000000000', ',': '000000000010100',
};

/** Width in pixels of a string at scale s (each glyph is 3 wide plus 1 of spacing). */
export const textWidth = (str, s = 1) => (str.length ? str.length * 4 * s - s : 0);

/** Draws text in the pixel font. Lowercase is drawn as uppercase; characters without a glyph leave a gap. */
export function text(img, str, x, y, col, s = 1) {
  let cx = x;
  for (const ch of str.toUpperCase()) {
    const g = FONT[ch];
    if (g) for (let i = 0; i < 15; i++) if (g[i] === '1') rect(img, col, cx + (i % 3) * s, y + Math.floor(i / 3) * s, s, s);
    cx += 4 * s;
  }
}
