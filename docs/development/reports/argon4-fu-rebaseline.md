# Argon4 follow-up, workstreams 1 + 2: the J2 + WGS-84 + J2-coasts re-baseline with the nozzle model / ปรับฐานฟิสิกส์ใหม่: โลกทรงรี WGS-84, J2 ตลอดเที่ยวบิน และแบบจำลองหัวฉีด

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - **ทำอะไร:** ตามคำตัดสินของเจ้าของเมื่อ 17 ต.ค. 2569 ทั้งสองข้อรวมเป็นงานเดียว
>   - ฐานปล่อยวางบนทรงรี WGS-84 และความสูงทุกค่าที่อ่านอากาศ/พื้นดินเป็นความสูงเหนือทรงรี
>   - J2 มีผลตั้งแต่ฐานปล่อยจนถึงวงโคจร รวมถึงช่วงลอยตัวของแบบจำลองมวลจุด
>   - ทุกวงโคจรตัดสินจาก apsides จริงของรอบถัดไป และตอนนี้การดับเครื่องที่กำหนด apsis ก็เล็งที่ค่านี้ด้วย
>   - แรงขับทุกเครื่องยนต์มาจากกฎเดียวของหัวฉีด F = λ·F_vac − p_a·A_e และการไหลแยกตัวจากผนังตามเกณฑ์ของ Schmucker
> - **รอบนี้ (แก้ตามผู้ตรวจสองคน):**
>   - จรวดยืนบนแท่นตามแนวดิ่งจริง (เส้นตั้งฉากกับทรงรี) และไต่ขึ้นตรงตามแนวนั้นจนเริ่มเอียงตัว เดิม Soyuz ในบทเรียน S2 "ชนพื้น" ที่ T+0.02 วินาที ตอนนี้บินได้ตามปกติ
>   - การยิงครั้งเดียว (ดับแล้วจุดใหม่ไม่ได้) และการเผาเพื่อตั้ง apogee ของวงโคจรถ่ายโอน ดับเครื่องจาก apsides จริงแล้ว apogee ของ GTO กลับมาที่ 35 715–35 752 กม. ใกล้ฐานเดิม
>   - RD-0109 ใช้อัตราส่วนพื้นที่ 25.1 ตามวิธีประมาณของมันเอง และระบุว่าค่า ε ของ Raptor 2 ยังไม่แน่นอน
>   - ข้อความใน Build เรื่องเครื่องยนต์สุญญากาศบนแท่นปล่อย เปลี่ยนเป็นตามฟิสิกส์จริง (การไหลแยกตัวและแรงด้านข้าง) ทั้งสามภาษา และแก้บรรทัดใน USER-GUIDE ที่ยังบอกว่าแท่นทดสอบไม่ยอมจุดเครื่องยนต์สุญญากาศในอากาศ
>   - คืน assertion เดิม 16 ข้อในเทสต์ 8 ไฟล์ ที่ branch นี้เคยเขียนทับตามกฎใหม่ ให้กลับมาตามเดิม ตอนนี้จึงไม่ผ่าน ส่วนเทสต์ของกฎใหม่เก็บไว้ข้าง ๆ เป็นเทสต์แยกและผ่าน ให้เจ้าของเลือกในคำถามข้อ 11
> - **ผลการวัด (ฐาน 7f991f9 เทียบกับ branch นี้):**
>   - ตาราง fleet แบบมวลจุด: ผ่าน 156 จาก 222 แถวเท่าเดิม ทุกแถวที่เคยผ่านยังผ่าน (131 แถวที่ถูกตัดสินผ่านครบ) Δv คงเหลือเฉลี่ย −14.1 m/s ถ้าตัดสินเที่ยวบินชุดเดียวกันด้วยวงรีขณะหนึ่งแบบที่ฐานเดิมใช้กับมวลจุด จะผ่านเพียง 93 แถว
>   - six-DOF หนึ่งเที่ยวต่อละติจูดฐานปล่อย (9 เที่ยว): ผลเหมือนเดิมทุกเที่ยวและเข้าวงโคจรทุกเที่ยว
>   - ยานแบบยืดหยุ่น (flex-fleet 4 ไฟล์ 19 เทสต์) ผ่านทุกเทสต์ทั้งก่อนและหลัง แรงที่โครงรับเปลี่ยนไม่เกิน 2 จุดเปอร์เซ็นต์
>   - เทสต์ทั่วไป 278 ไฟล์ 10 119 เทสต์ ไม่ผ่าน 81 (golden และข้อค้นพบที่ระบุไว้ทั้งหมด ทุกข้อผ่านที่ฐาน) บวก assertion เดิมที่คืนมา 16 ข้อ
>   - เทสต์หนักทุกไฟล์ (33 ไฟล์): 28 ไฟล์ (นอกจากชุด Monte Carlo) ไม่ผ่าน 29 เทสต์ เป็น golden 24 และข้อค้นพบ 5 ข้อที่ระบุไว้ ส่วนชุด Monte Carlo 5 ไฟล์ ยังรันอยู่ตอนส่ง commit นี้ ผลจะตามมาใน commit ถัดไป
> - **ต้องให้เจ้าของเลือก (11 คำถาม):** งบขนาดไฟล์; เที่ยวบินประวัติศาสตร์และ Progress MS-19; เครื่องมือวัดในเทสต์ที่ยังคิดบนทรงกลมหรืออ่านวงรีชั่วขณะ; ค่า a ในบทเรียน; บทเรียนและโปรไฟล์ที่ขยับ (รวมเกณฑ์ของ S2); เครื่องยนต์สุญญากาศบนแท่น; wall factor; คู่แรงขับในแคตตาล็อกเทียบขนาดปากหัวฉีดที่ตีพิมพ์; แถวเทียบข้อมูลจริงที่กฎหัวฉีดทำให้ขยับ; แนวดิ่งของ guidance หลังเริ่มเอียง; assertion เดิมที่คืนกลับมา
> - **ไม่ได้บันทึก golden/fingerprint ใหม่:** จะบันทึกครั้งเดียวตอนท้ายหลังงาน Apollo ค่าเก่า/ใหม่ทั้งหมดอยู่ในรายงานนี้

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
reviewers: [propulsion review (second agent): sound with fixes, answered below; geodesy review (second agent): sound with fixes, answered below; re-check of this step: pending; owner: pending]
report: docs/development/reports/argon4-fu-rebaseline.md
```

## What changed for the user

- **The Earth is the WGS-84 ellipsoid.** The pads stand on it at their geodetic latitude and altitude. Before, they stood on a 6 378 137 m sphere: 4.9 km too high in radius at the Cape, 11.0 km at Baikonur, 13.2 km at Vostochny and 16.9 km at Plesetsk. The HUD's altitude, the telemetry and the events show the height above the ellipsoid. Orbit heights stay the radius less 6 378.137 km (GCAT's convention). The scene draws the ellipsoid.
- **The pad is level.** A stack stands on the plumb line, the ellipsoid's normal (0.19° from the radius at 45°), and rises along it until it pitches over. Ground contact is measured against the normal.
- **J2 from the pad to the orbit, in both models.** The point-mass ascent and every point-mass coast fly μ/r² + J2; before, they used the central field and Kepler arcs. The burn planner predicts that coast. Every orbit is judged on its physical apsides, the lowest and highest altitude of the next revolution, and the cut-offs that set an apsis aim at them: a single burn that cannot relight, and the burn that sets a transfer's apogee. A point-mass orbit can therefore read a few kilometres apart in perigee and apogee where it read a near-perfect circle before.
- **One thrust law, from the engine's nozzle.**
  - A throttled engine low in the air now loses the air's whole push on its exit, not a throttled share of it.
  - Deep throttle near the ground, or a vacuum engine lit in the air, separates its flow inside the bell. The flight then flies the higher thrust of the separated nozzle and reports `evt.nozzleSeparation` once. In the point-mass fleet only Angara-A5 reports it, on all 9 of its rows: its RD-191 core at 30 % from 0.6 km, at area ratio 23.4–23.5 of 37. That is a prediction of the wall-factor rule, not a fact about the real flight (owner question 7).
  - A solid's head-end peak gives a little more thrust, because the air takes p₀·A_e off the peak rather than a share of it.
- **The test stand fires a vacuum engine in air.** It gives what the nozzle really gives (the Merlin Vacuum 775.2 of its 981 kN at sea level, Isp 275.0 s) and says where the flow separates. Throttled in air, the Isp it measures falls with the throttle; in vacuum it does not.
- **The builder** warns of a vacuum engine on an air-lit strap-on (`vacuumEngineInAir`), with the altitude below which its flow separates and its sea-level thrust. It still refuses a vacuum engine on the pad (owner question 6), and now says why in physical terms: at sea level the flow separates in the bell and the side loads would break a real nozzle. It used to say the nozzle "cannot work" there.
- **Lessons and Monte Carlo** read the orbit on its physical apsides in both models.

## The physics

**Sites and heights.** A site at geodetic latitude φ, longitude λ and height h sits at

    r = ((N + h) cos φ cos(λ+θ), (N + h) cos φ sin(λ+θ), (N(1 − e²) + h) sin φ),   N = a/√(1 − e² sin²φ)

with a = 6 378 137 m and f = 1/298.257223563. Air, ground and the shown altitude use the geodetic height. The plane geometry from the pad uses the pad's geocentric latitude.

**The pad and the vertical.** The local vertical at r is the ellipsoid's normal,

    n̂ = (X cos λ, X sin λ, Y)/√(X² + Y²)

with (X, Y) the meridian-plane normal from the same one-pass height computation (`geodeticUp`, src/physics/geodesy.ts). The hold-down stands the stack with its axis on n̂ (src/physics/sim/rigid-link.ts, and the point mass's thrust direction), and the ascent guidance flies its vertical phase along n̂ (`GuidanceInputs.plumb`). From the pitch-over on, and through a stored pitch programme, the guidance's vertical is the radius r̂, at most 0.19° from n̂. The contact model (`rigidContactMetrics`) takes its tilt, the lowest point of the base rim and the vertical speed against n̂. A base square to r̂ on a level pad has its rim tilted δ = 0.192° (Baikonur) off the ground, so at a rim radius R its low side is R·sin δ = 17 mm (R = 5.2 m) inside it, past the contact check's −0.01 m.

**Gravity everywhere.** The gravity is

    g = −μ r/|r|³ + J2 term   (J2 = 1.08262668 × 10⁻³)

from the pad through every coast. With the Earth's turn, it gives Somigliana's normal gravity at every WGS-84 pad to 5.1 × 10⁻⁶ (the worst pad is Jiuquan; tests/wgs84-sites.test.ts). The gravity loss in the Δv book is −g·v̂ dt.

**Coasts, judging and aiming.** A free coast is RK4 under J2 in steps of at most 10 s. The burn planner forecasts the same coast, for at most two days (`MAX_DURATION`). The verdict, the result panel, the fleet acceptance, the lessons' measures and the Monte Carlo final orbit read the physical apsides h_lo and h_hi of the next revolution. The cut-offs that set an apsis aim at them:

- *A single burn* (`singleShotCutoff`, a stack that cannot relight): the cut-off comes when the physical apsides of the state it would leave are on the aim within a quarter of the band. For a circular aim, since a circle under J2 keeps h_lo and h_hi kilometres apart, it comes when (h_lo + h_hi)/2 reaches the aim with both inside the full band.
- *A transfer's apogee burn* (`apexOf`): once the conic apoapsis is within 5 % of the target, the burn is cut off on the apex of the next revolution under J2 (with the engine's tail-off), not on the conic. From near the perigee of a geostationary transfer the conic reads up to 180 km off that apex.

**The thrust law** (src/physics/nozzle.ts). The level λ is the throttle × a solid's profile × the start-up or tail-off ramp. It scales the mass flow and the chamber pressure, but not the exit velocity. With the flow attached:

    F = λ·F_vac − p_a·A_e,    ṁ = λ·F_vac/(g₀ Isp_vac),    Isp = F/(ṁ g₀)

For an engine with a sea-level pair, A_e = (F_vac − F_SL)/p₀, so at λ = 1 and p₀ the law returns the catalogue's sea-level thrust exactly. The old law was F = λ·[F_vac − (F_vac − F_SL)·p/p₀].

**Separation.** Schmucker's criterion (NASA TM-77396, 1984, eq. 11) is

    p_i/p_a = (1.88 M_i − 1)^−0.64,   M_i held at 5 above 5

It is applied to the one-dimensional isentropic wall pressure at λ·p_c. Downstream of the separation point the wall sees about p_a, so the nozzle flies as if it were cut off at the separation area ratio ε_s:

    F = λ·p_c·A_t·C_F,vac(ε_s) − p_a·A_t·ε_s   (floored at 0)

This meets the attached law at ε_s = ε, with no step: tested to 10⁻⁵ of F_vac across the boundary. Once separated it lies above the attached law, because dF/dε = A_t(λ p_c p̂ − p_a) < 0 where the wall pressure is below ambient. Its inverse, `engineLevelFor`, is what the landing and return guidance use to choose a level for a thrust. The propulsion review derived both laws independently and found the code to match, continuous at the onset and monotonic in λ.

**My review of the law.**

- The attached law and the mass flow are the textbook ones: the throat is choked, so ṁ ∝ p_c. The separated thrust is the usual first-order "nozzle cut at separation" model. tests/nozzle-law.test.ts restates the one-dimensional nozzle independently and matches the code: C_F as the wall pressure integrated over the bell agrees with the closed form to 5 × 10⁻⁷; the Merlin Vacuum and the RL10C-1 at sea level, from their published geometry, to 5 × 10⁻⁴; RD-180 at 47 % at 10 km and a P120C at its peak are checked by hand.
- **A solid's profile as λ is consistent.** The profile is normalised so that its time-mean is 1 (`solidTail`), so the solid's mean sea-level thrust stays its catalogue figure, mean(λ)·F_vac − p₀·A_e = F_SL. The start-up and tail-off are ramps of chamber pressure, and they pass through separated flow, as real engines do. A head-end peak above 1 is stronger than under the old law; with PSLV-XL's solids all at a peak of 2, a counterfactual a validation test flies, the stack now breaks up (finding below).
- **The wall factor** (the least factor on the one-dimensional wall pressure that keeps an engine's qualified sea-level point attached) is defensible as a calibration, not a measurement:
  - Its direction is physical. Schmucker's SSME exit wall pressure is 0.0019·p_c, 2.4 times the one-dimensional 0.00080·p_c computed for ε 69 at γ 1.26 (probe `py/nozzle1d.py`; the propulsion review recomputed 8.05 × 10⁻⁴). TM-77396 could not be re-opened to re-read the 0.0019 (the network allowed searches and refused the page), so that figure rests on the earlier session's reading.
  - Its size is the least that the catalogue's sea-level thrust forces. It acts on 14 engine names in seven families: Vulcain 2.1 2.53, YF-77 2.14, LE-7A 1.85, the Starship blend 1.35, LE-9 1.26, the R-7's chambers 1.04–1.28, RD-0213 1.10.
  - Its weak points. An engine with a factor above 1 sits exactly on the separation boundary at full thrust on the pad, so any throttle below 1 at sea level separates (the review found RD-107A, RD-108A, LE-9, Vulcain 2.1 and the Raptor blend separated at λ 0.99 at p₀). An engine that already passes on the one-dimensional pressure gets 1, however deep it is qualified to throttle: the RD-191 (onset at p₀ at λ 0.547) separates at the 30 % the real Angara-A5 core flies from low altitude (probe nozzle-table: at sea level ε_s 22.1 of 37 and 510.7 kN against 457.0 attached; at 2 km ε_s 27.2, 520.4 against 493.6). That separation is the rule's prediction, and it disagrees with a qualified operating point. A vacuum engine has no qualified sea-level point and gets 1 too.
  - The alternative is one factor for every bell, Schmucker's SSME 2.4. Vulcain 2.1 would be separated on the pad (it needs 2.53), and every other onset would move to deeper throttle (Merlin 1D from λ 0.424 to 0.18, the RD-191 from 0.547 to 0.23, so Angara-A5 would fly attached), with no data per engine. The other alternative is measured end-of-nozzle wall pressures per engine, which the fleet does not publish. Owner question 7.
- **The side loads of separated flow are not modelled.** No sourced criterion for what breaks a nozzle was found. The flight reports the separation and flies the thrust.

**The vacuum engines' exit areas** (src/data/nozzles.ts; each number's source or estimate is in `NOZZLE_SOURCES`):

- **Sourced:** the RL10C-1 and C-1-1 (L3Harris, 57 and 62 in exits); Vinci (the Ariane 6 extension, 1.82 m at ε 174, IAC-17-C4.1.7); the J-2 (170.4 in² throat × 27.5, 1.96 m); the Merlin Vacuum (ε 165 at 9.7 MPa, a 3.30 m exit); YF-75 and YF-75D (ε 80 and their chamber pressures); LE-5B and LE-5B-3 (ε 110 and their chamber pressures, EUCASS 2017-189); the AVUM+ engine's chamber pressure (the RD-843's 2.04 MPa).
- **Estimates**, each with its reasoning in the source table: the RD-0110 and RD-0124 ε, the S5.92 and S5.98M ε, RD-0109, Rutherford Vacuum, Curie and L-2-5, and the solids' ε. On 2026-10-18 WebSearch worked and WebFetch was refused (`getaddrinfo ENOTFOUND en.wikipedia.org`), so a figure was taken only where a search result put it on a named page.
- **Changed in this step:**
  - RD-0109 flew ε 26 while its estimate's own method gives 25.1. Recomputed independently (probe `fix/eps.py`, the ratio of ideal vacuum C_F that turns the RD-107A's 319 s at ε 19.1 into 323.5 s): 25.15 at γ 1.22 (24.74 at 1.20, 25.60 at 1.24). It now flies 25.1; its exit area goes from 0.1550 to 0.1499 m².
  - Raptor 2's ε 34.34 is marked uncertain: FAA's 2019 Appendix G gives 34.34:1 at 3 669.5 psia for the 2019 Raptor, and Raptor 2 opened its throat behind the same exit, so its ε is lower. The number is unchanged; owner question 8 asks about the catalogue pair behind it.
  - The table's header says that for a ground-lit engine with an ε the chamber pressure in its record is shown and checked, never flown (the Merlin 1D flies 12.05 MPa for its published 9.70; probe nozzle-table).
- **At sea level the law gives** (probe nozzle-table):

  | Engine | Thrust at sea level | Separation |
  |---|---|---|
  | Merlin Vacuum | 775.2 of 981 kN, Isp 275.0 s | at ε 27.7 of 165; attached above 15.0 km |
  | RL10C-1 | 77 of 102 kN | |
  | RD-0124 | 238 of 294 kN | |

- **Pair-derived exits against published exit sizes.** A ground-lit engine's exit area comes from its catalogue thrust pair, A_e = (F_vac − F_SL)/p₀. Where a search found a published exit size (probe `fix/exits.py`):

  | Engine | Exit from the pair | Published exit | Area | F_SL the published exit gives |
  |---|---|---|---|---|
  | Merlin 1D | 0.931 m | 0.92 m (Wikipedia's diameter, not stated as the exit) | +2.4 % | 846.6 against 845.0 kN |
  | Raptor 2 | 1.585 m | 1.306 m (FAA Appendix G 2022, exit radius 25.718 in; search summary) | +47.2 % | 2 364.2 against 2 300.0 kN |
  | Vulcain 2.1 | 2.270 m | 2.1 m (a third-party product listing) | +16.8 % | 1 019.1 against 960.0 kN |
  | F-1 / Rocketdyne F-1 | 3.545 / 3.595 m | 3.72 m (12.2 ft, several listings) | −9.1 / −6.5 % | 6 669.6 against 6 770.0; 6 814.2 against 6 886.2 kN |

  No published exit was found for the RD-180. The chamber pressure the law flies follows from the pair's exit: Raptor 2 flies 23.49 MPa against the cited 30, the Merlin 1D 12.05 against 9.70, LE-9 12.07 against 10.00. The nozzle-law test's 25 % closure tolerance lets all of them pass; it was not changed. Owner question 8.

## Review of the three git-am conflict resolutions

The hunks of the hand-over's nozzle WIP in simulation.ts, return-guidance.ts and debris-runtime.ts, compared line by line with 2be2354, are identical. The only difference is the `R_EARTH` import, which the WGS-84 tree no longer uses. The geodetic heights (`geodeticHeight`) are kept at every thrust site, and `engineThrustAt`/`engineLevelFor` are used throughout. No change was needed; the geodesy review compared them again and agrees.

## Found and fixed before the reviews

1. **Bundle (fixes 2be2354).** The nozzle table's provenance text shipped in every chunk that flies an engine. The numbers and their sources are now two tables in src/data/nozzles.ts; the sources are plain literals that the bundler drops. The J-2's exit is written out as a number. The new UI texts are shorter in all three languages.
2. **Lessons and Monte Carlo on the physical apsides (D-51).** `flightElements` (src/lessons/measures.ts) and the Monte Carlo final orbit took the physical apsides in six-DOF only. A point-mass Falcon 9 to 500 km read its lesson apogee as 510.2 km, against the 501.6 km its verdict judged. Both now read the physical apsides in both models.

## The two reviews, and what was done

Both reviews found the core sound. The propulsion review derived both thrust laws independently and found the code to match; the geodesy review found the WGS-84 transforms and the site placement right to nanometres, J2 with the Earth's turn within 5.1 × 10⁻⁶ of Somigliana, the 10 s J2 coast good to centimetres per revolution, and every golden hash the report listed correct. Each blocking and should-fix finding was reproduced here before anything was changed.

| Finding | Checked here | Done |
|---|---|---|
| **Geodesy, blocking:** lesson S2's crewed Soyuz hits the ground on the pad at T+0.02 s | Reproduced (probe `fix-s2`, f157546): clearance −0.000 mm at T+0.01 s, impact at T+0.02 s. The hold stood the stack on the radius while the ground is the ellipsoid, 0.192° off it; the contact model picked the rim side from the radius, so the axis's numerical noise (a projection of 6.4 × 10⁻⁹ in S2's step to T+0.02 s) could select the side 17 mm inside the ground | Fixed in the physics, not the threshold: a level pad, the vertical rise on the plumb line, contact against the normal (efe26e9, 3c6f083, 19eb5da). S1 and S2 lift off, 0.27 mm clear at T+0.02 s and rising. tests/heavy/lesson-packs-sixdof passes 3 of 3; S2's star-tracker flight reads 997.01 m of navigation error (bound 1 000 m; base 988.73 m) |
| **Geodesy, blocking:** the list of failures and moving goldens is incomplete | Confirmed: the earlier runs left out tests/validation/*, assessment-flights, quickstart, range-safety, panel-verdict, target-plane, rigid-soyuz-programme and most of the heavy suite | Ran 278 default-suite files (every file that flies the physics) and the whole heavy suite file by file. Every failure is listed below with its base value and its cause, found by running it on the base, on f157546 and on the D-51-only tree 4fc67f1 |
| **Geodesy, should-fix:** single-burn cut-offs aim on the conic; Q4's option (ข) re-asks what D-51 decided; the conic aim leaves the GTO apogees 52–180 km low | Confirmed: Soyuz-2.1a with 6 318 kg judged 199.6 × 211.2 km, off target, at f157546; the 37 accepted GTO rows at 35 540.5–35 934.3 km against the base's 35 714.8–35 740.2 km | Fixed (4e9afc3): single burns and transfer apogees are cut off on the physical apsides. Soyuz-2.1a: 199.0 × 201.6, 199.3 × 203.5 and 197.7 × 204.6 km with 1 755, 3 510 and 6 318 kg, all on target; the GTO rows at 35 714.6–35 752.4 km. Q4 now asks only what is still open, where the lessons' semi-major axis is read. Aiming the GTO burn as one J2-shot impulse was tried first and dropped: the shooting bracket cannot span the transfer, and every such row stopped near 1 985 km |
| **Geodesy, should-fix:** rewritten assertions are not listed | Confirmed: 16 assertions in 8 test files had been rewritten to the decided physics, and the fleet gate's measurement had changed | Restored in this step: each old assertion is back as it stood at the base and fails, with the decided law's statement beside it as a separate test that passes ("Assertions kept as they were", owner question 11). The fleet gate (`achievedElements` in tests/fleet-harness.ts) measures the orbit rather than asserting about it, and it is the judging D-51 decided; it was not restored, and the same flights judged on the base's gate are measured below (93 of 222 accepted, against 156) |
| **Propulsion, should-fix:** the wall-factor rule makes every Angara-A5 flight report separation at its qualified 30 %, and Q7 does not say so | Confirmed: all 9 Angara-A5 fleet rows report RD-191 separation at 0.6 km, ε_s 23.4–23.5 | The report and PHYSICS §4 now call it the rule's prediction, disagreeing with a qualified operating point; Q7's effects include Angara and the vacuum engines' factor of 1. The rule is unchanged: it is the owner's call |
| **Propulsion, should-fix:** RD-0109 flies ε 26 where its estimate gives 25.1 | Confirmed (25.15) | Fixed (c465f6c): 25.1 |
| **Propulsion, should-fix:** Raptor 2's ε is the 2019 Raptor's, and the pair's exit is 47 % larger than the published one | Confirmed by search (FAA 2019: 34.34:1; FAA 2022: exit radius 25.718 in) | The source text is marked uncertain (c465f6c); every engine with a published exit is compared in "The physics"; owner question 8. No bound changed |
| **Propulsion, should-fix:** the vacuum-on-pad texts say the nozzle "cannot work" | Confirmed in en, ru and th | Reworded (d370659): the flow separates and the side loads would break a real nozzle. The six strings are 17 bytes longer in all |
| **Propulsion, nit:** a ground-lit engine's p_c is never flown | Confirmed (Merlin 1D 12.05 against 9.70 MPa) | Said in the table's header (c465f6c) |
| **Propulsion, nit:** a stand assertion looser than needed | Confirmed | Tightened (86fb439): no row of an air firing has a difference, and no vacuum row a stand value |
| **Geodesy, nit:** coast forecasts over two days end the plan with `evt.burnPredictionUnavailable` | Reproduced (probe `fix-highorbit`): Saturn V to 400 × 380 000 km and Falcon Heavy to a 200 000 km circle; at the base both end off target too, through a different event; Proton-M to Molniya reaches its target | Documented in PHYSICS §1. No Kepler fallback was added: D-51 took the Kepler forecast out of the planner |
| **Geodesy, nit:** the D-25 split put 03b07da under the law | Confirmed | Corrected below |
| **Geodesy, nit:** a few drawn or forecast quantities use the sphere | Confirmed by grep | Listed in PHYSICS §1; the flight reads none of them |

## Tests run

All with `--maxWorkers=2`, or 1 for the heavy and probe runs. Counts are as vitest printed them. HEAD is 19eb5da for the physics: this step after it changed tests and docs only.

| Run | Files | Tests | Result |
|---|---|---|---|
| Every default-suite file that flies or reads the physics (importers of src/physics, src/lessons and src/design, the fleet and flight harnesses, and 22 more that fly a mission), in six chunks, at 19eb5da (`fix/default-chunk-0N.log`) | 278 | 10 119 | 10 038 pass, 81 fail: the goldens and the findings below |
| The 8 files whose rewritten assertions were restored, after restoring (`final/restored-head.log`) | 8 | 252 (236 before, 16 restored) | 234 pass, 18 fail: the 16 restored assertions and 2 findings already counted above (the corridor sweep, E02) |
| The heavy suite at 19eb5da, each file alone (`fix/heavy/*.log`) | 28 | 252 | 223 pass, 29 fail: 24 golden hashes (21 six-DOF, 3 flex) and 5 findings below |
| The heavy Monte Carlo sets, each alone, on an export of HEAD and on the base (`final/head-*.log`, `final/base-*.log`) | 5 + 5 | | running when this report was committed; the results follow in the next commit |
| The files failing at HEAD, and the 8 restored ones, on the base 7f991f9, with linear-loop and lessons-round2 (`final/base-default.log`) | 34 | 675 | all pass |
| The failures the earlier runs had missed, on f157546 (export), the base and the D-51-only tree | 13 | | the base passes every one; the causes are in the table of findings |
| nozzle-law, data-consistency, design-test-stand, design-warning-text, design-warnings, i18n, after the source fixes | 6 | 98 | 97 pass; 1 fails, the corridor sweep (owner question 3) |
| Heavy spot-checks on this branch, each file alone: lesson-packs-sixdof; vostok1-return with history-sixdof (`final/spot-*.log`) | 1 + 2 | 3 + 4 | 3 pass; 3 pass and 1 fails, history-sixdof's Vostok-1 as at 19eb5da |
| The point-mass fleet table and the Build ratings again on HEAD (`final/fleet-head.tsv`, `final/ratings-head.tsv`) | 2 probes | | identical to `fix/fleet-final.tsv` and `fix/ratings-final.tsv` row for row |
| The point-mass fleet on HEAD judged by the base's gate (`final/x-conic`, `final/fleet-conic.tsv`) | 1 probe | | 93 of 222 accepted (below) |
| Probes on HEAD (listed at the end) | 19 | | below |

`npx tsc --noEmit` is clean.

## Before and after

**Point-mass fleet** (`allCases` of tests/fleet-harness.ts judged by `acceptanceFailures`; probes `fleet-base3.tsv` (base), `fleet-branch3.tsv` (f157546) and `fix/fleet-final.tsv` (HEAD), compared by `compare_fleet.py`):

- 156 of 222 rows are accepted at the base, at f157546 and at HEAD. There are 0 regressions and none newly accepted; all 131 gated rows pass.
- Mean Δv left over the gated rows, against the base: −14.1 m/s at HEAD (range −152 to +26), −16.5 at f157546 (where D-51 alone gave −19.6 and the law +3.1). This step's changes give back 2.4 m/s on the mean, most of it from the vertical rise on the plumb line (measured alone: +2.8 m/s with the programme on the normal too, probe `fix/fleet-plumb.tsv`).
- By vehicle, the mean change in Δv left against the base (m/s):

  | Vehicle | HEAD | f157546 |
  |---|---|---|
  | Atlas V | −35.8 | −37.3 |
  | Angara-A5 | −33.6 | −35.8 |
  | Proton-M | −29.4 | −32.4 |
  | Falcon 9 | −26.8 | −33.8 |
  | Starship | −24.8 | −24.0 |
  | Falcon Heavy | −24.2 | −27.0 |
  | Soyuz-2.1b | −21.0 | −21.3 |
  | Saturn V | −15.2 | −61.2 |
  | Long March 3B/E | −14.2 | −16.3 |
  | H-IIA | −13.4 | −9.0 |
  | Long March 5 | −12.6 | −24.0 |
  | Electron | −11.1 | −13.6 |
  | H3 | −8.1 | +0.5 |
  | Vulcan | −7.3 | −9.6 |
  | Vega-C | −3.3 | −3.4 |
  | Ariane 64 | +2.1 | +2.3 |
  | PSLV-XL | +14.2 | +15.6 |

- Smallest margins at HEAD (base): H-IIA iss/90 14 m/s (58), Atlas V iss/90 48 (38), Saturn V leo/90 137 (143). H-IIA iss/90 still passes its gate, with the least Δv to spare of any row.
- **Geostationary transfers:** the 37 accepted GTO rows end at 35 714.6–35 752.4 km at HEAD, 35 714.8–35 740.2 km at the base and 35 540.5–35 934.3 km at f157546 (31 of them 52–180 km lower than at the base there, as the geodesy review found).
- **Nozzle separation:** the 9 Angara-A5 rows report it, RD-191 at 0.6 km, ε_s 23.4 (2 rows) or 23.5 (7 rows); no other vehicle does.
- **The same flights on the base's gate.** The branch changed one line of the gate (`achievedElements`, tests/fleet-harness.ts): at the base it took the physical apsides in six-DOF only and read a point-mass orbit off the osculating ellipse of the last instant. With that line put back on an export of HEAD (probe `final/x-conic`, `final/fleet-conic.tsv`), the same flights, Δv for Δv, are accepted on 93 of 222 rows: 63 rows that the physical apsides accept fail, 55 of them gated, each on a perigee or an apogee 10 to 28 km off on the osculating ellipse (Soyuz-2.1b iss/25: perigee 405 against 420 km; Vega-C leo/25: apogee 519 against 500 km). A J2 orbit's osculating ellipse swings by that much round the revolution; the physical apsides are where it really goes. The gate was not restored (owner question 11).

**Build ratings** (the probe of tests/design-ratings.test.ts' rows; ±25 % bound unchanged). Computed (published ratio), base → HEAD:

| Row | Base | HEAD |
|---|---|---|
| LEO Soyuz-2.1a | 8 140 kg (1.096) | 7 911 kg (1.065) |
| LEO Falcon 9 | 20 031 (0.879) | 19 842 (0.870) |
| LEO Long March 2D | 3 165 (0.904) | 2 987 (0.853) |
| LEO Vega-C | 4 330 (1.312) | 4 371 (1.325), the recorded miss, unchanged |
| LEO Ariane 64 | 26 274 (1.216) | 26 274 (1.216) |
| LEO Electron | 315 (1.050) | 311 (1.037) |
| GTO Falcon 9 | 6 832 (0.823) | 6 756 (0.814) |
| GTO Ariane 64 | 13 328 (1.159) | 13 328 (1.159) |

The same rows meet the bound; tests/design-ratings.test.ts passes.

**Six-DOF, one flight per site latitude** (probe `sixdof-sites3.test.ts`, calm air, seed 20260919, the six-DOF fleet suite's judge; `sixdof-sites3-base.tsv`, `fix/final-sixdof-sites.tsv`). Verdict, physical pe × ap (km), Δv left (m/s):

| Site: flight | Base | HEAD |
|---|---|---|
| Baikonur: soyuz21b/iss/50 | OK 414.6 × 425.4, 1 658 | OK 414.7 × 425.3, 1 612 |
| Plesetsk: angaraa5/leo/25 | OK 496.5 × 503.2, 3 631 | OK 496.7 × 502.9, 3 501 |
| Vostochny: soyuz21b/iss/50 (not a fleet row) | miss 420.0 × 424.8, 1 645 | miss 420.5 × 425.2, 1 579 |
| the Cape: falcon9/leo/50 | OK 499.3 × 501.0, 1 595 | OK 499.7 × 501.4, 1 575 |
| Kourou: ariane64/leo/50 | OK 500.0 × 500.1, 3 005 | OK 499.9 × 500.2, 3 016 |
| Kourou: vegac/sso/50 | OK 596.4 × 603.2, 931 | OK 596.7 × 602.9, 931 |
| Tanegashima: h2a202/leo/50 | OK 499.2 × 501.3, 2 061 | OK 498.9 × 501.1, 2 054 |
| Tanegashima: h3/sso/50 | OK 597.6 × 602.6, 4 988 | OK 597.6 × 602.4, 4 963 |
| Jiuquan: longmarch2d/sso/50 (architecture-excluded) | miss 196.7 × 603.0, 679 | miss 195.3 × 606.4, 611 |

Every verdict is the same, and every flight is in orbit.

**The historical flights, point mass** (probe `historical.test.ts`): Sputnik-1 214.0 × 791.0 km against the flown 214 × 938 (base 214 × 937; f157546 214.0 × 779.0); Vostok-1 168.0 × 315.0 km against the flown 168 × 314 (f157546 168.0 × 260.0, burning to depletion). The vertical rise on the plumb line brings Vostok-1's orbit back; Sputnik-1 stays short.

**Six-DOF Progress MS** (probe `fix-progress6`, the flight of tests/rigid-soyuz-programme.test.ts): at payload separation, osculating 192.8 × 238.1 km at the base, 182.1 × 211.2 at f157546 and 182.3 × 211.4 at HEAD (physical 192.8 × 247.1, 186.2 × 219.5 and 186.2 × 219.7 km). The Blok I runs dry in all three.

**Lesson S2's navigation** (probe `fix-s2nav`, error at the third stage's cut-off): as set 2 954.14 m (base 2 923.32), star tracker 997.01 m (988.73), navigation grade 384.86 m (381.72), MEMS with the star tracker 7 742.13 m (10 999.85). The lesson's verdicts are the base's.

**The flexible fleet** (tests/heavy/flex-fleet-1…4, each file alone with one worker; logs `fix/heavy/flex-fleet-N.log` and, for the base, `finish/base-flex-fleet-N.log`). All 19 tests pass at the base, at f157546 and at HEAD. Status, shell load, bending, slosh, end time:

| Flight (file) | Base | HEAD |
|---|---|---|
| soyuz21a/iss, crew (1) | orbit, 10 %, 0.6 cm, 1 cm, 3 347 s | orbit, 10 %, 0.6 cm, 2 cm, 3 336 s |
| soyuz21b/leo/25 (1) | orbit, 13 %, 0.6 cm, 2 cm, 8 824 s | orbit, 13 %, 0.7 cm, 2 cm, 8 817 s |
| protonm/leo/25 (1) | orbit, 23 %, 3.5 cm, 24 cm, 4 583 s | orbit, 23 %, 3.5 cm, 24 cm, 4 616 s |
| angaraa5/leo/25 (1) | orbit, 12 %, 2.3 cm, 13 cm, 3 873 s | orbit, 10 %, 1.6 cm, 17 cm, 4 176 s |
| falcon9/leo/25 (1) | orbit, 28 %, 4.7 cm, 14 cm, 3 236 s | orbit, 28 %, 4.1 cm, 14 cm, 3 236 s |
| falconheavy/leo/25 (2) | orbit, 35 %, 8.2 cm, 22 cm, 3 254 s | orbit, 35 %, 8.2 cm, 22 cm, 3 254 s |
| atlasv551/leo/25 (2) | orbit, 17 %, 5.7 cm, 12 cm, 3 409 s | orbit, 17 %, 5.6 cm, 12 cm, 3 538 s |
| vulcan/leo/25 (2) | orbit, 11 %, 2.6 cm, 27 cm, 11 014 s | orbit, 11 %, 2.5 cm, 29 cm, 10 996 s |
| ariane64/leo/25 (2) | orbit, 9 %, 1.5 cm, 25 cm, 3 689 s | orbit, 9 %, 1.6 cm, 32 cm, 3 680 s |
| vegac/leo/25 (2) | orbit, 7 %, 0.6 cm, 7 cm, 3 177 s | orbit, 7 %, 0.6 cm, 7 cm, 3 178 s |
| longmarch2d/sso/650 kg (3) | orbit, 15 %, 0.5 cm, 7 cm, 27 869 s | orbit, 15 %, 0.5 cm, 7 cm, 27 867 s |
| longmarch3be/leo/25 (3) | orbit, 20 %, 3.0 cm, 9 cm, 3 346 s | orbit, 20 %, 2.5 cm, 9 cm, 3 346 s |
| longmarch5/leo/25 (3) | orbit, 9 %, 0.8 cm, 26 cm, 3 314 s | orbit, 9 %, 0.8 cm, 25 cm, 3 278 s |
| h2a202/leo/25 (3) | orbit, 13 %, 2.0 cm, 17 cm, 3 456 s | orbit, 13 %, 2.0 cm, 21 cm, 3 457 s |
| h3/leo/25 (3) | orbit, 13 %, 0.6 cm, 18 cm, 3 340 s | orbit, 13 %, 0.6 cm, 19 cm, 3 342 s |
| pslvxl/leo/25 (4) | orbit, 8 %, 1.1 cm, 4 cm, 3 560 s | orbit, 8 %, 1.1 cm, 4 cm, 3 552 s |
| electron/leo/25 (4) | orbit, 5 %, 0.1 cm, 4 cm, 3 255 s | orbit, 5 %, 0.1 cm, 4 cm, 3 247 s |
| starship/leo/25 (4) | orbit, 44 %, 14.0 cm, 50 cm, 3 239 s | orbit, 44 %, 14.6 cm, 49 cm, 3 239 s |
| falcon9, the step test: 0.01 s and 0.005 s, the same line twice (4) | orbit, 27 %, 4.2 cm, 13 cm, 3 220 s | orbit, 27 %, 4.5 cm, 13 cm, 3 220 s |

No shell load moves by more than 2 points (Angara-A5 12 → 10 %). The largest change of end time is Angara-A5's, 3 873 → 4 176 s.

**Budget** (`npm run build && npm run budget`; ceilings unchanged; bytes from `stat` on dist/assets; base `finish/budget-base.txt`; this branch at 8842e6b, whose src is 19eb5da's, `final/budget-head.txt` and `final/bytes-head.txt`, byte for byte the sizes of `fix/bytes-head.txt` at 19eb5da). The budget FAILS on this branch and passes at the base:

| Chunk | Base 7f991f9 | This branch | Added | Ceiling | This branch's result |
|---|---|---|---|---|---|
| index-*.js | 2 643 168 B | 2 643 580 B | +412 B | 2 645.0 kB | ok |
| i18n-*.js | 1 727 299 B | 1 728 343 B | +1 044 B | 1 729.0 kB | ok |
| lesson-file-*.js | 345 485 B | 355 457 B | +9 972 B | 347.0 kB | **FAIL, +8.5 kB** |
| flight.worker-*.js | 578 900 B | 588 413 B | +9 513 B | 589.0 kB | ok |
| recheck.worker-*.js | 887 641 B | 897 161 B | +9 520 B | 902.0 kB | ok |
| tune / monte-carlo / ratings / readiness workers | 551.2 / 549.5 / 558.6 / 572.7 kB | 560.7 / 558.9 / 568.2 / 582.8 kB | +9.4 to +10.1 kB each | 561 / 559 / 569 / 583 kB | ok; the Monte Carlo worker 62 B under its ceiling |
| precache code | 14 710.8 kB | 14 779.9 kB | +69.1 kB | 14 724.0 kB | **FAIL, +55.9 kB** |

This step added 412 − (−327) = 739 B to index, 17 B to i18n and 191 B to `lesson-file` over f157546 (the cut-offs, `geodeticUp`, the texts). On main 79d2686 the i18n chunk is about 1 728 985 B and index about 2 639.9 kB (the orchestrator's figures; main was not built here). If the deltas carry over unchanged through the rebase, i18n would be about 1 730 029 B, about 1.0 kB over its 1 729 kB ceiling, and index about 2 640.3 kB, under its 2 645 kB. They are to be measured again on the rebased branch. No ceiling was raised (owner question 1).

## Goldens and fingerprints: to re-record at the end

None is updated here. Each moves under D-51 alone and again under the law, and every hash moved again in this step (the level pad, the vertical rise, the cut-offs, RD-0109). The values are HEAD 19eb5da's.

**tests/d01-fleet-fingerprint.test.ts** (27 rows), recorded → f157546 → HEAD:

| Row | Recorded | f157546 | HEAD |
|---|---|---|---|
| soyuz21a/leo/50 | 4b1f0b7f49f9651a | 68c899086cf3a493 | 25acf0a271185ed9 |
| soyuz21b/leo/50 | 7973a02dec1cf395 | 07f5f2d8ad1163ca | fe4051e85a8a972d |
| protonm/leo/50 | 46ca21856e1a5d25 | 1771270db04a99f9 | a0a7a33bb3537436 |
| angaraa5/leo/50 | 7cea61f34555f892 | dbf74b920590b3f3 | a940a3f3e6dbed59 |
| falcon9/leo/50 | 8504537bbd7ef7e5 | ad0c472bd48cc704 | e4c28d6b35cc6d11 |
| falconheavy/leo/50 | 9d7255f795d6d88b | 1883b26c0b7faed8 | f411743f6059751e |
| atlasv551/leo/50 | 0d1e6478571ba55a | 2ce0c0599cf317b4 | f3c954333ce76713 |
| vulcan/leo/50 | 4d91d8ca27fb9268 | 2cf36d6492cbd6a7 | c8a13dd86937f5fb |
| ariane64/leo/50 | 0c847c54216a4e9e | 217ad9dfb388cc24 | 34a5b8043c58982d |
| vegac/leo/50 | 90be7919be291d5a | d191561fb9bdfd4a | a12dbb2fea561975 |
| longmarch2d/leo/50 | b5245d6120455552 | 781961be953ca6ef | 920a1f91ddbacb5d |
| longmarch3be/leo/50 | 7f72f2cf338e447f | bd2fffbefaefc562 | d02fcd4b42ac135e |
| h2a202/leo/50 | 6cc53db4bd700dd2 | e2ca098882902ed6 | 3aba621d73531b44 |
| longmarch5/leo/50 | 872f594cb4817a02 | 240365a3b67bbf44 | 14e0ca7313b93291 |
| h3/leo/50 | 19f258b3c7260121 | 1e345103fcb80da7 | 7114cdf812fbab7d |
| pslvxl/leo/50 | 230c580197fb8478 | e5ce3880c4c43e4f | d81fcd59ee14cad9 |
| electron/leo/50 | 05d6bef5f0121eee | e2ea372e8cd2c57b | f05cbe369f3733e4 |
| starship/leo/50 | 2eb2b5a1a855178c | 313d1ac2415f7b91 | 3d8e12821248326d |
| sputnik8k71ps/leo/50 | 78195a7baaf7e849 | 138757d774af2e9f | 56d37f1392e317e6 |
| vostok8k72k/leo/50 | 4e37c2c9a626ebd9 | 55f9ff0a97bebb69 | 9df2d40ad36c9cd3 |
| saturnv/leo/50 | 6216e2d36a22f147 | 365315d403382067 | 8a22d70c66fb453b |
| protonm/gto/50 | 904a8a631b0b7e7d | 7c12e8856995557f | 410734d5f8673529 |
| soyuz21b/gto/50 | 9f4b1fceeea35057 | 6ce30577ea69b6b6 | f3bdb53a7e5e9541 |
| ariane64/gto/50 | 5f39c0051d6adb58 | ecbaa004086a1ddb | 596e1db8b534657f |
| vegac/sso/50 | c6c598e3d8ea5910 | 28797aafdff2936f | 9d2ea7ad76bcb281 |
| pslvxl/sso/50 | 4a10da20085b3a09 | 4d574090ddf3fee2 | ccceca07211a9b02 |
| angaraa5/leo/25 | 1fd2f80a8d65c52e | 6476ee513814781b | 6496c9992a3d1507 |

**tests/heavy/sixdof-fingerprint.test.ts** (first 160 s in six-DOF; all 21 rows leo/50), recorded → f157546 → HEAD:

| Row | Recorded | f157546 | HEAD |
|---|---|---|---|
| soyuz21a | f8fa995d2de674a4 | d8404e724002c10e | 210726ef916e76e7 |
| soyuz21b | 6f67c4ea034ec61e | 642c87fe000e51eb | de1f8d998858803c |
| protonm | 336045ed763a8b3e | 1c9e40eced95cd1b | 32b42a03e82b13d4 |
| angaraa5 | 4d4263d76a86d994 | e1966536d2ac1399 | 2853d1e5448777f0 |
| falcon9 | 4e7814725cdd4e3b | b87dd7cb8331167e | 658b26e3ef703eeb |
| falconheavy | d54a7e829a77ee6a | 14c199d77b490f9e | 90b6e2ac5faa2d51 |
| atlasv551 | 24fc1e3c19a18c03 | 26b3419988c253fe | 55986efc6339e8e8 |
| vulcan | 1b2c16f43de54bb5 | e88145567f3ac939 | 75d382b1cda1a6ac |
| ariane64 | e521b86e4a051606 | b5f685ec02f06e86 | 42eb9caf8fe9478f |
| vegac | 0722edddb57aba60 | 34ffdfd553ba2b79 | f22c9ea05baf4b2d |
| longmarch2d | 5af7969a7628260f | 507711a7298c1a98 | 95dc1b84893a179c |
| longmarch3be | 14358272e7fd7e78 | a401046083ee9ced | d47a25115bcf2292 |
| h2a202 | e731ac41a0d095dc | 712ddcfe8d665dc4 | cee097ec3b3c5221 |
| longmarch5 | ae476b10f10daca4 | 2e6a56f62c5a4db0 | 2b7e7381ba2e4c93 |
| h3 | 880630716ae91a1c | cf21d2222b9b93dc | e32e8d002a8cf549 |
| pslvxl | 91ecd642a27e2a54 | 56d445cae536b5f9 | 8ca238c1aaab9195 |
| electron | 243da45d37772709 | 1aba1727afa73a18 | 1534c5d5c9507616 |
| starship | a862fc906a084284 | 25e0c3c5c9ea1dad | 9a106607b491b5ab |
| sputnik8k71ps | 6024ac904f0a2720 | 7af14988f167fb73 | 7c23702e0e36f631 |
| vostok8k72k | ffbd505b985e9895 | f743e7985f46c004 | 58fe949af4f78ab8 |
| saturnv | f21081ad198eff52 | fcda3ec3ef5f09f3 | 5e10cf87e6218087 |

**The other goldens and recorded values** (HEAD):

| Test | What moves | Recorded → HEAD |
|---|---|---|
| tests/rigid-flex-golden.test.ts (first 160 s, six-DOF without the flexible options) | Falcon 9; the same hash with every option given and off | 3f48e9ee37213f9e → bb8f681502302fcf |
| | Soyuz-2.1a | 50072d4def956341 → 6fca7032c8c611f8 |
| | Angara-A5 | 98ef622ae14d11eb → a4702fff301657bf |
| tests/heavy/flex-golden.test.ts (whole missions, six-DOF without the flexible options) | Falcon 9 | 7fb4ebc11cd17b4f → f26c2aa671f4feed |
| | Soyuz-2.1a | d099a931012c9dfe → ef7c045a067c9551 |
| | Angara-A5 | bf2b7d5589b88818 → e882abb334c330d5 |
| tests/eo-phy-6/apollo11.test.ts | the event digest, the entry-interface word and the state words | 330b5fd071b9da23… → b561d6eaffb98da3…; entry interface 41256dd35fc22510 → 41256dd346c740eb |
| tests/assessment-flights.test.ts | the placement test's recorded flight series (a file snapshot) | every series |
| tests/fleet-defaults.test.ts, `DIRECT_INSERTION_GRID` | the measured grid behind `DIRECT_INSERTION_CEILING`, which its own comment says is re-measured after each physics change | Soyuz-2.1a 6 318 kg at 200 km: 198.6 × 200.5 → 197.7 × 204.6 km (4.1 km off the cell, band 3 km); every cell's verdict (`closes`) is unchanged |
| tests/d01-vehicles-identity.test.ts | Angara-A5's point-mass kick 4° → 3.5° (2249b9e) | D-51 alone |
| tests/recheck.test.ts (T02 fixtures) | match / borderline / differs / cannotRefly | 4 / 2 / 0 / 0 → 2 / 1 / 2 / 1 |
| tests/replay.test.ts (two tests) | Soyuz-2.1a's max-Q instant | T+63.0 → T+63.1 s |
| tests/lesson-packs.test.ts | the five packs' recorded files and the instructor's re-check of a pack record | recorded on the old physics |
| tests/validation/falcon9-webcast.test.ts, tests/validation/timelines.test.ts, tests/heavy/validation-falcon9.test.ts, tests/heavy/validation-timelines.test.ts | the recorded sets of known disagreements with the published figures | each new member is a finding below (owner questions 2 and 9), not only a re-record |

## What fails and is not a golden: findings, causes, no bound changed

"f157546" is this branch before this step; "D-51" is the D-51-only tree 4fc67f1 (an export); "the law" means the D-51-only tree passes and HEAD fails. Every row passes at the base (`final/base-default.log` and the heavy runs of the earlier steps). A test that passes does not print its values, so a base value in a row is a probe's (named), the geodesy review's (Progress MS-19's 192 km and Atlas V Juno's 41.8 s, from its probes on the base) or the VALIDATION table's (VA267's 101.0 km).

| Test | Measured at HEAD (base; f157546) | Cause |
|---|---|---|
| historical-vehicles: Sputnik-1's flown orbit; lessons-history 5.3; fleet-defaults' "a fully excluded vehicle must have a dedicated mission that succeeds" | Sputnik-1 214.0 × 791.0 km against the flown 214 × 938 (base 214 × 937; f157546 214.0 × 779.0), burning to depletion; the timeline check reads 0.157 against 0.15 | D-51: Baikonur's pads are 11 km lower in radius. Owner question 2 |
| historical-vehicles: Vostok-1's return (point mass) | lands 24.9 km from its place, 24.8 along the track (bound 15 km; f157546 103.2 km) | D-51. Vostok-1 now reaches its flown orbit (168.0 × 315.0 km), so the return is what is left. Owner question 2 |
| historical-vehicles: Mercury-Redstone 3 (point mass) | 32.4 km from Freedom 7's splashdown (bound 25 km; f157546 30.8) | D-51 (the Cape pad moves). Owner question 2 |
| heavy/mercury-redstone (six-DOF) | 27.73 km from the splashdown (bound 25 km; base 11.36, f157546 26.99) | D-51 (the D-51-only tree gave 26.99 at the finishing step). Owner question 2 |
| heavy/history-sixdof: Vostok-1 to 181 × 327 km | now on target: the lesson's physical apsides 181.0 × 324.7 km and `evt.targetOrbit`; the test reads the osculating orbit at the end, 181.0 × 306.4 km against 327 ± 5, and expects the physical apogee above 327 km and the flight off target, as at f157546 (osculating 180.9 × 324.2, physical 181.0 × 342.6, `evt.offTargetOrbit`; probe `fix-vostok6`) | this step's single-burn cut-off on the physical apsides, which D-51 asked for. The test recorded the old shortfall; owner question 3 |
| validation/timelines: Progress MS-19 (point mass) | insertion perigee 154.0 km (ref 193 ± 29.9; base 192); the Blok I runs dry | D-51 (fails on the D-51-only tree). Owner question 2 |
| rigid-soyuz-programme: six-DOF Progress MS | osculating perigee at separation 182.3 km against 193 ± 0.5 (base 192.8; f157546 182.1); physical 186.2 × 219.7 km | D-51 (fails on the D-51-only tree). Owner question 2 |
| heavy/validation-timelines: Ariane 64 VA267 (six-DOF) | P120C separation at 101.9 km (ref 87 ± 14.1; base 101.0); the fairing's 160.1 km was a recorded disagreement already | D-51 (the D-51-only tree reads 101.1 km and fails too); the law adds 0.8 km. Owner question 2 |
| vostok-replay: the recorder's cadence | the last orbit frame 15.9 s before the retro sequence (bound 10 s; f157546 17.4) | D-51, downstream of Vostok-1's return |
| validation/timelines: Atlas V (Juno, point mass) | max-Q at 41.5 s (ref 46.4 ± 4.6; base 41.8, inside) and the fairing at 156.7 s (ref 204.9 ± 20.5) join the recorded disagreements | the law (passes on the D-51-only tree). Owner question 9 |
| validation/falcon9-webcast: CRS-16 (point mass) | max-Q at 48.4 s (ref 54.0 ± 5.4) joins the recorded T+100 speed and SES-1 time | the law. Owner question 9 |
| heavy/validation-falcon9: GPS III SV01 and SSO-A (six-DOF) | GPS III SV01's T+60 speed 317 m/s (ref 359 ± 41) joins its recorded max-Q time and SECO-1 altitude; SSO-A's max-Q at 52.1 s (ref 58.0 ± 5.8) joins its recorded speeds. CRS-16, which failed at f157546 (SES-1 at 140.4 s), passes | the law for GPS III (passes on the D-51-only tree in the geodesy review's run); SSO-A's max-Q moved 0.1 s past the bound in this step (it passes at f157546). Owner question 9 |
| validation/pslv-first-stage | with every PS1 solid at a peak factor of 2 (a counterfactual the test flies), the stack breaks up at T+29.4 s (`evt.structuralFailure`); its thrust at T+5 s is 9 085 kN against 8 625 kN at the base. At factor 1 and as shipped it flies (separation at 1 578 and 1 522 m/s; base 1 578 and 1 512) | the law (flies on the D-51-only tree): the air takes p₀·A_e off a head-end peak, not a share of it, so a peak of 2 pushes 5 % harder (probe `fix-pslv`). Owner question 9 |
| fleet-defaults: the 200 km single-shot circle's margin; the crew ship's perigee; Long March 2D's delivery; H-IIA iss/90's retrograde trim | each read on the osculating ellipse of one instant (`sim.state.elements`) or on a burn event's conic; the pairs are in owner question 3 | D-51 instruments. Owner question 3 |
| quickstart: the LEO and ISS starters | apogee 10 014.8 m and perigee 15 674.6 m off on the osculating ellipse (bound 10 000 m); both reach `evt.targetOrbit` | D-51 instrument (fails on the D-51-only tree). Owner question 3 |
| target-plane: two tests | the crew ship's osculating perigee 404.3 km, a perigee miss on the ellipse of one instant | D-51 instrument (fails on the D-51-only tree). Owner question 3 |
| range-safety (three tests), panel-verdict | the test's heading sweep uses the geodetic latitude (`site.latitude`) and the F01 headings and the corridor message were recorded on the sphere: Wallops' heading 130.13° against the recorded 129.95°, H3's least inclination from Tanegashima 94.03° against 91.93°, the message no longer containing '31.8' | D-51 instruments and recorded values; the planner uses the pad's geocentric latitude. Owner question 3 |
| data-consistency: corridor sweep | Baikonur's reach 0.19° off the declared pair (bound 0.051°); swept with the geocentric latitude, every site is within 0.049° of `corridorReach` | D-51 instrument. Owner question 3 |
| recovery-return: tower catch | height by \|r\| − 6 378 137 m − site altitude −4 067.8 m; above WGS-84 less the site's altitude 12.98 m, inside the 8–18 m | D-51 instrument. Owner question 3 |
| equations (E02): the six-DOF Δv book | 3.18 × 10⁻³ (bound 10⁻³) with the test's v₀ = ω(R⊕ + h)cos φ = 408.499 m/s; with the WGS-84 pad's 408.813 m/s, 6.0 × 10⁻⁵ | D-51 instrument. Owner question 3 |
| recovery-return: LZ-1 divert | 0.225 m/s² with the velocity "straight down" along the radius, 0.161° off the plumb line; 1.35 × 10⁻¹¹ m/s² down the normal | D-51 instrument. Owner question 3 |
| fx5-031-judged-params | "point mass judges on the conic: no physical apsides"; since D-51 it carries them (`apAltM` 501 589.8 m) | D-51 changed the assertion's meaning. Owner question 3 |
| lesson-packs: A1, P1, R2, "12.1 and 14.2 up to 1 000 s late"; lesson-grading-end: three 12.1 tests | the measure's a is the osculating 24 405.1 km and the worked answer from the reached heights 24 364.1 km; the planned 250 × 35 786 km answer's a is 24 396.1 km, 9.0 km from the osculating one, so graded on it the planned answer now passes the 10 km band where it must fail | D-51 and this step's apogee cut-off: the apex is now aimed at the target, and the osculating a lies 41.0 km above the physical one (f157546: 24 363.7 and 24 322.6 km, the plan 32.5 km from the osculating a). Owner question 4 |
| lessons 1.4 | the 18 t solution keeps 148.1 m/s of Δv, under its reserve (f157546 145.8) | D-51. Owner question 5 |
| fleet-defaults: Vega-C's AVUM+ first ignition; reference timelines | the AVUM+ lights at 339.2 s, not after T+2 400 s; Electron's fairing jettison joins the published-callout disagreements (7 against 6) | D-51. Owner question 5 |
Passing again in this step after failing at f157546: Vostok-1 reaches its flown orbit, is cut off on its backup and states its orbit at insertion (three historical-vehicles tests); lesson 5.4's perigee hook (lesson-grading-end); lesson 2.2 (lessons-round2); lesson-packs-sixdof S2; heavy/vostok1-return (six-DOF: the sphere 7.91 km from its place, 7.86 along the track, against the bounds of 15 and 10 km; base 0.99, f157546 14.95 and 14.90; probe `hist6dof`); CRS-16 in heavy/validation-falcon9. tests/linear-loop.test.ts, which failed at 5.07 % against its 5 % bound at 3c6f083, passes.

## Assertions kept as they were

The task's rule is to keep an assertion whose meaning a decision changes, and to raise it as a question with its numbers. Before this step the branch had rewritten 16 of them to the decided physics. Each is now back as it stood at the base, unchanged in what it checks (where the branch renamed a function or a field, the restored test calls the new name: `engineThrust(e, p)` is `engineThrustAt(e, p, 1)`, `onEllipsoid` is `landReturn`, a row's `wgs84` is `fine`, and the retired `onDrawnSphere` is read through `drawnFrame`). Each fails, and each has the decided law's statement beside it as a separate test, with expected values worked out from the equations, which passes. Each restored test carries a comment naming owner question 11. Measured at HEAD (`final/restored-head.log`); every one passes at the base (`final/base-default.log`):

| Test file: the kept test | What it asserts | At HEAD | Beside it | Decision row |
|---|---|---|---|---|
| physics-core: a vacuum-only engine never uses its placeholder sea-level figures | it flies its 100 N vacuum thrust at p₀ | 75.91 N, what its nozzle gives with the flow separated | flies its nozzle's thrust in air, never its placeholder | vacuum engines in the air |
| monte-carlo: scales the engines, the propellant and the dry mass | a +2 % thrust factor makes F_SL × 1.02 (Merlin 1D 861 900 N) | 863 280 N: the factor scales the chamber, F_vac × 1.02, and keeps the nozzle's p₀·A_e | scales the engines through their chambers, keeping each nozzle | throttle and pressure (ข) |
| monte-carlo: flies the dispersed vehicle through the dispersed air | +3 % thrust gives a thrust ratio 1.03 at T+5 s | 1.0325 = 1 + 0.03·F_vac/F_SL | its chambers 3 % up | throttle and pressure (ข) |
| rigid-fleet: flies each strap-on group at its own level | the ratio of two PSOM-XL chambers is the ratio of their levels, 1.3089 | 1.3245, the law's (λ₁F_vac − pA_e)/(λ₀F_vac − pA_e) | through the thrust law | throttle and pressure (ข) |
| equations: marks what does not apply on the second stage above the air | the pressure term carries `eq.note.vacuumOnly` | no note: the Merlin Vacuum has its exit area | gives the vacuum engine its exit area | vacuum engines in the air |
| data-consistency: a solid motor contributes the same liftoff thrust as a stage and as a booster | P120C as Vega-C's stage over F_SL × the profile's head, 1 ± 0.005 | 1.0215: the stage flies the head as a level through the law | through the thrust law | throttle and pressure (ข) |
| design-static-fire: refuses a vacuum-only engine at any pressure above zero | `vacuumOnlyAtPressure` | no refusal: the RL10 fires in air | fires a vacuum-only engine in air | vacuum engines in the air |
| design-static-fire: delivers each ground-lit engine's sea-level Isp within 8 % | the mid-burn Isp is the old law's to 10⁻¹² | 1.10 × 10⁻³ off (Atlas V's GEM 63, mid-burn on its profile) | each sample at its own level | throttle and pressure (ข); the stand's Isp note |
| design-static-fire: pays for every newton-second at the delivered Isp | impulse / propellant = g₀·Isp(p) to 10⁻⁹ in air | 2.42 × 10⁻³ off (Merlin 1D at sea level: the start-up and tail-off at lower Isp) | in vacuum at Isp_vac, in air at the law's | throttle and pressure (ข); the stand's Isp note |
| design-test-stand: Merlin 1D ×9 at sea level | the firing's Isp is the full-thrust one to 10⁻⁹ | 3.25 × 10⁻⁴ off | under the thrust law | throttle and pressure (ข); the stand's Isp note |
| design-test-stand: refuses a vacuum engine in air | `vacuumOnlyAtPressure` | no refusal | fires it with its nozzle separated | vacuum engines in the air |
| vostok-render: a body on the real ground is drawn on the drawn ground | drawn on the 6 378.137 km sphere | 12 971 m inside it: the drawn ground is WGS-84 | the return drawn where it flies | D-51 (the drawn Earth is the flown one, fd63515) |
| vostok-render: moves only a Vostok return and its debris | a return 1 km up is drawn 1 km over the sphere | −11 971 m | as above | D-51, fd63515 |
| vostok-render: the sphere at rest stands on the drawn ground | 0.95 m over the sphere | −12 970 m | stands on the drawn WGS-84 ground | D-51, fd63515 |
| vostok-render: puts the fields on the drawn sphere | the fields' anchor within 1 km of a sphere-ground point | 13 048 m away | on the drawn WGS-84 ground | D-51, fd63515 |
| vostok-render: Blok E's row reads its height above the sphere | 0 km | 4.0 km above WGS-84 | every body above WGS-84 | D-51, fd63515 |

**Changed and not restored**, with the reason:

- *The fleet gate* (`achievedElements`, tests/fleet-harness.ts): one line, which took the physical apsides in six-DOF only. It measures the orbit the acceptance judges; D-51 decided that point-mass flights are judged on the physical apsides too ("with the burn planning and the judging that this needs"; M-LAUNCH-031's point-mass half). With the base's line, the same flights accept 93 of 222 rows instead of 156 ("Before and after"). Owner question 11 asks about it.
- *Calls that follow a changed signature, with the assertion unchanged*: `holdDownRelease(spec, payload, site)` in tests/design-warnings.test.ts (the replay weighs the stack on the WGS-84 pad, 4fc67f1; the check that the warning and the replay agree is as it was).
- *Assertions extended, the old one kept inside*: the B27 Isp identity in tests/physics-core.test.ts runs at level 1, as before, and at 0.6; tests/design-warnings.test.ts's `vacuumEngineOnPad` keeps its checks and adds `vacuumEngineInAir`'s; tests/design-static-fire.test.ts's throttled burn keeps its vacuum checks and adds the sea-level ones. Its comment "The Isp does not depend on throttle in this model" is the stand note the throttle decision says changes.

## Questions for the owner

1. **The budget.** At HEAD `lesson-file` is 355.5 of 347.0 kB (+8.5 kB) and precache code 14 779.9 of 14 724.0 kB (+55.9 kB); after the rebase, i18n is projected about 1.0 kB over its 1 729 kB; the Monte Carlo worker is 62 B under its ceiling. The law's numbers table, its functions and the tail-off integral are most of it.
   - (ก) Hold the merge for an identical-output offset that frees the overruns. Effect: no ceiling moves; the merge waits.
   - (ข) Raise the ceilings by the measured sizes with D-38's four parts (size, feature: the nozzle law, a named offset package, your approval). Effect: it merges now and the offset follows.
   - (ค) Pack the nozzle table tighter (short field names, arrays). Effect: it saves part of the table's bytes but not all, so it still needs (ก) or (ข).
   - Proposal: (ก) with (ค), because the re-baseline waits for the Apollo work anyway.
2. **The historical flights, Progress MS-19 and VA267 on WGS-84** (Sputnik-1's orbit; Vostok-1's point-mass return; Mercury-Redstone 3 in both models; lesson 5.3; Progress MS-19's insertion in both models; VA267's P120C separation height in six-DOF).
   - (ก) Re-derive these vehicles' loads, guidance and cut-offs from sources on the WGS-84 pad. The real rockets flew from the real Earth, so the sphere's 11 km was a free gift that the data absorbed. Effect: a data step with its own sources and tests.
   - (ข) Keep the data and record each shortfall as a known deviation, with its numbers, in place of the "as flown" check. Effect: the flights stop matching history.
   - Proposal: (ก).
3. **Instruments built on the sphere, or on the osculating ellipse of one instant.** What the test reads now, and the same quantity on WGS-84 or on the physical apsides (probes named):
   - on the sphere: the corridor sweep (0.19° → within 0.049° with the geocentric latitude; `corridor`); the range-safety heading sweep, the F01 headings and the corridor message (the planner's geocentric latitude against the test's geodetic one); the tower height (−4 067.8 m → 12.98 m; `tower`); E02's v₀ (3.18 × 10⁻³ → 6.0 × 10⁻⁵; `eom-budget2`); LZ-1's "straight down" (0.225 → 1.35 × 10⁻¹¹ m/s²; `divert`); fx5-031's point-mass rule;
   - on the osculating ellipse: the crew ship's perigee in fleet-defaults and target-plane (osculating 404.3 km, 15.7 km off; physical 412.6 × 427.2 km, 7.4 km off, inside 10; `fix-instruments`); Long March 2D's delivery (650 kg: osculating 573.6 × 599.9 km, physical 597.2 × 602.9 km; bound 15 km); the quickstart starters (10.0 and 15.7 km off on the osculating ellipse; both reach `evt.targetOrbit`); the 200 km single-shot circle's margin (osculating 190.9 × 200.0 km at the cut-off, 0.9 km of margin against 5; physical 199.0 × 201.6 km, 8.4 km of margin; `single-shot`); six-DOF Vostok-1 to 181 × 327 km (osculating 181.0 × 306.4 km; physical 181.0 × 324.7 km and on target, where the test expects it off target; `fix-vostok6`); H-IIA's trim, whose test reads each burn event's conic (its last burn moves the conic 412 × 422 → 412 × 430 km, and the physical apsides from the state at each completion 412.0 × 422.6 → 411.9 × 420.1 km, a residual of 10.6 → 8.2 km; `fix-trim`).
   - (ก) Measure the same quantity on WGS-84 or on the physical apsides, with every bound unchanged, in the re-record step. Effect: every pair above is inside its bound; six-DOF Vostok-1's test would then check that the flight is on target.
   - (ข) Leave them failing until the re-record step and decide each there. Effect: red tests on the branch until then.
   - Proposal: (ก), in the re-record step.
4. **Where the lessons' semi-major axis is read.** D-51 decided the judging and the planning. Still open is the lessons' `orbit.semiMajorAxis`, which reads the osculating ellipse while the reached heights are physical. On a geostationary transfer the two are 41.0 km apart (24 405.1 against 24 364.1 km). Now that the apex is aimed at the target, the planned answer (24 396.1 km) falls 9.0 km from the osculating a, inside the 10 km band that should fail it.
   - (ก) Read a as R⊕ + (h_lo + h_hi)/2 from the physical apsides at the end. Effect: the worked answers match exactly, and the planned answer is 32.0 km off and fails, as the lessons mean.
   - (ข) Keep the osculating a and re-derive the worked answers and the band from it. Effect: the lessons teach the osculating ellipse; the band would have to be under 9 km to fail the plan.
   - Proposal: (ก).
5. **Lessons and profiles that move.**
   - Lesson 1.4's 18 t solution keeps 148.1 m/s, under its reserve; Vega-C's AVUM+ lights at 339.2 s; Electron's fairing callout. (ก) Re-set them to the new flights. Effect: lesson design, which is your call. (ข) Keep them failing until the re-record step. Proposal: (ก) for 1.4; a measured note for the timelines.
   - Lesson S2's bound (1 000 m, set from a 773 m worked flight plus 25 %): the star-tracker flight now reads 997.01 m (base 988.73). It passes with 3 m to spare. (ก) Keep the bound. Effect: a later small change can flip S2. (ข) Re-set it by its own rule from the new worked flight (997.01 m + 25 % = 1 246 m, rounded as you choose). Effect: the lesson keeps its margin. Proposal: (ข), in the re-record step.
6. **A vacuum engine on the pad.** The builder refuses one (`vacuumEngineOnPad`), and now says why in physical terms, while an air-lit one flies its real thrust.
   - (ก) Keep the refusal: the side loads that break a real vacuum nozzle at sea level are not modelled, so a flight would show a nozzle working that would not.
   - (ข) Allow it with a warning and fly the separated thrust, as in the air.
   - Proposal: (ก).
7. **The wall factor.**
   - (ก) Keep the least factor that keeps each qualified sea-level point attached (now). Effect: Angara-A5 reports RD-191 separation on every nominal flight (all 9 fleet rows, at 0.6 km, ε_s 23.4–23.5), its core flying 510.7 kN at 30 % at sea level against 457.0 attached; vacuum engines lit in air get 1; the engines with a factor above 1 separate as soon as they throttle on the pad.
   - (ข) One factor for every bell, the SSME's 2.4. Effect: Vulcain 2.1 is separated on the pad; Merlin 1D's onset moves from λ 0.424 to 0.18 and the RD-191's from 0.547 to 0.23, so Angara-A5 flies attached and reports nothing, and its core's low-altitude thrust drops to the attached figure.
   - (ค) Per-engine published wall pressures as they are found.
   - Proposal: (ก) now, (ค) as data appear.
8. **The catalogue's thrust pairs against published exit sizes** (the table in "The physics": Raptor 2's exit 47 % larger in area than FAA's, Vulcain 2.1's 17 % larger, the F-1's 7–9 % smaller; the Merlin 1D agrees).
   - (ก) Keep the pairs. Effect: the sea-level thrust stays the catalogue's to the newton; the exit, and with it where separation starts and the chamber pressure flown, is what the pair implies.
   - (ข) Take the published exit where a primary source gives it, and let the sea-level thrust follow (Raptor 2 2 364 instead of 2 300 kN). Effect: catalogue sea-level figures change; each needs its source read first (two of the three above are search summaries or third-party pages).
   - Proposal: (ก) now, (ข) engine by engine once a primary source is read.
9. **Validation rows that the thrust law moves** (CRS-16's point-mass max-Q 48.4 s against 54.0 ± 5.4; Atlas V Juno's max-Q 41.5 s against 46.4 ± 4.6 and fairing 156.7 s against 204.9 ± 20.5; six-DOF GPS III SV01's T+60 speed 317 m/s against 359 ± 41 and SSO-A's max-Q 52.1 s against 58.0 ± 5.8; PSLV-XL's peak-factor-2 counterfactual breaking up at T+29.4 s).
   - (ก) Record each as a disagreement with its cause (the whole p·A_e at low throttle; the solid peak's extra thrust) in the validation sets. Effect: the validation stays honest; the sets grow.
   - (ข) Re-derive the throttle profiles that the published callouts constrain (Falcon 9's and Atlas V's throttle buckets were set as levels under the old law) under the new law. Effect: a data step per vehicle.
   - (ค) For PSLV-XL, fly the counterfactual at a peak factor that keeps the published peak thrust, since 2 is not a real motor. Effect: the test keeps its point (the profile's shape is not why PS1 is slow).
   - Proposal: (ก) now with (ค), and (ข) as a follow-up.
10. **The guidance's vertical after the pitch-over** (new in this step). The vertical rise flies the plumb line; the stored R-7 programme and everything after the kick fly the radius, 0.19° apart. Flying the programme from the normal too cost the six-DOF Progress MS 10.2 km of perigee; holding the radius from the release disturbed the bending-mode measurement of tests/linear-loop.
    - (ก) Keep it as it is. Effect: one change of reference of up to 0.19° at the pitch-over, which the fleet absorbs (no regressions).
    - (ข) Fly the whole guidance in the geodetic frame, with the programme's lean taken out of the plane. Effect: a guidance step and a full re-measure.
    - Proposal: (ก).

11. **The assertions kept as they were** (16 in 8 files, in the table above) **and the fleet gate.** Each kept assertion states the physics before the decisions of 2026-10-17 and fails now; beside each, a separate test states the decided law and passes.
    - (ก) In the re-record step, retire the 16 and keep the tests beside them. Effect: the suite checks the decided physics; this report keeps the old statements and their numbers on record.
    - (ข) Group by group: retire the 11 of the thrust-law group (from option (ข) and "the physics as it really is") as in (ก), and keep the 5 of tests/vostok-render.test.ts until you choose between the drawn WGS-84 Earth and the drawn sphere, since the drawing follows from flying on WGS-84 (fd63515) rather than from a decision row's words. Effect: those 5 stay red until then; choosing the sphere brings back the mapping that moved a Vostok return 12.97 km up at Saratov.
    - The fleet gate: (ก) keep it on the physical apsides in both models, as D-51's judging. Effect: 156 of 222 rows accepted, as at the base. (ข) Put back the base's line. Effect: the same flights accept 93 of 222, the point mass judged on the osculating ellipse its own verdict no longer reads.
    - Proposal: (ก) for the assertions, and (ก) for the gate.

## Docs touched

On the branch (2136978 and 6a6edbf, with this step's 8842e6b):

- README.md: the physics line names J2 from the pad to the orbit, the sites on WGS-84, the air read above the ellipsoid and each engine's thrust from its nozzle, separation included (2136978).
- docs/USER-GUIDE.md: the test stand fires a vacuum engine in air and says where its flow separates; Isp falls with the throttle in air; the builder's `vacuumEngineInAir` warning (2136978). In this step, "the builder will not" still said the stand refuses a vacuum engine in air; it now says why a vacuum engine is not lit on the pad.
- docs/IMPLEMENTATION-STATUS.md: the model and the stand's limits (2136978); the level pad and the cut-offs on the physical apsides (this step).
- docs/PHYSICS.md §1, §2, §2a, §4, §10 (2136978); in this step §1 (the level pad and the plumb line, the judging and aiming on the physical apsides, the two-day forecast limit, the quantities still drawn on the sphere) and §4 (the wall factor's Angara prediction and the vacuum engines' factor).
- docs/VALIDATION.md: the re-baseline section (2136978, 6a6edbf), re-measured at 19eb5da in this step with the base gate's figure, and notes under the Falcon 9 webcast, VA267 and Progress MS-19 tables that they move and are re-measured in the re-record step.

## Commits

On 7f991f9, 27 commits with the report's, none of them WIP:

| Commit | What |
|---|---|
| a5c953a … 4fc67f1 | The nine D-51 commits of workstream 1, kept as they were |
| 2be2354 | The nozzle law |
| 03b07da | The divert's horizontal plane (D-51) |
| 3dd0efe, adeaead | Numbers apart from sources and AVUM+ sourced; shorter texts (fix 2be2354) |
| 46796d9 | Lessons and Monte Carlo on the physical apsides |
| 2136978, 6a6edbf | The docs of both workstreams (replacing the hand-over's WIP docs commit), and their fix |
| f157546 | The report and the change fragment, before the reviews |
| efe26e9, 3c6f083, 19eb5da | The level pad and the contact on the normal; the guidance's vertical tried on the normal throughout and taken back; the vertical rise on the plumb line. The fleet and single-shot figures in the messages of efe26e9 and 4e9afc3 were measured with the programme on the normal, which 3c6f083 removed; the figures in this report are 19eb5da's |
| 4e9afc3 | Single burns and transfer apogees cut off on the physical apsides |
| c465f6c | RD-0109's ε; Raptor 2's provenance; the p_c note |
| d370659 | The vacuum-on-pad texts |
| 86fb439 | The stand assertion tightened |
| 1d57e95 | The 16 rewritten assertions kept as they were, beside the law's tests (fixes the test changes of 2be2354 and fd63515) |
| 8842e6b | This step's docs (fixes 2136978 and 6a6edbf) |
| the report commit | This report and the change fragment |

## D-25: why one change over 400 lines, and the split

The source change (src/) is 57 files, +1 729/−597 lines (`git diff --shortstat 7f991f9..HEAD -- src`):

- D-51: the nine commits a5c953a…4fc67f1 and 03b07da, 43 files, +573/−398;
- the law: 2be2354, 23 files, +838/−182;
- the fixes before the reviews (3dd0efe, adeaead, 46796d9): 7 files, +396/−156, mostly the regenerated data table;
- after the reviews (efe26e9 … 19eb5da): 11 files, +85/−24.

Besides: tests 13 files, +1 108/−37 (of which tests/nozzle-law.test.ts 383 and tests/wgs84-sites.test.ts 222 new, and 1d57e95's kept assertions +357/−12); docs and README 6 files, +884/−85, before this report.

**The reason** is one validated re-baseline instead of drift PR by PR (plan S01). D-51 and the thrust law each move every fingerprint and golden. Merged apart, every golden would be re-recorded twice and the fleet re-validated twice. Together they are measured once, against the base, row by row.

**A split with identical output**: the nozzle module, its data and its unit test could land first, unwired (nothing calls it, so the output is identical). That PR is 723 source lines (src/physics/nozzle.ts 308, src/data/nozzles.ts 415), still over 400. No other part is identical-output: the drawn ellipsoid changes the picture, and the budget refactor b596e6e only makes sense with D-51.

## Probes

All are gitignored, in the worktree's tests/probe/ and in the scratchpad's probes/rebaseline/; the outputs of the review fixes are in probes/rebaseline/fix/ and those of this step in probes/rebaseline/final/. The comparison trees are exports of 7f991f9 (`fix/x-base`), f157546 (`fix/x-head`), 4fc67f1 (`fix/x-d51`), 3c6f083 (`fix/x-noplumbguid`), the vertical-only plumb tree that became 19eb5da (`fix/x-plumbv`), 19eb5da (`final/x-head`, for the heavy Monte Carlo sets) and 19eb5da with the base's fleet gate (`final/x-conic`); the base runs are in the read-only copy of 7f991f9 (wt/base).

| Probe | What it runs |
|---|---|
| fleet-table.test.ts, compare_fleet.py, fix/gto.py | the point-mass fleet table; the GTO rows |
| ratings.test.ts | the Build ratings |
| sixdof-sites3.test.ts | six-DOF, one flight per site |
| nozzle-table.test.ts, fix/eps.py, fix/exits.py | every engine's nozzle; RD-0109's ε; the pair-derived exits against published ones |
| historical.test.ts, hist6dof.test.ts | the historical flights, point mass and six-DOF |
| single-shot.test.ts | Soyuz-2.1a's single-burn insertion |
| fix-s2.test.ts, fix-s2nav.test.ts | lessons S1 and S2 at liftoff; S2's navigation error for each unit |
| fix-progress6.test.ts | the six-DOF Progress MS at separation |
| fix-vostok6.test.ts | the six-DOF Vostok-1 lesson to 181 × 327 km |
| fix-trim.test.ts | the retrograde-trim rows, conic and physical at each burn |
| fix-instruments.test.ts | the crew ship and Long March 2D, osculating and physical |
| fix-highorbit.test.ts | point-mass flights to orbits beyond the two-day forecast (from the geodesy review) |
| fix-pslv.test.ts | PSLV-XL with its solids' peak factors 1, as shipped and 2 |
| eom-budget2.test.ts, tower.test.ts, divert.test.ts, corridor.test.ts | the four sphere instruments |
| finish/budget-base.txt, fix/budget-head.txt, fix/bytes-head.txt | the builds and budgets |
| fix/pairs.py | old and new values out of the vitest logs |
| final/fleet-head.tsv, final/ratings-head.tsv | the fleet table and the Build ratings again on HEAD |
| final/fleet-conic.tsv (in final/x-conic) | the fleet table on HEAD judged by the base's gate |
| final/restored-head.log | the 8 files with the kept assertions, on HEAD |
| final/base-default.log | the files failing at HEAD, the 8 restored ones, linear-loop and lessons-round2, on the base |
| final/mc.sh, final/head-*.log, final/base-*.log | the five heavy Monte Carlo sets, HEAD and base |
| final/budget-head.txt, final/build-head.log | the build and budget of the final tree |

## Reviewers

- **Propulsion review** (second agent), sound with fixes. It found the attached and separated laws right by its own derivation, the onset continuous and the law monotonic, every ground-lit engine's sea-level thrust exact, and 189 of 191 propulsion tests passing (the 2 others the D-51 instruments). Its findings: the wall-factor rule gives the RD-191 a factor of 1, so Angara-A5 reports separation at its qualified 30 % (now called the rule's prediction in PHYSICS §4 and the report, with its effect in owner question 7); RD-0109 flew ε 26 against its estimate's 25.1 (now 25.1, c465f6c); Raptor 2's ε is the 2019 engine's and its pair-derived exit is 47 % larger than FAA's (marked uncertain, c465f6c; the published exits compared in "The physics"; owner question 8); the vacuum-on-pad texts said the nozzle "cannot work" (reworded in three languages, d370659; USER-GUIDE's line in 8842e6b); a ground-lit engine's p_c is shown, never flown (said in nozzles.ts's header, c465f6c); one stand assertion looser than needed (tightened, 86fb439).
- **Geodesy review** (second agent), sound with fixes. It found the WGS-84 transforms and the site placement right to nanometres, J2 with the Earth's turn within 5.1 × 10⁻⁶ of Somigliana, the 10 s J2 coast good to centimetres per revolution, and every listed golden hash right. Its findings: lesson S2's crewed Soyuz hit the ground on the pad at T+0.02 s (fixed in the physics: a level pad, the vertical rise on the plumb line, contact on the normal, efe26e9/3c6f083/19eb5da; heavy/lesson-packs-sixdof passes); the failure list was incomplete (278 default files and all 33 heavy files run, every failure listed with its base value and cause); single burns aimed on the conic, Q4 re-asking a decided point, the GTO apogees 52–180 km low (cut-offs on the physical apsides, 4e9afc3; Q4 now asks only where the lessons' a is read); rewritten assertions not listed (the 16 restored, failing, beside the law's tests, 1d57e95; the fleet gate measured both ways; owner question 11); and three nits (the two-day forecast documented; the D-25 split corrected; the sphere quantities listed in PHYSICS §1).
- Second agent, re-check of this step:
- Owner:
