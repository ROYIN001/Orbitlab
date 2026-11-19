/**
 * R2.6 (M-LAUNCH-062): the transport row as the clock runs, where a change of
 * the clock's words or digits changes the row's fit (described in
 * r2-transport-fit). r2-transport-fit-launch has (h), (j) and (l)'s other
 * cells, each journey within half its time limit.
 *
 * (l) As in r2-transport-fit-launch, the row takes no more lines than the
 *     base's (166e1577), emulated in the page, and leaves the scene as tall,
 *     and at the fit's level 3 it needs at least 4 px less on one line:
 *     Engineer in flight with the setup reopened at EN 1292×900 and 918×1200,
 *     and Explore's count-down at RU 320×740, where an earlier build's sweep
 *     found the row taller than the base's (COUNTDOWN_CELLS).
 * (m) A change of the fit's level that the clock causes, not the user's hand,
 *     moves no button of the transport group (⚙ Setup, prev, play, skip, Live,
 *     Abort: their boxes to 0.5 px in the frames just before and just after
 *     the change, read once each frame is drawn): Explore RU from the
 *     count-down through T+0, when the clock's line changes words, and
 *     Engineer with the setup reopened, RU, as its clock passes T+1:00:00 and
 *     gains a digit, each at a width found in the page's font (fitWidth)
 *     where the change takes the fit to another level. The level must change.
 *     Engineer's is flown on a launch of its own with the point-mass model
 *     the app offers (launch_mission's physicsModel), as r2-transport-fit's
 *     (f): to T+59:45 in some 46 s, where the six-DOF flight takes some
 *     94 s; the row there is the same.
 *     Read until the clock shows the change (the HUD's 0.1 s tick writes it,
 *     frames after the cursor gets there) and two frames after it with the
 *     fit's level unchanged.
 */
import { press } from '../harness.mjs';
import { setLanguage } from './r2-event-jump.mjs';
import { COUNTDOWN_CELLS, rowAtMost, rowState } from './r2-transport-fit-launch.mjs';

export const smoke = true;
export const timeoutMs = 600_000;

const RESPOND_MS = 20_000;
// (m) how far inside its band of widths a cell is taken (fitWidth): the hour's clock is two mono characters wider
// (some 27 px), and in RU T+0's clock line under the digits some 40 px narrower than the count-down's
const BAND_MARGIN = 4;

export default async function r2TransportFitClock(t) {
  await exploreClock(t);
  await setupInFlight(t);
}

/**
 * (m) The width (px) at `height` of a cell where the clock's coming change will change the fit's level, found with the
 * playback paused before it, in the font the page has: in the first of `bands` (each [from, to], one arrangement of the
 * workspace's columns) whose ends straddle it, the narrowest width at which the row's fit is at level 2 or lower on one
 * line (bisected, each width read once two frames have been drawn after the resize), moved by `by` and kept in the band;
 * at that width the fit must be at level `want` on one line. Null (recorded) when there is none.
 */
async function fitWidth(t, app, height, bands, by, want, where) {
  const at = async (width) => {
    await app.page.setViewportSize({ width, height });
    await app.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    return app.page.evaluate(rowState, false);
  };
  const low = (m) => m.lines.length === 1 && Number(m.fit) <= 2;
  for (const [from, to] of bands) {
    if (low(await at(from)) || !low(await at(to))) continue;
    let [lo, hi] = [from, to];
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (low(await at(mid))) hi = mid; else lo = mid;
    }
    const width = Math.min(to, Math.max(from, hi + by));
    const m = await at(width);
    t.log(`${where}: the cell is ${width}×${height} (level 2 or below on one line from ${hi} px)`);
    return t.check(m.lines.length === 1 && m.fit === want, `${where}: at ${width}×${height} (level 2 from ${hi} px) the row's fit is at level ${m.fit} on ${m.lines.length} lines (${m.lines.join(' / ')}; clock ${m.clock}), not ${want} on one`) ? width : null;
  }
  t.fail(`${where}: no band of widths (${bands.map(([a, b]) => `${a}–${b}`).join(', ')} px) at ${height} px in which the row's fit goes to level 2 or lower on one line`);
  return null;
}

/**
 * (m) From now on, once each frame has been drawn (after the row's fit), the boxes of the transport group's buttons and
 * the row's data-fit; a reading is kept whenever either changes, until groupStill reads them. It also counts the
 * frames, and notes the first one in which #clock reads `clock` and the last one in which the fit changed level.
 */
