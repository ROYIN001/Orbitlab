# Replay: an untargeted recovery's burns raise their events / การจุดเครื่องของชิ้นส่วนที่กู้คืนแบบไม่มีเป้าหมายมีเหตุการณ์ในบันทึก

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ปัญหา: เมื่อติ๊กกู้คืน booster แต่ไม่เลือกที่ลงจอด (ค่าเริ่มต้นของหน้า Build คือ "ลงตรงที่ตก" หรือเลือก downrange ในแผน) ท่อนแรกจะจุดเครื่องก่อนกลับเข้าบรรยากาศและจุดเครื่องลงจอด แต่ไม่มีเหตุการณ์ในบันทึก ทั้งแบบ point-mass และ six-DOF ขณะที่ท่อนที่บินกลับไปยังเป้าหมาย (LZ, drone ship, หอคอย) มีมาตลอด ไทม์ไลน์และบันทึกเหตุการณ์จึงไม่แสดงการจุดเครื่องสองครั้งนี้ และเครื่องบันทึกไม่ได้ปักเฟรมไว้ให้
> - แก้: ทั้งสองแบบส่ง `evt.entryBurnStart` และ `evt.landingBurnStart` ตอนเครื่องติด เหมือนทางที่มีเป้าหมายทุกอย่าง (ชื่อเหตุการณ์ ความรุนแรง พารามิเตอร์ และเวลาที่ประทับคือตอนจบ step ที่เครื่องติด) เครื่องบันทึกปักเฟรมทั้งสองข้างของ step นั้นเอง ข้อความแปล en/ru/th มีอยู่แล้ว
> - ใครเจอ: ทุกคนที่ติ๊กกู้คืน booster แล้วไม่เลือกที่ลงจอด ใน Falcon 9, Falcon Heavy และ Starship รวมถึงผ่าน MCP และไฟล์ภารกิจ ไม่มี watch mission หรือเที่ยวบินในตัวใดใช้ทางนี้ และไม่มี fingerprint หรือ golden ใดบินทางนี้ จึงไม่มีค่าใดต้องบันทึกใหม่
> - ผลต่อ replay ที่วัดได้: บิน 12 ภารกิจแบบ point-mass และ 4 แบบ six-DOF ที่ผู้ใช้ตั้งได้ ไม่พบช่วงใดที่การจุดเครื่องทั้งช่วงซ่อนอยู่ระหว่างสองเฟรมโดยไม่มี `burning` ที่ปลายใดปลายหนึ่ง ส่วนใหญ่จุดระหว่างขึ้นสู่วงโคจร (เฟรมห่าง 0.1–0.25 s) แกนกลางของ Falcon Heavy จุดเครื่องลงจอดหลังท่อนบนดับเครื่องแล้ว (เฟรมห่าง 10–35 s) แต่เฟรมถัดไปยังจุดอยู่ทุกครั้ง สิ่งที่หายไปจริงคือเหตุการณ์ในบันทึก
> - ข้อควรรู้: เหตุการณ์ประทับเวลาตอนจบ step เหมือนทางที่มีเป้าหมาย ในช่วงที่ยานลอยอยู่ step ยาวได้ 10–30 s จึงช้ากว่าเวลาที่เครื่องติดจริงได้ เช่น แกนกลาง Falcon Heavy (point-mass) ช้าไป 8.5 s ทั้งสองทางมีเหมือนกัน (บันทึกไว้ใน "Not changed, for later")
> - ขนาด: แก้ตรง ๆ จะ +292 B ในแต่ละ 7 chunk ที่มีการจำลอง (+2,044 B เกินเพดาน precache code 1,946 B และ index เกินเพดาน 0.1 kB) จึงแบ่งเป็นสอง commit: commit แรกย่อโค้ดเดิมโดยผลลัพธ์เหมือนเดิมทุกบิต (ส่งเหตุการณ์ของการกลับผ่าน helper เดียวในแต่ละไฟล์ และจับเหตุการณ์สัมผัสพื้นด้วย pattern เดียว) −220 B ต่อ chunk commit ที่สองคือการแก้ +164 B ต่อ chunk สุทธิ −56 B ต่อ chunk, precache code −392 B ไม่ขึ้นเพดาน ถ้า merge #191 และ #187 ด้วยยังเหลือ 401 B
> - คำถามถึงเจ้าของ: SESSION-PROTOCOL §5 ให้ PR หนึ่งมีงานชนิดเดียว (งานผลลัพธ์เหมือนเดิมไม่ปนกับงานชนิดอื่น) PR นี้มีทั้งสองชนิดใน commit แยกกัน ขอให้เลือก:
>   1. **(แนะนำ)** รับทั้งสอง commit ใน PR นี้ ไม่ขึ้นเพดาน
>   2. แยก commit แรกเป็น PR ของตัวเองก่อน แล้ว PR นี้ตามหลัง (ต้องให้ผม push อีก branch)
>   3. ตัด commit แรกออก แล้วขึ้นเพดานตาม D-38 (precache code +2.1 kB และ index +0.3 kB)
> - เพราะมีงานย่อโค้ดรวมอยู่ PR นี้จึงไม่เข้าเงื่อนไขอนุมัติถาวรสำหรับการแก้บั๊ก ต้องให้เจ้าของกดเอง
> - ผลการตัดสินใจ: เจ้าของเลือกข้อ 1 ("ข้อ 1 merge ได้เลย", 30 ต.ค. 20:02 UTC) merge แล้วเป็น `dcfa065` (20:23 UTC) และขึ้นเว็บแล้วด้วย Pages run 41122790689 (20:59 UTC)
> - เทสต์: เทสต์ใหม่ 3 อัน ล้มบน main ทั้ง 3 (ไม่มีเหตุการณ์) ผ่านเมื่อแก้แล้ว และเพิ่ม assertion ในเทสต์ six-DOF เดิมที่บินแบบไม่มีเป้าหมาย (ล้มบน main) ไม่ได้เปลี่ยน assertion เดิมข้อใด
> - การตรวจโดย agent ตัวที่สอง: ยืนยัน 7 จาก 8 ข้อ อีก 1 ข้อเป็นเรื่องถ้อยคำในรายงาน แก้แล้ว ไม่พบข้อที่ต้องแก้ก่อน merge ข้อสังเกตที่ไม่ขวางการ merge แก้แล้วหรือบันทึกไว้ใน "Not changed, for later"
> - CI: ผ่านทั้งหมดบน f8426ec (run 41111067263) และไฟล์ heavy ที่บินโค้ดส่วนนี้ผ่านทั้งหมด (starship-flight5, falcon-heavy-returns, sixdof-fingerprint 22 จาก 22)

