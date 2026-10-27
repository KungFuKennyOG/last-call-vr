// Last Drop: boots the page, wires the systems together, and runs the frame loop.
// Each system lives in its own module under drop/; this file only connects them.
import * as THREE from 'three';
import { createStage, vrSupported, enterVR, createDesktopInput, startLoop, createBulletTime } from '../engine/index.js';
import { startAudio, setMuffle, updateListener } from '../audio/index.js';
import { createPs1Frame } from './render/ps1.js';
import { createWorld } from './game/world.js';
import { createPlayer } from './game/player.js';
import { createChapter } from './game/chapter.js';
import { SPACES } from './ch1/spaces.js';
import { BEATS, SET_PIECES } from './ch1/beats.js';
import { createHud } from './ui/hud.js';

const $ = id => document.getElementById(id);
const canvas = /** @type {HTMLCanvasElement} */ ($('c'));
const { renderer, scene, camera, rig } = createStage({ canvas, far: 60 });
renderer.setPixelRatio(1);
scene.background = new THREE.Color(0x07080b);
scene.add(new THREE.HemisphereLight(0x9a9aa4, 0x141010, .9)); // only for the few non-PS1 bits (muzzle flashes, pips)
const frame = createPs1Frame(renderer);

/** 'menu' | 'vr' | 'desktop' */
let mode = 'menu', paused = false;
const G = { mode: () => mode, scene, camera, rig, renderer };

const world = createWorld();
const desk = createDesktopInput(canvas, {
  active: () => mode === 'desktop',
  onUnlock() { if (mode === 'desktop' && !G.over) { paused = true; $('pause').hidden = false; } },
});
const player = createPlayer({ renderer, rig, camera, world, desk });
const hud = createHud({ player });
const bt = createBulletTime({ camera, drain: 6, refill: .015, onMuffle: on => setMuffle(on, bt.slowT > 0) });
Object.assign(G, { world, desk, player, hud, bt });

const chapter = createChapter({
  scene, camera, world, player, data: { SPACES, BEATS, SET_PIECES },
  on: {
    out(o) { for (const f of G.listeners) f(o); },
    spaceLoaded(space) { for (const f of G.onSpace) f(space); },
    blocked(door) { for (const f of G.blockers) { const m = f(door); if (m) return m; } return null; },
  },
});
G.chapter = chapter;
G.listeners = [o => { if (o.type === 'blocked') hud.message(o.msg, 1.6); }];
G.onSpace = [];
G.blockers = [];
G.updaters = [];

/* ---------- the shell's bag: on the counter until you walk up and take it ---------- */
const bag = { taken: false, mesh: null };
G.onSpace.push(space => {
  if (space.sp.id !== 'counter' || bag.taken) return;
  bag.mesh = new THREE.Mesh(new THREE.BoxGeometry(.46, .48, .34), new THREE.MeshBasicMaterial({ color: 0xff7a1a }));
  bag.mesh.position.set(-.2, 1.29, -.55); space.root.add(bag.mesh);
});
G.blockers.push(() => (bag.taken ? null : "Don't forget the bag."));
G.updaters.push(() => {
  if (bag.taken || chapter.spaceId !== 'counter' || !bag.mesh) return;
  const p = player.headPos;
  if (Math.hypot(p.x - bag.mesh.position.x, p.z - bag.mesh.position.z) < 1.2) {
    bag.taken = true; bag.mesh.parent.remove(bag.mesh); hud.message('Bag on your back', 1.4); chapter.fire('bag:onBack');
  }
});

/* ---------- starting and stopping ---------- */
function startChapter() {
  G.over = false; bag.taken = false;
  chapter.unlocked = {};
  chapter.load('counter');
  chapter.start(0);
}

const overlay = $('overlay'), vrBtn = /** @type {HTMLButtonElement} */ ($('vrBtn'));
async function checkVR() {
  const ok = await vrSupported();
  vrBtn.disabled = !ok;
  $('vrNote').textContent = ok ? 'Headset ready. Stand in an open space with about 2 m around you.'
    : 'No headset here. Open kungfukennyog.github.io/last-call-vr/drop/ in the Quest browser, or play in the browser now.';
}
checkVR();
vrBtn.addEventListener('click', async () => {
  startAudio();
  try {
    const s = await enterVR(renderer);
    mode = 'vr'; overlay.hidden = true; hud.show('vr');
    startChapter();
    s.addEventListener('end', () => { mode = 'menu'; overlay.hidden = false; hud.show('menu'); });
  } catch (err) { $('vrNote').textContent = 'Could not start VR: ' + (err && err.message || err); }
});
$('deskBtn').addEventListener('click', () => {
  startAudio(); mode = 'desktop'; overlay.hidden = true; hud.show('desktop'); desk.lock(); startChapter();
});
$('resumeBtn').addEventListener('click', () => { paused = false; $('pause').hidden = true; desk.lock(); });
canvas.addEventListener('pointerdown', () => { if (mode === 'desktop' && !paused && !desk.locked) desk.lock(); });
document.addEventListener('keydown', ev => {
  if (mode !== 'desktop' || ev.repeat) return;
  if (ev.code === 'Space') { ev.preventDefault(); player.jumpQueued = true; }
  if (ev.code === 'KeyE') bt.toggle(true);
  for (const f of G.keys || []) f(ev.code);
});

/* ---------- loop ---------- */
let tAll = 0;
function frameFn(realDt, time) {
  tAll = time;
  const speed = bt.update(realDt, mode !== 'menu' && !paused);
  const dt = paused ? 0 : realDt * speed;
  if (!renderer.xr.isPresenting) {
    if (mode === 'desktop') camera.rotation.set(desk.pitch, desk.yaw, 0);
    else camera.rotation.set(-.05 + Math.sin(tAll * .11) * .03, Math.sin(tAll * .07) * .35, 0);
  }
  player.sense();
  updateListener(player.headPos, player.headDir);
  if (mode !== 'menu' && !paused) player.move(realDt * Math.max(.6, speed), mode);
  player.updateLook(realDt);
  if (mode !== 'menu' && !paused) {
    for (const f of G.updaters) f(dt, realDt);
    chapter.update(dt, realDt);
  } else if (chapter.space) chapter.space.update(realDt);
  hud.update(realDt);
  frame.render(scene, camera);
}

// the title screen shows the counter behind the menu
chapter.load('counter');
player.placeAt(0, 3.6, 0);
startLoop(renderer, frameFn, { onFps: f => { hud.fps = f; } });
Object.assign(window, { __drop: G, __dropOK: true });
