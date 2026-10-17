# Sky screenshots: before (base 7f991f9) and after (branch ws/4-sky-aerial-perspective, 7af05f7)

`before/<view>.png` and `after/<view>.png`: the same view at the same moment, 1280 × 720, the app's `SceneManager` (and, near a pad, its `LaunchPadView`) with the real Earth textures (`public/textures`), headless Chromium on SwiftShader (harness: `../sky-harness/README.md`). `pairs/<view>.png`: before above, after below, at ¾ size. The globe's texture is soft at these distances in both sets: the 4096 × 2048 map is ~10 km a texel. Pixel figures are means over the box given (x0–x1, y0–y1), measured by `../probes/sky/fix/measure.py` (log: `measure.log` beside it).

| View | What to look at |
|---|---|
| `limb-day` | 400 km over the tropical Atlantic, looking west at the limb, sun 40° up behind-left. Before: a thick bright white band at the limb over a dark navy disc. After: blue haze over the disc, paling towards the limb into a thinner, dimmer limb glow with a lavender cast (the sky drawn at the scene's sun, 3.3, instead of 8). Brightest limb row (x 600–680): (212, 207, 222) → (160, 152, 177). Is the limb bright enough? |
| `limb-terminator` | 400 km over the Arabian Sea at sunset below, looking north along the terminator. Before: night-side clouds lit grey, white city lights. After: a dark night side with orange city lights, the land in the last sunlight reddened on the left, no haze on the night side. |
| `limb-into-night` | 400 km, looking east from the day side into the night, sun 7° up behind. Before: grey night clouds. After: the night side dark, city lights orange towards the horizon (the long, reddening path). |
| `nadir` | 400 km straight down on Andros and the Bahamas, sun 50° up. Before: near-black navy ocean. After: medium blue ocean, the land paler and bluer; the clouds as before. Ocean (1040–1120, 80–160): (5, 16, 41) → (29, 58, 106); cloud (1040–1120, 560–640): (156, 162, 170) → (156, 160, 170). Is the contrast enough? |
| `ocean-40` | 400 km over the open Pacific, 40° off nadir, sun 50° up. Open ocean (620–700, 560–640): (4, 16, 41) → (33, 65, 116): deep blue ocean under white clouds. |
| `pole-400` | 400 km at 84° N over the Arctic ice, looking 40° down, sun 20° up. Before: neutral grey-white ice. After: the ice lit by the sun and the blue sky through the air, (172, 172, 173) → (167, 161, 163) (600–680, 600–680): a faint mauve cast, the ozone of the model's 550 nm channel. With the reddened sun alone (this branch before the review's fix; the review's own shot, same box) it was pink, (164, 156, 153). |
| `sun-space` | 400 km, the sun 12° over the camera's horizon in black space. The sun, its disc and its glare as before; only the limb strip at the bottom differs (the limb glow dimmer). 23 626 pixels differ, none near the sun. |
| `sun-limb` | 400 km, the sun just over the limb. The sun and its glare as before. The ground in view is on the night side (the sun is 14° under the camera's horizon): before, lit grey-blue by the fill lights; after, dark, with the sunlit band and a red rim at the limb. |
| `alt-30km` | 30 km off the Cape, looking west, sun 35° up, the pad's scene loaded. Before: a dark band of globe under a bright horizon sky. After: the distant ground fades into a bright horizon. Sky 6 rows over the horizon and globe 20 rows under it (x 600–680): (198, 198, 215) over (16, 34, 61) → (190, 190, 209) over (157, 177, 206). The teal lower part is the pad's terrain apron, which the haze does not touch (as before). |
| `alt-30km-nopad` | The same view with no pad in the scene, so the lower part is the globe itself: what the climb shows away from the pad. After: the ground and the clouds pale and washed out (the haze at the sky's tuned illuminance, 7.0, 2.1 × the scene's sun). See the climb options below. |
| `alt-30km-dusk` | 30 km at sunset, looking at the sun. Before: the ground black, clouds lit as by day. After: pink twilight haze over the ground, clouds lit cream-gold by the low sun; the sun as before. |
| `alt-12km` | 12 km over the Cape, looking east over the ocean, the pad's scene loaded. Before: a dark band of globe under the horizon. After: the globe beyond the apron fades into a pale horizon, as from an airliner. The teal lower part of the frame is the pad's terrain apron, not hazed (as before). |
| `alt-12km-nopad` | The same with no pad: the ocean itself fading from blue below into the pale horizon. |
| `pad-dusk-west` | The pad at the Cape, the sun 1.5° below the horizon, looking into the afterglow. Identical before and after (0 pixels differ). |
| `pad-dusk-east` | The same moment, looking east. Identical (0 pixels differ). |
| `ples-pad-dusk` | The pad at Plesetsk (62.9° N) at dusk: 2 pixels differ, by at most 3 levels (globe pixels past the apron). |
| `gradient-limb` | `?sky=gradient`, the 400 km limb: identical (0 pixels differ). |
| `gradient-30km` | `?sky=gradient`, 30 km: identical (0 pixels differ). |

## The owner's options (probes on this branch, not app states)

`options/<view>.png`, the same views with the illuminance forced or the haze's light changed (harness fields `skyIllum`, `hazeIllum`, `illum`; the blend is a probe build of the harness):

| View | What to look at |
|---|---|
| `limb-day-sky8` | Question 1, option (ข): the sky pass at 8 in space, the haze at 3.3. The limb as bright as before ((212, 207, 222) at its brightest row), and a step to the haze two rows below ((132, 144, 175)). Compare `after/limb-day`. |
| `limb-day-haze-half` | Question 1, option (ค): the haze at half (1.65), the sky at 3.3. A darker disc; the haze two rows under the limb (84, 95, 125) under the glow (160, 152, 176). |
| `nadir-haze-half` | Option (ค) at nadir: ocean (17, 38, 74) and cloud (152, 154, 159), against (29, 58, 106) and (156, 160, 170) in `after/nadir`. |
| `ocean-40-illum8` | Why not 8 for both in orbit: the haze at 8; open ocean (71, 113, 172), against (33, 65, 116) in `after/ocean-40`. |
| `climb-30km`, `climb-12km` | Question 2, the climb, four rows each: before; (ก) as built; (ข) the haze at the scene's sun 3.3; (ค) the blend. |
| `alt-30km-nopad-haze33`, `alt-12km-nopad-haze33` | Question 2, option (ข): the haze at 3.3 at every height, the sky as built. The ground and the clouds crisper, and a step under the horizon: from 30 km the globe 20 rows under the horizon is (101, 124, 160) under a sky of (190, 190, 209). |
| `alt-30km-nopad-blend`, `alt-12km-nopad-blend` (and `alt-30km-blend`, `alt-12km-blend` with the pad) | Question 2, option (ค): the haze's light blended from the sky's where nothing shows through (T → 0, the horizon) to the scene's sun where the ground shows through: E·(1 − T) + 3.3·T. No step at the horizon (globe 20 rows under it (138, 169, 205) from 30 km), the ground deeper blue below ((59, 91, 149) against (87, 120, 171) as built, low in the 30 km view). In orbit E is 3.3 and nothing changes (`limb-day`: 0 pixels differ). |

`superseded/`: the first round's after shots, pairs and options (before the review's fixes), and intermediate sets; kept for the record, not for the owner.

## Question 2's option (ค) as a prepared commit (`q2c/`)

Branch `ws/sky-q2c` (`90e5c3a` on `35dadab`): the haze's light E + (3.3 − E)·T in `AERIAL`, not merged. `q2c/<view>.png` is that build; `q2c/built/` is (ก) at `35dadab`; `q2c/before/` is the base `7f991f9`. The no-pad climb views at 20 and 45 km are new: the 30 km view's place, look and sun, the look tipped by the horizon's dip. Figures: `../probes/sky/q2c/compare.log`, `horizon-profile.log` (means of columns 600–680).

| File | What to look at |
|---|---|
| `compare-12km.png`, `compare-20km.png`, `compare-30km.png`, `compare-45km.png` | Before, (ก) and (ค) side by side at full size. The ocean low in the view (row 600): 12 km (69, 109, 161) → (34, 72, 133); 20 km (89, 127, 175) → (56, 92, 151); 30 km (87, 120, 171) → (59, 91, 149); 45 km (83, 110, 158) → (68, 93, 143). The horizon is continuous. A thin cyan band sits under it, plainest at 12 km (the red falls 25–27 levels over the first three rows against 15–20 in (ก)). |
| `alt-12km-nopad`, `alt-20km-nopad`, `alt-30km-nopad`, `alt-45km-nopad` | (ค) alone. |
| `limb-day`, `nadir` | (ค) from 400 km: 0 of 921 600 pixels differ from `q2c/built/` (and from `after/`). |
