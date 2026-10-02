# Climbing / bouldering transition: design notes

Validated by David on 2026-10-01 ("close enough to perfect, slight mistakes give charm").
Code: `effects/climbing-transition-engine.js` (the whole effect, plain JS) and `effects/climbing-transition.html` (standalone page; needs an `assets/` folder next to it and must be served over HTTP).
Live canvas: Claude Design artifact "Climbing transition" (desktop 1440x900 + phone 390x844 artboards).

## The sequence
1. **End of the previous page** (dark green #08170F, Space Grotesk + JetBrains Mono): "Ready to climb up?" (tweak: "Ready to go higher?"). Scrolling to the bottom (400 ms dwell) or the `climb ↑` button starts it.
2. **Double dithered wipe, bottom to top**: two ragged Bayer-dithered edges moving at the same speed with a band between them (10% of the screen height) in electric blue **#1238FF**. A procedurally rendered ASCII fish swims across the band (white glyphs). Green → blue → white. 1.7 s, PIX = 3 grid like the rest of the site.
3. **Holds appear one by one** on the white wall, bottom to top with a little shuffle, each one dissolving in through a Bayer threshold, colours posterised to 4 levels per channel.
4. **The climb**: the video cut-out of David rendered as ASCII (ramp ` .:-=+*#%@`, ink #1B0D2E, white knockout behind each glyph so he climbs on a pure white wall). Plays at 1.5x. **End of the clip**: the last frame (him starting to drop off the top) freezes and the whole ASCII figure keeps falling at 1.5x gravity (from his measured speed, ~90 px/m in 640-px video units), stepping whole text rows, until he is off screen; then the clip restarts. Hides the loop seam. Phone: video "cover" fit with the camera following the climber horizontally.
5. **"BOULDERING" title** (was "CLIMBING"; David's call, it's what he does) in **Pilowlava 3D** (the real meshes by Vincent Wagner / Studio Brot, Free Art License 1.3; glyphs b1 o1 u1 l d1 e1 r i n1 g1, one Catmull-Clark subdivision). WebGL, lit and Bayer-dithered to 4 blues on the PIX grid, with a 50% checker drop shadow. Pops 2.2 s after the climber appears with a springy scale + Y-axis pivot.
   - **Mouse repel**: the side of the word nearest the cursor pivots away (Y axis, plus a small X tilt and a push away), spring-smoothed. Slight on purpose.
   - **Phone**: the word runs along the diagonal (bottom-left to top-right) so it stays readable, and pops 2.5 s later than on desktop.

## Liked
- The whole idea and pace on first sight ("incredible").
- The double wipe with the blue band and the ASCII fish.
- Pilowlava 3D dithered in blues; the pop; the repel.

## Asked for and done (keep these)
- Purple holds +50% saturation (purple hues only) so they read when dithered.
- The **start hold** is white with a purple rim: rebuilt from its rim and tinted lilac so it reads on the white wall.
- **Only the route matters**: holds he touches are kept; at the sides only big holds/volumes stay. No small side holds, no bare wall, no thin cracks, no white volumes (they turn into grey noise when dithered).
- The **three stacked triangular volumes** (top-left) must look like siblings: same dark tone, full triangle outline (the top one is traced by hand).
- The **grey ring jugs** at the top are part of the route: shown solid (no hole, they're descent jugs) and slightly darkened. The top one sits at the very top edge (the ceiling exclusion only applies from x≈720 at 960 px).
- The **tiny grey hold above the purple hex** (right hand) is drawn a bit bigger than life and in **route purple**, for clarity.
- **Feet must stay stable**: no flicker, no blobs. Over the green/yellow/black volume a local fix keeps the shoe (lighter or rubber-dark) and drops the leg's shadow on the black volume.

## Rejected
- Feet changing shape or disappearing frame to frame.
- Holes in holds (chalk bites, glossy faces of black volumes).
- Grey wall pieces glued to holds (e.g. the triangle under the green hold).
- Showing the wall or small holds outside the route.
- A title too small to read on phone.

## Knobs
- Engine `T`: `wipe` 1700, `pause` 350, `holdGap` 70, `holdFade` 380, `afterHolds` 250, `titleDelay` 2200, `titleLaterTall` 2500 (ms).
- `opts.speed` (video playback, default 1.5), `opts.blue` (#1238FF), `opts.ink` (#1B0D2E).
- Title width: 72% of the screen on wide screens; on tall screens the longest diagonal that fits inside 88% x 84% of the screen.
- `FALL` in the engine: `v0` 150 (px/s at the last frame, 640-px units, scaled by `opts.speed`), `pxPerMetre` 90, `gravity` 1.5 x 9.81.
- `#climb` in the URL (standalone page) skips straight to the climb.
- Testing: serve with a server that supports HTTP Range (`npx http-server`), not `python -m http.server`, or the video can't seek.

## Assets (not in the project: binary)
- `assets/climber.webm` + `climber.mp4`: 640x360, 30 fps, David cut out on pure white, source 3.3 s → 53.2 s of IMG_2346.mov (the camera gets knocked when he lands).
- `assets/holds_pack.png`: 640x720; top half = hold colours on white, bottom half = hold index (reveal order) in grey levels.
- `assets/title_mesh.json`: base64 of a small binary (header JSON + Float32 positions + Uint16 indices).
- They live in the Design canvas's asset store and in David's local `climbing-transition-folder.zip`.

## How the cut-out was made (pipeline in `effects/climbing-pipeline/`)
Reference scripts, run in order from one working folder (they expect `frames960.raw` = the video decoded at 960x540, 30 fps, BGR):
1. `align.py`: ORB + RANSAC similarity transform of every frame onto the empty wall (the phone moved a few px).
2. `seg3.py`: clean plate = median of aligned frames 60–96 (2.0–3.2 s, before he walks in), shift-tolerant Lab difference.
3. `pass1.py` → `mask_old.npy` (plain classical masks), `pass2.py` + `metrics.py` → `mask_final.npy` (hysteresis growth, shadow removal, persistence for still limbs, temporal gap fill).
4. `u2.py` + `u2rest.py`: u2net_human_seg (rembg's ONNX from GitHub releases) on a crop around him, every 2nd frame → `ml_prob.npy`.
5. `pass3.py` → `mask_ml.npy`: the model only *adds* shoe pixels near the lower body (shoes on black volumes, grey shoe on white wall); then the temporal fill from `metrics.py` → `mask_ml_t.npy`.
6. `volfix.py` + `volfix_all.py` → `mask_vol.npy`: local fix over the green/yellow volume (x 140–350, y 230–460 at 960 px, frames 120–740), 11-frame majority vote.
7. `render_video.py` → `climber.mp4`; then `ffmpeg -c:v libvpx-vp9 -crf 40` → `climber.webm`.
8. `holds3.py` → `holds_pack.png` (needs `union.npy` = union of his masks after frame 75, i.e. the route corridor). Local patches for the start hold, the triangles, the ring jugs and the tiny purple hold are at the end.
9. `objx.py` + `build_title.py` → title mesh from `PILOWLAVA 3D_basich latin western_obj.obj`.
10. `build_artboards.py` (Claude Design `.dc.html` artboards) and `build_standalone.py` (single-file and folder pages).
