# CLAUDE.md

Read this first in every session. It's the short version of how this repo works; the full plan and art direction live in the claude.ai Project "VR SHOOTY GAME" (`claude/campaign-plan.md`, `claude/art-direction.md`).

## What this is

WebXR shooters for Meta Quest 3, played in the Quest browser and hosted on GitHub Pages straight from `main`. No build step: every file is served exactly as written.

| Mode | Where | Status |
| --- | --- | --- |
| **Last Call** | `index.html` (one file, ~2,400 lines) | Wave arena, Bunker and Miami '89 maps. Shipped. |
| **Showdowns** | `campaign/index.html` (one file, ~3,000 lines) | Seven themed mini-levels. Shipped. Moves to `showdowns/` in task 1.7. |
| **Last Drop** | `drop/` (empty) | The planned 7-chapter campaign: two couriers, one night, a stolen bag. Solo or 2-player co-op, VR and desktop cross-play. |

The owner is Kenny. He plays every change on a Quest 3, and that's the slow part of every loop, so make each change easy to check (see "Asking for a headset check").

## Layout

| Path | What goes there |
| --- | --- |
| `engine/` | Renderer and XR setup, input, frame loop, bullet time clock. `engine/README.md` has the import map snippet. |
| `actors/` | Enemy and player bodies, faces, ragdolls, locational damage, AI |
| `combat/` | Weapons, projectiles, tracers, melee, gun throwing, pickups |
| `fx/` | Blood, decals, sparks, smoke, rain (all instanced) |
| `audio/` | Positional sound, music |
| `drop/` | Last Drop: one file per chapter plus the campaign shell |
| `dev/` | Test pages, one per system (`dev/boot.html` is the first) |
| `tests/unit/` | Node tests for pure modules |
| `tests/smoke/` | Headless browser tests for every page |
| `tools/serve.mjs` | Local no-cache server |
| `types/` | Type declarations for the type checker only |

## Commands

```bash
npm install                        # once; dev tools only, nothing ships
npx playwright install chromium    # once, for the smoke tests
npm run serve                      # http://localhost:8000, no caching
adb reverse tcp:8000 tcp:8000      # then open http://localhost:8000 in the Quest browser
npm run check                      # type check + lint + unit tests: run before every commit
npm run smoke                      # every page in headless Chromium, screenshots in tests/smoke/out/
npm run check:all                  # both
```

CI (`.github/workflows/check.yml`) runs `check` and `smoke` on every push and uploads the screenshots.

## Rules

**Code**
- Plain ES modules with `<script type="module">` and the shared import map. No bundler, no framework, no npm packages at runtime.
- three.js is pinned to **r149** (`three@0.149.0` from jsDelivr) until both games are on the modules. Don't upgrade it.
- Keep files small: aim for under 400 lines. The two big single files are legacy; don't add features to them, move code out.
- **Game rules go in pure modules that don't import three** (password codes, scoring, bag rules, AI decisions, network messages), so they can be unit tested in Node. Rendering code imports three; rules code doesn't.
- Type with JSDoc where it helps. `npm run typecheck` checks every module folder plus `dev/`. If a browser API is missing from the types, add it to `types/globals.d.ts`.
- Every new page goes in the `PAGES` list in `tests/smoke/pages.test.js`. Give dev pages a `window.__<name>OK = true` flag when they've booted.
- Every new pure module gets a test file in `tests/unit/`.
- When the cached app shell changes, bump `CACHE` in `sw.js`.

**Process**
- One plan task per commit. Message format: `<Area> <task>: <what changed>`, for example `Engine split 1.2: extract renderer and XR loop`.
- Keep Last Call and Showdowns working after every commit. The engine split moves one system at a time.
- `npm run check` must pass before committing. Run `npm run smoke` when a page changed (it needs internet for the CDN; offline it skips).
- Update `README.md` when something a player sees changes.
- Don't reopen decisions in the log below without asking Kenny.

## Quest 3 budgets

| | Target |
| --- | --- |
| Frame rate | 72 fps minimum, 90 where possible. The wrist screen shows fps and turns red under 65. |
| Draw calls | About 150 per eye at the busiest view. Merge static scenery; instance or batch fx. |
| Enemies | 10 active at once (14 in co-op) |
| Live ragdolls | 6; older bodies bake flat |
| Lights | A handful per space. Glowing things are emissive meshes, not lights. |
| Download | Under 5 MB per chapter. Geometry and textures are generated in code. |

## Comfort (non-negotiable)

- No vignette. No camera motion the player didn't cause. Never roll or tilt the view.
- Snap turn 30°. Slow-mo slows the world, not the player's head.
- Nothing forces the player to crouch or lean (that's why co-op revive is a standing slap).

## Last Drop art direction (summary)

The full spec, with the shaders, palettes, proportions and face grids, is in `claude/art-direction.md` in the Project. The live reference is https://claude.ai/artifact/GSezy6ex8P3JfrvYMB2UZq.
- PS1 look as a style on a modern renderer: render at **480 lines** with hard-pixel upscale, **vertex wobble on**, **affine (warped) textures on**, **15-bit color with ordered dither**, **smooth animation** (no 15 fps stepping).
- Low-poly segmented rigid characters (no skinning), 16×16 hand-painted faces, textures 4–64 px with no filtering, per-vertex lighting with up to 4 point lights, fog to a dark color.
- Faction colors: couriers orange (Mo) and teal (Vee), the Kitchen white and blood red, Halberd cold grey.
- No PBR, normal maps, bloom, soft shadows, blended transparency (use cutout) or texture filtering.
- Last Call and Showdowns keep their current look.

## Where the plan is

Phases: 0 dev tooling, 1 engine split, 2 chapter 1 solo slice, 3 chapters 4 and 7, 4 co-op and cross-play, 5 the rest of the campaign. Each task has a number, a "done when" and a size in `claude/campaign-plan.md`.

**Now:** task 1.1 is done (`dev/boot.html` boots three r149 from the module build) but still needs a check on the Quest. Next is 1.2: extract `engine/` (renderer, XR session, input, frame loop, bullet time clock) so both games use it with no visible change.

## Decision log

- Last Drop is solo-first; co-op is added in phase 4. Any mix of VR and desktop works in co-op.
- The dive (shootdodge) is cut. Movement is walk and small jump, Showdowns style.
- Saves are password codes (8 characters, 7 data + 1 check, no look-alike characters), like old console games.
- Downed players are **stunned standing**: grey vision, no shooting, view never moves. Co-op partners revive with one real slap; solo players stab an adrenaline shot (one per chapter).
- Slow-mo in co-op is one shared meter that always slows the whole world. Both players triggering within 0.5 s gives synced slow-mo.
- Voice chat runs over the same WebRTC connection, positional, with a radio filter when players are apart.
- Fist bumps and high fives work any time no enemies are around.
- Art direction is locked to the settings above.
- Tone: a light-hearted buddy action comedy (Mo the deadpan veteran, Vee the reckless rookie). Gore and slow deaths are over the top and cartoonish: big bright pixel blood, slapstick ragdolls, enemies who complain while they crawl. A few beats (the chapter 6 betrayal, the ending choice) are played with heart.

## Asking for a headset check

Kenny tests on the Quest after each task. When you hand something over, say:
1. What to open (the page and the URL path).
2. What to do in the headset, step by step.
3. What "working" looks like, and what to watch for (fps on the wrist, comfort, feel).
4. Anything you couldn't check yourself, since you can't run a headset.

Keep replies short and direct. Kenny prefers honest answers over hedged ones.
