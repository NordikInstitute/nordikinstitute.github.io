// Hero wordmark built from poster tiles (WebGL point sprites).
//
// The word is rasterised once and sampled on a grid. Every inked cell becomes
// a tile whose texture is the matching slice of one research poster, so the
// posters read "through" the letters. Tiles fall in like snow and settle,
// part around the pointer, and are carried off by wind as the hero scrolls
// away. A layer of slow snow drifts behind. Falls back to a static 2D render.

const ATLAS_W = 2048;
const ATLAS_H = 1024;
const ATLAS_COLS = 5;
const ATLAS_ROWS = 2;
const FLOATS = 12; // home(2) sky(3) info(4) uv(2) kind(1)

const VERT = `
attribute vec2 aHome;
attribute vec3 aSky;
attribute vec4 aInfo;
attribute vec2 aUV;
attribute float aKind;
uniform vec2 uRes;
uniform float uDpr;
uniform float uTime;
uniform float uReveal;
uniform float uScatter;
uniform float uCell;
uniform vec2 uMouse;
varying vec2 vUV;
varying float vAlpha;
varying float vBright;
varying float vKind;
varying float vLand;
varying float vGlow;

float inOut(float t) { return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0; }

void main() {
  float bright = aInfo.x;
  float delay = aInfo.y;
  float dur = aInfo.z;
  float phase = aInfo.w;
  float depth = aSky.z;
  vec2 pos;
  float size;
  float alpha;
  float land = 0.0;
  float glow = 0.0;

  if (aKind > 0.5) {
    // Snow: an endless slow fall; nearer flakes are larger and faster.
    float speed = mix(30.0, 8.0, depth);
    float y = mod(aSky.y + uTime * speed, uRes.y + 60.0) - 30.0;
    float x = aSky.x + sin(uTime * (0.22 + 0.25 * phase) + phase * 6.2831) * mix(28.0, 8.0, depth);
    pos = vec2(x + uScatter * mix(520.0, 180.0, depth), y);
    size = mix(3.2, 1.1, depth);
    alpha = mix(0.6, 0.14, depth);
  } else {
    float t = clamp((uReveal - delay) / dur, 0.0, 1.0);
    float k = inOut(t);
    vec2 p = mix(aSky.xy, aHome, k);
    // A decaying sway while falling reads as a flake settling, not a tween.
    p.x += (1.0 - k) * sin(uTime * 1.4 + phase * 12.0) * (16.0 + 34.0 * (1.0 - depth));

    // Wind on scroll: tiles lift away in a ragged order.
    float q = clamp(uScatter * 1.8 - phase * 0.8, 0.0, 1.0);
    q *= q;
    p += vec2(1.0, -0.42) * q * (240.0 + 900.0 * fract(phase * 7.31));
    p.y += sin(phase * 40.0 + uTime * 1.5) * 26.0 * q;

    // The pointer parts the tiles it passes over.
    vec2 d = p - uMouse;
    float dl = length(d);
    float push = smoothstep(140.0, 0.0, dl) * k * (1.0 - q);
    p += (dl > 0.001 ? d / dl : vec2(0.0)) * push * 28.0;
    glow = push;

    p.y += sin(uTime * 0.9 + phase * 6.2831) * 0.7 * k;
    pos = p;
    land = smoothstep(0.55, 1.0, k) * (1.0 - q);
    float flake = mix(3.0, 1.6, depth);
    size = mix(flake, uCell * (0.8 + 0.1 * bright), smoothstep(0.3, 1.0, k)) * (1.0 + 0.25 * push);
    alpha = smoothstep(0.0, 0.3, uReveal - delay * 0.6) * mix(0.5, 1.0, land) * (1.0 - 0.9 * q);
  }

  vUV = aUV;
  vBright = bright;
  vKind = aKind;
  vLand = land;
  vAlpha = alpha;
  vGlow = glow;
  vec2 clip = pos / uRes * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = max(size * uDpr, 1.0);
}`;

