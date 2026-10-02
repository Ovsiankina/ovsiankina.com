# Plesiosaur ASCII section (STAR at the AI Summit)

Source: phone clip of STAR hanging under the ladder rig, 464x832, 9 s. Text on the right, robot on the left, dithered fade from the text side.

Pipeline (`plesiosaur-pipeline/`):
1. `ffmpeg -vf fps=30 -pix_fmt bgr24 -f rawvideo frames.raw`
2. `runall.py`: ISNet general-use (rembg's `isnet-general-use.onnx`, from GitHub releases) on every full frame, about 1.5 s/frame. It segments the robot very well, rings and head included. No plate or colour model needed.
3. `build.py`: keeps the component under the body (seed at 200,500 in frame 183), and drops the power brick, its cables, the ladder leg, the rung by the head, the ladder beam and the bag. Shading = CLAHE luminance + local detail (rings and struts) + silhouette edge.
4. Loop: frames 183..242 (60 frames = one flipper stroke, 2 s). Frame 242 matches 183 after a (-2,-8) px shift, which is spread linearly over the loop. The seam is about 2x a normal frame step.
5. Crop x 0..416, y 255..741, mirror (head top-left), resize to 208x243, 16 grey levels, 10x6 sheet: about 320 KB PNG.

Camera: the camera moves for the first ~60 frames, then sits still. The robot rocks with every stroke (period 60 frames), and that motion is kept on purpose.

## Swimming version (merged page `work-sections.html`)
The video's robot hangs still, so the swim is built by hand: frames are NOT mirrored. They are rotated by -53° around (230,495) so the tail→head axis (55,715)→(390,270) becomes horizontal and the head points right. Specks under 80 px are dropped, and the frames are resized to 266x156, 10x6 sheet (~235 KB). The page moves the sprite left to right at 56 sheet px/s, with a slow ±1.8% vertical bob (6.4 s) and the same wake trail as the snake.

## Exaggerated fin strokes + ripples
- `fins.py` measures each blade's angle around its shoulder pivot (RU 178,132 / FU 322,140 / RD 192,208 / FD 345,220, in rotated-frame px). The filmed sweep is only ±10..25°.
- `amplify.py` bends each blade around its pivot to TARGET=48° half-amplitude (gain clipped 1.8..3.2): the blade = largest component inside its box, within a ±30° cone, beyond r0. Its root band is bent with a smoothstep, so the shoulder stays attached. Root pixels also stay in place, so the box edges leave no holes. Output: `swim2` sheet 265x153 plus `tips.json` (fin tips per frame).
- Ripples (page side, `cfg.ripple`): a ring is spawned at a fin tip when it moves > minSpeed sprite px/frame, at most once per cooldown. Rings stay put in the water and are drawn as 3 blue glyph levels. The snake uses its tail tip, weaker.
