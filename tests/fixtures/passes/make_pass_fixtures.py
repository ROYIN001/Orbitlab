"""R03 fixtures: satellite passes computed by Skyfield (an independent implementation of the
look angles, the pass search, the Earth's shadow and the Sun) from the same element sets.

    python3 -m venv venv && venv/bin/pip install skyfield
    curl -O https://ssd.jpl.nasa.gov/ftp/eph/planets/bsp/de421.bsp
    venv/bin/python make_pass_fixtures.py de421.bsp skyfield-passes.json
"""
import json, sys
from pathlib import Path
from datetime import timedelta
import skyfield, sgp4
from skyfield.api import load, wgs84, EarthSatellite
from sgp4.api import Satrec, WGS72
from sgp4 import omm

ROOT = Path(__file__).resolve().parents[3]

snap = json.load(open(ROOT / 'public/data/satellites.json'))
recs = {r['NORAD_CAT_ID']: r for g in snap['data']['groups'] for r in g['sets']}
iss = json.load(open(ROOT / 'tests/fixtures/gp/iss.json'))[0]
chosen = [iss, recs[58016], recs[26407]]   # the ISS, THEOS-2, a GPS satellite (PRN 22)

ts = load.timescale(builtin=True)
eph = load(sys.argv[1])
sun, earth = eph['sun'], eph['earth']
STATIONS = {'bangkok': (13.7563, 100.5018), 'stPetersburg': (59.9386, 30.3141)}

def sat_from(rec):
    s = Satrec()
    omm.initialize(s, {k: str(v) for k, v in rec.items()})
    return EarthSatellite.from_satrec(s, ts)

def iso(t):
    return t.utc_datetime().isoformat(timespec='milliseconds').replace('+00:00', 'Z')

out = {'generator': f'Skyfield {skyfield.__version__}, sgp4 {sgp4.__version__}, JPL DE421, builtin timescale',
       'altitude': 'geometric (no refraction), WGS-84', 'stations': STATIONS, 'sets': [], 'passes': [], 'shadow': []}
for rec in chosen:
    sat = sat_from(rec)
    out['sets'].append(rec)
    t0 = ts.from_datetime(sat.epoch.utc_datetime().replace(minute=0, second=0, microsecond=0))
    t1 = t0 + 3.0
    for name, (lat, lon) in STATIONS.items():
        topos = wgs84.latlon(lat, lon, 0.0)
        times, events = sat.find_events(topos, t0, t1, altitude_degrees=0.0)
        for t, e in zip(times, events):
            alt, az, dist = (sat - topos).at(t).altaz()
            sun_alt = (earth + topos).at(t).observe(sun).apparent().altaz()[0].degrees
            out['passes'].append({'norad': rec['NORAD_CAT_ID'], 'station': name, 'event': ['rise', 'culminate', 'set'][e],
                'time': iso(t), 'alt': round(alt.degrees, 4), 'az': round(az.degrees, 4), 'km': round(dist.km, 3),
                'sunlit': bool(sat.at(t).is_sunlit(eph)), 'sunAlt': round(sun_alt, 3)})
    if rec['NORAD_CAT_ID'] == 25544:
        # the ISS going into and out of the Earth's shadow over one day
        from skyfield.searchlib import find_discrete
        f = lambda t: sat.at(t).is_sunlit(eph)
        f.step_days = 1 / 1440
        tt, vv = find_discrete(t0, t0 + 1.0, f)
        out['shadow'] = [{'time': iso(t), 'sunlit': bool(v)} for t, v in zip(tt, vv)]
    print(rec['OBJECT_NAME'], iso(t0), sum(1 for p in out['passes'] if p['norad'] == rec['NORAD_CAT_ID']), file=sys.stderr)
json.dump(out, open(sys.argv[2], 'w'), indent=1)
