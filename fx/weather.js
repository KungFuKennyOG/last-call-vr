// Weather: snow, ash or dust as drifting points in a box, and rain as streaks moved entirely on the GPU.
import * as THREE from 'three';

// Drifting points that wrap around inside a box. o: { box: [x0,x1,y0,y1,z0,z1], count, color, size, opacity, add, vel: [x,y,z] m/s, sway }.
// Returns the entry to keep in a list for updateWeather; entry.p is the Points to add to the scene.
export function makeWeather(o, glowTex) {
  const n = o.count || 800, [x0, x1, y0, y1, z0, z1] = o.box, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = x0 + Math.random() * (x1 - x0); pos[i * 3 + 1] = y0 + Math.random() * (y1 - y0); pos[i * 3 + 2] = z0 + Math.random() * (z1 - z0); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: o.color || 0xffffff, size: o.size || .05, map: glowTex, transparent: true, opacity: o.opacity || .8, depthWrite: false,
    blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending }));
  p.frustumCulled = false;
  return { p, o, box: o.box, vel: o.vel || [0, -1, 0], sway: o.sway || .3 };
}

// moves every weather entry in the list; t is the running clock (drives the sway)
export function updateWeather(list, dt, t) {
  list.forEach(w => {
    const a = w.p.geometry.attributes.position, [x0, x1, y0, y1, z0, z1] = w.box, n = a.count, vx = w.vel[0] * dt, vy = w.vel[1] * dt, vz = w.vel[2] * dt, sw = w.sway * dt;
    for (let i = 0; i < n; i++) {
      let x = a.getX(i) + vx + Math.sin(t * 1.3 + i) * sw, y = a.getY(i) + vy, z = a.getZ(i) + vz + Math.cos(t * 1.1 + i * .7) * sw;
      if (y < y0) y = y1; if (y > y1) y = y0; if (x < x0) x = x1; if (x > x1) x = x0; if (z < z0) z = z1; if (z > z1) z = z0;
      a.setXYZ(i, x, y, z);
    }
    a.needsUpdate = true;
  });
}

// Rain: streaks in a w x w x h box that follows your head. Set material.uniforms.uT (time) and uC (head position) each frame.
// o: { count, w, h, speed, wind, color, alpha }
export function makeRain(o) {
  o = o || {};
  const n = o.count || 1400, W = o.w || 22, H = o.h || 14, pos = new Float32Array(n * 6), seed = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const x = (Math.random() - .5) * W, y = Math.random() * H, z = (Math.random() - .5) * W, s = Math.random();
    pos.set([x, y, z, x, y, z], i * 6); seed[i * 2] = s; seed[i * 2 + 1] = s;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const tail = new Float32Array(n * 2); for (let i = 0; i < n; i++) { tail[i * 2] = 0; tail[i * 2 + 1] = 1; }
  g.setAttribute('tail', new THREE.BufferAttribute(tail, 1));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uT: { value: 0 }, uC: { value: new THREE.Vector3() }, uW: { value: W }, uH: { value: H }, uV: { value: new THREE.Vector3(o.wind || 1.2, -(o.speed || 14), .3) },
      uCol: { value: new THREE.Color(o.color || 0x9ab8e8) }, uA: { value: o.alpha || .35 } },
    vertexShader: `attribute float seed; attribute float tail; uniform float uT; uniform vec3 uC; uniform float uW; uniform float uH; uniform vec3 uV; varying float vA;
      void main(){ vec3 p=position; float t=uT*(0.85+seed*0.3);
        p.y=mod(p.y+uV.y*t,uH); p.x=mod(p.x+uV.x*t+uW*.5,uW)-uW*.5; p.z=mod(p.z+uV.z*t+uW*.5,uW)-uW*.5;
        vec3 w=vec3(uC.x+p.x, p.y, uC.z+p.z); w-=normalize(uV)*tail*0.32;
        vA=(1.0-tail*0.8)*smoothstep(0.0,1.5,p.y)*smoothstep(uH,uH-2.0,p.y);
        gl_Position=projectionMatrix*viewMatrix*vec4(w,1.0); }`,
    fragmentShader: `uniform vec3 uCol; uniform float uA; varying float vA; void main(){ gl_FragColor=vec4(uCol*uA*vA,1.0); }` });
  const l = new THREE.LineSegments(g, mat); l.frustumCulled = false; return l;
}
