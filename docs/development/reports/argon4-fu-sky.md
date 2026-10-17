# Argon4 follow-up: the sky's aerial perspective / มองโลกและเมฆผ่านอากาศของท้องฟ้า

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ใต้ท้องฟ้าแบบคำนวณการกระเจิงแสง ตอนนี้มองเห็นพื้นโลกและเมฆผ่านอากาศชั้นเดียวกับที่ใช้วาดท้องฟ้า (aerial perspective)
>   - จากวงโคจรมีหมอกสีฟ้าคลุมพื้นโลก หนาขึ้นเรื่อย ๆ เมื่อมองไปทางขอบโลก
>   - จากที่สูง 12–30 กม. พื้นที่ไกลจางหายเข้าไปในขอบฟ้า แทนที่จะเป็นแถบมืดใต้ขอบฟ้าอย่างเดิม
>   - แสงบนพื้นและเมฆแดงขึ้นและมืดลงเมื่อดวงอาทิตย์ตก ด้านกลางคืนไม่มีหมอก และเมฆกลางคืนไม่เรืองเป็นสีเทาอีกแล้ว
> - รอบแก้หลังการตรวจ:
>   - พื้นโลกได้แสงจากท้องฟ้าสีฟ้าด้วย ไม่ใช่แสงอาทิตย์ที่แดงลงอย่างเดียว น้ำแข็งขั้วโลกตอนแดดสูง 20° จึงไม่เป็นสีชมพูอีก (ยังเหลือสีม่วงอ่อนเล็กน้อยจากโอโซนในแบบจำลอง 3 ความยาวคลื่น)
>   - ดวงอาทิตย์และแสงจ้ารอบดวงในอวกาศกลับมาสว่างเท่าเดิม (รอบแรกหรี่ลงโดยไม่ได้ตั้งใจ)
>   - แก้ตัวเลขที่ผิดในรายงาน (อัตราส่วนสีจากโอโซน) และปรับเทสต์ให้เข้มขึ้น
> - ความสว่างของอากาศในอวกาศลดจาก 8 เหลือ 3.3 ให้เท่ากับแสงอาทิตย์ที่ส่องพื้นโลก แสงขอบโลกจากวงโคจรจึงบางและหรี่ลงกว่าเดิม
> - ท้องฟ้าแบบไล่สี (`?sky=gradient`) และภาพที่ฐานปล่อยแหลมคานาเวอรัลเหมือนเดิมทุกพิกเซล (ที่เพลเซตสค์ต่าง 2 พิกเซล ไม่เกิน 3 ระดับ)
> - บน SwiftShader เฟรมเร็วกว่าเดิม 7–23% เมื่อมองจากวงโคจร ที่ระดับต่ำเท่าเดิมหรือเร็วขึ้นเล็กน้อย ไม่ได้เพิ่มการลดคุณภาพอัตโนมัติใหม่
> - ขนาดแอปหลัก 2643.2 → 2642.9 kB (เพดาน 2645) ไม่ได้ขึ้นเพดานใด เทสต์ในเบราว์เซอร์ทั้ง 4 ตัวรันใหม่บนบิลด์สุดท้ายแล้วผ่านทั้งหมด
> - **รอเจ้าของตัดสิน 3 ข้อ:**
>   1. หน้าตาจากวงโคจร: อนุมัติตามที่เป็น หรือให้ขอบโลกสว่างเท่าเดิม หรือให้หมอกบางลง
>   2. หน้าตาระหว่างไต่ระดับ 12–72 กม.: ตอนนี้พื้นและเมฆจางมากที่ 20–45 กม. เสนอทางผสม (ค) ที่ขอบฟ้าต่อเนื่องและพื้นเข้มขึ้น ภาพอยู่ใน `options/climb-30km.png` และ `climb-12km.png`
>   3. จะแยก PR ให้งานบีบข้อความ shader (ผลลัพธ์เหมือนเดิมทุกตัว) ไปก่อนหรือไม่

