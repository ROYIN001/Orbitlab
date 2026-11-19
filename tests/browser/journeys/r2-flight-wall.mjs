/**
 * Redesign A step 2, S5: F2's flight wall, the telemetry panel's Flight wall
 * preset in Engineer (src/ui/flight-wall.ts, src/ui/telemetry-layout.ts). Leg
 * (e) of r2-event-jump until that journey was split; it starts where the leg
 * did, on Engineer's first launch paused just after liftoff, after r2-event-
 * jump's jump to liftoff in the menu (liftoffJump).
 *
 * (e) Engineer, F2's flight wall: the wall preset shows six status rows and a
 *     drawn ground track, with the Earth picture while paused, instead of the charts, keeps the comparison, event log,
 *     play button and clock, fits TH and RU at 390 and 320 px, and is not
 *     stored: after a reload the earlier preset is back.
 */
import { liftoffJump, setLanguage, shortLabel } from './r2-event-jump.mjs';

export const smoke = true;

const RESPOND_MS = 20_000;

export default async function r2FlightWall(t) {
  const app = await t.open({ hash: '#/launch/engineer', viewport: 'laptop-1280x800' });
  const { page } = app;
  try {
    if (!await liftoffJump(t, app)) return;
    await flightWall(t, app);
    // (e) the wall preset is never written: chosen again over the stored Orbit, a reload brings Orbit back.
    // The wall has to be the choice at the reload: after Orbit, Orbit comes back whether or not the wall was written.
    await preset(page).selectOption('wall');
    await page.evaluate(() => { location.hash = '#/launch/engineer'; });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await app.ready();
    await preset(page).waitFor({ state: 'attached' });
    const stored = await preset(page).inputValue();
    t.check(stored === 'orbit', `(e) after a reload the preset is ${stored}, not the Orbit stored before the wall`);
  } finally {
    app.checkErrors();
    await app.context.close();
  }
}

const preset = (page) => page.locator('#telemetry .tel-cards select');

/** (e) F2: the flight wall preset, on the paused Engineer flight. */
async function flightWall(t, app) {
  const { page } = app;
  await preset(page).selectOption('orbit');
  await trackNotDrawn(t, page, '(e) Orbit preset');
  // Chosen with the frames held from the track's first draw on: that draw comes before the Earth picture has
  // loaded, and the picture alone must draw it again. Without it the canvas stays the flat fill, its four
  // commonest colours ~72 % of its pixels; with the picture ~14 % (measured at this viewport).
  const flat = await page.evaluate(() => new Promise((done) => {
    const c = document.querySelector('#telemetry .wall-track canvas');
    const select = document.querySelector('#telemetry .tel-cards select');
    select.value = 'wall';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const poll = setInterval(() => {
      // the first draw sizes the backing store to the box (src/ui/map.ts)
      if (!c.clientWidth || c.width !== Math.round(c.clientWidth * dpr)) return;
      clearInterval(poll);
      window.__holdFrames(true);
      setTimeout(() => {
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        window.__holdFrames(false);
        const counts = new Map();
        for (let i = 0; i < d.length; i += 4) { const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; counts.set(k, (counts.get(k) ?? 0) + 1); }
        done([...counts.values()].sort((a, b) => b - a).slice(0, 4).reduce((a, b) => a + b, 0) / (d.length / 4));
      }, 3000);
    }, 5);
  }));
  t.check(flat < 0.4, `(e) paused, the ground track has no Earth picture: its four commonest colours are ${(flat * 100).toFixed(0)} % of the canvas`);
  const rows = page.locator('#telemetry .wall-status > div:not(.hidden)');
  t.check(await t.until(async () => await rows.count() === 6, { timeoutMs: RESPOND_MS }), `(e) the wall shows ${await rows.count()} status rows, not 6`);
  t.check(await page.locator('#telemetry canvas.chart[data-chart="q"]').isHidden(), '(e) the wall preset left the charts on');
  const drawn = await t.until(() => page.evaluate(() => {
    const c = document.querySelector('#telemetry .wall-track canvas');
    // the map sizes its backing store to the box at the device pixel ratio when it draws (src/ui/map.ts)
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    return c && c.clientWidth > 0 && c.width === Math.round(c.clientWidth * dpr) && c.height === Math.round(c.clientHeight * dpr);
  }), { timeoutMs: RESPOND_MS });
  t.check(drawn, '(e) the ground-track canvas was not drawn');
  for (const sel of ['#telemetry .telemetry-compare', '#telemetry .events', '#btn-play', '#clock']) {
    t.check(await page.locator(sel).isVisible(), `(e) the wall preset hid ${sel}`);
  }
  // a language change rebuilds the panel but keeps the one canvas the ground-track map draws on
  await page.evaluate(() => { document.querySelector('#telemetry .wall-track canvas').__kept = 1; });
  for (const lang of ['th', 'ru']) {
    await setLanguage(t, app, lang);
    const kept = await page.evaluate(() => [...document.querySelectorAll('#telemetry .wall-track canvas')].map((c) => c.__kept === 1));
    t.check(kept.length === 1 && kept[0], `(e) after switching to ${lang} the track canvases are ${JSON.stringify(kept)}, not the one kept canvas`);
    const name = shortLabel(lang, 'map.groundTrack');
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 800 });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const m = await page.evaluate(() => {
        const over = (el) => el.scrollWidth > el.clientWidth;
        const shown = [...document.querySelectorAll('#telemetry .wall-status > div')].filter((r) => r.getClientRects().length);
        const legend = document.querySelector('#telemetry .wall-legend');
        const root = document.scrollingElement;
        return { rows: shown.length, rowOver: shown.filter(over).map((r) => r.textContent), legendOver: over(legend),
          docSW: root.scrollWidth, docCW: root.clientWidth, label: document.querySelector('#telemetry .wall-track canvas').getAttribute('aria-label') };
      });
      const where = `(e) ${lang.toUpperCase()} ${width} px`;
      t.check(m.rows === 6, `${where}: ${m.rows} status rows shown`);
      t.check(m.rowOver.length === 0, `${where}: status rows overflow: ${m.rowOver.join(' | ')}`);
      t.check(!m.legendOver, `${where}: the map legend overflows`);
      t.check(m.docSW <= m.docCW, `${where}: the page scrolls sideways (${m.docSW}/${m.docCW})`);
      t.check(m.label === name, `${where}: the ground track is named "${m.label}", not "${name}"`);
    }
  }
  await setLanguage(t, app, 'en');
  await page.setViewportSize({ width: 1280, height: 800 });
  await app.shot('engineer-flight-wall');
  // back to Orbit (stored, as before the wall): the hidden card is not drawn
  await preset(page).selectOption('orbit');
  await trackNotDrawn(t, page, '(e) Orbit preset after the wall');
}

/** While its card is hidden nothing draws on the ground-track canvas: no 2-D context is taken in 2 s (the panel redraws every 0.5 s). */
async function trackNotDrawn(t, page, where) {
  await page.evaluate(() => {
    const c = document.querySelector('#telemetry .wall-track canvas');
    c.__draws = 0;
    c.getContext = function (...a) { c.__draws++; return HTMLCanvasElement.prototype.getContext.apply(this, a); };
  });
  await page.waitForTimeout(2000);
  const draws = await page.evaluate(() => {
    const c = document.querySelector('#telemetry .wall-track canvas');
    delete c.getContext;
    return c.__draws;
  });
  t.check(draws === 0, `${where}: the hidden ground-track canvas was drawn ${draws} times`);
}
