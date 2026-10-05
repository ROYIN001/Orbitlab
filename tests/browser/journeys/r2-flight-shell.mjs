/**
 * R2: the Launch Engineer shell through a flight, with real input.
 *
 * - R2.1 / U11: launching with the real Launch button collapses the setup and
 *   the scene canvas really grows (the renderer resizes it; nothing is
 *   stretched). ⚙ Setup shows the frozen configuration and hides it again;
 *   pausing or replaying stays in flight; New mission brings the setup back.
 *   The notation selector is in the telemetry panel and works mid-flight.
 * - U16: the HUD carries the actual engine level beside the throttle command.
 * - R2.2: a view picked on a camera tab survives the phase changes of the
 *   ascent; Cinematic hands the camera back to the programme. The Watch viewer
 *   has the view tabs and keeps a picked view across phases as well.
 * - R2.4: a cluster chip on the event bar opens the chooser; the arrows move
 *   inside the list without seeking; a chosen event seeks to its exact
 *   recorded time; Escape closes the list and returns the focus to the chip.
 * - A04: on a phone the compact flight bar plays/pauses while the page is
 *   scrolled down to the charts.
 *
 * Screenshots of each layout state are kept for the D08 layout review.
 *
 * The launch fold, the pause and the opening of the chooser are exported for
 * the PR smoke slice (`r2-shell-smoke.mjs`, CO-5), which runs them in under a
 * minute; this journey runs them as part of the whole flight.
 */
import { press } from '../harness.mjs';

export const timeoutMs = 420_000;

const RESPOND_MS = 20_000;

export default async function r2FlightShell(t) {
  await engineer(t);
  await cards(t);
  await watch(t);
  await phone(t);
  await narrow(t);
}

async function engineer(t) {
  const app = await t.open({ hash: '#/launch/engineer' });
  const { page } = app;
  const state = () => app.mcp('read_flight_state');

  await page.locator('#setup .launch-button').waitFor();
  t.check(await page.locator('#btn-setup').isHidden(), 'the ⚙ Setup button is offered before any launch');
  t.check(await page.locator('#telemetry .notation-section select').count() === 1, 'the notation selector is not in the telemetry panel');
  t.check(await page.locator('#setup .notation-section').count() === 0, 'the notation selector is still in the setup panel');
  await app.shot('engineer-setup-1280');

  // launch with the real button
  if (!await launchFolds(t, app)) return;
  t.check(await page.locator('#btn-setup').isVisible(), 'no ⚙ Setup button in flight');
  t.check(await page.locator('#btn-abort').isVisible(), 'Abort is not reachable in flight');
  await app.shot('engineer-flight-1280');

  // ⚙ Setup shows the frozen configuration and hides it again
  await press(t, app, page.locator('#btn-setup'), 'mouse', '⚙ Setup');
  t.check(await t.until(() => page.locator('#setup').isVisible(), { timeoutMs: 5000 }), '⚙ Setup did not show the setup');
  t.check(await page.locator('#btn-setup').getAttribute('aria-expanded') === 'true', '⚙ Setup is not marked expanded');
  t.check(await page.locator('#setup select').first().isDisabled(), 'the flown configuration is editable in flight');
  await app.shot('engineer-flight-setup-shown-1280');
  await press(t, app, page.locator('#btn-setup'), 'mouse', '⚙ Setup again');
  t.check(await t.until(() => page.locator('#setup').isHidden(), { timeoutMs: 5000 }), '⚙ Setup did not hide the setup again');

  // the notation changes mid-flight from the telemetry panel
  await page.locator('#telemetry .notation-section select').selectOption('gost');
  t.check(await t.until(() => page.evaluate(() => document.querySelector('#telemetry .notation-section select')?.value === 'gost'), { timeoutMs: 5000 }), 'the notation did not change mid-flight');
  t.check(await page.evaluate(() => document.body.dataset.setup) === 'collapsed', 'changing the notation reopened the setup');

  // U16: the actual engine level beside the command, once the engines run
  await app.mcp('control_playback', { action: 'warp', warp: 5 });
  const engines = await t.until(async () => {
    const text = await page.evaluate(() => document.querySelector('#hud [data-row="engines"]')?.textContent ?? '');
    return /\d+ %/.test(text) ? text : null;
  }, { timeoutMs: 60_000, intervalMs: 500 });
  t.check(engines, 'the HUD has no actual engine level after liftoff');
  if (engines) t.log(`engines row: ${engines}`);

  // R2.2: a picked view survives the ascent's phase changes
  await press(t, app, page.locator('.cam-btn[data-cam="space"]'), 'mouse', 'space view');
  t.check(await page.locator('#btn-cinematic').getAttribute('aria-pressed') === 'false', 'picking a view left Cinematic on');
  await app.mcp('control_playback', { action: 'warp', warp: 25 });
  const t0 = (await state()).cursorTimeS;
  const flownOn = await t.until(async () => (await state()).cursorTimeS > Math.max(t0, 0) + 140, { timeoutMs: 120_000, intervalMs: 1000 });
  t.check(flownOn, 'the flight did not fly on through staging');
  const s1 = await state();
  t.check(s1.camera === 'space', `the picked view did not survive the ascent: ${s1.camera} at T+${s1.cursorTimeS.toFixed(0)} s`);
  await press(t, app, page.locator('#btn-cinematic'), 'mouse', 'Cinematic');
  t.check(await page.locator('#btn-cinematic').getAttribute('aria-pressed') === 'true', 'Cinematic is not marked on');
  t.log(`Cinematic gives ${(await state()).camera} at T+${(await state()).cursorTimeS.toFixed(0)} s`);
  await pauseStaysInFlight(t, app);

  // R2.4: the event chooser
  await chooser(t, app);
  t.check(await page.evaluate(() => document.body.dataset.flightStage === 'flight' && document.body.dataset.setup === 'collapsed'),
    'replaying reopened the setup');

  // New mission brings the setup back
  await press(t, app, page.locator('#btn-setup'), 'mouse', '⚙ Setup before New mission');
  await press(t, app, page.locator('#setup .launch-area .ghost-button'), 'mouse', 'New mission');
  t.check(await t.until(() => page.evaluate(() => document.body.dataset.flightStage === 'setup' && document.body.dataset.setup === 'shown'), { timeoutMs: RESPOND_MS }),
    'New mission did not return to the setup');
  t.check(await page.locator('#btn-setup').isHidden(), '⚙ Setup is still offered back in setup');
  t.check(await page.locator('#setup select').first().isEnabled(), 'the setup is still read-only after New mission');
  app.checkErrors();
  await app.context.close();
}

