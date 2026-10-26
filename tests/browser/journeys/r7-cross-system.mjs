/**
 * R7.1 (M-PLAN-025; plan v2.0 S17 §17.1): one cross-system journey on one
 * build, the seams between the sections held to their values. Two passes in
 * one browser, each a new learner who picks the language in the page: Thai
 * on a 390×844 touch phone, then Russian at 1280×800 with a mouse. A pass
 * that fails is reported and the next pass still runs.
 *
 * 1. A new learner from Learner profiles; the language from the page's own
 *    picker (stored in that learner's workspace).
 * 2. Build: the Satellite Engineer's design saved, opened and sent to Orbit
 *    (the hand-off names the saved revision, unedited, with full tanks); a
 *    Soyuz-2.1b remix saved in Explore, checked by the Engineer review (ISS,
 *    Baikonur, 7 150 kg) and flown with "Fly it": the Launch section's
 *    mission is the saved design, its reference and the reviewed mass.
 * 3. Launch Engineer: the crewed spacecraft (its own engine) launched off
 *    the window, as a student's edit. Paused in the ascent, the setup shown
 *    and hidden: nothing of the paused flight changes. Flown past the
 *    outcome, paused, the outcome chosen from its chooser, the cursor moved
 *    5 s on with the keyboard.
 * 4. Result: "Show the setting" lands on the launch time, read-only; the
 *    recorded flight is unchanged.
 * 5. Orbit at the cursor: the hand-off is the cursor's frame bit for bit,
 *    with the spacecraft's own propellant left (not refuelled) and the
 *    design's reference; back in Launch the cursor is kept. The CSV export
 *    is this flight, checked row by row. "Apply to a new mission" takes the
 *    suggested launch time; the saved designs are untouched.
 * 6. Lesson 1.1 to its grading bar: its settings locked; leaving the section
 *    and coming back keeps the lesson, its grade and its locks. The results
 *    check is held back with the teaching tools (src/ui/held.ts); lesson 1.1
 *    is the step's other option.
 * 7. The learner's backup through a strict check of its shape, imported as
 *    a new learner; that learner's stored values equal the backup's, apart
 *    from the two route keys every page load rewrites. The worksheet DOCX
 *    is held back with the teaching tools and logged as held.
 * 8. Offline under the service worker: the imported learner reloads; the
 *    page shows that learner (durable), its design in Build and lesson 1.1
 *    in the catalogue, in its language. No request leaves the page's origin
 *    in the whole pass (a HAR from the first request, and the context's
 *    request events). No CSP is set yet (M-PLATFORM-027): none is checked.
 *
 * Navigation, choices and presses go through the page's own controls (the
 * section list, the brand link, Home's Lessons, the warp picker). WebMCP is
 * used to read only: events and flight state. Bit-for-bit values are read in
 * the page (`window.orbitlab`, as stage2-preflight and fx8-context-loss read
 * it), not through WebMCP's JSON.
 */
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { press, keyOn } from '../harness.mjs';
import { workspaceBytes, workspaceValue } from '../workspace-storage.mjs';
import { pausedFlightSettles } from './r2-flight-shell.mjs';
import { TEACHER_TOOLS } from '../held.mjs';

export const timeoutMs = 1_500_000;

const PASSES = [
  { lang: 'th', viewport: 'phone-390x844', how: 'touch', label: 'th-390' },
  { lang: 'ru', viewport: 'laptop-1280x800', how: 'mouse', label: 'ru-1280' },
];
/**
 * Off the ISS window from Baikonur. A headless flight of the Soyuz-2.1b remix with the crewed spacecraft at
 * this time ends `evt.offTargetOrbit` at T+4135.2 s, only the RAAN missed, the spacecraft burning from T+4063.9 s
 * (docs/development/reports/R7.1-GK1.md; tests/target-plane.test.ts holds the catalogue Soyuz-2.1a to the same).
 */
const OFF_WINDOW = '2026-09-19T11:55';
const ROCKET = 'soyuz21b';
const REVIEW = { orbit: 'iss', site: 'baikonur', payloadKg: 7150 };
/**
 * The learner's last route (src/ui/app-mode.ts MODE_STORAGE_KEY, SECTION_STORAGE_KEY): every page load
 * saves the route it opens on, so the imported learner's first load rewrites them. No other stored value
 * may differ from the backup.
 */
const ROUTE_KEYS = ['orbitlab.mode', 'orbitlab.section'];
/** Lesson 1.1's locks as the Explore setup shows them (src/ui/lessons/locks.ts selectors; track1.ts `locked`). */
const LOCKED = ['.vehicle-cards button', '.orbit-presets button', '[data-field="setup.site"]', '[data-field="setup.satellite"]', '[data-field="setup.payloadMass"]', 'details[data-section="failure"] button'];
/** The telemetry CSV's columns for a point-mass flight (src/ui/csv.ts buildTelemetryCsv). */
const CSV_COLUMNS = 't_s,alt_m,v_inertial_ms,v_air_ms,q_pa,mach,g_load,mass_kg,thrust_n,throttle,pitch_deg,apoapsis_m,periapsis_m,inclination_deg,dv_remaining_ms,downrange_m,lat_deg,lon_deg,stage,phase';

export default async function r7CrossSystem(t) {
  for (const pass of PASSES) {
    try {
      await crossSystem(t, pass);
    } catch (e) {
      t.fail(`R7 ${pass.label} threw: ${e?.stack ?? e}`);
    }
  }
}

