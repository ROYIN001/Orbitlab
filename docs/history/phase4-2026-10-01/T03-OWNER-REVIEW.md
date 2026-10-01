# T03 lesson packs: what the owner must confirm

The roadmap validates T03 by the owner's review. Until that review is done, all five packs ship with `reviewed: false`. On the lessons page each pack says plainly: "Draft awaiting review by Orbitlab's owner: its curriculum codes and wording have not yet been checked against the curriculum."

**How to mark a pack reviewed:** set `reviewed: true` in its source, `src/lessons/pack-sources/<id>.ts`. Then run `node --experimental-strip-types scripts/lesson-packs.ts` and commit the regenerated `public/lessons/packs/<id>.orbitlab-lesson.json`. `tests/lesson-packs.test.ts` currently asserts `reviewed === false` for every pack, so that line changes with the review.

Source documents are those of the T03 research ([T03-CURRICULA-RESEARCH.md](T03-CURRICULA-RESEARCH.md)). Each pack's "About this pack and its sources" text cites them with page numbers.

---

## For every pack

1. **Code format.** The research's proposed format (§1.5) is used, and each chip's kind is shown when you hover over it. Confirm or give the format you want:
   - `ว 2.2 ม.5/6` (IPST indicator)
   - `ดศ ม.6 ผล 11` (Earth, astronomy and space outcome)
   - `ฟส ม.4 ผล 17` (physics outcome)
   - `NKRAFA วอ 478` and `NKRAFA PLO7`
   - `ФГОС 24.05.06 ОПК-8`
2. **Texts.** Every text is in en, ru and th. A native reviewer should read:
   - the Thai of the three IPST packs, written as a Thai science teacher would;
   - the Russian of the 24.05.06 pack, written in a technical writer's register with ГОСТ 20058-80 symbols (ϑ, ω_z, ω_ср, ΔΦ, ΔL, БИНС, ДУС).
3. **Numbering.**
   - A pack's own lessons are numbered by pack: 11.x IPST basic, 12.x Earth and space, 13.x physics, 14.x RTAF, 15.x 24.05.06.
   - A built-in lesson a pack reuses keeps its own number (for example 1.4 or 6.1) and carries the tag "Also under <track>".
   - Is that acceptable, or should packs use their own labels (B1, A1, …)?
4. **What packs do not count toward.** The packs' own lessons are left out of the top bar's progress count and out of the placement test's recommended path, which still cover the app's lessons and a teacher's own. Confirm.

---

## Pack `ipst-basic`: IPST basic science, M.5–M.6

- **Curriculum revision.** Confirm the target year still teaches the 2017 revision (พ.ศ. 2560) of the Basic Education Core Curriculum, and not a newer curriculum.
- **Codes to confirm:**

  | Lesson | Codes |
  |---|---|
  | 11.1 Forces on a rocket (new) | ว 2.2 ม.5/1, ม.5/3, ม.5/4 |
  | 11.2 Falling around the Earth (new) | ว 2.2 ม.5/5, ม.5/6 |
  | 1.4 Payload and Δv (reused) | ว 2.2 ม.5/3, ม.5/5 |
  | 6.1 THEOS-2 over Bangkok (reused) | ว 3.1 ม.6/10 |

- **Lesson 11.1.**
  - The chart it reads is the app's "Acceleration (g)", which is thrust plus air force over mass: what an accelerometer on board reads, not the net acceleration with gravity.
  - The text says so. Confirm the wording suits ม.5's "a = F_net/m" (indicator 3).
- **Lesson 11.2** flies at a fixed launch window, so students only fly and calculate.
- **Russian for the IPST packs.** Is it needed at all? The app's tests require all three languages, so it is written.
- **Deferred:**
  - B5 (solar storms) needs a new case item on the CZ-5B sheet.
  - B6 (Thaicom link) needs the design-lesson kind.

## Pack `ipst-earth-space`: Earth, Astronomy and Space, M.6

- **Codes to confirm:**

  | Lesson | Codes |
  |---|---|
  | 12.1 Kepler's third law on a transfer orbit (new) | ดศ ม.6 ผล 11 |
  | 12.2 An orbit that keeps the Sun's time (new) | ผล 15, 16 |
  | 6.1 (reused) | ผล 15, 16, 18 |
  | 5.3 Sputnik-1 (reused) | ผล 11, 18 |

- **Lesson 12.2 (outcomes 15 and 16).**
  - The app sets a sun-synchronous orbit's 10:30 crossing by the true Sun, which is apparent solar time. The text says so, and its debrief explains mean time, the equation of time (about 5 min in mid-September) and time zones (Kourou, Bangkok).
  - Confirm this is the treatment the outcomes want.
