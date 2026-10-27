// Chapter 1's beats: who shows up where, what sets each fight off, and what ends it. Data only.
//
// A beat runs in one space. Waves start on a trigger and keep at most `maxAlive` enemies up at once, feeding in
// the rest from their doors as others go down. Trigger ids are what the script (script.js) hangs lines on.
// Enemy counts are for solo; co-op scales them (about 1.6× plus a flanker per wave) when phase 5 lands.

/**
 * @typedef {[number, number, number]} V3
 * @typedef {{ type: string, at: V3, door?: string }} Spawn
 * @typedef {{ id: string, on: string, maxAlive: number, spawns: Spawn[] }} Wave
 * @typedef {{ id: string, space: string, enter: string, waves: Wave[], boss?: string, setPiece?: string,
 *   events: { id: string, on: string, after?: number }[], ends: string, checkpointOnEnter: boolean }} Beat
 */

/** @type {Beat[]} */
export const BEATS = [
  {
    id: 'pickup', space: 'counter', enter: 'pickup:enter', checkpointOnEnter: false,
    waves: [],
    events: [
      { id: 'pickup:bagGrabbed', on: 'bag:onBack' },                    // you take the bag off the counter
      { id: 'pickup:noticed', on: 'pickup:bagGrabbed', after: 3 },      // a cook squints at the ticket number
      { id: 'pickup:quiet', on: 'pickup:noticed', after: 2.5 },         // the room goes quiet
      { id: 'pickup:rollerDoor', on: 'door:counter>fryerLine' },        // solo: the roller door slams between you and Mo
    ],
    ends: 'door:counter>fryerLine',
  },
  {
    id: 'fryerFight', space: 'fryerLine', enter: 'fryerFight:enter', checkpointOnEnter: true, setPiece: 'bounty',
    waves: [
      {
        id: 'fryerFight:wave1', on: 'setpiece:bounty:done', maxAlive: 5, spawns: [
          { type: 'lineCook', at: [-4, 0, -3.4] }, { type: 'lineCook', at: [4, 0, -3.4] }, { type: 'lineCook', at: [-1, 0, -3.4] },
          { type: 'pistolCook', at: [-4.2, 0, -5] }, { type: 'pistolCook', at: [3.6, 0, -3] },
        ],
      },
      {
        id: 'fryerFight:wave2', on: 'fryerFight:wave1:cleared', maxAlive: 5, spawns: [
          { type: 'grabber', at: [4.5, 0, 5.3], door: 'fryerLine>counter' }, { type: 'lineCook', at: [4.5, 0, 5.3], door: 'fryerLine>counter' },
          { type: 'pistolCook', at: [-4.6, 0, -5.2], door: 'fryerLine>dock' }, { type: 'lineCook', at: [-4.6, 0, -5.2], door: 'fryerLine>dock' },
          { type: 'lineCook', at: [-5.8, 0, 3], door: 'fryerLine>freezer' }, { type: 'pistolCook', at: [-4.6, 0, -5.2], door: 'fryerLine>dock' },
        ],
      },
    ],
    events: [{ id: 'fryerFight:greaseFire', on: 'fryer:shot' }],
    ends: 'door:fryerLine>freezer',
  },
  {
    id: 'freezer', space: 'freezer', enter: 'freezer:enter', checkpointOnEnter: true,
    waves: [
      {
        id: 'freezer:breach', on: 'freezer:sealed:timeout', maxAlive: 4, spawns: [
          { type: 'lineCook', at: [3.2, 0, 0], door: 'freezer>fryerLine' }, { type: 'lineCook', at: [3.2, 0, 0], door: 'freezer>fryerLine' },
          { type: 'pistolCook', at: [3.2, 0, 0], door: 'freezer>fryerLine' }, { type: 'grabber', at: [3.2, 0, 0], door: 'freezer>fryerLine' },
        ],
      },
    ],
    events: [
      { id: 'freezer:sealed', on: 'freezer:enter', after: 1.5 },        // the door swings shut and locks behind you
      { id: 'freezer:sealed:timeout', on: 'freezer:sealed', after: 8 }, // cooks kick it open from outside
    ],
    ends: 'door:freezer>fryerLine',
  },
  {
    id: 'expediter', space: 'fryerLine', enter: 'expediter:enter', checkpointOnEnter: true, boss: 'expediter',
    waves: [
      { id: 'expediter:adds', on: 'expediter:enraged', maxAlive: 2, spawns: [{ type: 'lineCook', at: [-4.5, 0, -5.3], door: 'fryerLine>dock' }, { type: 'lineCook', at: [4.5, 0, 5.3], door: 'fryerLine>counter' }] },
    ],
    events: [{ id: 'expediter:start', on: 'expediter:enter', after: 2 }],
    ends: 'expediter:defeated',
  },
  {
    id: 'dock', space: 'dock', enter: 'dock:enter', checkpointOnEnter: true,
    waves: [
      {
        id: 'dock:wave1', on: 'dock:enter', maxAlive: 6, spawns: [
          { type: 'lineCook', at: [-5, 0, -4.6], door: 'dock>street' }, { type: 'pistolCook', at: [5, 0, -4.6], door: 'dock>street' },
          { type: 'kitchenGunner', at: [0, 0, -4.6], door: 'dock>street' }, { type: 'grabber', at: [-2, 0, -4.6], door: 'dock>street' },
          { type: 'lineCook', at: [3, 0, -4.6], door: 'dock>street' }, { type: 'pistolCook', at: [-4, 0, -4.6], door: 'dock>street' },
        ],
      },
    ],
    events: [{ id: 'chapter:end', on: 'door:dock>street' }],
    ends: 'door:dock>street',
  },
];

/** The bounty set piece: every order screen flips to one red ticket, then the whole kitchen turns toward you. */
export const SET_PIECES = {
  bounty: {
    on: 'fryerFight:enter', steps: [
      { at: 0.0, do: 'screens:flicker' },
      { at: 0.8, do: 'screens:bountyTicket' },   // #0447, $50000, VEE + MO
      { at: 1.6, do: 'phones:buzz' },            // every phone in the kitchen, yours included
      { at: 2.4, do: 'cooks:turnToPlayer' },
      { at: 3.4, do: 'slowmo:pulse' },           // a short world slow-down, never a camera move
    ],
    done: 'setpiece:bounty:done',
  },
};
