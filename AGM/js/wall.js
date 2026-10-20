// The research wall: the twelve posters as tightly packed tiles. Hovering (or
// focusing) a tile flips it to show the title and authors; clicking opens the
// poster (handled globally through [data-open]).

import { esc, fragment } from './util.js';

const { gsap, ScrollTrigger } = window;

// Featured posters take a 2x2 tile, so twelve fill a neat 6x3 block.
const LARGE = new Set(['spruce-budworm-radar', 'water-quality-monitoring']);

function people(p) {
  if (p.team?.length) return { label: 'Research team', names: p.team.join(', ') };
  if (p.partners?.length) return { label: 'With', names: p.partners.join(', ') };
  return null;
}

function tile(p) {
  const who = people(p);
  const large = LARGE.has(p.slug);
  return `
  <div class="tile${large ? ' tile--lg' : ''}" role="listitem">
    <button class="tile__btn" type="button" data-open="${esc(p.slug)}" aria-label="${esc(`Open poster ${p.num}: ${p.title}`)}">
      <span class="tile__inner">
        <span class="tile__face tile__front">
          <img src="${esc(p.thumb)}" alt="" width="640" height="853" loading="lazy" decoding="async">
        </span>
        <span class="tile__face tile__back" aria-hidden="true">
          <small>${p.num} · ${esc(p.categoryLabel)}</small>
          <strong>${esc(p.shortTitle)}</strong>
          ${large ? `<span class="tile__deck">${esc(p.subtitle)}</span>` : ''}
          ${who ? `<span class="tile__people"><em>${who.label}</em>${esc(who.names)}</span>` : ''}
          <span class="tile__cta">View poster</span>
        </span>
      </span>
    </button>
  </div>`;
}

export function initWall({ projects }) {
  const wall = document.getElementById('wall');
  wall.append(fragment(projects.map(tile).join('')));

  // Wider screens: a scroll that comes to rest between the hero and the wall
  // settles on one of them, so the wall arrives filling the screen. Only that
  // stretch snaps; the sections below it scroll freely.
  gsap.matchMedia().add('(min-width: 761px) and (prefers-reduced-motion: no-preference)', () => {
    const section = document.getElementById('posters');
    ScrollTrigger.create({
      start: 0,
      end: () => section.getBoundingClientRect().top + window.scrollY,
      snap: { snapTo: [0, 1], delay: 0.12, duration: { min: 0.3, max: 0.8 }, ease: 'power2.inOut' },
    });
  });
}
