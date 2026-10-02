# Eye transition: design notes

What David liked, what he rejected, and the knobs to turn. Code: `effects/eye-transition.html`.

## The idea
A "really heavy" transition at the very end of the CV. The purple landing page (#1B0D2E, Space Grotesk + JetBrains Mono, no loader) scrolls down to a full-screen horizon glow. Reaching the bottom floods the glow into white, a monstrous ASCII eye opens on the white, stares, snaps shut, and the page cuts to a completely new dark green page.

## Site philosophy
ASCII / pixel art everywhere. Anything smooth or sharp-edged (a clean white edge, a CSS scale) feels off. Dithering and pixel steps belong.

## Liked
- **Horizon glow flood**: the shader glow (`effects/horizon-glow.html`) rising with scroll, then overexposing through its dithered steps to pure white, with a shake that builds up.
- **Pace of the first version**: "on point". Crack open to a slit, twitch, snap wide, settle, stare, snap shut. Keep these timings (`T` in the script).
- **Gradual apparition**: the closed lid line grows out from the centre while the folds and flesh grit fade in, before the eye cracks open. The first single-eye version appeared too instantly.
- **One single, monstrous eye**, not a pair. Sharp almond, heavy creased lids, clumped lashes, veined sclera, speckled flesh around it. Drawn in `░▒▓█` in the site purple on white.
- **Smaller eye**: the size `S = min(W * 0.3, H * 0.55)` is right; the earlier full-width eye was too big.
- **Cat pupil**: the slit narrowing as it focuses, then blowing wide just before the snap. "A nice touch I'd like to keep." Applies to every variant.
- **Three eye variants, picked at random (1 in 3) on each run**:
  - `multi`: main iris plus four smaller satellite irises that lag behind when it darts. Loved.
  - `rings`: one flat-tone iris with concentric rings that tighten with the pupil. Loved.
  - `circles`: no iris, bare circles drawn on the white of the eye, tiny pupil. The most faithful to the original vision.
- **Closing edge**: the white shuts toward the eye line with ragged, pixel-stepped edges and a **Bayer ordered-dither band** (near-black to grey to light grey), on the same 3 px grid as the glow. Subtle but present. "I LOVE that."
- **Horizon glow** and **dither static** (the other two effects in the project) are loved equally.

## Rejected
- A pair of cartoonish eyes (first version): wanted one monstrous eye.
- A sharp-edged white collapse: against the pixel-art philosophy.
- ASCII characters along the closing edge: they sat on their own text grid and drifted out of sync. Use Bayer dithering on the shared pixel grid instead.

## Knobs
- Timings: `T = { flood, whiteHold, crack, crackHold, open, settle, stare, snap, closedHold, collapse }`.
- Eye size: `S` in `layoutEyes()`; glyph size `fs` there too.
- Variants: `IRIS_SETS` (`multi`, `rings`, `circles`); `#multi`, `#rings`, `#circles` in the URL force one, `#eyes` jumps to the end.
- Seam band: `B` (depth in 3 px pixels, 9 = about 27 px), strength `D = 0.65 * ...`, colours `SEAM_INK`.
- Glow pixel size: `PIX = 3`, shared by the glow and the seam so they line up.

## Before shipping
Remove the test-only eye picker: the `.dev-panel` CSS, the `dev-panel` div, the "TEST ONLY" script block, and the two `devPanel` lines at the top of `frame()` (removing the rest without those makes `frame()` throw).
