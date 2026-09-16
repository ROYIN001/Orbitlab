# Orbitlab physics model

This document describes what the simulator computes. Symbols follow the usual astrodynamics
conventions; SI units throughout.

## 1. Reference frame and state

The vehicle is a point mass with position **r** and velocity **v** in an Earth-centered
inertial (ECI) frame: +Z along the rotation axis (north), +X toward the vernal equinox at
the reference epoch. The Earth is a sphere of radius R⊕ = 6 378 137 m rotating at
ω⊕ = 7.2921159 × 10⁻⁵ rad/s. The Greenwich sidereal angle θ(t) = GMST(t₀) + ω⊕(t − t₀) ties
ECI to geographic longitude; GMST uses the IAU 1982 polynomial and the Sun direction a
low-precision solar ephemeris.

A launch site at latitude φ, longitude λ, altitude h sits at
**r**ₛ = (R⊕ + h)[cos φ cos(λ+θ), cos φ sin(λ+θ), sin φ] with velocity **v**ₛ = ω⊕ ẑ × **r**ₛ.
That initial velocity (up to 465 m/s at the equator) is the Earth-rotation credit.

## 2. Equations of motion

```
d²r/dt² = −μ r/|r|³ (+ J2 term in orbit) + (T/m) û_T − ½ ρ |v_air| C_D(M) A v_air / m
```