async function crossSystem(t, pass) {
  const { lang, viewport, how, label } = pass;
  const tag = (s) => `R7 ${label} ${s}`;
  const check = (ok, s) => t.check(ok, tag(s));
  const started = Date.now();
  const elapsed = () => `${((Date.now() - started) / 1000).toFixed(0)} s`;
  const harDir = mkdtempSync(join(tmpdir(), 'r7-har-'));
  const harPath = join(harDir, 'pass.har');
  let app;
  try {
    // the HAR is recorded from the context's first request, before the app's first page loads
    app = await t.open({ hash: '#/home', viewport, lang: 'en', touch: how === 'touch', contextOptions: { recordHar: { path: harPath, mode: 'minimal', content: 'omit' } } });
  } catch (e) {
    // the app did not open: close this pass's context now (t.close closes every context the
    // journey opened; the earlier passes closed theirs), so it does not run on under the next pass
    await t.close();
    rmSync(harDir, { recursive: true, force: true });
    throw e;
  }
  const { page, context } = app;
  const origin = new URL(t.base).origin;
  const off = (url) => /^(https?|wss?):/.test(url) && new URL(url).origin !== origin;
  const egress = [];
  context.on('request', (r) => { if (off(r.url())) egress.push(`${r.method()} ${r.url()}`); });
  page.on('websocket', (ws) => { if (off(ws.url())) egress.push(`WS ${ws.url()}`); });
  const failed = t.failures.length;
  try {
    await walk(t, app, { ...pass, tag, check, elapsed });
  } catch (e) {
    // recorded here, so the screenshot and diagnostics below see it before the page closes
    t.fail(tag(`threw: ${e?.stack ?? e}`));
  } finally {
    // the runner's failure screenshots see only open pages: this pass closes its own
    if (t.failures.length > failed) {
      await app.shot(`failure-${label}`).catch(() => {});
      t.log(tag(`failure diagnostics: ${JSON.stringify(await app.diagnostics().catch((e) => String(e?.message ?? e)))}`));
    }
    app.checkErrors();
    await app.context.close().catch((e) => t.fail(tag(`the context could not be closed: ${e?.message ?? e}`)));
    try {
      const har = JSON.parse(readFileSync(harPath, 'utf8'));
      for (const entry of har.log?.entries ?? []) if (off(entry.request?.url ?? '')) egress.push(`${entry.request.method} ${entry.request.url} (HAR)`);
      check((har.log?.entries ?? []).length > 0, 'the HAR recorded no request');
    } catch (e) {
      t.fail(tag(`the HAR could not be read: ${e?.message ?? e}`));
    } finally {
      rmSync(harDir, { recursive: true, force: true });
    }
    check(egress.length === 0, `R7 offline: requests left the page's origin: ${[...new Set(egress)].slice(0, 5).join(' | ')}`);
    t.log(tag(`pass ended at ${elapsed()}`));
  }
}

