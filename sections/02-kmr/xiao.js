// 3 · XIAO ESP32-C3 model: ASCII colour layers or plain pixel render, drag to turn.
import { fontIn, fontLate } from './swimmer.js';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// root: the .xiao sub-section. sectionRoot: gets .dragging while a drag is on. cfg: config.xiao. text: content.xiao
export async function xiao(root, sectionRoot, cfg, text) {
  const stage = root.querySelector('.stage');
  const cv = stage.querySelector('canvas.px'), ctx = cv.getContext('2d');
  const asciiBox = stage.querySelector('.model-ascii');
  const segBtns = [...root.querySelectorAll('.seg button')];
  const ASCII_SIZE = cfg.asciiSize, FONT_MIN = cfg.fontMin, FONT_MAX = cfg.fontMax;

  // ---------- mesh ----------
  const MESH = await fetch(new URL(cfg.mesh, import.meta.url)).then(r => r.json());
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0)).buffer;
  const Vi = new Int16Array(b64(MESH.v)), I = new Uint16Array(b64(MESH.i)), MT = new Uint8Array(b64(MESH.m));
  const NV = Vi.length / 3, NT = MT.length;
  const V = new Float32Array(Vi.length); for (let k = 0; k < Vi.length; k++) V[k] = Vi[k] / 100; // mm
  // material ids = index in NAMES + 1: mask edge gold silver label dark ink silk. ASCII layer 8 = specular glint
  const NAMES = MESH.mats.slice();
  const ALB = cfg.albedo, SPEC = cfg.spec, VIS = cfg.vis;
  NAMES.push('silk'); // id 8: white silkscreen painted on the bottom soldermask
  const SILK_ID = NAMES.length, MASK_ID = NAMES.indexOf('mask') + 1;
  const METAL = NAMES.map(n => n === 'gold' || n === 'silver');
  // silkscreen texture in board coords: 20 px per mm, x in [-10.5, 10.5], z in [-8.9, 8.9]
  const TW = 420, TH = 356, SILK = (() => {
    const tc = document.createElement('canvas'); tc.width = TW; tc.height = TH;
    const g = tc.getContext('2d'), X = x => (x + 10.5) * 20, Y = zz => (-zz + 8.9) * 20;
    g.fillStyle = g.strokeStyle = '#fff'; g.lineWidth = 7;
    for (const sg of [1, -1]) {
      g.beginPath(); g.moveTo(X(-8.9), Y(sg * 7.5)); g.lineTo(X(-8.9), Y(sg * 6.2)); g.lineTo(X(8.9), Y(sg * 6.2)); g.lineTo(X(8.9), Y(sg * 7.5)); g.stroke();
    }
    g.save(); g.translate(X(-5.6), Y(0)); g.rotate(-Math.PI / 2); g.textAlign = 'center';
    const fit = (txt, w, px, wt, fam) => { g.font = wt + ' ' + px + 'px ' + fam; const k = Math.min(1, w / g.measureText(txt).width); g.font = wt + ' ' + Math.floor(px * k) + 'px ' + fam; return Math.floor(px * k); };
    const { brand, model } = text.silkscreen;
    const h1 = fit(brand, 230, 50, '800', 'system-ui, sans-serif'); g.fillText(brand, 0, -4);
    fit(model, 220, 34, '700', 'ui-monospace, monospace'); g.fillText(model, 0, h1 + 4);
    g.restore();
    const d = g.getImageData(0, 0, TW, TH).data, o = new Uint8Array(TW * TH);
    for (let i = 0; i < o.length; i++) o[i] = d[4 * i + 3] > 90 ? 1 : 0;
    const out = new Uint8Array(o.length);
    for (let y = 1; y < TH - 1; y++) for (let x = 1; x < TW - 1; x++) { const i = y * TW + x; out[i] = o[i] | o[i - 1] | o[i + 1] | o[i - TW] | o[i + TW]; }
    return out;
  })();
  const N = new Float32Array(NT * 3);
  for (let t = 0; t < NT; t++) {
    const a = I[3 * t] * 3, b = I[3 * t + 1] * 3, c = I[3 * t + 2] * 3;
    const ux = V[b] - V[a], uy = V[b + 1] - V[a + 1], uz = V[b + 2] - V[a + 2];
    const vx = V[c] - V[a], vy = V[c + 1] - V[a + 1], vz = V[c + 2] - V[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; N[3 * t] = nx / l; N[3 * t + 1] = ny / l; N[3 * t + 2] = nz / l;
  }
  const SX = new Float32Array(NV), SY = new Float32Array(NV), SZ = new Float32Array(NV);
  const nrm = (x, y, z) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };
  const L = nrm(-0.3, 0.3, 0.9), L2 = nrm(0.3, -0.5, 0.8);
  const Hh = (() => { const x = L[0], y = L[1], z = L[2] + 1, l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; })();
  const D = cfg.camDist, R = cfg.frameR; // camera distance and framing radius, mm

  // ---------- rasterizer ----------
  function target(W, H, pw, ph, wantRGB) {
    return { W, H, pw, ph, z: new Float32Array(W * H), mat: new Uint8Array(W * H), lum: new Float32Array(W * H), spc: new Float32Array(W * H), rgb: wantRGB ? new Uint32Array(W * H) : null };
  }
  function raster(T, yaw, pitch, S) {
    const { W, H, pw, ph, z, mat, lum, spc, rgb } = T;
    z.fill(-1e9); mat.fill(0); if (rgb) rgb.fill(0);
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const kx = S / pw, ky = S / ph, ox = W / 2, oy = H / 2;
    for (let i = 0, k = 0; i < NV; i++, k += 3) {
      const x = V[k], y = V[k + 1], zz = V[k + 2];
      const x1 = cy * x + sy * zz, z1 = -sy * x + cy * zz;
      const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      const f = D / (D - z2);
      SX[i] = ox + x1 * f * kx; SY[i] = oy - y2 * f * ky; SZ[i] = z2;
    }
    for (let t = 0; t < NT; t++) {
      const a = I[3 * t], b = I[3 * t + 1], c = I[3 * t + 2];
      const x0 = SX[a], y0 = SY[a], x1 = SX[b], y1 = SY[b], x2 = SX[c], y2 = SY[c];
      const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
      if (area > -1e-6 && area < 1e-6) continue;
      let minx = Math.max(0, Math.floor(Math.min(x0, x1, x2))), maxx = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
      let miny = Math.max(0, Math.floor(Math.min(y0, y1, y2))), maxy = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
      if (minx > maxx || miny > maxy) continue;
      const nx0 = N[3 * t], ny0 = N[3 * t + 1], nz0 = N[3 * t + 2];
      const nx1 = cy * nx0 + sy * nz0, nz1 = -sy * nx0 + cy * nz0;
      let nx = nx1, ny = ny0 * cp - nz1 * sp, nz = ny0 * sp + nz1 * cp;
      if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const m = MT[t], name = NAMES[m];
      const diff = Math.min(1, Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]) + 0.5 * Math.max(0, nx * L2[0] + ny * L2[1] + nz * L2[2]));
      const hv = Math.max(0, nx * Hh[0] + ny * Hh[1] + nz * Hh[2]);
      const s = Math.pow(hv, 28) * SPEC[name];
      const shade = 0.3 + 0.7 * diff;
      const lv = Math.min(1, shade * VIS[name] + s * 0.5);
      let col = 0;
      if (rgb) {
        const al = ALB[name], sw = s * 255;
        const r = Math.min(255, al[0] * shade + sw) | 0, g = Math.min(255, al[1] * shade + sw) | 0, bl = Math.min(255, al[2] * shade + sw * 0.95) | 0;
        col = (255 << 24) | (bl << 16) | (g << 8) | r;
      }
      const z0 = SZ[a], z1v = SZ[b], z2v = SZ[c], inv = 1 / area, mid = m + 1;
      const silk = mid === MASK_ID && V[3 * a + 1] < -1.45 && V[3 * b + 1] < -1.45 && V[3 * c + 1] < -1.45;
      let sCol = 0, sLv = 0, mxa = 0, mxb = 0, mxc = 0, mza = 0, mzb = 0, mzc = 0;
      if (silk) {
        mxa = V[3 * a]; mxb = V[3 * b]; mxc = V[3 * c]; mza = V[3 * a + 2]; mzb = V[3 * b + 2]; mzc = V[3 * c + 2];
        const ss = Math.pow(hv, 28) * SPEC.silk;
        sLv = Math.min(1, shade * VIS.silk + ss * 0.5);
        if (rgb) { const al = ALB.silk, v = ss * 255; sCol = (255 << 24) | ((Math.min(255, al[2] * shade + v) | 0) << 16) | ((Math.min(255, al[1] * shade + v) | 0) << 8) | (Math.min(255, al[0] * shade + v) | 0); }
      }
      for (let py = miny; py <= maxy; py++) {
        const yc = py + 0.5;
        for (let px = minx; px <= maxx; px++) {
          const xc = px + 0.5;
          const w0 = ((x1 - xc) * (y2 - yc) - (x2 - xc) * (y1 - yc)) * inv;
          if (w0 < 0) continue;
          const w1 = ((x2 - xc) * (y0 - yc) - (x0 - xc) * (y2 - yc)) * inv;
          if (w1 < 0) continue;
          const w2 = 1 - w0 - w1;
          if (w2 < 0) continue;
          const zz = w0 * z0 + w1 * z1v + w2 * z2v, i = py * W + px;
          if (zz <= z[i]) continue;
          z[i] = zz;
          if (silk) {
            const tx = ((w0 * mxa + w1 * mxb + w2 * mxc) + 10.5) * 20 | 0, ty = (8.9 - (w0 * mza + w1 * mzb + w2 * mzc)) * 20 | 0;
            if (tx >= 0 && ty >= 0 && tx < TW && ty < TH && SILK[ty * TW + tx]) { mat[i] = SILK_ID; lum[i] = sLv; spc[i] = 0; if (rgb) rgb[i] = sCol; continue; }
          }
          mat[i] = mid; lum[i] = lv; spc[i] = s;
          if (rgb) rgb[i] = col;
        }
      }
    }
  }

  // ---------- views ----------
  const PIX = cfg.pix;
  const pres = [...asciiBox.querySelectorAll('pre')];
  const preByM = []; pres.forEach(p => { preByM[+p.dataset.m] = p; });
  const RAMP = ' .,:-=+*#%@';
  const hsh = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000 / 1000;
  let T3 = null, img = null, TA = null, cols = 0, rows = 0, cellW = 6, cellH = 10, fontPx = Math.round(FONT_MIN + ASCII_SIZE * (FONT_MAX - FONT_MIN)), grid = null;
  let mode = 'ascii';

  function measure() {
    const c = document.createElement('canvas').getContext('2d');
    c.font = fontPx + 'px ' + getComputedStyle(root).getPropertyValue('--mono');
    cellW = c.measureText('@'.repeat(40)).width / 40; cellH = fontPx;
  }
  function layout() {
    const w = stage.clientWidth, h = stage.clientHeight;
    const W = Math.max(1, Math.ceil(w / PIX)), H = Math.max(1, Math.ceil(h / PIX));
    cv.width = W; cv.height = H; cv.style.width = W * PIX + 'px'; cv.style.height = H * PIX + 'px';
    cv.style.left = Math.floor((w - W * PIX) / 2) + 'px'; cv.style.top = Math.floor((h - H * PIX) / 2) + 'px';
    T3 = target(W, H, PIX, PIX, true); img = ctx.createImageData(W, H);
    measure();
    cols = Math.floor(w / cellW); rows = Math.floor(h / cellH);
    pres.forEach(p => { p.style.fontSize = fontPx + 'px'; p.style.left = ((w - cols * cellW) / 2) + 'px'; p.style.top = ((h - rows * cellH) / 2) + 'px'; });
    TA = target(cols * 2, rows * 2, cellW / 2, cellH / 2, false);
    grid = { ch: new Uint16Array(cols * rows), m: new Uint8Array(cols * rows), base: new Uint8Array(cols * rows), dep: new Float32Array(cols * rows) };
  }

  function drawRender(yaw, pitch) {
    const S = Math.min(stage.clientWidth, stage.clientHeight) / (2 * R);
    raster(T3, yaw, pitch, S);
    new Uint32Array(img.data.buffer).set(T3.rgb);
    ctx.putImageData(img, 0, 0);
  }
  function drawAscii(yaw, pitch) {
    const S = Math.min(stage.clientWidth, stage.clientHeight) / (2 * R);
    raster(TA, yaw, pitch, S);
    const W2 = cols * 2, { mat, lum, spc, z } = TA, cnt = new Uint8Array(10), dep = grid.dep;
    grid.ch.fill(32); grid.m.fill(0); dep.fill(-1e9);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      cnt.fill(0); let sl = 0, sp = 0, n = 0, sz = 0;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const i = (2 * r + dy) * W2 + 2 * c + dx, m = mat[i];
        if (!m) continue; cnt[m]++; sl += lum[i]; sp = Math.max(sp, spc[i]); n++; sz += z[i];
      }
      if (!n) continue;
      dep[c + r * cols] = sz / n;
      let best = 1; for (let k = 2; k <= SILK_ID; k++) if (cnt[k] > cnt[best]) best = k;
      const v = sl / 4;
      const q = Math.max(0, Math.min(RAMP.length - 1, Math.floor(v * (RAMP.length - 1) + 0.4 + (hsh(c, r) - 0.5) * 0.3)));
      const ch = q === 0 ? (n >= 2 ? 46 : 32) : RAMP.charCodeAt(q);
      if (ch === 32) continue;
      const g = c + r * cols;
      grid.ch[g] = ch; grid.m[g] = (METAL[best - 1] && sp > 0.5) ? 8 : (best === 7 || best === SILK_ID) ? 5 : best;
      grid.base[g] = (best === 7 || best === SILK_ID) ? 5 : best;
    }
    // edges: a covered cell whose neighbours sit clearly behind it (or are empty) gets a line char along the step
    const STEP = cfg.edgeStep; // mm
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const g = c + r * cols, zc = dep[g];
      if (zc < -1e8) continue;
      let nx = 0, ny = 0, k = 0;
      const at = (rr, cc) => (rr < 0 || cc < 0 || rr >= rows || cc >= cols) ? -1e9 : dep[cc + rr * cols];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const zn = at(r + dy, c + dx), zo = at(r - dy, c - dx);
        const far = zn < -1e8 || (zo > -1e8 ? 2 * zc - zn - zo > STEP : zc - zn > STEP * 1.6);
        if (far) { nx += dx; ny += dy; k++; }
      }
      if (!k || (nx === 0 && ny === 0)) continue;
      const a = Math.atan2(ny * cellH, nx * cellW);
      const o = ((a * 180 / Math.PI) + 360) % 180;
      let ch;
      if (o < 22.5 || o >= 157.5) ch = 124;
      else if (o < 67.5) ch = 92;
      else if (o < 112.5) ch = ny > 0 ? 95 : 45;
      else ch = 47;
      grid.ch[g] = ch; grid.m[g] = grid.base[g];
    }
    for (let m = 1; m <= 8; m++) {
      if (!preByM[m]) continue;
      let out = '';
      for (let r = 0; r < rows; r++) {
        let line = '', last = -1;
        for (let c = cols - 1; c >= 0; c--) if (grid.m[r * cols + c] === m) { last = c; break; }
        for (let c = 0; c <= last; c++) { const g = r * cols + c; line += grid.m[g] === m ? String.fromCharCode(grid.ch[g]) : ' '; }
        out += line + '\n';
      }
      preByM[m].textContent = out;
    }
  }

  // ---------- motion + input ----------
  const st = { yaw: cfg.yaw, pitch: cfg.pitch, ph: 0, drag: null, last: 0 };
  const TILT = cfg.tilt;                         // auto mode tumbles between top view (+) and back view (-)
  const SPIN = 2 * Math.PI / cfg.spinSeconds;    // one turn per spinSeconds
  stage.addEventListener('pointerdown', e => {
    e.preventDefault();                                   // no text selection starts from a drag
    window.getSelection()?.removeAllRanges();
    sectionRoot.classList.add('dragging');
    st.drag = { x: e.clientX, y: e.clientY }; stage.setPointerCapture(e.pointerId); kick();
  });
  stage.addEventListener('pointermove', e => {
    if (!st.drag) return;
    st.yaw += (e.clientX - st.drag.x) * 0.01;
    // touch: vertical swipes scroll the page (touch-action: pan-y), so a finger only turns the board
    if (e.pointerType !== 'touch') st.pitch = Math.max(-1.2, Math.min(1.45, st.pitch + (e.clientY - st.drag.y) * 0.01));
    st.drag = { x: e.clientX, y: e.clientY };
    if (reduced) draw();
  });
  const up = () => { st.drag = null; sectionRoot.classList.remove('dragging'); };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);

  function setMode(m) {
    mode = m;
    segBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    cv.hidden = m !== 'render'; asciiBox.hidden = m !== 'ascii';
    draw();
  }
  segBtns.forEach(b => { b.onclick = () => setMode(b.dataset.mode); });

  const draw = () => { if (!T3) return; mode === 'ascii' ? drawAscii(st.yaw, st.pitch) : drawRender(st.yaw, st.pitch); };
  // visible: on screen. paused: the site moved to another section (onLeave); coming back into view lifts it.
  let visible = false, paused = false, raf = 0, lastA = 0;
  function frame(now) {
    raf = 0;
    if (!visible || paused) { st.last = 0; return; }
    const dt = Math.min(0.05, (now - (st.last || now)) / 1000); st.last = now;
    if (!reduced && !st.drag) {
      st.yaw += SPIN * dt; st.ph += SPIN * 0.5 * dt;
      st.pitch += (TILT * Math.cos(st.ph) - st.pitch) * Math.min(1, dt * 3);
    }
    // both views are software rasters: capped (ASCII at asciiFps, the pixel render at renderFps)
    if (now - lastA > 1000 / (mode === 'render' ? cfg.renderFps : cfg.asciiFps)) { draw(); lastA = now; }
    if (!reduced) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  await fontIn(root);
  layout(); draw();
  new ResizeObserver(() => { layout(); draw(); }).observe(stage);
  fontLate(() => { layout(); draw(); });                  // late webfont: new cell size
  // -1px: a section merely touching the screen edge (parked just above or below the current one) is off-screen,
  // otherwise it never reports leaving and scrolling back into it would not lift the pause
  new IntersectionObserver(e => { visible = e[0].isIntersecting; if (visible) { paused = false; kick(); } }, { rootMargin: '-1px 0px' }).observe(root);

  return {
    st, draw, setMode,
    pause() { paused = true; if (raf) { cancelAnimationFrame(raf); raf = 0; } st.last = 0; },
    resume() { paused = false; if (visible) kick(); },
  };
}
