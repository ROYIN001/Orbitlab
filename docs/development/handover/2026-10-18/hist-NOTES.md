# rb/hist: Q2 (ก), the historical flights on WGS-84. Parked by the owner, 2026-10-18 ~21:10 UTC

The owner said in chat "งานใหญ่ให้เก็บไว้ก่อน" (keep the big work for later). I stopped at a safe point.

**Status.** Nothing is committed. `rb/hist` is still at b18ce48 and the worktree is clean. No file under `src/`, `tests/` (apart from the gitignored `tests/probe/`) or `docs/` was changed. No golden moves yet. This step measured the flights and found the causes. It changed no data. The data changes proposed below are not implemented and not measured.

Two orchestrator messages arrived during the work and still apply when the work resumes:

1. Q10 (ข): the guidance moves to the geodetic frame, which moves the R-7 programme and every flight after the pitch-over. Q8 (ข): published nozzle exits replace the catalogue pairs. So put sourced data in now (loads, masses, burn times, programmes, cut-off rules) and measure once. Do not chase the misses that remain by tuning unsourced numbers: the final check comes after Q10 and Q8.
2. The owner did not object to applying Q2 (ก) to Progress MS-19 and VA267.

## Trees and probes

- Trees: base 7f991f9 is in `x-base/`; the branch b18ce48 is in `x-b18/` and in the worktree. Both are `git archive` exports with node_modules linked, in this folder.
- Probes: `probes/` here, and the same files in the worktree's `tests/probe/` (gitignored). Run them with `npx vitest run --config tests/probe/vitest.probe.config.mts tests/probe/<file> --maxWorkers=1`. The point-mass probes take about 10 s. Each six-DOF probe takes several minutes.
  - `hist-pm.test.ts`: Sputnik-1 and Vostok-1 to orbit (as historical-vehicles flies them), lessons 5.3 and 5.4, MR-3 in point mass, and Vostok-1's point-mass return. Output: `pm-base.txt`, `pm-b18.txt`.
  - `sputnik-sweep.test.ts`: a kick sweep, diagnostic only. `SWEEP=watch` flies r7sputnik; any other value flies lesson 5.3's sputnik8k71ps. Do not use `MODE`, because vitest sets it. Output: `sw-watch-*.txt`, `sw-lesson-*.txt`.
  - `sputnik-thr.test.ts`: r7sputnik's throttle, thrust, mass and acceleration every 10 s. Output: `thr-b18.txt`.
  - `vostok-states.test.ts`: Vostok-1's state at the cut-off, at the separation, before the TDU-1, at 100 km and at the end. Output: `vs-pm-b18.txt`, `vs-pm-base.txt`.
  - `timeline-rows.test.ts`: any validation timeline reference, selected by `REF=` and `MODELS=`. Output: `tl-pm-*.txt` (Progress MS-19 and VA267 in point mass) and `va267-6-*.txt` (VA267 in six-DOF).
  - `progress6.test.ts`: the six-DOF Progress MS flight of rigid-soyuz-programme. Output: `progress6-*.txt`.
  - `hist6dof.test.ts`: MR-3 and Vostok-1 in six-DOF. It was killed before it finished, so there is no output.
  - `run6.sh`: the chain of six-DOF probes. It was stopped part way: VA267 and Progress six-DOF finished; hist6dof and the six-DOF timeline for Progress did not run.
- Tests run: none of the repo's own test files. Only the probes above ran.

## Sources found (WebSearch only; WebFetch was not tried, as the brief reports it refused)

| Source (as the search result put it) | What it gives |
|---|---|
| russianspaceweb.com/sputnik_lv.html (Zak), as summarised by search | 8K71PS total mass "272.83 tons (or 267 tons, at the time of liftoff)", down from 280 t for the R-7. Liftoff thrust "around 398 tons". "The flight profile was modified to ensure maximum use of onboard propellant." The core throttled from 73 to 60 t, with the strap-ons up 25 % 17 s before separation: that is the 8A91 (Object D / Sputnik-3), **not** 8K71PS |
| russianspaceweb.com/sputnik_mission.html (Zak) and en.wikipedia Sputnik 1, as summarised by search | At T+16 s the SOB (tank-emptying) system failed and kerosene ran out early. The core was shut down by the AKT sensor (turbopump overspeed) at **T+295.4 s**, 1 s before the timer's command at T+296.4 s, with **about 375 kg of LOX left**. The apogee was about 80 km lower than planned. Orbit 228 × 947 or 215 × 939 km (sources differ) |
| orbitcodex.com (secondary) | 8K71PS vacuum Isp: strap-ons 306 s, core 308 s. These agree with astronautix and the catalogue parts, not with Zak's 304.2 / 303.1 s in `RD107_1957` and `RD108_1957` |
| en.wikipedia Progress MS-19 | Infobox launch mass 7,000 kg (a generic rounded figure) |
| russianspaceweb.com/progress-ms-19.html, as summarised by search | Spacecraft about 7.4 t, which agrees with the 7,430 kg flown |

