/**
 * G2 hold / finding F5 (CO-3 report §3–§4), the Explore flight: the launch
 * scene keeps its minimum size at every desktop size of the G2 matrix, and the
 * tools around it never take that space or cover it. The checks (S1–S4) are
 * tests/browser/scene-floor.mjs; r2-viewport-matrix makes the same checks on
 * the Engineer flight at the same sizes.
 *
 * One fresh desktop context flies the default mission at the Explore level
 * (the setup panel stays beside the scene there, D-36.A1), pauses it, and is
 * resized through the CO-3 desktop presets in TH, EN and RU with the
 * first-use guide open (a first visit) and then closed (its Skip button).
 */
import { viewportSize } from '../harness.mjs';
import { checkSceneFloor, sceneMin } from '../scene-floor.mjs';

export const timeoutMs = 900_000;

const RESPOND_MS = 20_000;
const LANGS = ['th', 'en', 'ru'];
const DESKTOP = ['laptop-1280x800', 'laptop-1366x768', 'desktop-1920x1080', 'laptop-1100x650', 'projector-1280x720', 'tablet-768x1024',
  'edge-860x800', 'edge-861x800', 'edge-1180x800', 'edge-1181x800',
  'zoom125-1280x800', 'zoom150-1280x800', 'zoom125-1366x768', 'zoom150-1366x768'];

export default async function r2ViewportSceneFloor(t) {
  const app = await t.open({ hash: '#/launch/explore', viewport: DESKTOP[0], lang: 'th', guide: true });
  const { page } = app;
  try {
    await page.locator('#setup .launch-button').waitFor();
    const launched = await app.mcp('launch_mission', {});
    t.check(launched.ok, `explore: launch_mission ${JSON.stringify(launched)}`);
    if (!t.check(await t.until(() => page.evaluate(() => document.body.dataset.flightStage === 'flight'), { timeoutMs: RESPOND_MS }),
      'explore: the flight stage never began')) return;
    await app.mcp('control_playback', { action: 'pause' });
    const guide = page.locator('#first-use-guide');
    t.check(await guide.isVisible(), 'explore: the first-use guide is not open on a first visit');
    const seen = {};
    for (const state of ['open', 'closed']) {
      if (state === 'closed') {
        await page.locator('#first-use-guide .help-guide-actions button').last().click();
        t.check(await t.until(() => guide.isHidden(), { timeoutMs: 5000 }), 'explore: Skip did not close the first-use guide');
      }
      for (const lang of LANGS) {
        await setLanguage(t, app, lang);
        for (const preset of DESKTOP) {
          await resize(t, app, preset);
          const scene = await checkSceneFloor(t, app, preset, state, `explore ${preset} ${lang.toUpperCase()} guide ${state}`);
          (seen[`${preset} ${lang.toUpperCase()}`] ??= {})[state] = scene;
        }
      }
    }
    t.log('scene (CSS px, #viewport; guide open → closed) / minimum:');
    for (const [key, s] of Object.entries(seen)) {
      t.log(`  explore ${key}: ${s.open?.w}×${s.open?.h} → ${s.closed?.w}×${s.closed?.h} / ${Math.round(sceneMin(viewportSize(key.split(' ')[0]).height))}`);
    }
  } finally {
    app.checkErrors();
    await app.context.close();
  }
}

/** Resize, then wait until the root has the preset's size and two reads of the scene's box agree (as r2-viewport-matrix). */
async function resize(t, app, preset) {
  const { width, height } = viewportSize(preset);
  await app.page.setViewportSize({ width, height });
  await app.page.evaluate(() => window.scrollTo(0, 0));
  let last = '';
  for (let i = 0; i < 20; i++) {
    const now = await app.page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => {
      const b = document.getElementById('viewport').getBoundingClientRect();
      const root = document.scrollingElement;
      done(`${root.clientWidth}×${root.clientHeight} ${b.x},${b.y},${b.width},${b.height}`);
    }))));
    if (now === last && now.startsWith(`${width}×${height} `)) return;
    last = now;
  }
  t.fail(`${preset}: the layout did not settle at ${width}×${height} after 20 reads (last: ${last})`);
  throw new Error(`${preset}: the viewport never settled at ${width}×${height} (last read ${last})`);
}

async function setLanguage(t, app, lang) {
  await app.page.evaluate((l) => {
    const select = document.getElementById('lang-select');
    if (select.value === l) return;
    select.value = l;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, lang);
  t.check(await t.until(() => app.page.evaluate((l) => document.documentElement.lang === l, lang), { timeoutMs: 5000 }), `the page did not switch to ${lang}`);
}
