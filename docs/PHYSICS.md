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

## 2a. Six-DOF flight

Every vehicle flies by default as a **rigid body**: the state adds a quaternion attitude and
three body rotation rates to **r** and **v**, and the thrust no longer points where guidance
asks — guidance asks an autopilot, and the autopilot moves real actuators. Each chamber of each
engine sits where its bell is drawn and swings within its own travel (two planes, or one plane
tangential to the stage for the Soyuz, Proton and Long March patterns) at a finite rate and lag;
verniers and attitude thrusters add their own forces; a stage that cannot roll with its engines
rolls with thrusters. Mass, centre of gravity and the full inertia tensor are rebuilt from the
stages' structure, tanks and grains as the propellant drains, and the aerodynamic forces and
moments come from per-configuration tables (§3). The data and their sources are in
[SIXDOF-VEHICLE-DATA.md](SIXDOF-VEHICLE-DATA.md), the acceptance gates and results in
[SIXDOF-ACCEPTANCE.md](SIXDOF-ACCEPTANCE.md).

The autopilot runs a fixed 0.01 s control clock; the rigid body is integrated with RK4 inside
it. Two rules keep that affordable and honest over a mission that lasts a day:

- **Held coast.** In vacuum, engines off, the autopilot settled on its prograde target and
  turning with it, nothing disturbs the body and the turn costs no gas: the stretch is flown in
  the coast's own long steps, the attitude carried round with the velocity direction at the lag
  the autopilot keeps. Control ticks resume for an engine, air, a manual command, a rate off the
  target's, and 30 s before a burn's pre-orientation.
- **Steering the thrusters can live with.** Above the atmosphere the ascent command swings no
  faster than 1 °/s, and in the last 4 s of an orbital burn it is held: the direction of a
  vanishing Δv swings, and a gimballed stage that followed it cut off turning faster than its
  attitude thrusters could stop before the next burn. A burn waits for its attitude as long as
  those thrusters need, not a fixed four minutes.

A six-DOF coast is flown under J2, and there the osculating ellipse of one instant is not the
orbit: its apsides swing several kilometres round a revolution (a 500 km circle reads anywhere
from 501 to 515 km of apoapsis). So a six-DOF orbit is **judged on its physical apsides** — the
lowest and highest altitude of the next revolution under J2 — when the mission decides it is
on target, in the event that says so, on the result panel and in the acceptance tests. The
planner aims at the same orbit: a coast that arrives above or below the target corrects its
physical apex before circularising there; the last circularisation to a circular target, when
no plane change is left, is shot so that the middle of that revolution's lowest and highest
altitude is the target (a J2 orbit through the burn point rises and falls by kilometres
whatever its speed — Electron's 600 km sun-synchronous orbit ran 599–624 km after a conic
circularisation, 595–602 km after an aimed one); and a mission about to end with its physical
apsides outside the band flies up to two such corrections. An aimed burn is flown along the
velocity direction at the point it is centred on, held still through the burn. Point-mass
coasts are Kepler, where the two are the same.

The point-mass model below remains selectable in the setup, and the fleet acceptance matrix
(§6b) of the regular test suite flies it; the same matrix flown in six-DOF is recorded in
[SIXDOF-ACCEPTANCE.md](SIXDOF-ACCEPTANCE.md).

## 2b. The flexible vehicle: slosh, bending and the bending filter (roadmap P05)

Three options of the six-DOF model, each off by default, set in the Engineer mode's setup (and
`configure_mission`'s `flex` object): **propellant slosh**, the **first bending mode** with the
shell loads it carries, and the **bending filter** — a notch on the autopilot's pitch and yaw
torque with an autopilot held below the bending frequency. Off, the flight is the rigid one bit
for bit (tests/rigid-flex-golden.test.ts hashes three flights recorded before the options
existed). The code is src/physics/rigid/slosh.ts, bending.ts, notch.ts and flex.ts.

**Slosh.** Each liquid tank of the mass model (§2a: a solid cylinder of radius a = 0.9 R filled
to depth h, settled at the bottom of its tank) has its first lateral mode as the spring-mass
analogue of NASA SP-106 (Abramson, 1966, ch. 6) and Dodge (SwRI, 2000, ch. 3):

    ω₁² = (ξ₁ g / a) tanh(ξ₁ h / a)            ξ₁ = 1.8412, the first zero of J₁′
    m₁  = m_L · 2 tanh(ξ₁ h / a) / (ξ₁ (ξ₁² − 1) h / a)
    H₁  = h − (2a / ξ₁) tanh(ξ₁ h / 2a)         (height of m₁ above the tank bottom)

g here is the axial acceleration under thrust. m₁ moves across the tank on a spring k₁ = m₁ω₁²
and a damper (ζ = 3 %, a tank with ring baffles, whose damping NASA SP-8031 puts at a few per
cent), and rides along it with the tank on a constraint force; the rest of the liquid stays with the tank where it keeps the liquid's centre
of mass. H₁ follows from the potential-flow pressure on the wall and the bottom of a tank moved
sideways: the moment about the bottom is

    M = −m_L Ẍ (h/2 + a²/4h) − Σₙ mₙ ẍₙ [h − a (1 − 2 sech(ξₙh/a)) / (ξₙ tanh(ξₙh/a))]

and a spring-mass whose axial carrying force acts where the mass is reproduces it when each
mass sits at Hₙ; that axial force at a displaced mass turns the tank exactly as the equivalent
pendulum (length g/ω₁², hinged H₁ + g/ω₁² above the bottom) does. The Ẍ term checks the whole
construction: a liquid held at lateral acceleration tilts its surface by Ẍ/g and moves its
centre by a²/4h per unit tilt, and Σₙ mₙLₙ = m_L a²/4h because Σ 2/(ξₙ²(ξₙ² − 1)) = 1/4 — the
first mode carries 98.7 % of it (tests/rigid-flex.test.ts). The liquid sloshes only under at
least 1 m/s² of thrust; in a coast it is carried with its tank (liquid in weightlessness is
beyond the model) and a new burn starts it from rest. A solid grain does not slosh, and a film
shallower than a twentieth of the radius is carried with its tank.

**Coupling.** The body frame's origin stays the stack's centre of mass with every liquid at
rest, the point the rigid model flies. With the slosh masses taken out, the rest of the stack is
a rigid body B (mass m_B, centre b, inertia I_B about b), and with a the non-gravitational
acceleration of the origin and α = ω̇:

    B:  m_B(a + α×b + ω×(ω×b)) = F − Σ(fᵢ + Nᵢeᵢ)
        I_B α + ω×I_Bω = M − b×F − Σ(ρᵢ − b)×(fᵢ + Nᵢeᵢ)
    mᵢ: mᵢ(a + α×ρᵢ + ω×(ω×ρᵢ) + 2ω×ṡᵢ + s̈ᵢ + φ(xᵢ)η̈) = fᵢ + Nᵢeᵢ

where fᵢ is the spring and damper, eᵢ the tank's axis and Nᵢ its carrying force. The axial row of
each tank's equation gives Nᵢ linear in (a, α), and the body's six equations are solved exactly
every time the integrator evaluates them: the exchange of momentum between the liquid and the
stack is exact within the analogue (the test holds momentum, angular momentum and energy of a
free stage to 10⁻⁷, and the frequency of a slosh mass against the free stage to the
reduced-mass formula to nine digits). Gravity acts alike on every part and drops out.

**Bending.** The first lateral mode of the attached stack, in both planes, from a free-free
Euler–Bernoulli beam of 40 cubic elements built on the mass model itself. Every component is a
uniform line mass (a cylinder, a shell and a grain annulus all satisfy L² = 12(I_t − I_x/2)/m,
which gives each one's length from its inertia); the sloshing part of each liquid is left out,
since it moves on its own. Stiffness is the stage and fairing shells, EI = E π r³ t with the
wall thickness t of a shell carrying the stage's whole structural mass at the specific modulus
of aluminium alloys and steel, E/ρ ≈ 26 MN·m/kg (70 GPa, 2 700 kg/m³; the two differ by under
5 %); strap-ons add their own EI, a payload is stiff, and a gap between shells takes its
neighbour's EI. These are estimates (E), not modal surveys: at liftoff they give 1.1 Hz for
Starship, 1.6 Hz for Falcon 9, 3.2 Hz for Soyuz-2.1a and 6.9 Hz for Electron (the table is in
[SIXDOF-VEHICLE-DATA.md](SIXDOF-VEHICLE-DATA.md)), the band where large launchers' first modes
are reported (1–3 Hz; NASA SP-8036). The mode is recomputed every 0.5 s of flight and at every
separation, normalised to a largest deflection of 1, and couples through the three standard
paths (SP-8036; Greensite, *Analysis and Design of Space Vehicle Flight Control Systems*, 1970):

- *generalised force*: Q = Σ φ(xₖ) F_k,lat from every engine, attitude thruster, the aerodynamic
  normal force at its centre of pressure and the slosh reactions at their tanks;
- *the thrust follows the structure*: each chamber's thrust turns with the local slope φ′(x)η at
  its mount, and each tank's axis with the slope at the tank. Together with the axial
  compression each section carries (the mass forward of it, accelerated: a geometric softening
  a_x ∫ m_fwd φ′² dx) the follower thrust nearly cancels — Beal (AIAA J. 3(3), 1965) — and the
  mode's frequency under thrust stays within 1 % of the structure's for every vehicle;
- *the IMU reads the bent structure*: θ = θ_rigid + φ′(x_s)η and ω = ω_rigid + φ′(x_s)η̇ at its
  station x_s, and the autopilot steers by those readings. The IMU sits in the instrument bay at
  the forward end of the uppermost launcher stage (as Saturn V's Instrument Unit and Soyuz's
  приборный отсек do); the Engineer mode can move it anywhere along the stack.

A mode faster than 1/h of the integration step (16 Hz at 0.01 s) is carried quasi-statically,
η = Q/K: RK4 cannot follow it (its stability limit is 2.8) and nothing the 100 Hz autopilot and
its 0.1 s actuators do reaches it. The short upper stacks (Blok I with Fregat, 45 Hz; H3's
second stage, 75 Hz) are such modes. Structural damping is 0.5 %, SP-8036's design value.

**Shell loads.** With bending, every control step sums the loads aft of each section — every
point force, and the inertia of every element, rigid and elastic — into the axial force N and
the bending moment M it carries, and the stress |N|/A + |M|/Z against an effective allowable of
250 MPa for the shell's wall area A and section modulus Z (from the same wall). The stack breaks
up (`evt.bendingFailure`) where that ratio passes 1. The allowable is an estimate between the
buckling of an unpressurised shell with its knock-down factor and the strength of aluminium-
lithium alloys; nominal flights load their shells to 5–35 % of it.

**The bending filter.** Falcon 9's rigid autopilot crosses over near 0.5 Hz, a third of its
first bending mode; with the IMU in the instrument bay the bending path's loop gain is about one
even off resonance, and at resonance it is some 40 times the structure's own damping. Flown
without a filter the mode diverges (an effective damping ratio of −0.22) and the stack breaks up
seven seconds after liftoff. The filter is the classical pair:

- a second-order **notch** on the pitch and yaw torque the autopilot asks for,
  H(s) = (s² + 2ζ_z ω_n s + ω_n²)/(s² + 2ζ_p ω_n s + ω_n²), ζ_z = 0.02 and ζ_p = 0.3 (23 dB deep),
  centred on the mode's frequency under the current thrust — what the flight software predicts,
  as real launchers schedule their filters on time of flight — and discretised by the Tustin
  transform prewarped at ω_n on the 100 Hz control clock (Franklin, Powell & Workman, *Digital
  Control of Dynamic Systems*, §6.3); it steps aside above 80 % of the Nyquist frequency;
- an **autopilot held below the mode**: the rate gain at most ω_b/6 and the attitude gain half
  that, so the loop gain stays below one where the notch does not reach. Classical launchers
  crossed over five to ten times below their first mode (Saturn V near 0.15–0.2 Hz); the rigid
  autopilot here, tuned without flexibility, runs three times faster.

The aerodynamic feed-forward of the autopilot is not filtered. With the filter on, Falcon 9's
bending peaks at 6 cm in the liftoff transient and is no larger through max-q; every vehicle
reaches its orbit with its shells under half their allowable ([SIXDOF-ACCEPTANCE.md](SIXDOF-ACCEPTANCE.md)). The Engineer mode tunes all of
it: the notch's depth, width and centre (detuned, it no longer stabilises the mode), the
bandwidth ratio, the two damping ratios and the IMU station.

**What the baffles are for.** Ariane 6's upper stage carries some 11 t of sloshing oxygen on a
26 t stack at 0.3 Hz, close to the autopilot's bandwidth. With the damping of a nearly bare tank
(1 %) the loop fights the liquid with its cold-gas thrusters until the 60 kg of gas is gone,
five minutes into the Vinci burn; the liquid's swirl then drags the stack into an 8 °/s roll
the single gimballed engine cannot stop, and the circularisation burn never aligns — the way
Falcon 1's second flight was lost in 2007 (a liquid-oxygen slosh the thrust vector control
fed, then a roll past its roll thrusters). At 3 % the same flight reaches its orbit with the
liquid within 25 cm. The Engineer mode's slosh damping reproduces either.

