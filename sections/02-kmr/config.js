// KM-RoBoTa section: everything tunable. Text lives in content.js.
// Asset paths are relative to this folder.

export default {
  // ---------- palette (set as CSS custom properties on the section root) ----------
  colors: {
    '--black': '#000',
    '--ink': '#ececec',
    '--text': '#a6a6a6',
    '--dim': '#5c5c5c',
    '--line': '#262626',
    '--yellow': '#f2c12e',
    // XIAO model ASCII layers (kept from the model study)
    '--a-mask': '#6e7380',
    '--a-edge': '#8c6b4b',
    '--a-gold': '#e3b86a',
    '--a-silver': '#c5c9d1',
    '--a-label': '#f4f2eb',
    '--a-dark': '#4b4e58',
    '--a-glint': '#fffbea',
  },
  sectionHeight: '72vh',   // height of each sub-section: lower = less black between them (phones: full screen)

  // ---------- ASCII swimmer sub-sections (KM-RoBoTa, AI Summit) ----------
  swimmer: {
    fontPx: 12, fontPxMobile: 10, lineH: 1.2,
    tick: 30,              // frames per second of the ASCII grid
    pixelSize: 3,          // chunky Bayer pixels of the fade, as in horizon-glow
    wakeDecay: 0.9,        // per frame: how long the wake lingers behind the swimmer
    fadeLen: 0.36, fadeLenMobile: 0.2,   // width of the dithered fade toward the text (fraction of W, of H on phones)
    // glyph atlas colours. Keep the counts (2 / 2 / 3): the renderer picks them by index.
    glyphs: {
      dots: [['.', '#1c1c1c'], ['·', '#262626']],                     // background specks
      wake: [['.', '#333333'], [':', '#3f3f3f']],
      ripple: [['.', '#1b4060'], ['-', '#285a88'], ['~', '#3a7cba']], // blue water rings, faint -> strong
    },
  },

  /*
   * sprite: { src, fw, fh, cols, n, fps, speed }  frames are pre-oriented to swim along +x or -x
   * dir:    -1 swims right -> left, +1 swims left -> right
   * fit({W, H, solid, end, mobile}) -> { k, cy }   k = CSS px per sprite px, cy = vertical centre
   * bob:    optional { amp (fraction of H), period (s) }
   * ripple: optional blue water rings. tips[frame][emitter] = [x, y] in sprite px (fin tips, tail tip).
   *         A ring is spawned where an emitter moves faster than minSpeed (sprite px / frame),
   *         at most once per cooldown (s). Rings stay put in the water while the swimmer moves on.
   */

  // 1 · snake (frames from the swimming-snake study, mirrored to swim right -> left)
  snake: {
    sprite: { src: 'assets/snake.png', fw: 235, fh: 102, cols: 6, n: 43, fps: 30, speed: 72.91 },
    dir: -1, seed: 0,
    ripple: { tips: 'assets/snake-ripple-tips.json',   // tail tip; much quieter than STAR's
              minSpeed: 3, maxSpeed: 14, refSpeed: 6, cooldown: 0.7, life: 1.4, maxR: 24, strength: 0.6, squash: 0.75 },
    fit: ({ W, H, end, mobile }) => {
      if (!mobile) return { k: Math.min(0.52 * W / 224, 0.55 * H / 102), cy: H * 0.54 };
      const avail = H * (1 - end) + H * 0.1;
      return { k: Math.min(0.95 * W / 224, 0.8 * avail / 102), cy: H - avail * 0.5 };
    },
  },

  // 2 · STAR (cut out of the booth clip, turned to swim left -> right)
  // fin strokes are exaggerated in the frames: each blade is bent around its shoulder, 2 to 3.2x the filmed angle
  star: {
    sprite: { src: 'assets/star.png', fw: 265, fh: 153, cols: 10, n: 60, fps: 30, speed: 56 },
    dir: 1, seed: 4.2, bob: { amp: 0.018, period: 6.4 },
    ripple: { tips: 'assets/star-ripple-tips.json',    // 4 fin tips
              minSpeed: 2.2, maxSpeed: 12, refSpeed: 5, cooldown: 0.45, life: 1.5, maxR: 34, strength: 0.95, squash: 0.75 },
    fit: ({ W, H, end, mobile }) => {
      if (!mobile) return { k: Math.min(0.5 * W / 265, 0.62 * H / 153), cy: H * 0.5 };
      const avail = H * (1 - end) + H * 0.1;
      return { k: Math.min(0.95 * W / 265, 0.85 * avail / 153), cy: H - avail * 0.5 };
    },
  },

  // ---------- 3 · XIAO ESP32-C3 model: ASCII colour layers or plain pixel render ----------
  xiao: {
    mesh: 'assets/xiao-mesh.json',   // { v: int16 xyz in 1/100 mm, i: uint16 triangles, m: uint8 material per triangle, mats } base64
    // ASCII glyph size, fixed: 0 = finest (6 px glyphs), 1 = coarsest (16 px). 0.2 -> 8 px
    asciiSize: 0.2, fontMin: 6, fontMax: 16,
    asciiFps: 30,
    renderFps: 30,                   // the pixel render is a software raster too: same cap
    pix: 3,                          // render mode: CSS px per rendered pixel
    camDist: 70, frameR: 12.6,       // camera distance and framing radius, mm
    edgeStep: 0.8,                   // mm of depth step that draws an edge glyph in ASCII mode
    yaw: -0.7, pitch: 0.72,          // starting orientation
    tilt: 0.75,                      // auto mode tumbles between top view (+) and back view (-)
    spinSeconds: 10,                 // one turn per 10 s
    albedo: { silk: [232, 232, 226], mask: [34, 35, 42], edge: [62, 50, 38], gold: [216, 178, 110], silver: [192, 195, 201], label: [238, 237, 231], dark: [30, 30, 35], ink: [26, 26, 30] },
    spec: { silk: 0.08, mask: 0.3, edge: 0.05, gold: 0.75, silver: 0.85, label: 0.12, dark: 0.15, ink: 0.1 },
    vis: { silk: 1.0, mask: 0.3, edge: 0.3, gold: 1.0, silver: 0.85, label: 1.0, dark: 0.25, ink: 0.75 },   // ASCII density per material
  },

  // ---------- transition into this section: the swipe (the agnathax loader, colours reversed) ----------
  swipe: {
    swimSeconds: 3.6,          // time for the robot to cross the screen (about 4.7 s in total)
    lead: 0.5,                 // s before the robot enters
    robotLength: 210,          // px
    wallSpeed: 1.2,            // the wall chases the robot at this multiple of its speed
    wallBack: 12, wallFront: 3, wallJitter: 1.5,   // wall thickness behind / ahead of its edge, edge raggedness (rows)
    fish: [12, 8],             // fish in the two schools
    fontWait: 300,             // ms at most to wait for the wall's webfont before starting (fallback: monospace)
    // reduced motion: no robot, just the wall. The prototype waited 0.4 s and swept for 1.4 s;
    // shortened so the whole reveal stays under half a second.
    reducedDelay: 0, reducedWall: 0.45,   // 0.45 s + start-up stays under the 500 ms budget
    // glyph layers. Water layers draw over the frozen previous screen; the wall belongs to the black section.
    layers: {
      dim:   { color: '#6F8CC4', opacity: 0.45 },
      mid:   { color: '#6F8CC4' },
      foam:  { color: '#C9D8EE' },
      fish:  { color: '#F2C38B' },
      robot: { color: '#FFFFFF', weight: 500 },
      far:   { color: '#5c5c5c' },
      near:  { color: '#e6e6e6', weight: 500 },
    },
  },
};
