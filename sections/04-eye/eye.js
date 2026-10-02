// The eye: one huge almond eye in ASCII blocks, drawn into a <pre> on the flood white.
import config from './config.js';

const { BT, BB, TILT, R, irisSets: IRIS_SETS } = config.eye;
const T = config.T;
const GLYPHS = [' ', '░', '▒', '▓', '█'];
const clamp01 = x => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeIn = x => x * x * x, easeOut = x => 1 - (1 - x) ** 3;

const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

// bloodshot veins, rasterized once in eye space: x = lid position (-1..1), y = depth between the lids (0..1)
const VW = 360, VH = 140, veins = new Float32Array(VW * VH);
(() => {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const stamp = (x, y, w) => {
    const cx = (x + 1) / 2 * VW, cy = y * VH, rad = Math.max(0.6, w * VW / 2);
    for (let j = Math.floor(cy - rad * 3); j <= cy + rad * 3; j++) for (let i = Math.floor(cx - rad); i <= cx + rad; i++) {
      if (i < 0 || j < 0 || i >= VW || j >= VH) continue;
      const d = Math.hypot(i - cx, (j - cy) / 3);
      if (d < rad) veins[j * VW + i] = Math.max(veins[j * VW + i], 1 - d / rad * 0.5);
    }
  };
  const walk = (x, y, ang, w, depth) => {
    for (let s = 0; s < 70 && w > 0.002; s++) {
      stamp(x, y, w);
      ang += (rnd() - 0.5) * 0.9;
      x += Math.cos(ang) * 0.012; y += Math.sin(ang) * 0.03;
      if (x < -1 || x > 1 || y < 0 || y > 1) return;
      w *= 0.975;
      if (depth < 3 && rnd() < 0.07) walk(x, y, ang + (rnd() < 0.5 ? 0.9 : -0.9), w * 0.7, depth + 1);
    }
  };
  for (let k = 0; k < 16; k++) {
    const side = k % 2 ? 1 : -1;
    walk(side * (0.95 - rnd() * 0.1), 0.15 + rnd() * 0.7, side > 0 ? Math.PI + (rnd() - 0.5) : (rnd() - 0.5), 0.006 + rnd() * 0.006, 0);
  }
  for (let k = 0; k < 10; k++) {
    const top = k % 2 === 0;
    walk((rnd() - 0.5) * 1.6, top ? 0.02 : 0.98, top ? Math.PI / 2 + (rnd() - 0.5) : -Math.PI / 2 + (rnd() - 0.5), 0.004 + rnd() * 0.004, 1);
  }
})();
const veinAt = (x, y) => {
  const i = Math.round((x + 1) / 2 * (VW - 1)), j = Math.round(y * (VH - 1));
  return i < 0 || j < 0 || i >= VW || j >= VH ? 0 : veins[j * VW + i];
};

const lidTop = (lx, o) => { const s = 1 - lx * lx; return s <= 0 ? 0 : -BT * o * Math.pow(s, 0.85) * (1 - 0.18 * lx); };
const lidBot = (lx, o) => { const s = 1 - lx * lx; return s <= 0 ? 0 : BB * o * Math.pow(s, 1.15) * (1 + 0.15 * lx); };