**Not modelled.** Higher bending modes, torsion and longitudinal modes (POGO); aeroelastic
coupling of the bending with the airflow; the inertia of a gimballing engine ("tail wags dog");
slosh in weightlessness, rotary slosh and higher slosh modes; the reduced pitch inertia of a
liquid (Dodge's I₀, under 0.2 % of a stack's); slosh and bending of a separated stage, and of
the vehicle during a held coast (the motion restarts from rest when control resumes). The 3-D
view draws the bending mode at 25 times its size.

## 2c. Notation: ISO 1151 and ГОСТ 20058-80 (roadmap U07)

The app writes flight-dynamics quantities in one of two notations: **ISO 1151** (parts 1 and 2,
with ISO 80000 for the Mach number) or **ГОСТ 20058-80**. By default the interface language
decides — Russian reads ГОСТ, English and Thai read ISO — and the Engineer mode's setup can fix
either. The notation decides symbols, body axes and signs everywhere the app shows a rate or an
angle: the telemetry card, the charts, the onboard view, the 6-DOF controls (their manual rate
commands too), the event log, the result screen, the CSV export's rate and angle columns, and the
table in *Physics and sources*. Code: src/ui/notation.ts.

**Body axes.** Both standards put x along the vehicle to the nose. ISO puts y to the right and z
to the belly (down in level flight); ГОСТ puts y in the plane of symmetry to the top and z to the
right. The simulator keeps its own axes: x the nose, and y, z the two lateral axes its attitude
reference holds — during ascent y lies in the trajectory plane towards the belly (downrange on
the pad) and z to the left of the heading. The standards' axes are fixed relabellings of those:

    ISO   (x, y, z) = (x,  −z,  y)       p = ωx,   q = −ωz,   r = ωy
    ГОСТ  (x, y, z) = (x,  −y,  −z)      ωx = ωx,  ωy = −ωy,  ωz = −ωz

so the pitch-over after liftoff is a negative (nose-down) q in ISO and a negative ωz in ГОСТ, and
a nose-right yaw is +r in ISO but −ωy in ГОСТ (tests/notation.test.ts flies Falcon 9 and checks
both, and that ISO y points to the right of the flight path and ГОСТ y above it).

| Quantity | ISO 1151 | ГОСТ 20058-80 | Definition and sign |
|---|---|---|---|
| Body axis x | x | x | Along the vehicle, to the nose |
| Body axis y | y | y | ISO: to the right; ГОСТ: in the plane of symmetry, to the top |
| Body axis z | z | z | ISO: to the belly; ГОСТ: to the right |
| Roll rate | p | ω<sub>x</sub> | About x; positive right side down |
| Pitch rate | q | ω<sub>z</sub> | Positive nose up |
| Yaw rate | r | ω<sub>y</sub> | ISO: about z, positive nose right; ГОСТ: about y, positive nose left |
| Angle of attack | α | α | In the plane of symmetry; positive with the air from below |
| Sideslip angle | β | β | Out of the plane of symmetry; positive with the air from the right |
| Pitch angle | Θ | ϑ | x above the horizontal plane positive |
| Roll angle | Φ | γ | Positive right side down |
| Yaw angle | Ψ | ψ | ISO: clockwise from north (nose right); ГОСТ: from x<sub>g</sub>, anticlockwise seen from above (nose left) |
| Flight-path angle | γ | θ | Velocity above the horizontal plane positive |
| Altitude | h | H | |
| Airspeed | V | V | |
| Vertical speed | ḣ | V<sub>y</sub> | |
| Dynamic pressure | q̄ | q | ½ρV² |
| Mach number | Ma | M | V/a |
| Load factor | n | n | Non-gravitational acceleration over g₀ |
| Mass | m | m | |
| Thrust | F | P | |
| Rolling moment | L | M<sub>x</sub> | About x; positive rolls the right side down |
| Pitching moment | M | M<sub>z</sub> | Positive nose up |
| Yawing moment | N | M<sub>y</sub> | ISO: about z, positive nose right; ГОСТ: about y, positive nose left |

The same letter can mean different things across the two: γ is the flight-path angle in ISO
and the roll angle in ГОСТ, θ the pitch angle in ISO (Θ) and the flight-path angle in ГОСТ, q the
pitch rate in ISO and the dynamic pressure in ГОСТ.

**What stays in the simulator's axes.** The recorded six-DOF telemetry, the CSV's rigid columns
(`omega_body_*`, `command_roll/pitch/yaw_rad_s` = its x, y, z, and `angle_of_attack_rad` /
`sideslip_rad`, its angles in its x–z and x–y planes) and `read_flight_state`'s `rigid` object keep
the simulator's own axes, so a recording reads the same in any notation; the CSV adds
`iso_*` or `gost_*` columns, and `read_flight_state` a `flightDynamics` object with both. The
WebMCP `set_flight_control` takes its rates in ISO axes (p, q, r) whatever the interface shows,
and the `evt.controlCommand` event records them so.

Before U07 the 6-DOF controls called the simulator's y rate "pitch" and z rate "yaw", and the
event log's α was its x–z angle; with the stack's roll reference those are the yaw rate, the
pitch rate and the sideslip. They are now the standards'.

## 2d. The attitude loop and its inspector (roadmap G03)

The six-DOF autopilot (src/physics/rigid/control.ts, run by `RigidRuntime.step` at the 0.01 s
control clock) is a cascade, per body axis:

1. **Attitude error.** The target attitude — the guidance direction for the nose, with the roll
   reference — against the attitude the IMU reads, as a rotation vector **e** in body axes.
2. **Attitude loop.** ω_d = K_θ·e, but never faster than the rate from which the axis can still
   stop on the target: with the angular-acceleration limit a and the actuators' response delay
   τ, d = ω·τ + ω²/2a gives the **stopping-distance** rate; then the **rate limit** (8°/s in
   roll, 5°/s in pitch and yaw).
3. **Rate loop.** ε = K_ω·(ω_d − ω̂), limited to what the actuators can deliver: a **scheduled
   angular-acceleration limit**, 35 % of the authority left once the air's moment and the
   gyroscopic term are paid for, over the inertia (at most 5°/s² in roll, 3°/s² in pitch and
   yaw). K_θ = 1.5 s⁻¹ and K_ω = 3 s⁻¹ on every axis; with P05's bending filter K_ω ≤ ω_b/6 and
   K_θ half that.
4. **Moment.** M = I·ε + ω × Iω; with P05, through the notch.
5. **Actuators.** The gimbals are asked for M − M_aero; whatever they cannot give goes to the
   attitude thrusters; whatever the thrusters cannot give is left unmet (the telemetry's
   `saturated` flag, past 1 N·m and 5 % of M).

Upstream, the ascent's **load relief** turns the guidance direction towards the relative wind
when the angle to it would load the structure past its limit (above 500 Pa of dynamic
pressure). Manual rates (the 6-DOF panel) enter at step 3 with the rate limit.

Every control step of the flown vehicle records what the loop decided (`attitudeLoop` in the
six-DOF telemetry, src/physics/rigid/loop.ts): target, error, rate command, the rates the
controller read, angular acceleration, the moment asked for (and after the notch), the air's,
the engines' and the thrusters' moments, the gains and limits in force, which limiters held
which axis, gimbal travel and thruster duty used, and the load relief. It is a record only —
the loop never reads it — so a flight is the same bit for bit with or without it
(tests/attitude-loop.test.ts, and the P05 fingerprints with the record left out). The record
also checks the cascade's own arithmetic: wherever no limit acts, ω_d = K_θ·e and
ε = K_ω·(ω_d − ω̂) hold to 12 digits over a Falcon 9 ascent.

The Engineer mode's **attitude-loop inspector** (a button in the 6-DOF panel) draws the cascade
as a block diagram with the values of the step on screen, in the notation in force (§2c; the
moments are L, M, N in ISO and M<sub>x</sub>, M<sub>z</sub>, M<sub>y</sub> in ГОСТ), outlines a
block held by a limit, and charts the last 10, 30 or 120 s: attitude error; rate command,
measured and IMU-read rate; moment asked, delivered and the air's; gimbal and thruster use. It
reads the recording, so it works in replay as in live flight. The CSV adds the same record in
the notation's axes (`iso_loop_*` or `gost_loop_*`, `loop_limiters`), and `read_flight_state`
a summary in ISO axes (`flightDynamics.attitudeLoop`).

What it shows on Falcon 9 to LEO in the crosswind scenario:

- From T+20 s to T+85 s, max-q included, the attitude error stays under 0.25° while the gimbals
  carry the air's pitching moment (about 300 kN·m at T+60 s); the attitude thrusters are at
  full duty about half the time, filling in behind the gimbals' lag.
- From T+89 s guidance pitches the command away from the airflow (0.7° to 11° in four seconds)
  faster than the stack follows: the pitch error grows to 4.6° with the pitch rate held by its
  stopping distance, and the air's pitching moment reaches 2.4 MN·m at T+96 s.
- At T+127.3 s the dynamic pressure falls through 500 Pa and the load relief, which had been
  holding the command 24° nearer the air than guidance asked (39° asked, 15° allowed), switches
  off in one step: the attitude error jumps from 0.4° to 24° and the stack swings back at its
  5°/s rate limit for five seconds.
- After staging the upper stage's roll authority is so small (an ε limit of 0.02°/s²) that its
  roll rate is held by the stopping distance.

## 2e. The live equations panel (roadmap E02)

The telemetry panel's **Equations** view writes out the equations the simulation is solving,
in the notation in force (§2c: F or P for thrust, D or X for drag, C_D or c_x, q̄ or q, Ma or M,
Λ for ГОСТ's attitude quaternion), with the values of the instant on screen substituted:

- **Explore and Engineer mode**: Newton's second law m**a** = **F** + **F**_A + m**g** (each
  force and the load factor); dynamic pressure and Mach number; drag and lift (in six-DOF the
  axial and normal coefficients of the vehicle's tables, split along and across the airflow);
  the rocket equation for the burning stage, with the Δv of every stage the HUD shows; the
  ascent's Δv budget, ideal less gravity, drag and steering losses against the speed gained
  since liftoff.
- **Engineer mode adds** thrust against ambient pressure, F = F_vac − p_a·A_e (the running
  engines at their levels, with A_e = (F_vac − F_SL)/p₀, which is how every engine's thrust is
  computed); vis-viva and the apsides; gravity with J2; α and β from the body-axis airflow in
  the standard's axes (ISO α = arctan(w/u), β = arcsin(v/V); ГОСТ α = −arctan(V_y/V_x),
  β = arcsin(V_z/V)); Euler's equations I·ω̇ + ω × Iω = M per axis; quaternion kinematics
  q̇ = ½ q ⊗ ω; and the attitude autopilot's two gains on the pitch axis (§2d).

