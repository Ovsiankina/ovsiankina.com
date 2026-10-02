// Knobs for the maths section and its transition.
export default {
  // colours, set as CSS custom properties (--bg, --ink, ...) on the section and on the transition's overlay box;
  // the CSS and the canvases both read them from there
  palette: {
    'bg':        '#070707',
    'ink':       '#ebe7de',
    'text':      '#a8a39a',
    'dim':       '#5e5a53',
    'geo':       '#a3b6cf',
    'paper':     '#ebe7de',    // the Lagrangian page
    'paper-ink': '#0d0c09',
    'yellow':    '#FFE45C',    // trace colour far from the origin...
    'teal':      '#2EE6D6',    // ...and close to it (OKLab mix in between)
  },

  pixel: 2,                    // CSS px per drawn pixel (same as the landing)

  // side-by-side layout only when the section is at least this wide AND the window this landscape; else portrait
  landscape: { minWidth: 900, minAspect: 1.15 },

  // ---------- zeta(1/2 + it) trace ----------
  trace: {
    tMax: 62,                  // the curve is drawn for t in [0, tMax]
    dt: 0.01,                  // sampling step of t
    stagePad: [24, 0.14],      // margin around the curve: max(px, fraction of the stage's short side), in drawn pixels
    axisAlpha: 0.16,           // dotted axes (construction lines, like the landing spiral)
    trailAlpha: 0.92,          // the drawn curve
    haloR: 3,                  // dithered halo around the curve, drawn pixels
    haloAlpha: 0.42,
    tail: 150,                 // comet length, in samples behind the head
    headR: 10,                 // dithered glow around the head, drawn pixels
    leader: { short: 22, long: 32, narrow: 600 },  // 30° leader to the value label, drawn pixels; short below `narrow` CSS px
    fadeS: 1.6,                // dissolve at the end before it starts over, s
    reducedSpeed: 0.35,        // speed factor with prefers-reduced-motion
  },

  // speed and colour of the trace (the tuning panel edits these live)
  tuning: {
    vmax: 2.4,                 // speed far from a zero, t per second
    vmin: 0.22,                // speed at a zero
    radius: 1.6,               // braking radius around each zero, in t
    tau: 0.8,                  // inertia: time constant of the speed, s (0 = none)
    crad: 1.4,                 // colour radius: |zeta| at which yellow has mostly turned teal
  },

  // tuning panel, TEST ONLY: set to true to load tuning.js and show the RÉGLAGES (TEST) panel in the section
  tuningPanel: false,
  sliders: {                   // range of each slider, and decimals shown
    vmax:   { min: 0.5,  max: 8, step: 0.1,  digits: 1 },
    vmin:   { min: 0.02, max: 2, step: 0.02, digits: 2 },
    radius: { min: 0.2,  max: 4, step: 0.05, digits: 2 },
    tau:    { min: 0,    max: 3, step: 0.05, digits: 2, unit: ' s' },
    crad:   { min: 0.2,  max: 4, step: 0.05, digits: 2 },
  },

  // ---------- lead-in: the approach block the core places just above the section ----------
  // black with the first dots of the Lagrangian's paper rising from below, along a sine; the transition fires once
  // it is fully on screen. Only the tail of the black -> paper ramp is ever shown: it never becomes a paper band.
  leadIn: {
    height: '30vh',            // height of the block: at the trigger the section above keeps the rest of the screen
    dwell: 0,                  // ms the page stops flush at the end of the block before the transition (0 = none)
    black: '#000',             // its own black: pure, so it meets a pure black section above without a step
    from: 1.3,                 // centre of the black -> paper ramp before it grows, fraction of the height (below the
                               // block: nothing shows)...
    to: 0.72,                  // ...and once grown: a sine-wave edge with solid paper along the bottom (the join
                               // below dithers that paper into the maths black)
    start: 0.5,                // scroll progress through the block (0: its top at the bottom of the screen, 1: its
    full: 1,                   // bottom there) at which the paper starts rising, and at which it stops
    ramp: 0.35,                // width of the ramp, fraction of the height
    amp: 0.08,                 // the ramp's 50 % line rides a sine: amplitude, fraction of the height
    wave: 380,                 // its wavelength, CSS px
    drift: 0.25,               // how fast it slides sideways, waves per second
    ragged: 0.03,              // ragged 4-pixel columns, fraction of the height
    fps: 12,                   // stepped on purpose: it glitches, it does not glide
    slow: 2,                   // rate of the slower glitches (ragged columns, coarse bands), per second
    bands: 0.22,               // chance a 4-pixel row band is torn sideways on a tick
    tear: 10,                  // max sideways tear, drawn pixels
    coarse: 0.2,               // chance a row band drops to 4 px blocks for a moment
  },

  // ---------- transition: the Standard Model Lagrangian ----------
  // The Lagrangian is a static page: the equation is wrapped at its operators and sized at run time so that,
  // inside a thin margin, it fills the whole screen. Atoms (one term between two operators) come from an atlas.
  transition: {
    atlasImage: './assets/lagrangian-atlas.png',
    atlasData: './assets/lagrangian-atlas.json',
    atlasWaitMs: 600,          // longest wait for the atlas when the transition starts; past it, plain fade instead
    margin: 0.035,             // page margin, fraction of the short side
    pitch: 1.5,                // minimum line pitch, em
    kFrac: 0.22,               // a line is erased when the line this far below it (fraction of all lines) starts
    seam: { wave: 72, amp: 0.22 },  // seam wobble: wavelength in CSS px, amplitude as a fraction of the ramp
    ramp: { min: 40, frac: 0.12 },  // width of the dithered ramp behind each pen: max(px, fraction of the width)
    write: { min: 3200, max: 6000, perLine: 170 },  // total writing time, ms: perLine * lines, clamped
    speedup: 0.78,             // lines get faster: the last line takes (1 - speedup)^1.5 of the first one's time
    eraseMinMs: 160,           // shortest erase sweep of a line
    // the terms carry the dither too, on the 2 px grid / 8x8 Bayer: a dithered halo of ink around every glyph, and
    // wet ink right behind the write pen that settles over `dry` (fraction of the width). Strokes stay solid once dry.
    ink: {
      halo: { em: 0.22, min: 2 },  // halo radius: max(fraction of the em, CSS px)
      rest: 0.16,              // share of the halo's blocks inked next to a stroke once dry (fades out to its radius)
      wet: 0.5,                // ...and right behind the pen
      fresh: 0.3,              // share of a stroke's blocks inked right behind the pen (1 once dry)
      dry: 0.3,                // settling distance behind the pen, fraction of the width
    },
    captionFrom: 200,          // caption shows from this ms until the writing ends
    reducedMs: 300,            // prefers-reduced-motion (or atlas not loaded in time): plain stepped fade of the old screen
  },
};
