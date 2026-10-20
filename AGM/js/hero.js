// Hero: the NORDIK hook and the orbiting posters.
//
// Hook (first visit): the official logo is painted by CSS from the first
// frame (the splash). Once it has finished revealing, its Great Lakes emblem
// dissolves into points that scatter across the screen while the lights go
// down and the lettering glides into place; the points regather into a
// large, tilting point-cloud emblem; the twelve posters arrive in orbit, each
// linked by a line to Sault Ste. Marie, where NORDIK is based.
// The hook never waits for the poster data: the orbit joins when it arrives.

import { PointCloud, project, loadImage } from './pointcloud.js';
import { esc } from './util.js';

const { gsap, ScrollTrigger } = window;
const EMBLEM_SRC = 'assets/brand/great-lakes-emblem.svg';
const EMBLEM_ASPECT = 1312 / 1199;
const HUB_UV = [0.598, 0.447]; // St. Marys River between Superior and Huron
const GATHER_AT = 1.25;
const SPLASH_DONE = 1.15; // s after navigation start: CSS splash reveal (1 s) plus a beat
const HOOK_SPEED = 0.5;   // the whole hook plays at half speed (about 8 s)
const SHOWN_KEY = 'agm-hook-shown-at'; // read by the inline head script: replay after 5 min
// Where the lettering and emblem sit inside the full logo (viewBox 2 150 1981 538).
const LOGO = { w: 1981, h: 538, mark: [11, 12, 1571, 414], emblem: [1440, 15, 540, 507] };

