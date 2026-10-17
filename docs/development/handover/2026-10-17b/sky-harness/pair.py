# python3 -I pair.py <dirA> <dirB> <outdir> : stacks A over B per view (half size) for viewing
import sys, os
from PIL import Image
a, b, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
for f in sorted(os.listdir(a)):
    if not f.endswith('.png') or not os.path.exists(os.path.join(b, f)): continue
    ia, ib = Image.open(os.path.join(a, f)).convert('RGB'), Image.open(os.path.join(b, f)).convert('RGB')
    w, h = ia.size
    s = Image.new('RGB', (w, h * 2 + 8), (255, 0, 255))
    s.paste(ia, (0, 0)); s.paste(ib, (0, h + 8))
    s.resize((w * 3 // 4, (h * 2 + 8) * 3 // 4)).save(os.path.join(out, f))
