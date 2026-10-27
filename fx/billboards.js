// Soft billboards: glows, flames and smoke as instanced camera-facing quads. One draw call per batch.
// Each frame: begin(), put() every sprite, end().
import * as THREE from 'three';

// n: most sprites per frame. blending: THREE.AdditiveBlending for glow and fire, NormalBlending for smoke.
export function makeBB(scene, glowTex, n, blending) {
  const base = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
  g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
  const at = {
    iPos: new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3), iSize: new THREE.InstancedBufferAttribute(new Float32Array(n), 1),
    iCol: new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3), iA: new THREE.InstancedBufferAttribute(new Float32Array(n), 1),
    iRot: new THREE.InstancedBufferAttribute(new Float32Array(n), 1),
  };
  for (const k in at) { at[k].setUsage(THREE.DynamicDrawUsage); g.setAttribute(k, at[k]); }
  g.instanceCount = 0;
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending, uniforms: { map: { value: glowTex } },
    vertexShader: `attribute vec3 iPos; attribute float iSize; attribute vec3 iCol; attribute float iA; attribute float iRot; varying vec2 vUv; varying vec4 vC;
      void main(){ vUv=uv; vC=vec4(iCol,iA); vec4 mv=modelViewMatrix*vec4(iPos,1.0); float c=cos(iRot), s=sin(iRot); mv.xy+=vec2(c*position.x-s*position.y,s*position.x+c*position.y)*iSize; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying vec4 vC; void main(){ vec4 t=texture2D(map,vUv); gl_FragColor=vec4(vC.rgb*t.rgb,t.a*vC.a); }` });
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 3; scene.add(m);
  let k = 0;
  return {
    m, n, at,
    begin() { k = 0; },
    // p: position, s: size in m, c: Color, a: alpha, r: rotation in radians
    put(p, s, c, a, r) { if (k >= n) return; at.iPos.setXYZ(k, p.x, p.y, p.z); at.iSize.setX(k, s); at.iCol.setXYZ(k, c.r, c.g, c.b); at.iA.setX(k, a); at.iRot.setX(k, r || 0); k++; },
    end() { g.instanceCount = k; for (const q in at) at[q].needsUpdate = true; },
  };
}
