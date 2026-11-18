/**
 * R2.6 (M-LAUNCH-062): the transport row that holds the event-jump opener
 * (#btn-jump) keeps one line where the clock, the setup or a phone's width
 * makes it longer. The row's fit (src/main.ts bindControls, fitLevel in
 * src/ui/event-jump.ts, the levels in src/style.css) measures the row's height
 * at four levels: 0 nothing hidden, 1 its two column gaps narrowed, 2 the
 * warp's word hidden as well, 3 the opener's word as well; it keeps the lowest
 * level at which the row is least tall. The row's other legs, each journey
 * within half its time limit: r2-transport-fit-launch ((h), (j) and (l) as the
 * flight starts) and r2-transport-fit-clock ((l) and (m) as the clock runs);
 * r2-event-jump checks the opener's menu.
 *
 * (f) The clock past an hour, the flight fast-forwarded live with the app's
 *     own warp: Explore past T+1:00:00 and Engineer (whose row is longer)
 *     past T+10:00:00, both RU at 1181×800: the transport row keeps one line.
 *     Each flies a launch of its own with the point-mass model the app offers
 *     (launch_mission's physicsModel): there in some 3 s, where the six-DOF
 *     ascent takes some 95 s; the row there is the same.
 * (g) Engineer with the setup reopened in flight (⚙ Setup and Abort in the
 *     row), RU 1440×900, TH 1280×800, RU and EN 1366×768: the row keeps one
 *     line, and the opener's name holds its word; where the fit hides the
 *     word (data-fit 3) the opener shows its chapter-list icon alone and is
 *     no wider than 34 px, elsewhere its word and ▾ and no icon; and while
 *     nothing changes size its fit does nothing.
 * (k) Engineer in flight (⚙ Setup in the row), TH, RU and EN at 320, 360, 390,
 *     412 and 768 px, where the transport group may take a second line: Abort
 *     (one tap, no confirmation) ends its line, so on a line below prev, play
 *     and skip it lies under none of them.
 * Engineer's legs start where r2-event-jump's (d) leaves the flight
 * (liftoffJump) and run (k), (g), then (f) on a launch of its own; Explore's
 * (f) flies a launch of its own.
 */
import { press } from '../harness.mjs';
import { liftoffJump, openerNamed, setLanguage } from './r2-event-jump.mjs';

export const smoke = true;
export const timeoutMs = 600_000;

const RESPOND_MS = 20_000;

export default async function r2TransportFit(t) {
  await exploreHour(t);
  await engineerInFlight(t);
}

/**
 * The transport row once a frame has been drawn, so after the row's own fit (src/main.ts bindControls): the parts
 * of it off play/pause's line, the clock, whether the opener is displayed and enabled, and the mission time.
 */
export const rowLine = (page) => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => setTimeout(async () => {
  const play = document.getElementById('btn-play').getBoundingClientRect();
  const off = [...document.querySelectorAll('.ctl-row :is(.ctl-group > *, .mission-clock, .jump-btn, .warp)')].filter((e) => e.getClientRects().length > 0)
    .filter((e) => { const r = e.getBoundingClientRect(); return !(r.top < play.bottom && r.bottom > play.top); }).map((e) => e.id || e.className);
  const clock = document.getElementById('clock').textContent;
  const o = document.getElementById('btn-jump');
  const opener = o.getClientRects().length > 0 && !o.disabled;
  done({ off, clock, opener, T: (await window.__mcp('read_flight_state')).cursorTimeS });
}))));

/** Wider than 860 px the transport row keeps one line (a second one takes its height from the scene); the reading. */
async function rowKeepsOneLine(t, app, lang, width, height, where) {
  await setLanguage(t, app, lang);
  await app.page.setViewportSize({ width, height });
  await app.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const m = await rowLine(app.page);
  t.check(m.off.length === 0, `${where}, ${lang.toUpperCase()} ${width}×${height}: the transport row takes more than one line (${m.off.join(', ')} off play/pause's line; clock ${m.clock})`);
  return m;
}

/** (f) Fast-forward the live flight with the app's own warp until the mission time passes `timeS`; paused there. */
async function flyPast(t, app, timeS, warp, where) {
  for (const action of ['live', 'play']) await app.mcp('control_playback', { action });
  await app.mcp('control_playback', { action: 'warp', warp });
  const past = await t.until(async () => (await app.mcp('read_flight_state')).cursorTimeS >= timeS, { timeoutMs: 180_000, intervalMs: 100 });
  await app.mcp('control_playback', { action: 'pause' });
  return t.check(past, `${where}: the flight never got past T+${timeS} s (T+${(await app.mcp('read_flight_state')).cursorTimeS})`);
}

/** (f) Explore's own launch, fast-forwarded past T+1:00:00 (it reaches its analysis near T+56 min and the clock runs on). */
async function exploreHour(t) {
  const app = await t.open({ hash: '#/launch/explore', viewport: 'laptop-1280x800' });
  const { page } = app;
  try {
    await page.locator('#setup .launch-button').waitFor();
    // a launch that fails leaves the clock short of an hour, which flyPast's check reports; point-mass gets there fast
    await app.mcp('launch_mission', { physicsModel: 'pointMass' });
    if (await flyPast(t, app, 3600, 5000, '(f) Explore')) {
      const m = await rowKeepsOneLine(t, app, 'ru', 1181, 800, '(f) Explore, the clock past T+1:00:00');
      t.check(/^T\+\d:\d\d:\d\d$/.test(m.clock), `(f) Explore: the clock reads ${m.clock}, not an hour past liftoff`);
    }
  } finally {
    app.checkErrors();
    await app.context.close();
  }
}

