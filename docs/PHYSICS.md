# Orbitlab physics model

This document describes what the simulator computes. Symbols follow the usual astrodynamics
conventions; SI units throughout. For a student-facing walkthrough of flying and reading a
mission instead, see [docs/USER-GUIDE.md](USER-GUIDE.md).

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
density (Vallado table 8-4), with the mesopause temperature held at 186.87 K to 91 km as
USSA-76 does before the thermosphere rises toward ~1000 K.

The 86 km row of the exponential table is re-derived rather than copied. Vallado's published
values are discontinuous at both ends of their own interval: 6.6e-6 kg/m³ with a 5.5 km scale
height is 5.1 % below the USSA-76 density the branch above hands over, and decays to 3.190e-6
at 90 km where the next row *starts* at 3.396e-6 — a 6.4 % density **inversion** in the middle
of the decay band, which gives drag a discontinuous, wrong-signed derivative. The row used here
is base 6.95793e-6 (the USSA-76 value at 86 km) with H = 4 km / ln(6.958e-6/3.396e-6) =
5.575 km, which lands exactly on the 90 km row. Every other node is continuous to better than
0.04 % and is left as published. The guard that missed this stepped 1000 m at a time, landing
on every table node and so stepping over a discontinuity *at* one; it now samples off-node and
a metre either side of every node.

Two drag laws, because the model flies two kinds of body:

- a **slender launcher** uses a generic Cd vs Mach curve (0.30 subsonic, 0.64 peak at M ≈ 1.2,
  0.22 hypersonic), with the frontal area of the attached stack including strap-on boosters, so
  the area drops at separation;
- a **blunt, tumbling body** — a jettisoned booster (1.2), a fairing half (1.5), a spent upper
  stage or a released spacecraft in free molecular flow (2.2) — uses its own coefficient with
  only a weak Mach dependence (a ~20 % transonic rise). Every piece of debris has carried that
  coefficient since the type was written and nothing read it, so boosters, stages and fairing
  halves all fell with the slender ascent curve: two to seven times too little drag, landing too
  fast and too far downrange.

Dynamic pressure q = ½ ρ v_air² is tracked for the max-Q event, and the **structural placard** is
armed continuously from liftoff until payload separation: exceeding 1.15 × the vehicle's quoted
limit destroys it, on every step of powered or coasting flight rather than only at the detected
q peak. Below the placard, guidance applies **load relief** — the throttle-back every real
launcher flies when q approaches its limit — from 95 % of the placard down to 40 % throttle. A
healthy ascent peaks at 22–40 kPa against 35–70 kPa placards and never touches it.

## 4. Propulsion and mass

For each engine, thrust varies linearly with ambient pressure between sea-level and vacuum
values, F(p) = F_vac − (F_vac − F_SL) p/p₀, and mass flow is ṁ = F_vac/(g₀ Isp_vac) at full
throttle. Mass flow is a property of the pump and the injector, not of the ambient pressure —
thrust is linear in pressure because the nozzle exit term is, while the propellant flow is
unchanged — so F_vac/(g₀ Isp_vac) and F_SL/(g₀ Isp_SL) are the *same* number, and a data pair
that says otherwise is over-determined. The model takes the vacuum pair as authoritative (it is
the pair every source quotes, and the only one a vacuum-only engine has) and **back-solves the
Isp at every pressure** from Isp(p) = F(p)/(ṁ g₀), so F = ṁ g₀ Isp holds exactly at every
altitude. The sea-level Isp a ground-lit engine then delivers is within 1 % of the quoted
`ispSL` for most of the fleet; the exceptions are recorded by a test rather than hidden —
RD-108A +6.9 %, Vulcain 2.1 +5.0 %, Rutherford +2.6 %, Raptor 2 +2.4 %.

An engine flagged `vacuumOnly` — every upper- and kick-stage engine that only ever ignites above
~100 km — has no sea-level operating point at all (an RL10 nozzle would not flow full at sea
level), and its `thrustSL`/`ispSL` fields are placeholders rather than data. The flag makes the
model return the vacuum figures at every pressure for those engines, so a future abort or
suborbital-hop scenario cannot silently fly invented numbers.

**Solid motors** quote a *mean* thrust in the data — grain mass divided by the published burn
time — and fly a regressive ramp on top of it, from a per-motor `peakFactor` (published
peak/mean: P120C 1.52, SRB-A3 1.22, Zefiro 40 1.16, fleet default 1.2). The ramp is normalised
so that it does not change the burn time. That is not the same as being symmetric about 1: the
profile is a function of the fraction *burned*, and

    t_burn = (m/ṁ) ∫₀¹ df / p(f)

so a 1.52 → 0.48 ramp burns 11 % longer, which moved Ariane 6's P120C separation from T+140 s
to T+153 s against a published 130–140 s. Instead p(f) = P(1 − cf) with c the root of
ln(1/(1−c)) = Pc, which makes that integral exactly 1 for any peak — 1.2 → 0.82, 1.52 → 0.60.
A solid **first stage** gets the same ignition factor as a solid **booster**; applying it only
to boosters made the same P120C count differently on Vega-C and on Ariane 6, and understated
Vega-C's liftoff thrust-to-weight by a third.

Throttle is limited by the engine's minimum throttle, an acceleration limit (e.g. 4.5 g), a
throttle bucket around max-Q for vehicles that fly one, and the load-relief law of §3.

Stages are burned serially; strap-on boosters burn in parallel with the core (the core may
throttle down while they are attached) and are jettisoned after a short delay. Hot staging
(Soyuz Blok I, Proton stage 2, Starship) ignites the next stage at separation.

**Fairing jettison** follows a thermal placard rather than a fixed altitude: the fairing is
released at the first moment the free-molecular heating rate q̇ = ½ρv³ falls below the vehicle's
placard *and* the dynamic pressure below 1.1 kPa, above an 80 km floor. On a normal ascent that
happens between about 95 and 125 km — Falcon 9 sheds its fairing around T+200 s instead of
waiting for a fixed 110 km that a lofted trajectory only reaches minutes later. The vehicle's
quoted `sepAltitude` + 40 km remains as a backstop for a trajectory that never satisfies the
placard.

The placard is an operator's choice, not a law of nature. 1135 W/m² (0.1 BTU/ft²·s) is the
common one, it is the **only** heating criterion in the model, and it puts Falcon 9's jettison
at T+211 s against a published ~210 s.

Four vehicles used to carry a per-vehicle `heatFluxLimit` instead: Ariane 64 900 W/m², Vega-C
75, Long March 2D 50 and H-IIA 202 **14**. Those were presented as published placards and they
were not. Three of them are 15×, 23× and 81× below the industry criterion — the H-IIA figure is
about 0.0012 BTU/ft²·s, which no operator flies a fairing to — and they had been back-solved
from the jettison times they were supposed to predict. Bending a physical criterion by eighty
times to reproduce a number is fitting, not modelling.

So the mechanism is modelled instead. Those four operators **publish a jettison time and fly
it**, and the field is now `FairingSpec.sepTime`: Ariane 64 200 s, Vega-C 220 s, Long March 2D
220 s, H-IIA 202 250 s (measured T+200.1, 220.0, 220.2, 250.2 s). Soyuz-2.1a, Soyuz-2.1b and Long
March 3B/E carry the same field for the same reason — their operators publish a jettison time too
— at 157 s, 157 s and 215 s (measured T+157.1 s and T+215.2 s). The 80 km altitude floor still
applies to a timeline release, so a trajectory that is still deep in the atmosphere at its
published time does not shed the fairing there. Everything else in the fleet — Falcon 9, H3,
Electron, PSLV-XL, Long March 5, Angara, Proton, Atlas V, Vulcan — keeps the unmodified physical
placard.

Soyuz-2.1a and Soyuz-2.1b now fly the published T+157 s callout directly instead of the heating
placard, which used to leave Soyuz-2.1a 19 s late (T+176 s against that same ~157 s): at the
published time the vehicle is at 90 km, above the 80 km floor, while the free-molecular heating
is still 11.9 kW/m² — ten times any sensible placard — so the fairing was never coming off there
on the physical criterion alone. As with the four vehicles above, that row now agrees by
construction and is a regression guard rather than evidence.

When first-stage recovery is selected, a fraction of first-stage propellant is reserved and the
spent stage flies itself down. The reserve is sized by the rocket equation for an 800 m/s
landing burn on the dry stage; everything above it may be spent on the entry burn, which fires
retrograde below 70 km until the airspeed is down to about 1.4 km/s (or the reserve is all that
is left). The landing burn then follows a constant-deceleration profile — bang-bang thrust
standing in for throttling — aimed at about 2 m/s at touchdown, on as many engines as give a
thrust/weight near three, decelerating at 60 % of the net acceleration available. That last
number is what makes it a hoverslam: a stage with margin falls further before it brakes, and one
with little thrust starts early and never asks for more than it has. Engine selection is
per-vehicle (at least three, more when three cannot give the empty stage 2.5 g), so the profile
is not tuned to one booster.

Ideal Δv per stage follows Tsiolkovsky, Δv = g₀ Isp ln(m₀/m₁). **Strap-on boosters are a
separate phase, not a bigger tank**: the remaining-Δv walk splits the active stage at booster
burnout, so the core consumes coreFlow/(coreFlow+boosterFlow) of the flow during the parallel
phase, the empty casings are dropped, and the core finishes alone. Lumping the two propellant
loads into one burn at a flow-weighted Isp made the core carry the casings until the *combined*
load was gone — on Ariane 64 that is 52 t of empty P120C dragged through the whole Vulcain burn,
worth 2 272 m/s of fiction. The **fairing** is dropped too, at the first staging boundary the
walk crosses; it used to be carried to orbit. Together these were worth 5–19 % on every
booster-equipped launcher, and the figure feeds the HUD, the tuner's objective and the planner's
choice between a transfer ellipse and a parking orbit.

