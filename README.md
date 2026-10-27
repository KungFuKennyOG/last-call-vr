# Last Call VR

A gory wave shooter for Meta Quest 3, set in a brutalist concrete techno club, built with WebXR and three.js. Two floors (main hall plus a balcony reached by side stairs), free movement around a pillared hall, thugs with facial expressions that react to what's happening, dual pistols, verlet ragdolls, headshots that take heads off, severable limbs, blood on floors and walls, bullet holes, kill streaks and slow-mo.

**Play:** https://kungfukennyog.github.io/last-call-vr/ in the Quest browser, then hit **Enter VR**.

## Controls

| Input | Action |
|---|---|
| Trigger | Fire (one gun per hand; hold for full-auto with the machine gun) |
| Grip button | Grab an Uzi or sawed-off off the floor |
| Left stick | Run where you're looking (click to walk) |
| Y, or click the right stick | Bullet time |
| A | Jump (press again in mid-air to double jump) |
| B or X | Dash (two charges; you can't be hit mid-dash) |
| Right stick | Snap turn 30° |
| Swing a gun hard | Pistol-whip (finishes downed enemies, launches bodies) |
| Point a gun at the floor | Twirl reload |
| Lean or step | Dodge red tracers (near misses trigger slow-mo) |
| Shoot a tracer | Deflect it |
| Left gun wrist screen | Wave, score, streak, HP |

Pillars block bullets both ways. Enemies come through doors on both floors, path up and down the stairs to reach you, and shoot between floors when they can see you.

Hits land where they hit: gut shots double enemies over, arm shots fling the arm back, leg shots buckle the knee, and the damage sticks (limps, dead arms, a hand on a gut wound). Two leg hits or some non-head kills drop them alive as physics ragdolls that clutch the wound, kick, crawl and try to roll over while they bleed out, unless you finish them. The soundtrack is dark Berlin warehouse techno at 146 BPM: a clipped kick into a reverb rumble, metallic hats and industrial clanks, atonal stabs, a phrygian acid line and screeching leads that build with each wave and your streak, an air-raid siren breakdown between waves, and full overdrive during FRENZY (M toggles it in the browser). A DJ in the balcony booth mixes along to it. Shooters pistol-whip you if you get within arm's reach.

Uzis (50 rounds, full-auto) and sawed-offs (12 shells, two quick barrels then a break-open reload, 9 pellets that launch bodies and tear limbs off) show up as floor pickups from wave 2 and drop from gunners and heavies; you go back to the pistol when they run dry. Enemies come in squads, often through a door behind you, and you can hear where: door slams, shots and groans are positional. Gunners fire machine-gun bursts, heavies fire shotgun spreads, rushers zigzag and throw bottles you can shoot down, and shooters sidestep your laser. Every kill refunds two rounds; five in a row starts a five-second FRENZY (double fire rate, no ammo use). Kills with both guns within 1.2 s score AKIMBO, and stalling a wave brings reinforcements.

Movement carries momentum: jumps keep your speed, you can steer in the air, and kills while airborne, mid-dash or sliding score ×1.5. Red launch pads on the floor throw you onto the balcony and the one upstairs throws you back across the hall; landing hard next to enemies stomps them. Moving fast makes enemy shots graze past more often.

Bullet time slows everything to about a quarter speed for up to five seconds, your own running, jumps and dashes included, while your aim and fire rate stay at full speed. Kills refill the meter (headshots and airborne or dash kills more), and it trickles back on its own.

Browser mode (no headset): `WASD` to move, `Space` jump, `Shift` dash, `C` slide, `E` bullet time, click to lock aim, mouse to look, click to shoot (hold for full-auto), walk over a weapon to pick it up, `F` or right-click to melee, `R` to reload.

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
