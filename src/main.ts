import './styles.css';
// Tabler has no filled "at" icon
import iconAt from '@tabler/icons/outline/at.svg?raw';
import iconSearch from '@tabler/icons/filled/search.svg?raw';
import iconTrademark from '@tabler/icons/filled/registered.svg?raw';
import iconWorld from '@tabler/icons/filled/world.svg?raw';
import { CHECKS, type CheckResult } from './checks';
import { blink, mountEyes, setBusy } from './eyes';
import { mark } from './html';
import { DEFAULT_STYLE, ideasPageHTML, isStyle, mountIdeas } from './ideas';
import { slugify } from './mock';
import type { NameStyle } from './types';
import { reportHTML, scanHTML } from './views';

const $ = <T extends HTMLElement = HTMLElement>(s: string): T => {
  const el = document.querySelector<T>(s);
  if (!el) throw new Error(`Missing element: ${s}`);
  return el;
};
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

const home = $('#home'), app = $('#app'), results = $('#results');
const q1 = $<HTMLInputElement>('#q1'), q2 = $<HTMLInputElement>('#q2');

mountEyes();

const ICONS: Record<string, string> = {at: iconAt, search: iconSearch, trademark: iconTrademark, world: iconWorld};
document.querySelectorAll<HTMLElement>('[data-icon]').forEach(el => {
  const svg = ICONS[el.dataset.icon ?? ''];
  if (svg) el.outerHTML = svg.replace('<svg', '<svg aria-hidden="true"');
});

/* ---------- prompt cycle ---------- */
const spans = [...document.querySelectorAll<HTMLElement>('#prompt span')];
let pi = 0;
setInterval(() => {
  if (home.hidden || reduce || spans.length < 2) return;
  const cur = spans[pi]!; pi = (pi + 1) % spans.length; const nx = spans[pi]!;
  cur.classList.remove('on'); cur.classList.add('off');
  nx.classList.remove('off'); nx.classList.add('on');
  setTimeout(() => cur.classList.remove('off'), 600);
}, 3400);

/* ---------- views ---------- */
let run = 0;

function showHome(): void {
  run++; setBusy(false);
  app.hidden = true; home.hidden = false;
  document.title = 'Wiskr';
  q1.value = ''; q1.focus();
}

async function check(raw: string, {push = true} = {}): Promise<void> {
  const name = raw.trim(), slug = slugify(name);
  if (!slug) return;
  const id = ++run;
  if (push) history.pushState(null, '', `?q=${encodeURIComponent(name)}`);
  document.title = `Is ${name} taken? · Wiskr`;

  home.hidden = true; app.hidden = false;
  q2.value = name;
  results.innerHTML = scanHTML(name);
  window.scrollTo(0, 0);
  setBusy(true);

  let done: CheckResult[];
  try {
    done = await Promise.all(CHECKS.map(async c => {
      const result = await c.run(name, {instant: reduce});
      const row = id === run ? results.querySelector(`[data-check="${c.key}"]`) : null;
      if (row) {
        const {kind, res} = result.summary;
        row.querySelector('.st')!.innerHTML = mark(kind);
        const out = row.querySelector<HTMLElement>('.res')!;
        out.textContent = res; out.style.color = `var(--${kind})`;
        row.classList.add('done');
      }
      return result;
    }));
    if (!reduce) await sleep(450);
  } catch (err) {
    if (id !== run) return;
    console.error(err);
    setBusy(false);
    results.innerHTML = '<div class="empty">Something went wrong while checking that name. Try again.</div>';
    return;
  }
  if (id !== run) return;
  setBusy(false); blink();
  results.innerHTML = reportHTML(name, slug, done);
  const slot = results.querySelector<HTMLElement>('[data-ideas]');
  if (slot) mountIdeas(slot, name, {onPick: picked => void check(picked)});
}

const ideasURL = (seed: string, style: NameStyle) =>
  `?ideas=${encodeURIComponent(seed)}${style === DEFAULT_STYLE ? '' : `&style=${style}`}`;

function showIdeas(rawSeed: string, style: NameStyle = DEFAULT_STYLE, {push = true} = {}): void {
  const seed = slugify(rawSeed) ? rawSeed.trim() : '';
  run++; setBusy(false);
  if (push) history.pushState(null, '', ideasURL(seed, style));
  document.title = seed ? `Name ideas for ${seed} · Wiskr` : 'Name ideas · Wiskr';

  home.hidden = true; app.hidden = false;
  q2.value = '';
  results.innerHTML = ideasPageHTML(seed);
  window.scrollTo(0, 0);

  const input = $<HTMLInputElement>('#seed');
  let current = style;
  $('#seed-form').addEventListener('submit', e => {
    e.preventDefault();
    if (slugify(input.value)) showIdeas(input.value, current);
  });
  if (!seed) { input.focus(); return; }
  mountIdeas(results.querySelector<HTMLElement>('[data-ideas]')!, seed, {
    style,
    onPick: picked => void check(picked),
    onStyle: next => { current = next; history.replaceState(null, '', ideasURL(seed, next)); },
  });
}

function route(): void {
  const params = new URLSearchParams(location.search);
  const q = params.get('q'), ideas = params.get('ideas'), style = params.get('style');
  if (q && slugify(q)) void check(q, {push: false});
  else if (ideas !== null) showIdeas(ideas, isStyle(style) ? style : DEFAULT_STYLE, {push: false});
  else showHome();
}

/* ---------- events ---------- */
function setOpen(sec: Element, open: boolean): void {
  sec.querySelector('.sec-h')!.setAttribute('aria-expanded', String(open));
  sec.querySelector<HTMLElement>('.sec-c')!.hidden = !open;
}
results.addEventListener('click', e => {
  const target = e.target as Element;
  const h = target.closest('.sec-h');
  if (h) { setOpen(h.closest('.sec')!, h.getAttribute('aria-expanded') !== 'true'); return; }
  if (target.closest('[data-ideas-link]')) { showIdeas(''); return; }
  const t = target.closest<HTMLElement>('[data-jump]');
  const s = t?.dataset.jump ? document.getElementById(t.dataset.jump) : null;
  if (s) {
    setOpen(s, true);
    const y = s.getBoundingClientRect().top + scrollY - 80;
    window.scrollTo({top: y, behavior: reduce ? 'auto' : 'smooth'});
  }
});
$('#f1').addEventListener('submit', e => { e.preventDefault(); void check(q1.value); });
$('#f2').addEventListener('submit', e => { e.preventDefault(); void check(q2.value); });
document.querySelectorAll<HTMLElement>('[data-ex]').forEach(b => b.addEventListener('click', () => {
  const ex = b.dataset.ex ?? '';
  q1.value = ex; void check(ex);
}));
$('#ideas-btn').addEventListener('click', () => showIdeas(''));
$('#home-btn').addEventListener('click', () => { history.pushState(null, '', location.pathname); showHome(); });
addEventListener('popstate', route);

route();
