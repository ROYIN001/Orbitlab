"""
P2.5 fixture for M01's conjunction-message path: the test conjunctions of
NASA's Conjunction Assessment Risk Analysis team (CARA Analysis Tools,
https://github.com/nasa/CARA_Analysis_Tools, NASA Open Source Agreement),
read from their conjunction data messages (DataFiles/SampleCDMs/) and paired
with the two-dimensional probabilities the SDK's own unit test holds its
Pc2D_Foster to (DistributedMatlab/ProbabilityOfCollision/UnitTests/
Pc2D_Foster_UnitTest.m): Alfano's eleven cases (S. Alfano, "Satellite
Conjunction Monte Carlo Analysis", AAS 09-233, 2009) with their hard-body
radii; and Omitron's case 1 as that test gives it (states and covariances in
the inertial frame, km and km², a combined radius of 20 m). Only the numbers
are kept (states at the closest approach, the position covariances in each
object's radial, transverse and normal axes), not the files.

    git clone --depth 1 https://github.com/nasa/cara_analysis_tools
    python3 make_cara_fixture.py cara_analysis_tools > cara-cases.json
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1])
UNIT = (ROOT / 'DistributedMatlab/ProbabilityOfCollision/UnitTests/Pc2D_Foster_UnitTest.m').read_text()
hbr = [float(x) for x in re.search(r'AlfanoHBR = \{([^}]*)\}', UNIT).group(1).split(',')]
exp = [float(x) for x in re.findall(r'[\d.]+E[-+]\d+', re.search(r'AlfanoExpSolution = \{(.*?)\};', UNIT, re.S).group(1))]
omitron = float(re.search(r'function testCircularHBR.*?expSolution = ([\d.e+-]+);', UNIT, re.S).group(1))

FIELDS = ['X', 'Y', 'Z', 'X_DOT', 'Y_DOT', 'Z_DOT', 'CR_R', 'CT_R', 'CT_T', 'CN_R', 'CN_T', 'CN_N']


def read(path):
    head, objs, cur = {}, [], None
    for line in path.read_text().splitlines():
        m = re.match(r'\s*([A-Z_]+(?: [A-Za-z]+)?)\s*=\s*(\S+)', line)
        if not m:
            continue
        key, val = m.group(1).strip(), m.group(2)
        if key == 'OBJECT':
            cur = {'object': val}
            objs.append(cur)
        elif cur is None:
            head[key] = val
        elif key in FIELDS or key in ('OBJECT_DESIGNATOR', 'REF_FRAME'):
            cur[key] = val if key in ('OBJECT_DESIGNATOR', 'REF_FRAME') else float(val)
    return {'TCA': head['TCA'], 'MISS_DISTANCE': float(head['MISS_DISTANCE']), 'objects': objs}


cases = []
for k in range(11):
    c = read(ROOT / f'DataFiles/SampleCDMs/AlfanoTestCase{k + 1:02d}.cdm')
    cases.append({'name': f'Alfano {k + 1}', 'hbr': hbr[k], 'pc': exp[k], **c})

def vec(name):
    return [float(x) for x in re.search(name + r' = \{\[([^\]]*)\]\}', UNIT).group(1).split()]


def mat(name):
    body = re.search(name + r' = \{\[(.*?)\]\}', UNIT, re.S).group(1)
    return [[float(x) for x in row.split()] for row in body.split(';')]


inline = {'name': 'Omitron 1', 'hbr': 20.0, 'pc': omitron, 'r1': vec('r1'), 'v1': vec('v1'), 'cov1': mat('cov1'),
          'r2': vec('r2'), 'v2': vec('v2'), 'cov2': mat('cov2')}
print(json.dumps({
    'source': 'NASA CARA Analysis Tools (NOSA): DataFiles/SampleCDMs, expected 2-D Pc from UnitTests/Pc2D_Foster_UnitTest.m',
    'units': 'states km, km/s (EME2000); covariances m^2 in each object\'s RTN axes; hbr m',
    'cases': cases,
    'inertial': [inline],
    'inertialUnits': 'km, km/s, km^2 in the inertial frame; hbr m',
}, indent=1))