const watchGroup = (page, clock) => page.evaluate((src) => {
  const ids = ['btn-setup', 'btn-prev', 'btn-play', 'btn-skip', 'btn-live', 'btn-abort'];
  const row = document.querySelector('.ctl-row');
  const re = new RegExp(src);
  const w = window.__group = { seen: [], on: true, frame: 0, shown: null, fitFrame: 0 };
  const read = () => ids.map((id) => { const e = document.getElementById(id); if (!e.getClientRects().length) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
  const tick = () => setTimeout(() => {
    const last = w.seen[w.seen.length - 1];
    const now = { fit: row.dataset.fit, boxes: read(), clock: document.getElementById('clock').textContent };
    w.frame++;
    if (last && last.fit !== now.fit) w.fitFrame = w.frame;
    if (w.shown === null && re.test(now.clock)) w.shown = w.frame;
    if (!last || last.fit !== now.fit || JSON.stringify(last.boxes) !== JSON.stringify(now.boxes)) w.seen.push(now);
    if (w.on) requestAnimationFrame(tick);
  }, 0);
  requestAnimationFrame(tick);
}, clock.source);

/**
 * (m) Since watchGroup #clock read its `clock`, the change of words or digits the row's fit follows (the narration
 * writes it on the HUD's 0.1 s tick, frames after the cursor gets there), and then two frames were drawn with no change
 * of the fit's level: the clock it reads, or null when that did not happen within a minute.
 */
const clockShown = (t, page) => t.until(() => page.evaluate(() => {
  const w = window.__group;
  return w.shown !== null && w.frame >= Math.max(w.shown, w.fitFrame) + 2 && document.getElementById('clock').textContent;
}), { timeoutMs: 60_000, intervalMs: 100 });

/**
 * (m) Since watchGroup the fit changed level, and across each change (the reading before it, the reading of the frame
 * that drew it) no button of the group moved by more than 0.5 px; what moves the group at other times (playing shows
 * the achieved-warp line under the row, as in the base) is not the fit's.
 */
async function groupStill(t, app, where) {
  const { seen, clock } = await app.page.evaluate(() => { window.__group.on = false; return { seen: window.__group.seen, clock: document.getElementById('clock').textContent }; });
  const changes = seen.map((s, i) => i > 0 && s.fit !== seen[i - 1].fit ? [seen[i - 1], s] : null).filter(Boolean);
  if (!t.check(changes.length > 0, `${where}: the row's fit kept level ${seen[0]?.fit} (clock ${seen.map((s) => s.clock).join(', ')} … ${clock})`)) return;
  const ids = ['⚙ Setup', 'prev', 'play', 'skip', 'Live', 'Abort'];
  const moved = [];
  for (const [a, b] of changes) {
    b.boxes.forEach((y, i) => {
      const x = a.boxes[i];
      const at = `as data-fit went ${a.fit} → ${b.fit} (${a.clock} → ${b.clock})`;
      if ((x === null) !== (y === null)) moved.push(`${ids[i]} ${y ? 'shown' : 'hidden'} ${at}`);
      else if (x && y.some((v, k) => Math.abs(v - x[k]) > 0.5)) moved.push(`${ids[i]} by ${y.map((v, k) => (v - x[k]).toFixed(1)).join(', ')} ${at}`);
    });
  }
  t.check(moved.length === 0, `${where}: the fit's level change moved ${moved.join('; ')} (x, y, width, height)`);
}

/**
 * (l) Explore's count-down cells, paused straight after launch; then (m) RU, at a width where T+0's shorter clock line
 * takes the fit from level 3 to 2 (1198 px in Inter, 1202 px in DejaVu Sans), played through T+0.
 */
async function exploreClock(t) {
  const app = await t.open({ hash: '#/launch/explore', viewport: { width: 1181, height: 800 }, lang: 'ru' });
  const { page } = app;
  try {
    await page.locator('#setup .launch-button').waitFor();
    const launched = await app.mcp('launch_mission', {});
    if (!t.check(launched.ok, `(m) Explore launch_mission ${JSON.stringify(launched)}`)) return;
    await app.mcp('control_playback', { action: 'pause' });
    for (const [mode, lang, width, height] of COUNTDOWN_CELLS) if (mode === 'explore') await rowAtMost(t, app, lang, width, height, '(l) Explore count-down');
    await setLanguage(t, app, 'ru');
    const width = await fitWidth(t, app, 800, [[1181, 1400], [1401, 1920], [861, 1180]], -BAND_MARGIN, '3', '(m) Explore RU, the count-down');
    if (!width) return;
    await watchGroup(page, /^T\+/);
    await app.mcp('control_playback', { action: 'play' });
    const shown = await clockShown(t, page);
    if (!t.check(shown, `(m) Explore RU ${width}×800: the clock never showed T+0 and the row's fit since (it reads ${await page.locator('#clock').textContent()})`)) return;
    await groupStill(t, app, `(m) Explore RU ${width}×800, from the count-down through T+0`);
  } finally {
    app.checkErrors();
    await app.context.close();
  }
}

/**
 * (l) Engineer in flight with the setup reopened; then (m) on a launch of its own with the point-mass model, RU, paused
 * just before T+1:00:00 at a width where the hour's wider clock will take the fit from level 2 to 3 (1445 px in Inter,
 * 1459 px in DejaVu Sans; in English the clock's line under the digits is the wider, and the digit changes nothing),
 * played through it.
 */
async function setupInFlight(t) {
  const app = await t.open({ hash: '#/launch/engineer', viewport: { width: 1440, height: 900 } });
  const { page } = app;
  const state = () => app.mcp('read_flight_state');
  try {
    await page.locator('#setup .launch-button').waitFor();
    const launched = await app.mcp('launch_mission', {});
    if (!t.check(launched.ok, `(l) Engineer launch_mission ${JSON.stringify(launched)}`)) return;
    await app.mcp('control_playback', { action: 'warp', warp: 10 });
    if (!t.check(await t.until(async () => (await state()).headTimeS > 30, { timeoutMs: 120_000, intervalMs: 250 }), '(l) the Engineer flight never got to T+30 s')) return;
    await app.mcp('control_playback', { action: 'warp', warp: 1 });
    if (!await press(t, app, page.locator('#btn-setup'), 'mouse', '(l) ⚙ Setup')) return;
    if (!t.check(await t.until(() => page.locator('#setup').isVisible(), { timeoutMs: RESPOND_MS }), '(l) ⚙ Setup did not show the setup')) return;
    await rowAtMost(t, app, 'en', 1292, 900, '(l) Engineer, the setup reopened in flight');
    await rowAtMost(t, app, 'en', 918, 1200, '(l) Engineer, the setup reopened in flight');
    // (m) a launch of its own with the point-mass model, the setup still reopened, fast-forwarded live with the app's
    // own warp to just before T+1:00:00, then played through it
    const relaunched = await app.mcp('launch_mission', { physicsModel: 'pointMass' });
    if (!t.check(relaunched.ok, `(m) Engineer launch_mission ${JSON.stringify(relaunched)}`)) return;
    await setLanguage(t, app, 'ru');
    await page.setViewportSize({ width: 1440, height: 900 });
    // a frame asks the flight's worker for at most half a second of the warp, and two requests may still be on their way
    // when the warp changes (src/main.ts, src/session/session.ts), so a leg ends past its mark (measured: some 160 s at
    // warp 500, up to 5 s at warp 50, about 1 s at warp 5), short of the next mark; a runner slow enough to carry the
    // flight into the hour fails the check after the legs, with its own message
    for (const [warp, timeS, timeoutMs] of [[500, 2500, 240_000], [50, 3500, 120_000], [5, 3585, 120_000]]) {
      await app.mcp('control_playback', { action: 'warp', warp });
      const there = await t.until(async () => (await state()).cursorTimeS >= timeS, { timeoutMs, intervalMs: 100 });
      if (!t.check(there, `(m) Engineer: at warp ${warp} the flight did not get to T+${timeS} s in ${timeoutMs / 1000} s (it is at T+${(await state()).cursorTimeS} s)`)) return;
    }
    await app.mcp('control_playback', { action: 'pause' });
    const near = (await state()).cursorTimeS;
    if (!t.check(near < 3598, `(m) Engineer: the flight is at T+${near} s, not just before T+1:00:00`)) return;
    if (!t.check(await page.locator('#setup').isVisible(), '(m) Engineer: the relaunch did not keep the setup shown')) return;
    const width = await fitWidth(t, app, 900, [[1401, 1920], [1181, 1400]], BAND_MARGIN, '2', '(m) Engineer RU, the setup reopened, just before T+1:00:00');
    if (!width) return;
    await watchGroup(page, /^T\+\d+:\d\d:\d\d$/);
    await app.mcp('control_playback', { action: 'play' });
    const shown = await clockShown(t, page);
    if (!t.check(shown, `(m) Engineer: the clock never showed T+1:00:00 and the row's fit since (it reads ${await page.locator('#clock').textContent()} at T+${(await state()).cursorTimeS})`)) return;
    await groupStill(t, app, `(m) Engineer RU ${width}×900, the setup reopened, as the clock passes T+1:00:00`);
  } finally {
    app.checkErrors();
    await app.context.close();
  }
}
