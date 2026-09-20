# Six-DOF browser checks, 2026-09-19

## Resumed production-bundle checks — 2026-09-20

Local Chromium preview on port 4183, application bundle `index-_S9tc3el.js`:

- Falcon and Soyuz quick starts selected six-DOF; selecting legacy removed the
  rigid controls, and unsupported Falcon Heavy selected legacy. New mission
  reset the recording to T−10 with no events.
- At replay T−2.5, all nine Falcon first-stage chamber fractions were one and
  the upper chamber was zero. Replay rejected live control changes.
- Native keyboard entry accepted roll/pitch/yaw 0.2/0.1/−0.1 degrees/s and
  recorded the corresponding radians/s. At T172.618, pitch/yaw measured
  0.001744929/−0.001744952 rad/s. Roll was still responding within its finite
  authority; this short interaction is not a roll-settling acceptance result.
- Native throttle 0% cut off the upper engine at T172.618. The subsequent
  restart request at T173.998 emitted ignition at T177.998; exact-time replay
  showed upper-engine throttle one. Returning to Autopilot worked.
- Exterior/pad, onboard, space and orbital-map views rendered. The automatic
  camera sequence can change a chosen view when play resumes. Home seeks to
  the recording start, as documented; it is not a page-scroll shortcut.
- CSV returned schema 3 with data revision, complete wind JSON/seed, numerical
  step bounds, quaternion/rates and actuator maps. The download button was
  exercised; returned CSV content, rather than an OS file-save check, is the
  export evidence.
- Thai and Russian at 390×844 both had document client/scroll widths 375/375,
  with translated three-axis controls and throttle visible. This is desktop
  viewport testing, not a physical-phone or screen-reader certification.
- The options panel explicitly labels recovery experimental and names return
  aerodynamics, rotational flow and engine restart timing. The physics dialog
  exposes estimates, omitted physics and the packaged English data dossier.
- At T799.734, the 4947-frame recording estimated 46,475,774 bytes including
  975,104 packed rotation bytes. Reported browser used/allocated JS heap was
  88,001,520/128,285,064 bytes. No compaction had occurred; this is a bounded
  sample, not a whole-mission memory ceiling. The new metadata allowance is
  600 bytes per rigid body above the historical estimates below.
- Requested high warp retained the 0.01 s control clock and displayed achieved
  speed (observed 0.07–0.15× during background-tab intervals). Concurrent CPU
  tests and browser background throttling make these measurements unsuitable
  as a foreground FPS/real-time benchmark. No performance guarantee is made.
- No console errors or warnings were returned. The temporary viewport override
  was reset after the checks.

An additional Soyuz run at requested 1× reached T91.370 s and reported achieved
speed 0.9913× with the same 0.01 s control clock. This is one development-host
observation under concurrent test load, not a cross-device FPS guarantee.

The dossier was subsequently updated without changing application behavior;
the final asset/release and complete orbital gates are recorded separately.

Final local bundle `index-CVRs5YM3.js` packages dossier
`SIXDOF-VEHICLE-DATA-DiE_OxAC.md`. One additional UI fix clears the setup panel's
running lock when previewing a newly configured mission. Launch followed by
WebMCP configure returned T−10 with quick-start buttons enabled in that build;
the packaged dossier link resolved and no console errors were reported.
An exact T2 engine-out replay also showed one failed first-stage chamber off
and the other eight on, with the upper chamber off. Physics source did not
change during the final orbital runs.

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
