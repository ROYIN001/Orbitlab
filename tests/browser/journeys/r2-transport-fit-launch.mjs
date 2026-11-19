/**
 * R2.6 (M-LAUNCH-062): the transport row as a flight starts, from the
 * count-down to the first key event, which enables the event-jump opener
 * (#btn-jump). The row's fit is described in r2-transport-fit;
 * r2-transport-fit-clock has (l)'s other cells and (m), each journey within
 * half its time limit.
 *
 * (h) Explore's pad-fire challenge, RU 1280×800: its fail event at T−6 s
 *     enables the opener while the clock line still reads the count-down's,
 *     and moves nothing in the row (as in (j)); from then to T+0 the row keeps
 *     one line.
 * (j) Engineer's nominal launch, EN 1366×768, RU 1440×900, TH 1280×800 and
 *     853×533, EN 390×844, RU 320×740: the first key event (liftoff) moves none
 *     of Abort, Live, play and the clock (their boxes to 0.5 px, read just
 *     before and just after it enables the opener).
 * (l) The row takes no more lines than the base's (166e1577) and leaves the
 *     scene as tall, the base's row emulated in the page (rowState), in any
 *     font, and on one line at the fit's level 3 it needs at least 4 px less
 *     than the base's (its column gaps narrowed by 6 px: to 8 px, below 861 px
 *     to 4 px, without which English there has less than 4 px of room):
 *     Engineer's analysis stage after a pad fire with the setup reopened
 *     at EN 1292×1000, its count-down at RU 768×1024 and 744×1133, and its
 *     count-down cells where an earlier build's sweep found the row
 *     taller than the base's (not at 320 px: COUNTDOWN_CELLS); but where the
 *     base's transport group runs past the row's edge (finding F2; in the CI's
 *     DejaVu Sans to EN 360 and RU 392 px), this build's takes a line of its
 *     own (the phone rule, src/style.css). (l)'s other cells are in
 *     r2-transport-fit-clock.
 */
import { press } from '../harness.mjs';
import { setLanguage, shortLabel } from './r2-event-jump.mjs';
import { rowLine } from './r2-transport-fit.mjs';

export const smoke = true;
export const timeoutMs = 600_000;

const RESPOND_MS = 20_000;
const opener = (page) => page.locator('#btn-jump');
// (l) the count-down cells an earlier build's sweep found taller than the base's: mode, language, width, height.
// Not Engineer's at 320 px: there the base's group does not fit the row (it runs past the row's edge, in RU and EN out
// of the window, finding F2; in TH, to 330 px, it squeezes Live and Abort narrower than their words) and this build's
// takes a second line (the phone rule).
export const COUNTDOWN_CELLS = [['explore', 'ru', 320, 740],
  ['engineer', 'th', 360, 740], ['engineer', 'th', 390, 844], ['engineer', 'th', 412, 915],
  ['engineer', 'ru', 360, 740], ['engineer', 'ru', 390, 844], ['engineer', 'ru', 412, 915],
  ['engineer', 'en', 360, 740], ['engineer', 'en', 390, 844], ['engineer', 'en', 412, 915]];

export default async function r2TransportFitLaunch(t) {
  await padFire(t);
  await firstKeyEvent(t);
}

/**
 * In the page, once a frame has been drawn (so after the row's own fit): the transport row's lines (each its parts'
 * ids), the parts past its edge, its height, the scene's (#viewport), data-fit and the clock; with `base`, also the
 * same of the base's row (166e1577) in this page: in this one task, so with no frame drawn in between, what this build
 * adds to the row is taken out (the jump opener; data-fit, the fit's narrowed gaps and hidden words; the phone rule's
 * wrapping transport group and Abort at its line's end, src/style.css), the row read, and all put back. The base
 * build's own row reads the same lines, parts past its edge and height, and above 860 px the same scene; up to 860 px
 * the stacked column gives the scene the height of the canvas the renderer last sized, which one task does not redo, so
 * there the scene is the one this page would have with the base's row now. With `base` the row's need on one line (its
 * width laid out at max-content) is read too, at the fit's level 3 (need3) and of the base's row (base.need).
 */