```yaml
item: an untargeted recovery's entry and landing burns raise their events (bug fix; finding B of replay-debris-air)
change_kind: 'bug fix (wrong → right), after one identical-output commit that makes room for it (see Size); no ceiling raised; no existing assertion changed'
owner_authorization: 'owner in chat, 2026-10-30, asking for the follow-ups listed in docs/development/reports/replay-debris-air.md under "Not changed, for later" to be opened: "เปิดงานต่อยอดในอีกเซสชั่นครับ" ("open the follow-up work in another session"); this task is the second agent''s finding B there'
app_code: [src/physics/sim/debris.ts, src/physics/rigid/debris-runtime.ts, src/physics/sim/types.ts (comment)]
tests: [tests/recovery-untargeted-events.test.ts (new), tests/rigid-recovery.test.ts (assertions added)]
docs: [docs/PHYSICS.md (one paragraph's last sentences)]
base_sha_verified_on: {sha: 1842a86, date: 2026-10-30}
branch: claude/elegant-sagan-xxsloc
commits: {identical_output: ff7ea51, fix: 36d8bb3}
pr: 193
merged: {sha: dcfa065, at: '2026-10-30T20:23:22Z', ci: 41120470814, head: f64131c, owner_answer: 'ข้อ 1 merge ได้เลย (2026-10-30T20:02:07Z)'}
published: {pages: 41122790689, at: '2026-10-30T20:59:23Z', sha: dcfa065}
```

## Authorization (D-65)

The owner, in chat on 2026-10-30, asked for the follow-ups listed in docs/development/reports/replay-debris-air.md under "Not changed, for later" to be opened: "เปิดงานต่อยอดในอีกเซสชั่นครับ" ("open the follow-up work in another session"). This task is the second agent's finding B there.

## Cause

A recovered stage either has a target (`recovery.target`: a landing zone, a drone ship, a tower) or does not.

