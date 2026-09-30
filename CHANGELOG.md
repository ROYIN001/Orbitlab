# Changelog

All notable changes to Orbitlab are recorded here, newest first, one line per
merged pull request. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Orbitlab has no tagged release yet.

## Unreleased

- CI: vitest sharded three ways, typecheck as its own job, build once and reuse dist for browser smoke, deploy guarded against re-running old runs and skipping the full suite on the daily schedule, weekly heavy and monthly six-DOF fleet runs; the viewer missions' flights split out of tests/watch-missions.test.ts into several files that vitest runs in parallel and the shards balance, and the test job's time limit raised from 20 to 30 minutes as a guard against runner variance.
- Repository: LICENSE (Apache-2.0), NOTICE, CITATION, pull request template, CHANGELOG; README disclaimer, licence section and three stale facts corrected.
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
