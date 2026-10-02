/**
 * A rejected GPU preference can recover without changing rendering quality.
 * With WebGL unavailable, a desktop Edge user gets usable Thai recovery
 * instructions and can reload with the keyboard after fixing the browser.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { RENDER_SCALE, VIEWPORTS, keyOn, press } from '../harness.mjs';

export const smoke = true;
export const timeoutMs = 300_000;

/** Inject faults before Three or the application can request a context. */
function inject({ failure, lang }) {
  localStorage.setItem('orbitlab.lang', lang);
  localStorage.setItem('orbitlab.guide.v1', 'done');
  const tools = new Map();
  navigator.modelContext = { registerTool: (tool) => tools.set(tool.name, tool) };
  window.__mcp = async (name, input = {}) => {
    const tool = tools.get(name);
    if (!tool) throw new Error(`WebMCP tool not registered: ${name}`);
    return JSON.parse(JSON.stringify(await tool.execute(input)));
  };
  window.__webglRequests = [];
  if (failure === 'renderer') {
    const extension = WebGL2RenderingContext.prototype.getExtension;
    WebGL2RenderingContext.prototype.getExtension = function () {
      if (this.canvas.id === 'gl') throw new Error('Renderer setup failed');
      return extension.apply(this, arguments);
    };
  }
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (name, attributes) {
    if (this.id !== 'gl' || name !== 'webgl2') return original.apply(this, arguments);
    const blocked = sessionStorage.getItem('webgl-test-repaired') !== 'yes'
      && (failure === 'all' || (failure === 'preference' && attributes?.powerPreference === 'high-performance'));
    const context = blocked ? null : original.apply(this, arguments);
    window.__webglRequests.push({ attributes: attributes ?? null, created: Boolean(context) });
    return context;
  };
}

export default async function webglStartup(t) {
  await fallback(t);
  await unavailable(t);
  await rendererFailure(t);
}

