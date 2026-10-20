// The Great Lakes emblem as a WebGL point cloud.
//
// The emblem SVG is rasterised on a grid; every inked cell becomes a point
// coloured by the part of the logo it came from (lakes, ring, pictograph).
// The parts sit at different depths, so tilting the cloud toward the pointer
// reveals the layering. Each point knows three places: where it was in the
// small intro logo, a random spot in a dust field filling the screen, and its
// home in the large emblem. The hook moves points intro → dust → home.

const STRIDE = 20; // home3 dust3 intro2 glow3 brand3 info4 kind2
export const FOCAL = 900;

const VERT = `
attribute vec3 aHome;
attribute vec3 aDust;
attribute vec2 aIntro;
attribute vec3 aGlow;
attribute vec3 aBrand;
attribute vec4 aInfo;   // size, burst delay, gather delay, gather duration
attribute vec2 aKind;   // 0 emblem / 1 star, phase
uniform vec2 uRes;
uniform vec2 uCenter;
uniform float uDpr;
uniform float uT;        // hook clock (s); < 0 hides emblem points
uniform float uTime;     // free-running seconds
uniform float uGatherAt;
uniform vec2 uTilt;      // pitch, yaw (radians)
uniform float uScatter;  // 0..1 scroll-away
uniform vec2 uMouse;
uniform float uLight;    // 1 = brand colours on paper, 0 = glow on night
varying vec3 vColor;
varying float vAlpha;

vec3 rot(vec3 p, vec2 t) {
  float cx = cos(t.x), sx = sin(t.x), cy = cos(t.y), sy = sin(t.y);
  p = vec3(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);
  return vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
}
float eio(float t) { return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0; }
float eo(float t) { return 1.0 - pow(1.0 - t, 3.0); }

void main() {
  float size = aInfo.x;
  float ph = aKind.y;
  vec3 p;
  float alpha;
  float land = 0.0;
  bool star = aKind.x > 0.5;

  if (star) {
    p = aDust + vec3(sin(uTime * 0.07 + ph * 6.28) * 26.0, cos(uTime * 0.05 + ph * 9.0) * 18.0, 0.0);
    p.x += uScatter * 160.0 * (ph - 0.5);
    alpha = (0.22 + 0.4 * fract(ph * 13.7)) * (0.65 + 0.35 * sin(uTime * 1.2 + ph * 40.0)) * (1.0 - uLight);
  } else {
    float kA = clamp((uT - aInfo.y) / 0.9, 0.0, 1.0);
    float kB = clamp((uT - uGatherAt - aInfo.z) / aInfo.w, 0.0, 1.0);
    p = mix(vec3(aIntro, 0.0), aDust, eo(kA));
    p += vec3(sin(uTime * 0.6 + ph * 6.28), cos(uTime * 0.5 + ph * 4.0), 0.0) * 16.0 * kA * (1.0 - kB);
    p = mix(p, aHome, eio(kB));
    land = kB;
    p.z += sin(uTime * 0.9 + ph * 6.28) * 5.0 * land;
    // Scroll away: points stream outward and toward the viewer.
    float q = clamp(uScatter * 1.6 - ph * 0.6, 0.0, 1.0);
    vec2 dir = normalize(aHome.xy + vec2(0.001, 0.0));
    p += vec3(dir * 460.0 * q, 820.0 * q * q);
    alpha = step(0.0, uT) * (1.0 - q);
  }

  vec3 r = rot(p, uTilt * (star ? 0.35 : 1.0));
  float persp = ${FOCAL.toFixed(1)} / max(${FOCAL.toFixed(1)} - r.z, 60.0);
  vec2 s = uCenter + r.xy * persp;

  vec2 d = s - uMouse;
  float dl = length(d);
  float push = smoothstep(120.0, 0.0, dl) * (star ? 0.25 : land);
  s += (dl > 0.001 ? d / dl : vec2(0.0)) * push * 24.0;

  vColor = mix(aGlow, aBrand, uLight) + vec3(0.45, 0.4, 0.3) * push * (1.0 - uLight);
  vAlpha = alpha * clamp(persp, 0.4, 1.5);
  vec2 clip = s / uRes * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = max(size * persp * uDpr, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float r = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.08, r) * vAlpha * 0.85;
  gl_FragColor = vec4(vColor * a, a);
}`;