- μ = 3.986004418 × 10¹⁴ m³/s².
- **v**_air = **v** − ω⊕ ẑ × **r** is the velocity relative to the co-rotating atmosphere.
- The J2 acceleration (Earth oblateness, J2 = 1.08262668 × 10⁻³) is applied in the orbital
  phase; it drives nodal precession (sun-synchronous orbits, Molniya's critical inclination).
- Integration: classical fourth-order Runge–Kutta with adaptive steps (0.1 s in the
  atmosphere, up to 30 s in orbit). Exo-atmospheric unpowered coasts use the analytic
  Kepler solution. Mass varies linearly inside a step.

## 3. Atmosphere and aerodynamics

0–86 km: US Standard Atmosphere 1976 (seven layers with linear lapse rates, hydrostatic
pressure, ideal-gas density, speed of sound √(γ R T)). 86–1000 km: piecewise exponential
density (Vallado table 8-4). Drag coefficient vs Mach number is a generic slender-body curve
(0.30 subsonic, 0.64 peak at M ≈ 1.2, 0.22 hypersonic). The reference area is the frontal
area of the attached stack including strap-on boosters, so the area drops at separation.

Dynamic pressure q = ½ ρ v_air² is tracked for the max-Q event; exceeding 1.15 × the
vehicle's structural limit destroys the vehicle.

## 4. Propulsion and mass

For each engine, thrust varies linearly with ambient pressure between sea-level and vacuum
values, F(p) = F_vac − (F_vac − F_SL) p/p₀, and mass flow is ṁ = F_vac/(g₀ Isp_vac) at full
throttle (independent of pressure). Solid motors use a regressive profile (120 % → 80 % of
mean thrust). Throttle is limited by the engine's minimum throttle, an acceleration limit
(e.g. 4.5 g), and a throttle bucket around max-Q for vehicles that fly one.

Stages are burned serially; strap-on boosters burn in parallel with the core (the core may
throttle down while they are attached) and are jettisoned after a short delay. Hot staging
(Soyuz Blok I, Proton stage 2, Starship) ignites the next stage at separation.

**Fairing jettison** follows a thermal placard rather than a fixed altitude: the fairing is
released at the first moment the free-molecular heating rate q̇ = ½ρv³ falls below
1135 W/m² (0.1 BTU/ft²·s) *and* the dynamic pressure below 1.1 kPa, above an 80 km floor.
On a normal ascent that happens between about 95 and 125 km — Falcon 9 sheds its fairing
around T+200 s instead of waiting for a fixed 110 km that a lofted trajectory only reaches
minutes later. The vehicle's quoted `sepAltitude` + 40 km remains as a backstop for a
trajectory that never satisfies the placard.

When first-stage recovery is selected, a fraction of
first-stage propellant is reserved and the spent stage performs an entry burn near 70 km and
a landing burn that follows a constant-deceleration profile.

Ideal Δv per stage follows Tsiolkovsky, Δv = g₀ Isp ln(m₀/m₁). The telemetry panel reports the
Δv actually delivered by thrust together with the losses:

- gravity loss ∫ g sin γ dt (γ = flight-path angle),
- drag loss ∫ D/m dt,
- steering loss ∫ (T/m)(1 − cos α) dt (α = angle between thrust and velocity).

## 5. Ascent guidance

1. **Vertical rise** until the pitch-over altitude.
2. **Pitch-over kick**: the attitude tilts by the kick angle toward the launch azimuth over a
   few seconds.
3. **Gravity turn**: thrust follows the air-relative velocity (zero angle of attack) so that
   aerodynamic loads stay small. Because the natural turn rate scales with cos γ / v, a
   low thrust-to-weight vehicle would turn over too early; a pitch-program limit caps the
   pitch-down rate (the "max pitch-program rate" parameter). Holding the nose above the
   velocity vector costs angle of attack, which is charged against the q·α budget below.
4. **Closed-loop steering**, blended in as the dynamic pressure falls below ~12 kPa and fully
   in charge below ~4 kPa. The horizontal direction is steered toward the plane of the target
   inclination through the current position (yaw feedback nulls the out-of-plane velocity).
   The vertical channel is the linear-tangent law: with time-to-go T (the burn time of the
   remaining stages for the missing horizontal speed, from the rocket equation), a vertical
   acceleration profile a_z(t) = A + B t reaches the insertion altitude h_T with vertical
   speed v_zT at T,

   ```
   B = 12 (h + ½ T (v_z + v_zT) − h_T) / T³,   A = (v_zT − v_z)/T − ½ B T
   ```

   and the pitch angle satisfies a_T sin θ = A + g_eff, where g_eff = μ/r² − v_h²/r is
   gravity reduced by the centrifugal term. The command is re-planned every step.

### 5.1 Why the textbook law needs guard rails

The unconstrained two-point solution is unstable in exactly the cases a launch simulator
runs into all the time, and each of the following limits fixes one observed failure.

- **Bounded altitude correction.** A is written as two terms, the terminal vertical-speed
  nulling (v_zT − v_z)/T and the altitude correction −½ B T. The second term goes to
  ±∞ when the altitude error cannot be flown out in the time available; unbounded, it makes
  the vehicle climb at the pitch limit for minutes, then demand an impossible dive. It is
  clamped to ±max(1.5 m/s², 0.6 a_T).
- **q·α placard.** Whatever the guidance asks for, the commanded direction is limited to an
  angle of attack of q·α ≤ 2100 Pa·rad from the air-relative velocity (≈3° at 40 kPa, 12° at
  10 kPa, unrestricted below ~150 Pa). Guidance therefore has almost no authority in dense
  air: the shape of the first-stage trajectory is set by the kick angle and the pitch program,
  as it is on a real vehicle, and cannot be rescued with a large angle of attack.
- **Thrust-limited pitch cap.** Pointing the thrust θ off the velocity vector costs
  (1 − cos θ) of the horizontal acceleration. When the stage cannot hold altitude at any
  attitude (g_eff > a_T — every hydrogen upper stage with a heavy payload) that steering loss
  buys nothing, because what ends the deficit is horizontal speed, not vertical thrust. The
  law therefore caps θ at the value that leaves the vehicle highest at the moment the
  horizontal speed reaches the insertion speed,
  `h_end(θ) = h + v_z t_go + ½ (a_T sin θ − g_eff) t_go²` with `t_go = (v_ins − v_h)/(a_T cos θ)`,
  evaluated over eleven candidate pitches. For a stage with margin the optimum is the pitch
  limit itself and the cap never binds. Removing this cap costs a heavy Falcon 9 about
  400 m/s of steering loss, which is the difference between reaching orbit and not.
- **Apoapsis ceiling.** Once the osculating apoapsis is at or above the insertion apoapsis
  there is nothing to gain from climbing, so the pitch ceiling is squeezed from pitchMax down
  to pitchMin over an "excess apoapsis" band. This is what stops the runaway that used to
  leave Falcon 9 in a 198 × 21 500 km "parking orbit".
- **Staging ceiling.** While a launcher stage is still to come, the current stage aims no
  higher than 200 km: its job is to leave the atmosphere and build speed, not to reach the
  final altitude.
- **Lofted hand-off.** When the next stage cannot hold altitude at hand-off speed
  (a_next < 0.8 g_eff at the predicted cut-off state, i.e. Centaur- and Vinci-class stages)
  the booster has to hand over *climbing*, so that the ballistic arc keeps the stack high
  while the weak stage builds horizontal speed. The `loft` parameter is that apex, converted
  into the vertical speed the booster must still have at its own cut-off,
  v_zT = √(2 g_eff Δh).

### 5.2 Per-vehicle defaults

Each vehicle carries its own `guidanceDefaults` in `src/data/vehicles.ts`. The simulation
merges them into any parameter the operator left at the library default
(`applyVehicleGuidanceDefaults`), so the panel flies each launcher with its own pitch program
without the user having to tune anything; a value the operator changed is always kept.

That merge decides "did the operator touch this?" by comparing values, which it cannot really
know. Two consequences worth knowing about:

- **Anything that displays guidance numbers must display the merged set**, not
  `DEFAULT_GUIDANCE`. `guidanceForVehicle(spec)` in `src/physics/defaults.ts` returns exactly
  what `Simulation` will fly; a panel that shows the library baseline while the simulation
  flies the vehicle program is telling the user something untrue.
- **The auto-tuner measures what the caller will fly.** `runAscent` builds its candidate
  configuration the way the caller's own flight will be built (same `guidanceResolved` flag),
  and `TuneResult` reports the values that were actually flown, so writing a tuning result
  back into a configuration reproduces the trajectory that was measured. Forcing the candidate
  through unresolved used to make the tuner measure, say, a 2.5° kick that the flown mission
  then replaced with the vehicle's own 1.5°.

| vehicle | kick ° | pitch rate °/s | pitch max ° | loft km |
| --- | --- | --- | --- | --- |
| Soyuz-2.1a | 3.0 | 0.30 | 35 | 0 |
| Soyuz-2.1b / Fregat | 1.5 | 0.30 | 35 | 0 |
| Proton-M | 6.0 | 0.30 | 25 | 0 |
| Angara-A5 | 4.0 | 0.30 | 25 | 150 |
| Falcon 9 | 1.5 | 0.30 | 35 | 0 |
| Falcon Heavy | 1.5 | 0.30 | 25 | 150 |
| Atlas V 551 | 6.0 | 0.30 | 25 | 150 |
| Vulcan Centaur | 1.5 | 0.30 | 35 | 150 |
| Ariane 64 | 6.0 | 0.30 | 35 | 150 |
| Long March 5 | 1.5 | 0.45 | 35 | 0 |
| H3-22 | 1.5 | 0.30 | 35 | 0 |
| PSLV-XL | 1.5 | 0.30 | 25 | 0 |
| Electron | 6.0 | 0.45 | 35 | 0 |
| Starship | 1.5 | 0.30 | 35 | 0 |

The pattern is physical rather than arbitrary: launchers that leave the pad with a high
thrust-to-weight or a solid first stage (Atlas V, Ariane 64, Electron, Proton-M) turn over
early and want a large kick; the ones that climb slowly (Falcon 9, Starship, H3) need a
shallow kick or they never build the altitude. Soyuz-2.1a is the exception in the R-7 family:
it has no upper stage that can make up a slow start (the Blok I fires once), so the 1.5° kick
that suits Soyuz-2.1b costs it about 450 m/s of gravity and steering loss and leaves the
7.15 t crew mission 30 km of perigee short. 3° / 0.30 °/s recovers that at 34 kPa of max Q,
inside the 40 kPa placard, and keeps booster separation, core cut-off and SECO on their
published times (120 / 294 / 535 s against 118 / 287 / 528 s). A loft is set exactly for the vehicles whose
upper stage lights below 0.4 g (Centaur III and V, Vinci, URM-2 with a Briz-M above it).
The library baseline itself was lowered from 6° / 0.7 °/s to 2.5° / 0.4 °/s: the old default
flew several vehicles into the ground.

`tests/fleet-defaults.test.ts` is the acceptance test for these defaults.

The **auto-tuner** remains available as an optional refinement: it flies the ascent headlessly
over a grid of kick angles, pitch-program rates and lofts and keeps the combination with the
largest remaining Δv that respects max-Q. No mission requires it.

## 6. Mission sequencing

- **Insertion orbit**: circular at the target perigee if it is at or below 300 km, otherwise a
  200 km parking orbit. The ascent aims straight at a transfer ellipse whose apogee is the
  target (capped at 2000 km) **only when the stages that have to deliver its perigee speed can
  actually do so** — ideal Δv against perigee speed + 1450 m/s of losses − the Earth-rotation
  credit + 150 m/s of margin. For a stack that carries a low-thrust kick stage (Fregat,
  Briz-M, Curie) the test is applied to the stages below it, which is the case the ellipse was
  introduced for. Aiming a stack at an ellipse it cannot reach is strictly worse than aiming
  it at the circular parking orbit it can: the ascent burns to depletion short of both and
  ends suborbital, where the parking orbit would have been reached and the following burns —
  or the spacecraft's own engine — would have raised it. Soyuz-2.1a with a crew ship to the
  ISS is exactly that case, and is covered by a test of its own.
- **Single-shot stacks.** Before it chooses the insertion orbit the planner asks whether
  anything can light an engine *after* ascent cut-off (`canBurnAfterAscent`: the last stage
  restarts, a kick stage sits above it, or the payload has propulsion). When the answer is no
  — Soyuz-2.1a with an inert payload is the only such combination in the fleet — the orbit the
  stack is in at cut-off is final, so the 2000 km apoapsis cap is lifted and the ascent is
  aimed at the apogee the mission actually wants. The perigee is *not* raised to match a high
  circular target the same way: a stage that burns continuously into a circular orbit well
  above the natural insertion altitude arrives with its apoapsis already past it (measured on
  Soyuz-2.1a: aimed straight at 500 × 500 km it inserts at 497 × 2474 km, and at 420 × 420 km
  at 417 × 441 km), so above `DIRECT_INSERTION_CEILING` = 300 km the launcher is left aiming
  at the transfer orbit it can fly accurately.
- If a strong stage burns out with the apoapsis already at the insertion altitude and only a
  small shortfall, the vehicle coasts to apoapsis and circularises there.
- **Cut-off tests.** The ascent ends when the periapsis reaches the **cut-off gate** and the
  apoapsis the insertion apoapsis. The gate depends on the shape of the insertion plan:
  - a **transfer ellipse** (apoapsis above the insertion altitude) is cut off at a periapsis of
    min(insertion altitude, 140 km). What has to be right there is the apoapsis: the burn at
    apogee sets the perigee anyway, and waiting for the perigee to climb the whole way lets the
    apoapsis run 15–20 km past the target, outside the accuracy the mission is judged on. A
    perigee high enough to coast a revolution without decaying is enough;
  - a **circular** insertion orbit is cut off at its own altitude. It has no later burn of its
    own to raise the perigee with, so applying the 140 km floor there produces a "200 × 138 km
    parking orbit" — for a crewed R-7 that is not a parking orbit, it is a decaying ellipse.
    The real profile is 200 × 240 km and the model now flies 200 × 199 km.
  - a **stall clause** lets a circular plan fall back to the 140 km floor when continuing
    cannot help: thrust at the periapsis raises the apoapsis, not the periapsis, so a stage
    that is sinking at its own periapsis with the apoapsis far above it, or whose apoapsis has
    already run past what the plan asked for, is cut off there instead of burning the orbit
    more eccentric. It only applies when a later burn can raise the perigee at apogee — where
    it is cheapest anyway — and `finishAscent` then re-plans from the orbit achieved.
- A periapsis-only test never fires on a lofted trajectory — the apoapsis runs away while the
  periapsis is still deep inside the Earth and the stage burns to depletion — so an
  **apoapsis guard** cuts the stage off when the osculating apoapsis overshoots the insertion
  apoapsis by more than max(25 km, 5 %) while the periapsis is still below the 140 km floor,
  and hands the flight to the coast-to-apoapsis + circularise machinery. The guard only fires
  when the vehicle can light an engine again afterwards (a restartable stage, or a later stage
  with propellant) and when the running stage still has more than 20 s of burn time: cutting
  off a Blok I, or a stage two seconds from depletion, would throw the mission away rather
  than save it.
- **Step size near cut-off.** A metre per second moves a nearly circular apoapsis by
  kilometres, so the integrator drops to 0.02 s steps for the last seconds of the ascent. "The
  last seconds" is measured as the *speed still to be gained* (within 250 m/s of the insertion
  speed — six to twelve seconds at the 20–40 m/s² of a nearly empty upper stage), not as a band
  on the osculating apoapsis: on a lofted ascent the apoapsis crosses the target minutes early,
  and an apoapsis band put 17 000 of the default mission's 19 000 steps on the fine step for no
  accuracy at all. The same flight now takes 4 400 steps, 427 of them fine, and inserts into
  the same orbit to the kilometre.
