// The Last Drop look: one PS1-style material for every surface, and the low-res, dithered frame.
// See claude/art-direction.md in the Project for the settings this follows.
//
// - Vertex wobble: clip-space x/y snap to a 480-line grid in the vertex shader.
// - Warped textures: affine texture mapping (uv * w in the vertex shader, divided per pixel).
// - Per-vertex light: ambient + 1 directional + up to 4 point lights, then linear fog.
// - 15-bit color with a 4×4 ordered dither, done in the material itself from gl_FragCoord, so it also works
//   in VR without a render target. On desktop the frame also renders to a 480-line target and is drawn back
//   up with hard pixels. In the headset it renders at full resolution and the dither grid stands in for the pixels.
// - uGrey turns the world grey while you're stunned; uTint flashes it red when you're hit. Neither moves the view.
import * as THREE from 'three';

export const LINES = 480;

/** Shared uniforms: every material holds these same objects, so one change updates all of them. */
export const U = {
  uSnap: { value: 1 }, uAffine: { value: 1 }, uDither: { value: 1 },
  uRes: { value: new THREE.Vector2(640, LINES) },   // the snap grid in pixels
  uPix: { value: 1 },                               // screen pixels per dither pixel
  uAmb: { value: new THREE.Vector3(.16, .15, .2) },
  uDirDir: { value: new THREE.Vector3(.3, 1, .5) }, uDirCol: { value: new THREE.Vector3(.1, .11, .15) },
  uPLPos: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) },
  uPLCol: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) },
  uPLDist: { value: [1, 1, 1, 1] },
  uFogCol: { value: new THREE.Vector3(.03, .031, .045) }, uFogNear: { value: 9 }, uFogFar: { value: 24 },
  uGrey: { value: 0 }, uTint: { value: new THREE.Vector3() },
};

const VS = `
uniform float uSnap, uAffine, uUnlit;
uniform vec2 uRes;
uniform vec3 uAmb, uDirDir, uDirCol;
uniform vec3 uPLPos[4]; uniform vec3 uPLCol[4]; uniform float uPLDist[4];
uniform float uFogNear, uFogFar;
varying vec3 vAff; varying vec3 vLight; varying float vFog;
#ifdef USE_COLOR
varying vec3 vCol;
#endif
void main(){
  vec4 lp = vec4(position, 1.0); vec3 ln = normal;
  #ifdef USE_INSTANCING
    lp = instanceMatrix * lp; ln = mat3(instanceMatrix) * ln;
  #endif
  vec4 wp = modelMatrix * lp;
  vec3 n = normalize(mat3(modelMatrix) * ln);
  vec3 L = uAmb + uDirCol * max(dot(n, normalize(uDirDir)), 0.0);
  for(int i = 0; i < 4; i++){
    vec3 d = uPLPos[i] - wp.xyz; float dist = length(d);
    float a = clamp(1.0 - dist / uPLDist[i], 0.0, 1.0); a *= a;
    L += uPLCol[i] * a * max(dot(n, d / max(dist, 1e-4)), 0.0);
  }
  vLight = mix(L, vec3(1.0), uUnlit);
  #ifdef USE_COLOR
    vCol = color;
  #endif
  vec4 vp = viewMatrix * wp;
  vec4 cp = projectionMatrix * vp;
  if(uSnap > 0.5 && cp.w > 0.0){ vec2 g = uRes * 0.5; cp.xy = floor(cp.xy / cp.w * g + 0.5) / g * cp.w; }
  vFog = clamp((-vp.z - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
  vAff = uAffine > 0.5 ? vec3(uv * cp.w, cp.w) : vec3(uv, 1.0);
  gl_Position = cp;
}`;

