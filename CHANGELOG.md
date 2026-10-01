# Changelog

All notable changes to Orbitlab are recorded here, newest first, one line per
merged pull request. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Orbitlab has no tagged release yet.

## Unreleased

- Top bar: the ORBITLAB name leads home (no Home tab); a tab per section opens the menu of its levels, the current level a badge on its tab, and a phone gets one button opening a table of sections × levels; Thai levels are รับชม (launch only) / พื้นฐาน · ทดลอง · วิศวกร; a Campaign tab marks the section still to come.
- App: a new Orbitlab mark — a delta in the Thai flag's stripes (red, white, blue, white, red) with a white orbit and a satellite across it — in the top bar and the About tab, and the favicon and PWA icons made from it by `npm run icons` (scripts/icons.mjs); the mark is drawn once, in index.html.
- Graphics: the 3-D Earth on 4096 × 2048 colour, night-light and cloud maps (NASA Blue Marble / Black Marble, colour-matched to the old look) with 16x anisotropic filtering and a 2048² pad shadow map, orbit views and 2-D canvases up to a 3x pixel ratio; rocket stages painted at twice the resolution with a relief map of joints, welds and raceways, engine bells with coolant tubes and a sooty inside; satellites built from solar cells, crinkled gold MLI and radiator mirrors, with engines, thrusters and antennas.
- App: developer credit — the Physics & sources dialog becomes "About" (ⓘ, shown on every page including Home and Watch) with two tabs: About (the Orbitlab mark, version and build, maker, licences, links to the repository, NOTICE and CITATION, and the README disclaimer) and Physics & sources; the footer gains "Made by Royin · v0.1.0 · About", which opens the About tab; all three languages; the name and links live in src/credits.ts.
- CI: the weekly heavy suite runs one job per test file (the whole suite in one job ran past its hour and was cancelled); Falcon 9's six-DOF webcast comparison re-measured for Bangabandhu-1 after C01's drone-ship reserve.
- Docs: user-test protocol for October 2026 (Thai) — five timed tasks, observer script, printable forms, PDPA rules and the wave 3 decisions it must settle.
- CI: vitest sharded three ways, typecheck as its own job, build once and reuse dist for browser smoke, deploy guarded against re-running old runs and skipping the full suite on the daily schedule, weekly heavy and monthly six-DOF fleet runs; the viewer missions' flights split out of tests/watch-missions.test.ts into several files that vitest runs in parallel and the shards balance, and the test job's time limit raised from 20 to 30 minutes as a guard against runner variance.
- Repository: LICENSE (Apache-2.0), NOTICE, CITATION, pull request template, CHANGELOG; README disclaimer, licence section and three stale facts corrected.
- Engineer tools (audit A17, A18): the attitude-loop inspector's Auto-tune runs in a worker with progress, Cancel and stale-answer protection; a Monte Carlo pool that cannot start or replace a worker ends every worker it made and reports `failed`.
- App: build stamp in Physics & sources and build-info.json + SHA256SUMS in dist; report.ts imports made static and a bundle budget script; repository-hygiene and architecture fitness tests; soundtrack runtime-cached on the public site (precached with ORBITLAB_PRECACHE_AUDIO=1).

### 2026-09 (unreleased, before the first tagged release)

- #42: the implementation status says the daily build runs, about six and a half hours late, and refreshes all three data sources.
- #40: Phase 3 of the Build section, its Explore level (remix a real rocket or build one from parts, save it, "Fly it") and Engineer level (test stand, wind tunnel, flight readiness review, optimal staging, sizing), with its docs.
- #39: snapshot-pinned tests read their data instead of naming it, and the deploy gate also runs the Earth-orientation and activity tests on fresh snapshots.
- #37: the Build section's Watch level, real rockets drawn to scale and taken apart with part cards, a stage table and a tour.
- #35: PSLV-XL's slow first stage is traced to its ascent profile, not its solid-motor thrust curve (F12).
- #34: a reusable browser harness, three smoke journeys run on pull requests, and a deploy that checks fresh snapshots and the built site before publishing.
- #33: the Launch workspace keeps its own mission, Home offers to continue the last mission, and a clicked Monte Carlo run opens as its own mission.
- #32: Orbit refuses a spacecraft with more propellant than mass, keeps the propellant field in place, and hands on the orbit it computed.
- #31: Watch ends an orbital flight at its final orbit, not its parking orbit, and sums it up on a pausing end card.
- #30: Orbit results and real-satellite readouts are kept with the inputs and data that produced them.
- #29: a landing page that shows the program off, ending on the space station.
- #28: the placement test keeps unsent answers through a language change and explains its confidence.
- #27: lessons record the mission as flown, say which steps are graded, and say whether progress was saved.
