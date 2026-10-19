---
name: orbitlab-webapp-testing
description: "Select and report OrbitLab verification for rendering, UI, and physics changes. Use when validating a change or investigating a failed browser, WebGL, numerical, or replay test, using the repository's verification and evidence contracts."
---

# OrbitLab Verification and Testing

## Scope and evidence baseline

This custom skill incorporates the source-review findings for public commit
`1dd8d945c3b6ad716c8bcf90806d5c0c355e0699` (reviewed 2026-10-18).
It adapts verification concepts to the reviewed repository; it does not claim a
third-party skill revision or verification of the current working tree.

Apply it within the authorized assignment. Review-only work remains read-only.
This skill does not authorize installation, unrelated application changes,
altering CI gates, relaxing assertions, or deployment. Respect explicitly bounded
test selections and worker limits; report missing wider evidence rather than
silently expanding a bounded run or claiming full acceptance. Where this skill
differs from the current project instructions (`docs/DECISIONS.md`,
`docs/development/SESSION-PROTOCOL.md`, `docs/development/VERIFICATION.md`, read
with their own status and precedence notes), follow the project instructions
within the assigned scope and report the difference. This does not widen the
assignment: a project step such as `npm ci`, a Node switch, or a wider suite
still needs the task's authorization, and a requirement that a bounded run leaves
unmet is reported as a gap.

## Select checks and preserve evidence

1. Identify the active checkout/revision and relevant local changes. Read current
   project instructions, `docs/development/VERIFICATION.md`, `package.json`, and
   the applicable workflow/configuration before selecting commands. If a referenced
   file is absent or has changed, resolve the current equivalent from evidence;
   report a material mismatch instead of inventing a command or recreating old code.
2. Follow the documented runtime, dependency, plan, and artifact requirements.
   Node `22.23.3` is the reviewed baseline, not a permanent override of current
   repository requirements. Use the existing verification wrappers where required.
   If the available runtime or installed dependencies differ, do not install or
   switch toolchains unless the task authorizes it; record the actual runtime and
   state that results from it are not CI-equivalent evidence.
3. Use the change-to-check map for early feedback and impact-based domain checks.
   This selection does not replace the complete applicable CI/release gates or
   domain acceptance required by the verification document. Match the claim and
   requested scope to the checks actually completed. The range form of
   `select-checks.mjs` sees only committed changes and depends on a current base
   ref; for uncommitted work or a stale local `origin/main`, name the changed
   paths with `--files`.
4. Distinguish CI job identifiers such as `verify` and `browser-smoke` from local
   npm scripts. At the baseline, `test:browser:smoke` does not build.
   `run.mjs`/`serve.mjs` only check that `dist/index.html` exists, and
   `build-info.json` identifies the source only by the short HEAD SHA, so neither
   shows whether `dist/` contains uncommitted edits. For a direct local smoke run,
   rebuild after the last relevant edit, or use the plan → `run-command.mjs build` →
   `run-browser.mjs` wrappers, which compare source identity and the dist
   manifest. For planned CI/Pages runs, test the designated shared artifact and
   preserve its identity; do not rebuild independently in each shard. PR CI runs
   only the smoke journeys (at the baseline `fx8-context-loss` is not one), so a
   green `browser-smoke` does not cover other journeys the change selects.
5. Keep source, local diff/input inventory, runtime, build/data, run/attempt, and
   results consistent with the current evidence contract. Do not combine artifacts
   from different candidates, or treat an earlier pass as current after a relevant
   edit. The owner-approved exception is D-64: a green heavy or six-DOF fleet run
   may be reused while the physics-tree content hashes are unchanged
   (`src/physics`, `src/data`, workers, `tests/heavy`, `tests/sixdof-fleet`,
   lockfile, Node). Name the reused run, its SHA, and the hash comparison. Reuse
   never applies to browser journeys or unit gates. Interrupted, missing,
   skipped-required, or failed gates are not a passing union. A held journey
   (`⏸ <name>: held, not run`) counts as not run, even when `run.mjs` exits 0.

## Browser journeys and diagnostics

- Reuse the repository's harness and concrete journeys. At the baseline,
  `t.open()` registers no `console` listener; its only error listener before its
  internal `page.goto()` is `pageerror`, and page errors fail the journey only
  when it calls `app.checkErrors()`. three.js reports shader compile/link
  failures with `console.error` ('THREE.WebGLProgram: Shader Error …'), not as
  page errors, so a green journey does not show they are absent. Where the change
  can produce WebGL or shader diagnostics, collect console messages in that
  journey and assert on them. For diagnostics raised during startup, open the
  context and page yourself, as `webgl-startup.mjs` does, so the listeners exist
  before `page.goto()`. Observe relevant context-loss events; registering a
  listener without checking its results is not an assertion. Changing the shared
  harness is a separate change that selects every journey. Report diagnostics the
  run did not capture as a coverage limit.
