// node pair-time.mjs <labelA> <checkoutA> <labelB> <checkoutB> <out.json> <frames> [view ...]
// Both harness builds open in one browser; per view, frames alternate A, B, A, B … so that the
// shared machine's load falls on both alike. Each frame is `render()` with the GPU finished
// (readPixels of one pixel). Reports each side's mean and median and the median of the paired ratios.
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { chromium } from 'playwright';

const [la, ca, lb, cb, out, framesArg, ...views] = process.argv.slice(2);
const frames = Number(framesArg);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg' };
async function host(label, checkout) {
  const root = resolve(import.meta.dirname, 'out', label);
  const server = createServer(async (req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = p.startsWith('/textures/') ? join(checkout, 'public', p) : join(root, p === '/' ? 'index.html' : p);
    try { const body = await readFile(file); res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }); res.end(body); } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, url: `http://127.0.0.1:${server.address().port}/` };
}
const A = await host(la, ca), B = await host(lb, cb);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const open = async (h) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto(h.url);
  await page.waitForFunction(() => window.harnessReady, null, { timeout: 120_000 });
  await page.evaluate(() => window.harnessReady);
  return page;
};
const pa = await open(A), pb = await open(B);
const list = views.length ? views : await pa.evaluate(() => window.views);
const results = {};
for (const v of list) {
  // pose and warm up both (time() poses the view and renders 3 frames before measuring)
  await pa.evaluate((n) => window.time(n, 1), v);
  await pb.evaluate((n) => window.time(n, 1), v);
  const ta = [], tb = [];
  for (let i = 0; i < frames; i++) {
    const first = i % 2 === 0 ? [pa, ta] : [pb, tb], second = i % 2 === 0 ? [pb, tb] : [pa, ta];
    for (const [p, t] of [first, second]) t.push(await p.evaluate(() => window.frameOnce()));
  }
  const stat = (t) => { const s = [...t].sort((x, y) => x - y); return { mean: t.reduce((x, y) => x + y, 0) / t.length, median: s[Math.floor(s.length / 2)] }; };
  const ratios = ta.map((x, i) => tb[i] / x).sort((x, y) => x - y);
  results[v] = { [la]: stat(ta), [lb]: stat(tb), medianRatio: ratios[Math.floor(ratios.length / 2)], ratioQuartiles: [ratios[Math.floor(ratios.length / 4)], ratios[Math.floor(3 * ratios.length / 4)]], a: ta, b: tb };
  const r = results[v];
  console.log(`${v}: ${la} ${r[la].mean.toFixed(0)} ms (median ${r[la].median.toFixed(0)}), ${lb} ${r[lb].mean.toFixed(0)} ms (median ${r[lb].median.toFixed(0)}); ${lb}/${la} paired median ${r.medianRatio.toFixed(3)} (quartiles ${r.ratioQuartiles.map((x) => x.toFixed(3)).join('–')}) over ${frames} pairs`);
}
await writeFile(out, JSON.stringify(results, null, 1));
await browser.close();
A.server.close(); B.server.close();