const FRAG = `
precision mediump float;
uniform sampler2D uAtlas;
uniform vec2 uWin;
uniform float uTwinkle; // wrapped time; a separate name avoids a precision clash with the vertex uTime
varying vec2 vUV;
varying float vAlpha;
varying float vBright;
varying float vKind;
varying float vLand;
varying float vGlow;

void main() {
  vec2 pc = gl_PointCoord;
  vec3 cream = vec3(0.984, 0.933, 0.878);
  if (vKind > 0.5) {
    float a = smoothstep(0.5, 0.1, length(pc - 0.5)) * vAlpha;
    gl_FragColor = vec4(cream * a, a);
    return;
  }
  vec2 q = abs(pc - 0.5);
  float mask = 1.0 - smoothstep(0.40, 0.5, max(q.x, q.y));
  vec3 tex = texture2D(uAtlas, vUV + pc * uWin).rgb;
  // Lift dark poster areas so the letterforms stay legible, warm toward cream,
  // then shade top-to-bottom like the metallic display type elsewhere.
  float lum = dot(tex, vec3(0.2126, 0.7152, 0.0722));
  vec3 col = mix(tex, cream, 0.1 + 0.32 * (1.0 - lum));
  col = mix(vec3(dot(col, vec3(0.333))), col, 1.25); // a touch more saturation
  col *= 0.5 + 0.6 * vBright;
  col *= 0.93 + 0.07 * sin(uTwinkle * 1.6 + vBright * 53.0);
  col += vec3(0.96, 0.64, 0.23) * vGlow * 0.45;
  col = mix(cream * 0.9, col, vLand);
  float a = mask * vAlpha;
  gl_FragColor = vec4(col * a, a);
}`;

function rand(seed) {
  // Small deterministic PRNG so the layout is stable across resizes.
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildAtlas(images) {
  const c = document.createElement('canvas');
  c.width = ATLAS_W;
  c.height = ATLAS_H;
  const g = c.getContext('2d');
  g.fillStyle = '#10243a';
  g.fillRect(0, 0, ATLAS_W, ATLAS_H);
  const cw = ATLAS_W / ATLAS_COLS;
  const ch = ATLAS_H / ATLAS_ROWS;
  images.slice(0, ATLAS_COLS * ATLAS_ROWS).forEach((img, i) => {
    const x = (i % ATLAS_COLS) * cw;
    const y = Math.floor(i / ATLAS_COLS) * ch;
    // Cover-fit each poster into its cell, anchored to the top.
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s;
    g.drawImage(img, x + (cw - w) / 2, y, w, img.naturalHeight * s);
  });
  return { canvas: c, count: Math.min(images.length, ATLAS_COLS * ATLAS_ROWS), cw, ch };
}

function buildGeometry({ W, H, box, word, atlas, font }) {
  const cell = W < 600 ? 5 : W < 1100 ? 7 : 9;
  const off = document.createElement('canvas');
  const ctx = off.getContext('2d', { willReadFrequently: true });
  ctx.font = `900 100px ${font}`;
  let m = ctx.measureText(word);
  const ratioW = (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) / 100;
  const ratioH = (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) / 100 || 0.7;
  const fs = Math.max(24, Math.min((box.w * 0.98) / ratioW, (box.h * 0.94) / ratioH));
  ctx.font = `900 ${fs}px ${font}`;
  m = ctx.measureText(word);
  const tw = Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight);
  const th = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);
  off.width = tw + 4;
  off.height = th + 4;
  ctx.font = `900 ${fs}px ${font}`;
  ctx.fillStyle = '#fff';
  ctx.fillText(word, 2 + m.actualBoundingBoxLeft, 2 + m.actualBoundingBoxAscent);
  const px = ctx.getImageData(0, 0, off.width, off.height).data;

  const ox = box.x + (box.w - tw) / 2;
  const oy = box.y + (box.h - th) / 2;
  const r = rand(20262026);
  const strips = atlas.count;
  const stripW = tw / strips;
  // Region aspect vs atlas-cell aspect: each strip shows the poster's centre column.
  const ar = stripW / th;
  const ac = atlas.cw / atlas.ch;
  const fracW = Math.min(1, ar / ac);
  const winU = (cell / stripW) * fracW * (atlas.cw / ATLAS_W);
  const winV = (cell / th) * (atlas.ch / ATLAS_H);

  const tiles = [];
  for (let gy = cell / 2; gy < th; gy += cell) {
    for (let gx = cell / 2; gx < tw; gx += cell) {
      const ix = Math.min(off.width - 1, Math.round(gx + 2));
      const iy = Math.min(off.height - 1, Math.round(gy + 2));
      if (px[(iy * off.width + ix) * 4 + 3] < 140) continue;
      // Wavy seams between posters avoid hard vertical cuts.
      const wob = Math.sin(gy * 0.045 + gx * 0.004) * cell * 2.2;
      const si = Math.max(0, Math.min(strips - 1, Math.floor((gx + wob) / stripW)));
      const lx = (gx - si * stripW) / stripW;
      const cu = (si % ATLAS_COLS) * atlas.cw / ATLAS_W;
      const cv = Math.floor(si / ATLAS_COLS) * atlas.ch / ATLAS_H;
      const u = cu + (atlas.cw / ATLAS_W) * ((1 - fracW) / 2 + Math.min(1, Math.max(0, lx)) * fracW) - winU / 2;
      const v = cv + (atlas.ch / ATLAS_H) * (gy / th) - winV / 2;
      const hx = ox + gx;
      const hy = oy + gy;
      const xr = gx / tw;
      tiles.push([
        hx, hy,
        hx + (r() - 0.5) * W * 0.7, -40 - r() * H * 0.95, r(),
        0.72 + 0.28 * (1 - gy / th) + (r() - 0.5) * 0.14,
        xr * 0.95 + r() * 0.5,
        0.95 + r() * 0.55,
        r(),
        u, v, 0,
      ]);
    }
  }

  const snowCount = Math.min(340, Math.round((W * H) / 5200));
  const snow = [];
  for (let i = 0; i < snowCount; i++) {
    snow.push([0, 0, r() * W, r() * (H + 60), r(), 0, 0, 1, r(), 0, 0, 1]);
  }
  const all = snow.concat(tiles);
  const data = new Float32Array(all.length * FLOATS);
  all.forEach((t, i) => data.set(t, i * FLOATS));
  return { data, count: all.length, tileCount: tiles.length, cell, win: [winU, winV] };
}

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
  return s;
}

