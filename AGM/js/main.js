// NORDIK Institute — AGM 2025–2026. Boot order:
// data -> intro (counts poster thumbnails as they load) -> render sections ->
// motion -> mosaic built behind the overlay -> wipe -> hero entrance.

import { loadProjects, bySlug } from './data.js';
import { startIntro } from './intro.js';
import { initMotion, splitWords, refreshOnSettle, prefersReduced } from './motion.js';
import { createMosaic } from './mosaic.js';
import { initShelf } from './shelf.js';
import { initStory } from './dialog.js';
import { renderThemes, renderPartners, renderEvidence, renderPeople, initPauseButtons } from './sections.js';
import { initThanks } from './dotfield.js';
import { initNav } from './nav.js';
import { notice } from './util.js';

const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);

function abortIntro() {
  document.documentElement.classList.remove('is-intro', 'is-locked');
  document.getElementById('intro')?.remove();
}

function heroEntrance(reduced) {
  const hero = document.getElementById('top');
  if (reduced) return;
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  // Children only: the containers are faded by the scroll scrub below.
  tl.from(hero.querySelectorAll('.hero__headline .ln > span'), { yPercent: 115, rotate: 3, duration: 1.4, stagger: 0.1 }, 0.35)
    .from(hero.querySelectorAll('.hero__top > span, .hero__sub, .hero__actions > *'), { y: 22, opacity: 0, duration: 1.1, stagger: 0.06 }, 0.55)
    .from('.scroll-cue', { opacity: 0, duration: 1 }, 1.2);
}

async function boot() {
  const reduced = prefersReduced();

  let projects;
  try {
    projects = await loadProjects();
  } catch (err) {
    console.error(err);
    abortIntro();
    notice('The research data could not be loaded. Please reload the page.', 0);
    return;
  }
  const map = bySlug(projects);

  // Intro counts all twelve; the mosaic uses only the posters that are not
  // flagged sensitive (no fragments of Residential Schools material as decoration).
  const intro = startIntro(projects.map((p) => p.thumb));

  renderThemes(projects);
  renderPartners(projects);
  renderEvidence(map);
  renderPeople(projects);
  initPauseButtons();
  document.querySelectorAll('[data-scrub]').forEach(splitWords);

  const story = initStory({ projects, map });
  initShelf({ projects });
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open]');
    if (t && !t.closest('dialog')) story.open(t.dataset.open);
  });

  initNav();
  initMotion();

  const images = await intro.images;
  await document.fonts?.ready;
  const posterImgs = projects.map((p, i) => (p.sensitive ? null : images[i])).filter(Boolean);
  const canvas = document.getElementById('mosaic');
  let mosaic = null;
  if (posterImgs.length) {
    try {
      mosaic = createMosaic({ canvas, stage: document.getElementById('hero-stage'), images: posterImgs, reduced });
    } catch (err) {
      console.warn('[mosaic] disabled:', err);
    }
  }
  if (!mosaic) document.getElementById('top').classList.add('no-mosaic');

  await intro.exit({
    onWipe: () => {
      mosaic?.play();
      heroEntrance(reduced);
    },
  });

  if (mosaic && !reduced) {
    ScrollTrigger.create({
      trigger: '#top', start: 'top top', end: 'bottom top', scrub: true,
      onUpdate: (self) => mosaic.setScatter(self.progress),
    });
    gsap.to('.hero__bottom, .hero__top', { yPercent: -30, opacity: 0, ease: 'none', scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom 20%', scrub: true } });
  }

  initThanks(document.getElementById('thanks-canvas'), { reduced });
  refreshOnSettle();
  ScrollTrigger.refresh();

  const deep = location.hash.match(/^#story\/([\w-]+)/);
  if (deep && map[deep[1]]) story.open(deep[1]);
  window.addEventListener('hashchange', () => {
    const m = location.hash.match(/^#story\/([\w-]+)/);
    if (m && map[m[1]] && !story.isOpen()) story.open(m[1]);
  });

  // Exposed for automated checks (tools/verify-site.mjs).
  window.__agm = { ready: true, webgl: mosaic?.webgl ?? false, tiles: mosaic?.tiles() ?? 0, projects: projects.length };
}

boot();
