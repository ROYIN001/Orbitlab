/**
 * The app's icons, made from the Orbitlab mark that index.html draws once
 * (#orbitlab-logo in its #logo-sprite): the favicon written into index.html
 * as a data URI, and the PWA and home-screen icons in public/icons/.
 *
 *   node scripts/icons.mjs        (CHROMIUM=/path/to/chrome to use a browser of your own)
 *
 * Run it again whenever the mark in index.html changes.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = join(root, 'index.html');
const html = readFileSync(htmlPath, 'utf8');

const sprite = html.match(/<svg id="logo-sprite"[\s\S]*?<\/svg>/)?.[0];
if (!sprite) throw new Error('index.html has no #logo-sprite');
const clips = [...sprite.matchAll(/<clipPath[\s\S]*?<\/clipPath>/g)].map((m) => m[0]).join('');
const mark = sprite.match(/<symbol id="orbitlab-logo"[^>]*>([\s\S]*?)<\/symbol>/)?.[1];
if (!mark) throw new Error('index.html has no #orbitlab-logo symbol');

/** The app's ground behind the mark (the old icons' colour). */
const GROUND = '#0a1017';

/**
 * The mark on the ground, on a 200 grid: `rounded` gives the ground its own
 * corners (a browser tab, an Android icon that keeps its shape), `scale`
 * shrinks the mark, for the safe zone of a maskable icon.
 */
function icon({ rounded, scale }) {
  const ground = rounded
    ? `<rect width="200" height="200" rx="44" fill="${GROUND}"/>`
    : `<rect width="200" height="200" fill="${GROUND}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs>${clips}</defs>${ground}`
    + `<g style="--logo-ground: ${GROUND}" transform="translate(100 102) scale(${scale}) translate(-100 -100)">${mark}</g></svg>`;
}

// the favicon, as the data URI index.html already uses (no extra request, works offline)
const favicon = icon({ rounded: true, scale: 0.86 }).replace(/\s+/g, ' ');
const dataUri = `data:image/svg+xml,${encodeURIComponent(favicon).replace(/%20/g, ' ').replace(/%3D/g, '=').replace(/%2F/g, '/').replace(/%3A/g, ':').replace(/%22/g, "'")}`;
const withFavicon = html.replace(/<link rel="icon" href="[^"]*" \/>/, `<link rel="icon" href="${dataUri.replace(/"/g, "'")}" />`);
if (withFavicon === html && !html.includes(dataUri)) throw new Error('index.html has no <link rel="icon" href="…" />');
writeFileSync(htmlPath, withFavicon);

const { chromium } = await import('playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const OUT = [
  { file: 'icon-192.png', size: 192, rounded: true, scale: 0.86, transparent: true },
  { file: 'icon-512.png', size: 512, rounded: true, scale: 0.86, transparent: true },
  // maskable: the platform crops to its own shape, so the mark stays inside the central 80 % circle
  { file: 'icon-maskable-512.png', size: 512, rounded: false, scale: 0.66, transparent: false },
  // iOS rounds the corners itself and wants no transparency
  { file: 'apple-touch-icon.png', size: 180, rounded: false, scale: 0.8, transparent: false },
];
for (const o of OUT) {
  const page = await browser.newPage({ viewport: { width: o.size, height: o.size } });
  await page.setContent(`<html><body style="margin:0;background:transparent">${icon(o).replace('<svg ', `<svg width="${o.size}" height="${o.size}" `)}</body></html>`);
  await page.screenshot({ path: join(root, 'public/icons', o.file), omitBackground: o.transparent });
  await page.close();
  console.log(`public/icons/${o.file}  ${o.size}×${o.size}`);
}
await browser.close();
console.log('index.html  favicon');
