/**
 * CO-3 (M-LAUNCH-019): the Launch Engineer flight across the G2 viewport
 * matrix, class A — machine checks only; the owner's screenshots (class H)
 * are taken separately.
 *
 * Desktop sizes (the tablet up) run in contexts without touch, booted in
 * Thai; 390×844 and 320×740 in phone contexts (touch, mobile viewport),
 * booted in Russian. Each flies two missions in a fresh context: the default
 * six-DOF flight, and a Soyuz MS to the ISS flown to its Kurs approach (the
 * TORU panel). The page is resized through the sizes, the other languages are
 * picked through the language selector's change handler, and the first-use
 * guide is measured open (a first visit) and then closed (its Skip button):
 * every size in TH/EN/RU with the guide open and closed. Zoom presets resize
 * the CSS viewport only (harness.mjs: layout depends on nothing else); the
 * context keeps its device scale factor.
 *
 * At every size, language and guide state:
 * - A1 the page does not scroll sideways: scrollWidth <= the preset's CSS
 *   width (not innerWidth: in a phone context an overflowing page zooms out,
 *   and innerWidth grows with it; the root's clientWidth stays the preset's);
 * - A2 Abort, play/pause, the mission clock and Live/replay are rendered,
 *   inside the page's width and reachable: scrolled to, a press at their
 *   centre lands on them. Whether each is on the first screen (no scrolling)
 *   is logged, not asserted: on a phone the playback row is below the scene;
 * - A3 the six-DOF control panel (a six-DOF flight) and the TORU panel (a
 *   Soyuz's Kurs approach to the station) are reachable the same way;
 * - A4 the event chooser opened from a cluster chip lies inside the window and
 *   its rows do not overflow sideways;
 * - A5 on a phone, the compact flight bar shows while the charts are read.
 * - S1–S4 (six-DOF flight; tests/browser/scene-floor.mjs, the G2 hold of
 *   2026-10-05 and finding F5): the scene keeps its minimum height on the
 *   first screen, nothing covers it, and on a desktop with the guide closed
 *   the key-events timeline, play/pause and the clock are wholly on the first
 *   screen. r2-viewport-scene-floor makes the same checks on Explore.
 * The scene's size is logged at each step.
 */
import { press, viewportSize } from '../harness.mjs';
import { checkSceneFloor } from '../scene-floor.mjs';

// 7–10 min here; CI runs flight/WebGL journeys ~1.5–2× slower
export const timeoutMs = 1_200_000;

const RESPOND_MS = 20_000;
const LANGS = ['th', 'en', 'ru'];
const DESKTOP = ['laptop-1280x800', 'laptop-1366x768', 'desktop-1920x1080', 'laptop-1100x650', 'projector-1280x720', 'tablet-768x1024',
  'edge-860x800', 'edge-861x800', 'edge-1180x800', 'edge-1181x800',
  'zoom125-1280x800', 'zoom150-1280x800', 'zoom125-1366x768', 'zoom150-1366x768'];
const PHONE = ['phone-390x844', 'phone-320x740'];
const PLAYBACK = { abort: '#btn-abort', play: '#btn-play', clock: '#clock', live: '#btn-live' };

/**
 * Open findings (docs/development/reports/CO-3-g2-matrix.md): a failure of
 * exactly this kind, at exactly the places the report lists, is logged as the
 * finding, not counted, until R2.1r fixes the app (CO-3 does not change app
 * code). Anything else fails — the same failure at another size, language,
 * guide state or control, or caused by another element. `site` is the check
 * that may consult the entry; `match(what, r)` gets that check's place and
 * its structured result.
 */
