// Materials by texture name, made once and shared. M('quarryTile', { repeat: [6, 4] }) or C(0x1b1c1e) for a flat color.
// Flat colors carry userData.tint so a merged space can draw them all as one vertex-colored mesh.
import { TEXTURES } from '../art/textures.js';
import { SURFACES } from '../art/surfaces.js';
import { ps1, texFrom } from './ps1.js';

const PAINTERS = { ...TEXTURES, ...SURFACES };
const texCache = new Map();

/** The texture for a painter name, with optional arguments (a screen seed, a sign label). */
export function tex(name, ...args) {
  const key = name + JSON.stringify(args);
  let t = texCache.get(key);
  if (t) return t;
  const paint = PAINTERS[name];
  if (!paint) throw new Error('no texture ' + name);
  t = texFrom(paint(...args));
  texCache.set(key, t);
  return t;
}

/**
 * A textured PS1 material.
 * @param {string} name
 * @param {import('./ps1.js').Ps1Options & { args?: any[] }} [o]
 */
export function M(name, o = {}) {
  const { args = [], ...rest } = o;
  return ps1({ map: tex(name, ...args), ...rest });
}

/** A flat color PS1 material. */
export function C(hex, o = {}) {
  const m = ps1({ color: hex, ...o });
  if (!o.unlit && !o.emissive) m.userData.tint = hex;
  return m;
}

/** One vertex-colored material that every flat color in a space merges into. */
export const FLAT = ps1({ vcol: true });

/**
 * For mergeInto: flat colors go to FLAT with their color on the vertices; a texture repeated by its material has the
 * repeat moved into the uvs instead, so every use of that texture merges into one mesh whatever its size.
 */
export function flatRemap(src, uv) {
  if (src.userData.tint !== undefined) return FLAT;
  const o = src.userData.ps1;
  if (!o || !o.map || !o.repeat || (o.repeat[0] === 1 && o.repeat[1] === 1)) return src;
  uv[0] *= o.repeat[0]; uv[1] *= o.repeat[1];
  const rest = { ...o }; delete rest.repeat;
  return ps1(rest);
}
export const flatColor = src => {
  const h = src.userData.tint;
  return h === undefined ? [1, 1, 1] : [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
};
