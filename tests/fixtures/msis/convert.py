"""
NRLMSISE-00's coefficients, from the C release's nrlmsise-00_data.c, into
src/physics/propagator/msis-data.ts:

    python3 convert.py nrlmsise-00_data.c > ../../../src/physics/propagator/msis-data.ts

Every number is kept to the six significant figures it is printed with.
SAM, declared there but read nowhere, is left out.
"""
import re, sys

HEADER = open(__file__.replace('convert.py', 'header.txt')).read()
src = open(sys.argv[1]).read()
src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
out = []
for m in re.finditer(r'double\s+(\w+)((?:\[\d+\])+)\s*=\s*(\{.*?\});', src, flags=re.S):
    name, dims, body = m.group(1), [int(d) for d in re.findall(r'\[(\d+)\]', m.group(2))], m.group(3)
    if name == 'sam':
        continue
    nums = [float(x) for x in re.findall(r'[-+]?\d+\.\d+E[-+]\d+', body)]
    if len(dims) == 1:
        n = dims[0]
        vals = nums + [0.0] * (n - len(nums))
        assert len(vals) == n, (name, len(nums))
        rows = [vals]
    else:
        r, n = dims
        # split per inner brace
        inner = re.findall(r'\{([^{}]*)\}', body[1:-1])
        assert len(inner) == r, (name, len(inner))
        rows = []
        for blk in inner:
            v = [float(x) for x in re.findall(r'[-+]?\d+\.\d+E[-+]\d+', blk)]
            assert len(v) <= n, (name, len(v))
            rows.append(v + [0.0] * (n - len(v)))
    fmt = lambda v: repr(v) if v != int(v) or abs(v) >= 1e15 else (str(int(v)) if v == int(v) else repr(v))
    def row(v): return 'f([' + ', '.join(('%.6g' % x).replace('e+0', 'e').replace('e-0', 'e-').replace('e+', 'e') for x in v) + '])'
    if len(dims) == 1:
        out.append(f'export const {name} = {row(rows[0])};')
    else:
        out.append(f'export const {name} = [\n' + ',\n'.join('  ' + row(v) for v in rows) + ',\n];')
    print(name, dims, sum(len(r) for r in rows), file=sys.stderr)
print(HEADER + '\n\n'.join(out))
