// Closing "THANK YOU" dot field (2D canvas). Letter dots sit on springs; the
// pointer pushes them aside and a click or tap sends a ripple across the
// field like a stone dropped in a lake. A faint dot-matrix grid sits behind.

const FONT = '"Barlow Condensed", "Arial Narrow", sans-serif';
const CORAL = [232, 71, 58];
const AMBER = [245, 163, 58];
const CREAM = [251, 238, 224];
const BUCKETS = 18;

export function initThanks(canvas, { reduced = false } = {}) {
  const ctx = canvas.getContext('2d');
  let dots = [];
  let inked = [];
  let W = 0;
  let H = 0;
  let dpr = 1;
  let gap = 9;
  let raf = 0;
  let running = false;
  let lastInteract = performance.now();
  const pointer = { x: -1e4, y: -1e4 };
  const ripples = [];

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    if (!W || !H) return;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    gap = W < 640 ? 6 : W < 1100 ? 8 : 9;
    const lines = W < 640 ? ['THANK', 'YOU'] : ['THANK YOU'];

    const off = document.createElement('canvas');
    off.width = Math.ceil(W);
    off.height = Math.ceil(H);
    const o = off.getContext('2d', { willReadFrequently: true });
    o.font = `900 100px ${FONT}`;
    const widest = Math.max(...lines.map((l) => o.measureText(l).width)) / 100;
    const lineH = 0.86;
    const fs = Math.min((W * 0.96) / widest, (H * 0.94) / (lines.length * lineH));
    o.font = `900 ${fs}px ${FONT}`;
    o.fillStyle = '#fff';
    o.textAlign = 'center';
    o.textBaseline = 'middle';
    const top = H / 2 - ((lines.length - 1) * fs * lineH) / 2;
    lines.forEach((l, i) => o.fillText(l, W / 2, top + i * fs * lineH + fs * 0.04));
    const px = o.getImageData(0, 0, off.width, off.height).data;

    dots = [];
    for (let y = gap / 2; y < H; y += gap) {
      for (let x = gap / 2; x < W; x += gap) {
        const a = px[(Math.round(y) * off.width + Math.round(x)) * 4 + 3];
        const ink = a > 120;
        // Background grid is sparser than the letters.
        if (!ink && (Math.round(x / gap) % 2 || Math.round(y / gap) % 2)) continue;
        dots.push({ hx: x, hy: y, x, y, vx: 0, vy: 0, ink, b: Math.min(BUCKETS - 1, Math.floor((x / W) * BUCKETS)) });
      }
    }
    inked = dots.filter((d) => d.ink);
  }

  const colors = Array.from({ length: BUCKETS }, (_, i) => {
    const t = i / (BUCKETS - 1);
    const c = CORAL.map((v, k) => Math.round(v + (AMBER[k] - v) * t));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  });

  function step(now) {
    const R = W < 640 ? 70 : 120;
    const t = now / 1000;
    for (let i = ripples.length - 1; i >= 0; i--) if (now - ripples[i].t0 > 2600) ripples.splice(i, 1);
    for (const d of dots) {
      let fx = (d.hx - d.x) * 0.05;
      let fy = (d.hy - d.y) * 0.05;
      const dx = d.x - pointer.x;
      const dy = d.y - pointer.y;
      const dist = Math.hypot(dx, dy);
      if (dist < R && dist > 0.01) {
        const f = (1 - dist / R) ** 2 * 7;
        fx += (dx / dist) * f;
        fy += (dy / dist) * f;
      }
      for (const r of ripples) {
        const age = (now - r.t0) / 1000;
        const front = age * 520;
        const rx = d.hx - r.x;
        const ry = d.hy - r.y;
        const rd = Math.hypot(rx, ry) || 1;
        const band = Math.abs(rd - front);
        if (band < 46) {
          const f = (1 - band / 46) * 5.5 * Math.exp(-age * 1.4);
          fx += (rx / rd) * f;
          fy += (ry / rd) * f;
        }
      }
      d.vx = (d.vx + fx) * 0.84;
      d.vy = (d.vy + fy) * 0.84;
      d.x += d.vx;
      d.y += d.vy;
    }
    // An occasional ripple while nobody is interacting keeps the field alive.
    if (now - lastInteract > 5200 && ripples.length === 0 && inked.length) {
      const d = inked[Math.floor(Math.random() * inked.length)];
      if (d) ripples.push({ x: d.hx, y: d.hy, t0: now });
      lastInteract = now;
    }
    return t;
  }

  function render(t = 0) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const r = gap * 0.34;
    ctx.fillStyle = `rgba(${CREAM.join(',')},0.08)`;
    ctx.beginPath();
    for (const d of dots) if (!d.ink) { ctx.moveTo(d.x + r * 0.7, d.y); ctx.arc(d.x, d.y, r * 0.7, 0, Math.PI * 2); }
    ctx.fill();
    for (let b = 0; b < BUCKETS; b++) {
      ctx.fillStyle = colors[b];
      ctx.beginPath();
      for (const d of dots) {
        if (!d.ink || d.b !== b) continue;
        // Displaced dots swell slightly; the field shimmers like light on water.
        const off = Math.min(1, Math.hypot(d.x - d.hx, d.y - d.hy) / 30);
        const rr = r * (1 + off * 0.6) * (0.9 + 0.1 * Math.sin(t * 2 + d.hx * 0.02));
        ctx.moveTo(d.x + rr, d.y);
        ctx.arc(d.x, d.y, rr, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    render(step(now));
  }

  function setPointer(e) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    lastInteract = performance.now();
  }

  build();
  if (reduced) {
    render(0);
  } else {
    canvas.addEventListener('pointermove', setPointer, { passive: true });
    canvas.addEventListener('pointerleave', () => { pointer.x = pointer.y = -1e4; });
    canvas.addEventListener('pointerdown', (e) => {
      setPointer(e);
      ripples.push({ x: pointer.x, y: pointer.y, t0: performance.now() });
      if (e.pointerType !== 'mouse') pointer.x = pointer.y = -1e4;
    });
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) { running = true; raf = requestAnimationFrame(loop); }
      if (!entry.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
    }, { rootMargin: '100px' }).observe(canvas);
  }

  let timer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (Math.abs(canvas.clientWidth - W) < 2) return;
      build();
      render(0);
    }, 200);
  });
}
