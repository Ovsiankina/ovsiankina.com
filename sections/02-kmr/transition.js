// Transition into KM-RoBoTa: the agnathax loader effect with its colours reversed.
// The snake robot, its wake and the fish swim over the frozen previous screen (the core's ghost), and the
// ASCII wall chasing them uncovers the live black KM-RoBoTa section underneath: the ghost and the water
// are clipped with the same wall polygon every frame, the wall glyphs draw over everything.
import config from './config.js';

const CONFIG = config.swipe;
const KEYS = ['dim', 'mid', 'foam', 'fish', 'robot'];   // water layers, bottom to top

export async function play(tx) {
  const { ghost, layer } = tx;
  const rm = tx.reduced;

  // the wall belongs to this section: .s-kmr gives the overlay the section's font
  const wrap = document.createElement('div');
  wrap.className = 's-kmr kmr-swipe';
  const water = document.createElement('div');
  water.className = 'water';
  wrap.appendChild(water);
  const layers = {};
  for (const k of [...KEYS, 'far', 'near']) {
    const el = document.createElement('pre');
    const c = CONFIG.layers[k];
    el.style.color = c.color;
    if (c.opacity != null) el.style.opacity = c.opacity;
    if (c.weight) el.style.fontWeight = c.weight;
    (KEYS.includes(k) ? water : wrap).appendChild(el);
    layers[k] = el;
  }
  layer.appendChild(wrap);
  const put = o => { for (const k in o) layers[k].textContent = o[k]; };

  // the wall's font, but never wait long for it: a stalled font CDN must not hold the core (fallback is monospace)
  const font = getComputedStyle(layers.near);
  await Promise.race([
    Promise.all(['', '500 '].map(w => document.fonts.load(`${w}${font.fontSize} ${font.fontFamily}`))).catch(() => {}),
    new Promise(r => setTimeout(r, CONFIG.fontWait)),
  ]);
  // cell size of whatever font is in use now (IBM Plex Mono 13px / 15px, see style.css)
  const meas = document.createElement('canvas').getContext('2d');
  meas.font = `${font.fontSize} ${font.fontFamily}`;
  const CW = meas.measureText('M'.repeat(40)).width / 40 || 7.8, LH = parseFloat(font.lineHeight) || 15;
  tx.section?.hold?.(true);               // its own snake waits off-screen: never two snakes at once

  // ---------- the animation (logic kept from the loader) ----------
  const S = { t0: performance.now(), fish: null, lastT: 0 };
  await new Promise(resolve => {
    function frame(now) {
      try { if (step(now)) requestAnimationFrame(frame); else resolve(); }
      catch (e) { console.error('[02-kmr swipe]', e); resolve(); }   // never leave the core waiting
    }
    function step(now) {
      const t = (now - S.t0) / 1000;
      const Wpx = window.innerWidth, Hpx = window.innerHeight;
      const cols = Math.ceil(Wpx / CW), rows = Math.ceil(Hpx / LH), N = cols * rows;
      const hsh = (x, y, z) => (((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0) % 1000 / 1000;
      const toText = (arr) => {
        let out = '';
        for (let y = 0; y < rows; y++) {
          let last = -1;
          for (let x = cols - 1; x >= 0; x--) if (arr[y * cols + x]) { last = x; break; }
          let line = '';
          for (let x = 0; x <= last; x++) { const c = arr[y * cols + x]; line += c ? String.fromCharCode(c) : ' '; }
          out += line + '\n';
        }
        return out;
      };

      // travel direction: 60deg diagonal on desktop, straight down on mobile / portrait
      const mobile = Wpx < 700 || Wpx < Hpx;
      const th = (mobile ? 90 : 60) * Math.PI / 180;
      const dx = Math.cos(th), dy = Math.sin(th);
      const px = -dy, py = dx;
      const Cx = Wpx / 2, Cy = Hpx / 2;
      const ext = Math.abs(Wpx / 2 * dx) + Math.abs(Hpx / 2 * dy);

      const D = CONFIG.swimSeconds;
      const T0 = CONFIG.lead;
      const Lpx = CONFIG.robotLength, A0 = ext + 30;
      const v = (A0 + ext + Lpx + 10) / D;
      const swimT = t - T0;
      const an = -A0 + v * swimT;
      const Nx = Cx + an * dx, Ny = Cy + an * dy;
      const k = 2 * Math.PI / (0.9 * Lpx), omega = (v / 0.72) * k, Amax = 0.065 * Lpx;
      const env = (u) => 0.55 + 0.45 * Math.pow(Math.min(1, Math.max(0, u)), 1.6);
      const lat = (sv) => Amax * env(sv / Lpx) * Math.sin(k * sv - omega * swimT);
      const xAt = (sv) => Nx - sv * dx + lat(sv) * px;
      const rowS = LH / dy;
      const Lrows = Math.round(Lpx / rowS);

      // robot
      const mask = new Uint8Array(N);
      const robotLines = new Array(rows).fill('');
      if (!rm && swimT >= 0) {
        const nr = Math.floor(Ny / LH);
        for (let si = 0; si < Lrows; si++) {
          const r = nr - si;
          if (r < 0 || r >= rows) continue;
          const yc = (r + 0.5) * LH;
          let sv = (Ny - yc) / dy;
          for (let it = 0; it < 2; it++) sv = (Ny - yc + lat(sv) * py) / dy;
          sv = Math.max(0, sv);
          const w = si >= Lrows - 2 ? 1 : 3;
          const c = xAt(sv) / CW - 0.5;
          const slope = (xAt(sv) - xAt(sv + rowS)) / CW;
          const e = slope > 0.45 ? '\\' : slope < -0.45 ? '/' : '|';
          let str;
          if (si === 0) str = '\\_/';
          else if (w === 1) str = e;
          else {
            const joint = si >= 2 && (si - 2) % 3 === 0;
            str = e + (si === 1 ? 'o' : joint ? '=' : '#') + e;
          }
          const start = Math.round(c - (w - 1) / 2);
          robotLines[r] = ' '.repeat(Math.max(0, start)) + (start < 0 ? str.slice(-start) : str);
          for (let x = start - 1; x <= start + w; x++) if (x >= 0 && x < cols) mask[r * cols + x] = 1;
        }
      }

      const W1r = CONFIG.wallBack, W2r = CONFIG.wallFront, JIT = CONFIG.wallJitter;
      const frontPx = (W2r + JIT + 1) * LH, backPx = (W1r + JIT + 1) * LH;
      const e0 = -ext - frontPx, eEnd = ext + backPx;
      let vs, ts;
      if (rm) { ts = CONFIG.reducedDelay; vs = (eEnd - e0) / CONFIG.reducedWall; }
      else {
        vs = CONFIG.wallSpeed * v;
        const tCross = T0 + D;
        const ex = ext - 10 - frontPx;
        ts = tCross - (ex - e0) / vs;
      }
      const tEnd = ts + (eEnd - e0) / vs;
      const evNow = e0 + vs * (t - ts);

      // fish: two small schools (boids), each fish bolts on its own when the swipe gets close
      const dt = Math.min(0.05, Math.max(0, t - (S.lastT || 0)));
      S.lastT = t;
      if (!S.fish) {
        S.fish = [];
        const spawn = (n, x0, y0, vx0, vy0, school) => {
          for (let i = 0; i < n; i++) {
            const big = i % 6 === 0;
            S.fish.push({
              x: x0 + (Math.random() - 0.5) * 140, y: y0 + (Math.random() - 0.5) * 90,
              vx: vx0 * (0.8 + Math.random() * 0.4), vy: vy0 + (Math.random() - 0.5) * 30,
              school, big, flee: false,
              trig: 240 + Math.random() * 220,
              fa: (Math.random() - 0.5) * 1.8,
              fs: 380 + Math.random() * 300
            });
          }
        };
        spawn(CONFIG.fish[0], -90, Hpx * 0.68, 85, -8, 0);
        spawn(CONFIG.fish[1], Wpx + 90, Hpx * 0.3, -85, 8, 1);
      }
      const fish = S.fish;
      const sAx = Nx - (Lpx / 2) * dx, sAy = Ny - (Lpx / 2) * dy;
      for (const f of fish) {
        if (!f.flee && t > ts && (f.x - Cx) * dx + (f.y - Cy) * dy - evNow < f.trig) f.flee = true;
        let ax = 0, ay = 0;
        if (f.flee) {
          const c = Math.cos(f.fa), sn = Math.sin(f.fa);
          const tgtX = (dx * c - dy * sn) * f.fs, tgtY = (dx * sn + dy * c) * f.fs;
          const kf = Math.min(1, dt * 6);
          f.vx += (tgtX - f.vx) * kf; f.vy += (tgtY - f.vy) * kf;
        } else {
          let n = 0, cx0 = 0, cy0 = 0, avx = 0, avy = 0, sx = 0, sy = 0;
          for (const g of fish) {
            if (g === f || g.school !== f.school || g.flee) continue;
            const ddx = g.x - f.x, ddy = g.y - f.y, d2 = ddx * ddx + ddy * ddy;
            if (d2 > 8100) continue;
            n++; cx0 += g.x; cy0 += g.y; avx += g.vx; avy += g.vy;
            if (d2 < 2025) { sx -= ddx / (d2 + 1) * 1400; sy -= ddy / (d2 + 1) * 2400; }
          }
          if (n) {
            ax += (cx0 / n - f.x) * 0.9 + (avx / n - f.vx) * 1.2 + sx * 1.6;
            ay += (cy0 / n - f.y) * 0.9 + (avy / n - f.vy) * 1.2 + sy * 1.6;
          }
          ax += (Math.random() - 0.5) * 60; ay += (Math.random() - 0.5) * 60;
          const m = 50;
          if (f.x < m) ax += (m - f.x) * 3; if (f.x > Wpx - m) ax -= (f.x - Wpx + m) * 3;
          if (f.y < m) ay += (m - f.y) * 3; if (f.y > Hpx - m) ay -= (f.y - Hpx + m) * 3;
          if (!rm && swimT >= 0) {
            for (const [qx, qy] of [[Nx, Ny], [sAx, sAy]]) {
              const ddx = f.x - qx, ddy = f.y - qy, d2 = ddx * ddx + ddy * ddy;
              if (d2 < 16900) { const d = Math.sqrt(d2) + 1; ax += ddx / d * 900; ay += ddy / d * 900; }
            }
          }
          f.vx += ax * dt; f.vy += ay * dt;
          const sp = Math.hypot(f.vx, f.vy), lo = 55, hi = 150;
          if (sp > hi) { f.vx *= hi / sp; f.vy *= hi / sp; } else if (sp < lo && sp > 0) { f.vx *= lo / sp; f.vy *= lo / sp; }
        }
        f.x += f.vx * dt; f.y += f.vy * dt;
      }
      const fishC = new Uint8Array(N);
      for (const f of fish) {
        const g = f.vx >= 0 ? (f.big ? "><(((\'>" : '><>') : (f.big ? "<\')))><" : '<><');
        const r = Math.floor(f.y / LH);
        if (r < 0 || r >= rows) continue;
        const c0 = Math.round(f.x / CW - g.length / 2);
        for (let j = 0; j < g.length; j++) {
          const x = c0 + j;
          if (x < 0 || x >= cols) continue;
          const i = r * cols + x;
          if (mask[i] === 1) continue;
          fishC[i] = g.charCodeAt(j);
          mask[i] = 2;
        }
      }

      // speedboat wake: a narrow V, stationary in the robot's frame
      const ramp = ' .:-~=+*%@';
      const tick = Math.floor(t * 14);
      const tanT = 0.2, w0 = 0.6;
      const foamC = new Uint8Array(N), midC = new Uint8Array(N), dimC = new Uint8Array(N);
      if (!rm && swimT >= 0) {
        for (let y = 0; y < rows; y++) {
          const ry = (y + 0.5) * LH - Ny;
          for (let x = 0; x < cols; x++) {
            const i = y * cols + x;
            if (mask[i]) continue;
            const rx = (x + 0.5) * CW - Nx;
            const dbRaw = -(rx * dx + ry * dy) / 15;
            if (dbRaw < -1 || dbRaw > 45) continue;
            const d = Math.abs(rx * px + ry * py) / 15;
            const db = Math.max(0, dbRaw);
            const off = w0 + db * tanT;
            if (d > off + 3) continue;
            const lead = dbRaw < 0 ? 1 + dbRaw : 1;
            const u = d - off;
            const sg = u > 0 ? 0.25 + 0.01 * db : 0.4 + 0.03 * db;
            const washW = 0.35 + 0.02 * db;
            const innerDecay = Math.exp(-db / 9);
            let I = Math.exp(-(u / sg) * (u / sg)) * Math.exp(-db / 13) * lead;
            I += Math.exp(-(d / washW) * (d / washW)) * Math.exp(-db / 9) * lead * 0.85;
            if (u < 0) {
              const sw = Math.max(0, Math.sin(2 * Math.PI * (db * 0.32 + d * 0.55)));
              I += 0.35 * sw * sw * sw * innerDecay * (0.3 + 0.7 * d / off);
            } else {
              const ow = Math.max(0, Math.sin(2 * Math.PI * (u * 0.6 - db * 0.12)));
              I += 0.18 * Math.exp(-u / 1.5) * ow * ow * innerDecay;
            }
            const n = hsh(x, y, tick);
            I = Math.min(1, I) * (0.6 + 0.4 * n);
            if (I < 0.6 && n < 0.12) continue;
            const c = ramp.charCodeAt(Math.min(9, Math.floor(I * 10)));
            if (I >= 0.5) foamC[i] = c;
            else if (I >= 0.22) midC[i] = c;
            else if (I >= 0.07) dimC[i] = c;
          }
        }
      }

      // ASCII wall: perpendicular to the travel direction, chasing the robot (wallSpeed x its speed)
      const st = Math.floor(t * 18);
      let clip = 'none';
      const nearC = new Uint8Array(N), farC = new Uint8Array(N);
      if (t > ts) {
        const ev = e0 + vs * (t - ts);
        const yb = [];
        for (let x = 0; x < cols; x++) {
          const X = (x + 0.5) * CW;
          yb.push(Math.round((Cy + (ev - (X - Cx) * dx) / dy) / LH + (hsh(x, 7, 3) - 0.5) * 2 * JIT + (hsh(x, st >> 1, 5) - 0.5) * 1.2));
        }
        const big = 99999;
        const pts = [(-big) + 'px ' + big + 'px', (-big) + 'px ' + (yb[0] * LH) + 'px'];
        for (let x = 0; x < cols; x++) pts.push((x * CW) + 'px ' + (yb[x] * LH) + 'px', ((x + 1) * CW) + 'px ' + (yb[x] * LH) + 'px');
        pts.push(big + 'px ' + (yb[cols - 1] * LH) + 'px', big + 'px ' + big + 'px');
        clip = 'polygon(' + pts.join(', ') + ')';
        const dense = '@#%&$';
        const ramp2 = '.:-~=+*#%@';
        for (let x = 0; x < cols; x++) {
          const lo = Math.max(0, yb[x] - W1r), hi = Math.min(rows - 1, yb[x] + W2r);
          for (let y = lo; y <= hi; y++) {
            const i = y * cols + x;
            const sd = y - yb[x];
            const h = hsh(x, y, st), h2 = hsh(x, y, st + 911);
            if (sd >= 0) {
              if (h < 1 - 0.9 * sd / W2r) nearC[i] = dense.charCodeAt(Math.floor(h2 * 5));
            } else {
              const f = 1 + sd / W1r;
              if (h < 0.95 * Math.pow(f, 1.6)) {
                const c = ramp2.charCodeAt(Math.min(9, Math.floor(f * 10 * (0.7 + 0.3 * h2))));
                if (f > 0.45) nearC[i] = c; else farC[i] = c;
              }
            }
          }
        }
      }

      if (t >= tEnd) return false;
      water.style.clipPath = clip;           // the frozen screen and the water above it shrink together
      ghost.style.clipPath = clip;
      put({
        robot: robotLines.join('\n'),
        foam: toText(foamC), mid: toText(midC), dim: toText(dimC),
        near: toText(nearC), far: toText(farC), fish: toText(fishC)
      });
      return true;
    }
    requestAnimationFrame(frame);
  });

  tx.section?.hold?.(false);              // KM-RoBoTa's snake starts its crossing now
}
