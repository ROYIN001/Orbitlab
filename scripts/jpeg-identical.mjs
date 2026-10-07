/**
 * Lossless JPEG re-encodes keep every pixel (T-offset, a D-38 offset). A
 * precached picture under public/ may be re-encoded from its own DCT
 * coefficients, changing only the Huffman coding and the progressive scan
 * layout (first done for the three progressive Earth textures). This checks
 * that claim, file by file:
 *
 *   node scripts/jpeg-identical.mjs [--base <git ref>] [--chromium]
 *
 * For each JPEG under public/ whose bytes differ from the same path at the
 * base ref (default origin/main), it decodes the base bytes and the working
 * tree's bytes and compares SHA-256 of the RGBA pixels:
 *   - jpeg-js, the copy bundled in playwright-core (already installed);
 *   - with --chromium, the browser's own decoder (Playwright; CHROMIUM=/path
 *     to use a browser of your own), through three paths the app uses: an
 *     <img> drawn on a 2-D canvas, createImageBitmap without colour
 *     conversion, and a WebGL texture made from the <img>, read back.
 * It also checks the metadata: every APPn (JFIF, Exif, XMP, ICC), COM and DRI
 * segment byte for byte, in the same order, the same quantisation tables, and
 * the frame header equal but for baseline (SOF0) / progressive (SOF2).
 *
 *   node scripts/jpeg-identical.mjs --base <ref> --record <path>...
 * writes tests/verification/jpeg-pixels.json from those files' bytes at the
 * base ref: the hashes tests/verification/jpeg-pixels.test.mjs checks the
 * committed files against. Exit code 1 when anything differs.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const RECORD_PATH = join(root, 'tests/verification/jpeg-pixels.json');

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Marker names for the report. */
const MARKER_NAMES = { 0xc0: 'SOF0', 0xc1: 'SOF1', 0xc2: 'SOF2', 0xc4: 'DHT', 0xda: 'SOS', 0xdb: 'DQT', 0xdd: 'DRI', 0xfe: 'COM' };
const markerName = (m) => MARKER_NAMES[m] ?? (m >= 0xe0 && m <= 0xef ? `APP${m - 0xe0}` : `0x${m.toString(16)}`);

/**
 * Every marker segment of a JPEG from SOI to EOI, as { marker, start, end }
 * (`end` exclusive; an SOS segment ends at its header, its entropy-coded data
 * is skipped). Throws on a file that is not a well-formed JPEG.
 */
export function jpegSegments(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('not a JPEG (no SOI)');
  const segments = [];
  let i = 2;
  for (;;) {
    if (i + 1 >= bytes.length) throw new Error('no EOI');
    if (bytes[i] !== 0xff) throw new Error(`no marker at byte ${i}`);
    const marker = bytes[i + 1];
    if (marker === 0xff) { i += 1; continue; } // fill byte
    if (marker === 0xd9) return { segments, eoi: i + 2 };
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    segments.push({ marker, start: i, end: i + 2 + length });
    i += 2 + length;
    if (marker === 0xda) {
      // entropy-coded data: runs to the next marker that is neither a stuffed 0x00 nor a restart (RST0..7)
      while (i + 1 < bytes.length && !(bytes[i] === 0xff && bytes[i + 1] !== 0x00 && !(bytes[i + 1] >= 0xd0 && bytes[i + 1] <= 0xd7))) i += 1;
    }
  }
}

/**
 * The quantisation tables of every DQT segment, in order, each as its
 * precision/id byte and values. An encoder may write two tables in one
 * segment or one per segment; the tables are what decoding uses.
 */
function quantTables(bytes, segments) {
  const tables = [];
  for (const s of segments.filter((x) => x.marker === 0xdb)) {
    for (let i = s.start + 4; i < s.end;) {
      const size = 1 + 64 * ((bytes[i] >> 4) + 1);
      tables.push(bytes.subarray(i, i + size));
      i += size;
    }
  }
  return tables;
}

/**
 * What a lossless re-encode must keep: the frame header (precision, size,
 * components, sampling, quantisation table per component) without its SOF
 * type, the quantisation tables, and every APPn (JFIF, Exif, XMP, ICC), COM
 * and DRI segment byte for byte, in order. Huffman tables (DHT), the scans
 * (SOS) and how the tables are grouped into DQT segments are what it may
 * change.
 */