/**
 * R2.1 / U11: launch with the real Launch button; the setup folds away and the
 * scene takes its width (the renderer resizes the canvas, nothing is
 * stretched). Resolves to false only when the button could not be pressed.
 */
export async function launchFolds(t, app) {
  const { page } = app;
  const box = (sel) => page.locator(sel).boundingBox();
  const before = { viewport: await box('#viewport'), canvas: await page.evaluate(() => document.getElementById('gl').width) };
  if (!await press(t, app, page.locator('#setup .launch-button'), 'mouse', 'Launch')) return false;
  const collapsed = await t.until(() => page.evaluate(() => document.body.dataset.setup === 'collapsed' && document.body.dataset.flightStage === 'flight'), { timeoutMs: RESPOND_MS });
  t.check(collapsed, 'launching did not collapse the setup into the flight stage');
  t.check(await page.locator('#setup').isHidden(), 'the setup panel is still on screen in flight');
  // the renderer follows the new size on its next frames
  const grown = await t.until(async () => {
    const v = await box('#viewport');
    const c = await page.evaluate(() => document.getElementById('gl').width);
    return v && v.width > before.viewport.width + 200 && c > before.canvas ? { v, c } : null;
  }, { timeoutMs: RESPOND_MS, intervalMs: 250 });
  t.check(grown, `the scene did not take the setup's width (viewport ${before.viewport.width} px, canvas ${before.canvas} px before)`);
  if (grown) t.log(`scene ${before.viewport.width.toFixed(0)} → ${grown.v.width.toFixed(0)} px; canvas ${before.canvas} → ${grown.c} px`);
  const workspace = await box('.workspace');
  if (grown && workspace) t.check(grown.v.width / workspace.width >= 0.6, `the scene has ${(100 * grown.v.width / workspace.width).toFixed(0)} % of the workspace width, below the 60 % layout target`);
  return true;
}

/** R2.1: pausing keeps the flight stage and the folded setup; nothing restarts. */
export async function pauseStaysInFlight(t, app) {
  const { page } = app;
  await app.mcp('control_playback', { action: 'pause' });
  // the shell follows the lifecycle once a frame (src/main.ts syncLifecycle): read it after two
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  t.check(await page.evaluate(() => document.body.dataset.flightStage) === 'flight', 'pausing left the flight stage');
  t.check(await page.evaluate(() => document.body.dataset.setup) === 'collapsed', 'pausing brought the setup back');
  const s = await app.mcp('read_flight_state');
  t.check(s.hasMission && !s.playing, `the flight is not paused (mission ${s.hasMission}, playing ${s.playing})`);
}

/**
 * R2.4: a cluster chip on the event bar opens the chooser listing its events.
 * `how` is the pointer (mouse or touch); `label` names the screenshots (null:
 * none, which saves the smoke slice about 7 s of software-rendered captures). The
 * chip and the list, or null when the chooser did not open.
 */
