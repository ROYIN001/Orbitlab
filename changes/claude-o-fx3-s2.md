## CHANGELOG

- Orbit and Watch (FX-3 step 2: M-ORBIT-001, M-ORBIT-029): the Thai satellites note no longer says that following real satellites comes with a later phase, and a "Show in Real satellites" button opens Real satellites on the Thai group with the same satellite picked (none for NAPA-2, which has re-entered); Watch's Apollo 11 flight labels the Moon "Apollo 11's week only (DE441 table)" while it is drawn, and README no longer says the Moon is not modelled (D-11). EN, TH and RU.

## PROGRESS

| FX-3 step 2 (M-ORBIT-001, M-ORBIT-029, wave K1, lane O) | In PR; not merged; not published | `use.thai.nominal` keeps the catalogue-date and "shape, not where it is now" sentence and drops the stale promise; `use.thai.inSky` button → `RealSky.showForTour('thai', norad)` via `thaiInSky(id)` (`playground-model.ts`); Watch `watch.moonScope` label shown exactly while the frame carries `apollo` (inline style, no CSS); README lessons 5.3–5.5 sentence; THEOS-2A not added (lost in the PSLV-C62 failure, 2026-01-12; no catalogue entry); unit test 11/11 (9 failed before), journey `fx3-thai-in-sky` (6 failures on main); precache code +0.9 kB, within its ceiling; O | [FX-3 step 2 report](reports/FX-3-s2-thai-copy-moon-label.md) |