- **Targeted:** flown by `stepReturning` (src/physics/sim/debris.ts, point-mass) and `RigidDebrisRuntime.returnGuidance` (src/physics/rigid/debris-runtime.ts, six-DOF). Both raise `evt.boostbackStart`, `evt.boostbackEnd`, `evt.entryBurnStart` and `evt.landingBurnStart`.
- **Untargeted:** flown by the sub-step loop of `DebrisTracker.stepDebris` (point-mass: `rc.phase` goes `coast` → `entry` below 70 km → `landing`) and by `RigidDebrisRuntime.guidance` with `landingCommand` (six-DOF, for the stages in `RIGID_RECOVERABLE`). Both flew an entry burn and a landing burn and raised nothing.

The flight recorder pins the frames on both sides of every step that raises an event (`FlightRecorder.flyStep`, `pullEvents`). So an untargeted burn had no event in the log or on the timeline, and no pinned frame.

## Who reaches the untargeted path (task step 1)

`spawnStageDebris` and `spawnBoosterDebris` give a stage `recovery` when the vehicle is `recoverable` with a reserve kept back, and a `target` only for the plan modes `landingZone` and `droneShip` (`targetedRecovery`, src/physics/vehicle.ts). A stage is untargeted when:
- `boosterRecovery` is on with **no `recoveryPlan`**. This is what the Build panel flies when recovery is ticked and every body is left on its first choice, "downrange" (src/ui/panel.ts: a plan whose bodies are all `downrange` is stored as no plan). It is also MCP's `configure_mission` with `boosterRecovery: true` and no plan, and any mission file saved that way.
- a plan names **`{ kind: 'downrange' }`** for the core or a strap-on.

Vehicles:
- the three with `recoverable: true` in src/data/vehicles.ts: Falcon 9, Falcon Heavy (its core and its two side boosters; strap-ons need more than one engine) and Starship (Super Heavy);
- a custom vehicle whose spec sets `recoverable` and a `recoveryReserve` (src/config/vehicle-spec.ts accepts both): its first stage, and its multi-engine strap-ons, take the point-mass untargeted path.

In six-DOF only the stages in `RIGID_RECOVERABLE` fly burns (`falcon9:s1`, `falconheavy:core`, `falconheavy:side`, `starship:superheavy`); a recoverable custom vehicle's stage falls there without burns, as before.

Not reached by any built-in flight:
- **Watch missions** (src/ui/watch-missions.ts) set `boosterRecovery: !!m.recoveryPlan`, and every plan there is targeted: Bandwagon-1 and ORBCOMM-2 to LZ-1, Starship Flight 5 to the tower, Arabsat-6A to LZ-1, LZ-2 and the drone ship, Demo-2 to the drone ship.
- **Lessons:** the one built-in mission with recovery on is track 5's Falcon 9 return (src/lessons/builtin/track5.ts, to LZ-1). Every other built-in lesson, the lesson packs under public/, quickstart and the placement test's flights fly with it off.

Fingerprints and goldens (task step 3):
- tests/d01-fleet-fingerprint.test.ts flies `flyCase` (tests/fleet-harness.ts) with `boosterRecovery: false`.
- tests/heavy: flex-matrix, sixdof-fingerprint, rendezvous and historical-docking fly with it off; falcon-heavy-returns and starship-flight5 fly targeted plans.
- tests/sixdof-fleet: every case flies with it off.

