// mostoslavsky.com: the landing of mostoslavski.com (sections/01-landing/section.js), cut down to one screen.
// The golden-rectangle construction drawn on a pixel grid, the short CV typewritten into the first square, two
// photos (ordered-dither transitions) in the .618 square, "see the full CV" in the .236 one.
// Self-contained: this folder is the whole web root of mostoslavsky.com.

// ---------- knobs ----------
const PHOTOS = ['photos/01.jpg', 'photos/02.jpg'];
const P = 2;                  // CSS px per drawn pixel
const INTRO_MS = 5000;        // spiral + CV writing
const HOLD_MS = 4200;         // time each photo rests
const TRANS_MS = 1800;        // dither transition between photos
const EASE_PTS = [0.55, 0, 0.8, 0.35];
const PHOTO_DITHER = 300;     // photo grain, as on mostoslavski.com

// ---------- words: English in index.html (what search engines read), French here ----------
const WORDS = {
  fr: {
    aka: 'Aussi écrit Mostoslavski.',
    role: 'Ingénieur logiciel embarqué et temps réel, spécialisé en robotique.',
    avail: 'Seul architecte logiciel et ingénieur principal chez KM-RoBoTa SA, Renens.',
    workH: 'Travail',
    work: "Conception et développement de <em>kmr_v3</em>, l'architecture du SDK de contrôle temps réel des robots de KM-RoBoTa. Firmware en Rust no-std sur ARM Cortex-M4, PREEMPT_RT sous Linux, CAN, RS485, Bluetooth.",
    pubH: 'Publication',
    cv: 'Voir le CV complet',
    cvShort: 'CV complet',
    replay: 'Rejouer',
    photoLabel: 'Photos de David Mostoslavsky, cliquer pour passer à la suivante',
  },
};
const LANGS = ['en', 'fr'];
const keyed = [...document.querySelectorAll('[data-t]')];
WORDS.en = Object.fromEntries(keyed.map(el => [el.dataset.t, el.innerHTML]));
WORDS.en.replay = 'Replay';
WORDS.en.photoLabel = document.querySelector('[data-t-label]').getAttribute('aria-label');
// the publication sentence: only its first words change
WORDS.fr.pub = WORDS.en.pub.replace(/^Lead author,/, 'Auteur principal,');

const store = {
  get() { try { return localStorage.getItem('lang'); } catch { return null; } },
  set(v) { try { localStorage.setItem('lang', v); } catch { /* private mode: not kept */ } },
};
let lang = (() => {
  const saved = store.get();
  if (LANGS.includes(saved)) return saved;
  for (const l of navigator.languages || [navigator.language || 'en']) {
    const b = l.slice(0, 2).toLowerCase();
    if (LANGS.includes(b)) return b;
  }
  return 'en';
})();

// ---------- pixel helpers (core/dither.js on mostoslavski.com) ----------
const BAYER = (() => {
  const b = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
             3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];
  return Float32Array.from(b, v => (v + 0.5) / 64);
})();
const pack = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r;
const rgb = hex => { hex = hex.trim().replace('#', ''); return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)); };

function bezier(x1, y1, x2, y2) {   // same maths as CSS cubic-bezier
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

// ---------- a screen height that holds still while phone toolbars slide (core/viewport.js, simplified) ----------
const touch = matchMedia('(pointer: coarse)').matches;
let SW = document.documentElement.clientWidth, SH = innerHeight;
const setSH = () => document.documentElement.style.setProperty('--sh', SH / 100 + 'px');
setSH();

const PHI = (1 + Math.sqrt(5)) / 2;
const STEP_100 = 255 / 11;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE = bezier(...EASE_PTS);

const hero = document.querySelector('.hero');
const geo = hero.querySelector('.geo'), gctx = geo.getContext('2d');
const frameEl = hero.querySelector('.frame');
const pcv = hero.querySelector('.photo'), pctx = pcv.getContext('2d');
const cv = hero.querySelector('.cv');
const countEl = hero.querySelector('.caption');
const dl = hero.querySelector('.dl');
const css = getComputedStyle(document.documentElement);
const C_GEO = rgb(css.getPropertyValue('--geo')), C_INK = rgb(css.getPropertyValue('--ink')), C_BG = rgb(css.getPropertyValue('--bg'));
hero.classList.add('live');

// ---------- CV: wrap every glyph so the pen can reveal it without reflow ----------
const cursor = document.createElement('span');
cursor.className = 'cursor';
let glyphs = [], N = 0;
function wrap(node) {
  for (const ch of [...node.childNodes]) {
    if (ch.nodeType === 3) {
      const frag = document.createDocumentFragment();
      for (const part of ch.textContent.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); continue; }
        for (const g of part) { const s = document.createElement('span'); s.className = 'c'; s.textContent = g; s._g = g; frag.appendChild(s); glyphs.push(s); }
      }
      ch.replaceWith(frag);
    } else if (ch.nodeType === 1 && ch !== cursor && getComputedStyle(ch).display !== 'none') wrap(ch);
  }
}
// only what shows (portrait leaves the publication out): the pen never spends time on hidden text
function wrapCV() {
  const paras = [...cv.querySelectorAll('p')].filter(p => p.getClientRects().length);
  paras[paras.length - 1].appendChild(cursor);
  glyphs = []; wrap(cv); N = glyphs.length;
}
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