async function open(t, failure, lang) {
  const version = t.browser.version();
  const context = await t.browser.newContext({
    viewport: VIEWPORTS.desktop, deviceScaleFactor: RENDER_SCALE,
    locale: lang === 'th' ? 'th-TH' : 'en-GB', serviceWorkers: 'block',
    userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36 Edg/${version}`,
  });
  await context.addInitScript(inject, { failure, lang });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return {
    context, page, errors,
    goto: () => page.goto(`${t.base}#/launch/explore`, { waitUntil: 'domcontentloaded', timeout: 120_000 }),
    ready: () => page.waitForSelector('#loading.hidden', { state: 'attached', timeout: 120_000 }),
    mcp: (name, input = {}) => page.evaluate(([tool, args]) => window.__mcp(tool, args), [name, input]),
  };
}

async function fallback(t) {
  const app = await open(t, 'preference', 'en');
  const { page } = app;
  try {
    await app.goto();
    await app.ready();
    const requests = await page.evaluate(() => window.__webglRequests);
    const preferred = requests.find((r) => r.attributes?.powerPreference === 'high-performance');
    const recovered = requests.find((r) => r.attributes?.powerPreference === 'default');
    t.check(preferred && !preferred.created, 'the preferred GPU context was rejected');
    t.check(recovered?.created, `the default GPU context recovered startup: ${JSON.stringify(requests)}`);
    t.check(requests.length === 2 && requests.every((r) => r.attributes),
      'fallback preserves explicit context attributes without an attribute-free diagnostic probe');
    if (preferred && recovered) {
      const quality = ({ powerPreference: _preference, ...attributes }) => attributes;
      t.check(JSON.stringify(quality(preferred.attributes)) === JSON.stringify(quality(recovered.attributes)),
        'retrying with the default GPU changed the requested rendering attributes');
    }
    const renderer = await page.evaluate(() => {
      const r = window.orbitlab.scene.renderer;
      return {
        antialias: r.getContext().getContextAttributes().antialias,
        logarithmicDepthBuffer: r.capabilities.logarithmicDepthBuffer,
        shadows: r.shadowMap.enabled, shadowType: r.shadowMap.type,
        outputColorSpace: r.outputColorSpace, toneMapping: r.toneMapping,
      };
    });
    t.check(!renderer.antialias && renderer.logarithmicDepthBuffer && renderer.shadows
      && renderer.shadowType === 1 && renderer.outputColorSpace === 'srgb' && renderer.toneMapping === 4,
    `fallback lost the normal logarithmic depth, shadows, or colour pipeline: ${JSON.stringify(renderer)}`);
    t.check(await page.locator('#loading[data-startup-error]').count() === 0, 'successful fallback does not show an error');

    await app.mcp('configure_mission', { vehicleId: 'falcon9', siteId: 'cape', orbitId: 'leo' });
    const launched = await app.mcp('launch_mission');
    t.check(launched.ok && launched.playing, 'the recovered app can launch a mission');
    await app.mcp('control_playback', { action: 'warp', warp: 1000 });
    t.check(await t.until(async () => {
      const flight = await app.mcp('read_flight_state');
      return flight.hasMission && flight.frame.liftoff && flight.frame.timeS > 10;
    }, { timeoutMs: 60_000, intervalMs: 1000 }), 'flight simulation advances after the GPU fallback');
    await app.mcp('control_playback', { action: 'pause' });
    t.check(app.errors.length === 0, `uncaught errors after fallback: ${app.errors.join(' | ')}`);
  } finally {
    await app.context.close();
  }
}

async function unavailable(t) {
  const app = await open(t, 'all', 'th');
  const { page } = app;
  try {
    await app.goto();
    const error = page.locator('#loading[data-startup-error="webgl"]');
    await error.waitFor({ state: 'visible', timeout: 120_000 });
    const heading = error.getByRole('heading', { name: 'เปิดมุมมองสามมิติไม่สำเร็จ' });
    t.check(await heading.count() === 1, 'the unavailable renderer has a Thai heading');
    t.check(await heading.evaluate((el) => document.activeElement === el), 'startup failure moves keyboard focus to its heading');
    t.check(await error.getAttribute('role') === 'region'
      && await error.getAttribute('aria-labelledby') === await heading.getAttribute('id'),
    'assistive technology can identify the recovery region');
    // Mission controls remain visible beside the failed viewport. They must
    // not create a half-started flight while the renderer is unavailable.
    const launch = page.locator('#setup .launch-button');
    await launch.scrollIntoViewIfNeeded();
    await press(t, app, launch, 'mouse', 'Launch with unavailable WebGL');
    const reset = page.locator('#setup .launch-area > .ghost-button');
    await keyOn(t, app, reset, 'Enter', 'Reset with unavailable WebGL');
    await heading.focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('Shift+Space');
    await page.keyboard.press('2');
    t.check(await page.evaluate(() => {
      const app = window.orbitlab;
      return !app.started && !app.sim && !app.session;
    }), 'mission buttons and shortcuts cannot start a session after startup failed');
    t.check(app.errors.length === 0, `mission controls throw after startup failure: ${app.errors.join(' | ')}`);
    t.check(await error.locator('ol li').count() === 3 && /Edge|Chrome/.test(await error.innerText()),
      'recovery includes browser and graphics settings guidance');
    t.check(await error.locator('.spinner').count() === 0, 'an unavailable renderer does not leave a loading spinner');
    const details = error.locator('details');
    t.check(!await details.evaluate((el) => el.open), 'technical errors start collapsed');
    if (await keyOn(t, app, details.locator('summary'), 'Enter', 'technical details')) {
      t.check(await details.evaluate((el) => el.open), 'technical details open with the keyboard');
      t.check(/WebGL/.test(await details.innerText()), 'technical details retain the original context failure');
    }
    if (t.shots) {
      mkdirSync(t.shots, { recursive: true });
      await page.screenshot({ path: join(t.shots, 'webgl-startup-unavailable.png') });
    }
    const requests = await page.evaluate(() => window.__webglRequests);
    t.check(requests.some((r) => r.attributes?.powerPreference === 'high-performance')
      && requests.some((r) => r.attributes?.powerPreference === 'default') && requests.every((r) => !r.created),
    'both GPU preferences were tried before presenting recovery');

    // Model a user fixing the browser: the fault is gone on the next load,
    // while the same recovery button and application URL must still work.
    await page.evaluate(() => sessionStorage.setItem('webgl-test-repaired', 'yes'));
    const reload = error.getByRole('button', { name: 'โหลดหน้าเว็บใหม่', exact: true });
    await reload.focus();
    t.check(await reload.evaluate((el) => document.activeElement === el), 'reload takes keyboard focus');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 120_000 }),
      page.keyboard.press('Enter'),
    ]);
    await app.ready();
    const flight = await app.mcp('read_flight_state');
    t.check(flight.hasMission && flight.frame.status === 'prelaunch', 'reload restores a usable mission after WebGL becomes available');
    t.check(await page.locator('#loading[data-startup-error]').count() === 0, 'reload clears the recovery screen');
    t.check(app.errors.length === 0, `uncaught errors during recovery: ${app.errors.join(' | ')}`);
  } finally {
    await app.context.close();
  }
}

async function rendererFailure(t) {
  const app = await open(t, 'renderer', 'en');
  const { page } = app;
  try {
    await app.goto();
    const error = page.locator('#loading[data-startup-error="generic"]');
    await error.waitFor({ state: 'visible', timeout: 120_000 });
    const requests = await page.evaluate(() => window.__webglRequests);
    t.check(requests.length === 1 && requests[0].created,
      'a renderer setup failure occurs after a successful context without retrying another GPU');
    t.check(await error.getByRole('heading', { name: 'Orbitlab could not start' }).count() === 1,
      'an unrelated renderer failure has the generic startup heading');
    t.check(await error.locator('ol').count() === 0 && !/acceleration/.test(await error.innerText()),
      'a renderer bug is not diagnosed as unavailable graphics acceleration');
    const details = error.locator('details');
    await keyOn(t, app, details.locator('summary'), 'Enter', 'renderer failure details');
    t.check((await details.innerText()).includes('Error: Renderer setup failed'),
      'generic startup failure preserves its diagnostic message');
    t.check(app.errors.length === 0, `uncaught errors during generic recovery: ${app.errors.join(' | ')}`);
  } finally {
    await app.context.close();
  }
}