export function createMosaic({ canvas, stage, images, reduced = false, word = 'NORDIK', font = '"Barlow Condensed", "Arial Narrow", sans-serif' }) {
  const atlas = buildAtlas(images);
  const state = {
    playing: false, revealStart: null, scatter: 0,
    mouse: { x: -1e4, y: -1e4 }, target: { x: -1e4, y: -1e4 }, hasPointer: false,
    visible: true, raf: 0, geom: null, W: 0, H: 0, dpr: 1,
  };

  let gl = null;
  try {
    gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'high-performance' });
  } catch { gl = null; }

  let prog, buf, loc;
  if (gl) {
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
      gl.useProgram(prog);
      buf = gl.createBuffer();
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      loc = {};
      for (const n of ['uRes', 'uDpr', 'uTime', 'uTwinkle', 'uReveal', 'uScatter', 'uCell', 'uMouse', 'uAtlas', 'uWin']) loc[n] = gl.getUniformLocation(prog, n);
      for (const n of ['aHome', 'aSky', 'aInfo', 'aUV', 'aKind']) loc[n] = gl.getAttribLocation(prog, n);
      gl.uniform1i(loc.uAtlas, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
    } catch (err) {
      console.warn('[mosaic] WebGL unavailable, using 2D fallback:', err);
      gl = null;
      // A canvas that already holds a WebGL context cannot hand out a 2D one.
      const fresh = canvas.cloneNode(false);
      canvas.replaceWith(fresh);
      canvas = fresh;
    }
  }
  const ctx2d = gl ? null : canvas.getContext('2d');

  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    if (!W || !H) return;
    state.W = W; state.H = H; state.dpr = dpr;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const c = canvas.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    const box = { x: s.left - c.left, y: s.top - c.top, w: s.width, h: s.height };
    state.geom = buildGeometry({ W, H, box, word, atlas, font });
    if (gl) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, state.geom.data, gl.STATIC_DRAW);
      const stride = FLOATS * 4;
      const attr = (name, size, offset) => {
        if (loc[name] < 0) return;
        gl.enableVertexAttribArray(loc[name]);
        gl.vertexAttribPointer(loc[name], size, gl.FLOAT, false, stride, offset * 4);
      };
      attr('aHome', 2, 0); attr('aSky', 3, 2); attr('aInfo', 4, 5); attr('aUV', 2, 9); attr('aKind', 1, 11);
      gl.uniform2f(loc.uRes, W, H);
      gl.uniform1f(loc.uDpr, dpr);
      gl.uniform1f(loc.uCell, state.geom.cell);
      gl.uniform2f(loc.uWin, state.geom.win[0], state.geom.win[1]);
    }
  }

  function draw(now) {
    const t = now / 1000;
    if (state.playing && state.revealStart === null) state.revealStart = t;
    const reveal = reduced ? 100 : state.revealStart === null ? -10 : t - state.revealStart;
    if (gl) {
      if (state.hasPointer) {
        state.mouse.x += (state.target.x - state.mouse.x) * 0.2;
        state.mouse.y += (state.target.y - state.mouse.y) * 0.2;
      }
      gl.uniform1f(loc.uTime, reduced ? 0 : t);
      gl.uniform1f(loc.uTwinkle, reduced ? 0 : t % 1000);
      gl.uniform1f(loc.uReveal, reveal);
      gl.uniform1f(loc.uScatter, state.scatter);
      gl.uniform2f(loc.uMouse, state.mouse.x, state.mouse.y);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, state.geom.count);
    } else {
      draw2d();
    }
  }

  // Static fallback: tiles at home, no motion.
  function draw2d() {
    const { geom, dpr } = state;
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx2d.clearRect(0, 0, state.W, state.H);
    const size = geom.cell * 0.82;
    for (let i = 0; i < geom.count; i++) {
      const o = i * FLOATS;
      if (geom.data[o + 11] > 0.5) continue;
      const sx = geom.data[o + 9] * ATLAS_W;
      const sy = geom.data[o + 10] * ATLAS_H;
      ctx2d.globalAlpha = 0.55 + 0.45 * geom.data[o + 5];
      ctx2d.drawImage(atlas.canvas, sx, sy, geom.win[0] * ATLAS_W, geom.win[1] * ATLAS_H, geom.data[o] - size / 2, geom.data[o + 1] - size / 2, size, size);
    }
    ctx2d.globalAlpha = 1;
  }

  function loop(now) {
    state.raf = requestAnimationFrame(loop);
    if (state.visible && !document.hidden) draw(now);
  }

  function onPointer(e) {
    const r = canvas.getBoundingClientRect();
    state.target.x = e.clientX - r.left;
    state.target.y = e.clientY - r.top;
    if (!state.hasPointer) { state.mouse.x = state.target.x; state.mouse.y = state.target.y; state.hasPointer = true; }
  }
  function onLeave() { state.hasPointer = false; state.mouse.x = state.mouse.y = state.target.x = state.target.y = -1e4; }

  let resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const w = canvas.clientWidth;
      if (Math.abs(w - state.W) < 2 && Math.abs(canvas.clientHeight - state.H) < 120) return; // ignore mobile URL-bar jitter
      layout();
      if (state.playing) state.revealStart = performance.now() / 1000 - 100;
      if (reduced || !gl) draw(performance.now());
    }, 180);
  }

  layout();
  const animated = gl && !reduced;
  if (animated) {
    state.raf = requestAnimationFrame(loop);
    const hero = canvas.parentElement;
    hero.addEventListener('pointermove', onPointer, { passive: true });
    hero.addEventListener('pointerleave', onLeave);
    new IntersectionObserver(([e]) => { state.visible = e.isIntersecting; }).observe(canvas);
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); cancelAnimationFrame(state.raf); });
  } else {
    draw(performance.now());
  }
  window.addEventListener('resize', onResize);

  return {
    webgl: !!gl,
    tiles: () => state.geom?.tileCount ?? 0,
    play() { state.playing = true; if (!animated) draw(performance.now()); },
    setScatter(p) { state.scatter = p; },
  };
}