export async function openChooser(t, app, { how = 'mouse', label = 'engineer' } = {}) {
  const { page } = app;
  const cluster = page.locator('.tl-chip.cluster:not(.collapsed)').first();
  const found = await t.until(async () => (await cluster.count()) > 0 && cluster.isVisible(), { timeoutMs: RESPOND_MS });
  if (!t.check(found, 'no clustered events on the bar')) return null;
  // on a phone the bar can sit below the fold, under the compact flight bar: bring it up as a person would
  await cluster.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
  if (label) await app.shot(`${label}-timeline-before-chooser`);
  if (!await press(t, app, cluster, how, 'cluster chip')) return null;
  const list = page.locator('.tl-chooser');
  if (!t.check(await t.until(() => list.isVisible(), { timeoutMs: 5000 }), 'the cluster chip did not open the chooser')) return null;
  const n = await list.locator('.tl-chooser-item').count();
  t.check(n >= 2, `the chooser lists ${n} events`);
  t.check(await cluster.getAttribute('aria-expanded') === 'true', 'the chip is not marked expanded');
  if (label) await app.shot(`${label}-timeline-chooser`);
  return { cluster, list };
}

async function chooser(t, app) {
  const { page } = app;
  const opened = await openChooser(t, app);
  if (!opened) return;
  const { list } = opened;
  // arrows move within the list and do not seek
  const cursor0 = (await app.mcp('read_flight_state')).cursorTimeS;
  const focused0 = await page.evaluate(() => document.activeElement?.className ?? '');
  t.check(focused0.includes('tl-chooser-item'), `the chooser did not take the focus (${focused0})`);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(300);
  const cursor1 = (await app.mcp('read_flight_state')).cursorTimeS;
  t.check(Math.abs(cursor1 - cursor0) < 1e-6, `an arrow in the list seeked the flight (${cursor0} → ${cursor1})`);
  // choose the focused row: it seeks to that event's exact recorded time
  const chosen = await page.evaluate(() => document.activeElement?.querySelector('.tl-chooser-name')?.textContent ?? '');
  const events = (await app.mcp('get_events', {})).events;
  await page.keyboard.press('Enter');
  t.check(await t.until(() => list.isHidden(), { timeoutMs: 5000 }), 'choosing an event did not close the chooser');
  const after = await app.mcp('read_flight_state');
  const exact = events.some((e) => Math.abs(e.timeS - after.cursorTimeS) < 1e-6);
  t.check(after.mode === 'replay' || exact, `choosing "${chosen}" did not seek`);
  t.check(exact, `the cursor T+${after.cursorTimeS} is not an event's recorded time`);
  t.log(`chose "${chosen}" → T+${after.cursorTimeS.toFixed(3)} s (${after.mode})`);
  // Escape closes and gives the focus back to the chip
  const chip = page.locator('.tl-chip.cluster:not(.collapsed)').first();
  if (await chip.count()) {
    await press(t, app, chip, 'mouse', 'cluster chip again');
    if (await t.until(() => list.isVisible(), { timeoutMs: 5000 })) {
      await page.keyboard.press('Escape');
      t.check(await t.until(() => list.isHidden(), { timeoutMs: 5000 }), 'Escape did not close the chooser');
      t.check(await page.evaluate(() => document.activeElement?.classList.contains('tl-chip')), 'Escape did not return the focus to the chip');
    }
  }
}

/** R2.3: a preset hides and shows cards, a card can be added, and the choice survives a reload. */
async function cards(t) {
  const app = await t.open({ hash: '#/launch/engineer' });
  const { page } = app;
  const visible = (id) => page.locator(`#telemetry canvas.chart[data-chart="${id}"]`).isVisible();
  const preset = page.locator('#telemetry .tel-cards select');
  await preset.waitFor();
  t.check(await visible('q') && await visible('apsides'), 'every card is not shown by default');
  await preset.selectOption('orbit');
  t.check(await t.until(async () => !(await visible('q')) && await visible('apsides'), { timeoutMs: 5000 }), 'the Orbit preset did not hide q and show the apsides');
  t.check(await page.locator('#btn-play').isVisible() && await page.locator('#clock').isVisible(), 'a preset hid the clock or the playback controls');
  t.check(await page.locator('#telemetry .events').isVisible(), 'a preset hid the event log');
  await page.locator('#telemetry .tel-cards-choose summary').click();
  await page.locator('#telemetry .tel-cards-grid input[data-card="mass"]').check();
  t.check(await t.until(() => visible('mass'), { timeoutMs: 5000 }), 'ticking a card did not show it');
  t.check(await preset.inputValue() === 'custom', 'ticking a card did not make the layout Custom');
  await app.shot('engineer-cards-custom');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await app.ready();
  await page.locator('#telemetry .tel-cards select').waitFor();
  t.check(await page.locator('#telemetry .tel-cards select').inputValue() === 'custom' && await visible('mass') && !(await visible('q')),
    'the card choice did not survive a reload');
  await page.locator('#telemetry .tel-cards select').selectOption('all');
  t.check(await t.until(() => visible('q'), { timeoutMs: 5000 }), 'All cards did not bring q back');
  app.checkErrors();
  await app.context.close();
}