Not found: any primary document on the 8K71PS (Zak's pages could only be read as search summaries); whether the 8K71PS core throttled at the end of its burn (the R-7's "final stage" of thrust); the MR-3 postlaunch report itself (its figures here are the ones already in PHYSICS §13.7); and anything on VA267 beyond what reference-data.ts already cites.

## Measured, per flight (point mass unless stated)

| Flight (test) | Base 7f991f9 | b18ce48 | Probe |
|---|---|---|---|
| Sputnik-1, r7sputnik (historical-vehicles: orbit within 15 % of 938 km) | 214.0 × 937.0, cut-off at T+303.3 s, 63 kg left, `evt.targetOrbit` | 214.0 × 791.0, runs dry at T+303.6 s, `evt.insufficientDv` + `evt.offTargetOrbit` (−15.7 %) | hist-pm |
| Lesson 5.3, sputnik8k71ps | pass, 214.5 × 937.0, 96.18 min | **fail**, 210.7 × 797.4, runs dry at T+286.6 s | hist-pm |
| Lesson 5.4 | pass, 181.0 × 324.4 | pass, 181.0 × 324.6 | hist-pm |
| Vostok-1 to orbit | 168 × 315, Blok E off at T+672.3 s (98 kg left) | 168 × 315, Blok E off at **T+676.1 s** (31 kg left; flown T+676) | hist-pm, vostok-states |
| Vostok-1 return, point mass (along the track < 10 km, miss < 15 km) | 0.70 km miss, −0.51 along | **24.86 km** miss, **+24.83** along (lands short), −1.28 across | hist-pm |
| MR-3, point mass (miss < 25 km) | 16.39 km, 496.4 km down range | **32.38 km**, 511.7 km down range | hist-pm |
| Progress MS-19, point mass (insertion perigee 193 ± 29.9 km) | 192 × 237, dv 110 | **154** × 238, dv 10, SECO T+532.1 s | timeline-rows (tl-pm) |
| Progress MS, six-DOF (rigid-soyuz-programme: osculating perigee 193 ± 0.5 km) | h118 46.69, h183 97.97, h288 142.99 km; osculating 192.8 × 238.1 km (physical 192.8 × 247.1); **Blok I 346 kg left** | h118 46.52, h183 97.63, h288 142.24 km; osculating **182.3** × 211.4 (physical 186.2 × 219.7); **Blok I 0 kg** | progress6 |
| VA267, six-DOF (P120C separation altitude 87 ± 14.1 km) | 101.0 km (fairing 159.2 km, recorded disagreement) | **101.9 km** (fairing 160.1) | va267-6 |
| VA267, point mass | 87.1 km | 87.8 km (passes) | tl-pm |

The six-DOF MR-3 and Vostok runs were not measured here. The report gives MR-3 six-DOF as 27.73 km at HEAD (11.36 at the base) and Vostok six-DOF as 7.91 km miss, 7.86 along.

## Causes found

### Sputnik-1 (r7sputnik)

On WGS-84 the flight lacks about 37 m/s. At the same 4° kick it cuts off at 7,917.6 m/s at 214 km, against 7,954.5 m/s at the base. Gravity loss is up 30 m/s (1,149 against 1,119) and steering loss up 33 m/s (940 against 907): the pad is 11 km lower in radius. A larger kick does not close the gap (6° gives 7,949.9 m/s, still short). Do not tune the kick: it is unsourced.

**A sourced data error found.** The loads are Zak's stage masses, 4 × 42.0 t + 99.1 t = 267.1 t. That equals Zak's "267 t at the time of liftoff" (272.83 t fuelled). But the model lights the engines at T−2.5 s and burns 2.5 s of full flow (3.4 t) from those loads on the pad, so it lifts off at **263.8 t** (probe sputnik-thr: 263,832 kg at T+0.1 s), 3.2 t under the source. The comment in src/data/vehicles.ts already counts the burn times from liftoff ("burn out at 117 s and 298 s"). Vostok-K's data, by contrast, counts its pad burn (the historical-vehicles test subtracts 2.5 s for Vostok-K only).

**A second sourced figure, against it.** The real core stopped at T+295.4 s with about 375 kg of LOX unburnt (Zak, Wikipedia). The model burns every kilogram.