/**
 * (k) and (g) on Engineer's first launch, from the pause after the jump to liftoff of r2-event-jump's (d); then (f)
 * on a launch of its own with the point-mass model.
 */
async function engineerInFlight(t) {
  const app = await t.open({ hash: '#/launch/engineer', viewport: 'laptop-1280x800' });
  try {
    if (!await liftoffJump(t, app)) return;
    await abortEndsItsLine(t, app);
    await setupReopened(t, app);
    // (f) Engineer's row is longer (⚙ Setup, Abort): it first wraps with a two-digit hour; point-mass gets there fast
    const relaunched = await app.mcp('launch_mission', { physicsModel: 'pointMass' });
    if (t.check(relaunched.ok, `(f) Engineer launch_mission ${JSON.stringify(relaunched)}`) && await flyPast(t, app, 36_000, 50_000, '(f) Engineer')) {
      const m = await rowKeepsOneLine(t, app, 'ru', 1181, 800, '(f) Engineer, the clock past T+10:00:00');
      t.check(/^T\+\d\d:\d\d:\d\d$/.test(m.clock), `(f) Engineer: the clock reads ${m.clock}, not ten hours past liftoff`);
    }
  } finally {
    app.checkErrors();
    await app.context.close();
  }
}

/** (k) On a phone or a narrow tablet, where the transport group wraps, Abort ends its line (src/style.css). */
async function abortEndsItsLine(t, app) {
  for (const lang of ['th', 'ru', 'en']) {
    await setLanguage(t, app, lang);
    for (const width of [320, 360, 390, 412, 768]) {
      await app.page.setViewportSize({ width, height: 800 });
      await app.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const m = await app.page.evaluate(() => {
        const a = document.getElementById('btn-abort').getBoundingClientRect();
        // on a line below one of them, over its horizontal span
        const under = ['btn-prev', 'btn-play', 'btn-skip'].filter((id) => {
          const b = document.getElementById(id).getBoundingClientRect();
          return a.top >= b.bottom - 0.5 && a.left < b.right - 0.5 && a.right > b.left + 0.5;
        });
        return { shown: a.width > 0, under, x: `${Math.round(a.left)}…${Math.round(a.right)}` };
      });
      const where = `(k) Engineer ${lang.toUpperCase()} ${width} px`;
      if (!t.check(m.shown, `${where}: Abort is not displayed`)) continue;
      t.check(m.under.length === 0, `${where}: Abort (x ${m.x}), on a line of the transport group below them, lies under ${m.under.join(', ')}`);
    }
  }
  await setLanguage(t, app, 'en');
  await app.page.setViewportSize({ width: 1280, height: 800 });
}

/** (g) Engineer, live, with the setup reopened (⚙ Setup): the setup's column narrows the row that holds ⚙ Setup and Abort. */
async function setupReopened(t, app) {
  const { page } = app;
  for (const action of ['live', 'play']) await app.mcp('control_playback', { action });
  if (!await press(t, app, page.locator('#btn-setup'), 'mouse', '(g) ⚙ Setup')) return;
  if (!t.check(await t.until(() => page.locator('#setup').isVisible(), { timeoutMs: RESPOND_MS }), '(g) ⚙ Setup did not show the setup')) return;
  for (const [lang, width, height] of [['ru', 1440, 900], ['th', 1280, 800], ['ru', 1366, 768], ['en', 1366, 768]]) {
    await rowKeepsOneLine(t, app, lang, width, height, '(g) Engineer, the setup reopened in flight');
    // the word names the opener also where the row's fit hides it (data-fit 3)
    const where = `(g) ${lang.toUpperCase()} ${width}×${height}, data-fit ${await page.locator('.ctl-row').getAttribute('data-fit')}`;
    await openerNamed(t, app, lang, where);
    // at level 3 its chapter-list icon alone, in the bare ▾ opener's 34 px; below 3 its word and ▾, no icon (src/style.css)
    const look = await page.evaluate(() => {
      const o = document.getElementById('btn-jump');
      const shown = (e) => !!e && e.getClientRects().length > 0;
      return { fit: o.closest('.ctl-row').dataset.fit, spans: [...o.querySelectorAll(':scope > span')].map(shown), icon: shown(o.querySelector(':scope > svg')), width: o.getBoundingClientRect().width };
    });
    const three = look.fit === '3';
    t.check(look.icon === three && look.spans.every((s) => s !== three) && (!three || look.width <= 34.5),
      `${where}: the opener shows ${look.icon ? 'its icon' : 'no icon'}, its word and ▾ ${look.spans.map((s) => (s ? 'shown' : 'hidden')).join(' and ')}, ${look.width} px wide`);
  }
  // settled: with the clock running and nothing changing size, the fit runs no more (it writes data-fit for each level it tries)
  const writes = await page.evaluate(() => new Promise((done) => {
    let n = 0;
    const o = new MutationObserver((list) => { n += list.length; });
    o.observe(document.querySelector('.ctl-row'), { attributes: true, attributeFilter: ['data-fit'] });
    setTimeout(() => { o.disconnect(); done(n); }, 2000);
  }));
  t.check(writes === 0, `(g) with nothing changing size the transport row's fit wrote data-fit ${writes} times in 2 s`);
  await press(t, app, page.locator('#btn-setup'), 'mouse', '(g) ⚙ Setup again');
  t.check(await t.until(() => page.locator('#setup').isHidden(), { timeoutMs: RESPOND_MS }), '(g) ⚙ Setup did not hide the setup again');
}
