"""
P2.5 fixture for M03: re-entries predicted the agencies' way, with the drag
fitted to two element sets a week apart and the prediction carried from the
later one, at 30, 10 and 5 days before each re-entry
(tests/heavy/reentry-agencies.test.ts). The selection, the method and the
criteria were fixed in docs/VALIDATION.md §7 before any prediction was made
(commit edc9b49, 2026-09-27); this script applies the selection.

Sources:

- GCAT, J. McDowell, General Catalog of Artificial Space Objects
  (https://planet4589.org/space/gcat/, satcat.tsv of 2026-09-24), CC BY 4.0:
  the objects and their re-entry dates (`DDate`).
- J. McDowell's archive of historical element sets
  (https://planet4589.org/space/ele.html; one file per object,
  https://planet4589.org/space/elements/NNN00/SNNNNN, in his extended TLE
  format, https://planet4589.org/space/xtle.html). Only sets whose line 3
  gives the origin NOR are used: "NORAD and its successors up to 2004, prior
  to the redistribution restrictions"; the archive's US-government sets "were
  obtained from other public sources, or else from the GSFC OIG site under
  agreements that did not restrict redistribution of the data" (ele.html).
  The owner approved bundling the sets used, with attribution, on 2026-09-27.
  Fetched 2026-09-27, one request per object and at most one a second,
  cached, and only for the objects the selection names.

The selection, as fixed:

- the objects: GCAT's payloads and rocket stages (`Type` starting "P" or
  "R", not debris), status "R" (re-entered uncontrolled), `DDate` between
  1985-01-01 and 2004-06-30, whose history holds sets of NORAD origin at
  every lead time below; sorted by catalogue number, 100 taken at even steps
  (indices floor(k N / 100), k = 0..99, of the N that qualify), all if fewer;
- for each lead time L of 30, 10 and 5 days: the set of NORAD origin nearest
  to L days before the re-entry, within a day of it, and a second set nearest
  to 7 days before that one, 4 to 12 days before it;
- the re-entry is GCAT's `DDate`: to the minute where GCAT gives the time
  (a "?" on it kept as GCAT gives it), noon for a day. A `DDate` not given
  to the day (a month or a year) gives no lead time, and the object cannot
  qualify.

Reading the archive (not a choice about the data, but what a set is): a set
is lines 1 and 2 followed by its line 3, which carries the origin; a set with
no line 3 has no origin and is not NORAD's. A set is readable when line 3
says it is SGP4 mean elements in TEME and UTC about the Earth, the format's
defaults, and lines 1 and 2 pass the checks the app's TLE reader makes
(src/orbit/tle.ts, `parseTle`); tests/ballistic.test.ts reads every bundled
set with that reader. Where two sets tie for nearest, the first in the file
is taken. A set moved into an object's file by McDowell because it describes
that object keeps the other catalogue number it was issued under (xtle.html,
"Cross-Tagging"); it is that object's set and is used as such. Line 3's
problem flag is kept in the fixture; the selection does not read it.

    python3 make_agencies.py satcat.tsv cache/ > agencies.json

Files missing from cache/ are fetched, one a second; a 404 is cached as an
empty file with the suffix .404.
"""
import datetime as dt
import json
import math
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

LEADS = (30, 10, 5)
FIRST, LAST = dt.datetime(1985, 1, 1), dt.datetime(2004, 6, 30, 23, 59, 59)
TAKE = 100
ARCHIVE = 'https://planet4589.org/space/elements/{dir:05d}/S{num:05d}'


def ddate(d):
    """GCAT's DDate as a time: to the minute where given, noon for a day; None if not to the day."""
    m = re.match(r'(\d{4}) (\w{3})\s+(\d+)(?:\s+(\d{2})(\d{2}))?', d)
    if not m:
        return None, None
    day = dt.datetime.strptime(f'{m[1]} {m[2]} {m[3]}', '%Y %b %d')
    if m[4]:
        return day.replace(hour=int(m[4]), minute=int(m[5])), 'minute'
    return day.replace(hour=12), 'day'


