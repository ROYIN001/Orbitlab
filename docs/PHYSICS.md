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
(Soyuz Blok I, Proton stage 2, Starship) ignites the next stage at separation. Fairings are
jettisoned at a vehicle-specific altitude. When first-stage recovery is selected, a fraction of
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
   pitch-down rate (the "max pitch-program rate" parameter).
4. **Closed-loop steering** once q < 1 kPa. The horizontal direction is steered toward the
   plane of the target inclination through the current position (yaw feedback nulls the
   out-of-plane velocity). The vertical channel uses an explicit two-point boundary solution:
   with time-to-go T (the burn time of the remaining stages for the missing horizontal speed,
   from the rocket equation), a vertical acceleration profile a_z(t) = A + B t is chosen so
   that altitude reaches the insertion altitude with zero vertical speed at T:

   ```
   B = 12 (h + ½ T (v_z + v_zT) − h_T) / T³,   A = (v_zT − v_z)/T − ½ B T
   ```

   and the pitch angle satisfies a_T sin θ = A + g_eff, where g_eff = μ/r² − v_h²/r is
   gravity reduced by the centrifugal term. This is the linear-tangent form of optimal ascent
   steering, re-planned every step. When the next stage is too weak to hold altitude at
   hand-off (Centaur-class stages) the booster instead targets an apex above the insertion
   altitude (the "loft" parameter), letting the upper stage descend while it builds speed.

The **auto-tuner** flies the ascent headlessly over a grid of kick angles, pitch-program rates
and lofts and keeps the combination with the largest remaining Δv that respects max-Q.

## 6. Mission sequencing

- **Insertion orbit**: circular at the target perigee if it is at or below 300 km, otherwise a
  200 km parking orbit. Vehicles whose final stage is a low-thrust kick stage (Fregat,
  Briz-M, Curie) insert into an ellipse whose apogee is the target when the strong stages
  can reach its perigee speed; the kick stage circularises at apogee.
- If a strong stage burns out with the apoapsis already at the insertion altitude and only a
  small shortfall, the vehicle coasts to apoapsis and circularises there.
- **Apogee raising** at perigee (or at the node when a plane change follows) thrusting
  prograde; long low-thrust burns are split across successive perigee passes
  (Briz-M/Fregat style).
- **Apogee burn**: velocity-to-be-gained steering toward the velocity of the target orbit in
  the target plane (same line of nodes, new inclination) combines circularisation and
  plane change (GEO from Baikonur: 51.6° removed at apogee).
- When the launcher is spent, the spacecraft separates and its own propulsion (apogee engine,
  crew-ship engine) completes the remaining burns, again split across passes when long.
- The resulting orbit is compared with the target; a stable orbit off target is reported as
  such, a suborbital trajectory as a failure.

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
