// Deterministic mock name generator: the same seed and style always give the same names.

import { hash, pick, rng, slugify, type Rng } from './mock';
import type { NameStyle, Suggestion } from './types';

const COUNT = 6;

/** [stem, Latin word, meaning] */
const ROOTS: [string, string, string][] = [
  ['lum','lumen','light'],['vel','velox','swift'],['nov','novus','new'],['clar','clarus','clear'],
  ['fid','fides','trust'],['sol','sol','sun'],['aur','aurum','gold'],['terr','terra','earth'],
  ['viv','vivus','alive'],['luc','lux','light'],['ver','verus','true'],['fort','fortis','strong'],
  ['al','ala','wing'],['merc','merx','goods'],['numm','nummus','coin'],['san','sanus','healthy'],
  ['doc','docere','to teach'],['can','canis','dog'],['fel','feles','cat'],['pac','pax','peace'],
  ['son','sonus','sound'],['aqu','aqua','water'],['cord','cor','heart'],['ment','mens','mind'],
  ['opt','optimus','best'],['prim','primus','first'],['nex','nexus','connection'],['itin','iter','journey'],
  ['tempor','tempus','time'],['sign','signum','mark'],['dom','domus','home'],['cib','cibus','food'],
];
const SUFFIXES = ['a','ora','io','ix','ara','ium','eo','ent'];

/** Seed keywords that pull in related roots first */
const THEMES: [RegExp, string[]][] = [
  [/pay|money|financ|bank|invoice|budget|fintech/, ['numm','aur','fid','merc']],
  [/health|care|med|fit|well|clinic/, ['san','viv','cord']],
  [/learn|edu|school|teach|tutor|course/, ['doc','ment','clar']],
  [/dog|pet|puppy/, ['can','fid']],
  [/cat|kitten/, ['fel']],
  [/fast|speed|deliver|ship|travel|ride/, ['vel','itin','al']],
  [/calm|sleep|meditat|relax/, ['pac','sol','aqu']],
  [/music|audio|sound|podcast/, ['son']],
  [/time|calendar|schedul/, ['tempor']],
  [/brand|name|design|logo/, ['sign','clar']],
  [/home|house|rent|real estate/, ['dom','terr']],
  [/food|meal|restaurant|cook|grocer/, ['cib','viv']],
  [/team|social|chat|network|communit/, ['nex','cord']],
];

/** [word, gloss] */
const EVERYDAY: [string, string][] = [
  ['Flow','steady movement'],['Kite','light, and lifted by wind'],['Ember','what keeps glowing'],
  ['Harbor','a safe place to dock'],['Thread','what holds things together'],['Signal','a clear message'],
  ['Lantern','light you carry with you'],['Compass','a way to find direction'],['Harvest','the payoff of long work'],
  ['Marble','smooth, solid, lasting'],['Sparrow','small and everywhere'],['Ladder','a way up'],
  ['Pocket','close at hand'],['Kettle','warm and everyday'],['Anchor','what keeps you steady'],
  ['Canvas','a blank start'],['Meadow','open, calm ground'],['Pebble','small and smooth'],
  ['Button','one simple action'],['Window','a way to see in'],['Orchard','things grown with care'],
  ['Bridge','a way across'],['Ripple','a small start that spreads'],['Tinder','what starts the fire'],
];

/** [name, what it is] */
const BORROWED: [string, string][] = [
  ['Andes','a mountain range in South America'],['Sahara','the largest hot desert'],['Juniper','an evergreen shrub'],
  ['Orion','a hunter in the night sky'],['Calypso','a nymph from the Odyssey'],['Zephyr','the west wind'],
  ['Tundra','the treeless Arctic plain'],['Saffron','a spice worth more than gold'],['Heron','a patient wading bird'],
  ['Kestrel','a small falcon that hovers'],['Cascade','a stepped waterfall'],['Indigo','a deep blue dye'],
  ['Monsoon','a season of heavy rain'],['Obsidian','volcanic glass'],['Sequoia','the tallest tree on Earth'],
  ['Lyra','a small constellation'],['Fjord','a sea inlet between cliffs'],['Osprey','a fish-hunting hawk'],
  ['Mistral','a cold wind in southern France'],['Tamarind','a sour tropical fruit'],['Halcyon','a mythical bird of calm seas'],
  ['Cobalt','a blue metal'],['Meridian','a line of longitude'],['Larkspur','a tall wildflower'],
];

const ONSETS = ['z','v','k','l','m','n','t','r','s','d','br','gl','tr','pl'];
const VOWELS = ['a','e','i','o','u'];
const ENDS = ['','','n','x','r','l','s'];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function shuffle<T>(r: Rng, arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

function latin(r: Rng, seed: string): Suggestion[] {
  const themed = new Set(THEMES.filter(([re]) => re.test(seed.toLowerCase())).flatMap(([, stems]) => stems));
  const roots = shuffle(r, ROOTS);
  const ordered = [...roots.filter(x => themed.has(x[0])), ...roots.filter(x => !themed.has(x[0]))];
  return ordered.map(([stem, word, meaning]) => ({name: cap(stem + pick(r, SUFFIXES)), origin: `From ${word}, Latin for “${meaning}”`}));
}

function fromList(r: Rng, list: [string, string][]): Suggestion[] {
  return shuffle(r, list).map(([name, gloss]) => ({name, origin: cap(gloss)}));
}

function invented(r: Rng, seed: string): Suggestion[] {
  const word = seed.trim().split(/\s+/)[0] ?? '';
  const prefix = slugify(word).slice(0, 3);
  const syl = () => pick(r, ONSETS) + pick(r, VOWELS);
  const out: Suggestion[] = [];
  for (let i = 0; i < COUNT * 3; i++) {
    const useSeed = prefix.length === 3 && r() < .5;
    const name = cap((useSeed ? prefix : syl()) + syl() + (!useSeed && r() < .45 ? syl() : '') + pick(r, ENDS));
    out.push({name, origin: useSeed ? `Coined from “${word}”` : 'Coined, with no prior meaning'});
  }
  return out;
}

export function suggestNames(seed: string, style: NameStyle): Suggestion[] {
  const slug = slugify(seed);
  const r = rng(hash(`${style}:${slug}`));
  const pool = style === 'latin' ? latin(r, seed)
    : style === 'everyday' ? fromList(r, EVERYDAY)
    : style === 'borrowed' ? fromList(r, BORROWED)
    : invented(r, seed);
  const seen = new Set([slug]);
  return pool.filter(s => {
    const k = slugify(s.name);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, COUNT);
}
