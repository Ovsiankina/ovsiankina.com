// The joins between consecutive blocks of the page (lead-ins and sections). Never a straight edge: the colour
// at the bottom of one block is Bayer-dithered into the colour at the top of the next, and the join keeps
// glitching on its own, as if one section were datamoshing into the other. Each section declares its edge
// colours (export const edges = { top, bottom }); a join between two (nearly) identical colours is left out.
// A join is its own strip in the page flow, between the two blocks: a section resting at the top of the
// screen never shows one, they only appear while scrolling. The walk-down transition fires before its strip
// comes into view (core/navigator.js), so on the way down the frozen screen ends clean.

const SEAM = {
  height: 144,      // CSS px, the strip between the two blocks
  same: 24,         // colours closer than this (sum of channel differences) get no join
  pix: 3,           // CSS px per drawn pixel (the glow / climbing grid)
  wave: 420,        // wavelength of the slow sine the 50 % line rides, CSS px
  amp: 0.16,        // its amplitude, fraction of the height
  drift: 0.35,      // how fast the sine slides sideways, waves per second
  fps: 15,          // stepped on purpose: glitches should tick, not glide
  bands: 0.3,       // chance a row band is torn sideways on a given tick
  tear: 14,         // max sideways tear, drawn pixels
  smear: 0.06,      // chance a 4-px column drips past the line
};

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const hsh = (x, y, z) => (((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0) % 1000 / 1000;
const rgb = css => {
  const c = document.createElement('canvas').getContext('2d');
  c.fillStyle = css; c.fillRect(0, 0, 1, 1);
  return [...c.getImageData(0, 0, 1, 1).data.slice(0, 3)];
};
const pack = ([r, g, b]) => (255 << 24) | (b << 16) | (g << 8) | r;

export function createSeams(site, blocks) {
  const seams = [];
  for (let i = 1; i < blocks.length; i++) {
    const up = blocks[i - 1].edges?.bottom, down = blocks[i].edges?.top;
    if (!up || !down) continue;
    const a = rgb(up), b = rgb(down);
    if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < SEAM.same) continue;
    const cv = document.createElement('canvas');
    cv.className = 'seam';
    cv.setAttribute('aria-hidden', 'true');
    blocks[i].el.before(cv);
    seams.push({ cv, ctx: cv.getContext('2d'), A: pack(a), B: pack(b), visible: false, img: null });
  }

  function place() {
    for (const s of seams) {
      const w = Math.ceil(site.clientWidth / SEAM.pix), h = Math.ceil(SEAM.height / SEAM.pix);
      if (s.cv.width !== w || s.cv.height !== h) {
        s.cv.width = w; s.cv.height = h;
        s.img = s.ctx.createImageData(w, h); s.out = new Uint32Array(s.img.data.buffer);
      }
      Object.assign(s.cv.style, { width: w * SEAM.pix + 'px', height: SEAM.height + 'px' });
      draw(s, performance.now());
    }
  }

  function draw(s, now) {
    const { cv, out, A, B } = s, w = cv.width, h = cv.height;
    const t = now / 1000, tick = Math.floor(t * SEAM.fps), slow = Math.floor(t * 2.5);
    const amp = SEAM.amp * h, hw = h / 2 - amp - 2;             // ramp half-width: the whole ramp stays inside the band
    for (let y = 0; y < h; y++) {
      const band = y >> 2;
      const torn = hsh(band, tick, 1) < SEAM.bands ? Math.round((hsh(band, tick, 2) - 0.5) * 2 * SEAM.tear) : 0;
      const blk = hsh(band, slow, 3) < 0.25 ? 2 : 1;            // some bands drop to coarser blocks for a moment
      for (let x = 0; x < w; x++) {
        const sx = x + torn, col = sx >> 2;
        const c = h / 2 + amp * Math.sin(2 * Math.PI * (sx * SEAM.pix / SEAM.wave - t * SEAM.drift))
                + (hsh(col, slow, 4) - 0.5) * 3;                 // ragged in 4-pixel steps
        let k = 0.5 + (y + 0.5 - c) / (2 * hw);                  // 0 = upper colour, 1 = lower colour
        if (hsh(col, slow, 5) < SEAM.smear) k += 0.35 * (hsh(col, slow, 6) - 0.3);   // drips both ways
        const bx = Math.floor(sx / blk), by = Math.floor(y / blk);
        out[y * w + x] = (BAYER[(by & 3) * 4 + (bx & 3)] + 0.5) / 16 < k ? B : A;
      }
    }
    s.ctx.putImageData(s.img, 0, 0);
  }

  let raf = 0, last = 0;
  function frame(now) {
    raf = 0;
    const live = seams.filter(s => s.visible);
    if (!live.length) return;
    if (now - last >= 1000 / SEAM.fps - 1) { last = now; for (const s of live) draw(s, now); }
    raf = requestAnimationFrame(frame);
  }
  const io = new IntersectionObserver(es => {
    for (const e of es) { const s = seams.find(x => x.cv === e.target); if (s) s.visible = e.isIntersecting; }
    if (!raf) raf = requestAnimationFrame(frame);
  });
  for (const s of seams) io.observe(s.cv);
  new ResizeObserver(place).observe(site);
  place();

  return { elements: () => seams.map(s => s.cv), place };
}
