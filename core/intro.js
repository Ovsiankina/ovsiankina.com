// The mostoslavsky.com intro: "mostoslavsky" dithers in on black, its y travels cell by cell into an i
// ("mostoslavski"), the name dithers out, then the black itself dissolves away and uncovers the page.
// Plays only when asked for: arriving through the mostoslavsky.com redirect (https://mostoslavski.com/?from=mostoslavsky,
// the same query typed by hand works), or `intro` in the ~ shell. Never under prefers-reduced-motion.
// A fixed canvas above everything, on a pixel grid (6 CSS px cells, 3 under 600 px wide), Silkscreen.
// Click, tap, wheel or any key ends it at once. Its query is removed on start, so a reload doesn't replay it.
// index.html's inline <head> guard hides the page before first paint when the intro is coming (html.intro-pending).
//
// Timeline (ms, divided by `speed`):
//   black 300 -> name dithers in 1400 -> hold 900 -> y morphs into i 1300
//   -> hold 1000 -> name dithers out 1100 -> black 300 -> overlay dithers away 700
import { BAYER } from './dither.js';

const PARAM = 'from', PARAM_VALUE = 'mostoslavsky';
const PHASES = [300, 1400, 900, 1300, 1000, 1100, 300, 700];
const WHITE = 0xffffffff, BLACK = 0xff000000, CLEAR = 0x00000000;
const NAV_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Spacebar', 'Enter']);

