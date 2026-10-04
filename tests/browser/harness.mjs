/**
 * The browser-journey harness: one Chromium per journey, a fresh context per page the
 * journey opens, the app's WebMCP tools reachable from the test as
 * `app.mcp(name, input)`, and failures collected rather than thrown so a
 * journey reports everything that went wrong in one run.
 *
 * Playwright comes from the `playwright` devDependency, or from the module
 * `PLAYWRIGHT` names; the browser is Playwright's own Chromium, or the
 * executable `CHROMIUM` names (a machine with a preinstalled browser).
 *
 * A journey (tests/browser/journeys/*.mjs) exports
 *   export const smoke = true;          // part of `npm run test:browser:smoke`
 *   export const timeoutMs = 180_000;   // optional, the default below
 *   export default async function (t) { … }
 * where `t` is the object `createJourney` returns.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
};

/** Software WebGL (ANGLE on SwiftShader): the CI runners and containers have no GPU. */
const CHROMIUM_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

/**
 * The device pixel ratio pages open at. Software WebGL draws the scene at
 * about one frame a second at 1280×800 on a 4-core runner; at 0.5 the canvas
 * has a quarter of the pixels and the frame rate roughly doubles, while CSS
 * layout, hit-testing and every viewport size stay exactly as set.
 * `BROWSER_SCALE=1` renders at full resolution (sharper screenshots).
 */
export const RENDER_SCALE = Number(process.env.BROWSER_SCALE) || 0.5;

export const DEFAULT_TIMEOUT_MS = 180_000;

/** Explicit document/app waits own the reload; do not add click's separate
 * navigation barrier. Click still checks actionability at its usual deadline. */
export async function reloadDocument(page, control, ready = () => page.waitForSelector('#loading.hidden', { state: 'attached', timeout: 120_000 })) {
  await Promise.all([
    page.waitForEvent('domcontentloaded', { timeout: 60_000 }),
    control.click({ noWaitAfter: true }),
  ]);
  await ready();
}

async function pageDiagnostics(page, pendingRequests) {
  if (page.isClosed()) return { closed: true };
  let timer;
  const state = await Promise.race([
    page.evaluate(() => ({
      readyState: document.readyState, visibility: document.visibilityState, hash: location.hash,
      appReady: !!document.querySelector('#loading.hidden'), fonts: document.fonts.status,
      fontFaces: [...document.fonts].map((font) => ({ family: font.family, status: font.status })),
      openDialogs: [...document.querySelectorAll('dialog[open]')].map((dialog) => dialog.id),
      focus: document.activeElement?.id || document.activeElement?.tagName,
      // start-up's steps (src/main.ts markStartup), ms after this document's navigation began: which one a slow load waited on
      startup: Object.fromEntries(performance.getEntriesByType('mark').filter((m) => m.name.startsWith('orbitlab:'))
        .map((m) => [m.name.slice('orbitlab:'.length), Math.round(m.startTime)])),
      navigation: (() => { const n = performance.getEntriesByType('navigation')[0]; return n ? { domContentLoaded: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), type: n.type } : null; })(),
      sinceNavigation: Math.round(performance.now()),
      canvases: [...document.querySelectorAll('canvas')].map((canvas) => {
        const style = getComputedStyle(canvas), box = canvas.getBoundingClientRect();
        return { id: canvas.id, width: canvas.width, height: canvas.height, cssWidth: box.width, cssHeight: box.height,
          display: style.display, visibility: style.visibility };
      }),
    })).catch((error) => ({ evaluationError: String(error.message).split('\n')[0] })),
    new Promise((resolve) => { timer = setTimeout(() => resolve({ evaluationTimedOut: true }), 5_000); }),
  ]).finally(() => clearTimeout(timer));
  return { ...state, pendingRequests: [...pendingRequests.values()] };
}

/**
 * What the browser's processes are doing, read through the browser process so
 * it answers while a page's main thread is blocked (page diagnostics then time
 * out): the CPU seconds each kind of process used over three seconds — a busy
 * GPU process is slow software rendering, nothing busy is a hang — and the
 * GPU's feature status.
 */
