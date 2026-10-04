// Results views: the scanning state and the final report.

import { CHECKS, type Check, type CheckResult, type Summary } from './checks';
import { badge, CHEV, esc, mark } from './html';

const eyebrow = (name: string) => `<div class="eyebrow">Is <b>${esc(name)}</b> taken?</div>`;

export function scanHTML(name: string): string {
  return `<div>${eyebrow(name)}
    <div class="scan-title">Sniffing around<span class="dots"></span></div>
    <div class="scan">${CHECKS.map((c, i) => `<div class="scan-row" style="animation-delay:${i * .08}s" data-check="${c.key}"><span class="st"><span class="spin"></span></span><span class="lbl">${c.step}</span><span class="res"></span></div>`).join('')}</div></div>`;
}

function section(c: Check, s: Summary, sub: string, body: string): string {
  return `<div class="sec" id="${c.id}"><button type="button" class="sec-h" aria-expanded="false" aria-controls="${c.id}-c">
    <div><span class="ttl">${c.title}</span><span class="sub">${sub}</span></div>${badge(s.kind, s.badge)}${CHEV}</button>
    <div class="sec-c" id="${c.id}-c" hidden>${body}</div></div>`;
}

/** `results` is index-aligned with CHECKS. */
export function reportHTML(name: string, slug: string, results: CheckResult[]): string {
  const rows = CHECKS.flatMap((check, i) => { const r = results[i]; return r ? [{check, ...r}] : []; });
  const bad = rows.filter(r => r.summary.kind === 'bad'), warn = rows.filter(r => r.summary.kind === 'warn');
  const taken = bad.length > 0;
  const why = taken ? `Blocked by <b>${bad.map(r => esc(r.summary.why)).join('</b>, <b>')}</b>.`
    : warn.length ? `Nothing blocks you. Heads up: ${warn.map(r => esc(r.summary.why)).join(', ')}.`
    : 'Nothing blocks you. Register the domain and handles before you announce.';
  return `<div class="reveal">
    ${eyebrow(name)}
    <h2 class="answer ${taken ? 'bad' : 'ok'}">${taken ? 'Taken.' : '<em>Available.</em>'}</h2>
    <p class="why">${why}</p>
    <div class="strip">${rows.map(r => `<button type="button" class="tile" data-jump="${r.check.id}">${mark(r.summary.kind)}<div><div class="k">${r.check.k}</div><div class="v">${esc(r.summary.v)}</div></div></button>`).join('')}</div>
    <div class="sections">${rows.map(r => section(r.check, r.summary, r.check.sub(slug, name), r.body)).join('')}</div>
    ${taken
      ? `<section class="ideas"><h3 class="ideas-h">Try something else</h3><p class="ideas-sub">Other names, already checked. Pick a style.</p><div data-ideas></div></section>`
      : `<p class="more">Still deciding? <button type="button" data-ideas-link>Get name ideas</button></p>`}</div>`;
}
