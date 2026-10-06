// Maths section: copy column + zeta(1/2 + it) traced on the landing's 2 px pixel grid with 8x8 Bayer dithering.
// The trace runs while the section is on screen and loops: it slows down at each non-trivial zero, dissolves at the end
// and starts over.
import content from './content.js';
import config from './config.js';
import { zeta } from './zeta.js';
import { BAYER, pack, cssRgb } from './pixels.js';
import { mountLeadIn } from './leadin.js';
import { replayButton } from '../../core/replay.js';
import { screenH, onScreen } from '../../core/viewport.js';

export const id = 'math';
export const title = content.heading;
export const edges = { top: config.palette.bg, bottom: config.palette.bg };
// the approach just above the section: black, with only sparse dots of the Lagrangian's paper on its last rows
export const leadIn = { edges: { top: config.leadIn.black, bottom: config.palette.paper }, dwell: config.leadIn.dwell, mount: mountLeadIn };

const P = config.pixel;
const TR = config.trace;

// OKLab mix of yellow and teal, 256 steps
const lin = v => (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
const gam = v => v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
function toLab([r, g, b]) {
  r = lin(r); g = lin(g); b = lin(b);
  const l = Math.cbrt(0.4122214708*r + 0.5363325363*g + 0.0514459929*b);
  const m = Math.cbrt(0.2119034982*r + 0.6806995451*g + 0.1073969566*b);
  const s = Math.cbrt(0.0883024619*r + 0.2817188376*g + 0.6299787005*b);
  return [0.2104542553*l + 0.7936177850*m - 0.0040720468*s, 1.9779984951*l - 2.4285922050*m + 0.4505937099*s, 0.0259040371*l + 0.7827717662*m - 0.8086757660*s];
}
function fromLab([L, a, b]) {
  const l = (L + 0.3963377774*a + 0.2158037573*b) ** 3, m = (L - 0.1055613458*a - 0.0638541728*b) ** 3, s = (L - 0.0894841775*a - 1.2914855480*b) ** 3;
  return [4.0767416621*l - 3.3077115913*m + 0.2309699292*s, -1.2684380046*l + 2.6097574011*m - 0.3413193965*s, -0.0041960863*l - 0.7034186147*m + 1.7076147010*s]
    .map(v => Math.round(255 * Math.min(1, Math.max(0, gam(v)))));
}

// ---------- the curve, sampled once ----------
const T_MAX = TR.tMax, DT = TR.dt, COUNT = Math.round(T_MAX / DT) + 1;
const ZR = new Float64Array(COUNT), ZI = new Float64Array(COUNT), MAG = new Float64Array(COUNT);
let minR = 0, maxR = 0, minI = 0, maxI = 0;
for (let i = 0; i < COUNT; i++) {
  const [r, im] = zeta(i * DT); ZR[i] = r; ZI[i] = im; MAG[i] = Math.hypot(r, im);
  minR = Math.min(minR, r); maxR = Math.max(maxR, r); minI = Math.min(minI, im); maxI = Math.max(maxI, im);
}
const ZEROS = [];
for (let i = 1; i < COUNT - 1; i++) if (MAG[i] < 0.03 && MAG[i] <= MAG[i - 1] && MAG[i] < MAG[i + 1]) {
  let a = (i - 1) * DT, b = (i + 1) * DT;
  for (let n = 0; n < 30; n++) { const m1 = b - (b - a) / 1.618, m2 = a + (b - a) / 1.618; if (Math.hypot(...zeta(m1)) < Math.hypot(...zeta(m2))) b = m2; else a = m1; }
  ZEROS.push((a + b) / 2);
}

// the inside of .copy, rewritten on a language switch
const copyText = () => `
    <h2>${content.heading}</h2>
    ${content.paragraphs.map(p => `<p>${p}</p>`).join('\n    ')}
    <div class="cap">${content.caption}</div>`;

function markup() {
  return `
  <canvas class="trace" aria-hidden="true"></canvas>
  <div class="copy">${copyText()}
  </div>
  <div class="stage"></div>
  <div class="zlabel" aria-hidden="true"></div>`;
}

export async function mount(root, env) {
  const REDUCED = env.reduced;
  root.setAttribute('aria-label', content.ariaLabel);
  for (const [k, v] of Object.entries(config.palette)) root.style.setProperty('--' + k, v);
  root.innerHTML = markup();
  // replays the Lagrangian transition into this section, which itself starts the trace over underneath
  const replayEl = replayButton(root, content.replay, () => env.nav.goTo(env.index));

  const C_BG = cssRgb(root, '--bg'), C_INK = cssRgb(root, '--ink'), C_GEO = cssRgb(root, '--geo');
  const C_Y = cssRgb(root, '--yellow'), C_T = cssRgb(root, '--teal');
  const BG32 = pack(...C_BG), ink32 = pack(...C_INK);
  const LY = toLab(C_Y), LT = toLab(C_T);
  const PAL = Array.from({ length: 256 }, (_, i) => fromLab(LY.map((v, j) => v + (LT[j] - v) * i / 255)));
  const PAL32 = Uint32Array.from(PAL, c => pack(...c));

  const S = { ...config.tuning };                 // slider values
  const KK = new Float32Array(COUNT);
  const mixK = mag => 1 - Math.exp(-((mag / S.crad) ** 2));
  const recolor = () => { for (let i = 0; i < COUNT; i++) KK[i] = mixK(MAG[i]); };

  const stageEl = root.querySelector('.stage'), copyEl = root.querySelector('.copy');
  const zc = root.querySelector('canvas.trace'), zctx = zc.getContext('2d');
  const labelEl = root.querySelector('.zlabel');
  let readEl = null;                               // tuning panel readout (TEST ONLY)

  const Z = {
    GW: 0, GH: 0, img: null, out32: null, base: null,
    trA: null, trK: null, glA: null, glK: null, hot: null, hotList: [],
    scale: 1, ox: 0, oy: 0, drawn: 0,
    t: 0, v: 0, fade: 0, running: false, side: 1, vert: 1,
  };
  const zx = r => Z.ox + r * Z.scale, zy = i => Z.oy - i * Z.scale;   // low-res pixel coords

  function zLayout() {
    const W = root.clientWidth;
    const port = !(W >= config.landscape.minWidth && window.innerWidth / screenH() >= config.landscape.minAspect);
    root.classList.toggle('port', port);
    const H = Math.max(screenH(), port ? copyEl.offsetHeight + stageEl.offsetHeight : 0);
    root.style.height = H + 'px';
    Z.GW = Math.ceil(W / P); Z.GH = Math.ceil(H / P);
    zc.width = Z.GW; zc.height = Z.GH; zc.style.width = Z.GW * P + 'px'; zc.style.height = Z.GH * P + 'px';
    const n = Z.GW * Z.GH;
    Z.img = zctx.createImageData(Z.GW, Z.GH); Z.out32 = new Uint32Array(Z.img.data.buffer);
    Z.base = new Uint32Array(n);
    Z.trA = new Float32Array(n); Z.trK = new Float32Array(n);
    Z.glA = new Float32Array(n); Z.glK = new Float32Array(n);
    Z.hot = new Float32Array(n); Z.hotList = [];

    // fit the curve into the stage
    const sr = stageEl.getBoundingClientRect(), mr = root.getBoundingClientRect();
    const sx = (sr.left - mr.left) / P, sy = (sr.top - mr.top) / P, sw = sr.width / P, sh = sr.height / P;
    const pad = Math.max(TR.stagePad[0], Math.min(sw, sh) * TR.stagePad[1]);
    Z.scale = Math.min((sw - 2 * pad) / (maxR - minR), (sh - 2 * pad) / (maxI - minI));
    Z.ox = sx + sw / 2 - (minR + maxR) / 2 * Z.scale;
    Z.oy = sy + sh / 2 + (minI + maxI) / 2 * Z.scale;
    Z.stage = [sx, sy, sw, sh];

    // static base: background plus dotted axes (construction lines, like the landing spiral)
    Z.base.fill(BG32);
    const ax = Math.round(zx(0)), ay = Math.round(zy(0));
    const geoA = TR.axisAlpha, geo32 = pack(...C_BG.map((b, j) => Math.round(b + (C_GEO[j] - b) * geoA)));
    for (let x = Math.round(sx); x < sx + sw; x += 2) if (ay >= 0 && ay < Z.GH && x >= 0 && x < Z.GW) Z.base[ay * Z.GW + x] = geo32;
    for (let y = Math.round(sy); y < sy + sh; y += 2) if (ax >= 0 && ax < Z.GW && y >= 0 && y < Z.GH) Z.base[y * Z.GW + ax] = geo32;

    Z.drawn = 0;
    zExtend(Math.floor(Z.t / DT));
  }

  // deposit a trail point with its dithered halo
  const HALO_R = TR.haloR;
  function zPlot(x, y, k) {
    const ix = x | 0, iy = y | 0, GW = Z.GW, GH = Z.GH;
    if (ix < -HALO_R || iy < -HALO_R || ix >= GW + HALO_R || iy >= GH + HALO_R) return;
    if (ix >= 0 && iy >= 0 && ix < GW && iy < GH) { const i = iy * GW + ix; Z.trA[i] = TR.trailAlpha; Z.trK[i] = k; }
    for (let dy = -HALO_R; dy <= HALO_R; dy++) {
      const yy = iy + dy; if (yy < 0 || yy >= GH) continue;
      for (let dx = -HALO_R; dx <= HALO_R; dx++) {
        const xx = ix + dx; if (xx < 0 || xx >= GW) continue;
        const d = Math.hypot(dx, dy); if (d > HALO_R) continue;
        const a = TR.haloAlpha * (1 - d / HALO_R) ** 1.4, j = yy * GW + xx;
        if (a > Z.glA[j]) { Z.glA[j] = a; Z.glK[j] = k; }
      }
    }
  }
  function zSeg(i, cb) {   // walk from sample i to i+1 in half-pixel steps
    const x1 = zx(ZR[i]), y1 = zy(ZI[i]), x2 = zx(ZR[i + 1]), y2 = zy(ZI[i + 1]);
    const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 2));
    for (let s = 0; s < n; s++) { const f = s / n; cb(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f); }
  }
  function zExtend(upto) {
    upto = Math.min(upto, COUNT - 2);
    while (Z.drawn < upto) { const i = Z.drawn, k = KK[i]; zSeg(i, (x, y) => zPlot(x, y, k)); Z.drawn++; }
  }
  function zClear() { Z.trA.fill(0); Z.glA.fill(0); Z.drawn = 0; }

  function targetSpeed(tt) {
    let f = 1;
    for (const z of ZEROS) { const d = tt - z; if (Math.abs(d) < S.radius * 4) f *= 1 - Math.exp(-((d / S.radius) ** 2)); }
    return (S.vmin + (S.vmax - S.vmin) * f) * (REDUCED ? TR.reducedSpeed : 1);
  }

  const valueText = tt => content.valueLabel.replace('{t}', tt.toFixed(2));

  function zReset() { Z.t = 0; Z.v = 0; Z.fade = 0; zClear(); }

  function zFrame(dt) {
    if (Z.running) {
      if (Z.fade > 0) {
        Z.fade -= dt / TR.fadeS;
        if (Z.fade <= 0) zReset();
      } else {
        const vt = targetSpeed(Z.t);
        Z.v = S.tau > 0 ? Z.v + (vt - Z.v) * (1 - Math.exp(-dt / S.tau)) : vt;
        Z.t += Z.v * dt;
        if (Z.t >= T_MAX - 2 * DT) { Z.t = T_MAX - 2 * DT; Z.fade = 1; }
        zExtend(Math.floor(Z.t / DT));
      }
    }
    if (readEl) readEl.textContent = `v ${Z.v.toFixed(2)} · t ${Z.t.toFixed(2)}`;
    zRender();
  }

  function blend(base, c, a) {   // base: packed bg, c: [r,g,b], a: 0..1
    const r = base & 255, g = (base >> 8) & 255, b = (base >> 16) & 255;
    return pack(r + (c[0] - r) * a | 0, g + (c[1] - g) * a | 0, b + (c[2] - b) * a | 0);
  }

  function zRender() {
    const { GW, GH, out32, base, trA, trK, glA, glK, hot } = Z;
    const vis = Z.fade > 0 ? Z.fade : 1;
    const head = Math.floor(Z.t / DT);

    // comet: recomputed every frame
    for (const i of Z.hotList) hot[i] = 0;
    Z.hotList.length = 0;
    const TAIL = TR.tail;
    if (Z.running || Z.t > 0) {
      for (let k = Math.max(0, head - TAIL); k < Math.min(head, COUNT - 1); k++) {
        const f = 1 - (head - k) / TAIL, h = f * f;
        zSeg(k, (x, y) => {
          const ix = x | 0, iy = y | 0;
          for (let dy = 0; dy < (f > 0.55 ? 2 : 1); dy++) for (let dx = 0; dx < (f > 0.55 ? 2 : 1); dx++) {
            const xx = ix + dx, yy = iy + dy;
            if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) continue;
            const j = yy * GW + xx; if (h > hot[j]) { if (!hot[j]) Z.hotList.push(j); hot[j] = h; }
          }
        });
      }
    }

    for (let y = 0, i = 0; y < GH; y++) {
      const brow = (y & 7) << 3;
      for (let x = 0; x < GW; x++, i++) {
        let c = base[i];
        const bt = BAYER[brow | (x & 7)];
        if (vis < 1 && BAYER[(((x + 3) & 7) << 3) | ((y + 5) & 7)] > vis) { out32[i] = c; continue; }
        const g = glA[i];
        if (g > 0 && bt < g) c = blend(c, PAL[(glK[i] * 255) | 0], 0.5);
        const a = trA[i];
        if (a > 0) c = blend(c, PAL[(trK[i] * 255) | 0], a);
        const h = hot[i];
        if (h > 0) c = blend(c, C_INK, h * 0.75);
        out32[i] = c;
      }
    }

    // head: dithered glow, 2x2 ink block, label
    const [zr, zi] = zeta(Z.t);
    const hk = mixK(Math.hypot(zr, zi)), hc = PAL[(hk * 255) | 0], hc32 = PAL32[(hk * 255) | 0];
    const hx = zx(zr), hy = zy(zi), R = TR.headR;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const xx = (hx | 0) + dx, yy = (hy | 0) + dy; if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) continue;
      const d = Math.hypot(dx, dy); if (d > R) continue;
      const a = 0.55 * (1 - d / R) ** 2 * vis;
      if (BAYER[((yy & 7) << 3) | (xx & 7)] < a) out32[yy * GW + xx] = blend(out32[yy * GW + xx], hc, 0.85);
    }
    for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 0; dx++) {
      const xx = (hx | 0) + dx + 1, yy = (hy | 0) + dy + 1;
      if (xx >= 0 && yy >= 0 && xx < GW && yy < GH) out32[yy * GW + xx] = ink32;
    }

    // label: 30° leader, then a horizontal rule carrying the value
    const text = valueText(Z.t);
    if (labelEl.textContent !== text) labelEl.textContent = text;
    const lw = labelEl.offsetWidth / P + 8, LEAD = GW * P < TR.leader.narrow ? TR.leader.short : TR.leader.long;
    const c30 = Math.cos(Math.PI / 6), s30 = 0.5;
    const [sx, , sw] = Z.stage;
    Z.side = Z.side > 0 ? (hx + LEAD * c30 + lw + 8 > Math.min(GW, sx + sw) ? -1 : 1) : (hx - LEAD * c30 - lw - 8 < sx ? 1 : -1);
    Z.vert = Z.vert > 0 ? (hy - LEAD * s30 - 14 < 0 ? -1 : 1) : (hy + LEAD * s30 + 8 > GH ? 1 : -1);
    const ex = Math.round(hx + Z.side * LEAD * c30), ey = Math.round(hy - Z.vert * LEAD * s30);
    const line = (x1, y1, x2, y2) => {
      const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) | 0;
      for (let k = 0; k <= n; k++) {
        const xx = Math.round(x1 + (x2 - x1) * k / (n || 1)), yy = Math.round(y1 + (y2 - y1) * k / (n || 1));
        if (xx >= 0 && yy >= 0 && xx < GW && yy < GH) out32[yy * GW + xx] = hc32;
      }
    };
    if (vis >= 1) {
      let tl = Z.side > 0 ? ex : ex - lw;                         // text span, kept on screen
      tl = Math.max(2, Math.min(GW - lw - 2, tl));
      line(hx, hy, ex, ey); line(Math.min(ex, tl), ey, Math.max(ex, tl + lw), ey);
      labelEl.style.opacity = 1;
      const lx = (tl + 4) * P;
      labelEl.style.transform = `translate(${lx}px, ${(ey - 3) * P - labelEl.offsetHeight}px)`;
    } else labelEl.style.opacity = 0;

    zctx.putImageData(Z.img, 0, 0);
  }

  // ---------- tuning panel (TEST ONLY, its own module) ----------
  function retrace() { const keep = Math.floor(Z.t / DT); zClear(); zExtend(keep); }
  if (config.tuningPanel) {
    const { mountTuning } = await import('./tuning.js');
    readEl = mountTuning(root, { before: replayEl, S, onColor: () => { recolor(); retrace(); }, restart: () => restart() });
  }
  recolor();

  // ---------- loop: runs while the section is on screen ----------
  let raf = 0, last = 0, visible = false, paused = false;
  function frame(now) {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;   // kick() stamps last after the rAF time
    zFrame(dt);
    raf = visible && !paused ? requestAnimationFrame(frame) : 0;
  }
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function restart() { zReset(); Z.running = true; paused = false; kick(); }

  // -1px: a section merely touching the screen's edge (just left above or below) counts as off screen
  const io = new IntersectionObserver(e => {
    visible = e[e.length - 1].isIntersecting;
    if (visible) { paused = false; Z.running = true; kick(); }   // scrolled into freely: it plays too
  }, { rootMargin: '-1px 0px' });
  io.observe(root);

  onScreen(() => { zLayout(); zRender(); });   // not on a toolbar slide: that would restart the trace mid-scroll

  zLayout(); zRender();
  // the portrait layout depends on the copy's height, which depends on the fonts
  const ready = (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { zLayout(); zRender(); });

  return {
    ready,
    restart,                                       // the transition starts the trace over, alive underneath
    onEnter() { paused = false; Z.running = true; kick(); },
    onLeave() { paused = true; io.unobserve(root); io.observe(root); },   // re-observe: resumes if still on screen afterwards
    words: () => [copyEl, replayEl],
    relang() {
      root.setAttribute('aria-label', content.ariaLabel);
      copyEl.innerHTML = copyText();
      replayEl.textContent = content.replay;
      zLayout(); zRender();                        // the portrait layout depends on the copy's height
    },
  };
}