const F1_AT = new Set([
  'desktop laptop-1366x768 RU guide open: six-DOF controls',
  'desktop laptop-1366x768 RU guide open (TORU): TORU controls',
  'desktop laptop-1280x800 TH guide open (TORU): TORU take-over button',
]);
const F2_AT = new Set(['EN', 'RU'].flatMap((l) => ['open', 'closed'].map((g) => `phone phone-320x740 ${l} guide ${g}: abort (#btn-abort)`)));
const OPEN_FINDINGS = [
  { id: 'F1', site: 'reachable', what: 'the footer covers the bottom of the flight column',
    match: (what, r) => F1_AT.has(what) && r.kind === 'covered' && r.inFooter },
  { id: 'F2', site: 'reachable', what: 'Abort is cut off at the right edge of a 320 px phone',
    match: (what, r) => F2_AT.has(what) && r.kind === 'outside' && r.width === 320 && r.x0 >= 0 && r.x1 > r.width },
  { id: 'F3', site: 'chooser', what: 'cluster chips overlap on a phone\'s event bar',
    match: (where, r) => /^phone phone-390x844 RU guide (open|closed) \(TORU\)$/.test(where) && r.i >= 0 && r.covered.length > 0 && r.covered.every((c) => c.byCluster) },
];

export default async function r2ViewportMatrix(t) {
  const scenes = {};
  const open = new Map();
  for (const [group, presets, touch, bootLang] of [['desktop', DESKTOP, false, 'th'], ['phone', PHONE, true, 'ru']]) {
    for (const flight of [sixDofFlight, toruFlight]) {
      const app = await t.open({ hash: '#/launch/engineer', viewport: presets[0], lang: bootLang, touch, guide: true });
      try {
        await flight(t, app, group, presets, { scenes, open });
      } finally {
        app.checkErrors();
        await app.context.close();
      }
    }
  }
  t.log('scene sizes (CSS px, #viewport box; guide open → closed):');
  for (const [key, s] of Object.entries(scenes)) t.log(`  ${key}: ${s.open?.w}×${s.open?.h} → ${s.closed?.w}×${s.closed?.h}`);
  for (const [id, list] of open) t.log(`open finding ${id} seen ${list.length}× (not counted as failures): ${list.join(' | ')}`);
}

/** Each language and size with the first-use guide open (a first visit), then closed (Skip). */
async function sweep(t, app, group, presets, measure) {
  const guide = app.page.locator('#first-use-guide');
  t.check(await guide.isVisible(), `${group}: the first-use guide is not open on a first visit`);
  for (const state of ['open', 'closed']) {
    if (state === 'closed') await closeGuide(t, app, group);
    for (const lang of LANGS) {
      await setLanguage(t, app, lang);
      for (const preset of presets) {
        await resize(t, app, preset);
        await measure({ preset, lang, state });
      }
    }
  }
}

/** The default mission, flown six-DOF; its escape system offers Abort. */
async function sixDofFlight(t, app, group, presets, { scenes, open }) {
  const { page } = app;
  await page.locator('#setup .launch-button').waitFor();
  const launched = await app.mcp('launch_mission', {});
  t.check(launched.ok, `${group}: launch_mission ${JSON.stringify(launched)}`);
  if (!t.check(await t.until(() => page.evaluate(() => document.body.dataset.setup === 'collapsed' && document.body.dataset.flightStage === 'flight'), { timeoutMs: RESPOND_MS }),
    `${group}: launching did not collapse the setup into the flight stage`)) return;
  await app.mcp('control_playback', { action: 'pause' });
  await sweep(t, app, group, presets, async ({ preset, lang, state }) => {
    const where = `${group} ${preset} ${lang.toUpperCase()} guide ${state}`;
    await noSidewaysScroll(t, app, preset, where);
    for (const [what, sel] of Object.entries(PLAYBACK)) await reachable(t, app, sel, `${where}: ${what} (${sel})`, open);
    await reachable(t, app, '#rigid-controls summary', `${where}: six-DOF controls`, open);
    if (group === 'phone') await phoneBar(t, app, where);
    // G2 hold (F5): the scene's minimum and nothing over it or the timeline (S1–S4)
    await checkSceneFloor(t, app, preset, state, where);
    const scene = await sceneSize(app);
    (scenes[`${preset} ${lang.toUpperCase()}`] ??= {})[state] = scene;
    t.log(`${where}: scene ${scene.w}×${scene.h} (${scene.share} % of the window), first screen: ${await firstScreen(app)}`);
  });
}

