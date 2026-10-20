// Declarative scroll motion. Markup opts in with data attributes; everything
// is registered inside gsap.matchMedia so it is reverted for reduced motion.
//   [data-anim="up|left|right|fade|scale"]   one-shot reveal
//   [data-anim-group="stagger"]              children reveal in sequence
//   [data-lines]                             .ln > span masked line reveal
//   [data-scrub]                             words fill in as you scroll
//   [data-count="n"]                         number counts up once
//   [data-goal]                              rule draws, bar fills
//   [data-chapter]                           light sheet opens out of a card
//   [data-magnetic="strength"]               button follows the pointer

import { parseFigure } from './data.js';

const { gsap, ScrollTrigger } = window;
export const EASE = 'expo.out';
export const DUR = 1.05;
const START = 'top 86%';
const VARIANTS = { up: { y: 48 }, left: { x: -56 }, right: { x: 56 }, fade: {}, scale: { scale: 0.94 } };

export const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Wrap each word of an element's text in span.w, keeping inline markup.
export function splitWords(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const parts = node.textContent.split(/(\s+)/);
    const frag = document.createDocumentFragment();
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { frag.append(' '); continue; }
      const w = document.createElement('span');
      w.className = 'w';
      w.textContent = part;
      frag.append(w);
    }
    node.replaceWith(frag);
  }
  return root.querySelectorAll('.w');
}

export function formatFigure(f, value) {
  const fixed = value.toFixed(f.decimals);
  const out = f.grouped ? Number(fixed).toLocaleString('en-CA', { minimumFractionDigits: f.decimals, maximumFractionDigits: f.decimals }) : fixed;
  return f.prefix + out + f.suffix;
}

// Count an element's text up from zero to the figure it already shows.
// Starts just before the figure scrolls into view, so a pre-count "0" is never
// visible. The 80px lead covers parents measured mid-reveal (y offsets ≤ 48px).
export function countUp(el, { duration = 1.6, delay = 0, trigger = el, start = 'top bottom+=80' } = {}) {
  const raw = el.dataset.count ?? el.textContent;
  const f = parseFigure(raw);
  if (!f || prefersReduced()) return;
  const finalText = el.textContent;
  const state = { v: 0 };
  el.textContent = formatFigure(f, 0);
  return gsap.to(state, {
    v: f.n, duration, delay, ease: 'power3.out',
    onUpdate: () => { el.textContent = formatFigure(f, state.v); },
    onComplete: () => { el.textContent = finalText; },
    scrollTrigger: trigger ? { trigger, start, once: true } : undefined,
  });
}

export function initMotion(scope = document) {
  const mm = gsap.matchMedia();
  mm.add({ motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 861px)' }, (ctx) => {
    const { motion, desktop } = ctx.conditions;
    if (!motion) return;

    gsap.utils.toArray('[data-anim]', scope).forEach((el) => {
      const v = VARIANTS[el.dataset.anim] ?? VARIANTS.up;
      gsap.from(el, { ...v, opacity: 0, duration: DUR, ease: EASE, delay: parseFloat(el.dataset.animDelay) || 0, scrollTrigger: { trigger: el, start: START, once: true } });
    });

    gsap.utils.toArray('[data-anim-group]', scope).forEach((group) => {
      const kids = gsap.utils.toArray(':scope > *', group);
      if (!kids.length) return;
      gsap.from(kids, { y: 36, opacity: 0, duration: DUR, ease: EASE, stagger: parseFloat(group.dataset.animGroup) || 0.08, scrollTrigger: { trigger: group, start: START, once: true } });
    });

    gsap.utils.toArray('[data-lines]', scope).forEach((el) => {
      if (el.closest('.hero')) return; // the hero plays its own entrance
      const lines = el.querySelectorAll('.ln > span');
      gsap.from(lines, { yPercent: 112, rotate: 2.5, duration: 1.25, ease: EASE, stagger: 0.1, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });

    gsap.utils.toArray('[data-count]', scope).forEach((el) => countUp(el));

    gsap.utils.toArray('[data-goal]', scope).forEach((row) => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 88%', once: true } });
      tl.fromTo(row, { '--rule': 0 }, { '--rule': 1, duration: 1.1, ease: 'power3.inOut' })
        .from(row.querySelector('.goal__bar span'), { scaleX: 0, duration: 1.4, ease: 'power3.out' }, 0.25)
        .from(row.querySelectorAll('.goal__k, .goal__text'), { y: 24, opacity: 0, duration: 0.9, ease: EASE, stagger: 0.08 }, 0.1);
    });

    // Scroll-scrubbed word fill: each word brightens as the paragraph crosses the viewport.
    gsap.utils.toArray('[data-scrub]', scope).forEach((el) => {
      const words = el.querySelectorAll('.w');
      if (desktop) {
        gsap.fromTo(words, { opacity: 0.16 }, { opacity: 1, ease: 'none', stagger: 0.12, scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 52%', scrub: 0.6 } });
      } else {
        gsap.from(el, { y: 24, opacity: 0, duration: DUR, ease: EASE, scrollTrigger: { trigger: el, start: START, once: true } });
      }
    });

    // The light chapter grows from an inset card to full bleed as it arrives.
    gsap.utils.toArray('[data-chapter]', scope).forEach((sheet) => {
      gsap.fromTo(sheet,
        { clipPath: desktop ? 'inset(0% 4% 0% 4% round 36px)' : 'inset(0% 3% 0% 3% round 24px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: sheet, start: 'top bottom', end: 'top 25%', scrub: true } });
    });

    if (desktop && window.matchMedia('(pointer: fine)').matches) {
      gsap.utils.toArray('[data-magnetic]', scope).forEach(magnetic);
    }
  });
  return mm;
}

function magnetic(el) {
  const strength = parseFloat(el.dataset.magnetic) || 0.3;
  const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
  const move = (e) => {
    const r = el.getBoundingClientRect();
    xTo((e.clientX - (r.left + r.width / 2)) * strength);
    yTo((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => { xTo(0); yTo(0); };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', reset);
  el.addEventListener('blur', reset);
}

// Refresh trigger positions once late-loading fonts settle the layout.
export function refreshOnSettle() {
  const refresh = () => ScrollTrigger.refresh();
  if (document.readyState === 'complete') refresh(); else window.addEventListener('load', refresh, { once: true });
  document.fonts?.ready.then(refresh);
}