def num(f):
    f = f.strip()
    return float(f) if re.fullmatch(r'[+-]?(\d+\.?\d*|\.\d+)', f) else None


def exponential(f):
    f = f.ljust(8)[:8]
    if f.strip() == '':
        return 0.0
    sign, digits, esign, edigit = f[0], f[1:6].replace(' ', '0'), f[6], '0' if f[7] == ' ' else f[7]
    if sign not in ' +-' or not re.fullmatch(r'\d{5}', digits) or esign not in ' +-' or not edigit.isdigit():
        return None
    return float(f"{'-' if sign == '-' else ''}0.{digits}") * 10 ** int(f"{'-' if esign == '-' else ''}{edigit}")


def readable(l1, l2):
    """The checks src/orbit/tle.ts parseTle makes; the epoch, or None."""
    l1, l2 = l1.rstrip(), l2.rstrip()
    if not (len(l1) >= 64 and l1.startswith('1 ') and l1[23] == '.'):
        return None
    if not (len(l2) >= 63 and l2.startswith('2 ') and all(l2[k] == '.' for k in (11, 20, 37, 46))):
        return None
    if not (l1[2:7].strip().isdigit() and l1[2:7].strip() == l2[2:7].strip()):
        return None
    yy, days = num(l1[18:20]), num(l1[20:32])
    if None in (yy, days, num(l1[33:43]), exponential(l1[44:52]), exponential(l1[53:61])):
        return None
    ecc = l2[26:33].replace(' ', '0')
    if None in (num(l2[8:16]), num(l2[17:25]), num(l2[34:42]), num(l2[43:51]), num(l2[52:63])) or not re.fullmatch(r'\d{7}', ecc):
        return None
    year = int(yy) + (2000 if yy < 57 else 1900)
    return dt.datetime(year, 1, 1) + dt.timedelta(days=days - 1)


def nor_sets(text):
    """The readable sets of NORAD origin in one archive file, in file order."""
    lines = text.splitlines()
    out = []
    for i in range(len(lines) - 2):
        l1, l2, l3 = lines[i], lines[i + 1], lines[i + 2]
        if not (l1.startswith('1') and l2.startswith('2') and l3.startswith('3')):
            continue
        origin, problem = l3[14:20].strip(), l3[21:23].strip()
        eltype, frame, tsys, primary = l3[24:28].strip(), l3[29:33].strip(), l3[34:38].strip(), l3[39:69].strip()
        if origin != 'NOR' or l3[12:13] not in ('1', ' ', ''):
            continue
        if eltype not in ('', 'SGP4') or frame not in ('', 'TEME') or tsys not in ('', 'UTC') or primary not in ('', 'Earth'):
            continue
        epoch = readable(l1, l2)
        if epoch is None:
            continue
        out.append({'epoch': epoch, 'line1': l1.rstrip(), 'line2': l2.rstrip(), 'line3': l3.rstrip(), 'problem': problem})
    return out


def nearest(sets, t, ok):
    best = None
    for s in sets:
        if ok(s) and (best is None or abs(s['epoch'] - t) < abs(best['epoch'] - t)):
            best = s
    return best


def pairs(sets, reentry):
    """For each lead time, the later and the earlier set; None if any lead time lacks one."""
    got = {}
    day = dt.timedelta(days=1)
    for lead in LEADS:
        t = reentry - dt.timedelta(days=lead)
        later = nearest(sets, t, lambda s: abs(s['epoch'] - t) <= day)
        if later is None:
            return None
        t2 = later['epoch'] - dt.timedelta(days=7)
        earlier = nearest(sets, t2, lambda s: 4 * day <= later['epoch'] - s['epoch'] <= 12 * day)
        if earlier is None:
            return None
        got[str(lead)] = [earlier, later]
    return got


