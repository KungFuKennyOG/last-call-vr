// Locational damage: what a round does depending on where it lands. Gut shots double them over,
// chest shots knock them back, arm shots drop the arm, leg shots buckle the knee, two legs put them down.
import * as THREE from 'three';

// moveEntity(p, dx, dz, r, y): the level's collision-aware nudge.
export function createDamage({ spray, mist, sfxSplat, moveEntity }) {
  const v = new THREE.Vector3();
  // blood out of the entry wound and a little back out the way it came
  function wound(point, dir, big) {
    spray(point, dir, big ? 22 : 12, big ? 4.5 : 3.2, .45);
    spray(point, v.copy(dir).negate(), big ? 8 : 4, 1.6, .7);
    mist(point, big ? .6 : .35); sfxSplat();
  }
  // Sets e.react (the stagger the body animates) and the lasting wounds (e.gutHurt, e.armHurt, e.legHurt).
  // Returns true when this was the second leg hit: the caller puts them down.
  // Bosses (e.boss) shrug hits off faster and don't go down on their legs.
  function reactToHit(e, partName, side, point, dir) {
    const lp = e.inner.worldToLocal(point.clone()), sx = lp.x >= 0 ? 1 : -1, slow = e.kind === 'heavy' ? .75 : 1;
    v.set(dir.x, 0, dir.z).normalize();
    if (partName === 'body') {
      const gut = lp.y < 1.16; e.react = { type: gut ? 'gut' : 'chest', t: 0, dur: (gut ? 1.25 : .8) * slow, sx, side: sx < 0 ? 'L' : 'R' }; if (gut) e.gutHurt = true;
      moveEntity(e.group.position, v.x * (gut ? .3 : .5), v.z * (gut ? .3 : .5), .35, e.group.position.y);
    } else if (partName === 'arm') {
      e.react = { type: 'arm', t: 0, dur: .85 * slow, side }; e.armHurt[side] = true; moveEntity(e.group.position, v.x * .15, v.z * .15, .35, e.group.position.y);
    } else if (partName === 'leg') {
      e.legHurt[side]++;
      if (e.legHurt.L + e.legHurt.R >= 2 && !e.boss) return true;
      e.react = { type: 'leg', t: 0, dur: 1.5 * slow, side };
    }
    if (e.react) {
      if (e.boss) e.react.dur *= .5;
      e.stunT = Math.max(e.stunT, e.react.dur * (e.boss ? .3 : .85)); e.aiming = false; e.fireT = Math.max(e.fireT, e.boss ? .4 : .9);
    }
    return false;
  }
  // a killing shot that isn't to the head, at normal force, can leave them alive on the floor
  function rollDown(partName, head, melee, forceMul) {
    return !melee && !head && forceMul <= 1.2 && (partName === 'leg' ? Math.random() < .6 : partName === 'body' ? Math.random() < .35 : partName === 'arm' ? Math.random() < .2 : false);
  }
  // how hard the body is thrown
  function deathForce(e, head, meleeForce, forceMul) {
    const melee = meleeForce !== undefined;
    return (melee ? meleeForce : head ? 5 : (e.kind === 'heavy' ? 4 : 6.5)) * (melee ? 1 : forceMul);
  }
  return { wound, reactToHit, rollDown, deathForce };
}