- **Lesson 12.1** grades the semi-major axis to 25 km.
  - A student who uses the planned 250 × 35 786 km orbit instead of the reached one is 34 km off and fails. The app grades the orbit at insertion, however late the page grades the flight, so this holds at any time warp. (Until 2026-10-01 the app read the orbit at the frame it graded on, and under time warp the planned answer passed when graded 145–710 s late. That is fixed, and a test now checks that the planned answer fails at every 5 s up to 900 s after insertion.)
  - The brief therefore says to use the heights the flight reached, read from the event log's "Target orbit achieved" line.
  - Why that line: the heights on screen keep changing after insertion, because of the Earth's bulge (J₂). A GTO's semi-major axis swings ±27 km around its orbit, so heights read later could fail for that reason alone.
  - Confirm this, or ask for a looser tolerance.
- **Deferred:** A5 (the station seen from Bangkok) needs a new case sheet.

## Pack `ipst-physics`: additional physics, M.4

- **Codes to confirm:**

  | Lesson | Codes |
  |---|---|
  | 13.1 Why a geostationary satellite stands still (new) | ฟส ม.4 ผล 17 |
  | 13.2 Centripetal force is gravity (new) | ผล 6, 17 |
  | 1.4 (reused) | ผล 14, 15 |
  | 3.1 One engine out (reused) | ผล 14 |

  Note that the research's P3 names both 1.4 and 3.1 for outcomes 14–15.
- **Lesson 13.1, the payload.**
  - It is a 1 t satellite, far lighter than Proton-M/Briz-M's real ~3.2 t to GEO.
  - It was chosen because the simulator's GEO insertion ends closest to the geostationary height with it: 35 709 km, against 35 649–35 660 km with 1.5–2.5 t.
  - Confirm, or accept a heavier one with a looser period tolerance.
- **Lesson 13.1, the period tolerance.**
  - It is ±5 min, set after the flight was seen. The research proposed 2 min.
  - With ±5 min, the textbook sidereal-day answer (1 436 min) and the answer computed from the reached height (1 432 min) both pass, and the 24-hour answer (1 440 min) fails.
  - With 2 min, the textbook answer would fail. Confirm.
- **Lesson 13.1's flight is long.** It takes about 22 h of mission time, so students have to use time warp.
- **Deferred:**
  - P4 (six-DOF thrust off the centre of mass) was not in this stage's task.
  - P5 and P6 need the design kind.

## Pack `rtaf-academy`: Royal Thai Air Force Academy cadets

- **Naming.**
  - May the pack name the academy (โรงเรียนนายเรืออากาศนวมินทกษัตริยาธิราช / NKRAFA) and quote its public programme documents (nkrafa.rtaf.mi.th/curriculum, Google Drive links; Council of Engineers self-declaration)?
  - May lesson 14.1 name NAPA-1 (Vega VV16, 3 Sep 2020)?
  - The pack title is "Royal Thai Air Force Academy: space flight dynamics and control".
- **Course specifications not public.** The weekly specifications (มคอ.3) were not found. The match is to the course descriptions and PLOs only. The owner should provide, or confirm the descriptions suffice:
  - วอ 478, 526, 528, 529, 462;
  - EE 316;
  - วก 433.
- **Cohort.** Which programme and year is the pack for? It is written for AE 2025, years 4–5. Would cadets use it in the year-5 space-dimension elective?
- **Codes to confirm:**

  | Lesson | Codes |
  |---|---|
  | 14.1 NAPA-1's ride (new) | NKRAFA วอ 478, วอ 526, PLO7 |
  | 14.2 Elements and speed of a transfer orbit (new) | วอ 478, วอ 528, PLO7 |
  | 4.1 and 4.2 (reused) | วอ 462, EE 316, วก 433, PLO4 |
  | 5.2 Docking (reused) | วอ 478, 528, 529 |