The telemetry panel reports the Δv actually delivered by thrust together with the losses:

- gravity loss ∫ g sin γ dt (γ = flight-path angle),
- drag loss ∫ (D/m)(v̂_air · v̂) dt,
- steering loss ∫ (T/m)(1 − cos α) dt (α = angle between thrust and the **inertial** velocity).

The identity that closes the budget, d|v|/dt = a_T·v̂ − (μ/r²)(r̂·v̂) − (D/m)(v̂_air·v̂), is
written in the inertial frame, so every term has to be projected on the inertial velocity.
Measuring the steering loss against the *air-relative* velocity below 100 km — which is what the
model used to do — mixes frames: early in flight v_air is nearly vertical while v is dominated
by the 320–465 m/s of eastward rotation velocity, so cos α reads ≈1 against v_air. A Soyuz
ascent reported 102 m/s of steering loss where the inertial figure is ~650 m/s, and 485 m/s of
the budget was simply missing. A test now asserts the budget closes to within 1 % of the
delivered thrust Δv; the residual is quadrature error (left-rectangle sums against an RK4
trajectory) plus the short unpowered gaps inside the ascent window.

Measured across the fleet, ascent losses are 1 700–2 000 m/s: gravity 1 000–1 200, steering
450–700, drag 100–200.

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
  leave Falcon 9 in a 198 × 21 500 km "parking orbit". It engages **as soon as the vehicle is
  out of the atmosphere** (above ~110 km), not only within a band of the insertion altitude: a
  stage climbing from a 200 km staging altitude to a higher circular target spends minutes
  between the two, and with the old altitude gate nothing limited the apoapsis over that whole
  stretch — aimed straight at 500 × 500 km, Soyuz-2.1a ran its apoapsis out to 2 474 km while
  the periapsis chased it.
- **Load relief.** Whatever the steering law asks for, the throttle is backed off once the
  dynamic pressure passes 95 % of the vehicle's structural placard (§3). This is the protection
  every real launcher has, and it only acts on a trajectory already heading for the placard.
- **Staging ceiling.** While a launcher stage is still to come, the current stage aims no
  higher than 200 km: its job is to leave the atmosphere and build speed, not to reach the
  final altitude.
- **Lofted hand-off.** When the next stage cannot hold altitude at hand-off speed
  (a_next < 0.8 g_eff at the predicted cut-off state, i.e. Centaur- and Vinci-class stages)
  the booster has to hand over *climbing*, so that the ballistic arc keeps the stack high
  while the weak stage builds horizontal speed. The `loft` parameter is that apex, converted
  into the vertical speed the booster must still have at its own cut-off,
  v_zT = √(2 g_eff Δh).

  **The hand-over to a kick stage counts, and used not to.** `nextStageAccel` excludes a weak
  final stage — the ascent is planned over the stages that actually fly it — and that
  exclusion reached this test as well, so the last *strong* stage of a stack that carries a
  Briz-M or a Fregat believed it was the final stage, aimed at a level cut-off at the
  insertion altitude, and handed 0.065–0.09 g a trajectory with nowhere to go but down. It is
  the weakest hand-over in the fleet and it was the only one that could not be lofted. The
  amount of apex it asks for is not the vehicle's whole figure but only what the kick stage
  cannot avoid losing — `kickStageSink` below, minus the band the ascent already gives it
  between the insertion altitude and the insertion floor, capped at the vehicle's figure.
  Flying the whole figure at every kick-stage hand-over was tried and measured: Proton-M needs
  all of it (the cap binds), and it costs Angara-A5 to a 600 km sun-synchronous orbit 626 s of
  insertion clock for a hand-over that only needs about a third of it.

  **How far a kick stage sinks.** While the stack is short of the local circular speed by Δv
  the centrifugal term no longer balances gravity, so it falls at
  g_eff = g[1 − (1 − Δv/v_c)²] ≈ 2gΔv/v_c. A kick stage closing the shortfall at a constant
  acceleration a takes T = Δv/a, and the drop over the burn is

  ```
  ∫₀ᵀ (T − t) g_eff(t) dt = 2 g Δv³ / (3 v_c a²)
  ```

  cubic in the shortfall and inverse square in the thrust: a stack twice as short sinks eight
  times as far. The closed form is open loop — it assumes the stage thrusts horizontally
  throughout — and a flown insertion pitches up as it sinks (the velocity-to-be-gained command
  reaches 68° by the end of a Briz-M insertion), which cancels about half of it. The measured
  correction is 236 km open loop against 104 km flown, and `SINK_FLOWN_FRACTION` is that
  measurement.

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
| Proton-M | 6.0 | 0.30 | 25 | 150 |
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
upper stage lights below 0.4 g (Centaur III and V, Vinci, URM-2 with a Briz-M above it, and —
since the kick-stage hand-over started counting, §5.1 — Proton-M, whose Briz-M lights at
0.065–0.09 g, the weakest hand-over in the fleet). Without it Proton-M's third stage cut off
level at the insertion altitude and the Briz-M sank out of the orbit it was meant to close:
with 5.75 t aboard the insertion bottomed out at 94 km and was announced as a parking orbit
there, and with 7.15 t the stack was destroyed at 46 kPa. With it the same 5.75 t insertion
bottoms out at 139 km.
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
  actually do so** — ideal Δv against perigee speed + `ASCENT_LOSS_ALLOWANCE` − the Earth-rotation
  credit + `ASCENT_MARGIN_REQUIRED`. Both constants live in `src/physics/mission.ts` and their
  values are not re-typed here, because the last time they were the allowance moved and the
  prose did not. That allowance is the low end of what the fleet actually spends:
  measured across the sixteen 50 %-payload LEO rows that reach orbit, ascent losses run
  1 684–2 633 m/s, median 1 970 (gravity 889–1 454, steering 658–1 363, drag 9–114). It was
  1 450 m/s until this wave — below the measured spread entirely — and was kept there because
  raising it was believed to cost accepted cases; re-measured after the guidance fixes below,
  1 450, 1 750 and 1 850 all give the same 149 of the 201 fleet rows the matrix held at the
  time (it is 195 since release review 2 corrected the `iss` gate, §6b), so the honest number
  is free. For a stack that carries a low-thrust kick stage (Fregat,
  Briz-M, Curie) the test is applied to the stages below it, which is the case the ellipse was
  introduced for. Aiming a stack at an ellipse it cannot reach is strictly worse than aiming
  it at the circular parking orbit it can: the ascent burns to depletion short of both and
  ends suborbital, where the parking orbit would have been reached and the following burns —
  or the spacecraft's own engine — would have raised it. Soyuz-2.1a with a crew ship to the
  ISS is exactly that case, and is covered by a test of its own.
- **Crewed launches** are flown into a low *circular* parking orbit rather than a transfer
  ellipse, because the crew's abort options depend on the orbit being one they can stay in.
  Soyuz MS inserts at 200 × 240 km and raises itself to the station over the following orbits.
  (Without this rule the corrected Δv accounting above, which lifts every booster-equipped
  launcher by 5–19 %, flips the R-7 onto a 200 × 417 km ellipse: more efficient on paper, and
  not a crewed profile.)
