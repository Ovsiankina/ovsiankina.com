// Landing knobs. Paths are relative to this folder.
export default {
  // A6 photos shown in the .618 square, in order. Any size works, they are resampled to the pixel grid.
  photos: [
    'assets/photos/01.jpg',
    'assets/photos/02.jpg',
    'assets/photos/03.jpg',
    'assets/photos/04.jpg',
    'assets/photos/05.jpg',
    'assets/photos/06.jpg',
  ],

  // conventional PDF CV behind the .236 square
  cv: {
    pdf: 'assets/cv-david-mostoslavski.pdf',
    filename: 'CV_David_Mostoslavski.pdf',        // name the browser saves it under
  },

  // Dr Melo's recommendation letter, linked from the Référence block of the CV
  letter: {
    pdf: 'assets/lettre-recommandation-kamilo-melo.pdf',
    filename: 'Lettre_recommandation_Dr_Kamilo_Melo.pdf',
  },

  P: 2,                 // CSS px per drawn pixel, for both canvases (and the transition)
  INTRO_MS: 7000,       // spiral + CV writing
  HOLD_MS: 4200,        // time each photo rests
  TRANS_MS: 1800,       // dither transition between photos
  EASE: [0.55, 0, 0.8, 0.35],   // intro pace, cubic-bezier: starts still, accelerates all the way to the pole
  PHOTO_DITHER: 300,    // photo grain (rest and transitions), Bayer 8x8 per channel: 100 = 12 levels per channel, the step grows
  // with it, 1000 = about 1 bit per channel, 0 = off. Try values live with "photo n" in the ~ shell
  BOTTOM_GAP: 0.02,     // plain bg under the hero, fraction of the screen height: a little scroll before the next section kicks in
  WHEEL_LINE: 16,       // CSS px per wheel "line" (Firefox's line mode), when the CV hands the wheel over to the page

  // the swipe hand on phones (any portrait screen): true = it plays once over the CV header when the intro is over,
  // false = only the "more below" arrows
  PORT_HINT: true,

  // the three "more below" arrows under the rectangle
  MORE: {
    fadeMs: 900,        // dithered fade in, once the intro is over
    periodMs: 2600,     // one levitation cycle
    bob: 1.5,           // how far they drift, in drawn pixels (sub-pixel, through the dither)
    pulse: 0.2,         // how much dimmer at the top of the drift
  },

  // colours, set as CSS custom properties on the section
  palette: {
    bg: '#070707',
    ink: '#ebe7de',
    text: '#a8a39a',
    dim: '#5e5a53',
    geo: '#a3b6cf',     // construction lines, used at low alpha
  },

  // entry transition: Bayer 8x8 dissolve of the frozen screen into bg, on the same 2 px grid
  transition: {
    ms: 900,
    reducedMs: 400,     // prefers-reduced-motion: the frozen screen just fades out
    block: 4,           // block size = 1 + round(block * sin(pi u)) drawn pixels: grows, then shrinks back
    glitchRows: 0.35,   // middle third: chance that a row of blocks slides sideways
    glitchShift: 6,     // how far it can slide, in blocks
  },
};