async function browserDiagnostics(browser) {
  let session = null;
  try {
    session = await browser.newBrowserCDPSession();
    const sample = async () => (await session.send('SystemInfo.getProcessInfo')).processInfo;
    const before = await sample();
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    const after = await sample();
    const cpuSeconds = {};
    for (const p of after) {
      const used = p.cpuTime - (before.find((q) => q.id === p.id)?.cpuTime ?? 0);
      cpuSeconds[p.type] = Math.round(((cpuSeconds[p.type] ?? 0) + used) * 100) / 100;
    }
    const { gpu } = await session.send('SystemInfo.getInfo');
    return { cpuSecondsOver3s: cpuSeconds, processes: after.map((p) => p.type),
      gpu: { featureStatus: gpu.featureStatus, devices: gpu.devices.map((d) => `${d.vendorString} ${d.deviceString} ${d.driverVersion}`.trim()) } };
  } catch (error) {
    return { browserError: String(error?.message ?? error).split('\n')[0] };
  } finally {
    await session?.detach().catch(() => {});
  }
}

/** The app's language (`src/i18n/index.ts`) and the browser locale that goes with it. */
const LOCALES = { en: 'en-GB', ru: 'ru-RU', th: 'th-TH' };

export async function launchBrowser() {
  const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
  return chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: CHROMIUM_ARGS });
}

/**
 * Runs before any of the app's scripts in every page of a context: a stand-in
 * for a browser-hosted MCP client (`navigator.modelContext`), the guided tour
 * marked as seen, and the language picked unless the page already chose one.
 */
function initScript({ lang, guide }) {
  const tools = new Map();
  navigator.modelContext = { registerTool: (tool) => { tools.set(tool.name, tool); } };
  window.__mcp = async (name, input = {}) => {
    const tool = tools.get(name);
    if (!tool) throw new Error(`no WebMCP tool "${name}" (registered: ${[...tools.keys()].join(', ') || 'none'})`);
    return JSON.parse(JSON.stringify(await tool.execute(input)));
  };
  try {
    if (!guide) localStorage.setItem('orbitlab.guide.v1', 'done');
    if (lang && !localStorage.getItem('orbitlab.lang')) localStorage.setItem('orbitlab.lang', lang);
  } catch { /* storage off: the app falls back to its defaults */ }
}

/**
 * The context one journey runs in. `base` is the app's URL (ending in
 * `/Orbitlab/`), `server` the in-process server when the runner started one
 * (null against an external URL), `shots` the screenshot directory or null.
 */
