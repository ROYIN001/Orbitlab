# Argon4 follow-up: the sky's aerial perspective / มองโลกและเมฆผ่านอากาศของท้องฟ้า

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ใต้ท้องฟ้าแบบคำนวณการกระเจิงแสง ตอนนี้มองเห็นพื้นโลกและเมฆผ่านอากาศชั้นเดียวกับที่ใช้วาดท้องฟ้า (aerial perspective)
>   - จากวงโคจรมีหมอกสีฟ้าคลุมพื้นโลก หนาขึ้นเรื่อย ๆ เมื่อมองไปทางขอบโลก
>   - จากที่สูง 12–30 กม. พื้นที่ไกลจางหายเข้าไปในขอบฟ้า แทนที่จะเป็นแถบมืดใต้ขอบฟ้าอย่างเดิม
>   - แสงบนพื้นและเมฆแดงขึ้นและมืดลงเมื่อดวงอาทิตย์ตก ด้านกลางคืนไม่มีหมอก และเมฆกลางคืนไม่เรืองเป็นสีเทาอีกแล้ว
> - ความสว่างของท้องฟ้าในอวกาศลดจาก 8 เหลือ 3.3 ให้เท่ากับแสงอาทิตย์ที่ส่องพื้นโลก แสงขอบโลกจากวงโคจรจึงบางและหรี่ลงกว่าเดิม
>   - ถ้าใช้ 8 พื้นโลกทั้งดวงจะถูกหมอกฟ้าซีดคลุม (ภาพทดลองอยู่ในรายงาน)
> - ท้องฟ้าแบบไล่สี (`?sky=gradient`) และภาพที่ฐานปล่อยเหมือนเดิมทุกพิกเซล
> - ภาพเปรียบเทียบก่อน/หลังใช้ภาพพื้นผิวโลกจริง 12 มุม
> - บน SwiftShader เฟรมเร็วขึ้น 16–23% เมื่อมองจากวงโคจร เพราะท้องฟ้าไม่ต้องคำนวณส่วนที่พื้นโลกบังอยู่ ที่ระดับต่ำเร็วขึ้นเล็กน้อยหรือเท่าเดิม
> - ไม่ได้เพิ่มการลดคุณภาพอัตโนมัติใหม่ ขนาดแอปหลัก 2643.2 → 2641.1 kB ไม่ได้ขึ้นเพดานใด
> - เทสต์ในเบราว์เซอร์ 4 ตัวผ่าน watch-controls ล้มครั้งแรกเพราะเครื่องที่ใช้ร่วมกันช้า รันใหม่แล้วผ่าน และผ่านบนฐานเดิมด้วย
> - **รอเจ้าของตัดสิน:**
>   1. อนุมัติหน้าตาใหม่ หรือบอกว่าจะให้เปลี่ยนอะไร
>   2. จะแยก PR ให้งานบีบข้อความ shader (ผลลัพธ์เหมือนเดิมทุกตัว) ไปก่อนหรือไม่

