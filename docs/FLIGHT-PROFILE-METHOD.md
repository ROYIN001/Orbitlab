# Making a vehicle fly its real flight: the method

How Soyuz-2.1a was brought onto its flown profile (2026-10-01, [VALIDATION.md](VALIDATION.md)
§3, "Soyuz-2.1a flies its stored pitch programme"), written down so the same steps can be applied
to the other vehicles. The order matters. Each step can only be judged once the steps before it
are settled. A trajectory fitted on wrong propulsion data hides the data error inside the fit.

## The rules

- **Data come from sources, never from the clock.** A load, a thrust or a throttle is never
  adjusted to make an event come out on time. Soyuz-2.1a used to carry 87 000 kg in its core,
  held to the published clock. That hid an RD-108A vacuum thrust 7 % low. With the published
  engine, the published load burns in the published time.
- **Every number has one role.** It is one of:
  - an *input* (published, used as given);
  - *derived* (computed from inputs by stated arithmetic);
  - an *estimate* (no source, a stated guess);
  - *construction* (an input chosen so an event lands on a published time);
  - *fitted* (solved for against a target).

  A source used as a fit target cannot also be a held-out check. Each source gets one role in a
  ledger (VALIDATION.md, "Fitted and derived values").
- **Never fly an attitude the real vehicle cannot fly.** The angle in dense air, q·α, the turn
  rate and the aerodynamic table bound every candidate. A fit that has to break a bound is
  rejected and recorded, not accepted.
- **New mechanisms are off by default.** Every other vehicle stays bit-identical in its
  fingerprints, unless the change is meant to be fleet-wide. A fleet-wide change is measured on
  every vehicle it touches.
- **Disagreements are pinned by name**, with their cause, in the tests' disagreement lists and in
  VALIDATION.md. They are never tuned away after the fact.

## The steps

### 1. Data, closed against the published gross mass

Enter the published stage and engine data with their basis, and make the mass budget close.

