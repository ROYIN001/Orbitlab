/**
 * Retake the landing page's pictures of the app (src/ui/home.ts): each face
 * it shows — Watch, Explore, Engineer, the lessons, the Orbit section — in
 * each of the three languages, into public/home/<face>.<lang>.webp; and the
 * picture a link to the site is shown with where it is shared, the landing
 * page's first screen, into public/social/preview.jpg (index.html's
 * `og:image`). Run by hand after the app's look has changed:
 *
 *   npm run shots                 everything
 *   npm run shots -- th           one language (or several: th,ru)
 *   npm run shots -- orbit en     one face in one language
 *   npm run shots -- preview      the link preview only
 *
 * It builds the app (into a folder of its own, not dist/) and serves it as
 * `vite preview` does — the site as a visitor gets it, with none of the dev
 * server's reloads — and drives a Chromium through
 * playwright-core: the one ORBITLAB_BROWSER names (a path to its program),
 * else Chrome, else Edge, else Playwright's own. Time in the page is virtual
 * — its clock and its animation frames move only when told — and physics
 * runs on the page's thread (`?physics=inline`), so each picture is the same
 * moment of the same flight on every run. The web fonts are asked for (the
 * online data mode, src/ui/web-fonts.ts), so a machine with no network takes
 * the pictures in the system fonts.
 *
 * Node 22.6 or newer, which runs TypeScript with its types stripped.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright-core';
import { build, preview } from 'vite';
import { SHOWCASE_FACES, type ShowcaseFace } from '../src/ui/home-logic.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['en', 'ru', 'th'] as const;
type Lang = typeof LANGS[number];
/** the window the faces are taken in, and the size they are kept at (the same shape, a little smaller) */
const TAKEN = { width: 1440, height: 900 };
const KEPT = { width: 1280, height: 800 };
/** the link preview's size, the one the sites that show it ask for */
const PREVIEW = { width: 1200, height: 630 };
const WEBP_QUALITY = 0.78;
const JPEG_QUALITY = 0.86;
/** software WebGL: the same picture on any machine, with or without a graphics card */
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

const args = process.argv.slice(2).flatMap((a) => a.split(',')).map((a) => a.trim().toLowerCase()).filter(Boolean);
const langs = LANGS.filter((l) => args.includes(l));
const faces = SHOWCASE_FACES.filter((f) => args.includes(f));
const unknown = args.filter((a) => !(LANGS as readonly string[]).includes(a) && !(SHOWCASE_FACES as readonly string[]).includes(a) && a !== 'preview');
if (unknown.length) {
  console.error(`shots: not a language, a face or "preview": ${unknown.join(', ')}`);
  process.exit(1);
}
const previewOnly = args.length > 0 && args.every((a) => a === 'preview');
const takeFaces = previewOnly ? [] : faces.length ? faces : [...SHOWCASE_FACES];
const takeLangs: readonly Lang[] = langs.length ? langs : LANGS;
const takePreview = args.length === 0 || args.includes('preview');

async function launch(): Promise<Browser> {
  const tries: { name: string; go: () => Promise<Browser> }[] = [];
  const path = process.env.ORBITLAB_BROWSER;
  if (path) tries.push({ name: path, go: () => chromium.launch({ executablePath: path, args: GL_ARGS }) });
  tries.push(
    { name: 'Chrome', go: () => chromium.launch({ channel: 'chrome', args: GL_ARGS }) },
    { name: 'Edge', go: () => chromium.launch({ channel: 'msedge', args: GL_ARGS }) },
    { name: 'Playwright’s Chromium', go: () => chromium.launch({ args: GL_ARGS }) },
  );
  for (const t of tries) {
    try { const b = await t.go(); console.log(`shots: taking them in ${t.name}`); return b; } catch { /* the next one */ }
  }
  throw new Error('shots: no browser to take them in — install Chrome or Edge, or name one in ORBITLAB_BROWSER');
}

/** Virtual time: `performance.now` and the animation frames move only by `window.__step(ms, n)`. */
function virtualTime(): void {
  let now = 0;
  const waiting: FrameRequestCallback[] = [];
  performance.now = () => now;
  window.requestAnimationFrame = (cb) => { waiting.push(cb); return waiting.length; };
  (window as unknown as { __step: (ms: number, n?: number) => void }).__step = (ms, n = 1) => {
    for (let i = 0; i < n; i++) {
      now += ms;
      for (const cb of waiting.splice(0)) { try { cb(now); } catch (e) { console.error(e); } }
    }
  };
}

/** The app open at `hash`, in `lang`, its scene built, its fonts in. */
async function open(browser: Browser, base: string, hash: string, lang: Lang, size = TAKEN): Promise<Page> {
  // no service worker: nothing precached behind the page's back, no offer to reload onto a new version
  const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.on('close', () => { void context.close(); });
  page.on('pageerror', (e) => console.warn(`shots: the page threw: ${e.message}`));
  await page.addInitScript(virtualTime);
  await page.addInitScript((l) => {
    try {
      localStorage.setItem('orbitlab.guide.v1', 'dismissed');
      localStorage.setItem('orbitlab.lang', l);
      localStorage.setItem('orbitlab.dataMode', 'online');
    } catch { /* a private window: the defaults */ }
  }, lang);
  await page.goto(`${base}?physics=inline${hash}`);
  for (let i = 0; i < 400; i++) {
    await step(page, 40);
    if (await page.evaluate(() => !!(window as unknown as { orbitlab?: { scene?: unknown } }).orbitlab?.scene)) break;
    await page.waitForTimeout(50);
  }
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.waitForTimeout(2500);
  return page;
}

