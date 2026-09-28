# S1 — Launch workspace state: notes

Session S1 of [PLAN-2026-09-28.md](PLAN-2026-09-28.md): A1, A10 and the Home badge of A8.
Branch `claude/audit0927-s1-launch-state`, from `main` at `dba7b0a`.

## What was done

### A1 — the workspace's mission survives a reload through Home, Watch, Orbit or Build

The setup panel holds one mission, but two kinds pass through it: the user's (the workspace's, which the
page stores) and a viewer's (the featured launch behind the landing page, or a launch picked in Watch).
The rules are now one DOM-free module, `src/ui/workspace-mission.ts`:

- `startupMission({ link, lean, stored })` — at start-up a mission link (`?m=`) wins, then a lean page
  (Home, Watch, Orbit, Build) opens on the featured launch **as the viewer's**, then a workspace page on the
  stored mission, else the panel's default.
- `WorkspaceMission` tracks who the panel's mission belongs to (`workspace` / `demo` / `watch`):
  - `persists(doc)` — `preview()` stores the mission only when it is the user's. A viewer's mission becomes
    the user's the first time it differs from what the viewer loaded (a panel edit, a quick start, a WebMCP
    edit), and is stored from then on. Watch launches are never stored as they were loaded.
  - `entering({ doc, stored, underway })` — entering Explore or Engineer with a viewer's launch untouched on
    its pad brings the stored mission back. A viewer's launch that is flying or has flown is kept (the
    "explore this launch" continuity described in `setRoute`); the stored mission is not overwritten and
    comes back on the next reload or through Home's continue card.
  - `adopt()` — the stored mission, a link, a lesson, a Monte Carlo run: the user's.
