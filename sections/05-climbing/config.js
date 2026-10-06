// Climbing section knobs. Times in ms.
export default {
  // every pixel-art layer (wipe, holds, title) shares one grid: 1 art pixel = pix CSS px
  pix: 3,

  // video playback rate (also scales the fall speed at the end of the clip)
  speed: 1.5,
  // the wall: warm cream paper behind everything (scene, area the wipe uncovers, top of the tail)
  paper: '#EEE5D3',
  // electric blue of the wipe band; the title's 4 dithered blues are mixed from it
  blue: '#1238FF',
  // the climber's glyphs and the title's checker drop shadow
  ink: '#1B0D2E',

  T: {
    wipe: 1700,           // the two dithered edges crossing the screen, bottom to top
    pause: 350,           // empty wall before the first hold
    holdGap: 70,          // between two holds starting to dissolve in (reveal order is baked in holds_pack.png)
    holdFade: 380,        // one hold's dissolve
    afterHolds: 250,      // last hold done -> the climber starts
    titleDelay: 2200,     // climber starts -> the title pops
    titleLaterTall: 2500, // extra wait for the title on tall screens (phones), the climber needs the room first
  },

  // end of clip: freeze the last frame and let him keep falling out of the screen, then loop.
  // Measured on the clip: ~150 px/s downward at the last frame, ~90 px per metre (640-px video units)
  FALL: { v0: 150, pxPerMetre: 90, gravity: 1.5 * 9.81 },

  // the wipe: height of the blue band between the two edges, as a fraction of the screen height
  band: 0.1,
  // softness of each dithered edge in art pixels, and how often its raggedness flickers (ms)
  edge: 6,
  flicker: 70,

  // the climber's characters: font size W / fontDiv clamped to fontMin..fontMax on screens at least wideFrom px wide
  // (fontMin below); a source pixel darker than cutoff (luminance 0..255) counts as climber
  ascii: { fontDiv: 180, fontMin: 6, fontMax: 10, wideFrom: 700, cutoff: 238 },
  // tall screens: how fast the view follows the climber, fraction of the gap closed per frame
  focusEase: 0.06,
  // pointer magnet on the title: spring stiffness and damping (per s^2, per s)
  magnet: { stiffness: 70, damping: 13 },

  // screens with width / height below this are "tall": the video covers the screen and follows the climber,
  // the title runs along the diagonal and pops later
  tall: 1.2,
  // title length: wide screens, fraction of the width; tall screens, the longest diagonal that fits inside tallW x tallH
  titleSize: { wide: 0.72, tallW: 0.88, tallH: 0.84 },

  // below the scene: the cream wall glitching out into the site's dark background (tail.js), the page can be scrolled into it.
  // Lengths in drawn pixels (PIX grid) unless noted.
  tail: {
    height: 38,     // % of the stable screen height (core/viewport.js)
    dark: '#070707',// the site's background, what it fades into
    line: 0.5,      // where the 50 % line sits, fraction of the tail's height
    soft: 0.55,     // length of the cream -> dark ramp, fraction of the height
    amp: 0.1,       // the line's slow sine: amplitude, fraction of the height
    wave: 420,      // ... its wavelength, CSS px
    drift: 0.3,     // ... how fast it slides sideways, waves per second
    fps: 12,        // stepped on purpose: the glitches tick, they do not glide
    slow: 2.5,      // how often the raggedness, drips and coarse bands change, per second
    bands: 0.3,     // chance a 4-row band is torn sideways on a given tick
    tear: 14,       // max sideways tear
    coarse: 0.25,   // chance a band drops to 2x2 blocks for a moment
    smear: 0.06,    // chance a 4-px column drips past the line
  },

  // reduced motion: the wipe becomes a plain fade of the previous screen
  reducedFade: 300,

  // size of the clip, and of each half of holds_pack.png (top: hold colours on white footage, bottom: reveal order as grey levels)
  source: { w: 640, h: 360 },
  // relative to this folder
  assets: {
    holds: 'assets/holds_pack.png',
    mesh: 'assets/title_mesh.json',   // base64 of: u32 header length, header JSON {nv, nt}, Float32 positions, Uint16/32 indices
    webm: 'assets/climber.webm',
    mp4: 'assets/climber.mp4',
  },
};