async function watch(t) {
  const app = await t.open({ hash: '#/launch/watch' });
  const { page } = app;
  const state = () => app.mcp('read_flight_state');
  const pick = page.locator('.watch-picker .watch-mission').first();
  await pick.waitFor({ timeout: 60_000 });
  await press(t, app, pick, 'mouse', 'a launch');
  t.check(await t.until(() => page.locator('#camera-tabs').isVisible(), { timeoutMs: RESPOND_MS }), 'the Watch viewer has no camera views');
  await app.shot('watch-camera-tabs');
  await press(t, app, page.locator('.cam-btn[data-cam="onboard"]'), 'mouse', 'Watch onboard view');
  t.check((await state()).camera === 'onboard', 'Watch did not take the onboard view');
  await app.mcp('control_playback', { action: 'warp', warp: 25 });
  const ok = await t.until(async () => (await state()).cursorTimeS > 150, { timeoutMs: 120_000, intervalMs: 1000 });
  t.check(ok, 'the Watch flight did not fly on');
  const s = await state();
  t.check(s.camera === 'onboard', `Watch's picked view did not survive the phase changes: ${s.camera} at T+${s.cursorTimeS.toFixed(0)} s`);
  await press(t, app, page.locator('#btn-cinematic'), 'mouse', 'Watch Cinematic');
  t.check(await page.locator('#btn-cinematic').getAttribute('aria-pressed') === 'true', 'Watch Cinematic is not marked on');
  app.checkErrors();
  await app.context.close();
}

async function phone(t) {
  const app = await t.open({ hash: '#/launch/engineer', viewport: 'mobile', touch: true });
  const { page } = app;
  await page.locator('#setup .launch-button').waitFor();
  const launched = await app.mcp('launch_mission', {});
  t.check(launched.ok, `launch_mission on a phone: ${JSON.stringify(launched)}`);
  t.check(await t.until(() => page.evaluate(() => document.body.dataset.setup === 'collapsed'), { timeoutMs: RESPOND_MS }), 'the phone did not collapse the setup');
  await page.locator('#telemetry').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const bar = page.locator('#mobile-flight-bar');
  t.check(await t.until(() => bar.isVisible(), { timeoutMs: 5000 }), 'no compact flight bar while reading the charts');
  await app.shot('phone-flight-bar');
  const p0 = (await app.mcp('read_flight_state')).playing;
  await press(t, app, page.locator('#mfb-play'), 'touch', 'phone bar play/pause');
  t.check(await t.until(async () => (await app.mcp('read_flight_state')).playing !== p0, { timeoutMs: 5000 }), 'the phone bar did not play/pause the flight');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  t.check(overflow <= 1, `the phone page scrolls sideways by ${overflow} px`);
  app.checkErrors();
  await app.context.close();
}

/** A short laptop and a narrow Russian phone in flight: nothing scrolls sideways, the controls stay reachable. */
async function narrow(t) {
  for (const [viewport, lang, label] of [[{ width: 1024, height: 700 }, 'en', 'laptop-1024'], [{ width: 320, height: 740 }, 'ru', 'phone-320-ru'], [{ width: 390, height: 844 }, 'th', 'phone-390-th']]) {
    const app = await t.open({ hash: '#/launch/engineer', viewport, lang, touch: viewport.width < 600 });
    const { page } = app;
    await page.locator('#setup .launch-button').waitFor();
    await app.mcp('launch_mission', {});
    t.check(await t.until(() => page.evaluate(() => document.body.dataset.setup === 'collapsed'), { timeoutMs: RESPOND_MS }), `${label}: the setup did not collapse`);
    await page.waitForTimeout(800);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    t.check(overflow <= 1, `${label}: the page scrolls sideways by ${overflow} px`);
    for (const sel of ['#btn-play', '#btn-setup', '#clock']) {
      const b = await page.locator(sel).boundingBox();
      t.check(b && b.x >= 0 && b.x + b.width <= viewport.width + 1, `${label}: ${sel} is off screen (${JSON.stringify(b)})`);
    }
    await app.shot(`flight-${label}`);
    app.checkErrors();
    await app.context.close();
  }
}
