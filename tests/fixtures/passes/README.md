# Passes computed by Skyfield

`skyfield-passes.json` holds the passes `tests/passes.test.ts` compares with
(roadmap R03). It was made on 2026-09-26 by `make_pass_fixtures.py` beside it,
with Skyfield 1.55 (<https://rhodesmill.org/skyfield/>, MIT licence), sgp4 2.27
and JPL's DE421 ephemeris, Skyfield's built-in time scale (UT1 and ΔT from its
bundled IERS data).

For three element sets — the ISS (`tests/fixtures/gp/iss.json`), THEOS-2 and
GPS BIIR-5 (PRN 22) from the bundled catalogue — and two places — Bangkok
(13.7563° N, 100.5018° E) and Saint Petersburg (59.9386° N, 30.3141° E), on the
WGS-84 ellipsoid at height 0 — it lists every rise, highest point and set
above 0° over three days from the element set's epoch, cut to the hour, with
the geometric (unrefracted) elevation, azimuth and range, whether the
satellite is sunlit, and the Sun's elevation at the place; and the ISS's
entries into and exits from the Earth's shadow over one day.

Skyfield propagates with the same SGP4 (Vallado's reference, as in
`src/orbit/sgp4.ts`); everything after the propagation is its own: TEME to
the Earth-fixed frame with UT1, the topocentric look angles, the event search,
the Sun from DE421, and the shadow test.
