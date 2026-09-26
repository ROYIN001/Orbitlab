# One element set in every CelesTrak format

The International Space Station's element set (catalogue number 25544,
element set 999, epoch 2026-09-26 09:35:46.493952 UTC) as CelesTrak served it
on 2026-09-26 between 20:07 and 20:08 UTC, in each of the formats its GP data
documentation lists (<https://celestrak.org/NORAD/documentation/gp-data-formats.php>):

| file | query |
| --- | --- |
| `iss.tle` | `gp.php?CATNR=25544&FORMAT=TLE` (three-line: the name, then the two lines) |
| `iss.2le` | `gp.php?CATNR=25544&FORMAT=2LE` |
| `iss.json` | `gp.php?CATNR=25544&FORMAT=JSON` (the OMM keywords) |
| `iss.csv` | `gp.php?CATNR=25544&FORMAT=CSV` |
| `iss.xml` | `gp.php?CATNR=25544&FORMAT=XML` (CCSDS OMM XML) |
| `iss.kvn` | `gp.php?CATNR=25544&FORMAT=KVN` (CCSDS OMM key = value) |

Unchanged as downloaded, but for the line endings (CRLF as served, LF in the repository).
`tests/omm.test.ts` reads each and holds them to one
another (roadmap R02).