- **Single-shot stacks.** Before it chooses the insertion orbit the planner asks whether
  anything can light an engine *after* ascent cut-off (`canBurnAfterAscent`: the last stage
  restarts, a kick stage sits above it, or the payload has propulsion). When the answer is no —
  Soyuz-2.1a and Long March 2D with an inert payload — the orbit the stack is in at cut-off is
  final, so the ascent is aimed at the mission's own orbit, perigee *and* apogee, exactly as a
  real single-burn direct insertion is. `checkAscent` then has two stopping conditions of its
  own (`singleShotCutoff`), because everything else there assumes a later burn exists and is
  gated on `canReigniteAfterCutoff`: cut off when the orbit **already is** the mission's, or
  when the apsis residual has stopped improving and further thrust can only make it worse.
  Soyuz-2.1a with an inert payload aimed at 200 km circular now cuts off at 197.2 × 200.4 km
  with 2.7 km/s still in the Blok I; it used to burn on to 197 × 695 km.

  The first of those two conditions is asked at a **quarter** of the acceptance band, not at the
  whole of it. Asked at the whole band it shut the engine down the instant the still-climbing
  perigee crossed the low edge, which put the flagship case at 190.4 × 200.1 km — inside a 10 km
  band by 395 m, and quoted in four places as "198 × 201". The margin is now asserted in the
  test, not discovered later.

  The band this works in is a property of the trajectory, not of the planner: a continuous burn
  can only cut off circular at an altitude it *arrives* at with its horizontal speed still short
  of orbital, and past that point every further second of thrust raises the apoapsis instead of
  the vehicle. Measured, aiming each stack straight at a circular target:

  | target | Soyuz-2.1a + 1.755 t | + 3.51 t | + 6.318 t | Long March 2D + 325 kg |
  | --- | --- | --- | --- | --- |
  | 200 km | 197.2 × 200.4 ✓ | 198.7 × 200.6 ✓ | 197.5 × 200.1 ✓ | 151.2 × 357.3 |
  | 250 km | 219.5 × 346.4 | 241.2 × 299.2 | 247.1 × 265.5 | 140.6 × 2 411.8 |
  | 300 km | 143.8 × 895.4 | 144.0 × 873.2 | 114.6 × 754.5 (tanks dry) | 140.9 × 2 424.8 |

  This grid is **asserted**, not quoted: it is a data table in the `single-shot direct
  insertion` section of `tests/fleet-defaults.test.ts`, and `the grid behind
  DIRECT_INSERTION_CEILING` flies all eighteen cells (three payloads × three altitudes for each
  stack) and checks the closes/does-not-close verdict and both apsides to ±3 km. The copy above
  is the only other one and is a documentation convenience, kept in step with the asserted values
  rather than re-derived by hand — the Soyuz cells' perigees moved by under 1.5 km (the heaviest
  300 km cell's by 3.9 km, from 110.7 to 114.6; its apoapsis moved further, 9.2 km, from 745.3 to
  754.5) once the fairing started leaving on Soyuz's published T+157 s callout (§4) instead of
  the heating placard, and both copies now read the post-change figures.

  That change is the second half of a fix the last wave only half made.
  `src/physics/mission.ts` used to carry its own copy in the `DIRECT_INSERTION_CEILING` doc
  comment and the two disagreed by 31 000 km of apoapsis on the 300 km row; de-duplicating them
  moved the failure mode rather than removing it, because the surviving copy was still prose
  that nothing measured — and it was already 3–6 km stale in its Long March 2D column on the day
  it shipped. Those three cells are corrected above.

  So `DIRECT_INSERTION_CEILING` stays at 300 km. Above it the launcher is aimed at the transfer
  orbit it can fly accurately (200 km × target), reaches it with propellant to spare and ends
  *off target* with the perigee low — which is what such a stack really does, and why the real
  vehicles fly a Fregat, a Briz-M or a second-stage vernier phase this model does not have.
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
- **Acceptance.** `evt.targetOrbit` is now emitted only when the orbit achieved *is* the target
  (`orbitResiduals`), and `evt.offTargetOrbit` with the residuals otherwise. It used to be
  emitted unconditionally from four call sites, so the de-facto criterion was whatever the burn
  planner happened to think worth correcting — a one-sided, uncapped band that reported a 95 km
  high GTO perigee and a quarter of a degree of plane error on a geostationary mission as
  "target orbit achieved". The bands are max(10 km, 2 %) on each apsis, 0.3° on inclination, and
  max(15 km, 5 %) on the perigee of a *transfer* orbit (see "Insertion accuracy"). RAAN is
  reported always and graded only when the launch was made into a window that could reach the
  target plane: the plane an ascent reaches is fixed at liftoff and no burn in the plan rotates
  it, so grading it unconditionally would fail every off-window flight for something the vehicle
  was never asked to fix.

  The residuals are **numbers**, not prose. `orbitResiduals` used to build English sentences
  (`apogee 480 vs 420 km`, `inclination 0.42° off`) inside the physics module and
  `evt.offTargetOrbit` carried them as a `miss` parameter; no dictionary in en/ru/th declared
  that placeholder, so the clause was dead payload that would have rendered as an English
  fragment inside a Russian or Thai sentence the day one did. It now returns `OrbitMiss[]` —
  parameter id, achieved value, target value — and the event carries only the numbers it always
  did (`ap`, `pe`, `inc`, `raan`), which with `sim.plan.target` is everything a presentation
  layer needs to write that sentence in the reader's own language. Physics produces no
  user-visible strings.
- **Plane-change threshold.** `planBurns` schedules a plane change when the ascent inclination
  is more than `PLANE_PLAN_TOLERANCE` from the target, and the re-planner uses
  `PLANE_REPLAN_TOLERANCE`. Both are fractions of `INCLINATION_TOLERANCE` — two thirds (0.2°)
  and five sixths (0.25°) of the 0.3° acceptance band — rather than independent numbers, the
  same way `apsisPlanTolerance` is a fraction of `apsisTolerance`, so the band a correction is
  *planned* for cannot drift away from the band the mission is *graded* on. The planning
  threshold was 0.05° before this wave, a sixth of the acceptance band, which planned plane
  changes for errors no node burn can close.
- **Re-planning.** After every cut-off, every completed burn and every *paused* burn the
  remaining sequence is re-planned from the orbit actually achieved (`replanBurns`), instead of
  flying the sequence computed before liftoff. An ascent that ran 100 m/s short or 300 km high is
  then corrected by the following burns. The planner's tolerance is 80 % of the acceptance band,
  bounded above at 150 km, so a residual the mission is judged on is always corrected and one it
  is not is never chased round another revolution; the old max(8 km, 1.8 % of the target apogee)
  was simultaneously *tighter* than an apsis trim can deliver at 500 km and 644 km loose at GTO.
  The re-planner stops on the **residual**, not on a counter: the old hard `MAX_REPLANS` freeze
  left the outstanding burns in the plan and returned, so the caller scheduled the burn that had
  just failed to converge, again, forever — `vulcan/leo` at 50 % payload sat in `coast`
  indefinitely at 596 × 499 km. When two consecutive replans fail to improve the residual (or a
  generous backstop count is reached) the outstanding burns are dropped and the mission ends
  reporting what it actually achieved.
- **Burn deadband.** A burn whose velocity-to-be-gained would not move the apsis it aims at by a
  fifth of the acceptance band is skipped: it would ignite and report `evt.burnComplete` inside
  a single integration step without moving anything, and be re-planned next revolution. The
  threshold is derived rather than picked — burning δv at radius r on an orbit of semi-major
  axis a moves the opposite apsis by δr = 4a²vδv/μ, so the impulse worth flying is
  δv = μ δr/(4a²v). At a 500 km circular target that is 0.55 m/s; at a geostationary transfer's
  apogee it is 0.21 m/s, which is exactly why a single fleet-wide "3 m/s" constant could not
  serve both. An apsis trim is also refused at a *meaningless* periapsis: below e ≈ 0.001 the
  eccentricity vector is numerical noise and the line of apsides is arbitrary, which is how a
  4 m/s "periapsis trim" came to be flown at the apoapsis and ratchet the periapsis down one
  kilometre per revolution. A burn that shapes the orbit *and* changes the plane is flown at a
  node instead.
- **Apogee raising** at perigee (or at the node when a plane change follows) thrusting
  prograde; the same burn runs retrograde when the apoapsis overshot and has to come down,
  in which case it is always flown at the periapsis and the stack starts turning around up to
  four minutes ahead of ignition (the attitude slew rate is a few degrees per second, so a
  short trim would otherwise spend its whole burn pointing the wrong way). Long low-thrust
  burns are split across successive perigee passes (Briz-M/Fregat style).
- **Burns light only once the attitude is aligned** with the commanded direction (within 4°).
  The pre-orient above covers a burn scheduled minutes ahead, but several paths arm one for the
  next second — a re-planned trim, a remainder finished on the same pass — and there the first
  seconds of thrust used to go in at ninety degrees to the command. The gate is lifted below a
  120 km periapsis, where every second of thrust is worth more than its direction, and once lit
  a burn stays lit however the command swings as the remaining Δv goes to zero.
- **Apogee burn**: velocity-to-be-gained steering toward the velocity of the target orbit in
  the target plane (same line of nodes, new inclination) combines circularisation and
  plane change (GEO from Baikonur: 51.6° removed at apogee).
- When the launcher is spent, the spacecraft separates and its own propulsion (apogee engine,
  crew-ship engine) completes the remaining burns, again split across passes when long.
- The resulting orbit is compared with the target; a stable orbit off target is reported as
  such, a suborbital trajectory as a failure.
- **The insertion floor.** `ORBIT_INSERTION_FLOOR` is 140 km, and it is the one number behind
  three rules that are really one rule: the ascent may cut off on a transfer ellipse at that
  perigee (above), nothing under it is reported as a parking orbit, and a stack that is still
  meant to reach orbit is never flown below it — no burn is commanded and no coast accepted
  whose perigee is under the floor while the vehicle is sinking back into measurable air. The
  line for "measurable air" is the model's own fairing placard, 1.1 kPa, which is forty times
  below the softest structural placard in the fleet: every insertion in the matrix that works
  stays under 0.05 kPa, and the one that does not passes 1.1 kPa 86 s before it is destroyed.
  Reaching it means the insertion has failed, and the mission ends saying so
  (`evt.insertionAbandoned`, a suborbital trajectory) rather than flying on into a break-up.

  The defect that put it there is worth keeping, because both of its symptoms were the same
  bug. `onCoreBurnout`'s "coast to apoapsis and circularise" clause asks whether the apoapsis
  is at the insertion apoapsis and the periapsis below it, and never asked whether the orbit
  was one the vehicle could coast in. Proton-M/Briz-M with the 7.15 t crew ship cut its third
  stage off at 210 × −1 733 km — 690 m/s short of orbital — and the clause accepted it: SECO
  was announced, then a coast to apoapsis, then a `circularize` burn whose target is "make the
  radius I am at now circular", which follows the vehicle down. The Briz-M thrust for 666 s
  from 199 km to 45 km and the structural placard broke the stack up at 46 kPa, 668 s after
  its own reported insertion. With 1.4 t less payload the same path did not break up: it
  announced "parking orbit 94 × 94 km" and flew a 43-minute transfer with a 94 km perigee to a
  perfectly good 498 km orbit — the mission succeeded and the report of it was false. Two
  tests over the whole matrix pin both halves: `no flight breaks up after it has reported an
  insertion` and `no flight reports a parking orbit below the insertion floor`.

## 6a. Reference timelines

Flown with `DEFAULT_GUIDANCE` merged with each vehicle's `guidanceDefaults`, no auto-tuning and
an inert payload unless the row says otherwise. "published" is the public figure the model is
calibrated against, "model" what the simulation produces; `tests/fleet-defaults.test.ts` asserts
each one inside the window in brackets.

**The "window" column is a regression band, not a fidelity claim.** It is drawn around the
*measured* value (±8 or ±10 s by convention, or the published band where that is wider), so any
change to the model shows up as a test failure. **Seven milestones in this section fall outside
their published callout**, and they are pinned by a test (`disagreements with the published
callout`) that fails if the set changes. A green table is evidence of self-consistency; the
`published` column is where fidelity is judged.

