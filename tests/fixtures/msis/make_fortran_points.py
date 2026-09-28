"""
NRLMSISE-00 at random points, from NRL's own Fortran as pymsis wraps it
(pymsis 0.13.0, version=0; https://github.com/SWxTREC/pymsis, MIT licence):

    pip install pymsis==0.13.0
    python3 make_fortran_points.py > fortran-points.json

The points are drawn with a fixed seed: every altitude from the ground to
1000 km, every latitude, longitude, day and hour, quiet to stormy indices;
the last quarter with the 3-hour ap history (switch 9 at -1). Species the
model does not give below 72.5 km are null. The Fortran works in single
precision, so its numbers are good to about seven figures.
"""
import json
import numpy as np
import pymsis

rng = np.random.default_rng(20260927)
N = 400
points = []
for k in range(N):
    storm = k >= 3 * N // 4
    alt = float(rng.choice([rng.uniform(0, 120), rng.uniform(120, 1000)], p=[0.25, 0.75]))
    lat = float(rng.uniform(-90, 90))
    lon = float(rng.uniform(-180, 180))
    date = np.datetime64('2000-01-01T00:00:00') + np.timedelta64(int(rng.uniform(0, 26 * 365.25 * 86400)), 's')
    f107a = float(rng.uniform(65, 250))
    f107 = float(max(60, f107a + rng.normal(0, 25)))
    ap = [float(rng.uniform(0, 60) if not storm else rng.uniform(0, 300)) for _ in range(7)]
    opts = [1.0] * 25
    if storm:
        opts[8] = -1.0  # pymsis's options skip switch 0: options[8] is switch 9
    out = pymsis.calculate(np.array([date]), [lon], [lat], [alt], [f107], [f107a], [ap], options=opts, version=0)[0]
    V = pymsis.Variable
    day = date.astype('datetime64[D]')
    doy = int((day - day.astype('datetime64[Y]')).astype(int)) + 1
    sec = float((date - day).astype(int))
    num = lambda v: None if np.isnan(v) else float(v)
    points.append({
        'doy': doy, 'sec': sec, 'alt': alt, 'lat': lat, 'lon': lon,
        'f107': f107, 'f107a': f107a, 'ap': ap, 'storm': storm,
        'rho': num(out[V.MASS_DENSITY]), 'He': num(out[V.HE]), 'O': num(out[V.O]),
        'N2': num(out[V.N2]), 'O2': num(out[V.O2]), 'Ar': num(out[V.AR]), 'H': num(out[V.H]),
        'N': num(out[V.N]), 'anomO': num(out[V.ANOMALOUS_O]), 'T': num(out[V.TEMPERATURE]),
    })
print(json.dumps({'source': 'pymsis 0.13.0, version=0 (NRLMSISE-00 Fortran)', 'points': points}, separators=(',', ':')).replace('},{', '},\n{'))