async function walk(t, app, { lang, how, label, tag, check, elapsed }) {
  const { page, context } = app;
  const drawn = () => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  const hash = () => page.evaluate(() => location.hash);
  /**
   * Scroll to a control, then press it (the press still hit-tests it). Playwright's scroll waits for the control to
   * hold still over two frames; while a section is still laying out (the Engineer bench drawing a design on the phone)
   * that can take longer than its 5 s, so the control is then scrolled to directly, as a person would.
   */
  const scrollTo = async (loc) => {
    await loc.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => loc.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' })).catch(() => {}));
  };
  const pressIn = async (loc, what) => { await scrollTo(loc); return press(t, app, loc, how, what); };
  const reloadBy = async (control, what) => {
    await scrollTo(control);
    await Promise.all([page.waitForEvent('domcontentloaded', { timeout: 60_000 }), press(t, app, control, how, what)]);
    await app.ready();
  };
  const selected = () => page.evaluate(() => sessionStorage.getItem('orbitlab.profiles.selected.v1'));
  const recordOf = (id) => page.evaluate((i) => JSON.parse(localStorage.getItem(`orbitlab.profile.v1.${i}`) ?? 'null'), id);
  const step = (s) => t.log(tag(`${s} (${elapsed()})`));
  /** A section and level from the page's own navigation: the tab's menu on a wide screen, the sheet on a phone. */
  const navTo = async (section, mode) => {
    const sheet = page.locator('#section-nav .nav-sheet-btn');
    const phone = await sheet.isVisible().catch(() => false);
    await pressIn(phone ? sheet : page.locator(`#section-nav .nav-tab-btn[data-nav-toggle="${section}"]`), `the ${phone ? 'section list' : `${section} tab`}`);
    await pressIn(page.locator(`#section-nav ${phone ? '#nav-sheet' : `#nav-menu-${section}`} a[data-section="${section}"][data-mode="${mode}"]`), `${section} ${mode}`);
    return check(await t.until(async () => (await hash()) === `#/${section}/${mode}`, { timeoutMs: 10_000 }), `the section list did not open ${section} ${mode} (${await hash()})`);
  };
  /** The lessons catalogue the way a learner gets there: the brand link to Home, then Home's Lessons. */
  const toLessons = async () => {
    await pressIn(page.locator('#topbar a.brand'), 'the brand link (Home)');
    const lessons = page.locator('#home-screen [data-home-focus="lessons"]');
    await lessons.waitFor({ state: 'visible', timeout: 15_000 });
    await pressIn(lessons, 'Home\'s Lessons');
    return check(await t.until(async () => (await hash()) === '#/lessons', { timeoutMs: 10_000 }), `Lessons did not open the catalogue (${await hash()})`);
  };
  /** The first-use guide, shown to a new learner in the Launch section: closed with Skip, as the learner would. */
  const closeGuide = async () => {
    const guide = page.locator('#first-use-guide');
    if (await t.until(() => guide.isVisible(), { timeoutMs: 3000 })) {
      await pressIn(page.locator('#first-use-guide .help-guide-actions button').last(), 'Skip the first-use guide');
      check(await t.until(() => guide.isHidden(), { timeoutMs: 5000 }), 'the first-use guide did not close');
    }
  };
  const dialog = page.locator('#profile-dialog');
  const openProfiles = async () => {
    if (!(await dialog.evaluate((d) => d.open))) await pressIn(page.locator('#btn-profile'), 'Learner profiles');
    await dialog.waitFor({ state: 'visible', timeout: 30_000 });
  };
  const warp = async (value) => {
    const select = page.locator('#warp-select');
    await select.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
    await select.selectOption(String(value));
    return check(await t.until(async () => (await state()).warp === value, { timeoutMs: 10_000 }), `the warp picker did not set warp ${value}`);
  };
  const state = () => app.mcp('read_flight_state');
  const playBtn = how === 'touch' ? page.locator('#mfb-play') : page.locator('#btn-play');
  const pressPlay = async (what) => {
    if (how === 'touch') await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await playBtn.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    return press(t, app, playBtn, how, what);
  };

  // 1. a new learner, and the language chosen in the page
  await openProfiles();
  await pressIn(dialog.locator('[data-profile-focus="create"]'), 'Create a profile');
  await dialog.locator('[data-profile-focus="name"]').fill(`R7 ${label}`);
  await pressIn(dialog.locator('[data-profile-focus="create"]'), 'Create a profile (name)');
  await reloadBy(dialog.locator('[data-profile-focus="confirm"]'), 'Confirm the new learner');
  const learner = await selected();
  if (!check((await recordOf(learner))?.name === `R7 ${label}`, `step 1: the new learner is not the one open (${learner})`)) return;
  await page.locator('#lang-select').selectOption(lang);
  check(await t.until(async () => (await workspaceBytes(page, ['orbitlab.lang']))['orbitlab.lang'] === lang, { timeoutMs: 5000 })
    && await page.evaluate(() => document.documentElement.lang) === lang, `step 1: the learner's language is not ${lang}`);
  step('step 1 done');

  // 2a. Satellite Engineer: save, open, send to Orbit
  if (!await navTo('build', 'engineer')) return;
  await satelliteEngineer(t, app, { label, check, pressIn });
  step('step 2a done');

  // 2b. the rocket: a Soyuz-2.1b remix saved in Explore, reviewed and flown
  if (!await navTo('build', 'explore')) return;
  const rocketTab = page.locator('[data-k="craft:rocket"]:visible').first();
  await rocketTab.waitFor({ timeout: 30_000 });
  await pressIn(rocketTab, 'the rocket designer');
  const picker = page.locator('#bx-picker-select');
  await picker.waitFor({ timeout: 60_000 });
  await picker.selectOption(ROCKET);
  const name = `R7 Soyuz ${label}`;
  await page.locator('.bx-grid:not([hidden]) [data-k="name"]').fill(name);
  await page.locator('.bx-grid:not([hidden]) [data-k="name"]').press('Tab');
  await pressIn(page.locator('.bx-grid:not([hidden]) [data-k="store:save"]'), 'Save the remix');
  const record = await t.until(async () => (await workspaceValue(page, 'orbitlab.designs'))?.designs?.find((d) => d.name === name), { timeoutMs: 30_000 });
  if (!check(record?.kind === 'vehicle' && record.design.derivedFrom === ROCKET, 'step 2: the remix was not saved')) return;
  const savedBytes = (await workspaceBytes(page, ['orbitlab.designs']))['orbitlab.designs'];
  if (!await navTo('build', 'engineer')) return;
  await pressIn(page.locator('#be-tab-review'), 'the review tab');
  await page.selectOption('[data-k="review:orbit"]', REVIEW.orbit);
  await page.selectOption('[data-k="review:site"]', REVIEW.site);
  await page.fill('[data-k="review:payload"]', String(REVIEW.payloadKg));
  await page.press('[data-k="review:payload"]', 'Tab');
  const fly = page.locator('[data-k="review:fly"]');
  const reviewed = await t.until(async () => (await page.locator('.bx-progress').count()) === 0 && (await page.locator('.be-review-banner').count()) > 0 && fly.isEnabled(), { timeoutMs: 240_000, intervalMs: 1000 });
  if (!check(reviewed, `step 2: the review did not pass (${await page.locator('.be-review-banner').first().getAttribute('class').catch(() => 'no banner')})`)) return;
  await pressIn(fly, 'Fly it');
  if (!check(await t.until(async () => (await hash()) === '#/launch/engineer', { timeoutMs: 20_000 }), 'step 2: Fly it did not open Launch Engineer')) return;
  await closeGuide();
  const flown = await t.until(async () => { const m = await workspaceValue(page, 'orbitlab.mission'); return m?.design?.recordId === record.id && m.mission?.vehicleSpec ? m : null; }, { timeoutMs: 15_000 });
  if (!check(flown, 'step 2: the Launch section\'s mission does not carry the design\'s reference')) return;
  check(flown.design.revision === record.updated && flown.design.specId === record.design.id && flown.design.edited === false, `step 2: the reference is not the saved revision: ${JSON.stringify(flown.design)}`);
  check(JSON.stringify(flown.mission.vehicleSpec) === JSON.stringify(record.design), 'step 2: the flown vehicle is not the saved design');
  check(flown.mission.siteId === REVIEW.site && flown.mission.orbitId === REVIEW.orbit && flown.mission.payloadMass === REVIEW.payloadKg,
    `step 2: the mission is not the one reviewed (${flown.mission.siteId}, ${flown.mission.orbitId}, ${flown.mission.payloadMass} kg)`);
  step('step 2 done');

  // 3. the student's edit, the launch, the pause and the chooser
  await page.locator('#setup select[data-field="setup.satellite"]').selectOption('crew');
  // the note under Launch shows the panel's verdict (src/ui/panel.ts updateVerdict). The crewed spacecraft on
  // this rocket already warns in the window (its ascent margin), so the note must change to the off-window verdict.
  await drawn();
  const inWindow = await page.evaluate(() => ({ text: document.querySelector('#mission-note .status-text')?.textContent ?? '', off: window.orbitlab.panel.feasibility().offWindow }));
  if (!check(!inWindow.off, 'step 3: the reviewed launch time is already off the window')) return;
  const time = page.locator('#setup [data-field="setup.launchTime"]');
  await time.fill(OFF_WINDOW);
  await time.press('Tab');
  check(await t.until(() => page.evaluate((before) => {
    const note = document.getElementById('mission-note');
    const v = window.orbitlab.panel.feasibility();
    const text = note?.querySelector('.status-text')?.textContent ?? '';
    return v.offWindow && v.level === 'warn' && !!note?.classList.contains('warn') && text === v.text && text !== before;
  }, inWindow.text), { timeoutMs: 10_000 }), 'step 3: the setup does not warn that the launch is off the window');
  await pressIn(page.locator('#setup .launch-button'), 'Launch');
  if (!check(await t.until(() => page.evaluate(() => document.body.dataset.flightStage === 'flight'), { timeoutMs: 30_000 }), 'step 3: the flight did not start')) return;
  // Warp 10 to the pause: software-rendered after Build and Orbit, the phone's frames can
  // take a second or more each, and at warp 1 the flight ran at 0.56× real time at best.
  if (!await warp(10)) return;
  if (!check(await t.until(async () => (await state()).headTimeS > 30, { timeoutMs: 180_000, intervalMs: 500 }), `step 3: the flight did not reach T+30 s (${JSON.stringify(await state().then((s) => ({ playing: s.playing, warp: s.warp, mode: s.mode, cursor: s.cursorTimeS, head: s.headTimeS })).catch((e) => String(e)))})`)) return;
  await pressPlay('pause in the ascent');
  const ascent = await pausedFlightSettles(t, app);
  if (!ascent) return;
  const frames = () => page.evaluate(() => window.orbitlab.recorder.frames.length);
  const n0 = await frames();
  await pressIn(page.locator('#btn-setup'), '⚙ Setup in the ascent');
  check(await t.until(() => page.evaluate(() => document.body.dataset.setup === 'shown'), { timeoutMs: 5000 }), 'step 3: ⚙ Setup did not show the setup');
  await drawn();
  await pressIn(page.locator('#btn-setup'), '⚙ Setup again');
  check(await t.until(() => page.evaluate(() => document.body.dataset.setup === 'collapsed'), { timeoutMs: 5000 }), 'step 3: ⚙ Setup did not fold the setup away again');
  await drawn();
  const after = await state();
  check(after.cursorTimeS === ascent.cursorTimeS && after.headTimeS === ascent.headTimeS && !after.playing && await frames() === n0
    && await page.evaluate(() => document.body.dataset.flightStage) === 'flight', `step 3: showing the setup changed the paused flight (${JSON.stringify({ ascent: [ascent.cursorTimeS, ascent.headTimeS], after: [after.cursorTimeS, after.headTimeS, after.playing] })})`);
  await pressPlay('play on');
  await warp(1000);
  const events = async () => (await app.mcp('get_events', {})).events;
  const outcome = await t.until(async () => (await events()).find((e) => e.key === 'evt.offTargetOrbit' || e.key === 'evt.targetOrbit' || e.severity === 'fail'), { timeoutMs: 400_000, intervalMs: 2000 });
  if (!check(outcome?.key === 'evt.offTargetOrbit', `step 3: the flight did not end off target: ${JSON.stringify(outcome)}`)) return;
  if (!check(await t.until(async () => (await state()).headTimeS >= outcome.timeS + 300, { timeoutMs: 120_000, intervalMs: 1000 }), 'step 3: the flight did not fly on past the outcome')) return;
  await pressPlay('pause in orbit');
  const orbiting = await pausedFlightSettles(t, app);
  if (!orbiting) return;
  const pick = await page.evaluate((key) => {
    const cs = window.orbitlab.timeline.chips;
    const i = cs.findIndex((c) => !c.el.classList.contains('collapsed') && c.members.length > 1 && c.members.some((m) => m.key === key));
    if (i < 0) return null;
    const sorted = [...cs[i].members].sort((a, b) => a.t - b.t);
    return { i, k: sorted.findIndex((m) => m.key === key), t: sorted.find((m) => m.key === key).t };
  }, outcome.key);
  if (!check(pick, 'step 3: the outcome is in no cluster of the event bar')) return;
  const chip = page.locator('#timeline .tl-chip').nth(pick.i);
  if (how === 'touch') await chip.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await press(t, app, chip, how, 'the outcome\'s cluster');
  if (!check(await t.until(() => page.locator('.tl-chooser').isVisible(), { timeoutMs: 5000 }), 'step 3: the cluster did not open its chooser')) return;
  const item = page.locator('.tl-chooser .tl-chooser-item').nth(pick.k);
  await item.evaluate((el) => el.scrollIntoView({ block: 'nearest' }));
  await press(t, app, item, how, 'the outcome in the chooser');
  await drawn();
  const chosen = await state();
  check(chosen.mode === 'replay' && chosen.cursorTimeS === pick.t, `step 3: the chooser did not seek to the outcome (T+${chosen.cursorTimeS} s, ${chosen.mode}; the outcome T+${pick.t} s)`);
  if (!(await keyOn(t, app, page.locator('#timeline .tl-range'), 'ArrowRight', 'the replay cursor'))) return;
  await drawn();
  const cursor = (await state()).cursorTimeS;
  check(cursor === pick.t + 5, `step 3: the cursor did not move 5 s on (T+${cursor} s)`);
  check(orbiting.headTimeS - cursor > 100, `R7 precondition: the cursor is not well behind the head (cursor T+${cursor}, head T+${orbiting.headTimeS})`);
  step('step 3 done');

  // 4. "Show the setting", and the flight unchanged
  const setting = page.locator('#mission-result .mission-result-setting');
  if (!check(await t.until(() => setting.isVisible(), { timeoutMs: 10_000 }), 'step 4: the result does not offer Show the setting')) return;
  check(await setting.getAttribute('data-field') === 'setup.launchTime', `step 4: the result points at ${await setting.getAttribute('data-field')}, not the launch time`);
  const before = { n: await frames(), s: await state() };
  await pressIn(setting, 'Show the setting');
  // the label is marked for 2.4 s (src/ui/panel.ts focusField); the focus stays on the field
  check(await t.until(() => page.evaluate(() => {
    const f = document.querySelector('#setup [data-field="setup.launchTime"]');
    const label = f?.closest('label');
    return document.body.dataset.setup === 'shown' && !!f?.disabled && (!!label?.classList.contains('field-pointed') || document.activeElement === f || document.activeElement === label);
  }), { timeoutMs: 5000 }), 'step 4: Show the setting did not open the read-only setup on the launch time');
  await pressIn(page.locator('#btn-setup'), '⚙ Setup (back from the setting)');
  check(await t.until(() => page.evaluate(() => document.body.dataset.setup === 'collapsed'), { timeoutMs: 5000 }), 'step 4: the setup did not fold away again');
  await drawn();
  const back4 = await state();
  check(await frames() === before.n && back4.cursorTimeS === cursor && back4.headTimeS === before.s.headTimeS && back4.mode === 'replay',
    'step 4: showing the setting changed the recorded flight or the cursor');
  step('step 4 done');

  // 5. Orbit at the cursor: the hand-off is the cursor's frame, not refuelled
  await drawn();
  const expected = await page.evaluate(() => {
    const a = window.orbitlab, f = a.shown;
    const own = f.stages.find((x) => x.isSpacecraft);
    const spec = own && a.sim.vehicle.stages[own.index].spec;
    const propellant = own ? Math.max(0, own.propellantFraction * spec.propellantMass) : null;
    return { t: f.t, r: [f.r.x, f.r.y, f.r.z], v: [f.v.x, f.v.y, f.v.z], jd: f.jd, propellant, full: spec?.propellantMass ?? null, mass: own ? spec.dryMass + propellant : null };
  });
  check(expected.t === cursor, `step 5: the frame on screen is T+${expected.t} s, not the cursor's`);
  check(expected.propellant !== null && expected.propellant > 0 && expected.propellant < expected.full, `R7 precondition: the spacecraft's engine did not burn before the cursor (${expected.propellant} of ${expected.full} kg)`);
  await pressIn(page.locator('#mission-steps [data-step="orbit"] button'), 'the Orbit step');
  if (!check(await t.until(async () => /^#\/orbit\//.test(await hash()), { timeoutMs: 15_000 }), 'step 5: the Orbit step did not open the Orbit section')) return;
  const got = await page.evaluate(() => { const a = window.orbitlab, pg = a.playground; return { h: a.handoff, same: pg.handoff === a.handoff, craft: pg.launchCraft, jd0: pg.orbit?.jd0, preset: pg.presetId }; });
  // bit for bit: Object.is also tells -0 from 0
  const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
  check(got.h && Object.is(got.h.origin.missionTime, expected.t) && same(got.h.r, expected.r) && same(got.h.v, expected.v) && Object.is(got.h.jd, expected.jd),
    'R7 cursor: the hand-off is not the cursor\'s frame bit for bit');
  check(Object.is(got.h?.spacecraft.mass, expected.mass) && Object.is(got.h?.spacecraft.propulsion?.propellantMass, expected.propellant) && Object.is(got.craft?.propellant, expected.propellant) && Object.is(got.craft?.mass, expected.mass),
    `R7 propellant: the spacecraft was refuelled or its mass changed (hand-off ${got.h?.spacecraft.propulsion?.propellantMass} kg, Orbit ${got.craft?.propellant} kg, the frame ${expected.propellant} kg)`);
  check(got.same && Object.is(got.jd0, expected.jd) && got.preset === 'handoff', 'step 5: the Orbit section did not take the hand-off as it was given');
  check(JSON.stringify(got.h?.origin.design) === JSON.stringify(flown.design), 'step 5: the hand-off does not carry the design\'s reference');
  if (!await navTo('launch', 'engineer')) return;
  await drawn();
  const kept = await state();
  check(kept.mode === 'replay' && kept.cursorTimeS === cursor && !kept.playing, `step 5: back in Launch the cursor moved (T+${kept.cursorTimeS} s, ${kept.mode})`);
  // the CSV is this flight, row by row
  const csvButton = page.locator('#telemetry .export-btn:not([id])');
  const download = page.waitForEvent('download', { timeout: 30_000 });
  await pressIn(csvButton, 'Export CSV');
  const csvFile = await download.catch(() => null);
  if (check(csvFile, 'step 5: Export CSV gave no file')) {
    check(csvFile.suggestedFilename() === `orbitlab_${record.design.id}_${REVIEW.orbit}.csv`, `step 5: the CSV is not named for the flown design (${csvFile.suggestedFilename()})`);
    const problems = csvProblems(readFileSync(await csvFile.path(), 'utf8'), await events(), outcome.timeS);
    check(problems.length === 0, `step 5: the CSV is not this flight: ${problems.slice(0, 5).join('; ')}`);
  }
  // a new mission from the result, at the suggested time; the saved design untouched
  const suggest = page.locator('#mission-result .mission-result-suggest');
  const apply = suggest.locator('.mission-result-apply');
  if (check(await apply.isVisible().catch(() => false), 'step 5: the result offers no new mission')) {
    const times = ((await suggest.textContent()) ?? '').match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/g) ?? [];
    await pressIn(apply, 'Apply to a new mission');
    check(await t.until(() => page.evaluate(() => document.body.dataset.flightStage === 'setup'), { timeoutMs: 10_000 }), 'step 5: Apply did not start a new mission');
    const applied = await time.inputValue();
    check(times.length === 2 && times[0] === OFF_WINDOW.replace('T', ' ') && applied === times[1].replace(' ', 'T'),
      `step 5: the new mission's launch time ${applied} is not the suggestion's (${times.join(' → ')})`);
  }
  check((await workspaceBytes(page, ['orbitlab.designs']))['orbitlab.designs'] === savedBytes, 'step 5: flying, the Orbit step or the new mission changed the saved designs');
  step('step 5 done');

  // 6. lesson 1.1 to its grading bar; its lesson, grade and locks kept across a section change
  if (!await toLessons()) return;
  const card = page.locator('.lesson-card-item').filter({ has: page.locator('b', { hasText: /^1\.1\s/ }) }).first();
  await card.waitFor({ timeout: 30_000 });
  await pressIn(card, 'lesson 1.1');
  if (!check(await t.until(() => page.evaluate(() => document.body.dataset.lesson === 'orbit-first'), { timeoutMs: 20_000 }), 'step 6: lesson 1.1 did not open')) return;
  const lockedNow = () => page.evaluate((sels) => sels.map((s) => [...document.querySelectorAll(`#setup ${s}`)].map((e) => e.disabled && (e.closest('label') ?? e).classList.contains('lesson-locked'))), LOCKED);
  const locks = await lockedNow();
  check(locks.every((list) => list.length && list.every(Boolean)), `step 6: the lesson's settings are not all locked (${JSON.stringify(locks)})`);
  await pressIn(page.locator('#setup .launch-button'), 'Launch (lesson 1.1)');
  if (!check(await t.until(() => page.evaluate(() => document.body.dataset.flightStage === 'flight'), { timeoutMs: 30_000 }), 'step 6: the lesson flight did not start')) return;
  await warp(100);
  const strip = page.locator('.lesson-strip');
  const graded = async () => (await strip.isVisible()) && page.evaluate(() => {
    const c = document.querySelector('.lesson-strip .lesson-crit[data-criterion="orbit"]');
    return !!c && c.classList.contains('pass') && document.querySelectorAll('.lesson-strip .lesson-answers input').length === 2;
  });
  if (!check(await t.until(graded, { timeoutMs: 300_000, intervalMs: 1000 }), 'step 6: lesson 1.1 did not reach its grading bar')) return;
  await pressPlay('pause the lesson flight');
  await pausedFlightSettles(t, app);
  // the lesson's strip stays with the learner in every section (src/ui/lessons/lesson-mode.ts); leaving is the route
  if (!await navTo('build', 'explore')) return;
  if (!await navTo('launch', 'explore')) return;
  check(await t.until(async () => (await page.evaluate(() => document.body.dataset.lesson)) === 'orbit-first' && graded(), { timeoutMs: 10_000 }), 'step 6: coming back lost the lesson or its grade');
  const relocked = await lockedNow();
  check(relocked.every((list) => list.length && list.every(Boolean)), `step 6: coming back lost the lesson's locks (${JSON.stringify(relocked)})`);
  if (!TEACHER_TOOLS) t.log(tag('step 6: the results check is held with the teaching tools (src/ui/held.ts); lesson 1.1 is the step\'s other option'));
  step('step 6 done');

  // 7. the backup, strictly checked, imported as a new learner
  await openProfiles();
  await pressIn(dialog.locator('[data-profile-focus="backups"]'), 'Profile backups');
  const before7 = await recordOf(learner);
  const saved = page.waitForEvent('download', { timeout: 30_000 });
  await pressIn(dialog.locator('[data-profile-focus="exportProfile"]'), 'Export this learner\'s workspace');
  const backupFile = await saved.catch(() => null);
  if (!check(backupFile, 'step 7: the backup gave no file')) return;
  const backupPath = await backupFile.path();
  const after7 = await recordOf(learner);
  if (!check(JSON.stringify(before7) === JSON.stringify(after7), 'step 7: the learner\'s stored record changed while the backup was made')) return;
  const backup = JSON.parse(readFileSync(backupPath, 'utf8'));
  const problems = backupProblems(backup, after7, learner);
  check(problems.length === 0, `step 7: the backup is not the learner's workspace: ${problems.join('; ')}`);
  if (!TEACHER_TOOLS) t.log(tag('step 7: the worksheet DOCX is held with the teaching tools (src/ui/held.ts): not exported'));
  await dialog.locator('.profile-file-picker input[type=file]').first().setInputFiles(backupPath);
  await dialog.locator('[data-profile-focus="importConfirm"]').waitFor({ timeout: 15_000 });
  await dialog.locator('[data-profile-focus="importName"]').fill(`R7 ${label} copy`);
  // importing reloads the page into the new learner (src/ui/profiles/app-profiles.ts reloadAfterImport)
  await reloadBy(dialog.locator('[data-profile-focus="importConfirm"]'), 'Import the backup');
  const copyId = await selected();
  if (!check(copyId && copyId !== learner && (await recordOf(copyId))?.name === `R7 ${label} copy`, `step 7: the import did not open a new learner (${copyId})`)) return;
  const copy = await recordOf(copyId);
  const values = backup.profiles?.[0]?.values ?? {};
  const differs = Object.keys({ ...values, ...copy.values }).filter((k) => values[k] !== copy.values[k] && !ROUTE_KEYS.includes(k));
  check(differs.length === 0, `step 7: the imported learner's values differ from the backup: ${differs.join(', ')}`);
  check(ROUTE_KEYS.every((k) => typeof copy.values[k] === 'string'), `step 7: the imported learner has no route saved (${ROUTE_KEYS.map((k) => `${k}=${copy.values[k]}`).join(', ')})`);
  step('step 7 done');

  // 8. offline under the service worker: what the page shows of the imported learner and its work
  check(await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 60_000 }).then(() => true, () => false), 'step 8: no service worker controls the page');
  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    await app.ready();
    check(await page.evaluate(() => !navigator.onLine && !!navigator.serviceWorker?.controller), 'step 8: the reloaded page is not offline under the service worker');
    check(await selected() === copyId, 'step 8: the reload did not keep the imported learner selected');
    check(await page.locator('#btn-profile').getAttribute('data-profile-status') === 'durable'
      && ((await page.locator('#profile-label').textContent()) ?? '').includes(`R7 ${label} copy`), 'step 8: the page does not show the imported learner, durable');
    check(await page.evaluate(() => document.documentElement.lang) === lang, `step 8: the page opened in ${await page.evaluate(() => document.documentElement.lang)}, not ${lang}`);
    if (await navTo('build', 'explore')) {
      const tab = page.locator('[data-k="craft:rocket"]:visible').first();
      if (await tab.isVisible().catch(() => false)) await pressIn(tab, 'the rocket designer (offline)');
      check(await page.locator(`.bx-grid:not([hidden]) [data-k="open:${record.id}"]`).waitFor({ state: 'visible', timeout: 10_000 }).then(() => true, () => false),
        'step 8: Build does not list the saved design offline');
    }
    if (await toLessons()) {
      const status = await page.locator('.lesson-card-item').filter({ has: page.locator('b', { hasText: /^1\.1\s/ }) }).first().locator('.lesson-card-status').textContent().catch(() => null);
      check(status !== null && status !== '○', `step 8: the catalogue does not show lesson 1.1 as attempted offline (${status})`);
    }
  } finally {
    await context.setOffline(false);
  }
  step(`done: cursor T+${cursor.toFixed(3)} s, ${expected.propellant.toFixed(3)} of ${expected.full} kg left; no CSP is set yet (M-PLATFORM-027), so none is checked`);
}

/**
 * What is wrong with a one-learner backup, strictly: exactly the archive's keys (src/workspace/repository.ts
 * exportProfile), one profile that is this learner, each of its fields equal to the stored record's, every value
 * a string equal to the stored one. The stored record also has `version`, which the archive does not carry.
 */
function backupProblems(backup, stored, id) {
  const problems = [];
  const keys = (o) => JSON.stringify(Object.keys(o ?? {}).sort());
  if (keys(backup) !== JSON.stringify(['exportedAt', 'format', 'media', 'profiles', 'version'])) problems.push(`top-level keys ${keys(backup)}`);
  if (backup?.format !== 'orbitlab.workspace' || backup?.version !== 1) problems.push(`format ${backup?.format} v${backup?.version}`);
  if (JSON.stringify(backup?.media) !== JSON.stringify({ included: false, reason: 'separate-binary-export' })) problems.push(`media ${JSON.stringify(backup?.media)}`);
  const p = backup?.profiles?.[0];
  if (backup?.profiles?.length !== 1 || p?.id !== id) problems.push(`profiles ${backup?.profiles?.length}, id ${p?.id}`);
  if (keys(p) !== JSON.stringify(['createdAt', 'epoch', 'id', 'name', 'revision', 'updatedAt', 'values'])) problems.push(`profile keys ${keys(p)}`);
  for (const k of ['name', 'createdAt', 'updatedAt', 'revision', 'epoch']) if (p?.[k] !== stored?.[k]) problems.push(`${k} ${JSON.stringify(p?.[k])} ≠ ${JSON.stringify(stored?.[k])}`);
  if (keys(p?.values) !== keys(stored?.values)) problems.push(`value keys ${keys(p?.values)} ≠ ${keys(stored?.values)}`);
  for (const [k, v] of Object.entries(p?.values ?? {})) if (typeof v !== 'string' || v !== stored?.values?.[k]) problems.push(`value ${k}`);
  return problems;
}

/**
 * What is wrong with a point-mass flight's CSV, row by row: the header is the columns of src/ui/csv.ts; every
 * telemetry row has them all, its numbers finite and its time rising, on past the outcome; the event
 * block holds, in order, exactly the flight's events (WebMCP `get_events`), their details JSON.
 */
function csvProblems(text, events, outcomeS) {
  const problems = [];
  const lines = text.split('\n');
  if (lines[0] !== CSV_COLUMNS) problems.push(`header ${lines[0].slice(0, 80)}`);
  const width = CSV_COLUMNS.split(',').length;
  const blank = lines.indexOf('');
  if (blank < 2 || lines[blank + 1] !== '# events' || lines[blank + 2] !== 't_s,event,details') problems.push('no event block after the telemetry');
  let last = -Infinity;
  for (const [i, line] of lines.slice(1, blank).entries()) {
    const cells = line.split(',');
    if (cells.length !== width) { problems.push(`row ${i + 1} has ${cells.length} cells`); break; }
    const numbers = cells.slice(0, width - 1).map(Number);
    if (!numbers.every(Number.isFinite) || !cells[width - 1]) { problems.push(`row ${i + 1} is not numbers and a phase`); break; }
    if (!(numbers[0] > last)) { problems.push(`row ${i + 1}: time ${numbers[0]} after ${last}`); break; }
    last = numbers[0];
  }
  if (!(last >= outcomeS)) problems.push(`the last row is T+${last} s, before the outcome at T+${outcomeS} s`);
  const rows = lines.slice(blank + 3);
  const expected = events.map((e) => `${e.key === 'evt.controlCommand' ? e.timeS.toFixed(9) : e.timeS.toFixed(1)},${e.key}`);
  const shown = [];
  for (const line of rows) {
    const m = /^(-?\d+\.\d+),(evt\.[A-Za-z]+),"(.*)"$/.exec(line);
    if (!m) { problems.push(`event line ${line.slice(0, 60)}`); break; }
    try { JSON.parse(m[3].replace(/""/g, '"')); } catch { problems.push(`event details ${m[3].slice(0, 60)}`); break; }
    shown.push(`${m[1]},${m[2]}`);
  }
  // both are the flight's chronological order (src/physics/events.ts chronologicalEvents)
  if (JSON.stringify([...shown].sort()) !== JSON.stringify([...expected].sort())) problems.push(`events: the CSV has ${shown.length}, the flight ${expected.length}`);
  else if (JSON.stringify(shown) !== JSON.stringify(expected)) problems.push('events: the CSV lists the flight\'s events out of order');
  return problems;
}

async function satelliteEngineer(t, app, { label, check, pressIn }) {
  const { page } = app;
  const satTab = page.locator('[data-k="craft:satellite"]:visible').first();
  await satTab.waitFor({ timeout: 30_000 });
  await pressIn(satTab, 'the satellite bench');
  await pressIn(page.locator('[data-k="sb:toExplore"]'), 'the satellite designer');
  const grid = '.bsat-grid:not([hidden])';
  if (!check(await page.waitForSelector(`${grid} .bsat-summary`, { timeout: 60_000 }).then(() => true, () => false), 'step 2a: the satellite designer did not open')) return;
  await page.selectOption(`${grid} [data-k="sx:template"]`, 'theos2');
  const sat = `R7 THEOS-2 ${label}`;
  await page.fill(`${grid} [data-k="sx:name"]`, sat);
  await page.press(`${grid} [data-k="sx:name"]`, 'Tab');
  await pressIn(page.locator(`${grid} [data-k="store:save"]`), 'Save the satellite');
  const rec = await t.until(async () => (await workspaceValue(page, 'orbitlab.designs'))?.designs?.find((d) => d.name === sat), { timeoutMs: 30_000 });
  if (!check(rec?.kind === 'satellite' && rec.design.propulsion?.propellant > 0, 'step 2a: the satellite with its engine was not saved')) return;
  await page.selectOption(`${grid} [data-k="sx:template"]`, 'napa2');
  await pressIn(page.locator(`${grid} [data-k="open:${rec.id}"]`), 'Open the saved satellite');
  check(await t.until(async () => (await page.inputValue(`${grid} [data-k="sx:name"]`)) === sat, { timeoutMs: 10_000 }), 'step 2a: Open did not bring the saved satellite back');
  await pressIn(page.locator(`${grid} [data-k="sx:toOrbit"]`), 'Send to Orbit');
  check(await t.until(async () => /^#\/orbit\//.test(await page.evaluate(() => location.hash)), { timeoutMs: 15_000 }), 'step 2a: Send to Orbit did not open the Orbit section');
  const h = await t.until(() => page.evaluate(() => window.orbitlab.handoff), { timeoutMs: 10_000 });
  const ref = h?.origin?.design;
  check(ref?.recordId === rec.id && ref.revision === rec.updated && ref.edited === false && ref.kind === 'satellite', `step 2a: the hand-off does not name the saved, unedited revision: ${JSON.stringify(ref)}`);
  const full = rec.design.propulsion.propellant;
  check(h?.origin?.mission === null && h.spacecraft.propulsion?.propellantMass === full && h.spacecraft.mass === rec.design.bus.dryMass + full,
    `step 2a: the hand-off is not the design placed directly with full tanks (${h?.spacecraft?.propulsion?.propellantMass} of ${full} kg)`);
}