**Where the numbers come from.** Each flight step records its equation terms
(`SimState.eom`, src/physics/eom.ts, carried into every recorded frame but not into the
telemetry): the specific forces of the engines (with the attitude thrusters), the air and
gravity at the step start — in six-DOF those the rigid body was integrated with, in the
point-mass model those of its force law — the step's mean acceleration (v_end − v_start)/Δt,
the running engines' vacuum thrust and exit area, the air data, the Δv book at the step end, and
in six-DOF the body rates and attitude at both ends. Every value is from one step, so a replayed
frame balances as a live one does. The record reads the flight and never feeds back: the P05
golden fingerprints are unchanged.

**The balance checks** compare an independent left-hand side with the right: the measured mean
acceleration with the sum of the forces over the mass; the speed gained since liftoff
(v_end − ω_E (R_E + h) cos φ of the pad) with the Δv book; I·ω̇ + ω × Iω with ω̇ measured over the
step against the moments of engines, thrusters and air (judged against the size of those
moments, which nearly cancel through max-q); the step's change of attitude with ½ q ⊗ ω at its
middle; the thrust flown with T_vac − p_a·A_e; gravity used with the formula; the rate command
with K_θ·e where no limiter holds it. A check passes under 1 %. Over a Falcon 9 ascent to LEO
(tests/equations.test.ts): Newton's law balances to 0.4 % at worst in six-DOF (the step's mean
against its start, worst through staging and the slews) and 0.14 % in point mass; the Δv book
within 0.1 % in six-DOF; the thrust formula exactly; Euler's equations to about 0.1–0.2 % of the
moments; quaternion kinematics to 10⁻⁴ or better.

## 2f. The loop, linearised: frequency response, margins and step response (roadmap G04)

Every half second the flown vehicle's runtime linearises its attitude loop about the state at
the start of that control step, one plane at a time (src/physics/rigid/linear.ts). The planes are roll (body x), pitch (the rotation about the
simulator's z, which swings the nose along +y) and yaw (about y); each plane's state is

- the rotation angle and rate about the axis;
- in pitch and yaw, the lateral drift velocity along the axis the rotation swings the nose to;
- with P05, each tank's slosh displacement and rate in that plane, and the first bending mode's
  coordinate and rate.

**The plant** is the flight's own equations of motion — the same derivative function the RK4
integrator calls, with the aerodynamics, gravity, thrust, slosh and bending — differentiated
numerically: one-sided differences about the step's state, the angle and rate perturbed by
10⁻⁴ rad and rad/s, the drift by 10⁻⁴ of the speed, slosh by 1 mm and bending by 10⁻⁴. The input
is the moment the actuators deliver about the axis: for engines, B comes from moving every
engine the way the gimbal allocation does for ±ΔM (so a gimbal's side force on the drift and its
excitation of the bending and slosh are in it); for the attitude thrusters, a pure moment. The
outputs are what the IMU reads (angle and rate, plus the bending slope at its station) and the
air's moment about the axis, which the autopilot feeds forward.

**The loop** is closed as the autopilot runs it: sampled every T = 0.01 s with the moment held
for the step (zero-order hold, exact through e^{AT}), the gimbals' first-order lag τ (the
slowest engine's time constant), the demand M_d = I·K_ω(K_θ(θ_c − θ̂) − ω̂) through P05's notch
(its biquad, exactly as flown) and the gimbals asked for M_d − (1 + x)·M_aero, where x is the
**feed-forward error** the inspector sets (0 is exact; −100 % is no feed-forward). The loop gain
L(e^{jωT}) is broken at the filtered demand, the feed-forward inside the plant; it is evaluated
on 240 logarithmic frequencies from 0.01 rad/s to the Nyquist frequency, each an O(n²) solve on
the plant in Hessenberg form.

**Margins.** The phase margin is 180° + ∠L at the first 0 dB crossover ω_c; the gain margin is
the smallest −|L| in dB where the phase crosses −180° above ω_c (at ω_g); the gain-reduction
margin is the same below ω_c (a conditionally stable loop: the aerodynamically unstable airframe
needs a minimum gain), within 40 dB. Stability is not read off the Bode plot but decided by the
closed loop's eigenvalues (balanced, Hessenberg, shifted QR after EISPACK's hqr): the loop is
stable when no mode grows faster than 0.001 s⁻¹. The lateral drift is neutral — nothing in the
attitude loop restores it; guidance steers it out — so a mode at exactly zero is not counted.
The loop's open-loop unstable poles are counted as well: with any, the Bode margins are read with
Nyquist's count. On Falcon 9 there are two, a slow drift oscillation (0.006 s⁻¹, a 170 s period)
left by the feed-forward's lag; they do not change the margins' meaning at the crossover.

**The step response** is the closed loop's response to a 1° attitude step over 10 s: body and
IMU angle, moment asked and delivered, rise time (10–90 %), overshoot, settling time (2 %).

**Left out** (the inspector says so): the rate, angular-acceleration and gimbal-travel limits (a
linear loop has none — a step large enough to meet them is slower in flight), the attitude
thrusters while the engines steer, coupling between the planes, the load relief and guidance
(the command is held), and what changes over the linearisation's second (mass, thrust, dynamic
pressure). The record is shared by the telemetry samples of that second — never copied, never
in a recorded frame — and leaves the golden fingerprints alone: every flight is the same bit
for bit with it.

**Checks** (tests/linear-loop.test.ts):

- A PD autopilot on a double integrator: the phase margin equals the textbook
  arctan(ω_c/K_θ) − arctan(τω_c) − ω_cT/2 to 0.3°, and the gain margin is where the closed loop's
  eigenvalues leave the unit circle (±3 %). Without the feed-forward, an unstable airframe
  (M_α/I = 0.5 s⁻²) goes unstable where the gain falls below M_α/(I·K_ωK_θ).
- On Falcon 9's own models, the Bode gain margin is where the eigenvalues cross (±5 %), and the
  Hessenberg loop gain equals a dense complex solve to 10⁻⁹.
