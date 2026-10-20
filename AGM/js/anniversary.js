// 20th anniversary (first visit, with the hook).
//
// CSS paints "20th Anniversary Celebration" under the NORDIK logo in the
// splash, from the first frame. It vanishes with the logo: as the lights go
// down (dusk) it brightens for the night, then (dissolve) its letters turn,
// left to right, into tiny glowing particles that drift out across the screen
// into soft, cloud-like drifts and float. As the hero assembles, most particles fade and the rest
// stay as a faint atmosphere behind it. Revisits inside the hook window get
// just the atmosphere; reduced motion gets neither. The hook (js/hero.js)
// calls holdFor, dusk, dissolve and skip.

const { gsap } = window;
const HOLD = 0.25;   // s after the text settles before it and the emblem vanish
const FADE_AT = 3.6; // s after the dissolve starts: the particles begin to settle
const SWEEP = 0.9;
const FADE = 2.2;    // s for most to fade and the rest to dim into the atmosphere
const AMBIENT = 0.5; // brightness of the lasting atmosphere (the dissolve is 1)

// gold (the "20th"), white and pale (the caption), then brand glow blue and rose.
const COLOURS = [[246, 222, 166], [236, 244, 255], [159, 186, 221], [91, 155, 240], [255, 128, 148]];
const [GOLD, WHITE, PALE, BLUE, ROSE] = [0, 1, 2, 3, 4];

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function glowSprite([r, g, b], size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  const m = size / 2;
  const grad = x.createRadialGradient(m, m, 0, m, m, m);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.16, `rgba(${r},${g},${b},0.8)`);
  grad.addColorStop(0.4, `rgba(${r},${g},${b},0.16)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = grad;
  x.fillRect(0, 0, size, size);
  return c;
}

// A slow, swirling flow field: the angle each mote drifts toward.
const flow = (x, y, t) => Math.sin(x * 0.0021 + t * 0.12) * 1.7 + Math.cos(y * 0.0018 - t * 0.1) * 1.7 + Math.sin((x - y) * 0.0012 + t * 0.06) * 1.2;
// Where the motes gather: soft, uneven drifts rather than an even scatter.
const density = (x, y) => clamp01(0.5 + 0.42 * (Math.sin(x * 0.0043 + 1.3) * Math.cos(y * 0.0051 - 0.7) + Math.sin((x + y) * 0.0027 + 2.1) * 0.6 + Math.cos((x - y * 0.6) * 0.0019) * 0.5));

export function initAnniversary({ mode }) {
  const root = document.documentElement;
  const hero = document.getElementById('top');
  const layer = document.getElementById('anniv');
  const textEl = document.getElementById('anniv-text');
  const canvas = document.getElementById('anniv-sky');
  const noop = { holdFor: () => 0, dusk() {}, dissolve() {}, skip() {} };
  if (mode === 'static' || !canvas || !gsap) return noop;
  const ctx = canvas.getContext('2d');
  if (!ctx) return noop;

  const phone = () => window.innerWidth < 761;
  const sprites = COLOURS.map((c) => glowSprite(c));
  let W = 0, H = 0, dpr = 1;
  function size() {
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();

  // ---------- Particles (structure of arrays) ----------
  let n = 0;
  let hx, hy, tx, ty, fx, fy, rel, dur, swirl, sz, al, alEnd, ph, col, puff, keep;
  let live = null; // indices still drawn once the dissolve has settled
  function alloc(count) {
    n = count;
    [hx, hy, tx, ty, fx, fy, rel, dur, swirl, sz, al, alEnd, ph] = Array.from({ length: 13 }, () => new Float32Array(count));
    [col, puff, keep] = [new Uint8Array(count), new Uint8Array(count), new Uint8Array(count)];
  }
  function target(i) {
    for (let k = 0; k < 8; k++) {
      const x = Math.random() * W, y = Math.random() * H;
      if (Math.random() < 0.15 + 0.85 * density(x, y)) { tx[i] = x; ty[i] = y; return; }
    }
    tx[i] = Math.random() * W; ty[i] = Math.random() * H;
  }
  function finishMote(i, colour) {
    target(i);
    dur[i] = 2 + Math.random() * 1.4;
    swirl[i] = (Math.random() < 0.5 ? -1 : 1) * (50 + Math.random() * 170);
    ph[i] = Math.random();
    puff[i] = Math.random() < 0.06 ? 1 : 0;
    keep[i] = Math.random() < (phone() ? 0.34 : 0.4) ? 1 : 0;
    let c = colour;
    const roll = Math.random();
    if (c === WHITE) c = roll < 0.2 ? PALE : roll < 0.32 ? BLUE : roll < 0.35 ? ROSE : WHITE;
    else if (roll < 0.06) c = WHITE;
    if (puff[i]) c = roll < 0.5 ? BLUE : PALE;
    col[i] = c;
    al[i] = puff[i] ? 0.06 + Math.random() * 0.07 : 0.6 + Math.random() * 0.4;
    // Once spread, most motes dim to a whisper and only a few stay bright.
    alEnd[i] = puff[i] ? al[i] : al[i] * (0.18 + 0.82 * Math.random() ** 2.4);
  }

  // Draw the CSS text into an offscreen canvas exactly where it sits, then
  // sample its lit pixels: each becomes a mote that starts as part of a letter.
  function sampleText(budget) {
    const heroR = hero.getBoundingClientRect();
    const box = textEl.getBoundingClientRect();
    const off = document.createElement('canvas');
    off.width = Math.ceil(W); off.height = Math.ceil(H);
    const x = off.getContext('2d', { willReadFrequently: true });
    const walker = document.createTreeWalker(textEl, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const str = node.textContent;
      if (!str.trim()) continue;
      const el = node.parentElement;
      const cs = getComputedStyle(el);
      const range = document.createRange();
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      const px = parseFloat(cs.fontSize);
      x.font = `${cs.fontStyle} ${cs.fontWeight} ${px}px ${cs.fontFamily}`;
      const m = x.measureText(str);
      const asc = m.fontBoundingBoxAscent || px * 0.8;
      const desc = m.fontBoundingBoxDescent || px * 0.25;
      const base = r.top - heroR.top + asc * (r.height / (asc + desc));
      if (el.closest('.anniv__num')) {
        const g = x.createLinearGradient(0, r.top - heroR.top, 0, r.bottom - heroR.top);
        g.addColorStop(0.08, '#fff4d8'); g.addColorStop(0.48, '#f2d38f'); g.addColorStop(0.96, '#c89a4c');
        x.fillStyle = g;
      } else {
        x.fillStyle = '#eaf2fd';
      }
      const ls = parseFloat(cs.letterSpacing) || 0;
      const text = cs.textTransform === 'uppercase' ? str.toUpperCase() : str;
      let cx = r.left - heroR.left;
      for (const ch of text) { x.fillText(ch, cx, base); cx += x.measureText(ch).width + ls; }
    }
    const bx = Math.max(0, Math.floor(box.left - heroR.left - 20));
    const by = Math.max(0, Math.floor(box.top - heroR.top - 20));
    const bw = Math.min(off.width - bx, Math.ceil(box.width + 40));
    const bh = Math.min(off.height - by, Math.ceil(box.height + 40));
    const data = x.getImageData(bx, by, bw, bh).data;
    const gold = [], light = [];
    for (let y = 0; y < bh; y += 2) {
      for (let k = 0; k < bw; k += 2) {
        const o = (y * bw + k) * 4;
        if (data[o + 3] < 140) continue;
        (data[o] - data[o + 2] > 40 ? gold : light).push(bx + k, by + y);
      }
    }
    // Balance the budget so the fine caption still has plenty of motes.
    const take = (arr, want, colour, out) => {
      const count = arr.length / 2;
      for (let s = 0; s < want && count; s++) {
        const p = Math.floor(Math.random() * count) * 2;
        out.push([arr[p] + Math.random() * 2, arr[p + 1] + Math.random() * 2, colour]);
      }
    };
    const picks = [];
    const goldWant = light.length ? Math.round(budget * 0.6) : budget;
    take(gold, goldWant, GOLD, picks);
    take(light, budget - (gold.length ? goldWant : 0), WHITE, picks);
    return { picks, left: box.left - heroR.left, width: box.width };
  }

  // ---------- Frame ----------
  let last = performance.now(), clock = 0, owed = 0;
  let opening = mode === 'hook' && root.classList.contains('anniv-on');
  let tl = null, built = false, heroVisible = true;
  const fade = { v: 0 };  // 0 = the full dissolve, 1 = settled into the lasting atmosphere
  const night = { v: 0 }; // 0 = still on paper (normal blending), 1 = night (additive glow)
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe(hero);

  function frame(now) {
    requestAnimationFrame(frame);
    let real = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (document.hidden || !built || (!opening && !heroVisible)) return;
    // The lasting atmosphere drifts slowly: 30 fps is plenty and halves its cost.
    if (!opening) {
      owed += real;
      if (owed < 1 / 31) return;
      real = Math.min(0.05, owed);
      owed = 0;
    }
    clock += real;
    const t = tl ? tl.time() : 99; // seconds since the dissolve began
    const f = fade.v;
    const kKeep = 1 + (AMBIENT - 1) * f, kDrop = 1 - f;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = night.v > 0.5 ? 'lighter' : 'source-over';
    const count = live ? live.length : n;
    for (let q = 0; q < count; q++) {
      const i = live ? live[q] : q;
      const u = (t - rel[i]) / dur[i];
      let x, y, a, d;
      if (u <= 0) {
        // Still part of a letter: lights up just ahead of the dissolve front.
        a = clamp01((t - rel[i] + 0.45) / 0.4) * al[i];
        if (puff[i] || a <= 0) continue;
        x = hx[i] + Math.sin(clock * 3 + ph[i] * 20) * 0.3;
        y = hy[i];
        d = sz[i] * 6;
      } else {
        const e = u >= 1 ? 1 : 1 - (1 - u) * (1 - u) * (1 - u);
        const dx = tx[i] - hx[i], dy = ty[i] - hy[i];
        const len = Math.hypot(dx, dy) || 1;
        const s = Math.sin(Math.PI * e) * swirl[i];
        const ang = flow(hx[i] + dx * e + fx[i], hy[i] + dy * e + fy[i], clock);
        const w = u >= 1 ? 1 : u;
        fx[i] += Math.cos(ang) * 10 * real * w;
        fy[i] += (Math.sin(ang) * 10 - 3) * real * w;
        x = hx[i] + dx * e - (dy / len) * s + fx[i];
        y = hy[i] + dy * e + (dx / len) * s + fy[i];
        if (u >= 1) {
          // Settled: wrap softly around the edges so the field stays full.
          if (x < -40) fx[i] += W + 80; else if (x > W + 40) fx[i] -= W + 80;
          if (y < -40) fy[i] += H + 80; else if (y > H + 40) fy[i] -= H + 80;
        }
        a = puff[i] ? al[i] * e : al[i] + (alEnd[i] - al[i]) * e;
        d = puff[i] ? sz[i] * (0.6 + 1.4 * e) : sz[i] * (6 + 1.5 * e);
      }
      a *= (keep[i] ? kKeep : kDrop) * (0.72 + 0.28 * Math.sin(clock * (0.8 + ph[i] * 1.4) + ph[i] * 30));
      if (a <= 0.004) continue;
      ctx.globalAlpha = a;
      ctx.drawImage(sprites[night.v < 0.5 && col[i] !== GOLD ? BLUE : col[i]], x - d / 2, y - d / 2, d, d);
    }
    ctx.globalAlpha = 1;
  }

  function cull() {
    const ids = [];
    for (let i = 0; i < n; i++) if (keep[i]) ids.push(i);
    live = Uint32Array.from(ids);
  }

  // Revisits: no text, just the settled field across the hero.
  function seedAmbient() {
    alloc(phone() ? 1800 : 3200);
    for (let i = 0; i < n; i++) {
      finishMote(i, Math.random() < 0.55 ? GOLD : WHITE);
      hx[i] = tx[i]; hy[i] = ty[i];
      rel[i] = -99;
      sz[i] = 0.9 + Math.random() * 1.1;
      if (puff[i]) sz[i] = 16 + Math.random() * 22;
    }
    cull();
    fade.v = 1;
    night.v = 1;
    built = true;
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const [w0, h0] = [W, H];
      size();
      const kx = W / (w0 || W), ky = H / (h0 || H);
      for (let i = 0; i < n; i++) { hx[i] *= kx; tx[i] *= kx; fx[i] *= kx; hy[i] *= ky; ty[i] *= ky; fy[i] *= ky; }
    }, 200);
  });

  // Exposed for automated checks (tools/verify-site.mjs).
  window.__anniv = {
    phase: () => (opening ? (tl ? 'dissolve' : 'text') : 'ambient'),
    motes: () => (live ? live.length : n),
  };

  requestAnimationFrame(frame);
  if (!opening) {
    seedAmbient();
    gsap.to(canvas, { opacity: 1, duration: 2.4, ease: 'power2.inOut' });
    return noop;
  }

  // ---------- With the hook ----------
  let skipped = false;

  // Seconds until the title reveal (CSS, timed from first paint) has finished, plus a beat.
  function holdFor() {
    return Math.max(0, ...textEl.getAnimations({ subtree: true }).map((a) => (a.effect.getComputedTiming().endTime - (a.currentTime ?? 0)) / 1000)) + HOLD;
  }

  // The lights go down: the text takes its night colours (CSS) and the particles will glow.
  function dusk(sec) {
    root.classList.add('anniv-dusk');
    gsap.to(night, { v: 1, duration: sec, ease: 'power2.inOut' });
  }

  function dissolve() {
    if (tl) return;
    const { picks, left, width } = sampleText(phone() ? 1500 : 2800);

    alloc(picks.length);
    for (let i = 0; i < n; i++) {
      const [x, y, c] = picks[i];
      hx[i] = x; hy[i] = y;
      finishMote(i, c);

      const front = ((x - left) / (width || 1) + 0.15) / 1.3 * SWEEP;
      rel[i] = front + Math.random() * 0.15;
      sz[i] = c === GOLD ? 1.1 + Math.random() * 0.9 : 0.85 + Math.random() * 0.6;
      if (puff[i]) sz[i] = 16 + Math.random() * 22;
    }
    built = true;
    gsap.set(canvas, { opacity: 1 });
    // "20th" and "Anniversary Celebration" go together, with the logo.
    tl = gsap.timeline()
      .fromTo(textEl, { '--cut': '-15%' }, { '--cut': '115%', duration: SWEEP, ease: 'none' }, 0)
      .to(fade, { v: 1, duration: FADE, ease: 'power2.inOut' }, FADE_AT)
      .add(settle, FADE_AT + FADE);
    if (skipped) tl.timeScale(6);
  }

  // Settled: the text is gone; the kept particles are the lasting atmosphere.
  function settle() {
    opening = false;
    root.classList.remove('anniv-on', 'anniv-dusk');
    cull();
  }

  function skip() {
    if (skipped) return;
    skipped = true;
    textEl.getAnimations({ subtree: true }).forEach((a) => a.finish());
    tl?.timeScale(6);
  }

  return { holdFor, dusk, dissolve, skip };
}