- **Request:** the owner's answer 7 of 2026-10-17, on the before/after screenshots of claim 19, verbatim "ทำให้ดูดีและสมจริงขึ้น" (DECISIONS.md, "Decided 2026-10-17 (Argon4 review follow-up, chat)", row "the sky": "The sky change of claim 19 stands, and the sky is to look better and more realistic"). The bending shader waits ("รอไปก่อน") and is not touched.
- **Base:** `7f991f9` (origin/main `b16b09e` + the owner's decisions commit). Branch `ws/4-sky-aerial-perspective`, from the hand-over patches of `docs/development/handover/2026-10-17/4-sky-aerial-perspective/` (on `claude/bold-johnson-haeu8t`), applied with `git am -3`.
- **Commits:**
  - `8fd579b` the shaders' text compacted, identical GLSL (kept as handed over);
  - `842bb83` the aerial perspective (code and tests); `bf610cf` PHYSICS §12 and the user guide; `05c242f` this report and the change fragment (first round; the hand-over's WIP commit is replaced by these);
  - review round: `56a015e` the ground lit by the sky as well as the sun; `a808e74` the sun's disc and glare keep their brightness in space; `7af05f7` two tests' bounds and name; `8f44bf5` PHYSICS §12 and the user guide; and the commit carrying this report.
- **Change type:** render (a look change) on top of an identical-output commit; see question 3 about the PR split. It waits for the owner's approval of the look.

## Review round

Two reviewers (a shader lens and a visual lens) read the first round. Each finding was checked before anything was changed:

| Finding | Checked | Done |
|---|---|---|
| The report's ozone limb ratios, 0.87 and 0.70, are not what `tests/probe/aerial-nadir.probe.ts` prints (blocking: a false number) | Re-ran the probe: R/G 0.833 with the ozone, 0.670 without | Corrected below |
| The sun in space 2.4× dimmer, its glare much smaller; not in any view or line; the SKY_FRAG comment's figures false above 12 km (should fix) | The sky pass drew the disc and glow with the air's illuminance; `probes/sky/fix/sun-glow.mjs`: disc centre 400 → 165, glow 2.8 → 1.16, over the bloom threshold within 0.61° → 0.23° | Fixed (`a808e74`): the disc and glow take their own illuminance, 8 at every height. `sun-space` now differs from the base only along the limb (23 626 pixels); the comment gives the figures. Views `sun-space`, `sun-limb` added |
| Below 72 km the haze is lit 2.4–1.6× brighter than the ground and clouds under it; the 12 and 30 km views hid it behind the pad's terrain patch; INDEX.md misdescribed the 12 km foreground (should fix, both reviewers) | `probes/sky/fix/illum.mjs`: E = 8, 6.98, 5.30 at 12, 30, 45 km (2.42, 2.12, 1.61 × 3.3). No-pad views confirm the wash-out at 30 km | Stated in PHYSICS §12; no-pad views and three options rendered; question 2; INDEX.md corrected |
| White ground pink at a middle sun: the direct sun reddened, no blue sky light (should fix) | `tests/probe/skylight.probe.ts`: white ground, sun 20° up, blue/red 0.749; the review's pole shot (164, 156, 153) | Fixed (`56a015e`): the sky's irradiance table and `daylight`; 0.889; the ice (167, 161, 163). The faint mauve left is the model's ozone (below, known limits) |
| The glint not reddened (nit) | Code read | Fixed in `56a015e` |
| PHYSICS "3·10⁻⁴ at noon" is the float64 integral, not the GPU's table (nit) | — | `sunColour` is now the table over the table at noon: exactly 1 on the GPU. The sentence is gone |
| The float32 far-end bounds 11–28× the error (nit) | `tests/probe/far-end.probe.ts`: 0.36 m (400 km), 1.44 m (36 000 km) | Bounds 1 m and 4 m (`7af05f7`) |
| The shell test's origin-and-height loop cannot fail on either; the report said "pinned more strongly" (nit, both) | `atmoMesh.visible` is set only in `setPhysicalSky` | Renamed to what it checks (`7af05f7`); the table below says so |
| USER-GUIDE "thin bright blue line" (nit) | Limb row (160, 152, 177) | "a thin blue line" (`8f44bf5`), true under any answer to question 1 |
| "The pad identical" holds at the Cape, not at Plesetsk (nit) | `ples-pad-dusk`: 2 pixels, at most 3 levels | Said so below and in the fragment |

## What changed for the user

Under the scattering sky (the default where the GPU has float targets):

- **From orbit** the planet is seen through its air: a blue haze over the disc, faint at nadir and thickening towards the limb, where it runs into the sky's own limb glow. Open ocean is deep blue instead of near-black navy; land is paler and bluer than before.
- **The limb glow from orbit** is thinner and dimmer than before, drawn at the scene's own sun (illuminance 3.3) instead of 8. It has a faint lavender cast at the horizon: the ozone layer takes the green on the long grazing path. With the ozone switched off, the model's red-to-green ratio 0.05° inside the limb would be 0.67 instead of 0.83 (`tests/probe/aerial-nadir.probe.ts`).
- **The ground is lit by the sun and the sky:** the direct sun reddened by the air, and the blue sky's own light, so white ground and ice stay near white under a middle sun and redden only where the sun is low on the relief. A level surface keeps the twilight sky's light for a while after its sunset.
- **From 12–30 km** the distant ground fades into a bright horizon, as from an airliner or a stratospheric balloon. Before, a dark band of globe sat under a bright horizon sky. From 20 to about 45 km the ground and the clouds below read pale and washed out (question 2; `alt-30km-nopad` here, and the visual review's sweep at 20 and 45 km shows the same).
- **Near the terminator** the ground and the clouds are lit by sunlight reddened and dimmed by the air. Past their sunset they are dark: the night side has no haze, and its clouds are no longer lit grey by the scene's fill lights. City lights near the horizon are orange (the long path takes the blue).
- **Unchanged:** the sun's disc and its glare at every height; the gradient sky (`?sky=gradient`, the frame-rate fallback, GPUs without float targets); both views at the Cape's pad (0 pixels differ); at Plesetsk's pad at dusk 2 pixels differ, by at most 3 levels.

## How it is computed

`AERIAL` (src/render/atmosphere.ts) is used by the globe's shader and patched into the clouds' Lambert material (src/render/scene.ts). Per fragment, from the camera o (relative to the Earth's centre) along the view direction d:

- **The stretch.** tc = −o·d, rp² = |o + d tc|²; tStart = max(0, tc − √(RT² − rp²)); tEnd = tc − √(rEnd² − rp²) when rp² < rEnd², else tc (the ray's perigee). rEnd = RG for the ground, RG + 9 km for the clouds. It ends on the sphere, not on the fragment: the globe's 128 × 96 facets lie up to 2.8 km under its sphere and the clouds' 96 × 64 up to 5.3 km (measured, `tests/probe/facets.mjs`), and ending on them would scallop the haze at the limb.
- **The samples.** N = 10 for the globe, 6 for the clouds, placed from the far end: s_i = −(1 − i/N)² · len, so they crowd where the air is densest on any ray that ends on the ground.
- **Each step** (Hillaire 2020 §6, with the sky pass's model: Rayleigh 5.802/13.558/33.1·10⁻⁶ m⁻¹, H = 8 km; Mie 3.996/4.40·10⁻⁶ m⁻¹, H = 1.2 km, Cornette–Shanks g = 0.8; ozone 0.650/1.881/0.085·10⁻⁶ m⁻¹ in a tent about 25 km):
  - S = (σ_R(h) P_R(θ) + σ_M(h) P_M(θ)) · T☉(h, μ☉) + (σ_R(h) + σ_M(h)) · Ψ(h, μ☉);
  - L += T · S · (1 − e^(−σ_t Δs)) / σ_t, then T ·= e^(−σ_t Δs).
  - T☉ is the transmittance table faded over ±0.004 in μ☉ about the geometric horizon (the sky pass's `sunlight`, now shared); Ψ is the multiple-scattering table (ground albedo 0.3).
- **The surface seen:** c' = c · T + L · E, E the sky pass's illuminance.
- **The ground's own light** (`daylight`, review round): (max(cos i, 0) · T☉(μ☉) + E_sky(μ☉)) / (T☉(1) + E_sky(1)), relative to noon, i the sun's angle to the relief.
  - E_sky(r, μ☉) = ∫ L(ω) cos θ dω over the upper hemisphere, per unit of solar illuminance: a third table (`SKYLIGHT_FRAG`, 64 × 16 over μ☉ and the height, texels on both ends), filled once after the multiple-scattering table. 8 × 8 directions spread as cos θ is (sin²θ in equal steps, each weighing π/64) over half a turn of azimuth, each marched to the top of the atmosphere in 16 steps crowding towards the surface, with the sky pass's model.
  - Against a fine integral of the same model (32 × 32 directions, 200 steps), from the sun overhead to 4° below the horizon, it errs by at most 0.33 % of noon's light on the ground and 0.21 % at 9 km (tests/render-aerial.test.ts).
  - The globe's day term is day · (0.09 + 0.95 · daylight). Level ground at noon is drawn as before. A white surface with the sun 20° up: blue at 0.749 of red with the reddened sun alone, 0.889 with the sky's light. Once the sun is 8° below the horizon the sky's light is under a thousandth of noon's.
- **The sunlight alone** (`sunColour(r, μ☉)` = T☉(r, μ☉) / T☉(r, 1), the same table over itself at noon) for the sun glint and the clouds. With the sun 4° up: 0.52/0.22/0.05 on the ground, 0.77/0.52/0.38 at the cloud tops (`tests/probe/skylight.probe.ts`). The clouds' lit colour is multiplied by it: their light is three's Lambert shading, and their reddening at a low sun is the sunlight's.
- **The illuminance E** = 3.3 + (8 − 3.3) · g, g = 1 − smoothstep(12 km, 72 km, h_cam) (sky.ts's ground factor), for the sky pass's scattered light and the haze alike. That is 8 on the ground (the sky's tuning against the gradient sky it replaced) and the scene's own sun 3.3 in space (SUN_INTENSITY; a Lambert surface of albedo ρ under it is 3.3ρ/π ≈ 1.05ρ, the globe's 0.95 + 0.09). At 8 from orbit the haze was 2.4× what lights the ground under it. Below 72 km it still is: E/3.3 = 2.42 at 12 km, 2.12 at 30 km, 1.61 at 45 km (`probes/sky/fix/illum.mjs`).
- **The sun's disc and glow** (review round) take their own illuminance, `uSunDisc`, 8 at every height as before: they stand for the lens's glare, not the air's light. At 8 the glow peaks at 2.8, over the bloom's threshold of 1.0 within 0.61° of the centre; the disc's centre is 400.
- **The sky pass** no longer marches a ray with tc > 0 whose perigee is more than 10 km inside the Earth's sphere (the globe covers it and carries its haze). Every ray the faceted globe may leave uncovered at its limb is still marched; the test replays this in float32 from 2 m, 30 km, 400 km and 36 000 km.
- **Off under the scattering sky:** the globe's Fresnel rim and the old 110 km shell, both the gradient sky's stand-ins for this haze. A cloud texel with alpha under 1/255 is discarded before the march.

**Checks of the model's strength.** Looking straight down from 400 km with the sun 50° up, the march (with Ψ) gives the path reflectance πL/(E cos θ☉) = 0.024/0.052/0.127 at 680/550/440 nm, and T = 0.94/0.87/0.77. Single scattering alone is 0.075 at 440 nm. The thin-layer estimate is τ P/(4 μ μ☉) = 0.265 × 1.19/(4 × 0.766) = 0.10 before the two paths' attenuation, (1 − e^(−τm))/(τm) = 0.75 for m = 1 + 1/μ☉. With the multiple-scattering table's ground albedo at 0.1 instead of 0.3, the 440 nm figure would be 0.111. So the haze over the disc in orbit is what the sky's own model gives, not a tuning (`tests/probe/aerial-nadir.probe.ts`, re-run in the review round with the same output). Below 72 km it carries the sky's ×2.1–2.4 tuning (above).

## The old shell test: what is still pinned

tests/render-atmo-shell.test.ts had 6 tests at the base and has 6 now.

| Old test | Now |
|---|---|
| follows the sky: disc only under the scattering sky, whole under the gradient | **Still pinned**, for the new behaviour: the shell is not drawn under the scattering sky and drawn whole under the gradient, through `setPhysicalSky` both ways. |
| without float targets there is no scattering sky, and none is reported | **Still pinned** (and the shell stays drawn). |
| is told where the Earth is under the floating origin (`atmoMat.earthCentre`) | **Still pinned, moved:** the shell no longer reads the Earth's centre, so the test checks the globe's `earthCentre`, which the aerial perspective reads, and both shaders' `camPos`. |
| the discard stands in the shell shader as replayed | **Retired with the discard.** The shell shader is now checked to carry no cut (`discard`, `discOnly`) and to keep its band and alpha lines; the gradient sky's rim gains are checked through `update`. |
| drops a ray that clears the Earth, keeps one on the disc, at any floating origin (float64 and float32) | **Retired with the cut**, whose float32 arithmetic no longer exists. What it protected, no second band at 60–110 km over the sky's limb, now rests on the shell not being drawn under the scattering sky (the first row). A visibility check takes its place: `update` at the old test's three floating origins and three heights (400, 2000, 35 786 km) leaves the shell hidden under the scattering sky and shown under the gradient. It cannot fail on the origin or the height themselves, only on `update` touching the visibility; its name says so since the review round. The haze on the disc, which the cut kept, is now the aerial perspective's, and its float32 ends are tested in tests/render-aerial.test.ts. |
| the gradient sky's colour reaches the scene target linear | **Unchanged.** |

## Tests run

All on this branch unless marked base; vitest with `--maxWorkers=2`, files named:

- `tests/render-aerial.test.ts`: **22 passed** (19 in the first round). It covers:
  - the GLSL lines as replayed, in the globe's shader and the clouds' patched Lambert shader;
  - the shared uniforms and tables;
  - the sky switch and the rim;
  - the one illuminance for the sky pass and the haze, and the sun's disc at 8 at every height;
  - the march against an independent fine integral (asserted bounds; measured below);
  - the night side;
  - `sunColour` at noon, low and set; the glint;
  - the sky's light: its table's pass as replayed, filled after the multiple-scattering one; the table's scheme within 0.33 % (ground) and 0.21 % (9 km) of noon's light of a fine integral, asserted under 0.5 %; level ground at noon, under a 20° sun (blue/red 0.749 → 0.889, asserted < 0.76 and > 0.88) and after the twilight;
  - the far end in float32 from 400 km and 36 000 km (within 0.36 m and 1.44 m, asserted under 1 m and 4 m), and at the perigee;
  - the sky pass's skip, in place and in float32 from 2 m, 30 km, 400 km and 36 000 km, and the globe's facets under 3 km.
- `tests/render-atmo-shell.test.ts`: **6 passed** (6 at the base; see above).
- The 23 test files that import `src/render/`, `tests/architecture.test.ts` and `tests/repo-hygiene.test.ts`: **25 files, 292 tests passed** (first round: the same 24 without hygiene, 280; hygiene 9; base, without render-aerial: 23 files, 261).
- `npx tsc --noEmit`: clean.
- Probes (gitignored, `tests/probe/`):
  - `aerial-errors.probe.ts`: the errors and the worst rays;
  - `aerial-nadir.probe.ts`: the path reflectance, with the multiple-scattering table ported; the limb hue with and without the ozone; white ice under a 20° sun with and without the ozone (review round);
  - `skylight.probe.ts` (review round): the sky's light on level ground and at 9 km against the direct sun, the table's scheme against a fine integral, `sunColour` over the table at noon;
  - `far-end.probe.ts` (review round): the float32 far end's error;
  - `suncolour.probe.ts`, `facets.mjs` (first round).
- Scripts in `/tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/probes/sky/fix/`: `sun-glow.mjs`, `illum.mjs`, `measure.py`, `climb-metrics.py`, with their logs.

**The march against the fine integral** (single scattering; errors of L relative to the ray's brightest channel, of T relative to T; 36 rays per case):

| Case | L worst | L RMS | T worst | T RMS | Worst ray |
|---|---|---|---|---|---|
| ground from 400 km, N = 10 | 4.74 % | 1.36 % | 4.48 % | 2.66 % | L: 1° inside the limb, sun 5° up ahead; T: 0.2° inside the limb (1.6 % of the blue through) |
| ground from 30 km, N = 10 | 1.57 % | 0.61 % | 1.87 % | 0.89 % | 1° inside the limb, sun 5° up ahead |
| clouds from 400 km, N = 6 | 4.60 % | 2.71 % | 3.50 % | 1.96 % | L: at nadir, sun 60° up; T: 0.2° inside the limb |

These are the figures PHYSICS §12 quotes; the test asserts them under 6 %, 2 %, 6 %, 3.5 % (400 km), 3 %, 1 %, 3 %, 1 % (30 km) and 6 %, 3.5 %, 5 %, 2.5 % (clouds).

## Screenshots

Harness: `/tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/sky-harness/` (README there). It renders the app's `SceneManager` (and, near a pad, its `LaunchPadView`) with the real Earth textures, 1280 × 720, in headless Chromium on SwiftShader. Before is base `7f991f9`, after is this branch at `7af05f7` (the code as it stands). Every pair is the same view at the same moment.

- PNGs: `/tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/sky-shots/before/` and `.../after/`.
- Stacked pairs: `.../pairs/`. The owner's options (probes): `.../options/`.
- `.../INDEX.md` says what to look at in each, with the box each pixel figure below is the mean of.
- The first round's after shots, pairs and options: `.../superseded/`.

| View | Pixels changed | What is seen |
|---|---|---|
| `limb-day` (400 km, sun 40°) | 393 057 | Haze over the disc paling to the limb; the limb glow's brightest row (212, 207, 222) → (160, 152, 177) |
| `limb-terminator` (400 km, sunset below) | 351 332 | Reddened day side, dark night side with orange lights; before, grey night clouds |
| `limb-into-night` (400 km, sun behind) | 406 348 | Night side dark; city lights orange towards the horizon |
| `nadir` (400 km over the Bahamas, sun 50°) | 921 600 | Ocean (5, 16, 41) → (29, 58, 106); cloud (156, 162, 170) → (156, 160, 170) |
| `ocean-40` (400 km, 40° off nadir) | 921 600 | Open ocean (4, 16, 41) → (33, 65, 116); at illuminance 8 it would be (71, 113, 172) |
| `pole-400` (400 km at 84° N, sun 20°) | 826 549 | Ice (172, 172, 173) → (167, 161, 163): near white, a faint mauve; pink (164, 156, 153) before the review round's fix |
| `sun-space` (400 km, sun 12° up) | 23 626 | Only the limb strip: the sun and its glare as before |
| `sun-limb` (400 km, sun just over the limb) | 364 866 | The sun as before; the night-side ground in front dark instead of lit grey-blue |
| `alt-30km` (sun 35°, the pad's scene) | 921 600 | Sky 6 rows over the horizon and globe 20 rows under it: (198, 198, 215) over (16, 34, 61) → (190, 190, 209) over (157, 177, 206); the teal foreground is the pad's apron |
| `alt-30km-nopad` | 921 600 | The globe itself below: pale and washed out (question 2) |
| `alt-30km-dusk` (sun 1° down) | 919 432 | Pink twilight haze over the dark ground, clouds cream-gold; before, black ground and clouds lit as by day; the sun as before |
| `alt-12km` (sun 30°, the pad's scene) | 453 559 | The globe beyond the apron fading into a pale horizon instead of a dark band; the teal lower part is the apron |
| `alt-12km-nopad` | 453 559 | The ocean itself fading from blue into the pale horizon |
| `pad-dusk-west`, `pad-dusk-east` (the Cape) | 0 | Identical |
| `ples-pad-dusk` (Plesetsk) | 2 | At most 3 levels |
| `gradient-limb`, `gradient-30km` | 0 | Identical |

I looked at every pair and checked for the faults the hand-over listed:
- No speckles: isolated pixels standing 40 out of their 5 × 5 median are fewer after than before, or the same, in every view but `alt-30km` (75 → 76) and `sun-space` (575 → 579, stars); they are the stars, the city lights and the pad's structures (`speckle.log`).
- No banding, and no black or cut horizon.
- No faceting at the limb, and no seam at the cloud layer.

Two things look different from photographs and are the owner's call (questions 1 and 2):
- The limb glow from orbit is fainter and less blue than the bright white band before, with a lavender cast at the horizon.
- From 20 to about 45 km the ground and the clouds under the haze are pale and washed out.

At nadir the land is paler and bluer than in ISS photographs. The haze's strength there is the model's (above). Against it stand the day map's colours, which are dark: open ocean decoded to linear is about 0.05 in blue (first round's measurement of the map).

Known limits, not changed here:
- The pad's 13 km terrain patch and its 90 km apron are drawn by three's fog, not through the haze. From 12–30 km they show as a teal foreground, with a soft edge where the hazed globe begins (as before, where the globe was unhazed).
- At dusk from 12–72 km the clouds take the sun's camera-local low-sun tint (`SUN_LOW`, as before) as well as their own `sunColour`, so their reddening is counted partly twice. In `alt-30km-dusk` they read cream-gold, not red.
- The model's three wavelengths put the ozone's absorption on the 550 nm channel alone. A white surface seen through the air keeps a faint mauve cast: from 400 km, 45° off nadir, the sun 20° up, green at 0.927 of red and blue at 0.974; with the ozone taken out of the sunlight, the view path and the haze (the sky's light on the ice held), 0.976 and 0.951 (`aerial-nadir.probe.ts`). The ice in `pole-400` is (167, 161, 163).
- The clouds take the sunlight alone, not the sky's light; their tops are dark once the sun has set for them.

## Frame time

`src/render/glow-governor.ts` puts the glow, then the scattering sky, on trial when the smoothed frame time is over 1/24 s. It keeps a cut only if the frames got 15 % faster. Turning the scattering sky off also turns off the aerial perspective and the sky's light on the ground.

**Harness, paired.** Both builds open in one browser, frames alternating A, B, A, B on the same view, so the shared machine's load falls on both alike. Each frame is `SceneManager.render()` (sky, scene, bloom, output) at 1280 × 720, with the GPU finished each time (`pair-time.mjs`). The "after" build is the branch before `a808e74`, which changes only the value of one uniform.

| View | base ms | after ms | after/base, paired median (quartiles), 16 pairs |
|---|---|---|---|
| limb-day | 1024 | 967 | 0.93 (0.88–1.00) |
| nadir | 1477 | 1149 | 0.77 (0.73–0.79) |
| ocean-40 | 2346 | 1960 | 0.84 (0.79–0.89) |
| alt-30km | 1727 | 1577 | 0.94 (0.86–1.01) |
| alt-12km | 1968 | 2056 | 0.97 (0.94–1.21) |
| pad-dusk-west | 3178 | 2876 | 0.94 (0.85–1.02) |
| gradient-limb (`?sky=gradient`) | 869 | 923 | 1.08 (0.99–1.16) |

- The gradient sky draws the same on both builds (0 pixels differ). Its 1.08 is the run's noise: the first round's run paired it at 1.02 (0.97–1.09).
- **What the sky's light costs** (review round), the branch before and after `56a015e`, 12 pairs: limb-day 0.97 (0.87–1.16), nadir 0.94 (0.85–1.08), alt-30km 1.04 (1.01–1.07). Within the noise from orbit, about 4 % at 30 km.
- **What the haze itself costs** (first round, the haze switched off in a probe build, 12 pairs): with/without 1.20 (1.11–1.39) at limb-day, 1.29 (1.18–1.36) at nadir, 1.12 (1.04–1.17) at alt-30km.
- So on SwiftShader the haze adds 12–29 % to a frame where the globe fills the view. The sky pass no longer marching the inside of the disc saves more than that: from orbit the frame is 7–23 % cheaper than at the base, and at the pad and 12 km it is within a few per cent.
- **A fresh page's first frame** (programs compiled, the three tables filled, four frames; `first-frame.mjs`, alternating): 5.9, 6.2, 6.2, 6.7 s on the branch, 6.4, 6.4, 6.4, 7.1 s at the base. The new table's pass adds nothing that shows.

**The production build** (first round: `npm run build`'s `dist/`, base and the first round's branch, before the sky's light and the disc's fix), timed in the app as the journeys drive it: a Falcon 9 from the Cape to LEO, paused at four moments, the interval between animation frames over 12 frames. Viewport 1280 × 800 at `BROWSER_SCALE=1` (a 636 × 516 canvas beside the panels). Runs alternated base, branch (`app-time.mjs`), unpaired:

| Moment | base, scattering sky | after, scattering sky | base, `?sky=gradient` | after, `?sky=gradient` | sky/gradient, base → after |
|---|---|---|---|---|---|
| T−5 s, the pad | 733 ms | 617 ms | 478 ms | 482 ms | 1.53 → 1.28 |
| T+62 s, 10.0 km | 719 ms | 619 ms | 469 ms | 501 ms | 1.53 → 1.24 |
| T+105 s, 32.8 km | 685 ms | 681 ms | 483 ms | 474 ms | 1.42 → 1.44 |
| T+600 s, 200.8 km | 583 ms | 583 ms | 433 ms | 479 ms | 1.35 → 1.22 |

The shared machine's load drifts far more than 10 % between unpaired runs (the same harness view took 3049 ms a frame in one round and 1473 ms in the next), so the paired harness figures are the firmer ones. The review round's fixes cost within the noise in the paired runs above, so these were not repeated.

**What it implies for the governor.** SwiftShader is a CPU renderer, so these are ratios, not frame rates (0.4–3 s a frame here).
- The governor sees the haze only inside the scattering sky's trial. The trial keeps the gradient sky only if the frames get 15 % faster, that is only if sky/gradient is above 1.18.
- That ratio fell at three of the four moments in the production build and stayed at 32.8 km, because the sky pass no longer marches the ground that covers it. A GPU on the edge of the trial is as likely to keep the scattering sky as before, or more likely; the aerial perspective does not make the fallback come sooner.
- On a real GPU the sky pass's 24 samples and the globe's 10 are the same kind of fill-rate cost, but the balance was not measured here.
- On SwiftShader itself every frame is over the governor's 0.1 s limit for a measuring frame (`autoGlow` in src/main.ts), so it never runs its trials there, before or after.
- No automatic quality reduction was added (owner policy M-PLAN-005, D-43).

## Browser journeys

Against the final build (`npm run build` at `7af05f7`), one at a time, `node tests/browser/run.mjs <journey>` with `CHROMIUM=/opt/pw-browsers/chromium`. The review round changed the shaders and added a table to the pass FX-8 refills on a restored context, so all four were run again.

| Journey | Review round (this build) | First round (842bb83) | Base `7f991f9` |
|---|---|---|---|
| fx8-context-loss | **passed** (162 s; the restored scene's luminance within 3.2 of before, e.g. launch 60.0 ± 43.0 → 56.8 ± 40.7, orbit 31.0 → 29.9) | passed (313 s) | — |
| launch-explore | **passed** (125 s; orbit 501 × 517 km, 28.6°) | passed (213 s) | — |
| r2-viewport-scene-floor | **passed** (301 s) | passed (504 s) | — |
| watch-controls | **passed** (149 s) | first run 1 failure (a 20 s wait for the mission clock, 323 s under load); re-run alone passed (207 s) | passed (223 s) |

The first round's one failure was the machine's load: on the software renderer the clock moves at most 0.1 s a frame and needs three frames in those 20 s; it passed on a re-run, on the base, and now on this build. Log: `/tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/probes/sky/fix/journeys.log`.

## Budget

`npm run build && npm run budget` on this branch, as the last build (`7af05f7`; the later commits are docs and records, not bundled): **bundle budget: ok**.

| | base `7f991f9` | after the compaction `8fd579b` | first round `842bb83` | this branch |
|---|---|---|---|---|
| index-*.js (ceiling 2645 kB) | 2643.2 kB | 2638.3 kB | 2641.1 kB | **2642.9 kB** |
| precache code (ceiling 14 724 kB) | | | 14 708.7 kB | 14 710.5 kB |

- **Budget line: lowered** (index 2643.2 → 2642.9 kB); no ceiling raised; budgets.json unchanged.
- The aerial perspective with the review round's fixes adds 4.6 kB to the index chunk over the compaction. On the base without the compaction the chunk would be about 2647.8 kB, over its ceiling, so the aerial perspective needs `8fd579b` first.
- Sizes are the file in `dist/assets` / 1000. The base and `8fd579b` were built into scratch directories in the first round.

## Docs touched

- `docs/PHYSICS.md` §12: the aerial perspective and its errors (the test's figures), the nadir path reflectance check, the ground's light (sun and sky) and the clouds' and glint's sunlight, the ozone's mauve, the illuminance from the ground to space and what it does to the climb, the sun's disc, the measured colours.
- `docs/USER-GUIDE.md`: the sky paragraph says what is now seen through the air; the limb is "a thin blue line".
- README: N/A. IMPLEMENTATION-STATUS: N/A (V02 is "done" and stays so).

## D-25

The aerial perspective with the review round's fixes changes **373 source lines** (src/render/atmosphere.ts and scene.ts, 312 added and 61 deleted, of which 191 are not comment lines), under the ~400 of D-25.

The compaction commit `8fd579b` changes 1532 lines (786 + 746) of src/render, all identical output:
- the comments inside 32 GLSL template strings moved word for word into JS comments;
- every GLSL line's leading indentation dropped.

Its message records how the identical output was proven: the ASTs compared with each shader's GLSL token stream, and pixel-identical frames at 8 views. Both reviewers re-proved it on this base independently (11 files, 53 templates; a negative control catches the aerial commit). Line count is the wrong measure for it; the reason is written here as D-25 asks.

## Questions for the owner

1. **The look from orbit.** The decision needed: approve, or say what to change. Screenshots: `.../sky-shots/pairs/` (`limb-day`, `nadir`, `ocean-40`, `pole-400`, `sun-space`), the alternatives in `.../sky-shots/options/`.
   - (ก) Approve as it is: the haze and the sky's air at one illuminance, 3.3 in space. Effect: the haze is the sky's own model and meets the sky's glow at the limb. The limb glow from orbit is fainter than before: its brightest row is (160, 152, 177), against (212, 207, 222) before. The sun and its glare are as before.
   - (ข) A brighter limb glow: the sky pass at 8 in space, the haze at 3.3 (`options/limb-day-sky8.png`). Effect: the limb as bright as before, (212, 207, 222). The haze two rows under it is (132, 144, 175), so there is a step at the globe's edge; the sky and the haze no longer share one sun.
   - (ค) A lighter haze over the disc than the model gives, e.g. half (`options/nadir-haze-half.png`, `options/limb-day-haze-half.png`). Effect: crisper ground from orbit: at nadir the ocean is (17, 38, 74) against (29, 58, 106). But the haze two rows under the limb, (84, 95, 125), is darker than the glow over it, (160, 152, 176), and the haze no longer follows the sky's physics.
   - Proposal: (ก).
2. **The look in the climb, 12–72 km** (review round). Below 72 km the haze takes the sky's tuned illuminance, 2.4× the scene's sun at 12 km, 2.1× at 30 km, 1.6× at 45 km, while the ground and the clouds under it are lit by the scene's sun. Screenshots with no pad in the scene (the globe itself below): `options/climb-30km.png` and `options/climb-12km.png`, four rows each (before, ก, ข, ค).
   - (ก) Keep it as built. Effect: the horizon is continuous (from 30 km, sky (190, 190, 209), globe 20 rows under the horizon (157, 177, 206)). From 20 to about 45 km the ground and the clouds are pale and washed out: the ocean low in the 30 km view is (87, 120, 171); the variation along rows 370–560 is an RMS of 9.0 on a mean of 158 (before: 13.4 on 41). At 12 km it reads like the view from an airliner.
   - (ข) The haze at the scene's sun, 3.3, at every height. Effect: the ground and the clouds crisper (the same ocean (54, 77, 119); RMS 9.5 on 110), but a step under the horizon from inside the air: the globe 20 rows under it is (101, 124, 160) under a sky of (190, 190, 209), plainest at 12 km (`options/alt-12km-nopad-haze33.png`).
   - (ค) A blend: the haze's light is the sky's where nothing shows through it and the scene's sun where the ground does, E · (1 − T) + 3.3 · T, T the stretch's transmittance. Effect: no step at the horizon (the globe 20 rows under it (138, 169, 205)); the ground deeper below ((59, 91, 149); RMS 9.7 on 140). In orbit E is 3.3 and nothing changes (`limb-day` 0 pixels differ). The haze's light below 72 km is then neither the sky's nor the ground's sun but a mix chosen for the look; one line in `AERIAL`, rendered here as a probe build and not on the branch.
   - Also considered and not offered: lighting the globe and the clouds at the sky's illuminance below 72 km (one sun everywhere). At 12 km and below that makes the ground 2.4× brighter than the pad's terrain patch and the vehicles, which three lights at 3.3.
   - Proposal: (ค).
3. **The PR split.** SESSION-PROTOCOL §5 says one change type per PR, and identical output never mixes with another type; D-63 puts identical-output work first in each lane. The compaction (`8fd579b`, identical output) and the aerial perspective (a look change) are on one branch.
   - (ก) Two PRs: the compaction first, then the aerial perspective on top. Effect: follows §5 and D-63; one more review and merge; the aerial perspective's PR waits for the first (it needs its 4.8 kB).
   - (ข) One PR with the commits kept separate. Effect: one review; an exception to §5 written in the PR.
   - Proposal: (ก).
