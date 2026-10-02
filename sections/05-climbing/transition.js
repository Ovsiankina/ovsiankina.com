// Into the climbing scene: two ragged dithered edges travel up the screen. Above the first one the previous
// screen (t.ghost) still shows, between them a blue band with an ASCII fish swimming across, below them cream paper:
// the blank scene the wipe uncovers.
import config from './config.js';
import { bay, clamp01, hsh, hex } from './pixel.js';

const PIX = config.pix;
const BLUE = hex(config.blue), PAPER = hex(config.paper);

function canvas(layer, pixelated) {
  const c = document.createElement('canvas');
  c.style.cssText = `position:absolute;left:0;top:0;pointer-events:none${pixelated ? ';image-rendering:pixelated' : ''}`;
  layer.appendChild(c);
  return c;
}

const frames = step => new Promise(res => {
  let t0 = 0;
  const f = now => { if (!t0) t0 = now; if (step(now - t0, now)) res(); else requestAnimationFrame(f); };
  requestAnimationFrame(f);
});

export async function play(t) {
  const { ghost, layer, section } = t;
  section?.hold?.();

  if (t.reduced) {
    await frames(e => { ghost.style.opacity = String(1 - clamp01(e / config.reducedFade)); return e >= config.reducedFade; });
    ghost.style.visibility = 'hidden';
    return;
  }

  const fx = canvas(layer, true), fish = canvas(layer, false);
  const fxCtx = fx.getContext('2d'), fishCtx = fish.getContext('2d');
  let W = 0, H = 0, gw = 0, gh = 0;
  function layout() {
    const w = layer.clientWidth || innerWidth, h = layer.clientHeight || innerHeight;
    if (w === W && h === H) return;
    W = w; H = h; gw = Math.ceil(W / PIX); gh = Math.ceil(H / PIX);
    fx.width = gw; fx.height = gh; fx.style.width = gw * PIX + 'px'; fx.style.height = gh * PIX + 'px';
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    fish.width = Math.round(W * dpr); fish.height = Math.round(H * dpr); fish.style.width = W + 'px'; fish.style.height = H + 'px';
    fishCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---------------- the wipe: two dithered edges, a blue band with an ASCII fish between them ----------------
  function renderWipe(k, now) {
    const B = config.edge, band = Math.max(10, Math.round(gh * config.band));
    const travel = gh + band + 2 * B;
    const e1 = gh + B - travel * k, e2 = e1 + band;
    const flick = Math.floor(now / config.flicker);
    const img = fxCtx.createImageData(gw, gh), d = img.data;
    const top1 = new Float32Array(gw), top2 = new Float32Array(gw);
    for (let x = 0; x < gw; x++) {
      const blk = x >> 2;                                           // ragged in 4-pixel steps
      top1[x] = Math.round(e1 + (hsh(blk, 3) - 0.5) * 5 + (hsh(blk, flick) - 0.5) * 2);
      top2[x] = Math.round(e2 + (hsh(blk, 11) - 0.5) * 5 + (hsh(blk, flick + 91) - 0.5) * 2);
    }
    for (let x = 0; x < gw; x++) {
      const y0 = Math.max(0, Math.floor(top1[x] - B));
      for (let y = y0; y < gh; y++) {
        const th = bay(x, y), i = (y * gw + x) * 4;
        if ((y - top2[x]) / B + 0.5 > th) { d[i] = PAPER[0]; d[i + 1] = PAPER[1]; d[i + 2] = PAPER[2]; d[i + 3] = 255; }
        else if ((y - top1[x]) / B + 0.5 > th) { d[i] = BLUE[0]; d[i + 1] = BLUE[1]; d[i + 2] = BLUE[2]; d[i + 3] = 255; }
      }
    }
    fxCtx.putImageData(img, 0, 0);
    renderFish(k, now, (e1 + B * 0.7) * PIX, (e2 - B * 0.7) * PIX);
  }

  // the fish is a darkness field rasterized to characters, clipped to the solid part of the band
  const RAMP = ' .:-=+*#%@';
  function fishField(u, v, tt) {
    const wig = Math.sin(tt * 9) * 0.18;
    let I = 0;
    const e = Math.hypot(u / 1.55, v / 0.92);
    if (e < 1) {
      I = e > 0.86 ? 1 : 0.22 + 0.5 * (Math.sin(u * 9 + v * 6) * Math.sin(u * 9 - v * 6) > 0.25 ? 1 : 0) * (1 - e);
      if (Math.abs(u - 0.62 - 0.12 * v * v) < 0.06 && Math.abs(v) < 0.62) I = 0.95;             // gill
      const ex = u - 0.98, ey = v + 0.28;
      if (Math.hypot(ex, ey) < 0.17) I = Math.hypot(ex, ey) < 0.08 ? 1 : 0;                 // eye
      if (u > 1.35 && Math.abs(v - 0.12) < 0.05) I = 0;                                       // mouth
    }
    const tu = -u - 1.35;                                                                     // tail
    if (tu > 0 && tu < 0.95) {
      const tv = v - wig * tu;
      if (Math.abs(tv) < 0.15 + tu * 0.85 && Math.abs(tv) > tu * 0.85 - 0.55) I = Math.max(I, Math.abs(Math.abs(tv) - (0.15 + tu * 0.85)) < 0.12 ? 1 : 0.55);
    }
    if (v < -0.8 && v > -1.35 && u > -0.7 && u < 0.4) {                                        // dorsal fin
      const fv = (-0.8 - v) / 0.55;
      if (u > -0.7 + fv * 0.8 && u < 0.4 - fv * 0.2) I = Math.max(I, 0.6);
    }
    return I;
  }
  function renderFish(k, now, yTop, yBot) {
    fishCtx.clearRect(0, 0, W, H);
    const h = yBot - yTop;
    if (h < 12) return;
    const fs = Math.max(4, Math.min(8, Math.round(h / 12)));
    const cw = fs * 0.6, chh = fs;
    fishCtx.font = `500 ${fs}px 'JetBrains Mono', ui-monospace, monospace`;
    fishCtx.fillStyle = '#FFFFFF';
    fishCtx.textBaseline = 'top';
    const S = h * 0.38;
    const cx = -0.15 * W + 1.3 * W * k, cy = (yTop + yBot) / 2;
    const tt = now / 1000;
    const c0 = Math.floor((cx - 3 * S) / cw), c1 = Math.ceil((cx + 2 * S) / cw);
    const r0 = Math.ceil(yTop / chh), r1 = Math.floor(yBot / chh) - 1;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      let acc = 0;
      for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++)
        acc += fishField(((c + 0.25 + sx * 0.5) * cw - cx) / S, ((r + 0.25 + sy * 0.5) * chh - cy) / S, tt);
      const g = acc / 4;
      if (g < 0.06) continue;
      const gi = Math.min(9, Math.max(1, Math.round(g * 9 + (hsh(c, r) - 0.5) * 0.8)));
      fishCtx.fillText(RAMP[gi], c * cw, r * chh);
    }
  }

  // the fish glyphs need the font; never hold the wipe back more than a moment for it
  if (document.fonts) await Promise.race([document.fonts.load("500 8px 'JetBrains Mono'").catch(() => {}), new Promise(r => setTimeout(r, 300))]);

  await frames((el, now) => {
    layout();
    const k = clamp01(el / config.T.wipe);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    renderWipe(e, now);
    return k >= 1;
  });
  ghost.style.visibility = 'hidden';                                // all cream now: the blank scene is underneath
}
