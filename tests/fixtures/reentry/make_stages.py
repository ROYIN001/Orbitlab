"""
P2.5 fixture for M03: the rocket stages that fell back uncontrolled in
2023–2025, each with its first element set, to hold the re-entry prediction
with a ballistic coefficient fitted to the set's own decay against where
they came down.

The selection, fixed before any prediction was made: every rocket stage in
GCAT (J. McDowell, https://planet4589.org/space/gcat/, satcat.tsv of
2026-09-24) whose status is "R" (re-entered, not deorbited), whose re-entry
is dated to the minute, between 2023-01-01 and 2025-12-31, 5 to 150 days
after its launch. Its first element set is CelesTrak's
(https://celestrak.org/NORAD/elements/gp-first.php?INTDES=<launch>&FORMAT=json,
fetched 2026-09-27, one request per launch). A stage whose launch could not
be fetched, or whose first set is missing, is listed as such and not used.

    python3 make_stages.py satcat.tsv first/ > stages.json
"""
import datetime as dt
import json
import re
import sys
from pathlib import Path


def parse(d):
    m = re.match(r'(\d{4}) (\w{3})\s+(\d+)(?:\s+(\d{2})(\d{2}))?', d)
    if not m:
        return None, False
    mon = dt.datetime.strptime(m.group(2), '%b').month
    t = dt.datetime(int(m.group(1)), mon, int(m.group(3)), int(m.group(4) or 0), int(m.group(5) or 0))
    return t, bool(m.group(4)) and '?' not in d


rows = []
with open(sys.argv[1], encoding='utf-8') as f:
    head = f.readline().lstrip('#').rstrip('\n').split('\t')
    for line in f:
        if line.startswith('#'):
            continue
        rows.append(dict(zip(head, [x.strip() for x in line.rstrip('\n').split('\t')])))

firsts = Path(sys.argv[2])
stages, missing = [], []
for r in rows:
    if r.get('Status') != 'R' or not r['Type'].startswith('R') or not r['Satcat'].isdigit():
        continue
    ld, _ = parse(r.get('LDate', ''))
    dd, precise = parse(r.get('DDate', ''))
    if not ld or not dd or not precise or not (dt.datetime(2023, 1, 1) <= dd < dt.datetime(2026, 1, 1)):
        continue
    if not 5 <= (dd - ld).total_seconds() / 86400 <= 150:
        continue
    num = int(r['Satcat'])
    path = firsts / f"{r['Launch_Tag']}.json"
    sets = json.loads(path.read_text()) if path.exists() else None
    first = next((s for s in (sets or []) if s['NORAD_CAT_ID'] == num), None)
    entry = {'name': r['Name'], 'norad': num, 'launch': r['Launch_Tag'], 'reentry': dd.strftime('%Y-%m-%dT%H:%MZ'),
             'mass': float(r['Mass']) if r['Mass'] not in ('', '-') else None,
             'length': float(r['Length']) if r['Length'] not in ('', '-') else None,
             'diameter': float(r['Diameter']) if r['Diameter'] not in ('', '-') else None}
    if first is None:
        missing.append({**entry, 'why': 'launch not fetched' if sets is None else 'no first set'})
    else:
        stages.append({**entry, 'elements': first})
print(json.dumps({'selection': 'GCAT rocket stages re-entered 2023-2025 (status R, dated to the minute), 5-150 days after launch; first element set from CelesTrak gp-first',
                  'stages': stages, 'missing': missing}, indent=1))
print(len(stages), 'stages,', len(missing), 'missing', file=sys.stderr)
