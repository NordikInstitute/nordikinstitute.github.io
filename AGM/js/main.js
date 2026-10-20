// NORDIK Institute — AGM 2025–2026.
// Boot: the hero (hook, point cloud) starts at once; the poster data loads
// in parallel and the orbit, story dialog and poster wall join as soon as it lands.

import { loadProjects } from './data.js';
import { initHero } from './hero.js';
import { initAnniversary } from './anniversary.js';
import { initWall } from './wall.js';
import { initProjectList } from './project-list.js';
import { initStory } from './dialog.js';
import { initMotion, refreshOnSettle, prefersReduced } from './motion.js';
import { initNav } from './nav.js';
import { notice } from './util.js';

const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);

async function boot() {
  const root = document.documentElement;
  // A deep link to a story skips the hook: the reader came for that poster.
  if (/^#story\//.test(location.hash)) root.classList.remove('is-hook', 'is-locked', 'anniv-on');
  const mode = prefersReduced() ? 'static' : root.classList.contains('is-hook') ? 'hook' : 'quick';

  const projectsP = loadProjects();
  let story = null;
  const opening = initAnniversary({ mode });
  const hero = initHero({ projectsP, onOpen: (slug) => story?.open(slug), mode, opening });
  initNav();
  initProjectList();

  let projects;
  try {
    projects = await projectsP;
  } catch (err) {
    console.error(err);
    notice('The research data could not be loaded. Please reload the page.', 0);
    return;
  }
  story = initStory({ projects });
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open]');
    if (t && !t.closest('dialog')) story.open(t.dataset.open);
  });
  initWall({ projects });
  initMotion();
  refreshOnSettle();

  await hero.ready;
  ScrollTrigger.refresh();

  const deep = location.hash.match(/^#story\/([\w-]+)/);
  if (deep) story.open(deep[1]);
  window.addEventListener('hashchange', () => {
    const m = location.hash.match(/^#story\/([\w-]+)/);
    if (m && !story.isOpen()) story.open(m[1]);
  });

  // Exposed for automated checks (tools/verify-site.mjs).
  window.__agm = { ready: true, webgl: hero.webgl(), points: hero.points(), projects: projects.length, mode, hookStartedAt: window.__hookStartedAt ?? null, readyAt: performance.now() };
}

boot();