// darkness 0..1 at normalized point (u,v); screen y points down
function eyeField(u, v, st, IRISES) {
  const lx = u, ly = v + u * TILT;          // outer (right) corner raised
  const o = st.open;
  const s = Math.max(0, 1 - lx * lx);
  const ap = st.appear;                      // the lid line grows out from the centre as the eye appears
  const taper = Math.pow(s, 0.35) * Math.pow(Math.max(0, 1 - (lx / Math.max(ap, 1e-3)) ** 2), 0.35);
  let I = 0;

  if (Math.abs(lx) < ap) {
    const top = lidTop(lx, o), bot = lidBot(lx, o);
    const tU = (0.05 + 0.03 * (1 - o)) * taper, tL = (0.028 + 0.02 * (1 - o)) * taper;

    if (Math.abs(ly - top) < tU) return 1;
    if (Math.abs(ly - bot) < tL) return 0.92;

    if (ly > top && ly < bot) {
      // one main iris plus smaller satellite irises, all the same flat tone, each with a small cat pupil
      const shadeLid = Math.max(Math.exp(-(ly - top) / 0.06) * 0.95, Math.exp(-(bot - ly) / 0.04) * 0.5);
      let r = 1e9;
      for (const ir of IRISES) {
        const cx = st.gx * ir.follow + ir.x, cy = st.gy * ir.follow + ir.y;
        const dx = u - cx, dy = v - cy, rr = Math.hypot(dx, dy);
        if (ir.bare) {
          if (rr >= ir.r) continue;
          const breathe = 0.94 + 0.06 * Math.min(1.5, st.slit);
          const pw = 0.004 + 0.012 * st.slit, ph = 0.05;
          if (Math.abs(dy) < ph && Math.abs(dx) < pw * Math.pow(1 - (dy / ph) ** 2, 0.7)) return 1;
          for (const f of ir.bare) if (Math.abs(rr - f * breathe) < 0.011) return Math.max(1, shadeLid);
          continue;                                            // between the circles: plain sclera
        }
        r = Math.min(r, rr - ir.r + R);
        if (rr >= ir.r) continue;
        const k = ir.r / R;                                    // scale pupil and highlight to the iris
        const small = ir.rings ? 0.6 : 1;
        const pw = (0.006 + 0.022 * st.slit) * k * small, ph = 0.11 * k * small;
        if (Math.abs(dy) < ph && Math.abs(dx) < pw * Math.pow(1 - (dy / ph) ** 2, 0.7)) I = 1;
        else if (Math.hypot(dx + 0.07 * k, dy + 0.075 * k) < 0.022 * k) I = 0;
        else if (rr > ir.r - 0.022) I = 1;
        else {
          I = 0.5;
          if (ir.rings) {
            const breathe = 0.94 + 0.06 * Math.min(1.5, st.slit);     // rings tighten with the pupil
            for (const f of ir.rings) if (Math.abs(rr - f * ir.r * breathe) < 0.011) { I = 1; break; }
          }
        }
        return Math.min(1, Math.max(I, shadeLid));
      }
      // sclera: shading under the lids, darker toward the corners, veins, a halo around the iris
      const depth = (ly - top) / Math.max(1e-4, bot - top);
      I = Math.max(
        Math.exp(-(ly - top) / 0.07) * 0.8,
        Math.exp(-(bot - ly) / 0.045) * 0.4,
        Math.pow(Math.abs(lx), 5) * 0.7,
        veinAt(lx, depth) * 0.85,
        r < R + 0.035 ? 0.3 : 0
      );
      return I;
    }

    if (ly < top) {                            // upper lid flesh: folds and clumped lashes
      const d = top - ly;
      for (let k = 1; k <= 3; k++) {
        const off = (0.06 + 0.075 * k) * Math.pow(s, 0.55) * (1 + 0.25 * (vnoise(lx * 4 + k * 7, 1) - 0.5));
        if (Math.abs(d - off) < (0.016 - 0.003 * k) * taper) I = Math.max(I, 1.05 - 0.2 * k);
      }
      if (Math.abs(lx) < 0.9) {
        const len = 0.03 + 0.1 * vnoise(lx * 6, 3.3) * s;
        const ph = ((lx * 13 + d * 7 * (0.6 + lx)) % 1 + 1) % 1;
        if (d < len && ph < 0.14 + 0.2 * (1 - d / len)) I = 1;
      }
    } else {                                   // lower lid flesh: bags
      const d = ly - bot;
      for (let k = 1; k <= 2; k++) {
        const off = (0.05 + 0.07 * k) * Math.pow(s, 0.7);
        if (Math.abs(d - off) < 0.012 * taper) I = Math.max(I, 0.85 - 0.2 * k);
      }
    }
  }

  // surrounding flesh: wrinkles and grit fading out from the eye
  const e = Math.hypot(lx / 1.3, ly / 0.8);
  if (e < 1.15) {
    const fade = smooth(1.1, 0.6, e) * ap * ap;
    const w = vnoise(lx * 5, ly * 14 + 2 * vnoise(lx * 2, ly * 2));
    if (Math.abs((w * 6) % 1 - 0.5) < 0.05) I = Math.max(I, 0.55 * fade);
    if (hash(u * 211.3, v * 173.9) < 0.14 * fade) I = Math.max(I, 0.3);
  }
  return I;
}

