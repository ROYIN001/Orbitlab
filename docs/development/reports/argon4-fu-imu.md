# Argon4 follow-up: the IMU's turn-on bias held for the flight / ไบแอสตอนเปิดเครื่องของ IMU คงที่ตลอดเที่ยวบิน

Workstream 5 of the Argon4 follow-up (hand-over `docs/development/HANDOVER-ARGON4.md` on
`claude/bold-johnson-haeu8t`, patches `docs/development/handover/2026-10-17/5-imu-bias-model/`).
The owner's decision of 2026-10-17 ([DECISIONS.md](../../DECISIONS.md), "Decided 2026-10-17
(Argon4 review follow-up, chat)", second table, row "IMU turn-on bias"), answer to question 3,
verbatim "ก.": the turn-on bias is a constant drawn at power-up and the in-run bias a
Gauss–Markov process on top, in the truth and in the filter. This report covers the two commits
handed over (checked here), the documentation finished here, and one lesson verdict that flips,
which waits for the owner.

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - **ทำอะไร:** ตามที่คุณเลือกข้อ (ก): ไบแอสของไจโรและมาตรความเร่งแต่ละแกนมีสองส่วน ส่วนแรกคือไบแอสตอนเปิดเครื่อง (turn-on) สุ่มครั้งเดียวตอนเปิดเครื่องแล้วคงที่ตลอดเที่ยวบิน ส่วนที่สองคือไบแอสระหว่างทำงาน (in-run) ที่ลอยเปลี่ยนแบบ Gauss–Markov (τ = 300 วินาที) ซ้อนอยู่ด้านบน ทั้งในค่าจริงของเซนเซอร์และในตัวกรองคาลมาน (จาก 21 เป็น 27 สถานะ) เดิมทั้งสองส่วนรวมเป็นกระบวนการเดียวที่จางลงตาม 300 วินาที ไบแอสตอนเปิดเครื่องจึงหายไปเกือบหมดภายในสิบกว่านาที (ไจโร MEMS เหลือ 4.9 °/ชม. จาก 30 °/ชม. เมื่อผ่านไปหนึ่งชั่วโมง ตอนนี้ยังอยู่ที่ 31.5 °/ชม.)
> - **ผู้ใช้เห็นอะไร:** เมื่อเปิดระบบนำร่อง (โหมดวิศวกร 6-DOF) โดยไม่มี GNSS ความคลาดเคลื่อนโตขึ้นตามที่หน่วยจริงเป็น: Falcon 9 ที่ SECO ค่ามัธยฐานของ 100 ชุดสุ่ม MEMS 7.4 → 9.3 กม. เกรดยุทธวิธี 0.83 → 0.98 กม. เกรดนำร่อง 76 → 84 ม. (โตขึ้น 27 %, 18 % และ 11 % คลาดได้ราว ± 9–14 %) เมื่อมี GNSS แทบไม่ต่างจากเดิม หมายเหตุในตัวตรวจลูปและคำอธิบายเครื่องมือ MCP บอก 27 สถานะ
> - **บทเรียน:** สองบทที่บินด้วยระบบนำร่อง (2.3 guid-nav และ 15.2 ru-bins-astro) ตัวเลขในบทสรุปหลังบทเรียนปรับตามผลบินจริงทั้งภาษาอังกฤษ รัสเซีย และไทย ผลผ่าน/ไม่ผ่านไม่เปลี่ยน **ยกเว้นบท 15.2 กรณีเปิดตัวจับดาว: 989 ม. → 1 184 ม. เกินเกณฑ์ 1 000 ม. จึงไม่ผ่าน** เทสต์ heavy S2 จึงล้มหนึ่งข้อ ผมไม่ได้แก้เกณฑ์ บทเรียน หรือเทสต์ รอคุณเลือก (คำถามที่ 1) เหตุผลทางฟิสิกส์: ตัวจับดาวเริ่มเห็นดาวที่ความสูง 150 กม. (T+269.5 วินาที) ก่อนถึงตอนนั้นความคลาดสะสมไปแล้ว 1 053 ม. (เดิม 989 ม.) และบทเรียนวัดค่าสูงสุดตลอดเที่ยวบิน หลังจากนั้นตัวจับดาววัดได้แต่ท่าทาง ไม่เห็นไบแอสของมาตรความเร่ง ไบแอส 500 µg ที่คงอยู่ 524 วินาทีให้ ½bt² ≈ 0.67 กม. ต่อแกนด้วยตัวมันเอง ความคลาดจึงโตกลับเป็น 1 184 ม. ตอนดับเครื่อง ทั้งนี้เกณฑ์ 1 000 ม. ก็ฉิวเฉียดมาตั้งแต่ก่อน: บนฐานเดิมเมื่อเปลี่ยน seed ของเซนเซอร์ ตัวจับดาวผ่านได้เพียง 3 ใน 11 (ตอนนี้ 2 ใน 11) ข้อเสนอของผม: ตั้งเกณฑ์ใหม่ 1 500 ม. ตามกฎเดิมที่ใช้ตั้งเกณฑ์นี้ (ผลบินของคำตอบ + 25 %) ความเร่งด่วน: ตอนนี้ชุดบทเรียน ru-24-05-06 ถูกซ่อนจากหน้าเว็บตามที่คุณตัดสินใจเมื่อ 2026-10-17 (`TEACHER_TOOLS`) บท 15.2 จึงไม่อยู่ในรายการบทเรียน (เปิดได้เฉพาะเมื่อพิมพ์ที่อยู่ `?lesson=ru-bins-astro` เอง) ผลที่เปลี่ยนนี้จึงเห็นได้ตอนนี้เฉพาะในเทสต์ heavy S2 นักเรียนจะเจอเมื่อเปิดชุดบทเรียนกลับมา
> - **ถ้าคุณตอบ (ก):** เตรียมไว้ก่อนคุณตอบ ยังไม่ใช่การตัดสินใจ: เกณฑ์ของบท 15.2 เป็น 1 500 ม. ตามกฎเดิม (1 184 ม. × 1.25 = 1 480 → 1 500 ม.) คือ `NAV_BOUND_M` ในซอร์สของชุดบทเรียน ตัวเลขในโจทย์ทั้งภาษาอังกฤษ รัสเซีย และไทย ไฟล์ชุดบทเรียนที่สร้างใหม่ด้วยสคริปต์ ชื่อของเทสต์ S2 และตัวเลขในข้อที่ตรวจว่ากรณีตั้งต้นเกินเกณฑ์ (1 000 → 1 500) คำอธิบายหัวไฟล์เทสต์ ชื่อ S2 ในรายการเทสต์ heavy ที่ตรวจแล้ว (`heavy-expected.json`) ค่า hash ของไฟล์ชุดบทเรียนใน `review.ts` ให้ตรงกับไฟล์ที่สร้างใหม่ (การตรวจทานทุกด้านยังรออยู่เหมือนเดิม) และหมายเหตุใน VALIDATION ส่วนบทสรุปหลังบทเรียน คำใบ้ และชื่อบทไม่เปลี่ยน («ประมาณ 1.2 กม. ถ้ามี» ตรงกับผลบินอยู่แล้ว) ผลเทสต์ heavy: ผ่านครบ 3 ข้อ (313.3 วินาที)
> - **ตรวจแล้ว:** การแยกส่วนไบแอสในค่าจริงและในตัวกรอง การคำนวณ P แบบเบา (sparse) ตรงกับการคูณเมทริกซ์เต็มถึง 10⁻¹⁵ และ P สมมาตรและเป็นบวกตลอด ลำดับการสุ่มตาม seed เทสต์ปกติที่เกี่ยวข้อง 16 ไฟล์ 321 เทสต์ผ่าน (รวมเทสต์ใหม่ที่เพิ่มหลังการตรวจ) heavy 4 ไฟล์: ผ่าน 12 ล้ม 1 (S2 ตามที่รู้)
> - **ความเร็วและขนาด:** ตัวกรอง 27 สถานะเร็วกว่าแบบเดิม 21 สถานะราว 35 % ต่อขั้น (16 µs เทียบ 24–26 µs) เพราะคูณเฉพาะช่องที่ไม่เป็นศูนย์ของ Φ ขนาด bundle ไม่ได้ขึ้นเพดาน: index 2 643.2 → 2 644.2 kB จากเพดาน 2 645.0 kB (เหลือ 0.8 kB สำหรับงานท้องฟ้า)
> - **ผู้ตรวจคนที่สอง:** ตรวจสองมุมมอง (คณิตศาสตร์ และการตรวจตัวเลขทีละข้อ) ไม่พบข้อบกพร่องในโค้ด แต่พบว่าเทสต์ไม่จับกรณีที่ค่าประมาณไบแอส in-run ถูกตรึงไว้แทนที่จะจางลง ผมลองใส่ข้อผิดพลาดนั้นเข้าไปจริงแล้วยืนยันว่าไม่มีเทสต์ใดล้ม จึงเพิ่มเทสต์ที่ตรวจทีละขั้น (จับได้) และเพิ่มขอบล่างให้เทสต์ค่าประมาณไบแอส turn-on ตัวเลขใน PHYSICS ที่ผู้ตรวจทักว่ามาจากตัวอย่างน้อยไป ผมวัดใหม่ด้วย 100 ชุดสุ่ม (เดิม 30) และใช้ค่ามัธยฐานที่ถูกต้อง ผู้ตรวจคนที่สามตรวจการแก้ทั้งหมดซ้ำแล้ว ยืนยันครบ 11 จาก 11 ข้อ
> - **การ merge:** เทสต์ heavy S2 แดงอยู่จนกว่าคุณตอบคำถามที่ 1 ข้อเสนอ: ใส่การเปลี่ยนแปลงตามคำตอบลงใน PR นี้ก่อน merge เพื่อให้ main เขียวอยู่ การ merge เป็นของคุณ
> - **รอคุณ:** คำถามที่ 1 (เกณฑ์ของบท 15.2) และคำถามที่ 2 (ข้อจำกัดของ MEMS + GNSS ที่ปิดตัวจับดาวในช่วงไถลนาน)

