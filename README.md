# Last Call VR

A gory wave shooter for Meta Quest 3, set in a brutalist concrete techno club, built with WebXR and three.js. Two floors (main hall plus a balcony reached by side stairs), free movement around a pillared hall, thugs with facial expressions that react to what's happening, dual pistols, verlet ragdolls, headshots that take heads off, severable limbs, blood on floors and walls, bullet holes, kill streaks and slow-mo.

**Play:** https://kungfukennyog.github.io/last-call-vr/ in the Quest browser, then hit **Enter VR**.

## Maps

Pick the map on the title screen before you hit Enter VR (or open the link with `?map=miami`).

- **The Bunker:** the original. A brutalist concrete techno hall, dark Berlin techno at 146 BPM.
- **Miami '89:** the Palmera, a mob-owned disco on the strip at 3 a.m. Checkerboard marble, a light-up dance floor that flashes to the beat, a mirror ball, neon signs, palms, a pool table, white leather couches, arcade cabinets and an aquarium, with the skyline and a striped sunset through the high windows. A VIP room sits under the balcony behind a wall with two doorways, so fights there go door to door. The mob wears white suits, teal suits and Hawaiian shirts with gold chains, mustaches and shades; rushers come at you with baseball bats. The rules are harsher: almost everything dies in one hit (heavies take three), and so do you, more or less: you get three hits instead of five. The soundtrack is original darksynth at 118 BPM in A minor: gated 80s snares, pumping octave bass, arpeggios, tom fills and a screaming lead that come in as the fight heats up.

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

Uzis (50 rounds, full-auto) and sawed-offs (12 shells, two quick barrels then a break-open reload, 9 pellets that launch bodies and tear limbs off) show up as floor pickups from wave 2 and drop from gunners and heavies; you go back to the pistol when they run dry. Enemies come in squads, often through a door behind you, and you can hear where: door slams, shots and groans are positional. Squads fan out of the doorway and split up: a point man comes straight at you, flankers circle round to your sides however you turn, gunmen leapfrog (half move while half hold and shoot), rushers pincer in from opposite sides, and sometimes one peels off up to the balcony to shoot down at you. From wave 3 a squad can split and come through two doors at once. Gunners fire machine-gun bursts, heavies fire shotgun spreads, rushers zigzag and throw bottles you can shoot down, and shooters sidestep your laser. Every kill refunds two rounds; five in a row starts a five-second FRENZY (double fire rate, no ammo use). Kills with both guns within 1.2 s score AKIMBO, and stalling a wave brings reinforcements.

Movement carries momentum: jumps keep your speed, you can steer in the air, and kills while airborne, mid-dash or sliding score ×1.5. Red launch pads on the floor throw you onto the balcony and the one upstairs throws you back across the hall; landing hard next to enemies stomps them. Moving fast makes enemy shots graze past more often.

Bullet time slows everything to about a quarter speed for up to five seconds, your own running, jumps and dashes included, while your aim and fire rate stay at full speed. Kills refill the meter (headshots and airborne or dash kills more), and it trickles back on its own.

Browser mode (no headset): `WASD` to move, `Space` jump, `Shift` dash, `C` slide, `E` bullet time, click to lock aim, mouse to look, click to shoot (hold for full-auto), walk over a weapon to pick it up, `F` or right-click to melee, `R` to reload.

### Performance

Both arena maps are built for the Quest 3: the hall is merged into a handful of draws at load, each enemy's body parts are merged per joint, bodies that stop moving are baked flat, and blood, sparks, bullet holes and the gun's ammo pips are batched or instanced. A busy fight peaks around 135 draw calls per eye in the Bunker and 155 in Miami (down from roughly 630 and 790). Your frame rate shows in the corner of the wrist screen and turns red under 65.

## Showdowns

**Play:** https://kungfukennyog.github.io/last-call-vr/campaign/

Seven short themed levels (six plus the original cut of the Tokyo one), three to six minutes each, with slower, Max Payne-style movement: you walk, hop with a small jump (no dashing), and use bullet time. Enemies stand around, smoke and patrol until they see or hear you. Doors open when you walk into them and knock down whoever's behind. Each level ends with a boss and a rating.

| | Level | Setting |
|---|---|---|
| 1 | Snowblind | New York, 1948. A snowy alley into the Hotel Marlowe; Dutch Hollander comes down in the elevator. Cello noir score. |
| 2 | Teahouse | Hong Kong, 1992. Round tables, birdcages, doves that burst into the air when the shooting starts, a kitchen ambush with cleavers, Mr. Lau on the gallery. |
| 3 | No Man's Town | The front, 1944. A bombed village square at dusk: sandbags, a burning truck, grenades, artillery (watch for the red rings), a machine gun in the church window. Generic army, no insignia. |
| 4 | Gang Wars | Chicago, 1929. Behind a barbershop, two mobs are already shooting at each other in a speakeasy; they'll shoot you too. Big Sal and his Tommy gun wait in the warehouse. Hot jazz. |
| 5 | Morro | Rio de Janeiro, 2009. Up the stair alleys of a hillside favela with snipers on the roofs (watch for their red lasers) to the football court at the top. Baile funk. |
| 6 | Shinjuku Rain | Tokyo, 2026. The polished cut. A private army has taken the crossing. A helicopter sweeps the alley with its searchlight as you arrive; fight through the izakaya alley and a street of wrecks in the rain, walk up to the charge on the konbini door (three beeps, slow motion, the door flies off its hinges), then clear the crossing under giant screens while the helicopter circles with a door gunner. Shoot it enough and it smokes, spins and crashes into the crossing; leave it up and the boss and his team fast-rope down (you can shoot them on the ropes). Lightning, thunder, rain on the puddles, flickering neon, sirens in the distance. When it's over the screens switch to ALL CLEAR and the rain stops. |
| 7 | Shinjuku Rain · OG | The original cut of the Tokyo level, kept as it was. |

| Input | Action |
|---|---|
| Trigger | Fire (hold for full-auto with the Uzi / Tommy gun) |
| Left stick | Walk |
| Right stick | Snap turn 30° |
| A or X | Small jump (about half a metre, with a little air steering) |
| Y, or click the right stick | Bullet time |
| B, or grip with nothing in reach | Throw the gun in your hand (stuns; aims itself a little) |
| Grip near a weapon | Pick it up |
| Point a gun at the floor | Reload |

Browser: `WASD` walk, `Space` jump, `E` bullet time, `G` throw, `F` melee, `R` reload, `Enter` to continue.

Built for the Quest 3: static scenery is merged into a handful of draws, each enemy's body parts are merged per joint, corpses that stop moving are baked flat, blood, sparks, smoke, fire, decals, doves and rain are all instanced or batched, and the level lights stay at a handful. The busiest view in any level is around 150 draw calls per eye. Your frame rate shows in the corner of the wrist screen (it turns red under 65).

The Uzi and the sawed-off (in both games) show their remaining rounds on a small counter on top of the gun; the sawed-off also has two shell lights for its barrels, and the wrist screen shows the count.

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
npm run serve            # or: python -m http.server 8000 (npm run serve turns caching off)
adb reverse tcp:8000 tcp:8000
# then open http://localhost:8000 in the Quest browser
```

## Development checks

The game has no build step; these are dev tools only (`npm install` once, Node 22+).

```bash
npm run check    # type check (JSDoc), lint, unit tests
npm run smoke    # every page in headless Chromium; needs `npx playwright install chromium` once
```

CI runs both on every push. See `CLAUDE.md` for the repo's rules and layout.