export function jpegMetadata(bytes) {
  const { segments, eoi } = jpegSegments(bytes);
  const frames = segments.filter((s) => s.marker >= 0xc0 && s.marker <= 0xcf && s.marker !== 0xc4 && s.marker !== 0xc8 && s.marker !== 0xcc);
  if (frames.length !== 1) throw new Error(`expected one frame header, found ${frames.length}`);
  const kept = segments.filter((s) => (s.marker >= 0xe0 && s.marker <= 0xef) || s.marker === 0xfe || s.marker === 0xdd);
  const tables = quantTables(bytes, segments);
  const frame = frames[0];
  const hash = createHash('sha256').update(bytes.subarray(frame.start + 2, frame.end));
  for (const table of tables) hash.update(table);
  for (const s of kept) hash.update(bytes.subarray(s.start, s.end));
  return {
    mode: markerName(frame.marker),
    scans: segments.filter((s) => s.marker === 0xda).length,
    segments: [...kept.map((s) => `${markerName(s.marker)}:${s.end - s.start - 2}`), ...tables.map((t) => `Q${t[0] & 15}`)],
    trailing: bytes.length - eoi,
    sha256: hash.digest('hex'),
  };
}

/** jpeg-js as playwright-core bundles it (playwright is a devDependency). */
function jpegjs() {
  const require = createRequire(join(root, 'package.json'));
  const bundle = require('playwright-core/lib/utilsBundle');
  if (typeof bundle.jpegjs?.decode !== 'function') throw new Error('playwright-core no longer bundles jpeg-js (lib/utilsBundle jpegjs)');
  return bundle.jpegjs;
}

/** Decodes with jpeg-js to RGBA: { width, height, sha256 } of the pixel buffer. */
export function decodeJpegJs(bytes) {
  const image = jpegjs().decode(bytes, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 1024 });
  return { width: image.width, height: image.height, sha256: sha256(image.data) };
}

/** The tracked JPEGs under public/, relative to the repository root. */
export function publicJpegs() {
  return execFileSync('git', ['ls-files', '-z', '--', 'public'], { cwd: root, encoding: 'utf8' })
    .split('\0').filter((p) => /\.jpe?g$/i.test(p)).sort();
}

function baseBytes(ref, path) {
  return execFileSync('git', ['show', `${ref}:${path}`], { cwd: root, maxBuffer: 64 * 1024 * 1024 });
}

/** Opens Chromium once; `decode(bytes)` gives the three paths' RGBA hashes. */
async function chromiumDecoder() {
  const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM || undefined,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage();
  const files = new Map();
  await page.route('http://127.0.0.1:9/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>jpeg</title>' });
    return route.fulfill({ contentType: 'image/jpeg', body: files.get(path) });
  });
  await page.goto('http://127.0.0.1:9/');
  const version = browser.version();
  let n = 0;
  return {
    version,
    async decode(bytes) {
      const path = `/${n++}.jpg`;
      files.set(path, bytes);
      try {
        return await page.evaluate(async (url) => {
          const hex = async (data) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map((b) => b.toString(16).padStart(2, '0')).join('');
          const canvas2d = (w, h) => {
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            return canvas.getContext('2d', { willReadFrequently: true });
          };
          const img = new Image();
          img.src = url;
          await img.decode();
          const w = img.naturalWidth, h = img.naturalHeight;
          // 1. <img> on a 2-D canvas (the browser's colour management, as the map and the photos are shown)
          const a = canvas2d(w, h);
          a.drawImage(img, 0, 0);
          const img2d = await hex(a.getImageData(0, 0, w, h).data);
          // 2. createImageBitmap, no colour conversion: the decoder's own output
          const bitmap = await createImageBitmap(await (await fetch(url)).blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
          const b = canvas2d(w, h);
          b.drawImage(bitmap, 0, 0);
          const raw = await hex(b.getImageData(0, 0, w, h).data);
          bitmap.close();
          // 3. a WebGL texture from the <img> (as three.js uploads the Earth textures), read back
          const gl = document.createElement('canvas').getContext('webgl2');
          const texture = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          const framebuffer = gl.createFramebuffer();
          gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
          const pixels = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          const webgl = await hex(pixels);
          const error = gl.getError();
          gl.getExtension('WEBGL_lose_context')?.loseContext();
          return { width: w, height: h, img2d, raw, webgl, glError: error };
        }, `http://127.0.0.1:9${path}`);
      } finally {
        files.delete(path);
      }
    },
    close: () => browser.close(),
  };
}

