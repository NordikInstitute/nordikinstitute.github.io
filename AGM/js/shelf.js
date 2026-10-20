// The research shelf. On wide screens with motion allowed, the section pins
// and vertical scroll drives the twelve posters sideways (one scroll pixel per
// pixel of travel); cards beyond the active one step back in a depth "rack".
// Elsewhere it is a native swipe rail with scroll snapping. Both modes share
// the HUD, prev/next buttons, arrow keys and theme highlighting.

import { esc, fragment } from './util.js';
import { categoryCounts } from './data.js';

const { gsap } = window;

function cardMarkup(p) {
  const metric = p.metrics?.[0];
  const veil = p.sensitive
    ? `<div class="card__veil"><b>Content note</b><span>Residential Schools. Open the story to read with care.</span></div>`
    : '';
  return `
  <article class="card${p.sensitive ? ' card--sensitive' : ''}" role="listitem" data-slug="${esc(p.slug)}" data-cat="${esc(p.category)}">
    <div class="card__media">
      <span class="card__num">${p.num} / 12</span>
      <img src="${esc(p.thumb)}" alt="${p.sensitive ? '' : `Poster: ${esc(p.title)}`}" width="640" height="853" loading="lazy" decoding="async">
      ${veil}
    </div>
    <p class="card__meta"><span>${esc(p.categoryLabel)}</span><span>${esc(p.status.split(';')[0])}</span></p>
    <h3 class="card__title"><button class="card__link" type="button" data-open="${esc(p.slug)}">${esc(p.shortTitle)}</button></h3>
    ${metric ? `<p class="card__metric"><b>${esc(metric[0])}</b> ${esc(metric[1])}</p>` : `<p class="card__metric">${esc(p.label)}</p>`}
  </article>`;
}

export function initShelf({ projects }) {
  const pinEl = document.getElementById('shelf-pin');
  const viewport = document.getElementById('shelf-viewport');
  const track = document.getElementById('shelf-track');
  const chipsEl = document.getElementById('shelf-chips');
  const matchEl = document.getElementById('shelf-match');
  const meter = document.getElementById('shelf-meter');
  const countEl = document.getElementById('shelf-count');
  const prev = document.getElementById('shelf-prev');
  const next = document.getElementById('shelf-next');
  const n = projects.length;

  track.append(fragment(projects.map(cardMarkup).join('')));
  const cards = [...track.children];
  // End panel: fills the space beside the last poster and points onward.
  track.append(fragment(`
    <div class="shelf__end" role="listitem">
      <p class="eyebrow eyebrow--plain">End of the shelf</p>
      <p class="shelf__end-title">Twelve posters. <span class="serif">Forty-plus</span> community collaborations.</p>
      <p class="lede">See the figures the projects report, then meet the researchers and partners behind them.</p>
      <div class="hero__ctas" style="justify-content:flex-start">
        <a class="btn btn--solid" href="#evidence">Evidence at a glance</a>
        <a class="btn btn--ghost" href="#people">Meet the people</a>
      </div>
    </div>`));

  chipsEl.append(fragment([
    `<button class="chip" type="button" aria-pressed="true" data-cat="all">All <sup>${n}</sup></button>`,
    ...categoryCounts(projects).map((c) => `<button class="chip" type="button" aria-pressed="false" data-cat="${c.key}">${esc(c.label)} <sup>${c.count}</sup></button>`),
  ].join('')));

  let active = 0;
  let pinTween = null;
  const pinned = () => !!pinTween;

  function setActive(i, progress) {
    active = Math.max(0, Math.min(n - 1, i));
    countEl.textContent = `${String(active + 1).padStart(2, '0')} / ${n}`;
    meter.style.transform = `scaleX(${(progress ?? active / (n - 1)).toFixed(4)})`;
    prev.disabled = active === 0;
    next.disabled = active === n - 1;
    cards.forEach((c, k) => {
      if (pinned() && k > active) c.dataset.rack = String(Math.min(2, k - active));
      else delete c.dataset.rack;
    });
  }

  function goTo(i, { focus = false } = {}) {
    const idx = Math.max(0, Math.min(n - 1, i));
    const smooth = window.matchMedia('(prefers-reduced-motion: no-preference)').matches ? 'smooth' : 'auto';
    if (pinned()) {
      const st = pinTween.scrollTrigger;
      window.scrollTo({ top: st.start + (st.end - st.start) * (idx / (n - 1)) + 1, behavior: smooth });
    } else {
      const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      viewport.scrollTo({ left: cards[idx].offsetLeft - pad, behavior: smooth });
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
    goTo((from < 0 ? active : from) + (e.key === 'ArrowRight' ? 1 : -1), { focus: true });
  });
  track.addEventListener('focusin', (e) => {
    const i = cards.indexOf(e.target.closest('.card'));
    if (i >= 0 && i !== active && !pinned()) setActive(i);
  });

  // Native rail: derive the active card from the scroll position (rAF-throttled).
  let raf = 0;
  viewport.addEventListener('scroll', () => {
    if (pinned()) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const max = viewport.scrollWidth - viewport.clientWidth;
      const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      let best = 0;
      let bestD = Infinity;
      cards.forEach((c, k) => {
        const d = Math.abs(c.offsetLeft - pad - viewport.scrollLeft);
        if (d < bestD) { bestD = d; best = k; }
      });
      setActive(best, max > 0 ? viewport.scrollLeft / max : 0);
    });
  }, { passive: true });

  // Theme highlighting dims the rest instead of removing cards, so the
  // pinned scroll distance never changes underneath the reader.
  chipsEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const cat = chip.dataset.cat;
    chipsEl.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    const hits = [];
    cards.forEach((c, k) => {
      const on = cat === 'all' || c.dataset.cat === cat;
      c.classList.toggle('is-dim', !on);
      if (on) hits.push(k);
    });
    matchEl.textContent = cat === 'all' ? '' : `${hits.length} ${hits.length === 1 ? 'story' : 'stories'} highlighted: ${hits.map((k) => projects[k].num).join(', ')}`;
    if (cat !== 'all' && hits.length) goTo(hits[0]);
  });

  const mm = gsap.matchMedia();
  mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
    const step = () => cards[1].offsetLeft - cards[0].offsetLeft;
    const distance = () => step() * (n - 1);
    pinTween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: pinEl,
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 0.7,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => setActive(Math.round(self.progress * (n - 1)), self.progress),
      },
    });
    setActive(active);
    return () => { pinTween = null; gsap.set(track, { clearProps: 'transform' }); setActive(active); };
  });

  setActive(0);
  return { goTo };
}