None flies an untargeted recovery, so none changes, and docs/VALIDATION.md §10 needs no note. The tests that do fly it (tests/mission.test.ts's booster recovery, tests/rigid-recovery.test.ts) assert the landing, not the event list.

## Change

**Point-mass** (`stepDebris`, the `if (burn)` block):

```ts
if (!rc.burning) this.note(d, `evt.${rc.phase}BurnStart`);
```

`burn` is set only in the `entry` phase (the entry burn) and the `landing` phase (the landing burn), so the key is `evt.entryBurnStart` or `evt.landingBurnStart`. `burning` is clear before the entry burn; the entry burn ends by moving to `landing` with `burn` false, which clears it; once the landing burn has started its bang-bang gaps keep it set (`landingStarted`). So each burn raises its event once, on its first sub-step. Raising it inside the loop keeps it ahead of a touchdown in the same step, as in `stepReturning`.

**Six-DOF** (`RigidDebrisRuntime`):
- the untargeted entry burn in `guidance`: `if (!rc.entryFlown) this.note('evt.entryBurnStart'); rc.entryFlown = true;`, as `returnGuidance` does;
- the landing burn in `landingCommand`, where `landingStarted` is set: `if (!rc.landingStarted) this.note('evt.landingBurnStart');`. A targeted stage reaches `landingCommand` only from `targetedLanding`, which has already set `landingStarted` and raised its own event, so this raises only an untargeted one.

`rc.burning` is not used in six-DOF, because `applyCommand` sets it from the throttle every tick: the landing burn's terminal coast and restart clear and set it, and a stage whose engines have failed would raise an event every tick. `entryFlown` is read only by targeted code (`entryState`, `descentState`, `stepReturning`), so setting it on an untargeted stage changes nothing else; its doc comment in src/physics/sim/types.ts now says so.

Each event is the targeted path's: the same key, severity `info`, params `{ name }`, stamped by `sim.event` as the step that lit the burn ends.

## Identical-output commit (ff7ea51)

The fix alone measured +292 B in each of the seven chunks that carry the simulation (index and the flight, tune, monte-carlo, ratings, readiness and recheck workers): precache code +2,044 B, 1,946 B over its ceiling on main, and index-*.js 0.1 kB over its own. So the first commit makes room in the same two files, with no change in output:
- `note(key)` on `RigidDebrisRuntime` and `note(d, key)` on `DebrisTracker` raise a return's `info` event naming the body. The four targeted events in each file use them, and so do the fix's three new calls.
- The five contact events a rigid flight hands on (`stageImpact`, `boosterLanded`, `boosterLandedZone`, `boosterLandedShip`, `boosterCaught`), which `stepDebris` decorates with the impact's latitude and longitude, are matched by `/^evt\.(stageImpact|booster(Landed(Zone|Ship)?|Caught))$/` instead of five comparisons. Checked against the five comparisons on all 318 `evt.*` and `tl.evt.*` keys of the three dictionaries and the rigid runtime, plus near-miss strings: 0 mismatches.

**Oracle:** a probe (gitignored `tests/probe/identical-events.test.ts`) flies each recovery flight through `flyWithReturns` (tests/return-harness.ts) and hashes the whole event log (key, time, severity, params), every debris body's end state (position, velocity, mass, outcome, rest time, impact, recovery state) and the vehicle's state. Main (1842a86) against the offset commit:

| flight | plan | point-mass | six-DOF |
|---|---|---|---|
| Falcon 9, Bandwagon-1 profile | LZ-1 | identical | identical |
| Falcon 9, Demo-2 profile | drone ship | identical | identical |
| Starship to LEO | tower | identical | identical |
| Falcon Heavy, Arabsat-6A | LZ-1, LZ-2, drone ship | identical | identical |
| Falcon 9 to LEO | none (downrange) | identical | identical |
| Falcon Heavy to LEO | none | identical | — |
| Falcon Heavy to LEO | core downrange, LZ-1, one expended | identical | identical |

The six-DOF flights between them raise all five contact events.

## The fix against main (36d8bb3)

The same oracle, main against the fix:
- **Targeted flights** (the first four rows): event logs, debris and vehicle states bit-identical, point-mass and six-DOF.
- **Untargeted flights:** with `evt.entryBurnStart` and `evt.landingBurnStart` left out, the event log is bit-identical, and so is the vehicle's state.
  - Point-mass: every debris body is bit-identical too; only the added events differ.
  - Six-DOF (Falcon 9 downrange, the mixed plan): the debris bodies differ in one field only, `recovery.entryFlown: true` on the untargeted stage, which the six-DOF fix sets and only targeted code reads (a field-by-field diff of the full end states). Positions, velocities, masses and outcomes are bit-identical.
  - The added events, point-mass:
    - Falcon 9: entry burn T+305.25 s, landing burn T+366.50 s;
    - Falcon Heavy, no plan: the side boosters' at T+317.50 and T+378.00 s (two each), the core's at T+406.75 and T+534.83 s;
    - the mixed plan: the downrange core's at T+398.60 and T+523.40 s (the LZ-1 booster's were there before).
  - Six-DOF: Falcon 9 at T+359.80 and T+394.89 s; the mixed plan's downrange core at T+450.44 and T+502.61 s.

