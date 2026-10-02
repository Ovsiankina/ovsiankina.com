// Swipe hint: a dithered pixel-art hand presses, drags up (the touch gesture that reads on) and lifts, over an ASCII ripple layer.
// Plays one pass over a box, then removes itself. Transparent: what is under it shows through a dithered veil.
//   const h = swipeHint(box, { palette, onDone });   h.destroy();
// Options: palette { bg, ink, text, dim } (hex), from / to (fingertip start / end, fraction of the box height; to < from drags up),
// pixel (CSS px per hand pixel, auto), fps (tick rate, 18.2 = the PC timer: choppy on purpose), timing (s per phase).

// o outline, w skin, c cuff. The fingertip contact point is the top edge of column 7, row 0.
const SPRITE = [
  '......ooo..........',
  '.....owwwo.........',
  '.....owwwo.........',
  '.....owwwo.........',
  '.....owwwo.........',
  '.....owwwo.........',
  '.....owwwo.........',
  '.....owwwoooo......',
  '.....owwwowwo......',
  '.....owwwowwoooo...',
  '.....owwwowwowwo...',
  '..oo.owwwowwowwoooo',
  '.owwoowwwowwowwowwo',
  '.owwwowwwowwowwowwo',
  '..owwwwwwwwwwwwwwwo',
  '...owwwwwwwwwwwwwwo',
  '...owwwwwwwwwwwwwwo',
  '....owwwwwwwwwwwwo.',
  '.....owwwwwwwwwwwo.',
  '.....owwwwwwwwwwo..',
  '.....oooooooooooo..',
  '.....occcccccccco..',
  '.....occcccccccco..',
  '.....oooooooooooo..',
];
const TIP = [7, 0];
// knuckle tops relative to the fingertip (sprite px) and how strong their motion streak is
const KNUCKLES = [[3.5, 7, 0.55], [6.5, 9, 0.45], [9.5, 11, 0.35], [-4.5, 11, 0.35]];
const CUFF = ['#000058', '#00002a'];   // near-black navy

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// CP437 glyphs as 8x16 bitmaps (x 0..7, y 0..15), so the look never depends on a loaded font
const BM = {
  dot:  (x, y) => (x === 3 || x === 4) && (y === 7 || y === 8),          // ·
  lite: (x, y) => (y & 1) ? (x & 3) === 2 : (x & 3) === 0,                // ░
  med:  (x, y) => ((x + y) & 1) === 0,                                    // ▒
  bar:  x => x === 3 || x === 4,                                          // │
  dbar: x => x === 1 || x === 2 || x === 5 || x === 6,                    // ║
  tri:  (x, y) => { const k = y - 4; return k >= 0 && k < 8 && x >= (k >> 1) && x <= 7 - (k >> 1); },   // ▼
  utri: (x, y) => { const k = 11 - y; return k >= 0 && k < 8 && x >= (k >> 1) && x <= 7 - (k >> 1); },  // ▲
};

const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (B4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOut = a => 1 - Math.pow(1 - a, 3);
const easeInOut = a => a < 0.5 ? 4 * a * a * a : 1 - Math.pow(-2 * a + 2, 3) / 2;

function buildSprite() {
  const h0 = SPRITE.length, w0 = SPRITE[0].length, W = w0 + 2, H = h0 + 2;   // 1 px pad for the glow
  const mat = new Uint8Array(W * H), val = new Float32Array(W * H);          // 0 empty 1 glow 2 outline 3 skin 4 cuff
  for (let y = 0; y < h0; y++) for (let x = 0; x < w0; x++) {
    const c = SPRITE[y][x];
    mat[(y + 1) * W + x + 1] = c === 'o' ? 2 : c === 'w' ? 3 : c === 'c' ? 4 : 0;
  }
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : mat[y * W + x];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (mat[i] === 0 && [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].includes(2)) mat[i] = 1;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, m = mat[i];
    if (m < 3) continue;
    const ty = (y - 1) / (h0 - 1), tx = (x - 1) / (w0 - 1);
    let v;
    if (m === 3) { const g = clamp((ty - 0.42) / 0.5, 0, 1); v = g * g * 1.9 + tx * 0.3; }  // light top, dithered palm
    else v = 0.6 + tx * 0.5;                                  // dim navy, darker to the right
    if (at(x - 1, y) === 2 || at(x, y - 1) === 2) v -= 0.7;   // rim light on the top-left edges
    if (at(x + 1, y) === 2 || at(x, y + 1) === 2) v += 0.5;   // shade on the bottom-right edges
    val[i] = v;
  }
  return { W, H, mat, val, tipX: TIP[0] + 1, tipY: TIP[1] + 1 };
}

