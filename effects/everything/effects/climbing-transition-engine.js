// climbEngine(E): green page -> dithered wipe with a blue ASCII-fish band -> white climbing scene
// E = { stage, scroller, fx, fish, holds, ascii, title, video, urls: { holds, mesh }, opts: { speed, blue, ink }, setPhase(name), startAt }
function climbEngine(E) {
  const PIX = 3;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const bay = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
  const clamp01 = x => Math.min(1, Math.max(0, x));
  const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const hsh = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000 / 1000;
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const opts = E.opts;
  const BLUE = hex(opts.blue || '#1238FF');
  const INK = opts.ink || '#1B0D2E';
  const SRC_W = 640, SRC_H = 360;
  const T = { wipe: 1700, pause: 350, holdGap: 70, holdFade: 380, afterHolds: 250, titleDelay: 2200, titleLaterTall: 2500 };

  let W = 0, H = 0, gw = 0, gh = 0, raf = 0, alive = true;
  let phase = 'page', t0 = 0, atBottomSince = 0;
  let holdsData = null, holdCount = 0, mesh = null, gl = null, glp = null;
  let focusX = 0.5, focusTarget = 0.5;
  // pointer repel on the title: springs for Y pivot, X tilt and a small push away
  const ptr = { x: 0, y: 0, inside: false };
  const rep = { ry: [0, 0], rx: [0, 0], tx: [0, 0], ty: [0, 0] };
  let lastTitleNow = 0;
  let holdsDirty = true, lastHoldsKey = '';
  let climbStart = 0, videoStarted = false, titleStart = 0;
  // end of clip: freeze the last frame and let him keep falling out of the screen, then loop.
  // Measured on the clip: ~150 px/s downward at the last frame, ~90 px per metre (640-px video units)
  const FALL = { v0: 150, pxPerMetre: 90, gravity: 1.5 * 9.81 };
  let fallStart = 0, endedHooked = false;
  const onEnded = () => { if (phase === 'climb' && videoStarted && !reduced) fallStart = performance.now(); };

  const fxCtx = E.fx.getContext('2d');
  const fishCtx = E.fish.getContext('2d');
  const holdsCtx = E.holds.getContext('2d');
  const asciiCtx = E.ascii.getContext('2d');
  const sampler = document.createElement('canvas');
  const sctx = sampler.getContext('2d', { willReadFrequently: true });

  // ---------------- layout: every pixel-art layer shares one PIX grid ----------------
  function layout() {
    const w = E.stage.clientWidth, h = E.stage.clientHeight;
    if (w === W && h === H) return;
    W = w; H = h; gw = Math.ceil(W / PIX); gh = Math.ceil(H / PIX);
    for (const c of [E.fx, E.holds]) {
      c.width = gw; c.height = gh; c.style.width = gw * PIX + 'px'; c.style.height = gh * PIX + 'px';
    }
    E.title.width = gw; E.title.height = gh; E.title.style.width = gw * PIX + 'px'; E.title.style.height = gh * PIX + 'px';
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [E.fish, E.ascii]) {
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); c.style.width = W + 'px'; c.style.height = H + 'px';
      c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    holdsDirty = true;
  }

  // where the 640x360 source sits on the stage: contain on wide screens, cover + follow the climber on tall ones
  function videoRect() {
    if (W / H >= 1.2) {
      const s = Math.min(W / SRC_W, H / SRC_H);
      return { s, x: (W - SRC_W * s) / 2, y: (H - SRC_H * s) / 2 };
    }
    const s = H / SRC_H, vw = SRC_W * s;
    const x = Math.min(0, Math.max(W - vw, W / 2 - focusX * vw));
    return { s, x: Math.round(x / PIX) * PIX, y: 0 };
  }

  // ---------------- assets ----------------
  function loadHolds() {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = SRC_W; c.height = SRC_H * 2;
        const x = c.getContext('2d'); x.drawImage(img, 0, 0);
        const d = x.getImageData(0, 0, SRC_W, SRC_H * 2).data;
        const rgb = new Uint8ClampedArray(SRC_W * SRC_H * 3), idx = new Uint8Array(SRC_W * SRC_H);
        for (let i = 0; i < SRC_W * SRC_H; i++) {
          rgb[i * 3] = d[i * 4]; rgb[i * 3 + 1] = d[i * 4 + 1]; rgb[i * 3 + 2] = d[i * 4 + 2];
          idx[i] = d[(i + SRC_W * SRC_H) * 4];
          if (idx[i] > holdCount) holdCount = idx[i];
        }
        holdsData = { rgb, idx };
        res();
      };
      img.onerror = rej;
      img.src = E.urls.holds;
    });
  }
  async function loadMesh() {
    const js = await (await fetch(E.urls.mesh)).json();
    const bin = atob(js.b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const buf = u8.buffer;
    const n = new DataView(buf).getUint32(0, true);
    const hdr = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, n)));
    const pos = new Float32Array(buf, 4 + n, hdr.nv * 3);
    const ib = 4 + n + hdr.nv * 12;
    const idx = hdr.nv < 65536 ? new Uint16Array(buf, ib, hdr.nt * 3) : new Uint32Array(buf, ib, hdr.nt * 3);
    const nor = new Float32Array(hdr.nv * 3);
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
      const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const k of [a, b, c]) { nor[k] += nx; nor[k + 1] += ny; nor[k + 2] += nz; }
    }
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (let i = 0; i < hdr.nv; i++) {
      const k = i * 3, l = Math.hypot(nor[k], nor[k + 1], nor[k + 2]) || 1;
      nor[k] /= l; nor[k + 1] /= l; nor[k + 2] /= l;
      minX = Math.min(minX, pos[k]); maxX = Math.max(maxX, pos[k]); minY = Math.min(minY, pos[k + 1]); maxY = Math.max(maxY, pos[k + 1]);
    }
    mesh = { pos, nor, idx, count: idx.length, w: maxX - minX, h: maxY - minY, big: !(idx instanceof Uint16Array) };
  }

  // ---------------- the wipe: two dithered edges, a blue band with an ASCII fish between them ----------------
  function renderWipe(k, now) {
    const B = 6, band = Math.max(10, Math.round(gh * 0.1));
    const travel = gh + band + 2 * B;
    const e1 = gh + B - travel * k, e2 = e1 + band;
    const flick = Math.floor(now / 70);
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
        if ((y - top2[x]) / B + 0.5 > th) { d[i] = 255; d[i + 1] = 255; d[i + 2] = 255; d[i + 3] = 255; }
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

  // ---------------- holds: Bayer-posterized pixels, each hold dissolving in on its own ----------------
  function renderHolds(t) {
    if (!holdsData) return;
    const vr = videoRect();
    const revealEnd = T.pause + holdCount * T.holdGap + T.holdFade;
    const key = vr.x + ',' + vr.s + ',' + W + ',' + H;
    if (!holdsDirty && key === lastHoldsKey && t > revealEnd + 50) return;
    holdsDirty = false; lastHoldsKey = key;
    const img = holdsCtx.createImageData(gw, gh), d = img.data;
    const { rgb, idx } = holdsData;
    const prog = new Float32Array(holdCount + 1);
    for (let i = 1; i <= holdCount; i++) prog[i] = reduced ? 1 : clamp01((t - T.pause - (i - 1) * T.holdGap) / T.holdFade);
    for (let y = 0; y < gh; y++) {
      const sy = Math.floor(((y + 0.5) * PIX - vr.y) / vr.s);
      if (sy < 0 || sy >= SRC_H) continue;
      for (let x = 0; x < gw; x++) {
        const sx = Math.floor(((x + 0.5) * PIX - vr.x) / vr.s);
        if (sx < 0 || sx >= SRC_W) continue;
        const si = sy * SRC_W + sx, h = idx[si];
        if (!h) continue;
        const th = bay(x, y);
        if (th >= prog[h]) continue;
        const o = (y * gw + x) * 4;
        for (let ch = 0; ch < 3; ch++) d[o + ch] = Math.min(255, Math.floor(rgb[si * 3 + ch] / 255 * 3 + th) * 85);
        d[o + 3] = 255;
      }
    }
    holdsCtx.putImageData(img, 0, 0);
  }

  // ---------------- the climber: video frames -> characters, knocked out of the holds behind him ----------------
  const CRAMP = ' .:-=+*#%@';
  function renderClimber() {
    asciiCtx.clearRect(0, 0, W, H);
    const v = E.video;
    if (!videoStarted || v.readyState < 2) return;
    const fs = W >= 700 ? Math.max(6, Math.min(10, Math.round(W / 180))) : 6;
    const cw = fs * 0.6, chh = fs;
    const cols = Math.ceil(W / cw), rows = Math.ceil(H / chh);
    const vr = videoRect();
    // falling: rigid freeze-frame shifted down whole text rows, displayed-time physics
    let dyRows = 0;
    if (fallStart) {
      const t = (performance.now() - fallStart) / 1000, rate = opts.speed || 1.5;
      const dySrc = FALL.v0 * rate * t + 0.5 * FALL.gravity * FALL.pxPerMetre * t * t;
      dyRows = Math.floor(dySrc * vr.s / chh);
    }
    if (sampler.width !== cols * 2 || sampler.height !== rows * 2) { sampler.width = cols * 2; sampler.height = rows * 2; }
    sctx.fillStyle = '#fff'; sctx.fillRect(0, 0, sampler.width, sampler.height);
    sctx.imageSmoothingEnabled = true; sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(v, vr.x / cw * 2, vr.y / chh * 2, SRC_W * vr.s / cw * 2, SRC_H * vr.s / chh * 2);
    const px = sctx.getImageData(0, 0, cols * 2, rows * 2).data;
    asciiCtx.font = `500 ${fs}px 'JetBrains Mono', ui-monospace, monospace`;
    asciiCtx.textBaseline = 'top';
    const cells = [];
    let sumX = 0, n = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      let acc = 0, hit = 0;
      for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
        const i = ((r * 2 + sy) * cols * 2 + c * 2 + sx) * 4;
        const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        if (lum < 238) { hit++; acc += 1 - lum / 255; }
      }
      if (hit < 2) continue;
      const g = Math.pow(acc / 4, 0.6);
      const gi = Math.min(9, Math.max(2, Math.round(g * 10 + (hsh(c, r) - 0.5) * 0.7)));
      cells.push(c, r, gi);
      sumX += c * cw; n++;
    }
    let topRow = Infinity;
    for (let i = 0; i < cells.length; i += 3) { cells[i + 1] += dyRows; if (cells[i + 1] < topRow) topRow = cells[i + 1]; }
    asciiCtx.fillStyle = '#FFFFFF';
    for (let i = 0; i < cells.length; i += 3) if (cells[i + 1] < rows) asciiCtx.fillRect(cells[i] * cw - 0.5, cells[i + 1] * chh - 0.5, cw + 1, chh + 1);
    asciiCtx.fillStyle = INK;
    for (let i = 0; i < cells.length; i += 3) if (cells[i + 1] < rows) asciiCtx.fillText(CRAMP[cells[i + 2]], cells[i] * cw, cells[i + 1] * chh);
    if (fallStart) {
      if (!cells.length || topRow >= rows) {               // gone below the screen: start the clip again
        fallStart = 0;
        try { v.currentTime = 0; const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) {}
      }
    } else if (n > 20) focusTarget = clamp01((sumX / n - vr.x) / (SRC_W * vr.s));
  }

  // ---------------- the title: Pilowlava 3D mesh, lit, Bayer-dithered on the PIX grid ----------------
  function initGL() {
    gl = E.title.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: false });
    if (!gl || !mesh) return;
    if (mesh.big) gl.getExtension('OES_element_index_uint');
    const vs = `attribute vec3 p; attribute vec3 n; uniform mat4 uMVP; uniform mat3 uR; uniform vec2 uOff; varying vec3 vN;
      void main(){ vN = uR * n; vec4 c = uMVP * vec4(p, 1.0); c.xy += uOff * c.w; gl_Position = c; }`;
    const fs = `precision mediump float; varying vec3 vN; uniform float uReveal, uShadow; uniform vec3 uC0, uC1, uC2, uC3, uInk;
      float bayer4(vec2 p){ vec2 q=mod(floor(p),4.0); int i=int(q.x+q.y*4.0); float m[16];
        m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
        for(int k=0;k<16;k++) if(k==i) return (m[k]+0.5)/16.0; return 0.5; }
      void main(){
        float b = bayer4(gl_FragCoord.xy);
        if (b > uReveal) discard;
        if (uShadow > 0.5) { if (mod(floor(gl_FragCoord.x)+floor(gl_FragCoord.y),2.0) > 0.5) discard; gl_FragColor = vec4(uInk,1.0); return; }
        vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
        vec3 L = normalize(vec3(-0.45, 0.6, 0.75));
        float diff = max(dot(N, L), 0.0);
        float spec = pow(max(dot(reflect(-L, N), vec3(0.0,0.0,1.0)), 0.0), 18.0);
        float I = 0.18 + 0.72 * diff + 0.55 * spec;
        float q = clamp(floor(I * 3.0 + b), 0.0, 3.0);
        vec3 col = q < 0.5 ? uC0 : q < 1.5 ? uC1 : q < 2.5 ? uC2 : uC3;
        gl_FragColor = vec4(col, 1.0);
      }`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog); gl.useProgram(prog);
    const buf = (data, target) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, gl.STATIC_DRAW); return b; };
    buf(mesh.pos, gl.ARRAY_BUFFER); const lp = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 3, gl.FLOAT, false, 0, 0);
    buf(mesh.nor, gl.ARRAY_BUFFER); const ln = gl.getAttribLocation(prog, 'n'); gl.enableVertexAttribArray(ln); gl.vertexAttribPointer(ln, 3, gl.FLOAT, false, 0, 0);
    buf(mesh.idx, gl.ELEMENT_ARRAY_BUFFER);
    const U = n => gl.getUniformLocation(prog, n);
    glp = { uMVP: U('uMVP'), uR: U('uR'), uOff: U('uOff'), uReveal: U('uReveal'), uShadow: U('uShadow') };
    const f = c => hex(c).map(v => v / 255);
    const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
    const toHex = a => '#' + a.map(v => v.toString(16).padStart(2, '0')).join('');
    const deep = toHex(mix(BLUE, [6, 8, 40], 0.65)), light = toHex(mix(BLUE, [255, 255, 255], 0.45)), pale = toHex(mix(BLUE, [255, 255, 255], 0.8));
    gl.uniform3fv(U('uC0'), f(deep)); gl.uniform3fv(U('uC1'), f(opts.blue || '#1238FF')); gl.uniform3fv(U('uC2'), f(light)); gl.uniform3fv(U('uC3'), f(pale));
    gl.uniform3fv(U('uInk'), f(INK));
    gl.enable(gl.DEPTH_TEST);
  }
  function mat4Mul(a, b) { const o = new Float32Array(16);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
  function renderTitle(now) {
    if (!gl || !glp) return;
    gl.viewport(0, 0, gw, gh);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!titleStart) return;
    const tt = (now - titleStart) / 1000, T2 = now / 1000;
    const reveal = reduced ? 1 : smooth(0, 0.45, tt);
    const sc = reduced ? 1 : 1 - 0.7 * Math.exp(-5.5 * tt) * Math.cos(12 * tt);
    const aspect = gw / gh, fov = 30 * Math.PI / 180, tn = Math.tan(fov / 2);
    // wide screens: horizontal across 72% of the width. Tall screens: along the diagonal (bottom-left to top-right),
    // as long as fits inside 88% x 84% of the screen, so it stays readable on a phone
    const tall = W / H < 1.2, rr = mesh.h / mesh.w;
    const theta = tall ? Math.atan2(H * 0.84, W * 0.88) : 0, ct = Math.cos(theta), st = Math.sin(theta);
    const Lpx = tall ? Math.min(W * 0.88 / (ct + rr * st), H * 0.84 / (st + rr * ct)) : W * 0.72;
    const D = mesh.w * H / (2 * tn * Lpx);
    // magnet: the side of the word nearest the pointer is pushed away from it (measured in the word's own frame)
    const halfW = Lpx / 2, halfH = halfW * rr;
    let tRy = 0, tRx = 0, tA = 0, tP = 0;
    if (ptr.inside && !reduced) {
      const dx = ptr.x - W / 2, dy = ptr.y - H / 2;
      const nx = (dx * ct - dy * st) / halfW, ny = (dx * st + dy * ct) / halfH;
      const d = Math.hypot(Math.max(0, Math.abs(nx) - 1), Math.max(0, Math.abs(ny) - 1) * halfH / halfW);
      const infl = Math.exp(-d * d * 5) * smooth(0.3, 0.9, tt);
      const cnx = Math.max(-1.2, Math.min(1.2, nx)), cny = Math.max(-1.5, Math.min(1.5, ny));
      tRy = 0.3 * cnx * infl; tRx = 0.16 * cny * infl;
      tA = -0.02 * W * cnx * infl; tP = -0.25 * halfH * cny * infl;
    }
    const dt = Math.min(0.05, lastTitleNow ? (now - lastTitleNow) / 1000 : 0.016); lastTitleNow = now;
    const spring = (s, target) => { s[1] += ((target - s[0]) * 70 - s[1] * 13) * dt; s[0] += s[1] * dt; return s[0]; };
    const pRy = spring(rep.ry, tRy), pRx = spring(rep.rx, tRx), pA = spring(rep.tx, tA), pP = spring(rep.ty, tP);
    const ry = (reduced ? 0 : -0.9 * Math.exp(-4 * tt) * Math.cos(9 * tt)) + 0.13 * Math.sin(T2 * 0.7) + pRy;
    const rx = (reduced ? 0 : 0.35 * Math.exp(-4 * tt)) + 0.08 * Math.sin(T2 * 0.5) - 0.06 + pRx;
    const upp = 2 * D * tn / H;                                    // world units per CSS px at the title's depth
    const pushX = pA * ct + pP * st, pushY = -pA * st + pP * ct;   // back to screen px (y down)
    const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
    // R = Rz(theta) * Rx * Ry (column-major)
    const A3 = [cy, sx * sy, -cx * sy, 0, cx, sx, sy, -sx * cy, cx * cy];
    const R3 = [];
    for (let c = 0; c < 3; c++) {
      const x = A3[c * 3], y = A3[c * 3 + 1], z = A3[c * 3 + 2];
      R3.push(ct * x - st * y, st * x + ct * y, z);
    }
    const M = new Float32Array([R3[0] * sc, R3[1] * sc, R3[2] * sc, 0, R3[3] * sc, R3[4] * sc, R3[5] * sc, 0, R3[6] * sc, R3[7] * sc, R3[8] * sc, 0, pushX * upp, -pushY * upp, -D, 1]);
    const nr = D * 0.5, fr = D * 2, f = 1 / tn;
    const P = new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (fr + nr) / (nr - fr), -1, 0, 0, 2 * fr * nr / (nr - fr), 0]);
    gl.uniformMatrix4fv(glp.uMVP, false, mat4Mul(P, M));
    gl.uniformMatrix3fv(glp.uR, false, new Float32Array(R3));
    gl.uniform1f(glp.uReveal, reveal);
    const type = mesh.big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    gl.uniform1f(glp.uShadow, 1); gl.uniform2f(glp.uOff, 3 * 2 / gw, -3 * 2 / gh);
    gl.drawElements(gl.TRIANGLES, mesh.count, type, 0);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.uniform1f(glp.uShadow, 0); gl.uniform2f(glp.uOff, 0, 0);
    gl.drawElements(gl.TRIANGLES, mesh.count, type, 0);
  }

  // ---------------- sequence ----------------
  function startWipe(now) {
    if (phase !== 'page') return;
    phase = reduced ? 'climb' : 'wipe'; t0 = now;
    if (phase === 'climb') enterClimb(now);
  }
  function enterClimb(now) {
    phase = 'climb'; climbStart = now; videoStarted = false; titleStart = 0; holdsDirty = true; fallStart = 0;
    focusX = focusTarget = 0.62;
    E.setPhase('climb');
    try { E.video.pause(); E.video.currentTime = 0; } catch (e) {}
  }
  function startVideo() {
    videoStarted = true;
    const v = E.video; v.muted = true; v.loop = reduced; v.setAttribute('playsinline', ''); v.playbackRate = opts.speed || 1.5;
    if (!endedHooked) { endedHooked = true; v.addEventListener('ended', onEnded); }
    const p = v.play(); if (p && p.catch) p.catch(() => {});
  }
  function frame(now) {
    if (!alive) return;
    layout();
    if (phase === 'page') {
      const sc = E.scroller;
      const bottom = sc && sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2 && sc.scrollTop > 4;
      if (bottom) { if (!atBottomSince) atBottomSince = now; if (now - atBottomSince > 400) startWipe(now); }
      else atBottomSince = 0;
    } else if (phase === 'wipe') {
      const k = clamp01((now - t0) / T.wipe);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      renderWipe(e, now);
      if (k >= 1) enterClimb(now);
    } else if (phase === 'climb') {
      const t = now - climbStart;
      if (t > 40 && t < 400) { fxCtx.clearRect(0, 0, gw, gh); fishCtx.clearRect(0, 0, W, H); }
      const holdsEnd = T.pause + holdCount * T.holdGap + T.holdFade;
      if (!videoStarted && holdsData && t > holdsEnd + T.afterHolds) startVideo();
      if (videoStarted && !titleStart && t > holdsEnd + T.afterHolds + T.titleDelay + (W / H < 1.2 ? T.titleLaterTall : 0)) titleStart = now;
      if (W / H < 1.2) { const nf = focusX + (focusTarget - focusX) * 0.06; if (Math.abs(nf - focusX) * W > 0.3) holdsDirty = true; focusX = nf; }
      renderHolds(t);
      renderClimber();
      renderTitle(now);
    }
    raf = requestAnimationFrame(frame);
  }

  function resetToPage() {
    phase = 'page'; atBottomSince = 0; titleStart = 0; videoStarted = false; fallStart = 0;
    try { E.video.pause(); } catch (e) {}
    fxCtx.clearRect(0, 0, gw, gh); fishCtx.clearRect(0, 0, W, H); asciiCtx.clearRect(0, 0, W, H); holdsCtx.clearRect(0, 0, gw, gh);
    E.setPhase('page');
    if (E.scroller) E.scroller.scrollTop = 0;
  }

  const onMove = e => {
    const r = E.stage.getBoundingClientRect();
    ptr.x = (e.clientX - r.left) * (W / (r.width || W)); ptr.y = (e.clientY - r.top) * (H / (r.height || H)); ptr.inside = true;
  };
  const onLeave = () => { ptr.inside = false; };
  E.stage.addEventListener('pointermove', onMove);
  E.stage.addEventListener('pointerleave', onLeave);

  layout();
  const ready = Promise.all([loadHolds(), loadMesh().then(() => { try { initGL(); } catch (e) { console.error(e); } })]).catch(e => console.error(e));
  const fontsReady = document.fonts ? document.fonts.load("500 12px 'JetBrains Mono'").catch(() => {}) : Promise.resolve();
  Promise.all([ready, fontsReady]).then(() => {
    if (!alive) return;
    if (E.startAt === 'climb') enterClimb(performance.now());
    raf = requestAnimationFrame(frame);
  });

  return {
    climb: () => { if (phase === 'page') startWipe(performance.now()); },
    replay: () => { resetToPage(); requestAnimationFrame(n => { phase = 'page'; startWipe(n); }); },
    back: resetToPage,
    destroy: () => { alive = false; cancelAnimationFrame(raf); E.video.removeEventListener('ended', onEnded); E.stage.removeEventListener('pointermove', onMove); E.stage.removeEventListener('pointerleave', onLeave); try { E.video.pause(); } catch (e) {} },
  };
}