## Measured: where the untargeted burns fall among the frames

Probe (gitignored `tests/probe/untargeted-burns.test.ts`), on main's code: each mission built as the app builds it (`missionDoc` → `lessonConfig`, booster recovery on, no plan) and recorded through `FlightRecorder.advance(1)` until the recovered stages were down. The burn intervals come from a second run stepped at most 0.5 s (point-mass) or 0.01 s (six-DOF), reading `recovery.burning` after every step.

**Point-mass, 12 missions:**
- Falcon 9 to LEO (100 kg, 1, 8 t), ISS (5 t), SSO (2 t, Vandenberg), GTO (4 t); Starship to LEO (15.6 t); Falcon Heavy's side boosters: both burns light while the vehicle is still climbing, frames 0.25 s apart.
- Falcon Heavy's core, five missions (LEO 1, 3, 10 t; ISS 5 t; GTO 6.5 t): its entry burn lights in the climb; its landing burn lights after the upper stage's cut-off, in coast frames 10–20 s apart, 3–12 s into the span. The burn is still lit at the span's later frame every time (8.5 s burns to touchdown).

**Six-DOF, 4 missions** (Falcon 9 LEO 1 t, Falcon Heavy LEO 1 and 10 t, Starship LEO 15.6 t). The vehicle holds its attitude in orbit and steps 10–30 s at a time (`heldCoastWindow`) while the debris integrate in 0.01 s steps inside them.
- Falcon 9 and Starship: every burn lights in climb frames 0.1 s apart.
- Falcon Heavy: the core's landing burn and the landing burns' terminal restarts light in coast frames 10–35 s apart. Every span where the body is alive at both ends has a burn lit at one end or both.
- The one span with `burning` clear at both ends is a side booster's restart and touchdown inside one 10 s span. A body that comes down between frames is held at its earlier frame, so the blend never sees it.

So none of these 16 missions has a burn wholly inside a span with `burning` clear at both ends, the case where #191's cubic would draw a burning stage as one falling freely. The gap in practice was the event log, which showed none of these burns. The second agent's 1-D case (a 30 s span with the burn inside: the cubic 1.9 km off, the line 5.6 km) needs a whole burn inside one simulation step and does not arise here. If it did, the event's frames would be that step's own two ends, both with `burning` clear (see "Not changed, for later").

**The event's time** is the end of the step that lit the burn, as for a targeted return. While the vehicle climbs that is within 0.1–0.25 s. In a coast step it is up to the step's length:
- point-mass Falcon Heavy core (1 t to LEO): lit at T+526.3 s, stamped T+534.83 s (8.5 s later, just before touchdown);
- the other point-mass cores: 3–7 s later;
- six-DOF: the core's step ran T+491.7 → 524.4 s around a landing burn lit at T+507.8 s, so up to 16.6 s.

## Tests

`tests/recovery-untargeted-events.test.ts` (new, 3 tests, 4.3 s), each flying a point-mass mission with booster recovery and no plan through `FlightRecorder`:
- **Falcon 9 to LEO, 1 t:** the stage, untargeted and landed, raises `evt.entryBurnStart` then `evt.landingBurnStart`, once each, with severity `info` and params `{ name }`, before `evt.boosterLanded`. A stored frame sits at each event's very time, with the stage alive and burning in it.
- **The same, thinned hard** (a 300-frame budget, so `decimationCount > 0`): both events' frames are still stored at their times.
- **Falcon Heavy to LEO, 1 t:** each of the three recovered bodies raises one of each (the two side boosters share their name and their instants); every event's frame holds a lit body of that name. The core's landing burn event lands at the end of a coast span at least 10 s long whose earlier frame has the core not burning.

`tests/rigid-recovery.test.ts`: its six-DOF downrange flights (rigid steps 0.0025, 0.005 and 0.01 s) also assert the two events, in order, naming the stage, before the landing. No existing assertion changed.

**Failing first:**
- On main's source, all 3 new tests fail, each on the missing events ("expected [] to deeply equal [ 'evt.entryBurnStart', … ]", "Side boosters: expected [] to have a length of 2").
- rigid-recovery's 0.01 s flight fails the same way ("expected [] to deeply equal [ Array(2) ]").
- With the fix all pass.

