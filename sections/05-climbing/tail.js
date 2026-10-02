// Below the scene: the cream wall glitching out into the site's dark background, on the climbing PIX grid.
// A Bayer ramp whose 50 % line rides a slow sine, torn sideways in row bands, ragged and dripping in 4-pixel
// columns, stepped at a low frame rate so it ticks. Top row always cream, bottom row always dark: no straight edge
// on either side. Drawn only while it is on screen. Hints that the page may go on later.
import config from './config.js';
import { bay, hsh, hex } from './pixel.js';

const PIX = config.pix;
const pack = ([r, g, b]) => (255 << 24) | (b << 16) | (g << 8) | r;

export function createTail(cv, reduced) {
  const C = config.tail;
  const A = pack(hex(config.paper)), B = pack(hex(C.dark));
  const ctx = cv.getContext('2d');
  let img = null, out = null, raf = 0, last = 0, visible = false;

  function draw(now) {
    const box = cv.parentNode, w = Math.ceil(box.clientWidth / PIX) || 1, h = Math.ceil(box.clientHeight / PIX) || 1;
    if (cv.width !== w || cv.height !== h) {
      cv.width = w; cv.height = h; cv.style.width = w * PIX + 'px'; cv.style.height = h * PIX + 'px';
      img = ctx.createImageData(w, h); out = new Uint32Array(img.data.buffer);
    }
    const t = reduced ? 0 : now / 1000, tick = Math.floor(t * C.fps), slow = Math.floor(t * C.slow);
    const amp = C.amp * h, hw = C.soft * h / 2;
    for (let y = 0; y < h; y++) {
      const band = y >> 2;
      const torn = hsh(band, tick * 7 + 1) < C.bands ? Math.round((hsh(band, tick * 7 + 2) - 0.5) * 2 * C.tear) : 0;
      const blk = hsh(band, slow * 5 + 3) < C.coarse ? 2 : 1;       // some bands drop to coarser blocks for a moment
      for (let x = 0; x < w; x++) {
        const sx = x + torn, col = sx >> 2;
        const c = C.line * h + amp * Math.sin(2 * Math.PI * (sx * PIX / C.wave - t * C.drift))
                + (hsh(col, slow * 5 + 4) - 0.5) * 4;                // ragged in 4-pixel steps
        let k = 0.5 + (y + 0.5 - c) / (2 * hw);                        // 0 = cream, 1 = dark
        if (hsh(col, slow * 5 + 5) < C.smear) k += 0.4 * (hsh(col, slow * 5 + 6) - 0.3);   // drips both ways
        if (y === 0) k = 0; else if (y === h - 1) k = 1;                // flush with the scene above, the page below
        out[y * w + x] = bay(Math.floor(sx / blk), Math.floor(y / blk)) < k ? B : A;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function frame(now) {
    raf = 0;
    if (!visible) return;
    if (now - last >= 1000 / C.fps - 1) { last = now; draw(now); }
    if (!reduced) raf = requestAnimationFrame(frame);
  }

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }).observe(cv);
  // a still frame on mount and on every resize, so a freeze (or reduced motion) never shows a blank or stretched canvas
  new ResizeObserver(() => draw(performance.now())).observe(cv.parentNode);
}
