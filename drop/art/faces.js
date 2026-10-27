// 16×16 hand-painted faces, drawn on the front of each head box. Each character has a neutral face plus comedy
// expressions for the cartoonish deaths and the stun: hurt (squeezed eyes, teeth), scared (wide eyes, O mouth)
// and dazed (X eyes, wobbly mouth). Expressions replace whole rows of the neutral face.
// Halberd has no face: a black balaclava behind a mirrored visor.

/** @typedef {'neutral' | 'hurt' | 'scared' | 'dazed'} Expression */

export const FACES = {
  mo: {
    pal: { s: '#8d5b3e', b: '#241510', d: '#5e3a28', w: '#d8cfc0', e: '#1a0f0a', n: '#6a4230', m: '#3b1f16', h: '#5a3826' },
    rows: [
      'ssssssssssssssss', 'ssssssssssssssss', 'ssssssssssssssss', 'ssbbbbssssbbbbss', 'ssssssssssssssss',
      'sssdddssssdddsss', 'sssswessssewssss', 'ssssssssssssssss', 'sssssssnnsssssss', 'ssssssnnnnssssss',
      'ssssssssssssssss', 'shshsssssssshshs', 'shshsmmmmmmshshs', 'hshshshshshshshs', 'shshshshshshshsh', 'hhhhhhhhhhhhhhhh',
    ],
    expressions: {
      hurt: { 5: 'ssssssssssssssss', 6: 'sssbbbssssbbbsss', 12: 'shshmwwwwwwmshhs', 13: 'hshsmmmmmmmmhshs' },
      scared: { 5: 'ssswwwsssswwwsss', 6: 'ssswewsssswewsss', 11: 'shshsssmmsssshhs', 12: 'shshssmmmmssshhs', 13: 'hshshsmmmmhshshs' },
      dazed: { 5: 'sssbsbssssbsbsss', 6: 'ssssbssssssbssss', 7: 'sssbsbssssbsbsss', 12: 'shshsmsmsmsmshhs', 13: 'hshshsmsmsmshshs' },
    },
  },
  vee: {
    pal: { r: '#2b1a1c', s: '#e0ab85', f: '#c48463', w: '#f2ece4', e: '#2a1a14', m: '#b0544e', k: '#e8907a', b: '#2b1a1c' },
    rows: [
      'rrrrrrrrrrrrrrrr', 'rrrrrrrrrrrrrrrr', 'rrrrrsrrrrrrsrrr', 'rsssssrrssssssrr', 'ssrrrsssssrrrsss',
      'ssssssssssssssss', 'sswewsssssswewss', 'ssssssssssssssss', 'sskfssssssssfkss', 'sssfsssffsssfsss',
      'ssssssssssssssss', 'ssssssssssmsssss', 'sssssmmmmmssssss', 'ssssssssssssssss', 'ssssssssssssssss', 'ssssssssssssssss',
    ],
    expressions: {
      hurt: { 6: 'ssbbbssssssbbbss', 11: 'ssssssssssssssss', 12: 'sssmwwwwwmssssss' },
      scared: { 5: 'sswwwsssssswwwss', 11: 'ssssssmmssssssss', 12: 'sssssmmmmsssssss', 13: 'ssssssmmssssssss' },
      dazed: { 5: 'ssbsbssssssbsbss', 6: 'sssbssssssssbsss', 7: 'ssbsbssssssbsbss', 11: 'ssssmsmsmsssssss', 12: 'sssssmsmssssssss' },
    },
  },
  cook: {
    pal: { s: '#c48a66', b: '#2c2018', e: '#1c120c', u: '#a26e50', n: '#9a6448', m: '#2c2018', l: '#7a3e30', w: '#e8e2d4' },
    rows: [
      'ssssssssssssssss', 'ssssssssssssssss', 'ssssssssssssssss', 'sbbbbsssssbbbbbs', 'ssssssssssssssss',
      'sssbbbssssbbbsss', 'ssseesssssseesss', 'sssuuussssuuusss', 'sssssssnnsssssss', 'ssssssnnnnssssss',
      'sssmmmmmmmmmmsss', 'ssmmmsllllsmmmss', 'ssssssssssssssss', 'ssssssssssssssss', 'sussssssssssssus', 'uuuuuuuuuuuuuuuu',
    ],
    expressions: {
      hurt: { 5: 'ssssssssssssssss', 6: 'sssbbbssssbbbsss', 11: 'ssmmmswwwwsmmmss' },
      scared: { 5: 'ssswwwsssswwwsss', 6: 'ssswewsssswewsss', 11: 'ssmmmssllssmmmss', 12: 'ssssssllllssssss' },
      dazed: { 5: 'sssbsbssssbsbsss', 6: 'ssssbssssssbssss', 7: 'sssbsbssssbsbsss', 11: 'ssmmmsmsmsmmmmss' },
    },
  },
};

/**
 * The 16 rows for a character's face with an expression applied.
 * @param {'mo' | 'vee' | 'cook'} who
 * @param {Expression} [expr]
 */
export function faceRows(who, expr = 'neutral') {
  const f = FACES[who];
  if (!f) throw new Error('no face for ' + who);
  const over = expr === 'neutral' ? {} : f.expressions[expr];
  if (!over) throw new Error(`no ${expr} face for ${who}`);
  return f.rows.map((row, i) => over[i] ?? row);
}
