// Shared by KM-RoBoTa and AI Summit: an ASCII swimmer crossing the sub-section, with a dithered fade toward the text.
const RAMP = ' .:-=+*#%@';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const frozen  = new URLSearchParams(location.search).get('t');   // debug: ?t=3 freezes both swimmers at 3 s
const phone   = matchMedia('(max-width: 760px)');                 // the same breakpoint as style.css
// the grid's font, but never wait long for it: a stalled font CDN must not leave the blocks black.
// When it lands later, fontLate(fn) runs fn so the grid is measured again with it.
export const fontIn = (root, ms = 300) => Promise.race([
  document.fonts.load(`12px ${getComputedStyle(root).getPropertyValue('--mono')}`).catch(() => {}),
  new Promise(r => setTimeout(r, ms)),
]);
export const fontLate = fn => document.fonts.addEventListener('loadingdone', e => {
  if (e.fontfaces.some(f => f.family.includes('IBM Plex Mono'))) fn();
});

const hash = (x, y) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const vnoise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

// dithered fade to black (4x4 Bayer, binary: black or clear). uFlip mirrors it for text on the right.
function fadeLayer(canvas, pixelSize, seed) {
  // preserveDrawingBuffer: the core's freeze copies this canvas into its frozen screen
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
  // no WebGL (or a lost context): a plain CSS gradient keeps the copy on black
  const cssFade = o => {
    const dir = o.axis ? 'to bottom' : (o.flip ? 'to left' : 'to right');
    canvas.style.background = `linear-gradient(${dir}, #000 ${o.solid * 100}%, transparent ${o.end * 100}%)`;
  };
  if (!gl) return { resize: cssFade, draw() {} };
  const vert = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;
  const frag = `
    precision highp float;
    uniform vec2  uRes;
    uniform float uTime, uSolid, uEnd, uAxis, uFlip, uSeed;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
                 mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
    }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
    float bayer4(vec2 p){
      vec2 q = mod(floor(p), 4.0);
      int i = int(q.x + q.y * 4.0);
      float m[16];
      m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;
      m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
      for (int k = 0; k < 16; k++) if (k == i) return (m[k] + 0.5) / 16.0;
      return 0.5;
    }
    void main(){
      vec2 uv = gl_FragCoord.xy / uRes;
      float h      = mix(uv.x, 1.0 - uv.x, uFlip);
      float along  = mix(h, 1.0 - uv.y, uAxis);           // 0 at the text side
      float across = mix(uv.y, uv.x, uAxis);
      float t = uTime;
      // slow ragged edge + fine streaks, calmer than horizon-glow
      float edge   = (fbm(vec2(across * 4.0 + uSeed, t * 0.07)) - 0.5) * 0.10;
      float streak = (noise(vec2(across * uRes.y * 0.09, t * 0.25 + uSeed)) - 0.5) * 0.025;
      float breath = sin(t * 0.33 + uSeed) * 0.012;
      float f = 1.0 - smoothstep(uSolid, uEnd, along + edge + streak + breath);
      gl_FragColor = vec4(0.0, 0.0, 0.0, step(bayer4(gl_FragCoord.xy), f));
    }`;
  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s);
    return s;
  };
  let u = null, last = null;
  function init() {
    if (gl.isContextLost()) return;          // already gone at mount: wait for webglcontextrestored
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog); gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = n => gl.getUniformLocation(prog, n);
    u = { res: U('uRes'), time: U('uTime'), solid: U('uSolid'), end: U('uEnd'), axis: U('uAxis'), flip: U('uFlip') };
    gl.uniform1f(U('uSeed'), seed);
  }
  init();
  // a GPU reset (other heavy sections, tab in background) drops the context: rebuild it when the browser gives it back
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); u = null; if (last) cssFade(last); });
  canvas.addEventListener('webglcontextrestored', () => { init(); canvas.style.background = ''; if (last) api.resize(last); });
  const api = {
    resize(o) {
      last = o;
      canvas.width  = Math.max(1, Math.ceil(o.W / pixelSize));
      canvas.height = Math.max(1, Math.ceil(o.H / pixelSize));
      if (!u) { cssFade(o); return; }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform1f(u.solid, o.solid); gl.uniform1f(u.end, o.end);
      gl.uniform1f(u.axis, o.axis); gl.uniform1f(u.flip, o.flip);
    },
    draw(t) { if (!u) return; gl.uniform1f(u.time, t); gl.drawArrays(gl.TRIANGLES, 0, 3); },
  };
  return api;
}

const asset = p => new URL(p, import.meta.url).href;