That test reported **two** until this wave, and the difference is how it was computed rather
than anything about the model: it compared the published callout with the ±8–10 s *regression*
band instead of with the measured value, and a band drawn around the measurement absorbs up to
10 s of real disagreement. Two rows whose own notes in this document said they were outside the
published window — Electron's max Q and its MECO — were counted as agreeing. The comparison is
now measured-value against published window, with a stated ±2 % (minimum ±5 s) allowance on a
point callout such as "~157 s", because a single rounded press-kit number is not a window. That
gave nine; two have since closed — Soyuz-2.1a's and Long March 3B/E's fairing jettison, both
still on the heating placard at the time — by flying their operators' published jettison time
instead (§4), the same fix already given to Ariane 64, Vega-C, Long March 2D and H-IIA 202. The
seven left:

| mission | milestone | model | published |
| --- | --- | --- | --- |
| Falcon 9 | max Q | 50.3 s | 65–80 s |
| Electron | max Q | 50.7 s | 60–70 s |
| Electron | MECO | 138.0 s | 145–155 s |
| Soyuz-2.1a | core cut-off | 294.1 s | ~287 s |
| H3-22 | SRB-3 burnout | 104.3 s | 105–115 s |
| PSLV-XL | PS3 cut-off | 386.1 s | 400–600 s |
| Ariane 64 | core cut-off | 444.6 s | ~460 s |

None of them is new behaviour; the ones that were not already named in this section are small
(0.7–8 s) and were simply below the resolution of the old comparison.

Two model-wide changes moved these numbers this wave and are worth reading before comparing
them with an earlier revision:

- **`evt.maxQ` is stamped at the peak**, not at the moment the peak is detected. The detector
  fires once q has fallen 3 % below the maximum, which on a vehicle flying a throttle bucket is
  tens of seconds later, and stamping it with the detection time used to put the marker close to
  the published callout *by accident* (Falcon 9: peak T+50 s, marker T+69 s, published T+72 s).
  Correcting the timestamp makes the remaining disagreement visible instead of cancelling it.
- **Solid motors fly a per-motor peak factor.** `thrustVac` is the mean thrust that reproduces
  the published burn time, and the regressive ramp on top of it is normalised so that it does
  not change that burn time whatever the peak is (see §4). The P120C's published 4 323/2 846 =
  1.52 now shows up as a 1.52 → 0.60 ramp, which moved Ariane 6 and Vega-C separation onto their
  published times.

**Falcon 9, Starlink-class 15.6 t to the ISS plane from Cape Canaveral**

| milestone | published | model | window |
| --- | --- | --- | --- |
| max Q | 65–80 s | 50.3 s (22.6 kPa) | 44–58 |
| MECO | 150–165 s | 150.8 s | 145–165 |
| stage separation | MECO + 3 s | 153.8 s | 148–168 |
| MVac ignition | MECO + 7 s | 157.8 s | 152–172 |
| fairing jettison | 190–230 s | 210.9 s (108 km) | 185–235 |
| SECO | 500–560 s | 526.4 s | 495–565 |

Max Q is the one milestone in this table that disagrees with its published figure, and it is a
*data* disagreement rather than a guidance one: `maxQThrottle` starts Falcon 9's throttle bucket
at 22 kPa, which pins q there from T+45 s onwards, while the real vehicle peaks nearer 33 kPa at
T+72 s. The marker is now in the right place on the modelled q curve; the curve itself is early
and low.

**Raising `qStart` does not close it, and was measured rather than assumed.** A review proposed
moving the bucket to the real ~33 kPa peak and expected the disagreement list to drop by one.
Flown, the same mission with `qStart` at 26 / 30 / 33 / 36 kPa and with the bucket removed
entirely gives:

| `qStart` | max Q | MECO (150–165) | fairing (190–230) |
| --- | --- | --- | --- |
| 22 kPa (shipped) | 50.3 s, 22.6 kPa | 150.8 s | 210.9 s |
| 26 kPa | 44.6 s, 26.1 kPa | 148.2 s | 200.3 s |
| 30 kPa | 50.7 s, 30.1 kPa | 146.2 s | 192.9 s |
| 33 kPa | 57.6 s, 33.0 kPa | 145.0 s | 188.8 s |
| no bucket | 59.2 s, 33.1 kPa | 145.0 s | 188.6 s |

The peak *value* is a data question and 33 kPa reproduces the real one exactly; the peak *time*
is not. Even with no throttle-down at all the modelled q peaks at T+59 s, six seconds short of
the published window, because when q peaks is set by the ascent profile — the speed the vehicle
has at the altitude where density has fallen away — and not by the bucket. Meanwhile a vehicle
that never throttles back climbs faster, so MECO moves to T+145 s and fairing jettison to
T+188.8 s, both of which *leave* their published windows. The change therefore takes the
disagreement list from seven entries to nine while still missing max Q. Closing it honestly
means a lofter first-stage profile (`guidanceDefaults`), which moves every other row in this
table, so the shipped data stay where they are and the disagreement stays disclosed.