const step = (page: Page, ms: number, n = 1): Promise<void> =>
  page.evaluate(([m, k]) => (window as unknown as { __step: (ms: number, n?: number) => void }).__step(m, k), [ms, n] as const);

async function settle(page: Page, n = 6, ms = 120): Promise<void> {
  for (let i = 0; i < n; i++) await step(page, ms);
}

/** The featured launch (Soyuz to the space station) flown to `to` and shown still at `at`, s, in `hash`'s face. */
async function flown(page: Page, to: number, at: number, hash?: string): Promise<void> {
  await page.evaluate((t) => {
    const app = (window as unknown as { orbitlab: { startWatch(id: string): void; session: { fastForward(t: number): void; tick(): void } } }).orbitlab;
    app.startWatch('soyuzIss');
    app.session.fastForward(t);
    app.session.tick();
  }, to);
  if (hash) {
    await page.evaluate((h) => { location.hash = h; }, hash);
    await page.waitForTimeout(400);
  }
  await settle(page, 2);
  await page.evaluate((t) => {
    const app = (window as unknown as { orbitlab: { seek(t: number): void; player: { playing: boolean }; playing: boolean } }).orbitlab;
    app.seek(t);
    app.player.playing = false;
    app.playing = false;
  }, at);
  await settle(page, 8, 150);
}

/** Each face: where it opens, and how it is brought to the moment pictured. */
const FACES: Record<ShowcaseFace, { hash: string; ready: (page: Page) => Promise<void> }> = {
  // the boosters falling away, the narration saying so
  watch: { hash: '#/launch/watch', ready: (p) => flown(p, 140, 124) },
  // the second stage on its way, the workspace round it
  explore: { hash: '#/launch/watch', ready: (p) => flown(p, 320, 300, '#/launch/explore') },
  // max-Q, the telemetry beside it
  engineer: { hash: '#/launch/watch', ready: (p) => flown(p, 200, 62, '#/launch/engineer') },
  lessons: {
    hash: '#/launch/explore',
    ready: async (p) => {
      await p.evaluate(() => (window as unknown as { orbitlab: { lessons: { openCatalog(): void } } }).orbitlab.lessons.openCatalog());
      await settle(p, 3);
      await p.waitForTimeout(500);
    },
  },
  orbit: { hash: '#/orbit/explore', ready: (p) => settle(p, 10, 150) },
};

/** A PNG made smaller and written as WebP or JPEG — by the browser's own encoder, so nothing else need be installed. */
async function encode(encoder: Page, png: Buffer, size: { width: number; height: number }, type: 'image/webp' | 'image/jpeg', quality: number): Promise<Buffer> {
  const url = await encoder.evaluate(async ([src, w, h, t, q]) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d')!;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL(t, q);
  }, [`data:image/png;base64,${png.toString('base64')}`, size.width, size.height, type, quality] as const);
  if (!url.startsWith(`data:${type};`)) throw new Error(`shots: this browser cannot write ${type}`);
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
}

function save(path: string, data: Buffer): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
  console.log(`shots: ${path.slice(root.length + 1)} (${Math.round(data.length / 1024)} KB)`);
}

const outDir = mkdtempSync(join(tmpdir(), 'orbitlab-shots-'));
console.log('shots: building the app');
await build({ root, logLevel: 'error', build: { outDir, emptyOutDir: true } });
const server = await preview({ root, logLevel: 'warn', build: { outDir }, preview: { port: 5199, strictPort: false, open: false } });
const base = server.resolvedUrls?.local[0] ?? 'http://localhost:5199/';
const browser = await launch();
try {
  const encoder = await browser.newPage();
  for (const lang of takeLangs) {
    for (const face of takeFaces) {
      const page = await open(browser, base, FACES[face].hash, lang);
      await FACES[face].ready(page);
      const png = await page.screenshot({ timeout: 0 });
      await page.close();
      save(join(root, 'public', 'home', `${face}.${lang}.webp`), await encode(encoder, png, KEPT, 'image/webp', WEBP_QUALITY));
    }
  }
  if (takePreview) {
    // the landing page's first screen, the vehicle on its pad, in English (the page's own language before any is chosen)
    const page = await open(browser, base, '#/home', 'en', PREVIEW);
    await settle(page, 30, 100);
    const png = await page.screenshot({ timeout: 0 });
    await page.close();
    save(join(root, 'public', 'social', 'preview.jpg'), await encode(encoder, png, PREVIEW, 'image/jpeg', JPEG_QUALITY));
  }
} finally {
  await browser.close();
  await server.close();
  rmSync(outDir, { recursive: true, force: true });
}
