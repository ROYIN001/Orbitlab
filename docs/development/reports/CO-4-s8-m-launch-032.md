---
package: CO-4
step: s8 (plan step 8)
items: [M-LAUNCH-032]
sources: [CR:NEW-UI-4, CR:D11]
priority: P1
change_kind: bug-fix, realism-changing for custom vehicles only, in a state no shipped path reaches
owner_authorization: 'owner, 2026-10-09, K1 decision page 2, card q05 option B: "ทำ 032 และ 026 ใน K1 ส่วนที่เหลือไป K2" (DECISIONS "Decided 2026-10-09"); K1 on K0 verified (owner, 2026-10-05)'
base_sha_verified_on: {sha: 84da81e, date: 2026-10-23, recheck: "src/ui/panel.ts:1795 `this.state.dynamics ?? defaultDynamics(this.state.vehicleId)` present (the plan's 7662ead:1793, +2); the siblings now at :1598, :1652, :1695, :1762, :1863 and :2024"}
branch: claude/happy-hawking-m71bk1 (this session's one branch, one PR at a time; the fragment's file name carries a suffix so two of its PRs cannot share one)
wave_lane: K1 / I (P reviews 032)
allowed_write_paths: [src/ui/panel.ts, tests/dispersed-flight-panel.test.ts, changes/claude-happy-hawking-m71bk1-m-launch-032.md, docs/development/reports/CO-4-s8-m-launch-032.md]
merge: waits for the owner (Merge Desk), see "For the owner"
status: In PR; not merged; not published
---

# CO-4 step 8 — "Fly dispersed" takes the mission's own vehicle's flight model (M-LAUNCH-032)

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
>
> - ช่อง "Fly dispersed" ในหน้าตั้งค่าเลือกแบบจำลองการบินตั้งต้นจากรหัสจรวด แทนที่จะดูจากตัวจรวดของภารกิจ
>   - จรวดที่ผู้ใช้ออกแบบเองไม่มีรหัสใน catalogue จึงได้ point-mass
>   - ช่องอื่นในหน้าตั้งค่าที่ตั้งค่าตั้งต้นด้วย `defaultDynamics(...)` ดูจากตัวจรวดอยู่แล้ว
> - แก้หนึ่งบรรทัด ให้ดูจากตัวจรวดของภารกิจ แบบเดียวกับช่องอื่น
> - ผลที่ผู้ใช้เห็น: ไม่มีเส้นทางใดในหน้าเว็บที่ใช้อยู่ไปถึงสถานะนี้ได้ ทุกทางตั้งค่าแบบจำลองไว้ก่อนเสมอ จะถึงได้เฉพาะผ่าน `restoreMission()` ด้วยภารกิจที่ไม่มีค่าแบบจำลอง เที่ยวบินที่ผู้ใช้บินได้ทุกวันนี้จึงไม่เปลี่ยนเลย
> - จรวดใน catalogue ทั้ง 25 ลำได้ค่าเดิมทุกไบต์ (มีเทสต์ยืนยัน)
> - มีเรื่องให้ตัดสินใจหนึ่งข้อ: แผน S06 ขอให้ค่าตั้งต้นนี้เป็น six-DOF แต่ D03 ในแผนงานกำหนดให้จรวดที่ออกแบบเองบินแบบ point-mass เป็นค่าตั้งต้น ส่วน six-DOF ถือเป็นโหมดทดลอง (ดูหัวข้อ "For the owner") PR นี้จึงรอคุณกดอนุมัติ ไม่ merge เองตามการอนุมัติล่วงหน้า
> - ไม่ได้ทำ: ส่วนท้ายของชื่องาน "and optional shared setDynamicsPart helper" ซึ่งเป็นงานปรับโค้ดที่ไม่เปลี่ยนผล ต้องแยกเป็น PR ของตัวเอง

## What was wrong on `84da81e`

`SetupPanel.dispersedFlightSection()` (`src/ui/panel.ts`) builds the "Fly dispersed, as one run of a set" checkbox and its seed and run fields. Each control starts from the mission's dynamics, or from a default when there are none:

```ts
const dynamics = this.state.dynamics ?? defaultDynamics(this.state.vehicleId);
```

`defaultDynamics` (`src/physics/rigid/config.ts`) gives six-DOF when `supportsRigid(vehicle)` holds. That is always true for a spec; for an id it is `isCatalogueVehicle(id)`. A custom vehicle's id (for example `my-falcon`) is not in the catalogue, so this fallback gave **point-mass**.

