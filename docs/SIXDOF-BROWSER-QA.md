# Six-DOF browser checks, 2026-09-19

These are local development checks, not a deployment or final physics acceptance.
The first stable browser bundle was built at 17:07 local time into the parent
audit folder `validation/six-browser-build`, served on port 4180. It predates
later guidance, orbital-planning, recovery and achieved-speed changes. Final
checks must use the final bundle.

- In-app Chromium: manual mode remained selected on its first selection.
- A keyboard-entered 0.2 degrees/s roll command was recorded as
  0.003490658503988659 rad/s. At T258.908 s the measured roll rate was
  0.003490658503986139 rad/s, with pitch/yaw rates near zero.
- Seeking to T100 showed read-only controls. The WebMCP command endpoint also
  rejected changing live controls from replay.
- Manual throttle zero cut off the Falcon upper stage at T258.908 s; the
  subsequent recorded engine throttle was zero. A restart command at T330.778 s
  produced ignition at T334.778 s and later engine throttle one.
- Thai and Russian controls and instructions appeared correctly at a 390 by
  844 viewport. Document client/scroll widths both measured 375 pixels with the
  scrollbar present; no horizontal page overflow was observed. This is desktop
  viewport testing, not certification on a physical phone or screen reader.
- New mission allowed switching between legacy point mass and six-DOF. Legacy
  hid the rigid controls. Unsupported Falcon Heavy selected legacy in the
  earlier dev check; Falcon and Soyuz defaults selected six-DOF locally.
- No console errors or warnings were returned during the initial stable
  interaction checks. The temporary viewport override was reset afterwards.

Native keyboard entry was used for the numeric interaction check. The browser
automation `fill()` path did not commit the same native change event in this
environment; that was not counted as a successful numeric-input test.

Open checks: final bundle and camera/render review after all physics fixes,
achieved-speed display under constrained high warp, retained recording/heap
measurements, and final mission results including model-envelope warnings.

## Retained frame calibration

Node 24.19 on Windows, `--expose-gc`: capture real six-DOF states, deep-clone each
3000 times, keep the array reachable, force GC, release it and force GC again.
The retained delta excludes the original simulation, renderer and packed tracks.
Repeated states share immutable strings, so this is a shape calibration rather
than a whole-browser memory guarantee.

| Frame | Rigid bodies | Engine map entries | Measured bytes/frame | Estimate |
|---|---:|---:|---:|---:|
| Falcon, pad | 1 | 10 | 4707 | 5190 |
| Falcon, T140 | 1 | 10 | 4976–5120 | 5190 |
| Falcon, T200 | 4 | 1 | 8312 | 8670 |
| Soyuz, pad | 1 | 41 | 10162–10208 | 10840 |
| Soyuz, T140 | 5 | 17 | 12921 | 13440 |
| Soyuz, T200 | 7 | 17 | 16201 | 16780 |

The recorder now adds 1250 bytes per rigid body and 170 per engine-map entry to
the existing measured legacy estimate. Packed rotation allocations remain exact
and separate. Default ordinary visual-frame capacity is 6000 for six-DOF and
12000 for legacy; explicit test/custom limits remain unchanged. Event frames are
protected and rotation tracks survive visual-frame compaction. This is not a
hard global heap bound: protected events, retained rotation windows, simulation
telemetry and browser/renderer allocations also consume memory. Dead debris
stops adding rotation samples. Evidence: `rigid-memory-shapes.log` in the local
validation worktree; whole-browser measurements remain open.
