// The cat eyes: idle / busy behaviour.

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const all = () => document.querySelectorAll<SVGSVGElement>('.eyes');

function look(x: number): void {
  document.querySelectorAll<SVGGElement>('.eyes .look').forEach(g => { g.style.transform = `translateX(${x}px)`; });
}

export function blink(): void {
  all().forEach(e => { e.classList.add('blink'); setTimeout(() => e.classList.remove('blink'), 120); });
}

function idle(): void {
  const r = Math.random();
  if (r < .6) { look(-8); setTimeout(() => look(8), 850); setTimeout(() => look(0), 1700); }
  else if (r < .85) blink();
  else { look(Math.random() < .5 ? -8 : 8); setTimeout(() => look(0), 1100); }
  setTimeout(idle, 3200 + Math.random() * 2800);
}

const DART = [-8, 8, -4, 6, 0];
let dart: ReturnType<typeof setInterval> | undefined;
export function setBusy(on: boolean): void {
  clearInterval(dart); dart = undefined;
  all().forEach(e => e.classList.toggle('busy', on));
  if (on && !reduce) { let i = 0; dart = setInterval(() => look(DART[i++ % DART.length] ?? 0), 260); }
  else look(0);
}

/** The eyes themselves are static markup in index.html, so they are there on first paint. */
export function startEyes(): void {
  if (!reduce) setTimeout(idle, 1600);
}