The setup's other `defaultDynamics(...)` fallbacks pass the mission's own vehicle, `defaultDynamics(missionVehicle(this.state))`:
- **explicit guidance** and **`applyControl`**, which can run with no dynamics;
- **flex, control, navigation and faults**, which render only when the model is six-DOF (`panel.ts` render), so with no dynamics they never run.

`loadMission` does the same, and the mission file's `vehicleDefaults` and the lessons' grader also start from the vehicle's spec. The same section's own draw list reads `missionVehicle(this.state)`.

Not every fallback agrees, however. With no dynamics the mission shows point-mass, since the Physics model section falls back to a literal `{ model: 'pointMass', … }`, and it flies point-mass, since `Simulation` builds no rigid runtime without `dynamics`. MCP's physics and wind edits start from the same literal.

So in that state, ticking "Fly dispersed" switches the mission's model:
- **catalogue vehicles:** to six-DOF (`defaultDynamics(id)`), both before and after this fix;
- **custom vehicles:** to point-mass before the fix, and to six-DOF after it.

The switch is visible: the section re-renders, the model select shows the new model, and the six-DOF sections appear.

Only `model` differs between the two defaults; the wind (`calm`) and the seed (`20260919`) are the same. The model also chooses the pitch programme that the setup sends:
- `SetupPanel.guidance` is `guidanceForVehicle(spec, undefined, state.dynamics?.model)`, and `getConfig()` sends it with `guidanceResolved: true`;
- so for a custom vehicle that carries `guidanceDefaultsSixDof` (one derived from Falcon 9, say), the point-mass fallback also chose the point-mass programme;
- the Monte Carlo window always flies six-DOF (`runMission`, `src/physics/monte-carlo.ts`), but it takes that programme from `getConfig()`.

Before the fix, a set started from that state therefore flew six-DOF on the point-mass programme, and its run *n* flown alone flew point-mass. After the fix, both are six-DOF on the six-DOF programme.

## Can a user reach it?

No shipped path can, on `84da81e`. The fallback runs only when `state.dynamics` is undefined, and the only write that leaves it so is `restoreMission()` with a mission that has none (`if (!mission.dynamics) this.state.dynamics = undefined`).

