# CO-4 — D-36.A3 step 1: "Use now" for a new failure in flight / ใช้ทันที

A CO-4 step for owner decision D-36.A3 (wave K1). The first in-flight value that can still really be adjusted — a new control-system failure in a live six-DOF flight, including one launched with no failures (fixed after review: `b281be8` offered it only when the flight already carried a list) — is editable in ⚙ Setup and takes effect only when the user presses **Use now**. Every other value stays locked in flight.

```yaml
envelope: v2
package: CO-4
step: D-36.A3 step 1
family: CO
wave: K1
lane: I
items: [D-36.A3]
change_kind: feature (bug-fix of "read-only as built" per the owner's D-36.A3 note)
execution_authorized: true
owner_authorization: {date: 2026-10-05, quote: "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high", scope: "wave K1"}
decision: {id: D-36.A3, date: 2026-10-05, owner_words: ["แก้ไขได้ในค่าที่ยังสามารถปรับได้จริง ค่าไหนที่เลยช่วงเวลาการแก้ไปแล้วให้ไม่สามารถแก้ไขได้ ต้องแก้ด้วยการเริ่มใหม่", "กดยืนยันก่อนมีผล"]}
base_sha_verified_on: {sha: 272a3b9, date: 2026-10-05}
allowed_write_paths: [src/ui/edit-window.ts, src/ui/panel.ts, src/main.ts, src/style.css, src/i18n/en.ts, src/i18n/th.ts, src/i18n/ru.ts, tests/edit-window.test.ts, tests/control-faults.test.ts, tests/panel-held-edit.test.ts, tests/browser/journeys/d36a3-use-now.mjs]
physics_or_session_changed: false
rollback: {method: revert, data_compat: "no stored-data, recorder, journal or mission-file format change"}
reviewers: [second-agent, owner]
report: docs/development/reports/CO-4-d36a3-step1.md
```

## The owner's words

D-36.A3 (sheet A-2, with the note): "แก้ไขได้ในค่าที่ยังสามารถปรับได้จริง ค่าไหนที่เลยช่วงเวลาการแก้ไปแล้วให้ไม่สามารถแก้ไขได้ ต้องแก้ด้วยการเริ่มใหม่" — values that can still really be adjusted may be edited; a value whose time for editing has passed cannot be edited and needs a restart. Follow-up answer in chat (2026-10-05 ~19:55Z): "กดยืนยันก่อนมีผล" — an in-flight edit takes effect only when the user confirms it ("use now"), so a slip mid-flight does not change the flight.

## What changed

- **`src/ui/edit-window.ts` (new, pure):** `editWindow(field, flight)` → `{ when: 'now' | 'next-launch' | 'locked', reason? }` from one table (`IN_FLIGHT`) over the setup's sections (`vehicle`, `site`, `payload`, `orbit`, `rendezvous`, `guidance`, `failure`, `options`, `dynamics`, `flex`, `control`, `navigation`, `explicit`, `dispersion`, `faults` — the panel's `data-section` keys, and the steps 01–03). Setup → `next-launch` (preview as before); analysis → `locked/finished`; flight → `now` only for `faults` in a six-DOF, live (cursor at the recording head, as `player.live` decides for the loop inspector) flight that has not failed; all others `locked/pastWindow`. Gains (`control`), guidance (`guidance`, `explicit`) and `rendezvous` stay locked in this step; the table's comments name the later CO-4 steps that add them (they need physics work). `useFaultNow(target, spec, flight)` gives a failure to the flight only while its window is open.
- **`src/ui/panel.ts`:** in flight, when the failures' window is `now`, the section shows one new failure as a **draft** (the existing failures, the preset and FDIR stay disabled). Nothing reaches the flight until the primary **Use now** / **ใช้ทันที** / **Применить сейчас** button: it calls the new host callback `onApplyNow(spec)`; when the flight takes it, the failure is appended to the setup's list (reported as an `edit`, so it is held for the next launch and flown from the pad, not previewed over the flight). Sections past their window show "Restart to change" / "เริ่มใหม่เพื่อแก้" / "Перезапустите, чтобы изменить" ("Back to the live flight to change" while scrubbed back). `setEditFlight(flight, t)` rebuilds the setup only when a window changes.
- **`src/main.ts`:** `onApplyNow` → `useFaultNow(this.sim, …)`, i.e. the session's existing `injectControlFault` → ToCore `controlFault` → `Simulation.injectControlFault`, journaled as a `FlightAction`. `syncLifecycle` hands the panel the flight's stage, six-DOF, live and failed flags.
- **i18n:** 5 keys `setup.edit.*` in en/th/ru. **CSS:** the draft box and its primary button.
- No file under `src/physics/**` or `src/session/**` changed.

## Tests (written first)