- **Against the nonlinear flight.** Flown with P05's bending and no notch, the model at T+1 s
  says the loop is unstable at 7.70 rad/s, growing at 2.86 s⁻¹ (a damping ratio of −0.35). The
  flight's bending coordinate oscillates at 7.66 rad/s over T+1–2.5 s and its envelope grows at
  2.4 s⁻¹ from T+0.5 s to T+2 s, before the gimbals saturate (−0.30); the stack breaks up at
  T+7.1 s. (§2b's −0.22 was a first estimate from the loop gain at resonance.)

**What it shows on Falcon 9** (crosswind, T+62 s, max-q):

- Rigid, pitch: stable, phase margin 46° at 3.1 rad/s (0.49 Hz), gain margin 35.5 dB at
  41.6 rad/s; a 1° step rises in 0.84 s with 6 % overshoot and settles in 2.5 s.
- **The margins hardly move over the flight.** The feed-forward takes the air's moment out, and
  the controller's I·K_ω cancels the inertia, so the loop is the gains' double integrator behind
  the gimbals' lag and the hold: a phase margin of 46.2° at 3.1 rad/s on the gimbals from
  lift-off to orbit (the textbook value above, with τ = 0.1 s), 64.6° on the thrusters (roll after
  staging, no lag). Between main-engine cut-off and separation nothing steers the stack, and the
  inspector says there is no loop rather than an unstable one.
- **The feed-forward at max-q.** Falcon 9's aerodynamic instability, M_α/I ≈ 0.24 s⁻², is small
  against the loop's K_ωK_θ = 4.5 s⁻². Without the feed-forward (−100 %) the phase margin
  rises to 52° — the feed-forward also cancels the air's pitch damping — while a gain-reduction
  margin of −24.5 dB appears and the attitude settles off the command; at +50 % the phase margin
  falls to 43°.
- With all of P05 (slosh, bending, the notch and the slower flexible-vehicle gains): stable,
  phase margin 45° at 2.2 rad/s, but a gain margin of only 3.0 dB at 8.3 rad/s — between the
  slosh (4.8 rad/s, 0.76 Hz) and the notched bending mode (11.9 rad/s, 1.89 Hz at T+62 s) —
  against the customary 6 dB; a gain-reduction margin of −32 dB. A 1° step rises in 1.35 s with
  4–5 % overshoot, the IMU showing the bending.
- Bending without the notch: unstable from lift-off, as above, the phase margin −153°.

**Cost.** Linearising the three planes takes 17 evaluations of the equations of motion (37 with
P05's states) and the margins 720 loop-gain points and six small eigenvalue problems. Every half
second, with the G03 record, over the first 150 s: +6 % CPU on Falcon 9 and +27 % on Proton-M
with P05 (eight sloshing tanks, 21 states a plane); over a whole flight to orbit, within the
run-to-run noise on Falcon 9. A 25-minute Falcon 9 flight keeps some 940 models, 1.7 MB (4.2 MB
with P05); Proton-M with P05, 3.7 MB over its first 150 s.

## 2g. Tuning the autopilot, and flight tests (roadmap E04)

**What a mission can set** (`DynamicsConfig.control`, src/physics/rigid/control-config.ts; the
Engineer mode's *Attitude autopilot* section and `configure_mission.control`): for the roll
channel and for the pitch–yaw pair, K_θ and K_ω (1/s), the rate limit (°/s) and the ceiling of the
scheduled angular-acceleration limit (°/s², §2d); and the weight w of the aerodynamic
feed-forward, 0–1 — the gimbals are asked for M_d − w·M_aero. Nothing set, the runtime flies its
own defaults (K_θ = 1.5, K_ω = 3 s⁻¹, 8 and 5 °/s, 5 and 3 °/s², w = 1) bit for bit; the same
values set explicitly fly the same bits on a rigid vehicle. Pitch–yaw gains set by hand are flown
as set: P05's flexible-vehicle cap (K_ω ≤ ω_b/ratio, §2b) applies to the default gains only, so
that a tuning flies what its analysis showed. Debris keep the defaults.

**Trials on the linearised loop.** The plant G04 records (§2f) does not depend on the gains or
the feed-forward weight: its responses h_θ, h_ω and h_F per delivered moment are computed once
per model on the Bode grid, and a trial's loop gain is arithmetic on them,
L = I·K_ω(K_θ h_θ + h_ω)·N(z) / (1 + w(1 + x) h_F). The inspector's *Tuning* tab draws the
trial's |L|, 1° step and phase margin over the flight against the flown loop's, with both
margins and the closed loop's stability (its eigenvalues) at the instant on screen.

**Auto-tune** (src/physics/rigid/tuning.ts) searches K_ω over 0.2–20 s⁻¹ (36 steps) and the ratio
K_θ/K_ω over 0.25–0.5 — the rate loop at least twice as fast as the attitude loop, which gives the
rigid double integrator a damping ratio ζ = ½√(K_ω/K_θ) of 0.7 to 1 — for the highest K_θ (the
attitude loop's bandwidth) whose phase margin, gain margin and gain-reduction margin meet the
targets (45° and 6 dB by default) over the channel's planes of 16 models sampled from the flight
so far (or the one on screen), each candidate checked for closed-loop stability; then refines it.
The answer is checked on every model of the flight; a model that fails joins the sample and the
search runs again (a slosh resonance can sit at one instant only). When nothing meets the
targets it says so and gives the stable gains nearest to them.

What it finds on Falcon 9 (crosswind, over the first 55 s):

- Rigid: K_θ 1.61, K_ω 3.39 s⁻¹ — the default autopilot (1.5, 3) is already at the 45° target;
  the gimbals' 0.1 s lag sets the limit.
- With all of P05: PM ≥ 45° and GM ≥ 6 dB cannot both be met by the two gains over the flight —
  at T+33.5 s a slosh mode sits where lower gains lose gain margin and higher ones lose it at the
  bending mode (no PD gains are stable at K_θ 0.5, K_ω 1.0 there). At PM ≥ 40°, GM ≥ 4 dB it
  gives K_θ 0.74, K_ω 1.49 s⁻¹ (the flexible autopilot flies 0.91–0.99, 1.83–1.97); **flown again
  with them, the linearised loop keeps GM ≥ 4.1 dB and PM ≥ 48.8° over the ascent** (2.3 dB and
  40.3° with the defaults), and the flight reaches its orbit (tests/control-tuning.test.ts).
- Without the feed-forward (w = 0) or at half of it, the rigid Falcon 9 still reaches orbit; a
  1 °/s pitch–yaw rate limit doubles the largest attitude error of the ascent (4.9° to 11°).

**Flight tests** (src/physics/rigid/attitude-test.ts; the *Flight test* tab and
`run_attitude_test`): a step (held 0.2–20 s) or a doublet (each half as long) of 0.1–5° is added
to the autopilot's target about one body axis — the target is rotated about its own axis, so the
autopilot sees a change of command and guidance is untouched — in a live six-DOF flight under the
autopilot. Every control step records the offset, the attitude reached along the axis as the IMU
reads it (the offset less the error left to it, less the error before the test) and which
limiter held the axis; the loop linearised at the start predicts the same response. While the test
runs the telemetry carries a stub; the sample where it ends carries the record, once — a physics
worker (F02) sends every sample across. It changes the flight, and is logged as an event.

What the tests show on Falcon 9 at T+40 s:

- Roll, 1° step: the flight follows the linear model to 0.8 % RMS of the amplitude — nothing in
  roll limits it.
- Pitch, 1° step: rise 0.95 s against 0.84 s, overshoot 0.3 % against 6.3 %: the
  angular-acceleration limit holds the axis a tenth of the time, and guidance, which steers the
  nose along the velocity, follows the velocity the offset itself bends.
- Yaw, 3° step: rise 1.4 s against 0.84 s — the limiters the linear loop leaves out hold the
  axis for part of it (the tab gives each one's share). A 1° pitch doublet with 1 s halves falls
  well behind the model after the reversal, where the error to close is twice the amplitude.
- With P05: 1.4 s against 1.3 s, the IMU's bending ripple in both.

## 2h. Inertial navigation, GNSS and a star tracker (roadmap G02)

Off by default, and off, the flight knows its true state bit for bit as before. On
(`DynamicsConfig.navigation`, the Engineer mode's *Navigation* section, `configure_mission`),
the flown vehicle carries an inertial measurement unit and flies on what its navigation
believes (src/physics/nav/).

**The IMU** (sensors.ts). Per axis, gyros and accelerometers have a turn-on bias, an in-run bias
that wanders as a first-order Gauss–Markov process (300 s), a scale-factor error and white noise
(angle and velocity random walk), drawn from the navigation's own seeded stream (it never moves
the wind's). Three grades, textbook orders of magnitude (Groves, *Principles of GNSS, Inertial,
and Multisensor Integrated Navigation Systems*, 2nd ed., ch. 4), or custom figures:

| Grade | Gyro bias | ARW | Accel. bias | VRW | Scale factors | Pad alignment |
|---|---|---|---|---|---|---|
| Navigation (ring-laser) | 0.005 °/h | 0.002 °/√h | 30 µg | 0.01 m/s/√h | 5 / 50 ppm | 0.005° |
| Tactical (fibre-optic) | 1 °/h | 0.05 °/√h | 500 µg | 0.05 m/s/√h | 100 / 300 ppm | 0.05° |
| MEMS | 30 °/h | 0.3 °/√h | 5 mg | 0.2 m/s/√h | 1000 / 2000 ppm | 0.3° |

At every control step the IMU gives the increments since the last one: the rotation Δθ from the
attitude of its own case (with P05, the bent structure's at its station) and the specific-force
velocity Δv, the true velocity change less free fall from the last state, in body axes at
mid-step — each with its errors.

**The strapdown solution** (navigation.ts) integrates them in the Earth-centred inertial frame:
q̂ ← q̂ ⊗ exp(Δθ̂), then position and velocity as free fall under the same J2 gravity (RK4, steps of
at most 0.5 s, so a long held coast is carried exactly) plus the rotated Δv̂. With perfect sensors
it follows the truth to under a millimetre per second over two minutes of thrust.

**The filter** is an error-state extended Kalman filter of 21 errors — position, velocity,
attitude (an ECI rotation, C = (I + [φ×]) Ĉ), the gyros' and accelerometers' biases and scale
factors — propagated with Φ = I + F·dt at every step (F carries the gravity gradient, −[f×],
−Ĉ on the biases and −Ĉ·diag(f), −Ĉ·diag(ω) on the scale factors) and the sensors' noise, plus a
tuning margin of velocity noise of 10⁻⁴ of the specific force per √s under thrust (vibration, the
step's discretisation, misalignment). It is corrected by scalar updates and the correction folded
into the solution:

- **GNSS**: position and velocity fixes (5 m, 0.05 m/s, 1 Hz by default), with one outage to set;
- **star tracker**: attitude (10″, 1 Hz) above 150 km and below 1 °/s of body rate.

At a staging the centre of mass the flight is tracked by moves; the vehicle knows its own
geometry, so the solution moves with it.

**Who flies on it.** The autopilot reads the navigation's attitude and bias-corrected rate (the
average over the last step) instead of the truth; ascent guidance takes its position and
velocity; the ascent's and the burns' cut-offs judge the orbit it believes in (and its thrust
axis for the tail-off); a coast points prograde by it. Air data (the relative wind for the load
relief) stay true, as an air-data system would give them; planning and steering the in-orbit
burns (src/physics/sim/burns.ts, the other session's) still read the truth.

**What it shows on Falcon 9 to LEO** (crosswind; tests/navigation.test.ts):

- Tactical grade with GNSS: position within ±3σ through staging (mean normalised error 1.7 per
  axis, 0.5 % of samples outside 3σ), under 5 m and 0.1 m/s; the orbit it believes in is the true
  one to tens of metres. Its gyro noise (0.008 °/s per axis at 100 Hz) reaches the rate loop: the
  attitude thrusters run at full duty 84 % of the first minute against 64 % on the truth.
- A GNSS outage from T+60 s to T+200 s: the error grows to about 130 m and 1.9 m/s, inside the
  filter's growing 3σ, and falls back to metres at the first fix.
- MEMS without GNSS: 12 km and 30 m/s of error by orbit; guidance cuts off on an orbit the
  navigation believes is 200 × 529 km while the true one is 202 × 511 km. The star tracker, above
  150 km, brings the attitude error from 1.6° to seconds of arc.
- Navigation grade without GNSS: 80 m and 0.6 m/s; the apoapsis 1.4 km off.

**Cost**: within the run-to-run noise (runs with navigation were not slower).

## 2i. Failures of the control system, and the FDIR (roadmap G08)

Off by default, and off, nothing fails and every flight is the one it was, bit for bit. On
(`DynamicsConfig.controlFaults`, the Engineer mode's *Control-system failures* section,
`configure_mission`, or injected live with `inject_control_fault`), the flown vehicle's control
system carries up to eight failures, each striking at its mission time — and, if given, not
before its stage flies — and an FDIR (fault detection, isolation and recovery) that can be
switched on or off to compare (src/physics/rigid/faults.ts, fault-config.ts). Until the first
failure strikes, the layer hands the runtime back the very objects it was given, so the flight
is the one without it, bit for bit.

**Sensors.** Three redundant IMUs. Each reads the body rate — the IMU case's, with P05 the bent
structure's at its station — through its failures, and integrates its own attitude from what it
reads (a strapdown unit: e_u ← e_u + (ω_u − ω)·dt, a small rotation in body axes), so a gyro
that reads wrong drifts that unit's attitude too. Failures: the rate about an axis read with the
wrong sign (*rateInverted*), frozen (*gyroStuck*), a bias jump (*gyroBias*, °/s), noise
(*gyroNoise*, 1σ °/s), and a unit that flags itself failed and puts out its diagnostic word as
attitude — a fixed 34° error — and no rate (*imuFailure*); each on units 1–3 or on all three (a
common-mode failure). With G02's navigation on, the selected units' errors enter its gyro and
accelerometer increments instead, and three more apply: an accelerometer bias jump (mg), and the
loss of GNSS or the star tracker.

**Actuators.** A nozzle stuck where it stood (*gimbalStuck*); driven to its stop in pitch or yaw,
at its own rate, whatever it is commanded (*gimbalHardover*); its rate cut and its lag stretched
by a factor (*gimbalSlow*); or wired backwards, moving against its command — with its position
sensor read backwards too, so the computer believes it and the jets do not make up for it
(*actuatorPolarity*). An RCS jet stuck on, or dead. Targets are an engine (every chamber of it)
or a jet of the stage flying when the failure strikes, or all of them.

**The flight computer.** A hang (*computerHold*, s): the nozzles and jets keep the last commands
it sent. A gain loaded with the wrong sign (*gainSign*): the control moment about that axis is
reversed.

**The FDIR**, when on:

| Monitor | Detects | Recovery |
|---|---|---|
| IMU vote | a unit's flag; a unit whose rate (0.5 °/s), attitude (2°) or acceleration (5 mg) stays off the per-axis median of three for 0.1 s | isolate it; fly the median of three, the mean of two (a disagreement between two is reported, not resolved), the one left; with none, open the loop — the nozzles held central and no feed-forward |
| Gimbal monitor | a nozzle more than max(0.5°, 10 % of its travel) off a model of the healthy actuator, fed the same commands, for 0.3 s (the model reads the position sensor, so a miswired nozzle passes) | shut that engine down if its stage can spare it — another engine still steers, and at most a quarter of the stage's engines (at least one) are out — else fly on |
| Jet monitor | a jet firing at over half duty when asked for under 5 % for 0.2 s; or silent when asked for over 20 % for 0.3 s | close it off; leave it out of the allocation |
| Watchdog | a hung computer | the backup takes over after 0.2 s |

Off, the computer reads IMU 1 alone and watches nothing. An engine shut down goes the way of an
engine-out: its share of `engineFraction` (thrust and flow alike), with the engine the FDIR named
— not the lowest-numbered — the one that stops (`StageState.shutEngines`), so the others steer on.

**Break-up.** A launcher that loses control in the air is broken up by the air: on any six-DOF
ascent (with the failures layer or without it, since G05), the attached stack is lost when q·α —
the dynamic pressure times the total angle of attack — exceeds 300 kPa·°. A re-entry, flown at a
large angle of attack on purpose, is not judged by it. The fleet's healthy ascents stay under 135 kPa·°
(Angara A5; calm and shear winds, measured over all eighteen vehicles), much of it late in the
ascent where q is small and α large.

**The accidents re-created** (tests/control-faults.test.ts; calm wind, LEO):

- **Proton-M, 2 July 2013**: the yaw-channel angular-rate sensors installed upside down. The yaw
  rate read backwards in all three units from lift-off: the vehicle breaks up at T+12.6 s, FDIR or
  not — three sensors wrong the same way outvote nothing.
- **Ariane 501, 4 June 1996**: both inertial reference systems shut down on the same software
  exception at H0+36.7 s and the on-board computer flew their diagnostic words. On Ariane 6 (the
  fleet's nearest vehicle), all three IMUs failing at T+36.7 s: without the FDIR the nozzles go to
  their stops and the vehicle breaks up at T+38.9 s (the real one at H0+39 s); with it, the loop is
  opened and the vehicle — aerodynamically unstable — breaks up at T+41.4 s.
- **Vega VV17, 17 November 2020**: two cables of the AVUM's nozzle actuators swapped at
  integration. The AVUM+ nozzle wired backwards from stage 4: at its burn the stage tumbles (up
  to 168° off its attitude), and the orbit is 242 × 500 km instead of 500 × 500 km. The gimbal
  monitor sees nothing, FDIR or not.
- **A Falcon 9 nozzle hard-over** (hypothetical) at T+60 s: without the FDIR the other eight
  engines fight it — the angle of attack reaches 28° — and the orbit misses its apoapsis by
  12 km; with it the engine is shut down at T+60.3 s and the flight is nominal on
  eight.

**Other failures on Falcon 9** (tests/probe; the FDIR off / on):

| Failure | FDIR off | FDIR on |
|---|---|---|
| Gyro bias 2 °/s in pitch, IMU 1, T+30 s | breaks up at T+38.8 s: the vehicle drifts while the computer believes it on its attitude | IMU 1 isolated at T+30.1 s; nominal |
| IMU 1 fails, T+30 s | breaks up at T+33.6 s | isolated at once; nominal |
| The same bias on IMUs 1 and 2 | breaks up at T+38.8 s | the good IMU 3 is outvoted and isolated; breaks up at T+38.8 s |
| Computer hang of 3 s, T+50 s | survives | backup at T+50.2 s |
| Pitch gain of the wrong sign, T+50 s | breaks up at T+54.9 s | the same (the backup runs the same software) |
| Every nozzle stuck, T+20 s | breaks up at T+41.3 s | the same: no engine left to steer with, none shut down |
| RCS jet 1 stuck on, T+300 s | perigee 193 km, tumbling after the burn | jet closed off at T+300.2 s; nominal |
| Every RCS jet dead, T+300 s | nominal (the engine steers) | the same; each jet left out as it fails to fire |
| Gyro noise 0.5 °/s, all units | survives | survives; one unit falsely isolated at T+98 s |

## 2j. PEG and IGM ascent guidance (roadmap G01)

Off by default, and off, every flight is the one it was, bit for bit. On
(`DynamicsConfig.explicitGuidance`, the Engineer mode's *Ascent guidance* section,
`configure_mission`), the first stage still flies its pitch program; once a later stage is lit,
or the first stage is out of the atmosphere (under 100 Pa above 70 km) with no strap-on still
burning, an explicit law steers the rest of the ascent (src/physics/explicit-guidance.ts). Both
point-mass and six-DOF flights take it.

**The target** is the insertion orbit's perigee: the radius r_T = R + h_ins, the perigee speed
of the insertion ellipse v_T = √(μ(2/r_T − 2/(r_T + r_a))), a flight-path angle of zero, in the
plane of the mission's inclination through the vehicle's position — the plane the standard law
steers into. The cut-off is still the ascent's own (src/physics/sim/ascent.ts), on the orbit
reached, so an elliptical insertion may be cut when its apoapsis arrives and its periapsis is
safe, before the law's own t_go runs out; the burns that follow set the rest.

**The stages left** (`burnProfile`): walking the stages the ascent flies (the weak final stage
left out, as the standard law leaves it), each at vacuum thrust from its mass at ignition —
a(t) = a₀/(1 − t/τ), τ = v_e/a₀ — capped at the vehicle's acceleration ceiling (a constant
acceleration while throttled), with the staging gaps as coasts. Its thrust integrals, from
t = 0 to T, stage by stage:

L = ∫a dt = −v_e ln(1 − T/τ),  J = ∫t·a dt = τL − v_e T,  H = ∫t²·a dt = τJ − v_e T²/2,

S = ∫∫a = T·L − J,  Q = ∫∫t·a = T·J − H

(constant acceleration: L = aT, J = aT²/2, H = aT³/3; a coast adds time only). t_go is the time
the profile takes to give L = |v_go|; if all of it cannot, the law hands back.

**The steering law** of both is the linear tangent: the thrust direction
i_F(t) = unit(λ + λ̇·(t − t_λ)) with t_λ = J/L, which leaves the velocity gained along λ and
moves the cut-off point by λS + λ̇(Q − S·t_λ); the turn rate
λ̇ = (r_go − λS)/(Q − S·t_λ), with r_go the position still to gain across λ, is what the
terminal altitude and plane need (bounded so it never turns the thrust more than 0.8 rad off λ;
Q − S·t_λ is negative — thrust spent early moves the cut-off further than thrust spent late).

- **PEG** (the Space Shuttle's Powered Explicit Guidance, in the predictor–corrector form of
  its Unified Powered Flight Guidance; Jaggers, AIAA 77-1051, 1977) carries the velocity to be
  gained v_go from cycle to cycle, less what the engines gave meanwhile. Each cycle: t_go and the
  integrals from |v_go|; λ = unit(v_go); r_go = r_d − (r + v·t_go + r_grav) with its downrange
  component left free (set so λ·r_go = S); λ̇; then the flight to cut-off is **integrated** — J2
  gravity and the thrust on the law, RK4 in steps of at most 2 s broken at the staging edges —
  giving the predicted r_p, v_p and the gravity displacement r_grav for the next cycle; the
  desired state is re-aimed at r_p (r_d = r_T·unit(r_p in the plane), v_d from r_d), and the
  miss corrects v_go: v_go += v_d − v_p. On engaging it iterates up to twelve times, then three
  per cycle; with under 8 s to go it flies its last solution.
- **IGM** (the Saturn V's Iterative Guidance Mode; Chandler & Smith, J. Spacecraft 4, 1967)
  solves in closed form in the terminal frame at the predicted cut-off point: the central angle
  to go from the mean horizontal speed and radius, gravity as the mean of its value now and at
  the target (−μ/r² along each radius), the velocity to be gained ΔV = V_T − v − ḡ·t_go iterated
  with t_go; the thrust along ΔV, turned by the same linear tangent terms (the Saturn's K₁…K₄)
  for the terminal altitude and plane. In its last 20 s it steers on the velocity alone (the
  "χ̃ mode"), in its last 3 s it holds.

A new solution is blended into the last one's law over a cycle (1 s by default, 0.1–4 s), and the
command passes a first-order filter of two cycles (shortened to t_go/20 as the cut-off nears,
where a lag would be flown uncorrected): steps of a few hundredths of a degree at every cycle had
kept the attitude thrusters of a Falcon 9 upper stage firing through the whole burn, and a Falcon
Heavy's spent half its gas on the ripple the blend left and could not point its last trim burn.

**The load relief, released** (the owner's choice for G01): in six-DOF flights with PEG or IGM,
once the dynamic pressure falls under 500 Pa the command is released from where the load relief
held it at 4 °/s (under the stack's own 5 °/s) and, below 100 Pa, at the vacuum ascent's
1 °/s. The standard flight releases it all at once at 500 Pa: on Falcon 9 the attitude error
jumps from 0.4° to 24° (§2d, G03). A release at 1 °/s everywhere was tried and cost 93 m/s.

**What it does** (calm air, LEO insertion 200 × 500 km; tests/explicit-guidance.test.ts and
tests/heavy/explicit-fleet-*.test.ts):

- In a vacuum ascent from 120 km at 2.5 km/s, a single stage lands in 199.6 × 200.7 km (PEG) and
  200.0 × 202.0 km (IGM) aimed at 200 × 200 km, and 399.8 × 401.1 / 399.9 × 401.7 km aimed at
  400 × 400 km, inclination within 0.002° (the test cuts off on the target's energy); IGM's own prediction of the cut-off is hundreds of
  kilometres off early in the burn and converges as it closes, PEG's is right from the start.
- Falcon 9, six-DOF: the standard flight inserts at 200 × 497 km with 5415 m/s left; PEG
  engages at T+135 s (the first stage out of the atmosphere) and inserts at 199 × 498 km with
  5440 m/s left; IGM at 200 × 497 km with 5432 m/s. The largest attitude error after the first
  minute falls from 37.5° to 5.5°.
- Falcon 9, point mass: 5458 m/s left (standard), 5463 (PEG), 5465 (IGM).
- The whole fleet on its reference missions, six-DOF in crosswind, on both laws
  (tests/heavy/explicit-fleet-*.test.ts): all 16 vehicles reach their target orbit on PEG and
  on IGM and pass the fleet's acceptance (32 of 32). On 14 the law takes over between T+95 s
  (PSLV-XL) and T+182 s (Long March 5) and flies to cut-off. On Proton-M and Angara A5, at their
  reference payloads, the stages left are short of the target when the law would take over
  (`evt.guidanceShort`, T+111 s and T+203 s), so the standard law keeps flying and still gets
  there. The Δv left at insertion differs by less than 30 m/s between the two laws on most
  vehicles and by 55 m/s on PSLV-XL (PEG ahead); on Soyuz-2.1b and Vulcan IGM leaves 260–270 m/s
  more. The flights are listed in docs/history/PARALLEL-GNC-2026-09.md, G01.

## 2k. Monte Carlo insertion accuracy (roadmap G05)

A tool, not a flight option: nothing in a single flight changes. The Engineer mode's
*Monte Carlo* window (and WebMCP's `run_monte_carlo`) flies the mission in the setup panel many
times in six-DOF (src/physics/monte-carlo.ts), each run to the end of its mission — its target
orbit, after every planned burn — and reads its orbit (perigee, apogee, inclination, and the Δv
the stack has left) at two points: **at the end of the mission**, against the target orbit, as
the apsides the next revolution flies under J2 (the fleet acceptance's measure, §2a) — the orbit
the payload is delivered to; and **at the ascent's cut-off**, the first moment the vehicle is
neither on the pad nor in the ascent and its engines' tail-off is over, against the insertion the
mission plans, osculating as the ascent's own cut-off judges it — the ascent guidance's own
accuracy. A mission whose upper stage finishes the insertion later (Electron's kick stage) cuts
off short of it on purpose; only the first point says whether it got there.

**The dispersions** (src/physics/dispersion.ts). Per stage and per strap-on group (a group's
boosters share their draw): thrust, specific impulse, propellant loaded, dry mass; for the run:
the air's density (the whole standard atmosphere scaled), a steady wind added to the mission's,
east and north, with a new phase of its gusts, and — with the inertial navigation of G02 — a new
seed for the IMU's error model, a fresh realisation of the same grade. A thrust factor keeps the
Isp, so the flow ṁ = T/(g₀ I_sp) and the burn time follow the thrust; an Isp factor keeps the
thrust. The default 1σ is the minimal set agreed with the owner — thrust 1 %, Isp 0.3 %,
propellant and dry mass 0.5 %, density 5 %, wind 5 m/s per axis — every one editable, and
switchable off.

**The draws.** Run k of a set seeded S draws from its own mulberry32 stream (seeded by a 32-bit
mix of S and k), by Box–Muller, one standard normal number z per quantity, clipped at ±3σ (a
4σ engine is a failed engine, not a dispersed one), a factor 1 + σz. All the numbers are drawn,
always in the same order, whether their quantity is on or not: switching one off moves no other,
and the three guidance laws fly the same vehicles through the same air.

**Nominal plan, dispersed flight.** The mission is planned (`planMission`, the guidance
defaults, the fairing and max-Q placards) on the nominal vehicle; the vehicle model that flies
— `VehicleModel`, and the rigid body built from it — is the dispersed one, and what the flight
computer reads of it (thrust, mass, the stages left) it reads as its sensors would. The density
factor scales the air in the six-DOF aerodynamics and in the step's dynamic pressure (and in the
point-mass drag); the wind changes the six-DOF scenario. With nothing dispersed, a flight is the
nominal one bit for bit (tests/monte-carlo.test.ts), and so is one with the attitude-loop and
equation records off, which a run flies without.

**What is read.** Per law: the runs in orbit at the end (periapsis at or above the insertion
floor less 3 km), those whose mission reached its target orbit, those lost and why; and at each
point, over the runs read there (in orbit at the end; through the cut-off at the other), the
mean, σ, extremes and bias of each element; the 3σ
ellipse of (perigee, apogee) from their sample covariance (the eigenvectors, √λ scaled by 3);
the runs lost (the vehicle broken up, or short of orbit) and why. **Which dispersion drives
it**: each element is regressed, by least squares with an intercept, on the numbers the
switched-on quantities drew; a term's share of the element's variance is b²·var(z)/var(y),
summed over the stages for each quantity, and what the fit leaves (1 − Σ shares) is *other* —
the gusts' and the IMU's realisations, which are not numbers drawn, and whatever is not linear.
The shares are shown only with three runs per number drawn.

**The runs** fly in a pool of Web Workers (all the machine's cores but one, at most 16), every
law flying run k before any flies run k + 1, so a set stopped early still compares like with
like; a run the physics throws on is a lost run, not a lost set. A six-DOF run takes about a
minute of one core here to a LEO target (Falcon 9 64 s, 41 of them to the cut-off; Soyuz-2.1b
84 s), longer when the target is reached by a Hohmann transfer (Electron to 500 km, 2–3 min).

**What it finds**: the heavy sets (tests/heavy/monte-carlo-*.test.ts) are recorded in docs/history/PARALLEL-GNC-2026-09.md, G05, when they have run.

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

In **six-DOF** flight the attitude matters, so the body also feels a normal force and a
moment, from a table built for each configuration of the vehicle (Falcon 9 and Soyuz-2.1a;
`src/physics/rigid/aero-tables.ts`, data in [SIXDOF-VEHICLE-DATA.md](SIXDOF-VEHICLE-DATA.md)).
The normal force is slender-body lift — made where the cross-section grows going down from the
nose: the fairing, a boat-tail, each strap-on's nose cone — plus viscous crossflow drag on the
whole planform, which grows with sin²α and acts near its middle (Allen & Perkins; Jorgensen).
So the centre of pressure is not a fixed point: it moves aft as the angle of attack grows and,
on Falcon 9, once the flow is supersonic. The table covers every angle from nose first to
engines first, which is what a tumbling stage or a stage flown back for landing needs: broadside,
a spent stage now meets the crossflow on its whole side (about ten times the old estimate) and a
returning Falcon stage carries the lift of its grid fins at its top. The ascent command cone uses
the same table to find the largest angle of attack whose moment the engines can trim.

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

**Start-up and shutdown transients.** No engine goes from nothing to full thrust, or back, in
one integration step. A pump-fed liquid engine reaches rated chamber pressure about a second
after ignition, while its turbopump spins up; a solid motor's igniter pressurises the grain in a
few tenths of a second. After shutdown a liquid engine tails off over a few tenths of a second
as the lines and the pump run down, and a solid motor's burn-out is the last slivers of grain
burning away over a second or two. The model flies both:

| | start-up (0 → full) | tail-off time constant τ |
|---|---|---|
| liquid | 1.0 s, smoothstep rise | 0.25 s |
| solid | 0.3 s, smoothstep rise | 1.0 s |

(`EngineSpec.startupS` / `tailoffS` override the defaults per engine.) The tail-off is an
exponential from the level the engine was running at, cut after 5τ (0.7 % left). The mass flow
follows the thrust through both transients at the engine's own Isp, and each step uses the
**exact mean** of the transient over the step, in `thrust` and in `consume` alike — so the
impulse a step delivers and the propellant it burns are the same integral whatever the step
length (tests/engine-transients.test.ts holds impulse/propellant to g₀·Isp_vac to six digits at
10, 100 and 500 ms steps).

Three consequences had to be carried through the sequencer:

- **Running dry.** The depletion sensor shuts an engine down with its tail-off's propellant
  still aboard (ṁτ(1 − e⁻⁵)), and the tail-off then burns it — a stage that runs dry ends with
  empty tanks, not with a reserve stranded in them.
- **Cutting off on purpose.** An engine shut down now still adds (F/m)·τ(1 − e⁻⁵) along its
  axis: 7–12 m/s at the 3–5 g of a typical upper stage near its cut-off, **26 m/s** for Long
  March 2D's second stage at 10 g — kilometres to tens of kilometres of apoapsis. Every cut-off decision — the ascent gates, the single-shot residual, the
  burn completion tests, the six-DOF delivered-Δv count — is therefore taken on the orbit the
  tail-off will leave behind, exactly as real cut-off logic subtracts the tail-off impulse from
  its target. The flight is not `done` until the final tail-off is over, the next burn is planned
  from the orbit that tail-off actually leaves, and a payload separates only once the stage below
  it has stopped thrusting (releasing it in the middle handed Long March 2D's 26 m/s to the spent
  stage and put the payload 117 km below its planned apoapsis).
- **Start-up on the pad and in orbit.** Liquid first stages light at T−2.5 s and are at full
  thrust by T−1.5 s; a solid first stage lifts off a few hundredths of a second after T−0, when
  its rising thrust passes the stack's weight. An orbital burn that is lit and then held at zero
  throttle until the stack is aligned spins up when the valves actually open.
- **Attitude through a tail-off (six-DOF).** The gimbals of an engine that is tailing off still
  have authority while it fades, so the attitude loop holds the attitude the engine was shut
  down in rather than following a guidance command that no longer has thrust behind it —
  following it swung a Falcon 9 stack to 1.3 °/s between MECO and separation, more than the
  returning stage's cold gas could take out (SIXDOF-ACCEPTANCE.md).

What the transients do *not* do is remove the Soyuz-2.1a nose-down pitch after booster
separation in six-DOF flight. With the strap-ons now tailing off over a second instead of losing
3.3 MN in one 10 ms step, the peak pitch rate after separation is unchanged (4.46 → 4.43 °/s):
that dip is the closed-loop pitch command (a few degrees above the horizon while the vehicle is
at 32°) being released by the aerodynamic angle limit as the dynamic pressure falls, not a thrust
step. With the per-vehicle aerodynamic tables (§3) the less unstable Soyuz is released sooner:
the pitch-down now begins at about T+89 s, before the strap-ons separate, and takes the vehicle
from 60° to 33° over twenty seconds at up to 3 °/s while the command runs down to 7°.

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
  400 m/s of steering loss, which is the difference between reaching orbit and not. g_eff in
  that expression is the mean over the burn, not its present value: the centrifugal term grows
  as the horizontal speed climbs to orbital speed, and a frozen g_eff overstated the sink of a
  stage lighting at 4–5 km/s by about a factor of two (see "Guidance defects", §6b).
- **Apoapsis ceiling.** Once the osculating apoapsis is at or above the insertion apoapsis
  there is nothing to gain from climbing, so the pitch ceiling is squeezed from pitchMax down
  to pitchMin over an "excess apoapsis" band. This is what stops the runaway that used to
  leave Falcon 9 in a 198 × 21 500 km "parking orbit". It engages **as soon as the vehicle is
  out of the atmosphere** (above ~110 km), not only within a band of the insertion altitude: a
  stage climbing from a 200 km staging altitude to a higher circular target spends minutes
  between the two, and with the old altitude gate nothing limited the apoapsis over that whole
  stretch — aimed straight at 500 × 500 km, Soyuz-2.1a ran its apoapsis out to 2 474 km while
  the periapsis chased it. It does not apply while the vehicle is descending more than 500 m/s
  short of the insertion speed (a lofted weak stage past its apex, whose apoapsis is behind it),
  nor while the stage is flying a lofted hand-off, which climbs past the insertion apoapsis on
  purpose.
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
largest remaining Δv that respects max-Q. No mission requires it. A candidate whose parking
orbit lands far from the plan is screened out, and the best survivors are then flown to the
end; when the screen rejects *every* candidate for that reason — Vulcan's Centaur V under a
heavy payload arcs over its target and inserts at about 137 × 1 200 km against a 250 × 500 km
plan whatever the kick — the best of them are flown to the end anyway and the mission decides.
The engine start-up transients (§4) were enough to push the one kick that used to pass the
screen (9°, flown almost level through the air) into a structural failure, which is how the
screen's knife edge showed.

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
  | 200 km | 198.5 × 200.9 ✓ | 197.6 × 200.3 ✓ | 197.9 × 200.2 ✓ | 150.8 × 355.2 |
  | 250 km | 220.0 × 346.8 | 240.1 × 300.9 | 247.0 × 265.2 | 140.6 × 2 415.6 |
  | 300 km | 143.5 × 894.9 | 144.1 × 874.4 | 103.8 × 729.8 (tanks dry) | 140.6 × 2 421.1 |

  This grid is **asserted**, not quoted: it is a data table in the `single-shot direct
  insertion` section of `tests/fleet-defaults.test.ts`, and `the grid behind
  DIRECT_INSERTION_CEILING` flies all eighteen cells (three payloads × three altitudes for each
  stack) and checks the closes/does-not-close verdict and both apsides to ±3 km. The copy above
  is the only other one and is a documentation convenience, kept in step with the asserted values
  rather than re-derived by hand — the Soyuz cells' perigees moved by under 1.5 km (the heaviest
  300 km cell's by 3.9 km, from 110.7 to 114.6; its apoapsis moved further, 9.2 km, from 745.3 to
  754.5) once the fairing started leaving on Soyuz's published T+157 s callout (§4) instead of
  the heating placard. The engine transients (P02) moved them again — the heaviest 300 km cell
  to 103.8 × 729.8 km, its third stage now dry before the tail-off that would have given the
  impulse back — and Long March 2D's cells moved by up to 6 km of apoapsis when Jiuquan's 41°
  flights started leaving on the heading the site's window licenses; no verdict changed, and
  both copies read the current figures.

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
  than save it. Nor does it fire when the circularisation at the apoapsis would be deeper
  than the 400 m/s (700 m/s for a stage that cannot hold altitude) `onCoreBurnout` allows
  before it trades a burn for a coast: a Centaur V under 19 t climbs past the apoapsis target
  on purpose, and cut off there it was handed a 3.4 km/s circularisation it could not fly.
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
(`+` = orbit reached inside the acceptance band, `-` = excluded as a capability or architecture
limit — no guidance defects are left, see "Guidance defects" below — `n/a` = range safety,
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
| Vulcan Centaur VC4 | + + + | + + + | n/a | + + + |
| Ariane 64 | + + + | + + + | + + + | + + + |
| Vega-C | + + + | + + + | + + + | — |
| Long March 2D | - - - | - - - | - - - | — |
| Long March 3B/E | + + + | + + + | n/a | + + + |
| H-IIA 202 (historical) | + + + | + + + | + + + | + + + |
| Long March 5 | + + + | + + + | n/a | + + + |
| H3-22 | + + + | + + + | + + + | + + + |
| PSLV-XL | + + - | + + - | n/a | + - - |
| Electron | + + + | + + + | + + + | — |
| Starship (Super Heavy) | + + + | + + + | n/a | + + - |

The largest payload the model delivers to each preset, found by bisection, against the
published figure. Bisection assumes the passing region is contiguous in payload mass, which is
not always true near the limit (Atlas V reaches GTO at 8.0 t but not at 8.9 t, so its 6.2 t
here is a lower bound, not a ceiling). The Vulcan, Ariane 64, Vega-C, H-IIA and H3 rows were
re-measured after the launch-direction and guidance changes of September 2026 (a `>` is the
top of the search, 115 % of the rating); the others date from the previous wave:

| vehicle | leo (500 km) | iss (420 km) | sso (600 km) | gto |
| --- | --- | --- | --- | --- |
| Soyuz-2.1a | — (no restart) | — | — | — |
| Soyuz-2.1b / Fregat | 5.2 t / 8.2 t | 5.1 t / 8.2 t | — | 1.1 t / 1.9 t |
| Proton-M / Briz-M | 5.8 t / 23 t | 5.8 t / 23 t | — | 1.7 t / 6.9 t |
| Angara-A5 / Briz-M | 8.3 t / 24.5 t | — | 6.9 t / 24.5 t | > 5.4 t / 5.4 t |
| Falcon 9 | 17.9 t / 22.8 t | 17.1 t / 22.8 t | — | 6.3 t / 8.3 t |
| Falcon Heavy | 45.1 t / 63.8 t | 43.1 t / 63.8 t | — | 19.3 t / 26.7 t |
| Atlas V 551 | 16.9 t / 18.9 t | 15.5 t / 18.9 t | — | ≥ 6.2 t / 8.9 t |
| Vulcan Centaur VC4 | 21.7 t / 21.4 t | 20.0 t / 21.4 t | — | > 13.3 t / 11.6 t |
| Ariane 64 | > 24.8 t / 21.6 t | 23.3 t / 21.6 t | > 17.3 t / 15.0 t | > 13.2 t / 11.5 t |
| Vega-C | > 3.8 t / 3.3 t | > 3.8 t / 3.3 t | > 2.6 t / 2.3 t | — |
| H-IIA 202 | 9.3 t / 10.0 t | 9.0 t / 10.0 t | > 4.1 t / 3.6 t | 4.3 t / 4.1 t |
| Long March 5 | > 25 t | > 25 t | — | > 14 t |
| H3-22 | > 11.5 t / 10.0 t | > 11.5 t / 10.0 t | > 4.6 t / 4.0 t | > 4.6 t / 4.0 t |
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

Two rows that belong to the sweep are not in the table because the launch would not be
licensed rather than not flown: Soyuz-2.1b to a sun-synchronous orbit **from Baikonur** and
PSLV-XL to one from Sriharikota need a heading 8.6° and 11.3° outside their site's
range-safety window — further than the 5° dogleg this model flies (§6b, range safety) — and the
verdict says so. The model will still fly the plane if asked — the geometry is reachable —
which is why Soyuz-2.1b's sun-synchronous mission is flown here from the two sites that can
licence it. Vega-C's sun-synchronous mission from Kourou is licensed with a 1.2° dogleg and is
flown in the fleet matrix (its `sso` rows) rather than here.

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
| range safety (`SITE_GEOMETRY`) | no heading inside the site's window reaches the plane, nor one within the 5° a dogleg turns — the launch would not be licensed | 33 |
| `BEYOND_CAPABILITY` | the flight ends with the tanks empty, **or** the ascent stages' margin is below `ASCENT_MARGIN_REQUIRED` (+150 m/s) | 23 |
| `ARCHITECTURE` | propellant left, orbit reachable, but nothing in the stack can use it | 13 |
| `KNOWN_GUIDANCE_FAILURES` | **defects**: Δv available, a stage able to spend it, orbit still lost or missed | 0 |

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
mirror (180° − A), whichever the window holds — or when one of the two lies within 5° of the
window's edge, which the ascent then flies as a dogleg (§7); and the inclination is not below
the site's declared minimum. Every edge carries the same 0.25° `CORRIDOR_SLACK`. The window's
direct reach is computed from the window in closed form (`corridorReach`), `azimuthAllowedFor`
is the boolean form of the same verdict, and `planMission` / `launchWindows` fly the heading
`launchDirection` chooses from it. Until this wave `azimuthAllowedFor` tested only the
northbound heading below 75°, so it rejected Tanegashima's own `leo`/`gto` presets and the ISS
plane from Wallops, Wenchang, Tanegashima, Jiuquan and Sriharikota (known bug F01) while the
corridor accepted them — and the planner flew that northbound heading, outside the window, in
48 fleet rows. They now leave south-east, as those ranges really do.

The `sso` preset needs a retrograde heading, roughly 341–349° or 191–199° depending on the
site's latitude. Plesetsk (330–90°), Vostochny (340–95°), Vandenberg (147–201°), Jiuquan
(90–200°), Taiyuan (144–200°) and Mahia (90–200°) have a window that contains one of the two.
Kourou and Tanegashima reach the plane with a dogleg of 1.2° and 1.9° off their corridor edge,
as their ranges really do. From Baikonur, Cape Canaveral, Wenchang, Starbase and Xichang both
headings point over populated land or another country, and Sriharikota's window stops 11° short
of the plane — further than a dogleg turns in this model. The table is generated from the site
data through `azimuthAllowedFor`, and a test asserts that the exclusions are exactly the sites
the function rules out, so the matrix cannot be shrunk by quietly dropping a case. Angara-A5,
Ariane 64, Electron, H-IIA, H3 and Vega-C fly `sso` acceptance cases (Ariane 64 at 25 and 50 %;
its 90 % row is a guidance failure below).

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

**Guidance defects.** None left. There were five, all one family: a heavy upper stage lighting
at a fraction of a g under a near-maximum payload, a closed-loop ascent that could not hold the
loft it was given, and a break-up on the way back down — with the ideal Δv for the mission on
paper and kilometres per second still in the tanks.

| case | was | is |
| --- | --- | --- |
| Vulcan Centaur → 500 km, 90 % | break-up T+963 s, 2 657 m/s left | 500.1 × 501.9 km, SECO T+1 305 s |
| Vulcan Centaur → ISS plane, 90 % | break-up T+915 s, 2 860 m/s left | 417.0 × 417.3 km, SECO T+1 366 s |
| Ariane 64 → ISS plane, 90 % | break-up T+941 s, 1 704 m/s left | 420.1 × 421.8 km, SECO T+1 074 s |
| Ariane 64 → sun-synchronous, 90 % | tanks dry at 107 × 7 443 km | 597.0 × 597.3 km, SECO T+1 017 s |
| PSLV-XL → ISS plane, 90 % | break-up T+569 s, 968 m/s left | tanks dry T+908 s at −1 293 × 204 km: a capability limit |

Traced flight by flight, four things were wrong, three in the guidance law and one in three
vehicles' programs:

1. **The thrust-limited pitch cap charged the wrong sink.** It picks the pitch that leaves the
   stage highest when the horizontal speed reaches the insertion speed, and evaluated the fall
   with the effective gravity of the *present* speed held for the whole burn. At 4.7 km/s that
   is 5.4 m/s²; over a burn that ends at orbital speed, where the centrifugal term cancels
   gravity, the mean is about half of it. The cap now uses the mean over the burn (vh ramping
   linearly to vh + D, so ⟨vh²⟩ = (vh² + vh(vh+D) + (vh+D)²)/3). A strong stage still sits on
   `pitchMax`; a weak one is allowed to climb.
2. **The apoapsis guard cut a lofted stage off.** Centaur V climbing to 450 km on purpose was
   read as a runaway, shut down at 380 km and handed a "circularise at apoapsis" burn 3.4 km/s
   deep that it could not fly; the velocity-to-be-gained steering pointed it 15° below the
   horizon and it sank into the air. The guard now fires only when the circularisation at the
   apoapsis is within the same 400/700 m/s shortfall `onCoreBurnout` already requires before it
   trades a burn for a coast.
3. **The apoapsis ceiling dived a stage that was already descending**, and flattened one flying
   a lofted hand-off. Both have an osculating apoapsis above the insertion apoapsis for a
   reason — the first is past its apex and short of orbital speed, the second is handing over
   climbing — and neither is the runaway the ceiling exists for. It no longer applies while the
   vehicle is sinking more than 500 m/s short of the insertion speed, nor while a loft is flown.
4. **Three programs.** Vulcan now flies 40° of pitch authority, a 150 km loft and a 3° kick
   (was 30°, 80 km, 1.5°); Ariane 64 never pitches below 10° (the closed loop used to command
   the stack level at 70 km while it could still see the P120Cs' thrust, leaving a 0.84 g core
   to climb back); PSLV-XL hands its 0.2 g PS4 over climbing with an 80 km loft. Each was
   chosen from the middle of a region of its own guidance-parameter grid where every row of
   that vehicle passes, not at an edge.

PSLV-XL to the ISS plane at 90 % still does not reach orbit, and should not be expected to: with
the hand-over fixed it spends every kilogram and ends suborbital, exactly like the 500 km row at
the same payload, with +315 m/s of ideal margin against losses of about 2.3 km/s. It is filed as
a capability limit. Vulcan's insertions end 34–95 s inside the 1 400 s clock a 0.15–0.5 g
stage is given; that is what a Centaur V burning 54 t at 48 kg/s takes.

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

**Which solution is flown** is decided by the site's range-safety corridor
(`launchDirection` in `src/physics/mission.ts`), evaluated at a 300 km reference orbit like
the site data itself. The solution whose heading lies inside the corridor is flown; when both
do, the site's own preference is kept (the southbound solution above 75° where the site flies
polar orbits southbound, the northbound one otherwise). The choice used to ignore the corridor
and fly north of east for everything up to 75°, so an ISS-plane launch from Wallops, Wenchang,
Tanegashima, Jiuquan, Sriharikota or Mahia, and every prograde launch from Vandenberg and
Taiyuan, left the pad across the land its corridor avoids — 80 site/orbit combinations, 38 of
them accepted fleet rows — while the verdict said the mission was ready. They now leave south
of east (Wallops to the ISS on 130° instead of 50°), and the launch windows are computed for
the same solution.

**Dogleg.** When neither heading is inside the corridor but one is within `DOGLEG_LIMIT_DEG`
(5°) of its edge, the ascent leaves on that edge and the closed-loop guidance yaws it into the
target plane once it is out of the dense air — the dogleg real launches fly. It opens the
sun-synchronous plane from Kourou (1.2°, as Vega-C flies it) and Tanegashima (1.9°, as H-IIA
does) and polar planes from Wenchang and Sriharikota (3.3°); Baikonur to a sun-synchronous
plane (8.6°) and PSLV's swing around Sri Lanka (11°) remain beyond it. The planner reports the
turn as `doglegDeg`, the setup panel shows it, and the extra steering is paid for in the Δv
budget like any other.

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
report a landing when they touch down below 12 m/s; a stage flown to a target flies the
boostback and burns of §8.1.

### 8.1 Flying a stage back to a target

A recovery plan (`MissionConfig.recoveryPlan`, `src/types.ts`) names where each recovered body
goes: a **landing zone** near the launch site (`src/data/landing-zones.ts`: Landing Zones 1 and 2
at Cape Canaveral, 86 m pads about 300 m apart, 9 km south of SLC-40 and 15 km south of LC-39A;
the Starbase launch tower, whose arms catch Super Heavy) or a **drone ship**; a body can also be
flown **downrange**, the original model above with no target, or **expended**. Without a plan
every recovered body is flown downrange, unchanged. A plan changes the propellant reserve too: a
body flown back to a landing zone keeps the vehicle's `returnReserve` (15 % for Falcon 9 and
Falcon Heavy; 13 % is the least that lands Bandwagon-1 on LZ-1 in the point-mass model, and 12 %
leaves Arabsat-6A's side boosters short of their boostback), a drone-ship or downrange body keeps
`recoveryReserve`, and a body the plan expends, or leaves out, holds nothing back.

The plan is checked with the rest of the configuration (`validateConfigInput`): a landing zone has
to be one the flight's site can reach, a pad or a drone ship's deck needs a stage with legs, and
a tower's arms take only a stage without them (Super Heavy). The mission panel offers each
recoverable stage the choices its site and its hardware allow, and the WebMCP
`configure_mission` tool takes the same plan (`recoveryPlan`; `list_missions` lists the zones).

The guidance is one piece, `src/physics/sim/return-guidance.ts`, shared by both flight models:

- **Prediction.** Where the stage comes down is a point-mass integration from its present state:
  gravity (with J2 when the rigid body is flying, which has it), blunt-body drag in the rotating
  atmosphere, the entry burn the stage is going to fly, and the landing burn — the prediction
  ends where that burn has stopped the stage, because a retrograde landing burn brakes the
  horizontal velocity too and a purely ballistic point is hundreds of metres from where the
  stage really stops. The integration steps onto the entry burn's 70 km ceiling instead of
  across it and ends each burn on its target speed, so the prediction does not jump from one
  evaluation to the next.
- **Boostback.** After separation the stage turns round and burns back. The burn's direction
  solves J·Δv = −miss, with J the 2 × 2 sensitivity of the landing point (east, north) to the
  stage's east and north velocity, by finite differences of the prediction, re-evaluated every
  half second and every tenth of a second in the final trim on the centre engine. The solve is
  deliberately horizontal: the full 2 × 3 minimum-norm answer also uses the vertical velocity,
  and the cheapest way to shorten a flight is then to thrust at the ground. Before the
  boostback is finished, the prediction assumes the propellant it will leave (the rocket
  equation on the velocity it still needs), not a full tank for the entry burn.
- **Entry burn.** A returning stage crosses 70 km slower than a downrange one, so its burn
  waits armed until the airspeed is over its target (550 m/s for a return to the launch site,
  1.4 km/s downrange) and leans up to 15° off retrograde to trim the landing point.
- **Landing burn.** A constant deceleration to 2 m/s at the pad, lit at the drag-aware braking
  height, with the zero-effort-miss divert of Ebrahimi, Bahrami and Roshanian (2008) in the
  horizontal plane, a = 6·Δr/t² − 4·v/t, leaning up to 20°.

The point-mass stage flies these directly: it turns at 10 °/s, burns three engines on the
boostback and one on its trim. The rigid stage (`src/physics/rigid/debris-runtime.ts`) flies
them with its own actuators:

- it **turns round on its centre engine's gimbal** at the lowest thrust: the model's cold-gas
  thrusters (an estimate, 200 N a nozzle) cannot turn a 60 t stage in the time a boostback has,
  and it keeps them for the coast, where its pointing is rationed to the gas left
  (`fuelAwareCoastRates`);
- a stage bound for a drone ship turns straight after separation to the attitude it will need
  at the top of its entry burn and coasts there; the ship is stationed on the trajectory that
  turn leaves it on. Falcon Heavy's core spends its cold gas on the ascent and could not turn
  during its coast at all;
- an entry burn that finds the stage pointing more than 15° off lights the centre engine alone
  to turn it before the other two;
- **the grid fins steer**. They are control surfaces (`src/physics/rigid/surfaces.ts`): each
  deflects ±20° at 30 °/s, and its deflection adds q·S·C_Nα·δ of lift at the top of the stage.
  The fixed fins of the detached aerodynamic table leave a base-first stage slightly unstable
  at zero angle of attack — it trims at about 3.4° — and that trim's lift carried a stage 600 m
  past its pad through the dense air. The steerable fins hold the angle, and the guidance leans
  the stage so that its own lift moves the landing point onto the target (the body is pushed
  against the side its top leans to);
- a landing burn that would not have time to divert a large miss lights early on three engines
  and hands over to the centre engine once one can carry it; the centre engine then finishes
  with the original terminal coast and single restart (`TERMINAL_RESTART`).

A touchdown within the pad's radius (43 m; a drone ship's deck, 30 m) is a landing on the
target (`evt.boosterLandedZone`, `evt.boosterLandedShip`); a soft touchdown off a pad is a
landing beside it, and off a ship's deck is the sea.

**The tower catch.** Super Heavy flies back to the Starbase launch tower, whose arms take it by
the catch pins below its grid fins. The catch point is the pad itself, over the launch mount,
with the booster's base 13 m above the launch mount it lifted off from — the level every
height at the pad is measured from, some 33 m over the ground — and the pins about 110 m over
the ground (an estimate — the catch height is not published). The landing burn stops on that height instead of the ground, aiming at 1 m/s, and
the arms close when the base reaches it within 4 m of the tower's catch point, falling at no
more than 3 m/s, sliding at no more than 2 m/s, and — in six-DOF — tilted no more than 5° and
turning no faster than 3 °/s (all estimates); caught, the booster stays in the arms
(`evt.boosterCaught`). Too fast, it hits them; outside the envelope it falls past them, and a
booster with no legs does not land on the ground. Two things the catch needed that a pad does
not:

- **A burn that can hover.** Super Heavy's three inner Raptors at their lowest thrust are
  heavier than the empty booster (2.76 MN against 2.45 MN), so the burn would coast blind to a
  single restart — the Falcon stage's answer — and drift out of the arms' envelope with no
  thrust to steer. It flies the end of the burn on as many of the three as the thrust asked for
  allows (two, then one), switching only when the lit set can no longer fly it.
- **An upright arrival.** The divert aims to be over the target three seconds before touchdown
  and its lean fades out over those seconds, and it is solved over no less than eight seconds:
  the zero-effort-miss gains grow as 1/t², and asked to finish in a second or two they outran the
  attitude loop that has to lean the stage, which then oscillated to 19° over the arms.

Super Heavy boosts back on its inner thirteen engines and turns on the inner three. Flown back
to the tower it keeps 11 % of its propellant (`returnReserve`): 9 % is the least the arms catch
it with in the point-mass model, and 11 % arrives with 72 t to spare. Measured (tests/recovery-return.test.ts,
tests/rigid-return.test.ts, tests/heavy/falcon-heavy-returns.test.ts):

| Flight | Model | Body | Miss |
|---|---|---|---|
| Falcon 9, Bandwagon-1 (1.3 t, 590 km, 45.4°) | point mass | first stage → LZ-1 | 0.0 m |
| | six-DOF | first stage → LZ-1 | 0.8 m |
| Falcon Heavy, Arabsat-6A (6.465 t, GTO) | point mass | side boosters → LZ-1, LZ-2 | 0.0 m, 0.0 m |
| | | core → drone ship, ~930 km downrange | 0.0 m |
| | six-DOF | side boosters → LZ-1, LZ-2 | 0.8 m, 0.8 m |
| | | core → drone ship | 0.7 m |
| Starship (15.6 t, 500 km) | point mass | Super Heavy → tower | 0.0 m, caught |
| | six-DOF | Super Heavy → tower | 0.3 m, caught at 2.4 m/s down, 0.45 m/s across, 0.5° |

The drone ship ends up 930 km downrange, where Of Course I Still Love You was 967 km out for the
real flight.

A stage that has landed or been caught is no longer integrated, but it stays in the state: it
turns with the Earth from then on (position, velocity ω × r, and in six-DOF its attitude and
a body rate of exactly the Earth's), so the booster on its pad, on the drone ship's deck or in
the tower's arms stays where it came down for the rest of the flight instead of hanging in
inertial space while the ground rotates out from under it.

### 8.2 A suborbital target and the ship that flies itself home

Starship's test flights do not reach orbit. Flight 5 (13 October 2024) cut its ship off on a
213 × −15 km trajectory at 26.2° — the perigee is under the ground, so no deorbit burn is needed
— and the ship came back down belly first an hour later and splashed down in the Indian Ocean
off Western Australia. An orbit with `suborbital: true` (`OrbitSpec.suborbital`) asks for
exactly that (src/physics/mission.ts, src/physics/sim/ascent.ts, src/physics/sim/ship-descent.ts).
It is offered for a vehicle whose upper stage flies itself home — one with flaps, Starship —
with the perigee between −1000 and 0 km, and a test flight may carry no payload at all (the
mission panel's "Suborbital test flight" option, WebMCP's `suborbital`). A payload stays aboard
and comes down with the ship: the 30 t kept for landing still sets down a ship carrying 60 t in
the point-mass model, and 30 t in six-DOF, which then comes down further east (13°S 120°E). At
60 t the six-DOF ship is lost: its centre of mass further forward, the flaps hold a shallower
entry whose lift carries it back out of the air, and it comes in again half an hour later at
Mach 16 at 30 km, far too steep to fly home. There is no entry guidance that would steer the
lift down; the pre-flight verdict warns above 30 t (`SHIP_RETURN_VERIFIED_PAYLOAD`).

**Cut-off.** A suborbital target has no burns after the ascent. The ascent is aimed at
`SUBORBITAL_CUTOFF_ALTITUDE`, 150 km, where Starship's ship shuts down, and it is cut off still
climbing: in the last minute, or within 10 km of that height, the last stage holds the target
ellipse's flight-path angle at the height it is at, the climb rate growing with the horizontal
speed (`AscentGuidance`, `SuborbitalAim`). The cut-off comes when the periapsis — with the
tail-off counted — has risen to the target's, and the flight is judged there, on the osculating
apsides (`evt.suborbitalTarget`). Cutting off at the apogee instead puts the whole coast a
quarter of a revolution short, and Flight 5's splashdown in the Atlantic.

**The ship's return** is five phases, flown the same way in both models (`ShipDescent`):

1. *Coast.* The ship turns to its entry attitude — belly (+Z, the heat-shield side) to the flight
   path, nose 70° above it — on its cold-gas thrusters and holds it (six-DOF: held-coast steps,
   as an orbital coast). Thirty seconds after the cut-off it vents its main tanks and keeps
   30 t (`SHIP_LANDING_PROPELLANT`) in its header tanks, the liquid oxygen one in the nose.
2. *Entry*, from 120 km, belly first at an angle of attack easing from 70° hypersonic to 80° once
   subsonic, with the lift of the tilted belly pointed up.
3. *Belly flop*, subsonic, falling at about 85 m/s.
4. *Flip* at about a kilometre (`flipHeight`): the three sea-level Raptors light at their least
   and swing the ship upright in about eight seconds.
5. *Landing burn*: a constant deceleration that reaches the water at 1.5 m/s, on two or three
   of those engines, leaning up to 30° to take out the fifty-odd metres a second of sideways
   speed the flip's own thrust leaves, and upright for the last three seconds. One engine is lit
   alone only to settle the last metres: it sits off the axis, where its gimbal cannot pitch the
   ship without rolling it too, and two at their least still lift the ship.

A splashdown slower than 6 m/s down and 5 m/s across, leaning under 15°, is intact
(`evt.shipSplashdown`); anything else breaks the ship up (`evt.shipImpact`). Either way the flight
is `landed` and the clock runs on with the ship on the water.

**The six-DOF ship.** Belly first is what its aerodynamic table is built for
(`shipDescentAeroTable`): a 9 m tube under a 1.3-diameter ogive, the crossflow acting on the
planform (the tube and two thirds of the nose's side, centred a little behind the middle) and a
small slender-body lift on the ogive. At 70° that gives a lift of about a third of the drag. The
four flaps are control surfaces (`shipFlapSurfaces`): drag plates hinged along the hull 65° either
side of the belly, 18 m² forward and 32 m² aft, whose force grows with the square of the stream
meeting their face and is never negative — folded they make none, fully out their whole drag —
and the control works about a half-open trim. Fore against aft pitches the ship, one side
against the other rolls it, and the diagonal pairs yaw it with the outward part of their push.
With the landing propellant in the header tanks the centre of mass sits at 47 % of the length,
and the flaps hold 70° hypersonic at about 30° of their 34° either way; at the belly flop they
use 10°. The flip and the landing burn fly with twice the usual share of the gimbals' spare
authority (`ControlGains.authorityShare`), and with the roll left free.

Measured on Flight 5 (tests/ship-descent.test.ts, tests/heavy/starship-flight5.test.ts):

| | Point mass | Six-DOF | Flight 5 |
|---|---|---|---|
| Cut-off | T+7:52, 210 × −14 km | T+7:58, 211 × −15 km | ≈ T+8:30 |
| Entry interface (120 km) | T+41:25 | T+39:42 | ≈ T+47 |
| Peak dynamic pressure on entry | 9.6 kPa | 8.3 kPa | — |
| Flip | 1.12 km | 1.06 km | ≈ 1 km |
| Splashdown | T+61:00, 22.8°S 93.3°E, 1.5 m/s | T+59:00, 24.5°S 83.6°E, 1.6 m/s, 2° | T+1:05:40, off Western Australia |

The model comes down about six minutes early and 15–25° of longitude short of the real splashdown.
The trajectory is nearly tangent to the top of the air, so where it meets it moves a long way
for small differences: the published apsides are presumably not osculating Kepler elements at
the cut-off, and six-DOF's J2 alone moves the entry by about a minute.

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
- In the point-mass model (selectable): attitude is a commanded direction with a slew-rate
  limit, no rotational dynamics, no aerodynamic lift, no wind. The six-DOF model (§2a, the
  default) has all four, from estimated rather than measured vehicle data.
- One generic drag curve for every launcher and one blunt-body curve for every piece of debris;
  solid-motor thrust profiles are a normalised linear ramp about the published mean. The
  six-DOF normal-force tables are low-order estimates from each vehicle's layout, not wind-tunnel
  or flight data.
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
| normal force | нормальная сила | แรงตั้งฉาก |
| centre of pressure | центр давления | ศูนย์กลางความดัน |
| crossflow (viscous) | поперечное обтекание (вязкое) | การไหลตัดขวาง (ความหนืด) |
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
