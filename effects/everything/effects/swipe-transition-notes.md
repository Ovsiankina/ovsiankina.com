# Swipe transition: previous section -> KM-RoBoTa

Code: the "transition" block in `effects/work-sections.html`. It reuses the frame logic of `effects/agnathax-loader.html` unchanged; only the colours are reversed.

- **Reversed colours:** the snake robot, its wake and the fish swim on the purple of the previous section (`--prev-bg`, #1B0D2E for now; theme not decided). The ASCII wall chasing them uncovers the black KM-RoBoTa section. The wall glyphs are greys (`.sw-near`, `.sw-far`), because the wall belongs to the black section.
- **Trigger:** scrolling *down* past the bottom of `#prev` (the top of `#kmr` enters the screen). Re-armed once `#prev` fills the screen again, so it plays on every downward pass.
- **Seamless start:** the page is snapped so `#prev` sits flush with the bottom of the screen, and that view is cloned into the overlay (`.ghost`; canvases are copied by drawImage). Then the page jumps under the cover to `#kmr`. All of this happens in one frame, so nothing flashes.
- **Scroll lock (like the eye transition):** `overflow: hidden` on `<html>`, plus `preventDefault` on wheel, touchmove and scroll keys while it runs. `scrollbar-gutter: stable` stops the page shifting when the scrollbar disappears.
- **One snake at a time:** `kmrSection.hold(true)` parks KM-RoBoTa's own snake off-screen during the swipe. `hold(false)` starts its crossing from the right once the wall has passed.
- **Knobs:** `CONFIG.swimSeconds` (3.6 s, about 4.7 s in total). Direction: 60° on desktop, straight down on portrait screens (same as the loader). `SWIPE.start()` in the console replays it.
- **Reduced motion:** no transition, plain scrolling.
- **Seam on the way back up:** the bottom 84 px of `#prev` hold a canvas (`.seam`) that Bayer-dithers purple into black on the 3 px grid. The 50 % line follows a sine, and the whole ramp rides it, so no straight edge is left. Knobs: `SEAM = { height, wave (wavelength px), amp }`. The snapshot copies this canvas too, so the transition's first frame matches.