- **Lesson 14.1** says plainly that its 600 km height is the app's preset, not NAPA-1's release height. The release height was not looked up.
- **The tolerances are the research's.** For a while two of them were wider and one answer was dropped; since 2026-10-01 they are as the research and the pack's first version set them.
  - **Why they had been widened:** a live page grades a flight at the first frame that shows its end. The app then read the orbit at that frame. Under time warp that frame can come minutes late, and J₂ moves the osculating elements meanwhile. The app now reads the orbit at insertion, however late the page grades (tests/lesson-grading-end.test.ts).
  - **Lesson 14.1's period:** ±0.2 min, the research's (it was ±0.4 for a while).
  - **Lesson 14.2's semi-major axis:** ±10 km, the research's (it was ±20 for a while). The planned orbit's a is 34 km off at insertion, where it is graded, so it fails however late the page grades it.
  - **Lesson 14.2 grades the perigee speed again** (vis-viva, ±0.02 km/s). This answer is not in the research's R2; the pack added it. It was dropped for a while, because a frame 60 s late already read 0.022 km/s slower. Read at insertion, the vis-viva answer from the event log's heights is within 0.004 km/s of the speed graded.
  - Like 12.1, lesson 14.2 reads its heights from the event log's insertion line, and its debrief explains the J₂ swing.
  - `tests/lesson-packs.test.ts` grades every worked answer late (up to 1 000 s on the GTO; anywhere on the next revolution for the circles) and passes, and the planned orbit fails at every 5 s up to 900 s.
  - Confirm these tolerances.
- **Not included:**
  - R4 (state feedback, ζ ≈ 0.7): its 5 % overshoot bound needs calibrating in a heavy run.
  - R6 (6U ADCS): needs the design kind. Before R6 is written, please provide the Tongsawang and Yuthayanon (2024) ADCS paper.
- **Military content.** Public, cited sources only. No lesson presents a non-public syllabus.

## Pack `ru-24-05-06`: speciality 24.05.06

- **Whose programme is the model.** The Mozhaisky Military Space Academy's own 24.05.06 programme (ОПОП, учебный план, РПД) was not found, and its professional competences are set by the Ministry of Defence (the standard's §3.4).
  - The pack follows the federal standard ФГОС ВО 3++ (Order 874, 04.08.2020, as amended 27.02.2023): ОПК-1, ОПК-7, ОПК-8.
  - It also follows the civilian discipline lists: MAI С-12 and Bauman Mytishchi К1.
  - If you hold an unclassified syllabus you may lawfully share, provide it.
- **Scope.** The two ballistic cases (6.2 CZ-5B and 6.3 Iridium) are tagged with ОПК-6 of the companion standard 24.05.04 (Order 975). Confirm that 24.05.04 is in scope, or drop those codes.
- **Notation.** ГОСТ 20058-80 is the pack's standard. Confirm, and name who reviews the Russian.
- **Codes to confirm:**

  | Lesson | Codes |
  |---|---|
  | 15.1 Stability margins at max q (new, six-DOF) | ОПК-7, ОПК-8 |
  | 15.2 БИНС with star-tracker correction (new, six-DOF) | ОПК-7 |
  | 15.3 Failed rate gyro (new, six-DOF) | ОПК-7 |
  | 2.4 Monte Carlo (reused) | ОПК-8 |
  | 6.2 and 6.3 (reused) | ОПК-1, 24.05.04 ОПК-6 |

- **Lesson 15.2's bound** is 1 000 m to the third stage's cut-off.
  - It was set after the worked flight: 773 m with the star tracker, plus 25 % = 966 m, rounded up.
  - As set the flight reaches 2 951 m. A navigation-grade unit alone reaches 388 m.
  - The lesson accepts either remedy, the star tracker or a better unit. Confirm.
- **Lesson 15.3 deviates from the research: it flies uncrewed.**
  - The research had a crewed Soyuz, but with a crew the failed flight ends in the escape system's landing.
  - The grader never ends such a flight unless the lesson names `evt.abortCrewSafe` as its end event, so a student who forgot the FDIR would see "flying" forever.
  - It is now 7.15 t of small satellites to a 200 × 420 km ellipse in the station's plane. Confirm. The grader limitation is reported as an open problem.
- **Lesson 15.3's debrief** cites the Proton-M accident of 2 July 2013: yaw rate sensors installed upside down, the finding of Roscosmos's accident commission. It is public history. Confirm it may be named.
- **Deferred:** S6 (disturbance torques and wheel sizing) needs the design kind.

---

## Sources to re-check from a network that reaches them

These are the research's §9 item 10:

- `physics.ipst.ac.th` (teacher manuals M4–M6)
- `vka.mil.ru` and `vuz.mil.ru`
- `academic.obec.go.th`

---

## T03b additions (2026-10-01): the lessons the first pass left out

Six lessons were added to four packs. Every pack is still `reviewed: false`. The numbering continues each pack's own count:

