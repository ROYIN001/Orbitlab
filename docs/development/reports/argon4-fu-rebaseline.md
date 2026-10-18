# Argon4 follow-up, workstreams 1 + 2: the J2 + WGS-84 + J2-coasts re-baseline with the nozzle model / ปรับฐานฟิสิกส์ใหม่: โลกทรงรี WGS-84, J2 ตลอดเที่ยวบิน และแบบจำลองหัวฉีด

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - **ทำอะไร:** ตามคำตัดสินของเจ้าของเมื่อ 17 ต.ค. 2569 ทั้งสองข้อรวมเป็นงานเดียว
>   - ฐานปล่อยวางบนทรงรี WGS-84 และความสูงทุกค่าที่อ่านอากาศ/พื้นดินเป็นความสูงเหนือทรงรี
>   - J2 มีผลตั้งแต่ฐานปล่อยจนถึงวงโคจร รวมถึงช่วงลอยตัวของแบบจำลองมวลจุด และตัดสินวงโคจรจาก apsides จริงของรอบถัดไป
>   - แรงขับทุกเครื่องยนต์มาจากกฎเดียวของหัวฉีด F = λ·F_vac − p_a·A_e และเมื่อหัวฉีดทำงานต่ำกว่าความดันภายนอกมาก ๆ การไหลจะแยกตัวจากผนังตามเกณฑ์ของ Schmucker
>   - เครื่องยนต์สุญญากาศที่จุดในอากาศได้แรงขับเท่าที่หัวฉีดให้ได้จริงที่ความดันนั้น
> - **ผลการวัด (ฐาน 7f991f9 เทียบกับ branch นี้):**
>   - ตาราง fleet แบบมวลจุด: ผ่าน 156 จาก 222 แถวเท่าเดิม ทุกแถวที่เคยผ่านยังผ่าน (131 แถวที่ถูกตัดสินผ่านครบ)
>   - Δv คงเหลือเฉลี่ย −16.5 m/s (D-51 −19.6, กฎหัวฉีด +3.1)
>   - six-DOF ทุกฐานปล่อยที่ลองบิน (9 เที่ยว) ผลเหมือนเดิมทุกเที่ยวและเข้าวงโคจรทุกเที่ยว
>   - ยานแบบยืดหยุ่น (flex-fleet ทั้ง 4 ไฟล์ 19 เทสต์) ผ่านทุกเทสต์ทั้งก่อนและหลัง แรงที่โครงรับเปลี่ยนไม่เกิน 2 จุดเปอร์เซ็นต์
>   - ค่า Build ratings ยังอยู่ในกรอบ ±25 % เหมือนเดิม
> - **แก้เพิ่มในรอบนี้:**
>   - แยกข้อความแหล่งที่มาของข้อมูลหัวฉีดออกจากตัวเลข เพื่อไม่ให้ข้อความถูกส่งไปกับโปรแกรม
>   - ย่อข้อความ UI ใหม่ทั้งสามภาษา
>   - ให้บทเรียนและ Monte Carlo อ่านวงโคจรจาก apsides จริงทั้งสองแบบจำลอง ซึ่งเป็นบั๊กที่ D-51 ทำให้เกิดขึ้น
> - **ยังไม่ผ่าน (ต้องให้เจ้าของเลือก):**
>   - งบขนาดไฟล์: lesson-file เกิน 8.3 kB และ precache code เกิน 50.7 kB ไม่ได้ยกเพดานเอง
>   - เที่ยวบินประวัติศาสตร์ Sputnik-1, Vostok-1 และ Mercury-Redstone 3 ไม่ถึงวงโคจร/จุดลงจริงแล้ว เพราะฐานปล่อยบนทรงรีอยู่ต่ำกว่าทรงกลมเดิม 11 กม.
>   - แบบ six-DOF: Sputnik-1 และ Vostok-1 ยังเข้าวงโคจรได้ แต่แคปซูล Vostok-1 ลงห่างจุดจริง 14.95 กม. (เดิม 0.99) และ Freedom 7 ลงห่าง 26.99 กม. (เดิม 11.36) เกินเกณฑ์ ทั้งสองเกิดจาก D-51 อย่างเดียว
>   - การยิงครั้งเดียว (single-burn) เมื่อตัดสินจาก apsides จริง
>   - บทเรียน 1.4 และ 2.2
>   - เครื่องมือวัดในเทสต์ 4–5 ตัวที่ยังคิดบนทรงกลม
> - **ไม่ได้บันทึก golden/fingerprint ใหม่:** ตามแผน จะบันทึกครั้งเดียวตอนท้ายหลังงาน Apollo มีรายการค่าเก่า/ใหม่ทั้งหมดในรายงานนี้
> - **ข้อจำกัดตอนหาข้อมูล:** ค้นหาเว็บได้ แต่เปิดหน้าเว็บไม่ได้ จึงหาแหล่งยืนยันได้เพิ่มเพียงตัวเลขเดียว ที่เหลือยังเป็นค่าประมาณที่ระบุเหตุผลไว้

```yaml
envelope: v2
package: Argon4 follow-up, workstreams 1 + 2 (re-baseline)
step: one validated re-baseline (plan S01), goldens not re-recorded here
items: [M-PHYSICS-023, M-PHYSICS-024 (path b), M-LAUNCH-031 (point mass)]
change_kind: physics (moves every fingerprint)
execution_authorized: true
owner_authorization:
  - {date: 2026-10-17, quote: "ทำพร้อมกัน", scope: "D-51: J2 in the point-mass ascent and the sites on WGS-84, together"}
  - {date: 2026-10-17, quote: "ใส่เข้าไปด้วยเอาให้สมจริงที่สุด", scope: "point-mass coasts on J2, with the planning and judging that needs"}
  - {date: 2026-10-17, quote: "ข", scope: "throttle and pressure: F = λ·F_vac − p_a·A_e with flow separation"}
  - {date: 2026-10-17, quote: "เอาทางที่ตามหลักฟิสิกส์ของจริงเลยครับ ของจริงเป็นแบบไหน ก็ใช้แบบนั้น", scope: "vacuum engines lit in the air"}
base_sha_verified_on: {sha: 7f991f9, date: 2026-10-17}
branch: ws/rebaseline (worktree), not pushed
reviewers: [second agent (physics, D-25) — pending]
report: docs/development/reports/argon4-fu-rebaseline.md
```

## What changed for the user

