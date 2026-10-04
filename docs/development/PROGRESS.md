# Orbitlab development progress / สถานะงานตามแผน

Updated: 2026-10-04 UTC. R2 merged through [PR #74](https://github.com/ROYIN001/Orbitlab/pull/74) at `da6734160a510cd87cc7fdb4df3ec4eba9319313` and published; R3 started on the owner's instruction after that merge. Plan: [PLAN.md](PLAN.md), version 1.2; human copy: [verified Word download](https://raw.githubusercontent.com/ROYIN001/Orbitlab/f2d7e4804b7b6664b63b8cceb8bb4d0c1842e802/docs/development/PLAN.docx). [PR #71](https://github.com/ROYIN001/Orbitlab/pull/71) merged at `5eb18a27fbf579159e3351545216c801b26c7df5`; [PR #72](https://github.com/ROYIN001/Orbitlab/pull/72) subsequently merged the harness correction; [Pages 37103651001](https://github.com/ROYIN001/Orbitlab/actions/runs/37103651001) published exact source `472645fd57062c79d50c567028de220145006861` to [the website](https://royin001.github.io/Orbitlab/) at 2026-10-03T06:55:10Z. Starting main: `523b44eca0e31fd84fd4a3faa4e1b883428288ee`.

ผู้ใช้อนุญาต R1 และงานเล็กที่แก้ไม่มาก รวมเปิด PR/merge main หลังตรวจเรียบร้อยแล้ว ให้ผู้รับช่วงอ่านตารางนี้และรายงานแต่ละงานก่อนแก้ไข ห้ามทำซ้ำส่วนที่เสร็จหรืออ้างว่าระยะอื่นเสร็จตามไปด้วย

| Plan task | Status | Scope / owner | Evidence and handoff |
|---|---|---|---|
| R0 prerequisites for R1 | Required R1 contracts adopted; remaining R0 audit planned | Freeze storage/session/gesture/fuel/workflow contracts; root integration | R0 fleet evidence/physics programme audit remains future work; not all R0 complete |
| R1.1 | Verified; merged; published | All-work local profiles, byte-preserving migration, scoped reset, archives/audio; storage owner | [Storage report](reports/R1.1-storage.md) |
| R1.2 | Verified; merged; published | Whole-app learner context, profile/learning reset UI; UI owner + root shell | [Profile UI report](reports/R1.2-profiles-ui.md) |
| R1.3 | Verified; merged; published | Native text scrolling, visible canvas gesture ownership; camera owner + root | [Gesture report](reports/R1.3-gestures.md) |
| R1.4 | 124 selected checks and complete release gates passed; merged; published | Main/RCS finite fuel, partial-step impulse/coast; physics owner | [Fuel report](reports/R1.4-fuel.md) |
| R1.5 | Verified; merged; published | Heavy inventory/provenance, parallel Pages gates, release identity; workflow owner | [Workflow report](reports/R1.5-workflows.md); [navigation follow-up](reports/R1-release-navigation.md) |
| U08 (small R2.2 subset) | Verified; merged; published | Remove visible reset-camera control; keep internal framing | [Small UI report](reports/R1-small-ui.md); full Watch CameraPolicy remains R2.2 |
| U09 (small R2.1 subset) | Verified; merged; published | Hide Auto option; implicit language default, preserve explicit ISO/GOST | [Small UI report](reports/R1-small-ui.md); layout/lifecycle remains R2.1 |
| U16 (small R2.1 subset) | Verified; merged; published | Label HUD/onboard percentage as throttle command | [Small UI report](reports/R1-small-ui.md); actual per-engine readouts/profile validation remain R2/R4 |
| R2.1 | Verified; merged; published | Engineer lifecycle (setup→flight→analysis), setup collapses after launch, notation in telemetry panel, U16 actual engine-level readout, phone flight bar; U + I | [R2 report](reports/R2-workspace.md); D08 layout assumptions await owner review |
| R2.2 | Verified; merged; published | CameraPolicy: manual view kept across phases, Cinematic, Watch view tabs, follow-target fallback; C + I | [R2 report](reports/R2-workspace.md) |
| R2.3 (first step) | Verified; merged; published | Telemetry card presets All/Flight/Dynamics/Orbit/Custom, profile-owned; U | [R2 report](reports/R2-workspace.md); dock/resize/reorder and Docking preset remain |
| R2.4 | Verified; merged; published | Timeline event chooser for clustered events; V | [R2 report](reports/R2-workspace.md) |
| R3.1–R3.4 (package 1) | Verified; merged; publish pending (see R3 delivery) | Flown-input provenance (hypothesis, defensive), Engineer bench rocket drawing + part card, satellite schematic with stated assumptions, readiness rows that point at their part; S/B/I | [R3 report](reports/R3-design-views.md) |
| R3.5 (first part) | Implemented locally; in PR | Result → Show the setting (typed cause), mission source eyebrow, Home first-launch template, Watch copy to try, Build›Check›Launch›Result›Orbit steps; I | [R3.5 report](reports/R3.5-journey.md); before/after suggested changes, parts-builder fields, design revision remain |
| R4–R7 | Planned | As described in PLAN.md | No implementation claimed or inferred authorization |

## Integration and verification rules

- One integration owner edits `main.ts`, `index.html`, shared CSS and progress index. Agents do not push/merge independently.
- Each completed package writes its report: scope, changed files, tests actually run, results, unresolved limitations, downstream dependencies.
- Storage ADR uses fixed-profile adapters and exclusive Web Locks for durable per-profile writing; no claim that unlocked localStorage read/modify/write is atomic. Profile changes flush owned drafts then seal session and reload; no promise to resume a running flight.
- Defaults adopted within authorized scope: learning / examinations / both / selected lesson resets; imported/authored material preserved. Auto notation remains an internal language default and respects manual overrides.
- Meaningful migration, stale session, two-tab, quota/failure, deletion, archive and physics depletion cases are required. Source/recording/worker contracts preserved.
- Required CI/domain gates must pass on the current application candidate before merge. Merged and deployed revisions are distinct. A release is reported as published only after Pages succeeds with the intended source identity.
- No numerical tolerance relaxation, snapshot/golden rewrites, test dropping or measured-speed claims without supporting evidence.

## Completion reports

Root recorded integration results in [R1 integration report](reports/R1-integration.md) and links to the created PR / CI / deployment. Exact immutable GitHub records are authoritative for merge/source/release identities; report documents distinguish pending release work from verified implementation.

## Merge and release history

[PR #71](https://github.com/ROYIN001/Orbitlab/pull/71) merged on 2026-10-03 at 05:44:01 UTC after [corrected CI 37099583981](https://github.com/ROYIN001/Orbitlab/actions/runs/37099583981) passed **10,079 unit cases / 18 smoke journeys**, with no missing, unexpected, duplicate or nonpassing cases. Actual CI Chromium: **153.0.8010.12**. See the integration report for exact source/dist identities.

[First Pages run 37100771200](https://github.com/ROYIN001/Orbitlab/actions/runs/37100771200) correctly blocked publication: all 10,079 unit cases passed; all 20 full journeys were present, with one failure in `project-backups`. The Restore click completed, then its implicit scheduled-navigation barrier timed out at 30 seconds despite an explicit 60-second document wait already being registered. The focused [navigation follow-up](reports/R1-release-navigation.md) centralizes reload waits while preserving every data/model assertion. The correction passed [PR72 CI 37102480388](https://github.com/ROYIN001/Orbitlab/actions/runs/37102480388) before merge and [final Pages 37103651001](https://github.com/ROYIN001/Orbitlab/actions/runs/37103651001) before publication; the failed release remains historical evidence.

Initial candidate `f2d7e48` failed [CI 37096708399](https://github.com/ROYIN001/Orbitlab/actions/runs/37096708399): tracked DOCX policy, obsolete DOM exemptions, four rigid-flight fingerprints, and three browser timeouts. Those candidate issues were corrected before PR71 merged without policy exceptions, historical golden rewrites or tolerance relaxation. The first release's detailed click log now establishes the remaining navigation-wait problem; it does not prove the cause of every initial timeout.

Word is not tracked in current main. Its existing immutable public copy was downloaded without authentication and verified: **83,293 bytes**, SHA-256 `c15a3550627c2fa9d6d79341a748a22cbd75e7cb1ca86875a4b217609979768d`. Initial upload attempts were rejected by the restricted network; later upload requests returned HTTP 400 Bad Content-Length even with the correct explicit file length. The verified public download is used; no new authentication is requested. The working download above fulfills the human-document handoff while retaining repository hygiene.

## R2 delivery / ผลส่งมอบ R2

- Owner instructions (2026-10-04): start phase 2; open a PR, merge into main when done, and record progress; then continue to phase 3 if R2 merged cleanly.
- [PR #74](https://github.com/ROYIN001/Orbitlab/pull/74) CI [37168554643](https://github.com/ROYIN001/Orbitlab/actions/runs/37168554643) passed on head `8114481639f6b9f4a1b2e3539cb5c597080d10b4`: plan, build/budget, typecheck, three unit shards, two browser-smoke shards and verify. No review threads. Squash-merged normally (no admin override) at `da6734160a510cd87cc7fdb4df3ec4eba9319313`.
- An earlier push run (37167209431, `559e9f3`) failed only its bundle-budget step; the ceilings were then raised with written reasons before the PR head. Its three unit shards passed. A later push run (37168065402) was cancelled by the PR run, not failed.
- [Pages 37169459230](https://github.com/ROYIN001/Orbitlab/actions/runs/37169459230), attempt 1, passed plan, snapshot refresh/validation, build and budget, typecheck, three unit shards, two full browser shards and verify; the publisher's main-tip guard and `deploy-pages` succeeded at 2026-10-04T02:17:28Z for exact source `da67341`.
- Open for the owner: D08 layout assumptions (see [R2 report](reports/R2-workspace.md)); R2.3 dock/resize/reorder; U16 CSV columns and Max-Q programme physics (R4).

## Final delivery / ผลส่งมอบสุดท้าย

- Application [PR71](https://github.com/ROYIN001/Orbitlab/pull/71) and release-harness [PR72](https://github.com/ROYIN001/Orbitlab/pull/72) merged normally after their own complete PR CI; no admin override. PR72 merged at `472645fd57062c79d50c567028de220145006861` on 2026-10-03 06:36:59 UTC.
- [Final Pages 37103651001](https://github.com/ROYIN001/Orbitlab/actions/runs/37103651001), attempt 1, passed **10,079 unit cases / 20 full browser journeys**, with zero missing/unexpected/duplicate/nonpassing coverage. Actual remote Chromium: **153.0.8010.12**. Source inventory SHA-256 `5eed56619df39d022bf633db5be253b43308a98864c10a36b12154fbcacfbb47` / **1,039 files** matches the frozen PR72 candidate.
- Refreshed data validation/build/budget and publisher artifact/main-tip guards passed. Successful deployment **6824494621** records exact source `472645fd57062c79d50c567028de220145006861` at 2026-10-03T06:55:10Z; deployed dist manifest SHA-256 `8b1188bb4564a7f079c0783ae9497933aaafdd2d2a4648b32a96e8e966c4e1d0`. See [integration](reports/R1-integration.md) and [navigation correction](reports/R1-release-navigation.md).
- The final progress/report follow-up changes only unconsumed Markdown. It does not rebuild the website; About/build info continues to identify application revision **`472645f`** until another application release or scheduled/manual refresh. A later report-only main SHA does not imply the app is stale.
- Every package has a scope/checks/limitations/handoff report. R0's wider audit and **R2–R7 other work remain planned**. Full heavy/fleet scientific acceptance, actual per-engine/Max-Q validation, Engineer layout, Watch camera policy, previews, cross-mode mission handoffs, high-fidelity docking and cockpit are not claimed complete.

The working Word download is retained. Earlier Release upload attempts returned HTTP 403; after site publication, the upload endpoint returned HTTP 400 `Bad Content-Length`, including a request with the correct explicit 83,293-byte length. Empty unpublished drafts `402351182` and `402376528` were deleted. No uploaded Release asset or DOCX in current main is claimed. The immutable public copy is verified against the original and fulfills the human-plan handoff.