def fetch(norad, cache, state):
    path = cache / f'S{norad:05d}'
    if path.exists():
        return path.read_text(encoding='latin-1')
    if Path(f'{path}.404').exists():
        return None
    wait = state['last'] + 1.0 - time.monotonic()
    if wait > 0:
        time.sleep(wait)
    url = ARCHIVE.format(dir=norad // 100 * 100, num=norad)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Orbitlab fixture builder (one request a second)'})
        body = urllib.request.urlopen(req, timeout=60).read()
    except urllib.error.HTTPError as e:
        state['last'] = time.monotonic()
        if e.code == 404:
            Path(f'{path}.404').write_text('')
            return None
        raise
    state['last'] = time.monotonic()
    path.write_bytes(body)
    return body.decode('latin-1')


rows = []
with open(sys.argv[1], encoding='utf-8') as f:
    head = f.readline().lstrip('#').rstrip('\n').split('\t')
    for line in f:
        if not line.startswith('#'):
            rows.append(dict(zip(head, [x.strip() for x in line.rstrip('\n').split('\t')])))
cache = Path(sys.argv[2])
cache.mkdir(parents=True, exist_ok=True)

pool = {'in GCAT': 0, 'not dated to the day (1985-2004, left out)': 0, 'no file in the archive': 0, 'no sets at every lead time': 0}
candidates = []
for r in rows:
    if r.get('Status') != 'R' or r['Type'][:1] not in ('P', 'R') or not r['Satcat'].isdigit():
        continue
    year = re.match(r'(\d{4})', r['DDate'])
    if not year or not 1985 <= int(year[1]) <= 2004:
        continue
    t, dated = ddate(r['DDate'])
    if t is None:
        # a month or a year, 1985 to 2004: no day to lead from
        pool['not dated to the day (1985-2004, left out)'] += 1
        continue
    if not FIRST <= t <= LAST:
        continue
    pool['in GCAT'] += 1
    candidates.append((int(r['Satcat']), r, t, dated))

state = {'last': 0.0}
qualify = []
for k, (norad, r, t, dated) in enumerate(sorted(candidates, key=lambda c: c[0])):
    if k % 100 == 0:
        print(f'{k} of {len(candidates)}: {len(qualify)} qualify so far', file=sys.stderr)
    text = fetch(norad, cache, state)
    if text is None:
        pool['no file in the archive'] += 1
        continue
    got = pairs(nor_sets(text), t)
    if got is None:
        pool['no sets at every lead time'] += 1
        continue
    qualify.append((norad, r, t, dated, got))

n = len(qualify)
taken = qualify if n <= TAKE else [qualify[math.floor(k * n / TAKE)] for k in range(TAKE)]
iso = lambda d: d.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
objects = [{
    'norad': norad, 'name': r['Name'], 'type': r['Type'], 'ddate': r['DDate'], 'dated': dated,
    'reentry': t.strftime('%Y-%m-%dT%H:%MZ'),
    'sets': {lead: [{'epoch': iso(s['epoch']), 'line1': s['line1'], 'line2': s['line2'], 'line3': s['line3']} for s in pair]
             for lead, pair in got.items()},
} for norad, r, t, dated, got in taken]
print(json.dumps({
    'attribution': ('Re-entry dates: J. McDowell, General Catalog of Artificial Space Objects, https://planet4589.org/space/gcat '
                    '(satcat.tsv of 2026-09-24), CC BY 4.0. Element sets: J. McDowell, historical element sets, '
                    'https://planet4589.org/space/ele.html, only sets of origin NOR (NORAD, before 2004, distributed without '
                    'restriction), fetched 2026-09-27; bundled with the owner\'s approval of 2026-09-27.'),
    'selection': ('GCAT payloads and rocket stages, status R, DDate 1985-01-01 to 2004-06-30, whose history holds NOR sets at every '
                  'lead time; by catalogue number, 100 at even steps. Per lead time L (30, 10, 5 d): the NOR set nearest L days '
                  'before re-entry (within a day), and the one nearest 7 days before it (4 to 12 days). Fixed in docs/VALIDATION.md '
                  'before any prediction (commit edc9b49).'),
    'pool': {**pool, 'qualify': n, 'taken': len(taken)},
    'objects': objects,
}, indent=1))
print(f"{pool['in GCAT']} in GCAT, {n} qualify, {len(taken)} taken", file=sys.stderr)
