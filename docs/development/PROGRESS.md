# Orbitlab development progress / สถานะงานตามแผน

Updated: 2026-10-03 UTC. Plan: [PLAN.md](PLAN.md), version 1.2; human copy: [verified Word download](https://raw.githubusercontent.com/ROYIN001/Orbitlab/f2d7e4804b7b6664b63b8cceb8bb4d0c1842e802/docs/development/PLAN.docx). [PR #71](https://github.com/ROYIN001/Orbitlab/pull/71) merged at `5eb18a27fbf579159e3351545216c801b26c7df5`; application publication is blocked by the release test wait recorded below. Starting main: `523b44eca0e31fd84fd4a3faa4e1b883428288ee`.

ผู้ใช้อนุญาต R1 และงานเล็กที่แก้ไม่มาก รวมเปิด PR/merge main หลังตรวจเรียบร้อยแล้ว ให้ผู้รับช่วงอ่านตารางนี้และรายงานแต่ละงานก่อนแก้ไข ห้ามทำซ้ำส่วนที่เสร็จหรืออ้างว่าระยะอื่นเสร็จตามไปด้วย

| Plan task | Status | Scope / owner | Evidence and handoff |
|---|---|---|---|
| R0 prerequisites for R1 | Required R1 contracts adopted; remaining R0 audit planned | Freeze storage/session/gesture/fuel/workflow contracts; root integration | R0 fleet evidence/physics programme audit remains future work; not all R0 complete |
| R1.1 | Verified in PR CI; merged; publication blocked | All-work local profiles, byte-preserving migration, scoped reset, archives/audio; storage owner | [Storage report](reports/R1.1-storage.md) |
| R1.2 | Verified in PR CI; merged; publication blocked | Whole-app learner context, profile/learning reset UI; UI owner + root shell | [Profile UI report](reports/R1.2-profiles-ui.md) |
| R1.3 | Verified in PR CI; merged; publication blocked | Native text scrolling, visible canvas gesture ownership; camera owner + root | [Gesture report](reports/R1.3-gestures.md) |
| R1.4 | 124 selected checks and PR CI passed; merged; publication blocked | Main/RCS finite fuel, partial-step impulse/coast; physics owner | [Fuel report](reports/R1.4-fuel.md) |
| R1.5 | Verified in PR CI; merged; release harness correction in progress | Heavy inventory/provenance, parallel Pages gates, release identity; workflow owner | [Workflow report](reports/R1.5-workflows.md); [navigation follow-up](reports/R1-release-navigation.md) |
| U08 (small R2.2 subset) | Implemented; gesture browser check passed | Remove visible reset-camera control; keep internal framing | [Small UI report](reports/R1-small-ui.md); full Watch CameraPolicy remains R2.2 |
| U09 (small R2.1 subset) | Verified in PR CI; merged; publication blocked | Hide Auto option; implicit language default, preserve explicit ISO/GOST | [Small UI report](reports/R1-small-ui.md); layout/lifecycle remains R2.1 |
| U16 (small R2.1 subset) | Verified in PR CI; merged; publication blocked | Label HUD/onboard percentage as throttle command | [Small UI report](reports/R1-small-ui.md); actual per-engine readouts/profile validation remain R2/R4 |
| R2–R7 other work | Planned | As described in PLAN.md | No implementation claimed or inferred authorization |

## Integration and verification rules

- One integration owner edits `main.ts`, `index.html`, shared CSS and progress index. Agents do not push/merge independently.
- Each completed package writes its report: scope, changed files, tests actually run, results, unresolved limitations, downstream dependencies.
- Storage ADR uses fixed-profile adapters and exclusive Web Locks for durable per-profile writing; no claim that unlocked localStorage read/modify/write is atomic. Profile changes flush owned drafts then seal session and reload; no promise to resume a running flight.
- Defaults adopted within authorized scope: learning / examinations / both / selected lesson resets; imported/authored material preserved. Auto notation remains an internal language default and respects manual overrides.
- Meaningful migration, stale session, two-tab, quota/failure, deletion, archive and physics depletion cases are required. Source/recording/worker contracts preserved.
- Required CI/domain gates must pass on the current application candidate before merge. Merged and deployed revisions are distinct. A release is reported as published only after Pages succeeds with the intended source identity.
- No numerical tolerance relaxation, snapshot/golden rewrites, test dropping or measured-speed claims without supporting evidence.

## Reports to add at completion

Root records integration results in [R1 integration report](reports/R1-integration.md) and links to the created PR / CI / deployment. Exact immutable GitHub records are authoritative for merge/source/release identities; report documents distinguish pending release work from verified implementation.

## Merge and release history

[PR #71](https://github.com/ROYIN001/Orbitlab/pull/71) merged on 2026-10-03 at 05:44:01 UTC after [corrected CI 37099583981](https://github.com/ROYIN001/Orbitlab/actions/runs/37099583981) passed **10,079 unit cases / 18 smoke journeys**, with no missing, unexpected, duplicate or nonpassing cases. Actual CI Chromium: **153.0.8010.12**. See the integration report for exact source/dist identities.

[First Pages run 37100771200](https://github.com/ROYIN001/Orbitlab/actions/runs/37100771200) correctly blocked publication: all 10,079 unit cases passed; all 20 full journeys were present, with one failure in `project-backups`. The Restore click completed, then its implicit scheduled-navigation barrier timed out at 30 seconds despite an explicit 60-second document wait already being registered. The focused [navigation follow-up](reports/R1-release-navigation.md) centralizes reload waits while preserving every data/model assertion. A fresh candidate must pass CI and Pages before publication is claimed.

Initial candidate `f2d7e48` failed [CI 37096708399](https://github.com/ROYIN001/Orbitlab/actions/runs/37096708399): tracked DOCX policy, obsolete DOM exemptions, four rigid-flight fingerprints, and three browser timeouts. Those candidate issues were corrected before PR71 merged without policy exceptions, historical golden rewrites or tolerance relaxation. The first release's detailed click log now establishes the remaining navigation-wait problem; it does not prove the cause of every initial timeout.

Word is not tracked in current main. Its existing immutable public copy was downloaded without authentication and verified: **83,293 bytes**, SHA-256 `c15a3550627c2fa9d6d79341a748a22cbd75e7cb1ca86875a4b217609979768d`. Release upload is blocked by the environment's restricted network policy, not missing GitHub authentication. The working download above fulfills the human-document handoff while retaining repository hygiene.