async function main(argv) {
  const arg = (name) => { const at = argv.indexOf(name); return at >= 0 ? argv[at + 1] : undefined; };
  const base = arg('--base') ?? 'origin/main';
  const baseSha = execFileSync('git', ['rev-parse', '--short', base], { cwd: root, encoding: 'utf8' }).trim();
  const withChromium = argv.includes('--chromium');
  const recordAt = argv.indexOf('--record');
  const recordEnd = argv.findIndex((a, i) => i > recordAt && a.startsWith('--'));
  const record = recordAt >= 0 ? argv.slice(recordAt + 1, recordEnd < 0 ? undefined : recordEnd) : undefined;
  if (record && record.length === 0) throw new Error('--record needs the paths to record, e.g. public/textures/earth_atmos_4096.jpg');

  const changed = [];
  for (const path of record ?? publicJpegs()) {
    let before;
    try { before = baseBytes(base, path); } catch { if (record) throw new Error(`${path} is not at ${base}`); continue; } // new at this ref: nothing to compare with
    const after = readFileSync(join(root, path));
    if (record || !before.equals(after)) changed.push({ path, before, after });
  }
  const browser = withChromium ? await chromiumDecoder() : undefined;
  if (browser) console.log(`Chromium ${browser.version}`);
  console.log(`base ${baseSha}; ${changed.length} JPEG(s) ${record ? 'to record' : 'changed'} under public/\n`);

  let failures = 0;
  const recorded = {};
  const rows = [];
  for (const { path, before, after } of changed) {
    const fail = (why) => { failures += 1; console.log(`FAIL ${path}: ${why}`); };
    const mb = jpegMetadata(before), ma = jpegMetadata(after);
    if (mb.sha256 !== ma.sha256) fail(`metadata differs: ${mb.segments.join(' ')} -> ${ma.segments.join(' ')}`);
    if (mb.trailing !== 0 || ma.trailing !== 0) fail(`bytes after EOI: ${mb.trailing} -> ${ma.trailing}`);
    const jb = decodeJpegJs(before), ja = decodeJpegJs(after);
    if (jb.sha256 !== ja.sha256 || jb.width !== ja.width || jb.height !== ja.height) fail(`jpeg-js pixels differ: ${jb.sha256} -> ${ja.sha256}`);
    const row = { path, bytes: [before.length, after.length], mode: [mb.mode, ma.mode], scans: [mb.scans, ma.scans], size: `${jb.width}x${jb.height}`, segments: mb.segments, jpegjs: [jb.sha256, ja.sha256] };
    if (browser) {
      const cb = await browser.decode(before), ca = await browser.decode(after);
      for (const k of ['img2d', 'raw', 'webgl']) if (cb[k] !== ca[k]) fail(`Chromium ${k} pixels differ: ${cb[k]} -> ${ca[k]}`);
      if (cb.glError || ca.glError) fail(`WebGL error ${cb.glError} / ${ca.glError}`);
      if (cb.width !== jb.width || cb.height !== jb.height) fail(`Chromium size ${cb.width}x${cb.height}`);
      row.chromium = { img2d: [cb.img2d, ca.img2d], raw: [cb.raw, ca.raw], webgl: [cb.webgl, ca.webgl] };
    }
    rows.push(row);
    recorded[path] = { width: jb.width, height: jb.height, rgbaSha256: jb.sha256, metadataSha256: mb.sha256 };
  }
  await browser?.close();

  console.log('| file | bytes before → after | mode | scans | metadata | RGBA SHA-256, jpeg-js (before = after) |' + (browser ? ' Chromium <img>→2-D | Chromium bitmap, no conversion | Chromium WebGL |' : ''));
  console.log('|---|---|---|---|---|---|' + (browser ? '---|---|---|' : ''));
  let saved = 0;
  for (const r of rows) {
    saved += r.bytes[0] - r.bytes[1];
    const same = (pair) => (pair[0] === pair[1] ? `\`${pair[0]}\` (equal)` : `**\`${pair[0]}\` ≠ \`${pair[1]}\`**`);
    console.log(`| ${r.path} | ${r.bytes[0]} → ${r.bytes[1]} (${r.bytes[1] - r.bytes[0]}) | ${r.mode.join(' → ')} | ${r.scans.join(' → ')} | ${r.segments.join(' ')} | ${same(r.jpegjs)} |`
      + (r.chromium ? ` ${same(r.chromium.img2d)} | ${same(r.chromium.raw)} | ${same(r.chromium.webgl)} |` : ''));
  }
  console.log(`\nbytes saved: ${saved} (${(saved / 1000).toFixed(1)} kB)`);
  if (record) {
    const body = { _note: `RGBA SHA-256 (jpeg-js) and metadata SHA-256 of these JPEGs as decoded from ${baseSha}, before their lossless re-encode (T-offset); written by node scripts/jpeg-identical.mjs --base ${baseSha} --record ${record.join(' ')}`, files: recorded };
    writeFileSync(RECORD_PATH, `${JSON.stringify(body, null, 2)}\n`);
    console.log(`recorded ${Object.keys(recorded).length} file(s) to ${RECORD_PATH}`);
  }
  console.log(failures ? `\n${failures} difference(s)` : '\npixels and metadata identical');
  return failures ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = await main(process.argv.slice(2));
}