- **Request:** the owner's answer 7 of 2026-10-17, on the before/after screenshots of claim 19, verbatim "ทำให้ดูดีและสมจริงขึ้น" (DECISIONS.md, "Decided 2026-10-17 (Argon4 review follow-up, chat)", row "the sky": "The sky change of claim 19 stands, and the sky is to look better and more realistic"). The bending shader waits ("รอไปก่อน") and is not touched.
- **Base:** `7f991f9` (origin/main `b16b09e` + the owner's decisions commit). Branch `ws/4-sky-aerial-perspective`, from the hand-over patches of `docs/development/handover/2026-10-17/4-sky-aerial-perspective/` (on `claude/bold-johnson-haeu8t`), applied with `git am -3`.
- **Commits:** `8fd579b` the shaders' text compacted, identical GLSL (kept as handed over); `842bb83` the aerial perspective (code and tests); `bf610cf` PHYSICS §12 and the user guide; this report and the change fragment. The hand-over's WIP commit is replaced by these.
- **Change type:** render (a look change) on top of an identical-output commit; see the questions about the PR split. It waits for the owner's approval of the look.

## What changed for the user

Under the scattering sky (the default where the GPU has float targets):

- **From orbit** the planet is seen through its air: a blue haze over the disc, faint at nadir and thickening towards the limb, where it runs into the sky's own limb glow. Open ocean is deep blue instead of near-black navy; land is paler and bluer than before.
- **The limb glow from orbit** is thinner and dimmer than before, drawn at the scene's own sun (illuminance 3.3) instead of 8. It has a faint lavender cast at the horizon: the ozone layer takes the green on the long grazing path. With the ozone switched off, the model's red-to-green ratio 0.05° inside the limb would be 0.70 instead of 0.87 (`tests/probe/aerial-nadir.probe.ts`).
- **From 12–30 km** the distant ground fades into a bright horizon, as from an airliner or a stratospheric balloon. Before, a dark band of globe sat under a bright horizon sky.
- **Near the terminator** the ground and the clouds are lit by sunlight reddened and dimmed by the air. Past their sunset they are dark: the night side has no haze, and its clouds are no longer lit grey by the scene's fill lights. City lights near the horizon are orange (the long path takes the blue).
- **Unchanged:** the gradient sky (`?sky=gradient`, the frame-rate fallback, GPUs without float targets) and both views at the pad in the screenshots below (0 pixels differ).

## How it is computed

`AERIAL` (src/render/atmosphere.ts) is used by the globe's shader and patched into the clouds' Lambert material (src/render/scene.ts). Per fragment, from the camera o (relative to the Earth's centre) along the view direction d:

- **The stretch.** tc = −o·d, rp² = |o + d tc|²; tStart = max(0, tc − √(RT² − rp²)); tEnd = tc − √(rEnd² − rp²) when rp² < rEnd², else tc (the ray's perigee). rEnd = RG for the ground, RG + 9 km for the clouds. It ends on the sphere, not on the fragment: the globe's 128 × 96 facets lie up to 2.8 km under its sphere and the clouds' 96 × 64 up to 5.3 km (measured, `tests/probe/facets.mjs`), and ending on them would scallop the haze at the limb.
- **The samples.** N = 10 for the globe, 6 for the clouds, placed from the far end: s_i = −(1 − i/N)² · len, so they crowd where the air is densest on any ray that ends on the ground.
- **Each step** (Hillaire 2020 §6, with the sky pass's model: Rayleigh 5.802/13.558/33.1·10⁻⁶ m⁻¹, H = 8 km; Mie 3.996/4.40·10⁻⁶ m⁻¹, H = 1.2 km, Cornette–Shanks g = 0.8; ozone 0.650/1.881/0.085·10⁻⁶ m⁻¹ in a tent about 25 km):
  - S = (σ_R(h) P_R(θ) + σ_M(h) P_M(θ)) · T☉(h, μ☉) + (σ_R(h) + σ_M(h)) · Ψ(h, μ☉);
  - L += T · S · (1 − e^(−σ_t Δs)) / σ_t, then T ·= e^(−σ_t Δs).
  - T☉ is the transmittance table faded over ±0.004 in μ☉ about the geometric horizon (the sky pass's `sunlight`, now shared); Ψ is the multiple-scattering table (ground albedo 0.3).
- **The surface seen:** c' = c · T + L · E, E the sky pass's illuminance.
- **The surface's own light:** `sunColour(r, μ☉) = T☉(r, μ☉) / exp(−(σ_R H_R e^(−h/H_R) + σ_M^ext H_M e^(−h/H_M) + σ_O3 · 15 km))`: the sunlight reaching radius r through the air relative to the sun overhead there. Noon is drawn as before (1 within 3·10⁻⁴); with the sun 4° up it is 0.52/0.23/0.05 on the ground and 0.77/0.52/0.38 on the cloud tops (`tests/probe/suncolour.probe.ts`).
  - The globe's day term becomes day · (0.09 + 0.95 · max(cos, 0) · sunColour(RG, μ_geo)).
  - The clouds' lit colour is multiplied by sunColour(RG + 9 km, μ).
- **The illuminance E** = 3.3 + (8 − 3.3) · g, g = 1 − smoothstep(12 km, 72 km, h_cam) (sky.ts's ground factor), for the sky pass and the haze alike: 8 on the ground (the sky's tuning against the gradient sky it replaced), the scene's own sun 3.3 in space (SUN_INTENSITY; a Lambert surface of albedo ρ under it is 3.3ρ/π ≈ 1.05ρ, the globe's 0.95 + 0.09). At 8 from orbit the haze was 2.4× what lights the ground under it.
- **The sky pass** no longer marches a ray with tc > 0 whose perigee is more than 10 km inside the Earth's sphere (the globe covers it and carries its haze). Every ray the faceted globe may leave uncovered at its limb is still marched; the test replays this in float32 from 2 m, 30 km, 400 km and 36 000 km.
- **Off under the scattering sky:** the globe's Fresnel rim and the old 110 km shell, both the gradient sky's stand-ins for this haze. A cloud texel with alpha under 1/255 is discarded before the march.

**Checks of the model's strength.** Looking straight down from 400 km with the sun 50° up, the march (with Ψ) gives the path reflectance πL/(E cos θ☉) = 0.024/0.052/0.127 at 680/550/440 nm, and T = 0.94/0.87/0.77. Single scattering alone is 0.075 at 440 nm, against the thin-layer estimate τ P/(4 μ μ☉) = 0.265 × 1.19/(4 × 0.766) = 0.10 before the two paths' attenuation, (1 − e^(−τm))/(τm) = 0.75 for m = 1 + 1/μ☉. With the multiple-scattering table's ground albedo at 0.1 instead of 0.3, the 440 nm figure would be 0.111. So the haze over the disc is what the sky's own model gives, not a tuning (`tests/probe/aerial-nadir.probe.ts`).

## The old shell test: what is still pinned

tests/render-atmo-shell.test.ts had 6 tests at the base and has 6 now.

| Old test | Now |
|---|---|
| follows the sky: disc only under the scattering sky, whole under the gradient | **Still pinned**, for the new behaviour: the shell is not drawn under the scattering sky and drawn whole under the gradient, through `setPhysicalSky` both ways. |
| without float targets there is no scattering sky, and none is reported | **Still pinned** (and the shell stays drawn). |
| is told where the Earth is under the floating origin (`atmoMat.earthCentre`) | **Still pinned, moved:** the shell no longer reads the Earth's centre, so the test checks the globe's `earthCentre`, which the aerial perspective reads, and both shaders' `camPos`. |
| the discard stands in the shell shader as replayed | **Retired with the discard.** The shell shader is now checked to carry no cut (`discard`, `discOnly`) and to keep its band and alpha lines; the gradient sky's rim gains are checked through `update`. |
| drops a ray that clears the Earth, keeps one on the disc, at any floating origin (float64 and float32) | **Retired with the cut.** What it protected (no second band at 60–110 km over the sky's limb) is now pinned more strongly: the new test "stays off the scattering sky's limb at any floating origin and height" runs `update` at the same three floating origins and the same three heights (400, 2000, 35 786 km) and checks the shell is hidden under the scattering sky and shown under the gradient. The float32 arithmetic it replayed no longer exists. The haze on the disc, which the cut kept, is now the aerial perspective's, and its float32 ends are tested in tests/render-aerial.test.ts. |
| the gradient sky's colour reaches the scene target linear | **Unchanged.** |

## Tests run

All on this branch unless marked base; vitest with `--maxWorkers=2`, files named:

- `tests/render-aerial.test.ts` (new): **19 passed**. It covers:
  - the GLSL lines as replayed, in the globe's shader and the clouds' patched Lambert shader;
  - the shared uniforms and tables;
  - the sky switch and the rim;
  - the one illuminance for the sky pass and the haze;
  - the march against an independent fine integral (asserted bounds; measured below);
  - the night side;
  - `sunColour` at noon, low and set;
  - the far end in float32 from 400 km and 36 000 km, and at the perigee;
  - the sky pass's skip, in place and in float32 from 2 m, 30 km, 400 km and 36 000 km, and the globe's facets under 3 km.
- `tests/render-atmo-shell.test.ts`: **6 passed** (6 at the base; see above).
- The 23 test files that import `src/render/` plus `tests/architecture.test.ts`: **24 files, 280 tests passed** (base, the same set without render-aerial: 23 files, 261 passed).
- `npx tsc --noEmit`: clean.
- Probes (gitignored, `tests/probe/`):
  - `aerial-errors.probe.ts`: the errors and the worst rays;
  - `aerial-nadir.probe.ts`: the path reflectance, with the multiple-scattering table ported;
  - `suncolour.probe.ts`;
  - `facets.mjs`.
- Browser journeys: see "Browser journeys" below.

**The march against the fine integral** (single scattering; errors of L relative to the ray's brightest channel, of T relative to T; 36 rays per case):

| Case | L worst | L RMS | T worst | T RMS | Worst ray |
|---|---|---|---|---|---|
| ground from 400 km, N = 10 | 4.74 % | 1.36 % | 4.48 % | 2.66 % | L: 1° inside the limb, sun 5° up ahead; T: 0.2° inside the limb (1.6 % of the blue through) |
| ground from 30 km, N = 10 | 1.57 % | 0.61 % | 1.87 % | 0.89 % | 1° inside the limb, sun 5° up ahead |
| clouds from 400 km, N = 6 | 4.60 % | 2.71 % | 3.50 % | 1.96 % | L: at nadir, sun 60° up; T: 0.2° inside the limb |

These are the figures PHYSICS §12 quotes; the test asserts them under 6 %, 2 %, 6 %, 3.5 % (400 km), 3 %, 1 %, 3 %, 1 % (30 km) and 6 %, 3.5 %, 5 %, 2.5 % (clouds).

## Screenshots

Harness: `/tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/sky-harness/` (README there). It renders the app's `SceneManager` (and, near a pad, its `LaunchPadView`) with the real Earth textures, 1280 × 720, in headless Chromium on SwiftShader. Before is base `7f991f9`, after is this branch. Every pair is the same view at the same moment. The PNGs are in `/tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/sky-shots/before/` and `.../after/`. Stacked pairs are in `.../pairs/`, the owner's options (probes) in `.../options/`, and `.../INDEX.md` says what to look at in each. The timing scripts (`pair-time.mjs`, `app-time.mjs`, `first-frame.mjs`) are in the harness too, and their logs in `/tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/probes/sky/`.

| View | Pixels changed | What is seen |
|---|---|---|
| `limb-day` (400 km, sun 40°) | 393 057 | Haze over the disc paling to the limb; the limb glow's brightest row (212, 207, 222) → (161, 153, 177) |
| `limb-terminator` (400 km, sunset below) | 351 332 | Reddened day side, dark night side with orange lights; before, grey night clouds |
| `limb-into-night` (400 km, sun behind) | 406 348 | Night side dark; city lights orange towards the horizon |
| `nadir` (400 km over the Bahamas, sun 50°) | 921 600 | Ocean (6, 16, 35) → (30, 59, 105), Andros (54, 65, 70) → (67, 87, 118), clouds (157, 162, 171) → (157, 162, 173) |
| `ocean-40` (400 km, 40° off nadir) | 921 600 | Open ocean (4, 16, 40) → (40, 74, 127); at illuminance 8 it would be (86, 128, 184) |
| `alt-30km` (sun 35°) | 921 600 | Horizon row: sky (204, 200, 215) over globe (20, 38, 67) → (196, 192, 209) over (175, 186, 208) |
| `alt-30km-dusk` (sun 1° down) | 921 389 | Pink twilight haze over the dark ground, clouds cream-gold; before, black ground and clouds lit as by day |
| `alt-12km` (sun 30°) | 453 564 | The ocean fading into a pale horizon instead of a dark band |
| `pad-dusk-west`, `pad-dusk-east` | 0 | Identical |
| `gradient-limb`, `gradient-30km` | 0 | Identical |

I looked at every pair and checked for the faults the hand-over listed:
- No speckles: isolated pixels standing 40 out of their 5 × 5 median are fewer after than before, or the same, in every view but `alt-30km` (75 → 76); they are the stars, the city lights and the pad's structures.
- No banding, and no black or cut horizon.
- No faceting at the limb: the limb traced column by column is smooth.
- No seam at the cloud layer.

Two things look different from photographs and are the owner's call:
- The limb glow from orbit is fainter and less blue than the bright white band before, with a lavender cast at the horizon.
- At nadir the land is paler and bluer than in ISS photographs. The haze's strength is the model's (above). Against it stand the day map's colours, decoded to linear:
  - open ocean east of the Bahamas (0.009, 0.018, 0.048), Andros (0.049, 0.059, 0.068), Florida inland (0.050, 0.050, 0.052);
  - lit by the sun 50° up and seen through T, the ocean gives 0.030 in blue against the haze's 0.102, and Andros 0.037 in red against 0.019.

Known limits, not changed here:
- The pad's 13 km terrain patch and its 90 km apron are drawn by three's fog, not through the haze. From 12–30 km they show as a teal foreground, with a soft edge where the hazed globe begins (as before, where the globe was unhazed).
- At dusk from 12–72 km the clouds take the sun's camera-local low-sun tint (`SUN_LOW`, as before) as well as their own `sunColour`, so their reddening is counted partly twice. In `alt-30km-dusk` they read cream-gold, not red.

## Frame time

`src/render/glow-governor.ts` puts the glow, then the scattering sky, on trial when the smoothed frame time is over 1/24 s. It keeps a cut only if the frames got 15 % faster. Turning the scattering sky off now also turns off the aerial perspective.

**Harness, paired.** Both builds were open in one browser, and frames alternated A, B, A, B on the same view, so the shared machine's load fell on both alike. Each frame is `SceneManager.render()` (sky, scene, bloom, output) at 1280 × 720, with the GPU finished each time. 16 pairs per view (`pair-time.mjs`).

| View | base ms | after ms | after/base, paired median (quartiles) |
|---|---|---|---|
| limb-day | 1892 | 1568 | 0.84 (0.77–0.89) |
| nadir | 2748 | 2099 | 0.79 (0.68–0.88) |
| ocean-40 | 2939 | 2231 | 0.77 (0.70–0.87) |
| alt-30km | 2846 | 2348 | 0.90 (0.78–0.98) |
| alt-12km | 2009 | 1848 | 0.95 (0.90–0.98) |
| pad-dusk-west | 1955 | 1901 | 0.98 (0.92–1.00) |
| gradient-limb (`?sky=gradient`) | 726 | 740 | 1.02 (0.97–1.09) |

**What the aerial perspective itself costs.** The same branch build was timed with the haze switched off (a probe build of the harness, `NOAERIAL=1`: the globe and the clouds without the march, the sky pass as it is), 12 pairs per view:

| View | without haze ms | with ms | with/without, paired median (quartiles) |
|---|---|---|---|
| limb-day | 894 | 1096 | 1.20 (1.11–1.39) |
| nadir | 1179 | 1490 | 1.29 (1.18–1.36) |
| alt-30km | 1392 | 1580 | 1.12 (1.04–1.17) |

So on SwiftShader the haze adds 12–29 % to a frame where the globe fills the view. The sky pass no longer marching the inside of the disc saves more than that: from orbit the frame is 16–23 % cheaper than at the base, and at the pad and 12 km it is within a few per cent of the base.

**The production build** (`npm run build`'s `dist/`, base and branch), timed in the app as the journeys drive it: a Falcon 9 from the Cape to LEO, paused at four moments, the interval between animation frames over 12 frames. Viewport 1280 × 800 at `BROWSER_SCALE=1`, which gives a 636 × 516 canvas beside the panels. Runs alternated base, branch, base, branch (`app-time.mjs`):

| Moment | base, scattering sky | after, scattering sky | base, `?sky=gradient` | after, `?sky=gradient` | sky/gradient, base → after |
|---|---|---|---|---|---|
| T−5 s, the pad | 733 ms | 617 ms | 478 ms | 482 ms | 1.53 → 1.28 |
| T+62 s, 10.0 km | 719 ms | 619 ms | 469 ms | 501 ms | 1.53 → 1.24 |
| T+105 s, 32.8 km | 685 ms | 681 ms | 483 ms | 474 ms | 1.42 → 1.44 |
| T+600 s, 200.8 km | 583 ms | 583 ms | 433 ms | 479 ms | 1.35 → 1.22 |

These runs were not paired: each took its turn on the shared machine, whose load drifts far more than 10 % (the same harness view took 3049 ms a frame in one round of unpaired runs and 1473 ms in the next). The paired harness figures above are the firmer ones. The gradient sky draws the same on both builds (0 pixels differ), and the harness pairs its frames at 1.02 (0.97–1.09).

**What it implies for the governor.** SwiftShader is a CPU renderer, so these are ratios, not frame rates: 0.4–3 s a frame here.
- The governor sees the haze only inside the scattering sky's trial. The trial keeps the gradient sky only if the frames get 15 % faster, that is only if sky/gradient is above 1.18.
- That ratio fell at three of the four moments (1.53 → 1.28, 1.53 → 1.24, 1.35 → 1.22) and stayed at 32.8 km (1.42 → 1.44). The scattering sky got cheaper against the gradient because the sky pass no longer marches the ground that covers it, as the paired harness runs show.
- So a GPU on the edge of the trial is as likely to keep the scattering sky as before, or more likely. The aerial perspective does not make the fallback come sooner.
- On a real GPU the sky pass's 24 samples and the globe's 10 are the same kind of fill-rate cost, but the balance was not measured here.
- On SwiftShader itself every frame is over the governor's 0.1 s limit for a measuring frame (`autoGlow` in src/main.ts), so it never runs its trials there, before or after.
- No automatic quality reduction was added (owner policy M-PLAN-005, D-43).

## Browser journeys

Against the final build (`npm run build`), one at a time, `node tests/browser/run.mjs <journey>` with `CHROMIUM=/opt/pw-browsers/chromium`:

| Journey | Branch | Base `7f991f9` |
|---|---|---|
| launch-explore | **passed** (213 s; orbit 500 × 516 km, the CSV 2.35 MB) | — |
| watch-controls | first run: **1 failure** (323 s); re-run alone: **passed** (207 s) | **passed** (223 s) |
| fx8-context-loss | **passed** (313 s; the restored scene's luminance within 5 of before) | — |
| r2-viewport-scene-floor | **passed** (504 s) | — |

**The watch-controls failure.**
- The check that failed: "touch: after the first launch: the mission clock moves on from T-9.0 — did not happen within 20 s". The flight was playing at warp 1.
- On the software renderer the clock moves at most 0.1 s a frame, so it needs three frames in those 20 s. That run took 323 s against 207 s for the re-run, on a machine shared with another agent.
- The re-run alone passed every check, and the base passed too.
- To rule out a slower first frame from the larger globe and cloud shaders: a fresh page's first `time()` call (programs compiled, the sky's tables filled, four frames drawn) took 7.6–8.9 s on the branch and 8.3–9.1 s at the base, four fresh pages each, alternating (`first-frame.mjs`).
- So the failure is the machine's load, not this change.

## Budget

`npm run build && npm run budget` on this branch, as the last build: **bundle budget: ok**.

| | base `7f991f9` | after the compaction `8fd579b` | this branch |
|---|---|---|---|
| index-*.js (ceiling 2645 kB) | 2643.2 kB | 2638.3 kB | **2641.1 kB** |
| precache code (ceiling 14 724 kB) | | | 14 708.7 kB |

- **Budget line: lowered** (index 2643.2 → 2641.1 kB); no ceiling raised.
- The aerial perspective adds 2.7 kB to the index chunk over the compaction. On the base without it the chunk would be 2645.9 kB, over its ceiling, so the aerial perspective needs `8fd579b` first.
- Sizes are the file in `dist/assets` / 1000. The base and `8fd579b` were built into scratch directories. The `8fd579b` tree is a `git archive`, whose build stamp reads "dev" (4 bytes shorter).

## Docs touched

- `docs/PHYSICS.md` §12: the aerial perspective, its errors (the test's figures), the nadir path reflectance check, the ground's and the clouds' sunlight, the illuminance and the measured colours.
- `docs/USER-GUIDE.md`: the sky paragraph says what is now seen through the air.
- README: N/A. IMPLEMENTATION-STATUS: N/A (V02 is "done" and stays so).

## D-25

The aerial perspective changes **251 source lines** (src/render/atmosphere.ts and scene.ts, 206 added and 45 deleted, of which 139 are not comment lines), under the ~400 of D-25.

The compaction commit `8fd579b` changes 1532 lines (786 + 746) of src/render, all identical output:
- the comments inside 32 GLSL template strings moved word for word into JS comments;
- every GLSL line's leading indentation dropped.

Its message records how the identical output was proven: the ASTs compared with each shader's GLSL token stream, and pixel-identical frames at 8 views. Line count is the wrong measure for it; the reason is written here as D-25 asks.

## Questions for the owner

1. **The look.** The decision needed: approve, or say what to change. The screenshots: `/tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/sky-shots/pairs/` (INDEX.md beside them). The two alternatives were rendered as probes on this branch, in `.../sky-shots/options/`.
   - (ก) Approve as it is: the haze and the sky at one illuminance, 3.3 in space. Effect: the haze is the sky's own model and meets the sky's glow at the limb. The limb glow from orbit is fainter than before: its brightest row is (161, 153, 177), against (212, 207, 222) before.
   - (ข) A brighter limb glow from orbit: the sky pass at 8 in space, the haze at 3.3 (`options/limb-day-sky8.png`). Effect: the limb as bright as before, (212, 207, 221). The haze two rows under it is (131, 144, 175), so there is a step at the globe's edge; the sky and the haze no longer share one sun.
   - (ค) A lighter haze over the disc than the model gives, e.g. half (`options/nadir-haze-half.png`, `options/limb-day-haze-half.png`). Effect: crisper ground from orbit: at nadir the ocean is (18, 38, 71) and Andros (58, 72, 90), against (30, 59, 105) and (67, 87, 118). But the haze at the limb, (83, 95, 125), is darker than the glow over it, (161, 152, 176), and the haze no longer follows the sky's physics.
   - Proposal: (ก).
2. **The PR split.** SESSION-PROTOCOL §5 says one change type per PR, and identical output never mixes with another type; D-63 puts identical-output work first in each lane. The compaction (`8fd579b`, identical output) and the aerial perspective (a look change) are on one branch.
   - (ก) Two PRs: the compaction first, then the aerial perspective on top. Effect: follows §5 and D-63; one more review and merge; the aerial perspective's PR waits for the first (it needs its 4.8 kB).
   - (ข) One PR with the two commits kept separate. Effect: one review; an exception to §5 written in the PR.
   - Proposal: (ก).