export function createJourney({ name, browser, base, server = null, distDir = null, shots = null }) {
  const failures = [];
  const apps = [];
  const t = {
    name, browser, base, server, distDir, shots,
    failures,
    log: (...args) => console.log(`  [${name}]`, ...args),
    /** Record a failure and carry on. */
    fail: (msg) => { failures.push(msg); console.error(`  [${name}] FAIL: ${msg}`); },
    /** Record a failure when `ok` is false; returns `ok`. */
    check: (ok, msg) => { if (!ok) t.fail(msg); return !!ok; },

    /**
     * Open the app in a new context: `hash` the route (`#/launch/watch`),
     * `viewport` a preset name or a size, `lang` en/ru/th, `touch` a touch
     * screen, `guide` true to leave the first-visit tour on.
     */
    async open({ hash = '', viewport = 'desktop', lang = 'en', touch = false, guide = false, contextOptions = {} } = {}) {
      const size = typeof viewport === 'string' ? VIEWPORTS[viewport] : viewport;
      if (!size) throw new Error(`unknown viewport preset "${viewport}"`);
      const context = await browser.newContext({
        viewport: size, deviceScaleFactor: RENDER_SCALE, locale: LOCALES[lang] ?? lang, hasTouch: touch, isMobile: touch && size.width < 600,
        ...contextOptions,
      });
      await context.addInitScript(initScript, { lang, guide });
      const page = await context.newPage();
      const errors = [];
      const pendingRequests = new Map();
      page.on('request', (request) => {
        const url = new URL(request.url());
        pendingRequests.set(request, `${url.origin}${url.pathname}`); // no queries or fragments in CI diagnostics
      });
      page.on('requestfinished', (request) => pendingRequests.delete(request));
      page.on('requestfailed', (request) => pendingRequests.delete(request));
      page.on('pageerror', (e) => errors.push(e.message));
      const app = {
        context, page, errors,
        /** The loading screen is gone: the app has booted. */
        ready: () => page.waitForSelector('#loading.hidden', { state: 'attached', timeout: 120_000 }),
        goto: async (h = '') => { await page.goto(`${base}${h}`, { waitUntil: 'domcontentloaded', timeout: 120_000 }); await app.ready(); },
        /** Call one of the app's WebMCP tools (src/mcp.ts); throws what the tool throws. */
        mcp: (tool, input = {}) => page.evaluate(([n, i]) => window.__mcp(n, i), [tool, input]),
        /** A screenshot into the run's directory, if it has one. */
        shot: async (label) => {
          if (!shots) return null;
          mkdirSync(shots, { recursive: true });
          const path = join(shots, `${name}-${label}.png`);
          await page.screenshot({ path, animations: 'disabled' });
          return path;
        },
        diagnostics: () => pageDiagnostics(page, pendingRequests),
        /** Fail on any uncaught page error so far. */
        checkErrors: () => t.check(errors.length === 0, `page errors: ${errors.join(' | ')}`),
      };
      apps.push(app);
      await app.goto(hash);
      return app;
    },

    /** Poll `fn` (async allowed) until it returns a truthy value; the value, or null on timeout. */
    async until(fn, { timeoutMs = 10_000, intervalMs = 100 } = {}) {
      const end = Date.now() + timeoutMs;
      for (;;) {
        const v = await fn();
        if (v) return v;
        if (Date.now() > end) return null;
        await new Promise((r) => setTimeout(r, intervalMs));
      }
    },

    /** Screenshots of every page still open, for a failed journey. */
    async shotAll(label = 'failure') {
      const out = [];
      for (const [i, app] of apps.entries()) {
        if (app.page.isClosed()) continue;
        try { out.push(await app.shot(apps.length > 1 ? `${label}-${i + 1}` : label)); } catch { /* the page may be gone */ }
      }
      return out.filter(Boolean);
    },

    /** Preserve readiness/resource state without turning diagnostics into a new assertion. */
    async diagnose() {
      const data = await Promise.all(apps.map((app) => app.diagnostics()));
      t.log('failure diagnostics:', JSON.stringify(data));
      const processes = await browserDiagnostics(browser);
      t.log('browser diagnostics:', JSON.stringify(processes));
      if (shots) {
        mkdirSync(shots, { recursive: true });
        writeFileSync(join(shots, `${name}-diagnostics.json`), `${JSON.stringify({ pages: data, browser: processes }, null, 2)}\n`);
      }
      return data;
    },

    async close() {
      for (const app of apps) await app.context.close().catch(() => {});
    },
  };
  return t;
}

/**
 * Press on `locator` the way a person would: at the centre of its box, by
 * `mouse` or `touch`, after checking that the point really lands on it (a
 * covering element is reported as a failure, not waited out). Resolves to
 * false (and records the failure) when it could not.
 */
export async function press(t, app, locator, how, what) {
  const box = await locator.boundingBox();
  if (!box) { t.fail(`${what}: not visible for a ${how} press`); return false; }
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const hit = await locator.evaluate((el, [px, py]) => {
    const top = document.elementFromPoint(px, py);
    return top && (el === top || el.contains(top)) ? null : (top ? `${top.tagName.toLowerCase()}${top.id ? `#${top.id}` : ''}.${[...top.classList].join('.')}` : 'nothing');
  }, [x, y]);
  if (hit) { t.fail(`${what}: a ${how} press at its centre lands on ${hit}`); return false; }
  if (how === 'touch') await app.page.touchscreen.tap(x, y);
  else await app.page.mouse.click(x, y);
  return true;
}

/**
 * Activate `locator` from the keyboard: give it the focus, confirm it took it
 * (a control that cannot be focused is a failure), then press `key`.
 */
export async function keyOn(t, app, locator, key, what) {
  await locator.focus();
  const focused = await locator.evaluate((el) => document.activeElement === el);
  if (!focused) { t.fail(`${what}: does not take the keyboard focus`); return false; }
  await app.page.keyboard.press(key);
  return true;
}
