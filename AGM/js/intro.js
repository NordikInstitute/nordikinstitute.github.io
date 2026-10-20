// Intro overlay. It counts the twelve posters as they genuinely finish
// loading, then wipes upward to reveal the hero. Shown once per session,
// skippable, and never shown with reduced motion (see the inline head script).

const { gsap } = window;
const MIN_MS = 1500;
const MAX_MS = 7000;

export function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function startIntro(urls) {
  const root = document.documentElement;
  const el = document.getElementById('intro');
  const active = root.classList.contains('is-intro');
  const countEl = document.getElementById('intro-count');
  const labelEl = document.getElementById('intro-count-label');
  const barEl = document.getElementById('intro-bar');
  const statusEl = document.getElementById('intro-status');
  const t0 = performance.now();
  let done = 0;
  let skipped = false;

  if (active) {
    el.classList.add('is-on');
    gsap.from(el.querySelectorAll('.intro__label .ln > span'), { yPercent: 110, duration: 0.9, ease: 'expo.out', stagger: 0.06 });
  }
  const shown = { v: 0 };
  const show = () => {
    if (!active) return;
    gsap.to(shown, {
      v: done, duration: 0.5, ease: 'power2.out', overwrite: true,
      onUpdate: () => { countEl.textContent = String(Math.round(shown.v)).padStart(2, '0'); },
    });
    gsap.to(barEl, { scaleX: done / urls.length, duration: 0.6, ease: 'power2.out', overwrite: true });
  };

  // Resolves with every image that arrived in time (null for any that did not).
  const imgs = new Array(urls.length).fill(null);
  const loaded = Promise.all(urls.map((u, i) => loadImage(u).then((img) => { imgs[i] = img; done++; show(); })));
  const ready = Promise.race([loaded, new Promise((r) => setTimeout(r, MAX_MS))]).then(() => imgs);

  let skipResolve;
  const skip = new Promise((r) => { skipResolve = r; });
  const onSkip = () => { skipped = true; skipResolve(); };
  const onKey = (e) => { if (['Escape', 'Enter', ' '].includes(e.key)) onSkip(); };
  if (active) {
    document.getElementById('intro-skip').addEventListener('click', onSkip);
    window.addEventListener('keydown', onKey);
  }

  async function exit({ onWipe } = {}) {
    if (!active) { onWipe?.(); return; }
    await Promise.race([
      Promise.all([ready, new Promise((r) => setTimeout(r, Math.max(0, MIN_MS - (performance.now() - t0))))]),
      skip,
    ]);
    window.removeEventListener('keydown', onKey);
    if (!skipped) {
      labelEl.textContent = 'research stories';
      statusEl.textContent = 'Ready';
    }
    try { sessionStorage.setItem('agm-intro-seen', '1'); } catch { /* storage may be unavailable */ }
    const fast = skipped ? 0.45 : 1;
    await new Promise((resolve) => {
      gsap.timeline({ onComplete: resolve })
        .to(el.querySelectorAll('.ln > span'), { yPercent: -115, duration: 0.7 * fast, ease: 'expo.in', stagger: 0.035 })
        .add(() => {
          root.classList.remove('is-locked');
          onWipe?.();
        })
        .to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.05 * fast, ease: 'expo.inOut' }, '-=0.1');
    });
    el.classList.remove('is-on');
    el.remove();
    root.classList.remove('is-intro');
  }

  return { images: ready, active, exit };
}