**An unsourced limit, in question.** r7sputnik's `maxAccel: 60` throttles the core to the 0.7 floor from T+276 s (probe sputnik-thr), which stretches its burn to T+303.6 s. PHYSICS §13.6 says "the R-7's engines did not throttle". The flown depletion at 295.4 s fits full flow from liftoff: (91.8 − 0.375) t at 307.5 kg/s is 297.3 s. At full thrust the core would reach about 12 g at burnout. No source says whether the 8K71PS core throttled at the end. Leave this alone unless a source turns up.

### Lesson 5.3 (sputnik8k71ps, the fleet vehicle)

Its core load, 90 t (parts.ts `blokA-8k71ps`), is itself a fit: "the load that puts it on the 215 × 939 km orbit". It totals 270 t at ignition against the 267 t quoted, and it has the same pad-burn issue. Re-fitting the load is forbidden. The kick sweep (`sw-lesson-b18.txt`) shows 4° would reach the orbit with 64 kg left (3.5° does not), but the kick is unsourced: do not change it.

### Vostok-1 point-mass return

The flight now lands **25 km short** because the point-mass Blok E cuts off at T+676.1 s instead of T+672.3 s. That is 3.75 s later, and now on the flown T+676. At the fixed TDU-1 time, T+4,684.2 s, the ship is 0.25° of latitude behind its base place (−11.49° against −11.24°): 3.75 s × 6.8 km/s ≈ 25 km along the track. The orbit itself is the same (168 × 315; at the TDU-1 175.2 × 319.4 against 175.2 × 319.1 osculating).

So the reconstructed `retro.pitch`, 2.51°, had absorbed the base ascent's 3.7 s early cut-off. That pitch is a fit, reconstructed in six-DOF from the landing place. Re-deriving it by its documented rule is a fit, and Q10 will move the ascent's timing again. So I did not change it. No sourced Vostok-K number is wrong: the strap-ons separate at +0.1 s and the core at +2.9 s, as at the base.

### MR-3

**A sourced re-derivation, not yet done.** The target's apogee, 187.5 km, is the postlaunch report's height above the Earth's surface. On the sphere it was taken as the radius less 6,378.137 km. On WGS-84 the surface under the apogee (about 27.9° N, some 240 km down range on 105°) lies 4.64 km inside that sphere. So in the app's orbit-height convention (radius less 6,378.137 km), the apogee is **182.9 km**.

The conic through the report's separation state (74.3 km, 2,252 m/s, 39.01°) gives 186.6 km on the sphere and **181.7 km** on WGS-84 (at 28.0–28.4° N), with perigee −6,214.5 km. The cut-off (`checkSuborbitalAscent`) fires when the conic apogee reaches the target, so the lob now flies about 4.6 km higher above the ground than Freedom 7 did. That is why it lands 15 km farther down range (511.7 against 496.4 km). Expected effect: about −12 km of range (dR/R ≈ dh/h), which would put the miss back near the base's 16 km.

### Progress MS-19 (both models)

The cargo programme still meets its fit target: h288 is 142.2 km in six-DOF (base 143.0) and 138.3 in point mass (base 138.7). The shortfall is Δv. Blok I ran dry at the base already in point mass (dv 110 m/s left in the event; 346 kg left in six-DOF). On WGS-84 it runs dry 10–40 km short of the 193 km perigee. RSW's ~7.4 t agrees with the 7,430 kg flown, and the 193 × 240 km aim is `CARGO_INSERTION`, sourced. No sourced number was found wrong. The Soyuz-2.1a model's margin on this flatter cargo trajectory was the sphere's 11 km.

### VA267 (six-DOF)

Kourou's pad moved only 0.18 km. The P120C separation height read 101.0 at the base and reads 101.9 now, against a bound of 101.1. Part of the change is the datum: the height is now above the ellipsoid, which lies about 0.3 km under the old sphere at the separation's latitude. The rest is J2 in the ascent. The base was already 14 km over the published 87 km and passed by 0.1 km; point mass reads 87.8. No sourced Ariane 64 number was examined yet. The six-DOF fairing row (160.1 against 127 ± 20.1 km) is a recorded disagreement already.

## Goldens

None moved: nothing was committed. When the work resumes:

- A change to `r7sputnik`, `vostokk` or `mercuryredstone` moves no fleet hash. Those are HISTORICAL_VEHICLES, not in d01-fleet-fingerprint or sixdof-fingerprint. Check tests/heavy and recheck fixtures for any that fly them.
- A change to `sputnik8k71ps` (or its parts `blokA-8k71ps` / `blokBVGD-8k71ps`) moves `d01-fleet-fingerprint` (sputnik8k71ps/leo/50), `heavy/sixdof-fingerprint` (sputnik8k71ps) and `d01-vehicles-identity`.
- A change to the soyuz21a cargo profile moves `d01-vehicles-identity`, and any fingerprint that flies Progress.
- A change to `ariane64` moves its d01, sixdof-fingerprint and flex rows.