// cfg: one swimmer from config.js (sprite, dir, seed, fit, bob, ripple). opts: config.swimmer
export function swimmer(root, cfg, opts) {
  const CONFIG = opts;
  const cv = root.querySelector('canvas.bg'), copy = root.querySelector('.copy');
  const side = root.dataset.text;
  const ctx = cv.getContext('2d', { alpha: false });
  const off = document.createElement('canvas');
  const octx = off.getContext('2d', { willReadFrequently: true });
  const S = cfg.sprite, img = new Image(); img.src = asset(S.src);
  const fade = fadeLayer(root.querySelector('canvas.fade'), CONFIG.pixelSize, cfg.seed || 0);
  let W, H, dpr, cwD, chD, cw, ch, cols, rows, atlas, trail, rip, mobile, k, cy;
  const E = cfg.ripple && { ...cfg.ripple, tips: null }; let ripples = []; const lastEmit = [];
  const tips = E ? fetch(asset(cfg.ripple.tips)).then(r => r.json()).then(a => { E.tips = a; }) : null;

  // glyph atlas: 0..8 swimmer ramp (dim -> white), 9..10 background dots, 11..12 wake, 13..15 ripples
  function buildAtlas(fontPx) {
    const glyphs = [];
    for (let i = 1; i < RAMP.length; i++) {
      const t = (i - 1) / (RAMP.length - 2), g = Math.round(96 + Math.pow(t, 0.8) * 146);
      glyphs.push([RAMP[i], `rgb(${g},${g},${g})`]);
    }
    glyphs.push(...CONFIG.glyphs.dots, ...CONFIG.glyphs.wake);
    glyphs.push(...CONFIG.glyphs.ripple);
    const a = document.createElement('canvas');
    a.width = glyphs.length * cwD; a.height = chD;
    const g = a.getContext('2d');
    g.font = `${fontPx * dpr}px ${getComputedStyle(root).getPropertyValue('--mono')}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    glyphs.forEach(([c, col], i) => { g.fillStyle = col; g.fillText(c, i * cwD + cwD / 2, chD / 2); });
    return a;
  }

  function resize() {
    const r = root.getBoundingClientRect();
    W = r.width; H = r.height;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    mobile = phone.matches;
    const fontPx = mobile ? CONFIG.fontPxMobile : CONFIG.fontPx;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.font = `${fontPx * dpr}px ${getComputedStyle(root).getPropertyValue('--mono')}`;
    cwD = Math.max(1, Math.round(ctx.measureText('M').width));
    chD = Math.round(fontPx * CONFIG.lineH * dpr);
    cw = cwD / dpr; ch = chD / dpr;
    cols = Math.ceil(cv.width / cwD); rows = Math.ceil(cv.height / chD);
    off.width = cols; off.height = rows;
    trail = new Float32Array(cols * rows); rip = new Float32Array(cols * rows); ripples = []; lastEmit.length = 0;
    atlas = buildAtlas(fontPx);

    // the fade band follows the text block so the copy always sits on solid black
    const c = copy.getBoundingClientRect();
    let solid, end;
    if (!mobile) {
      const reach = side === 'left' ? c.right - r.left : r.right - c.left;
      solid = Math.min(0.55, Math.max(0.3, (reach + 40) / W));
      end = solid + CONFIG.fadeLen;
    } else {
      solid = Math.min(0.7, (c.bottom - r.top + 24) / H);
      end = Math.min(0.92, solid + CONFIG.fadeLenMobile);
    }
    ({ k, cy } = cfg.fit({ W, H, solid, end, mobile }));
    fade.resize({ W, H, solid, end, axis: mobile ? 1 : 0, flip: side === 'right' ? 1 : 0 });
  }

  function drawAscii(t) {
    const v = S.speed * k, span = W + S.fw * k, p = (t % (span / v)) * v;
    const x = cfg.dir < 0 ? W - p : p - S.fw * k;               // sprite left edge, CSS px
    const y = cy + (cfg.bob ? Math.sin(t * 2 * Math.PI / cfg.bob.period) * cfg.bob.amp * H : 0);
    const fi = Math.floor(t * S.fps) % S.n;
    const sx = (fi % S.cols) * S.fw, sy = Math.floor(fi / S.cols) * S.fh;

    // downsample the frame straight into the character grid (1 px = 1 cell)
    octx.clearRect(0, 0, cols, rows);
    octx.imageSmoothingEnabled = true; octx.imageSmoothingQuality = 'high';
    octx.drawImage(img, sx, sy, S.fw, S.fh, x / cw, (y - S.fh * k / 2) / ch, S.fw * k / cw, S.fh * k / ch);
    const px = octx.getImageData(0, 0, cols, rows).data;
    if (E) ripple(t, fi, x, y - S.fh * k / 2);

    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
    const decay = CONFIG.wakeDecay, drift = t * 0.1 * -cfg.dir;
    for (let r = 0, i = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++, i++) {
        const val = px[i * 4] * px[i * 4 + 3] / 65025;
        const w = trail[i] = Math.max(trail[i] * decay, val * 0.55);
        let g = -1;
        if (val > 0.08) g = Math.min(8, (val * 9) | 0);
        else if (E && rip[i] > 0.12) g = rip[i] > 0.5 ? 15 : rip[i] > 0.27 ? 14 : 13;
        else if (w > 0.3) g = 12;
        else if (w > 0.16) g = 11;
        else {
          const n = vnoise(c * 0.06 + drift, r * 0.12);
          if (n > 0.66 && hash(c, r) > 0.72) g = n > 0.8 ? 10 : 9;
        }
        if (g >= 0) ctx.drawImage(atlas, g * cwD, 0, cwD, chD, c * cwD, r * chD, cwD, chD);
      }
    }
  }

  // spawn rings at fast-moving emitters, then rasterise every live ring into rip[] (0..1 per cell)
  function ripple(t, fi, x, top) {
    const prev = (fi + S.n - 1) % S.n;
    E.tips[fi].forEach((p, e) => {
      const q = E.tips[prev][e], sp = Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (sp < E.minSpeed || sp > E.maxSpeed || t - (lastEmit[e] ?? -1e9) < E.cooldown) return;
      lastEmit[e] = t;
      ripples.push({ x: x + p[0] * k, y: top + p[1] * k, t0: t, s: E.strength * Math.min(1, sp / E.refSpeed) });
    });
    rip.fill(0);
    ripples = ripples.filter(R => t >= R.t0 && t - R.t0 < E.life);
    for (const R of ripples) {
      const a = (t - R.t0) / E.life;
      const rad = cw + E.maxR * k * (1 - (1 - a) * (1 - a));          // ease-out growth
      const th = Math.max(cw * 1.2, rad * 0.16), amp = R.s * Math.pow(1 - a, 1.4);
      const c0 = Math.max(0, Math.floor((R.x - rad - th) / cw)), c1 = Math.min(cols - 1, Math.ceil((R.x + rad + th) / cw));
      const r0 = Math.max(0, Math.floor((R.y - (rad + th) * E.squash) / ch)), r1 = Math.min(rows - 1, Math.ceil((R.y + (rad + th) * E.squash) / ch));
      for (let r = r0; r <= r1; r++) {
        const dy = ((r + 0.5) * ch - R.y) / E.squash;
        for (let c = c0; c <= c1; c++) {
          const dx = (c + 0.5) * cw - R.x, ring = 1 - Math.abs(Math.hypot(dx, dy) - rad) / th;
          if (ring > 0) { const i = r * cols + c, v = ring * amp; if (v > rip[i]) rip[i] = v; }
        }
      }
    }
  }

  // visible: on screen (IntersectionObserver). paused: the site moved to another section (onLeave);
  // coming back into view, by a transition or by scrolling, lifts it.
  let visible = false, paused = false, raf = 0, last = -1e9, held = false;
  let t0 = performance.now();
  const render = t => { drawAscii(t); fade.draw(t); };
  const stillTime = () => (W * 0.5 + S.fw * k * 0.5) / (S.speed * k);   // swimmer centred
  function frame(now) {
    raf = 0;
    if (!visible || paused) return;
    if (now - last >= 1000 / CONFIG.tick - 1) { last = now; render(held ? 0 : Math.max(0, now - t0) / 1000); }   // rAF time can predate hold(false)
    raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  const ready = Promise.all([img.decode(), fontIn(root), tips]).then(() => {
    resize();
    const still = frozen !== null || reduced;
    const tStill = () => frozen !== null ? +frozen : stillTime();
    // frozen views replay the last 2 s so wakes and ripples are there too
    const settle = () => { const T = tStill(); for (let s = Math.max(0, T - 2); s < T; s += 1 / CONFIG.tick) drawAscii(s); render(T); };
    const relayout = () => { resize(); if (still) settle(); };
    const ro = new ResizeObserver(relayout);
    ro.observe(root); ro.observe(copy);                           // the copy too: a language switch resizes it
    fontLate(relayout);                                           // the webfont came in late: new cell size
    if (still) { settle(); return; }
    // -1px: touching the screen edge is not on screen (see xiao.js)
    new IntersectionObserver(e => { visible = e[0].isIntersecting; if (visible) { paused = false; kick(); } }, { rootMargin: '-1px 0px' }).observe(root);
  });

  return {
    ready,
    // hold(true) parks the swimmer off-screen (time 0); hold(false) starts a fresh crossing
    hold(on) {
      held = on;
      if (!on) { t0 = performance.now(); if (trail) trail.fill(0); ripples = []; lastEmit.length = 0; }
    },
    pause() { paused = true; if (raf) { cancelAnimationFrame(raf); raf = 0; } },
    resume() { paused = false; if (visible) kick(); },
  };
}