```yaml
package: Argon4 follow-up, workstream 5 (IMU turn-on bias)
lane: P
items: []            # the owner's decision of 2026-10-17; no plan item
change_kind: physics (navigation model) + lesson text + docs
owner_authorization: {date: 2026-10-17, quote: "3.ก.", scope: "DECISIONS.md, Decided 2026-10-17 (Argon4 review follow-up, chat), second table, row IMU turn-on bias"}
base: 7f991f9 (origin/main b16b09e + the owner's decisions commit)
failing_before_fix: [tests/navigation.test.ts "keeps each sensor's turn-on bias for the flight" (on the base the biases' spread at 1 500 s is 0.170 and 0.041 of the expected, the bound is 0.9)]
pinned_fingerprints_moved: none   # navigation is off in every fingerprint and golden
verdict_flips: [lesson 15.2 ru-bins-astro with the star tracker, pass -> fail against 1 000 m (question 1); if the owner answers (ก), none: against 1 500 m it passes]
rollback: {method: revert, data_compat: "no stored-data or file-format change; NavigationRecord keeps its fields and their meaning"}
reviewers: "second agent (physics): two lenses (math, claims), both 'sound with fixes', 11 findings; a third agent re-checked the fixes (ce0fd07, aac2205, a059c76): confirmed 11 of 11; science reviewer (realism): 0 of 1; owner (question 1): 0 of 1"
report: docs/development/reports/argon4-fu-imu.md
```

## What changed for the user

- **Navigation on (Engineer mode, six-DOF, *Navigation (INS / GNSS)*).** Each gyro's and
  accelerometer's turn-on bias is drawn at power-up and stays for the whole flight; only the
  in-run part wanders. Before, the whole bias decayed with the in-run part's 300 s, so a MEMS
  gyro's 30 °/h turn-on bias was 4.9 °/h RMS an hour later (now 31.5 °/h; 200 draws). Without
  GNSS the navigation therefore drifts further, as such units really do. Falcon 9 to LEO at SECO,
  median of 100 draws, base → branch: MEMS 7.4 → 9.3 km, tactical 0.83 → 0.98 km, navigation
  grade 76 → 84 m (+27, +18 and +11 %, each ± 9–14 %). With GNSS nothing a user would see changes
  (consistency 0.97 → 1.03).
- The inspector's Navigation note (en, ru, th) and `configure_mission`'s description of
  `navigation` say 27 states and name the two parts of a bias. The inspector's "bias true /
  estimated" rows still show the whole bias (turn-on plus in-run). The CSV has no bias columns.