- **The Earth is the WGS-84 ellipsoid.** The pads stand on it at their geodetic latitude and altitude. Before, they stood on a 6 378 137 m sphere: 4.9 km too high in radius at the Cape, 11.0 km at Baikonur, 13.2 km at Vostochny and 16.9 km at Plesetsk. The HUD's altitude, the telemetry and the events show the height above the ellipsoid. Orbit heights stay the radius less 6 378.137 km (GCAT's convention). The scene draws the ellipsoid.
- **J2 from the pad to the orbit, in both models.** The point-mass ascent and every point-mass coast fly μ/r² + J2; before, they used the central field and Kepler arcs. The burn planner predicts that coast. Every orbit is judged on its physical apsides: the lowest and highest altitude of the next revolution. A point-mass orbit can therefore read a few kilometres apart in perigee and apogee where it read a near-perfect circle before (Ariane 64 leo/50: 497.4 × 497.4 → 500.0 × 500.1 km).
- **One thrust law, from the engine's nozzle.**
  - A throttled engine low in the air now loses the air's whole push on its exit, not a throttled share of it.
  - Deep throttle near the ground, or a vacuum engine lit in the air, separates its flow inside the bell. The flight then flies the higher thrust of the separated nozzle and reports `evt.nozzleSeparation` once. In the fleet only Angara-A5 does this: its RD-191 core runs at 30 % from 0.6 km, separated at area ratio 23.5 of 37.
  - A solid's head-end peak gives a little more thrust, because the air takes p₀·A_e off the peak rather than a share of it.
- **The test stand fires a vacuum engine in air.** It no longer refuses: it gives what the nozzle really gives (the Merlin Vacuum 775 of its 981 kN at sea level, Isp 275 s) and says where the flow separates. Throttled in air, the Isp it measures falls with the throttle; in vacuum it does not.
- **The builder warns of a vacuum engine on an air-lit strap-on** (`vacuumEngineInAir`). The warning gives the altitude below which the engine's flow separates and its sea-level thrust. A vacuum engine on the pad is still refused (owner question 6).
- **Lessons and Monte Carlo** read the orbit on its physical apsides in both models (fixed here; see "Found and fixed in this step").

## The physics

**Sites and heights.** A site at geodetic latitude φ, longitude λ and height h sits at

    r = ((N + h) cos φ cos(λ+θ), (N + h) cos φ sin(λ+θ), (N(1 − e²) + h) sin φ),   N = a/√(1 − e² sin²φ)

with a = 6 378 137 m and f = 1/298.257223563. Air, ground and the shown altitude use the geodetic height. The plane geometry from the pad uses the pad's geocentric latitude.

**Gravity everywhere.** The gravity is

    g = −μ r/|r|³ + J2 term   (J2 = 1.08262668 × 10⁻³)

from the pad through every coast. With the Earth's turn, it gives Somigliana's normal gravity at every WGS-84 pad to 5.1 × 10⁻⁶ (the worst pad is Jiuquan; tests/wgs84-sites.test.ts). The gravity loss in the Δv book is −g·v̂ dt.

**Coasts and judging.** A free coast is RK4 under J2 in steps of at most 10 s. The burn planner forecasts the same coast. The verdict, the result panel, the fleet acceptance and now the lessons' measures and the Monte Carlo final orbit all read the physical apsides.

**The thrust law** (src/physics/nozzle.ts). The level λ is the throttle × a solid's profile × the start-up or tail-off ramp. It scales the mass flow and the chamber pressure, but not the exit velocity. With the flow attached:

    F = λ·F_vac − p_a·A_e,    ṁ = λ·F_vac/(g₀ Isp_vac),    Isp = F/(ṁ g₀)

For an engine with a sea-level pair, A_e = (F_vac − F_SL)/p₀, so at λ = 1 and p₀ the law returns the catalogue's sea-level thrust exactly. The old law was F = λ·[F_vac − (F_vac − F_SL)·p/p₀].

**Separation.** Schmucker's criterion (NASA TM-77396, 1984, eq. 11) is

    p_i/p_a = (1.88 M_i − 1)^−0.64,   M_i held at 5 above 5

It is applied to the one-dimensional isentropic wall pressure at λ·p_c. Downstream of the separation point the wall sees about p_a, so the nozzle flies as if it were cut off at the separation area ratio ε_s:

    F = λ·p_c·A_t·C_F,vac(ε_s) − p_a·A_t·ε_s   (floored at 0)

This meets the attached law at ε_s = ε, with no step: tested to 10⁻⁵ of F_vac across the boundary. Once separated it lies above the attached law, because dF/dε = A_t(λ p_c p̂ − p_a) < 0 where the wall pressure is below ambient. Its inverse, `engineLevelFor`, is what the landing and return guidance use to choose a level for a thrust.

**My review of the law.**

- The attached law and the mass flow are the textbook ones: the throat is choked, so ṁ ∝ p_c. The separated thrust is the usual first-order "nozzle cut at separation" model. The test in tests/nozzle-law.test.ts restates the one-dimensional nozzle independently and matches the code:
  - C_F as the wall pressure integrated over the bell agrees with the closed form to 5 × 10⁻⁷;
  - the Merlin Vacuum and the RL10C-1 at sea level, from their published geometry, agree to 5 × 10⁻⁴;
  - RD-180 at 47 % at 10 km and a P120C at its peak are checked by hand.
- **A solid's profile as λ is consistent.** The profile is normalised so that its time-mean is 1 (`solidTail`), so the solid's mean sea-level thrust stays its catalogue figure, mean(λ)·F_vac − p₀·A_e = F_SL. The start-up and tail-off are ramps of chamber pressure, and they pass through separated flow, as real engines do.
- **The wall factor** (the least factor on the one-dimensional wall pressure that keeps an engine's qualified sea-level point attached) is defensible as a calibration, not a measurement:
  - Its direction is physical. Schmucker's SSME exit wall pressure is 0.0019·p_c, 2.4 times the one-dimensional 0.00080·p_c that I computed for ε 69 at γ 1.26 (probe `py/nozzle1d.py`). I could not re-open TM-77396 to re-read the 0.0019 (the network allowed searches and refused the page), so that figure rests on the earlier session's reading.
  - Its size is the least that the catalogue's sea-level thrust forces. It acts on 14 engine names in seven families: Vulcain 2.1 2.53, YF-77 2.14, LE-7A 1.85, the Starship blend 1.35, LE-9 1.26, the R-7's chambers 1.04–1.28, RD-0213 1.10.
  - Its weak point: such an engine sits exactly on the separation boundary at full thrust on the pad, so any throttle below 1 at sea level separates.
  - The alternative is one factor for every bell, Schmucker's SSME 2.4. That would leave Vulcain 2.1 separated on the pad (it needs 2.53) and move every other engine's onset to deeper throttle (Merlin 1D from λ 0.42 to about 0.18) with no data per engine. The other alternative is measured end-of-nozzle wall pressures per engine, which the fleet does not publish. Owner question 7.
- **The side loads of separated flow are not modelled.** No sourced criterion for what breaks a nozzle was found. The flight reports the separation and flies the thrust.

**The vacuum engines' exit areas** (src/data/nozzles.ts; each number's source or estimate is in `NOZZLE_SOURCES`):

- **Sourced:**
  - the RL10C-1 and C-1-1, from L3Harris's 57 and 62 in exits;
  - Vinci, from the Ariane 6 extension, 1.82 m at ε 174 (IAC-17-C4.1.7);
  - the J-2, from its 170.4 in² throat × 27.5, which gives 1.96 m;
  - the Merlin Vacuum, from ε 165 at 9.7 MPa, which gives a 3.30 m exit;
  - YF-75 and YF-75D, from ε 80 and their chamber pressures (Wikipedia, Nan 2013);
  - LE-5B and LE-5B-3, from ε 110 and their chamber pressures (EUCASS 2017-189).
- **Searched on 2026-10-17:** WebSearch worked, while WebFetch and curl were refused by the egress proxy, so a figure was accepted only where a search result put it on a named page.
  - New source: the AVUM+ engine's chamber pressure is the RD-843's 2.04 MPa (Wikipedia infobox; its own citation not checked). It replaces a 1.8 MPa estimate and moves the exit from 0.234 to 0.220 m.
  - Still estimates, with what the search found added to their reasoning: the RD-0110 and RD-0124 ε, the S5.92 and S5.98M ε, RD-0109, Rutherford Vacuum, Curie and L-2-5, and the solids' ε.
  - Tried again on 2026-10-18 for the RD-0124 page: WebFetch failed with `getaddrinfo ENOTFOUND en.wikipedia.org`. No number in src/data/nozzles.ts was changed in this step, so the measurements below stand for the table as it is.
- At sea level the law gives:

  | Engine | Thrust at sea level | Separation |
  |---|---|---|
  | Merlin Vacuum | 775 of 981 kN, Isp 275 s | at ε 28 of 165; attached above about 15 km |
  | RL10C-1 | 77 of 102 kN | |
  | RD-0124 | 238 of 294 kN | |

## Review of the three git-am conflict resolutions

The hunks of the hand-over's nozzle WIP in simulation.ts, return-guidance.ts and debris-runtime.ts, compared line by line with 2be2354, are identical. The only difference is the `R_EARTH` import, which the WGS-84 tree no longer uses. The geodetic heights (`geodeticHeight`) are kept at every thrust site, and `engineThrustAt`/`engineLevelFor` are used throughout. No change was needed.

## Found and fixed in this step

1. **Bundle (fixes 2be2354).** The nozzle table's provenance text shipped in every chunk that flies an engine: each physics worker +7.5 to +8.3 kB over its ceiling, `lesson-file` +17.3 kB, i18n +3.2 kB. The numbers and their sources are now two tables in src/data/nozzles.ts; the sources are plain literals that the bundler drops. The J-2's exit is written out as a number, because a `Math.sqrt` call there leaked into chunks that do not fly an engine. The new UI texts are shorter in all three languages. The nozzle table probe is identical number for number before and after the split.
2. **Lessons and Monte Carlo on the physical apsides (D-51).** `flightElements` (src/lessons/measures.ts) and the Monte Carlo final orbit took the physical apsides in six-DOF only. A point-mass Falcon 9 to 500 km read its lesson apogee as 510.2 km, against the 501.6 km its verdict judged, and tests/scenario-link.test.ts failed. Both now read the physical apsides in both models. Compared over 15 test files on 03b07da and with the fix, no other test changes.

## Tests run

All with `--maxWorkers=2`, or 1 for the heavy and probe runs; counts are as vitest printed them.

| Run | Files | Tests | Result |
|---|---|---|---|
| Every file that imports vehicle.ts, nozzle.ts, the nozzle data, the design files, the thrust sites or i18n, plus the changed tests (before the fixes) | 121 | 8 117 | 8 112 pass, 5 fail |
| The golden, historical, lesson, re-check and Monte Carlo files, after fix 2 | 53 | 847 | 782 pass, 65 fail: the goldens and the findings below |
| After fixes 1 and 2: i18n, design, nozzle data, lessons' measures, Monte Carlo, warning and stand importers | 105 | 7 962 | 7 949 pass, 13 fail, all listed below, none new |
| tests/nozzle-law.test.ts, final | 1 | 22 | pass |
| tests/heavy/sixdof-fingerprint.test.ts | 1 | 22 | 21 fail (the fingerprints, below), 1 pass |
| Heavy, this branch's HEAD, one file at a time, `--maxWorkers=1`: flex-golden, mercury-redstone, vostok1-return, vostok1-recording, history-sixdof, historical-docking | 6 | 11 | 6 pass, 5 fail: the 3 flex goldens (below), Mercury-Redstone 3 and Vostok-1's return (findings below) |
| Five of them on the base (7f991f9): mercury-redstone, vostok1-return, vostok1-recording, history-sixdof, historical-docking | 5 | 8 | 8 pass (flex-golden's recorded hashes are the base's, so it was not re-run there) |
| mercury-redstone, vostok1-return, history-sixdof on the D-51-only tree (4fc67f1) | 3 | 5 | mercury-redstone and vostok1-return fail with the branch's numbers; history-sixdof passes |
| Heavy flex-fleet-1…4, this branch and the base, one file at a time, `--maxWorkers=1` | 4 + 4 | 19 + 19 | all pass on both trees |
| Re-check on HEAD of earlier probes: the point-mass fleet table, the Build ratings, d01-fleet-fingerprint, rigid-flex-golden, nozzle-law, design-ratings | 2 probes + 4 | 1 + 1 + 59 | fleet table and ratings identical to the earlier probes row for row; 28 pass, 31 fail: the 27 D01 and 4 rigid-flex hashes, each the new value listed below |
| Attribution runs on the D-51-only tree (4fc67f1) | 3 + 13 + 3 | 55 + 308 + 43 | 4, 63 and 2 fail |
| Attribution runs on an export of 03b07da (without the fixes) | 3 + 15 | 43 + 346 | 3 and 32 fail |

