# Soyuz-2.1b to sun-synchronous orbit: session notes, 2026-10-01

A dated record of the session that fixed the six-DOF burn order. If this note and the documents
disagree, the documents are right. The account and the measurements are in
[VALIDATION.md](../VALIDATION.md) §3, "Soyuz-2.1b to sun-synchronous orbit: the burn order".

## What was asked

Soyuz-2.1b/Fregat-M with 4 t to the `sso` preset from Plesetsk ended off target in both flight
models. Either the mission had to reach its orbit, or the gap had to be documented. The questions
were:

- why the six-DOF planner trims the apoapsis at the next perigee instead of circularising at the
  apoapsis;
- why the Fregat's first burn stops 3 km short;
- whether the attitude gas runs out over the coast.

## What was found

- In six-DOF the parking orbit is high, not short. Under J2 the apex reaches 617.6 km (619.0 km
  with hot staging), while the osculating apoapsis at cut-off reads 597 km. The 3 km is the ascent
  cut-off gate (`checkAscent`, apoapsis within 3 km of the insertion apoapsis), in both models.
- The planner lowered that apex first, at a perigee a revolution away. The two turns (retrograde
  and back) emptied the Fregat's gas. A held coast costs none.
- The empty tank read as a new planning context. The coast then re-planned from the osculating
  apoapsis into an 8 m/s trim the stage could not turn for, and the flight ended in
  `evt.burnAlignmentTimeout`.
- The point mass's off target was the launch time: a fixed epoch, 81.5° of RAAN from the LTAN
  plane. In the window it reaches its orbit.

## What changed

`src/physics/sim/burns.ts`, six-DOF only:

- When the apex is outside the judged band and the shaping burn is the last aimed one, it goes
  first, and the apex is lowered after it.
- The attitude gas is not part of the planning context.

A first version also reordered apexes inside the band. It widened the Soyuz-2.1b Monte Carlo
set's perigee 3σ to 9.1 km against 8 km, and was narrowed.

## Left open

- **The coast loop's turns on weak stages.** One 180° turn of the Fregat with 4 t
  (42 000 kg·m², 50 N jets) costs 24–25 kg of its 60 kg. The loop drives the rate to about
  4.6 °/s, overshoots by 49° and swings back and forth for two more minutes. A turn paced to the
  240 s pre-orientation would need about 2 kg or less. The mission ends with 0.8 kg left. Where
  to look: `scheduledGains` and the fuel-aware coast block in `src/physics/rigid/runtime.ts`,
  `fuelAwareCoastRates` in `src/physics/rigid/pointing.ts`, and `attitudeControl` in
  `src/physics/rigid/control.ts`. Check whether the scheduled acceleration overestimates what
  `allocateRcs` delivers.
- The six-DOF ascent still cuts off on the osculating apoapsis, and a six-DOF re-plan still reads
  the osculating apsides.
