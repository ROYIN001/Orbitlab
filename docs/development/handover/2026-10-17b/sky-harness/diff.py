# python3 -I diff.py <dirA> <dirB> : per view, pixels that differ and the largest channel difference
import sys, os
import numpy as np
from PIL import Image
a, b = sys.argv[1:3]
for f in sorted(os.listdir(a)):
    if not f.endswith('.png') or not os.path.exists(os.path.join(b, f)): continue
    x = np.asarray(Image.open(os.path.join(a, f)).convert('RGB')).astype(int)
    y = np.asarray(Image.open(os.path.join(b, f)).convert('RGB')).astype(int)
    d = np.abs(x - y).max(axis=2)
    print(f'{f:24s} differing pixels {int((d > 0).sum()):7d} of {d.size}, max diff {int(d.max())}, >8: {int((d > 8).sum())}')