const FS = `
uniform sampler2D map; uniform float uHasMap, uCut, uDither, uPix, uGrey, uNoFog;
uniform vec3 uColor, uEmissive, uFogCol, uTint; uniform vec2 uRepeat;
varying vec3 vAff; varying vec3 vLight; varying float vFog;
#ifdef USE_COLOR
varying vec3 vCol;
#endif
float bayer2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
void main(){
  vec2 uv = vAff.xy / vAff.z * uRepeat;
  vec4 t = uHasMap > 0.5 ? texture2D(map, uv) : vec4(1.0);
  if(uCut > 0.5 && t.a < 0.5) discard;
  vec3 base = t.rgb * uColor;
  #ifdef USE_COLOR
    base *= vCol;
  #endif
  vec3 c = base * vLight + t.rgb * uEmissive;
  c = mix(c, uFogCol, vFog * (1.0 - uNoFog));
  c += uTint;
  float l = dot(c, vec3(0.3, 0.59, 0.11));
  c = mix(c, vec3(l) * vec3(0.92, 0.94, 1.0), uGrey);
  if(uDither > 0.5){ vec2 px = floor(gl_FragCoord.xy / uPix); c += (bayer4(px) - 0.5) / 31.0; c = floor(c * 31.0 + 0.5) / 31.0; }
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

const hex3 = h => new THREE.Vector3(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255);

/**
 * @typedef {object} Ps1Options
 * @property {any} [map]          a texture from texFrom()
 * @property {number} [color]     multiplies the texture (0xffffff by default)
 * @property {number} [emissive]  glows by itself: screens, LEDs, lamps (multiplies the texture)
 * @property {boolean} [unlit]    full bright, ignores the lights (signs, lamps, rain)
 * @property {[number, number]} [repeat]
 * @property {boolean} [cut]      hard alpha cut-out: wire mesh, hairnets, neon letters. Never blended.
 * @property {boolean} [double]   draw both sides
 * @property {boolean} [vcol]     multiply by vertex colors (merged meshes)
 * @property {boolean} [noFog]
 */

const cache = new Map();
let nextId = 1;
/** @param {any} t */
const texId = t => t ? (t.userData.ps1Id || (t.userData.ps1Id = nextId++)) : 0;

/**
 * The one material. Same options, same material object, so merging can group by it.
 * @param {Ps1Options} [o]
 */
export function ps1(o = {}) {
  const key = [texId(o.map), o.color ?? 0xffffff, o.emissive || 0, o.unlit ? 1 : 0, (o.repeat || [1, 1]).join('x'), o.cut ? 1 : 0, o.double ? 1 : 0, o.vcol ? 1 : 0, o.noFog ? 1 : 0].join('|');
  let m = cache.get(key);
  if (m) return m;
  m = new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS, vertexColors: !!o.vcol, side: o.double ? THREE.DoubleSide : THREE.FrontSide,
    uniforms: {
      ...U,
      map: { value: o.map || null }, uHasMap: { value: o.map ? 1 : 0 }, uCut: { value: o.cut ? 1 : 0 },
      uColor: { value: hex3(o.color ?? 0xffffff) }, uEmissive: { value: hex3(o.emissive || 0) }, uUnlit: { value: o.unlit ? 1 : 0 },
      uRepeat: { value: new THREE.Vector2(...(o.repeat || [1, 1])) }, uNoFog: { value: o.noFog ? 1 : 0 },
    },
  });
  m.userData.ps1 = { ...o };
  cache.set(key, m);
  return m;
}

/**
 * A texture from a pixel image (drop/art/pixels.js): no filtering, repeats, top row at the top.
 * @param {{ w: number, h: number, data: Uint8ClampedArray }} img
 */
export function texFrom(img) {
  const { w, h } = img, flipped = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) flipped.set(img.data.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
  const t = new THREE.DataTexture(flipped, w, h, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true;
  return t;
}

/** A canvas texture with hard pixels (the wrist phone, the keypad). */
export function canvasTex(cv) {
  const t = new THREE.CanvasTexture(cv);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return t;
}

/** Light a space: { amb, dir, dirCol, fog, fogNear, fogFar, points: [{ pos, color, range }] } from the chapter data. */
export function setLights(L) {
  U.uAmb.value.set(...L.amb); U.uDirDir.value.set(...L.dir); U.uDirCol.value.set(...L.dirCol);
  U.uFogCol.value.set(...L.fog); U.uFogNear.value = L.fogNear; U.uFogFar.value = L.fogFar;
  for (let i = 0; i < 4; i++) {
    const p = L.points[i];
    if (p) { U.uPLPos.value[i].set(...p.pos); U.uPLCol.value[i].set(...p.color); U.uPLDist.value[i] = p.range; }
    else { U.uPLPos.value[i].set(0, -100, 0); U.uPLCol.value[i].set(0, 0, 0); U.uPLDist.value[i] = 1; }
  }
}

/** Point light i, for lights that move or flicker (a muzzle flash, a grease fire). */
export function setPoint(i, pos, color, range) {
  U.uPLPos.value[i].copy(pos); U.uPLCol.value[i].set(...color); U.uPLDist.value[i] = range;
}

/**
 * Draws the scene the PS1 way. On desktop: into a 480-line target, then up to the screen with hard pixels.
 * In VR: straight to the headset, with the snap grid and dither sized to 480 lines of the eye's view.
 * @param {any} renderer
 */
export function createPs1Frame(renderer) {
  const rt = new THREE.WebGLRenderTarget(2, 2, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
  const blitScene = new THREE.Scene(), blitCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const blit = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: rt.texture, depthTest: false, depthWrite: false }));
  blit.frustumCulled = false; blitScene.add(blit);
  const size = new THREE.Vector2();
  return {
    rt,
    render(scene, camera) {
      if (renderer.xr.isPresenting) {
        // the eye's viewport from the last XR frame (Quest uses projection layers, so there's no baseLayer to ask)
        const vp = renderer.xr.getCamera().cameras[0]?.viewport;
        const fh = vp && vp.w ? vp.w : 1800, fw = vp && vp.z ? vp.z : 1700;
        U.uRes.value.set(Math.round(LINES * fw / fh), LINES); U.uPix.value = Math.max(1, Math.round(fh / LINES));
        renderer.render(scene, camera);
        return;
      }
      renderer.getDrawingBufferSize(size);
      const h = LINES, w = Math.max(1, Math.round(h * size.x / Math.max(1, size.y)));
      if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
      U.uRes.value.set(w, h); U.uPix.value = 1;
      renderer.setRenderTarget(rt); renderer.render(scene, camera);
      renderer.setRenderTarget(null); renderer.render(blitScene, blitCam);
    },
  };
}

/** Swaps the Lambert and Phong materials on a model (the shared gun kit) for PS1 ones of the same color. */
export function ps1ify(root) {
  root.traverse(o => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    const m = o.material;
    if (m.isMeshLambertMaterial || m.isMeshPhongMaterial) o.material = ps1({ color: m.color.getHex(), emissive: m.emissive ? m.emissive.getHex() : 0, double: m.side === THREE.DoubleSide });
  });
}