export function swipeHint(root, opts = {}) {
  const C = {
    from: 0.64, to: 0.22, pixel: 0, fps: 18.2, veil: 0.6, onDone: () => {},
    ...opts,
    timing: { appear: 0.35, press: 0.16, drag: 0.95, release: 0.16, fade: 0.42, ...(opts.timing || {}) },
  };
  const T = C.timing;
  const dir = C.to >= C.from ? 1 : -1;                          // 1 drags down, -1 drags up
  const tA = T.appear, tP = tA + T.press, tD = tP + T.drag, tR = tD + T.release, tF = tR + T.fade;
  const S = buildSprite();
  const pal = C.palette;
  const PAL = {
    skin: [pal.ink, pal.text, pal.dim].map(hex),
    cuff: CUFF.map(hex),
    outline: hex(pal.bg), glow: hex(pal.dim), ghost: hex(pal.dim), veil: hex(pal.bg),
  };
  // 0-3 ripple, 4-7 trail, 8-10 arrows
  const GLYPHS = [
    [BM.dot, pal.dim], [BM.lite, pal.dim], [BM.lite, pal.text], [BM.med, pal.ink],
    [BM.dot, pal.dim], [BM.bar, pal.dim], [BM.bar, pal.text], [BM.dbar, pal.ink],
    ...[pal.dim, pal.text, pal.ink].map(c => [dir > 0 ? BM.tri : BM.utri, c]),
  ];

  const el = document.createElement('div');
  el.className = 'swipe-hint';
  el.setAttribute('aria-hidden', 'true');
  const ascii = document.createElement('canvas'); ascii.className = 'ascii';
  const hand = document.createElement('canvas'); hand.className = 'hand';
  const veil = document.createElement('canvas'); veil.className = 'hand';
  el.append(veil, ascii, hand);
  root.appendChild(el);
  const actx = ascii.getContext('2d'), hctx = hand.getContext('2d'), vctx = veil.getContext('2d');

  let W, H, dpr, P, cw, chh, cwD, chD, cols, rows, atlas, trail, rip, chev, img, vimg, lw, lh, x0, y0, y1, veilAt = -1;
  let rings = [], now = 0, fired = {}, lastEmit = 0, prevY = null, prevTipY = null;

  function resize() {
    const r = el.getBoundingClientRect();
    W = r.width; H = r.height;
    if (W < 2 || H < 2) return false;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    P = C.pixel || 2 * clamp(Math.round(Math.min(W, H) / 220), 2, 3);   // 4 or 6: stays on the page's 2 px grid

    ascii.width = Math.round(W * dpr); ascii.height = Math.round(H * dpr);
    const fp = Math.max(1, Math.round(dpr));
    cwD = 8 * fp; chD = 16 * fp;
    cw = cwD / dpr; chh = chD / dpr;
    el.style.setProperty('--scan', P + 'px');
    cols = Math.ceil(ascii.width / cwD); rows = Math.ceil(ascii.height / chD);
    trail = new Float32Array(cols * rows); rip = new Float32Array(cols * rows); chev = new Float32Array(cols * rows);
    atlas = document.createElement('canvas');
    atlas.width = GLYPHS.length * cwD; atlas.height = chD;
    const g = atlas.getContext('2d');
    GLYPHS.forEach(([f, col], i) => {
      g.fillStyle = col;
      for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) if (f(x, y)) g.fillRect(i * cwD + x * fp, y * fp, fp, fp);
    });

    lw = Math.ceil(W / P); lh = Math.ceil(H / P);
    for (const c of [hand, veil]) { c.width = lw; c.height = lh; c.style.width = lw * P + 'px'; c.style.height = lh * P + 'px'; }
    img = hctx.createImageData(lw, lh); vimg = vctx.createImageData(lw, lh); veilAt = -1;

    x0 = Math.round(W / 2 / P) * P;
    const lo = 8, hi = H - (S.H - S.tipY) * P - 16;               // fingertip range: the hand hangs below the tip
    y0 = clamp(H * C.from, lo, hi);
    y1 = clamp(H * C.to, lo, hi);
    if (dir * (y1 - y0) < 8 * P) y1 = y0 + dir * 8 * P;
    rings = []; prevY = null;
    return true;
  }

  // where the fingertip is at time t
  function state(t) {
    let y = y1, alpha = 0, press = 0, drag = 0;
    if (t < tA) { const a = t / tA; y = y0 - dir * (1 - easeOut(a)) * 4 * P; alpha = easeOut(a); }   // comes in along the drag
    else if (t < tP) { y = y0; alpha = 1; press = (t - tA) / T.press; }
    else if (t < tD) { const a = (t - tP) / T.drag; y = y0 + (y1 - y0) * easeInOut(a); alpha = 1; press = 1; drag = a; }
    else if (t < tR) { y = y1; alpha = 1; press = 1 - (t - tD) / T.release; drag = 1; }
    else if (t < tF) { const a = (t - tR) / T.fade; y = y1 - dir * easeOut(a) * 2 * P; alpha = 1 - a; drag = 1; }   // backs off
    return { x: x0, y, alpha, press, drag };
  }

  const ring = (x, y, s, maxR, life, delay = 0) => rings.push({ x, y, s, maxR, life, t0: now + delay });

  function stampTrail(x, ya, yb, v, half) {
    const c0 = Math.floor(x / cw);
    const ra = Math.max(0, Math.floor(Math.min(ya, yb) / chh)), rb = Math.min(rows - 1, Math.floor(Math.max(ya, yb) / chh));
    for (let r = ra; r <= rb; r++) for (let dc = -half; dc <= half; dc++) {
      const c = c0 + dc;
      if (c < 0 || c >= cols) continue;
      const i = r * cols + c, k = v * (1 - Math.abs(dc) / (half + 1) * 0.6);
      if (k > trail[i]) trail[i] = k;
    }
  }

  function update(dt) {
    now += dt;
    const t = now, st = state(t);

    // touch down: a sharp ring and a softer echo
    if (!fired.press && t >= tA) {
      fired.press = true;
      ring(st.x, y0, 1, 8 * P, 1.2);
      ring(st.x, y0, 0.55, 12 * P, 1.4, 0.14);
    }
    const peak = 3 * (y1 - y0) / T.drag;                         // fastest fingertip speed, px/s
    const sp = prevY === null || dt <= 0 ? 0 : clamp(Math.abs(st.y - prevY) / dt / peak, 0, 1);
    // while dragging: small rings shed at the fingertip, stronger when moving fast
    if (t >= tP && t < tD && now - lastEmit > 0.075) { lastEmit = now; ring(st.x, st.y, 0.22 + 0.6 * sp, 4.5 * P, 0.8); }
    // lift off
    if (!fired.release && t >= tD) {
      fired.release = true;
      ring(st.x, y1, 0.9, 9 * P, 1.3);
      ring(st.x, y1, 0.45, 14 * P, 1.5, 0.16);
    }

    const decay = Math.pow(0.12, dt);
    for (let i = 0; i < trail.length; i++) trail[i] *= decay;
    const dragging = t >= tP && t < tR;
    if (dragging && prevTipY !== null) {
      const half = Math.max(0, Math.round(4 * P / cw / 2 - 0.5));
      stampTrail(st.x, prevTipY, st.y, 0.6 + 0.4 * sp, half);
      for (const [dx, dy, k] of KNUCKLES) stampTrail(st.x + dx * P, prevTipY + dy * P, st.y + dy * P, k * (0.4 + 0.6 * sp), 0);
    }
    prevTipY = dragging ? st.y : null;
    prevY = st.y;
    return { t, st };
  }

  function fillChevrons(t, st) {
    chev.fill(0);
    let a = 0;
    if (t < tP) a = clamp(t / tA, 0, 1);
    else if (t < tD) a = clamp(1 - st.drag * 2.4, 0, 1);
    if (a <= 0) return;
    // ahead of the hand: under its cuff when it drags down, over the fingertip when it drags up
    const cx = Math.floor(x0 / cw), r0 = Math.floor((dir > 0 ? y0 + (S.H - S.tipY) * P + 10 : y0 - 10) / chh) - (dir > 0 ? 0 : 1);
    for (let k = 0; k < 3; k++) {
      const w = 0.5 + 0.5 * Math.sin(now * 7 - k * 1.3);       // brightness wave travelling the way the hand goes
      const r = r0 + dir * k * 2;
      if (r >= 0 && r < rows && cx >= 0 && cx < cols) chev[r * cols + cx] = a * (0.22 + 0.78 * w * w) * (1 - k * 0.15);
    }
  }

  function rasterRings() {
    rip.fill(0);
    rings = rings.filter(R => now < R.t0 + R.life);
    for (const R of rings) {
      if (now < R.t0) continue;
      const a = (now - R.t0) / R.life;
      const rad = cw * 0.5 + R.maxR * (1 - (1 - a) * (1 - a));
      const th = Math.max(cw * 1.1, rad * 0.16), amp = R.s * Math.pow(1 - a, 1.4);
      const c0 = Math.max(0, Math.floor((R.x - rad - th) / cw)), c1 = Math.min(cols - 1, Math.ceil((R.x + rad + th) / cw));
      const r0 = Math.max(0, Math.floor((R.y - rad - th) / chh)), r1 = Math.min(rows - 1, Math.ceil((R.y + rad + th) / chh));
      for (let r = r0; r <= r1; r++) {
        const dy = (r + 0.5) * chh - R.y;
        for (let c = c0; c <= c1; c++) {
          const dx = (c + 0.5) * cw - R.x, rv = 1 - Math.abs(Math.hypot(dx, dy) - rad) / th;
          if (rv > 0) { const i = r * cols + c, v = rv * amp; if (v > rip[i]) rip[i] = v; }
        }
      }
    }
  }

  function drawAscii() {
    actx.clearRect(0, 0, ascii.width, ascii.height);
    for (let r = 0, i = 0; r < rows; r++) for (let c = 0; c < cols; c++, i++) {
      let g = -1;
      const v = chev[i];
      if (v > 0.08) g = 8 + (v > 0.7 ? 2 : v > 0.38 ? 1 : 0);
      else {
        const rv = rip[i], tv = trail[i];
        if (rv >= tv && rv > 0.08) g = rv > 0.62 ? 3 : rv > 0.36 ? 2 : rv > 0.18 ? 1 : 0;
        else if (tv > 0.08) g = 4 + (tv > 0.75 ? 3 : tv > 0.45 ? 2 : tv > 0.22 ? 1 : 0);
      }
      if (g >= 0) actx.drawImage(atlas, g * cwD, 0, cwD, chD, c * cwD, r * chD, cwD, chD);
    }
  }

  // one copy of the sprite into the low-res buffer; alpha is dithered on the screen grid, shading on the sprite grid
  function stamp(d, ox, oy, alpha, bias, ghost) {
    for (let sy = 0; sy < S.H; sy++) {
      const gy = oy + sy;
      if (gy < 0 || gy >= lh) continue;
      for (let sx = 0; sx < S.W; sx++) {
        const i = sy * S.W + sx, m = S.mat[i];
        if (!m) continue;
        const gx = ox + sx;
        if (gx < 0 || gx >= lw || bay(gx, gy) >= alpha) continue;
        let col;
        if (ghost) { if (m === 1) continue; col = PAL.ghost; }
        else if (m === 1) { if ((gx + gy) & 1) continue; col = PAL.glow; }
        else if (m === 2) col = PAL.outline;
        else {
          const tones = m === 3 ? PAL.skin : PAL.cuff, v = S.val[i] + bias;
          let k = Math.floor(v);
          if (bay(sx, sy) < v - k) k++;
          col = tones[clamp(k, 0, tones.length - 1)];
        }
        const o = (gy * lw + gx) * 4;
        d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
      }
    }
  }

  // the veil: what is under the hint recedes behind an ordered dither of the background, in and out with the hand
  function drawVeil(t) {
    const va = Math.round(16 * C.veil * (t < tA ? easeOut(t / tA) : t < tR ? 1 : clamp(1 - (t - tR) / T.fade, 0, 1))) / 16;
    if (va === veilAt) return;                                   // 16 dither levels: most ticks change nothing
    veilAt = va;
    el.style.setProperty('--hint-a', va / C.veil);                // the scanlines come and go with it
    const d = vimg.data, [r, g, b] = PAL.veil;
    for (let y = 0, o = 0; y < lh; y++) for (let x = 0; x < lw; x++, o += 4) {
      d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = bay(x, y) < va ? 255 : 0;
    }
    vctx.putImageData(vimg, 0, 0);
  }

  function drawHand(t, st) {
    const d = img.data;
    d.fill(0);
    if (st.alpha > 0) {
      const ox = Math.round(st.x / P) - S.tipX, oy = Math.round(st.y / P) - S.tipY;
      if (t >= tP && t < tR) {                                   // dithered afterimages while it moves
        for (const [lag, ga] of [[0.075, 0.42], [0.15, 0.2]]) {
          const gy = Math.round(state(Math.max(tP, t - lag)).y / P) - S.tipY;
          if (dir * (oy - gy) >= 2) stamp(d, ox, gy + dir, ga, 0, true);
        }
      }
      stamp(d, ox, oy + Math.round(st.press), st.alpha, st.press * 0.35, false);   // pressed: 1 px down, more shade
    }
    hctx.putImageData(img, 0, 0);
  }

  function render(t, st) {
    drawVeil(t);
    fillChevrons(t, st);
    rasterRings();
    drawAscii();
    drawHand(t, st);
  }

  let raf = 0, last = 0, acc = 0, alive = true;
  function frame(ms) {
    raf = 0;
    if (!alive) return;
    const s = ms / 1000, dt = last ? Math.min(0.1, s - last) : 0;
    last = s;
    const step = 1 / C.fps;                                      // fixed DOS-style tick
    let out = null;
    for (acc += dt; acc >= step; acc -= step) out = update(step);
    if (out) render(out.t, out.st);
    if (now >= tF) { destroy(); C.onDone(); return; }            // one pass only
    raf = requestAnimationFrame(frame);
  }

  function destroy() {
    alive = false;
    if (raf) cancelAnimationFrame(raf);
    el.remove();
  }

  if (resize()) raf = requestAnimationFrame(frame);
  else destroy();
  return { destroy, get alive() { return alive; } };
}