The 5 failures of the first run are the four instruments below and scenario-link (fix 2). `npx tsc --noEmit` is clean.

## Before and after

**Point-mass fleet** (`allCases` of tests/fleet-harness.ts judged by `acceptanceFailures`; probes `fleet-base3.tsv`, `fleet-ws1-3.tsv`, `fleet-branch3.tsv`, compared by `compare_fleet.py`):

- 156 of 222 rows are accepted before, after D-51 alone, and after both. There are 0 regressions and none newly accepted, and all 131 gated rows pass.
- Mean Δv left over the gated rows: D-51 −19.6 m/s, the law +3.1 m/s, both −16.5 m/s (range −156 to +25).
- By vehicle, the mean change in Δv left (m/s):

  | Vehicle | Both | D-51 alone | Law alone |
  |---|---|---|---|
  | Saturn V | −61.2 | −61.2 | 0.0 |
  | Atlas V | −37.3 | −38.9 | +1.6 |
  | Angara-A5 | −35.8 | −38.6 | +2.8 |
  | Falcon 9 | −33.8 | −30.7 | −3.2 |
  | Proton-M | −32.4 | −32.6 | +0.2 |
  | Falcon Heavy | −27.0 | −16.8 | −10.2 |
  | Long March 5 | −24.0 | −24.0 | 0.0 |
  | Starship | −24.0 | −21.6 | −2.4 |
  | Soyuz-2.1b | −21.3 | −21.3 | 0.0 |
  | Long March 3B/E | −16.3 | −16.3 | 0.0 |
  | Electron | −13.6 | −13.6 | 0.0 |
  | Vulcan | −9.6 | −17.1 | +7.6 |
  | H-IIA | −9.0 | −11.9 | +2.9 |
  | Vega-C | −3.4 | −3.3 | −0.1 |
  | H3 | +0.5 | −3.4 | +3.9 |
  | Ariane 64 | +2.3 | −14.9 | +17.2 |
  | PSLV-XL | +15.6 | −7.0 | +22.6 |

- Smallest margins after (before): H-IIA iss/90 26 m/s (58), Atlas V iss/90 42 (38), Saturn V leo/90 70 (143).

