# Orbitlab documentation

Read in this order. Each document assumes the ones before it.

| # | Document | What it is |
|---|---|---|
| 1 | [USER-GUIDE.md](USER-GUIDE.md) | Flying a mission: the four modes, what each flight phase means, how to read the telemetry, the replay, the keyboard. |
| 2 | [PHYSICS.md](PHYSICS.md) | The model: frames, forces, atmosphere, propulsion (including engine start-up and tail-off), guidance, mission sequencing, launch geometry, fleet acceptance, assumptions and limitations, and a glossary in English, Russian and Thai. |
| 3 | [SIXDOF-VEHICLE-DATA.md](SIXDOF-VEHICLE-DATA.md) | The rigid-body (six-DOF) data for Falcon 9 and Soyuz-2.1a: masses, centres of gravity, inertias, engines and actuators, with sources and uncertainty. |
| 4 | [SIXDOF-ACCEPTANCE.md](SIXDOF-ACCEPTANCE.md) | The gates the six-DOF model was accepted against and the results, dated. |
| 5 | [SIXDOF-BROWSER-QA.md](SIXDOF-BROWSER-QA.md) | Browser checks of the six-DOF build: what was verified by hand, performance and memory limits. |
| 6 | [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md) | Where the project stands now: what is done, what is experimental, what is next, and how it is tested. |
| 7 | [VALIDATION.md](VALIDATION.md) | The simulator against real flight data: Falcon 9 webcast telemetry of five flights, the tolerances, where it disagrees and why. |

The repository's own [README](../README.md) covers installing, running and the source layout.

## Records

[history/](history/) keeps the working records the project was built from. They are dated,
they describe the code as it was on that day, and where they disagree with the documents above,
the documents above are right. File names they mention without a folder are in `docs/`.

| Record | Date | What it is |
|---|---|---|
| [AUDIT-2026-09-16.md](history/AUDIT-2026-09-16.md) | 2026-09-16 | The code audit whose numbered items (B1, B26, …) the source comments cite. |
| [ARCHITECTURE-PLAN.md](history/ARCHITECTURE-PLAN.md) | 2026-09-16 | The plan the audit's fixes were organised into. |
| [HANDOFFS.md](history/HANDOFFS.md) | 2026-09-17 | Open items handed from the second work wave to the third. |
| [DELIVERY-2026-09-17.md](history/DELIVERY-2026-09-17.md) | 2026-09-17 | What the first delivery contained. |
| [RELEASE-REVIEW-2.md](history/RELEASE-REVIEW-2.md) | 2026-09-17 | The second release review. |
| [SIXDOF-UI-SOURCE-REVIEW.md](history/SIXDOF-UI-SOURCE-REVIEW.md) | 2026-09-19 | Source review of the six-DOF user interface. |
| [CONTINUE-PHASE-6.md](history/CONTINUE-PHASE-6.md) | 2026-09-19/20 | The hand-over note for resuming the six-DOF phase (Thai). |
| [CHECKPOINT-2026-09-20.md](history/CHECKPOINT-2026-09-20.md) | 2026-09-19/20 | The status file as it stood when the six-DOF phase was accepted. It was appended to over two days and contradicts itself; [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md) replaces it. |
