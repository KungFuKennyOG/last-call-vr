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