- **Re-planning.** After every cut-off and every completed burn the remaining sequence is
  re-planned from the orbit actually achieved (`replanBurns`), instead of flying the sequence
  computed before liftoff. An ascent that ran 100 m/s short or 300 km high is then corrected
  by the following burns. The re-planner ignores apsis errors below max(8 km, 1.8 %) — on
  *both* apsides — chasing a smaller error costs more than it buys, and on a nearly circular
  orbit there is no well-defined periapsis to burn at. The periapsis half of that tolerance
  matters for the mission clock as much as for the propellant: a perigee correction is flown
  at the apogee, so chasing a 5 km shortfall postpones the payload separation by most of a
  revolution.
- **Apogee raising** at perigee (or at the node when a plane change follows) thrusting
  prograde; the same burn runs retrograde when the apoapsis overshot and has to come down,
  in which case it is always flown at the periapsis and the stack starts turning around up to
  four minutes ahead of ignition (the attitude slew rate is a few degrees per second, so a
  short trim would otherwise spend its whole burn pointing the wrong way). Long low-thrust
  burns are split across successive perigee passes (Briz-M/Fregat style).
- **Apogee burn**: velocity-to-be-gained steering toward the velocity of the target orbit in
  the target plane (same line of nodes, new inclination) combines circularisation and
  plane change (GEO from Baikonur: 51.6° removed at apogee).