**Soyuz-2.1a, 7.15 t crew ship from Baikonur to the ISS** (the application's default mission)

| milestone | published | model | window |
| --- | --- | --- | --- |
| booster separation | ~118 s | 120.4 s | 112–128 |
| fairing jettison | ~157 s | 157.1 s | 148–185 |
| core cut-off | ~287 s | 294.1 s | 275–305 |
| third-stage cut-off (SECO) | ~528 s | 535.9 s | 500–570 |

Insertion is 197 × 200 km at T+536 s and the crew ship circularises itself at 417.9 × 418.0 km /
51.64° at T+3397 s. The fairing is now flown on Soyuz's **published jettison time**
(`fairing.sepTime` = 157 s, see §4), so that row agrees by construction and is a regression guard
rather than evidence: at the published time this trajectory is at 90 km, where the free-molecular
heating is still 11.9 kW/m² — ten times any sensible placard — which is why the heating placard
alone used to leave it 19 s late (T+176 s).

**H3-22, 5 t to 500 km from Tanegashima**

| milestone | published | model | window |
| --- | --- | --- | --- |
| SRB-3 burnout | 105–115 s | 104.3 s | 100–118 |
| SRB-3 separation | 107–117 s | 110.3 s | 102–120 |
| MECO | 300–330 s | 318.3 s | 295–335 |

**Electron, 200 kg to sun-synchronous orbit from Mahia**

| milestone | published | model | window |
| --- | --- | --- | --- |
| max Q | 60–70 s | 50.7 s | 47–63 |
| MECO | 145–155 s | 138.0 s | 130–146 |
| fairing jettison | ~190 s | 186.2 s (112 km) | 178–194 |

Electron runs about 9 % early at MECO: nine Rutherfords at the published 24 kN sea-level thrust
burn the first stage's 9.7 t in ~140 s, while the published ~152 s implies in-flight throttling
this model does not have.

The two reference missions flown to a sun-synchronous orbit (Electron from Mahia, PSLV-XL from
Sriharikota) are here for their published *clock*, which is what this section compares; PSLV-XL
to SSO is excluded from the fleet acceptance matrix because the azimuth it needs lies outside
Sriharikota's range-safety window — the real vehicle flies a dog-leg around Sri Lanka that
this model does not implement.

**PSLV-XL, 1.75 t to sun-synchronous orbit from Sriharikota**

| milestone | published | model | window |
| --- | --- | --- | --- |
| PS1 separation | ~110 s | 108.2 s | 100–122 |
| PS2 cut-off | ~260 s | 255.9 s | 240–285 |
| PS3 cut-off | 400–600 s | 386.1 s | 330–600 |

PS3 is a fixed-impulse solid: its burn time follows from the modelled grain and ends earlier
than the published window.

**Ariane 64, 5.75 t to GTO from Kourou**

| milestone | published | model | window |
| --- | --- | --- | --- |
| P120C separation | 130–140 s | 138.2 s | 130–145 |
| fairing jettison | ~200 s | 200.1 s | 193–209 |
| core cut-off | ~460 s | 444.6 s | 435–455 |

Both the separation and the fairing were 25–50 s early before the previous wave. The motor's
1.52 peak factor fixed the first; the fairing is now flown on Ariane 6's **published jettison
time** (`fairing.sepTime` = 200 s, see §4), so that row agrees by construction and is a
regression guard rather than evidence. Core cut-off does not: 444.6 s against a published
~460 s, and that gap is real and recorded.

Insertion is 244 × 35 718 km at T+839 s and the apogee burn closes the mission at T+7 211 s —
a geostationary transfer takes a revolution, and the ticker shows two hours.

**Vega-C, 1.65 t to 500 km from Kourou**

| milestone | published | model | window |
| --- | --- | --- | --- |
| P120C burnout / separation | ~135 s | 135.6 s | 130–142 |
| Zefiro 40 ignition | burnout + ~2 s | 137.6 s | 132–146 |
| fairing jettison | ~220 s | 220.0 s | 208–224 |
| Zefiro 40 cut-off | ~228 s | 230.3 s | 225–241 |
| Zefiro 9 ignition | ~231 s | 232.3 s | 229–245 |

AVUM+ is deliberately not in this table: the real Vega-C lights it about a minute after Zefiro 9
separation, while this model coasts to first apogee and lights it at ~T+49 min. That deviation
is pinned by a test of its own rather than dressed up as a milestone.

**Long March 2D, 1.3 t to sun-synchronous orbit from Jiuquan**

| milestone | published | model | window |
| --- | --- | --- | --- |
| first-stage cut-off | ~160 s | 155.2 s | 148–163 |
| stage separation | cut-off + ~1 s | 156.2 s | 149–164 |
| fairing jettison | ~220 s | 220.2 s | 209–225 |

**Long March 3B/E, 5.5 t to GTO from Xichang**

| milestone | published | model | window |
| --- | --- | --- | --- |
| booster separation | ~140 s | 141.3 s | 135–147 |
| first/second stage separation | ~158 s | 158.8 s | 153–165 |
| fairing jettison | ~215 s | 215.2 s | 215–231 |
| second-stage cut-off | ~345 s | 343.4 s | 336–350 |

Flown on the published timeline like Ariane 64 and Vega-C above (`fairing.sepTime` = 215 s, see
§4): measured T+215.2 s, against T+223.2 s on the heating placard it used to fly.

**H-IIA 202, 4.1 t to GTO from Tanegashima**

| milestone | published | model | window |
| --- | --- | --- | --- |
| SRB-A burnout | ~100 s | 99.9 s | 96–106 |
| SRB-A separation | ~108 s | 107.9 s | 104–114 |
| fairing jettison | ~250 s | 250.2 s | 242–258 |
| core cut-off (MECO) | ~396 s | 390.2 s | 383–397 |

The fairing was 87 s early on the physical placard, and the previous wave closed that by giving
H-IIA a `heatFluxLimit` of **14 W/m²** — 81× below the 1135 W/m² industry criterion, about
0.0012 BTU/ft²·s, back-solved from this very callout and then presented as a placard. It is now
flown on the published jettison time instead (§4), which is what the operator does.


## 6b. Fleet acceptance and reference payloads

`tests/fleet-defaults.test.ts` flies every vehicle from its first site to `leo`, `iss` (where
the site's range-safety **corridor contains** 51.64°), `sso` and `gto` (where a GTO figure is
published), at 25 %, 50 % and 90 % of the reference payload. That is **195 combinations**, of
which 45 are not flyable from the site at all (range safety, below), leaving **150**; of those
**111 are acceptance cases and all 111 pass**, and 39 are excluded by one of the three tables
below. Every excluded combination is re-flown by a separate test, so an entry cannot quietly
stop being true. The matrix and the tables live in `tests/fleet-harness.ts`, so that the
acceptance test and the pre-flight verdict's own test can read the same lists.

It was 201 combinations until release review 2: the `iss` gate tested only the LOWER end of the
site's corridor (`site.minInclination <= 51.64`), which put Starship from Starbase and Long
March 3B/E from Xichang — corridors that reach 31.8° and 31° — into the matrix at a 51.64°
plane, three payload fractions each. All six flew and were accepted, and no range would have
licensed any of them. The gate is now `inclinationCorridor`, the same function `planMission`
and the setup panel's verdict use.

The number that measures the guidance is the last of those three tables, not the total, and it
is **four**. The history of that number is worth keeping straight, because two waves in a row
have now reported it wrongly, and both mistakes were arithmetic on the table rather than
measurements of a flight:

- The wave before last reported "six down to three". None of the three it listed
  (`atlasv551/iss/50`, `vulcan/iss/50`, `h2a202/iss/90`) had ever been in it: six entries left
  the table, and three *different* rows, which passed the looser gate before, were broken by the
  same change and then filed as residual scope. The honest count was "six left, three
  introduced". All three regressions are now closed — see "Retrograde apsis trims" below.
- The last wave reported "six closed, table empty". **Four** were closed. The other two,
  `vulcan/leo/90` and `vulcan/iss/90`, were *moved* into `BEYOND_CAPABILITY`, and the note that
  moved them dropped the measured "+646/+743 m/s of margin" that had made them defects. They
  still break up with 2.7–2.9 km/s aboard. The honest count was "four closed, two reclassified",
  and the reclassification was wrong.

This wave stopped relying on the narrative: the `BEYOND_CAPABILITY` rule is now **enforced by a
test** (`every BEYOND_CAPABILITY entry satisfies the rule it is filed under`), which flies each
key and fails unless the flight ends out of propellant or the plan's own `ascentMargin` is below
`ASCENT_MARGIN_REQUIRED`. Four rows failed it — the two relabelled Vulcan rows plus
`ariane64/iss/90` and `pslvxl/iss/90` — and all four are back in `KNOWN_GUIDANCE_FAILURES`,
which is why the number is four and not zero. The other two tables remain statements about
vehicles and payloads rather than about steering.

The acceptance gate itself is **independent of the simulation** (`tests/fleet-harness.ts`). It
checks that the simulation emitted `evt.targetOrbit`, and then re-derives the orbital elements
from the raw state vector and compares them with the target against bands defined in the test
file. An earlier revision imported the library's own `orbitResiduals` and its tolerances, which
made the fleet matrix verify only that the simulation agreed with itself; the bands are
numerically identical today, and that is the point — when they stop being, the gate says so.

What the fleet delivers, at the three payload fractions the acceptance test uses
(`+` = orbit reached inside the acceptance band, `-` = excluded — four of these are guidance
defects rather than limits: Vulcan's two 90 % rows, Ariane 64 `iss` 90 % and PSLV-XL `iss` 90 %,
listed under "Guidance defects" below — `n/a` = range safety,
`—` = no such preset for this vehicle):

| vehicle | leo 25/50/90 % | iss 25/50/90 % | sso 25/50/90 % | gto 25/50/90 % |
| --- | --- | --- | --- | --- |
| Soyuz-2.1a | - - - | - - - | n/a | — |
| Soyuz-2.1b / Fregat-M | + + - | + + - | n/a | + + + |
| Proton-M / Briz-M | + - - | + - - | n/a | + + + |
| Angara-A5 / Briz-M | + - - | — | + - - | + + + |
| Falcon 9 Block 5 | + + - | + + - | n/a | + + - |
| Falcon Heavy | + + - | + + - | n/a | + + - |
| Atlas V 551 | + + + | + + + | n/a | + + + |
| Vulcan Centaur VC4 | + + - | + + - | n/a | + + + |
| Ariane 64 | + + + | + + - | n/a | + + + |
| Vega-C | + + + | + + + | n/a | — |
| Long March 2D | - - - | - - - | - - - | — |
| Long March 3B/E | + + + | + + + | n/a | + + + |
| H-IIA 202 (historical) | + + + | + + + | n/a | + + + |
| Long March 5 | + + + | + + + | n/a | + + + |
| H3-22 | + + + | + + + | n/a | + + + |
| PSLV-XL | + + - | + + - | n/a | + - - |
| Electron | + + + | + + + | + + + | — |
| Starship (Super Heavy) | + + + | + + + | n/a | + + - |

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

### The kick-stage fleet on its real missions

The acceptance matrix flies percentages of a published rating with an inert dispenser, which
is the right instrument for a regression gate and the wrong one for the question "does the app
fly the mission a user would pick". This table is the second instrument: each launcher that
carries a kick stage, with the spacecraft it really launches, on the mission it really flies,
default guidance, no auto-tune. "verdict" is `missionVerdict`'s level for the same
configuration, and the column that matters is whether it agrees with the outcome.

| mission | outcome | final orbit | insertion | verdict |
| --- | --- | --- | --- | --- |
| Proton-M/Briz-M · crew 7.15 t → ISS, Baikonur | insertion abandoned T+1 292 s | — | T+570 s | **fail** ✓ |
| Proton-M/Briz-M · comsat 5.5 t → GTO, Baikonur | target orbit T+21 519 s | 254 × 35 731 km | T+570 s | warn ✓ |
| Angara-A5/Briz-M · crew 7.15 t → 500 km, Plesetsk | target orbit T+8 394 s | 498 × 498 km | T+1 051 s | warn ✓ |
| Angara-A5/Briz-M · comsat 5 t → GTO, Plesetsk | target orbit T+57 235 s | 251 × 35 720 km | T+754 s | warn ✓ |
| Soyuz-2.1b/Fregat · earth-obs 2.2 t → SSO, Vostochny | target orbit T+3 626 s | 597 × 597 km | T+827 s | ok ✓ |
| Soyuz-2.1b/Fregat · earth-obs 2.2 t → SSO, Plesetsk | target orbit T+3 624 s | 597 × 597 km | T+825 s | ok ✓ |
| Soyuz-2.1b/Fregat · crew 7.15 t → ISS, Baikonur | break-up T+962 s (no insertion reported) | — | — | **fail** ✓ |
| Long March 3B/E · comsat 5.5 t → GTO, Xichang | target orbit T+25 797 s | 252 × 35 723 km | T+674 s | warn ✓ |
| Ariane 64 · comsat 5.5 t → GTO, Kourou | target orbit T+7 210 s | 245 × 35 716 km | T+834 s | ok ✓ |
| Vega-C · cubesats 300 kg → 500 km, Kourou | target orbit T+3 052 s | 498 × 498 km | T+319 s | ok ✓ |
| PSLV-XL · earth-obs 1.75 t → 500 km, Sriharikota | target orbit T+3 451 s | 497 × 497 km | T+703 s | ok ✓ |

Three rows that belong to the sweep are not in the table because the launch would not be
licensed rather than not flown: Soyuz-2.1b to a sun-synchronous orbit **from Baikonur**,
Vega-C to one from Kourou and PSLV-XL to one from Sriharikota all need an azimuth outside
their site's range-safety window (§6b, range safety), and the verdict says so — Kourou and
Sriharikota reach the plane in reality with a dogleg, which this model does not fly. The model will
still fly the plane if asked — the geometry is reachable — which is why Soyuz-2.1b's
sun-synchronous mission is flown here from the two sites that can licence it.

Two rows are failures and both are capability limits with the shortfall measured on the plan:

- **Proton-M/Briz-M with the 7.15 t crew ship** is the case this section was written for. Its
  three stages carry a 22.17 t Briz-M as well as the payload and cut off at 210 × −1 733 km
  with 7 094 m/s — 690 m/s short of the 7 784 m/s a 200 km circular orbit needs — and a
  19.6 kN Briz-M under 29.3 t (0.64 m/s²) takes ~1 080 s to close that, over which
  `kickStageSink` puts the drop at ~250 km against the 60 km the ascent can give it.
  `ascentMargin` is −243 m/s. A 300-point sweep of the tuning grid (kick 1.5–8°, turn rate
  0.25–0.5 °/s, pitch limit 20–35°, loft 0–150 km) finds 24 combinations that reach the
  target, all at kick angles of 6–8° with turn rates the fleet does not use and none at or
  near the shipped programme: with the DEFAULT guidance this combination does not fly. The
  boundary is measured either side — 5.75 t delivers 412 × 412 km, 7.15 t does not — and it
  is sharp because the sink is cubic in the shortfall.
- **Soyuz-2.1b/Fregat with the same crew ship** is the same shape one step down: the Blok I
  under a Fregat and 7.15 t is 470 m/s short (`ascentMargin` −470), the ascent sags and the
  stack breaks up at T+962 s — *before* any insertion is announced, which is the honest end
  of an underpowered ascent and is what `soyuz21b/leo/90` and `soyuz21b/iss/90` already do at
  7.8 t. The 7.15 t crew ship is a Soyuz-2.1a mission, not a 2.1b one.

### Why a combination is excluded

Which table a case lands in follows a rule that is checked against the flight, not an opinion
about the vehicle. The margin quoted below is `MissionPlan.ascentMargin` — (ideal Δv of the
stages that fly the ascent) − (perigee speed of the mission's orbit + `ASCENT_LOSS_ALLOWANCE` of
losses − the Earth-rotation credit) — i.e. the same arithmetic `planMission` uses to decide what
to aim at, read off the plan rather than recomputed. *The numeric value of that constant is
deliberately not repeated in this section: it lives in `src/physics/mission.ts`, it has moved
once already (1 450 → 1 750) and left a page of shortfalls behind that had been measured against
the old one, and the figures below are only valid for the value that ships. If it moves again,
every margin in this section has to be re-measured with it.*

| table | rule | entries |
| --- | --- | --- |
| range safety (`SITE_GEOMETRY`) | no heading inside the site's window reaches the plane — the launch would not be licensed, or (Tanegashima, Sriharikota, Kourou) only with a dogleg the model does not fly | 45 |
| `BEYOND_CAPABILITY` | the flight ends with the tanks empty, **or** the ascent stages' margin is below `ASCENT_MARGIN_REQUIRED` (+150 m/s) | 22 |
| `ARCHITECTURE` | propellant left, orbit reachable, but nothing in the stack can use it | 13 |
| `KNOWN_GUIDANCE_FAILURES` | **defects**: Δv available, a stage able to spend it, orbit still lost or missed | 4 |

The first and the last two rows of that table are enforced by tests, not by review:
`azimuthAllowedFor agrees with the planned azimuth` regenerates the range-safety table from the
site data, `every BEYOND_CAPABILITY entry satisfies the rule it is filed under` re-flies every
capability claim and checks it against the plan's own margin, and `known guidance failures still
fail` re-flies every defect so the list cannot rot in the other direction.

Several `BEYOND_CAPABILITY` flights end in a break-up rather than an empty tank, and that is
the classification working rather than failing: an underpowered stack flying a closed-loop
ascent flattens, sinks back into dense air and passes its max-Q placard. It cannot hold the
gravity turn, because the q·α placard leaves it only ~4° of steering authority at 27 kPa. The
model now throttles back on the structural placard (§3), which is what a real vehicle does
about it, but load relief does not turn a Δv shortfall into performance. The discriminator is
the margin, not the event that ends the flight.

**Range safety.** One rule, in `inclinationCorridor`: a site can fly an inclination when a
launch heading inside its azimuth window reaches it — the northbound solution or its southbound
mirror (180° − A), whichever the window holds — and the inclination is not below the site's
declared minimum, with the same 0.25° `CORRIDOR_SLACK` on every edge. The window's reach is
computed from the window in closed form (`corridorReach`), `azimuthAllowedFor` is the boolean
form of the same verdict, and `planMission` / `launchWindows` fly the heading the window
licenses (`launchDescendingFor`). Until this wave `azimuthAllowedFor` tested only the
northbound heading below 75°, so it rejected Tanegashima's own `leo`/`gto` presets and the ISS
plane from Wallops, Wenchang, Tanegashima, Jiuquan and Sriharikota (known bug F01) while the
corridor accepted them — and the planner flew that northbound heading, outside the window, in
48 fleet rows. They now leave south-east, as those ranges really do; re-flown, all 48 keep their
acceptance outcome and the 38 accepted ones land within 1.5 km of their previous orbit.

The `sso` preset needs a retrograde heading, roughly 341–349° or 191–199°. Of the sites the
fleet flies from, Plesetsk (330–90°), Jiuquan and Mahia (90–200°) have a window that contains
one of the two; from Baikonur, Cape Canaveral, Wenchang, Starbase and Xichang both point over
populated land or another country. Tanegashima, Sriharikota and Kourou are different in kind:
their ranges reach sun-synchronous planes with a **dogleg** — a yaw during the ascent — which
this model does not fly (the guidance holds a single plane, and a post-insertion plane change is
no stand-in: Sriharikota's window stops 11° short of the plane). They stay excluded, with the
heading and the corridor's measured reach in the reason. The table is generated from the site
data through `azimuthAllowedFor`, and a test asserts that the exclusions are exactly the sites
the function rules out, so the matrix cannot be shrunk by quietly dropping a case. Angara-A5
and Electron are therefore the only vehicles with `sso` acceptance cases.

**Beyond capability.** Two systematic gaps explain most of it:

1. **Published LEO figures are quoted for a ~200 km reference orbit**, while the `leo` preset
   is 500 km and `sso` 600 km. The extra orbital energy costs 150–300 m/s, i.e. 4–8 % of the
   injected mass, so 90 % of the quoted figure is out of reach for the launchers whose margin
   is thin (Falcon 9, Falcon Heavy, Atlas V, Ariane 64, PSLV-XL, Starship to GTO).
2. **Proton-M, Angara-A5 and Soyuz-2.1b always carry their kick stage in this model.** The
   published 23 t / 24.5 t / 8.2 t LEO figures are for the configuration without it; a Briz-M
   is 22 t of stage sitting on top, and the measured shortfalls are 548–1206 m/s (Proton-M),
   735–1533 m/s (Angara-A5) and 512–557 m/s (Soyuz-2.1b). Those flights do not end gracefully out
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
into 197 × 200 km at T+536 s and the crew ship circularises at 417.9 × 418.0 km / 51.64° at
T+3 397 s.

**Guidance defects.** Four, all one family: a heavy upper stage lighting at a fraction of a g
under a near-maximum payload, a closed-loop ascent that cannot hold the loft it was given, and a
break-up on the max-Q placard on the way back down — with the ideal Δv for the mission on paper
and kilometres per second still in the tanks.

| case | ends | Δv left | ascent margin |
| --- | --- | --- | --- |
| Vulcan Centaur → 500 km, 90 % | break-up T+963 s at −3 429 × 331 km | 2 657 m/s | +1 865 m/s |
| Vulcan Centaur → ISS plane, 90 % | break-up T+915 s at −3 857 × 318 km | 2 860 m/s | +1 701 m/s |
| Ariane 64 → ISS plane, 90 % | break-up T+941 s at −2 219 × 92 km | 1 704 m/s | +1 855 m/s |
| PSLV-XL → ISS plane, 90 % | break-up T+569 s at −2 910 × 232 km | 968 m/s | +315 m/s |

The Vulcan pair were in this table two waves ago with "+646/+743 m/s of margin" recorded against
them; the last wave moved them into `BEYOND_CAPABILITY` and deleted that line. Ariane 64 and
PSLV-XL had been in `BEYOND_CAPABILITY` all along. Nothing about the flights changed — the test
that now checks the rule did. Two of the four have an explicit counter-example that rules out a
capability explanation on its own: `ariane64/leo/90` carries the *same* 19.44 t to a *higher*
500 km orbit and is accepted at 497 × 497 km, and `pslvxl/leo/90` with the same payload runs its
tanks dry instead of breaking up, which is the capability limit and is filed as one.

Closing them needs an ascent profile that trades the loft for horizontal speed at staging: the
previous wave's 48-point sweep over kick angle, turn rate, loft and pitch limit is on the record
and reproduces — no point in that grid recovers any of them. That is a wave of guidance work,
and it is scope rather than a statement about these vehicles.

The three entries the table carried last wave — an apoapsis 16–2 650 km above a **circular**
target that the retrograde trim did not close, with propellant and a restartable stage
available — really are closed:

| case | was | is |
| --- | --- | --- |
| Atlas V 551 → ISS plane, 50 % | 420 × 480 km, three burns over 4.4 h, ends off target with 2.1 km/s left | 420.1 × 421.8 km, `evt.targetOrbit` at T+7 617 s |
| Vulcan Centaur → ISS plane, 50 % | 440 × 3 073 km, five burns, still in `coast` at the ten-hour horizon | 419.1 × 421.9 km, `evt.targetOrbit` at T+8 707 s |
| H-IIA 202 → ISS plane, 90 % | 421 × 436 km, three burns over 3.9 h, off target with 430 m/s left | 420.5 × 421.8 km, `evt.targetOrbit` at T+5 792 s |

### Retrograde apsis trims

All three had the same signature and the same single cause, and both are worth recording because
the symptom pointed somewhere else.

**Symptom.** A trim ignited, reported `evt.burnComplete` one second later, and the apsis it was
aimed at had not moved. The re-planner scheduled the same burn a revolution later, three to five
times, so the flight spent four hours of mission time — a hung coast, from the user's side —
flying manoeuvres that did nothing.

**Cause 1: the burn was flown at the wrong apsis.** `planBurns` marks a burn for a *circular*
target `atU: 'asap'`, meaning "any point on a circular parking orbit will do". That is true when
the apoapsis is being *raised* and false when it is being lowered, which has to happen at the
periapsis. `scheduleNextBurn` set `tGo = timeToPeriapsis` correctly and then an `'asap'`
override threw it away and re-armed the burn 30 s later — at the apoapsis the previous shaping
burn had just finished at. The slew guard below it added a whole period, which preserves the
orbital position, so the trim ignited at the apoapsis every time, dug the periapsis out instead
of lowering the apoapsis, and the "never dig the periapsis out" safety in `checkBurn` stopped it
on its first or second step.

**Cause 2: the stack was pointed at the wrong attitude.** The coast pre-orient evaluated
`desiredVelocity` at the vehicle's *current* position. For a shaping burn that function means
"make the radius I am at now the apoapsis", so minutes short of the apoapsis it describes a
different orbit and returns a nearly **radial** correction. Measured on Vulcan: 240 s out the
pre-orient asked for 166 m/s at 96° to the velocity vector and the stack turned there; at
ignition the burn wanted 9 m/s at 178°, which a 3 °/s slew cannot cover in the 0.7 s such a trim
lasts. The impulse went in almost radially and moved the periapsis 6 km instead of 25. The
pre-orient now propagates to the ignition point first — attitude is an inertial quantity, so the
direction computed there is the one to hold now.

The audit's suggested cause for this family — `desiredVelocity` clamping rP = min(rP, rm) and so
being unable to produce a retrograde target — was **not** it. That clamp only bites when the
target periapsis is above the current radius, which cannot happen at the point a lowering burn
is flown from; instrumented per step, `desiredVelocity` returned the correct retrograde target
throughout. The function is unchanged.

**And a stop, so this cannot cost hours again.** A burn that ignites and finishes inside two
seconds cannot have moved the apsis it was aimed at, so one of those now spends the whole
stall allowance in `replanRemainingBurns` rather than half of it, and the mission ends. A flat
"stop after one non-improving cycle" was tried and rejected with a measurement: the equatorial
GTO case in `tests/ascent.test.ts` needs one cycle that does not improve the summed residual and
then converges, and the flat rule leaves it at 28 754 × 35 667 km.

The four "perigee 60–126 km high" transfer-orbit entries that used to sit here are also gone:
the perigee test in `planBurns` is two-sided, so an insertion that overshoots is trimmed at
apogee instead of being declared on target (see "Insertion accuracy"). Vulcan's two 90 %
break-ups were moved to `BEYOND_CAPABILITY` at the same time; the measured Δv does **not** put
them there — `ascentMargin` is +1 865 and +1 701 m/s and they break up with 2.7–2.9 km/s aboard
— and they are back in the defect table, together with `ariane64/iss/90` and `pslvxl/iss/90`,
which the new enforcement test found in the same condition.

### Insertion accuracy

Circular targets are met to a few kilometres. On a transfer (GTO) target the apogee lands within
a few tens of kilometres of 35 786 km and the plane within 0.1°, and the perigee — which the
ascent does not control, because cut-off happens when the osculating apoapsis reaches its target
wherever the vehicle happens to be — lands within −13 … +11 km of the 250 km reference across
every GTO row in the matrix.

That spread is a third of what it was, and the fix was to stop one-sided testing rather than to
tune anything. `planBurns` only ever planned a perigee burn when the perigee was *low*
(`target.perigee > hIns + tol`), so an insertion that overshot was never corrected and was then
declared on target by a band wide enough to contain it: perigees up to 95 km high. The test is
two-sided now — the same burn at apogee with a retrograde impulse, which `desiredVelocity` could
always fly — and the four "perigee 60–126 km high" entries that used to sit in the defect table
are gone.

The acceptance band for a transfer perigee is **max(15 km, 5 %), two-sided**: 2.7× tighter than
the max(40 km, 15 %) it replaces, which had been widened until the measurement fitted inside it.
It is still looser than reality — Arianespace and ULA both quote GTO perigee dispersions of a
few kilometres — so it is a recorded limitation of the model, not a target. It stays wider than
the circular band for a reason that is physical rather than statistical: a trim at a GTO apogee
moves the perigee by about a kilometre per 0.1 m/s, so correcting 12 km is a burn the stack can
easily make but costs a whole 10½-hour revolution to reach, and the planner's band is set so it
does not spend one on an error the mission does not care about.

A **single-shot** ascent, which has no later burn to correct anything, is held to a quarter of
the acceptance band rather than to the band itself. Asking "is the orbit already the mission's?"
at the full band shuts the engine down the first instant the orbit is barely legal: the perigee
is still climbing at cut-off, so it stops at the low edge. Measured, that put Soyuz-2.1a's
flagship 200 km direct insertion at 190.4 × 200.1 km — inside a 10 km band by 395 m, 4 % of the
tolerance, while four places in the tree quoted it as "198 × 201". At a quarter of the band the
same flight cuts off at 197.2 × 200.4 km, and the test asserts the *margin* rather than leaving
it to be discovered.

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
tan Δλ = sin u cos i / cos u, where λ_site is taken 200 s after liftoff rather than at liftoff:
the plane of the orbit is fixed by the velocity vector, and for the first minutes that vector is
mostly vertical, so the plane is only really set once the horizontal speed dominates — by which
time the site has rotated 0.84° east. Measured against this model, the RAAN actually reached
from Baikonur, the Cape, Vostochny and Mahia sat 0.63–0.94° east of the RAAN computed at the
liftoff longitude; with the offset the residual is under 0.11°. Launch windows solve θ(t) for
the time when this RAAN equals the target RAAN (and therefore open 200 s earlier): the ISS plane
(reference RAAN at an epoch plus J2 regression, about −5°/day, so windows come ~20 min earlier
each day) or a sun-synchronous local time of the ascending node
(RAAN = α_sun + 15°/h × (LTAN − 12 h)).

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
drag until impact (reported with latitude/longitude) or, if they end up above a 120 km perigee,
kept as orbital debris. Each flies with its own blunt-body drag coefficient (§3), not the
slender ascent curve. Recovered boosters fly the entry and landing burns described above and
report a landing when they touch down below 12 m/s.

Orbital debris is Kepler-propagated for speed, but the classification has to stay true: the
perigee is re-checked every step and an object that can no longer stay up is handed back to the
drag path. The spent launcher stage released at payload separation takes its outcome from the
orbit it is actually left in rather than being stamped `orbit` unconditionally — off a marginal
ascent that stamp propagated it on a Kepler arc straight through the planet, for ever.

**Ground reference.** Impact, altitude-above-ground and debris touchdown use the launch site's
elevation only near the pad and the landing zone, fading to the mean sphere over the first few
hundred kilometres downrange. Using the pad's elevation as the ground everywhere had a booster
1500 km downrange of Vostochny landing 250 m up, and it grows with the inland Chinese sites
(Jiuquan ~1000 m, Taiyuan ~1500 m).

## 9. Orbit propagation

After the final burn the spacecraft is propagated numerically with J2 and upper-atmosphere
drag (ballistic area ≈ 1 % of mass in m²). Nodal precession and slow decay are visible on the
orbital map and in the RAAN/altitude readouts under high time warp.

## 10. Assumptions and limitations

- Spherical Earth for altitude and gravity (J2 only as a perturbation); no terrain. Site
  elevation is honoured near the pad only (§8).
- Point-mass vehicle: attitude is a commanded direction with a slew-rate limit, no rotational
  dynamics, no aerodynamic lift, no wind.
- One generic drag curve for every launcher and one blunt-body curve for every piece of debris;
  solid-motor thrust profiles are a normalised linear ramp about the published mean.
- Guidance is a compact explicit law, not the flight software of any real vehicle; timelines
  and margins are representative, not authoritative.
- Vehicle data are public figures rounded to about ±10 %; the LEO payload of a
  Briz-M/Fregat configuration is lower than the published three-stage figure.
- The ISS reference plane is an approximate epoch value, not a live TLE.
- **Known gaps, measured and recorded rather than tuned away:**
  - GTO perigee accuracy is −13 … +11 km where a real injection holds a few kilometres
    ("Insertion accuracy").
  - Single-burn direct insertion into a *circular* orbit closes only up to ~250 km; above
    `DIRECT_INSERTION_CEILING` (300 km) a stack with no restart ends off target (§6). The real
    vehicles fly a kick stage or a vernier phase this model does not have. Audit item B17 asked
    for direct insertion at `target.perigee` "when target.perigee ≲ 800 km and a real
    Δv/reachability check passes", and for the `soyuz21a` exclusions to be deleted; what is
    implemented is the ceiling at 300 km, so **B17 is partially closed** — the single-burn
    cut-off works and is tested, the 300–800 km band does not close and all six `soyuz21a`
    rows plus Long March 2D's seven remain `ARCHITECTURE` exclusions. `insertionAltitudeFor`
    also still takes only the target and not the `VehicleSpec`, as the audit asked.
  - The fairing placard is one physical criterion (1135 W/m²) plus, for four vehicles, the
    jettison **time** their operator publishes (§4). Neither is a model of the real decision,
    which is a heating placard evaluated against a specific fairing's thermal design.
  - Falcon 9's modelled max-Q peak is ~20 s early and ~25 % low, because its throttle bucket
    starts at 22 kPa (§6a).
  - Exo-atmospheric coasts are pure Kepler (no J2, no drag) while the orbital phase is RK4 + J2.
  - Four engines' quoted sea-level Isp is 2.4–6.9 % away from what their thrust and mass flow
    deliver; the model flies the delivered value (§4).

## Glossary (EN / RU / TH)

This table is the source of truth for `src/i18n/ru.ts` and `src/i18n/th.ts`, and
`tests/i18n.test.ts` is the mechanical half of the same contract (parity, placeholders,
script coverage, live call sites). When a term below and a dictionary value disagree, the
dictionary is wrong. Three conventions hold across the whole Thai column: Arabic numerals
only (the app never prints Thai digits), spaces at clause boundaries only — never between a
preposition and the noun it governs, which is why the verdict strings read `สู่{class}` —
and one Thai word per English term, never two spellings of the same idea in two panels.

Proper names are **not** translated in any language: vehicle names (Soyuz-2.1a, Falcon 9),
engine names (RD-0110, Merlin 1D), company names and orbit acronyms printed as chips
(GTO, SSO, GLONASS). Unit symbols keep their SI spelling; only the Thai and Russian words
around them change.

### Vehicle and structure

| English | Русский | ไทย |
| --- | --- | --- |
| launch vehicle | ракета-носитель | จรวดนำส่ง |
| payload | полезная нагрузка | น้ำหนักบรรทุก |
| spacecraft | космический аппарат | ยานอวกาศ |
| stage | ступень | ท่อนขับ / ท่อน |
| upper stage (restartable) | разгонный блок | ท่อนขับดัน |
| kick stage | разгонный блок (малой тяги) | ท่อนเสริมแรงส่ง |
| booster / strap-on | боковой блок, ускоритель | บูสเตอร์ |
| core stage | центральный блок | ท่อนแกนกลาง |
| solid rocket motor | твердотопливный двигатель | มอเตอร์เชื้อเพลิงแข็ง |
| fairing (payload fairing) | головной обтекатель | ครอบจมูกจรวด |
| fairing jettison | сброс головного обтекателя | สลัดครอบจมูกจรวด |
| launch site / cosmodrome | космодром | ฐานปล่อยจรวด |
| launch pad | стартовый стол | ฐานปล่อย |
| spent stage / debris | отработавшая ступень | ท่อนที่ใช้แล้ว |

### Propulsion

| English | Русский | ไทย |
| --- | --- | --- |
| thrust | тяга | แรงขับ |
| throttle (setting, %) | режим двигателя | ระดับแรงขับ |
| specific impulse | удельный импульс | แรงดลจำเพาะ |
| thrust-to-weight ratio | тяговооружённость | อัตราส่วนแรงขับต่อน้ำหนัก |
| propellant | топливо, компоненты топлива | เชื้อเพลิง |
| hypergolic | высококипящие компоненты | ไฮเปอร์โกลิก |
| kerolox | кислородно-керосиновый | น้ำมันก๊าด-ออกซิเจนเหลว |
| methalox | метан-кислородный | มีเทน-ออกซิเจนเหลว |
| ignition | запуск двигателей | จุดเครื่องยนต์ |
| cutoff (MECO / SECO) | выключение, отсечка тяги | ดับเครื่องยนต์ |
| burnout | окончание работы (выгорание — для РДТТ) | เชื้อเพลิงหมด |
| staging | разделение ступеней | การแยกท่อนขับ |
| hot staging | горячее разделение | การแยกท่อนแบบร้อน |
| air-lit booster | ускоритель с запуском в полёте | บูสเตอร์จุดกลางอากาศ |
| expander bleed cycle | безгенераторная схема с отводом газа | วัฏจักรเอ็กซ์แพนเดอร์บลีด |

### Flight and aerodynamics

| English | Русский | ไทย |
| --- | --- | --- |
| liftoff | отрыв, старт | ทะยานขึ้น / ยกตัว |
| ascent (powered) | выведение, активный участок | ช่วงไต่ขึ้นด้วยกำลังขับ |
| vertical rise | вертикальный участок | ไต่ขึ้นแนวดิ่ง |
| pitch-over / kick | начальный разворот | เอียงหัว |
| pitch programme | программа тангажа | โปรแกรมพิตช์ |
| pitch command | команда тангажа | คำสั่งมุมพิตช์ |
| gravity turn | гравитационный разворот | การเลี้ยวด้วยแรงโน้มถ่วง |
| angle of attack | угол атаки | มุมปะทะ |
| attitude slew rate | угловая скорость разворота | อัตราหมุนท่าทาง |
| closed-loop guidance | наведение по замкнутому контуру | การนำวิถีวงรอบปิด |
| dynamic pressure | скоростной напор | ความดันพลวัต |
| max-Q | максимальный скоростной напор | ความดันพลวัตสูงสุด |
| drag | аэродинамическое сопротивление | แรงต้านอากาศ |
| g-load | перегрузка | ความเร่ง (แรง g) |
| downrange distance | дальность | ระยะตามแนวการบิน |
| ballistic coast | пассивный участок | ช่วงเคลื่อนที่อิสระ |
| re-entry | вход в атмосферу | กลับเข้าสู่ชั้นบรรยากาศ |

### Orbits and geometry

| English | Русский | ไทย |
| --- | --- | --- |
| perigee / apogee | перигей / апогей | จุดใกล้โลกที่สุด / จุดไกลโลกที่สุด |
| periapsis / apoapsis | перицентр / апоцентр | จุดใกล้ที่สุด / จุดไกลที่สุด |
| altitude | высота | ความสูง |
| inclination | наклонение | ความเอียงของวงโคจร |
| RAAN | долгота восходящего узла | ลองจิจูดของโหนดขึ้น |
| argument of perigee | аргумент перигея | อาร์กิวเมนต์ของจุดใกล้โลกที่สุด |
| ascending node | восходящий узел | โหนดขึ้น |
| LTAN | местное время восходящего узла | เวลาท้องถิ่นของโหนดขึ้น |
| orbital period | период обращения | คาบการโคจร |
| parking orbit | опорная орбита | วงโคจรจอด |
| insertion orbit | орбита выведения | วงโคจรที่แทรกเข้า |
| circularisation | скругление орбиты | การปรับวงโคจรให้เป็นวงกลม |
| plane change | поворот плоскости орбиты | การเปลี่ยนระนาบวงโคจร |
| orbital burn / manoeuvre | орбитальный манёвр | การจุดเครื่องยนต์ในวงโคจร |
| delta-v (Δv) | характеристическая скорость | เดลตา-วี (Δv) |
| delta-v budget | баланс характеристической скорости | งบประมาณ Δv |
| gravity / drag / steering loss | гравитационные / аэродинамические потери, потери на управление | การสูญเสียจากแรงโน้มถ่วง / แรงต้าน / การบังคับทิศ |
| LEO | низкая околоземная орбита (НОО) | วงโคจรต่ำของโลก |
| sun-synchronous orbit | солнечно-синхронная орбита (ССО) | วงโคจรสัมพันธ์ดวงอาทิตย์ |
| GTO / GEO | геопереходная / геостационарная орбита (ГПО / ГСО) | วงโคจรถ่ายโอน / วงโคจรค้างฟ้า |
| geosynchronous | геосинхронная | สมวาระโลก |
| Molniya orbit | орбита «Молния» | วงโคจรมอลนิยา |
| critical inclination | критическое наклонение | ความเอียงวิกฤต |
| ground track | трасса полёта | เส้นทางบนพื้นโลก |
| launch azimuth | азимут пуска | มุมทิศการปล่อย |
| launch window | стартовое окно | หน้าต่างการปล่อย |
| nodal precession (J2) | прецессия узла | การส่ายของโหนด |

### Operations, failures and the replay

| English | Русский | ไทย |
| --- | --- | --- |
| telemetry | телеметрия | โทรมาตร |
| mission elapsed time | полётное время | เวลาที่ผ่านไปของภารกิจ |
| countdown | обратный отсчёт | นับถอยหลัง |
| mission sequencing | циклограмма выведения | ลำดับขั้นของภารกิจ |
| range safety | система безопасности полёта (СБП) | ระบบความปลอดภัยการบิน |
| flight termination | прекращение полёта (АПР) | การยุติการบิน |
| structural break-up | разрушение конструкции | โครงสร้างแตกสลาย |
| engine out | отказ двигателя | เครื่องยนต์ดับ |
| premature separation | преждевременное отделение | แยกท่อนก่อนกำหนด |
| booster recovery / landing burn | возврат ступени, посадочный импульс | การกู้คืนบูสเตอร์ / จุดเครื่องยนต์ลงจอด |
| replay / scrub | повтор / перемотка | ย้อนดูบันทึก / เลื่อนเวลา |
| time warp | ускорение времени | เร่งเวลา |

### Terms that are easy to get wrong

* **throttle** is *режим двигателя* / *ระดับแรงขับ*, never *дроссель* (a valve) or
  *คันเร่ง* (a car's accelerator pedal). The readout is a percentage of rated thrust.
* **range safety** is the flight-safety system, so Thai takes *ระบบความปลอดภัยการบิน*;
  *สนามยิง* is a ground firing range and is wrong here.
* **flight termination** is *АПР / подрыв по команде СБП*, not *АВД*, which is an
  emergency engine shutdown and a different event entirely.
* **ballistic coast** is *เคลื่อนที่อิสระ* in Thai; *ร่อน* means gliding on air and
  cannot happen above the atmosphere.
* **fairing** has exactly one Thai form, *ครอบจมูกจรวด* — not *ฝาครอบ*, *ครอบดาวเทียม*
  or *ครอบหัวจรวด*, which appeared in four different panels before wave 3.
* **burnout** of a liquid strap-on is *окончание работы*; *выгорание* belongs to solid
  motors and reads wrong on Angara or Long March 3B.
* **semi-synchronous** (GPS) is *полусинхронная*, not *полусуточная 12-часовая*, which
  says the same thing twice.
* **telemetry** is *โทรมาตร* throughout; the transliteration *เทเลเมทรี* is not used in
  the panel headings, so it must not be used in the title either.
* **Δv** is *характеристическая скорость* in running Russian prose but stays as the
  symbol Δv in labels and in both Thai columns, because the HUD prints the symbol.