Every writer and caller was traced:
- the constructor, `loadMission`, `pickVehicle` and `faultPresetVehicle` set it, and the setup's reset keeps it;
- each of the six `restoreMission` callers passes a state with dynamics:
  - the Monte Carlo window's "fly this run" (`main.ts` → `runMissionState`, `src/ui/monte-carlo.ts`): the set's mission with that run's dynamics;
  - the work dialog (saved work, and the experiment notebook's baseline and trial restores), through `parseMissionDocument` with the panel's own state as the fallback;
  - `MissionShare.apply` from each of its sources: a shared link, a mission file, the page's own stored copy and Build's "Fly it". Each goes through `parseMissionDocument` with the panel's state as the fallback, and "Fly it" sets the model explicitly (`src/design/build-handoff.ts`);
  - a lesson (`missionStateOf` → `defaultMissionState()`);
- `parseMissionDocument`'s overlay and reset never clear the dynamics, and a changed vehicle gets `vehicleDefaults`;
- MCP never sets them to undefined.

The plan's first step for this item was "a reproducer confirming `state.dynamics` can be undefined in Engineer". There is none in the shipped UI. The state is reached through the public `restoreMission` API, as `tests/panel-held-edit.test.ts` already does, and the new test uses that. This fix changes no flight anyone can fly today; it makes the dispersed-flight fallback agree with the setup's other vehicle-default fallbacks and with the set it is a run of.

## The fix

```diff
-      const dynamics = this.state.dynamics ?? defaultDynamics(this.state.vehicleId);
+      const dynamics = this.state.dynamics ?? defaultDynamics(missionVehicle(this.state));
```

- No new import: `missionVehicle` and `defaultDynamics` are already imported.
- `missionVehicle` adds no new way to throw, since `render()` and the same section already call it on the same state.
- `validateDynamics(d, spec)` accepts six-DOF with a custom spec.

## Tests

New file `tests/dispersed-flight-panel.test.ts`. It is a new file, so the suites S06 says must stay unchanged are not edited. It builds the production section with its DOM stubbed, as `tests/dynamics-panel.test.ts` does, and has 4 tests:
1. A custom Falcon 9 (`my-falcon`, derived from `falcon9`) with no dynamics, "Fly dispersed" ticked, gives `{ ...defaultDynamics(spec), dispersion: { seed: 1, run: 0 } }`, i.e. six-DOF.
2. The same flight is the set's own run 0 of that mission: `dispersedRunMission(…, { seed: 1, dispersions: DEFAULT_DISPERSIONS }, { index: 0, law: 'standard' }).dynamics` (criterion 2 of the plan).
3. `restoreMission()` with a mission without dynamics leaves `state.dynamics` undefined. This is the state the first two tests start from.
4. Every catalogue vehicle (all 25 of `ALL_VEHICLES`), starting from no dynamics, gives JSON byte-identical to `{ ...defaultDynamics(id), dispersion: { seed: 1, run: 0 } }`, before and after the fix.

| `src/ui/panel.ts` | Tests 1 and 2 | Tests 3 and 4 |
|---|---|---|
| `84da81e` (before) | **fail**: `model: "pointMass"`, expected `"sixDof"` | pass |
| this change | pass | pass |

Suites run with the fix, 19 files, 414 tests passed, `npx tsc --noEmit` clean:
- the suites S06 names as unchanged, tolerance 0: `d01-fleet-fingerprint`, `dynamics-panel`, `dispersed-flight`, `monte-carlo`;
- every test file that imports `panel.ts`: `architecture`, `panel-held-edit`, `mcp`, `explore`, `recovery-panel`, `panel-verdict`, `panel-historical`, `target-plane`, `range-safety`, `design-readiness`;
- neighbours: `fleet-defaults`, `design-budget`, `d06-satellite-verdict`, `design-handoff`;
- the new file (then 3 tests; 4 now, passing).

No file under `src/physics` changes. No heavy, six-DOF fleet or EO-PHY-6 test imports `panel.ts`, `main.ts` or `mcp.ts`, even indirectly (the second agent traced all 42 such files), so those cannot move. The full default suite runs in the PR's CI.

## The physics lane's table (S06 step 8, criterion 3)

The table is read from the code. It was not measured, because no shipped path reaches the state where anything differs; in every reachable state there is nothing to measure apart.

| | Before (`84da81e`) | After |
|---|---|---|
| Every state a shipped path reaches | the mission's own dynamics | the same: the changed line does not run |
| Catalogue vehicle, no dynamics, "Fly dispersed" ticked | six-DOF (`defaultDynamics(id)`) | byte-identical (test 4) |
| Custom vehicle, no dynamics, "Fly dispersed" ticked | point-mass, on the point-mass programme | six-DOF on its six-DOF programme: the set's own run (test 2) and the six-DOF single flight of that vehicle |
| Monte Carlo set started from that custom state | six-DOF on the point-mass programme | six-DOF on the six-DOF programme |
| Monte Carlo set from any reachable state, success fraction, apsides mean and σ, time per set | as now | unchanged: the set's inputs do not change |

## For the owner

**Six-DOF or point-mass for this fallback.** Roadmap D03 (`docs/ROADMAP-PART2-3.md`) flies custom vehicles point-mass by default, with six-DOF marked experimental, since their six-DOF data are generic. Build's "Fly it" sets that explicitly (`src/design/build-handoff.ts`), and the design review gives six-DOF only to catalogue vehicles. The plan's own test for this item (S06 step 8) asks for `defaultDynamics(spec).model`, which is six-DOF. The two disagree only in the state no shipped path reaches. Options:
- (ก) Six-DOF, as the plan asks and as this PR does: the dispersed flight is the set's own run, and the fallback matches the setup's other vehicle-default fallbacks.
- (ข) Point-mass for custom vehicles, as D03 defaults: then run *n* flown alone is not run *n* of the set, which P08 promises. That would be a different change.

Proposal: (ก). Because this is a realism choice that the plan leaves to the physics lane and the owner, this PR waits for the Merge Desk rather than the standing bug-fix approval.

## Not done

- **"and optional shared setDynamicsPart helper".** The registry's title stops at "and optional shared …". The full title is in the plan v2.0 draft's ledger (`docs/development/plan-v2-draft/ledger/unified-launch.jsonl`, the M-LAUNCH-032 line, at `3c90d74` on the plan branch). Its acceptance says the optional helper keeps each section's rebuild default and key pruning. That would be an identical-output change, so under CO-4's rule of one change type per PR it would be its own PR, and the copies of the pattern in `src/mcp.ts` are outside CO-4's allowed files.
- **Seen in passing, not changed.** These edits rebuild the dynamics without `dispersion`, turning a dispersed flight back into a nominal one: `pickVehicle`, `faultPresetVehicle`, and MCP's vehicle, physics-model and wind edits. Whether that is intended is not settled here.
