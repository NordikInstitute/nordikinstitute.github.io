// Scroll reveals and count-ups, registered only when motion is allowed.
//   [data-anim]          one-shot rise-in
//   [data-anim-group]    children rise in sequence
//   [data-count]         number counts up from zero

import { parseFigure } from './data.js';

const { gsap, ScrollTrigger } = window;

export const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function countUp(el) {
  const f = parseFigure(el.dataset.count);
  if (!f) return;
  const final = el.textContent;
  const state = { v: 0 };
  el.textContent = '0';
  gsap.to(state, {
    v: f.n, duration: 1.8, ease: 'power3.out',
    onUpdate: () => { el.textContent = f.prefix + Math.round(state.v) + f.suffix; },
    onComplete: () => { el.textContent = final; },
    // Starts just before the figure is visible, so a "0" is never seen.
    scrollTrigger: { trigger: el, start: 'top bottom+=80', once: true },
  });
}

export function initMotion() {
  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    gsap.utils.toArray('[data-anim]').forEach((el) => {
      gsap.from(el, { y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    gsap.utils.toArray('[data-anim-group]').forEach((group) => {
      gsap.from(group.children, { y: 32, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: group, start: 'top 88%', once: true } });
    });
    gsap.utils.toArray('[data-count]').forEach(countUp);
  });
}

export function refreshOnSettle() {
  const refresh = () => ScrollTrigger.refresh();
  if (document.readyState === 'complete') refresh(); else window.addEventListener('load', refresh, { once: true });
  document.fonts?.ready.then(refresh);
}
