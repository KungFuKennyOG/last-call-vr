// Chapter 1, Wrong Order: the ghost kitchen at 11 p.m., as data. No three.js; the builder turns this into meshes.
//
// Units are meters. Each space has its own origin at floor level, x to the right, z toward the player's start,
// y up. Boxes are { at: center of the base, size: [w, h, d] }.
//
// Four spaces, five beats: the pickup counter, the fryer line (first fight and the bounty set piece), the walk-in
// freezer, back to the fryer line for the Expediter in the pass, then out through the loading dock.

import { LANE } from '../bosses/expediter.js';

/**
 * @typedef {[number, number, number]} V3
 * @typedef {{ at: V3, size: V3 }} Box
 * @typedef {{ id: string, to: string, at: V3, facing: number, kind: 'swing' | 'roller' | 'freezer' | 'bay' }} Door
 * @typedef {{ pos: V3, color: V3, range: number }} PointLight
 * @typedef {{ amb: V3, dir: V3, dirCol: V3, fog: V3, fogNear: number, fogFar: number, points: PointLight[] }} Lights
 * @typedef {{ id: string, name: string, size: [number, number], height: number, floor: string, walls: string,
 *   doors: Door[], cover: (Box & { kind: string })[], props: { kind: string, at: V3, facing?: number }[], lights: Lights,
 *   checkpoint: { at: V3, facing: number } }} Space
 */

const COLD = /** @type {V3} */ ([1.35, 1.45, 1.6]), WARM = /** @type {V3} */ ([1.5, 0.7, 0.22]), SODIUM = /** @type {V3} */ ([1.4, 0.75, 0.25]);

