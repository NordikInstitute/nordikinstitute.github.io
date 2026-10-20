// The research shelf. Wide screens with motion allowed: the section pins and
// vertical scroll moves the posters sideways, with cards ahead of the active
// one stepping back slightly. Otherwise: a native swipe rail with snapping.

import { esc, fragment } from './util.js';

const { gsap } = window;

function card(p) {
  const veil = p.sensitive ? '<div class="card__veil"><b>Content note</b><span>Residential Schools. Open to read with care.</span></div>' : '';
  return `
  <article class="card${p.sensitive ? ' card--note' : ''}" role="listitem">
    <div class="card__media">
      <img src="${esc(p.thumb)}" alt="${p.sensitive ? '' : `Poster: ${esc(p.title)}`}" width="640" height="853" loading="lazy" decoding="async">
      ${veil}
    </div>
    <p class="card__num">${p.num}</p>
    <h3 class="card__title"><button class="card__link" type="button" data-open="${esc(p.slug)}">${esc(p.shortTitle)}</button></h3>
    <p class="card__theme">${esc(p.categoryLabel)}</p>
  </article>`;
}

export function initShelf({ projects }) {
  const pinEl = document.getElementById('shelf-pin');
  const viewport = document.getElementById('shelf-viewport');
  const track = document.getElementById('shelf-track');
  const countEl = document.getElementById('shelf-count');
  const prev = document.getElementById('shelf-prev');
  const next = document.getElementById('shelf-next');
  const n = projects.length;
  track.append(fragment(projects.map(card).join('')));
  const cards = [...track.children];
  let active = 0;
  let pinTween = null;

  function setActive(i) {
    active = Math.max(0, Math.min(n - 1, i));
    countEl.textContent = `${String(active + 1).padStart(2, '0')} / ${n}`;
    prev.disabled = active === 0;
    next.disabled = active === n - 1;
    cards.forEach((c, k) => {
      if (pinTween && k > active) c.dataset.rack = String(Math.min(2, k - active));
      else delete c.dataset.rack;
    });
  }

  function goTo(i, focus = false) {
    const idx = Math.max(0, Math.min(n - 1, i));
    const behavior = window.matchMedia('(prefers-reduced-motion: no-preference)').matches ? 'smooth' : 'auto';
    if (pinTween) {
      const st = pinTween.scrollTrigger;
      window.scrollTo({ top: st.start + (st.end - st.start) * (idx / (n - 1)) + 1, behavior });
    } else {
      const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      viewport.scrollTo({ left: cards[idx].offsetLeft - pad, behavior });
    }
    setActive(idx);
    if (focus) cards[idx].querySelector('.card__link').focus({ preventScroll: true });
  }

  prev.addEventListener('click', () => goTo(active - 1));
  next.addEventListener('click', () => goTo(active + 1));
  track.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const from = cards.indexOf(e.target.closest('.card'));
    goTo((from < 0 ? active : from) + (e.key === 'ArrowRight' ? 1 : -1), true);
  });

  let raf = 0;
  viewport.addEventListener('scroll', () => {
    if (pinTween) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      let best = 0;
      let bestD = Infinity;
      cards.forEach((c, k) => {
        const d = Math.abs(c.offsetLeft - pad - viewport.scrollLeft);
        if (d < bestD) { bestD = d; best = k; }
      });
      setActive(best);
    });
  }, { passive: true });

  gsap.matchMedia().add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
    // Travel until the last poster meets the right edge: no empty tail.
    const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
    pinTween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: pinEl, start: 'top top', end: () => `+=${distance()}`, pin: true, scrub: 0.7,
        anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: (self) => setActive(Math.round(self.progress * (n - 1))),
      },
    });
    setActive(active);
    return () => { pinTween = null; gsap.set(track, { clearProps: 'transform' }); setActive(active); };
  });

  setActive(0);
  return { goTo };
}
