// Into the maths section: the Standard Model Lagrangian, written line by line over the frozen screen, then wiped off
// line by line onto the maths section, which is already running underneath.
//
// Three states per line band: the frozen screen (A), the Lagrangian page (B), the maths section (C).
// Pen 1 sweeps A -> B along the band; K lines later pen 2 sweeps B -> C. Both edges are the swipe's seam:
// a Bayer-dithered ramp on 2 px blocks whose 50 % line rides a sine. The glyph ink is dithered on the same grid
// (config.transition.ink): a dithered halo around every glyph, and wet ink right behind the pen.
// The canvas is transparent in A (the ghost shows through) and in C (the live section shows), opaque in B.
// The ghost sits above the section, so wherever C can appear it is clipped away: bands erase top to bottom, and a
// band's write pen has fully crossed it (seam and wobble included) before its erase pen starts, so the ghost is never
// needed above the bottom of the lowest band being erased.
import content from './content.js';
import config from './config.js';
import { BAYER, pack, clamp01, cssRgb } from './pixels.js';

const X = config.transition;

// the atlas: one term between two operators per atom, [x, y, width, bracket depth] in atlas px
const atlasP = (async () => {
  const img = new Image();
  img.decoding = 'async';
  const loaded = new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
  img.src = new URL(X.atlasImage, import.meta.url);
  const [atlas] = await Promise.all([fetch(new URL(X.atlasData, import.meta.url)).then(r => r.json()), loaded]);
  return { atlas, img };
})();
atlasP.catch(() => {});

// greedy wrap at operators; on overflow, prefer a break at a shallower bracket depth in the last 35 % of the line
function breakLines(A, maxW, indent) {
  const lines = [];
  let cur = [0], w = A[0][2];
  for (let j = 1; j < A.length; j++) {
    const aw = A[j][2], minKeep = lines.length ? 1 : 2;
    if (w + aw > maxW && cur.length >= minKeep) {
      let best = cur.length, bestD = A[j][3], x = w;
      for (let b = cur.length - 1; b >= minKeep; b--) {
        x -= A[cur[b]][2];
        if (x < maxW * 0.65) break;
        if (A[cur[b]][3] < bestD) { best = b; bestD = A[cur[b]][3]; }
      }
      const carry = cur.splice(best);
      lines.push(cur);
      cur = carry.concat([j]);
      w = indent + cur.reduce((sum, k) => sum + A[k][2], 0);
    } else { cur.push(j); w += aw; }
  }
  lines.push(cur);
  return lines;
}