**Merged with #191 and #187** (scratch tree: #191, #187 with its doc-comment conflict resolved, then this branch): tests/recovery-untargeted-events, debris-replay, replay and live-stepping, 56 of 56 pass; type check clean.

**Suites:**
- CI run 41111067263 on f8426ec: plan, typecheck, build (with the bundle budget), test 1–3 (the whole default vitest suite in three shards), browser-smoke 1–2 and verify, all green.
- Heavy files that fly the code this changes, on the branch, one at a time:
  - tests/heavy/starship-flight5.test.ts: 1 passed, 262 s (six-DOF, the tower catch);
  - tests/heavy/falcon-heavy-returns.test.ts: 1 passed, 213 s (six-DOF, LZ-1, LZ-2 and the drone ship);
  - tests/heavy/sixdof-fingerprint.test.ts: 22 passed, 310 s (the six-DOF fleet's goldens: their event logs, with every spent stage's `evt.stageImpact` through the contact-event pattern, unchanged).
- The rest of tests/heavy and tests/sixdof-fleet fly with recovery off or the watch missions' targeted plans (fleet-harness, flex-matrix, rigid-harness, validation/flight-harness), so this change reaches them only through the contact-event pattern of the identical-output commit.

## Size

`npx vite build`, `node scripts/bundle-budget.mjs`: ok, no ceiling raised.

| | index-*.js | each physics worker | precache code |
|---|---|---|---|
| main 1842a86 | 2,634,842 B | — | 14,653,902 B (98 B left) |
| the fix alone | +292 B | +292 B | +2,044 B (over by 1,946 B; index over by 0.1 kB) |
| identical-output commit | −220 B | −220 B | −1,540 B |
| the fix on top | +164 B | +164 B | +1,148 B |
| **this branch** | **2,634,786 B (−56)** | **−56 B** | **14,653,510 B (−392; 490 B left)** |
| with #191 and #187 merged too | | | 14,653,599 B (401 B left) |

The seven chunks are index and the flight, tune, monte-carlo, ratings, readiness and recheck workers; each carries the simulation, so a byte of debris code costs seven bytes of precache code.

## Question for the owner

SESSION-PROTOCOL §5: "One change type per PR (identical-output never mixes with another type)." This PR has an identical-output commit (ff7ea51) and a bug-fix commit (36d8bb3), kept apart so either can be reviewed on its own. Options:
1. **Keep both commits in this PR (proposed).** No ceiling is raised, and precache code ends 392 B smaller. The identical-output commit is proven by the oracle above and changes only the code the fix sits in.
2. **Split:** the identical-output commit as its own PR first, this fix after it. The result is the same; it needs a second branch, which this session would push only with the owner's permission.
3. **Drop the identical-output commit and raise the ceilings (D-38):** precache code 14,654 → 14,656 kB and index-*.js 2,635 → 2,636 kB, for this fix. The named offset would be EQ-7 (K2).

Because of the identical-output commit, this PR is not covered by the standing bug-fix approval (SESSION-PROTOCOL §1) and waits for the owner's button.

## Second-agent review

Done on 36d8bb3 (f8426ec for the records), review only, no edits. It reran its own probes in the scratch worktrees of main, the identical-output commit and the fix.

- **The identical-output commit (1):** confirmed.
  - The helpers give the same `{ key, severity: 'info', params: { name } }`, field for field.
  - The pattern agrees with the five comparisons on 339 strings (every `evt.*` and `tl.evt.*` literal in src, tests and public, and 21 near-misses): 0 mismatches.
  - Its own point-mass oracle over 12 flights, as full JSON with every event's `state` and every debris field: main and the commit byte-identical (`cmp`).
- **The point-mass rule (2):** confirmed. It injected 12 crafted untargeted bodies into a live flight:
  - the cases: starting below 25 km; climbing at 80 km; at its reserve at entry; running dry in the entry burn or the landing burn; lighting 3 m up; too slow at 65 km; 40× and 400× the thrust, so that the vertical speed turns upward mid-burn and the block is skipped; starting inside the landing law's hysteresis band; hovering;
  - every body raised at most one of each event, only those two keys, one per lit episode;
  - a body that never meets the entry conditions raises only the landing burn's event, rightly;
  - the event is raised before the sub-step's integration and touchdown.
