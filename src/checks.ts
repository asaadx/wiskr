// The four checks: how each one is fetched, summarised and rendered in detail.

import { api } from './api';
import { brandIcon } from './brand-icons';
import { badge, esc } from './html';
import { registrarLink } from './registrars';
import type { Domain, FetchOptions, GoogleResult, Kind, Social, TrademarkResult } from './types';

export interface Summary {
  kind: Kind;
  /** Short result shown on the check's row */
  v: string;
  /** Clause used in the verdict sentence */
  why: string;
}

export interface CheckResult {
  summary: Summary;
  /** Detail HTML, shown when the row is opened */
  body: string;
}

interface CheckMeta {
  key: string;
  label: string;
}

export interface Check extends CheckMeta {
  run: (name: string, opts?: FetchOptions) => Promise<CheckResult>;
}

interface CheckDef<T> extends CheckMeta {
  fetch: (name: string, opts?: FetchOptions) => Promise<T>;
  summarize: (data: T) => Summary;
  body: (data: T, name: string) => string;
}

function defineCheck<T>({fetch, summarize, body, ...meta}: CheckDef<T>): Check {
  return {...meta, async run(name, opts) {
    const data = await fetch(name, opts);
    return {summary: summarize(data), body: body(data, name)};
  }};
}

const free = (list: {status: string}[]) => list.filter(x => x.status === 'available').length;
const plural = (n: number) => n > 1 ? 's' : '';

/* ---------- detail bodies ---------- */
function tmHTML(tm: TrademarkResult, name: string): string {
  if (!tm.items.length) return `<div class="empty">No marks in the Canadian Trademarks Database match “${esc(name)}”. Consider filing before launch.</div>`;
  return `<div class="tbl"><table><thead><tr><th>Mark</th><th>Status</th><th>Nice classes</th><th>Owner</th><th>Filed</th></tr></thead><tbody>
    ${tm.items.map(t => `<tr><td><div class="tm-mark">${esc(t.mark)}</div><div class="tm-app">App. ${t.app}</div></td>
      <td>${t.status === 'Abandoned' ? badge('neutral','Abandoned') : t.status === 'Registered' ? badge('bad','Registered') : badge('warn', t.status)}</td>
      <td>${t.classes.map(c => `<div><span class="mono">${String(c[0]).padStart(2,'0')}</span> ${c[1]}</div>`).join('')}</td>
      <td>${esc(t.owner)}</td><td class="mono nowrap">${t.filed}</td></tr>`).join('')}
    </tbody></table></div>`;
}

function domainPrice(x: Domain): string {
  if (x.status === 'available') return `from $${x.price.toFixed(2)}/yr`;
  if (x.status === 'premium' && x.premium !== null) return `$${x.premium.toLocaleString()}`;
  return '—';
}

function domainsHTML(domains: Domain[]): string {
  return `<div class="rows">${domains.map(x => `<div class="row">
    <div class="main"><div class="t mono">${esc(x.name)}</div></div>
    ${x.registrars.length ? `<span class="regs">${x.registrars.map(id => registrarLink(id, x.name)).join('')}</span>` : ''}
    <span class="price">${domainPrice(x)}</span>
    ${x.status === 'available' ? badge('ok','Available') : x.status === 'premium' ? badge('warn','For sale') : badge('bad','Taken')}</div>`).join('')}</div>`;
}

function socialsHTML(socials: Social[]): string {
  return `<div class="rows">${socials.map(s => `<div class="row"><div class="ico">${brandIcon(s.platform)}</div>
    <div class="main"><div class="t">${s.label}</div><div class="m mono">${esc(s.url)}</div>${s.meta ? `<div class="m">${s.meta}${s.alt ? ` · try <span class="mono">@${esc(s.alt)}</span>` : ''}</div>` : ''}</div>
    ${s.status === 'available' ? badge('ok','Available') : s.status === 'inactive' ? badge('warn','Inactive') : badge('bad','Taken')}</div>`).join('')}</div>`;
}

const brandCount = (g: GoogleResult) => g.organic.filter(o => o.brand).length;

function googleHTML(g: GoogleResult): string {
  return `<div class="stats">
    <div class="stat"><div class="k">Results</div><div class="v">${g.resultCount.toLocaleString()}</div></div>
    <div class="stat"><div class="k">Brands</div><div class="v">${brandCount(g)}</div></div>
    <div class="stat"><div class="k">Ads</div><div class="v">${g.sponsored ? 1 : 0}</div></div></div>
    <div class="serp">
    ${g.sponsored ? `<div class="r ad"><div class="url"><span class="spons">Sponsored</span>${esc(g.sponsored.url)}</div><div class="rt">${esc(g.sponsored.title)}</div><div class="snip">${esc(g.sponsored.snip)}</div></div>` : ''}
    ${g.organic.slice(0, 5).map(o => `<div class="r"><div class="url">${esc(o.url)}</div><div class="rt">${esc(o.title)}</div><div class="snip">${esc(o.snip)}</div></div>`).join('')}
    </div>`;
}

/* ---------- checks ---------- */
export const CHECKS: Check[] = [
  defineCheck<TrademarkResult>({key: 'trademarks', label: 'Trademarks',
    fetch: api.trademarks,
    summarize(tm) {
      const n = tm.live;
      return {kind: n ? 'bad' : 'ok', v: n ? `${n} active in Canada` : 'No conflicts in Canada',
        why: `${n} active Canadian trademark${plural(n)}`};
    },
    body: tmHTML}),
  defineCheck<Domain[]>({key: 'domains', label: 'Domains',
    fetch: api.domains,
    summarize(domains) {
      const com = domains[0]!;
      const state = com.status === 'available' ? 'is free' : com.status === 'premium' ? 'is for sale' : 'is taken';
      return {kind: com.status === 'available' ? 'ok' : com.status === 'premium' ? 'warn' : 'bad',
        v: `${com.name} ${state}`, why: `${com.name} ${state}`};
    },
    body: domainsHTML}),
  defineCheck<Social[]>({key: 'socials', label: 'Social handles',
    fetch: api.socials,
    summarize(socials) {
      const f = free(socials), n = socials.length;
      return {kind: f >= 5 ? 'ok' : f >= 3 ? 'warn' : 'bad', v: `${f} of ${n} free`,
        why: f >= 3 ? `only ${f} of ${n} handles free` : 'most social handles are taken'};
    },
    body: socialsHTML}),
  defineCheck<GoogleResult>({key: 'google', label: 'Search engine',
    fetch: api.google,
    summarize(g) {
      const b = brandCount(g), crowded = b >= 4 || !!g.sponsored;
      return {kind: crowded ? 'bad' : b ? 'warn' : 'ok', v: crowded ? 'Crowded' : b ? 'Some overlap' : 'Wide open',
        why: crowded ? 'crowded search results' : 'some overlap in search results'};
    },
    body: googleHTML}),
];

/** A name is taken when any check comes back bad. */
export const isTaken = (summaries: Summary[]): boolean => summaries.some(s => s.kind === 'bad');

/** Runs every check for a name and reports only whether it is taken. */
export async function vet(name: string, opts?: FetchOptions): Promise<boolean> {
  return isTaken((await Promise.all(CHECKS.map(c => c.run(name, opts)))).map(r => r.summary));
}
