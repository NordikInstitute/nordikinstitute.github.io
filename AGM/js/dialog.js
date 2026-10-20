// Story dialog for one poster: full preview with zoom, the summary, methods,
// findings, people, partners, links and related stories. Deep-linkable as
// #story/<slug>. Uses the native <dialog> for focus containment and Esc.

import { esc, ARROW } from './util.js';

const { gsap } = window;
const CRISIS_LINE = '1-866-925-4419';

function list(items, tag = 'ul') {
  return items?.length ? `<${tag}>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</${tag}>` : '';
}

function section(title, body) {
  return body ? `<section class="story__sec"><h3>${esc(title)}</h3>${body}</section>` : '';
}

function content(p, map) {
  const metrics = p.metrics?.length
    ? `<div class="story__metrics">${p.metrics.map(([v, l]) => `<div class="story__metric"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>`
    : '';
  const note = p.sensitive
    ? `<div class="story__note" role="note"><strong>Content note</strong>This story concerns the Shingwauk Indian Residential School and its continuing impacts. Support is available 24 hours a day through the Indian Residential Schools Crisis Line: <a href="tel:18669254419">${CRISIS_LINE}</a>.</div>`
    : '';
  const team = p.team?.length ? `<ul class="story__people">${p.team.map((t) => `<li><span>${esc(t)}</span></li>`).join('')}</ul>` : '';
  const contributors = p.contributors?.length
    ? `<ul class="story__contrib">${p.contributors.map((c) => `<li><strong>${esc(c.name)}</strong><span>${esc(c.role)}</span></li>`).join('')}</ul>`
    : '';
  const partners = p.partners?.length ? `<ul class="story__people">${p.partners.map((t) => `<li><span>${esc(t)}</span></li>`).join('')}</ul>` : '';
  const links = [
    // The exhibition's own project page (also the QR-code destination for this poster).
    `<a class="btn btn--solid" href="projects/${esc(p.slug)}/">Full project page ${ARROW}</a>`,
    ...(p.externalLinks ?? []).map((l) => `<a class="btn btn--ghost" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)} ${ARROW}</a>`),
    `<a class="btn btn--ghost" href="${esc(p.pdf)}" target="_blank" rel="noopener" data-pdf-size="${esc(p.pdf)}">Poster PDF ${ARROW}</a>`,
  ].join('');
  const related = (p.related ?? []).map((s) => map[s]).filter(Boolean);
  const relatedHtml = related.length
    ? `<div class="related">${related.map((r) => `<button type="button" data-open="${esc(r.slug)}" class="${r.sensitive ? 'is-veiled' : ''}"><img src="${esc(r.thumb)}" alt="" loading="lazy" width="640" height="853"><span>${esc(r.shortTitle)}</span></button>`).join('')}</div>`
    : '';

  return `
    <p class="story__cat"><span>${p.num} · ${esc(p.categoryLabel)}</span><span class="badge">${esc(p.status)}</span></p>
    <h2 class="story__title" id="story-title">${esc(p.shortTitle)}</h2>
    <p class="story__full">${esc(p.title)}</p>
    <p class="story__subtitle">${esc(p.subtitle)}</p>
    ${note}
    <p class="story__intro">${esc(p.intro)}</p>
    <div class="story__q"><small>Research question</small><p>${esc(p.question)}</p></div>
    ${metrics}
    ${section('How the work was done', list(p.methods, 'ol'))}
    ${section('What the poster reports', list(p.findings))}
    ${section('Why it matters', p.impact ? `<p>${esc(p.impact)}</p>` : '')}
    ${section('Research team', team)}
    ${section('Named in this story', contributors)}
    ${section('Partners', partners)}
    ${section('Themes', `<ul class="story__people">${(p.tags ?? []).map((t) => `<li><span>${esc(t)}</span></li>`).join('')}</ul>`)}
    ${section('Links', `<div class="story__links">${links}</div>`)}
    ${section('Related research', relatedHtml)}
  `;
}

export function initStory({ projects, map }) {
  const dlg = document.getElementById('story');
  const img = document.getElementById('story-img');
  const poster = document.getElementById('story-poster');
  const body = document.getElementById('story-body');
  const article = document.getElementById('story-content');
  const countEl = document.getElementById('story-count');
  const zoomBtn = document.getElementById('story-zoom');
  const pdfBtn = document.getElementById('story-pdf');
  const sizeCache = new Map();
  let current = -1;
  let opener = null;

  function setZoom(on, e) {
    poster.classList.toggle('is-zoomed', on);
    zoomBtn.setAttribute('aria-pressed', String(on));
    zoomBtn.textContent = on ? 'Fit' : 'Zoom';
    if (!on) { img.style.transform = ''; return; }
    const r = poster.getBoundingClientRect();
    const x = e ? ((e.clientX - r.left) / r.width) * 100 : 50;
    const y = e ? ((e.clientY - r.top) / r.height) * 100 : 30;
    img.style.transformOrigin = `${x}% ${y}%`;
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
    g.innerHTML = `<p class="eyebrow eyebrow--plain" style="justify-content:center">Content note</p><p>This poster includes community photographs and concerns Residential Schools. View it when you are ready.</p><button class="btn btn--ghost" type="button">Show poster</button>`;
    g.querySelector('button').addEventListener('click', () => { showPoster(p); zoomBtn.focus(); });
    poster.append(g);
  }

  async function pdfSize(url) {
    if (sizeCache.has(url)) return sizeCache.get(url);
    try {
      const res = await fetch(url, { method: 'HEAD' });
      const bytes = Number(res.headers.get('content-length'));
      const label = bytes ? (bytes > 1e6 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`) : '';
      sizeCache.set(url, label);
      return label;
    } catch { return ''; }
  }

  function render(i, { animate = true } = {}) {
    current = (i + projects.length) % projects.length;
    const p = projects[current];
    countEl.textContent = `${p.num} / ${String(projects.length).padStart(2, '0')}`;
    article.innerHTML = content(p, map);
    pdfBtn.href = p.pdf;
    pdfBtn.textContent = 'Poster PDF';
    pdfSize(p.pdf).then((s) => {
      if (projects[current] !== p || !s) return;
      pdfBtn.textContent = `Poster PDF · ${s}`;
      article.querySelectorAll('[data-pdf-size]').forEach((a) => { a.firstChild.textContent = `Poster PDF (${s}) `; });
    });
    if (p.sensitive) gate(p); else showPoster(p);
    body.scrollTop = 0;
    dlg.querySelector('.story__grid').scrollTop = 0;
    history.replaceState(null, '', `#story/${p.slug}`);
    if (animate && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
      gsap.from(article.children, { y: 26, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.035, clearProps: 'transform,opacity' });
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
        gsap.fromTo(dlg, { y: 40, opacity: 0, scale: 0.985 }, { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'expo.out', clearProps: 'transform,opacity' });
      }
    }
    render(i, { animate: true });
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
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close(); // backdrop
    const rel = e.target.closest('[data-open]');
    if (rel && dlg.contains(rel)) { e.preventDefault(); open(rel.dataset.open); }
  });
  dlg.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); render(current + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); render(current - 1); }
  });

  return { open, isOpen: () => dlg.open };
}