- When the launcher is spent, the spacecraft separates and its own propulsion (apogee engine,
  crew-ship engine) completes the remaining burns, again split across passes when long.
- The resulting orbit is compared with the target; a stable orbit off target is reported as
  such, a suborbital trajectory as a failure.

## 6a. Reference timelines

Flown with `DEFAULT_GUIDANCE` merged with each vehicle's `guidanceDefaults`, no auto-tuning.
"published" is the public figure the model is calibrated against, "model" what the simulation
produces; `tests/fleet-defaults.test.ts` asserts each of these inside the window in brackets.

**Falcon 9, Starlink-class 15.6 t to the ISS plane from Cape Canaveral**

| milestone | published | model | window |
| --- | --- | --- | --- |
| max Q | 65–80 s | 68.5 s (22.6 kPa) | 62–80 |
| MECO | 150–165 s | 150.8 s | 145–165 |
| stage separation | MECO + 3 s | 153.8 s | 148–168 |
| MVac ignition | MECO + 7 s | 157.8 s | 152–172 |
| fairing jettison | 190–230 s | 210.9 s (108 km) | 185–235 |
| SECO | 500–560 s | 526.4 s | 495–565 |

**Soyuz-2.1a, 7.15 t crew ship from Baikonur to the ISS** (the application's default mission)

| milestone | published | model | window |
| --- | --- | --- | --- |
| booster separation | ~118 s | 120.4 s | 112–128 |
| fairing jettison | ~157 s | 176.3 s | 148–185 |
| core cut-off | ~287 s | 294.1 s | 275–305 |
| third-stage cut-off (SECO) | ~528 s | 535.9 s | 500–570 |

The fairing is 12 % late: the heating placard releases it at ~105 km, which this trajectory
reaches ~19 s after the published callout.

**H3-22, 5 t to 500 km from Tanegashima**

| milestone | published | model | window |
| --- | --- | --- | --- |
| SRB-3 burnout | 105–115 s | 105.7 s | 100–118 |
| SRB-3 separation | 107–117 s | 107.7 s | 102–120 |
| MECO | 300–330 s | 318.4 s | 295–335 |

**Electron, 200 kg to sun-synchronous orbit from Mahia**

| milestone | published | model | window |
| --- | --- | --- | --- |
| max Q | 60–70 s | 54.4 s | 48–72 |
| MECO | 145–155 s | 136.9 s | 130–158 |
| fairing jettison | ~190 s | 184.1 s (112 km) | 155–205 |

The two reference missions flown to a sun-synchronous orbit (Electron from Mahia, PSLV-XL from
Sriharikota) are here for their published *clock*, which is what this section compares; PSLV-XL
to SSO is excluded from the fleet acceptance matrix because the azimuth it needs lies outside
Sriharikota's range-safety window — the real vehicle flies a dog-leg around Sri Lanka that
this model does not implement.

Electron runs about 10 % early: nine Rutherfords at the published 24 kN sea-level thrust burn
the first stage's 9.7 t in ~140 s, while the published ~152 s implies in-flight throttling this
model does not have. The fairing follows from the heating placard at ~110 km.

**PSLV-XL, 1.75 t to sun-synchronous orbit from Sriharikota**

| milestone | published | model | window |
| --- | --- | --- | --- |
| PS1 separation | ~110 s | 109.6 s | 100–122 |
| PS2 cut-off | ~260 s | 257.3 s | 240–285 |
| PS3 cut-off | 400–600 s | 354.0 s | 330–600 |

PS3 is a fixed-impulse solid: its burn time follows from the modelled grain and ends earlier
than the published window.

**Ariane 64, 5.75 t to GTO from Kourou**

| milestone | published | model | window |
| --- | --- | --- | --- |
| P120C separation | 130–140 s | 117.6 s | 112–145 |
| fairing jettison | ~200 s | 150.2 s | 140–215 |
| core cut-off | ~460 s | 444.7 s | 420–500 |

The modelled P120C grain burns out at ~116 s against a published 130–140 s separation, which
also pulls the fairing forward.

## 6b. Fleet acceptance and reference payloads

`tests/fleet-defaults.test.ts` flies every vehicle from its first site to `leo`, `iss` (where
the site's range-safety minimum reaches 51.64°), `sso` and `gto` (where a GTO figure is
published), at 25 %, 50 % and 90 % of the reference payload. That is **159 combinations**, of
which 36 are not flyable from the site at all (range safety, below), leaving **123**; of those
**85 are acceptance cases that pass** and 38 are excluded by one of the three tables below.
Every excluded combination is re-flown by a separate test, so an entry cannot quietly stop
being true.

What the fleet delivers, at the three payload fractions the acceptance test uses
(`+` = orbit reached inside the acceptance band, `-` = excluded, `n/a` = range safety,
`—` = no such preset for this vehicle):

| vehicle | leo 25/50/90 % | iss 25/50/90 % | sso 25/50/90 % | gto 25/50/90 % |
| --- | --- | --- | --- | --- |
| Soyuz-2.1a | - - - | - - - | n/a | — |
| Soyuz-2.1b / Fregat | + + - | + + - | n/a | + + - |
| Proton-M / Briz-M | + - - | + - - | n/a | + - + |
| Angara-A5 / Briz-M | + - - | — | + - - | + + + |
| Falcon 9 | + + - | + + - | n/a | + + - |
| Falcon Heavy | + + - | + + - | n/a | + + - |
| Atlas V 551 | + + - | + + - | n/a | + + + |
| Vulcan Centaur VC4 | + + - | + + - | n/a | - - + |
| Ariane 64 | + + - | + + - | n/a | + + + |
| Long March 5 | + + + | + + + | n/a | + + + |
| H3-22 | + + + | + + + | n/a | + + + |
| PSLV-XL | + + - | + + - | n/a | + - - |
| Electron | + + + | + + + | + + - | — |
| Starship | + + + | + + + | n/a | + + - |

The largest payload the model delivers to each preset, found by bisection, against the
published figure. Bisection assumes the passing region is contiguous in payload mass, which is
not always true near the limit (Atlas V reaches GTO at 8.0 t but not at 8.9 t, so its 6.2 t
here is a lower bound, not a ceiling):

| vehicle | leo (500 km) | iss (420 km) | sso (600 km) | gto |
| --- | --- | --- | --- | --- |
| Soyuz-2.1a | — (no restart) | — | — | — |
| Soyuz-2.1b / Fregat | 5.2 t / 8.2 t | 5.1 t / 8.2 t | — | 1.1 t / 1.9 t |
| Proton-M / Briz-M | 5.8 t / 23 t | 5.8 t / 23 t | — | 1.7 t / 6.9 t |
| Angara-A5 / Briz-M | 8.3 t / 24.5 t | — | 6.9 t / 24.5 t | > 5.4 t / 5.4 t |
| Falcon 9 | 17.9 t / 22.8 t | 17.1 t / 22.8 t | — | 6.3 t / 8.3 t |
| Falcon Heavy | 45.1 t / 63.8 t | 43.1 t / 63.8 t | — | 19.3 t / 26.7 t |
| Atlas V 551 | 16.9 t / 18.9 t | 15.5 t / 18.9 t | — | ≥ 6.2 t / 8.9 t |
| Vulcan Centaur VC4 | 15.6 t / 24.4 t | 12.8 t / 24.4 t | — | > 12.1 t / 12.1 t |
| Ariane 64 | 16.8 t / 21.6 t | 14.8 t / 21.6 t | — | > 11.5 t / 11.5 t |
| Long March 5 | > 25 t | > 25 t | — | > 14 t |
| H3-22 | > 10 t | > 10 t | — | > 4 t |
| PSLV-XL | 2.8 t / 3.8 t | 2.6 t / 3.8 t | — | 0.6 t / 1.4 t |
| Electron | > 0.30 t | > 0.30 t | 0.2 t / 0.30 t | — |
| Starship | > 100 t | > 100 t | — | 21.2 t / 27 t |

"The largest payload that passes the acceptance criteria" is not the same thing as "the largest
payload delivered": a flight can reach a perfectly good orbit and still miss the criteria on
apsis accuracy or on the mission clock.

### Why a combination is excluded

Which table a case lands in follows a rule that can be checked against the flight, not an
opinion about the vehicle. The margin quoted below is (ideal Δv of the stages that fly the
ascent) − (perigee speed of the insertion orbit + 1450 m/s of losses − the Earth-rotation
credit), i.e. the same test `planMission` uses to decide what to aim at.

| table | rule | entries |
| --- | --- | --- |
| range safety (`SITE_GEOMETRY`) | the azimuth the orbit needs is outside the site's window — the launch would not be licensed | 36 |
| `BEYOND_CAPABILITY` | the flight ends with the tanks empty, **or** the ascent stages' margin is below +150 m/s | 26 |
| `ARCHITECTURE` | propellant left, orbit reachable, but nothing in the stack can use it | 6 |
| `KNOWN_GUIDANCE_FAILURES` | **defects**: Δv available, a stage able to spend it, orbit still lost or missed | 6 |

**Range safety.** The `sso` preset needs a retrograde, roughly north-westerly or south-easterly
azimuth (346–348° from the northern sites, 191–193° from the southern ones). Only Plesetsk
(330–90°) and Mahia (90–200°) have a window that contains it; from Baikonur, Cape Canaveral,
Kourou, Wenchang, Tanegashima, Sriharikota and Starbase that azimuth points over populated land
or another country. The table is generated from the site data through `azimuthAllowedFor`, and
a test asserts that the exclusions are exactly the sites the function rules out, so the matrix
cannot be shrunk by quietly dropping a case. Angara-A5 and Electron are therefore the only
vehicles with `sso` acceptance cases.

**Beyond capability.** Two systematic gaps explain most of it:

1. **Published LEO figures are quoted for a ~200 km reference orbit**, while the `leo` preset
   is 500 km and `sso` 600 km. The extra orbital energy costs 150–300 m/s, i.e. 4–8 % of the
   injected mass, so 90 % of the quoted figure is out of reach for the launchers whose margin
   is thin (Falcon 9, Falcon Heavy, Atlas V, Ariane 64, PSLV-XL, Starship to GTO).
2. **Proton-M, Angara-A5 and Soyuz-2.1b always carry their kick stage in this model.** The
   published 23 t / 24.5 t / 8.2 t LEO figures are for the configuration without it; a Briz-M
   is 22 t of stage sitting on top, and the measured shortfalls are 553–1137 m/s (Proton-M),
   692–1519 m/s (Angara-A5) and 990 m/s (Soyuz-2.1b). Those flights do not end gracefully out
   of propellant: the ascent flattens, sinks back into dense air and breaks up on the max-Q
   placard, which is what an underpowered stack flying a closed-loop ascent does. The
   classification is the delta-v, not the event that ends the flight.

The earlier revision of this document called these "guidance failures". That was wrong, and the
measurement that settles it is a sweep: each of them was re-flown over kick angle 1.5–6°, turn
rate 0.25–0.4 °/s, loft 0 or 150 km and pitch limit 25 or 35° — 48 combinations each — and not
one of them reaches orbit at any setting, while their ascent-stage margin is negative. What is
missing is propellant, not steering.

**Architecture.** Soyuz-2.1a's Blok I fires once and the CubeSat dispenser has no propulsion,
so the orbit at cut-off is final. `planMission` now asks that question before it picks the
insertion orbit (`canBurnAfterAscent`), and for this stack the answer changes nothing above
300 km — aiming it straight at the target was measured at 497 × 2474 km (500 km target) and
417 × 441 km (420 km target). It therefore flies the transfer orbit it can fly accurately,
reaches 200 × 417–499 km with 0.3–2.6 km/s still in the Blok I, and ends `off target`. Its real
profile — insert at ~200 km and let the spacecraft raise itself — is the application's own
default mission and has a test of its own: Soyuz-2.1a + 7.15 t crew ship from Baikonur inserts
into 200 × 199 km at T+536 s and the crew ship circularises at 416 × 418 km / 51.64°.

**Guidance defects.** Six of 123, and each is a real defect with propellant and a stage to
spend it:

- **Vulcan Centaur to LEO and the ISS plane at 90 %** (2 cases). Centaur V lights at 0.26 g
  under 22 t; the lofted arc reaches 367 km and falls back before the stage has built orbital
  speed, and the vehicle breaks up at 52 kPa against its 45 kPa placard with 2.7–2.8 km/s
  unused and +646/+743 m/s of margin. No setting in the 48-point sweep recovers it. The fix is
  a profile that trades loft for horizontal speed at MECO, not another constant.
- **Perigee high on a transfer orbit** (4 cases): Soyuz-2.1b to GTO at 90 % (310 km against
  250 km), Proton-M at 50 % (351 km, and the Briz-M needs four perigee passes so the parking
  orbit is only complete at T+6435 s), Vulcan at 25 % and 50 % (376 and 362 km). See below.

### Insertion accuracy

Circular targets are met to a few kilometres. On a transfer (GTO) target the apogee lands
within 71 km of 35 786 km and the plane within 0.11°, but the perigee comes out **high**: the
ascent cuts off when the osculating apoapsis reaches its target, wherever the vehicle happens
to be, and the closed loop leaves it above the 250 km insertion altitude. Measured spread over
the fleet: +1 km (Falcon 9, Starship), +9…+36 km (Atlas V, Ariane 64, H3, Long March 5,
Angara-A5), +60 km (Soyuz-2.1b at 90 %), +101 km (Proton-M at 50 %), +112 and +126 km (Vulcan
at 25 % and 50 %). The acceptance band for an elliptical target is therefore max(40 km, 15 %) —
wider than the max(10 km, 2 %) used for circular targets, but two-sided: over-performing into a
120 km high perigee is as much a miss as under-performing, and the four flights outside it are
listed as defects rather than accepted. A real GTO injection holds the perigee to a few
kilometres, so this is a known accuracy limit of the model, not a target.

Narrowing the apoapsis-ceiling band (from 8 % of the insertion apoapsis to 8 % of the insertion
altitude, which would squeeze the pitch down earlier on a 2000 km transfer) was tried and
rejected: it fixes nothing in the matrix and turns Vulcan to the ISS plane at 50 % from a clean
insertion into a break-up at 52 kPa.


## 7. Launch geometry and windows

Inertial launch azimuth from spherical trigonometry: sin β = cos i / cos φ (northbound or
southbound solution); the rotating-frame azimuth corrects for the Earth's velocity. A site
cannot reach inclinations below its latitude directly (nor below its range-safety minimum),
so the ascent uses the lowest reachable inclination and a plane change is scheduled at
apogee.

The ascent produces RAAN = λ_site + θ − Δλ with sin u = sin φ / sin i and
tan Δλ = sin u cos i / cos u. Launch windows solve θ(t) for the time when this RAAN equals
the target RAAN: the ISS plane (reference RAAN at an epoch plus J2 regression, about
−5°/day, so windows come ~20 min earlier each day) or a sun-synchronous local time of the
ascending node (RAAN = α_sun + 15°/h × (LTAN − 12 h)).

Sun-synchronous inclination for a given altitude follows from matching the J2 nodal rate to
360°/year.

## 8. Failures and debris

Failure injection is deterministic. The `random` mode seeds a Mulberry32 PRNG from the launch
epoch and the vehicle id, so the same mission configuration always injects the same failure at
the same mission time and a recorded flight replays identically; no physics code calls
`Math.random`.

The **structural placard** is a separate mechanism and is tested on every ascent step: a
vehicle whose dynamic pressure exceeds 1.15 × its quoted max-Q limit breaks up
(`evt.structuralFailure`). The `evt.maxQ` event is informational — it fires at the first local
maximum of q, which on a vehicle that flies a throttle bucket is a plateau — and testing the
placard only there used to let a lost trajectory fly at sixty times its limit and simply hit
the ground instead of breaking up, which made the `maxQ` field in `src/data/vehicles.ts` inert
on exactly the trajectories it exists for.

Failure injection modifies the active stage: engine-out reduces thrust by one engine's share,
thrust loss shuts the stage down, premature separation drops it, a stuck fairing keeps its
mass, range safety terminates the flight. A vehicle falling back through 100 km without
propulsion triggers a range-safety termination.

Separated boosters, stages and fairing halves are propagated individually with gravity and
drag until impact (reported with latitude/longitude) or, if they end up above 120 km perigee,
kept as orbital debris. Recovered boosters fly the entry and landing burns described above and
report a landing when they touch down below 12 m/s.

## 9. Orbit propagation

After the final burn the spacecraft is propagated numerically with J2 and upper-atmosphere
drag (ballistic area ≈ 1 % of mass in m²). Nodal precession and slow decay are visible on the
orbital map and in the RAAN/altitude readouts under high time warp.

## 10. Assumptions and limitations

- Spherical Earth for altitude and gravity (J2 only as a perturbation); no terrain.
- Point-mass vehicle: attitude is a commanded direction with a slew-rate limit, no rotational
  dynamics, no aerodynamic lift, no wind.
- Generic drag curve for all vehicles; solid-motor thrust profiles are simplified.
- Guidance is a compact explicit law, not the flight software of any real vehicle; timelines
  and margins are representative, not authoritative.
- Vehicle data are public figures rounded to about ±10 %; the LEO payload of a
  Briz-M/Fregat configuration is lower than the published three-stage figure.
- The ISS reference plane is an approximate epoch value, not a live TLE.

## Glossary (EN / RU / TH)

| English | Русский | ไทย |
| --- | --- | --- |
| launch vehicle | ракета-носитель | จรวดนำส่ง |
| payload | полезная нагрузка | น้ำหนักบรรทุก |
| perigee / apogee | перигей / апогей | จุดใกล้/ไกลโลกที่สุด |
| inclination | наклонение | ความเอียงของวงโคจร |
| RAAN | долгота восходящего узла | ลองจิจูดของโหนดขึ้น |
| dynamic pressure (max-Q) | скоростной напор | ความดันพลวัต |
| gravity turn | гравитационный разворот | การเลี้ยวด้วยแรงโน้มถ่วง |
| parking orbit | опорная орбита | วงโคจรจอด |
| plane change | поворот плоскости орбиты | การเปลี่ยนระนาบวงโคจร |
| delta-v budget | баланс характеристической скорости | งบประมาณ Δv |
