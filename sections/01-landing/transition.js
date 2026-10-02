// Into the landing: the frozen screen dissolves into the landing's background through a Bayer 8x8
// ordered dither on the landing's own pixel grid, with the photo carousel's glitch: blocks grow then
// shrink, and in the middle third a few rows slide sideways. The landing waits underneath on the
// first frame of its intro, which starts on arrival. That first frame is bg plus the solid PDF square,
// so the square's pixels dissolve into ink instead, and the last frame is exactly what is live.
import config from './config.js';
import { BAYER, pack, rgb } from '../../core/dither.js';

const frame = () => new Promise(requestAnimationFrame);

export async function play(t) {
  const { ghost, layer, root, section, reduced } = t;
  const X = config.transition, P = config.P;
  await section?.prepare?.();

  if (reduced) {
    const start = performance.now();
    for (let u = 0; u < 1; ) {
      u = Math.min(1, (await frame() - start) / X.reducedMs);
      ghost.style.opacity = 1 - u;
    }
    ghost.style.display = 'none';
    return;
  }

  const css = getComputedStyle(root);
  const BG = pack(...rgb(css.getPropertyValue('--bg') || config.palette.bg));
  const INK = pack(...rgb(css.getPropertyValue('--ink') || config.palette.ink));
  const dl = root.querySelector('.dl');
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:absolute;left:0;top:0;image-rendering:pixelated';
  layer.appendChild(cv);
  const ctx = cv.getContext('2d');
  let img = null, out32 = null;

  // follows the layer's size, so a resize mid-way just re-grids
  function fit() {
    const w = Math.max(1, Math.ceil(layer.clientWidth / P)), h = Math.max(1, Math.ceil(layer.clientHeight / P));
    if (img && cv.width === w && cv.height === h) return;
    cv.width = w; cv.height = h;
    cv.style.width = w * P + 'px'; cv.style.height = h * P + 'px';
    img = ctx.createImageData(w, h); out32 = new Uint32Array(img.data.buffer);
  }

  function draw(u) {
    const W = cv.width, H = cv.height;
    // the PDF square on the grid, read every frame so a resize follows it
    const r = dl ? dl.getBoundingClientRect() : null;
    const qx0 = r ? Math.round(r.left / P) : 0, qx1 = r ? Math.round(r.right / P) : 0;
    const qy0 = r ? Math.round(r.top / P) : 0, qy1 = r ? Math.round(r.bottom / P) : 0;
    const fillRow = (y, x0, x1) => {
      const o = y * W;
      if (y < qy0 || y >= qy1 || x1 <= qx0 || x0 >= qx1) { out32.fill(BG, o + x0, o + x1); return; }
      const a = Math.max(x0, qx0), b = Math.min(x1, qx1);
      out32.fill(BG, o + x0, o + a); out32.fill(INK, o + a, o + b); out32.fill(BG, o + b, o + x1);
    };
    if (u >= 1) { for (let y = 0; y < H; y++) fillRow(y, 0, W); ctx.putImageData(img, 0, 0); return; }
    const blk = 1 + Math.round(X.block * Math.sin(Math.PI * u));
    const glitch = u > 1 / 3 && u < 2 / 3 ? Math.sin(Math.PI * (u - 1 / 3) * 3) : 0;
    for (let by = 0, ry = 0; ry < H; by++, ry += blk) {
      const shift = glitch ? Math.round((Math.random() - 0.5) * 2 * glitch * (Math.random() < X.glitchRows ? X.glitchShift : 0)) : 0;
      const yEnd = Math.min(H, ry + blk);
      for (let bx = 0, rx = 0; rx < W; bx++, rx += blk) {
        const tm = BAYER[(((bx + shift + 3) & 7) << 3) | ((by + 5) & 7)];
        const xEnd = Math.min(W, rx + blk);
        if (tm < u) for (let y = ry; y < yEnd; y++) fillRow(y, rx, xEnd);
        else for (let y = ry; y < yEnd; y++) out32.fill(0, y * W + rx, y * W + xEnd);
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  const start = performance.now();
  for (let u = 0; u < 1; ) {
    u = Math.min(1, (await frame() - start) / X.ms);
    fit(); draw(u);
  }
  ghost.style.display = 'none';            // not visibility: revealed glyphs inside the copy set visibility: visible
}