- `src/main.ts` calls these from `init`, `startWatch`, `setRoute` (`restoreWorkspaceMission`, before the
  panel's layout changes), `preview`, `openMissionLink`, the lessons' `loadMission` and the Monte Carlo
  window's `onOpenRun`. Missions are compared as the stored document's JSON text.
- The old `if (!this.lean) saveStoredMission(...)` is gone: what is stored depends on whose mission it is,
  not on the mode showing.
- Side fix: a stored copy that is unusable now previews the panel's mission instead of leaving no flight
  (the link path already did this).

### A10 — a clicked Monte Carlo point opens the set's own mission

- `MonteCarloWindowHost` gains `missionState()`; `start()` keeps a copy of the panel's `MissionState` with
  the job.
- New pure `runMissionState(set, run)` in `src/ui/monte-carlo.ts`: the set's mission whole, with
  `dispersedRunMission(cfg, mc, run).dynamics` (law and dispersion draw).
- `onOpenRun` now receives a whole `MissionState`; `main.ts` restores it as is (no merge with today's setup)
  and marks it the user's.
- The window says which run was opened: `mc.opened` — "Run 7 of this set (seed 1, PEG) is open in the setup
  panel…", in a `role="status"` line under the scatter.

### A8 (badge) — Home says Orbit works

- The Orbit card has a "Ready to use" badge (`section.ready`, accent colour) and three ways in, like Launch:
  the tour (Watch), the playground with the real satellites (Explore), manoeuvre planning (Engineer).
- Build keeps "In development" and its plan link.
- `home.section.orbitOpen` had no call site left and was removed from en/ru/th.

### Extra (the plan's "if time allows") — "Continue your last mission" on Home

- When a stored mission exists, Home shows a card under the play button: vehicle · payload · target orbit
  (`missionSummary`, read off the stored document). Pressing it opens the launch workspace at the level last
  used (`loadExperience()`: Engineer if the panel was last advanced, else Explore) on that mission. If the
  panel already holds the user's mission (e.g. a flight of it is under way) it is left as is.
- Home re-renders when it is shown, so the card follows the stored mission.

## Merge with main (after S2a, S3, S4a, S6 and the Home redesign)

`main` replaced the landing page with a scrolling page of chapters (`src/ui/home.ts`, `home.css`,
`home-stage.ts`) and built the Build section's first levels. Resolved as follows:

- **A8 badge: superseded.** The new Home has no section cards and no "In development" badge; Orbit has its own
  chapter with a call to action. The S1 Orbit card, `section.ready`, `home.orbit.*` and the `.section-badge.ready`
  rule were dropped; `home.section.orbitOpen` is used again by the new page and stays.
- **Continue card: kept**, moved into the new page's first screen under its two buttons, styled in `home.css`
  (`.home-resume`). `HomeHost` keeps `lastMission()` / `continueMission()`; `refresh()` re-renders on the way back.
- **`main.ts`**: `HomeStage`, `BuildScreen` and `homeStage.leave()` from main alongside the A1/A10 wiring;
  `modes.css` is main's.

The sections below describe the branch before the merge.

## Decisions

- **Watch → workspace keeps the watched flight.** The plan asks that Watch never overwrite the user's
  mission; it does not say what the workspace should show after watching. Keeping the flight on screen
  preserves the existing "explore this launch" behaviour; the user's mission is safe in storage and is one
  press away on Home. If the owner prefers the workspace always to switch back, change `entering` to ignore
  `underway` for `watch` (one line, and the test "a launch watched on the way…" states the current rule).
- **A viewer's mission edited before the workspace is entered is the user's** (e.g. WebMCP
  `configure_mission` on Home): it is kept and stored, never replaced by the older stored mission.
- **New module rather than `app-mode.ts`** — the rules concern the mission, not the route; a new file also
  keeps clear of other sessions' merges. Tests are in the new `tests/workspace-mission.test.ts` (with the
  full-restore cases in `tests/mission-file.test.ts`).
- **`src/ui/modes.css`** — two small rules were added (`.section-badge.ready`, `.home-resume-box`). The file is
  not on the forbidden list; S8 owns it in wave 2, so its merge should expect them.
- **Real satellites as its own Home entry** was not added: opening the playground straight into the real
  satellites needs a public method on `OrbitPlayground` (its `setMode` is private, and
  `src/ui/orbit/**` is S2a's). The Explore entry's text names the real satellites instead.

## Tests added

- `tests/workspace-mission.test.ts` (new, 15 tests): `startupMission`; the `persists` and `entering` rules;
  journeys through a page model that calls them the way `main.ts` does — the audit's (Falcon 9 in Engineer →
  Home → reload → Engineer, whole), reload on each of Home/Watch/Orbit/Build, start in Engineer, a mission
  link before the stored mission, Watch on the way, a viewer's mission changed before entering, a first
  visit; `missionSummary`.
- `tests/mission-file.test.ts` (+2): the stored mission parsed over the featured viewer launch (what the
  panel holds when the workspace is entered after Home) comes back whole — vehicle, payload, orbit, guidance
  overrides, failure, dynamics with seed, recovery, launch time — for the full-option mission, a custom
  vehicle (`vehicleSpec`) and the Falcon 9 quick start.
- `tests/monte-carlo.test.ts` (+3): `runMissionState` is the set's mission with that run's dynamics (law,
  `{seed, run}`), valid for the panel; shares nothing with the set; carries non-default dispersion settings.

Built-in flights are not touched: no physics, data or guidance file changed.

## Browser check (npm run dev, Chromium via Playwright)

Run against `npm run dev` with Playwright and the pre-installed Chromium (SwiftShader), scripts kept outside the
repository. The mission was set through the panel (quick start) and `applyExternalEdit` (the WebMCP path) for the
Engineer-only values.

- **A1, the audit's journey.** Quick start Falcon 9 LEO (1 000 kg) → Engineer, seed 777, kick angle 4.5°,
  thrust-loss failure → for each of `#/home`, `#/launch/watch`, `#/orbit/explore`, `#/build/explore`: reload
  there (the page shows the featured Soyuz-2.1a / 7 150 kg, storage still holds the Falcon 9) → Home →
  Engineer: **the same mission every time** (vehicle, payload, orbit, seed, guidance override, failure,
  launch time compared).
- **A1, Watch on the way.** Reload on Home → Watch → Electron launch flying → Explore: the Electron flight is
  on screen, the stored mission is still the Falcon 9 (seed 777).
- **Continue card.** After a GTO quick start and a reload on Home the card reads "Falcon 9 Block 5 · 5,500 kg ·
  target orbit 250 × 35,786 km" (en), "… 5 500 кг … 35 786 км" (ru), "ทำต่อจากภารกิจล่าสุด … 5,500 กก. …" (th);
  pressing it opens `#/launch/engineer` on Falcon 9 / 5 500 kg / GTO.
- **A8.** Orbit badge "Ready to use" / "Готово к работе" / "พร้อมใช้งาน" in the accent colour; Build keeps
  "In development"; the Orbit tour entry opens `#/orbit/watch`.
- **A10.** Falcon 9 LEO 1 000 kg with kick 4.5° → a 20-run set, seed 1, stopped after 3 runs → quick start
  Soyuz to the ISS (7 150 kg) → click run 2 on the scatter: the panel opens **Falcon 9 / 1 000 kg / LEO / kick
  4.5° / dispersion {seed 1, run 1}** (run index 1 = "Run 2"), and the window reads "Run 2 of this set (seed 1,
  Standard) is open in the setup panel…". The click was dispatched on the canvas at the point's coordinates
  (a Playwright mouse click at those coordinates missed under SwiftShader; a manual check on a desktop browser
  is worth doing).

`npm run typecheck` and `npm test` (129 files, 1 690 tests) pass on the branch head; each intermediate commit
typechecks and passes the tests it touches. No `tests/probe/` was created.

## Left for other sessions (files S1 must not touch)

- **S2a (`src/ui/orbit/playground.ts`)**: a public `showRealSatellites()` (or a `#/orbit/explore?sky` form)
  would let Home link straight to Real satellites, as the plan suggested.
- **S6/S10 (`tests/browser/**`)**: a journey for A1 — Quick start Falcon 9 → Engineer → Home → reload →
  Engineer expects Falcon 9 / 1 000 kg; also through Watch (start a launch, go to Explore, reload in
  Engineer). And one for A10: run a small set, change the vehicle, click a point, expect the set's vehicle
  and the "Run n" status line.
- **S5 (`src/i18n` wording)**: `home.section.orbitText` in Thai still uses "การนำทาง" for navigation
  (decision D5).
- **S4c**: `onOpenRun` now takes a whole `MissionState`; lesson 2.4 evidence that hooks into the Monte Carlo
  window should use `runMissionState` rather than rebuilding a run from the panel.
