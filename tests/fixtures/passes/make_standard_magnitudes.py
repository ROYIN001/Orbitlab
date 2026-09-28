"""
Writes src/data/standard-magnitudes.json (roadmap P2.5, for R03): satellites'
standard magnitudes — the brightness fully lit at 1000 km, from visual
observers' estimates — as Mike McCants keeps them for his Quicksat program
(qs.mag in https://www.mmccants.org/programs/qsmag.zip, the file of
2020-09-14, fetched 2026-09-27). Objects the file marks decayed ("d"), and
those without a magnitude, are left out.

    curl -O https://www.mmccants.org/programs/qsmag.zip && unzip qsmag.zip
    python3 make_standard_magnitudes.py qs.mag > ../../../src/data/standard-magnitudes.json
"""
import json
import sys

mags = {}
for line in open(sys.argv[1], encoding='latin-1'):
    if not line[:5].strip().isdigit() or line[6:7] == 'd':
        continue
    try:
        mags[str(int(line[:5]))] = float(line[33:38])
    except ValueError:
        pass
out = {
    'source': 'M. McCants, Quicksat qs.mag (2020-09-14), https://www.mmccants.org/programs/qsmag.zip: standard magnitude fully lit at 1000 km',
    'magnitudes': mags,
}
print(json.dumps(out, separators=(',', ':')))
print(len(mags), file=sys.stderr)