/** A Soyuz MS to the station on the two-orbit profile, flown to the Kurs approach: the TORU panel, and a timeline full of events. */
async function toruFlight(t, app, group, presets, { open }) {
  const { page } = app;
  await page.locator('#setup .launch-button').waitFor();
  await app.mcp('configure_mission', { vehicleId: 'soyuz21a', siteId: 'baikonur', satelliteId: 'crew', orbitId: 'iss', physicsModel: 'pointMass' });
  const profile = page.locator('#setup .rendezvous-option select').first();
  if (!t.check(await t.until(async () => (await profile.count()) > 0, { timeoutMs: 5000 }), `${group}: no rendezvous profile for a Soyuz to the ISS`)) return;
  await profile.selectOption('twoOrbit');
  const launched = await app.mcp('launch_mission', {});
  t.check(launched.ok, `${group}: launch_mission (Soyuz) ${JSON.stringify(launched)}`);
  await t.until(() => page.evaluate(() => document.body.dataset.flightStage === 'flight'), { timeoutMs: RESPOND_MS });
  await app.mcp('control_playback', { action: 'warp', warp: 1000 });
  // fast through the phasing burns, slowly into the approach (the TORU panel shows for its phases only)
  const toru = await t.until(async () => {
    const s = await app.mcp('read_flight_state');
    if (s.cursorTimeS > 6000 && s.warp > 50) await app.mcp('control_playback', { action: 'warp', warp: 50 });
    return page.locator('#toru-controls').isVisible();
  }, { timeoutMs: 180_000, intervalMs: 1000 });
  await app.mcp('control_playback', { action: 'pause' });
  const s = await app.mcp('read_flight_state');
  t.log(`${group}: TORU flight paused at T+${s.cursorTimeS.toFixed(0)} s (${s.mode})`);
  if (!t.check(toru, `${group}: the TORU panel did not show on the Kurs approach (T+${s.cursorTimeS.toFixed(0)} s)`)) return;
  await sweep(t, app, group, presets, async ({ preset, lang, state }) => {
    const where = `${group} ${preset} ${lang.toUpperCase()} guide ${state} (TORU)`;
    await noSidewaysScroll(t, app, preset, where);
    await reachable(t, app, '#toru-controls summary', `${where}: TORU controls`, open);
    await reachable(t, app, '#toru-controls .toru-take', `${where}: TORU take-over button`, open);
    await chooser(t, app, where, open);
  });
}

/**
 * Resize the page and wait until the layout has settled: the root's client
 * size is the preset's (innerWidth is not: an overflowing phone page zooms out
 * and innerWidth grows) and two reads of the scene's box agree. Throws if it
 * never settles — every check after it would measure the wrong size.
 */
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

