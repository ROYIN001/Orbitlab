# Space weather and re-entries on record (R05, P2.5)

## `make_solar_daily.py` → `src/data/solar-daily.json`

The daily observed F10.7 and the daily Ap from 1954-01-01, from GFZ's file of the indices, fetched
on 2026-09-26 from <https://kp.gfz.de/app/files/Kp_ap_Ap_SN_F107_since_1932.txt> (last day
2026-09-25). Licence CC BY 4.0 (the sunspot numbers in the same file, CC BY-NC 4.0, are not used).
Cite: Matzka, J., Bronkalla, O., Tornow, K., Elger, K. and Stolle, C. (2021), *Geomagnetic Kp
index*, V. 1.0, GFZ Data Services, <https://doi.org/10.5880/Kp.0001>; the flux is the Dominion
Radio Astrophysical Observatory's (Tapping 2013, <https://doi.org/10.1002/swe.20064>). The 171
days without a flux (most before 1960) take the straight line between their neighbours.

```sh
curl -O https://kp.gfz.de/app/files/Kp_ap_Ap_SN_F107_since_1932.txt
python3 make_solar_daily.py Kp_ap_Ap_SN_F107_since_1932.txt > ../../../src/data/solar-daily.json
```

## `spheres.json`

Seven spheres, whose drag area does not depend on how they tumble, each with its first element
set, its mass and diameter as published, and the date it re-entered.

| sphere | NORAD | first element set | mass, diameter | re-entry |
| --- | --- | --- | --- | --- |
| Starshine | 25769 | 1999-06-05 | 39 kg, 0.48 m | 2000-02-18 |
| Starshine 2 | 26996 | 2001-12-16 | 39 kg, 0.48 m | 2002-04-26 |
| Starshine 3 | 26929 | 2001-09-30 | 91 kg, 0.94 m | 2003-01-21 |
| ANDE MAA | 29664 | 2006-12-22 | 52.04 kg, 0.4826 m | 2007-12-25 |
| ANDE FCal | 29667 | 2006-12-22 | 62.70 kg, 0.4445 m | 2008-05-25 |
| ANDE-2 Pollux | 35693 | 2009-07-31 | 27.442 kg, 0.4826 m | 2010-03-29 |
| ANDE-2 Castor | 35694 | 2009-07-31 | 47.45 kg, 0.4826 m | 2010-08-18 |

- **Element sets**: CelesTrak's first element set of each launch, fetched on 2026-09-26 from
  `https://celestrak.org/NORAD/elements/gp-first.php?INTDES=<launch>&FORMAT=json`, one request
  per launch (1999-030, 2001-043, 2001-054, 2006-055, 2009-038).
- **Mass and diameter**: Starshine and Starshine 2, Gunter's Space Page, "Starshine 1, 2, 4"
  (<https://space.skyrocket.de/doc_sdat/starshine-1.htm>: 39 kg, 48 cm; Starshine 2 "the same size
  and mass"); Starshine 3, Wikipedia, "Starshine 3" (94 cm, 91 kg; Gunter's page rounds to 90 kg,
  0.9 m); the ANDE spheres, the ILRS flight-hardware documents
  (<https://ilrs.gsfc.nasa.gov/docs/anderr_hw.pdf>: MAA 19.0 in, 52.04 kg, FCal 17.5 in,
  62.70 kg; <https://ilrs.gsfc.nasa.gov/docs/andehw.pdf>: Castor 47.45 kg, Pollux 27.442 kg, both
  19 in).
- **Re-entry**: GCAT, Jonathan McDowell's General Catalog of Artificial Space Objects
  (<https://planet4589.org/space/gcat/>, `satcat.tsv` of 2026-09-24), the `DDate` column. Starshine
  2's is "2002 Apr 26 1115?", taken as the day.
- **Last element sets** (P2.5, `last`): CelesTrak's last element set of each, fetched on
  2026-09-27 from `https://celestrak.org/NORAD/elements/gp-last.php?INTDES=<launch>&FORMAT=json`,
  one request per launch; each is from the day of the re-entry, some 140 km up. With the first set
  they give the ballistic coefficient fitted to two sets (`tests/ballistic.test.ts`).

## `../reentry/stages.json` (P2.5)

Every rocket stage GCAT has re-entering uncontrolled (status R), dated to the minute, between
2023-01-01 and 2025-12-31, 5 to 150 days after its launch: 66, with GCAT's name, mass, length and
diameter, the re-entry, and CelesTrak's first element set of its launch (one request per launch,
fetched 2026-09-27). The selection was fixed before any prediction; `make_stages.py` makes the
file from GCAT's `satcat.tsv` and the fetched sets:

```sh
python3 ../reentry/make_stages.py satcat.tsv first/ > ../reentry/stages.json
```
