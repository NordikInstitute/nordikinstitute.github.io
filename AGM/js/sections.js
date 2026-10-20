// Renders the data-driven sections: theme and partner marquees, the evidence
// grid, and the researchers index with its cursor-following poster peek.

import { esc, fragment, ARROW } from './util.js';
import { EVIDENCE, researchers, partners, themes } from './data.js';

const { gsap } = window;

function marquee(items, { dir = 'normal', dur = 60, big = false, label }) {
  const pills = items.map((t) => `<li class="pill${big ? ' pill--big' : ''}">${esc(t)}</li>`).join('');
  return `
  <div class="marquee" style="--dur:${dur}s;--dir:${dir}">
    <div class="marquee__track">
      <ul class="marquee__group" role="list" aria-label="${esc(label)}">${pills}</ul>
      <ul class="marquee__group" role="list" aria-hidden="true">${pills}</ul>
    </div>
  </div>`;
}

export function renderThemes(projects) {
  const all = themes(projects);
  const half = Math.ceil(all.length / 2);
  document.getElementById('themes').append(fragment(
    marquee(all.slice(0, half), { dur: 70, label: 'Research themes, part 1' })
    + marquee(all.slice(half), { dur: 64, dir: 'reverse', label: 'Research themes, part 2' }),
  ));
}

export function renderPartners(projects) {
  const all = partners(projects);
  const half = Math.ceil(all.length / 2);
  document.getElementById('partners').append(fragment(
    marquee(all.slice(0, half), { dur: 80, big: true, label: 'Partners, part 1' })
    + marquee(all.slice(half), { dur: 74, dir: 'reverse', big: true, label: 'Partners, part 2' }),
  ));
}

export function initPauseButtons() {
  document.querySelectorAll('[data-pause]').forEach((btn) => {
    const target = document.getElementById(btn.dataset.pause);
    btn.addEventListener('click', () => {
      const paused = target.classList.toggle('is-paused');
      btn.setAttribute('aria-pressed', String(paused));
      btn.textContent = paused ? 'Play' : 'Pause';
    });
  });
}

export function renderEvidence(map) {
  const grid = document.getElementById('ev-grid');
  grid.append(fragment(EVIDENCE.map((e) => {
    const p = map[e.slug];
    if (!p) return '';
    const cls = ['ev', e.size === 'wide' && 'ev--wide', e.accent && 'ev--accent'].filter(Boolean).join(' ');
    return `
    <button class="${cls}" type="button" data-open="${esc(p.slug)}" aria-label="${esc(`${e.value} ${e.label} Open the story: ${p.shortTitle}`)}">
      <span class="ev__n" data-count="${esc(e.value)}">${esc(e.value)}</span>
      <span class="ev__l">${esc(e.label)}</span>
      <span class="ev__src">${esc(p.label)} ${ARROW}</span>
      <span class="ev__peek" aria-hidden="true"><img src="${esc(p.thumb)}" alt="" loading="lazy" width="640" height="853"></span>
    </button>`;
  }).join('')));
}

export function renderPeople(projects) {
  const list = document.getElementById('people-list');
  const people = researchers(projects);
  list.append(fragment(people.map((r) => `
    <div class="person" role="listitem" data-thumbs="${esc(r.projects.map((p) => p.thumb).join('|'))}">
      <p class="person__name">${esc(r.name)}<small>${r.projects.length} ${r.projects.length === 1 ? 'poster' : 'posters'}</small></p>
      <div class="person__chips">${r.projects.map((p) => `<button class="chip-sm" type="button" data-open="${esc(p.slug)}">${esc(p.label)}</button>`).join('')}</div>
    </div>`).join('')));

  // Poster peek follows the pointer while hovering a name (fine pointers only).
  const fine = window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)');
  const peek = document.getElementById('peek');
  if (!fine.matches) return;
  const xTo = gsap.quickTo(peek, 'x', { duration: 0.55, ease: 'power3.out' });
  const yTo = gsap.quickTo(peek, 'y', { duration: 0.55, ease: 'power3.out' });
  const rTo = gsap.quickTo(peek, 'rotation', { duration: 0.8, ease: 'power3.out' });
  let cycle = 0;
  let lastX = 0;
  let current = null;

  function show(row) {
    current = row;
    const thumbs = row.dataset.thumbs.split('|');
    peek.innerHTML = thumbs.map((t, i) => `<img src="${esc(t)}" alt="" style="opacity:${i === 0 ? 1 : 0}">`).join('');
    clearInterval(cycle);
    let k = 0;
    if (thumbs.length > 1) {
      cycle = setInterval(() => {
        const imgs = peek.querySelectorAll('img');
        imgs[k].style.opacity = 0;
        k = (k + 1) % imgs.length;
        imgs[k].style.opacity = 1;
      }, 900);
    }
    gsap.to(peek, { opacity: 1, scale: 1, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
  }
  function hide() {
    current = null;
    clearInterval(cycle);
    gsap.to(peek, { opacity: 0, scale: 0.85, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
  }
  gsap.set(peek, { scale: 0.85, xPercent: -50, yPercent: -50 });
  list.addEventListener('pointermove', (e) => {
    const row = e.target.closest('.person');
    if (!row || e.target.closest('.person__chips')) { if (current) hide(); return; }
    if (row !== current) show(row);
    xTo(e.clientX + 190);
    yTo(e.clientY - 40);
    rTo(Math.max(-10, Math.min(10, (e.clientX - lastX) * 0.6)));
    lastX = e.clientX;
  });
  list.addEventListener('pointerleave', hide);
  window.addEventListener('scroll', () => current && hide(), { passive: true });
}