export function rowState(base) {
  return new Promise((done) => requestAnimationFrame(() => setTimeout(() => {
    const row = document.querySelector('.ctl-row');
    const read = () => {
      const edge = row.getBoundingClientRect();
      const parts = [...row.querySelectorAll(':is(.ctl-group > *, .mission-clock, .jump-btn, .warp)')].filter((e) => e.getClientRects().length > 0)
        .map((e) => ({ id: e.id || e.className, r: e.getBoundingClientRect() })).sort((a, b) => a.r.top - b.r.top);
      const lines = [];
      for (const p of parts) {
        const last = lines[lines.length - 1];
        if (last && p.r.top < last.bottom - 0.5) { last.bottom = Math.max(last.bottom, p.r.bottom); last.ids.push(p.id); }
        else lines.push({ bottom: p.r.bottom, ids: [p.id] });
      }
      return { lines: lines.map((l) => l.ids.join(' ')), past: parts.filter((p) => p.r.right > edge.right + 0.5).map((p) => p.id),
        height: edge.height, scene: document.getElementById('viewport').getBoundingClientRect().height };
    };
    const need = () => { row.style.width = 'max-content'; const w = row.getBoundingClientRect().width; row.style.width = ''; return w; };
    const now = { ...read(), fit: row.dataset.fit, clock: document.getElementById('clock').textContent };
    if (base) {
      const [opener, group, abort] = [document.getElementById('btn-jump'), row.querySelector('.ctl-group'), document.getElementById('btn-abort')];
      const kept = [[row, 'data-fit'], [row, 'style'], [opener, 'style'], [group, 'style'], [abort, 'style']].map(([e, name]) => [e, name, e.getAttribute(name)]);
      row.dataset.fit = '3';
      now.need3 = need();
      row.removeAttribute('data-fit');
      opener.style.display = 'none';
      group.style.flexWrap = 'nowrap';
      abort.style.marginInlineStart = '0';
      now.base = { ...read(), need: need() };
      for (const [e, name, v] of kept) if (v === null) e.removeAttribute(name); else e.setAttribute(name, v);
    }
    done(now);
  }, 0)));
}

/**
 * (l) At this size and language the row takes no more lines than the base's (rowState), or one more where the base's
 * transport group runs past the row's edge (this build's then takes a line of its own: the phone rule), and leaves
 * the scene as tall as the base's row would; and on one line at the fit's level 3 it needs at least 4 px less than the
 * base's row.
 */
