# Changelog

All notable changes to Orbitlab are recorded here, newest first, one line per
merged pull request. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Orbitlab has no tagged release yet.

## Unreleased

- Physics: Saturn V AS-506 flies its published S-IC tilt programme (FER Fig. 11-1, digitised and turned to the local horizon) in both flight models instead of a fitted kick, and its S-IC and S-II take the flight evaluation report's loads and F-1 flow instead of loads held to the clock (the F-1 flow was 2.5 % low): liftoff 2,898.9 t (flown 2,899.0), the S-IC's LOX running out at T+161.40 s as a prediction (161.63), S-IVB cut-off −0.9 / +0.6 s (it was −6.7 / +4.9). In six-DOF the reference crosswind takes 35 kPa·deg of q·α at max Q (it was 139). Lesson 5.4: Vostok 1's failed radio cut-off was Blok A's, not Blok E's.
- Physics: Soyuz-2.1a flies its real flight. Its engines and stage loads are Arianespace's published figures (RD-108A 990 kN in vacuum, it was 922; the core's 92.7 t, it was 87 t held to the clock). Its strap-ons step to 81 % at T+112 s and are cut off by command at T+117.45 s, the core by GK-2 at T+285.05 s, after a 2 s pad start. A crewed flight carries its escape tower to T+113.5 s, and Blok I drops its aft skirt. Both flight models fly a stored R-7 pitch programme (Starsem's shape, two scalars fitted) to Blok I and the closed loop after it: the fairing at 78.8 km (flown 79), core separation at 157.3 km (157), insertion 199.9 × 239.6 km (200 × 242), max Q 35.7 kPa, under 1.4° of angle in dense air. Abort apogees: MS-10 108 km (93 flown; it was 162), 18a 167 km (192). Soyuz-2.1b shares the hardware and its published sequence. The method is in docs/FLIGHT-PROFILE-METHOD.md; the pins that moved are listed in VALIDATION.md §3.
- Physics (audit PHY-01): Soyuz-2.1a in six-DOF flies its strap-ons on a zero-lift turn from a 6° kick, holding the launch azimuth, and closes the steering loop at T+140 s, under 100 Pa; an ISS target's plane is met to 0.14° in every reference wind (it was up to 1.05°). The flow angle stays under 1° through the strap-ons' burn (it was 14°), the stack turns at no more than 1 °/s (it was 3 °/s at T+92 s), and it leaves the aerodynamic table at T+162 s under 1 Pa instead of T+124 s at 380 Pa. The Soyuz six-DOF recordings are re-recorded; the six-DOF fairing and core-separation altitudes move further from the nominal profile (VALIDATION.md §3).
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
