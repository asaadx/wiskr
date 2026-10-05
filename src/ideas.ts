// Name ideas: pick a naming style, get names that have already been through every check.

import { api } from './api';
import { vet } from './checks';
import { badge, esc } from './html';
import type { NameStyle, Suggestion } from './types';

export const STYLES: {key: NameStyle; label: string}[] = [
  {key: 'latin', label: 'Latin root'},
  {key: 'everyday', label: 'Everyday word'},
  {key: 'borrowed', label: 'Borrowed word'},
  {key: 'invented', label: 'Invented'},
];

export const DEFAULT_STYLE: NameStyle = 'latin';
export const isStyle = (s: string | null | undefined): s is NameStyle => STYLES.some(x => x.key === s);

interface Vetted extends Suggestion {
  taken: boolean;
}

interface IdeasOptions {
  heading: string;
  style?: NameStyle;
  /** How many names to show */
  limit?: number;
  onPick: (name: string) => void;
}

const stylesHTML = (active: NameStyle) => `<div class="styles" role="group" aria-label="Name style">${STYLES.map(s =>
  `<button type="button" class="style" data-style="${s.key}" aria-pressed="${s.key === active}">${s.label}</button>`).join('')}</div>`;

const rowHTML = (s: Vetted) => `<button type="button" class="sug" data-pick="${esc(s.name)}">
  <span class="nm">${esc(s.name)}</span><span class="or">${esc(s.origin)}</span>
  ${s.taken ? badge('bad', 'Taken') : badge('ok', 'Available')}</button>`;

const loadingHTML = '<div class="sug-wait"><span class="spin"></span>Finding names and checking each one</div>';

/** Renders the style picker and pre-checked suggestions into `el`. */
export function mountIdeas(el: HTMLElement, seed: string, {heading, style = DEFAULT_STYLE, limit = 6, onPick}: IdeasOptions): void {
  let active = style, seq = 0;
  el.className = 'ideas';
  el.innerHTML = `<h3 class="ideas-h">${esc(heading)}</h3>${stylesHTML(active)}<div class="sugs"></div>`;
  const list = el.querySelector<HTMLElement>('.sugs')!;

  async function load(): Promise<void> {
    const id = ++seq;
    list.innerHTML = loadingHTML;
    try {
      const names = await api.suggest(seed, active);
      const vetted: Vetted[] = await Promise.all(names.map(async s => ({...s, taken: await vet(s.name, {instant: true})})));
      if (id !== seq) return;
      // Available names first, otherwise keep the generator's order
      const sorted = [...vetted.filter(v => !v.taken), ...vetted.filter(v => v.taken)].slice(0, limit);
      list.innerHTML = sorted.length ? sorted.map(rowHTML).join('')
        : '<div class="empty">No names came back for that. Try a different word or another style.</div>';
    } catch (err) {
      if (id !== seq) return;
      console.error(err);
      list.innerHTML = '<div class="empty">Couldn’t load name ideas. Pick the style again to retry.</div>';
    }
  }

  el.onclick = e => {
    const target = e.target as Element;
    const pickBtn = target.closest<HTMLElement>('[data-pick]');
    if (pickBtn?.dataset.pick) { onPick(pickBtn.dataset.pick); return; }
    const styleBtn = target.closest<HTMLElement>('[data-style]');
    const next = styleBtn?.dataset.style;
    if (!isStyle(next) || next === active) return;
    active = next;
    el.querySelectorAll('[data-style]').forEach(b => b.setAttribute('aria-pressed', String(b === styleBtn)));
    void load();
  };

  void load();
}
