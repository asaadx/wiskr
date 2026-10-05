// Deterministic mock data: the same name always produces the same report.

import { registrarsFor } from './registrars';
import type { Domain, OrganicHit, Platform, Report, SearchHit, Social, Trademark } from './types';

const COMMON = ['nova','apex','pulse','orbit','spark','flow','zen','core','bloom','echo','atlas','luna','vibe','nest','sync','loop','leaf','wave','pixel','swift'];
const INDUSTRIES = ['Fintech','Skincare','Analytics SaaS','Pet food','Edtech','Design agency','Fitness app','Coffee roaster','HR software','Real estate'];
const NICE_CLASSES: [number, string][] = [[9,'Software & electronics'],[35,'Advertising & business'],[36,'Financial services'],[41,'Education & entertainment'],[42,'SaaS & technology services'],[3,'Cosmetics'],[25,'Clothing']];
const TLDS: [string, number][] = [['.com',12.99],['.ca',14.99],['.io',39.99],['.ai',79.99],['.co',24.99],['.app',16.99]];
const PLATFORMS: [platform: Platform, label: string, url: (slug: string) => string][] = [
  ['x','X (Twitter)', s => `x.com/${s}`],['instagram','Instagram', s => `instagram.com/${s}`],
  ['tiktok','TikTok', s => `tiktok.com/@${s}`],['linkedin','LinkedIn', s => `linkedin.com/company/${s}`],
  ['github','GitHub', s => `github.com/${s}`],['youtube','YouTube', s => `youtube.com/@${s}`],
];
const TM_STATUSES: Trademark['status'][] = ['Registered','Registered','Formalized','Abandoned','Searched'];

export type Rng = () => number;

export const slugify = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, '');

export function hash(s: string): number {
  let h = 2166136261;
  for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function rng(seed: number): Rng {
  let a = seed;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export const pick = <T>(r: Rng, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)] as T;

export function simulate(raw: string): Report {
  const name = raw.trim();
  const slug = slugify(name);
  const r = rng(hash(slug));

  // "Commonness" drives how taken things are
  let common = COMMON.some(w => slug.includes(w)) ? 0.75 : 0.15;
  if (slug.length <= 5) common += 0.25;
  if (slug.length >= 10) common -= 0.1;
  common = Math.max(0.05, Math.min(0.95, common + (r() - .5) * .25));
  const taken = () => r() < common;

  const socials: Social[] = PLATFORMS.map(([platform, label, url]) => {
    const t = taken();
    const alt = t ? pick(r, [`${slug}hq`, `get${slug}`, `${slug}app`, `try${slug}`, `${slug}.co`]) : null;
    const inactive = t && r() < .35;
    return {platform, label, url: url(slug), status: t ? (inactive ? 'inactive' : 'taken') : 'available', alt,
      meta: t ? (inactive ? `Last post ${1 + Math.floor(r() * 6)} yrs ago · may be claimable` : `${(r() * 90 + .4).toFixed(1)}k followers`) : ''};
  });

  const n = Math.floor(common * 7 + r() * 2);
  const organic: OrganicHit[] = [];
  for (let i = 0; i < n; i++) {
    const ind = pick(r, INDUSTRIES);
    const tld = pick(r, ['.com','.io','.ca','.co','.app']);
    organic.push({brand: true,
      url: `${pick(r, ['','get','www.'])}${slug}${i ? '-' + ind.split(' ')[0]!.toLowerCase() : ''}${tld}`,
      title: `${name}${pick(r, [' — ',' | ',': '])}${ind} ${pick(r, ['Platform','for Teams','Official Site','Co.','Inc.'])}`,
      snip: `${name} is a ${ind.toLowerCase()} company ${pick(r, ['based in Toronto','based in Austin','based in London','serving customers worldwide','founded in ' + (2012 + Math.floor(r() * 13))])}. ${pick(r, ['Start your free trial today.','Shop the new collection.','Book a demo.','Join 10,000+ customers.'])}`});
  }
  if (organic.length < 3) {
    organic.push({brand: false, url: `dictionary.example.com/${slug}`, title: `Did you mean "${name.slice(0, -1)}"?`, snip: 'No exact brand matches. Results are mostly unrelated words and spellings.'});
  }
  const sponsored: SearchHit | null = common > .45 && r() < .75
    ? {url: `${slug}-official.com`, title: `${name}® — ${pick(r, INDUSTRIES)} | Official Site`, snip: 'Sponsored result. A company is actively bidding on this name as a keyword.'}
    : null;
  const resultCount = Math.round(Math.pow(10, 2 + common * 5 + r()));

  const tmCount = common > .6 ? 1 + Math.floor(r() * 3) : (r() < .3 ? 1 : 0);
  const trademarks: Trademark[] = [];
  for (let i = 0; i < tmCount; i++) {
    const status = pick(r, TM_STATUSES);
    const classes = [pick(r, NICE_CLASSES), pick(r, NICE_CLASSES)].filter((v, j, a) => a.findIndex(x => x[0] === v[0]) === j);
    trademarks.push({app: String(1800000 + Math.floor(r() * 500000)),
      mark: i === 0 ? name.toUpperCase() : `${name.toUpperCase()} ${pick(r, ['LABS','HEALTH','PAY','STUDIO'])}`,
      owner: `${pick(r, ['Northwind','Bluefin','Cedar','Granite','Harbour'])} ${pick(r, ['Holdings','Ventures','Brands','Technologies'])} Inc.`,
      status, classes,
      filed: `${2008 + Math.floor(r() * 18)}-${String(1 + Math.floor(r() * 12)).padStart(2, '0')}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')}`});
  }

  const domains: Domain[] = TLDS.map(([t, p]) => {
    let status: Domain['status'] = t === '.com' ? (r() < common + .15 ? 'taken' : 'available') : (taken() ? 'taken' : 'available');
    let premium: number | null = null;
    if (status === 'taken' && r() < .3) { status = 'premium'; premium = Math.round((800 + r() * 15000) / 50) * 50; }
    return {name: slug + t, status, price: p, premium, registrars: status === 'available' ? registrarsFor(t) : []};
  });

  return {
    trademarks: {items: trademarks, live: trademarks.filter(t => t.status !== 'Abandoned').length},
    domains,
    socials,
    google: {organic, sponsored, resultCount},
  };
}
