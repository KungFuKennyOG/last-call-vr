// The bag in the world: on the pickup counter, on your back, on a grabber's back while he runs for a door, or on
// the floor where he dropped it. Every change goes through the bag rules (drop/bag.js) as an event, so the
// same events can drive co-op later. Losing it out a door restarts the checkpoint.
import * as THREE from 'three';
import { bagEvent, initialBag, PICKUP_RANGE } from '../bag.js';
import { box, F, mk, mergeInto, meshesUnder } from '../render/geo.js';
import { M, C } from '../render/mats.js';
import { buzz } from '../../engine/index.js';
import { sfxRack } from '../../audio/index.js';

/** The GOFR thermal bag with the wallet zip-tied on top. */
export function bagModel() {
  const g = new THREE.Group(), front = M('bagFront');
  mk(g, box(.46, .48, .34, { at: [0, .24, 0] }), F(M('bagSide'), front, front, M('bagSide'), M('bagSide')));
  for (const s of [-1, 1]) mk(g, box(.05, .03, .36), C(0x151517), s * .13, .495, 0);
  mk(g, box(.12, .025, .2), F(C(0x1b1c1e), C(0x1b1c1e), C(0x1b1c1e), M('walletScreen', { unlit: true })), .04, .5, .02, 0, .5, 0);
  mergeInto(g, meshesUnder(g));
  return g;
}

/** @param {{ scene: any, player: any, enemies: any, fx: any, G: any }} o */
export function createBag({ scene, player, enemies, fx, G }) {
  const B = { state: null, mesh: bagModel(), onCounter: true };
  B.mesh.scale.setScalar(.9);

  function apply(ev, quiet) {
    const r = bagEvent(B.state, ev); B.state = r.state;
    for (const o of r.out) {
      if (o.type === 'bagStolen') { G.say('bagStolen'); G.hud.message('THE BAG!', 1.4); buzz('both', .8, 200); }
      if (o.type === 'bagRecovered' && !quiet) { G.say('bagRecovered'); sfxRack(); }
      if (o.type === 'bagDropped') fx.popup(new THREE.Vector3(o.at[0], 1, o.at[2]), 'BAG', 'GRAB IT', '#ff7a1a', 1, 1.6);
      if (o.type === 'bagLost') { G.say('bagLost'); G.restartCheckpoint('bagLost'); }
    }
    G.wristDirty = true;
  }

  /** Puts the bag on the pickup counter, before the chapter's first grab. */
  B.toCounter = space => {
    B.onCounter = true; B.state = { holder: { kind: 'ground', at: [-.2, 0, -.55] }, steals: 0 };
    space.root.add(B.mesh); B.mesh.position.set(-.2, 1.05, -.55); B.mesh.rotation.set(0, .3, 0);
  };
  /** Back on your back (a checkpoint restore, or after the counter). */
  B.toPlayer = () => {
    B.onCounter = false; B.state = bagEvent(B.state || initialBag(), { type: 'checkpointRestored', player: 'p1' }).state;
    if (B.mesh.parent) B.mesh.parent.remove(B.mesh);
  };
  B.reset = () => { B.state = initialBag(); B.onCounter = false; if (B.mesh.parent) B.mesh.parent.remove(B.mesh); };
  B.held = () => B.state && B.state.holder.kind === 'player';
  B.grab = e => apply({ type: 'grabbed', enemy: e.id, at: [e.group.position.x, 0, e.group.position.z] });
  B.escape = e => { apply({ type: 'escaped', enemy: e.id }); G.enemyGone(e, 'escaped'); };
  /** An enemy went down: if he had the bag, it drops where he fell. */
  B.enemyDown = e => { if (B.state && B.state.holder.kind === 'enemy' && B.state.holder.id === e.id) apply({ type: 'enemyDown', enemy: e.id, at: [e.group.position.x, 0, e.group.position.z] }); };

  B.update = () => {
    if (!B.state) return;
    const h = B.state.holder;
    if (h.kind === 'ground') {
      if (!B.mesh.parent) { scene.add(B.mesh); B.mesh.rotation.set(0, Math.random() * 6, 0); }
      if (!B.onCounter) B.mesh.position.set(h.at[0], 0, h.at[2]);
      // walk up to it (or reach over the counter) and it's yours
      const d = Math.hypot(player.headPos.x - h.at[0], player.headPos.z - h.at[2]);
      if (d <= PICKUP_RANGE && G.state === 'playing') {
        const first = B.onCounter;
        if (B.mesh.parent) B.mesh.parent.remove(B.mesh);
        apply({ type: 'pickedUp', player: 'p1', at: [player.headPos.x, 0, player.headPos.z] }, first);
        if (first) { B.onCounter = false; G.hud.message('BAG ON YOUR BACK', 1.6); buzz('both', .5, 120); G.chapter.fire('bag:onBack'); }
      }
    } else if (h.kind === 'enemy') {
      const e = enemies.list.find(x => x.id === h.id);
      if (e) { if (B.mesh.parent !== e.torso) { e.torso.add(B.mesh); B.mesh.position.set(0, .22, -.32); B.mesh.rotation.set(0, 0, 0); } }
    } else if (B.mesh.parent) B.mesh.parent.remove(B.mesh);
  };
  return B;
}
