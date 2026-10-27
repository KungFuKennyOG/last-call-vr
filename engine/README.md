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

Keep the version pinned to r149 until both games are on the modules: they still load the r149 global build, and the two must match.

## Layout

| Folder | What goes in it |
| --- | --- |
| `engine/` | Renderer and XR setup, input (VR and desktop), frame loop, bullet time clock |
| `actors/` | Enemy body, faces, ragdolls, locational damage, AI behaviors |
| `combat/` | Weapons, projectiles, tracers, melee, gun throwing, pickups |
| `fx/` | Blood, decals, sparks, smoke, rain (all instanced) |
| `audio/` | Positional sound and the music system |
| `drop/` | The Last Drop campaign, one file per chapter |
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
