# Replay: a body in the air over a span of 4,000 s or more keeps the straight line / ชิ้นส่วนในบรรยากาศที่อยู่ระหว่างเฟรมห่างกัน 4,000 s ขึ้นไปใช้เส้นตรง

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ปัญหา (ข้อสังเกต A ของ agent ตัวที่สองใน #191): หลัง #191 ชิ้นส่วนที่อยู่ในบรรยากาศ (ต่ำกว่า 140 km) ที่เฟรมใดเฟรมหนึ่ง ถูกวาดด้วย cubic ระหว่างสองเฟรม โดยไม่จำกัดว่าเฟรมห่างกันแค่ไหน ถ้าการบันทึกถูก thin หนักจนเฟรมห่างกันเป็นชั่วโมง ชิ้นส่วนที่ยังโคจรอยู่โดยมี perigee อยู่ในบรรยากาศจะถูก cubic วาดเหวี่ยงออกไปไกลกว่าเส้นตรง เช่น วงโคจร 120 × 35,786 km ช่วงครึ่งรอบ cubic คลาด 22,386 km เส้นตรงคลาด 20,739 km
> - แก้: ใช้ cubic เฉพาะช่วงที่เฟรมห่างกันไม่ถึง 4,000 s ถ้าห่างกว่านั้นใช้เส้นตรงเหมือน main ก่อน #191 เป็นเงื่อนไขเพิ่มข้อเดียวใน `interpolateFrames` (src/physics/frame.ts) ส่วนอื่นไม่เปลี่ยน
> - ทำไมเป็น 4,000 s:
>   - ชิ้นส่วนที่โคจรโดยมี perigee ในบรรยากาศแบบไม่มีแรงต้าน (ทุกความรี รวมทั้งทางโค้ง suborbital): cubic ดีกว่าเส้นตรงทุกช่วงที่สั้นกว่าราว 5,100 s (ประมาณหนึ่งรอบของวงโคจรต่ำ)
>   - ชิ้นส่วนที่วงโคจรค่อยๆ ลดลงเพราะแรงต้าน: ด้วยบรรยากาศของเทสต์ cubic เริ่มแย่ตั้งแต่ 4,850 s ด้วยตารางบรรยากาศของการจำลองเอง บางช่วงที่จบตอนชิ้นส่วนดิ่งลงครั้งสุดท้าย cubic แย่กว่าได้ตั้งแต่ราว 1,000 s ซึ่งไม่มีเลขตายตัวค่าไหนกันได้หมด แต่โดยเฉลี่ย cubic ยังใกล้กว่าจนถึง 4,000 s (ตั้งแต่ 2,000 ถึง 4,000 s ไม่มีช่วงไหนที่ cubic แย่กว่าเลย)
>   - ชิ้นส่วนที่ตกใน 20 ภารกิจ: ไม่มีช่วงยาวขนาดนั้น ถึงจะ thin หนักมาก (agent ตัวที่สองลองงบ 1,500 เฟรมถึง T+400,000 s กับ 10 ภารกิจ) ช่วงที่ยาวที่สุดคือ 524 s ชิ้นที่ตกนานที่สุดอยู่ในอากาศ 23 นาที (fairing ของ Electron)
>   - 4,000 s จึงเก็บประโยชน์ของ cubic ไว้ได้เกือบหมด เช่น วงโคจรวงกลม 130 km ช่วง 2,000 s cubic คลาด 514 km เส้นตรง 4,165 km
>   - ร่างแรกใช้ 1,000 s; agent ตัวที่สองชี้ว่าเร็วเกินไปและเสนอ 5,000 s; วงโคจรที่ลดลงเพราะแรงต้านแย่กว่าได้ก่อน 5,000 s จึงเลือก 4,000 s
>   - ข้อเสีย: ชิ้นที่โคจรในช่วงตั้งแต่ 4,000 s จนถึงจุดที่ cubic เริ่มแย่ (ราว 5,000 s สำหรับวงโคจรต่ำ และ 11,000 s ขึ้นไปสำหรับวงรีมาก) ใช้เส้นตรงทั้งที่ cubic ยังใกล้กว่า
> - ภารกิจทั้ง 20 ไม่เปลี่ยนเลย: บันทึกถึง T+7,000 s เทียบ blend ของ #191 กับของงานนี้ทุกช่วงเฟรม point-mass 290,382 ครั้ง ต่างกัน 0 ครั้ง (ช่วงที่ใช้ cubic ยาวที่สุด 38.5 s) six-DOF 287,598 ครั้ง ต่างกัน 0 ครั้ง (ยาวที่สุด 60 s ในการบันทึกที่ถูก thin แล้ว)
> - เทสต์: 2 เทสต์ใหม่ใน `tests/debris-replay.test.ts` อันแรกล้มบนโค้ดของ #191 (ชิ้นส่วนถูกวาดห่างจากเส้นตรง 28,090 km) แล้วผ่านหลังแก้ อันที่สองยืนยันว่าช่วงต่ำกว่า 4,000 s ยังใช้ cubic สองเทสต์นี้ตรึงค่าขอบไว้ระหว่าง 3,900 กับ 4,100 s ไม่ได้เปลี่ยน assertion เดิม
> - ขนาด: +12 B ต่อ chunk (index และ flight worker) **อัปเดต 2026-10-31:** #184 merge และขึ้นเพดาน precache code เป็น 14,679 kB branch นี้ merge main ล่าสุด (f68faab) แล้ว ขนาดผ่าน: precache code 14,677,998 B (เหลือ 1,002 B) index 2,653,802 B (เหลือ 198 B) จึงไม่ต้องรอ #196 แล้ว #196 ยังช่วยเพิ่มที่ว่างใน index อีก 120 B
> - ฐาน: เจ้าของเลือกให้ต่อจาก #191 ที่ยังไม่ merge ("Stack on #191") PR นี้จึงมี commit ของ #191 อยู่ด้วย และต้อง rebase ลง main หลัง #191 merge
> - การตรวจโดย agent ตัวที่สอง: รอบแรกยืนยัน 19 จาก 28 ข้อ รอบที่สอง (ค่า 4,000 s) ยืนยัน 15 จาก 21 ข้อ ไม่มีข้อที่ขวางการ merge ข้อที่ควรแก้ (ค่าขอบ คำอธิบายเรื่องบรรยากาศ และตัวเลขในรายงานบางข้อ) แก้แล้วทั้งหมด

```yaml
item: replay debris blend, a span limit on the in-air cubic (the second agent's finding A on #191)
change_kind: bug fix (wrong → right) on #191's blend; no existing assertion changed; no ceiling raised (over by 15 B only with #187 also merged, see "D-38 raise case")
owner_authorization: 'owner in chat, 2026-10-30, asking for the follow-ups listed in docs/development/reports/replay-debris-air.md under "Not changed, for later" to be opened: "เปิดงานต่อยอดในอีกเซสชั่นครับ" ("open the follow-up work in another session"); this task is the second agent''s finding A there. Base: owner''s answer in this session, 2026-10-30, "Stack on #191 (Recommended)"'
app_code: src/physics/frame.ts
tests: tests/debris-replay.test.ts
base: 'claude/peaceful-planck-uyne6i at eec8352 (#191, open), on main 1842a86'
branch: claude/charming-bardeen-qdid5p
pr: 194
second_agent_review: 'confirmed 19 of 28, no blocking findings (2026-10-30, on 19f3aca + 01b8660/0932d7b); follow-up on 90adc83/3f7079a confirmed 15 of 21, no blocking findings; the should-fix findings of both are fixed: the limit moved from 1,000 to 4,000 s, the drag reasoning restated for the simulation''s own atmosphere, the report figures corrected'
```

## Cause

After #191, `interpolateFrames` (src/physics/frame.ts) draws a debris body that is alive at both frames, firing at neither, and inside `AIRLESS_RADIUS` (140 km up) at either on the cubic `hermite(d.r, d.v, other.r, other.v, u, span)`, whatever the span.

A recording keeps a coast frame at least every minute (`MAX_THINNED_GAP`, src/replay/recorder.ts) until it outgrows its frame budget; past that, `FlightRecorder.thin` drops coast frames without a floor, and spans of hours, or days, are possible. The body the second agent found (#191's report, finding A) is one the simulation keeps in orbit with its perigee in the air: sim/debris.ts flies a passive body on its Kepler arc once its orbit has `e < 1` and a perigee above 120 km, so a perigee of 120–140 km dips into the air on every pass. Over half an eccentric orbit the cubic swings out further than the line. From perigee of a 120 × 35,786 km orbit, at the worst instant of the span:

| span | cubic | line |
|---|---|---|
| 0.25 P (9,443 s) | 8,387 km | 11,357 km |
| 0.5 P (18,885 s) | 22,386 km | 20,739 km |
| 0.75 P (28,328 s) | 36,934 km | 31,631 km |

None of the 20 watch missions leaves such a body (the lowest perigee in orbit at T+7,000 s is Vostok-1's Blok E, 168 km, point-mass and six-DOF), and none overflows its budget enough to leave such a span. So this is unreachable today in the watch missions, and reachable in a user's own long mission.

## Change

In the debris blend, `out` (out of the air at both ends) is named, and the cubic needs `span < 4e3` as well:

```ts
const rigid = …, quiet = !d.burning && !other.burning,
  out = norm(d.r) > AIRLESS_RADIUS && norm(other.r) > AIRLESS_RADIUS;
…(quiet && !out && span < 4e3 ? hermite(…) : path(d.r, d.v, other.r, other.v, quiet && out)),
```

- Quiet, in the air at either end, span under 4,000 s: the cubic, as in #191.
- Quiet, in the air at either end, span of 4,000 s or more: `path(…, false)`, the straight line, as on main before #191.
- Quiet and out of the air at both ends: `path(…, true)`, the vehicle's way, unchanged.
- Firing at either end: `path(…, false)`, the line, unchanged.

`path`'s argument changes from `quiet` to `quiet && out`. For the body out of the air, and for the firing one, the value is the same as before; it differs only for the quiet body in the air, which used to take the cubic branch before reaching `path`. An infinite span now takes the line, where #191 gave NaN; NaN, zero and negative spans still return early (`!(span > 0)`).

The number is written inline: the minifier (Oxc, Vite 8's default under Rolldown) inlined a named `const` in the flight worker but not in the index chunk (8 B more there). The comments say why: the inline comment at the blend, and one sentence of the function's doc comment.

## Choosing 4,000 s

A fixed limit is the cheapest bound. The body's own period would tell a fall from an orbit, but a debris frame does not carry it, and computing it from `r` and `v` costs far more bytes than one comparison. A fixed limit should sit above the spans falls have, where the cubic helps, and below the spans at which the cubic swings a circling body out further than the line.

**Bodies circling with their perigee in the air** (gitignored scratch scans; the cubic and the line compared at 199 instants of each span, from starts anywhere inside 140 km, which by time reversal covers an end inside 140 km too):
- Drag-free, perigees of 120, 130 and 140 km, eccentricity 0 to 0.9999: the shortest span at which the cubic's worst instant is further off than the line's is about 5,214 s, a circle at 120 km (one period plus a second; the second agent's 2 s grid, the scan's coarser grid gave 5,254 s). Up to e = 0.6 it is about one period. Above that it falls as a share of the period: 0.52 P at e = 0.7, 0.41 P at 0.73 (a GTO), 0.23 P at 0.8. In seconds it never goes below 11,000 s there (about 11,035 s as e → 1).
- Drag-free, the wider family (perigee from 6,000 km inside the Earth to 140 km up, apogee 60 km to 400,000 km, only while the arc stays above the ground): the shortest crossover is about 5,106 s (a perigee at the ground, apogee 60 km: one period again). Arcs with their perigee inside the Earth (suborbital) never cross below 13,000 s.
- Decaying with drag, perigees of 100–119 km, apogees of 160–1,000 km, ballistic coefficients 100–1,000 kg/m², flown 2.2 periods or until they came down. The result depends on the atmosphere:
  - with the exponential atmosphere of tests/debris-replay.test.ts (1.225 kg/m³, 7.2 km scale height), the shortest crossover is 4,850 s (115 × 160 km, 1,000 kg/m²), then 4,860 s (110 × 160 and 119 × 160 km) and 4,980 s (115 × 250 km) (the second agent's re-run with uniform 10 s samples; my first script left gaps on the high arcs, which did not move the minimum);
  - with the simulation's own table (the second agent's scan; src/physics/atmosphere.ts `EXP_TABLE`, 2–3 times denser at 100–130 km, far thinner above 160 km) and 100 kg/m², typical of the simulation's upper stages, the earliest window in which the cubic loses is at or below 1,000 s, the scan's floor. Every such window ends in the body's last plunge (in the 4,850 s case too, from 112 down to 24 km). No fixed limit is free of them.
  - Over all windows, the cubic stays closer on average up to 4,000 s: for 115 × 160 km at 100 kg/m² with the simulation's table, it loses in 4.7 % of 1,000 s windows (163 against 1,049 km on average) and in none from 2,000 to 4,000 s (at 4,000 s, 6,561 against 9,220 km). With the test's atmosphere at 1,000 kg/m² it loses in none at 4,000 s and in 3.3 % at 5,000 s.

**The watch missions' falls get no such spans.** A span is blended only while the body is alive at both ends, and the watch missions' longest fall, Electron's fairings, is in the air for 1,351 s (point-mass; 1,020 s six-DOF). Nor does thinning stretch a fall's spans that far: pass 3 of `thin` (no floor) drops only coast frames, and most falls happen during ascent, burn or abort frames. A body decaying from orbit is the exception: it lives for hours and ends in a fall, while the vehicle's coast frames can be thinned without a floor (above). The second agent emulated thinning:
- a budget of 1,500 frames, 10 point-mass watch missions recorded to T+400,000 s: the longest stored gap was 15,360–357,294 s, and the longest span with a body in the air and alive at both ends 10–524 s (Vostok-1);
- a budget of 60 frames, all 20 missions to T+7,000 s (the recorder raised its own ceiling to about 458): the longest such span was 240 s.

So 4,000 s is 22 % below the drag-free crossover and 17 % below the drag crossover in the test's atmosphere; with the simulation's own atmosphere a decaying body's last plunge can favour the line from about 1,000 s, but on average the cubic is closer up to 4,000 s. It is far above any span a watch mission's fall reached. It is `4e3`, as short as `1e3`. Where the cubic helps it is kept: a 130 km circle over 2,000 s, 514 km from where the body was half way against the line's 4,165 km; over 3,900 s, 5,601 against 11,058 km.

The cost: a body circling with its perigee in the air, over a span from 4,000 s to its crossover (4,850 s or more), takes the line where the cubic was closer. A 130 km circle over 4,100 s: the cubic 6,561 km, the line 11,583 km; both are far off. Finding A's own spans gain less: the line is 8 % closer than the cubic over half a GTO and 14 % over three quarters, both more than 20,000 km off. Over a quarter of a GTO (9,443 s) the cubic was the closer one (8,387 against 11,357 km), and it now takes the line too. Only a recording thinned far past its budget leaves any of these spans.

**The falls themselves** (gitignored probe, all 20 watch missions point-mass to T+7,000 s, the simulation's own state at each of its steps, the 100 quiet falling bodies of 107): every window of the given length with an end inside 140 km.

| span | windows | cubic worse at its worst instant | mean worst error, cubic / line |
|---|---|---|---|
| 30 s | 9,941 | 0.1 % | 0.07 / 1.12 km |
| 60 s | 9,520 | 0.1 % | 0.69 / 4.59 km |
| 120 s | 8,684 | 2.4 % | 4.9 / 18.2 km |
| 300 s | 5,425 | 10.1 % | 32 / 71 km |
| 600 s | 2,506 | 24.1 % | 85 / 136 km |
| 1,000 s | 488 | 29.7 % | 197 / 338 km |
| 1,200 s | 112 | 44.6 % | 324 / 310 km (largest 1,047 / 552 km) |

On average the cubic is closer for a fall up to 1,000 s windows, and about level at 1,200 s, which only Electron's two fairings (76 windows) and Vostok-1's instrument-module shell (36) are in the air long enough to have. None of these long windows is a span a recording leaves (above). A first draft of this PR set the limit at 1,000 s from this table; the second agent showed that falls do not reach such spans, so the limit only acts on circling bodies, and recommended a higher one (5,000 s); the decaying orbits, which cross before 5,000 s, set it at 4,000 s.

## Measured: no watch-mission span changes

Probe (gitignored `tests/probe/span-bound.test.ts`): each watch mission built as the app builds it (`watchMissionSettings` from 2026-09-22, its rendezvous included), recorded through `FlightRecorder.advance(1)` to T+7,000 s, past orbit insertion. On every pair of consecutive stored frames, `interpolateFrames` from #191 (a copy of its frame.ts) and from this branch were compared at u = 0.13, 0.5 and 0.87: the whole frame, recursively with `Object.is`, where a body takes the in-air cubic, and the debris elsewhere. The run was made with the draft's 1,000 s limit; every span the 4,000 s limit sends to the line is one the 1,000 s limit sent there too, so it holds for both.

- **Point-mass, all 20:** 290,382 blends, 0 differ. 142,857 body-spans take the in-air cubic; the longest is 38.5 s (a Sputnik booster). The longest stored span is 70 s (Angara A5's coast, unthinned); two recordings thin once (Soyuz MS-10 and 18a, the aborts).
- **Six-DOF, all 20** (`defaultDynamics`, the 6,000-frame budget): 287,598 blends, 0 differ. 187,549 body-spans take the in-air cubic; the longest is 60 s (Electron's and Falcon Heavy's fairings, in recordings thinned 5 and 6 times). 11 of the 20 recordings thin, and none opens a gap over 60 s (`MAX_THINNED_GAP`).

The falls' time in the air: point-mass, fairings 790–1,350 s (Electron's the longest), Vostok-1's instrument-module shell 1,341 s, first stages and boosters 263–458 s; six-DOF, the shell 1,339 s, Electron's fairings 1,020 s, the H-IIA first stage 822 s.

## Tests

`tests/debris-replay.test.ts`, a new describe, 'a body in the air between two frames far apart', with 2 tests (13 in the file):
- **'keeps the line over a span of 4,000 s or more, where in an eccentric orbit the cubic swings out further'.** A body kept in a 120 × 35,786 km orbit, from its perigee (in the air), beside the spacecraft coasting in orbit. Over 0.5 P and 0.75 P the test first checks that the cubic's worst instant is more than 1,000 km further from where the body was than the line's (22,386 against 20,739 km; 36,934 against 31,631 km), then that the drawn body is on the line, position and velocity. A body in a 130 km circular orbit over 4,100 s is on the line too.
- **'keeps the cubic over a span under 4,000 s'.** The same circle over 900 s: within 30 km of where the body was half way (22.8 km); the line is more than 900 km off (930 km); the vehicle keeps its own arc. Over 3,900 s: on the cubic (within 1 m of it), more than 5,000 km closer to where the body was than the line (5,601 against 11,058 km).

The pair pins the limit to (3,900, 4,100] s. Mutants: no bound, 4,200 s and 5,000 s fail the first test; 1,000 s and 3,800 s fail the second; 3,950 s and 4,050 s pass both.

**Failing first:** on #191's frame.ts the first test fails: the drawn body is 28,090 km from the line's point half way across a GTO span (the cubic). The second passes on both, as a guard. With the change, 13 of 13 pass. No existing assertion changed.

**Related files:** 37 test files that reach `interpolateFrames`, `captureFrame`, `FlightRecorder`, the replay player or the session (all but the watch-mission flight files, which capture frames and never blend them), with bundle-budget, repo-hygiene, frames-view, rigid-debris and recovery-return among them: 576 tests, all pass, with the 1,000 s draft and again with 4,000 s. On the branch with main (#187) merged in, those plus #187's `tests/rigid-replay-arc.test.ts`: 38 files, 592 tests, all pass. With main f68faab (#193, #184) merged in, the same search finds 40 files: 619 tests, all pass. With #191's latest head (main 089b34e, #189 included) merged in: 40 files, 622 tests, all pass. `npx tsc --noEmit -p .` is clean.

## Size

`npx vite build`, `node scripts/bundle-budget.mjs`: no ceiling raised. **Now (2026-10-31) it passes:** #193, #184 and #189 merged into main (089b34e); #184 raised the ceilings (precache code to 14,679,000 B, `index-*.js` to 2,654,000 B). This branch carries #191's latest head (b974bf8, main merged in) since 1fdd97c.

| | main (089b34e) | this branch (main + #191 + this) | with #196 too (trial merge) |
|---|---|---|---|
| `index-*.js` (ceiling 2,654,000 B) | 2,653,772 B | 2,653,803 B (+31; 197 B left) | 2,653,683 B (317 B left) |
| `flight.worker-*.js` | 570,507 B | 570,539 B (+32) | 570,419 B |
| precache code (ceiling 14,679,000 B) | 14,677,929 B | 14,677,992 B (1,008 B left) | 14,677,752 B (1,248 B left) |

On f68faab, before #189, the same columns were 2,653,771 / 2,653,802 / 2,653,682 B and 14,677,935 / 14,677,998 / 14,677,758 B.

8-character build stamp. Before #184, between 228f880 and 522188c, the branch failed the precache code ceiling by 15 B (below), and CI's build job failed on it.

Earlier figures, on the old ceilings:

| | #191's head (eec8352) | this change on #191 | with #187 merged too (this branch now) |
|---|---|---|---|
| `index-*.js` | 2,634,861 B | 2,634,873 B (+12) | 2,634,898 B |
| `flight.worker-*.js` | 570,498 B | 570,510 B (+12) | 570,535 B |
| precache code (ceiling 14,654,000 B) | 14,653,941 B | 14,653,965 B (35 B left) | **14,654,015 B (15 B over)** |

The last column was first a trial merge, and is now this branch after merging main (228f880), with the same figures. The second agent reproduced every figure in this table. With #196 merged as well (a trial merge of its branch into this one): `index-*.js` 2,634,778 B, `flight.worker-*.js` 570,415 B, precache code 14,653,775 B, 225 B left; bundle-budget passes, and `tests/debris-replay.test.ts` with `tests/rigid-replay-arc.test.ts` pass, 29 of 29.

## D-38 raise case: the owner chose the offset (nothing is raised); no longer needed

**Update 2026-10-31:** #184 raised the precache code ceiling to 14,679,000 B (its own D-38 case), so this branch passes without the offset (Size, above). #196 stays open as headroom for `index-*.js`, the tightest group on main (229 B left), and no longer has to merge first.

With #187 merged, #191 and this PR together go 15 B over the precache code ceiling. The four parts D-38 asks for, as put to the owner:

1. **Measured size:** precache code 14,654,015 B against 14,654,000 B, on the trial merge above. `index-*.js` 2,634,898 B (ceiling 2,635,000 B) and `flight.worker-*.js` 570,535 B (589,000 B) stay under theirs.
2. **What grew it:** the replay blend in `interpolateFrames`, which every byte counts twice (index and flight worker): #191, debris through the air, +19/+20 B; #187, the six-DOF vehicle's arc, +25/+25 B; this PR, the span limit, +12/+12 B.
3. **Named identical-output offset:** one local `arc(x, y) = hermite(x.r, x.v, y.r, y.v, u, span)` in `interpolateFrames` for its four cubic calls (the in-air debris, Apollo's CSM, ascent stage and service module). Measured on the same trial merge: −137 B per chunk (index 2,634,761 B, worker 570,398 B), precache code 14,653,741 B, 259 B left with all three merged; the second agent reproduced it, and 29 of 29 tests pass with it. It changes no output: the same function on the same arguments. Not in this PR (an identical-output change does not mix with a bug fix, SESSION-PROTOCOL §5).
4. **Owner's decision** (in chat to this session, 2026-10-30, after #187 merged): "Offset PR first (Recommended)", the option "I open the identical-output helper as its own small PR on a new branch (you authorize that package and branch now). #191 and #194 then fit with no ceiling raise. #194 stays red on budget until the offset merges." The other options were a raise to 14,654.1 kB here, or holding for a decision on the Merge Desk.

The offset is **#196** (branch `claude/replay-arc-offset`, on main ef9d3f6). On main, #191's debris call is not there yet, so its `arc` serves Apollo's three calls only: −120 B per chunk (index 2,634,747 B, worker 570,383 B), precache code 14,653,712 B. Merge order: #196, then #191, then this PR (stacked on #191; #191 alone with #196 also fits, at 14,653,751 B). (D-63 puts identical-output work first in a lane unless a P0/P1 bug in the same files goes before it; I found no P0/P1 mark on #191 or this PR.)

## Merging with #191 and #187

- **#191:** this branch is #191's head plus this change, as the owner chose. Once #191 merges (squashed), this branch is rebased onto main, which leaves only this PR's commits.
- **#187 (merged at ef9d3f6):** main is merged into this branch (228f880). The doc comment of `interpolateFrames` conflicted, as it does for #191: #187's moved comment is kept, with its "anything else in a straight line" replaced by this branch's sentence (the cubic for a body falling through the air, a straight line over a span of 4,000 s or more, the line for one firing its engines). The code merged cleanly. #187's 'leaves a body in the air, or under its own thrust, on the line…' asserted the in-air line #191 fixes; as #191's report says for whichever merges second, its in-air body now fires its engines, and the test is 'leaves a body under its own thrust, in the air or out of it, on the line while the vehicle takes its arc'. #191's own branch will need the same two changes when it syncs with main.
- **#193 and #184 (merged 2026-10-30/31):** main merged into this branch (5fe66da) with no conflict.
- **#191's new head and #189 (2026-10-31):** #191 merged main (#187, #189, #193, #184) into its own branch (b974bf8), resolving #187's conflicts as this branch had. Merging it here (1fdd97c) conflicted only on two comments: #191's test comment was taken, and this branch's doc-comment sentence (with the 4,000 s limit) kept. This PR's own diff over #191 is now four files: frame.ts, the test, the report and the fragment.
- **#189** caps a thinned coast at a frame every ten minutes until every other pass has nothing left to give (`MAX_COAST_GAP`), and records a coast in the air every 2 s with the dense flight. A span of 4,000 s with a body in the air now comes only from the last, floorless pass, rarer still than before; the limit stays as the bound for it.
- **#196:** merges cleanly into this branch (trial merge above), before or after it.

## Second-agent review

Done on 19f3aca (the 1,000 s draft) with the records commits 01b8660 and 0932d7b, review only. **Confirmed 19 of 28 checks, no blocking findings.**

Confirmed:
- **Logic:** the four cases are exactly as stated. Against #191, only quiet + in the air + a long span changes, to `path(…, false)`, i.e. `lerpVec` for both `r` and `v`, the same values as main's line. The vehicle's path, the rendezvous, Apollo and held, landed or ground-turning bodies are untouched. `span` is the outer `b.t - a.t`. No input is mutated.
- **Tests:** 13 of 13 on the branch; on #191's frame.ts the long-span test fails on `toEqual(lerp)` and the guard passes. Its mutants pinned the draft's limit to (900, 1,100]. Routing the long span to `path(…, quiet)` (Kepler) fails too. `toEqual` is exact (frame.ts's `lerpVec` and vec3's `lerp` are the same formula).
- **Test numbers:** 22.8 and 929.8 km; 28,089.8 km on #191; the GTO table; the 130 km circle at 1,100 s.
- **Watch missions:** the point-mass totals recomputed from the probe's output, and five missions re-run with matching output; the six-DOF totals from the output. Vostok-1's pilot cannot be affected: he is in the air for his whole life as a body, 771 s at most.
- **The falls table:** every row, and the 1,200 s windows' bodies.
- **Sizes:** every figure in the size table and the D-38 offset, from its own builds; type check clean on the branch and the trial merge.

Findings, fixed in 90adc83 and 3f7079a:
1. **The case for 1,000 s rather than a higher limit (should-fix, the owner decides).** Falls rarely get spans that long even thinned hard (its emulation above), so the limit acts on bodies circling with their perigee in the air, where 1,000 s gives up much of the cubic's gain (a 130 km circle over 2,000 s: 514 against 4,165 km). It suggested 5,000 s, the same length in bytes and under every drag-free crossover, and noted that decaying orbits flown with drag were not measured. **Fixed:** measured those (above); they cross from 4,850 s, so 5,000 s would not be sound there, and the limit is 4,000 s. The new tests pin it to (3,900, 4,100] s.
2. **"The scan of the rest is still running" was stale.** Fixed: the wider scan's minimum, about 5,106 s.
3. **5,254 s and 11,255 s were the scan's grid values.** Fixed: about 5,214 s and 11,035 s, at the second agent's finer grid.
4. **"esbuild inlined a named const":** the minifier is Oxc under Rolldown (Vite 8). Fixed.

Notes, fixed too: the falls table covers the 100 quiet bodies of 107; first stages and boosters are in the air 263–458 s; the D-63 gloss is qualified; the fragment says "not on every span past it". One note stays: 19f3aca's commit message gives the longest in-air cubic span as 38.5 s without saying point-mass (six-DOF: 60 s); the records say both.

**Follow-up review** of 90adc83 (the 4,000 s limit) and 3f7079a (the report). **Confirmed 15 of 21, nothing blocking.**
- Confirmed: only the literal and comments changed in the code; 13 of 13 tests, the long-span test failing on #191's frame.ts; the mutants pin (3,900, 4,100] (`<=4e3` would also pass); the sizes, branch and trial merge; the drag-free, emulation, cost, falls-table and size figures; the review section.
- The decay scan's method is sound, but its sampling left gaps on the high arcs (2 s steps above 160 km, recorded only on a 10 s grid). The 160 km-apogee rows had none, so the minimum stands: 4,850 s, re-run with uniform 10 s samples. Fixed in the text above (4,860 and 4,980 s for the next cases).
- **Should-fix, fixed here:** the 4,850 s crossover holds only with the test's atmosphere. With the simulation's own table, a decaying body's last plunge can favour the line from about 1,000 s, so "at least 17 % below every crossover with drag or without", the fragment's "on every span under 4,850 s" and the Thai "ก่อนหน้านั้น cubic ดีกว่าเสมอ" were overstated. On average the cubic stays closer up to 4,000 s; "Choosing 4,000 s" now says so.
- **Should-fix, fixed here:** "Falls never get such spans", the CHANGELOG's "not falling" and the frame.ts comment's "not falling" were overstated: a decaying body ends in a fall, and the emulation covered 10 missions. 90adc83's commit message has the same wording and stays as it is.
- Notes, fixed: the Thai downside range; "all fixed in this commit"; the P0/P1 gloss now says no mark was found.

## Not changed, for later

- **The cubic for falls on long spans.** On real falls the cubic's worst instant is further off than the line's on 0.6 % of 90 s windows, 2.4 % of 120 s windows and 10 % of 300 s windows (table above), though on average it stays closer up to 1,000 s. Spans like these come only from a recording thinned hard, and the emulation never left a fall one over 524 s. #191's follow-up (keep falling bodies' frames from being thinned, as event frames are) would remove them.
- **Circling bodies from 4,000 s to their crossover**, and over a quarter of an eccentric orbit, take the line where the cubic was closer (above). The body's own period would recover that, at more bytes.
- **A decaying body's last plunge.** With the simulation's atmosphere, a window that ends in a decaying body's final fall can favour the line from about 1,000 s, and no fixed limit avoids it. Like the falls above, it needs a recording thinned far past its budget; keeping a falling body's frames from being thinned would remove it too.
- **#191's debris call through `arc`:** once #196 and #191 are both on main, the in-air debris call can use `arc` as well, 17 B less per chunk.
