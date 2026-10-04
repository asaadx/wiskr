// Name ideas: pick a naming style, get names that have already been through every check.

import { api } from './api';
import { CHECKS, vet, type Summary } from './checks';
import { badge, esc } from './html';
import type { NameStyle, Suggestion } from './types';

/** Each style is shown by a well-known name of that kind. */
export const STYLES: {key: NameStyle; ex: string; label: string}[] = [
  {key: 'latin', ex: 'Lumora', label: 'Latin root'},
  {key: 'everyday', ex: 'Flow', label: 'Everyday word'},
  {key: 'borrowed', ex: 'Amazon', label: 'Borrowed word'},
  {key: 'invented', ex: 'Google', label: 'Invented'},
];

export const DEFAULT_STYLE: NameStyle = 'latin';
export const isStyle = (s: string | null): s is NameStyle => STYLES.some(x => x.key === s);

interface Vetted extends Suggestion {
  summaries: Summary[];
  taken: boolean;
}

interface IdeasOptions {
  style?: NameStyle;
  onPick: (name: string) => void;
  onStyle?: (style: NameStyle) => void;
}

const GO = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>';

export function ideasPageHTML(seed: string): string {
  return `<div class="ideas-page">
    <h2 class="scan-title">What does it do?</h2>
    <form class="search" id="seed-form" autocomplete="off">
      <input id="seed" name="seed" value="${esc(seed)}" placeholder="A word or two, like payments or dog food" maxlength="40" aria-label="What your startup does">
      <button class="go" type="submit" aria-label="Get name ideas">${GO}</button>
    </form>
    <div data-ideas></div></div>`;
}

const stylesHTML = (active: NameStyle) => `<div class="styles" role="group" aria-label="Name style">${STYLES.map(s =>
  `<button type="button" class="style" data-style="${s.key}" aria-pressed="${s.key === active}"><span class="ex">${s.ex}</span><span class="lb">${s.label}</span></button>`).join('')}</div>`;

function rowHTML(s: Vetted): string {
  const dots = s.summaries.map((sum, i) => `<i class="dot d-${sum.kind}" title="${esc(`${CHECKS[i]?.k ?? ''}: ${sum.v}`)}"></i>`).join('');
  const clear = s.summaries.filter(x => x.kind === 'ok').length;
  return `<button type="button" class="sug" data-pick="${esc(s.name)}">
    <span class="main"><span class="nm">${esc(s.name)}</span><span class="or">${esc(s.origin)}</span></span>
    <span class="dots" role="img" aria-label="${clear} of ${s.summaries.length} checks clear">${dots}</span>
    ${s.taken ? badge('bad', 'Taken') : badge('ok', 'Available')}</button>`;
}

const loadingHTML = '<div class="sug-wait"><span class="spin"></span>Finding names and checking each one</div>';

let seq = 0;

/** Renders the style picker and vetted suggestions into `el`. Only one panel is live at a time. */
export function mountIdeas(el: HTMLElement, seed: string, {style = DEFAULT_STYLE, onPick, onStyle}: IdeasOptions): void {
  let active = style;
  el.innerHTML = `${stylesHTML(active)}<div class="sugs" aria-live="polite"></div>`;
  const list = el.querySelector<HTMLElement>('.sugs')!;

  async function load(): Promise<void> {
    const id = ++seq;
    list.innerHTML = loadingHTML;
    try {
      const names = await api.suggest(seed, active);
      const vetted: Vetted[] = await Promise.all(names.map(async s => ({...s, ...await vet(s.name, {instant: true})})));
      if (id !== seq || !el.isConnected) return;
      // Available names first, otherwise keep the generator's order
      const sorted = [...vetted.filter(v => !v.taken), ...vetted.filter(v => v.taken)];
      list.innerHTML = sorted.length ? sorted.map(rowHTML).join('')
        : '<div class="empty">No names came back for that. Try a different word or another style.</div>';
    } catch (err) {
      if (id !== seq || !el.isConnected) return;
      console.error(err);
      list.innerHTML = '<div class="empty">Couldn’t load name ideas. Pick the style again to retry.</div>';
    }
  }

  el.onclick = e => {
    const target = e.target as Element;
    const pickBtn = target.closest<HTMLElement>('[data-pick]');
    if (pickBtn?.dataset.pick) { onPick(pickBtn.dataset.pick); return; }
    const styleBtn = target.closest<HTMLElement>('[data-style]');
    const next = styleBtn?.dataset.style ?? null;
    if (!isStyle(next)) return;
    active = next;
    el.querySelectorAll('[data-style]').forEach(b => b.setAttribute('aria-pressed', String(b === styleBtn)));
    onStyle?.(active);
    void load();
  };

  void load();
}
