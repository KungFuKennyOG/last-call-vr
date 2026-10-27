# Last Call VR

A gory wave shooter for Meta Quest 3, set in a brutalist concrete techno club, built with WebXR and three.js. Two floors (main hall plus a balcony reached by side stairs), free movement around a pillared hall, thugs with facial expressions that react to what's happening, dual pistols, verlet ragdolls, headshots that take heads off, severable limbs, blood on floors and walls, bullet holes, kill streaks and slow-mo.

**Play:** https://kungfukennyog.github.io/last-call-vr/ in the Quest browser, then hit **Enter VR**.

## Controls

| Input | Action |
|---|---|
| Trigger | Fire (one pistol per hand) |
| Left stick | Move where you're looking |
| Right stick | Snap turn 30° |
| Swing a gun hard | Pistol-whip (finishes downed enemies, launches bodies) |
| Point a gun at the floor | Twirl reload |
| Lean or step | Dodge red tracers (near misses trigger slow-mo) |
| Shoot a tracer | Deflect it |
| Left gun wrist screen | Wave, score, streak, HP |

Pillars block bullets both ways. Enemies come through doors on both floors, path up and down the stairs to reach you, and shoot between floors when they can see you.

Hits land where they hit: gut shots double enemies over, arm shots fling the arm back, leg shots buckle the knee, and the damage sticks (limps, dead arms, a hand on a gut wound). Two leg hits or some non-head kills drop them alive as physics ragdolls that clutch the wound, kick, crawl and try to roll over while they bleed out, unless you finish them. The soundtrack is hard techno at 138 BPM that builds with each wave and your streak, breaks down between waves and drops when the next one starts (M toggles it in the browser). Shooters pistol-whip you if you get within arm's reach.

Browser mode (no headset): `WASD` to move, click to lock aim, mouse to look, click to shoot, `F` or right-click to melee, `R` to reload.

## Install on the Quest

**Easiest:** open the Play link in the Quest browser and tap **Install** in the address bar. It lands in your app library.

**As a sideloaded APK** (needs the Android SDK and Meta's `ovr-platform-util`):

```bash
ovr-platform-util create-pwa \
  -o LastCall.apk \
  --android-sdk "$ANDROID_HOME" \
  --manifest-content-file manifest.json \
  --package-name com.kungfukennyog.lastcall

adb install -r LastCall.apk
# flags vary a little between versions: check `ovr-platform-util create-pwa --help`
```

The APK runs on the Quest browser engine (the only runtime on the headset with WebXR) and loads the game from the Pages URL, then caches it for offline play.

## Local testing over USB

```bash
python -m http.server 8000
adb reverse tcp:8000 tcp:8000
# then open http://localhost:8000 in the Quest browser
```
