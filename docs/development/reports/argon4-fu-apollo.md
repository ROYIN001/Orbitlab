# Argon4 follow-up 3: Apollo 11's lunar targeting worked out for each launch

**สรุปภาษาไทย.** ตามคำตัดสินของเจ้าของ (17 ต.ค. 2569, "ถ้าบินได้จริงในทางฟิสิกส์ในอนุญาตให้บินได้แต่คำนวนเส้นทางและค่าต่างๆตามจริง")
อะพอลโล 11 ที่ปล่อยเวลาอื่นหรือเข้าวงโคจรจอดอื่น จะบินไปดวงจันทร์ได้ถ้าแบบจำลองบินได้จริง โดยคำนวณการจุด S-IVB
(TLI) และทุกการจุดเครื่องยนต์หลังจากนั้นสำหรับการปล่อยครั้งนั้นเอง ไม่ได้เล่นซ้ำค่าของเที่ยวบินจริง ส่วนการปล่อยของจริง
(range zero เข้าวงโคจรจอดเดิม) ยังบินเหมือนเดิมทุกบิต (ตรวจด้วย hash ทุกก้าว) การปล่อยที่บินไม่ได้ (หาวิถีไม่ได้
เชื้อเพลิง S-IVB ไม่พอ ภารกิจเลยตารางดวงจันทร์ หรือเป็นยานอื่น) คงอยู่ในวงโคจรจอดพร้อมข้อความบอกเหตุผล
เจ้าของตอบคำถาม 3 ข้อแล้ว (18 ต.ค. 2569, "8.2 ข. 8.1ค 8.3ข", §8): ตารางดวงจันทร์/ดวงอาทิตย์ DE441 กลับเป็นสัปดาห์ของอะพอลโล 11
(16–24 ก.ค. 1969, D-11 คงเดิม) ตรงกับตารางบน main ทุกบิต จึงบินไปดวงจันทร์ได้เฉพาะการปล่อยวันที่ 16 ก.ค. 1969
เวลา 13:32:00–13:40:45 UTC (รวมการแก้วงโคจรจอด) การปล่อยหลังจากนั้นทุกนาทีและทุกวันคงอยู่ในวงโคจรจอด
ข้อ 8.1 (จุดลงจอดสำรองของ 18 และ 21 ก.ค.) และ 8.3 (ระนาบวงโคจรจอดผ่านดวงจันทร์เป็นค่าเริ่มต้น) เป็นงานแยกภายหลัง
(M-ORBIT-068, M-ORBIT-069 ใน R8) ไม่ได้ทำใน PR นี้