/** The language selector's own change handler; on a phone the topbar may not show the selector. */
async function setLanguage(t, app, lang) {
  await app.page.evaluate((l) => {
    const select = document.getElementById('lang-select');
    if (select.value === l) return;
    select.value = l;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, lang);
  t.check(await t.until(() => app.page.evaluate((l) => document.documentElement.lang === l, lang), { timeoutMs: 5000 }), `the page did not switch to ${lang}`);
}

async function closeGuide(t, app, group) {
  const guide = app.page.locator('#first-use-guide');
  if (await guide.isHidden()) return;
  await app.page.locator('#first-use-guide .help-guide-actions button').last().click();
  t.check(await t.until(() => guide.isHidden(), { timeoutMs: 5000 }), `${group}: Skip did not close the first-use guide`);
}

/** A1: against the preset's CSS width (see the header: a phone's innerWidth grows with the overflow). */
async function noSidewaysScroll(t, app, preset, where) {
  const { width } = viewportSize(preset);
  const m = await app.page.evaluate(() => ({ scrollWidth: document.scrollingElement.scrollWidth, clientWidth: document.scrollingElement.clientWidth, innerWidth }));
  t.check(m.scrollWidth <= width && m.scrollWidth <= m.clientWidth,
    `${where}: the page scrolls sideways (scrollWidth ${m.scrollWidth} > ${width} px wide; clientWidth ${m.clientWidth}, innerWidth ${m.innerWidth})`);
}

/**
 * A2/A3: rendered, inside the page's width, and — scrolled into view — a press
 * at its centre lands on it. The page is scrolled back to the top afterwards.
 */
async function reachable(t, app, sel, what, open) {
  const result = await app.page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return { kind: 'missing', text: 'not in the page' };
    const style = getComputedStyle(el);
    let box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0 || style.visibility === 'hidden') return { kind: 'hidden', text: `not rendered (${Math.round(box.width)}×${Math.round(box.height)}, ${style.visibility})` };
    const x0 = box.left + scrollX;
    const x1 = x0 + box.width;
    const width = document.scrollingElement.clientWidth;
    if (x0 < -0.5 || x1 > width + 0.5) return { kind: 'outside', x0, x1, width, text: `outside the page's width (x ${Math.round(x0)}…${Math.round(x1)} of ${width})` };
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    // the panels rebuild their buttons as the flight is drawn: test the element there now
    const now = document.querySelector(s) ?? el;
    box = now.getBoundingClientRect();
    const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    window.scrollTo(0, 0);
    const name = (n) => `${n.tagName.toLowerCase()}${n.id ? `#${n.id}` : ''}${n.className && typeof n.className === 'string' && n.className.trim() ? `.${n.className.trim().split(/\s+/).join('.')}` : ''}`;
    if (!top || !(top === now || now.contains(top))) return { kind: 'covered', top: top ? name(top) : null, inFooter: !!top?.closest('footer#footer'), text: `covered: a press at its centre lands on ${top ? `${name(top)}${top.parentElement ? ` in ${name(top.parentElement)}` : ''}` : 'nothing'}` };
    return null;
  }, sel);
  if (result === null) return;
  const finding = OPEN_FINDINGS.find((f) => f.site === 'reachable' && f.match(what, result));
  if (finding) {
    if (!open.has(finding.id)) open.set(finding.id, []);
    open.get(finding.id).push(what);
    t.log(`open finding ${finding.id} (${finding.what}): ${what}: ${result.text}`);
  } else t.fail(`${what}: not reachable — ${result.text}`);
}

/** Which of the flight controls are on the first screen without scrolling (logged, not asserted). */
function firstScreen(app) {
  return app.page.evaluate((sels) => sels.map(([name, s]) => {
    const el = document.querySelector(s);
    const b = el?.getBoundingClientRect();
    const root = document.scrollingElement;
    const on = b && b.width > 0 && b.top + scrollY >= 0 && b.bottom + scrollY <= root.clientHeight && b.left >= 0 && b.right <= root.clientWidth;
    return `${name} ${on ? 'yes' : 'no'}`;
  }).join(', '), [...Object.entries(PLAYBACK), ['six-DOF', '#rigid-controls summary']]);
}

/** The scene: the #viewport panel's box, and its share of the window's area. */
function sceneSize(app) {
  return app.page.evaluate(() => {
    const b = document.getElementById('viewport').getBoundingClientRect();
    return { w: Math.round(b.width), h: Math.round(b.height), share: Math.round(100 * b.width * b.height / (innerWidth * innerHeight)) };
  });
}

/** A5: scrolled down to the charts, the phone's compact flight bar is on screen. */
async function phoneBar(t, app, where) {
  const { page } = app;
  await page.evaluate(() => window.scrollTo(0, document.scrollingElement.scrollHeight));
  const shown = await t.until(() => page.evaluate(() => {
    const bar = document.getElementById('mobile-flight-bar');
    const b = bar.getBoundingClientRect();
    const root = document.scrollingElement;
    return getComputedStyle(bar).display !== 'none' && b.height > 0 && b.left >= 0 && b.right <= root.clientWidth + 0.5 && b.top >= 0 && b.bottom <= root.clientHeight + 0.5;
  }), { timeoutMs: 5000 });
  t.check(shown, `${where}: no compact flight bar on screen while the charts are read`);
  await page.evaluate(() => window.scrollTo(0, 0));
}

