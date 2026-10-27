// Last Drop: boots the page, the title screen and the frame loop. The chapter itself is game/game.js.
import * as THREE from 'three';
import { createStage, vrSupported, enterVR, createDesktopInput, startLoop, createBulletTime, controllers } from '../engine/index.js';
import { startAudio, setMuffle, updateListener, sfxBTIn, sfxBTOut } from '../audio/index.js';
import { buzz } from '../engine/index.js';
import { createPs1Frame } from './render/ps1.js';
import { createWorld } from './game/world.js';
import { createPlayer } from './game/player.js';
import { createHud } from './ui/hud.js';
import { createTitle } from './ui/title.js';
import { createGame } from './game/game.js';

const $ = id => document.getElementById(id);
const canvas = /** @type {HTMLCanvasElement} */ ($('c'));
const { renderer, scene, camera, rig } = createStage({ canvas, far: 60 });
renderer.setPixelRatio(1);
scene.background = new THREE.Color(0x07080b);
scene.add(new THREE.HemisphereLight(0x9a9aa4, 0x141010, .9)); // only lights the few non-PS1 bits
const frame = createPs1Frame(renderer);

/** 'menu' | 'vr' | 'desktop' */
let mode = 'menu', paused = false;
const world = createWorld();
const desk = createDesktopInput(canvas, {
  active: () => mode === 'desktop',
  onUnlock() { if (mode === 'desktop' && G.state === 'playing') { paused = true; $('pause').hidden = false; } },
});
const player = createPlayer({ renderer, rig, camera, world, desk });
const hud = createHud({ player });
const bt = createBulletTime({ camera, drain: 6, refill: .015,
  onStart() { sfxBTIn(); buzz('both', .4, 90); hud.dirty = true; }, onEnd() { sfxBTOut(); hud.dirty = true; },
  onMuffle: on => setMuffle(on, bt.slowT > 0) });
const title = createTitle({ onStart: () => G.start() });
const G = createGame({ renderer, scene, camera, rig, world, player, hud, bt, title, mode: () => mode });
scene.add(title.keypad.group); title.keypad.group.visible = false;

/* ---------- title, VR and the browser ---------- */
function toTitle() {
  G.cards.hide();
  if (mode === 'vr') {
    G.state = 'title';
    G.chapter.load('counter'); player.placeAt(0, 2.6, 0);
    title.keypad.place(player.headPos, player.yaw()); title.keypad.group.visible = true;
  } else {
    G.state = 'menu'; mode = 'menu'; $('overlay').hidden = false; hud.show('menu'); document.exitPointerLock?.();
    G.chapter.load('counter'); player.placeAt(0, 3.6, 0);
  }
}
G.onDone = toTitle;

const vrBtn = /** @type {HTMLButtonElement} */ ($('vrBtn'));
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
    mode = 'vr'; $('overlay').hidden = true; hud.show('vr'); G.arms.desk.root.visible = false;
    setTimeout(toTitle, 300); G.music.start();
    s.addEventListener('end', () => { camera.position.set(0, 1.6, 0); camera.rotation.set(0, 0, 0); Object.assign(G.chapter, { inTransit: false, fadeDir: 0, fading: 0, pending: null }); mode = 'menu'; G.state = 'menu'; title.keypad.group.visible = false; $('overlay').hidden = false; hud.show('menu'); G.chapter.load('counter'); player.placeAt(0, 3.6, 0); });
  } catch (err) { $('vrNote').textContent = 'Could not start VR: ' + (err && err.message || err); }
});
$('deskBtn').addEventListener('click', () => {
  startAudio(); mode = 'desktop'; $('overlay').hidden = true; hud.show('desktop'); G.arms.desk.root.visible = true; desk.lock(); G.start();
});
$('resumeBtn').addEventListener('click', () => { paused = false; $('pause').hidden = true; desk.lock(); });
canvas.addEventListener('pointerdown', ev => {
  if (mode !== 'desktop' || paused) return;
  if (!desk.locked) desk.lock();
  if (G.state === 'results') { G.onIdleTrigger(); return; }
  if (ev.button === 2) { G.arms.deskMelee(); return; }
  G.arms.desk.held = true; G.arms.deskFire();
});
addEventListener('pointerup', ev => { if (ev.button === 0) G.arms.desk.held = false; });
canvas.addEventListener('contextmenu', ev => ev.preventDefault());
document.addEventListener('keydown', ev => {
  if (mode !== 'desktop' || ev.repeat) return;
  if (ev.code === 'Space') { ev.preventDefault(); if (G.state === 'playing') player.jumpQueued = true; }
  if (ev.code === 'KeyM') setMusic(!G.music.on);
  G.key(ev.code);
});
function setMusic(v) { G.music.set(v); $('musicBtn').textContent = 'Music: ' + (v ? 'on' : 'off'); }
$('musicBtn').textContent = 'Music: ' + (G.music.on ? 'on' : 'off');
$('musicBtn').addEventListener('click', () => { startAudio(); setMusic(!G.music.on); });

/* ---------- loop ---------- */
const tips = [{ id: 'left', pos: new THREE.Vector3() }, { id: 'right', pos: new THREE.Vector3() }];
function frameFn(realDt, time) {
  G.frames = (G.frames || 0) + 1;
  const playing = G.state === 'playing' && !paused;
  const speed = bt.update(realDt, playing);
  const dt = paused ? 0 : realDt * speed;
  if (!renderer.xr.isPresenting) {
    if (mode === 'desktop') camera.rotation.set(desk.pitch, desk.yaw, 0);
    else camera.rotation.set(-.05 + Math.sin(time * .11) * .03, Math.sin(time * .07) * .35, 0);
  }
  player.sense();
  updateListener(player.headPos, player.headDir);
  if (mode !== 'menu' && !paused) player.move(realDt * Math.max(.6, speed), mode, G.buttons);
  player.frozen = G.chapter.inTransit || G.state !== 'playing';
  player.updateLook(realDt);
  if (G.state === 'title') {
    controllers.forEach((c, i) => { const g = c.userData.gun; if (g) g.muzzle.getWorldPosition(tips[i].pos); });
    title.keypad.poke(tips, realDt);
  }
  if (mode !== 'menu' && !paused && G.state !== 'title') G.update(dt, realDt, time);
  else if (G.chapter.space) G.chapter.space.update(realDt);
  hud.update(realDt);
  frame.render(scene, camera);
}

G.chapter.load('counter');
player.placeAt(0, 3.6, 0);
startLoop(renderer, frameFn, { onFps: f => { hud.fps = f; hud.dirty = true; } });
G.desk = desk;
Object.assign(window, { __drop: G, __dropOK: true });
