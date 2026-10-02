#!/usr/bin/env node
/** Read-only production UX diagnostics, not novice-user observations.
 * Build first, then: CHROMIUM=/usr/bin/chromium node scripts/audit-stage1/ux.mjs
 * ORBITLAB_AUDIT_DIR selects the output root; the browser harness's DPR is retained.
 * Navigation/guide actions use real clicks/taps; feasibility scenarios use WebMCP.
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tests/browser/serve.mjs';
import { launchBrowser, createJourney, RENDER_SCALE } from '../../tests/browser/harness.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const out = join(resolve(process.env.ORBITLAB_AUDIT_DIR || join(root, 'tests/browser/artifacts/stage1')), 'ux');
const epoch = '2026-10-02T12:00:00Z';
const common = { vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'cubesats',
  launchTimeIso: epoch, boosterRecovery: false, failureMode: 'none' };
const scenarios = [
  { id: 'over-capacity', input: { ...common, orbitId: 'leo', payloadMassKg: 30000 } },
  { id: 'corridor', input: { ...common, orbitId: 'polar', payloadMassKg: 1000 } },
  { id: 'combined-warning', input: { ...common, orbitId: 'iss', payloadMassKg: 30000,
    inclinationDeg: 90, raanMode: 'fixed', raanDeg: 180, failureMode: 'engineOut' } },
];
const result = { recordedAt: new Date().toISOString(), build: null, browser: null, renderScale: RENDER_SCALE,
  methodology: 'Fresh contexts; first-use guide retained. Real guide/menu clicks or taps. '
    + 'Feasibility inputs configured programmatically with WebMCP, not observed beginner behavior. '
    + 'Clipping is measured from DOM geometry; no human success rates or usability thresholds are inferred.',
  cases: [], failures: [] };
await mkdir(out, { recursive: true });
const save = () => writeFile(join(out, 'ux.json'), `${JSON.stringify(result, null, 2)}\n`);
const errorText = error => String(error?.stack || error);
const guides = page => page.evaluate(() => ({
  help: { step: document.querySelector('.help-guide-progress')?.textContent,
    title: document.querySelector('#first-use-guide h2')?.textContent,
    text: document.querySelector('#first-use-guide p')?.textContent },
  setupStep: document.querySelector('.explore-step-tab[aria-current]')?.dataset.step,
  visibleSetupSteps: [...document.querySelectorAll('.explore-step')].filter(e => !e.hidden).map(e => e.dataset.step),
}));

async function diagnose(t, viewport, lang) {
  const row = { viewport, lang, guide: {}, menu: null, feasibility: [], actions: [], errors: [], screenshots: [] };
  result.cases.push(row);
  let app;
  const attempt = async (label, fn) => {
    try { const value = await fn(); row.actions.push({ label, ok: true }); return value; }
    catch (error) {
      const message = errorText(error); row.actions.push({ label, ok: false, error: message });
      t.fail(`${viewport}/${lang}/${label}: ${message}`); return null;
    }
  };
  try {
    app = await t.open({ hash: '#/launch/explore', viewport, lang, touch: viewport === 'mobile', guide: true });
    const { page } = app;
    page.setDefaultTimeout(15000);
    await page.evaluate(() => document.fonts.ready);
    row.devicePixelRatio = await page.evaluate(() => devicePixelRatio);
    const activate = selector => viewport === 'mobile' ? page.tap(selector) : page.click(selector);
    const shot = async label => { const path = await app.shot(`${viewport}-${lang}-${label}`); row.screenshots.push(path); };
    row.guide.before = await guides(page);
    await attempt('guide-next', async () => {
      await activate('.help-guide-next'); row.guide.afterGuideNext = await guides(page); await shot('guide-next');
    });
    await attempt('setup-next', async () => {
      await activate('.explore-step:not([hidden]) .step-nav .next');
      row.guide.afterSetupNext = await guides(page);
    });
    await attempt('section-menu', async () => {
      const toggle = viewport === 'mobile' ? '.nav-sheet-btn' : '[data-nav-toggle="launch"]';
      await activate(`#section-nav ${toggle}`);
      row.menu = await page.evaluate(() => {
        const visible = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        return { links: [...document.querySelectorAll('#section-nav a')].filter(visible).map(e => ({
          text: e.textContent, ariaLabel: e.getAttribute('aria-label'), href: e.getAttribute('href'),
          description: e.querySelector('.nav-level-desc')?.textContent || null,
        })), visibleDescriptions: [...document.querySelectorAll('#section-nav .nav-level-desc')].filter(visible).map(e => e.textContent) };
      });
      await shot('navigation'); await activate(`#section-nav ${toggle}`);
    });
    for (const scenario of scenarios) {
      const entry = { id: scenario.id, input: scenario.input, setupMethod: 'WebMCP configure_mission' };
      row.feasibility.push(entry);
      await attempt(`feasibility-${scenario.id}`, async () => {
        entry.response = await app.mcp('configure_mission', scenario.input);
        if (!entry.response?.ok) throw new Error(`configure_mission did not succeed: ${JSON.stringify(entry.response)}`);
        await page.locator('#mission-note').scrollIntoViewIfNeeded();
        await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
        entry.measurement = await page.evaluate(() => {
          const text = document.querySelector('#mission-note .status-text');
          if (!text) throw new Error('No preflight status text');
          const style = getComputedStyle(text), rect = text.getBoundingClientRect();
          return { originalText: text.textContent, title: text.title, lineClamp: style.webkitLineClamp,
            overflow: style.overflow, clientHeight: text.clientHeight, scrollHeight: text.scrollHeight,
            clientWidth: text.clientWidth, scrollWidth: text.scrollWidth,
            clippedVertically: text.scrollHeight > text.clientHeight,
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            verdictClass: document.querySelector('#mission-note').className,
            repairActions: [...document.querySelectorAll('.verdict-fixes button')].map(e => ({
              text: e.textContent, title: e.title, disabled: e.disabled,
              visible: e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0,
            })), launchDisabled: document.querySelector('.launch-button')?.disabled };
        });
        await shot(scenario.id);
      });
      await save();
    }
  } catch (error) { row.errors.push(errorText(error)); t.fail(`${viewport}/${lang}: ${errorText(error)}`); }
  finally {
    if (app) { row.errors.push(...app.errors); app.checkErrors(); }
    result.failures.push(...t.failures);
    await t.close(); await save();
  }
}

let server, browser;
try {
  result.build = JSON.parse(await readFile(join(root, 'dist/build-info.json'), 'utf8'));
  server = await serve({ root: join(root, 'dist') });
  browser = await launchBrowser(); result.browser = browser.version();
  for (const [viewport, lang] of [['desktop', 'en'], ['mobile', 'en'], ['mobile', 'ru'], ['mobile', 'th']]) {
    const t = createJourney({ name: 'ux', browser, base: server.url, server, shots: out });
    await diagnose(t, viewport, lang);
  }
} catch (error) { result.failures.push(errorText(error)); }
finally {
  if (browser) await browser.close().catch(error => result.failures.push(`browser close: ${errorText(error)}`));
  if (server) await server.close().catch(error => result.failures.push(`server close: ${errorText(error)}`));
  await save();
}
console.log(`UX diagnostic evidence: ${join(out, 'ux.json')} (${result.failures.length} execution failures)`);
process.exitCode = result.failures.length ? 1 : 0;