- Lessons 2.3 (`guid-nav`) and 15.2 (`ru-bins-astro`) quote their flights' new figures in their
  debriefs. **Lesson 15.2's worked answer, the star tracker, now ends 1 184 m off, over the
  lesson's 1 000 m bound, and fails** (question 1). Lesson 15.2 is in the ru-24-05-06 pack, which
  is held back from the site today (`TEACHER_TOOLS = false` in src/ui/held.ts; the owner's
  decision of 2026-10-17, "teaching tools held back": the packs "ซ่อนทั้งชุด"). It is not in the
  catalogue; only a hand-typed `?lesson=ru-bins-astro` address still opens it (the "Copy link"
  button that makes such addresses is held back too). So for now the flip shows only in heavy S2;
  students meet it once the packs are shown again. If the owner answers (ก): the bound is 1 500 m,
  the brief says so in en, ru and th, and the star tracker's 1 184 m passes (question 1).

## The physics

**Truth** (src/physics/nav/navigation.ts, `initialise` and `propagate`). Per axis, for the gyros and
the accelerometers alike:

- b = b_on + b_run;
- b_on ~ N(0, σ_on²), drawn at alignment, constant;
- b_run(0) ~ N(0, σ_in²), b_run(t + Δt) = e^(−Δt/τ) b_run(t) + σ_in √(1 − e^(−2Δt/τ)) w, w ~ N(0, 1),
  τ = 300 s: exact for any step, so the spread stays σ_in;
- the IMU's increments: Δθ = (1 + s_g) Δθ_true + b_g Δt + n_g, Δv = (1 + s_a) Δv_true + b_a Δt + n_a.

σ_on and σ_in are the grade's "bias" and "bias instability" (sensors.ts; MEMS 30 and 5 °/h,
5 000 and 200 µg; tactical 1 and 0.3 °/h, 500 and 50 µg; navigation 0.005 and 0.002 °/h, 30 and
10 µg; Groves, 2nd ed., ch. 4).

**Filter.** 27 errors, x = [δr, δv, φ, δb_g,on, δb_a,on, δb_g,run, δb_a,run, δs_g, δs_a]:

- δṙ = δv
- δv̇ = G δr − [f×] φ − C (δb_a,on + δb_a,run) − C diag(f_b) δs_a + w_v
- φ̇ = −C (δb_g,on + δb_g,run) − C diag(ω_b) δs_g + w_φ
- δḃ_on = 0, with no process noise and P0 = σ_on² (a random constant)
- δḃ_run = −δb_run / τ + w_b, with Q = 2 σ_in² / τ and P0 = σ_in² (first-order Gauss–Markov)
- δṡ = 0

Φ = I + F h with h ≤ 1 s; P ← Φ P Φᵀ + Q h. Between fixes b̂_on is held and b̂_run ← e^(−Δt/τ) b̂_run,
so that δb_run follows −δb_run/τ as the model says. A fix's scalar updates build one correction x̂;
its turn-on and in-run parts go to b̂_on and b̂_run. The two parts enter F alike; only their
dynamics tell them apart, and the measurements' covariance does the splitting (P0 has them
uncorrelated; the updates correlate them).

**Why the star tracker no longer holds lesson 15.2 to 1 000 m.** Two things, both because the
turn-on biases no longer fade. Until the star tracker sees stars (150 km, T+269.5 s) the tactical
unit flies alone; the error it has made by then is 1 053 m, against 989 m on the base, and the
lesson grades the peak over the flight. After the first fix the star tracker measures φ: that
bounds the tilt and makes the gyro bias observable through φ̇ = −C δb_g, and the filter takes most
of the error back out (611 m at T+272 s). But the accelerometer bias enters only δv̇ = −C δb_a,
and with neither position nor velocity measured nothing sees it. It integrates twice: a tactical
unit's 500 µg turn-on bias (4.90·10⁻³ m/s²), held for the 524 s to the third stage's cut-off,
gives ½ b t² = 673 m per axis (1σ), 1.17 km RMS in three axes, by itself. While the turn-on part
decayed with τ = 300 s it gave b₀ τ² (t/τ − 1 + e^(−t/τ)) = 408 m per axis, 0.71 km in three. On
the branch the error is back up to 1 184 m at the cut-off; on the base it ended at 669 m. The
filter knows it: its 3-D σ at the cut-off is 1 405 m (1 160 m on the base), and over 11 sensor
seeds the star tracker's flights scatter with an RMS of 1 503 m (1 260 m), as that σ says.

## Commit 1 checked (`edc4fd6`)

Read line by line against the model above, and probed (probe files under
`/tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/probes/imu/`, each run against the base 7f991f9 and the branch through an alias; logs in
`/tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/probes/imu/logs/`):

- **Truth's discretisation** (`truth.probe.ts`). The in-run part, MEMS gyro, over 300 s: its RMS
  stays 1.01–1.04 σ_in at steps of 0.01, 1 and 30 s (180–1 200 axis draws) and its correlation over
  300 s is 0.33–0.39 against e⁻¹ = 0.37; the turn-on part moves by exactly 0. On the base the same
  process started at √(σ_on² + σ_in²) and was down to 0.40 of it after 300 s.
- **Seeded draw order** (`truth.probe.ts`). The first six normals of a seed are the turn-on biases
  on the branch and were the whole bias on the base, identical to six decimals (seeds 1, 2,
  20260919), and the scale factors after them too; the in-run parts are drawn after the alignment
  errors. Every later draw (random walks, GNSS and star-tracker noise) is shifted by six, so a
  seed's flight is a new draw of its noise; nothing pinned flies with navigation on.
