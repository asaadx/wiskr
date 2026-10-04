// Small HTML string helpers shared by the views.

import type { Kind } from './types';

const ENTITIES: Record<string, string> = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'};
export const esc = (s: unknown): string => String(s).replace(/[&<>"]/g, c => ENTITIES[c] ?? c);

const ICON: Record<Kind, string> = {
  ok:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 6v8"/><path d="M12 18.5v.01"/></svg>',
  bad:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M7 7l10 10M17 7L7 17"/></svg>',
};

export const CHEV = '<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

export const mark = (k: Kind): string => `<span class="mark m-${k}">${ICON[k]}</span>`;
export const badge = (k: Kind | 'neutral', t: string): string => `<span class="badge b-${k}">${t}</span>`;