function txLayout(T, ATLAS, atlasImg) {
  // the overlay box, not documentElement.clientWidth: in standards mode that ignores the locked page's scrollbar gutter
  const W = T.W = T.box.clientWidth || innerWidth, H = T.H = T.box.clientHeight || innerHeight;
  T.GW = W; T.GH = H;                                   // 1 px grid for the glyphs; the seam dithers on 2 px blocks
  const txc = T.canvas;
  txc.width = W; txc.height = H; txc.style.width = W + 'px'; txc.style.height = H + 'px';
  T.img = T.ctx.createImageData(W, H); T.out32 = new Uint32Array(T.img.data.buffer);

  const A = ATLAS.atoms, E = ATLAS.E, SH = ATLAS.SH;
  const m = Math.max(10, Math.round(Math.min(W, H) * X.margin)), iw = W - 2 * m, ih = H - 2 * m;
  const maxAtom = Math.max(...A.map(a => a[2]));
  const indentAt = k => Math.min(A[0][2], 0.05 * iw / k);   // hanging indent under "L_SM =", smaller on narrow pages
  // largest scale (CSS px per atlas px) at which the wrapped equation still fits the page
  let lo = 0.005, hi = Math.min(2, iw / maxAtom);
  for (let it = 0; it < 32; it++) {
    const mid = (lo + hi) / 2;
    if (breakLines(A, iw / mid, indentAt(mid)).length * X.pitch * E * mid <= ih) lo = mid; else hi = mid;
  }
  const k = lo, indent = indentAt(k), lines = breakLines(A, iw / k, indent), n = lines.length, pitch = ih / n;
  T.n = n;

  // draw the page once
  const pc = document.createElement('canvas'); pc.width = W; pc.height = H;
  const g = pc.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  T.curTop = new Float32Array(n); T.curBot = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const L = lines[i], dy = m + i * pitch + (pitch - SH * k) / 2;
    const lw = (i ? indent : 0) + L.reduce((sum, a) => sum + A[a][2], 0);
    const extra = iw / k - lw;
    // justify all but the last line, spreading space only between top-level terms (never inside brackets)
    const slots = L.slice(1).filter(a => A[a][3] === 0).length;
    const gap = i < n - 1 && slots > 0 ? Math.min(extra / slots, 0.9 * E) : 0;
    let x = m + (i ? indent * k : 0);
    L.forEach((a, j) => {
      const [ax, ay, aw, depth] = A[a];
      if (j > 0 && depth === 0) x += gap * k;
      g.drawImage(atlasImg, ax, ay, aw, SH, x, dy, aw * k, SH * k);
      x += aw * k;
    });
    T.curTop[i] = dy + (ATLAS.BASE - 0.78 * E) * k; T.curBot[i] = dy + (ATLAS.BASE + 0.3 * E) * k;
  }
  const px = g.getImageData(0, 0, W, H).data;
  T.glyph = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) T.glyph[i] = px[i * 4] > 64 ? 1 : 0;

  // the ink's halo: 1 on a glyph, down to 0 at the halo radius (chamfer distance to the nearest glyph pixel)
  const R = Math.max(X.ink.halo.min, X.ink.halo.em * E * k), D = T.halo = new Float32Array(W * H), r2 = Math.SQRT2;
  for (let i = 0; i < W * H; i++) D[i] = T.glyph[i] ? 0 : R;
  for (let y = 1; y < H; y++) for (let x = 1, i = y * W + 1; x < W - 1; x++, i++)
    D[i] = Math.min(D[i], D[i - 1] + 1, D[i - W] + 1, D[i - W - 1] + r2, D[i - W + 1] + r2);
  for (let y = H - 2; y >= 0; y--) for (let x = W - 2, i = y * W + x; x > 0; x--, i--)
    D[i] = Math.min(D[i], D[i + 1] + 1, D[i + W] + 1, D[i + W + 1] + r2, D[i + W - 1] + r2);
  for (let i = 0; i < W * H; i++) D[i] = 1 - Math.min(D[i], R) / R;

  // one band of the screen per line; bandEnd[i]: first row below band i (what the ghost clip needs)
  T.rowBand = new Int16Array(H);
  T.bandEnd = new Int32Array(n).fill(H);
  for (let y = 0; y < H; y++) T.rowBand[y] = Math.max(0, Math.min(n - 1, Math.floor((y - m) / pitch)));
  for (let y = H - 1; y > 0; y--) if (T.rowBand[y - 1] !== T.rowBand[y]) T.bandEnd[T.rowBand[y - 1]] = y;

  // timeline: lines get faster; a line is erased when the K-th line below it starts
  const WRITE = Math.max(X.write.min, Math.min(X.write.max, n * X.write.perLine));
  const wts = Array.from({ length: n }, (_, i) => Math.pow(1 - X.speedup * i / Math.max(1, n - 1), 1.5));
  const sw = wts.reduce((p, q) => p + q, 0);
  T.LINE_MS = wts.map(q => q / sw * WRITE);
  T.LINE_T0 = []; { let acc = 0; for (const d of T.LINE_MS) { T.LINE_T0.push(acc); acc += d; } }
  T.END_WRITE = WRITE;
  const K = Math.max(3, Math.round(n * X.kFrac));
  T.ERASE_MS = T.LINE_MS.map(d => Math.max(d, X.eraseMinMs));
  T.ERASE_T0 = []; { let acc = WRITE; for (let i = 0; i < n; i++) { if (i + K < n) T.ERASE_T0.push(T.LINE_T0[i + K]); else { T.ERASE_T0.push(acc); acc += T.ERASE_MS[i] * 0.8; } } }
  T.TX_MS = T.ERASE_T0[n - 1] + T.ERASE_MS[n - 1] + 120;
  T.L = Math.max(X.ramp.min, W * X.ramp.frac);          // ramp width behind each pen, CSS px
  T.dry = Math.max(1, W * X.ink.dry);                   // ink settling distance behind the write pen, CSS px
  T.penW = new Float64Array(n); T.penE = new Float64Array(n); T.penD = new Float64Array(n);
}

