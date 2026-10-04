import './styles.css';
import { CHECKS, type CheckResult } from './checks';
import { blink, mountEyes, setBusy } from './eyes';
import { mark } from './html';
import { slugify } from './mock';
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
}

function route(): void {
  const q = new URLSearchParams(location.search).get('q');
  if (q && slugify(q)) void check(q, {push: false}); else showHome();
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
$('#home-btn').addEventListener('click', () => { history.pushState(null, '', location.pathname); showHome(); });
addEventListener('popstate', route);

route();
