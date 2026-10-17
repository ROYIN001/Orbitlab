# D-51 together: J2 in the point-mass ascent + sites on WGS-84 (R4.2 + R4.5, M-PHYSICS-023/024 path b)

Base: claude/bold-johnson-haeu8t @ 23cb4cf.

## The height rule (one model, decided per use)

| Quantity | Datum | Why |
|---|---|---|
| Air: density, pressure, sound speed, Mach, q, wind profile height, thrust back-pressure | geodetic height above WGS-84 (`geodeticHeight`) | the atmosphere's heights are above sea level (geoid, within ~100 m of the ellipsoid) |
| Ground: contact, impact, touchdown, landing burns, `groundElevation`, settle on surface, pad height | geodetic height above WGS-84 + `groundElevation` (site altitude near the pad, faded 50–250 km) | the ground lies on the ellipsoid |
| Pad position | WGS-84 geodetic lat/lon + site altitude (taken as height above the ellipsoid; geoid ±100 m ignored) | R4.5 |
| `SimState.altitude`, `altitudeAGL`, telemetry `alt`, HUD, events' `alt` params, max-Q alt, fairing alt | geodetic height | what the user reads is the height above the ground model |
| Lat/lon of a position (`eciToLatLon`), `SimState.lat` | geodetic latitude, longitude | pads placed at geodetic latitude must read back their own latitude |
| Orbit apsides / perigee / apogee "altitude", insertion targets, insertion altitude, parking orbit, burns, closed-loop guidance terminal altitude, cut-off checks (`checkAscent`) | radius − 6,378.137 km (unchanged) | GCAT convention (McDowell: radius less 6,378 km), PHYSICS §13.6 "The height datum" |
| Guidance atmospheric gates (pitch-over AGL, gravity-turn end, 25 km/20 km q gates, explicit-guidance engage altitude) | geodetic height (new `GuidanceInputs.height`) | these are about the air |
| Kepler switch (140 km) for point-mass coast | geodetic height | about the air |
| Orbit-plane geometry from the pad (planner azimuth, raanExpected, launch windows, corridor reach) | geocentric latitude of the WGS-84 pad | the plane passes through the Earth's centre and the pad |
| Rotation-credit Δv estimates in the planner (`ascentMargin`, ASCENT_LOSS_ALLOWANCE) | unchanged (R_EARTH·cos φ) | estimates; 0.17 % (≤0.6 m/s) |
| Local "up" for guidance pitch, pad hold attitude, ENU | geocentric radial (unchanged) | ≤0.19° from the ellipsoid normal; documented |

## Code changes
- geodesy.ts: `geodeticToEcef(lat, lon, h)`, `ellipsoidRadius`... ; orbital.ts `groundPositionEci` → WGS-84; `eciToLatLon` → geodetic lat + height.
- simulation.ts: altitude everywhere air/ground → geodetic; pad gravity release with J2 + centrifugal (effective gravity on the scale); padEcef from WGS-84; `escape.geodetic` special case removed.
- sim/forces.ts pointMassAcceleration: drag at geodetic height.
- J2: simulation RK4 point-mass call useJ2=true; losses: gravity loss = −dot(gravityJ2(r), v̂)·dt; E02 record gravityJ2 for pointMass; ship-descent gravity → gravityJ2; debris point-mass → J2, descentModel j2: true.
- rigid runtime / debris-runtime / escape / abort / fall / return-guidance / ship-descent / staging / ascent / nav: heights geodetic.
- DescentCapsule.datum retired (all returns on WGS-84); render/datum.ts identity; `onLand` flag for the steppe.
- mission.ts: plane latitude = geocentric latitude of the WGS-84 pad.
- render: Earth mesh (scene.ts) + clouds + atmosphere shell? flattened by (1−F) along the pole; orbit-view globe flattened; launchpad/recovery anchors at WGS-84; steppe on the ellipsoid; cameras' agl geodetic; telemetry/main/watch-logic heights geodetic.
- Apollo: apollo.ts/apollo-entry.ts — only what is forced; report.

## Goldens expected to move
D01 27 point-mass fingerprints; six-DOF 21 fingerprints + whole-mission goldens; flex goldens; Vostok-1 / MR-3 harnesses; historical; watch-missions flights; design ratings; recheck fixtures (T02); eo-phy-6 (Apollo); identity fixture (specs only — should NOT move).