| Command | Before the implementation (`272a3b9` + tests) | After |
|---|---|---|
| `npx vitest run tests/edit-window.test.ts` | ✗ file failed: `Cannot find module '../src/ui/edit-window'` (0/8) | 8/8 passed |
| `npx vitest run tests/control-faults.test.ts` (new: a failure used now mid-flight is in `sim.actions`, and re-flying `sim.cfg` + the journal, as recheck does, gives the same `evt.controlFault`) | ✗ file failed: `Cannot find module '../src/ui/edit-window'` (0/28) | 28/28 passed |
| `npx vitest run tests/panel-held-edit.test.ts` (new: draft changes nothing; Use now injects then holds it in the setup as an edit; a refusal changes nothing) | 3 failed (`p.draftFault is not a function`), 2 passed | 5/5 passed |
| `npx vitest run tests/edit-window.test.ts tests/control-faults.test.ts tests/i18n.test.ts tests/repo-hygiene.test.ts tests/panel-held-edit.test.ts` | — | 69/69 passed |
| plus `tests/dynamics-panel.test.ts tests/architecture.test.ts tests/flight-lifecycle.test.ts` | — | 89/89 passed (8 files) |
| other panel tests: `explore fleet-defaults mcp design-handoff design-readiness d06-satellite-verdict` | — | 289/290 in one run; the one was `d06-satellite-verdict` timing out at 5 s under load; alone 3/3 passed |
| **After the review fixes:** `tests/panel-held-edit.test.ts` (3 new section tests) | `b281be8`: 2 failed, 6 passed | 8/8 passed |
| after the fixes: edit-window, control-faults, panel-held-edit, i18n, repo-hygiene, dynamics-panel, architecture, flight-lifecycle | — | 92/92 passed (8 files) |
| after the fixes: explore, fleet-defaults, mcp, design-handoff, design-readiness, d06-satellite-verdict, instructor-mode | — | 301/301 passed (7 files) |
| after the fixes: `npm run typecheck`; `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` | — | clean; 64/64 passed |
| `npm run typecheck` | — | clean |
| `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` | — | 64/64 passed |

**Browser journey `tests/browser/journeys/d36a3-use-now.mjs`: run after the review (see below).** It launches six-DOF, warps to ~T+30 s, pauses and settles, opens ⚙ Setup, drafts a failure, checks no `evt.controlFault` and the same cursor/recording before confirming, presses Use now, plays until the failure strikes, and checks the recording kept its start and grew, the failure is in the setup's list and the vehicle selector stays disabled. `timeoutMs` 240 s, as `lui01-held-tuning`.

## Second-agent review (b281be8) and the fixes

- **Blocking, fixed:** on `b281be8` the draft was built after `faultsSection()`'s `if (!config) return section;`, so a six-DOF flight launched with no failures (the default) never offered "Add a failure"/"Use now". The draft is now built before that return, in any live six-DOF flight, with or without a list. New unit test (`tests/panel-held-edit.test.ts`, the section built on a minimal fake DOM): on `b281be8` 2 failed ("offers a new failure in a flight launched with none": `expected undefined to be defined`; "beside a list": the same, by the new add button's class), 6 passed; after, 8/8. The journey launches with no failures, so it walks this path.
- **Focus:** a rebuild restores focus by `aria-label` only; the draft now moves the focus itself — to the draft's first field after "Add a failure to this flight" (its own label, distinct from the list's "Add a failure"), to the same place in the draft after a field change, and back to the add button after Use now.
- **Status:** one `role="status"` line in the draft, rewritten in place: "The flight did not take this failure." on a refusal, "Used in this flight, and kept in the list for the next launch." after Use now (en/th/ru).
- **Timing line** under the draft: the live flight takes it on Use now (at once if its time has passed); the next launch flies it at the time entered.
- **Known edge, not fixed (named):** in the app the flight runs in a worker. `FlightSession.injectControlFault` (`src/session/session.ts` ~251) answers `injected` after the main thread's own checks (six-DOF, valid, not failed/done) and posts `controlFault`; the worker's `Simulation.injectControlFault` repeats those checks on its own, newer state and can still refuse (for example if the vehicle is lost in the frames in flight between the click and the message), and it sends no answer back. The panel has then already put the failure in the setup's list, so the next launch flies it although this flight did not. Waiting for a worker answer needs a protocol change in `src/session/**`, outside this step.

## Browser run and the paused cursor

The coordinator's first browser run of `7016e05` failed once: `FAIL: the flight changed before "Use now": T-10…T+33.91 s → T-10…T+33.91 s` — start and head equal, so the cursor had moved (the message did not print it; it does now, with the mode).

- **Probed:** 4 runs on `7016e05` + probes, reading the paused flight every second for 4 s, after ⚙ Setup and after the draft: the cursor never moved (for example 34.08 s with the head at 34.01 s, through every probe). Opening ⚙ Setup, the failures section and the draft does not move it; no app path snaps a paused live cursor to the head (`goLive`/`seek` are not reached from these controls).
- **Cause (not reproduced on this machine, the only path left):** the live cursor is the worker's live instant (`RecordingMirror.recordNow`), which runs ahead of the last stored frame (34.08 vs 34.01 above). After the pause the worker still answers up to two outstanding `advance` requests (`MAX_OUTSTANDING`, `src/session/session.ts`); an answer cut short by its wall-clock budget on a starved worker moves the live instant by a step or two without storing a frame. The journey's settle (two equal reads 1 s apart) cannot tell a starved worker from an idle one, and the coordinator's machine was busy. This is the design (frames already flown are kept, as the LUI-01 report records), not an app bug.
- **Fix (journey only):** the settle now also waits until the session has no request outstanding (`window.orbitlab.session.pendingAdvance.size === 0`, read as other journeys read `window.orbitlab`; the journey fails loudly if that cannot be read). The equality check on the cursor is kept exactly.
- **After:** `npm run build`, then `CHROMIUM=/opt/pw-browsers/chromium node tests/browser/run.mjs d36a3-use-now lui01-held-tuning`: ✓ d36a3-use-now (98.1 s), ✓ lui01-held-tuning (96.2 s), 2/2 passed; one more single run of d36a3-use-now also passed (101.1 s).
- **Follow-up:** `lui01-held-tuning` has the same two-read settle and could flake the same way on a busy machine; not changed here.

## Limits and handoff

- The draft's time defaults to the flight's current time (rounded up); a time already past strikes at once in the live flight but at that time from the pad next launch — as `injectControlFault` documents.
- FDIR cannot be switched in flight in this step (the live injection keeps the flight's FDIR setting).
- Next CO-4 steps for D-36.A3: attitude-loop gains in flight, guidance retargeting, rendezvous target — each needs physics work and its own PR.
