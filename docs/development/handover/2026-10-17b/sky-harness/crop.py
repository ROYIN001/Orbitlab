# python3 -I crop.py <out.png> <x0> <y0> <x1> <y1> <scale> <img> [<img> ...] : the same crop of each image, stacked, scaled
import sys
from PIL import Image
out, x0, y0, x1, y1, sc = sys.argv[1], *map(int, sys.argv[2:6]), float(sys.argv[6])
ims = [Image.open(p).convert('RGB').crop((x0, y0, x1, y1)) for p in sys.argv[7:]]
w, h = ims[0].size
s = Image.new('RGB', (w, (h + 4) * len(ims)), (255, 0, 255))
for i, im in enumerate(ims): s.paste(im, (0, i * (h + 4)))
s.resize((int(w * sc), int(s.size[1] * sc)), Image.NEAREST).save(out)
