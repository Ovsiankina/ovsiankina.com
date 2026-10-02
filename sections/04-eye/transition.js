// Into the swirl page, through the eye. Knows nothing of the page it starts from:
// RISE   (via 'jump' only) the horizon glow rises over the frozen screen (transparent where it is still dark).
//        Walked into (via 'scroll'), the frozen screen already IS the fully grown glow: the lead-in, held for its
//        dwell by the core. The same glow, opaque over the lead-in purple, picks up from there with the flood.
// FLOOD  it overexposes through its dithered steps to pure white while the whole screen shakes harder and harder
// EYE    on the white, one monstrous ASCII eye appears, cracks open, stares, snaps shut
// COLLAPSE  the white shuts toward the eye line with ragged pixel edges and a Bayer band, the swirl page is under it
import config from './config.js';
import { getGlow, rgb01 } from './glow.js';
import { createEye, eyeTimeline } from './eye.js';

const { PIX, T } = config;
const clamp01 = x => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeIn = x => x * x * x;
const wait = ms => new Promise(r => setTimeout(r, ms));

// the white shuts toward the eye line; clip and dither share one pixel grid (PIX, like the glow) so they stay in sync
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function renderSeam(white, seam, seamCtx, k, now) {
  const { B, strength, ink: SEAM_INK } = config.seam;
  const w = Math.ceil(white.clientWidth / PIX), h = Math.ceil(white.clientHeight / PIX);
  if (seam.width !== w || seam.height !== h) {
    seam.width = w; seam.height = h;
    seam.style.width = w * PIX + 'px'; seam.style.height = h * PIX + 'px';   // exact PIX scale so it lines up with the clip
  }
  const hsh = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000 / 1000;
  const flick = Math.floor(now / 60);
  const mid = h / 2, half = (1 - easeIn(k)) * (mid + 4);
  const top = new Int32Array(w), bot = new Int32Array(w);
  for (let x = 0; x < w; x++) {
    const blk = x >> 2;                                    // ragged in 4-pixel steps
    top[x] = Math.round(mid - half + (hsh(blk, 3) - 0.5) * 5 + (hsh(blk, flick) - 0.5) * 2);
    bot[x] = Math.max(top[x], Math.round(mid + half + (hsh(blk, 9) - 0.5) * 5 + (hsh(blk, flick + 77) - 0.5) * 2));
  }
  const pts = [];
  for (let x = 0; x < w; x++) pts.push(`${x * PIX}px ${top[x] * PIX}px`, `${(x + 1) * PIX}px ${top[x] * PIX}px`);
  for (let x = w - 1; x >= 0; x--) pts.push(`${(x + 1) * PIX}px ${bot[x] * PIX}px`, `${x * PIX}px ${bot[x] * PIX}px`);
  white.style.clipPath = `polygon(${pts.join(',')})`;

  const img = seamCtx.createImageData(w, h), d = img.data;
  for (let x = 0; x < w; x++) {
    for (let y = Math.max(0, top[x]); y < Math.min(h, bot[x]); y++) {
      const sd = Math.min(y - top[x], bot[x] - 1 - y);   // pixels inward from the nearest edge
      if (sd >= B) continue;
      const D = strength * Math.pow(1 - sd / B, 1.6);
      const lvl = Math.min(3, Math.floor(D * 3 + (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16));
      if (!lvl) continue;
      const c = SEAM_INK[lvl], i = (y * w + x) * 4;
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
  }
  seamCtx.putImageData(img, 0, 0);
}

// resolves when the jolt is over, so a freeze taken right after never bakes its offset into the copy
function shakeRoot(root) {
  root.classList.remove('shake'); void root.offsetWidth; root.classList.add('shake');   // section.js drops it on animationend
  return new Promise(res => {
    const done = () => { clearTimeout(timer); root.removeEventListener('animationend', done); res(); };
    const timer = setTimeout(done, 600);
    root.addEventListener('animationend', done);
  });
}

export async function play(t) {
  const { ghost, layer, root, reduced } = t;
  const walked = t.via === 'scroll';
  const base = walked ? rgb01(config.leadIn.bg) : undefined;   // opaque, as in the lead-in
  const white = document.createElement('div');
  white.style.cssText = `position:absolute;inset:0;background:${config.colors.paper};display:flex;align-items:center;justify-content:center;overflow:hidden;`;
  const pre = document.createElement('pre');
  pre.style.cssText = `margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;color:${config.colors.ink};white-space:pre;letter-spacing:0;line-height:1;font-weight:500;`;
  const seam = document.createElement('canvas');
  seam.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;image-rendering:pixelated;';
  const seamCtx = seam.getContext('2d');
  white.append(pre, seam);

  if (reduced) {
    const { fadeIn, fadeOut } = config.reduced;
    white.style.opacity = '0';
    white.style.transition = `opacity ${fadeIn}ms`;
    layer.appendChild(white);
    void white.offsetWidth;
    white.style.opacity = '1';
    await wait(fadeIn);
    ghost.style.visibility = 'hidden';
    white.style.transition = `opacity ${fadeOut}ms`;
    white.style.opacity = '0';
    await wait(fadeOut);
    return;
  }

  white.hidden = true;
  let glow = null;
  try { glow = getGlow(); } catch (e) { console.error('[eye transition] glow', e); }   // no glow: the flood falls back to a plain fade
  if (glow) {
    layer.appendChild(glow.canvas);
    glow.draw(performance.now() / 1000, walked ? 1 : 0, walked ? 1 : 0, 0, base);   // wipe the previous run's last frame before it shows
  }
  layer.appendChild(white);
  const eye = createEye(pre, config.variant);
  let fontOk = false;
  (document.fonts ? document.fonts.load("500 14px 'JetBrains Mono'").catch(() => {}) : Promise.resolve()).then(() => { fontOk = true; });
  const size = () => [layer.clientWidth || innerWidth, layer.clientHeight || innerHeight];
  const shaken = walked && glow ? [] : [...ghost.children];   // walked in: the opaque glow covers the ghost, it alone shakes (as in the original)
  const shake = tf => {
    if (glow) glow.canvas.style.transform = tf;
    for (const c of shaken) c.style.transform = tf;      // the ghost's own background stays put, so no gap opens at the edges
  };

  let state = walked ? 'flood' : 'rise', start = performance.now(), raf = 0;
  const onResize = () => { if (state === 'eyes') eye.layout(...size()); };
  addEventListener('resize', onResize);

  await new Promise(resolve => {
    // returns true once the white has shut
    function frame(now) {
      const time = now / 1000;
      if (state === 'rise') {
        const ms = now - start, p = clamp01(ms / config.rise);
        const e = smooth(0.25, 0.95, p);
        const flick = p > 0.97 ? 0.93 + 0.07 * Math.sin(time * 23) * Math.sin(time * 7.3) : 1;
        glow?.draw(time, e * flick, smooth(0.35, 1, p), 0);
        if (ms >= config.rise + config.riseHold) { state = 'flood'; start = now; }
      } else if (state === 'flood') {
        const k = clamp01((now - start) / T.flood);
        const F = easeIn(k);
        glow?.draw(time, 1, 1, F, base);
        if (!glow || glow.lost()) { white.hidden = false; white.style.opacity = F; }   // no WebGL (or lost mid-run): plain fade to white
        const amp = config.shake * k * k;
        shake(`translate(${(Math.random() - 0.5) * amp}px, ${(Math.random() - 0.5) * amp}px)`);
        if (k >= 1 && fontOk) {
          shake('');
          ghost.style.visibility = 'hidden';
          if (glow) glow.canvas.style.visibility = 'hidden';
          eye.layout(...size());
          white.hidden = false; white.style.opacity = '';
          pre.textContent = '';
          state = 'eyes'; start = now;
        }
      } else if (state === 'eyes') {
        const st = eyeTimeline(now - start);
        if (st === 'collapse') { state = 'collapse'; start = now; }
        else eye.render(st);
      } else if (state === 'collapse') {
        const k = clamp01((now - start) / T.collapse);
        renderSeam(white, seam, seamCtx, k, now);
        if (k >= 1) {
          white.hidden = true;
          return true;
        }
      }
      return false;
    }
    const finish = () => { cancelAnimationFrame(raf); removeEventListener('resize', onResize); resolve(); };
    // every frame goes through the guard, so a throw can never leave the core waiting forever
    const tick = now => {
      let done = true;
      try { done = frame(now); } catch (e) { console.error('[eye transition]', e); }
      if (done) finish(); else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
  if (glow) { glow.canvas.remove(); glow.canvas.style.visibility = ''; glow.canvas.style.transform = ''; }
  await shakeRoot(root);
}