// ms since white is full; returns the eye state, or 'collapse' when done
export function eyeTimeline(ms) {
  let t = ms - T.whiteHold;
  const st = { open: 0, gx: 0, gy: 0.02, slit: 1, jitter: 0, appear: 1 - (1 - clamp01((ms - 80) / 650)) ** 2 };
  if (t < 0) return st;
  if (t < T.crack) { st.open = 0.16 * easeOut(t / T.crack); return st; }
  t -= T.crack;
  if (t < T.crackHold) {                                             // peeking through a slit, twitching
    st.open = 0.16 + 0.03 * Math.sin(t * 0.08) + (t > 230 && t < 270 ? -0.1 : 0);
    st.gx = -0.3; st.jitter = 0.006; return st;
  }
  t -= T.crackHold;
  if (t < T.open) { st.open = 0.16 + 0.94 * easeOut(t / T.open); st.gx = -0.3 * (1 - t / T.open); return st; }
  t -= T.open;
  if (t < T.settle) { st.open = 1.1 - 0.1 * easeOut(t / T.settle); return st; }
  t -= T.settle;
  if (t < T.stare) {
    st.open = 1; st.jitter = 0.004;
    st.gx = t < 240 ? 0.26 : t < 520 ? -0.22 : t < 640 ? 0.08 : 0;  // darts around, then locks onto the viewer
    st.gy = t < 240 ? -0.04 : t < 520 ? 0.05 : 0.02;
    st.slit = t < 1100 ? 1 - 0.8 * smooth(600, 1050, t) : 0.2 + 2.3 * smooth(1100, 1180, t);   // narrows, then blows wide
    if (t > 1100) st.open = 1 + 0.08 * smooth(1100, 1180, t);
    return st;
  }
  t -= T.stare;
  if (t < T.snap) { st.open = 1.08 * (1 - easeIn(t / T.snap)); st.slit = 2.5; return st; }
  t -= T.snap;
  if (t < T.closedHold) return st;
  return 'collapse';
}

// variant: 'random' (one in three each run) or a key of irisSets
export function createEye(pre, variant) {
  const names = Object.keys(IRIS_SETS);
  const IRISES = IRIS_SETS[IRIS_SETS[variant] ? variant : names[Math.floor(Math.random() * names.length)]];
  let grid = null;

  function layout(W, H) {
    const { min, max, cols } = config.eye.glyph, [sw, sh] = config.eye.size;
    const fs = Math.max(min, Math.min(max, W / cols / 0.6));
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `500 ${fs}px 'JetBrains Mono', monospace`;
    const cw = ctx.measureText('█'.repeat(20)).width / 20 || fs * 0.6;
    pre.style.fontSize = fs + 'px';
    grid = { cols: Math.ceil(W / cw), rows: Math.ceil(H / fs), cw, ch: fs, W, H, S: Math.min(W * sw, H * sh) };
  }

  function render(st) {
    const { cols, rows, cw, ch, W, H, S } = grid;
    const jx = st.jitter ? (Math.random() - 0.5) * st.jitter : 0, jy = st.jitter ? (Math.random() - 0.5) * st.jitter : 0;
    let out = '';
    for (let y = 0; y < rows; y++) {
      let line = '';
      for (let x = 0; x < cols; x++) {
        let acc = 0;
        for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
          acc += eyeField(((x + 0.25 + sx * 0.5) * cw - W / 2) / S + jx, ((y + 0.25 + sy * 0.5) * ch - H / 2) / S + jy, st, IRISES);
        }
        const g = acc / 4;
        line += g < 0.04 ? ' ' : GLYPHS[Math.min(4, Math.max(1, Math.round(g * 4 + (hash(x, y) - 0.5) * 0.6)))];
      }
      out += line + '\n';
    }
    pre.textContent = out;
  }

  return { layout, render, variant: Object.keys(IRIS_SETS).find(k => IRIS_SETS[k] === IRISES) };
}
