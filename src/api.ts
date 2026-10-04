// Data layer. Each function resolves one check for a name; today they are backed by
// mock.ts with simulated latency. Swap a function body for a real fetch() to go live.

import { simulate, slugify } from './mock';
import { suggestNames } from './mock-names';
import type { Domain, FetchOptions, GoogleResult, NameStyle, Report, Social, Suggestion, TrademarkResult } from './types';

const LATENCY: Record<keyof Report, number> = {trademarks: 550, domains: 970, socials: 1390, google: 1810};
const SUGGEST_LATENCY = 700;

const cache = new Map<string, Report>();
function report(name: string): Report {
  const slug = slugify(name);
  let hit = cache.get(slug);
  if (!hit) { hit = simulate(name); cache.set(slug, hit); }
  return hit;
}

const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

async function mock<K extends keyof Report>(key: K, name: string, {instant = false}: FetchOptions = {}): Promise<Report[K]> {
  if (!instant) await sleep(LATENCY[key]);
  return report(name)[key];
}

export const api = {
  /** Canadian (CIPO) trademark matches */
  trademarks: (name: string, opts?: FetchOptions): Promise<TrademarkResult> => mock('trademarks', name, opts),
  domains: (name: string, opts?: FetchOptions): Promise<Domain[]> => mock('domains', name, opts),
  socials: (name: string, opts?: FetchOptions): Promise<Social[]> => mock('socials', name, opts),
  google: (name: string, opts?: FetchOptions): Promise<GoogleResult> => mock('google', name, opts),
  /** Name ideas for a seed (what the startup does, or a name to riff on) in one naming style */
  async suggest(seed: string, style: NameStyle, {instant = false}: FetchOptions = {}): Promise<Suggestion[]> {
    if (!instant) await sleep(SUGGEST_LATENCY);
    return suggestNames(seed, style);
  },
};