function hash(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const easeOut = x => 1 - Math.pow(1 - x, 3);
const easeIn = x => x * x * x;
const easeInOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** True when the address carries ?from=mostoslavsky (the redirect, or typed by hand). */
export function introRequested(search = location.search) {
  return new URLSearchParams(search).get(PARAM) === PARAM_VALUE;
}

/** Remove ?from=mostoslavsky from the address bar so a reload doesn't replay the intro. */
export function stripIntroParam() {
  const url = new URL(location.href);
  if (url.searchParams.get(PARAM) !== PARAM_VALUE) return;
  url.searchParams.delete(PARAM);
  history.replaceState(history.state, '', url.pathname + url.search + url.hash);
}

let playing = null;                            // one intro at a time: asking again while it runs gets the same one

/**
 * Play the intro as a fixed overlay above the page. Resolves when the overlay is gone.
 * @param {object} [o]
 * @param {number} [o.pixel]     grid cell size in CSS px (default: 3 under 600 px wide, else 6)
 * @param {number} [o.speed=1]   timeline speed multiplier
 * @param {string} [o.font='Silkscreen']
 * @param {boolean} [o.skippable=true]  click / tap / wheel / any key ends it early
 */
export function playIntro(o = {}) {
  stripIntroParam();
  if (playing) return playing;
  const unhide = () => document.documentElement.classList.remove('intro-pending');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { unhide(); return Promise.resolve(); }

  const speed = Math.max(0.05, o.speed ?? 1);
  const font = o.font ?? 'Silkscreen';
  const cv = document.createElement('canvas');
  cv.className = 'intro';
  cv.setAttribute('aria-hidden', 'true');
  Object.assign(cv.style, {
    position: 'fixed', inset: '0', width: '100%', height: '100%', zIndex: '2147483647',
    imageRendering: 'pixelated', display: 'block', background: '#000', cursor: 'pointer', touchAction: 'none',
  });
  document.body.appendChild(cv);
  unhide();                                    // the <head> guard can go now that the canvas covers the page
  // the page underneath holds still, and its scrollbar doesn't show beside the black (the gutter stays: no reflow)
  const html = document.documentElement, overflow = html.style.overflow;
  html.style.overflow = 'hidden';
  const ctx = cv.getContext('2d');

  let S = null, raf = 0, t0 = 0, done = false, resolveFn;
  playing = new Promise(r => (resolveFn = r));

  function build() {
    const W = cv.clientWidth || innerWidth, H = cv.clientHeight || innerHeight;
    const P = Math.max(2, Math.round(o.pixel ?? (W < 600 ? 3 : 6)));
    const LW = Math.max(8, Math.round(W / P)), LH = Math.max(8, Math.round(H / P));
    cv.width = LW; cv.height = LH;

    const oc = document.createElement('canvas'); oc.width = LW; oc.height = LH;
    const c = oc.getContext('2d', { willReadFrequently: true });
    c.font = `100px ${font}`;
    const mFull = c.measureText('mostoslavsky');
    const full = mFull.width, pre = c.measureText('mostoslavsk').width;
    const textH = (mFull.actualBoundingBoxAscent + mFull.actualBoundingBoxDescent) || 90;
    const k = Math.min((LW * 0.86) / full, (LH * 0.6) / textH);
    c.font = `${100 * k}px ${font}`;
    const m = c.measureText('mostoslavsky');
    const base = Math.round(LH / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
    const wPre = Math.round(pre * k);
    // the word is centred on its "y" spelling and never moves; the narrower "i" sits in the same slot
    const x0 = Math.round((LW - full * k) / 2);

    const coverage = txt => {
      c.clearRect(0, 0, LW, LH);
      c.fillStyle = '#fff'; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
      c.fillText(txt, 0, base);
      const d = c.getImageData(0, 0, LW, LH).data, a = new Float32Array(LW * LH);
      for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] / 255;
      return a;
    };
    const preCov = coverage('mostoslavsk'), gy = coverage('y'), gi = coverage('i');

    // morph particles: lit cells of "y" matched to lit cells of "i" in reading order
    const pts = g => { const r = []; for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) if (g[y * LW + x] > 0.5) r.push([x, y]); return r; };
    const PY = pts(gy), PI = pts(gi), N = Math.max(PY.length, PI.length, 1);
    let yTop = LH, yBot = 0;
    for (const q of PY.concat(PI)) { if (q[1] < yTop) yTop = q[1]; if (q[1] > yBot) yBot = q[1]; }
    const parts = [];
    for (let j = 0; j < N; j++) {
      const s = PY[Math.floor((j * PY.length) / N)] || [0, 0], d = PI[Math.floor((j * PI.length) / N)] || [0, 0];
      const rowBias = (s[1] - yTop) / Math.max(1, yBot - yTop);
      parts.push({ sx: s[0], sy: s[1], dx: d[0], dy: d[1], delay: 0.08 + 0.22 * rowBias + 0.12 * hash(j, 3, 11), wob: (hash(j, 9, 5) - 0.5) * 2, k: j });
    }

    const bay = new Float32Array(LW * LH), hs = new Float32Array(LW * LH);
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
      const i = y * LW + x;
      bay[i] = BAYER[(y & 7) * 8 + (x & 7)];
      hs[i] = hash(x, y, 7);
    }
    const img = new ImageData(LW, LH);
    S = { LW, LH, pre: preCov, gy, gi, parts, x0, gx: x0 + wPre, bay, hs, img, u32: new Uint32Array(img.data.buffer) };
  }

  function paint(amp, sw, sweep, seed, reveal) {
    const { LW, LH, pre, gy, gi, parts, x0, gx, bay, hs, u32 } = S;
    if (reveal > 0) {
      // the overlay dissolves away, Bayer-ordered, uncovering the page underneath
      cv.style.background = 'transparent';
      for (let i = 0; i < u32.length; i++) u32[i] = 0.75 * bay[i] + 0.25 * hs[i] > reveal ? BLACK : CLEAR;
      ctx.putImageData(S.img, 0, 0);
      return;
    }
    u32.fill(BLACK);
    if (amp > 0) {
      const morphing = sw > 0 && sw < 1;
      for (let y = 0; y < LH; y++) {
        const row = y * LW;
        for (let x = 0; x < LW; x++) {
          const i = row + x;
          const sx = sweep > 0 ? x / LW : 1 - x / LW;
          const thr = (0.6 * bay[i] + 0.4 * hs[i]) * 0.72 + sx * 0.28;
          const xp = x - x0;
          if (xp >= 0 && xp < LW && pre[row + xp] * amp > thr) { u32[i] = WHITE; continue; }
          const xg = x - gx;
          if (!morphing && xg >= 0 && xg < LW && (sw >= 1 ? gi : gy)[row + xg] * amp > thr) u32[i] = WHITE;
        }
      }
      if (morphing) {
        // each lit cell of the "y" travels to a cell of the "i", staggered top to bottom, thinning into dither mid-flight
        for (const q of parts) {
          const lp = Math.min(1, Math.max(0, (sw - q.delay) / 0.58));
          const e = easeInOut(lp), arc = Math.sin(Math.PI * e);
          const x = Math.round(gx + q.sx + (q.dx - q.sx) * e + q.wob * arc * 2.5);
          const y = Math.round(q.sy + (q.dy - q.sy) * e - arc * 1.5);
          if (x < 0 || y < 0 || x >= LW || y >= LH) continue;
          if (arc > 0.05 && hash(q.k, seed, 17) < arc * 0.55 * (0.4 + bay[y * LW + x])) continue;
          u32[y * LW + x] = WHITE;
        }
      }
    }
    ctx.putImageData(S.img, 0, 0);
  }

  function frame(now) {
    raf = 0;
    if (done) return;
    let t = (now - t0) * speed, ph = 0;
    while (ph < PHASES.length && t >= PHASES[ph]) { t -= PHASES[ph]; ph++; }
    if (ph >= PHASES.length) return finish();
    const p = t / PHASES[ph];
    let amp = 0, sw = 0, sweep = 1, reveal = 0;
    if (ph === 1) amp = easeOut(p) * 1.35;
    else if (ph === 2) amp = 1.35;
    else if (ph === 3) { amp = 1.35; sw = p; }
    else if (ph === 4) { amp = 1.35; sw = 1; }
    else if (ph === 5) { amp = (1 - easeIn(p)) * 1.35; sw = 1; sweep = -1; }
    else if (ph === 7) reveal = easeInOut(p) * 1.001;
    paint(amp, sw, sweep, ph === 3 ? Math.floor(now / 60) : 0, reveal);
    raf = requestAnimationFrame(frame);
  }

  function finish() {
    if (done) return;
    done = true;
    if (raf) cancelAnimationFrame(raf);
    removeEventListener('resize', onResize);
    removeEventListener('keydown', onKey, true);
    cv.remove();
    html.style.overflow = overflow;
    playing = null;
    resolveFn();
  }
  // a skipping key must not also scroll the page (and walk into the next section); shortcuts like reload stay theirs
  const onKey = e => { if (NAV_KEYS.has(e.key)) e.preventDefault(); finish(); };
  const onWheel = e => { e.preventDefault(); finish(); };
  let rz = 0;
  const onResize = () => { clearTimeout(rz); rz = setTimeout(() => { if (!done) build(); }, 120); };

  if (o.skippable ?? true) {
    cv.addEventListener('pointerdown', () => finish());
    cv.addEventListener('wheel', onWheel, { passive: false });
    addEventListener('keydown', onKey, true);  // capture: ahead of the ~ shell's input, which keeps its keys to itself
  }
  addEventListener('resize', onResize);

  // wait for the font (max 1.5 s) so the first frame isn't drawn in a fallback face
  const fontReady = document.fonts
    ? Promise.race([document.fonts.load(`100px ${font}`), new Promise(r => setTimeout(r, 1500))])
    : Promise.resolve();
  fontReady.catch(() => {}).then(() => {
    if (done) return;
    build();
    t0 = performance.now();
    raf = requestAnimationFrame(frame);
  });

  return playing;
}