- **F, Q, P0** (navigation.ts `initialise`, `propagate`). P0 = σ_on² on δb_on and σ_in² on δb_run
  (their sum is the base's single P0); F = 0 and Q = 0 on δb_on; F = −1/τ and Q = 2σ_in²/τ on
  δb_run; −C on both parts in the φ̇ and δv̇ rows. Φ has 99 non-zero entries of 729 (27 diagonal,
  3 δr–δv, 42 in the δv rows, 27 in the φ rows), as the comment says.
- **Sparse propagation** (`covariance.probe.ts`). 60 random positive-definite P with the filter's
  own scales, three grades, steps of 0.01–30 s (1–30 sub-steps), thrust 0–40 m/s², turn rates
  0–0.05 rad/s: the sparse product against a dense Φ P Φᵀ + Q h built from the same F and Q differs
  by at most 1.2·10⁻¹⁵ of √(P_ii P_jj); P is exactly symmetric. Over 3 000 s runs (MEMS with GNSS
  and the star tracker, MEMS with GNSS only, tactical with the star tracker only, tactical with
  both, navigation grade unaided; checked every 50 s) the least eigenvalue of P's correlation
  matrix stays positive (5.2·10⁻⁶ to 8.0·10⁻²) and P stays symmetric.
- **Folding a correction**: x̂'s turn-on and in-run parts are added to b̂_on and b̂_run separately
  (navigation.ts 369–372); the telemetry's `gyroBiasEstimate` and `accelBiasEstimate` are their
  sums, as the truth's `gyroBias` and `accelBias` are.
- **The commit message's test figures** (`testfigures.probe.ts`), all reproduced: biases' spread at
  1 500 s 1.039 and 0.968 of √(σ_on² + σ_in²) (base 0.170 and 0.041: the new test fails on the
  base); the 1 500 s unaided coast 0.78–1.20 per axis (base 0.82–1.15: the base filter was
  consistent with its own model); turn-on estimates after 2 000 s aided 0.146 °/h and 20.4 µg RMS,
  (error/σ)² 0.82 and 0.69; the outage test 0.894 (base 0.636).

No defect found; nothing in commit 1 is changed.

**Review follow-up.** Two second-agent reviews (math and claims) found no defect in the code. The
math review's mutation testing found a gap in the tests, which I checked again with my own probe
(`fix-mutation.probe.ts`), and by running tests/navigation.test.ts itself with each mutation
patched in at setup (`fix-mut/setup.ts`, `vitest.fixmut.config.ts`, `MUT=M1|M2|M3`):

| Mutation | Outage test (< 2) | Turn-on test (RMS < 0.25 °/h, 50 µg; (e/σ)² < 2) | New one-step test |
|---|---|---|---|
| none | 0.894, passes | 0.146 °/h, 20.4 µg; 0.82, 0.69: passes | passes (in-run ratio e^(−1/300) to 1·10⁻¹³) |
| M1: in-run estimates held between fixes | 0.897, passes | 0.181 °/h, 29.2 µg; 1.26, 1.42: passes | fails (ratio 1) |
| M2: turn-on estimates relaxing too | 29.1, fails | 0.80 °/h: fails | fails (a turn-on estimate moves) |
| M3: a fix's two parts swapped | 27.6, fails | 0.28 °/h: fails | passes |

Before the follow-up nothing caught M1: the in-run estimates are too small a part of the drift for
the outage test (the base's single bias estimate, held, gave 40.7 there). Commit `ce0fd07` adds a
deterministic test: GNSS lost from 100 s, no star tracker, the same seed flown to 150 s and to
151 s; across that step the turn-on estimates stay exactly the same and the in-run estimates
scale by e^(−1/300) (to 10⁻⁹). It also rewords the outage test's comment to say what that test
guards (M2, M3), and bounds the turn-on test's (error/σ)² from below at 0.5, so that a σ too large
fails as well: χ²(60)/60's 99.9 % band is [0.51, 1.71], and seeds 1–120 in six blocks of 20 give
0.82–1.21 (gyro) and 0.69–1.26 (accelerometers).

## Lessons that fly with navigation (b)

Two: built-in 2.3 `guid-nav` (src/lessons/builtin/track2.ts; Falcon 9, MEMS, no GNSS, 500 m to
MECO) and pack lesson 15.2 `ru-bins-astro` (src/lessons/pack-sources/ru-24-05-06.ts and
public/lessons/packs/ru-24-05-06.orbitlab-lesson.json; Soyuz-2.1a, tactical, no GNSS, no star
tracker, 1 000 m to the third stage's cut-off). No other built-in track, pack source or pack file
sets `navigation`. Flown headless as their tests fly them (`lessons.probe.ts`), the lesson's own
seed, the figure being the lesson's measure `nav.positionError` (the peak to the end event):

| Lesson | Flight | Bound | Base 7f991f9 | Branch | Verdict base → branch |
|---|---|---|---|---|---|
| 2.3 | as set (MEMS, no GNSS) | 500 m | 1 662 m | 2 021 m | fail → fail |
| 2.3 | tactical, no GNSS (the worked answer) | 500 m | 337 m | 356 m | pass → pass |
| 2.3 | navigation grade, no GNSS | 500 m | 38 m | 37 m | pass → pass |
| 2.3 | MEMS / tactical / navigation with GNSS | 500 m | 3.2 / 3.2 / 3.1 m | 3.1 / 3.2 / 3.2 m | fail (GNSS on) → same |
| 15.2 | as set (tactical, no GNSS, no star tracker) | 1 000 m | 2 923 m | 3 357 m | fail → fail |
| 15.2 | **star tracker on (the worked answer)** | 1 000 m | 989 m | **1 184 m** | **pass → fail** |
| 15.2 | navigation grade, no star tracker | 1 000 m | 382 m | 360 m | pass → pass |
| 15.2 | MEMS with the star tracker | 1 000 m | 11 000 m | 13 018 m | fail → fail |
| 15.2 | GNSS on | 1 000 m | 3.2 m | 3.1 m | fail (GNSS on) → same |

The one flip is the known one, 15.2 with the star tracker. Its margin was 1.1 % on the base.
Neither the bound, nor the lesson, nor tests/heavy/lesson-packs-sixdof.test.ts is changed: that
is question 1. If the owner answers (ก): the bound is 1 500 m, and 15.2 with the star tracker
passes (1 184 m); every other verdict in the table stays as it is.

**The sensor seed.** The lessons do not lock the navigation settings, so a student can change the
sensor seed. Flown closed loop with seeds 1–10 (`lessons.probe.ts`, `NAV_SEEDS`), 15.2 gives:

| 15.2, seeds 1–10 and the lesson's own | Branch | Base |
|---|---|---|
| star tracker: errors, sorted | 708, 836, 1 184 (own), 1 212, 1 272, 1 281, 1 373, 1 473, 1 627, 2 142, 2 496 m | 748, 792, 989 (own), 1 043, 1 062, 1 117, 1 182, 1 358, 1 406, 1 703, 1 927 m |
| star tracker: RMS; the filter's 3-D σ | 1 503 m; 1 403–1 410 m | 1 260 m; 1 159–1 166 m |
| star tracker: inside 1 000 m / 1 500 m / 2 000 m | 2 / 8 / 9 of 11 | 3 / 9 / 11 of 11 |
| as set: errors, sorted | 1 526, 2 077, 2 561, 2 894, 3 357 (own), 3 697, 3 819, 4 263, 4 841, 4 895, 7 584 m | — |
| as set: RMS; σ | 4 092 m; 3 923–3 932 m | — |

So the 1 000 m bound was already a near thing on the base: the star tracker held it for the
lesson's own seed and for 3 seeds of 11.

**When the error is made** (`s2-profile.probe.ts`, the lesson's own seed). The lesson grades the
peak of the error over the flight. The star tracker sees stars from 150 km, which the Soyuz
passes at T+269.5 s; until then the two flights are one flight.

| T+ (height) | As set: base → branch | Star tracker: base → branch, now (peak so far) |
|---|---|---|
| 200 s (113 km) | 592 → 625 m | the same |
| 269 s (150 km; first star fix at 269.5 s) | 989 → 1 053 m | the same |
| 272 s (151 km) | 1 007 → 1 074 m | 463 → 611 m (989 → 1 053 m) |
| 350 s (177 km) | 1 536 → 1 675 m | 204 → 688 m (989 → 1 053 m) |
| 450 s (196 km) | 2 297 → 2 584 m | 554 → 895 m (989 → 1 053 m) |
| 524 s, the cut-off (200 km) | 2 923 → 3 357 m | 669 → 1 184 m (989 → 1 184 m) |

The base's star-tracker flight passed on the error made before the star tracker could see,
989 m at 150 km, and was down to 669 m at the cut-off. On the branch the error at 150 km is
already 1 053 m, and after the fix the accelerometers' turn-on bias carries it back up to 1 184 m
by the cut-off. A star tracker that sees from lower down does not hold 1 000 m reliably either:
from 100 km the flight ends at 1 228 m, from 120 km at 966 m (`lessons.probe.ts`, `STAR_ALT`).

## Heavy suites, on the branch, one at a time (b)

| File | Result | Time |
|---|---|---|
| tests/heavy/lesson-packs-sixdof.test.ts | 2 passed, 1 failed: S2, `expected 'fail' to be 'pass'`, the star tracker's flight 1 184.33 m (as in the earlier agent's notes) | 206 s |
| the same, if the owner answers (ก) (the bound 1 500 m; branch `ws/imu-q1a`) | 3 passed | 313.3 s |
| tests/heavy/lessons-sixdof.test.ts | 7 passed (2.3's tactical answer among them) | 457 s |
| tests/heavy/navigation-burns.test.ts | 2 passed (tactical and MEMS reach the target orbit; gas to T+480 s 4.8 and 2.2 kg, to the end 18.4 and 12.8 kg) | 127 s |
| tests/heavy/monte-carlo-falcon9-navigation.test.ts | 1 passed: 20/20 in orbit, 19 on target (run 13 in the wrong plane, the known issue 4), none lost; on target pe 499.65 ± 1.12, ap 501.37 ± 0.82 km, i 28.6154 ± 0.0012° | 1 297 s |

## PHYSICS.md §2h finished (c)

Every figure of the hand-over's WIP text was flown again (`falcon9.probe.ts`, `coast.probe.ts`,
`testfigures.probe.ts`, `burns.probe.ts`) or removed. The Falcon 9 flights are the test's
(cape, LEO, crosswind, seed 20260919). The ranges are of 100 more sensor draws flown again through
each flight's recorded truth: the navigation only, open loop. (First 30 draws, with the median
taken as the upper of the two middle samples; after the review, 100 draws with interpolated
medians and the medians' bootstrap standard errors, `fix-falcon9.probe.ts`. The rows below are
the 100 draws'.) A draw's errors are what its
sensors make of that trajectory, not of the one it would itself have steered. The flight's own
draw, replayed so, reproduces its figures exactly (8 059 m and 29.32 m/s, both ways). The WIP
text's 8.6 km for MEMS was the first sample after SECO, a coast step later; at SECO it is 8.1 km.

| Figure (Falcon 9 to LEO) | Base 7f991f9 | Branch | WIP text said |
|---|---|---|---|
| Tactical + GNSS, this flight: mean (error/σ)², outside 3σ | 2.17, 0.50 % | 1.23, 0 % | 1.2, 0 % |
| same, 100 draws: mean, outside 3σ | 0.97, 0.19 % | 1.03, 0.39 % | 1.0, 0.1 % |
| same: largest error; believed − true apoapsis, periapsis | 3.2 m, 0.078 m/s; −169, −6 m | 3.1 m, 0.059 m/s; −269, −5 m | 5 m, 0.1 m/s; 270, 5 m |
| Outage T+60–200 s, at T+195 s: this flight | 112 m, 1.77 m/s | 42 m, 0.42 m/s | 42 m, 0.4 m/s |
| same, 100 draws: 10–90 %; RMS; filter σ | 44–189 m; 126 m, 2.08 m/s; 123 m, 1.99 m/s | 38–213 m; 127 m, 2.11 m/s; 129 m, 2.08 m/s | 43–202 m; 124 m, 2.1 m/s; 129 m, 2.1 m/s |
| MEMS, no GNSS, at SECO: this flight | 11.1 km, 30.8 m/s | 8.1 km, 29.3 m/s | 8.6 km, 30 m/s |
| same: orbit believed / true | 200 × 552 / 204 × 511 km | 197 × 490 / 199 × 525 km | 197 × 490 / 199 × 525 km |
| same: attitude before the first star fix → at the end | 1.70° → 17″ | 1.41° (T+248 s) → 28″ | 1.4° → seconds |
| same, 100 draws: median ± its SE (10–90 %) | 7.36 ± 0.57 km (3.4–12.2), 24.6 m/s | 9.32 ± 0.76 km (4.7–14.3), 36.0 m/s | 8.3 km (5.4–15), 37 m/s |
| Tactical, no GNSS, at SECO: this flight; apoapsis off | 985 m, 2.86 m/s; +5.8 km | 1 022 m, 3.44 m/s; −2.6 km | 1.0 km, 3.5 m/s; 2.6 km |
| same, 100 draws: median ± its SE (10–90 %) | 825 ± 64 m (450–1 531), 2.88 m/s | 976 ± 61 m (496–1 666), 3.85 m/s | 1.0 km (0.56–1.6), 3.8 m/s |
| Navigation grade, no GNSS, at SECO: this flight; apoapsis off | 40 m, 0.19 m/s; 0.42 km | 67 m, 0.29 m/s; 0.06 km | 70 m, 0.3 m/s; < 0.1 km |
| same, 100 draws: median ± its SE (10–90 %) | 76 ± 5 m (30–169), 0.30 m/s | 84 ± 4 m (36–179), 0.35 m/s | 80 m (40–160), 0.34 m/s |

The change in the medians, branch over base, with one standard error from the two bootstrap
errors (unpaired): position +27 ± 14 % (MEMS), +18 ± 12 % (tactical), +11 ± 9 % (navigation
grade); velocity +46 ± 13 %, +34 ± 12 %, about +17 ± 10 %. The 30 draws had given 17–31 % and
25–41 %, which PHYSICS quoted until the review; the claims reviewer's own 100 draws gave the same
as these.

In orbit at 400 km (`coast.probe.ts`, `testfigures.probe.ts`; after the review `fix-coast.probe.ts`
and `fix-mutation.probe.ts`): the MEMS gyro bias RMS an hour after turn-on 4.9 → 31.5 °/h; GNSS
alone in free fall leaves a tactical gyro's turn-on σ at 0.999 °/h of 1 °/h after 2 000 s; the
turn-on estimates with GNSS and the star tracker after 2 000 s, over seeds 1–120, 0.169 °/h and
24.8 µg RMS against the filter's σ of 0.161 °/h and 24.5 µg ((error/σ)² 1.10, 1.02; the test's
seeds 1–20, the lowest of six blocks, 0.146 °/h, 20.4 µg, 0.82, 0.69); a MEMS unit with GNSS and
no star tracker coasting 1 000 / 3 000 s: attitude error median (interpolated) 3.9° / 4.8° →
12.1° / 52.2°, mean (error/σ)² per axis 0.93–1.23 / 1.28–1.64 → 1.17–2.15 / 20.3–31.9; with the
accelerometers' bias and noise set to zero the branch's coast drifts 11.7° / 37.9° (the gyros'
30 °/h turn-on part alone: 30 × 3 000/3 600 × √3 = 43.3° RMS expected in three axes at 3 000 s, 41.0° flown) and is consistent (0.75–1.04 /
0.78–0.99), which is what the text says of its cause. The WIP text's
"8° in 1 000 s and 25° in 3 000 s" are 30 °/h times the time on one axis, not the errors flown;
replaced by these.

The jets' table (§2h) was flown again as tests/heavy/navigation-burns.test.ts flies it
(`burns.probe.ts`; the loop is recorded only for the duty column, and recording it changes
nothing: the gas and the orbits come out the same both ways). The table was out of date on the
base already (its truth row, which this change cannot touch, measures 18.8 kg to the end against
the table's 17.3 kg), so it is now the branch's throughout, and the test's comment with it:

| Grade | Full duty, first minute (base → branch) | Gas to T+480 s | … to the end | Orbit |
|---|---|---|---|---|
| truth | 54 → 54 % | 7.0 → 7.0 kg | 18.8 → 18.8 kg | 500.7 × 509.6 km, both |
| navigation | 31 → 33 % | 6.8 → 6.9 kg | 19.0 → 19.3 kg | 500.0 × 509.7 → 500.4 × 509.7 km |
| tactical | 9 → 10 % | 4.8 → 4.8 kg | 18.1 → 18.4 kg | 500.6 × 509.8 → 500.7 × 509.9 km |
| MEMS | 5 → 4 % | 2.3 → 2.2 kg | 13.0 → 12.8 kg | 500.6 × 509.6 → 500.6 × 509.4 km |

The full-duty column is read as the share of the loop's samples in the first minute of flight
(120) with a jet at duty ≥ 0.999. The table's earlier figures (60, 44, 12, 6 %) have no recorded
definition; this one ranks the grades the same way. All inclinations 28.613°.

Also corrected: §2l's Monte Carlo row for the tactical navigation, from this branch's heavy run.

## The lesson debriefs (commit 2, `008b323`) checked (d)

| Lesson | Quoted in en / ru / th | Flown on the branch |
|---|---|---|
| 2.3, MEMS at MECO | about 2 km / около 2 км / ประมาณ 2 กม. | 2 021 m |
| 2.3, tactical | 0.4 km / 0,4 км / 0.4 กม. | 356 m |
| 2.3, navigation grade | a few tens of metres / несколько десятков метров / ไม่กี่สิบเมตร | 37 m |
| 2.3, with GNSS | to metres / в пределах метров / ในระดับเมตร | 3.1–3.2 m |
| 2.3, hint: 0.001 g for 150 s | ½·0.0098·150² ≈ 110 m | 110 m (arithmetic) |
| 15.2, as set | about 3.4 km / около 3,4 км / ประมาณ 3.4 กม. | 3 357 m |
| 15.2, star tracker | about 1.2 km / около 1,2 км / ประมาณ 1.2 กม. | 1 184 m |
| 15.2, navigation grade | about 0.4 km / около 0,4 км / ประมาณ 0.4 กม. | 360 m |
| 15.2, GNSS | a few metres / нескольких метров / ไม่กี่เมตร | 3.1 m |

All agree in the three languages. The pack file was regenerated with
`node --experimental-strip-types scripts/lesson-packs.ts` ("ru-24-05-06: unchanged") and
`--check` says "up to date"; tests/lesson-packs.test.ts, which compares it, passes. 15.2's debrief
says the star tracker gives about 1.2 km while its brief asks for 1 000 m: whichever way
question 1 is answered, that debrief sentence follows the answer. If the owner answers (ก): the
brief asks for 1 500 m, and the debrief stands as written.

## Performance (e)

`timing.bench-probe.ts` loads the base and the branch in one process and interleaves them,
alternating which goes first. One navigation step at 100 Hz (tactical, GNSS and star tracker at
1 Hz, a precomputed orbit, 20 000 steps), medians:

| Run | Base, 21 states, dense Φ P Φᵀ | Branch, 27 states, sparse | |
|---|---|---|---|
| 8 rounds | 25.6 µs | 16.0 µs | −37 % |
| 10 rounds | 24.1 µs | 15.7 µs | −35 % |
| Falcon 9, tactical + GNSS, to T+120 s, whole flight (3 and 4 rounds) | 8.99 s, 8.56 s | 8.40 s, 8.15 s | −5 to −7 % |

Commit 1's "20 against 31 and 25 against 42 µs" is confirmed in direction and size (−35 to
−40 %). On a whole navigated flight the navigation is a part of the cost, so the heavy suites
that fly with navigation run a few per cent faster, not slower.

## Tests run

- `npx tsc --noEmit`: clean, on the final tree (and again after the review follow-up).
- `npx vitest run tests/navigation.test.ts --maxWorkers=2`: 14 passed (122 s); the new
  turn-on test took 5.9 s, the coast 6.4 s, the estimates 2.1 s. After the review follow-up
  (`ce0fd07`): 15 passed (98.7 s; the new one-step test 13 ms).
- The same file under each of three mutations (`vitest.fixmut.config.ts`, `-t` the four in-orbit
  bias tests): none, 4 passed; M1, 1 failed (the new test); M2, 3 failed; M3, 2 failed.
- `npx vitest run tests/control-faults.test.ts tests/mcp.test.ts tests/monte-carlo.test.ts
  tests/mission-file.test.ts tests/session.test.ts tests/lessons-round2.test.ts
  tests/report.test.ts tests/explore.test.ts tests/lesson-packs.test.ts tests/i18n.test.ts
  tests/i18n-counts.test.ts tests/i18n-thai-terms.test.ts tests/profiles-i18n.test.ts
  tests/recheck.test.ts tests/d06-satellite-verdict.test.ts --maxWorkers=2`: 15 files, 306 passed
  (170 s).
- Heavy, one at a time, `--maxWorkers=1`: the four files above, 12 passed, 1 failed (S2).
- `scripts/lesson-packs.ts` (write and `--check`): unchanged, up to date.
- If the owner answers (ก), with its change (branch `ws/imu-q1a`): `scripts/lesson-packs.ts`
  wrote ru-24-05-06 and `--check` says up to date; heavy lesson-packs-sixdof, `--maxWorkers=1`:
  3 passed (313.3 s); `npx vitest run` on the 14 default files that read the packs or
  the lessons' texts (tests/lesson-packs, lesson-pack-format, lesson-packs-design,
  lesson-pack-names, lesson-event-answers, lesson-grading-end, lesson-review, classroom-pwa,
  phase4-walk, project-archive, i18n, i18n-counts, i18n-thai-terms, profiles-i18n),
  `--maxWorkers=2`: 14 files, 169 passed (25.4 s); `vitest list --no-staticParse` of the heavy file: its 3 names
  equal the reviewed inventory's; `node --test tests/verification/*.test.mjs`: 91 passed;
  `npx tsc --noEmit`: clean.
- `npm run build && npm run budget`: ok (below); run again on the final tree after the review
  follow-up, every group the same to 0.1 kB.
- Probes, under /tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/probes/imu/ (outside the repository, not committed): `covariance.probe.ts`,
  `truth.probe.ts`, `testfigures.probe.ts`, `lessons.probe.ts`, `s2-profile.probe.ts`,
  `falcon9.probe.ts`, `coast.probe.ts`, `burns.probe.ts`, `timing.bench-probe.ts`,
  `debug-replay.probe.ts` (the replay's own check); configs `vitest.base.config.ts`,
  `vitest.branch.config.ts`, `vitest.both.config.ts`; logs in `logs/`. After the review:
  `fix-falcon9.probe.ts` (`DRAWS=100`, both trees, 562 s and 760 s), `fix-coast.probe.ts`,
  `fix-mutation.probe.ts`, `fix-mut/setup.ts` with `vitest.fixmut.config.ts`, `fix-scale.probe.ts`,
  `lessons.probe.ts` again with `STAR_ALT=100,120` (1 228.1 m and 966.3 m, as before); configs
  `vitest.fixbase.config.ts`, `vitest.fixbranch.config.ts`; logs `logs/fix-*.txt`.

## Docs touched

- docs/PHYSICS.md §2h (the IMU, the filter, in orbit, Falcon 9, the limit, the jets table) and
  §2l (the navigation Monte Carlo row).
- docs/VALIDATION.md, "The lesson packs (T03)": 15.2's figures since the change.
- README: N/A (no navigation figures). IMPLEMENTATION-STATUS: N/A (G02's row says "done", no
  figures). USER-GUIDE: N/A (§13's "sensor biases true and estimated" is still what the inspector
  shows). The 21-state text in the inspector's note and the MCP description was changed by
  commit 1; grep of docs/ and README for turn-on, Gauss, 21 errors, 21-state, in-run and bias
  instability finds nothing else outside docs/history and the audit evidence.

## D-25

Commits 1 and 2: 190 changed lines under src/ (124 added, 66 removed: navigation.ts 152,
sensors.ts 18, the lessons 12, i18n and mcp.ts 8), 74 in tests/navigation.test.ts, 6 in the pack
file. This session adds documentation, a test comment and this report; the review follow-up
adds 34 lines and removes 5 in tests/navigation.test.ts, and nothing under src/. Under 400.

## Budget

Unchanged; no ceiling raised. `npm run build && npm run budget` on the branch, against the same
on a copy of the base (`git archive 7f991f9`):

| Group | Base | Branch | Ceiling |
|---|---|---|---|
| index-*.js | 2 643.2 kB | 2 644.2 kB | 2 645.0 kB |
| flight.worker-*.js | 578.9 kB | 579.8 kB | 589.0 kB |
| i18n-*.js | 1 727.3 kB | 1 727.7 kB | 1 729.0 kB |
| precache code | 14 710.8 kB | 14 717.4 kB | 14 724.0 kB |

The index chunk is left 0.8 kB under its ceiling: the sky workstream, which the hand-over says
was at the ceiling already, should count on this.

## Questions for the owner

**1. Lesson 15.2's bound (`ru-bins-astro`, 1 000 m to the third stage's cut-off).** With the
turn-on bias held, the star tracker, the lesson's worked answer, gives 1 184 m and fails; on the
base it passed by 11 m (989 m). The physics is above: the peak is made before the star tracker
can see (1 053 m at 150 km, T+269.5 s), and after that a star tracker sees the attitude, not the
accelerometers' bias, of which a tactical unit's 500 µg alone gives about 0.67 km per axis by the
cut-off. Nothing was changed; tests/heavy/lesson-packs-sixdof.test.ts S2 fails until this is
answered. How urgent it is: the ru-24-05-06 pack is held back from the site (`TEACHER_TOOLS`,
your decision of 2026-10-17), so no student meets the lesson from the catalogue today; the
answer matters for the heavy suite now and for students when the packs are shown again.

- **(ก) Keep the lesson as designed; the bound by the rule it was set with, the worked flight plus
  25 %, rounded up: 1 184 m × 1.25 = 1 480 → 1 500 m.** Effect: with the lesson's own seed the star
  tracker (1 184 m) and the navigation-grade unit (360 m) pass; as set (3 357 m) and MEMS with the
  star tracker (13 018 m) fail. Over seeds 1–10 and the lesson's own, the star tracker passes 8 of
  11 and as set fails 11 of 11 (closest 1 526 m). Changes: `NAV_BOUND_M` in the pack source, the
  brief's "1 000 m" in en, ru and th, the pack file regenerated, S2's title and its
  `toBeGreaterThan(1000)` (an existing assertion's number: 1 500), the test's header comment,
  VALIDATION's note. The debrief's "about 1.2 km with it" then fits.
- **(ข) Keep 1 000 m; the answer becomes the navigation-grade unit, and the lesson teaches that a
  star tracker alone is not enough.** Effect: the brief ("switch the star-tracker correction on, or
  choose the inertial unit's grade"), the first and third hints and the debrief are rewritten in
  three languages (the second, "the star tracker corrects the attitude, not the position",
  stays); S2's assertion that the star tracker passes becomes one that it fails (an existing
  assertion's meaning changes); the title "with star-tracker correction" fits less well.

Not offered: grading earlier or a star tracker that sees from lower down. Neither holds 1 000 m
reliably: the peak is made before 150 km (above), and a lower star tracker passes for the
lesson's seed from 120 km (966 m) but fails from 100 km (1 228 m).

Proposal: **(ก)**. It keeps what the lesson teaches (astro-correction bounds the frame's tilt) and
the rule the bound was made by, and the debrief already says what is left (½bt²). It only needs
your yes to the changed number in S2.

**If the owner answers (ก):** the change is prepared before the answer, one commit on ccd2d30
(branch `ws/imu-q1a`). `NAV_BOUND_M` is 1 500, its comment giving the rule and both settings
(773 m → 966 m → 1 000 m; 1 184 m → 1 480 m → 1 500 m). The brief's "1 000 m" is "1 500 m" in en,
ru and th ("Keep the navigation's position error within 1 500 m up to the third stage's cut-off,
…"; «Удержите ошибку навигации по положению в пределах 1 500 м до выключения двигателя третьей
ступени, …»; «จงรักษาความคลาดเคลื่อนตำแหน่งของระบบนำร่องให้อยู่ภายใน 1 500 ม. จนถึงการดับเครื่องของขั้นที่ 3
…»), and the pack file is regenerated with `scripts/lesson-packs.ts`. S2's title says "as set
the error passes 1 500 m" and its assertion `toBeGreaterThan(1500)`; the test's header comment
gives both settings; S2's name in `scripts/audit-heavy/heavy-expected.json`, the reviewed heavy
inventory that the heavy workflow's plan compares with the collected names, is changed with that
file's checksum; and VALIDATION's T03 note gives the new bound and its rule. The pack's
`contentSha256` in src/lessons/review.ts, which tests/lesson-review.test.ts compares with the
pack file's bytes, is the regenerated file's (ccd2d30 set it to the file as 008b323 left it);
every review stays pending. The debrief, the hints and the title stay. Heavy S2 then
passes: 3 passed (313.3 s).

**2. A MEMS unit with GNSS and the star tracker switched off, over a long coast.** The attitude
then drifts by tens of degrees (52° median after 3 000 s at 400 km; 38° of that is the gyros' own
30 °/h, measured with the accelerometers' errors set to zero), past the filter's small-angle
error model, and the filter's attitude σ becomes 4–6 times too small ((error/σ)² 20–32 per axis),
because the accelerometers' bias and noise, read as specific force, pass for attitude
information. On the base the drift was smaller (4.8°) because the bias faded. It touches no lesson
or test, and the star tracker is on by default.

- **(ก) Leave it, documented (PHYSICS §2h "A limit", done here).**
- **(ข) A filter change in a later package (R4.3 holds the nearest items, GNSS blackout and
  star-tracker exclusion):** for example, not taking −[f×]φ from a specific force below its own
  noise in free fall, and a larger-angle attitude error; with its own consistency test. The same
  kind of fault, older than this change, shows in the gyro scale factors: at rest, F's −Ĉ·diag(ω̂)
  column is built from a measured rate that is gyro noise alone. MEMS with GNSS and the star
  tracker at rest at 400 km, 2 000 s, seeds 1001–1100: the gyro scale factors' NEES is 8.55 of 3
  on the branch and 8.49 on the base, and 2.96 on both with the gyro noise set to zero
  (`fix-scale.probe.ts`). Building those columns from a rate and a specific force the filter
  trusts (or zeroing them below the noise) would fix both.
- **(ค) A note in the setup panel when MEMS, GNSS on and the star tracker off are chosen
  together.** A UI wording change in three languages.

Proposal: **(ก)** now, with (ข) noted for R4.3.

## Not done here

- The answer to question 1. If the owner answers (ก): its change is the one in question 1's last
  paragraph, in this tree.
- Merging. Heavy S2 is red on this branch until question 1 is answered. Proposal: question 1's
  change lands in this PR before it merges, so main's heavy suite stays green (SESSION-PROTOCOL
  §5, no new PR in a lane whose main is red); the merge itself is yours (§1). If the owner
  answers (ก): with its change heavy S2 passes.
- The full default suite: the orchestrator runs it.
- The navigation Monte Carlo heavy set was not re-run on the base (21 min); §2l's row is the
  branch's, the earlier row (499.76 ± 0.91, 501.39 ± 0.60 km) was the record of an earlier run.
