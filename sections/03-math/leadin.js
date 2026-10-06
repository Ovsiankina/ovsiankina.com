// The approach to the maths section: a block placed by the core just above it. The first dots of the
// Lagrangian's paper are Bayer-dithered into the section's black on its own 2 px grid and 8x8 Bayer, so the page
// the transition writes on is already coming up from below. The paper rises from nothing as the block scrolls
// in, up to a sine-wave edge over solid paper at the bottom, and stops there; the dither keeps glitching on its
// own (stepped wave, torn bands, coarse blocks) while it is on screen.
import config from './config.js';
import { BAYER, pack, clamp01, cssRgb } from './pixels.js';
import { sh } from '../../core/viewport.js';

const P = config.pixel;
const LI = config.leadIn;
const hsh = (x, y, z) => (((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0) % 1000 / 1000;

export function mountLeadIn(el, env) {
  for (const [k, v] of Object.entries(config.palette)) el.style.setProperty('--' + k, v);
  el.style.setProperty('--leadin-h', sh(LI.height));
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<canvas></canvas>';
  const cv = el.querySelector('canvas'), ctx = cv.getContext('2d');
  el.style.setProperty('--leadin-black', LI.black);
  const A = pack(...cssRgb(el, '--leadin-black')), B = pack(...cssRgb(el, '--paper'));
  let GW = 0, GH = 0, img = null, out = null;

  function layout() {
    GW = Math.ceil(el.clientWidth / P); GH = Math.ceil(el.clientHeight / P);
    if (!GW || !GH) return;
    cv.width = GW; cv.height = GH; cv.style.width = GW * P + 'px'; cv.style.height = GH * P + 'px';
    img = ctx.createImageData(GW, GH); out = new Uint32Array(img.data.buffer);
    draw(performance.now());
  }

  function draw(now) {
    if (!out) return;
    // scroll progress: 0 when the block's top enters at the bottom of the screen, 1 when its bottom gets there
    const r = el.getBoundingClientRect();
    const q = clamp01(((innerHeight - r.top) / r.height - LI.start) / (LI.full - LI.start));
    const c0 = LI.from + (LI.to - LI.from) * q;              // centre of the ramp, fraction of the height
    const t = env.reduced ? 0 : now / 1000;
    const tick = Math.floor(t * LI.fps), slow = Math.floor(t * LI.slow);
    const amp = LI.amp, wave = LI.wave / P;
    for (let y = 0; y < GH; y++) {
      const band = y >> 2;
      const torn = !env.reduced && hsh(band, tick, 1) < LI.bands ? Math.round((hsh(band, tick, 2) - 0.5) * 2 * LI.tear) : 0;
      const blk = !env.reduced && hsh(band, slow, 3) < LI.coarse ? 2 : 1;
      const v = (y + 0.5) / GH;
      for (let x = 0; x < GW; x++) {
        const sx = x + torn, col = sx >> 2;
        const c = c0 + amp * Math.sin(2 * Math.PI * (sx / wave - t * LI.drift)) + (hsh(col, slow, 4) - 0.5) * LI.ragged;
        const k = 0.5 + (v - c) / LI.ramp;                     // 0 = black, 1 = paper
        const bx = Math.floor(sx / blk), by = Math.floor(y / blk);
        out[y * GW + x] = BAYER[((by & 7) << 3) | (bx & 7)] < k ? B : A;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // stepped redraws while on screen; a scroll redraws at once so the creep follows the page
  let raf = 0, last = 0, visible = false;
  function frame(now) {
    raf = 0;
    if (!visible) return;
    if (now - last >= 1000 / LI.fps - 1) { last = now; draw(now); }
    if (!env.reduced) raf = requestAnimationFrame(frame);
  }
  new IntersectionObserver(e => {
    visible = e[e.length - 1].isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }, { rootMargin: '-1px 0px' }).observe(el);
  addEventListener('scroll', () => { if (visible) draw(performance.now()); }, { passive: true });
  new ResizeObserver(layout).observe(el);
  layout();
  return {};
}
