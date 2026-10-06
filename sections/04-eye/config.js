// Knobs for the eye transition (the switch from the CV to the hobby sections) and the midnight swirl page it opens on.
// Walking down: the LEAD-IN (the purple screen whose horizon glow grows as it scrolls in) -> FLOOD
// (overexposes to white, shaking) -> EYE (one monstrous ASCII eye opens, stares, snaps shut) -> COLLAPSE (the white
// shuts onto the eye line). From anywhere else (shell, goTo, the replay button), a RISE over the frozen screen replaces
// the lead-in. Once the transition has played, the lead-in folds into a short purple break for the rest of the visit.
export default {
  // eye drawn on each run: 'random' (one in three), or force 'multi' | 'rings' | 'circles'
  variant: 'random',

  // shared pixel size (CSS px) of the glow and the closing seam, so they line up
  PIX: 3,

  // ---------- LEAD-IN: the end screen of the original, just above the swirl page ----------
  leadIn: {
    bg: '#1B0D2E',     // the original site purple, also the glow's base colour
    dwell: 450,        // ms resting flush at its end, glow flickering, before the flood (the original's wait at the bottom)
    folded: '18vh',    // its height once the transition has played: a short purple break, no glow (vh: the stable screen height of core/viewport.js)
  },

  // ---------- RISE (shell / goTo only): the horizon glow grows out of whatever page was on screen ----------
  rise: 1100,          // ms for env/grow to ramp 0 -> 1 (the old "scroll to the end")
  riseHold: 350,       // ms resting at full glow, flickering, before the flood (the old "at the bottom" wait)
  horizon: 0.6,        // horizon line, as a fraction of the lead-in (= screen) height from the top

  // ---------- horizon glow shader (from effects/horizon-glow.html) ----------
  glow: {
    LEVELS: 7,         // quantized intensity steps (Bayer-dithered between them)
    W: 0.85,           // half-width of the glow, in screen heights
    H: 0.32,           // height of the glow above the horizon
    R: 0.15,           // depth of the reflection below it
    // colour ramp, dark to light (RGB 0..1); past c4 it overexposes to white.
    // Below c1 it fades from leadIn.bg; in the RISE there is no base: quantized 0 is transparent over the frozen page.
    ramp: [
      [0.16, 0.03, 0.07],
      [0.50, 0.20, 0.30],
      [0.82, 0.45, 0.54],
      [0.92, 0.84, 0.64],
    ],
  },
  shake: 7,            // px, peak of the building shake at the end of the flood (whole screen)

  // ---------- the eye. Keep these timings: the pace is "on point" ----------
  T: { flood: 1900, whiteHold: 700, crack: 300, crackHold: 340, open: 220, settle: 160, stare: 1450, snap: 60, closedHold: 150, collapse: 220 },

  colors: {
    night: '#03061A',  // the swirl page's background (its top and bottom edge, for the dithered joins)
    paper: '#FFFFFF',  // the flood white
    ink: '#1B0D2E',    // the eye, in the site purple
  },

  eye: {
    size: [0.3, 0.55], // S = min(W * size[0], H * size[1]); the earlier full-width eye was too big
    glyph: { min: 6, max: 10, cols: 190 },   // font size: about `cols` columns across, clamped to min..max px
    BT: 0.4, BB: 0.3,  // upper / lower lid height when open
    TILT: 0.16,        // outer (right) corner raised
    R: 0.26,           // reference iris radius (pupil and highlight scale to r / R); multi's main iris
    // follow < 1 makes the satellites lag behind the main iris when it darts
    irisSets: {
      multi: [
        { x: 0, y: 0, r: 0.26, follow: 1 },
        { x: -0.5, y: 0.06, r: 0.1, follow: 0.6 },
        { x: 0.46, y: -0.05, r: 0.085, follow: 0.7 },
        { x: 0.3, y: 0.16, r: 0.055, follow: 0.5 },
        { x: -0.3, y: -0.15, r: 0.05, follow: 0.8 },
      ],
      // one wide iris with concentric rings, all one tone, small pupil
      rings: [{ x: 0, y: 0, r: 0.3, follow: 1, rings: [0.36, 0.6, 0.83] }],
      // no iris at all: bare circles drawn straight on the white of the eye, spreading past the lids
      circles: [{ x: 0, y: 0, r: 0.62, follow: 1, bare: [0.07, 0.15, 0.24, 0.34, 0.45, 0.57] }],
    },
  },

  // ---------- COLLAPSE: Bayer-dithered band along the closing edges ----------
  seam: {
    B: 9,              // depth in PIX pixels (9 = about 27 px)
    strength: 0.65,
    ink: [null, [150, 150, 150], [70, 70, 70], [18, 18, 18]],   // light grey, grey, near-black
  },

  // ---------- the midnight swirl page (from sections/balanki.html) ----------
  swirl: {
    intro: 7,          // s, the swirl blooming out of the night; starts once the eye has shut
    still: 20,         // s, the frame shown under prefers-reduced-motion
    dprMax: 2,
    // colour amounts 0..1 and the third colour, as the sliders of the original were left
    amounts: { cream: 0.10, cyan: 0.80, third: 0.20 },
    third: 'pink',     // 'pink' | 'purple'
    thirds: { purple: '#c46cff', pink: '#ff3ff0' },
    tuningPanel: false,   // TEST ONLY: true shows the original's colour sliders (tuning.js)
  },

  // prefers-reduced-motion: white fades in, then out
  reduced: { fadeIn: 200, fadeOut: 250 },
};