/** @type {Space[]} */
export const SPACES = [
  {
    id: 'counter', name: 'Pickup counter', size: [12, 9], height: 4, floor: 'quarryTile', walls: 'subwayTile',
    doors: [
      { id: 'counter>fryerLine', to: 'fryerLine', at: [4.5, 0, -4.4], facing: Math.PI, kind: 'swing' },
    ],
    cover: [
      { kind: 'counter', at: [0, 0, -0.6], size: [6, 1.05, 0.7] },
      { kind: 'shelfRack', at: [-4.6, 0, -3.6], size: [1.6, 2.2, 0.6] },
      { kind: 'trashCan', at: [4.9, 0, 1.6], size: [0.6, 0.75, 0.6] },
    ],
    props: [
      { kind: 'orderWall', at: [0, 2.45, -4.45] }, { kind: 'gofrSign', at: [0.6, 3.35, -0.6] }, { kind: 'neonOpen', at: [3.5, 2.9, -4.46] },
      { kind: 'heatLampPass', at: [-1.2, 1.78, -0.75] }, { kind: 'pos', at: [1.9, 1.05, -0.55] }, { kind: 'paperBags', at: [-1.5, 1.05, -0.6] },
      { kind: 'mirror', at: [-3.2, 1.5, -4.45] }, { kind: 'extinguisher', at: [-5.8, 0.6, -1.5] }, { kind: 'courierQueue', at: [0, 0, 1.8] },
    ],
    lights: {
      amb: [0.16, 0.15, 0.2], dir: [0.3, 1, 0.5], dirCol: [0.1, 0.11, 0.15], fog: [0.03, 0.031, 0.045], fogNear: 9, fogFar: 24,
      points: [{ pos: [-1.5, 3.7, 1.4], color: COLD, range: 8.5 }, { pos: [2.2, 3.7, -1.8], color: COLD, range: 8.5 }, { pos: [-1.2, 1.55, -0.75], color: WARM, range: 3.4 }],
    },
    checkpoint: { at: [0, 0, 2.5], facing: Math.PI },
  },
  {
    id: 'fryerLine', name: 'Fryer line', size: [12, 11], height: 4, floor: 'quarryTile', walls: 'subwayTile',
    doors: [
      { id: 'fryerLine>counter', to: 'counter', at: [4.5, 0, 5.4], facing: 0, kind: 'swing' },
      { id: 'fryerLine>freezer', to: 'freezer', at: [-5.9, 0, 3], facing: Math.PI / 2, kind: 'freezer' },
      { id: 'fryerLine>dock', to: 'dock', at: [-4.6, 0, -5.4], facing: Math.PI, kind: 'roller' },
    ],
    cover: [
      // the near line, between you and the pass: waist-high, with gaps at both ends to flank through
      { kind: 'fryerLine', at: [0, 0, -1.6], size: [6.4, 1.0, 0.8] },
      // the far line, behind the pass
      { kind: 'fryerLine', at: [0, 0, -4.9], size: [6.4, 1.0, 0.8] },
      { kind: 'prepTable', at: [-3.6, 0, 2.2], size: [1.6, 0.9, 0.8] },
      { kind: 'prepTable', at: [3.4, 0, 2.6], size: [1.6, 0.9, 0.8] },
      { kind: 'shelfRack', at: [5.2, 0, -1.2], size: [0.6, 2.2, 1.6] },
    ],
    props: [
      { kind: 'fryer', at: [-2.2, 0, -1.6] }, { kind: 'fryer', at: [-1.4, 0, -1.6] }, { kind: 'fryer', at: [1.4, 0, -4.9] },
      { kind: 'heatLampPass', at: [0, 2.4, LANE.z] }, { kind: 'orderWall', at: [0, 2.6, 5.45], facing: Math.PI },
      { kind: 'hood', at: [0, 3.3, -4.9] }, { kind: 'extinguisher', at: [5.85, 0.6, 3.5] },
    ],
    lights: {
      amb: [0.16, 0.15, 0.2], dir: [0.3, 1, 0.5], dirCol: [0.1, 0.11, 0.15], fog: [0.03, 0.031, 0.045], fogNear: 9, fogFar: 22,
      points: [{ pos: [-2.5, 3.7, 2], color: COLD, range: 8.5 }, { pos: [2.5, 3.7, -1], color: COLD, range: 8.5 }, { pos: [0, 1.6, LANE.z], color: WARM, range: 3.6 }],
    },
    checkpoint: { at: [3, 0, 4.4], facing: Math.PI },
  },
  {
    id: 'freezer', name: 'Walk-in freezer', size: [7, 6], height: 3, floor: 'steelPlate', walls: 'freezerPanel',
    doors: [{ id: 'freezer>fryerLine', to: 'fryerLine', at: [3.4, 0, 0], facing: -Math.PI / 2, kind: 'freezer' }],
    cover: [
      { kind: 'hangingRack', at: [-1, 0, -1.2], size: [3.6, 2.4, 0.4] },
      { kind: 'hangingRack', at: [-1, 0, 1.2], size: [3.6, 2.4, 0.4] },
      { kind: 'crates', at: [-3, 0, 0], size: [0.8, 1.2, 1.4] },
    ],
    props: [{ kind: 'fogVent', at: [0, 2.9, 0] }, { kind: 'frostLight', at: [0, 2.95, -2] }],
    lights: {
      amb: [0.14, 0.17, 0.22], dir: [0, 1, 0], dirCol: [0.05, 0.06, 0.08], fog: [0.55, 0.62, 0.7], fogNear: 1.5, fogFar: 7,
      points: [{ pos: [0, 2.8, -2], color: [0.9, 1.2, 1.5], range: 6 }, { pos: [3.2, 2.2, 0], color: COLD, range: 4 }],
    },
    checkpoint: { at: [2.4, 0, 0], facing: -Math.PI / 2 },
  },
  {
    id: 'dock', name: 'Loading dock', size: [14, 10], height: 5, floor: 'concrete', walls: 'corrugated',
    doors: [
      { id: 'dock>fryerLine', to: 'fryerLine', at: [0, 0, 4.9], facing: 0, kind: 'roller' },
      { id: 'dock>street', to: 'street', at: [0, 0, -4.9], facing: Math.PI, kind: 'bay' },
    ],
    cover: [
      { kind: 'scooter', at: [-3, 0, 0.5], size: [0.6, 1.1, 1.6] }, { kind: 'scooter', at: [-1.6, 0, 0.8], size: [0.6, 1.1, 1.6] },
      { kind: 'rollCage', at: [2.4, 0, 1.6], size: [1.2, 1.7, 0.8] }, { kind: 'rollCage', at: [4.2, 0, -1.4], size: [1.2, 1.7, 0.8] },
      { kind: 'pallets', at: [-4.8, 0, -2.6], size: [1.2, 0.9, 1.2] },
    ],
    props: [{ kind: 'bayDoorsRain', at: [0, 0, -5] }, { kind: 'eBike', at: [5.5, 0, 3.4], facing: Math.PI / 2 }],
    lights: {
      amb: [0.12, 0.12, 0.16], dir: [0, 1, -0.4], dirCol: [0.08, 0.09, 0.12], fog: [0.03, 0.031, 0.045], fogNear: 8, fogFar: 22,
      points: [{ pos: [0, 4.6, 1], color: COLD, range: 9 }, { pos: [0, 4, -7], color: SODIUM, range: 9 }],
    },
    checkpoint: { at: [0, 0, 4], facing: Math.PI },
  },
];

/** Spaces the chapter connects to that aren't built in this chapter (the street is chapter 2's way in). */
export const OUTSIDE = ['street'];

/** Look up a space by id. */
export const space = id => SPACES.find(s => s.id === id);
