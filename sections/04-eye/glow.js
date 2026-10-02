// Horizon glow (from effects/horizon-glow.html) + flood.
// Two modes, picked per draw: with a base colour it is the original, opaque, fading out of that colour (the lead-in,
// and the flood that follows it); without one it is transparent wherever the quantized intensity is 0, so the
// glow rises out of whatever frozen page is under it (the transition played from anywhere).
import config from './config.js';

const { PIX, horizon } = config;
const { LEVELS, W, H, R, ramp } = config.glow;

const vert = 'attribute vec2 a; void main(){ gl_Position = vec4(a,0.0,1.0); }';
const frag = `
  precision highp float;
  uniform vec2 uRes, uC; uniform float uTime, uEnv, uGrow, uFlood, uW, uH, uR, uLevels; uniform vec3 uC1, uC2, uC3, uC4, uBase; uniform float uOpaque;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
  float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
  float bayer4(vec2 p){ vec2 q=mod(floor(p),4.0); int i=int(q.x+q.y*4.0); float m[16];
    m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;
    m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
    for(int k=0;k<16;k++) if(k==i) return (m[k]+0.5)/16.0; return 0.5; }
  vec3 ramp(float x){
    if(x<0.2)  return uOpaque > 0.5 ? mix(uBase,uC1,x/0.2) : uC1;   // transparent mode: q == 0 is cut out instead
    if(x<0.45) return mix(uC1,uC2,(x-0.2)/0.25);
    if(x<0.75) return mix(uC2,uC3,(x-0.45)/0.30);
    if(x<1.0)  return mix(uC3,uC4,(x-0.75)/0.25);
    return mix(uC4, vec3(1.0), clamp((x-1.0)/0.45, 0.0, 1.0));   // overexposure to white
  }
  void main(){
    vec2 p=(gl_FragCoord.xy-uC)/uRes.y;
    float t=uTime, e=uEnv, F=uFlood;
    float w=uW*mix(0.35,1.0,uGrow)*(1.0+F*F*4.0);
    float ax=abs(p.x/w);
    float streak=fbm(vec2(p.x*14.0,t*0.35)), fine=noise(vec2(p.x*90.0,t*1.5));
    float I=0.0;
    if(ax<1.25){
      float corner=sqrt(max(0.0,1.0-pow(min(ax,1.0),5.0)));
      if(p.y>0.0){
        float h=uH*e*(1.0+F*F*9.0)*corner*(0.78+0.32*streak);
        float v=p.y/max(h,1e-4);
        I=((1.0-smoothstep(0.5,1.0,v))*0.55+exp(-v*1.4)*0.35)*(0.88+0.12*fine);
      } else {
        float h=uR*e*(1.0+F*F*9.0)*sqrt(max(0.0,1.0-ax*ax*0.85));
        float v=-p.y/max(h,1e-4);
        I=exp(-v*v*1.3)*0.6+exp(-v*1.2)*0.2;
      }
      I*=1.0-smoothstep(0.78,1.12,ax); I*=e;
    }
    I+=exp(-abs(p.y)/(0.008+0.006*e+F*0.25))*(1.0-smoothstep(0.55,1.05,ax))*0.4*e;
    I+=exp(-abs(p.y)*uRes.y/2.5)*(1.0-smoothstep(0.7,1.35,ax))*0.9*smoothstep(0.0,0.3,e);
    I=I*(1.0+F*1.6)+F*F*F*1.6;
    I=clamp(I,0.0,1.45);
    float q=floor(I*uLevels+bayer4(gl_FragCoord.xy))/uLevels;
    gl_FragColor = uOpaque < 0.5 && q < 0.5/uLevels ? vec4(0.0) : vec4(ramp(clamp(q,0.0,1.45)),1.0);
  }`;

// '#rrggbb' -> [r, g, b] 0..1, for draw's base
export const rgb01 = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);

let glow;   // the transition's { canvas, draw, lost }, made on first use and reused by every run

// The transition's glow: one canvas and WebGL context reused by every run, so replays never pile up contexts.
export function getGlow() {
  if (glow && !glow.lost()) return glow;            // lost or never made (WebGL blocked): try again
  return (glow = createGlow());
}

// A new glow canvas sized to its parent, the horizon at config.horizon of its height, normalised by that height.
// null when WebGL is unavailable. draw(time, env, grow, flood, base): env/grow 0..1 raise the glow, flood 0..1
// overexposes it to white, base [r, g, b] 0..1 makes it opaque over that colour (omit it for the transparent mode)
export function createGlow() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;';
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vert)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n);
  gl.uniform1f(U('uW'), W); gl.uniform1f(U('uH'), H); gl.uniform1f(U('uR'), R); gl.uniform1f(U('uLevels'), LEVELS);
  ramp.forEach((c, i) => gl.uniform3f(U(`uC${i + 1}`), c[0], c[1], c[2]));
  const uBase = U('uBase'), uOpaque = U('uOpaque');
  const uRes = U('uRes'), uC = U('uC'), uTime = U('uTime'), uEnv = U('uEnv'), uGrow = U('uGrow'), uFlood = U('uFlood');
  const draw = (time, env, grow, flood, base) => {
    if (gl.isContextLost()) return;                  // blank (transparent) until the next run makes a new context
    const vw = canvas.parentNode?.clientWidth || innerWidth, vh = canvas.parentNode?.clientHeight || innerHeight;
    const w = Math.max(1, Math.floor(vw / PIX)), h = Math.max(1, Math.floor(vh / PIX));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    gl.uniform2f(uRes, w, h);
    gl.uniform2f(uC, w * 0.5, vh * (1 - horizon) / PIX);
    gl.uniform1f(uOpaque, base ? 1 : 0);
    if (base) gl.uniform3f(uBase, base[0], base[1], base[2]);
    gl.uniform1f(uTime, time); gl.uniform1f(uEnv, env); gl.uniform1f(uGrow, grow); gl.uniform1f(uFlood, flood);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  return { canvas, draw, lost: () => gl.isContextLost() };
}
