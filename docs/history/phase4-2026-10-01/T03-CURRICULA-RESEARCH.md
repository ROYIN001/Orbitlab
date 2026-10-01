# Phase 4 T03: the five curricula, their sources, and lessons mapped to Orbitlab

> Kept as written on 2026-09-30, before T03 was built: the research behind the lesson packs (roadmap T03), with its sources and the 29 lessons it proposed. What was built from it, and what the owner must confirm, is in [T03-OWNER-REVIEW.md](T03-OWNER-REVIEW.md); the packs themselves are in `src/lessons/pack-sources/`.


Research only, 2026-09-30. Nothing in the repository was edited. Every document cited below was downloaded and read. The downloaded copies were working files of the session and are not kept; every source is cited below by its URL and page. The repo was read at `claude/eloquent-meitner-mvmno4` (`ff0aa6a`), and the Phase 4 cores at the `worktree-wf_8b12748c-208-*` branches.

Pages are given as **PDF page** (the file's own numbering) and, where the document prints its own page numbers, as **book p.**

---

## 0. Summary

| # | Curriculum | Best public source | What it gives Orbitlab | Lessons proposed | Writable today with existing measures |
|---|---|---|---|---|---|
| 1 | IPST basic science, M.4–6 (สสวท., 2017 revision) | IPST, *ตัวชี้วัดและสาระการเรียนรู้แกนกลาง กลุ่มสาระการเรียนรู้วิทยาศาสตร์ (ฉบับปรับปรุง พ.ศ. 2560)*, ipst.ac.th PDF | ว 2.2 M.5 indicators 1–6 (forces, projectile and circular motion, gravity and satellites); ว 3.1 M.6 indicators 9–10 (solar storms and satellites; space exploration); ว 2.3 M.5 indicator 12 (communication by EM waves) | 6 (B1–B6) | 4 (B1–B4); B5 needs a new case item; B6 needs the Phase 4 design kind |
| 2 | IPST additional course, Earth, astronomy and space (M.6) | Same PDF §สาระโลก ดาราศาสตร์ และอวกาศ; IPST teacher's guide e-book 8418 | Outcomes 11 (Kepler and Newton, periods), 12 (solar wind and storms), 13–14 (celestial sphere, horizon and equatorial coordinates, rising and setting), 15–16 (apparent and mean solar time, time zones), 18 (space exploration), 19 (observing the sky) | 5 (A1–A5) | 4 (A1–A4); A5 needs a new case sheet |
| 3 | IPST additional physics | Same PDF §สาระฟิสิกส์; IPST `PhysicsLO_Group_1/3.pdf`; IPST comparison PDF | M.4 outcomes 6 (universal gravitation), 8–9 (moments, couples, centre of mass), 14–15 (impulse, momentum, separation), 16 (projectile), 17 (circular motion applied to satellites, including GEO); M.5 group 3 outcome 11 (renewable energy); M.6 group 3 outcomes 2–3 (magnetic force and the torque on a coil) | 6 (P1–P6) | 3 (P1, P2, P4) after worked-solution tests; P3 reuses built-ins; P5–P6 need the design kind |
| 4 | Royal Thai Air Force Academy (NKRAFA, โรงเรียนนายเรืออากาศนวมินทกษัตริยาธิราช) | The academy's own curriculum page, which links the full programme documents (2020 and 2025 revisions) on Google Drive | BEng Aeronautical Engineering 2025: PLO4 (flight mechanics and automatic control), PLO7 (space engineering; *"calculate the motion of objects in space"*); courses วอ 361/461, 362, 462, 478, 526–529, 575, 583, วฟ 511, 515; EE 2025: EE 316, 521, 585, 587, 589; ME 2020: วก 232, 433 | 6 (R1–R6) | 4 (R1, R2, R3, R5) after tests; R4 needs calibration; R6 needs the design kind |
| 5 | Russia, 24.05.06 «Системы управления летательными аппаратами» | ФГОС ВО 3++, Order 874 of 04.08.2020 (as amended 27.02.2023); public discipline lists of MAI and Bauman (Mytishchi); ФГОС 24.05.04 (Order 975) for ballistics | ОПК-1, 5, 7, 8, 9; 19 specializations; the 25.015 and 25.042 professional standards; disciplines ТАУ, динамика полёта, ориентация и стабилизация, навигация, баллистика | 6 (S1–S6) | 5 (S1–S5) after heavy tests; S6 needs the design kind |

**Not found, plainly:**
- **NKRAFA:** week-by-week syllabi (มคอ.3), textbooks, assessment, the software used, and which space elective each cadet actually takes.
- **The Mozhaisky Military Space Academy (ВКА):** no programme document (ОПОП, учебный план, аннотации РПД), no current list of specializations, and no professional competencies. The Ministry of Defence sites did not respond from here. The federal standard itself says a military programme's professional competencies are set by the ministry (§5.3).

---

## 1. What a pack lesson can measure today

Source: `src/lessons/types.ts`, `measures.ts`, `hooks.ts` and `builtin/track1–6.ts`.

### 1.1 Criterion kinds

A **flight lesson** (`Lesson`) can use these criteria:
- `measure`: a number kept within `{min, max}`, or within `{target, tol}`, where `target` may be `'mission'`.
- `outcome`: `target`, `orbit` or `survived`.
- `event`: an `evt.*` key that must be present, or absent.
- `answer`: the student types a number, which is checked against the measure this flight produced, within `tol` or `tolPct`.
- `hook`: one of six checks written in code.

The six hooks are:
- `crewSafe`
- `stableOrbit {minPerigeeKm}`
- `rangeSafe`
- `gnssOff`
- `dispersedRun {seed}`
- `bendingOn`

A **case lesson** (`CaseLesson`, `kind: 'case'`) is graded on the questions of an existing case sheet:
- `theos2`: `required, j2, height, reach, lst, why`
- `cz5b`: `area, b, early, late, actual, error, broadside, why`
- `iridium`: `miss, speed, angle, radius, sigma, nsigma, why, times`

### 1.2 The 28 measures and their units

| Group | Measures |
|---|---|
| Orbit | `orbit.perigee` km, `orbit.apogee` km, `orbit.perigeeMiss` km, `orbit.inclination` °, `orbit.raanError` °, `orbit.period` min, `orbit.speed` km/s, `orbit.eccentricity`, `orbit.semiMajorAxis` km |
| Ascent | `maxQ` kPa, `maxQTime` s, `maxG` g, `dvLeft` m/s, `payload` kg, `insertionTime` s, `loss.gravity` m/s, `loss.drag` m/s, `loss.steering` m/s |
| Burns | `burnDv` m/s, `burnDv.raise` m/s |
| Abort | `abort.maxG` g, `abort.time` s |
| Navigation and control | `nav.positionError` m (the peak), `loop.pmAtMaxQ` °, `loop.gmAtMaxQ` dB, `loop.wcAtMaxQ` rad/s, `step.overshoot` % |
| Rendezvous | `dock.hours` h |

Notes on three of them:
- `orbit.raanError` is null when the orbit's `raanMode` is `free`. For `ltan` it is set by `raanFromLtan` (`src/physics/mission.ts:431`).
- `orbit.speed` is the speed at grading time, so it is meaningful only for a circular orbit.
- No measure reads the time of an arbitrary event. Only `insertionTime`, `abort.time` and `maxQTime` are times.

### 1.3 What cannot be graded yet

These gaps shape the proposals below.
- **No lesson kind for the Orbit section's own tools.** The playground (Kepler's laws, Newton's cannon), passes, the lifetime tool and O04 applications are not graded. Only the three case sheets are.
- **No design lesson kind.** The Phase 4 map proposes `kind: 'design'` with `sat.*` measures (the Phase 4 plan, §4.1): `sat.eclipseMax`, `sat.powerMargin`, `sat.batteryDod`, `sat.dvMargin`, `sat.linkMargin`, `sat.gsd`, `sat.swath`, `sat.revisitMax`, `sat.lifetime`, `sat.wheelMargin`, `sat.disposal25y` and others. None of them is in the code on any branch; I grepped every `worktree-wf_*` branch. The lessons below that need them are marked **[P4-design]**.

### 1.4 Which missions are safe to use

- **Point-mass missions.** The fleet matrix (`tests/fleet-harness.ts:152–168`) flies each vehicle from its first site to `leo`, `iss` (where the site allows it), `sso` and `gto`, at 25, 50 and 90 % of its rating.
  - It excludes some cases: `BEYOND_CAPABILITY`, `ARCHITECTURE` (for example Soyuz-2.1a with an inert payload does not circularise at 420–500 km, `:459–463`), and `SITE_GEOMETRY` (for example no sun-synchronous orbit from Cape Canaveral or Baikonur).
  - Anything outside the matrix is marked **[verify]**: it needs a worked-solution test (the `tests/lessons.test.ts` pattern) before it ships.
- **Six-DOF missions.**
  - Accepted references: Falcon 9 to `leo` (tracks 2–4); Soyuz-2.1a crew to the ISS orbit (`docs/SIXDOF-ACCEPTANCE.md:349–351`, `:413–420`).
  - A six-DOF lesson needs its solution flown in `tests/heavy/lessons-sixdof.test.ts`. These are marked **[heavy]**.

### 1.5 Pack metadata

This follows `phase4-map.md` §4.3.
- Pack: `pack: {id, title: LocalText, audience, framework}`.
- Each lesson: `curriculum: [{code, kind}]`.
- `kind` is `'indicator' | 'outcome'` in the map. I propose adding:
  - `'course'` for NKRAFA course codes such as `วอ 478`;
  - `'competence'` for Russian `ОПК-8`.
- Proposed code strings (the owner should confirm the format):
  - `ว 2.2 ม.5/6` (IPST indicator)
  - `ดศ ม.6 ผล 11` (additional course, Earth, astronomy and space)
  - `ฟส ม.4 ผล 17` (additional physics)
  - `NKRAFA วอ 478` and `NKRAFA PLO7`
  - `ФГОС 24.05.06 ОПК-8`

A pack lesson id may not collide with a built-in one (`catalog.ts:56–60`). Reusing a built-in lesson therefore needs either a pack "reference" field or a renamed copy. See §9.

---

## 2. Curriculum 1: IPST basic science, M.4–6

### 2.1 Sources

| Id | Title | URL | Pages |
|---|---|---|---|
| T1 | IPST / สพฐ., *ตัวชี้วัดและสาระการเรียนรู้แกนกลาง กลุ่มสาระการเรียนรู้วิทยาศาสตร์ (ฉบับปรับปรุง พ.ศ. ๒๕๖๐) ตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช ๒๕๕๑* | https://www.ipst.ac.th/wp-content/uploads/2022/05/SciCurriculum_2560.pdf (linked from https://www.ipst.ac.th/physics) | ว 2.2 M.5 ind. 1–5: PDF 72 / book 65; ind. 6: PDF 73 / book 66. ว 3.1 M.6 ind. 9: PDF 93 / book 86; ind. 10: PDF 94 / book 87 |
| T2 | IPST, *มาตรฐาน ว 2.2 … (ฉบับปรับปรุง พ.ศ.2560)*, standard ว 2.2 extract | https://www.ipst.ac.th/wp-content/uploads/2022/05/PhysicalSci_Standard_2_2_Curriculum2560.pdf | p. 1 (ind. 1–3), p. 2 (ind. 4–7), p. 3 (ind. 8–10) |
| T3 | IPST, standard ว 2.3 extract | https://www.ipst.ac.th/wp-content/uploads/2022/05/PhysicalSci_Standard_2_3_Curriculum2560.pdf | p. 1 (ind. 2), p. 4 (ind. 11–12) |
| T4 | IPST, *คู่มือการใช้หลักสูตรรายวิชาพื้นฐานวิทยาศาสตร์ ระดับมัธยมศึกษาตอนปลาย* (e-book 8415) | https://www.scimath.org/e-books/8415/flippingbook/26/ (also `/29/`, `/31/`) | Learner quality at the end of M.6, standard ว 3.1 (see `phase4-references.md` §8b) |

About T1:
- The file is 3 305 013 bytes, md5 `f5e3fb8ed05375e7eddefb3a27159cf5`. It is byte-identical to the copy read on 2026-09-28 from OER Thailand (https://oer.learn.in.th/d/128922, which timed out today).
- The same file is linked at `physics.ipst.ac.th/wp-content/uploads/sites/2/2019/02/SciCurriculum_2560.pdf`, which reset the connection today.
- Book page = PDF page − 7. I checked this on PDF 94 (book 87), 197 (book 190) and 243 (book 236).

### 2.2 Relevant indicators

| Code | Grade | Text (T1/T2) | Gloss |
|---|---|---|---|
| ว 2.2 ม.5/1 | M.5 | วิเคราะห์และแปลความหมายข้อมูลความเร็วกับเวลาของการเคลื่อนที่ของวัตถุเพื่ออธิบายความเร่งของวัตถุ | Read velocity–time data to explain acceleration |
| ว 2.2 ม.5/3 | M.5 | สังเกต วิเคราะห์ และอธิบายความสัมพันธ์ระหว่างความเร่งของวัตถุกับแรงลัพธ์ที่กระทำต่อวัตถุและมวลของวัตถุ | a = F/m |
| ว 2.2 ม.5/4 | M.5 | สังเกตและอธิบายแรงกิริยาและแรงปฏิกิริยาระหว่างวัตถุคู่หนึ่ง ๆ | Action and reaction |
| ว 2.2 ม.5/5 | M.5 | สังเกตและอธิบายผลของความเร่งที่มีต่อการเคลื่อนที่แบบต่าง ๆ … การเคลื่อนที่แบบโพรเจกไทล์ การเคลื่อนที่แบบวงกลม … | Linear, projectile, circular and oscillating motion. The content note says circular motion is acceleration always perpendicular to the velocity |
| **ว 2.2 ม.5/6** | M.5 | สืบค้นข้อมูลและอธิบายแรงโน้มถ่วงที่เกี่ยวกับการเคลื่อนที่ของวัตถุต่าง ๆ รอบโลก | Content: gravity explains the motion *"ดาวเทียม และดวงจันทร์รอบโลก"* (satellites and the Moon around the Earth) |
| ว 2.3 ม.5/2 | M.5 | สืบค้นข้อมูลและอธิบายการเปลี่ยนพลังงานทดแทนเป็นพลังงานไฟฟ้า … | Renewable energy to electricity, efficiency (solar arrays) |
| ว 2.3 ม.5/12 | M.5 | สืบค้นข้อมูล และอธิบายการสื่อสารโดยอาศัยคลื่นแม่เหล็กไฟฟ้าในการส่งผ่านสารสนเทศ… | Communication by EM waves; analogue and digital |
| ว 3.1 ม.6/9 | M.6 | อธิบายโครงสร้างของดวงอาทิตย์ การเกิดลมสุริยะ พายุสุริยะ … ผลของลมสุริยะ และพายุสุริยะที่มีต่อโลก รวมทั้งประเทศไทย | Content (T1 PDF 93): storms *"อาจส่งผลต่อวงจรอิเล็กทรอนิกส์ของดาวเทียม"* (may affect satellites' electronics) |
| **ว 3.1 ม.6/10** | M.6 | สืบค้นข้อมูล อธิบายการสำรวจอวกาศ โดยใช้กล้องโทรทรรศน์ในช่วงความยาวคลื่นต่าง ๆ ดาวเทียม ยานอวกาศ สถานีอวกาศ และนำเสนอแนวคิดการนำความรู้ทางด้านเทคโนโลยีอวกาศมาประยุกต์ใช้ … | Content: satellites for communication, positioning, resources and meteorology, *"แบ่งได้ตามเกณฑ์วงโคจรและการใช้งาน"* (classified by orbit and use) |

### 2.3 Mapping to the app

| Indicator | Existing feature | Phase 4 |
|---|---|---|
| ว 2.2/1, /3, /4 | Launch Explore charts (speed, g-load); the result card; staging events | none |
| ว 2.2/5, /6 | Orbit playground (O01): Newton's cannon (`newtonsCannon`, `kepler.ts:333`); Launch to orbit; `orbit.speed` and `orbit.period` | none |
| ว 2.3/2 | none | D06 power core (`src/orbit/power.ts`: array area, battery depth of discharge) |
| ว 2.3/12 | O04 link budget (`applications.ts:125–164`) | D06 link core (`src/orbit/link.ts`; `LINK_MARGIN_THRESHOLD = 3` dB) |
| ว 3.1/9 | R05 space weather into lifetime; M03 re-entry; `case-cz5b` | none |
| ว 3.1/10 | Real satellites, THEOS-2, Thaicom, NAPA (O04); `case-theos2`; the Watch sky tour | D06 templates (communications, Earth observation, CubeSat) |

### 2.4 Lessons (Explore, point-mass)

**B1 `ipst-b-forces`: "Forces on a rocket".** Codes ว 2.2 ม.5/1, /3, /4.
- Mission: Falcon 9, Cape, `cubesats`, 10 000 kg, `leo`. This is built-in 1.1's mission, which is tested. All settings locked.
- Criteria:
  - `outcome target`
  - `answer maxG, tolPct 10, unit g`: "read the peak acceleration; when does it happen?"
  - `answer maxQTime, tol 5, unit s` (optional)
- Debrief: thrust is roughly constant while mass falls, so a = F/m peaks just before cutoff. The exhaust pushed back pushes the rocket forward.
- Status: writable now.

**B2 `ipst-b-falling-around`: "Falling around the Earth".** Codes ว 2.2 ม.5/5, /6.
- Mission: Soyuz-2.1a, Baikonur, `crew` 7 150 kg, `iss`. This is built-in 1.2's mission, which is tested.
- Criteria:
  - `outcome target`
  - `answer orbit.speed, tol 0.05 km/s` (v = √(GM/r))
  - `answer orbit.period, tol 1 min`
- Pre-activity, ungraded: Newton's cannon in the playground.
- Status: writable now.

**B3 reuse built-in 1.4 `orbit-payload` ("Payload and Δv").** Codes ว 2.2 ม.5/3, /5.
- Criteria as built: `outcome target`, `payload min 17 500 kg`, `dvLeft min 150 m/s`.
- Frame it as projectile against orbit: too heavy a payload and the stage falls back.

**B4 reuse `case-theos2`.** Code ว 3.1 ม.6/10.
- All six case items: plane turn rate, J₂ rate, height, reach at 45°, local mean solar time, and "why sun-synchronous".
- Status: writable now.

**B5 `ipst-b-solar-storms`.** Code ว 3.1 ม.6/9.
- Reuse `case-cz5b` (drag, the ballistic coefficient, the re-entry window).
- Add a new case item: the re-entry of the same stage predicted with quiet and with storm-time F10.7/Kp (R05). The answer is the difference in days.
- Status: needs a new `CASE_ITEM_IDS.cz5b` entry and its key in `src/worksheets/cases.ts`.

**B6 `ipst-b-thaicom-link` [P4-design].** Codes ว 2.3 ม.5/12, ว 3.1 ม.6/10.
- Start from the communications-satellite template at 119.5°E with a Bangkok ground station.
- Criterion: `design sat.linkMargin min 3 dB`.
- Status: needs the design kind.

---

## 3. Curriculum 2: IPST additional course, Earth, astronomy and space (M.6)

### 3.1 Sources

| Id | Title | URL | Pages |
|---|---|---|---|
| T1 | as §2.1 | as above | Standard 3 outcomes 11–12: PDF 241 / book 234; 13–15: PDF 242 / 235; 16–17: PDF 243 / 236; 18–19: PDF 244 / 237. Every outcome of this standard is marked ม.๖ |
| T5 | IPST, *คู่มือการใช้หลักสูตรรายวิชาเพิ่มเติมวิทยาศาสตร์ วิชาโลก ดาราศาสตร์และอวกาศ ระดับมัธยมศึกษาตอนปลาย (ฉบับปรับปรุง พ.ศ. 2560)* (e-book 8418) | https://www.scimath.org/e-books/8418/flippingbook/36/ (landing page https://www.scimath.org/ebook-earthscience/item/8418-2-2560-2551) | Outcomes 10–12: `/36/` = book p. 27; 13–15: `/37/` = p. 28; 16–19: `/38/` = p. 29; comparison with the basic indicators: `/40/`–`/41/` = pp. 31–32 |

### 3.2 Relevant outcomes

| Code | Text (T1) | Gloss |
|---|---|---|
| **ดศ ม.6 ผล 11** | อธิบายการโคจรของดาวเคราะห์รอบดวงอาทิตย์ ด้วยกฎเคพเลอร์ และกฎความโน้มถ่วงของนิวตัน พร้อมคำนวณคาบการโคจรของดาวเคราะห์ | Kepler and Newton; compute orbital periods |
| ผล 12 | อธิบายโครงสร้างของดวงอาทิตย์ การเกิดลมสุริยะ พายุสุริยะ … ผลของลมสุริยะ และพายุสุริยะที่มีต่อโลก รวมทั้งประเทศไทย | Content: storms affect communication and *"วงจรอิเล็กทรอนิกส์ของดาวเทียม"* (satellites' electronics) |
| ผล 13 | สร้างแบบจำลองทรงกลมฟ้า … และอธิบายการระบุพิกัดของดาวในระบบขอบฟ้า และระบบศูนย์สูตร | Horizon coordinates (azimuth, altitude) and equatorial coordinates (RA, Dec) |
| ผล 14 | สังเกตท้องฟ้า และอธิบายเส้นทางการขึ้น การตกของดวงอาทิตย์และดาวฤกษ์ | Rising and setting paths depend on latitude |
| ผล 15 | อธิบายเวลาสุริยคติปรากฏ … | Apparent solar time |
| **ผล 16** | อธิบายเวลาสุริยคติปานกลาง และการเปรียบเทียบเวลาของแต่ละเขตเวลาบนโลก | Mean solar time; Greenwich; time zones |
| **ผล 18** | สืบค้นข้อมูล อธิบายการสำรวจอวกาศ โดยใช้กล้องโทรทรรศน์… ดาวเทียม ยานอวกาศ สถานีอวกาศ … | Repeats basic ว 3.1 ม.6/10 |
| ผล 19 | สืบค้นข้อมูล ออกแบบ และนำเสนอกิจกรรมการสังเกตดาวบนท้องฟ้าด้วยตาเปล่า และ/หรือกล้องโทรทรรศน์ | Plan a sky-watching activity |

### 3.3 Mapping to the app

| Outcome | Existing feature | Phase 4 |
|---|---|---|
| 11 | Playground: period against a, equal areas (`equalTimeCuts`, `sectorArea`, `kepler.ts:285`, `:292`); `orbit.period`, `orbit.semiMajorAxis`, `orbit.eccentricity` | none |
| 12 | R05 F10.7/Kp into NRLMSISE-00 lifetime; M03 re-entry | none |
| 13, 14, 19 | R03 passes: azimuth, elevation, rise and set, sunlit or visible, visual magnitude (P2.5); the Watch sky tour | none |
| 15, 16 | LTAN and node local time (`nodeLocalTime`, `raanForLocalTime`, `kepler.ts:223–229`); the `sso` preset with LTAN 10:30; `case-theos2` item `lst` (local mean solar time at 03:20 UTC over Bangkok) | D06 eclipse against β (`src/orbit/eclipse.ts`) |
| 18 | Thai satellites (O04); the history lessons (C01) | D06 templates, D07 requirements-driven design |

### 3.4 Lessons (Explore)

**A1 `ipst-a-kepler3`: "Kepler's third law on a transfer orbit".** Code ผล 11.
- Mission: Falcon 9, Cape, `comsat`, 4 150 kg (50 % of the 8 300 kg GTO rating), `gto`. This is in the matrix (`falcon9/gto/90` is the only exclusion).
- Criteria:
  - `outcome target`
  - `answer orbit.semiMajorAxis, tol 25 km` (a = R + (h_p + h_a)/2)
  - `answer orbit.period, tolPct 1` (T = 2π√(a³/μ))
  - `answer orbit.eccentricity, tol 0.005`
- Debrief: the same law with μ_sun gives the planets' periods.
- Status: writable now.

**A2 `ipst-a-sun-clock`: "An orbit that keeps the Sun's time".** Codes ผล 15, 16.
- Mission: Vega-C, Kourou, `science`, 1 150 kg (50 % of the 2 300 kg SSO rating), `sso` (600 km, LTAN 10:30). This is in the matrix: the 97.8° needed is within Kourou's 96.5° plus the 5° dogleg. THEOS-2 flew from Kourou on a Vega (VV23, 2023-10-09, `src/data/thai-satellites.ts:50`).
- Criteria:
  - `outcome target`
  - `measure orbit.inclination, target 'mission', tol 0.1`
  - `measure orbit.raanError, max 0.5`
  - `answer orbit.period, tol 0.5 min`
- Status: writable now. Confirm `raanError` is non-null with LTAN (§1.2).

**A3 reuse `case-theos2`.** Codes ผล 15, 16, 18.
- Item `lst` is exactly outcome 16's mean solar time; items `required` and `j2` are the 0.9856°/day plane turn.

**A4 reuse built-in 5.3 `adv-history` (Sputnik-1).** Codes ผล 11, 18.
- Criteria as built: `outcome target`, `answer orbit.period, tol 0.2 min`.

**A5 `case-iss-bangkok`: "Seeing the station from Bangkok" (new case).** Codes ผล 13, 14, 19.
- Case items, all numbers except the last:
  - `maxEl` (°)
  - `riseAz` (°)
  - `duration` (min)
  - `mag` (visual magnitude)
  - `visible` (choice)
- Data are frozen at open, as `theos2Epoch` is.
- Status: needs a new `CaseId`, sheet, key and `CASE_FOCUS` (open `passes`).

---

## 4. Curriculum 3: IPST additional physics

### 4.1 Sources

| Id | Title | URL | Pages |
|---|---|---|---|
| T1 | as §2.1, §สาระฟิสิกส์ | as above | Group 1 statement: PDF 197 / book 190; outcome 6: PDF 199 / 192; 8–9: PDF 200–201 / 193–194; 14: PDF 202 / 195; 15–16: PDF 203 / 196; **17: PDF 204 / 197** |
| T6 | IPST, *ผลการเรียนรู้ … สาระฟิสิกส์ หมวดที่ 1* | https://www.ipst.ac.th/wp-content/uploads/2022/05/PhysicsLO_Group_1.pdf | 6: p. 4; 8–9: p. 5; 14: p. 7; 15–16: p. 8; 17: p. 9 |
| T7 | IPST, *… หมวดที่ 3* | https://www.ipst.ac.th/wp-content/uploads/2022/05/PhysicsLO_Group_3.pdf | M.5 outcome 11: p. 6; M.6 outcomes 2–3: p. 7 (book 24) |
| T8 | IPST, *การเทียบเคียงตัวชี้วัดในสาระที่ 2 … กับผลการเรียนรู้ในสาระฟิสิกส์* | https://www.ipst.ac.th/wp-content/uploads/2022/05/Comparison_PhysicalSciLI_and_PhysicsLO_02-1.pdf | pp. 1–3 (ว 2.2 ↔ group 1, outcomes 3–6, 16, 17), p. 5 (ว 2.3/2 ↔ group 3 outcome 11), p. 7 (ว 2.3/11–12 ↔ group 3 outcomes 7–8) |

The teacher's manuals `Curriculum2560_Manual_M4/M5/M6.pdf` are linked from https://www.ipst.ac.th/physics but hosted on `physics.ipst.ac.th`, which reset the connection or returned 503 today. They were not read.

### 4.2 Relevant outcomes

| Code | Grade | Text | Gloss |
|---|---|---|---|
| ฟส ม.4 ผล 6 | M.4 | อธิบายกฎความโน้มถ่วงสากลและผลของสนามโน้มถ่วงที่ทำให้วัตถุมีน้ำหนัก รวมทั้งคำนวณปริมาณต่าง ๆ ที่เกี่ยวข้อง | F = Gm₁m₂/R² |
| ผล 8 | M.4 | อธิบายสมดุลกลของวัตถุ โมเมนต์และผลรวมของโมเมนต์ที่มีต่อการหมุน แรงคู่ควบ… | Moments; couples |
| ผล 9 | M.4 | สังเกต และอธิบายสภาพการเคลื่อนที่ของวัตถุ เมื่อแรงที่กระทำต่อวัตถุผ่านศูนย์กลางมวลของวัตถุ … | A force through the centre of mass gives translation without rotation |
| ผล 14 | M.4 | อธิบาย และคำนวณโมเมนตัมของวัตถุ และการดล … | p = mv; impulse |
| ผล 15 | M.4 | … การชนของวัตถุในหนึ่งมิติ … และการดีดตัวแยกจากกันในหนึ่งมิติซึ่งเป็นไปตามกฎการอนุรักษ์โมเมนตัม | Separation conserves momentum |
| ผล 16 | M.4 | … การเคลื่อนที่แบบโพรเจกไทล์ | Projectile |
| **ผล 17** | M.4 | ทดลอง และอธิบายความสัมพันธ์ระหว่างแรงสู่ศูนย์กลาง … และประยุกต์ใช้ความรู้การเคลื่อนที่แบบวงกลมในการอธิบายการโคจรของดาวเทียม | Content (T1 PDF 204): gravity is the centripetal force; *"ดาวเทียมที่มีวงโคจรค้างฟ้าในระนาบของเส้นศูนย์สูตรมีคาบการโคจรเท่ากับคาบการหมุนรอบตัวเองของโลก"* (a geostationary satellite's period equals the Earth's rotation) |
| ฟส ม.5 หมวด 3 ผล 11 | M.5 | อธิบายการเปลี่ยนพลังงานทดแทนเป็นพลังงานไฟฟ้า … | Solar energy to electricity |
| ฟส ม.6 หมวด 3 ผล 2–3 | M.6 | … แรงแม่เหล็กที่กระทำต่อเส้นลวด … หลักการทำงานของแกลแวนอมิเตอร์และมอเตอร์ไฟฟ้ากระแสตรง | Content (T7 p. 7): *"เมื่อมีกระแสไฟฟ้าผ่านขดลวดตัวนำที่อยู่ในสนามแม่เหล็กจะมีโมเมนต์ของแรงคู่ควบกระทำต่อขดลวด"* (a current-carrying coil in a field feels a couple). This is the magnetorquer's principle |

### 4.3 Mapping to the app

| Outcome | Existing feature | Phase 4 |
|---|---|---|
| 6, 17 | `orbit.speed`, `orbit.period`; `geo` preset; playground | none |
| 8, 9 | Six-DOF: thrust vector and the gimbal about the centre of gravity; G08 `gimbalHardover`; E01 frames | D06 attitude core: `gravityGradientTorque`, `solarTorque`, `aeroTorque` (torque = force × arm) |
| 14, 15 | Stage separation events; the rocket equation in D03 (Δv per stage); 1.4 and 3.1 | D06 Δv core (`propellantFor`, `dvAllocation`) |
| 16 | Suborbital flights; the `stableOrbit` hook; F01 impact zones | none |
| M.5 group 3 outcome 11 | none | D06 power: `arrayArea`, `batteryCapacity`, eclipse |
| M.6 group 3 outcomes 2–3 | none | D06 attitude: `magneticTorque(m, B)`, `torquerDipole(T, B)`, `dipoleField(r)` (`src/orbit/attitude.ts`, branch `-208-3`) |

### 4.4 Lessons

**P1 `ipst-p-geo`: "Why a geostationary satellite stands still" [verify].** Code ผล 17.
- Mission: Proton-M, Baikonur, `comsat`, `geo` direct injection with Briz-M. This is outside the matrix; the matrix only goes to GTO.
- Criteria:
  - `outcome target`
  - `answer orbit.period, tol 2 min` (≈ 1 436 min)
  - `answer orbit.speed, tol 0.03 km/s` (≈ 3.07)
  - `measure orbit.inclination, max 0.5`
- Fallback if Proton to `geo` does not fly: Falcon 9 to `gto` and a question on the apogee period.

**P2 `ipst-p-starlink`: "Centripetal force is gravity" [verify].** Codes ผล 6, 17.
- Mission: Falcon 9, Cape, `starlink`, `starlink` preset (550 km, 53°). The 53° is within Cape's 57.6° limit. The mission is close to `falcon9/leo/50` but not in the matrix.
- Criteria:
  - `outcome target`
  - `answer orbit.speed, tol 0.05 km/s`
  - `answer orbit.period, tol 0.5 min`
- Debrief: g at 550 km = v²/r.

**P3 reuse built-ins 1.4 `orbit-payload` and 3.1 `fail-engine-out`.** Codes ผล 14, 15.
- Impulse = F·t: eight engines burn longer for the same Δv.
- Criteria as built.

**P4 `ipst-p-moment`: "A thrust that misses the centre of mass" (Engineer, six-DOF) [heavy].** Codes ผล 8, 9.
- Mission: Falcon 9, Cape, `cubesats` 10 000 kg, `leo`, with the `falconGimbal` preset: engine 1 goes hard over in pitch at T+60 s (`fault-config.ts:59`). FDIR is on.
- Criteria:
  - `event evt.fdirGimbalFailed, present` ("the FDIR shuts down the engine whose thrust no longer passes through the centre of mass"; `tests/control-faults.test.ts:163–175`)
  - `outcome target`
- Suggested as enrichment: it runs in Engineer mode.

**P5 `ipst-p-magnetorquer` [P4-design].** Code ฟส ม.6 หมวด 3 ผล 3.
- Size a torquer for a CubeSat's disturbance torque.
- Criterion: a design measure for the torquer dipole, in A·m². **This is not in the planned `sat.*` list**; either `sat.torquerDipole` has to be added or `sat.wheelMargin` used.

**P6 `ipst-p-solar-power` [P4-design].** Codes ฟส ม.5 หมวด 3 ผล 11, ว 2.3 ม.5/2.
- Criteria: `sat.powerMargin min 0 %`, `sat.batteryDod max` the DoD guidance (`DOD_GUIDANCE`, `power.ts:128`), and an answer on `sat.eclipseMax`.

---

## 5. Curriculum 4: Navaminda Kasatriyadhiraj Royal Thai Air Force Academy (NKRAFA)

### 5.1 Sources found (all public, posted by the academy)

| Id | Title | URL | Pages / notes |
|---|---|---|---|
| N0 | NKRAFA, *หลักสูตรการศึกษา* (curriculum page) | https://nkrafa.rtaf.mi.th/curriculum | Lists the BEng/BSc programmes, 2020 revision (ปรับปรุง 63) and **2025 revision (ปรับปรุง 68)**: Aeronautical, Civil, Industrial and Aviation Management, Mechanical and Electrical Engineering; Military and Aeronautical Materials Science; Computer Science. Also an MSc/PhD in Defence Technology (https://sites.google.com/view/grad-nkrafa). Fetched 2026-09-30 |
| N1 | *หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมอากาศยาน (หลักสูตรปรับปรุง พ.ศ.2568)* | https://drive.google.com/file/d/15SNJaSOWqYxHStIKeoSSscdsjA8wii5p/view | 243 PDF pages; book p. = PDF − 4. First taught in the first semester of 2025. Endorsed by the academy council on 25 Sep 2024 and approved by สภาการศึกษาวิชาการทหาร on 5 Feb 2025 (PDF 6). 162 credits (PDF 48) |
| N2 | Aeronautical Engineering, 2020 revision | https://drive.google.com/file/d/1DyIWnu86-V63gEAZmlT4z--TrqPkCsG7/view | 185 PDF pages. AE 541 *Spacecraft System* (PDF 92); EE 535 *Satellite Communication* (PDF 88) |
| N3 | *… สาขาวิชาวิศวกรรมไฟฟ้า (หลักสูตรปรับปรุง พ.ศ.2568)* | https://drive.google.com/file/d/1NxWBgELhApDtgvkbgj7EUHsHU6mom8uZ/view | 234 PDF pages; book p. = PDF − 4 |
| N4 | Council of Engineers, *คำรับรองตนเอง (Self-Declaration) … สาขาวิศวกรรมเครื่องกล สำหรับผู้เข้าศึกษาปีการศึกษา 2563–2567*, NKRAFA, 10 Jun 2021 | https://coe.or.th/wp-content/uploads/2023/01/20.-เครื่องกล-ปป-พ.ศ.-2563-โรงเรียนนายเรืออากาศนวมินทกษัตริยาธิราช.pdf | 56 pp. Study plan pp. 6–9 (174 credits); วก 231/232 statics and dynamics p. 25; บฐ 301/302 basic aeronautical knowledge pp. 29, 33; **วก 433 การควบคุมอัตโนมัติ** pp. 34–35 |
| N5 | Thai Wikipedia, *โรงเรียนนายเรืออากาศนวมินทกษัตริยาธิราช*, §หลักสูตร | https://th.wikipedia.org/wiki/โรงเรียนนายเรืออากาศนวมินทกษัตริยาธิราช | Secondary. Five BEng and two BSc programmes |

The other 2025 programmes (Mechanical, Industrial, Civil, Materials, Computer) are linked from N0 but were not read.

### 5.2 What the Aeronautical Engineering 2025 programme (N1) says

**Programme learning outcomes** (PDF 18 / book 14):
- **PLO4**: *"มีความสามารถในการคำนวณและวิเคราะห์ด้านกลศาสตร์การบินและระบบควบคุมอัตโนมัติ"* (compute and analyse flight mechanics and automatic control).
- **PLO7**: *"มีความรู้พื้นฐานด้านวิศวกรรมอวกาศและสามารถคำนวณการเคลื่อนที่ของวัตถุในอวกาศ"* (basic space engineering; able to calculate the motion of objects in space).
- **PLO9**: *"มีความรู้พื้นฐานด้านการบิน ไซเบอร์ และอวกาศ"* (basic air, cyber and space knowledge). PLO9 is also in the Electrical 2025 programme (N3, PDF 18).

**Structure:**
- Year 1 is common to all cadets. The branch starts in year 2.
- Year 5 has 5 electives (11 credits) in *วิชาเลือกทางเทคโนโลยีการบินและการทหาร*. The guideline is 1 air-dimension course, 1 cyber course, **1 space-dimension course**, and the rest branch-specific (PDF 45 / book 41).
- The space-dimension list (PDF 46 / book 42):
  - คต 273 GIS
  - วด 544 Introductory Astronomy
  - วฟ 515 Satellite Remote Sensing
  - วอ 526 Introduction to Astronautics
  - วอ 527 Rocket Propulsion System
  - วอ 528 Space Flight Dynamics
  - วอ 529 Space Mission Design
  - special topics
- The branch-specific list includes วอ 563 Flight Dynamics and Control and วอ 575 Introduction to Space Mission Design.
- Required courses (PDF 46–47 / book 42–43) include:
  - วอ 342 Aerodynamics
  - วอ 352 Numerical Methods
  - **วอ 361 / 461 Flight Mechanics 1 and 2**
  - **วอ 362 Linear System Theory Application in Flight Control Design**
  - วอ 442 Aircraft Propulsion 1
  - **วอ 462 Automatic Control System**
- One engineering elective is chosen from a list that includes **วอ 478 Introduction to Space Flight Dynamics** (3 credits).

**Course descriptions** (appendix ก):

| Course | Book p. (PDF) | Description (quoted, abridged) | Orbitlab |
|---|---|---|---|
| วอ 361 Flight Mechanics 1 | 116 (120) | Forces and moments; level, climb and glide performance … energy method | Launch ascent: `loss.*`, `maxQ`, `maxG` |
| วอ 461 Flight Mechanics 2 | 117 (121) | Static stability and control; equations of motion; stability derivatives; dynamic modes | Six-DOF P01, aero tables P03, ГОСТ/ISO notation U07 |
| **วอ 362 Linear System Theory …** | 116 (120) | *"State Space Representation … Controllability, Observability and Stability … Pole Placement, State Feedback, Observer Design และ Linear Quadratic Regulator"* | Attitude loop: the K_θ and K_ω cascade (G03); E04 tuning; G02 Kalman filter (observer) |
| **วอ 462 Automatic Control System** | 118 (122) | Feedback; *"วิธีการของรูทโลกัส วิธีการของการตอบสนองเชิงความถี่ เสถียรภาพของระบบในแบบโดเมนความถี่"*; compensation | G03 inspector, G04 Bode and margins, E04 step and doublet, P05 notch |
| วอ 563 Flight Dynamics and Control | 108 (112) | Trim from the nonlinear equations; linearisation; transfer functions; autopilot | G03 and G04 (the linearised loop) |
| **วอ 478 Introduction to Space Flight Dynamics** | 119 (123) | Astronomy basics; vectors; orbital motion; constants of motion; *"การพบกันของวัตถุในอวกาศ"* (rendezvous); interplanetary; *"การคำนวณระยะเวลาและตำแหน่งในอนาคต"* (time and future position); launch windows; *"… การจำลองด้วยโปรแกรมคอมพิวเตอร์แบบสามมิติ … การโคจรของดาวเทียม"* (3-D simulation software for satellite orbits) | Orbit playground (O01), planner (O02), SGP4 (R01), passes (R03), G07 rendezvous |
| วอ 526 Introduction to Astronautics | 114 (118) | Two-body; orbital elements; *"เส้นทางการโคจรภาคพื้น"* (ground track); orbit and plane change; patched conic; perturbations; launch; rocket propulsion | O01 ground track, O02 Hohmann and plane change, P07 perturbations, L03 (Phase 5) |
| วอ 528 Space Flight Dynamics | 115 (119) | Frames; two-body; elements; rendezvous; time and position; launch opportunities, time and velocity | as วอ 478 |
| วอ 529 Space Mission Design | 115 (119) | Space environment; orbits and transfers; *"การควบคุมการเคลื่อนที่ของดาวเทียม"* (satellite motion control); propulsion; station docking; re-entry; lessons of the past | O02, G07, M03, D06 and D07 |
| วอ 575 Introduction to Space Mission Design | 109 (113) | Orbit review, transfers, gravity assist, propulsion; re-entry; mission design and feasibility; *"การใช้โปรแกรมคอมพิวเตอร์สำหรับการวิเคราะห์ภารกิจอวกาศ"* (software for mission analysis) | D07 |
| วอ 527 Rocket Propulsion System | 114 (118) | Rocket aerodynamics; performance; classification; chemical propulsion; nozzle design | D01–D04 (engine catalogue, static fire) |
| วอ 583 Fundamentals of Rocket Design | 125 (129) | Rocket components; propellant; model-rocket design with software | D03 parts builder |
| วฟ 511 UAV Dynamics and Control | 110 (114) | *"สมการการเคลื่อนที่ของนิวตัน-ออยเลอร์ 6 องศาอิสระ รวมถึงรุงเง-คุตตา อินทิเกรเตอร์"* (six-DOF Newton–Euler, Runge–Kutta); MPC; feedback linearisation | Six-DOF P01 (the same equations) |
| วฟ 515 Satellite Remote Sensing | 114 (118) | Sensors, ground segment, image processing | O04 GSD and swath; M02 sensor table |

**Electrical 2025 (N3):**

| Course | Book p. (PDF) | Description | Orbitlab |
|---|---|---|---|
| EE 316 Control Systems | 105 (109) | *"… ตัวอย่างการประยุกต์กับการควบคุมอากาศยานและระบบอาวุธ"* (examples: aircraft and weapons control) | G03 and G04 |
| EE 521 Satellite Communication | 111 (115) | Resource planning, modulation, coding, multiple access, networks | O04 link budget; D06 link core |
| EE 585 Space Mission and Orbit Analysis | 118 (122) | Mission design and orbit analysis; Earth observation, GEO and solar-system targets; requirements | O01–O04; D07 |
| EE 587 Advanced Control Systems | 118 (122) | Linear and nonlinear control | E04 |
| EE 589 Satellite Remote Sensing | 119 (123) | as วฟ 515 | O04; M02 |

**Research by the programme's own staff:** N1 lists, at PDF 188 / book 184, *Tongsawang, K. and Yuthayanon, I. (2024). "Research and Development of Satellite Engineering Model to Analyze the Attitude Determination and Control System". NKRAFA Journal of Science and Technology, 20(1), 59–72.* This bears directly on the Phase 4 attitude core. I did not read the article.

**Mechanical 2020 (N4):**
- วก 232 Dynamics: 3-D rigid bodies; impulse and momentum (p. 25).
- วก 433 Automatic Control: root locus, frequency response, compensator design, and a final project *"การออกแบบระบบควบคุมและระบบนำทางสำหรับ Mobile Robot, UAV หรือ Robot Arm"* (design of a control and navigation system for a mobile robot, UAV or robot arm) (pp. 34–35).

### 5.3 Not found, or not read

1. No week-by-week course specification (มคอ.3), reading list, lab sheet or assessment scheme for any course. The programme documents give only the descriptions above.
2. The software behind "โปรแกรมคอมพิวเตอร์แบบสามมิติที่ทันสมัย" (วอ 478) and the mission-analysis software (วอ 575) is not named.
3. No public course dedicated to spacecraft attitude control. AE 541 Spacecraft System (2020) and วอ 529 ("satellite motion control") are the nearest. Attitude appears only in the staff research above.
4. No guidance or navigation course for launch vehicles or missiles. Navigation appears only as pilot navigation (บฐ 201/202 "Navigation Skills") and the ME/UAV control project.
5. No public material on cadets' use of NAPA-1/2 or on the RTAF space-operations unit's training.
6. The 2025 Mechanical, Industrial, Civil, Materials and Computer programmes and the Defence Technology graduate programme were not read. Their links are recorded in N0.

### 5.4 Lessons (Engineer)

**R1 `rtaf-napa1-sso`: "NAPA-1's ride: the inclination J₂ asks for".** Codes วอ 478, วอ 526, PLO7.
- Mission: Vega-C (standing in for the Vega VV16 that flew NAPA-1, `thai-satellites.ts:80`), Kourou, `cubesats` 1 150 kg, `sso`. This is in the matrix.
- Criteria:
  - `outcome target`
  - `answer orbit.inclination, tol 0.05°`: computed from cos i = −(dΩ/dt)·2a^{7/2}/(3J₂R²√μ) with dΩ/dt = 360°/365.2422 d
  - `answer orbit.period, tol 0.2 min`
  - `measure orbit.raanError, max 0.5`
- Tighter answers than A2 make the difference.
- The preset flies to 600 km. The repo lists NAPA-1's orbit as 307 × 310 km at 97.23° (`thai-satellites.ts:82`). The lesson text must say that the height is the preset's, not NAPA-1's; I did not look up NAPA-1's deployment orbit.
- Status: writable now.

**R2 `rtaf-elements`: "Elements and future position of a transfer orbit".** Codes วอ 478, วอ 528.
- Mission: A1's (Falcon 9 to `gto`, matrix).
- Criteria:
  - `answer orbit.semiMajorAxis, tol 10 km`
  - `answer orbit.eccentricity, tol 0.002`
  - `answer orbit.period, tolPct 0.5`
  - `outcome target`
- Status: writable now.

**R3 reuse built-ins 4.1 `ctl-inspector` and 4.2 `ctl-margins`, plus S1 below.** Codes วอ 462, EE 316, วก 433, PLO4.
- 4.1: `answer loop.wcAtMaxQ, tolPct 10`; `answer loop.pmAtMaxQ, tolPct 10`.
- 4.2: `measure loop.pmAtMaxQ, min 30`; `measure loop.gmAtMaxQ, min 6`.

**R4 `rtaf-state-feedback`: "Two gains, one damping ratio" [heavy, calibrate].** Code วอ 362.
- Mission: 4.3's six-DOF Falcon 9 step test; E04 gains unlocked.
- Target: ζ ≈ 0.7, which gives ≤ 5 % overshoot for a second-order loop.
- Criteria:
  - `measure step.overshoot, max 5`
  - `answer step.overshoot, tol 2`
  - `outcome survived`
  - `endEvent evt.meco`
- Built-in 4.3 uses max 6. Prove that 5 is reachable before shipping.

**R5 reuse built-in 5.2 `adv-docking`.** Codes วอ 478, วอ 528, วอ 529.
- Criteria as built: `event evt.docked`, `measure dock.hours, max 4`, `answer dock.hours, tol 0.1 h`.

**R6 `rtaf-6u-adcs`: "Attitude control for a 6U like NAPA-2" [P4-design].** Codes วอ 529, AE 541, PLO7.
- Start: the NAPA-2 CubeSat template (owner question Q6 in the map).
- Criteria: `sat.wheelMargin min 1`; `sat.linkMargin min 3 dB`; the wheel momentum from `wheelMomentumCyclic` against a stated wheel.
- Cite the Tongsawang and Yuthayanon (2024) ADCS work in the debrief, after the owner has read it.

**Also worth a lesson (G02 GNSS resilience, military track):** `rtaf-gnss-outage` [heavy, calibrate].
- Setup: Falcon 9 six-DOF, `navigation: {grade: 'tactical', gnss: true, gnssOutage: {start, end}}`. The student chooses the IMU grade.
- Criteria: `measure nav.positionError, max X`, with X taken from a worked flight plus 25 %; `outcome survived`.

---

## 6. Curriculum 5: Russia, 24.05.06 «Системы управления летательными аппаратами», and the Mozhaisky Academy

### 6.1 Sources

| Id | Title | URL | Pages |
|---|---|---|---|
| F1 | Приказ Минобрнауки России от 04.08.2020 № 874 (ред. от 27.02.2023) «Об утверждении ФГОС ВО — специалитет по специальности 24.05.06 Системы управления летательными аппаратами», registered with the Ministry of Justice on 28.08.2020, № 59563. ConsultantPlus copy saved 19.02.2024 | https://fgosvo.ru/uploadfiles/FGOS%20VO%203++/Spec/24.05.06_C_3_19022024.pdf | 21 PDF pp. §1.5: p. 2; §1.9–1.10: pp. 3–4; §1.12: pp. 4–5; **§1.14 specializations: pp. 5–6**; **§3.3 ОПК-1…9: pp. 11–12**; §3.4: p. 12; appendix of professional standards: pp. 19–20 |
| F2 | Приказ Минобрнауки России от 12.08.2020 № 975, ФГОС ВО 24.05.04 «Навигационно-баллистическое обеспечение применения космической техники» | https://legalacts.ru/doc/prikaz-minobrnauki-rossii-ot-12082020-n-975-ob-utverzhdenii/ | HTML. §1.12, §1.14, §3.3 (ОПК-1…8), §3.4 |
| F3 | МАИ, *24.05.06 … Филиал «Стрела», кафедра С-12 «Аэромеханика, управление и навигация летательных аппаратов»*, programme page | https://priem.mai.ru/base/programs/sistemy-upravleniya-dvizheniem/ | Section «Специальные дисциплины» |
| F4 | МГТУ им. Н.Э. Баумана, Мытищинский филиал, *24.05.06, специализация «Системы управления ракет-носителей и космических аппаратов», факультет К, кафедра К1* | https://mf.bmstu.ru/direction/?code=24.05.06&id=31 | Section «Учебный процесс», disciplines by year |
| F5 | МАИ, *Самостоятельно устанавливаемый образовательный стандарт ОД-066-СМК-СУОС-24.05.06*, v1.0 | https://mai.ru/upload/iblock/068/x735qvwsofbujsq7c6zlxxwhwchpg4rr/24.05.06.pdf | Based on the **2016** ФГОС (№ 1032). ПК-4, ПК-5: p. 22 of 46. Older generation; shown only as an example of worked-out ПК |
| F6 | Russian Wikipedia, *Военно-космическая академия имени А. Ф. Можайского*, §Список факультетов с 26 января 2016 года | https://ru.wikipedia.org/wiki/Военно-космическая_академия_имени_А._Ф._Можайского | Secondary. Faculties and departments; cites `ens.mil.ru` and the former `academy-mozhayskogo.ru` |
| F7 | *Перечень специальностей*, academy-mozhayskogo.ru | https://academy-mozhayskogo.ru/joiners/demands | The 2018 list of specialties by faculty. **The domain now carries unrelated advertising**, so treat it as a historical copy only and cite F6 for structure |

### 6.2 What the federal standard (F1) sets

**Military organisations** (§1.5, §1.9–1.10):
- The programme is built on the Ministry of Defence's *"квалификационных требований к военно-профессиональной подготовке"* (qualification requirements for military-professional training).
- Five years and 300 credits (з.е.), against 5.5 years and 330 for civilian universities.

**§1.12 professional areas (PDF 5):** they include *"разработки алгоритмов решения задач по динамике, аэродинамике, баллистике и управлению космическими аппаратами"* (algorithms for spacecraft dynamics, aerodynamics, ballistics and control) and *"разработки и производства приборов ориентации, навигации и стабилизации"* (orientation, navigation and stabilisation instruments).

**§1.14 specializations (PDF 6).** The ones that matter here:
- Системы управления ракет-носителей и космических аппаратов (launch vehicle and spacecraft control systems)
- Системы управления движением ЛА (motion control)
- Математическое и программное обеспечение систем управления (control software and mathematics)
- Автоматы стабилизации систем управления ЛА (stabilisation autopilots)
- Приборы и системы астронавигации (astronavigation)
- Инерциальные навигационные комплексы (inertial navigation)
- Навигационные системы и инерциальные датчики (navigation systems and inertial sensors)
- Информационно-измерительные комплексы систем управления КА (spacecraft measurement complexes)
- Наземные навигационно-геодезические комплексы (ground navigation and geodesy)

**§3.3 general professional competences (ОПК), PDF 11–12:**

| Code | Text | Orbitlab |
|---|---|---|
| ОПК-1 | … применять естественнонаучные и общеинженерные знания, методы математического анализа и моделирования … | Every lesson |
| ОПК-5 | … разрабатывать физические и математические модели исследуемых процессов, явлений и объектов … | PHYSICS.md models; D05 staging; D06 cores |
| **ОПК-7** | … анализировать работу систем управления ЛА различного назначения, **как объектов ориентации, стабилизации, навигации, управления движением**, а также создавать математические модели … | G01–G08; the six-DOF autopilot; the D06 attitude core |
| **ОПК-8** | … проводить **динамические расчеты систем управления ЛА**, применять методики математического и полунатурного моделирования динамических систем «подвижный объект — система управления (система ориентации, стабилизации, навигации, управления движением)» | G03 and G04 (linearised loop at max-Q), E04 flight tests, G05 Monte Carlo, P05 |
| ОПК-9 | … разрабатывать алгоритмы и компьютерные программы … | T01 authoring; WebMCP |

**§3.4 (PDF 12):** in military organisations, *"перечень профессиональных компетенций … определяется на основе квалификационных требований …, устанавливаемыми федеральным государственным органом"*. The professional competences (ПК) are set by the ministry and are not in the standard.

**Appendix (PDF 19–20):** professional standards **25.015** «Специалист по разработке системы управления полетами ракет-носителей и космических аппаратов» and **25.042** «Инженер-конструктор по динамике полета и управлению летательным аппаратом в ракетно-космической промышленности»; also 25.030, 25.033, 32.001 and 40.008.

**Companion standard 24.05.04 (F2):**
- ОПК-6: *"разрабатывать физические и математические модели объектов космических и ракетно-транспортных систем, и процессов их управления"*.
- Specializations include «Навигационно-баллистическое обеспечение применения космических средств», «Управление полетами автоматических и пилотируемых КА» and «Проектная баллистика ракет и космических систем».
- This is where ballistics and orbit determination sit. At the Mozhaisky Academy, 24.05.04 is taught in faculty 1, whose department 16 is «навигационно-баллистического обеспечения применения космических средств и теории полёта ЛА» (F6, F7).

### 6.3 Typical disciplines (civilian programmes; the academy's own list is not public)

**MAI, Strela branch, department С-12 (F3):**
- Динамика полёта воздушных и космических ЛА
- Системы автоматического управления воздушными ЛА
- **Принципы построения приборов и систем ориентации, стабилизации и навигации**
- Гироскопические приборы
- Системы навигации
- **Инерциальные навигационные системы**
- Системы наведения и управления беспилотных ЛА
- Исполнительные устройства систем управления ЛА
- Методы исследования динамических систем в среде MATLAB
- **Спецглавы теории автоматического управления**

**Bauman Mytishchi, department K1, specialization for launch vehicles and spacecraft (F4):**
- Year 3: Основы теории управления; Основы теории пилотажно-навигационных систем; Технические средства навигации и управление движением
- Years 4–5:
  - **Баллистика и навигация космических аппаратов**
  - **Системы управления ракет-носителей и космических аппаратов**
  - Спецглавы теории автоматического управления
  - Эксплуатация и испытания систем управления ЛА
  - Информационно-измерительные системы и устройства ЛА
- Employer partners: RKK Energia, TsNIImash, Gagarin Cosmonaut Training Centre.

### 6.4 The Mozhaisky Military Space Academy: found and not found

**Found:**
- Faculty 2 is «систем управления ракетно-космических комплексов и информационно-технического обеспечения». It teaches **24.05.06** alongside 09.05.01 and 27.05.01 (F7, 2018).
- Its departments (F6) are:
  - 21 автономных систем управления (autonomous control systems)
  - 22 бортового электрооборудования и энергетических систем ЛА
  - 23 управления организационно-техническими системами космического назначения
  - 24 информационно-вычислительных систем и сетей
  - 25 бортовых информационных и измерительных комплексов
  - 26 автоматизированных систем подготовки и пуска ракет космического назначения
  - 27 математического и программного обеспечения
- Faculty 1 teaches 24.05.01 and **24.05.04** (department 16, navigation–ballistics).
- The academy's own site `vka.spb.ru` gives admission rules and a 5-year term only.

**Not found:**
- The ОПОП, учебный план, аннотации рабочих программ, current specializations and professional competences for 24.05.06 at the academy.
- `vka.mil.ru` and `vuz.mil.ru/Perechen-specialnostei/24.05.06` returned 503 or reset the connection, both by curl and by WebFetch. The Wayback Machine is blocked by this environment's egress policy.
- By F1 §1.5 and §3.4 the professional competences come from Ministry of Defence qualification requirements. §1.15 allows state-secret content. A public syllabus may therefore not exist.

### 6.5 Mapping disciplines to Orbitlab's guidance, navigation and control, and Phase 4

| Discipline | Existing (roadmap id, where) | Phase 4 |
|---|---|---|
| ТАУ, спецглавы ТАУ; автоматы стабилизации | G03 loop inspector (PHYSICS.md §2d); G04 Bode, margins and step (§2f); E04 tuning, step and doublet (§2g); P05 slosh, bending and notch (§2b); measures `loop.*`, `step.overshoot` | none |
| Динамика полёта | Point-mass and six-DOF (P01, §2a); aero tables P03; losses `loss.*`; `maxQ`; U07 ГОСТ 20058-80 notation (§2c); E01 frames (§2k) | none |
| Системы ориентации и стабилизации (КА) | Launch-vehicle attitude only (the six-DOF autopilot) | **D06 attitude core** `src/orbit/attitude.ts`: gravity-gradient, solar, aero and magnetic torques; `wheelMomentumCyclic`, `biasMomentum`, `slewTorque`, `torquerDipole`, `thrusterForce`, `momentumDumpForce`, `pointingLoss`. Validated against Starin and Eterno §19.1 (NTRS 20110007070) |
| Инерциальные навигационные системы; гироскопические приборы; астронавигация | G02: IMU grades (navigation, tactical, MEMS), GNSS, outage window, star tracker, Kalman filter (§2h); `nav.positionError`; hook `gnssOff` | none |
| Системы управления РН и КА; наведение | G01 PEG and IGM (§2j); G07 Kurs rendezvous (§9.2); G06 escape | D07 (requirements to orbit) |
| Эксплуатация и испытания СУ; отказы | G08 FDIR with three IMUs (§2i); presets: Proton-M 2 Jul 2013 (yaw rate sensors installed inverted), Ariane 501, Vega VV17 (`fault-config.ts:46–60`); E04 flight tests | none |
| Баллистика (выведение, точность) | G05 Monte Carlo 3σ (§2l); P08 one dispersed run; `orbit.perigeeMiss`; launch windows (§7); F01 corridors and impact | none |
| Баллистика и навигация КА; контроль космического пространства (24.05.04) | R01 SGP4; R03 passes; R04 uncertainty growth; M01 conjunctions and CDM covariances; M03 re-entry with B fitted to the tracking (`src/orbit/ballistic.ts`); P07 lifetime | D06 Δv and disposal core (IADC) |
| Определение орбит (orbit determination) | **Gap.** No orbit determination from observations (range, angles, Doppler). The nearest are the B fit, the element-set age uncertainty and the covariances the CDM carries | none planned |

### 6.6 Lessons (Engineer; Russian vehicles; ГОСТ notation shown)

**S1 `ru-soyuz-margins`: «Запасы устойчивости автомата стабилизации на max q» [heavy].** ТАУ; ОПК-7, ОПК-8.
- Mission: Soyuz-2.1a, Baikonur, `crew` 7 150 kg, `iss`, six-DOF. This is the accepted six-DOF reference. Everything is locked; `endEvent evt.maxQ`.
- Criteria:
  - `outcome survived`
  - `answer loop.wcAtMaxQ, tolPct 10`
  - `answer loop.pmAtMaxQ, tolPct 10`
  - `measure loop.gmAtMaxQ, min 6`

**S2 `ru-bins-astro`: «БИНС с астрокоррекцией без ГНСС» [heavy, calibrate].** Инерциальные НС; приборы астронавигации; ОПК-7.
- Mission: as S1 with `navigation: {grade: 'tactical', gnss: false, starTracker: true}`.
- Criteria:
  - `hook gnssOff`
  - `measure nav.positionError, max X`, with X from a worked flight plus 25 %
  - `outcome orbit`
- Variant: the star tracker off, to compare.

**S3 `ru-fdir-dus`: «Отказ ДУС: ФДИР против отказа по общей причине» [heavy].** Эксплуатация и испытания СУ ЛА.
- Mission: as S1 with `controlFaults: {faults: [{kind: 'gyroStuck', time: 30, units: [1]}], fdir: false}`. The student switches the FDIR on.
- Criteria:
  - `event evt.fdirImuIsolated, present`
  - `outcome orbit`
- Debrief: the Proton-M preset of 2 July 2013 inverted every yaw unit at once, so there was nothing for the vote to isolate.

**S4 `ru-3sigma`: «Точность выведения: разброс 3σ».** Баллистика; ОПК-8.
- Reuse built-in 2.4 `guid-monte-carlo`: `hook dispersedRun {seed: 1}`, `outcome orbit`, `answer orbit.perigee, tol 1 km`, `answer orbit.perigeeMiss, tol 1 km`.
- A Soyuz variant would need its own seed and a heavy test.

**S5 reuse `case-cz5b` and `case-iridium`.** Specializations of 24.05.04 (F2): баллистика спуска; контроль космического пространства. The case items are as listed in §1.1.

**S6 `ru-ka-oss`: «Возмущающие моменты и выбор маховика КА» [P4-design].** Принципы построения систем ориентации и стабилизации; ОПК-8.
- Start: a GEO communications template, or FireSat-like Earth observation, from the D06 templates.
- Criteria: `sat.wheelMargin min 1`, plus answers on the computed gravity-gradient and magnetic torques. **An answer kind for design measures is not in the planned `DesignCriterion`**, so either add one or keep to bounds.

---

## 7. Coverage at a glance

| App feature | IPST basic | IPST Earth/space | IPST physics | NKRAFA | 24.05.06 |
|---|---|---|---|---|---|
| Launch point-mass: `orbit.*`, `maxG`, `loss.*` | B1–B3 | A1, A2, A4 | P1–P3 | R1, R2 | none |
| Six-DOF autopilot, G03, G04, E04 | none | none | P4 | R3, R4 | S1 |
| G02 navigation | none | none | none | GNSS outage | S2 |
| G08 faults and FDIR | none | none | P4 | none | S3 |
| G05 Monte Carlo | none | none | none | none | S4 |
| G07 rendezvous | none | none | none | R5 | none |
| Cases: THEOS-2, CZ-5B, Iridium | B4, B5 | A3 | none | none | S5 |
| Passes (new case) | none | A5 | none | none | none |
| Phase 4 attitude core | none | none | P5 | R6 | S6 |
| Phase 4 power, eclipse and link cores | B6 | none | P6 | R6 | none |

## 8. Code work these lessons would need

None of this has been done here.

1. **Pack format:**
   - `pack` and `curriculum` fields, with `kind` extended by `'course'` and `'competence'`;
   - a way for a pack to list built-in lessons by reference.
2. **Case sheets:**
   - a fourth case, `iss-bangkok` passes (A5);
   - a space-weather item on `cz5b` (B5).
3. **Design kind** (planned in the map, not built), with these additions:
   - a torquer-dipole measure (P5);
   - an `answer` form for design measures (S6).
4. **Worked-solution tests:**
   - point-mass: P1 (Proton-M to `geo`) and P2 (Falcon 9 to `starlink`);
   - six-DOF: P4, R4, S1–S3 and the GNSS-outage lesson.
   - The nav-error bounds should be calibrated from those flights.
5. **Not in the app:**
   - orbit determination from observations (relevant to 24.05.04 and วอ 478's "time and future position");
   - Doppler on passes (IPST physics M.5 group 2 outcome 7).

## 9. What the owner should confirm or provide

1. **IPST scope and version.**
   - Which courses and grades the packs target: basic ว 2.2 M.5 and ว 3.1 M.6; Earth and space M.6; physics M.4 group 1 and M.5–6 group 3.
   - Whether schools will still teach the **2017 revision** in the target year, or a newer curriculum the packs must follow instead.
   - The chip code format (§1.5).
2. **Who reviews the Thai texts**, a science teacher. Whether IPST packs need Russian at all (the lesson tests require all three scripts for built-ins, `tests/lessons.test.ts:59–67`).
3. **NKRAFA: please provide:**
   - the actual course specifications (มคอ.3) for วอ 478, 526, 528, 529, 575, 362, 462, วฟ 511, EE 585 and 521: weekly topics, textbooks, software, assessment;
   - which cohort and programme (AE 2025 or 2020, ME, EE) the pack is for;
   - whether cadets would use it in the year-5 space-dimension elective;
   - the Tongsawang and Yuthayanon (2024) ADCS paper, for R6.
4. **NKRAFA naming and branding.** Is the pack allowed to name the academy and quote its programme documents (public Google Drive links on nkrafa.rtaf.mi.th)? Should it name NAPA-1 and NAPA-2 (map Q6)?
5. **Russian: whose programme is the model?** The Mozhaisky Academy's own 24.05.06 programme is not public. If you hold an unclassified syllabus you may lawfully share, provide it. Otherwise the pack follows ФГОС 3++ ОПК-7 and ОПК-8 and the civilian discipline lists (MAI С-12, Bauman K1).
6. **Russian specialty scope.** 24.05.06 only, or also 24.05.04 for ballistics and orbit determination, which is taught in the academy's faculty 1?
7. **Russian texts.** Who reviews them? Confirm the ГОСТ 20058-80 notation (U07) as the pack's standard.
8. **Military content.**
   - Confirm the rule: public, cited sources only; no lesson presents a non-public syllabus.
   - Accident presets (Proton-M 2013, Ariane 501, Vega VV17) and the anti-satellite debris cases are used only as documented public history.
9. **New lesson machinery (§8).** Approve these before the lessons that depend on them:
   - pack references to built-ins;
   - the new case sheets;
   - the design kind with the added measure and answer form.
10. **Sources to re-check.** Fetch these from a network that reaches them, or confirm the copies above suffice:
    - `physics.ipst.ac.th` (teacher manuals M4–M6);
    - `vka.mil.ru`, `vuz.mil.ru`;
    - `academic.obec.go.th` (Ministry copy).
