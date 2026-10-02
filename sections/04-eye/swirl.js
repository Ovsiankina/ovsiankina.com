// The midnight swirl (from sections/balanki.html): one WebGL canvas, a pixelated neon swirl blooming out of the night.
// Holds on the empty night until start() (the section calls it once the eye has shut), then plays its intro once.
//   const s = createSwirl(canvas, { reduced });   s.start(); s.replay(); s.pause(); s.resume(); s.set(amounts, third);
// null when WebGL is unavailable: the section's plain night background stays.
import config from './config.js';
import { rgb01 } from './glow.js';

const C = config.swirl;

const vert = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const frag = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform vec3  uAmt;    // cream, cyan, third (0..1)
uniform vec3  uThird;  // pink or purple

const vec3 NIGHT = vec3(0.012, 0.024, 0.102);
const vec3 DEEP  = vec3(0.027, 0.055, 0.220);
const vec3 BLUE  = vec3(0.090, 0.200, 0.700);
const vec3 CREAM = vec3(1.000, 0.975, 0.760);  // bright cream #fff9c2
const vec3 CYAN  = vec3(0.180, 1.000, 0.950);  // neon cyan #2efff2

const float INTRO = ${C.intro.toFixed(3)};

void main(){
  float t = uTime;
  float k = clamp(t / INTRO, 0.0, 1.0);
  float ease = 1.0 - pow(1.0 - k, 3.0);

  float px = max(2.0, floor(length(uRes) / 700.0));
  vec2 fc = (floor(gl_FragCoord.xy / px) + 0.5) * px;
  vec2 uv0 = (fc - 0.5 * uRes) / length(uRes);

  float r = length(uv0);
  float ang0 = atan(uv0.y, uv0.x);

  float rot   = 0.09 * t + 3.2 * ease;
  float twist = mix(14.0, 7.0, ease);
  float a = ang0 + rot - twist * r;
  vec2 uv = r * vec2(cos(a), sin(a));

  vec2 p = uv * 27.0;
  vec2 q = vec2(p.x + p.y);
  float s = t * 1.8;
  for (int i = 0; i < 5; i++) {
    q += p + sin(p.yx * 0.9);
    p += 0.5 * vec2(cos(4.7 + 0.37 * q.y + 0.13 * s), sin(0.95 * q.x - 0.11 * s));
    p -= cos(p.x + p.y) - sin(0.7 * p.x - p.y);
  }

  // Every slider at 0 removes its color entirely
  float onCream = smoothstep(0.0, 0.08, uAmt.x);
  float onCyan  = smoothstep(0.0, 0.08, uAmt.y);
  float onThird = smoothstep(0.0, 0.08, uAmt.z);

  // Accent band: a bit wider as cyan or cream go up
  float cm  = 1.55;
  float cmA = mix(1.9, 1.0, max(uAmt.y, 0.6 * uAmt.x));
  // Periodic so the bands repeat across the whole screen instead of sitting at the center
  float paint = 1.0 - cos(length(p) * 0.55);
  float wBlue   = max(0.0, 1.0 - cm * abs(1.0 - paint));
  float wAccent = max(0.0, 1.0 - cmA * abs(paint));
  float wHalo   = max(0.0, 1.0 - 0.7 * cmA * abs(paint));
  float wDeep   = 1.0 - min(1.0, wBlue + wAccent);

  // Third color takes over whole streaks
  float selT = onThird * smoothstep(mix(0.85, -1.0, uAmt.z), mix(1.0, -0.3, uAmt.z), sin(0.25 * (p.x + p.y) + 1.3));

  // Streak body: cyan (or plain blue at 0), then the third color
  vec3 body = mix(BLUE, CYAN, onCyan);
  vec3 tube = mix(body, uThird, selT);

  // Cream is the hot center, fading into the body as a gradient
  float lo = mix(0.95, 0.30, uAmt.x);
  float g  = smoothstep(lo, 1.0, wAccent);
  float creamAmt = onCream * g * g * (3.0 - 2.0 * g) * (1.0 - 0.8 * selT);
  vec3 accent = mix(tube, CREAM, creamAmt);

  vec3 col = 0.2 * BLUE * (1.0 - wAccent) + 0.8 * (BLUE * wBlue + DEEP * wDeep) + accent * wAccent;

  // Neon glow from cyan and the third color only
  vec3 glow = CYAN * onCyan * uAmt.y * (1.0 - selT) + uThird * selT;
  col += glow * 0.25 * smoothstep(0.0, 0.7, wHalo) * (1.0 - wAccent);

  col *= 1.0 - 0.25 * smoothstep(0.3, 0.75, r);
  col = min(col, vec3(1.0));

  float R = mix(-0.04, 0.78, ease);
  float edge = R + 0.05 * ease * sin(5.0 * (ang0 + 2.5 * r) - 2.0 * t);
  float fill = smoothstep(edge, edge - 0.10, r);

  gl_FragColor = vec4(mix(NIGHT, col, fill), 1.0);
}`;

export function createSwirl(canvas, { reduced }) {
  // preserveDrawingBuffer: the freeze before the next transition copies this canvas (core/freeze.js)
  const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s);
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vert));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n);
  const uRes = U('uRes'), uTime = U('uTime'), uAmt = U('uAmt'), uThird = U('uThird');

  const a = C.amounts;
  let amt = [a.cream, a.cyan, a.third], third = rgb01(C.thirds[C.third]);

  // the swirl's own clock: it only runs while started and on screen, so the intro is never skipped off screen
  let t = 0, started = false, running = false, raf = 0, last = 0;

  function draw() {
    if (gl.isContextLost()) return;
    const dpr = Math.min(window.devicePixelRatio || 1, C.dprMax);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr)), h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    gl.uniform2f(uRes, w, h);
    gl.uniform1f(uTime, reduced && started ? C.still : t);
    gl.uniform3f(uAmt, amt[0], amt[1], amt[2]);
    gl.uniform3f(uThird, third[0], third[1], third[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function frame(now) {
    raf = 0;
    if (!running) return;
    t += Math.min(0.1, (now - last) / 1000);   // a long hitch never jumps the intro ahead
    last = now;
    draw();
    raf = requestAnimationFrame(frame);
  }
  function resume() {
    if (running || !started || reduced) return;
    running = true; last = performance.now();
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function pause() { running = false; cancelAnimationFrame(raf); raf = 0; }

  draw();
  return {
    start() { started = true; t = 0; draw(); resume(); },
    replay() { if (started) { t = 0; draw(); } },
    resume,
    pause,
    draw,
    set(amounts, thirdHex) { amt = amounts; third = rgb01(thirdHex); if (!running) draw(); },
  };
}