// ---------- language ----------
const replayEl = document.createElement('button');
replayEl.type = 'button'; replayEl.className = 'replay-btn';
const switchEl = document.querySelector('.lang-switch');
function setLang(l) {
  lang = l;
  document.documentElement.lang = l;
  const w = WORDS[l];
  for (const el of keyed) el.innerHTML = w[el.dataset.t];
  frameEl.setAttribute('aria-label', w.photoLabel);
  replayEl.textContent = w.replay;
  for (const b of switchEl.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.lang === l));
}
switchEl.addEventListener('click', e => {
  const l = e.target.dataset?.lang;
  if (!l || l === lang) return;
  store.set(l);
  rewrite(l);
});
// the CV text afresh (new language, or the orientation changed what shows), as much of it written as before
const h1 = cv.querySelector('h1'), NAME = h1.textContent;
function rewrite(l) {
  const part = N ? shown / N : 1;
  scrambled = []; shown = 0;
  setLang(l);
  h1.textContent = NAME;
  wrapCV();
  if (L) fitCV();
  reveal(Math.round(part * N));
}
switchEl.hidden = false;
setLang(lang);
wrapCV();

// ---------- geometry ----------
let L = null;
const labels = [];

function layout() {
  const W = hero.clientWidth, H = hero.clientHeight;
  const port = !(W / H >= 1.2 && W >= 760);
  const pad = Math.max(16, Math.round(Math.min(W, H) * 0.04));
  const top = port ? 40 : pad;                 // portrait: room for the EN / FR switch above the rectangle
  let x0, y0, Wr, Hr, d0;
  if (!port) { Hr = Math.min(H - 2 * pad, (W - 2 * pad) / PHI); Wr = Hr * PHI; x0 = (W - Wr) / 2; y0 = (H - Hr) / 2; d0 = 0; }
  else {
    Hr = Math.min((W - 2 * pad) * PHI, H - top - pad - 32); Wr = Hr / PHI;   // 32: the replay button under it
    x0 = (W - Wr) / 2; y0 = top + (H - top - pad - 32 - Hr) / 2; d0 = 3;
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
  let acc = 0; for (const st of steps) { st.start = acc; acc += st.len; }

  const [fx, fy, fw] = steps[1].sq;
  const [cx, cy, cs] = steps[0].sq;
  L = { W, H, port, x0, y0, Wr, Hr, steps, total: acc };
  const turned = hero.classList.contains('port') !== port;
  hero.classList.toggle('port', port);

  Object.assign(frameEl.style, { left: fx + 'px', top: fy + 'px', width: fw + 'px', height: fw + 'px' });
  Object.assign(cv.style, { left: cx + 'px', top: cy + 'px', width: cs + 'px', height: cs + 'px', padding: Math.round(cs * (port ? 0.06 : 0.07)) + 'px' });

  const [bx, by, bs] = steps[3].sq;
  Object.assign(dl.style, { left: bx + 'px', top: by + 'px', width: bs + 'px', height: bs + 'px' });
  dl.classList.toggle('compact', bs < 150);
  dl.classList.toggle('tiny', bs < 90);
  dl.style.setProperty('--pad', Math.round(Math.max(8, bs * 0.09)) + 'px');

  if (turned) rewrite(lang); else fitCV();

  geo.width = Math.ceil(W / P); geo.height = Math.ceil(H / P);
  geo.style.width = geo.width * P + 'px'; geo.style.height = geo.height * P + 'px';
  L.img = gctx.createImageData(geo.width, geo.height);
  L.a = new Float32Array(geo.width * geo.height);
  L.hot = new Float32Array(geo.width * geo.height);

  // ratio labels: 1, 1/φ, 1/φ², ...
  labels.forEach(l => l.remove()); labels.length = 0;
  steps.slice(0, 6).forEach((st, i) => {
    const el = document.createElement('div'); el.className = 'lbl'; el.setAttribute('aria-hidden', 'true');
    el.textContent = i === 0 ? '1' : (1 / PHI ** i).toFixed(3).replace(/^0/, '');
    el.style.left = st.sq[0] + 5 + 'px'; el.style.top = st.sq[1] + 5 + 'px';
    hero.appendChild(el); labels.push(el);
  });

  photo.resize(Math.round(fw / P), Math.round(fw / P));
}

// the short CV fills its square: the largest type that still fits (it scrolls if even the smallest does not)
function fitCV() {
  let fs = L.port ? 13 : Math.min(17, Math.max(12, L.Hr / 46));
  const min = 10;
  for (;;) {
    cv.style.setProperty('--fs', fs + 'px');
    const fits = cv.scrollHeight <= cv.clientHeight + 1 && cv.scrollWidth <= cv.clientWidth + 1;
    if (fits || fs <= min) break;
    fs = Math.max(min, fs - 0.5);
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

let geoAt = [0, true];
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
  const walk = order => {
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
    if (labels[i]) labels[i].classList.add('on');
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

// ---------- photos with ordered-dither transitions ----------
const INK = pack(...C_BG), PAPER = pack(...C_INK);
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
    const q = STEP_100 * PHOTO_DITHER / 100;
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
      // stretch levels (2% / 98%) so dark shots still dither into a readable figure
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
    if (state.b === undefined) {
      if (A) out32.set(A.col); else out32.fill(INK);
      pctx.putImageData(this.out, 0, 0); return;
    }
    const u = state.u, B = state.b >= 0 ? data[state.b] : null;
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
let t0 = 0, introDone = false, cur = 0, trans = null, nextAt = 0, raf = 0;
const fmt = i => String(i + 1).padStart(2, '0') + ' / ' + String(photo.imgs.length || PHOTOS.length).padStart(2, '0');

function startIntro() {
  cancelAnimationFrame(raf);
  t0 = performance.now(); introDone = REDUCED; trans = null; cur = 0;
  countEl.textContent = fmt(0);
  if (REDUCED) { reveal(N); drawGeo(1, false); photo.render({ a: 0 }); nextAt = t0 + HOLD_MS * 1.5; }
  else { reveal(0); drawGeo(0, true); photo.render({ a: -1 }); }
  raf = requestAnimationFrame(tick);
}
function next() {
  if (trans || !introDone || photo.imgs.length < 2) return;
  const b = (cur + 1) % photo.imgs.length;
  if (REDUCED) { cur = b; photo.render({ a: cur }); countEl.textContent = fmt(cur); nextAt = performance.now() + HOLD_MS * 1.5; return; }
  trans = { a: cur, b, start: performance.now() };
}
function tick(now) {
  if (!introDone) {
    const t = Math.min(1, (now - t0) / INTRO_MS), p = EASE(t);
    drawGeo(p, true);
    reveal(Math.round(p * N));
    const ui = Math.min(1, Math.max(0, (p - 0.3) / 0.7));
    photo.render(ui > 0 ? { a: -1, b: 0, u: 0.4 + 0.6 * ui } : { a: -1 });
    if (t >= 1) { introDone = true; drawGeo(1, false); reveal(N); photo.render({ a: 0 }); nextAt = now + HOLD_MS; }
  } else if (trans) {
    const u = Math.min(1, (now - trans.start) / TRANS_MS);
    photo.render({ a: trans.a, b: trans.b, u });
    if (u > 0.5) countEl.textContent = fmt(trans.b);
    if (u >= 1) { cur = trans.b; trans = null; photo.render({ a: cur }); nextAt = now + HOLD_MS; }
  } else if (now >= nextAt) next();
  raf = requestAnimationFrame(tick);
}

frameEl.addEventListener('click', next);
frameEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } });
replayEl.addEventListener('click', () => { cv.scrollTop = 0; startIntro(); });
hero.appendChild(replayEl);

// relayout on a real resize: always with a mouse, on a touch screen only when the width changes (rotation) or the
// height by more than a quarter (split screen), never for the toolbars sliding in and out
let rz;
addEventListener('resize', () => {
  clearTimeout(rz);
  rz = setTimeout(() => {
    const w = document.documentElement.clientWidth, h = innerHeight;
    if (touch && w === SW && Math.abs(h - SH) <= SH / 4) return;
    SW = w; SH = h; setSH();
    layout(); drawGeo(...geoAt);
  }, 120);
});

// first layout now so nothing sits unplaced, the real one once photos and fonts are in
layout(); drawGeo(0, true); reveal(REDUCED ? N : 0);
await photo.load(PHOTOS);
if (document.fonts) await document.fonts.ready;
layout();
startIntro();
