# Orbitlab development progress / สถานะงานตามแผน

Updated: 2026-10-03. Plan: [PLAN.md](PLAN.md), version 1.2; human copy: [Word release asset](https://github.com/ROYIN001/Orbitlab/releases/download/development-plan-v1.2/Orbitlab-Development-Plan-TH.docx) (publication pending until application acceptance). Integration branch: `codex/r1-profiles-foundations`. Starting main: `523b44eca0e31fd84fd4a3faa4e1b883428288ee`.

ผู้ใช้อนุญาต R1 และงานเล็กที่แก้ไม่มาก รวมเปิด PR/merge main หลังตรวจเรียบร้อยแล้ว ให้ผู้รับช่วงอ่านตารางนี้และรายงานแต่ละงานก่อนแก้ไข ห้ามทำซ้ำส่วนที่เสร็จหรืออ้างว่าระยะอื่นเสร็จตามไปด้วย

| Plan task | Status | Scope / owner | Evidence and handoff |
|---|---|---|---|
| R0 prerequisites for R1 | Required R1 contracts adopted; remaining R0 audit planned | Freeze storage/session/gesture/fuel/workflow contracts; root integration | R0 fleet evidence/physics programme audit remains future work; not all R0 complete |
| R1.1 | Implemented; focused and local browser checks passed; corrected CI pending | All-work local profiles, byte-preserving migration, scoped reset, archives/audio; storage owner | [Storage report](reports/R1.1-storage.md) |
| R1.2 | Implemented; focused and local browser checks passed; corrected CI pending | Whole-app learner context, profile/learning reset UI; UI owner + root shell | [Profile UI report](reports/R1.2-profiles-ui.md) |
| R1.3 | Implemented; focused checks passed; integrated CI pending | Native text scrolling, visible canvas gesture ownership; camera owner + root | [Gesture report](reports/R1.3-gestures.md) |
| R1.4 | Implemented; 124 selected tests passed after conditional repair; corrected CI pending | Main/RCS finite fuel, partial-step impulse/coast; physics owner | [Fuel report](reports/R1.4-fuel.md) |
| R1.5 | Implemented; focused checks passed; final browser/CI pending | Heavy inventory/provenance, parallel Pages gates, release identity; workflow owner | [Workflow report](reports/R1.5-workflows.md) |
| U08 (small R2.2 subset) | Implemented; gesture browser check passed | Remove visible reset-camera control; keep internal framing | [Small UI report](reports/R1-small-ui.md); full Watch CameraPolicy remains R2.2 |
| U09 (small R2.1 subset) | Implemented; notation browser check passed; integrated CI pending | Hide Auto option; implicit language default, preserve explicit ISO/GOST | [Small UI report](reports/R1-small-ui.md); layout/lifecycle remains R2.1 |
| U16 (small R2.1 subset) | Implemented; translation checks passed; integrated CI pending | Label HUD/onboard percentage as throttle command | [Small UI report](reports/R1-small-ui.md); actual per-engine readouts/profile validation remain R2/R4 |
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

## Candidate review in progress

[PR #71](https://github.com/ROYIN001/Orbitlab/pull/71) is open. Initial candidate `f2d7e48` failed [CI 37096708399](https://github.com/ROYIN001/Orbitlab/actions/runs/37096708399): tracked DOCX policy, obsolete DOM exemptions, four rigid-flight fingerprints, and three browser timeouts. These failures block merge. Word is retained outside the checkout for a versioned Release asset; no repository-policy exception is added. Physics correction must preserve historical goldens and fix only invalid bases. Browser failures require diagnosis before a new candidate. Required inventory and numerical criteria remain unchanged.
