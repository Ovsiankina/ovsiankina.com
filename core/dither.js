// Pixel helpers: the 8x8 Bayer matrix of every ordered dither on the site, and packing colours for ImageData.
export const BAYER = (() => {
  const b = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
             3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];
  return Float32Array.from(b, v => (v + 0.5) / 64);
})();
export const pack = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r;
export const rgb = hex => { hex = hex.trim().replace('#', ''); return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)); };

// ---------- dithered fade of DOM elements ----------
// dissolve(els, to, ms): fades elements in (to = 1) or out (to = 0) through the Bayer matrix, on the landing's
// 2 px grid: a CSS mask with the cells at or under the current level open. Starts from wherever each element is,
// so a fade can be turned around halfway. ms <= 0: set at once. Resolves when done.
const CELL = 2;                                 // CSS px per dither cell
const urls = new Map();
function mask(k) {                              // k of 64 cells open
  const d = Math.max(1, Math.round(devicePixelRatio || 1)), key = d * 100 + k;
  if (!urls.has(key)) {
    const c = document.createElement('canvas');
    c.width = c.height = 8 * CELL * d;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 64; i++) if (BAYER[i] * 64 < k) ctx.fillRect((i >> 3) * CELL * d, (i & 7) * CELL * d, CELL * d, CELL * d);
    urls.set(key, `url(${c.toDataURL()})`);
  }
  return urls.get(key);
}
const level = new WeakMap(), owner = new WeakMap();
function show(el, v) {
  level.set(el, v);
  const k = Math.round(v * 64);
  for (const p of ['mask', '-webkit-mask']) {
    if (k >= 64) { el.style.removeProperty(`${p}-image`); el.style.removeProperty(`${p}-size`); continue; }
    el.style.setProperty(`${p}-image`, mask(k));
    el.style.setProperty(`${p}-size`, `${8 * CELL}px ${8 * CELL}px`);
  }
}
export function dissolve(els, to, ms) {
  const run = {}, from = els.map(el => level.get(el) ?? 1);
  els.forEach(el => owner.set(el, run));
  if (ms <= 0) { els.forEach(el => show(el, to)); return Promise.resolve(); }
  const start = performance.now();
  return new Promise(done => {
    (function frame(now) {
      const u = Math.min(1, Math.max(0, (now - start) / ms));
      els.forEach((el, i) => { if (owner.get(el) === run) show(el, from[i] + (to - from[i]) * u); });
      u < 1 ? requestAnimationFrame(frame) : done();
    })(start);
  });
}
