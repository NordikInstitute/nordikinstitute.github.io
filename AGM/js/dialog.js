// Story dialog: one poster, its essentials, and the way to the full material.
// Deep-linkable as #story/<slug>; native <dialog> handles focus and Esc.

import { esc } from './util.js';

const { gsap } = window;
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';

function content(p) {
  const metrics = p.metrics?.length
    ? `<div class="story__metrics">${p.metrics.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>`
    : '';
  const note = p.sensitive
    ? `<div class="story__note" role="note"><strong>Content note</strong>This story concerns the Shingwauk Indian Residential School and its continuing impacts. Support is available 24 hours a day through the Indian Residential Schools Crisis Line: <a href="tel:18669254419">1-866-925-4419</a>.</div>`
    : '';
  const people = [
    p.team?.length ? `<p><strong>Research team:</strong> ${p.team.map(esc).join(', ')}</p>` : '',
    p.contributors?.length ? `<p><strong>Named in this story:</strong> ${p.contributors.map((c) => esc(c.name)).join(', ')}</p>` : '',
    p.partners?.length ? `<p><strong>Partners:</strong> ${p.partners.map(esc).join(', ')}</p>` : '',
  ].join('');
  const actions = [
    `<a class="btn btn--blue" href="projects/${esc(p.slug)}/">Full project page ${ARROW}</a>`,
    `<a class="btn btn--line" href="${esc(p.pdf)}" target="_blank" rel="noopener" data-pdf>Poster PDF ${ARROW}</a>`,
    ...(p.externalLinks ?? []).map((l) => `<a class="btn btn--line" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)} ${ARROW}</a>`),
  ].join('');
  return `
    <p class="story__meta">${p.num} · ${esc(p.categoryLabel)} · ${esc(p.status)}</p>
    <h2 class="story__title" id="story-title">${esc(p.shortTitle)}</h2>
    <p class="story__subtitle">${esc(p.subtitle)}</p>
    ${note}
    <p class="story__intro">${esc(p.intro)}</p>
    <p class="story__q">${esc(p.question)}</p>
    ${metrics}
    <section class="story__sec"><h3>What the poster reports</h3><ul>${p.findings.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></section>
    ${people ? `<section class="story__sec"><h3>People</h3>${people}</section>` : ''}
    <div class="story__actions">${actions}</div>`;
}

export function initStory({ projects }) {
  const dlg = document.getElementById('story');
  const img = document.getElementById('story-img');
  const poster = document.getElementById('story-poster');
  const body = document.getElementById('story-body');
  const grid = dlg.querySelector('.story__grid');
  const article = document.getElementById('story-content');
  const countEl = document.getElementById('story-count');
  const zoomBtn = document.getElementById('story-zoom');
  const sizes = new Map();
  let current = -1;
  let opener = null;

  function setZoom(on, e) {
    poster.classList.toggle('is-zoomed', on);
    zoomBtn.setAttribute('aria-pressed', String(on));
    zoomBtn.textContent = on ? 'Fit' : 'Zoom';
    if (!on) { img.style.transform = ''; return; }
    const r = poster.getBoundingClientRect();
    img.style.transformOrigin = e ? `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%` : '50% 30%';
    img.style.transform = 'scale(2.4)';
  }
  img.addEventListener('click', (e) => setZoom(!poster.classList.contains('is-zoomed'), e));
  zoomBtn.addEventListener('click', () => setZoom(!poster.classList.contains('is-zoomed')));
  poster.addEventListener('pointermove', (e) => {
    if (!poster.classList.contains('is-zoomed')) return;
    const r = poster.getBoundingClientRect();
    img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
  });

  function showPoster(p) {
    setZoom(false);
    zoomBtn.hidden = false;
    poster.querySelector('.story__gate')?.remove();
    poster.classList.add('is-loading');
    img.alt = `Poster: ${p.title}`;
    img.onload = () => poster.classList.remove('is-loading');
    img.src = p.preview;
  }

  function gate(p) {
    setZoom(false);
    zoomBtn.hidden = true;
    img.removeAttribute('src');
    img.alt = '';
    poster.classList.remove('is-loading');
    poster.querySelector('.story__gate')?.remove();
    const g = document.createElement('div');
    g.className = 'story__gate';
    g.innerHTML = '<p class="eyebrow">Content note</p><p>This poster includes community photographs and concerns Residential Schools. View it when you are ready.</p><div><button class="btn btn--light" type="button">Show poster</button></div>';
    g.querySelector('button').addEventListener('click', () => { showPoster(p); zoomBtn.focus(); });
    poster.append(g);
  }

  async function pdfSize(url) {
    if (sizes.has(url)) return sizes.get(url);
    try {
      const res = await fetch(url, { method: 'HEAD' });
      const b = Number(res.headers.get('content-length'));
      const s = b ? (b > 1e6 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`) : '';
      sizes.set(url, s);
      return s;
    } catch { return ''; }
  }

  function render(i) {
    current = (i + projects.length) % projects.length;
    const p = projects[current];
    countEl.textContent = `${p.num} / ${String(projects.length).padStart(2, '0')}`;
    article.innerHTML = content(p);
    pdfSize(p.pdf).then((s) => {
      const a = article.querySelector('[data-pdf]');
      if (s && a && projects[current] === p) a.firstChild.textContent = `Poster PDF (${s}) `;
    });
    if (p.sensitive) gate(p); else showPoster(p);
    body.scrollTop = 0;
    grid.scrollTop = 0;
    history.replaceState(null, '', `#story/${p.slug}`);
    if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
      gsap.from(article.children, { y: 22, opacity: 0, duration: 0.7, ease: 'expo.out', stagger: 0.04, clearProps: 'transform,opacity' });
    }
  }

  function open(slug) {
    const i = projects.findIndex((p) => p.slug === slug);
    if (i < 0) return;
    if (!dlg.open) {
      opener = document.activeElement;
      dlg.showModal();
      document.documentElement.classList.add('is-locked');
      if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
        gsap.fromTo(dlg, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65, ease: 'expo.out', clearProps: 'transform,opacity' });
      }
    }
    render(i);
    document.getElementById('story-close').focus({ preventScroll: true });
  }

  dlg.addEventListener('close', () => {
    document.documentElement.classList.remove('is-locked');
    setZoom(false);
    history.replaceState(null, '', location.pathname + location.search);
    if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
  });
  document.getElementById('story-close').addEventListener('click', () => dlg.close());
  document.getElementById('story-prev').addEventListener('click', () => render(current - 1));
  document.getElementById('story-next').addEventListener('click', () => render(current + 1));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); render(current + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); render(current - 1); }
  });

  return { open, isOpen: () => dlg.open };
}