For Soyuz (Arianespace CSG User's Manual, Fig. 1.5.1a):

| part | gross | split |
| --- | --- | --- |
| strap-on | 44 413 kg | 3 784 dry + 257 N₂ (dry) + 39 160 LOX/kerosene + 1 212 H₂O₂ |
| core | 99 765 kg | 6 545 dry + 520 N₂ + 90 100 + 2 600 H₂O₂ |

The published Isp covers the whole flow, H₂O₂ included.

Where two readings of a source are possible, decide between them with a third source and record
the losing reading as a sensitivity. Soyuz had two: H₂O₂ as propellant, or as extra flow. The
CSG acceleration trace decided it: about 1 600 kg/s for the whole first stage, against 1 622 and
1 672 kg/s on the two readings.

### 2. Propulsion, checked before any trajectory work

Compare the thrust and flow with any published acceleration trace, as ratios, since the upper
composite may differ. Then settle how each stage stops: on a command or at depletion. A
commanded cut-off is an input. The propellant left at it is then a *prediction*, and a negative
reserve is a finding.

For Soyuz:

- The strap-ons step to 81 % at T+112.0 s, taken from the CSG trace (3.981 → 3.367 g in a
  quarter of a second). They are cut off by command, never run dry (Andrienko 2013:
  "full propellant depletion on stage I is inadmissible").
- The core is cut off by GK-2 at T+285.05 s.
- The engines run for about 20 s on the pad at intermediate levels (CSG §A5), worth 2 s of full
  flow.

The predictions came out inside their bands: about 1 t left in each strap-on, 1.3 % in the core,
306.8 t and 1.39 g at liftoff.

### 3. Events

Timed commands are inputs: the tower, the fairing, the skirt, the cut-offs. Name the structural
gaps instead of hiding them. Soyuz's hot staging is not modelled, so the core separates 2.65 s
early. That gap is pinned, not tuned.

A gate that decides an event must not depend on a fitted quantity. Soyuz's fairing altitude
floor was set below the 79 km fit target, so that the published time decides when the fairing
goes.

### 4. Frames

Declare the frames before comparing anything:

- the height datum (heights above ground in model altitude);
- the speed frame (Earth-relative or inertial; ungraded where the source does not say);
- the pitch frame (above the local horizon, on the launch azimuth over the ground);
- the pad's coordinates.

Soyuz's pitch was also tried in a plane fixed in inertial space. It left the pad's eastward
speed across the plane: 0.8° of RAAN off an ISS target and up to 9° of yaw on Blok I. The local
azimuth was kept.

### 5. Guidance structure from a source

Take the structure of the guidance from a source. The R-7 flies its first two stages on a pitch
programme stored before flight (Khorolsky 2011; the Soyuz Crew Operations Manual), not on a
free gravity turn, and its third stage closed-loop.

The model's `GuidanceParams.pitchProgram` is that mechanism: a table of pitch against time,
handed to the closed loop at its last point. If an operator edits a pitch-over field, the stored
programme gives way to the operator's pitch-over.

A vehicle with no such source keeps the generic kick and gravity turn, labelled as generic. It
never borrows another vehicle's fitted numbers, except for shared hardware: Soyuz-2.1b flies
2.1a's programme for the shared stages.

### 6. Shape from a source, scalars fitted, as few as there are targets

- **Shape.** Soyuz's programme shape is Starsem's typical Soyuz programme (User's Manual 2001,
  Fig. 2-4), advanced by 10 s. Only the shape is used: the figure's own altitude curve
  disagrees with its pitch.
- **Fitted scalars, one per target.** The departure from the vertical was scaled by 1.06 to put
  the fairing at 79 km at T+153.3 s. The core's 16° / 10° put core separation at 157 km at
  T+287.7 s.
- **By hand, recorded.** The advance, the 5° below the path as the strap-ons tail off, and the
  7° pitch-down after they leave were set by hand against the same flights. They are recorded
  as such.

The fit is run by script (scalars in, table out) and its residuals are recorded: 78.8 and
157.3 km in six-DOF, 77.5 and 152.8 km in the point mass, from one table for both models.

Then the bounds, in calm air, in the reference crosswind and shear, at three payloads and on the
other sites:

| bound | measured |
| --- | --- |
| max Q | 35.7 kPa at T+63 s (under the R-7's 36.3 kPa, SoyCOM) |
| angle in high q | under 1.4° |
| q·α | under 47 kPa·deg |
| body rate | under 1.1 °/s |
| aerodynamic table | left only under 10 Pa |

### 7. Held-out checks

Fix the checks before the fit: references, tolerances, datum, frames and roles. Judge them after
the fit, and do not refit to pass them.

| check | model | reference |
| --- | --- | --- |
| speed at strap-on separation | 1.70 km/s | 1.64–1.75 km/s |
| speed at the fairing | 1.92 km/s | 1.90–1.93 km/s |
| strap-on impacts | ~340 km | ~350 km |
| fairing impact | 490 km | ~500 km |
| max Q | T+63 s, 11.0 km | SoyCOM: T+65 s, 11.1 km |
| SECO | T+526.4 s | T+525.9 s |
| insertion | 199.9 × 239.6 km | 200 ± 2 × 242 ± 5 km |
| rating payload, 7 430 kg | 200.0 × 237.5 km | to 200 × 240 km |

Disagreements, each with its cause:

- the core falls 1 376 km out against about 1 550 km;
- Blok I's closed loop lifts its nose to 35° above the horizon, against Starsem's smooth descent
  from 12°;
- the abort apogees: MS-10 108 km against 93 km, 18a 167 km against 192 km. The 18a gap comes
  from 1975's different rocket and a failure mode the model does not fly.

### 8. Record

Record all of the following:

- the register and the ledger;
- the before and after tables in both flight models;
- every moved pin, each with its reason;
- the method's checks in a fast test: `tests/r7-sequence.test.ts` for the sequence and
  `tests/rigid-soyuz-programme.test.ts` for the flyability and the fit targets.

Re-check every generated table whenever the data change. A refit is a new registered fit.

## Which vehicles can go through it

The tiers depend on what each vehicle has published.

- **Tier A (a fit is allowed).** These have state points along the ascent (heights or speeds at
  two or more events per fitted phase) and three or more independent checks: Falcon 9 (its kick,
  VALIDATION.md §2), Soyuz-2.1a (done) and Saturn V, whose published tilt programme is an input,
  not a fit.
  - PSLV-XL, H3 and Ariane 64 need a second flight's data first.
- **Tier B (times only).** These get the propulsion and event steps (1–3), with no trajectory
  fit: Atlas V, H-IIA, Vega-C, Proton-M, Falcon Heavy, Angara-A5 and Electron.
- **Tier C (nothing flight-specific).** These keep the generic guidance, labelled as such:
  Long March 2D, 3B and 5, Vulcan and Starship.
  - Soyuz-2.1b is a transfer case: it shares Soyuz-2.1a's first two stages and flies their
    programme. Arianespace's 2.1b profile (CSG Fig. 2.3.1c) is a check, not a target.

Once three or more vehicles have been through the method, a fleet rule cross-validated by
leaving one vehicle out can give an error bar to the vehicles with no profile of their own.
