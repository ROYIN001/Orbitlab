/**
 * The `r2-shell-smoke` phone step under a slow renderer, made deterministic
 * (smoke-chooser-race, docs/development/reports/smoke-chooser-race.md).
 *
 * On CI's software GPU an animation frame can take longer than a second. The
 * physics worker's replies change the recording's head between frames (in
 * `worker.onmessage`), but the live cursor and the event bar only catch up on
 * the next frame (`updateVisuals`). So "two equal reads a second apart" could
 * hold while the bar on screen was still laid out for an older head; the frame
 * that drew the new head then moved the cluster chip between the harness
 * finding it under the press point and the tap arriving, and the tap landed
 * on the bar beside it, which seeks (CI run 37473120257: the chooser stayed
 * shut and the cursor was at a pixel's time, T+2.73 s, behind the head).
 *
 * Here every animation frame is held for FRAME_MS, the flight is paused as the
 * smoke slice pauses it, and the next held frame is run at the worst moment:
 * inside the harness's `elementFromPoint` check, right after it has found the
 * chip and before the tap is sent. `pausedFlightSettles` has to have waited
 * for a frame that drew the settled flight, or the chip moves and the chooser
 * does not open.
 */
import { pausedFlightSettles, openChooser } from './r2-flight-shell.mjs';

export const smoke = true;
export const timeoutMs = 120_000;

const RESPOND_MS = 20_000;
/** longer than the settle check's second between reads, as on CI's SwiftShader */
const FRAME_MS = 2500;

export default async function r2ChooserLateFrame(t) {
  const app = await t.open({ hash: '#/launch/engineer', viewport: 'mobile', lang: 'th', touch: true });
  const { page } = app;
  await page.locator('#setup .launch-button').waitFor();
  const launched = await app.mcp('launch_mission', {});
  if (!t.check(launched.ok, `launch_mission: ${JSON.stringify(launched)}`)) return;
  if (!t.check(await t.until(() => page.evaluate(() => document.body.dataset.setup === 'collapsed'), { timeoutMs: RESPOND_MS }), 'the phone did not collapse the setup')) return;
  await app.mcp('control_playback', { action: 'warp', warp: 10 });
  // Slow frames from here on: the worker is asked for half a second of wall
  // time per frame, five seconds of flight at warp 10, as on CI.
  await page.evaluate((frameMs) => {
    const raf = window.requestAnimationFrame.bind(window);
    const pending = new Map();
    let next = 1;
    window.requestAnimationFrame = (cb) => {
      const id = next++;
      pending.set(id, { cb, timer: setTimeout(() => { pending.delete(id); raf(cb); }, frameMs) });
      return id;
    };
    window.cancelAnimationFrame = (id) => { const p = pending.get(id); if (p) clearTimeout(p.timer); pending.delete(id); };
    // Armed by the journey: the next elementFromPoint (the harness's hit
    // check) runs every held frame once it has its answer.
    window.__lateFrame = { armed: false, ran: 0 };
    const elementFromPoint = document.elementFromPoint.bind(document);
    document.elementFromPoint = (x, y) => {
      const hit = elementFromPoint(x, y);
      if (window.__lateFrame.armed) {
        window.__lateFrame.armed = false;
        for (const [id, p] of [...pending]) {
          clearTimeout(p.timer);
          pending.delete(id);
          p.cb(performance.now());
          window.__lateFrame.ran++;
        }
      }
      return hit;
    };
  }, FRAME_MS);
  const state = () => app.mcp('read_flight_state');
  if (!t.check(await t.until(async () => (await state()).cursorTimeS > 1, { timeoutMs: 60_000, intervalMs: 250 }), 'the slowed flight did not lift off')) return;
  await app.mcp('control_playback', { action: 'pause' });
  if (!await pausedFlightSettles(t, app)) return;
  const settled = await state();
  await page.evaluate(() => { window.__lateFrame.armed = true; });
  const opened = await openChooser(t, app, { how: 'touch', label: null });
  const late = await page.evaluate(() => window.__lateFrame);
  t.check(late.ran > 0, 'no held frame ran between the hit check and the tap: this check proves nothing');
  const after = await state();
  t.log(`settled at cursor T+${settled.cursorTimeS.toFixed(2)} s, head T+${settled.headTimeS.toFixed(2)} s; ${late.ran} late frame(s) at the press; chooser ${opened ? 'open' : 'shut'}, cursor now T+${after.cursorTimeS.toFixed(2)} s (${after.mode})`);
  if (opened) t.check(after.mode === 'live', `opening the chooser seeked the flight (cursor T+${after.cursorTimeS} s, ${after.mode})`);
  app.checkErrors();
  await app.context.close();
}