## Exact next steps for whoever resumes

1. **MR-3** (src/ui/watch-missions.ts, `mr3`): set `orbit.apogee` to 182.9e3. Comment: "187.5 km above the surface (postlaunch report) is 182.9 km in radius less 6,378.137 km over WGS-84 at the apogee's 27.9° N". Keep perigee −6,214e3 (−6,214.5 on WGS-84) and inclination 30.3 (a compromise fit; Q10 will move it).
   - Decide whether `flown.orbit.apogee` stays 187.5. It is the published figure; the end card would then show a 4.6 km datum difference. I propose keeping it, with a note.
   - Run historical-vehicles (MR-3 point mass and the viewer test) and heavy/mercury-redstone, each alone.
   - Update PHYSICS §13.7 ("The target is the conic…") and its model − flight table.
2. **Sputnik-1** (src/data/vehicles.ts, `r7sputnik`), two sourced load corrections:
   - (a) Liftoff loads: add each block's 2.5 s of the model's own full flow to Zak's loads, so that the model lifts off at Zak's 267 t. That is +817 kg a strap-on (38.3 → 39.117 t; flow 975 kN / (g₀ · 304.2 s) = 326.8 kg/s) and +769 kg in the core (91.8 → 92.569 t; 307.5 kg/s). Compute them exactly in the comment.
   - (b) The core's 375 kg of LOX left at the AKT cut-off (Zak; Wikipedia, Sputnik 1), carried as dry mass, Vostok-K's convention: core dry 7,675 kg, propellant 92,194 kg.
   - Leave `maxAccel` and the kick as they are, unless a source on the core's end-of-burn thrust is found.
   - Re-check the data-rule test in historical-vehicles: strap-on burn 110–125 s and core 285–310 s; with (a) and (b) they become about 119.7 s and 299.8 s. Then measure once.
   - Expect, roughly: (a) gains on the order of +40–50 m/s; (b) loses on the order of −140 m/s at burnout. The sourced data may therefore leave Sputnik short; report the measured result as it is. Note also that the R-7's stored programme moves with Q10.
   - Update PHYSICS §13.6's table and its Sputnik paragraph.
3. **Lesson 5.3** (parts `blokA-8k71ps` / `blokBVGD-8k71ps`, fleet `sputnik8k71ps`): the same pad-burn correction on astronautix's figures. Do not re-fit the 90 t, which is already a fit. Decide with the orchestrator whether to replace that fitted 90 t with a sourced load (Wikipedia's core is 94.0 t with 7.5 t dry, so 86.5 t of propellant; Zak's is 91.8 t). If lesson-file `adv-history` changes, regenerate its pack with `scripts/lesson-packs.ts`, update `contentSha256` in src/lessons/review.ts and leave the review pending. This step changes no lesson source, so no pack should move.
4. **Vostok-1 return:** no sourced data change. Record in the report that the miss comes from the point-mass cut-off moving 3.75 s, to the flown T+676 s, against a retro pitch reconstructed on the base's T+672.3–672.8 s. The pitch is to be reconstructed again by its own rule (six-DOF, along-track zero) only after Q10 lands, and point mass and six-DOF compared again then. Six-DOF was not measured here; run `hist6dof.test.ts` and `vostok-states` with `MODELS=sixDof`.
5. **Progress MS-19:** no sourced number found wrong. Report the shortfall: Blok I runs dry, 154 km point-mass and 182.3 km six-DOF osculating perigee, against the base's 192 and 192.8. A payload sweep (7,430 → 7,100 kg) would measure the deficit in kilograms, as a diagnostic only; it was not run. Q10 will move the cargo programme.
6. **VA267:** look for sourced Ariane 64 data that sets the P120C phase (the P120C's burn and load, the core's thrust, the six-DOF pitch-over). Do not move the six-DOF kick unless a source gives it. Report the 0.3 km datum share separately from the J2 share (re-run va267-6 on the D-51-only tree to split them).
7. For each data change: run its vehicle's tests on named files with `--maxWorkers=2`, and the heavy files alone with `--maxWorkers=1`. Run `npx tsc --noEmit`. Commit in the repo's style with the two trailer lines. Do not touch docs/DECISIONS.md, the report, CHANGELOG, PROGRESS or the change fragment.
