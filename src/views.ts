// Thread markup: one turn per thing the user sends, with the answer underneath.

import { CHECKS, isTaken, type Summary } from './checks';
import { CHEV, esc } from './html';

export function turnHTML(text: string): string {
  return `<div class="you">${esc(text)}</div><div class="reply"></div>`;
}

/** The answer to a name check, in its waiting state. Rows fill in as each check resolves. */
export function checkReplyHTML(): string {
  return `<h2 class="verdict wait">Sniffing around<span class="dots"></span></h2>
    <p class="why" hidden></p>
    <div class="checks">${CHECKS.map(c => `<div class="chk" data-check="${c.key}">
      <button type="button" class="chk-h" aria-expanded="false" disabled><span class="st"><span class="spin"></span></span><span class="lbl">${c.label}</span><span class="res"></span>${CHEV}</button>
      <div class="chk-c" hidden></div></div>`).join('')}</div>
    <div data-ideas></div>`;
}

export function verdict(summaries: Summary[]): {taken: boolean; why: string} {
  const bad = summaries.filter(s => s.kind === 'bad'), warn = summaries.filter(s => s.kind === 'warn');
  const taken = isTaken(summaries);
  const why = taken ? `Blocked by <b>${bad.map(s => esc(s.why)).join('</b>, <b>')}</b>.`
    : warn.length ? `Nothing blocks you. Heads up: ${warn.map(s => esc(s.why)).join(', ')}.`
    : 'Nothing blocks you. Register the domain and handles before you announce.';
  return {taken, why};
}
