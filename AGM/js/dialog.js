// Poster viewer. Deep-linkable as #story/<slug>; native <dialog> handles focus and Esc.
// The sheet is taller than the window, so the stage scrolls. Zoom enlarges it in
// place (still scrollable). Download saves the original PDF.

const { gsap } = window;

export function initStory({ projects }) {
  const dlg = document.getElementById('story');
  const img = document.getElementById('story-img');
  const poster = document.getElementById('story-poster');
  const scrollEl = document.getElementById('story-scroll');
  const countEl = document.getElementById('story-count');
  const zoomBtn = document.getElementById('story-zoom');
  const download = document.getElementById('story-download');
  let current = -1;
  let opener = null;
  let suppressClick = false;
  let drag = null;

  function zoomed() {
    return poster.classList.contains('is-zoomed');
  }

  function applyZoom(on) {
    poster.classList.toggle('is-zoomed', on);
    zoomBtn.setAttribute('aria-pressed', String(on));
    zoomBtn.textContent = on ? 'Fit' : 'Zoom';
  }

  // Keep the point under the cursor (or the centre) fixed while the sheet scales.
  function setZoom(on, e) {
    if (zoomed() === on) return;
    const beforeW = img.offsetWidth || 1;
    const beforeH = img.offsetHeight || 1;
    const rect = scrollEl.getBoundingClientRect();
    const focusX = e ? e.clientX - rect.left : scrollEl.clientWidth / 2;
    const focusY = e ? e.clientY - rect.top : scrollEl.clientHeight / 2;
    const rx = (scrollEl.scrollLeft + focusX) / beforeW;
    const ry = (scrollEl.scrollTop + focusY) / beforeH;
    applyZoom(on);
    scrollEl.scrollLeft = rx * img.offsetWidth - focusX;
    scrollEl.scrollTop = ry * img.offsetHeight - focusY;
  }

  img.addEventListener('click', (e) => {
    if (suppressClick) { suppressClick = false; return; }
    setZoom(!zoomed(), e);
  });
  zoomBtn.addEventListener('click', () => setZoom(!zoomed()));
  img.addEventListener('dragstart', (e) => e.preventDefault());

  // Drag the sheet with the mouse. Touch keeps the browser's own scrolling.
  // Listen on window so a drag that leaves the poster still ends, without
  // pointer capture (that would swallow the click that toggles zoom).
  scrollEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const box = scrollEl.getBoundingClientRect();
    if (e.clientX - box.left > scrollEl.clientWidth || e.clientY - box.top > scrollEl.clientHeight) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, left: scrollEl.scrollLeft, top: scrollEl.scrollTop, moved: false };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    scrollEl.classList.add('is-panning');
    scrollEl.scrollLeft = drag.left - dx;
    scrollEl.scrollTop = drag.top - dy;
  });
  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    if (drag.moved) suppressClick = true;
    drag = null;
    scrollEl.classList.remove('is-panning');
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  function showPoster(p) {
    applyZoom(false);
    scrollEl.scrollTo(0, 0);
    poster.classList.add('is-loading');
    img.alt = `Poster: ${p.title}`;
    img.onload = () => poster.classList.remove('is-loading');
    if (img.getAttribute('src') === p.preview && img.complete) poster.classList.remove('is-loading');
    img.src = p.preview;
    download.href = p.pdf;
    download.download = `${p.slug}.pdf`;
    download.setAttribute('aria-label', `Download PDF: ${p.title}`);
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
    applyZoom(false);
    history.replaceState(null, '', location.pathname + location.search);
    if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
  });
  document.getElementById('story-close').addEventListener('click', () => dlg.close());
  document.getElementById('story-prev').addEventListener('click', () => render(current - 1));
  document.getElementById('story-next').addEventListener('click', () => render(current + 1));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', (e) => {
    if (/input|textarea|select/i.test(e.target?.tagName)) return;
    const step = (e.key === 'PageDown' || e.key === 'PageUp') ? Math.round(scrollEl.clientHeight * 0.9) : 80;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); scrollEl.scrollBy({ top: step }); return; }
    if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); scrollEl.scrollBy({ top: -step }); return; }
    if (e.key === 'Home') { e.preventDefault(); scrollEl.scrollTo(0, 0); return; }
    if (e.key === 'End') { e.preventDefault(); scrollEl.scrollTo(0, scrollEl.scrollHeight); return; }
    const horizontal = scrollEl.scrollWidth > scrollEl.clientWidth + 2;
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && zoomed() && horizontal) {
      e.preventDefault();
      scrollEl.scrollBy({ left: e.key === 'ArrowRight' ? 80 : -80 });
      return;
    }
    if (e.key === 'ArrowRight') { e.preventDefault(); render(current + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); render(current - 1); }
  });

  return { open, isOpen: () => dlg.open };
}