function rand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// JS twin of the shader's projection, for DOM elements pinned to the cloud.
export function project(local, tilt, center) {
  const [x0, y0, z0] = local;
  const cx = Math.cos(tilt[0]), sx = Math.sin(tilt[0]), cy = Math.cos(tilt[1]), sy = Math.sin(tilt[1]);
  const y1 = y0 * cx - z0 * sx;
  const z1 = y0 * sx + z0 * cx;
  const x2 = x0 * cy + z1 * sy;
  const z2 = -x0 * sy + z1 * cy;
  const persp = FOCAL / Math.max(FOCAL - z2, 60);
  return [center[0] + x2 * persp, center[1] + y1 * persp];
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const BRAND = { lake: [0.004, 0.267, 0.569], ring: [0.624, 0.729, 0.867], red: [0.667, 0.039, 0.153] };
// Night colours: brighter than the print logo so the cloud luminesces.
const GLOW = { lake: [0.3, 0.6, 1.0], ring: [0.62, 0.74, 0.92], red: [1.0, 0.3, 0.42] };

export class PointCloud {
  constructor(canvas) {
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL unavailable');
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
    gl.useProgram(prog);
    this.gl = gl;
    this.canvas = canvas;
    this.buf = gl.createBuffer();
    this.loc = {};
    for (const n of ['uRes', 'uCenter', 'uDpr', 'uT', 'uTime', 'uGatherAt', 'uTilt', 'uScatter', 'uMouse', 'uLight']) this.loc[n] = gl.getUniformLocation(prog, n);
    for (const n of ['aHome', 'aDust', 'aIntro', 'aGlow', 'aBrand', 'aInfo', 'aKind']) this.loc[n] = gl.getAttribLocation(prog, n);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    this.count = 0;
    this.emblemPoints = 0;
  }

  // layout: { W, H, cx, cy, ew, eh, intro: {x,y,w,h} | null }
  build(img, layout) {
    const { W, H, cx, cy, ew, eh, intro } = layout;
    const gl = this.gl;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    const step = ew > 480 ? 3.2 : ew > 320 ? 2.9 : 2.6;
    const cw = Math.max(8, Math.round(ew / step));
    const ch = Math.max(8, Math.round(eh / step));
    const off = document.createElement('canvas');
    off.width = cw;
    off.height = ch;
    const g = off.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, cw, ch);
    const px = g.getImageData(0, 0, cw, ch).data;

    const r = rand(2026);
    const out = [];
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const i = (y * cw + x) * 4;
        if (px[i + 3] < 100) continue;
        const R = px[i], G = px[i + 1];
        const part = R > 120 && G < 90 ? 'red' : R > 100 && G > 140 ? 'ring' : 'lake';
        const u = (x + 0.5 + (r() - 0.5) * 0.7) / cw;
        const v = (y + 0.5 + (r() - 0.5) * 0.7) / ch;
        const hx = (u - 0.5) * ew;
        const hy = (v - 0.5) * eh;
        const hz = part === 'ring' ? -38 + (r() - 0.5) * 10 : part === 'red' ? 52 + (r() - 0.5) * 18 : (r() - 0.5) * 26;
        const dx = r() * W - cx;
        const dy = r() * H - cy;
        const dz = -360 + r() * 620;
        const ix = intro ? intro.x + u * intro.w - cx : dx;
        const iy = intro ? intro.y + v * intro.h - cy : dy;
        const tint = 0.82 + r() * 0.3;
        const glow = GLOW[part].map((c) => Math.min(1, c * tint));
        const size = step * (part === 'ring' ? 0.62 : 0.78) * (0.8 + r() * 0.45);
        out.push(hx, hy, hz, dx, dy, dz, ix, iy, ...glow, ...BRAND[part], size, r() * 0.3 + u * 0.12, u * 0.22 + r() * 0.3, 0.9 + r() * 0.5, 0, r());
      }
    }
    this.emblemPoints = out.length / STRIDE;

    const stars = Math.min(720, Math.round((W * H) / 2400));
    for (let i = 0; i < stars; i++) {
      const c = 0.75 + r() * 0.25;
      out.push(0, 0, 0, r() * W * 1.2 - cx - W * 0.1, r() * H * 1.2 - cy - H * 0.1, -700 + r() * 760, 0, 0, c * 0.86, c * 0.9, c, 0, 0, 0, 0.9 + r() * 1.6, 0, 0, 1, 1, r());
    }
    const data = new Float32Array(out);
    this.count = data.length / STRIDE;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const bytes = STRIDE * 4;
    let off4 = 0;
    for (const [name, n] of [['aHome', 3], ['aDust', 3], ['aIntro', 2], ['aGlow', 3], ['aBrand', 3], ['aInfo', 4], ['aKind', 2]]) {
      const l = this.loc[name];
      if (l >= 0) {
        gl.enableVertexAttribArray(l);
        gl.vertexAttribPointer(l, n, gl.FLOAT, false, bytes, off4 * 4);
      }
      off4 += n;
    }
    gl.uniform2f(this.loc.uRes, W, H);
    gl.uniform2f(this.loc.uCenter, cx, cy);
    gl.uniform1f(this.loc.uDpr, dpr);
  }

  // s: { t, time, gatherAt, tilt: [pitch, yaw], scatter, mouse: [x, y], light }
  draw(s) {
    const gl = this.gl;
    const L = this.loc;
    gl.uniform1f(L.uT, s.t);
    gl.uniform1f(L.uTime, s.time);
    gl.uniform1f(L.uGatherAt, s.gatherAt);
    gl.uniform2f(L.uTilt, s.tilt[0], s.tilt[1]);
    gl.uniform1f(L.uScatter, s.scatter);
    gl.uniform2f(L.uMouse, s.mouse[0], s.mouse[1]);
    gl.uniform1f(L.uLight, s.light);
    // On paper, normal blending matches the printed logo; at night, additive
    // blending lets dense areas glow.
    if (s.light > 0.5) gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    else gl.blendFunc(gl.ONE, gl.ONE);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, this.count);
  }
}
