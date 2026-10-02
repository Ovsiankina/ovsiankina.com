// Golden-rectangle hero: the spiral construction drawn on a pixel grid, the CV typewritten into the
// first square, the photo carousel (ordered-dither transitions) in the .618 square, the PDF in the .236 one.
import content from './content.js';
import config from './config.js';
import { BAYER, pack, rgb } from './dither.js';
import { replayButton } from '../../core/replay.js';
import { swipeHint } from './swipe-hint.js';

export const id = 'landing';
export const title = 'Landing';
export const edges = { top: config.palette.bg, bottom: config.palette.bg };

const PHI = (1 + Math.sqrt(5)) / 2;
const STEP_100 = 255 / 11;
// "more below" chevron, in drawn pixels
const CHEV = [
  'x.......x',
  'xx.....xx',
  '.xx...xx.',
  '..xx.xx..',
  '...xxx...',
  '....x....',
];   // photo dither step at amount 100: 12 levels per channel, the first grain
const asset = p => new URL(p, import.meta.url).href;

// ---------- cubic bezier easing (same maths as CSS cubic-bezier) ----------
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t;
  const dX = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) { const d = dX(t); if (Math.abs(d) < 1e-6) break; t -= (X(t) - x) / d; }
    if (t < 0 || t > 1) { let lo = 0, hi = 1; t = x; for (let i = 0; i < 30; i++) { X(t) < x ? lo = t : hi = t; t = (lo + hi) / 2; } }
    return Y(t);
  };
}

// ---------- markup, built from content.js ----------
const block = b => `<section><h2>${b.heading}</h2>`
  + (b.job ? `<div class="job"><span>${b.job.company}</span><span class="when">${b.job.when}</span></div>` : '')
  + (b.text ? `<p>${b.text}</p>` : '')
  + (b.items ? `<ul>${b.items.map(i => `<li>${i}</li>`).join('')}</ul>` : '')
  + (b.list ? `<dl>${b.list.map(([t, d]) => `<div><dt>${t}</dt><dd>${d}</dd></div>`).join('')}</dl>` : '')
  + '</section>';

const markup = c => `
<div class="hero">
  <canvas class="geo" aria-hidden="true"></canvas>
  <canvas class="more" aria-hidden="true"></canvas>
  <div class="frame" tabindex="0" role="img" aria-label="${c.photoLabel}">
    <canvas class="photo"></canvas>
    <div class="caption">01 / ${String(config.photos.length).padStart(2, '0')}</div>
  </div>
  <article class="cv" tabindex="0">
    <header>
      <h1>${c.name}</h1>
      <div class="role">${c.role}</div>
      <div class="avail">${c.avail}</div>
    </header>
    <div class="cols">
      <div class="col">${c.left.map(block).join('')}</div>
      <div class="col">${c.right.map(block).join('')}</div>
    </div>
  </article>
  <a class="dl" href="${asset(config.cv.pdf)}" download="${config.cv.filename}" aria-label="${c.download.label}">
    <span class="dl-top">
      <span class="dl-t">${c.download.title}</span>
      <span class="dl-short">${c.download.short}</span>
      <span class="dl-s">${c.download.sub}</span>
    </span>
    <svg viewBox="0 0 7 8" aria-hidden="true"><rect x="3" y="0" width="1" height="5"/><rect x="1" y="3" width="1" height="1"/><rect x="5" y="3" width="1" height="1"/><rect x="2" y="4" width="1" height="1"/><rect x="4" y="4" width="1" height="1"/><rect x="0" y="7" width="7" height="1"/></svg>
  </a>
</div>`;