- Package: Argon4 review follow-up, workstream 3 (C01, Apollo 11 part 6c onwards). Change type: physics (behaviour change for launches other than the flown one; the flown launch identical).
- Authorization: the owner's answer to question 5 of the Argon4 review, chat, 2026-10-17, recorded in docs/DECISIONS.md "Decided 2026-10-17 (Argon4 review follow-up, chat)", row "— (Apollo 11 dates)": "ถ้าบินได้จริงในทางฟิสิกส์ในอนุญาตให้บินได้แต่คำนวนเส้นทางและค่าต่างๆตามจริง".
- Base: 7f991f9 (origin/main b16b09e + the owner's decisions commit). Branch `ws/3-apollo-targeting`, fragment `changes/claude-charming-archimedes-01p1h5-apollo.md`. Rebased as `pr/apollo` onto origin/main 1dd8d94 (79d2686 and a records commit).
- Reviewers: two agents reviewed (astro, identity; their findings and what was done, §11); the owner answered the three questions of §8 on 2026-10-18, and §12 says what was done with the answers.

## 1. What changed for the user

- **Before** (base 7f991f9, the one-second rule of 1293372): only the `apollo11` spacecraft launched within a second of range zero flew to the Moon, and it flew the flown injection even into an edited parking orbit. Any other second or day stayed in its parking orbit with `evt.lunarProfileOff`.
- **Now:** the flown launch (range zero, the flown parking orbit) flies exactly as before. Any other launch of the spacecraft whose whole mission fits in the Moon's one-week table — launched from 13:32:00 to 13:40:45 UTC on 16 July 1969, into the flown parking orbit or an edited one — has its translunar injection worked out in the parking orbit it actually reached, and flies on to lunar orbit, the landing at Tranquility Base, the rendezvous, the burn home and a splashdown at its own recovery point, each burn aimed for that flight. The event log says "TLI worked out: T+… min, C3 …, … kg spare" (`evt.tliPlanned`).
- A launch the model cannot fly stays in its parking orbit with the reason: another spacecraft or a mission outside the Moon's table (`evt.lunarProfileOff`; its wording names both, the table's span "16–24 Jul 1969" and that it is the mission that must lie inside it — every launch after 13:40:45 on 16 July, and one before the table's start, gets it), no injection found (`evt.tliUnsolved`; §4 says what stops the solver), or one the S-IVB lacks the propellant for (`evt.tliPropellant`, with the kilograms it would have and needs).
- A computed flight gone wrong stops at a sound state: no LOI outside the sphere of influence or off the planned approach, no "lunar orbit" with no apolune, a burn not found is not flown (`evt.burnSkipped`: LOI, DOI or TEI, named in each language by the timeline's own label, `tl.evt.loi`, `tl.evt.doi`, `tl.evt.tei`), the Moon's ground (`evt.impact`) and the Earth's air below 80 km (`evt.stackReentry`) end the flight.
- The planning runs once, in the step ten seconds after the parking orbit is reached: 0.71–1.61 s of computation in that step (§4.1, sweep-week `planMs`; 0.73–2.39 s over the earlier, wider sweep), so the view pauses once for up to about two seconds.

## 2. The physics

**The gate.** `ApolloFlight.begin` (src/physics/sim/apollo.ts): the flown launch is `apollo11`, |launch − 13:32:00 UTC| < 1 s, and the parking orbit's settings equal `APOLLO11.parking` (183.2 × 186.0 km, 32.521°, node 359.624°, azimuth 72.058°: the watch mission's). Any other launch is flown only if (1) `inEphemerisTable` holds the launch and the launch + 196.3 h (the flown splashdown's mission time, 195.3 h, plus an hour), (2) `planTli` converges, and (3) the S-IVB's propellant left at the steering's predicted cut-off, m_prop − (m_ign − m_cut), is at least the tail-off's propellant plus one second of flow (`VehicleModel.tailoffReserve(e, ṁ) + 1 s·ṁ`, 266 kg in the sweep). The table ends on 24 July 1969 at 18:00 TDB (17:59:20 UTC), so (1) holds from 13:32:00 to 13:40:45 UTC on 16 July only (§3, §8.2).

**The aim.** The flown MCC-2 aim at the same mission times: perilune 60.0 n mi (111.1 km) over the landing site's radius at 75:53:35 after the launch, latitude 0.17° N (`APOLLO11.mcc2`).

**The solver** (src/physics/sim/tli-target.ts, `planTli`):

1. The parking orbit is propagated as `step` flies it: point mass with J2, the Moon and the Sun as third bodies, the S-IVB's vent along the velocity taking its mass (10-s RK4 steps, cached).
2. The burn's length L is found from the rocket equation on the restart's operating points (795 kN, 432.4 s, then 894.4 kN, 428.7 s after the mixture shift) for Δv = √(2μ/r_p + C3_flown) − v, r_p the stack's radius plus 36.6 km (the flown conic's perigee, 6,599.4 km, over the flown parking orbit's mean radius). The burn's middle is sought within half a revolution of the flown one's.
3. First guess, two bodies: the ellipse in the parking plane with perigee r_p that reaches the Moon's distance R at the arrival, e = 1 − r_p/a, cos ν = (a(1 − e²)/R − 1)/e, t(R) = (E − e sin E)·√(a³/μ), a by bisection so that t(R) is the time to the arrival; the burn's middle where the Moon (projected into the plane) is ν ahead of the stack.
4. Unknowns (C3, w, k). The conic's plane contains the Moon's arrival direction m̂: n = n₀ cos k − m̂ sin k. n₀ is first the plane through m̂ nearest the parking orbit's, then turned about m̂ by the angle ψ that minimises the steering effort to reach it by the burn's end, ∫a² = 12y²/T³ − 12yẏ/T² + 4ẏ²/T (y, ẏ the stack's distance and speed across the plane, T = the burn's length); turning about m̂ keeps where the conic meets the Moon. The perigee is w round from m̂ in that plane, at r_p, with speed √(2μ/r_p + C3); the ignition is L/2 before the stack passes the perigee's direction.
5. Newton's method on three misses, the Jacobian by forward differences (200 m²/s², 2·10⁻⁵ rad), each step held to 5·10⁴ m²/s² and 0.01 rad, at most 12 iterations a pass, three passes:
   - (i) as an impulse at the perigee, against the B-plane 6 h before the arrival: the osculating hyperbola about the Moon, its incoming asymptote S, B = (S × ĥ)·h/v∞; the aimed B-vector |B*| = r_p,☾ √(1 + 2μ_☾/(r_p,☾ v∞²)) in the plane through S nearest the Moon's equator, retrograde; misses B·T, B·R (km) and the hyperbola's perilune time, t_p = t − (e sinh F − F)/√(μ_☾ (v∞²/μ_☾)³) (min);
   - (ii) the same against the burn `TliGuidance` predicts for its own steering (start-up, mixture shift, tail-off, J2), solved afresh at each iterate;
   - (iii) the burn against the true perilune, coasted from the predicted cut-off with every force (`coastToPerilune`): height (km), time (min), latitude (km of arc); done at 1 km, 0.05 min, 1 km.
   The last pass's predicted cut-off mass is what the propellant gate reads.

**After the injection** (apollo.ts, `computed`): the flown timeline by mission time, each burn aimed for this flight. Evasive burn: the flown 6.0 m/s, pointed where it leaves MCC-2 least to do — the arrival's misses linear in the burn and in the correction, m ≈ m₀ + J_e Δv d, the correction J_m⁻¹(m₀ + Δv J_e d), minimised over the sphere of directions d (5° grid, then 0.5°). MCC-2, LOI-1, LOI-2 as for the flown flight (the reported LOI Δv is v_rel − √(μ_☾(2/r − 1/a)) for the 169.7 × 60.0 n mi orbit). DOI when the LM is half a revolution plus the powered descent's range (482.3 km) short of the site. Lift-off: the first time within half a revolution of the flown one the CSM leads the insertion point by the planned distance (secant). CSI, CDH, TPI, the docking, the jettison and the separation from the lift-off and docking. TEI: secant searches for its time (perigee height) and size along the velocity (perigee time) towards the flown entry's vacuum perigee, then `targetEntry` at the latitude that gives; the recovery point is the flown entry's down-range arc and bearing offset applied from where this entry meets the air.

**Guards** (apollo.ts): LOI-1 fires only inside `LUNAR_SOI` with the perilune predicted from there above the ground, under 1,000 km and due when the flown one was (±10 min); a lunar-orbit burn whose end state has a ≤ 0, an infinite apolune or a perilune under the site's radius ends as a coast (`evt.spsCutoff` warn), never as a lunar orbit; `checkSurfaces` ends the flight at the Moon's ground or the Earth's air below 80 km; a touchdown faster than 5 m/s over the ground is an impact.

**Not modelled for computed flights:** the spacecraft is weighed as the flown one was at each burn (as for the flown flight), so the SPS and LM propellant are not budgeted; only the S-IVB's is. The landing keeps Tranquility Base and the flown mission times; inside the window the Sun stands 10.7°–10.8° over the site, as for Eagle (question 8.1, answered: the alternate sites are a later package).

## 3. The table (task c, then the owner's answer 8.2)

**What ships: Apollo 11's week, as on main, packed.** The owner kept D-11 (8.2 (ข), §8): the Moon is Apollo 11's week only. The Horizons text tables in docs/data/horizons/ are again those of the 2026-09-27 fetch (198 rows, 1969-07-16 13:00 to 07-24 18:00 TDB; identical to main's, `git diff` empty). `make-ephemeris.py` keeps the packing of b89b36b (each column as integers in m and 10⁻⁷ km/s, its first four values then its fourth differences; `unpack` sums them back and divides) and now reads the span it writes in the file's header from the tables. src/data/ephemeris-1969.ts is regenerated from them. Checks (probe tests/probe/week-identity.probe.ts, output /tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/probes/apollo/week/week-identity.txt):

| Check | Result |
|---|---|
| Every unpacked value against main's table (`git show b89b36b^:src/data/ephemeris-1969.ts`, the same file as origin/main's), element by element (`Object.is`) | Moon 1,188 of 1,188, Sun 1,188 of 1,188 identical; jd0, step and count (198) identical |
| The script run twice | the same file (`cmp`) |
| tests/lunar-ephemeris.test.ts: the whole table's doubles, SHA-256 | the one-week table's hash, Moon and Sun |
| Five-point d/dt(r) against the velocity column, every hour (from the earlier table check over these rows) | Moon worst 2.05·10⁻⁴ m/s, Sun 2.23·10⁻⁴ m/s (the test allows 3.1·10⁻⁴) |
| `inEphemerisTable` | true from 16 July 12:59:20 to 24 July 17:59:20 UTC, false a second outside |

The packed source is smaller than main's: the index chunk 2644.1 → 2634.8 kB, flight.worker 579.8 → 570.4 kB (§6).

**Before the answer (background).** Commit b89b36b extended both tables to 1969-08-01 00:00 TDB (372 rows; fetched 2026-10-17 05:40 with the 2026-09-27 settings) so that later launches could be flown, identical to the one-week table over its rows (probe table-check2.probe.ts, /tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/probes/apollo/run/table-check2.txt: the Moon at 357,923–403,957 km and within 382 km of the low-precision series over all 372 rows). That extension's data is reverted; its encoding and script are kept. A longer table returns only with D-11's condition, a general Moon with its own validation (M-ORBIT-068 waits for it).

## 4. Before and after, the sweep (task a)

### 4.1 Inside the window: what ships

Probe tests/probe/sweep-week.probe.ts with measure.ts (as in §4.2: point-mass, calm, seed 1, one `step(suggestedDt())` at a time to splashdown or 200 h), on the final code with the one-week table; output /tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/probes/apollo/week/sweep-week.jsonl (sweep-week-table.md), 109.6 s. Rows: the flown launch; the flown orbit settings launched 1 s, 2 min, 3 min 56 s (the setup panel's window for the flown plane), 5 min, 8 min 45 s (13:40:45, the gate's last second) and 8 min 46 s late; twelve parking-orbit edits at range zero, and five of them again at 13:40:45. Columns as in §4.2 (\* there).

| Launch (sweep-week row) | Parking orbit | Converged / stop | TLI Δv* m/s | C3 km²/s² | TLI plane° | S-IVB left kg | Perilune after TLI km, s | MCC-2 m/s | LOI-1 m/s | Landing miss m | Sun el.° | Splash miss km | Plan ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| flown:range zero | 181x183 32.52° | flown | 3195 | -1.3902 | 1.18 | 1742 | 1310.3, -2272 | 3.98 | 889.3 | 3 | 10.7 | 5.4 | — |
| window:+1 s | 180x183 32.52° | yes | 3196 | -1.4331 | 0.895 | 1721 | 191.8, -104 | 4.63 | 888.1 | 3 | 10.7 | 2.6 | 784 |
| window:+2 min | 180x183 32.52° | yes | 3197 | -1.4332 | 0.896 | 1785 | 192.8, -107 | 4.63 | 888 | 3 | 10.7 | 2.8 | 705 |
| window:+3:56 | 180x183 32.52° | yes | 3197 | -1.4339 | 0.898 | 1820 | 179.3, -86 | 4.63 | 888 | 3 | 10.7 | 2.6 | 805 |
| window:+5 min | 180x183 32.52° | yes | 3197 | -1.435 | 0.899 | 1828 | 147.6, -37 | 4.64 | 887.9 | 3 | 10.7 | 2.3 | 718 |
| window:+8:45 (13:40:45) | 180x183 32.52° | yes | 3198 | -1.434 | 1.178 | 1798 | 182.5, -92 | 4.63 | 887.9 | 3 | 10.8 | 1.2 | 848 |
| window:+8:46 (13:40:46) | 180x183 32.52° | lunarProfileOff | — | — | — | — | — | — | — | — | — | — | — |
| edits rz:190x190 | 187x190 32.52° | yes | 3195 | -1.4336 | 0.895 | 1553 | 175.4, -80 | 4.63 | 888 | 3 | 10.7 | 2.2 | 834 |
| edits rz:170x170 | 167x170 32.52° | yes | 3200 | -1.4333 | 0.894 | 2005 | 191.9, -106 | 4.63 | 888 | 3 | 10.7 | 2.2 | 762 |
| edits rz:350x350 | 197x200 32.52° | yes | 3155 | -1.4333 | 0.891 | 669 | 130.4, -22 | 4.63 | 888.1 | 3 | 10.7 | 2 | 853 |
| edits rz:300x300 | 161x325 32.52° | tliPropellant (0 kg < 266) | — | — | — | — | — | — | — | — | — | — | 781 |
| edits rz:183x400 | 181x183 32.52° | yes | 3177 | -1.4311 | 1.176 | 1051 | 195.7, -106 | 4.62 | 888.3 | 3 | 10.7 | 2.2 | 841 |
| edits rz:inc 32.0 | 180x183 32° | yes | 3194 | -1.4334 | 0.605 | 934 | 177.5, -81 | 4.64 | 888.2 | 3 | 10.7 | 2.3 | 749 |
| edits rz:inc 33.0 | 180x183 33° | yes | 3200 | -1.4339 | 1.186 | 1745 | 177.8, -68 | 4.64 | 888 | 3 | 10.7 | 2.1 | 887 |
| edits rz:inc 29.0 | 180x183 29.33° | tliUnsolved | — | — | — | — | — | — | — | — | — | — | 708 |
| edits rz:raan 358.0 | 181x183 32.52° | yes | 3225 | -1.4357 | 2.639 | 1412 | 157.1, -54 | 4.63 | 888.7 | 3 | 10.7 | 1.3 | 870 |
| edits rz:raan 359.0 | 180x183 32.52° | yes | 3190 | -1.4331 | 0.293 | 1900 | 201.3, -122 | 4.64 | 888.2 | 3 | 10.7 | 2.3 | 971 |
| edits rz:raan 0.5 | 180x183 32.52° | yes | 3240 | -1.4333 | 2.959 | 873 | 194.3, -94 | 4.58 | 887.9 | 3 | 10.7 | 1.6 | 956 |
| edits rz:raan 1.0 | 180x183 32.52° | tliUnsolved | — | — | — | — | — | — | — | — | — | — | 1285 |
| edits +8:45:190x190 | 187x190 32.52° | yes | 3196 | -1.4348 | 1.179 | 1632 | 156.1, -51 | 4.64 | 887.9 | 3 | 10.8 | 2.5 | 843 |
| edits +8:45:350x350 | 197x200 32.52° | yes | 3167 | -1.4338 | 1.767 | 652 | 133, -15 | 4.62 | 888 | 3 | 10.8 | 1.5 | 803 |
| edits +8:45:inc 33.0 | 180x183 33° | yes | 3201 | -1.4351 | 1.192 | 1254 | 153.4, -43 | 4.64 | 887.9 | 3 | 10.8 | 2.1 | 832 |
| edits +8:45:raan 358.0 | 180x183 32.52° | yes | 3224 | -1.4352 | 2.635 | 1186 | 187.4, -101 | 4.63 | 888.4 | 3 | 10.8 | 6.6 | 953 |
| edits +8:45:raan 0.5 | 180x183 32.52° | yes | 3244 | -1.4351 | 2.852 | 1139 | 181.5, -93 | 4.57 | 887.9 | 3 | 10.8 | 2.3 | 1609 |

Reading it:

- **Every computed launch that converged flies the whole mission:** 19 of 19 reach splashdown at 195.3 h with no warning. MCC-2 4.57–4.64 m/s (the flown flight 3.98 m/s in the model); perilune after TLI 130–201 km at −122 to −15 s against the aimed 111.1 km at 0 s; LOI-1 887.9–888.7 m/s; landing 3 m from Tranquility Base with the Sun 10.7°–10.8°, as Eagle had it; splashdown 1.2–6.6 km from the flight's own recovery point; 652–2,005 kg left in the S-IVB.
- **The gate:** 13:40:45 flies; 13:40:46 stays in its parking orbit with `evt.lunarProfileOff`.
- **Each other reason, inside the window:** 300 × 300 km leaves the S-IVB short (`evt.tliPropellant`; the event's `kg` is the propellant left, shown as 0 when short, against 266 kg needed). 29° (the node kept at 359.6°: the pad is not under that plane at lift-off, and the ascent ends off it, at 29.0° with its node at 342.3°, with 2,978 m/s left, less than the cheapest injection's 3,190 m/s) and the node at 1.0° (the turn into the Moon's plane past the steering's yaw, §4.2 "What stops the solver") give `evt.tliUnsolved`.
- **More edits, to the planning only** (probe tests/probe/window-stops.probe.ts, /tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/probes/apollo/week/window-stops.txt; 51 launches to 10,500 s: 13:40:45 plans, 13:40:46 and 13:41:00 stay with `evt.lunarProfileOff`, and 16 edits each at range zero, +5 min and +8:45): the node at 0.7°, 0.8°, 1.0°, 1.5° and 2.0° gives `evt.tliUnsolved` at all three times, 0.6° flies at range zero (713 kg spare) but not at +5 min or +8:45, 358.0° flies (1,187–1,412 kg); 29°, 30° and 35° (ascent off the plane, 2,978–3,070 m/s left) `evt.tliUnsolved`; 31° and 34° `evt.tliPropellant`; 250, 280 and 300 km circular `evt.tliPropellant`; 350 km circular flies (652–691 kg; the ascent reaches it by a raise from about 197 × 200 km).

### 4.2 The earlier sweep, with the table to 1 August (background for M-ORBIT-068 and M-ORBIT-069)

Run before the owner's answers, with b89b36b's table to 1 August 1969 (§3). With the one-week table every row below launched after 13:40:45 on 16 July — the `window` rows from +10 min, every `days` row and every `matched` row but the first — now stays in its parking orbit with `evt.lunarProfileOff`. The rows inside the window (flown, +0.02 and +3.93 min, the `edits`, the first `matched`) are the same flights as in §4.1, which gives the same figures where the two sweeps share a row (the table is the same over the week). This sweep is kept as the background of the two later packages: the planners' alternate landing sites (M-ORBIT-068) and a parking plane through the Moon as the setup panel's default (M-ORBIT-069).

Probe tests/probe/sweep.probe.ts with measure.ts (each launch flown point-mass, calm, seed 1, one `step(suggestedDt())` at a time to splashdown or 200 h), output /tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/probes/apollo/run/sweep6.jsonl, 176.85 s. It ran on the code before the event keys were merged (§1): its `lunarProfileTable` rows are `evt.lunarProfileOff` now, its `loiSkipped`/`teiUnsolved`/`doiSkipped` `evt.burnSkipped`; nothing else changed in the physics after it. Groups: `window` = 16 July, minutes after range zero, flown orbit settings; `days` = 13:32 UTC on later days, flown orbit settings; `edits` = 16 July range zero with one orbit field changed; `matched` = a parking plane through the pad at lift-off and the Moon at the arrival (tests/probe/matched-plane.ts), the azimuth left to the model. sweep6.jsonl also holds eight `daysWindow` rows (17–24 July at the setup panel's window time for the flown plane, 13:32:00 on the 17th to 13:04:29 on the 24th), left out of the table: their outcomes are the `days` rows' (17 July flies with the same figures, 18–23 July `tliUnsolved`, 24 July past the table).

\* TLI Δv by the rocket equation at 432 s from the masses at ignition and cut-off (the probe's estimate). "Perilune after TLI": coasted from 20 s after the cut-off, before the evasive burn, height over the site's radius and time from the aimed 75:53:35 (aim 111.1 km, 0 s). Landing miss in metres from Tranquility Base; splash miss in km from the flight's own recovery point. "Plan ms": the planning step's time.

| Launch (sweep6 row) | Parking orbit | Converged / stop | TLI Δv* m/s | C3 km²/s² | TLI plane° | S-IVB left kg | Perilune after TLI km, s | MCC-2 m/s | LOI-1 m/s | Landing miss m | Sun el.° | Splash miss km | Plan ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| flown:range zero | 181x183 32.52° | flown | 3195 | -1.3902 | 1.18 | 1742 | 1310.3, -2272 | 3.98 | 889.3 | 3 | 10.7 | 5.4 | — |
| window:+0.02min | 180x183 32.52° | yes | 3196 | -1.4331 | 0.895 | 1721 | 191.8, -104 | 4.63 | 888.1 | 3 | 10.7 | 2.6 | 893 |
| window:+3.93min | 180x183 32.52° | yes | 3197 | -1.4339 | 0.898 | 1820 | 179.3, -86 | 4.63 | 888 | 3 | 10.7 | 2.6 | 1283 |
| window:+10.00min | 180x183 32.52° | yes | 3198 | -1.4354 | 1.179 | 1771 | 144, -33 | 4.64 | 887.9 | 3 | 10.8 | 0.8 | 792 |
| window:+20.00min | 180x183 32.52° | yes | 3199 | -1.4362 | 1.184 | 1252 | 141.1, -10 | 4.64 | 887.8 | 3 | 10.9 | 1.6 | 1099 |
| window:+30.00min | 180x183 32.52° | yes | 3199 | -1.4361 | 1.186 | 367 | 155.8, -42 | 4.64 | 887.7 | 3 | 10.9 | 2 | 1044 |
| window:+40.00min | 180x183 32.57° | tliPropellant -493<266 | — | — | — | — | — | — | — | — | — | — | 874 |
| window:+50.00min | 180x183 32.56° | tliPropellant -1688<266 | — | — | — | — | — | — | — | — | — | — | 889 |
| window:+60.00min | 180x183 32.52° | tliUnsolved | — | — | — | — | — | — | — | — | — | — | 1333 |
| window:+90.00min | 180x183 32.32° | tliUnsolved | — | — | — | — | — | — | — | — | — | — | 1400 |
| window:+120.00min | 180x183 32.25° | tliUnsolved | — | — | — | — | — | — | — | — | — | — | 1380 |
| window:+180.00min | 181x183 32.53° | tliPropellant -4632<266 | — | — | — | — | — | — | — | — | — | — | 730 |
| window:+249.00min | 181x184 38.66° | tliUnsolved | — | — | — | — | — | — | — | — | — | — | 1385 |
| days:Jul 17 13:32 | 180x183 32.52° | yes | 3231 | -1.4958 | 2.926 | 1316 | 188.5, -104 | 4.59 | 885.9 | 3 | 22.9 | 6.6 | 847 |
| days:Jul 18 13:32 | 180x183 32.52° | tliUnsolved | — | — | — | — | — | — | — | — | — | — | 1258 |
| days:Jul 19 13:32 | 180x183 32.52° | tliUnsolved | — | — | — | — | — | — | — | — | — | — | 1537 |
| days:Jul 20 13:32 | 181x183 32.52° | tliUnsolved | — | — | — | — | — | — | — | — | — | — | 1776 |
| days:Jul 21 13:32 | 181x183 32.52° | tliUnsolved | — | — | — | — | — | — | — | — | — | — | 2157 |
| days:Jul 22 13:32 | 180x183 32.52° | tliUnsolved | — | — | — | — | — | — | — | — | — | — | 2068 |
| days:Jul 23 13:32 | 180x183 32.52° | tliUnsolved | — | — | — | — | — | — | — | — | — | — | 2383 |
| days:Jul 24 13:32 | 180x183 32.52° | lunarProfileTable | — | — | — | — | — | — | — | — | — | — | — |
| edits:190x190 | 187x190 32.52° | yes | 3195 | -1.4336 | 0.895 | 1553 | 175.4, -80 | 4.63 | 888 | 3 | 10.7 | 2.2 | 840 |
| edits:170x170 | 167x170 32.52° | yes | 3200 | -1.4333 | 0.894 | 2005 | 191.9, -106 | 4.63 | 888 | 3 | 10.7 | 2.2 | 809 |
| edits:300x300 | 161x325 32.52° | tliPropellant -812<266 | — | — | — | — | — | — | — | — | — | — | 825 |
| edits:183x400 | 181x183 32.52° | yes | 3177 | -1.4311 | 1.176 | 1051 | 195.7, -106 | 4.62 | 888.3 | 3 | 10.7 | 2.2 | 893 |
| edits:inc 32.0 | 180x183 32° | yes | 3194 | -1.4334 | 0.605 | 934 | 177.5, -81 | 4.64 | 888.2 | 3 | 10.7 | 2.3 | 831 |
| edits:inc 33.0 | 180x183 33° | yes | 3200 | -1.4339 | 1.186 | 1745 | 177.8, -68 | 4.64 | 888 | 3 | 10.7 | 2.1 | 759 |
| edits:raan 359.0 | 180x183 32.52° | yes | 3190 | -1.4331 | 0.293 | 1900 | 201.3, -122 | 4.64 | 888.2 | 3 | 10.7 | 2.3 | 792 |
| edits:raan 0.5 | 180x183 32.52° | yes | 3240 | -1.4333 | 2.959 | 873 | 194.3, -94 | 4.58 | 887.9 | 3 | 10.7 | 1.6 | 1000 |
| matched:1969-07-16T13:32 i 32.344 raan 357.982 | 181x183 32.34° | yes | 3226 | -1.434 | 2.642 | 1437 | 205.9, -130 | 4.62 | 888.5 | 3 | 10.7 | 6.8 | 840 |
| matched:1969-07-16T14:32 i 29.564 raan 358.434 | 180x183 29.56° | yes | 3212 | -1.4368 | 2.056 | 1908 | 210.6, -135 | 4.61 | 887.6 | 3 | 11.2 | 2.3 | 910 |
| matched:1969-07-16T15:32 i 28.612 raan 358.584 | 180x183 28.62° | yes | 3209 | -1.4424 | 2.048 | 1983 | 155.9, -51 | 4.64 | 887 | 3 | 11.7 | 2.2 | 1232 |
| matched:1969-07-16T16:32 i 29.348 raan 358.498 | 180x183 29.82° | tliUnsolved | — | — | — | — | — | — | — | — | — | — | 1293 |
| matched:1969-07-17T13:32 i 32.514 raan 359.595 | 180x183 32.51° | yes | 3231 | -1.4959 | 2.926 | 1353 | 185.6, -99 | 4.59 | 885.7 | 3 | 22.9 | 6.7 | 935 |
| matched:1969-07-18T13:32 i 32.775 raan 1.515 | 180x183 32.78° | yes | 3232 | -1.5654 | 2.931 | 1310 | 212.1, -126 | 4.61 | 882.3 | 3 | 35.1 | 6.4 | 847 |
| matched:1969-07-19T13:32 i 33.293 raan 4.246 | 181x183 33.29° | yes | 3234 | -1.6408 | 2.934 | 1229 | 265.5, -196 | 4.63 | 878.4 | 3 | 47.3 | 8 | 1013 |
| matched:1969-07-20T13:32 i 34.732 raan 9.503 | 181x183 34.73° | yes | 3248 | -1.7192 | 2.564 | 878 | 260.6, -148 | 4.56 | 874.8 | 3 | 59.5 | 8.6 | 1234 |
| matched:1969-07-21T13:32 i 45.05 raan 29.383 | 180x183 45.06° | tliUnsolved | — | — | — | — | — | — | — | — | — | — | 1436 |
| matched:1969-07-22T13:32 i 28.966 raan 323.525 | 181x183 29.01° | tliUnsolved | — | — | — | — | — | — | — | — | — | — | 1978 |
| matched:1969-07-23T13:32 i 29.153 raan 346.445 | 180x183 29.15° | yes | 3180 | -1.8631 | 1.178 | 2433 | 169.1, -37 | 4.43 | 861.4 | 3 | 83.9 | 14.2 | 952 |
| guards:another spacecraft | 183x184 32.52° | lunarProfileOff (then its orbit decays: `evt.reentry` at 11.8 h) | — | — | — | — | — | — | — | — | — | — | — |
| guards:launched 2026 | 180x183 32.52° | lunarProfileTable | — | — | — | — | — | — | — | — | — | — | — |
| guards:Jul 24 (past the table) | 180x183 32.52° | lunarProfileTable | — | — | — | — | — | — | — | — | — | — | — |

Every flight that converged reached splashdown at 195.3 h with no warning; none had `tliShort`. The flown row is the base's flight (identical, §5). Reading it:

- **A converged TLI reaches the aim when flown.** With every force, from the real cut-off, the perilune is 141–266 km at −10 to −196 s against 111.1 km at 0 s; the plan's own prediction is 110.1–111.6 km at −2 to +1 s (measure.ts `planPeri`, `planPeriT`). The difference is the flown burn's departure from the steering's prediction, not its cut-off time alone (probe tests/probe/sens.probe.ts, /tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/probes/apollo/fix/sens.txt, for the 13:42, 14:02 and 17 July 13:32 launches): the cut-off comes 0.002–0.003 s after the predicted one, and 20 s later the flight is 28–49 cm/s and 26–31 m from the prediction coasted to the same time, 5–10 cm/s of it along the velocity; the perilune moves 63–66 km and 93–96 s per 0.1 m/s along the velocity, so those 5–10 cm/s alone account for about 32–67 km of the 34–78 km the flights miss by. That is a few hundredths of the 3.2 km/s burn, and MCC-2 takes it out. For the 13:32:01 launch that miss alone would need an MCC-2 of 1.04 m/s; the evasive burn's 6 m/s, pointed the least costly way, raises it to 4.59 m/s (any other direction up to 21.26 m/s; probe evcost.probe.ts, evcost2.txt). In the sweep MCC-2 is 4.43–4.64 m/s, against the flown flight's 3.98 m/s in the model and 6.37 m/s flown. Aiming the injection with the evasive burn in it, as the planners did, would take most of the 3.5 m/s out; not done here.
- **The window on 16 July.** The real window ran 13:32–17:54 UTC (09:32–13:54 EDT; Nature 223, 1969, via a web search, not read in full), the launch azimuth turning with the time. The model keeps the parking plane the settings give: launched later into the flown node, the ascent doglegs to it and spends S-IVB propellant (367 kg left at +30 min, short at +40), and from +60 min it does not reach the node (`evt.offTargetOrbit`). Into the plane through the Moon (the `matched` rows) launches at 14:32 and 15:32 fly; 16:32 does not.
- **Later days.** The Moon's arrival direction is out of the flown parking plane (taken at the flown TLI time; probe geometry.probe.ts, geometry2.txt) by −0.44° on 16 July, +0.44° on 17 July, 1.30° on 18 July, 2.13°, 2.87°, 3.47°, 3.87° and 4.04° on 19–23 July. From the flown plane an injection is found up to 0.89° (`edits:raan 0.5`, conic 2.96° out of the parking plane, 873 kg left) and none from 1.30°. With a plane through the Moon, 17–20 and 23 July fly; 21 July needs 45° (azimuth out of the corridor in the model) and 22 July does not converge. Why, below.

**What stops the solver** (review follow-up; of its rows only the node edits are inside the one-week window, the rest now stop at the gate). `evt.tliUnsolved` is the solver's failure to converge, not by itself a proof that no injection exists. Every refused launch I traced gets through the impulse pass (i); it is the burn pass (ii) — or, once, (iii) — that runs its 12 iterations without converging. Probe tests/probe/dbg.probe.ts with a logging copy of `planTli` (tests/probe/tli-dbg.ts, written by /tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/probes/apollo/fix/mkdbg.py; output yaw.txt) records, for each iterate of the burn passes, the plane change the conic needs at the ignition, how long the steering's yaw sits at its limit (`TliGuidance.direction` holds the out-of-plane part of the thrust to ±0.2, a yaw of ±11.5°) and how far across the conic's plane the predicted burn ends; and `evt.parkingOrbit`'s Δv left in the S-IVB:

| Launch | Δv left in parking orbit, m/s | Plane change at ignition | Yaw at its limit, s (burn ≈ 330–380 s) | Across the conic's plane at cut-off, m/s | Outcome |
|---|---|---|---|---|---|
| 16 Jul +10 min | 3327 | 1.18–1.19° | 0 | 2.1–2.6 | flies |
| 16 Jul +30 min | 3235 | 1.19–1.20° | 0–1 | 2.5–3.1 | flies (368 kg spare) |
| node edited to 0.5° | 3309 | 2.97–2.98° | 10–70 | 3.1–5.1 | flies |
| 17 Jul 13:32 | 3330 | 2.96° | 6–10 | 5.0–5.1 | flies |
| 20 Jul 13:32, plane through the Moon | 3318 | 3.26–3.34° | 123–210 | 33–145 | flies |
| node edited to 0.7° | 3306 | 3.27–3.45° | 108–279 | 17–335 | pass (ii) does not converge |
| node edited to 0.8° | 3303 | 3.50–3.65° | 1–221 | 4–180 | pass (ii) |
| node edited to 1.0° | 3299 | 4.09–4.38° | 0–305 | 5–538 | pass (ii) |
| 18 Jul 13:32, flown plane | 3330 | 6.53–6.76° | 244–298 | 405–676 | pass (ii) |
| 19 Jul | 3324 | 10.31–10.54° | 292–318 | 752–1108 | pass (ii) |
| 20 Jul | 3312 | 13.54–13.83° | 311–342 | 1133–1313 | pass (ii) |
| 21 Jul | 3296 | 16.15–16.39° | 326–380 | 1420–1600 | pass (ii) |
| 22 Jul | 3275 | 17.79–18.32° | 329–381 | 1494–1894 | pass (ii) |
| 23 Jul | 3251 | 18.28–18.91° | 327–378 | 1458–2002 | pass (ii) |
| 21 Jul, plane through the Moon (45°) | 3240 | 5.89–6.07° | 227–305 | 332–710 | pass (ii) |
| 16 Jul +60 min | 3101 | 5.03–5.21° | 191–278 | 153–533 | pass (ii) |
| 16 Jul +90 min | 3023 | 7.99–8.27° | 245–298 | 528–988 | pass (ii) |
| 16 Jul +120 min | 2973 | 6.51–6.69° | 223–279 | 349–716 | pass (ii) |
| 16 Jul +249 min | 2311 | 3.23° | 13–55 | 6.0–7.5 | pass (ii) |
| 16 Jul 16:32, plane through the Moon | 2952 | 5.03–5.23° | 180–282 | 190–642 | pass (ii) |
| 22 Jul, plane through the Moon | 3136 | 2.97–3.02° | 79–198 | 9–127 | pass (iii) |

Two causes, then, neither of them the earlier text's "the plane change grows several times faster than the offset" as a proof:
- *The S-IVB is short whatever the steering does* (shown): the last six rows have 2,311–3,136 m/s left, less than the 3,190 m/s of the cheapest injection that converged from a 180 × 183 km orbit (sweep6 `edits:raan 359.0`, the probe's rocket-equation estimate; the +30 min launch, 3,235 m/s left for a 3,199 m/s injection, ends with 368 kg). They would be `evt.tliPropellant` if the solver got that far; the message says only that no injection was found.
- *The model's steering cannot turn that far* (shown for the model, not for the S-IVB): with enough Δv left, the injections the solver gives up on need a plane change of 3.3–18.9° at the ignition; the yaw then sits at its 11.5° limit for up to 380 s of the burn, which ends up to 2 km/s across the conic's plane, and Newton's method, its misses no longer smooth in the unknowns, does not converge. The launches that fly need 1.2–3.3° and the yaw at its limit for at most 210 s; the edge lies between the node edits of 0.5° (flies) and 0.7° (does not). Whether the real S-IVB, its yaw not held to 11.5°, could fly those injections and with what propellant is not shown here.

Solving the steering in the planner to 1 m and 10⁻⁵° instead of the flight's 100 m and 0.002° (the reviewer's suspected noise; `TliGuidance.update` with a tolerance, tried and not kept) changed no outcome in the 51 rows and MCC-2 by at most 0.01 m/s (/tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/probes/apollo/fix/sweep-tol.jsonl).

## 5. Tests run

Each file alone, `npx vitest run <file> --maxWorkers=2`, worktree at the final code (logs /tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/probes/apollo/run/t2-*.log):

| File | Result |
|---|---|
| tests/apollo-own-launch.test.ts | 11 passed (11) |
| tests/apollo-computed-guards.test.ts | 5 passed (5), after the review follow-up (4 before it) |
| tests/i18n.test.ts | 19 passed (19) |
| tests/lunar-ephemeris.test.ts | 8 passed (8) |
| tests/eo-phy-6/apollo11.test.ts | 1 passed (1) |
| tests/historical-vehicles.test.ts | 27 passed (27) |
| tests/watch-missions-flights-z.test.ts | 4 passed (4) |
| tests/panel-historical.test.ts | 3 passed (3) |
| tests/config-validation.test.ts | 36 passed (36) |
| tests/d06-satellite-spec.test.ts | 13 passed (13) |
| tests/d06-satellites-identity.test.ts | 3 passed (3) |
| tests/fx3-thai-moon-labels.test.ts | 11 passed (11) |
| tests/workspace-media.test.ts | 8 passed (8) |
| tests/mcp.test.ts | 90 passed (90) |
| tests/watch-missions.test.ts | 26 passed (26) |

Total: 15 files, 265 tests, all passed (264 before the review follow-up; the full rerun after it, 20 files, is in §11). On the base, tests/apollo-own-launch.test.ts had 5 tests and tests/lunar-ephemeris.test.ts 5 (both passed, base-tests.txt). `npx tsc --noEmit` clean.

Bit-identity of the flown launch, beyond eo-phy-6: probe tests/probe/flown-identity.probe.ts hashes every step's [t, r, v, mass, phase] in hex and every event from the pad to splashdown; base 7f991f9 and the final worktree give the same file (52,402 steps, state 0d2487d26af6…, events 67 50ec9c30862d…; flown-final.log "FLOWN-IDENTICAL").

New and changed tests:
- tests/apollo-own-launch.test.ts (5 → 11 tests): header the owner's decision of 2026-10-17; the one-second rule replaced. Kept: range zero is the flown second; the flown launch flies the flown injection (no plan); launched in 2026, another spacecraft — each stays in its parking orbit with `evt.lunarProfileOff` and no lunar events or Apollo frame, as before. The base's "an hour late" case now stays for another reason (`evt.tliUnsolved`; the ascent misses the flown node and the S-IVB has 3,101 m/s left, less than an injection takes, §4). New: 24 July (past the table), 40 minutes late (`evt.tliPropellant`, kg < need), 20 July into the flown plane (`evt.tliUnsolved`, the 13.5° turn into the Moon's plane past the steering's yaw, §4); and the 13:35:56 launch (the setup panel's window for the flown plane) computed to the Moon and home: plan, TLI on the planned C3 within 0.005 km²/s², perilune within 150 km and 5 min after the extraction, MCC-2 < 10 m/s, the SOI before LOI, no skipped burn, perilune 80–140 km, landing within 50 m, TEI found, entry −7.5° to −5.5°, splashdown with no warning.
- tests/apollo-computed-guards.test.ts (new, 5): MCC 20 m/s off → LOI not flown (`evt.burnSkipped` LOI), no lunar orbit, finite frame; LOI cut at 100 m/s → coast, `evt.spsCutoff` warn, no lunar orbit, no LOI-2; aimed 20 km under the surface → LOI not flown, `evt.impact`, failed; 3 km/s taken off after the extraction → `evt.stackReentry`, failed; and (review follow-up) the skipped burn named by its timeline label in en, ru and th.
- tests/lunar-ephemeris.test.ts (5 → 8): the first 198 rows' doubles hash to the one-week table's SHA-256; five-point derivative vs velocity column within 3.1·10⁻⁴ m/s; distances and the series within 500 km daily; `inEphemerisTable` edges.

Heavy suites: N/A — no heavy or six-DOF-fleet test flies `ApolloFlight` (tests/heavy/history-sixdof.test.ts flies lesson adv-apollo, satellite `apollo` without an injection, which `begin` leaves at once).

## 6. Budget

`npx tsc --noEmit && npx vite build`, then `node scripts/bundle-budget.mjs <build log>` (what `npm run build && npm run budget` runs), worktree against a scratch copy of 7f991f9 (git archive): budget-new4.log, budget-base.log.

| Group | Base | Now | Ceiling |
|---|---|---|---|
| index-*.js | 2643.2 | 2639.1 | 2645 |
| i18n-*.js | 1727.3 (1,727,299 B) | 1728.9 (1,728,925 B) | 1729 |
| flight.worker | 578.9 | 574.7 (574,688 B) | 589 |
| precache code | 14710.8 | 14683.0 | 14724 |

No ceiling raised. The first full version of the strings (nine messages with timeline labels) measured i18n 1734.4 kB, 5.4 kB over; the messages were cut to six keys (three reused: `evt.lunarProfileOff` for both begin reasons, `evt.impact`, one `evt.burnSkipped` with the burn's name) and shortened, leaving 106 bytes under the ceiling. The review follow-up (§11) reworded `evt.lunarProfileOff` and `evt.burnSkipped` (+31 B) and dropped two unused event params: the chunk is now 1,728,925 B, 75 B under; flight.worker 574,688 B (574.8 kB before the follow-up, as the review measured). Measured on the worktree with `npm run build` and `node scripts/bundle-budget.mjs` on its log (/tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/probes/apollo/fix/build-fix.txt, budget-fix.log: bundle budget ok, exit 0); index 2639.1 kB.

**Rebased onto main 79d2686** (with #157's lesson texts and #159's sky): the i18n chunk measured 1,729,299 B, 299 B over. Six of this PR's own strings were said in fewer words, the meaning kept (en, ru, th `evt.lunarProfileOff` without the repeated "no translunar injection"; en `evt.tliUnsolved` "No TLI found from this parking orbit"; en, ru `evt.burnSkipped` "off the plan"; en, th `evt.tliPropellant`): 1,728,985 B, 15 B under 1729 kB. Index 2639.9 kB of 2645. No ceiling raised.

**After the owner's answers (§12), on main 1dd8d94** (`npm run build`, then `node scripts/bundle-budget.mjs` on its log; main measured the same way on a scratch copy, `git archive origin/main`; /tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/probes/apollo/week/budget2.log and budget-main.log: bundle budget ok, exit 0):

| Group | main 1dd8d94 | Now | Ceiling |
|---|---|---|---|
| index-*.js | 2644.1 (2,644,052 B) | 2634.8 (2,634,809 B) | 2645 |
| i18n-*.js | 1727.7 (1,727,673 B) | 1729.0 (1,728,991 B) | 1729 |
| flight.worker | 579.8 (579,784 B) | 570.4 (570,440 B) | 589 |
| precache code | 14717.3 | 14653.3 | 14724 |

The one-week table, packed, takes 9.2 kB off the index chunk and 9.3–9.4 kB off each of the five workers that load the physics (flight, tune, monte-carlo, ratings, readiness). The i18n chunk: `evt.lunarProfileOff` naming "16–24 Jul 1969" and the mission ("its mission", "полёт", "ภารกิจ") measured 1,729,013 B, 13 B over; the ru and th sentences then left out the stack as their subject ("связка", "ยาน"): 1,728,991 B, 9 B under. No ceiling raised.

## 7. Docs touched

- docs/PHYSICS.md §13.10: the table's span; "Its own launch, or another worked out for it" replaces "Only from its own launch" (the gate, the aim, the solver's equations, the guards, the sweep's summary table).
- docs/IMPLEMENTATION-STATUS.md: (6c) the table's span; new (6h).
- docs/USER-GUIDE.md: the historical-flights paragraph (Apollo 11 at another time or orbit).
- README.md: the Moon's scope line — Apollo 11's week only, and the launches from 13:32:00 to 13:40:45 on 16 July (question 8.2, answered (ข)); the app's label `watch.moonScope`, "Apollo 11's week only (DE441 table)", is unchanged and true.
- After the answers (§12) each of these says the window: PHYSICS §13.10 (the table row as on main, the gate's window, the sweep table of §4.1), IMPLEMENTATION-STATUS (6c as on main, 6h the window), USER-GUIDE (up to 8 min 45 s late, the week 16–24 July).

## 8. Questions for the owner — answered 2026-10-18

The owner answered in chat on 2026-10-18, verbatim "8.2 ข. 8.1ค 8.3ข", recorded in docs/DECISIONS.md "Decided 2026-10-18 (Apollo 11's computed launches, chat)". Each answer is the option of that letter below:

- **8.2 (ข): back to the one-week table.** D-11 stands. Landed in this PR (§12): the table reverted to the week (§3), the gate unchanged, so computed launches fly from 13:32:00 to 13:40:45 UTC on 16 July only (§4.1); the tests and the docs say so; `watch.moonScope` stays as it is and is true.
- **8.1 (ค): the real alternates,** launches on 18 and 21 July landing at sites 3 and 5 at the planners' times, a separate package. With 8.2 (ข) no launch after 16 July flies, so it waits for a longer table: plan item M-ORBIT-068 in R8. Nothing built here.
- **8.3 (ข): the plane through the Moon as the setup panel's default** for Apollo 11 at another time, a separate package: plan item M-ORBIT-069 in R8. Nothing built here.

The questions as they were put:

**8.1 Where and when a launch on another day lands.** The model keeps the flown mission times (arrival 75:53:35 after the launch; the landing at 102.698–102.750 h in the sweep) and Tranquility Base, so the Sun stands higher at the landing each day later: 10.7° on 16 July, 22.9° on the 17th, 35.1° on the 18th, 59.5° on the 20th, 83.9° on the 23rd (sweep6). The planners held the Sun at 5°–14° above the site (ALSJ "Sun Angles", via a web search) and, for a launch on 18 or 21 July, would have landed at sites 3 (Sinus Medii) or 5 (Oceanus Procellarum) instead. Keeping the flown landing date instead needs a faster coast: probe fast-transfer.probe.ts (fast-transfer.jsonl) — launched 17 July 13:32 and aimed at the flown arrival (51.9 h coast), the injection converges with C3 +0.479 km²/s² (hyperbolic, no free return), 479 kg left in the S-IVB, the perilune 119.5 km, v∞ 1,777 m/s and an LOI-1 of 1,242 m/s by the probe's estimate at the perilune (902 m/s by the same estimate for the 16 July 13:32 launch on the flown coast); two days late (27.9 h) no injection is found.
- (ก) Keep it as now: any flyable day, Tranquility Base at the flown mission times; the Sun's height is what it is. Effect: every flyable launch lands; the landing light is not the planners'.
- (ข) Apply the planners' lighting rule: a launch whose landing would have the Sun outside 5°–14° flies to lunar orbit and home without landing (or stays in its parking orbit), with a message. Effect: only launches on 16 July land; the rest still fly the rest of the mission.
- (ค) The real alternates: launches on 18 and 21 July land at sites 3 and 5 at the planners' times. Effect: needs the sites' positions and the descent's targets from the press kit and Mission Report (a separate package); other days as (ก) or (ข).
- Proposal: (ก) now, (ค) later as its own package if wanted.

**8.2 D-11's label.** D-11 (2026-09-30) labels the Moon "Apollo 11's week only (DE441 table)" (app string `watch.moonScope`, README, IMPLEMENTATION-STATUS). The table now runs 16 July – 1 August 1969.
- (ก) Keep the extension for Apollo 11 only and update the label, e.g. "The Moon: Apollo 11 only, 16 July – 1 August 1969 (DE441 table)". Effect: launches to 23 July fly (the sweep); the i18n chunk has 75 bytes left, so the longer label needs the same number of bytes freed elsewhere or the owner's raise.
- (ข) Go back to the one-week table. Effect: the gate needs the launch plus 196.31 h (the flown splashdown's mission time plus an hour) inside the table, which ends 24 July 18:00 TDB (17:59:20 UTC), so only launches from 13:32:00 to 13:40:45 UTC on 16 July fly (the flown one and orbit edits at range zero included; probe tests/probe/gate-edge.probe.ts, /tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/probes/apollo/fix/gate-edge.txt). Every later minute — the sweep's +10, +20 and +30 min launches and the 14:32 and 15:32 launches into a plane through the Moon — and every later day stays in its parking orbit with `evt.lunarProfileOff`. A smaller margin than one hour would widen that a little. With the extended table the last launch the gate passes is 23 July 19:40:45 UTC.
- (ค) Other: e.g. a longer table for L01's general Moon, once it has its own validation (D-11's condition).
- Proposal: (ก). README and IMPLEMENTATION-STATUS already state the span as it now is; the app label `watch.moonScope` still reads "Apollo 11's week only (DE441 table)" in en, ru and th and is inaccurate for the launches of 17–23 July until the owner answers.

**8.3 The parking plane over the window.** The real launch azimuth turned with the launch time (72° at 13:32, larger later) so the parking plane passed through the Moon's arrival direction. The model's settings keep the plane fixed (node and inclination), so a launch more than about 30 minutes late into the flown plane runs the S-IVB short or misses the node (§4), while the same launch into the plane through the Moon flies (14:32, 15:32).
- (ก) Leave the plane to the user (as now). Effect: launches late in the window need a hand-set plane.
- (ข) For Apollo 11 at another time, offer the plane through the Moon as the default setting on the setup panel. Effect: the window behaves as the real one did, within the model's corridor; a UI change, its own package.
- Proposal: (ข), as a separate package.

## 9. D-25

After the owner's answers (`git diff --numstat origin/main`, main 1dd8d94): 773 changed hand-written source lines, 694 added and 79 removed (src/physics/sim/apollo.ts +399/−74, tli-target.ts +263, apollo11.ts +7, cislunar.ts +2/−1, the dictionaries +6/−1 each, ui/names.ts +5/−1; ephemeris.ts is main's again), besides the generated table (+37/−400) and its script (+71/−17); tests +267/−22. (780, 698/82, before the answers, with ephemeris.ts +6/−4.) Reason it is one PR: the owner's acceptance is a launch that flies "physically, computed for that launch" to the end, and a computed flight that cannot be completed must stop at a sound state. The injection without the computed DOI, lift-off, rendezvous timing and burn home would fly a computed launch into the flown flight's later burns at the wrong places (the guards would stop it in lunar orbit every time), so either half alone ships a flight the decision does not allow. The table's encoding is its own commit (b89b36b, then eaf4abb back to the week), identical double for double to main's table.

## 10. Probes

All under tests/probe/ (gitignored) and /tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/probes/apollo/run/: sweep.probe.ts + measure.ts + fly.ts + matched-plane.ts (sweep6.jsonl, sweep6-table.md), table-check2.probe.ts (table-check2.txt), make-ephemeris.py regenerated into probes/apollo/regen2 (regen-diff.txt), flown-identity.probe.ts (flown-final.txt against probes/apollo/flown-base.txt), geometry.probe.ts (geometry2.txt), fast-transfer.probe.ts (fast-transfer.jsonl; its rows for half-day offsets launch at night or need 50° and are not used), budget-new4.log and budget-base.log. evcost.probe.ts (evcost2.txt). After the answers, under /tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/probes/apollo/week/: week-identity.probe.ts (week-identity.txt, the table against main's), sweep-week.probe.ts (sweep-week.jsonl, sweep-week-table.md, sweep-week-report.md), window-stops.probe.ts (window-stops.txt), flown-identity.probe.ts (flown-week.txt), build2.log and budget2.log, build-main.log and budget-main.log, run-tests.sh and t-*.log.

## 11. Review follow-up

Two reviewers (astro, identity) found nothing in the physics to undo; what they raised, checked and dealt with:

- **Blocking: question 8.2 (ข) had the wrong effect.** Checked (probe tests/probe/gate-edge.probe.ts, /tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/probes/apollo/fix/gate-edge.txt): with the one-week table the latest launch the gate passes is 1969-07-16 13:40:45 UTC, not "16 July"; with the extended table, 23 July 19:40:45 UTC (`inEphemerisTable` true at that second, false one second later). 8.2 (ข) rewritten with that effect.
- **Should-fix: `evt.burnSkipped` put the ids LOI, DOI and TEI into the Russian and Thai sentences.** Checked: `rendezvousBurnName` fell back to the raw id. It now names them by the existing timeline labels (`tl.evt.loi`, `tl.evt.doi`, `tl.evt.tei`; src/ui/names.ts), and the ru and th sentences are reworded so the label reads as a noun ("Не выполнено: Выход на орбиту Луны — …", "ข้าม เข้าวงโคจรดวงจันทร์: …"). New test in tests/apollo-computed-guards.test.ts (each language, each burn: the label in the text, the id not in ru or th).
- **Should-fix: `evt.tliUnsolved` is the burn pass not converging, not proof that no injection exists.** Checked and confirmed; the cause traced (§4, "What stops the solver"): six of the refused launches have less Δv left than an injection takes (physically short), the rest need a plane change past the steering's ±11.5° yaw (a limit of the model's steering). §4, PHYSICS §13.10 and USER-GUIDE now say that, and the two tests' names say which cause they pin; the outcome they pin (`evt.tliUnsolved`) is unchanged. Not done: making the solver report the Δv-short launches as `evt.tliPropellant`, or flying the larger plane changes with a wider yaw for computed flights — either changes behaviour beyond the review's scope (§4 measures the first).
- **Nits fixed:** flight.worker figure (§6); the unused `plane` param of `evt.tliPlanned` and `alt` of `evt.burnSkipped` dropped; `evt.lunarProfileOff` now says "outside the Moon's table (16 Jul–1 Aug 1969)" (en, ru, th), true also for a launch before the table's start; 8.2 says the app's `watch.moonScope` label is inaccurate until answered; the eight `daysWindow` rows are named (§4); the perilune miss after TLI is put down to the burn's departure from its prediction, measured (§4), not to the cut-off's timing.
- **After the follow-up:** flown launch, every step and event: identical to the base (probe flown-identity.probe.ts, /tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/probes/apollo/fix/flown-head.txt against probes/apollo/flown-base.txt, identical after the line naming the tree, 52,402 steps, 67 events). Tests, each file alone with `--maxWorkers=2` (/tmp/claude-0/-home-user-Orbitlab/3b29ccd8-c1cf-5357-ad20-eb1820dc21bb/scratchpad/probes/apollo/fix/t3-summary.txt, t3-apollo-computed-guards.log): apollo-own-launch 11, apollo-computed-guards 5, i18n 19, lunar-ephemeris 8, eo-phy-6/apollo11 1, historical-vehicles 27, watch-missions-flights-z 4, panel-historical 3, fx3-thai-moon-labels 11, mcp 90, watch-missions 26, lesson-event-answers 9, control-faults 27, control-tuning 14, d06-custom-satellite 10, explicit-guidance 12, config-validation 36, d06-satellite-spec 13, d06-satellites-identity 3, workspace-media 8 — 20 files, 337 tests, all passed. `npx tsc --noEmit` clean. Budget ok, no ceiling raised (§6).

