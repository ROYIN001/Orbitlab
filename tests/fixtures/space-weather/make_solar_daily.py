"""
Writes src/data/solar-daily.json (roadmap R05, P2.5): the daily indices the
NRLMSISE-00 density reads, from GFZ's file of the indices since 1932
(README.md here says where and when it was fetched, and its licence) — the
observed 10.7 cm solar radio flux of each UT day (F10.7obs: GFZ, "for
ionospheric and atmospheric studies the use of F10.7obs is recommended") and
the daily planetary Ap, from 1954-01-01 (the months before the minimum that
began solar cycle 19, the first of the six the Sun's mean cycle is taken
from; Sputnik flew in 1957) to the file's last day.

A day without a flux (the file writes -1.0) takes the straight line between
the days either side (at an end, the nearest day's); how many is printed. A day without an Ap stops the run.

    python3 make_solar_daily.py Kp_ap_Ap_SN_F107_since_1932.txt > ../../../src/data/solar-daily.json
"""
import json
import sys

FROM = (1954, 1, 1)
days = []
for line in open(sys.argv[1]):
    if line.startswith('#'):
        continue
    p = line.split()
    y, m, d = int(p[0]), int(p[1]), int(p[2])
    if (y, m, d) < FROM:
        continue
    days.append(((y, m, d), int(p[23]), float(p[25])))

f107 = [f for _, _, f in days]
missing = [i for i, f in enumerate(f107) if f <= 0]
for i in missing:
    lo = next((j for j in range(i - 1, -1, -1) if f107[j] > 0), None)
    hi = next((j for j in range(i + 1, len(f107)) if f107[j] > 0), None)
    if lo is None or hi is None:
        f107[i] = f107[hi if lo is None else lo]
    else:
        f107[i] = f107[lo] + (f107[hi] - f107[lo]) * (i - lo) / (hi - lo)
for (y, m, d), ap, _ in days:
    if ap < 0:
        sys.exit(f'{y}-{m:02}-{d:02}: no Ap')

first, last = days[0][0], days[-1][0]
print(f'{len(days)} days, {len(missing)} without a flux filled', file=sys.stderr)
out = {
    'source': 'GFZ, Kp_ap_Ap_SN_F107_since_1932.txt (doi:10.5880/Kp.0001, CC BY 4.0): F10.7obs and Ap by UT day',
    'from': '%04d-%02d-%02d' % first,
    'to': '%04d-%02d-%02d' % last,
    'f107': [round(f, 1) for f in f107],
    'ap': [ap for _, ap, _ in days],
}
text = json.dumps(out, separators=(',', ':'))
print(text.replace('"f107":', '\n"f107":').replace('"ap":', '\n"ap":'))