export async function mount(root, env) {
  const { P, INTRO_MS, HOLD_MS, TRANS_MS } = config;
  const REDUCED = env.reduced;
  const EASE = bezier(...config.EASE);

  for (const [k, v] of Object.entries(config.palette)) root.style.setProperty('--' + k, v);
  root.style.setProperty('--bottom-gap', config.BOTTOM_GAP * 100 + 'vh');
  root.setAttribute('aria-label', content.label);
  root.innerHTML = markup(content);

  const hero = root.querySelector('.hero');
  const geo = root.querySelector('.geo'), gctx = geo.getContext('2d');
  const more = root.querySelector('.more'), mctx = more.getContext('2d');
  const frameEl = root.querySelector('.frame');
  const pcv = root.querySelector('.photo'), pctx = pcv.getContext('2d');
  const cv = root.querySelector('.cv');
  const countEl = root.querySelector('.caption');
  const dl = root.querySelector('.dl');
  const cols = root.querySelector('.cols');

  // portrait: the hero is a cover held on screen, the CV body leaves the square for a sheet that slides up over it
  // (still a .cv, so it keeps the CV styles and the typewriter); the veil dissolves the cover as the sheet climbs
  const sheet = document.createElement('article');
  sheet.className = 'cv sheet';
  root.appendChild(sheet);
  const veil = document.createElement('canvas');
  veil.className = 'veil'; veil.setAttribute('aria-hidden', 'true');
  hero.appendChild(veil);
  const vctx = veil.getContext('2d');
  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  const paras = cv.querySelectorAll('p');
  (paras[paras.length - 1] || cv).appendChild(cursor);

  const css = getComputedStyle(root);
  const C_GEO = rgb(css.getPropertyValue('--geo')), C_INK = rgb(css.getPropertyValue('--ink')), C_BG = rgb(css.getPropertyValue('--bg'));

  // ---------- CV: wrap every glyph so the pen can reveal it without reflow ----------
  const glyphs = [];
  (function wrap(node) {
    for (const ch of [...node.childNodes]) {
      if (ch.nodeType === 3) {
        const frag = document.createDocumentFragment();
        for (const part of ch.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); continue; }
          for (const g of part) { const s = document.createElement('span'); s.className = 'c'; s.textContent = g; s._g = g; frag.appendChild(s); glyphs.push(s); }
        }
        ch.replaceWith(frag);
      } else if (ch.nodeType === 1 && ch !== cursor) wrap(ch);
    }
  })(cv);
  const N = glyphs.length;
  const NOISE = '#%&@$*+=/\\<>?!01';
  let shown = 0, scrambled = [];
  function reveal(n) {
    for (const s of scrambled) { s.textContent = s._g; s.classList.remove('head'); }
    scrambled = [];
    if (n > shown) for (let i = shown; i < n; i++) glyphs[i].classList.add('on');
    else for (let i = n; i < shown; i++) glyphs[i].classList.remove('on');
    shown = n;
    if (n > 0 && n < N) {
      for (let i = Math.max(0, n - 6); i < n; i++) { glyphs[i].textContent = NOISE[(Math.random() * NOISE.length) | 0]; scrambled.push(glyphs[i]); }
      glyphs[n - 1].classList.add('head');
    }
    cursor.classList.toggle('on', n >= N);
  }

  // ---------- geometry ----------
  let L = null;   // current layout
  const labels = [];

  function layout() {
    const W = hero.clientWidth;
    let H = window.innerHeight;
    const port = !(W / H >= 1.2 && W >= 760);
    // portrait: the hero is exactly one screen (100svh in CSS, so the phone's URL bar never resizes it)
    if (port) H = hero.clientHeight;
    const pad = Math.max(16, Math.round(Math.min(W, H) * 0.04));
    let x0, y0, Wr, Hr, d0;
    if (!port) { Hr = Math.min(H - 2 * pad, (W - 2 * pad) / PHI); Wr = Hr * PHI; x0 = (W - Wr) / 2; y0 = (H - Hr) / 2; d0 = 0; }
    else {
      // standing rectangle centred on the screen, a strip left under it for the "more below" arrows
      Hr = Math.min((W - 2 * pad) * PHI, H - 2 * (pad + MORE_H * P)); Wr = Hr / PHI;
      x0 = (W - Wr) / 2; y0 = (H - Hr) / 2; d0 = 3;
    }

    // subdivide: square on the left, top, right, bottom, ... ; one quarter arc per square
    const steps = [];
    let x = x0, y = y0, w = Wr, h = Hr, d = d0;
    for (let i = 0; i < 40; i++) {
      const s = Math.min(w, h);
      let sq, arc, div;
      if (d === 0) { sq = [x, y, s]; arc = [x + s, y + s, s, Math.PI]; div = [x + s, y + h, x + s, y]; x += s; w -= s; }
      else if (d === 1) { sq = [x, y, s]; arc = [x, y + s, s, 1.5 * Math.PI]; div = [x, y + s, x + w, y + s]; y += s; h -= s; }
      else if (d === 2) { sq = [x + w - s, y, s]; arc = [x + w - s, y, s, 0]; div = [x + w - s, y, x + w - s, y + h]; w -= s; }
      else { sq = [x, y + h - s, s]; arc = [x + s, y + h - s, s, 0.5 * Math.PI]; div = [x + w, y + h - s, x, y + h - s]; h -= s; }
      if (s >= P * 0.75) steps.push({ sq, arc, div, len: Math.PI / 2 * s });
      d = (d + 1) % 4;
    }
    const pole = [x, y];
    let acc = 0; for (const st of steps) { st.start = acc; acc += st.len; }
    const total = acc;

    // photo fills the second square of the subdivision: the .618 cell
    const [fx, fy, fw] = steps[1].sq, fh = fw;

    // CV box
    let cvBox;
    if (!port) cvBox = [x0, y0, Hr, Hr];   // the whole "1" square scrolls; padding keeps the text inset
    else cvBox = [x0, y0 + Hr - Wr, Wr, Wr];   // portrait: the "1" square holds the header only

    L = { W, H, port, pad, x0, y0, Wr, Hr, steps, total, pole, frame: [fx, fy, fw, fh], cvBox };
    hero.classList.toggle('port', port);
    root.classList.toggle('port', port);
    const home = port ? sheet : cv;
    if (cols.parentNode !== home) home.appendChild(cols);
    root.style.setProperty('--side', x0 + 'px');

    Object.assign(frameEl.style, { left: fx + 'px', top: fy + 'px', width: fw + 'px', height: fh + 'px' });
    Object.assign(cv.style, { left: cvBox[0] + 'px', top: cvBox[1] + 'px', width: cvBox[2] + 'px', height: cvBox[3] ? cvBox[3] + 'px' : 'auto',
      padding: Math.round(cvBox[2] * 0.07) + 'px' });

    // download button: fills the .236 square
    const [bx, by, bs] = steps[3].sq;
    Object.assign(dl.style, { left: bx + 'px', top: by + 'px', width: bs + 'px', height: bs + 'px' });
    dl.classList.toggle('compact', bs < 150);
    dl.style.padding = Math.round(Math.max(9, bs * 0.09)) + 'px';

    fitCV();

    const heroH = H;
    L.heroH = heroH;

    geo.width = Math.ceil(W / P); geo.height = Math.ceil(heroH / P);
    geo.style.width = geo.width * P + 'px'; geo.style.height = geo.height * P + 'px';
    L.img = gctx.createImageData(geo.width, geo.height);
    L.a = new Float32Array(geo.width * geo.height);
    L.hot = new Float32Array(geo.width * geo.height);

    // ratio labels: 1, 1/φ, 1/φ², ...
    labels.forEach(l => l.remove()); labels.length = 0;
    steps.slice(0, 6).forEach((st, i) => {
      const el = document.createElement('div'); el.className = 'lbl';
      el.textContent = i === 0 ? '1' : (1 / PHI ** i).toFixed(3).replace(/^0/, '');
      el.style.left = st.sq[0] + 5 + 'px'; el.style.top = st.sq[1] + 5 + 'px';
      hero.appendChild(el); labels.push(el);
    });

    photo.resize(Math.round(fw / P), Math.round(fh / P));

    // "more below": three arrows centred in the strip under the rectangle (the hero is the screen)
    {
      more.width = MORE_W; more.height = MORE_H;
      const top = y0 + Hr + (heroH - y0 - Hr - MORE_H * P) / 2;
      Object.assign(more.style, { width: MORE_W * P + 'px', height: MORE_H * P + 'px',
        left: Math.round((x0 + Wr / 2 - MORE_W * P / 2) / P) * P + 'px', top: Math.round(top / P) * P + 'px' });
      L.moreImg = mctx.createImageData(MORE_W, MORE_H);
      drawMore(performance.now());
    }

    {
      veil.hidden = !port;
      veil.width = geo.width; veil.height = geo.height;
      Object.assign(veil.style, { width: geo.style.width, height: geo.style.height });
      veilAt = -1; drawVeil();
    }
    if (hint) { hint.destroy(); hint = null; }   // sized for the old box: a one-off, not worth refitting
  }

  function fitCV() {
    const fs = L.port ? 12.5 : Math.min(15, Math.max(12, L.Hr / 58));
    root.style.setProperty('--fs', fs + 'px');

    // All the text shows in the square: the CV is not a scroller at all, so the wheel over it moves the page
    // (a scroller with overscroll-behavior: contain keeps the wheel even with nothing to scroll). Measured
    // as a scroller, the bottom padding left out: the text fitting is what counts. More text, a smaller
    // screen: it scrolls again.
    cv.classList.remove('fits');
    if (!L.port) {
      const padB = parseFloat(getComputedStyle(cv).paddingBottom) || 0;
      cv.classList.toggle('fits', cv.scrollHeight - padB <= cv.clientHeight + 1);
      if (cv.classList.contains('fits')) cv.scrollTop = 0;
    }
  }

  // ---------- pixel raster for the construction ----------
  function plot(x, y, a, hot) {
    const ix = Math.floor(x / P), iy = Math.floor(y / P), gw = geo.width;
    if (ix < 0 || iy < 0 || ix >= gw || iy >= geo.height) return;
    const i = iy * gw + ix;
    if (a > L.a[i]) L.a[i] = a;
    if (hot && hot > L.hot[i]) L.hot[i] = hot;
  }
  function line(x1, y1, x2, y2, prog, a, dot) {
    const len = Math.hypot(x2 - x1, y2 - y1), n = Math.floor(len * prog / P);
    for (let k = 0; k <= n; k++) { if (dot && k % dot) continue; const t = (k * P) / len; plot(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, a); }
  }

  let geoAt = [0, true];   // last drawn state, redrawn after a resize when the loop is not running
  function drawGeo(p, pen) {
    geoAt = [p, pen];
    const { a, hot, img, steps, total, x0, y0, Wr, Hr } = L;
    a.fill(0); hot.fill(0);
    const ell = p * total;

    // outer rectangle: two pens leave the spiral's start corner and meet opposite
    const r = Math.min(1, ell / steps[0].len);
    const corners = L.port ? [[x0 + Wr, y0 + Hr], [x0, y0 + Hr], [x0, y0], [x0 + Wr, y0]]
                           : [[x0, y0 + Hr], [x0, y0], [x0 + Wr, y0], [x0 + Wr, y0 + Hr]];
    const segs = [0, 1, 2, 3].map(i => [corners[i], corners[(i + 1) % 4]]);
    const half = Wr + Hr;
    const walk = (order) => {
      let left = r * half;
      for (const [A, B] of order) {
        const len = Math.hypot(B[0] - A[0], B[1] - A[1]); if (left <= 0) break;
        line(A[0], A[1], B[0], B[1], Math.min(1, left / len), .2, 2); left -= len;
      }
    };
    walk([segs[0], segs[1]]);
    walk([[segs[3][1], segs[3][0]], [segs[2][1], segs[2][0]]]);

    // dividers + spiral
    const TRAIL = 70;
    for (let i = 0; i < steps.length; i++) {
      const st = steps[i];
      const local = Math.min(1, Math.max(0, (ell - st.start) / st.len));
      if (local <= 0) break;
      line(...st.div, local, .14, 2);
      const [cx, cy, rad, a0] = st.arc;
      const n = Math.max(2, Math.ceil(st.len * local / (P * 0.6)));
      for (let k = 0; k <= n; k++) {
        const f = (k / n) * local, th = a0 + f * Math.PI / 2;
        const dist = ell - (st.start + f * st.len);
        const h = pen ? Math.max(0, 1 - dist / TRAIL) : 0;
        plot(cx + rad * Math.cos(th), cy + rad * Math.sin(th), .34, h * h);
      }
      labels[i] && labels[i].classList.toggle('on', true);
    }
    for (let i = 0; i < labels.length; i++) if (!steps[i] || ell < steps[i].start) labels[i].classList.remove('on');

    // pen head: a 2x2 block
    if (pen && p > 0 && p < 1) {
      let st = steps[0]; for (const s of steps) if (s.start <= ell) st = s;
      const f = Math.min(1, (ell - st.start) / st.len), [cx, cy, rad, a0] = st.arc, th = a0 + f * Math.PI / 2;
      const hx = cx + rad * Math.cos(th), hy = cy + rad * Math.sin(th);
      for (let dx = -1; dx <= 0; dx++) for (let dy = -1; dy <= 0; dy++) plot(hx + dx * P, hy + dy * P, 1, 1);
    }

    const d = img.data;
    for (let i = 0, n = a.length; i < n; i++) {
      const al = a[i], ht = hot[i], o = i * 4;
      if (al === 0) { d[o + 3] = 0; continue; }
      d[o]     = C_GEO[0] + (C_INK[0] - C_GEO[0]) * ht;
      d[o + 1] = C_GEO[1] + (C_INK[1] - C_GEO[1]) * ht;
      d[o + 2] = C_GEO[2] + (C_INK[2] - C_GEO[2]) * ht;
      d[o + 3] = 255 * Math.max(al, ht);
    }
    gctx.putImageData(img, 0, 0);
  }

  // ---------- "more below" arrows ----------
  // Three chevrons on the pixel grid, levitating in a slow wave. The bob is sub-pixel: each arrow's alpha is
  // split between the two rows it sits across, then ordered-dithered, so it drifts instead of jumping a row.
  const MORE_GAP = 5, MORE_W = 3 * CHEV[0].length + 2 * MORE_GAP, MORE_H = CHEV.length + 3;
  let moreAt = null;   // when the arrows started fading in (after the intro), null: hidden
  const moreA = new Float32Array(MORE_W * MORE_H);
  function drawMore(now) {
    const img = L && L.moreImg; if (!img) return;
    moreA.fill(0);
    const fade = moreAt === null ? 0 : REDUCED ? 1 : Math.min(1, (now - moreAt) / config.MORE.fadeMs);
    if (fade > 0) for (let k = 0; k < 3; k++) {
      const ph = REDUCED ? 0 : (now / config.MORE.periodMs) * 2 * Math.PI - k * 0.9;   // the wave runs left to right
      const off = 1 + config.MORE.bob * (1 - Math.sin(ph)) / 2;                      // 1 .. 1 + bob rows down
      const glow = 1 - config.MORE.pulse * (1 + Math.sin(ph)) / 2;                    // a touch dimmer at the top
      const r0 = Math.floor(off), f = off - r0, ox = k * (CHEV[0].length + MORE_GAP);
      for (let sy = 0; sy < CHEV.length; sy++) for (let sx = 0; sx < CHEV[0].length; sx++) {
        if (CHEV[sy][sx] === '.') continue;
        const a = fade * glow * (0.55 + 0.45 * sy / (CHEV.length - 1));               // brightest at the point
        for (const [dy, w] of [[0, 1 - f], [1, f]]) {
          const y = r0 + sy + dy; if (y >= MORE_H) continue;
          const i = y * MORE_W + ox + sx; moreA[i] = Math.min(1, moreA[i] + a * w);
        }
      }
    }
    const d = img.data;
    for (let i = 0, n = moreA.length; i < n; i++) {
      const x = i % MORE_W, y = (i / MORE_W) | 0, o = i * 4;
      const on = moreA[i] > BAYER[((y & 7) << 3) | (x & 7)];
      d[o] = C_GEO[0]; d[o + 1] = C_GEO[1]; d[o + 2] = C_GEO[2]; d[o + 3] = on ? 255 : 0;
    }
    mctx.putImageData(img, 0, 0);
  }

  // ---------- portrait: the sheet's dithered top edge, and the veil that dissolves the held cover ----------
  // Both are Bayer 8x8 tiles in bg: the edge thickens row by row down to solid, the veil thickens with how much
  // of the screen the sheet has climbed (64 levels, redrawn only when the level changes).
  const tile = (on) => {
    const c = document.createElement('canvas'); c.width = c.height = 8;
    const t = c.getContext('2d'), im = t.createImageData(8, 8);
    for (let i = 0; i < 64; i++) if (on(i >> 3, i)) { im.data.set(C_BG, i * 4); im.data[i * 4 + 3] = 255; }
    t.putImageData(im, 0, 0);
    return c;
  };
  let veilAt = -1, veilQ = 0;
  const veilTiles = [];
  function drawVeil() {
    if (veil.hidden) return;
    const u = Math.min(1, Math.max(0, 1 - sheet.getBoundingClientRect().top / L.H));
    const lv = Math.round(u * 64);
    if (lv === veilAt) return;
    veilAt = lv;
    vctx.clearRect(0, 0, veil.width, veil.height);
    if (!lv) return;
    veilTiles[lv] ||= tile((y, i) => BAYER[i] < lv / 64);
    vctx.fillStyle = vctx.createPattern(veilTiles[lv], 'repeat');
    vctx.fillRect(0, 0, veil.width, veil.height);
  }
  root.style.setProperty('--px', P + 'px');
  root.style.setProperty('--edge', `url(${tile((y, i) => BAYER[i] < (y + 1) / 9).toDataURL()})`);
  const sheetMoved = () => sheet.getBoundingClientRect().top < L.H - 1;
  addEventListener('scroll', () => {
    veilQ ||= requestAnimationFrame(() => { veilQ = 0; drawVeil(); });
    if (hint && L.port && sheetMoved()) { hint.destroy(); hint = null; }
  }, { passive: true });

  // ---------- swipe hint ----------
  // Once per visit, when the intro has written the whole CV and it still overflows its square: a hand shows it scrolls.
  // Portrait (if config.PORT_HINT): over the header square, unless the sheet has already been pulled up.
  let hint = null, hinted = false, cvScrolled = false;
  function maybeHint() {
    if (hinted || REDUCED) return;
    if (L.port ? !config.PORT_HINT || sheetMoved() : cv.classList.contains('fits') || cvScrolled || cv.scrollTop > 0) return;
    hinted = true;
    const box = document.createElement('div');
    box.className = 'hint-box';
    const [bx, by, bw, bh] = L.cvBox;
    Object.assign(box.style, { left: bx + 'px', top: by + 'px', width: bw + 'px', height: bh + 'px' });
    hero.appendChild(box);
    hint = swipeHint(box, { palette: config.palette, onDone: () => { box.remove(); hint = null; } });
    const kill = hint.destroy;
    hint.destroy = () => { kill(); box.remove(); };
  }
  cv.addEventListener('scroll', () => {
    if (cv.scrollTop <= 0) return;           // our own resets to the top
    cvScrolled = true;
    if (hint) { hint.destroy(); hint = null; }
  }, { passive: true });

  // ---------- photo carousel with ordered-dither transitions ----------
  const INK = pack(...C_BG), PAPER = pack(...C_INK);
  let grainAmount = config.PHOTO_DITHER;   // the ~ shell's "photo n" changes it live

  const photo = {
    imgs: [], data: [], IW: 0, IH: 0, out: null, out32: null,
    load(srcs) {
      return Promise.all(srcs.map(src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; })))
        .then(ims => { this.imgs = ims.filter(Boolean); });
    },
    resize(IW, IH) {
      if (IW < 2 || IH < 2) return;
      this.IW = IW; this.IH = IH; pcv.width = IW; pcv.height = IH;
      this.out = pctx.createImageData(IW, IH); this.out32 = new Uint32Array(this.out.data.buffer);
      const tmp = document.createElement('canvas'); tmp.width = IW; tmp.height = IH;
      const t = tmp.getContext('2d', { willReadFrequently: true });
      // an ordered dither baked into the colours, so the photos keep a grain on the pixel grid
      // (the transitions read the same colours, so rest and transition stay seamless). Levels every q, plus 255:
      // a step that does not divide 255 just leaves a shorter last interval, so white stays white
      const q = STEP_100 * grainAmount / 100;
      const grain = q > 0 && ((v, i) => {
        const lo = q * Math.floor(v / q), hi = Math.min(255, lo + q);
        if (hi <= lo) return Math.round(lo);
        return Math.round((v - lo) / (hi - lo) + BAYER[((((i / IW) | 0) & 7) << 3) | ((i % IW) & 7)] >= 1 ? hi : lo);
      });
      this.data = this.imgs.map(im => {
        t.drawImage(im, 0, 0, IW, IH);
        const px = t.getImageData(0, 0, IW, IH).data, n = IW * IH;
        const col = new Uint32Array(n), lum = new Float32Array(n), hist = new Uint32Array(256);
        for (let i = 0; i < n; i++) {
          const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
          col[i] = grain ? pack(grain(r, i), grain(g, i), grain(b, i)) : pack(r, g, b);
          const l = 0.2126 * r + 0.7152 * g + 0.0722 * b; lum[i] = l; hist[l | 0]++;
        }
        // stretch levels (2% / 98%) so night shots still dither into a readable figure
        let lo = 0, hi = 255, accum = 0;
        for (let v = 0; v < 256; v++) { accum += hist[v]; if (accum > n * 0.02) { lo = v; break; } }
        accum = 0; for (let v = 255; v >= 0; v--) { accum += hist[v]; if (accum > n * 0.02) { hi = v; break; } }
        const span = Math.max(1, hi - lo);
        for (let i = 0; i < n; i++) lum[i] = Math.pow(Math.min(1, Math.max(0, (lum[i] - lo) / span)), 0.9);
        return { col, lum };
      });
      this.render(this.state || { a: 0 });
    },
    // state: { a } at rest, or { a, b, u } mid transition. a = -1 means empty frame.
    render(state) {
      this.state = state;
      const { IW, IH, out32, data } = this; if (!out32 || !data.length) return;
      const A = state.a >= 0 ? data[state.a] : null;
      const u = state.b === undefined ? 0 : state.u;
      const B = state.b === undefined ? null : (state.b >= 0 ? data[state.b] : null);
      if (state.b === undefined) {           // at rest
        if (A) out32.set(A.col); else out32.fill(INK);
        pctx.putImageData(this.out, 0, 0); return;
      }
      const blk = 1 + Math.round(4 * Math.sin(Math.PI * u));
      const phase = u < 0.4 ? 0 : u < 0.6 ? 1 : 2;
      const k = phase === 0 ? u / 0.4 : phase === 1 ? (u - 0.4) / 0.2 : (u - 0.6) / 0.4;
      const glitch = phase === 1 ? Math.sin(Math.PI * k) : 0;
      const D = (S, i, td) => S ? (S.lum[i] > td ? PAPER : INK) : INK;
      const Cc = (S, i) => S ? S.col[i] : INK;
      for (let by = 0, ry = 0; ry < IH; by++, ry += blk) {
        const shift = glitch ? Math.round((Math.random() - 0.5) * 2 * glitch * (Math.random() < 0.35 ? 6 : 0)) * blk : 0;
        const sy = Math.min(IH - 1, ry + (blk >> 1));
        for (let bx = 0, rx = 0; rx < IW; bx++, rx += blk) {
          const sx = Math.min(IW - 1, Math.max(0, rx + (blk >> 1) + shift));
          const i = sy * IW + sx;
          const td = BAYER[((by & 7) << 3) | (bx & 7)];
          const tm = BAYER[(((bx + 3) & 7) << 3) | ((by + 5) & 7)];
          let c;
          if (phase === 0) c = tm < k ? D(A, i, td) : Cc(A, i);
          else if (phase === 1) c = tm < k ? D(B, i, td) : D(A, i, td);
          else c = tm < k ? Cc(B, i) : D(B, i, td);
          const yEnd = Math.min(IH, ry + blk), xEnd = Math.min(IW, rx + blk);
          for (let y = ry; y < yEnd; y++) out32.fill(c, y * IW + rx, y * IW + xEnd);
        }
      }
      pctx.putImageData(this.out, 0, 0);
    },
  };

  // ---------- timeline ----------
  // The loop only runs while the section is on screen and not held under an incoming transition.
  // Pausing shifts the clocks on resume, so a half-written intro picks up where it was left.
  let t0 = 0, introDone = false, cur = 0, trans = null, nextAt = 0;
  let raf = 0, running = false, pausedAt = 0, held = false, started = false, visible = false, isReady = false;
  const fmt = i => String(i + 1).padStart(2, '0') + ' / ' + String(photo.imgs.length).padStart(2, '0');

  function startIntro() {
    t0 = performance.now(); introDone = REDUCED; trans = null; cur = 0; pausedAt = 0; started = true;
    countEl.textContent = fmt(0);
    if (hint) { hint.destroy(); hint = null; }
    moreAt = REDUCED ? t0 : null; drawMore(t0);
    if (REDUCED) { reveal(N); drawGeo(1, false); photo.render({ a: 0 }); nextAt = t0 + HOLD_MS * 1.5; }
    else { reveal(0); drawGeo(0, true); photo.render({ a: -1 }); }
  }

  function next() {
    if (trans || !introDone || photo.imgs.length < 2) return;
    const b = (cur + 1) % photo.imgs.length;
    if (REDUCED) { cur = b; photo.render({ a: cur }); countEl.textContent = fmt(cur); nextAt = performance.now() + HOLD_MS * 1.5; return; }
    trans = { a: cur, b, start: performance.now() };
  }

  function tick(now) {
    if (!running) return;
    if (!introDone) {
      const t = Math.min(1, (now - t0) / INTRO_MS), p = EASE(t);
      drawGeo(p, true);
      reveal(Math.round(p * N));
      const ui = Math.min(1, Math.max(0, (p - 0.3) / 0.7));
      photo.render(ui > 0 ? { a: -1, b: 0, u: 0.4 + 0.6 * ui } : { a: -1 });
      if (t >= 1) { introDone = true; drawGeo(1, false); reveal(N); photo.render({ a: 0 }); nextAt = now + HOLD_MS; moreAt = now; maybeHint(); }
    } else if (trans) {
      const u = Math.min(1, (now - trans.start) / TRANS_MS);
      photo.render({ a: trans.a, b: trans.b, u });
      if (u > 0.5) countEl.textContent = fmt(trans.b);
      if (u >= 1) { cur = trans.b; trans = null; photo.render({ a: cur }); nextAt = now + HOLD_MS; }
    } else if (now >= nextAt) next();
    if (introDone && !REDUCED) drawMore(now);
    raf = requestAnimationFrame(tick);
  }

  function resume() {
    if (running || held || !isReady) return;
    if (!started) startIntro();             // first seen by scrolling up to it (the site opened deeper down)
    if (pausedAt) { const d = performance.now() - pausedAt; t0 += d; nextAt += d; if (trans) trans.start += d; pausedAt = 0; }
    running = true;
    raf = requestAnimationFrame(tick);
  }
  function pause() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    pausedAt = performance.now();
    if (hint) { hint.destroy(); hint = null; }
  }

  frameEl.addEventListener('click', next);
  frameEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } });
  replayButton(hero, content.replay, () => {
    if (held) return;                        // under an incoming transition (the frozen copy lets clicks through)
    cv.scrollTop = 0;
    held = false; startIntro(); resume();
  });

  // The CV scrolls on its own and keeps the wheel (overscroll-behavior: contain). Once it cannot go further
  // that way, the wheel moves the page instead, so the wheel always reaches the next section from anywhere.
  // Handed over by hand (and the native one cancelled, so the page never moves twice for one notch).
  cv.addEventListener('wheel', e => {
    if (env.nav.busy || e.ctrlKey || L.port) return;                         // portrait: the CV is not a scroller, the page scrolls natively
    if (cv.classList.contains('fits')) return;                              // not a scroller: the page gets the wheel natively
    const dy = e.deltaY * (e.deltaMode === 1 ? config.WHEEL_LINE : e.deltaMode === 2 ? innerHeight : 1);
    const atEnd = dy > 0 ? cv.scrollTop + cv.clientHeight >= cv.scrollHeight - 1 : cv.scrollTop <= 0;
    if (!dy || !atEnd) return;
    e.preventDefault();
    window.scrollBy({ top: dy, left: 0, behavior: 'instant' });
  }, { passive: false });

  // ~ shell: "photo n" re-bakes the grain live, not saved (the value to keep goes into config.js)
  const S = content.shell;
  env.command('photo', {
    usage: S.usage, about: S.about,
    run([arg, ...more], print) {
      if (arg === undefined) { print(S.now(grainAmount)); return; }
      const n = Number(arg);
      if (more.length || arg.trim() === '' || !Number.isFinite(n) || n < 0 || n > 1000) { print(S.bad([arg, ...more].join(' ')), 'err'); return; }
      grainAmount = n;
      if (photo.IW) photo.resize(photo.IW, photo.IH);
      print(S.set(n), 'ok');
    },
  });

  let saver = null;
  window.claude?.use?.('downloads').then(ns => { saver = ns; }).catch(() => {});
  dl.addEventListener('click', async e => {
    if (!saver) return;                      // normal link on ovsiankina.com
    e.preventDefault();
    try {
      const blob = await (await fetch(dl.getAttribute('href'))).blob();
      await saver.save({ filename: dl.getAttribute('download'), data: blob });
    } catch (err) { /* declined or unavailable: nothing to do */ }
  });

  let rz; addEventListener('resize', () => {
    clearTimeout(rz); rz = setTimeout(() => {
      layout();
      if (introDone || !running) drawGeo(...geoAt);   // mid-intro, the running loop redraws on its own
    }, 120);
  });

  // -1px: a section merely touching the screen edge (parked right above the current one) counts as off screen
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? resume() : pause(); }, { rootMargin: '-1px 0px' }).observe(root);

  // first layout now so nothing sits unplaced; the real one once photos and fonts are in
  layout();
  const ready = photo.load(config.photos.map(asset))
    .then(() => (document.fonts ? document.fonts.ready : Promise.resolve()))
    .then(() => { layout(); isReady = true; if (visible) resume(); });

  return {
    ready,
    // under an incoming transition: freeze on the first frame of the intro (reduced: on the finished page),
    // so the end of the transition hands over to exactly what is live
    async prepare() {
      await ready;
      pause(); held = true; pausedAt = 0; trans = null;
      cv.scrollTop = 0;
      countEl.textContent = fmt(0);
      moreAt = REDUCED ? 0 : null; drawMore(0);
      if (REDUCED) { reveal(N); drawGeo(1, false); photo.render({ a: 0 }); return; }
      reveal(0); drawGeo(0, true); photo.render({ a: -1 });
      for (const l of labels) l.classList.add('snap'), l.classList.remove('on');
      void hero.offsetWidth;
      for (const l of labels) l.classList.remove('snap');
    },
    onEnter() {
      ready.then(() => { held = false; startIntro(); resume(); });
    },
    onLeave() { pause(); },
  };
}
