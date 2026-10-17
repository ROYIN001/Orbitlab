# python3 -I speckle.py <dir> [...] : pixels standing out of their 5x5 neighbourhood's median by more than 40 (stars included)
import sys, os
import numpy as np
from PIL import Image, ImageFilter
for d in sys.argv[1:]:
    for f in sorted(os.listdir(d)):
        if not f.endswith('.png'): continue
        im = Image.open(os.path.join(d, f)).convert('L')
        a = np.asarray(im).astype(int)
        m = np.asarray(im.filter(ImageFilter.MedianFilter(5))).astype(int)
        r = a - m
        print(f'{d.split("/")[-1]:8s} {f:22s} bright outliers {int((r > 40).sum()):6d}  dark outliers {int((r < -40).sum()):6d}')