/** A4: a cluster chip's list, inside the window, nothing overflowing sideways; Escape closes it. */
async function chooser(t, app, where, open) {
  const { page } = app;
  const chips = page.locator('.tl-chip.cluster:not(.collapsed)');
  if (!t.check(await chips.count() > 0, `${where}: no cluster chip on the event bar`)) return;
  // the first chip a press at its centre reaches (F3: on a narrow phone a neighbour can cover a chip)
  await chips.first().evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
  const pick = await page.evaluate(() => {
    const all = [...document.querySelectorAll('.tl-chip.cluster:not(.collapsed)')];
    const covered = [];
    for (const [i, el] of all.entries()) {
      const b = el.getBoundingClientRect();
      const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      if (top && (top === el || el.contains(top))) return { i, covered };
      const by = top?.closest('.tl-chip.cluster');
      covered.push({ byCluster: !!by && by !== el, text: `chip ${i + 1} "${el.textContent.trim()}" under ${top ? `${top.tagName.toLowerCase()}.${[...top.classList].join('.')} "${top.textContent.trim()}"` : 'nothing'}` });
    }
    return { i: -1, covered };
  });
  if (pick.covered.length) {
    const covered = pick.covered.map((c) => c.text).join('; ');
    const finding = OPEN_FINDINGS.find((f) => f.site === 'chooser' && f.match(where, pick));
    if (finding) {
      if (!open.has(finding.id)) open.set(finding.id, []);
      open.get(finding.id).push(where);
      t.log(`open finding ${finding.id} (${finding.what}): ${where}: ${covered}`);
    } else t.fail(`${where}: a cluster chip is covered — ${covered}`);
  }
  if (pick.i < 0) return;
  const chip = chips.nth(pick.i);
  if (!await pressInView(t, app, chip, `${where}: cluster chip`)) return;
  const list = page.locator('.tl-chooser');
  if (!t.check(await t.until(() => list.isVisible(), { timeoutMs: 5000 }), `${where}: the cluster chip did not open the chooser`)) return;
  const problems = await page.evaluate(() => {
    const out = [];
    const listEl = document.querySelector('.tl-chooser');
    const b = listEl.getBoundingClientRect();
    const { clientWidth: w, clientHeight: h } = document.scrollingElement;
    if (b.left < -0.5 || b.right > w + 0.5 || b.top < -0.5 || b.bottom > h + 0.5) out.push(`the list (${Math.round(b.left)},${Math.round(b.top)} ${Math.round(b.width)}×${Math.round(b.height)}) leaves the ${w}×${h} window`);
    if (listEl.scrollWidth > listEl.clientWidth + 1) out.push(`the list scrolls sideways (${listEl.scrollWidth} > ${listEl.clientWidth})`);
    for (const item of listEl.querySelectorAll('.tl-chooser-item')) {
      const r = item.getBoundingClientRect();
      const name = item.querySelector('.tl-chooser-name')?.textContent ?? '';
      if (item.scrollWidth > item.clientWidth + 1) out.push(`"${name}" overflows its row (${item.scrollWidth} > ${item.clientWidth})`);
      for (const part of item.children) {
        const p = part.getBoundingClientRect();
        if (p.right > r.right + 0.5 || p.left < r.left - 0.5) out.push(`"${name}": ${part.className} sticks out of its row`);
      }
    }
    return out;
  });
  t.check(problems.length === 0, `${where}: chooser text overflows — ${problems.join('; ')}`);
  await page.keyboard.press('Escape');
  t.check(await t.until(() => list.isHidden(), { timeoutMs: 5000 }), `${where}: Escape did not close the chooser`);
  await page.evaluate(() => window.scrollTo(0, 0));
}

/** Scroll `locator` to the middle of the window, as a person would before pressing it, then press it. */
async function pressInView(t, app, locator, what) {
  await locator.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
  return press(t, app, locator, 'mouse', what);
}
