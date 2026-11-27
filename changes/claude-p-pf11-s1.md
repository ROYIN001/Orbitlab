## CHANGELOG

- Astro (PF-11): `src/astro/base/frames.ts` with its series tables in `nutation-2000b.ts`, the rotations between GCRF, ITRF, TEME and EME2000 by the IAU 2000B chain, the sidereal times, state transformation with the Earth's rotation, RSW and LVLH, and azimuth, elevation and range for the new physics base (not yet called by the app), held to ERFA's `pnm00b`, `gst00b`, `gmst82`, `pom00`, `c2teqx` and `bp00`, to the IAU 2006/2000A `c2t06a`, to Skyfield's TEME and to the app's present `temeToItrf`.

## PROGRESS

| PF-11 (S20 wave 1, reference frames) | Merged, waiting for publish (PR #N, CI run N on <sha>) | The frames module and its ERFA and Skyfield fixtures and test: an ERFA port, every term of `nut00b` and `eect00` kept; equal to ERFA at the 25 instants (0 for `pnm00b` and the sidereal times, 1.1e-16 for `c2teqx`, bound 1e-11), 4.1e-9 rad from IAU 2006/2000A (bound 9.7e-9), 2.1 cm from Skyfield's TEME (bound 0.2 m), 1.7 cm from the app's present TEME → ITRF (bound 3 cm), velocity within 3.8e-5 m/s of the centred difference. A non-finite input gives NaN in every number returned. 69 of 69 unit tests (the seven files run), typecheck, bundle budget ok with nothing imported | [PF-11](reports/PF-11-frames.md) |
