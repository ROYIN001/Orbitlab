# SGP4 verification cases

The verification of Vallado, Crawford, Hujsak and Kelso, "Revisiting
Spacetrack Report #3", AIAA/AAS Astrodynamics Specialist Conference, Keystone,
Colorado, 2006, paper AIAA 2006-6753
(<https://celestrak.org/publications/AIAA/2006-6753/>), used by
`tests/sgp4.test.ts` (roadmap R01):

- `SGP4-VER.TLE`: the 33 element sets of the verification, each with the
  start, stop and step (minutes from the epoch) to run it over after column 69
  of its second line.
- `tcppver.out`: the output of the paper's C++ reference implementation for
  them: minutes from the epoch, position (km) and velocity (km/s) in TEME, and
  on the later lines the osculating elements and the calendar date.

Both are taken as distributed with the `sgp4` package, version 2.27, on PyPI
(<https://pypi.org/project/sgp4/>, MIT licence), which carries the reference
files of the paper's companion code unchanged and holds its own port to them.
`SGP4-VER.TLE` had its line endings changed from CRLF to LF; nothing else
was changed.

| file | SHA-256 as distributed |
| --- | --- |
| `SGP4-VER.TLE` (CRLF) | `d246d1d9d768ace445a38a965713fa9ba52d80fd8a41a0502ff83d7acffe2881` |
| `tcppver.out` | `687bf28dbe52df86e8e60ab5cb4a08d1aa3dbcaf4e63b1f7ab95f044fbe3833b` |
