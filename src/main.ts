import { CHECKS } from './checks';
import { blink, setBusy, startEyes } from './eyes';
import { mark } from './html';
import { DEFAULT_STYLE, isStyle, mountIdeas } from './ideas';
import { slugify } from './mock';
import type { NameStyle } from './types';
import { checkReplyHTML, turnHTML, verdict } from './views';

const $ = <T extends HTMLElement = HTMLElement>(s: string): T => {
  const el = document.querySelector<T>(s);
  if (!el) throw new Error(`Missing element: ${s}`);
  return el;
};
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

const stage = $('#stage'), thread = $('#thread');
const input = $<HTMLInputElement>('#q');

startEyes();

/* ---------- prompt cycle ---------- */
const spans = [...document.querySelectorAll<HTMLElement>('#prompt span')];
let pi = 0;
setInterval(() => {
  if (stage.classList.contains('chatting') || reduce || spans.length < 2) return;
  const cur = spans[pi]!; pi = (pi + 1) % spans.length; const nx = spans[pi]!;
  cur.classList.remove('on'); cur.classList.add('off');
  nx.classList.remove('off'); nx.classList.add('on');
  setTimeout(() => cur.classList.remove('off'), 600);
}, 3400);

/* ---------- input mode: check a name, or ask for ideas ---------- */
type Mode = 'check' | 'ideas';
let mode: Mode = 'check';

function setMode(next: Mode): void {
  mode = next;
  const ideas = mode === 'ideas';
  input.placeholder = ideas ? 'What does it do? A word or two…' : 'Type a name…';
  input.setAttribute('aria-label', ideas ? 'What your startup does' : 'Startup name');
  $('#mode-q').textContent = ideas ? 'Have a name?' : 'No name yet?';
  $('#mode-btn').textContent = ideas ? 'Check it' : 'Get name ideas';
}

/* ---------- thread ---------- */
/** Runs a DOM change as a view transition where supported, so the field glides to the bottom. */
function transition(change: () => void): void {
  if (reduce || !('startViewTransition' in document)) change();
  else document.startViewTransition(change);
}

/** Adds what the user sent to the thread and returns the empty reply under it. */
function addTurn(text: string): HTMLElement {
  const turn = document.createElement('article');
  turn.className = 'turn';
  turn.innerHTML = turnHTML(text);
  if (stage.classList.contains('chatting')) thread.append(turn);
  else transition(() => { stage.classList.add('chatting'); thread.append(turn); });
  requestAnimationFrame(() => turn.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'start'}));
  return turn.querySelector<HTMLElement>('.reply')!;
}

let pending = 0;

async function check(raw: string): Promise<void> {
  const name = raw.trim();
  if (!slugify(name)) return;
  history.replaceState(null, '', `?q=${encodeURIComponent(name)}`);
  document.title = `Is ${name} taken? · Wiskr`;

  const reply = addTurn(name);
  reply.innerHTML = checkReplyHTML();
  setBusy(++pending > 0);

  try {
    const results = await Promise.all(CHECKS.map(async c => {
      const result = await c.run(name, {instant: reduce});
      const row = reply.querySelector(`[data-check="${c.key}"]`);
      if (row) {
        row.querySelector('.st')!.innerHTML = mark(result.summary.kind);
        row.querySelector('.res')!.textContent = result.summary.v;
        row.querySelector('.chk-c')!.innerHTML = result.body;
        row.querySelector<HTMLButtonElement>('.chk-h')!.disabled = false;
      }
      return result;
    }));
    if (!reduce) await sleep(300);

    const {taken, why} = verdict(results.map(r => r.summary));
    const head = reply.querySelector<HTMLElement>('.verdict')!;
    head.className = `verdict ${taken ? 'bad' : 'ok'}`;
    head.textContent = taken ? 'Taken.' : 'Available.';
    const reason = reply.querySelector<HTMLElement>('.why')!;
    reason.innerHTML = why; reason.hidden = false;
    if (taken) {
      mountIdeas(reply.querySelector<HTMLElement>('[data-ideas]')!, name,
        {heading: 'Try something else', limit: 4, onPick: picked => void check(picked)});
    }
    blink();
  } catch (err) {
    console.error(err);
    reply.innerHTML = '<div class="empty">Something went wrong while checking that name. Send it again to retry.</div>';
  } finally {
    setBusy(--pending > 0);
  }
}

function ideas(raw: string, style: NameStyle = DEFAULT_STYLE): void {
  const seed = raw.trim();
  if (!slugify(seed)) return;
  history.replaceState(null, '', `?ideas=${encodeURIComponent(seed)}${style === DEFAULT_STYLE ? '' : `&style=${style}`}`);
  document.title = `Name ideas for ${seed} · Wiskr`;

  const reply = addTurn(seed);
  reply.innerHTML = '<div data-ideas></div>';
  mountIdeas(reply.querySelector<HTMLElement>('[data-ideas]')!, seed,
    {heading: 'Pick a style', style, onPick: picked => void check(picked)});
}

function reset(): void {
  history.replaceState(null, '', location.pathname);
  document.title = 'Wiskr';
  setMode('check');
  transition(() => { stage.classList.remove('chatting'); thread.replaceChildren(); });
  input.value = ''; input.focus();
}

/* ---------- events ---------- */
$('#form').addEventListener('submit', e => {
  e.preventDefault();
  const value = input.value;
  if (!slugify(value)) return;
  input.value = '';
  if (mode === 'ideas') { setMode('check'); ideas(value); }
  else void check(value);
});
$('#mode-btn').addEventListener('click', () => { setMode(mode === 'ideas' ? 'check' : 'ideas'); input.focus(); });
document.querySelectorAll<HTMLElement>('[data-ex]').forEach(b => b.addEventListener('click', () => void check(b.dataset.ex ?? '')));
$('#home-btn').addEventListener('click', reset);

// Open or close a check's detail
thread.addEventListener('click', e => {
  const h = (e.target as Element).closest<HTMLButtonElement>('.chk-h');
  if (!h) return;
  const open = h.getAttribute('aria-expanded') !== 'true';
  h.setAttribute('aria-expanded', String(open));
  h.parentElement!.querySelector<HTMLElement>('.chk-c')!.hidden = !open;
});

/* ---------- shared links ---------- */
const params = new URLSearchParams(location.search);
const q = params.get('q'), seed = params.get('ideas'), style = params.get('style');
if (q) void check(q);
else if (seed) ideas(seed, isStyle(style) ? style : DEFAULT_STYLE);