export async function rowAtMost(t, app, lang, width, height, where) {
  await setLanguage(t, app, lang);
  await app.page.setViewportSize({ width, height });
  await app.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const m = await app.page.evaluate(rowState, true);
  const cell = `${where} ${lang.toUpperCase()} ${width}×${height}`;
  const most = m.base.lines.length + (m.base.past.length ? 1 : 0);
  t.check(m.lines.length <= most, `${cell}: the transport row takes ${m.lines.length} lines (${m.lines.join(' / ')}; data-fit ${m.fit}, clock ${m.clock}), the base's ${m.base.lines.length} (${m.base.lines.join(' / ')})${m.base.past.length ? `, its transport group past the row's edge (${m.base.past.join(', ')})` : ''}`);
  t.check(m.scene >= m.base.scene - 0.5, `${cell}: the scene is ${m.scene} px tall, the base's ${m.base.scene} px`);
  // the level's two narrowed column gaps (6 px each, also below 861 px: src/style.css) leave the opener's icon room
  const room = m.base.need - m.need3;
  t.check(room >= 4, `${cell}: on one line the transport row at level 3 needs ${m.need3.toFixed(2)} px, the base's ${m.base.need.toFixed(2)} px: ${room >= 0 ? `${room.toFixed(2)} px less` : `${(-room).toFixed(2)} px more`}, not at least 4 px less`);
}

/**
 * Before a launch: keep the boxes (x, y, width, height) of Abort, Live, play and the clock just before and just after
 * the jump opener is enabled, the first key event, read in that one task (an own `disabled` setter on the opener), so
 * the clock's own change of words at T+0, which the base makes too, is not counted.
 */
const armFirstEvent = (page) => opener(page).evaluate((o) => {
  const { get, set } = Object.getOwnPropertyDescriptor(HTMLButtonElement.prototype, 'disabled');
  const boxes = () => [...['btn-abort', 'btn-live', 'btn-play'].map((id) => document.getElementById(id)), document.querySelector('.mission-clock')]
    .map((e) => { const r = e.getBoundingClientRect(); return { id: e.id || e.className, box: [r.x, r.y, r.width, r.height] }; });
  window.__firstEvent = null;
  Object.defineProperty(o, 'disabled', { configurable: true, get() { return get.call(this); }, set(v) {
    const before = get.call(this) && !v ? boxes() : null;
    set.call(this, v);
    if (before) { window.__firstEvent = { before, after: boxes() }; delete o.disabled; }
  } });
});

/** The first key event, armed with armFirstEvent, moved none of those boxes by more than 0.5 px. */
async function rowAtFirstEvent(t, app, where) {
  const rec = await t.until(() => app.page.evaluate(() => window.__firstEvent), { timeoutMs: 60_000, intervalMs: 100 });
  if (!t.check(rec, `${where}: no key event enabled the jump opener`)) return;
  const moved = rec.before.map(({ id, box }, i) => ({ id, d: box.map((v, k) => rec.after[i].box[k] - v) })).filter(({ d }) => d.some((v) => Math.abs(v) > 0.5));
  t.check(moved.length === 0, `${where}: the first key event moved ${moved.map(({ id, d }) => `${id} by ${d.map((v) => v.toFixed(1)).join(', ')}`).join('; ')} (x, y, width, height)`);
}

/** (h) Explore's pad-fire challenge, RU 1280×800, from its fail event at T−6 s to T+0. */
async function padFire(t) {
  const app = await t.open({ hash: '#/launch/explore', viewport: 'laptop-1280x800', lang: 'ru' });
  const { page } = app;
  try {
    // the challenge's own card, on a step of Explore's setup that is not the one shown
    await page.locator('#setup .challenge-card[data-failure="padFire"]').dispatchEvent('click');
    await armFirstEvent(page);
    const launched = await app.mcp('launch_mission', {});
    if (!t.check(launched.ok && launched.config?.failure?.mode === 'padFire', `(h) launch_mission ${JSON.stringify(launched)}`)) return;
    const seen = [];
    const end = Date.now() + 60_000;
    for (let m = await rowLine(page); m.T <= 0 && Date.now() < end; m = await rowLine(page)) if (m.T >= -6) seen.push(m);
    const withOpener = seen.filter((m) => m.opener);
    t.check(withOpener.length >= 3, `(h) ${withOpener.length} readings with the opener enabled from T−6 s to T+0 (at T ${seen.map((m) => m.T.toFixed(1)).join(', ')})`);
    const off = seen.filter((m) => m.off.length > 0);
    t.check(off.length === 0, `(h) the transport row takes more than one line at ${off.map((m) => `T${m.T.toFixed(1)} (${m.off.join(', ')})`).join('; ')}`);
    await rowAtFirstEvent(t, app, '(h) Explore RU 1280×800, the pad fire');
  } finally {
    app.checkErrors();
    await app.context.close();
  }
}

/**
 * (l) Engineer's count-down cells, paused straight after launch; then (j) Engineer's nominal launch at six sizes, from
 * the setup each time (New mission): the row at the first key event; then (l) a pad fire flown to its analysis stage.
 */
async function firstKeyEvent(t) {
  const app = await t.open({ hash: '#/launch/engineer', viewport: 'laptop-1366x768' });
  const { page } = app;
  const newMission = async (lang, where) => {
    await page.evaluate((text) => { [...document.querySelectorAll('#setup button')].find((b) => b.textContent?.trim() === text)?.click(); }, shortLabel(lang, 'setup.reset'));
    return t.check(await t.until(() => page.evaluate(() => document.body.dataset.flightStage === 'setup'), { timeoutMs: RESPOND_MS }), `${where}: New mission did not return to the setup`);
  };
  try {
    await page.locator('#setup .launch-button').waitFor();
    let launched = await app.mcp('launch_mission', {});
    if (!t.check(launched.ok, `(l) Engineer launch_mission ${JSON.stringify(launched)}`)) return;
    await app.mcp('control_playback', { action: 'pause' });
    for (const [mode, lang, width, height] of [['engineer', 'ru', 768, 1024], ['engineer', 'ru', 744, 1133], ...COUNTDOWN_CELLS]) {
      if (mode === 'engineer') await rowAtMost(t, app, lang, width, height, '(l) Engineer count-down');
    }
    if (!await newMission((await page.evaluate(() => document.documentElement.lang)), '(l) Engineer count-down')) return;
    for (const [lang, width, height] of [['en', 1366, 768], ['ru', 1440, 900], ['th', 1280, 800], ['th', 853, 533], ['en', 390, 844], ['ru', 320, 740]]) {
      const where = `(j) Engineer ${lang.toUpperCase()} ${width}×${height}`;
      await setLanguage(t, app, lang);
      await page.setViewportSize({ width, height });
      await armFirstEvent(page);
      launched = await app.mcp('launch_mission', {});
      if (!t.check(launched.ok, `${where}: launch_mission ${JSON.stringify(launched)}`)) return;
      await app.mcp('control_playback', { action: 'warp', warp: 5 });
      await rowAtFirstEvent(t, app, where);
      if (!await newMission(lang, where)) return;
    }
    // (l) the analysis stage after a pad fire, the setup reopened
    await setLanguage(t, app, 'en');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await app.mcp('configure_mission', { failureMode: 'padFire' });
    launched = await app.mcp('launch_mission', {});
    if (!t.check(launched.ok, `(l) Engineer pad fire launch_mission ${JSON.stringify(launched)}`)) return;
    await app.mcp('control_playback', { action: 'warp', warp: 1000 });
    const analysis = await t.until(() => page.evaluate(() => document.body.dataset.flightStage === 'analysis'), { timeoutMs: 180_000, intervalMs: 500 });
    if (!t.check(analysis, `(l) the Engineer pad fire did not reach its analysis stage (${await page.evaluate(() => document.body.dataset.flightStage)})`)) return;
    await app.mcp('control_playback', { action: 'warp', warp: 1 });
    if (!await press(t, app, page.locator('#btn-setup'), 'mouse', '(l) analysis: ⚙ Setup')) return;
    if (!t.check(await t.until(() => page.locator('#setup').isVisible(), { timeoutMs: RESPOND_MS }), '(l) analysis: ⚙ Setup did not show the setup')) return;
    await rowAtMost(t, app, 'en', 1292, 1000, '(l) Engineer analysis, the setup reopened');
  } finally {
    app.checkErrors();
    await app.context.close();
  }
}