- Fail on unexpected runtime exceptions, unhandled rejections, WebGL errors,
  context loss, and shader compilation/link failures that the journey captured.
  Do not rely on one exact log prefix to identify every failure.
- Preserve intentional fault-injection tests. Allow only their specifically
  expected faults/known diagnostics within the test's defined scope, then assert
  recovery or the intended remediation UI. Do not broaden suppression or remove
  recovery tests merely to obtain a green result.
- Wait for meaningful readiness and the required rendered/simulation state with
  bounded waits. Avoid arbitrary sleeps as the proof that initialization finished.
- At the baseline, `#gl`, `#map`, and `#onboard` have mode-dependent visibility.
  Check expected DOM presence separately from visibility, drawing size, and
  context state. `#gl` is not drawn in map mode, nor while an opaque page (the
  Orbit or Build section, a lessons page, a covering Home), a modal
  `dialog.dialog`, or a hidden tab covers the scene, so frame or pixel assertions
  on it apply only where it is drawn. Require visible non-zero dimensions only
  where the mode calls for them; preserve the deliberately unavailable-context
  startup test.
- Trigger the changed path: relevant ignition, staging, shader/effect, camera
  switch, pause/seek/replay, or UI action. A mounted canvas/context alone does not
  prove that the affected material rendered or the simulation advanced. Use
  scenario-appropriate state/visual assertions and keep useful failure artifacts.
- Headless/software-rendered correctness tests do not establish hardware FPS.
  Record device, resolution, workload, and measurement method for performance claims.

## Numerical and replay regressions

- Finite state vectors are only a baseline check. Select relevant quaternion-norm,
  event ordering, terminal/orbit accuracy, convergence, and navigation/structural
  checks from existing acceptance criteria. Apply energy/momentum bounds to the
  correct physical scenario; a powered, mass-changing vehicle is not a closed
  conservative system. Do not invent universal tolerances from this skill.
- Include timestep sensitivity and worker/recording/replay boundaries when
  affected. Compare displayed/replayed states at matching timestamps and preserve
  event semantics, rather than accepting merely finite output.
- Standard `npm test` excludes heavy/fleet suites at the baseline. Use the current
  change map and verification document to select relevant additional cases for
  physics/GNC changes. Name the cases run and state any remaining acceptance gap.
  Shared physics work is not mergeable without its relevant heavy/fleet cases
  (VERIFICATION.md change map and merge rule; SESSION-PROTOCOL §7: never skip
  heavy), apart from the D-64 reuse above; a bounded run that omits them reports
  a blocking gap, not a minor one.
- Keep scientific outcome distinct from test-process success. A finite trajectory
  or zero exit status alone does not prove the requested mission result. Display
  conventions such as a defined infinite gain margin are separate from finite
  simulation-state requirements.

## Diagnose failures and report results

Preserve the failure evidence. Inspect the full trace, shader log, or numerical
assertion, and reproduce or isolate the cause before changing the code or test
under suspicion. Fix the cause. Do not re-run hoping for a pass without knowing
the cause, make a longer timeout or a retry the fix, or drop cases
(SESSION-PROTOCOL §7; VERIFICATION.md: no blind retries). A reproduction run, or
diagnostics added within the task to find the cause, is not such a re-run.
Changing an existing assertion,
tolerance, golden or expected value is an owner decision (SESSION-PROTOCOL §1
step 3): present it with the evidence instead of treating it as a routine fix.
Explain why the correction addresses the cause. Do not silence a failing test or
weaken acceptance to obtain a pass. A later passing run does not erase an earlier
failure; report both.

Report the source revision and relevant local changes, runtime, executed commands,
selected cases/suites with their counts, build/data identity when applicable,
final results, and evidence paths; for a bug fix, include the test that failed
before the fix and passes after it. Distinguish **passed**, **failed**,
**not run**, and **blocked**. For each incomplete check, give the reason and
resulting limit on the claim. Targeted checks are not full release verification;
an environmental blocker is not a pass. Use the repository's native reports and
aggregation when required.

## Source pointers

Use the current checkout's equivalents; these are the reviewed baseline:

- [Verification workflow and evidence contract](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/docs/development/VERIFICATION.md) and [session protocol (§1, §7)](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/docs/development/SESSION-PROTOCOL.md).
- [Owner decisions, including D-64](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/docs/DECISIONS.md).
- [Package commands](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/package.json) and [CI gates](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/.github/workflows/ci.yml).
- [Harness page setup](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/tests/browser/harness.mjs#L233-L280) and [held journeys](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/tests/browser/run.mjs#L28-L37).
- [Context-loss journey](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/tests/browser/journeys/fx8-context-loss.mjs) and [startup recovery journey](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/tests/browser/journeys/webgl-startup.mjs).
- [Default-suite exclusions](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/vite.config.ts#L123-L128).