| Pack | Lesson | Research id | Kind | Codes |
|---|---|---|---|---|
| ipst-basic | 11.3 Solar storms bring satellites down sooner | B5 | case (CZ-5B sheet) | ว 3.1 ม.6/9 |
| ipst-basic | 11.4 A TV signal from 36 000 km | B6 | design, Explore | ว 2.3 ม.5/12, ว 3.1 ม.6/10 |
| ipst-physics | 13.3 A coil that turns a satellite | P5 | design, Engineer | ฟส ม.6 หมวด 3 ผล 2, ผล 3 |
| ipst-physics | 13.4 Sunlight into electricity, through the shadow | P6 | design, Explore | ฟส ม.5 หมวด 3 ผล 11, ว 2.3 ม.5/2 |
| rtaf-academy | 14.3 Attitude control for a 6U like NAPA-2 | R6 | design, Engineer | NKRAFA วอ 529, NKRAFA AE 541, NKRAFA PLO7 |
| ru-24-05-06 | 15.4 Возмущающие моменты и выбор маховика КА | S6 | design, Engineer | ФГОС 24.05.06 ОПК-8 |

Not added: **A5** (the station's passes over Bangkok, a new case sheet). A new case is not a small change here: it needs a new case id in the reader and the progress format, a frozen ISS element set and a frozen time window in each case record (as THEOS-2's set is frozen today), the passes tool opened by a case lesson with its observer fixed to Bangkok and its window fixed to the frozen one (today it searches the next three days from the moment on screen, with the live catalogue's set, so its answers would not match a key built from a fixed set), a new sheet with its pass search, and some thirty keys in each language. Still open: R4 (state feedback, needs a heavy calibration run) and P4 (six-DOF moment), which were not in this stage's task.

### For every new lesson

1. **Codes and texts.** As for the first pass: confirm the codes, and have the Thai (IPST packs, RTAF) and the Russian (24.05.06) read by a native reviewer.
2. **The design lessons' day and air.** Each fixes its figures to 2026-10-01 and ECSS's moderate solar activity, in the file. The grade then reproduces on any day and in the instructor's re-check.
3. **Pack files are now version 3** for the four packs with a design lesson (the lesson-file rule: a design lesson needs a Phase 4 reader). A copy of the app older than Phase 4 says the file is newer and leaves the design lessons out, keeping the flights. Confirm.
4. **Whole designs or templates.** B6, P6 and R6 start from a whole design written into the pack file (a template with the lesson's changes), so a later change to a template does not move them. P5 and S6 start from a template unchanged (NAPA-2; the Earth-observation class), so a later change to that template would change them, and the re-check would report old records as having changed locked parts. Confirm, or ask for whole designs there too.
5. **Example figures.** Each lesson labels its invented figures as examples in its brief: B6's 20 W start, P5's coil, P6's 550 W payload, R6's 1 mN·m·s wheel and 50 Mbit/s, S6's series of wheels.

### 11.3 B5, and built-in lesson 6.2

- **The new question is on the CZ-5B sheet itself.** The sheet now prints the same stage's re-entry predicted twice more:
  - with the Sun's flux held at the stage's days' own (F10.7 = 75: GFZ's mean over 29 April–8 May 2021 is 72.6, rounded to 5) and a quiet field, Kp 1 (Ap 4): 9.27 days;
  - through a strong geomagnetic storm, Kp 7 (Ap 132, NOAA G3), same flux, held the whole time: 6.99 days.
  The question asks how many days sooner the storm brings the stage down (2.29 days, ± 0.05). Holding a storm ten days is not realistic, and the sheet calls the figure an upper bound. Confirm the indices, or give the storm you want (a shorter storm in the middle of quiet days is possible but takes a series, not two numbers).
- **Built-in lesson 6.2 changes.** It asks every question of its sheet, so it now asks this one too (nine instead of eight), and its task names it in all three languages. A student who passed 6.2 before keeps the pass. Confirm, or ask for 6.2 to keep its eight.
- **11.3** asks six of the sheet's questions: the tumbling cross-section, the ballistic coefficient, the window's two ends, the storm, and why a window is given.
- **Its debrief** names the February 2022 Starlink loss ("most of a batch of 49" after a minor storm) and China's Tianhe module. Both are public history. Confirm they may be named.
- **The storm against the window.** The storm's 6.99 days falls outside the agencies' ±20 % window (7.45–11.18 days around the measured Sun's 9.32). The debrief says so.

### 11.4 B6

- It names **Thaicom 4** and its slot at 119.5° E. The satellite in the lesson is the app's communications template placed there, not Thaicom 4's design. Confirm the name may be used.
- **The link:** a 45 cm dish on the satellite (a beam about 4° wide, enough for Thailand), a 60 cm home dish in Bangkok, 30 Mbit/s, 12 GHz. The station's noise (189.7 K) and the other path losses (2 dB) are the template's, sourced to NASA's NEN station, not a home dish's: estimates for a TV link.
- **The task:** from 20 W (−3.10 dB) to a 3 dB margin; 100 W gives 3.89 dB. The student also types the margin worked out in decibels (± 0.2 dB). The figure is also shown on the criterion's chip after "Check the design", so a student can copy it; the hint teaches the working.
- **A finding outside the lesson:** the communications template's Δv budget is short by 668 m/s (its class's propellant does not cover the apogee kick and 15 years of station keeping), so the designer shows a Δv warning beside this link lesson. That is the D06 template's, not this lesson's.

### 13.3 P5

- It opens on the **Engineer** level's bench, because the attitude inputs (the residual dipole, the centre of pressure) are not on the Explore designer. Confirm the bench suits M.6 students.
- **The coil** (100 turns, 10 × 20 cm, 30 mA, NIA = 0.06 A·m²) is an example, not NAPA-2's own. The 3-to-10-times rule is Starin & Eterno's (NTRS 20110007070, Table 19-11); the lesson takes 3, so the need may be at most 0.02 A·m².
- **NAPA-2 needs 0.0243 A·m²**, so it fails; halving the residual dipole to 0.01 A·m² gives 0.0143 and passes. The residual dipole of 0.02 A·m² is the template's estimate.
- **The field is the model's strongest** (over the pole, 47.5 µT at 520 km), which gives the smallest dipole. Sized at the equator's weaker field, the need would be about twice as large. This is D06's sizing rule.
- **Code format:** group 3's codes carry หมวด 3 ('ฟส ม.6 หมวด 3 ผล 3'), group 1's do not ('ฟส ม.4 ผล 17'), as the research wrote them. Confirm one format.

### 13.4 P6

- **The 550 W payload** (in place of the template's 150 W) is an example. With it, 3.5 m² and 1 200 Wh fall short (−40.7 %, 42.7 % depth). 6.5 m² and 1 800 Wh pass (+10.2 %, 28.4 %).
- **The depth bound is 30 %,** the template's flown figure (EOS Terra and Aqua). The research named `DOD_GUIDANCE` (40 %, nickel–hydrogen's worst case in low orbit), but the design's own allowed depth is 30 %, and the designer warns past it; a 40 % bound would pass designs the designer warns about. Confirm.
- The **basic-science indicator ว 2.3 ม.5/2** is listed on a physics-pack lesson, as the research proposed.

### 14.3 R6

- **AE 541** (Spacecraft System) is a course of the 2020 Aeronautical programme (the research: PDF p. 92 of that document); the pack's other codes are from the 2025 programme. Confirm it may be listed.
- **The task:** a 1 mN·m·s wheel (an example, not a catalogue's) and a 50 Mbit/s downlink through NAPA-2's 1 W radio. The wheel falls short (0.86) and so does the link (2.41 dB). A residual dipole of 0.01 A·m² (1.46) and a 10 cm dish (18.7 dB) pass. The cadet types the wheel over need (± 5 %).
- **Not cited:** the Tongsawang and Yuthayanon (2024) ADCS paper. The research asked to cite it only after the owner has read it. Please provide it if it should be.

### 15.4 S6

- **The spacecraft** is the Earth-observation template (2.2 t, 600 km sun-synchronous), the class's typical figures, estimates.
- **The gravity gradient is sized at 45°**, the model's worst case (5.49 × 10⁻³ N·m, more than 20 times the magnetic torque). For an Earth-pointed spacecraft this is an upper bound, and the debrief says so.
- **The criterion is wheel over need between 1 and 2.** The research had "at least 1"; the upper bound makes the "choice" of the smallest adequate wheel from the example series 4, 8, 16, 32 N·m·s (only 8 passes, at 1.34). The template's own 25 N·m·s (4.17) fails as oversized. Confirm.
- **The typed answers** are the magnetorquer dipole D = M_Σ/B (127 A·m²) and the chosen wheel's ratio. The research asked for answers on the gravity-gradient and magnetic torques themselves; there is no design measure for a single torque, and adding measures would need new names in the scenario writer's dictionary (outside this stage's key prefixes). The brief asks for both torques as steps of the working.
- **Notation:** ГОСТ 20058-80 covers flight dynamics in the atmosphere and has no symbols for a spacecraft's disturbance torques. The lesson uses the textbooks' M_гр, M_м, M_Σ, H and L, and the pack's description says so. Confirm.
