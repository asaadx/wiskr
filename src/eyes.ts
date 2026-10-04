// The cat eyes: markup plus idle / busy behaviour.

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

let eyeN = 0;
function eyesSVG(): string {
  const n = eyeN++;
  return `<svg class="eyes" viewBox="0 0 120 48" aria-hidden="true">
    ${[32, 88].map(cx => {
      const lid = `M${cx - 24} 24 Q${cx} -2 ${cx + 24} 24 Q${cx} 50 ${cx - 24} 24 Z`;
      return `<g class="eye">
      <clipPath id="c${cx}${n}"><path d="${lid}"/></clipPath>
      <path class="lid" d="${lid}"/>
      <g clip-path="url(#c${cx}${n})">
        <circle class="iris" cx="${cx}" cy="24" r="15"/>
        <g class="look"><ellipse class="pupil" cx="${cx}" cy="24" rx="3.4" ry="12.5" style="transform-box:fill-box;transform-origin:center"/>
        <circle class="shine" cx="${cx + 5}" cy="18" r="2.4"/></g>
      </g>
      <path d="${lid}" fill="none" stroke="var(--fg)" stroke-width="1.6"/>
    </g>`;}).join('')}</svg>`;
}

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

export function mountEyes(): void {
  document.querySelectorAll('[data-eyes]').forEach(el => { el.outerHTML = eyesSVG(); });
  if (!reduce) setTimeout(idle, 1600);
}