export function initHero({ projectsP, onOpen, mode }) {
  const hero = document.getElementById('top');
  const canvas = document.getElementById('cloud');
  const orbit = document.getElementById('orbit');
  const linksSvg = document.getElementById('links');
  const hub = document.getElementById('hub');
  const label = document.getElementById('pp-label');
  const mark = document.getElementById('hero-mark');
  const splash = document.getElementById('hook-splash');
  const kicker = document.getElementById('hero-kicker');
  const root = document.documentElement;
  const reduced = mode === 'static';

  let projects = [];
  let points = [];
  let lines = [];

  const st = {
    W: 0, H: 0, cx: 0, cy: 0, ew: 0, eh: 0, rx: 0, ry: 0,
    t: reduced ? 100 : -1, speed: 1, clockOn: false, light: mode === 'hook' ? 1 : 0,
    tilt: [0, 0], tiltTarget: [0, 0], mouse: [-1e4, -1e4], hasPointer: false,
    angle: -Math.PI / 2, focus: -1, scatter: 0, visible: true, orbitOn: false,
    last: performance.now(), time: 0,
  };

  // ---------- Poster points (built when the data arrives) ----------
  const orbitReady = projectsP.then((list) => {
    projects = list;
    orbit.innerHTML = list.map((p, i) => p.sensitive
      ? `<button class="pp pp--note" type="button" data-i="${i}" aria-label="${esc(`Story ${p.num}: ${p.shortTitle} (content note)`)}"></button>`
      : `<button class="pp" type="button" data-i="${i}" aria-label="${esc(`Story ${p.num}: ${p.shortTitle}`)}"><img src="${esc(p.thumb)}" alt="" width="640" height="853" decoding="async"></button>`).join('');
    points = [...orbit.children];
    linksSvg.innerHTML = list.map(() => '<line x1="0" y1="0" x2="0" y2="0"/>').join('');
    lines = [...linksSvg.children];
    if (!reduced) gsap.set([...points, ...lines], { opacity: 0 });
    return list;
  });

  function layout() {
    const r = hero.getBoundingClientRect();
    st.W = r.width;
    st.H = r.height;
    if (st.W < 761) {
      const copyH = hero.querySelector('.hero__copy').offsetHeight || 220;
      const top = hero.querySelector('.hero__brand').getBoundingClientRect().bottom - r.top + 10;
      const avail = Math.max(220, st.H - copyH - 30 - top);
      st.cx = st.W / 2;
      st.cy = top + avail / 2;
      st.ew = Math.min(st.W * 0.72, avail * 0.62 * EMBLEM_ASPECT);
      st.eh = st.ew / EMBLEM_ASPECT;
      st.rx = Math.min(st.ew * 0.66, st.W / 2 - 22);
      st.ry = Math.min(st.eh * 0.86, avail / 2 - 14);
    } else {
      const copy = hero.querySelector('.hero__copy').getBoundingClientRect();
      const brand = hero.querySelector('.hero__brand').getBoundingClientRect();
      const left = Math.max(copy.right, brand.right) - r.left + 48;
      const right = st.W - Math.max(24, st.W * 0.04);
      const rightW = right - left;
      st.cx = left + rightW / 2;
      st.cy = st.H * 0.52;
      st.eh = Math.min(st.H * 0.6, (rightW * 0.68) / EMBLEM_ASPECT);
      st.ew = st.eh * EMBLEM_ASPECT;
      st.rx = Math.min(st.ew * 0.8, rightW / 2 - 34);
      st.ry = Math.min(st.eh * 0.74, st.H / 2 - 70 - 34);
    }
  }

  // Lockup = the splash: wordmark + emblem exactly where the CSS splash draws them.
  function lockup() {
    const L = st.W < 761 ? st.W * 0.9 : Math.min(st.W * 0.78, 980);
    const k = L / LOGO.w;
    const x = (st.W - L) / 2;
    const y = (st.H - LOGO.h * k) / 2;
    const [ex, ey, ew, eh] = LOGO.emblem;
    const h = (ew * k) / EMBLEM_ASPECT;
    return {
      mark: { x: x + LOGO.mark[0] * k, y: y + LOGO.mark[1] * k, w: LOGO.mark[2] * k },
      emblem: { x: x + ex * k, y: y + ey * k + (eh * k - h) / 2, w: ew * k, h },
    };
  }

  // ---------- Point cloud ----------
  let cloud = null;
  let img = null;
  async function startCloud(intro) {
    try {
      img = await loadImage(EMBLEM_SRC);
      cloud = new PointCloud(canvas);
      cloud.build(img, { W: st.W, H: st.H, cx: st.cx, cy: st.cy, ew: st.ew, eh: st.eh, intro });
      return true;
    } catch (err) {
      console.warn('[hero] point cloud unavailable:', err);
      hero.classList.add('no-webgl');
      return false;
    }
  }

  function placeOrbit(dt) {
    const n = points.length;
    if (!n) return;
    if (st.focus < 0 && !reduced) st.angle += dt * 0.035;
    const hubLocal = [(HUB_UV[0] - 0.5) * st.ew, (HUB_UV[1] - 0.5) * st.eh, 0];
    const [hx, hy] = cloud ? project(hubLocal, st.tilt, [st.cx, st.cy]) : [st.cx + hubLocal[0], st.cy + hubLocal[1]];
    hub.style.transform = `translate3d(${hx.toFixed(1)}px, ${hy.toFixed(1)}px, 0)`;
    for (let i = 0; i < n; i++) {
      const a = st.angle + (i / n) * Math.PI * 2;
      const depth = Math.sin(a); // -1 behind (top), +1 in front (bottom)
      const x = st.cx + Math.cos(a) * st.rx + st.tilt[1] * depth * 40;
      const y = st.cy + Math.sin(a) * st.ry - st.tilt[0] * depth * 30;
      const el = points[i];
      el.style.setProperty('--x', `${x.toFixed(1)}px`);
      el.style.setProperty('--y', `${y.toFixed(1)}px`);
      el.style.setProperty('--s', (0.8 + 0.1 * (depth + 1)).toFixed(3));
      el.style.setProperty('--o', (0.55 + 0.225 * (depth + 1)).toFixed(3));
      el.style.zIndex = String(Math.round((depth + 1) * 10));
      const ln = lines[i];
      ln.setAttribute('x1', hx.toFixed(1));
      ln.setAttribute('y1', hy.toFixed(1));
      ln.setAttribute('x2', x.toFixed(1));
      ln.setAttribute('y2', y.toFixed(1));
      if (i === st.focus) {
        const right = x < st.cx;
        label.style.transform = `translate3d(${(right ? x + 52 : x - 52 - label.offsetWidth).toFixed(1)}px, ${(y - label.offsetHeight / 2).toFixed(1)}px, 0)`;
      }
    }
  }

  let raf = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const real = Math.min(0.25, (now - st.last) / 1000);
    const dt = Math.min(0.05, real);
    st.last = now;
    if (!st.visible || document.hidden) return;
    st.time += dt;
    // During the hook the cloud follows the timeline itself, so points and page
    // stay in step on any device; otherwise it runs on real time.
    if (st.tl) st.t = st.tl.time() - st.B;
    else if (st.clockOn) st.t += real * st.speed;
    // Tilt toward the pointer; drift gently when idle.
    const tx = st.hasPointer ? st.tiltTarget[0] : Math.sin(st.time * 0.17) * 0.05;
    const ty = st.hasPointer ? st.tiltTarget[1] : Math.sin(st.time * 0.23) * 0.12;
    st.tilt[0] += (tx - st.tilt[0]) * 0.05;
    st.tilt[1] += (ty - st.tilt[1]) * 0.05;
    if (cloud) cloud.draw({ t: st.t, time: st.time, gatherAt: GATHER_AT, tilt: st.tilt, scatter: st.scatter, mouse: st.mouse, light: st.light });
    if (st.orbitOn) placeOrbit(dt);
  }

  // ---------- Interaction ----------
  function setFocus(i) {
    st.focus = i;
    const on = i >= 0;
    orbit.classList.toggle('has-focus', on);
    hero.classList.toggle('has-focus', on);
    lines.forEach((l, k) => l.classList.toggle('is-on', k === i));
    if (on) {
      const p = projects[i];
      label.innerHTML = `<small>${p.num} · ${esc(p.categoryLabel)}</small><strong>${esc(p.shortTitle)}</strong><span>${p.sensitive ? 'Content note: Residential Schools' : esc(p.label)}</span>`;
      if (reduced) placeOrbit(0);
    }
    label.classList.toggle('is-on', on);
  }
  orbit.addEventListener('pointerover', (e) => { const b = e.target.closest('.pp'); if (b) setFocus(+b.dataset.i); });
  orbit.addEventListener('pointerout', (e) => { if (e.target.closest('.pp') && !e.relatedTarget?.closest?.('.pp')) setFocus(-1); });
  orbit.addEventListener('focusin', (e) => { const b = e.target.closest('.pp'); if (b) setFocus(+b.dataset.i); });
  orbit.addEventListener('focusout', () => setFocus(-1));
  orbit.addEventListener('click', (e) => { const b = e.target.closest('.pp'); if (b) onOpen(projects[+b.dataset.i].slug); });

  hero.addEventListener('pointermove', (e) => {
    if (reduced) return;
    const r = hero.getBoundingClientRect();
    st.mouse = [e.clientX - r.left, e.clientY - r.top];
    st.hasPointer = e.pointerType === 'mouse';
    st.tiltTarget = [((st.mouse[1] / st.H) - 0.5) * -0.36, ((st.mouse[0] / st.W) - 0.5) * 0.6];
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { st.mouse = [-1e4, -1e4]; st.hasPointer = false; });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const r = hero.getBoundingClientRect();
      if (Math.abs(r.width - st.W) < 2 && Math.abs(r.height - st.H) < 120) return;
      layout();
      if (cloud) cloud.build(img, { W: st.W, H: st.H, cx: st.cx, cy: st.cy, ew: st.ew, eh: st.eh, intro: null });
      if (!st.clockOn) st.t = 100;
      placeOrbit(0);
      if (reduced && cloud) cloud.draw({ t: 100, time: 0, gatherAt: GATHER_AT, tilt: [0, 0], scatter: 0, mouse: [-1e4, -1e4], light: 0 });
    }, 200);
  });

  // ---------- Openings ----------
  async function arriveOrbit(timeScale = 1) {
    await orbitReady;
    st.orbitOn = true;
    placeOrbit(0);
    return gsap.timeline()
      .fromTo(points, { opacity: 0, '--hs': 0.2 }, { opacity: 1, '--hs': 1, duration: 0.9, ease: 'back.out(1.6)', stagger: { each: 0.06, from: 'random' }, clearProps: 'opacity,--hs' })
      .fromTo(lines, { opacity: 0 }, { opacity: 1, duration: 1.2, stagger: 0.04 }, 0.2)
      .fromTo(hub, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(2)' }, 0)
      .fromTo('[data-hero-in], .hero__cue', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.08, clearProps: 'transform' }, 0.1)
      .timeScale(timeScale);
  }

  // The AGM line rises in and its glow layer blooms, then settles into a slow
  // breathing loop. Opacity and transform only: nothing here forces a repaint.
  function revealKicker(timeScale = 1) {
    const glow = kicker.querySelector('.hero__kicker-glow');
    kicker.classList.remove('is-breathing');
    return gsap.timeline({ onComplete: () => { gsap.set(glow, { clearProps: 'opacity' }); kicker.classList.add('is-breathing'); } })
      .fromTo(kicker, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 1.3, ease: 'expo.out', clearProps: 'transform' })
      .fromTo(glow, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power2.out' }, 0.15)
      .to(glow, { opacity: 0.55, duration: 1.4, ease: 'power2.inOut' })
      .timeScale(timeScale);
  }

  function finishHook() {
    root.classList.remove('is-hook', 'is-locked', 'hook-live');
    hero.style.removeProperty('background-color');
    mark.style.removeProperty('--wm-main');
    mark.style.removeProperty('--wm-accent');
    ScrollTrigger.refresh();
  }

  async function playHook() {
    window.__hookStartedAt = performance.now();
    root.classList.add('hook-live');
    // Remember when the full hook was shown; the head script replays it after 5 minutes.
    try { localStorage.setItem(SHOWN_KEY, String(Date.now())); } catch { /* storage unavailable */ }
    layout();
    const lk = lockup();
    const markRect = mark.getBoundingClientRect();
    const heroRect = hero.getBoundingClientRect();
    // Park the (still invisible) lettering exactly over the splash's lettering.
    gsap.set(mark, { x: lk.mark.x - (markRect.left - heroRect.left), y: lk.mark.y - (markRect.top - heroRect.top), scale: lk.mark.w / markRect.width });
    const ok = await startCloud(lk.emblem);
    if (!ok) {
      gsap.set(mark, { clearProps: 'all' });
      st.light = 0;
      finishHook();
      arriveOrbit();
      return;
    }
    raf = requestAnimationFrame(frame);

    // Dissolve only once the splash has finished drawing, never earlier: read the
    // CSS reveal's real remaining time (it starts at first paint, not at a fixed clock).
    const reveal = splash.getAnimations?.()[0];
    const left = reveal ? Math.max(0, (reveal.effect.getComputedTiming().endTime - (reveal.currentTime ?? 0)) / 1000) : Math.max(0, SPLASH_DONE - performance.now() / 1000);
    // Timeline positions are in timeline time; at half speed the hold must be
    // halved so the dissolve still starts right after the splash is drawn.
    const dev = parseFloat(new URLSearchParams(location.search).get('hookspeed'));
    const speed = dev > 0 && dev < 1 ? dev : HOOK_SPEED;
    const B = Math.max(0.3, left + 0.2) * speed;
    let done;
    const finished = new Promise((r) => { done = r; });
    const tl = gsap.timeline({ onComplete: () => { finishHook(); done(); } });
    st.tl = tl;
    st.B = B;
    tl.add(() => {
      // The splash becomes points: same logo, same place, now alive.
      gsap.set(mark, { opacity: 1 });
      gsap.set(splash, { visibility: 'hidden' });
    }, B)
      .to(st, { light: 0, duration: 1.3, ease: 'power2.inOut' }, B + 0.05)
      .to(hero, { backgroundColor: '#030d1c', duration: 1.3, ease: 'power2.inOut' }, B + 0.05)
      .to('.hero__glow', { opacity: 1, duration: 1.6 }, B + 0.35)
      .to(mark, { '--wm-main': '#f4f8fd', '--wm-accent': '#ff5a72', duration: 1.1, ease: 'power2.inOut' }, B + 0.15)
      .to(mark, { x: 0, y: 0, scale: 1, duration: 1.4, ease: 'expo.inOut' }, B + 0.55)
      // Once the lettering has settled top-left, the AGM line glows in beneath it.
      .add(() => { revealKicker(tl.timeScale()); }, B + 1.85)
      .add(() => { arriveOrbit(tl.timeScale()); }, B + 2.45)
      .to({}, { duration: 0.01 }, B + 3.45);

    // Half speed by default; ?hookspeed=0.25 (dev aid for capture) slows it further.
    tl.timeScale(speed);
    // Any deliberate input fast-forwards the hook.
    const skip = () => { tl.timeScale(5); off(); };
    const keys = (e) => { if (['Escape', 'Enter', ' ', 'ArrowDown', 'PageDown', 'Tab'].includes(e.key)) skip(); };
    const off = () => {
      window.removeEventListener('wheel', skip);
      window.removeEventListener('touchstart', skip);
      window.removeEventListener('keydown', keys);
    };
    window.addEventListener('wheel', skip, { passive: true });
    window.addEventListener('touchstart', skip, { passive: true });
    window.addEventListener('keydown', keys);
    document.getElementById('hook-skip').addEventListener('click', skip);
    return finished;
  }

  async function playQuick() {
    layout();
    gsap.set([hub, kicker], { opacity: 0 });
    const ok = await startCloud(null);
    if (ok) {
      st.t = 1.0;
      st.clockOn = true;
      raf = requestAnimationFrame(frame);
    }
    gsap.from(mark, { opacity: 0, y: 20, duration: 1.2, ease: 'expo.out' });
    gsap.delayedCall(0.6, () => revealKicker());
    gsap.delayedCall(ok ? 1.5 : 0.3, () => arriveOrbit());
  }

  async function showStatic() {
    layout();
    const ok = await startCloud(null);
    if (ok) cloud.draw({ t: 100, time: 0, gatherAt: GATHER_AT, tilt: [0, 0], scatter: 0, mouse: [-1e4, -1e4], light: 0 });
    await orbitReady;
    st.orbitOn = true;
    placeOrbit(0);
  }

  // ---------- Scroll away ----------
  if (!reduced) {
    ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', scrub: true, onUpdate: (self) => { st.scatter = self.progress; } });
    // Only the scroll fade touches #hero-ui, so it never records a mid-hook opacity.
    gsap.to('#hero-ui', { opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '60% top', scrub: true } });
    new IntersectionObserver(([e]) => { st.visible = e.isIntersecting; }).observe(hero);
  }

  if (mode === 'static') kicker.classList.add('is-breathing');
  const ready = mode === 'hook' ? playHook() : mode === 'quick' ? playQuick() : showStatic();
  return { ready, webgl: () => !!cloud, points: () => cloud?.emblemPoints ?? 0 };
}
