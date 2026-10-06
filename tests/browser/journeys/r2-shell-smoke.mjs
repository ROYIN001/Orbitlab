/**
 * The R2 flight shell's PR smoke slice (CO-5, M-LAUNCH-020): the parts of
 * `r2-flight-shell` that break first when the Launch Engineer layout
 * regresses, in under a minute, so pull requests are gated on them. The full
 * journey (420 s) runs on Pages only.
 *
 * - R2.1 / U11: the real Launch button folds the setup away and the scene
 *   takes its width; pausing stays in flight with the setup folded.
 * - The flight commands stay reachable: the six-DOF flight controls
 *   (`#rigid-controls`) of the flight on screen, and the TORU panel
 *   (`#toru-controls`) where the app shows it. A live approach takes about
 *   85 s of flying on a 4-core machine, too long for this slice, so the TORU
 *   panel's `hidden` attribute is dropped, the panel measured in the same task
 *   and hidden again. At a real approach the app also hides `#rigid-controls`;
 *   this check keeps that panel showing, so it guards against TORU being
 *   removed, hidden by CSS or pushed off screen, not reach at the approach
 *   (that is `r2-viewport-matrix` on Pages; CO-3 finding F1).
 * - R2.4: on a 390 px Thai phone, the event chooser opens from a cluster
 *   chip by touch and fits the screen; the page does not scroll sideways.
 *
 * The launch fold, the pause and the opening of the chooser are the same
 * steps the full journey runs (exported from `r2-flight-shell.mjs`).
 */
import { reachable } from '../harness.mjs';
import { launchFolds, pauseStaysInFlight, pausedFlightSettles, openChooser } from './r2-flight-shell.mjs';

export const smoke = true;
export const timeoutMs = 90_000;

const RESPOND_MS = 20_000;

export default async function r2ShellSmoke(t) {
  await desktop(t);
  await thaiPhone(t);
}

async function desktop(t) {
  const app = await t.open({ hash: '#/launch/engineer' });
  const { page } = app;
  await page.locator('#setup .launch-button').waitFor();
  if (!await launchFolds(t, app)) return;

  // the default Engineer flight is six-DOF: its controls come up with the flight
  const rigid = page.locator('#rigid-controls');
  if (t.check(await t.until(() => rigid.isVisible(), { timeoutMs: RESPOND_MS }), 'no 6-DOF flight controls in the six-DOF flight')) {
    await reachable(t, app, rigid.locator('summary').first(), '6-DOF flight controls (#rigid-controls)');
  }

  await pauseStaysInFlight(t, app);

  // TORU: shown as the approach shows it, measured, hidden again, all in one task
  const toru = await page.evaluate(() => {
    const host = document.getElementById('toru-controls');
    if (!host) return { missing: true };
    const was = host.hidden;
    host.hidden = false;
    try {
      const take = host.querySelector('.toru-take');
      if (!take) return { noButton: true };
      take.scrollIntoView({ block: 'center', inline: 'nearest' });
      const r = take.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return {
        display: getComputedStyle(host).display,
        box: { x: r.x, y: r.y, width: r.width, height: r.height },
        vw: document.documentElement.clientWidth, vh: innerHeight,
        hit: top === take || take.contains(top),
        on: top ? `${top.tagName.toLowerCase()}${top.id ? `#${top.id}` : ''}.${[...top.classList].join('.')}` : 'nothing',
      };
    } finally {
      host.hidden = was;
    }
  });
  if (t.check(!toru.missing && !toru.noButton, `no TORU panel or take-over button (${JSON.stringify(toru)})`)) {
    const { box, vw, vh } = toru;
    t.check(toru.display !== 'none' && box.width > 0 && box.height > 0, `the TORU panel is not laid out when shown (display ${toru.display}, ${JSON.stringify(box)})`);
    t.check(box.x >= -1 && box.y >= -1 && box.x + box.width <= vw + 1 && box.y + box.height <= vh + 1,
      `TORU's take-over button is off screen (${JSON.stringify(box)} in ${vw}×${vh})`);
    t.check(toru.hit, `a press on TORU's take-over button would land on ${toru.on}`);
  }
  app.checkErrors();
  await app.context.close();
}

/** R2.4 on a 390 px Thai phone: the event chooser opens by touch and fits the screen. */
async function thaiPhone(t) {
  const app = await t.open({ hash: '#/launch/engineer', viewport: 'mobile', lang: 'th', touch: true });
  const { page } = app;
  await page.locator('#setup .launch-button').waitFor();
  t.check(await page.evaluate(() => document.documentElement.lang) === 'th', 'the page is not in Thai');
  const launched = await app.mcp('launch_mission', {});
  t.check(launched.ok, `launch_mission on a phone: ${JSON.stringify(launched)}`);
  if (!t.check(await t.until(() => page.evaluate(() => document.body.dataset.setup === 'collapsed'), { timeoutMs: RESPOND_MS }), 'the phone did not collapse the setup')) return;
  // ignition and liftoff are a cluster on a 390 px bar from T+0: skip the countdown
  await app.mcp('control_playback', { action: 'warp', warp: 10 });
  const state = () => app.mcp('read_flight_state');
  if (!t.check(await t.until(async () => (await state()).cursorTimeS > 1, { timeoutMs: RESPOND_MS, intervalMs: 250 }), 'the phone flight did not lift off')) return;
  // While recording, each new event can re-lead a cluster on the rescaled bar,
  // which closes an open chooser by design (src/ui/timeline.ts). Pause, and let
  // the frames the worker still had in flight arrive (CO-4), before pressing.
  await app.mcp('control_playback', { action: 'pause' });
  if (!await pausedFlightSettles(t, app)) return;
  const opened = await openChooser(t, app, { how: 'touch', label: null });
  if (opened) {
    const fit = await opened.list.evaluate((list) => {
      const r = list.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, vw: document.documentElement.clientWidth, vh: innerHeight,
        thai: /[฀-๿]/.test(list.querySelector('.tl-chooser-head')?.textContent ?? '') };
    });
    t.check(fit.left >= 0 && fit.right <= fit.vw + 1 && fit.top >= 0 && fit.bottom <= fit.vh + 1,
      `the chooser does not fit the 390 px screen (${JSON.stringify(fit)})`);
    t.check(fit.thai, 'the chooser is not labelled in Thai');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    t.check(overflow <= 1, `with the chooser open the page scrolls sideways by ${overflow} px`);
  }
  app.checkErrors();
  await app.context.close();
}
