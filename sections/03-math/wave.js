// The combined wave function of two identical particles, |psi(x1, x2)|^2: two Gaussian packets crossing on a line,
// symmetrised (bosons) or antisymmetrised (fermions). Drawn as a wireframe surface over the (x1, x2) plane, on the
// section's 2 px grid: the lines are coloured by height on the purple -> green -> yellow scale and dithered (8x8 Bayer)
// where they thin out. Drag to turn it; drag it up until it is edge-on and it snaps flat into a 2D curve, the
// outline of the surface seen from the side. Drag down (or the 3D / 2D switch) to get the surface back.
// Knobs: config.wave. The section owns the loop, the switches and the words; this module owns the picture.
import config from './config.js';
import { BAYER, pack, clamp01, cssRgb } from './pixels.js';

const P = config.pixel;
const WV = config.wave;
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const C30 = Math.cos(Math.PI / 6), S30 = 0.5;

// root: the section (colours). stage: the box the figure fills, and the drag surface. reserve(): CSS px kept free at
// the bottom of the stage (the switches). labels: { peak, sep, ax1, ax2 } elements inside the stage.
// sepText(d): the words of the separation label. onMode(mode): '3d' or '2d' is now the target (switch, hint).
export function createWave({ root, stage, canvas, labels, reduced, reserve, sepText, onMode }) {
  const ctx = canvas.getContext('2d');
  const C_BG = cssRgb(root, '--bg'), C_INK = cssRgb(root, '--ink'), C_GEO = cssRgb(root, '--geo');
  const mix = (a, b, k) => a.map((v, j) => Math.round(v + (b[j] - v) * k));
  const BG32 = pack(...C_BG), INK32 = pack(...C_INK);
  const GEO32 = pack(...mix(C_BG, C_GEO, config.trace.axisAlpha));
  const AXIS32 = pack(...mix(C_BG, C_GEO, WV.axisAlpha));

  // height -> colour, 256 steps through the stops; and each step blended into the background, one row per dither level
  const ST = WV.stops, LV = WV.levels;
  const PAL = Array.from({ length: 256 }, (_, i) => {
    const u = i / 255 * (ST.length - 1) * 0.999, k = u | 0;
    return mix(ST[k], ST[k + 1], u - k);
  });
  const SHADE = Array.from({ length: LV + 1 }, (_, l) => Uint32Array.from(PAL, c => pack(...mix(C_BG, c, l / LV))));
  const HALO = Uint32Array.from(PAL, c => pack(...mix(C_BG, c, WV.halo.blend)));
  const BALL_DARK = pack(...mix(C_BG, ST[0], 0.85)), BALL_GLOW = mix(C_BG, ST[1], 0.7);

  // ---------- the field ----------
  const { span: LP, stretch: AS, sigma: SG, k: KW, mass: KC } = WV;
  let N = 0, xs, wt, FD, Zf, SX, SY, Ar, Ai, Br, Bi, norm = 1;
  function grid(n) {
    N = n;
    xs = Float64Array.from({ length: N }, (_, i) => LP * Math.sinh(AS * (2 * i / (N - 1) - 1)) / Math.sinh(AS));
    wt = xs.map((x, i) => (xs[Math.min(N - 1, i + 1)] - xs[Math.max(0, i - 1)]) / 2);
    FD = new Float32Array(N * N);                 // the sheet fades out in a disc, so it can turn without corners
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) FD[i * N + j] = 1 - sstep(WV.fade[0], WV.fade[1], Math.hypot(xs[i], xs[j]));
    Zf = new Float32Array(N * N); SX = new Float32Array(N * N); SY = new Float32Array(N * N);
    Ar = new Float64Array(N); Ai = new Float64Array(N); Br = new Float64Array(N); Bi = new Float64Array(N);
  }

  let bos = true, ph = 0, d = WV.sep.mid + WV.sep.amp;
  const sgn = () => bos ? 1 : -1;
  // |phiA(x1) phiB(x2) +- phiB(x1) phiA(x2)|^2, packet A at -d moving right, B at +d moving left
  function amp(a0, a1, b0, b1, c0, c1, e0, e1) {
    const p0 = a0 * b0 - a1 * b1, p1 = a0 * b1 + a1 * b0, q0 = c0 * e0 - c1 * e1, q1 = c0 * e1 + c1 * e0, s = sgn();
    const r0 = p0 + s * q0, r1 = p1 + s * q1;
    return r0 * r0 + r1 * r1;
  }
  let peak = 0;                                   // grid index of the highest point (x1 <= x2: one of the two twins)
  function field() {
    const s2 = 2 * SG * SG;
    for (let i = 0; i < N; i++) {
      const x = xs[i], ga = Math.exp(-((x + d) ** 2) / s2), gb = Math.exp(-((x - d) ** 2) / s2), c = Math.cos(KW * x), s = Math.sin(KW * x);
      Ar[i] = ga * c; Ai[i] = ga * s; Br[i] = gb * c; Bi[i] = -gb * s;
    }
    let I = 1e-12, best = -1;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const v = amp(Ar[i], Ai[i], Br[j], Bi[j], Br[i], Bi[i], Ar[j], Ai[j]);
      Zf[i * N + j] = v; I += v * wt[i] * wt[j];
      if (i <= j && v > best) { best = v; peak = i * N + j; }
    }
    norm = KC / I;
    for (let n = 0; n < N * N; n++) Zf[n] *= norm;
  }
  function f(x1, x2) {
    const s2 = 2 * SG * SG;
    const a1 = Math.exp(-((x1 + d) ** 2) / s2), b1 = Math.exp(-((x1 - d) ** 2) / s2);
    const a2 = Math.exp(-((x2 + d) ** 2) / s2), b2 = Math.exp(-((x2 - d) ** 2) / s2);
    if (a1 * b2 + b1 * a2 < 1e-5) return 0;
    const c1 = Math.cos(KW * x1), s1 = Math.sin(KW * x1), c2 = Math.cos(KW * x2), s2n = Math.sin(KW * x2);
    return amp(a1 * c1, a1 * s1, b2 * c2, -b2 * s2n, b1 * c1, -b1 * s1, a2 * c2, a2 * s2n) * norm;
  }

  // ---------- the view ----------
  let GW = 0, GH = 0, FH = 0, img = null, out32 = null, acc = null, ku = null, curK = null, glA = null, glK = null;
  let sc = 1, hz = 1, cx = 0, cy = 0;
  let yaw = WV.yaw, yawT = yaw, pitch = WV.pitch, pitchT = pitch, m = 0, mode = '3d', armed = true, pull = 0, drag = null, trans = null;
  const L = {                                     // callouts: anchor (smoothed), and the side each one hangs on
    peak: { el: labels.peak, x: 0, y: 0, side: 1, vert: 1, set: false },
    sep: { el: labels.sep, side: 1, vert: 1, fixed: true },   // always to the right: flipped, it would cross the other ball
  };
  let cosY = 1, sinY = 0, cosP = 1, sinP = 0;
  const px = (x, y) => cx + (x * cosY - y * sinY) * sc;
  const py = (x, y, z) => cy - (z * hz * cosP - (x * sinY + y * cosY) * sinP * sc * 0.9);

  function layout() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    GW = Math.ceil(w / P); GH = Math.ceil(h / P);
    canvas.width = GW; canvas.height = GH; canvas.style.width = GW * P + 'px'; canvas.style.height = GH * P + 'px';
    const n = GW * GH;
    img = ctx.createImageData(GW, GH); out32 = new Uint32Array(img.data.buffer);
    acc = new Float32Array(n); ku = new Float32Array(n); curK = new Float32Array(n);
    glA = new Float32Array(n); glK = new Float32Array(n);
    FH = Math.max(40, GH - reserve() / P);        // the figure keeps clear of the switches
    sc = Math.min(GW / (2 * WV.fit[root.classList.contains('port') ? 1 : 0]), FH * WV.scale);
    hz = FH * WV.height; cx = GW / 2; cy = FH * WV.floor;
    const want = Math.max(WV.lines[0], Math.min(WV.lines[1], Math.round(2 * WV.fade[1] * sc / WV.cell)));
    if (want !== N) grid(want);
    L.peak.set = false;
  }

  const inside = (x, y) => x >= 0 && y >= 0 && x < GW && y < GH;
  function dots(x1, y1, x2, y2, c32, every = 1, under = false) {   // a pixel line; every 2: dotted; under: only on background
    const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) | 0;
    for (let k = 0; k <= n; k += every) {
      const xx = Math.round(x1 + (x2 - x1) * k / (n || 1)), yy = Math.round(y1 + (y2 - y1) * k / (n || 1));
      if (inside(xx, yy) && (!under || out32[yy * GW + xx] === BG32)) out32[yy * GW + xx] = c32;
    }
  }

  // the surface: every grid line, one pixel wide, adding up where they bunch
  function wire() {
    acc.fill(0); ku.fill(0);
    for (let n = 0, i = 0; i < N; i++) for (let j = 0; j < N; j++, n++) { SX[n] = px(xs[i], xs[j]); SY[n] = py(xs[i], xs[j], Zf[n]); }
    const w0 = WV.line[0], w1 = WV.line[1];
    const seg = (a, b) => {
      const fd = (FD[a] + FD[b]) / 2; if (fd < 0.02) return;
      const u = clamp01((Zf[a] + Zf[b]) * 0.9 + 0.08), w = fd * (w0 + w1 * u);
      const x1 = SX[a], y1 = SY[a], dx = SX[b] - x1, dy = SY[b] - y1;
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
      for (let s = 0; s < n; s++) {
        const xx = Math.round(x1 + dx * s / n), yy = Math.round(y1 + dy * s / n);
        if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) continue;
        const k = yy * GW + xx; acc[k] += w; if (u > ku[k]) ku[k] = u;
      }
    };
    for (let i = 0; i < N; i++) for (let j = 0; j < N - 1; j++) { seg(i * N + j, i * N + j + 1); seg(j * N + i, (j + 1) * N + i); }
  }

  // the curve: the surface's outline seen edge-on, with the trace's dithered halo
  const HR = WV.halo.r, HRC = Math.ceil(HR);
  let top = [0, 0];
  function curve() {
    curK.fill(0); glA.fill(0);
    const half = Math.min(WV.axis, (GW / 2 - 2) / sc), x0 = Math.round(cx - half * sc), x1 = Math.round(cx + half * sc);
    const step = Math.max(1, Math.ceil((x1 - x0) / WV.bins));
    let lx = 0, ly = 0, best = -1, first = true;
    const tops = [];
    const plot = (x, y, k) => {
      const ix = Math.round(x), iy = Math.round(y);
      if (inside(ix, iy)) curK[iy * GW + ix] = k;
      for (let dy = -HRC; dy <= HRC; dy++) for (let dx = -HRC; dx <= HRC; dx++) {
        const xx = ix + dx, yy = iy + dy, dd = Math.hypot(dx, dy);
        if (dd > HR || !inside(xx, yy)) continue;
        const a = WV.halo.alpha * (1 - dd / HR) ** WV.halo.power, j = yy * GW + xx;
        if (a > glA[j]) { glA[j] = a; glK[j] = k; }
      }
    };
    for (let x = x0; ; x = Math.min(x1, x + step)) {
      const X = (x - cx) / sc;
      let v = 0;
      for (let t = -6; t <= 6; t += 0.07) { const q = f(X * cosY + t * sinY, -X * sinY + t * cosY); if (q > v) v = q; }
      const y = cy - v * hz, k = Math.max(1 / 255, clamp01(v * 1.8 + 0.08));
      if (v > best) best = v;
      tops.push(x, y, v);
      if (!first) {
        const n = Math.max(1, Math.ceil(Math.max(Math.abs(x - lx), Math.abs(y - ly))));
        for (let s = 0; s <= n; s++) plot(lx + (x - lx) * s / n, ly + (y - ly) * s / n, k);
      }
      first = false; lx = x; ly = y;
      if (x >= x1) break;
    }
    // the label's peak: of twin peaks, the one it is already on
    let near = Infinity;
    for (let n = 0; n < tops.length; n += 3) {
      if (tops[n + 2] < best * 0.985) continue;
      const far = L.peak.set ? Math.abs(tops[n] - L.peak.x) : n;
      if (far < near) { near = far; top = [tops[n], tops[n + 1]]; }
    }
  }

  // a packet's centre: a ball shaded with the dither, in a dithered glow
  function ball(x0, y0, r) {
    const R = r * 2.3, ix = Math.round(x0), iy = Math.round(y0);
    for (let dy = -Math.ceil(R); dy <= R; dy++) for (let dx = -Math.ceil(R); dx <= R; dx++) {
      const xx = ix + dx, yy = iy + dy, dd = Math.hypot(dx, dy);
      if (dd > R || !inside(xx, yy)) continue;
      const bt = BAYER[((yy & 7) << 3) | (xx & 7)], j = yy * GW + xx;
      if (dd <= r) {
        const nz = Math.sqrt(1 - (dd / r) ** 2), lum = 0.12 + 0.6 * nz - 0.42 * (dx + dy) / r;
        out32[j] = bt < lum ? INK32 : BALL_DARK;
      } else if (bt < 0.5 * (1 - (dd - r) / (R - r)) ** 2) {
        const c = out32[j];
        out32[j] = pack(((c & 255) + BALL_GLOW[0]) >> 1, (((c >> 8) & 255) + BALL_GLOW[1]) >> 1, (((c >> 16) & 255) + BALL_GLOW[2]) >> 1);
      }
    }
  }

  // a value label on a 30° leader then a rule, like the trace's; x, y in drawn pixels
  function callout(lb, hx, hy, c32, show) {
    const el = lb.el;
    if (!show) { el.style.opacity = 0; return; }
    const lw = el.offsetWidth / P + 8, LEAD = GW * P < config.trace.leader.narrow ? config.trace.leader.short : config.trace.leader.long;
    if (!lb.fixed) lb.side = lb.side > 0 ? (hx + LEAD * C30 + lw + 8 > GW ? -1 : 1) : (hx - LEAD * C30 - lw - 8 < 0 ? 1 : -1);
    lb.vert = lb.vert > 0 ? (hy - LEAD * S30 - 14 < 0 ? -1 : 1) : (hy + LEAD * S30 + 8 > GH ? 1 : -1);
    const ex = Math.round(hx + lb.side * LEAD * C30), ey = Math.round(hy - lb.vert * LEAD * S30);
    let tl = lb.side > 0 ? ex : ex - lw;
    tl = Math.max(2, Math.min(GW - lw - 2, tl));
    dots(Math.round(hx), Math.round(hy), ex, ey, c32);
    dots(Math.round(Math.min(ex, tl)), ey, Math.round(Math.max(ex, tl + lw)), ey, c32);
    el.style.opacity = 1;
    el.style.transform = `translate(${(tl + 4) * P}px, ${(ey - 3) * P - el.offsetHeight}px)`;
  }
  function tag(el, x, y, show) {                  // a bare label centred on a point
    el.style.opacity = show ? 1 : 0;
    if (show) el.style.transform = `translate(${Math.round(x * P - el.offsetWidth / 2)}px, ${Math.round(y * P - el.offsetHeight / 2)}px)`;
  }

  function render(dt = 0) {
    if (!out32) return;
    cosY = Math.cos(yaw); sinY = Math.sin(yaw); cosP = Math.cos(pitch); sinP = Math.sin(pitch);
    const flat = m > 0.01, solid = m < 0.99;
    if (solid) wire();
    if (flat) curve();

    // the two pictures swap through the Bayer matrix: no pixel is ever a mix of both
    for (let y = 0, i = 0; y < GH; y++) {
      const brow = (y & 7) << 3, mrow = (y + 5) & 7;
      for (let x = 0; x < GW; x++, i++) {
        const bt = BAYER[brow | (x & 7)];
        let c = BG32;
        if (flat && (!solid || BAYER[(((x + 3) & 7) << 3) | mrow] < m)) {
          if (curK[i] > 0) c = SHADE[LV][(curK[i] * 255) | 0];
          else if (glA[i] > 0 && bt < glA[i]) c = HALO[(glK[i] * 255) | 0];
        } else if (solid) {
          const a = acc[i];
          if (a > WV.cut) { const l = Math.min(LV, (Math.min(1, a) * LV + bt) | 0); if (l) c = SHADE[l][(ku[i] * 255) | 0]; }
        }
        out32[i] = c;
      }
    }

    // axes: on the floor in 3D (x1, x2), flat in 2D (the line of sight, and the height)
    const A = WV.axis;
    if (m < 0.5) {
      dots(Math.round(px(-A, 0)), Math.round(py(-A, 0, 0)), Math.round(px(A, 0)), Math.round(py(A, 0, 0)), AXIS32, 2, true);
      dots(Math.round(px(0, -A)), Math.round(py(0, -A, 0)), Math.round(px(0, A)), Math.round(py(0, A, 0)), AXIS32, 2, true);
    } else {
      const half = Math.min(A, (GW / 2 - 2) / sc), xr = Math.round(cx + half * sc);
      const yb = Math.round(cy + FH * 0.1), yt = Math.round(cy - hz * 1.02), xc = Math.round(cx), yc = Math.round(cy);
      dots(xc, yb, xc, yt, GEO32, 2, true);       // the curve's own foot is the horizontal axis
      dots(xr - 3, yc - 3, xr, yc, GEO32); dots(xr - 3, yc + 3, xr, yc, GEO32);
      dots(xc - 3, yt + 3, xc, yt, GEO32); dots(xc + 3, yt + 3, xc, yt, GEO32);
    }
    tag(labels.ax1, px(A * 1.08, 0), py(A * 1.08, 0, 0), m < 0.5);
    tag(labels.ax2, px(0, A * 1.08), py(0, A * 1.08, 0), m < 0.5);

    // the two packets' centres, above the figure
    const by = Math.max(WV.ball.top[0], FH * WV.ball.top[1]), br = Math.max(WV.ball.r[0], Math.min(WV.ball.r[1], GW * WV.ball.r[2]));
    ball(cx - d * sc, by, br); ball(cx + d * sc, by, br);
    const txt = sepText(2 * d);
    if (L.sep.el.textContent !== txt) L.sep.el.textContent = txt;
    callout(L.sep, cx + d * sc + br * 0.7, by - br * 0.7, INK32, true);

    // the highest point of whichever picture is showing, followed smoothly: the twins swap places as it turns
    const tx = m > 0.5 ? top[0] : SX[peak], ty = m > 0.5 ? top[1] : SY[peak];
    const kf = L.peak.set && dt > 0 ? 1 - Math.exp(-dt / WV.follow) : 1;
    L.peak.x += (tx - L.peak.x) * kf; L.peak.y += (ty - L.peak.y) * kf; L.peak.set = true;
    callout(L.peak, L.peak.x, L.peak.y - 2, SHADE[LV][255], true);

    ctx.putImageData(img, 0, 0);
  }

  // ---------- 3D <-> 2D ----------
  function startTrans(kind) {
    trans = kind === 'in' ? { kind, t: 0, dur: WV.snap.in, p0: pitch, p1: 0 } : { kind, t: 0, dur: WV.snap.out, p0: 0, p1: WV.pitch };
    onMode(kind === 'in' ? '2d' : '3d');
  }
  function frame(dt) {
    ph += dt * WV.sep.speed * (reduced ? config.trace.reducedSpeed : 1);
    d = WV.sep.mid + WV.sep.amp * Math.cos(ph);
    field();
    const kf = 1 - Math.exp(-dt / 0.07);
    yaw += (yawT - yaw) * kf;
    if (trans) {
      trans.t += dt * 1000;
      const tau = Math.min(1, reduced ? 1 : trans.t / trans.dur);
      pitch = pitchT = trans.p0 + (trans.p1 - trans.p0) * ease(tau);
      m = trans.kind === 'in' ? sstep(0.3, 1, tau) : 1 - sstep(0, 0.7, tau);
      if (tau >= 1) { mode = trans.kind === 'in' ? '2d' : '3d'; trans = null; }
    } else if (mode === '3d') pitch += (pitchT - pitch) * kf;
    render(dt);
  }

  // ---------- dragging ----------
  let active = false;
  stage.addEventListener('pointerdown', e => {
    if (!active || e.button) return;
    drag = [e.clientX, e.clientY]; pull = 0;
    try { stage.setPointerCapture(e.pointerId); } catch {}
    stage.classList.add('drag');
  });
  stage.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag[0], dy = e.clientY - drag[1];
    drag = [e.clientX, e.clientY];
    yawT += dx * WV.drag.yaw;
    if (trans || e.pointerType === 'touch') return;   // a finger only turns it: up and down scroll the page
    if (mode === '3d') {
      pitchT = Math.max(0, Math.min(WV.drag.maxPitch, pitchT + dy * WV.drag.pitch));
      if (pitchT > WV.snap.arm) armed = true;
      if (armed && pitchT < WV.snap.at) { armed = false; startTrans('in'); }
    } else {
      pull += dy;
      if (pull > WV.snap.pull) startTrans('out');
    }
  });
  const up = () => { drag = null; stage.classList.remove('drag'); };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);

  grid(WV.lines[1]);
  field();

  return {
    layout, frame, render,
    restart() { ph = 0; },
    set active(on) { active = on; if (!on) up(); },
    get mode() { return trans ? (trans.kind === 'in' ? '2d' : '3d') : mode; },
    setMode(next) { if (!trans && next !== mode) startTrans(next === '2d' ? 'in' : 'out'); },
    get bosons() { return bos; },
    setBosons(on) { bos = on; field(); },
  };
}