**Build ratings** (the probe of tests/design-ratings.test.ts' rows; ±25 % bound unchanged). Computed / published, before → after:

| Row | Before | After |
|---|---|---|
| LEO Soyuz-2.1a | 8 140 kg (1.096) | 7 911 kg (1.065) |
| LEO Falcon 9 | 20 031 (0.879) | 19 842 (0.870) |
| LEO Long March 2D | 3 165 (0.904) | 2 942 (0.841) |
| LEO Vega-C | 4 330 (1.312) | 4 371 (1.325), the recorded miss, unchanged |
| LEO Ariane 64 | 26 274 (1.216) | 26 274 (1.216) |
| LEO Electron | 315 (1.050) | 311 (1.037) |
| GTO Falcon 9 | 6 832 (0.823) | 6 756 (0.814) |
| GTO Ariane 64 | 13 328 (1.159) | 13 328 (1.159) |

The same rows meet the bound before and after. tests/design-ratings.test.ts passes.

**Six-DOF, one flight per site latitude** (probe `sixdof-sites3.test.ts`, calm air, seed 20260919, the six-DOF fleet suite's judge; `sixdof-sites3-base.tsv` and `-branch.tsv`; Angara-A5 and Soyuz-2.1b also on the D-51-only tree, `sixdof-angara-ws1.tsv`):

| Site | Flight | Before: verdict, pe × ap km, Δv left | After | D-51 alone |
|---|---|---|---|---|
| Baikonur | soyuz21b/iss/50 | OK 414.6 × 425.4, 1 658 | OK 414.7 × 425.3, 1 612 | 1 612 |
| Plesetsk | angaraa5/leo/25 | OK 496.5 × 503.2, 3 631 | OK 496.8 × 502.9, 3 472 | 3 413 |
| Vostochny | soyuz21b/iss/50 (not a fleet row) | miss 420.0 × 424.8, 1 645 | miss 420.5 × 425.3, 1 579 | |
| the Cape | falcon9/leo/50 | OK 499.3 × 501.0, 1 595 | OK 499.6 × 501.2, 1 575 | |
| Kourou | ariane64/leo/50 | OK 500.0 × 500.1, 3 005 | OK 499.9 × 500.1, 3 016 | |
| Kourou | vegac/sso/50 | OK 596.4 × 603.2, 931 | OK 596.5 × 603.1, 931 | |
| Tanegashima | h2a202/leo/50 | OK 499.2 × 501.3, 2 061 | OK 499.2 × 501.3, 2 054 | |
| Tanegashima | h3/sso/50 | OK 597.6 × 602.6, 4 988 | OK 597.6 × 602.5, 4 981 | |
| Jiuquan | longmarch2d/sso/50 (architecture-excluded) | miss 196.7 × 603.0, 679 | miss 194.0 × 607.2, 618 | |

Every verdict is the same, and every flight is in orbit. Nothing broke.

**Budget** (`npm run build && npm run budget`; ceilings unchanged):

| Tree | Result |
|---|---|
| Base 7f991f9 | all ok |
| D-51 alone | all ok (`lesson-file` exactly at its 347.0 kB ceiling) |
| This branch | index 2 642.8 kB / 2 645 ok; every physics worker ok; i18n 1 728.3 / 1 729 ok; **`lesson-file` 355.3 / 347.0, +8.3 kB FAIL; precache code 14 774.7 / 14 724.0, +50.7 kB FAIL** |

On `lesson-file`, the law costs 8.2 kB: the numbers table 4.0 kB, the law's functions 3.6 kB and the tail-off integral 0.2 kB. Seven chunks carry it. Owner question 1.

**What this branch adds to each chunk** (rebuilt on 2026-10-18: the base copy of 7f991f9 and this branch's HEAD, `npm run build && npm run budget` in each; probes `finish/budget-base.txt`, `finish/budget-branch.txt`; bytes from `stat` on dist/assets), for planning the rebase:

| Chunk | Base 7f991f9 (B) | This branch (B) | Added | Ceiling |
|---|---|---|---|---|
| index-*.js | 2 643 168 | 2 642 841 | −327 B | 2 645.0 kB |
| i18n-*.js | 1 727 299 | 1 728 326 | +1 027 B | 1 729.0 kB |
| lesson-file-*.js | 345 485 | 355 266 | +9 781 B | 347.0 kB |
| flight.worker-*.js | 578 900 | 587 699 | +8 799 B | 589.0 kB |
| recheck.worker-*.js | 887 641 | 896 446 | +8 805 B | 902.0 kB |
| the other physics workers (tune, monte-carlo, ratings, readiness) | 551.2 / 549.5 / 558.6 / 572.7 kB | 560.0 / 558.2 / 567.4 / 582.1 kB | +8.7 to +9.4 kB each | 561 / 559 / 569 / 583 kB |
| precache code | 14 710.8 kB | 14 774.7 kB | +63.9 kB | 14 724.0 kB |

On main 79d2686 the i18n chunk is about 1 728 985 B and the index chunk about 2 639.9 kB (the orchestrator's figures; I did not build main). If the deltas carry over unchanged through the rebase, i18n would be about 1 730 012 B, about 1.0 kB over its 1 729 kB ceiling, and the index chunk about 2 639.6 kB, under its 2 645 kB. So the rebase also needs about 1.0 kB of i18n text saved, or the decision of owner question 1, besides `lesson-file` and precache code. The deltas are what this branch adds over 7f991f9; after the rebase the minifier's output can differ by some bytes, so they are to be measured again on the rebased branch. No ceiling was raised.

## Goldens and fingerprints: to re-record at the end

None is updated here. Each moves under D-51 alone and again under the law: the law changes every engine's start-up and tail-off, so even a full-thrust flight moves. The D01 hashes below were compared with the D-51-only tree, and all 27 move again under the law.

**tests/d01-fleet-fingerprint.test.ts**, old → new:

| Row | Old | New |
|---|---|---|
| soyuz21a/leo/50 | 4b1f0b7f49f9651a | 68c899086cf3a493 |
| soyuz21b/leo/50 | 7973a02dec1cf395 | 07f5f2d8ad1163ca |
| protonm/leo/50 | 46ca21856e1a5d25 | 1771270db04a99f9 |
| angaraa5/leo/50 | 7cea61f34555f892 | dbf74b920590b3f3 |
| falcon9/leo/50 | 8504537bbd7ef7e5 | ad0c472bd48cc704 |
| falconheavy/leo/50 | 9d7255f795d6d88b | 1883b26c0b7faed8 |
| atlasv551/leo/50 | 0d1e6478571ba55a | 2ce0c0599cf317b4 |
| vulcan/leo/50 | 4d91d8ca27fb9268 | 2cf36d6492cbd6a7 |
| ariane64/leo/50 | 0c847c54216a4e9e | 217ad9dfb388cc24 |
| vegac/leo/50 | 90be7919be291d5a | d191561fb9bdfd4a |
| longmarch2d/leo/50 | b5245d6120455552 | 781961be953ca6ef |
| longmarch3be/leo/50 | 7f72f2cf338e447f | bd2fffbefaefc562 |
| h2a202/leo/50 | 6cc53db4bd700dd2 | e2ca098882902ed6 |
| longmarch5/leo/50 | 872f594cb4817a02 | 240365a3b67bbf44 |
| h3/leo/50 | 19f258b3c7260121 | 1e345103fcb80da7 |
| pslvxl/leo/50 | 230c580197fb8478 | e5ce3880c4c43e4f |
| electron/leo/50 | 05d6bef5f0121eee | e2ea372e8cd2c57b |
| starship/leo/50 | 2eb2b5a1a855178c | 313d1ac2415f7b91 |
| sputnik8k71ps/leo/50 | 78195a7baaf7e849 | 138757d774af2e9f |
| vostok8k72k/leo/50 | 4e37c2c9a626ebd9 | 55f9ff0a97bebb69 |
| saturnv/leo/50 | 6216e2d36a22f147 | 365315d403382067 |
| protonm/gto/50 | 904a8a631b0b7e7d | 7c12e8856995557f |
| soyuz21b/gto/50 | 9f4b1fceeea35057 | 6ce30577ea69b6b6 |
| ariane64/gto/50 | 5f39c0051d6adb58 | ecbaa004086a1ddb |
| vegac/sso/50 | c6c598e3d8ea5910 | 28797aafdff2936f |
| pslvxl/sso/50 | 4a10da20085b3a09 | 4d574090ddf3fee2 |
| angaraa5/leo/25 | 1fd2f80a8d65c52e | 6476ee513814781b |

**tests/heavy/sixdof-fingerprint.test.ts** (first 160 s in six-DOF), old → new:

| Row | Old | New |
|---|---|---|
| soyuz21a | f8fa995d2de674a4 | d8404e724002c10e |
| soyuz21b | 6f67c4ea034ec61e | 642c87fe000e51eb |
| protonm | 336045ed763a8b3e | 1c9e40eced95cd1b |
| angaraa5 | 4d4263d76a86d994 | e1966536d2ac1399 |
| falcon9 | 4e7814725cdd4e3b | b87dd7cb8331167e |
| falconheavy | d54a7e829a77ee6a | 14c199d77b490f9e |
| atlasv551 | 24fc1e3c19a18c03 | 26b3419988c253fe |
| vulcan | 1b2c16f43de54bb5 | e88145567f3ac939 |
| ariane64 | e521b86e4a051606 | b5f685ec02f06e86 |
| vegac | 0722edddb57aba60 | 34ffdfd553ba2b79 |
| longmarch2d | 5af7969a7628260f | 507711a7298c1a98 |
| longmarch3be | 14358272e7fd7e78 | a401046083ee9ced |
| h2a202 | e731ac41a0d095dc | 712ddcfe8d665dc4 |
| longmarch5 | ae476b10f10daca4 | 2e6a56f62c5a4db0 |
| h3 | 880630716ae91a1c | cf21d2222b9b93dc |
| pslvxl | 91ecd642a27e2a54 | 56d445cae536b5f9 |
| electron | 243da45d37772709 | 1aba1727afa73a18 |
| starship | a862fc906a084284 | 25e0c3c5c9ea1dad |
| sputnik8k71ps | 6024ac904f0a2720 | 7af14988f167fb73 |
| vostok8k72k | ffbd505b985e9895 | f743e7985f46c004 |
| saturnv | f21081ad198eff52 | fcda3ec3ef5f09f3 |

All rows are leo/50.

**The other goldens and recorded values:**

| Test | What moves | Old → new |
|---|---|---|
| tests/rigid-flex-golden.test.ts (first 160 s, six-DOF without the flexible options) | Falcon 9; the same hash with every option given and off | 3f48e9ee37213f9e → f9d5e3642776ba76 |
| | Soyuz-2.1a | 50072d4def956341 → 3c45c7a19b8dac49 |
| | Angara-A5 | 98ef622ae14d11eb → 3b4fe3521e06fa21 |
| tests/heavy/flex-golden.test.ts (the whole missions, six-DOF without the flexible options) | Falcon 9 | 7fb4ebc11cd17b4f → 0476328eeba9fb01 |
| | Soyuz-2.1a | d099a931012c9dfe → c9d931a347587cdc |
| | Angara-A5 | bf2b7d5589b88818 → 4cc5058d6077933b |
| tests/eo-phy-6/apollo11.test.ts | event digest | 330b5fd071b9da23… → 51074bd675707d1e… with D-51 alone, f01c4579432269e2… with both; the entry-interface and state words move with it |
| tests/d01-vehicles-identity.test.ts | Angara-A5's point-mass kick 4° → 3.5° (commit 2249b9e); the literal grows from 32 830 to 32 832 characters | D-51 alone; the law does not touch it |
| tests/recheck.test.ts (T02 fixtures) | match / borderline / differs / cannotRefly | 4 / 2 / 0 / 0 → 2 / 1 / 2 / 1; the recorded results were flown on the old physics |
| tests/replay.test.ts (two tests) | Soyuz-2.1a's max-Q instant | T+63.0 → T+63.1 s (D-51) |
| tests/lesson-packs.test.ts | the five packs' recorded files ("each file what its source writes") and the instructor's re-check of a pack record | the records were made on the old physics |

## What fails and is not a golden: findings, causes, no bound changed

| Test | Measured | Cause |
|---|---|---|
| historical-vehicles: Sputnik-1 and Vostok-1 reach the flown orbit; Vostok-1's over-burn, its return and its report; lessons-history 5.3 and 5.4; fleet-defaults "a fully excluded vehicle must have a dedicated mission that succeeds" (Sputnik's); lesson-grading-end (5.4's perigee) | Sputnik-1 214 × 779 km, against the flown 214 × 938 (before 214 × 937); Vostok-1 168 × 260 km against 168 × 314 (before 168 × 315), both burning to depletion; Vostok-1's return lands 103.2 km short (bound 15 km) | D-51. Baikonur's pads are 11 km lower in radius on WGS-84. Sputnik's R-7 climbs 225 km instead of 214, with 32 m/s more gravity loss and 35 m/s more steering loss, and cuts off at 7 913 m/s against 7 955. Vostok-K: 38 and 21 m/s more, 14 m/s slow (probes `sputnik-trace.test.ts`, `historical.test.ts`). These vehicles were flown to depletion exactly on the sphere: their data are tuned to the old pad. Owner question 2. |
| historical-vehicles: Mercury-Redstone 3 (point mass) | lands 30.8 km from Freedom 7 (bound 25 km) | D-51 (the Cape pad moves). Owner question 2. |
| heavy/mercury-redstone: Mercury-Redstone 3 (six-DOF) | lands 26.99 km from Freedom 7 (bound 25 km), 505.2 km downrange; before 11.36 km and 490.2 km. D-51 alone gives the same 26.99 km and 505.2 km, so the law adds nothing here (probe `finish/hist6dof.test.ts`, run on the base copy, the D-51-only tree and this branch) | D-51: Launch Complex 5 now stands on the ellipsoid, and the Redstone's lob, tuned on the sphere, carries 15 km further. Owner question 2. |
| heavy/vostok1-return: Vostok-1's return (six-DOF) | the sphere comes down 14.95 km from its place by Smelovka, 14.90 km short along the track and 1.18 km across (bounds 15 km in all, 10 km along); before 0.99 km (0.22 along, 0.96 across). D-51 alone: 14.95 km, 14.91 along (same probe) | D-51. The TDU-1's pitch (2.51°) was reconstructed for the orbit flown from the sphere's pad. In six-DOF Vostok-1 still reaches its orbit (heavy/history-sixdof passes), so this is the return alone. Owner question 2. |
| vostok-replay: the recorder's cadence | last orbit frame 17.4 s before the retro sequence (bound 10 s) | D-51; downstream of Vostok-1's missed orbit. Not traced further. |
| fleet-defaults: Soyuz-2.1a single burn to a 200 km circle; the direct-insertion grid; Soyuz-2.1a + crew ship perigee; H-IIA iss/90 retrograde trim; Long March 2D sun-synchronous delivery | physical apsides 199.6 × 211.2 km with 6 318 kg (off target; before 198.6 × 200.5); the grid closes within 4.2 and 7.2 km against 3 km; perigee 15.7 km off (bound 10 km); 18 km left; LM-2D checked on `sim.state.elements` (osculating) | D-51. The single-burn and trim targets are aimed on the conic and judged on the physical apsides. Owner question 4. |
| lesson-packs: A1, P1, R2 and "12.1 and 14.2 up to 1 000 s late" (the GTO lessons) | the worked answer from the reached heights, a = 24 322.6 km, against the 24 363.7 km the measure reads off the osculating ellipse | D-51 (the measure's a is osculating, the heights are physical). Owner question 4. |
| lessons 1.4 | the 18 t solution keeps 145.8 m/s of Δv, under its reserve | D-51. Owner question 5. |
| lessons-round2 2.2 | standard steering an engine short now runs dry with its perigee at 116 km instead of ending off target; the lesson still fails it, and PEG and IGM still pass | the thrust law (Falcon 9's engine-out case). Owner question 5. |
| fleet-defaults: Vega-C's AVUM+ first ignition; reference timelines | the AVUM+ ignition is no longer after T+2 400 s; Electron's fairing jettison joins the published-callout disagreements (7, against 6) | D-51. Owner question 5. |
| data-consistency: corridor sweep | Baikonur's reach 0.19° off the declared pair (bound 0.051°) | D-51. The sweep instrument reads latitude on the sphere. Owner question 3. |
| recovery-return: tower catch | height by \|r\| − 6 378 137 m − site altitude: −4 068 m; above WGS-84 less the site's altitude: 13.0 m, inside the 8–18 m | D-51 instrument (probe `tower`). Owner question 3. |
| equations (E02): the Δv book | 3.2 × 10⁻³ (bound 10⁻³). The test's v₀ = ω(R⊕ + h)cos φ = 408.50 m/s; the WGS-84 pad's speed is 408.81 m/s, and with it the book closes to 6.0 × 10⁻⁵ | D-51 instrument (probe `eom-budget2`). Owner question 3. |
| recovery-return: LZ-1 divert | 0.225 m/s² with the velocity "straight down" along the radius, 0.161° off the plumb line; 1.4 × 10⁻¹¹ m/s² down the WGS-84 normal (commit 03b07da) | D-51 instrument (probe `divert`). Owner question 3. |
| fx5-031-judged-params: an orbit | "point-mass judges on the conic: no physical apsides" — since D-51 it carries them (`apAltM` 501 603 m) | the owner's decision changed the assertion's meaning. Owner question 3. |

**The flexible fleet** (tests/heavy/flex-fleet-1…4: every vehicle with slosh, the first bending mode and the bending filter, on its reference mission in crosswind, judged by `acceptanceFailures` with every shell under 80 % of its allowable; each file alone with `--maxWorkers=1`, on the base and on this branch; logs `finish/base-flex-fleet-N.log` and `finish/branch-flex-fleet-N.log`). All 19 tests pass on both trees. The flights' own lines, before → after:

| Flight (file) | Before: status, shell load, bending, slosh, end t | After |
|---|---|---|
| soyuz21a/iss, crew (1) | orbit, 10 %, 0.6 cm, 1 cm, 3347 s | orbit, 10 %, 0.6 cm, 2 cm, 3336 s |
| soyuz21b/leo/25 (1) | orbit, 13 %, 0.6 cm, 2 cm, 8824 s | orbit, 13 %, 0.7 cm, 2 cm, 8818 s |
| protonm/leo/25 (1) | orbit, 23 %, 3.5 cm, 24 cm, 4583 s | orbit, 23 %, 3.5 cm, 24 cm, 4635 s |
| angaraa5/leo/25 (1) | orbit, 12 %, 2.3 cm, 13 cm, 3873 s | orbit, 10 %, 1.6 cm, 17 cm, 4180 s |
| falcon9/leo/25 (1) | orbit, 28 %, 4.7 cm, 14 cm, 3236 s | orbit, 28 %, 4.3 cm, 14 cm, 3236 s |
| falconheavy/leo/25 (2) | orbit, 35 %, 8.2 cm, 22 cm, 3254 s | orbit, 35 %, 8.2 cm, 22 cm, 3254 s |
| atlasv551/leo/25 (2) | orbit, 17 %, 5.7 cm, 12 cm, 3409 s | orbit, 17 %, 5.6 cm, 12 cm, 3536 s |
| vulcan/leo/25 (2) | orbit, 11 %, 2.6 cm, 27 cm, 11014 s | orbit, 11 %, 2.5 cm, 28 cm, 10989 s |
| ariane64/leo/25 (2) | orbit, 9 %, 1.5 cm, 25 cm, 3689 s | orbit, 9 %, 1.6 cm, 32 cm, 3680 s |
| vegac/leo/25 (2) | orbit, 7 %, 0.6 cm, 7 cm, 3177 s | orbit, 7 %, 0.6 cm, 7 cm, 3178 s |
| longmarch2d/sso/650 kg (3) | orbit, 15 %, 0.5 cm, 7 cm, 27869 s | orbit, 15 %, 0.5 cm, 7 cm, 27870 s |
| longmarch3be/leo/25 (3) | orbit, 20 %, 3.0 cm, 9 cm, 3346 s | orbit, 20 %, 2.9 cm, 9 cm, 3346 s |
| longmarch5/leo/25 (3) | orbit, 9 %, 0.8 cm, 26 cm, 3314 s | orbit, 9 %, 0.8 cm, 25 cm, 3288 s |
| h2a202/leo/25 (3) | orbit, 13 %, 2.0 cm, 17 cm, 3456 s | orbit, 13 %, 2.0 cm, 21 cm, 3457 s |
| h3/leo/25 (3) | orbit, 13 %, 0.6 cm, 18 cm, 3340 s | orbit, 13 %, 0.6 cm, 19 cm, 3342 s |
| pslvxl/leo/25 (4) | orbit, 8 %, 1.1 cm, 4 cm, 3560 s | orbit, 8 %, 1.1 cm, 4 cm, 3552 s |
| electron/leo/25 (4) | orbit, 5 %, 0.1 cm, 4 cm, 3255 s | orbit, 5 %, 0.1 cm, 4 cm, 3247 s |
| starship/leo/25 (4) | orbit, 44 %, 14.0 cm, 50 cm, 3239 s | orbit, 42 %, 14.6 cm, 47 cm, 3239 s |
| falcon9, the step test: 0.01 s and 0.005 s, the same line twice (4) | orbit, 27 %, 4.2 cm, 13 cm, 3220 s | orbit, 27 %, 4.8 cm, 12 cm, 3220 s |

No shell load moves by more than 2 points (Angara-A5 12 → 10 %, Starship 44 → 42 %). The largest change of end time is Angara-A5's, 3 873 → 4 180 s.

## Questions for the owner

1. **The budget** (`lesson-file` +8.3 kB, precache code +50.7 kB; the law's own cost).
   - (ก) Hold the merge for an identical-output offset that frees at least 8.3 kB in `lesson-file` and 50.7 kB of precache code (for example, the shader-text compaction of workstream 4 frees index-chunk bytes, which count in precache, but not in `lesson-file`). Effect: no ceiling moves; the merge waits.
   - (ข) Raise the two ceilings by the measured sizes with D-38's four parts (size, feature: the nozzle law, a named offset package, your approval). Effect: it merges now and the offset follows.
   - (ค) Pack the nozzle table tighter (short field names, arrays). Effect: it saves part of the table's 4.0 kB but not all of the 8.3, so it still needs (ก) or (ข).
   - Proposal: (ก) with (ค), because the re-baseline waits for the Apollo work anyway.
2. **The historical flights** (Sputnik-1, Vostok-1 and its return, Mercury-Redstone 3; lessons 5.3 and 5.4; in six-DOF, Vostok-1's return 14.95 km off and Freedom 7 26.99 km off, both from D-51 alone).
   - (ก) Re-derive the historical vehicles' loads and guidance from sources on the WGS-84 pad. The real R-7 flew from the real Earth, so the sphere's 11 km was a free gift the data absorbed. Effect: a data step with its own sources and tests.
   - (ข) Keep the data and record each shortfall as a known deviation, with its numbers, in place of the "as flown" check. Effect: the flights stop matching history.
   - Proposal: (ก).
3. **Instruments built on the sphere** (corridor sweep, tower height, E02 v₀, LZ-1 "straight down", fx5-031's point-mass rule).
   - (ก) Measure the same quantity on WGS-84 — the pad's geocentric latitude for the sweep, the height above the ellipsoid, the pad's own speed, the plumb line, the physical apsides — with every bound unchanged. Effect: the probes show four of them inside their bounds (the sweep within 0.049° of `corridorReach`, against 0.051°; the tower 13.0 m; the book 6.0 × 10⁻⁵; the divert 1.4 × 10⁻¹¹ m/s²); fx5-031 then checks that a point-mass verdict carries its physical apsides.
   - (ข) Leave them failing until the re-record step and change them there. Effect: red tests on the branch until then.
   - Proposal: (ก), in the re-record step.
4. **Single-burn and trim targets on the physical apsides** (Soyuz-2.1a's 200 km circle and grid, the crew perigee, H-IIA's trim, Long March 2D, the packs' semi-major axis).
   - (ก) Let the guidance aim a single-burn cut-off and a trim at the physical apsides (the "planning that needs" of D-51), and let the lessons' semi-major axis be the physical apsides' mean. Effect: a guidance step; the targets are met as before.
   - (ข) Record the J2 spread (4–11 km) as a known deviation. Effect: the targets stay aimed on the conic.
   - Proposal: (ก), as the next step before the re-record.
5. **Lessons and profiles that move** (1.4's 18 t, 2.2's failure event, the AVUM+ ignition, Electron's fairing callout).
   - (ก) Re-set the lesson numbers and the profile checks to the new flights. Effect: lesson design, which is your call.
   - (ข) Keep them as they are and let the tests fail until the re-record step.
   - Proposal: (ก) for 1.4 and 2.2 (both still teach what they mean to); a measured note for the timelines.
6. **A vacuum engine on the pad.** The builder still refuses one (`vacuumEngineOnPad`), while an air-lit one now flies its real thrust.
   - (ก) Keep the refusal: the side loads that break a real vacuum nozzle at sea level are not modelled, so a flight would show a nozzle working that would not.
   - (ข) Allow it with a warning and fly the separated thrust, as in the air.
   - Proposal: (ก).
7. **The wall factor.**
   - (ก) Keep the least factor that keeps each qualified sea-level point attached (now).
   - (ข) One factor for every bell, the SSME's 2.4. Effect: it leaves Vulcain 2.1 separated on the pad, and moves Merlin 1D's onset from λ 0.42 to about 0.18.
   - (ค) Per-engine published wall pressures as they are found.
   - Proposal: (ก) now and (ค) as data appear.

## Docs touched

- README (features: WGS-84 and the nozzle).
- docs/IMPLEMENTATION-STATUS.md (the model; the test stand's limits).
- docs/USER-GUIDE.md (the stand fires vacuum engines in air; the builder's new warning).
- docs/PHYSICS.md §1, §2, §2a, §4 (the thrust law, separation, the wall factor and its alternative, vacuum engines), §10.
- docs/VALIDATION.md (the re-baseline section; the six-DOF historical flights and the flexible fleet were added in this step's docs fix commit).
- These finish workstream 1's WIP docs commit for both workstreams together, with every number measured here or by probes named in this report.

## Commits

On 7f991f9:

| Commit | What |
|---|---|
| a5c953a … 4fc67f1 | The nine D-51 commits of workstream 1, kept as they were |
| 2be2354 | The nozzle law |
| 03b07da | The divert's horizontal plane |
| 3dd0efe | Numbers apart from sources; AVUM+ sourced; fixes 2be2354 |
| adeaead | Shorter texts; fixes 2be2354 |
| 46796d9 | Lessons and Monte Carlo on the physical apsides |
| 2136978 | The docs of both workstreams (replaces the hand-over's WIP docs commit) |
| 6a6edbf | VALIDATION: the six-DOF historical flights and the flexible fleet, measured in this step (fixes 2136978) |
| report commit | This report and the change fragment |

The WIP docs commit of the hand-over is replaced by the docs commit.

## D-25: why one change over 400 lines, and the split

The source change is 56 files, +1 650/−579 lines:

- D-51: 42 files, +565/−396;
- the law: 23 files, +846/−184;
- this step's fixes: 7 files, +396/−156, mostly the regenerated data table.

**The reason** is one validated re-baseline instead of drift PR by PR (plan S01). D-51 and the thrust law each move every fingerprint and golden. Merged apart, every golden would be re-recorded twice and the fleet re-validated twice. Together they are measured once, against the base, row by row.

**A split with identical output**: the nozzle module, its data and its unit test could land first, unwired (nothing calls it, so the output is identical). That PR is 720 source lines (src/physics/nozzle.ts 308, src/data/nozzles.ts 412), still over 400. No other part is identical-output: the drawn ellipsoid changes the picture, and the budget refactor b596e6e only makes sense with D-51.

## Probes

All are gitignored, in the worktree's tests/probe/ and in the scratchpad's probes/rebaseline/; the base runs were made in a byte-identical copy of 7f991f9's src and tests.

| Probe | What it runs |
|---|---|
| fleet-table.test.ts, compare_fleet.py | the point-mass fleet table |
| ratings.test.ts | the Build ratings |
| sixdof-sites3.test.ts | six-DOF, one flight per site |
| nozzle-table.test.ts | every engine's nozzle, plus nozzle-dump.test.ts and gen/gen_nozzles.py for the split |
| historical.test.ts, sputnik-trace.test.ts | the historical flights |
| single-shot.test.ts | Soyuz-2.1a's single-burn insertion |
| lesson-apogee.test.ts | the lesson grader's apogee |
| eom-budget2.test.ts | the E02 Δv book |
| tower.test.ts | the tower catch height |
| corridor.test.ts | the corridor sweep |
| divert.test.ts | the LZ-1 divert |
| py/nozzle1d.py | the one-dimensional nozzle, for the SSME figure |
| finish/hist6dof.test.ts | six-DOF Mercury-Redstone 3 and Vostok-1: the landing miss, along and across the track, on the base, the D-51-only tree and this branch |
| finish/budget-base.txt, finish/budget-branch.txt | the two builds and budgets, for the per-chunk deltas |
| finish/fleet-head.tsv, finish/ratings-head.tsv | the fleet table and the Build ratings again on HEAD, identical to fleet-branch3.tsv and ratings-branch3.tsv |

The `finish/` probes are in the scratchpad's probes/rebaseline/finish/.

## Reviewers

Left for the reviewers to fill in (SESSION-PROTOCOL §7).

- Second agent, physics and D-25:
- Owner:
