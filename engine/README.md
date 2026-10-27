# Shared modules

Plain ES modules, loaded with `<script type="module">`. No build step; everything works straight off GitHub Pages.

## three.js

Every module page declares the same import map, inline in its `<head>` (browsers don't load import maps from a file):

```html
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.149.0/examples/jsm/"
} }
</script>
```

Then `import * as THREE from 'three'`. Our own modules import each other by relative path (`../engine/xr.js`).

Both games and every module load three r149 through this import map, so there is exactly one copy of three.js on a page. Change the version in every page at once.

## Layout

| Folder | What goes in it |
| --- | --- |
| `engine/` | Renderer and XR setup, input (VR and desktop), frame loop, bullet time clock |
| `actors/` | Enemy body, faces, ragdolls, locational damage, AI behaviors |
| `combat/` | Weapons, projectiles, tracers, melee, gun throwing, pickups |
| `fx/` | Blood, decals, sparks, smoke, rain (all instanced) |
| `audio/` | Positional sound and the music system |
| `drop/` | The Last Drop campaign, one file per chapter |
| `showdowns/` | Showdowns (was `campaign/`, which now redirects here) |
| `dev/` | Test pages. `dev/boot.html` checks the module build boots into VR. |

## Service worker

`sw.js` fetches same-origin files network-first, so a pushed module change reaches the Quest on the next load instead of being served stale from cache. The CDN copy of three.js stays cache-first.

## engine/

Import everything from `engine/index.js`. One page, one renderer: the controller list is shared module state.

| Module | What it gives you |
| --- | --- |
| `stage.js` | `createStage({ canvas, far })` → `{ renderer, scene, camera, rig }`. WebXR on, pixel ratio capped at 2, resizes with the window (not while in VR). Move and turn the rig, never the camera. |
| `xr.js` | `vrSupported()`, `enterVR(renderer)`: local-floor, hand tracking optional, foveation 1. |
| `input.js` | VR: `setupControllers(renderer, rig, { connected, disconnected, selectstart, selectend, squeezestart })` fills `controllers` (each has `userData.hand` and `userData.gamepad`). `pressed(c, BTN.A)` is true on the frame a button goes down, `readStick(c, out)` reads the thumbstick, `buzz(hand, strength, ms)` rumbles. Desktop: `createDesktopInput(canvas, { active, onUnlock, touch })` → `{ keys, yaw, pitch, locked, lock() }` with pointer-lock mouse look and optional drag-to-look on touch screens. |
| `loop.js` | `startLoop(renderer, frame, { onFps })`: calls `frame(realDt, time)` every frame with `realDt` capped at 0.05 s; logs the first few errors and keeps going. |
| `bullet-time.js` | `createBulletTime({ camera, drain, refill, endWhenIdle, onStart, onEnd, onMuffle })` → `bt`. Call `bt.update(realDt, live)` every frame, even while paused; it returns the world speed, so `dt = realDt * speed`. `bt.toggle(live)` for the button, `bt.slowmo(scale, seconds)` for big moments; read `bt.meter`, `bt.active`, `bt.slowT`. |

Buttons on Quest Touch: `BTN.TRIGGER` 0, `BTN.GRIP` 1, `BTN.STICK` 3 (click), `BTN.A` 4 (X on the left), `BTN.B` 5 (Y on the left).

## fx/

| Module | What it gives you |
| --- | --- |
| `decals.js` | `createDecals({ scene, atlas, groundAt })` → `{ decal(pos, normal, size, grow, kind), reset(), grow(dt), flush(), mesh }`. Blood, pools, bullet holes and scorch in one batched mesh (one draw). |
| `particles.js` | `createParticles({ scene, surfaceNormal, decals })` → `{ addPart, updateParts, sparkBurst, parts, mesh }`. Droplets and sparks as one instanced mesh; blood that lands leaves a decal. |
| `blood.js` | `createBlood({ scene, particles, decals, glowTex })` → `{ spray, mist, updateBlood }`. |
| `popups.js` | `createPopups({ scene, headPos, headDir })` → `{ popup, popupFront, update, clear, textCache }`. Floating HEADSHOT +200 text. |
| `billboards.js` | `makeBB(scene, glowTex, n, blending)`: instanced camera-facing sprites, one draw per batch. |
| `fire.js` | `createFireSmoke({ scene, glowTex, fires, smokes, staticGlows })` → `{ update(dt), reset() }`. |
| `weather.js` | `makeWeather(o, glowTex)` + `updateWeather(list, dt, t)` for snow and dust; `makeRain(o)` for GPU rain streaks. |

## actors/

| Module | What it gives you |
| --- | --- |
| `body.js` | `createBodyKit()` (cached geometry, shared materials, `part`, `mark`), `buildBody(e, inner, kit, buildHead, { torsoDeco })` builds the jointed body, `bodyMarks` gives the 15 ragdoll joints, `bodyState()` the wound state. |
| `faces.js` | `createFaces(kit, { dressHead })` → `{ faceMats, buildHead, setExpr }`. Drawn faces, one texture per expression. |
| `animate.js` | `poseBody(e, dt, t, moving, active, limp)` and `faceExpression(e, dt, moving, active, setExpr)`: walk cycle, aiming, lasting wounds, hit staggers, expressions. |
| `damage.js` | `createDamage({ spray, mist, sfxSplat, moveEntity })` → `{ wound, reactToHit, rollDown, deathForce }`: what a round does depending on where it lands. |
| `ragdoll.js` | `createRagdolls(C)` → `{ ragdolls, makeRagdoll, removeRagdoll, impulse, sever, updateRagdoll }`: verlet bodies, dismemberment, and downed enemies that crawl and bleed out. `C` lists what it needs from the game. |

The AI itself (who to chase, when to shoot, squads, awareness) stays with each game: the arena and Showdowns play differently.

## combat/

| Module | What it gives you |
| --- | --- |
| `guns.js` | `createGunKit({ glowTex, basic, pipColor, hpColor, maxHp, onChange })` → `{ WEAPONS, makeGun, setWeapon, animateGun, addMG, addSG, ... }`, plus `launchBody` for the sawed-off's body launch. |
| `tracers.js` | `createTracers(scene, { slow })` → `{ tracer(a, b), update(realDt) }`. |
| `melee.js` | `createMelee({ enemies, ragdolls })` → `{ meleeTargets, aimTarget, swing }`: VR swing detection and desktop pistol-whip targeting. |
| `throw.js` | `createThrows({ scene, thrown, enemies, meleeTargets, solidAt, groundAt, onHit, onLand })` → `{ launch, update }`: thrown guns with a little aim help. |

Firing and scoring stay in each game: they decide what a hit is worth.

## audio/

| Module | What it gives you |
| --- | --- |
| `core.js` | `actx`, `sfxBus`, `lowpass`, `noiseBuf` (live, null until `startAudio(onCreate)` runs from a click), `setMuffle(on, slowed)`, `updateListener(headPos, headDir)`, and the synth blocks `osc`, `noise`, `filt`, `gain`, `env`, `makeIR`, `clipper`, `outAt(pos)`. |
| `sfx.js` | The 30 sounds both games share (`sfxShot`, `sfxSplat`, `sfxMoan`, `sfxBTIn` and the rest). |
| `music.js` | `scheduleSteps(mus, stepSec, playStep)` plays the score a little ahead of the audio clock; `loadMusicOn`, `saveMusicOn`, `fadeMusic`. The scores themselves stay with each game. |

## Checking a change

Both games must look exactly the same after a refactor. The check used for the split: a headless Chromium run with a seeded `Math.random`, a virtual clock and manual frame stepping, playing the same inputs (walk, look, fire, bullet time, melee, reload, pause) on the old and new code and comparing every frame pixel for pixel.