function txRender(T, ms) {
  const { GW, GH, out32, glyph, halo, rowBand, L, dry, n, penW, penE, penD, LINE_T0, LINE_MS, ERASE_T0, ERASE_MS, PAPER32, GLYPH32 } = T;
  const { fresh, rest, wet } = X.ink;
  const x0 = -L - 4, x1 = GW + L + 4;
  let writing = -1, erasing = -1;
  for (let i = 0; i < n; i++) {
    penW[i] = ms < LINE_T0[i] ? -1e9 : x0 + (x1 - x0) * clamp01((ms - LINE_T0[i]) / LINE_MS[i]);
    penE[i] = ms < ERASE_T0[i] ? -1e9 : x0 + (x1 - x0) * clamp01((ms - ERASE_T0[i]) / ERASE_MS[i]);
    penD[i] = ms < LINE_T0[i] ? -1e9 : x0 + (x1 - x0) * (ms - LINE_T0[i]) / LINE_MS[i];   // keeps going: the ink dries to the end
    if (ms >= LINE_T0[i] && ms < LINE_T0[i] + LINE_MS[i]) writing = i;
    if (ms >= ERASE_T0[i]) erasing = i;
  }
  const cTop = writing >= 0 ? T.curTop[writing] : -1, cBot = writing >= 0 ? T.curBot[writing] : -1;
  for (let y = 0; y < GH; y++) {
    const band = rowBand[y], by = (y >> 1) & 7, i0 = y * GW;
    const wob = X.seam.amp * L * Math.sin(2 * Math.PI * (y & ~1) / X.seam.wave);
    const pw = penW[band] + wob, pe = penE[band] - wob, pd = penD[band] + wob;
    const cursorRow = band === writing && y >= cTop && y <= cBot;
    const rowW = by << 3, rowE = ((by + 2) & 7), h0 = (y & ~1) * GW;
    for (let x = 0; x < GW; x++) {
      const bx = x >> 1, xb = x & ~1;
      if (BAYER[(((bx + 5) & 7) << 3) | rowE] < 0.5 + (pe - xb) / L) { out32[i0 + x] = 0; continue; }
      if (BAYER[rowW | (bx & 7)] >= 0.5 + (pw - xb) / L) { out32[i0 + x] = 0; continue; }
      // the ink, dithered (same Bayer cell as the seam): glyphs, thin while wet, and their halo on whole 2 px blocks
      const behind = pd - xb, s = behind >= dry ? 1 : behind <= 0 ? 0 : behind / dry, th = BAYER[rowW | (bx & 7)];
      const ink = glyph[i0 + x] ? th < fresh + (1 - fresh) * s : th < halo[h0 + xb] * (wet + (rest - wet) * s);
      out32[i0 + x] = (ink || (cursorRow && x >= pw - wob - 3 && x < pw - wob)) ? GLYPH32 : PAPER32;
    }
  }
  T.ctx.putImageData(T.img, 0, 0);
  // hide the frozen screen down to the bottom of the lowest band being erased (C can only appear up there)
  const cut = erasing < 0 ? 0 : T.bandEnd[erasing];
  if (cut !== T.cut) { T.cut = cut; T.ghost.style.clipPath = `inset(${cut}px 0 0 0)`; }
  T.cap.classList.toggle('on', ms > X.captionFrom && ms < T.END_WRITE);
}

// prefers-reduced-motion (or no atlas in time): the old screen steps away
function fade(ghost, ms) {
  ghost.style.transition = `opacity ${ms}ms steps(3)`;
  void ghost.offsetWidth;
  ghost.style.opacity = 0;
  return new Promise(res => setTimeout(res, ms));
}

export async function play(t) {
  const { ghost, layer, root, section } = t;
  section?.restart?.();                                   // the section is alive underneath from the start
  if (t.reduced) return fade(ghost, X.reducedMs);
  // the atlas is fetched at boot; if it is still not there after a short wait, do not hold the frozen screen for it
  let atlas = null;
  try {
    atlas = await Promise.race([atlasP, new Promise(res => setTimeout(res, X.atlasWaitMs, null))]);
    if (!atlas) console.warn('[03-math] Lagrangian atlas not loaded yet, plain fade instead');
  } catch (e) { console.warn('[03-math] Lagrangian atlas failed to load', e); }
  if (!atlas) return fade(ghost, X.reducedMs);

  const box = document.createElement('div');
  box.className = 's-math tx';                            // .s-math: the section's styles reach the overlay
  for (const [k, v] of Object.entries(config.palette)) box.style.setProperty('--' + k, v);
  box.innerHTML = '<canvas></canvas><div class="cap"></div>';
  layer.appendChild(box);
  const cap = box.querySelector('.cap');
  cap.textContent = content.transitionCaption;
  const canvas = box.querySelector('canvas');
  const T = {
    box, canvas, ctx: canvas.getContext('2d'), ghost, cap, cut: -1,
    PAPER32: pack(...cssRgb(box, '--paper')), GLYPH32: pack(...cssRgb(box, '--paper-ink')),
  };
  txLayout(T, atlas.atlas, atlas.img);
  txRender(T, 0);

  return new Promise(res => {
    let raf = 0, rz = 0;
    const onResize = () => { clearTimeout(rz); rz = setTimeout(() => txLayout(T, atlas.atlas, atlas.img), 120); };
    addEventListener('resize', onResize);
    const t0 = performance.now();
    const tick = now => {
      const ms = now - t0;
      if (ms >= T.TX_MS) {
        removeEventListener('resize', onResize); clearTimeout(rz);
        ghost.style.clipPath = 'inset(100% 0 0 0)';
        raf = 0; res(); return;
      }
      try { txRender(T, ms); } catch (e) { console.error('[03-math transition]', e); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
}
