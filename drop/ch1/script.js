// Chapter 1's lines: radio, the GOFR app, and what enemies shout. Data only.
//
// `on` is a trigger from beats.js, a set piece step, or an out event from the rules modules (bag, stun, disarm,
// the boss). Several lines on the same trigger are variants: the game picks one and doesn't repeat it back to back.
// Modes: in solo you play Vee and Mo is on the radio once the roller door cuts you off; in co-op you're both there
// and the dispatcher is on the radio. Tone: buddy action comedy. Mo is the deadpan veteran, Vee the reckless rookie.
// Keep each line under 90 characters so it fits the wrist screen as a subtitle.

/** @typedef {{ on: string, who: 'mo' | 'vee' | 'app' | 'dispatch' | 'cook' | 'grabber' | 'expediter', text: string, mode?: 'solo' | 'coop' }} Line */

/** @type {Line[]} */
export const LINES = [
  // pickup counter
  { on: 'pickup:enter', who: 'app', text: 'GOFR: Your pickup is ready! Order #0447.' },
  { on: 'pickup:enter', who: 'mo', text: "Ten brands, one kitchen. Don't eat anything that comes out of here." },
  { on: 'pickup:bagGrabbed', who: 'vee', text: 'Heavy for dumplings.' },
  { on: 'pickup:noticed', who: 'cook', text: 'Hey. HEY. That ticket says 0447. That is not your bag.' },
  { on: 'pickup:quiet', who: 'mo', text: 'Okay. Nobody make any sudden—' },
  { on: 'pickup:rollerDoor', who: 'mo', mode: 'solo', text: "Vee? Door's down. I'm on the radio. Keep moving, I'll talk you through it." },
  { on: 'pickup:rollerDoor', who: 'dispatch', mode: 'coop', text: 'Dispatch here. Your 0447 is flagged. Uh. Good luck, I guess.' },

  // fryer line and the bounty
  { on: 'fryerFight:enter', who: 'vee', text: 'Why is every screen in here looking at me?' },
  { on: 'setpiece:bounty:done', who: 'app', text: 'GOFR: Surge pricing! Bounty on order #0447 is now $50,000.' },
  { on: 'setpiece:bounty:done', who: 'mo', text: "Fifty grand. For a bag of dumplings. It's not dumplings." },
  { on: 'fryerFight:greaseFire', who: 'vee', text: 'Oh, that is SO much fire.' },
  { on: 'fryerFight:greaseFire', who: 'mo', text: "Don't stand in the fire. That's free advice." },
  { on: 'fryerFight:wave1:cleared', who: 'mo', text: "Okay. We're not getting a five-star rating on this one." },
  { on: 'fryerFight:wave1:cleared', who: 'app', text: 'GOFR: Your courier is nearby! Estimated arrival: unknown.' },

  // freezer
  { on: 'freezer:enter', who: 'vee', text: "Freezer. Good. Nobody's dumb enough to follow us into a freezer." },
  { on: 'freezer:sealed', who: 'vee', text: 'Did the door just lock? From the outside? Why does it lock from the outside?' },
  { on: 'freezer:sealed', who: 'mo', text: 'Health code violation. Add it to the list.' },
  { on: 'freezer:sealed:timeout', who: 'cook', text: 'Okay, open it! Open it! Why is it so cold, who set it this cold?' },

  // the Expediter (lines the boss module asks for by name)
  { on: 'expediter:start', who: 'mo', text: 'Big guy in the pass. Tray up. Go round him, not through him.' },
  { on: 'expediter.intro', who: 'expediter', text: 'ORDER UP. Order 0447. Come to the pass.' },
  { on: 'expediter.staggered', who: 'expediter', text: 'You threw a GUN at me?' },
  { on: 'expediter.enraged', who: 'expediter', text: "That's it. I'm eighty-sixing you. Both of you." },
  { on: 'expediter.defeated', who: 'expediter', text: 'Tell Margo... the fryers need cleaning.' },
  { on: 'expediter.defeated', who: 'vee', text: "Who's Margo?" },

  // loading dock and the end
  { on: 'dock:enter', who: 'mo', text: 'Bay doors. Scooters. Rain. Almost out.' },
  { on: 'chapter:end', who: 'app', text: 'GOFR: How was your pickup? Rate your experience!' },
  { on: 'chapter:end', who: 'vee', text: "One star. One star and a strongly worded review." },

  // the bag
  { on: 'bagStolen', who: 'grabber', text: 'Got it! Got it, got it, got it—' },
  { on: 'bagStolen', who: 'vee', text: 'HEY. That is a DELIVERY.' },
  { on: 'bagStolen', who: 'mo', mode: 'solo', text: "He's got the bag. Don't let him reach a door." },
  { on: 'bagRecovered', who: 'vee', text: 'Mine. Still mine. Signed for.' },
  { on: 'bagLost', who: 'mo', text: "And it's gone. Let's try that again." },

  // stunned and back up
  { on: 'stunned', who: 'mo', mode: 'solo', text: 'Vee. Shot. Thigh. Now.' },
  { on: 'stunned', who: 'vee', mode: 'coop', text: 'Mo. Mo. I see three of you.' },
  { on: 'recovered.adrenaline', who: 'vee', text: 'OW. Okay. Okay! I can see colors again.' },
  { on: 'recovered.slap', who: 'mo', mode: 'coop', text: "Up. We're on the clock." },
  { on: 'recovered.slap', who: 'vee', mode: 'coop', text: 'Did you have to do it that hard?' },

  // disarmed enemies (bark ids come from disarm.js: disarm.<reaction>.<type>)
  { on: 'disarm.rushBareHanded.lineCook', who: 'cook', text: "That was my good cleaver! You're paying for that!" },
  { on: 'disarm.flee.lineCook', who: 'cook', text: "Nope. I'm on break. I'm going on break." },
  { on: 'disarm.pickUp.pistolCook', who: 'cook', text: 'Five-second rule! Five-second rule!' },
  { on: 'disarm.flee.pistolCook', who: 'cook', text: "They don't pay me enough for this. They don't pay me at ALL." },
  { on: 'disarm.pickUp.kitchenGunner', who: 'cook', text: 'Nobody saw that. Nobody saw that.' },
  { on: 'disarm.flee.kitchenGunner', who: 'cook', text: "I'm calling HR. Do we have HR?" },
  { on: 'disarm.beg.kitchenGunner', who: 'cook', text: "Okay, okay! I'm a dishwasher! I wash dishes!" },

  // slow deaths: crawling enemies complain (the game picks these while they crawl)
  { on: 'crawl.lineCook', who: 'cook', text: 'I was on my break. I was on my BREAK.' },
  { on: 'crawl.lineCook', who: 'cook', text: "Somebody tell the fryer guy. I'm the fryer guy." },
  { on: 'crawl.pistolCook', who: 'cook', text: 'Is this covered? Is this a covered injury?' },
  { on: 'crawl.kitchenGunner', who: 'cook', text: 'I want to speak to the manager. I AM the manager.' },
  { on: 'crawl.grabber', who: 'grabber', text: 'Worth it. Totally worth it. Not worth it.' },
];

/** Lines for a trigger, filtered to the mode being played. */
export function linesFor(on, mode = 'solo') {
  return LINES.filter(l => l.on === on && (!l.mode || l.mode === mode));
}
