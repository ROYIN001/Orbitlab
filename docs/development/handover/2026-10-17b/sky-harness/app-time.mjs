// node app-time.mjs <label> <dist-dir> <checkout> <out.json> [frames] [physical,gradient]
// The production build (dist-dir) in headless Chromium (SwiftShader), driven like the browser journeys
// (<checkout>/tests/browser): a Falcon 9 from the Cape to LEO, paused at a few moments, and the
// interval between animation frames measured over `frames` frames, with the scattering sky and with
// ?sky=gradient. BROWSER_SCALE=1 renders the canvas at full size.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [label, dist, checkout, out, framesArg, skiesArg] = process.argv.slice(2);
const frames = Number(framesArg ?? 12);
const { serve } = await import(pathToFileURL(join(checkout, 'tests/browser/serve.mjs')).href);
const { launchBrowser, createJourney } = await import(pathToFileURL(join(checkout, 'tests/browser/harness.mjs')).href);

const MOMENTS = [-5, 62, 105, 600];
const server = await serve({ root: dist });
const results = {};
for (const sky of (skiesArg ?? 'physical,gradient').split(',')) {
  const browser = await launchBrowser();
  const t = createJourney({ name: `${label}-${sky}`, browser, base: server.url, server, distDir: dist });
  try {
    const app = await t.open({ hash: `${sky === 'gradient' ? '?sky=gradient' : ''}#/launch/explore` });
    const { page } = app;
    await app.mcp('configure_mission', { vehicleId: 'falcon9', siteId: 'cape', orbitId: 'leo' });
    await app.mcp('launch_mission', {});
    await app.mcp('control_playback', { action: 'warp', warp: 1000 });
    await t.until(async () => (await app.mcp('read_flight_state')).headTimeS >= MOMENTS.at(-1) + 30, { timeoutMs: 400_000, intervalMs: 2000 });
    await app.mcp('control_playback', { action: 'pause' });
    results[sky] = {};
    for (const m of MOMENTS) {
      await app.mcp('seek', { timeS: m });
      await page.waitForTimeout(3000);
      const state = await app.mcp('read_flight_state');
      const r = await page.evaluate(async (n) => {
        const info = window.orbitlab.scene.renderer.info.render;
        const sky = window.orbitlab.scene.physicalSkyEnabled, bloom = window.orbitlab.scene.bloomEnabled;
        const f0 = info.frame;
        const ts = [];
        await new Promise((res) => { const f = (x) => { ts.push(x); if (ts.length > n) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
        const d = ts.slice(1).map((x, i) => x - ts[i]);
        const s = [...d].sort((a, b) => a - b);
        return { mean: d.reduce((a, b) => a + b, 0) / d.length, median: s[Math.floor(s.length / 2)], min: s[0], drawn: info.frame - f0, sky, bloom, canvas: [window.orbitlab.scene.renderer.domElement.width, window.orbitlab.scene.renderer.domElement.height] };
      }, frames);
      results[sky][m] = { altKm: state.frame.altitudeKm, ...r };
      console.log(`${label} ${sky} T${m >= 0 ? '+' : ''}${m} s (${state.frame.altitudeKm?.toFixed(1)} km): mean ${r.mean.toFixed(0)} ms, median ${r.median.toFixed(0)} ms over ${frames} frames (drawn ${r.drawn}, sky ${r.sky}, bloom ${r.bloom}, canvas ${r.canvas})`);
      await app.shot?.(`${sky}-${m}`);
    }
    if (app.errors.length) console.log(`page errors: ${app.errors.join(' | ')}`);
  } finally {
    await t.close();
    await browser.close();
  }
}
await writeFile(out, JSON.stringify(results, null, 1));
await server.close();
