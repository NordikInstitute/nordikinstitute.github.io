// Poster viewer. Deep-linkable as #story/<slug>; native <dialog> handles focus and Esc.
// A click shows the poster itself: zoom, previous, next, and close. No written summary.

const { gsap } = window;

export function initStory({ projects }) {
  const dlg = document.getElementById('story');
  const img = document.getElementById('story-img');
  const poster = document.getElementById('story-poster');
  const countEl = document.getElementById('story-count');
  const zoomBtn = document.getElementById('story-zoom');
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
    poster.classList.add('is-loading');
    img.alt = `Poster: ${p.title}`;
    img.onload = () => poster.classList.remove('is-loading');
    if (img.getAttribute('src') === p.preview && img.complete) poster.classList.remove('is-loading');
    img.src = p.preview;
    dlg.setAttribute('aria-label', `Poster: ${p.title}`);
  }

  function render(i) {
    current = (i + projects.length) % projects.length;
    const p = projects[current];
    countEl.textContent = `${p.num} / ${String(projects.length).padStart(2, '0')}`;
    showPoster(p);
    history.replaceState(null, '', `#story/${p.slug}`);
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