- **Six-DOF (3):** confirmed.
  - A targeted stage returns at `guidance`'s second line, and `targetedLanding` sets `landingStarted` before it calls `landingCommand`, so the new landing event is reachable from the untargeted path only.
  - Falcon 9 with no plan, Falcon 9 with an engine out (engineFraction 8/9) and Falcon Heavy with no plan: each body raised one of each event at its burning false→true instant, before touchdown.
  - The terminal restarts raise none.
  - Against main: the event log less the burns byte-identical, the vehicle identical, the debris identical but `entryFlown`.
- **Targeted flights unchanged (4):** confirmed, point-mass by its own oracle, six-DOF from the author's run.
- **Tests (5):** confirmed.
  - All 3 new tests fail on main for the right reason and pass on the fix, twice.
  - The thinned test does thin (118 decimations). With the burn events hidden from the recorder, no frame stays at T+305.25 or T+366.50 s, so the frames survive because they are pinned.
  - The first test passes with or without pinning (0.25 s cadence), so the second is the one that tests pinning.
- **The report's claims (6):** partly: nits, now fixed (below).
- **Sizes (7):** confirmed. Precache code 14,653,510 B (−392), −56 B in each of the 7 chunks, −220 B for the identical-output commit alone; 14,653,599 B merged with #191 and #187.
- **Everything else (8):** confirmed.
  - The type check is clean, and the en/ru/th keys exist.
  - The watch beats on these events are reached only by targeted watch missions. There is no audio cue, the worksheets' event list leaves them out, and no lesson grades on them. Onboard's latest callout shows the burns, as intended.
  - 10 event-sensitive test files: 228 of 229 pass; the one failure was debris-replay's Soyuz Blok I test at 5,074 ms against its 5,000 ms timeout under a load of 8–9, and it passes alone.
  - §5 is the owner's call.

Non-blocking findings, and what was done:
- *The third test's coast span is exactly 10.0 s* (524.83 → 534.83 s), so `>= 10` sat on the boundary. Now `> 9`.
- *"Differ only by the added events"* holds for point-mass only; six-DOF debris also carry `entryFlown`. The report and the fragment now say so.
- *The `entryFlown` doc comment* overstated: a point-mass untargeted return never sets it. Reworded.
- *Custom vehicles* with `recoverable` also reach the point-mass untargeted path. Added to "Who reaches the untargeted path".
- *The new test's header* described #191's blend as if it were main's. Reworded.
- *A six-DOF event with no thrust:* if every commanded engine has failed, or the propellant is gone, the event is raised although nothing burns. The targeted path does the same, and for Falcon it needs every engine out. Under "Not changed, for later".
- *Existing, out of scope: a point-mass stage that runs dry mid-burn keeps `burning` set* until it lands, so its plume stays drawn. Under "Not changed, for later".
- *Falcon Heavy's two side boosters* raise identical events (same key, time and name), so the log shows each line twice. That is the log's one-event-per-body rule, as for their landings.

**Verdict: confirmed 7 of 8, partly 1 (wording, fixed); no blocking findings.**

## Not changed, for later

- **The event's time is the end of the step that lit the burn**, here and on the targeted path: up to 8.5 s late for a point-mass Falcon Heavy core and up to 16.6 s in six-DOF's held coast. `sim.event` takes the instant (`at`), and the sub-step's time is at hand in both loops, so both paths could stamp the burn's own instant. It would change the targeted flights' event logs, and with them the time their watch narration beats start (src/ui/watch-logic.ts); not done here.
- **A burn wholly inside one simulation step** would still have `burning` clear at both pinned frames, and #191's cubic would draw it as a free fall. Not seen in 16 user-style missions. Two ways to close it:
  - `interpolateFrames` could keep the line for a body whose `recovery.phase` changes between the two frames;
  - the simulation could end a step where a debris burn lights.

  Both cost bytes; the first is in #191's code.
- **The six-DOF landing burn's terminal restart** (after its latched coast) raises no event, as on the targeted path, which raises one landing-burn event per burn.
- **A six-DOF burn event with nothing burning:** when every engine the burn commands has failed or the propellant is gone, the event is still raised, on both paths. Raising it on the throttle `applyCommand` allows would close it.
- **A point-mass untargeted stage that runs dry mid-burn** skips the burn block from then on and keeps `burning` set until it lands, so its plume stays drawn over an unpowered fall (found by the second agent; older than this change, and it raises no extra event).
