// Phase 1.1 check: three.js r149 as an ES module, our own engine module, and an empty room you can stand in.
import * as T from 'three';
import { vrSupported, enterVR } from '../engine/xr.js';

const $ = id => document.getElementById(id);
const status = $('status'), vrBtn = /** @type {HTMLButtonElement} */ ($('vrBtn'));

const renderer = new T.WebGLRenderer({ canvas: $('c'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.xr.enabled = true;

const scene = new T.Scene();
scene.background = new T.Color(0x050505);
scene.add(new T.HemisphereLight(0xffffff, 0x222222, 1.1));

const camera = new T.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 90);
camera.position.set(0, 1.6, 0);
const rig = new T.Group(); rig.add(camera); scene.add(rig);

// floor grid and a cube 1.5 m ahead at chest height
const grid = new T.GridHelper(10, 20, 0xe0162b, 0x2a2928); scene.add(grid);
const cube = new T.Mesh(new T.BoxGeometry(.3, .3, .3), new T.MeshStandardMaterial({ color: 0xe0162b, roughness: .5 }));
cube.position.set(0, 1.3, -1.5); scene.add(cube);

// a sign so you can see in the headset which build you're on
const sign = (() => {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#e9e7e2'; g.font = '600 40px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('MODULES OK · r' + T.REVISION, 256, 64);
  const m = new T.Mesh(new T.PlaneGeometry(1, .25), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv) }));
  m.position.set(0, 1.75, -2); return m;
})();
scene.add(sign);

// controller rays, so tracking is visible
const rayGeo = new T.BufferGeometry().setFromPoints([new T.Vector3(0, 0, 0), new T.Vector3(0, 0, -1)]);
for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i);
  c.add(new T.Line(rayGeo, new T.LineBasicMaterial({ color: i ? 0x00c2b2 : 0xff7a1a })));
  rig.add(c);
}

addEventListener('resize', () => {
  if (renderer.xr.isPresenting) return;
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
});

const clock = new T.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), .1);
  cube.rotation.y += dt * .8; cube.rotation.x += dt * .3;
  renderer.render(scene, camera);
});

status.textContent = 'three r' + T.REVISION + ' loaded as a module. Checking for a headset…';
vrSupported().then(ok => {
  vrBtn.disabled = !ok;
  status.textContent = 'three r' + T.REVISION + ' loaded as a module. ' +
    (ok ? 'Headset ready.' : 'No headset here: open this page in the Quest browser.');
});

vrBtn.addEventListener('click', async () => {
  try {
    const s = await enterVR(renderer);
    $('ui').hidden = true;
    s.addEventListener('end', () => { $('ui').hidden = false; camera.position.set(0, 1.6, 0); camera.rotation.set(0, 0, 0); });
  } catch (err) {
    status.className = 'bad'; status.textContent = 'Could not start VR: ' + (err && err.message || err);
  }
});

window.__bootOK = true;
