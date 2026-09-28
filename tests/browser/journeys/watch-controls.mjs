/**
 * Watch answers every control while a flight is running — by mouse, by
 * keyboard and by touch (audit 2026-09-27: "100×, Choose a launch and Another
 * launch had no effect while the simulation advanced", cause never
 * established; code-review.md "Watch click failure").
 *
 * Each input runs the same sequence in a fresh page: pick a launch from the
 * list the viewer opens with, pause, play, 100×, Choose a launch → a second
 * launch, 100×, then Another launch from the end card. Every press is a real
 * input at the control's centre (a covering element fails the journey, it is
 * not waited out), and every response is read back from the simulation
 * itself through WebMCP — playing, warp, the vehicle flying, the clock
 * moving or standing — not only from the button's own look.
 */
import { press, keyOn } from '../harness.mjs';

export const smoke = true;
export const timeoutMs = 420_000;

/** The software-rendered page draws about two frames a second: allow a response this long. */
const RESPOND_MS = 20_000;

/** The launch picked first in each pass (none of them a Soyuz, so the second pick visibly changes the vehicle). */
const FIRST = { mouse: 'falcon9Bandwagon', keyboard: 'electronSso', touch: 'ariane6AmazonLeo' };
/** The second: the T-10-1 pad abort, which ends (the crew safe) within a few seconds at 100×. */
const SECOND = 'soyuzT10';

export default async function watchControls(t) {
  for (const how of ['mouse', 'keyboard', 'touch']) {
    const app = await t.open({ hash: '#/launch/watch', touch: how === 'touch' });
    t.log(`${how}: page ready`);
    const before = t.failures.length;
    await exercise(t, app, how);
    app.checkErrors();
    if (t.failures.length > before) await app.shot(`${how}-failed`);
    await app.context.close();
  }
}

async function exercise(t, app, how) {
  const { page } = app;
  const state = () => app.mcp('read_flight_state');
  const dom = () => page.evaluate(() => {
    const picker = document.querySelector('.watch-picker');
    const end = document.querySelector('.watch-end');
    const play = document.querySelector('.watch-play');
    return {
      picker: !!picker && !picker.hidden,
      end: !!end && !end.hidden,
      playLabel: play?.getAttribute('aria-label') ?? null,
      pressed: [...document.querySelectorAll('.watch-speed[aria-pressed="true"]')].map((b) => b.dataset.speed),
    };
  });
  const act = async (locator, what) => {
    if (how === 'keyboard') return keyOn(t, app, locator, what.includes('100×') ? 'Space' : 'Enter', `${how}: ${what}`);
    return press(t, app, locator, how, `${how}: ${what}`);
  };
  /** Wait until `pred(state, dom)` holds; fail with `what` (and the last reading) if it never does. */
  const expect = async (pred, what, timeoutMs = RESPOND_MS) => {
    let last;
    const ok = await t.until(async () => { last = { s: await state(), d: await dom() }; return pred(last.s, last.d); }, { timeoutMs, intervalMs: 250 });
    if (!ok) t.fail(`${how}: ${what} — did not happen within ${timeoutMs / 1000} s (playing ${last?.s.playing}, warp ${last?.s.warp}, T${last?.s.cursorTimeS}, vehicle ${last?.s.vehicle?.id}, picker ${last?.d.picker}, end card ${last?.d.end}, play button "${last?.d.playLabel}")`);
    return !!ok;
  };
  const advancing = async (what) => {
    const t0 = (await state()).cursorTimeS;
    return expect((s) => s.cursorTimeS > t0 + 0.2, `${what}: the mission clock moves on from T${t0.toFixed(1)}`);
  };
  const standing = async (what) => {
    const t0 = (await state()).cursorTimeS;
    await page.waitForTimeout(3000);
    const t1 = (await state()).cursorTimeS;
    t.check(Math.abs(t1 - t0) < 1e-6, `${how}: ${what}: the clock still ran (T${t0.toFixed(2)} → T${t1.toFixed(2)})`);
  };
  const mission = (id) => page.locator(`.watch-picker .watch-mission[data-mission="${id}"]`);
  const vehicleOf = async (id) => (await mission(id).locator('.watch-mission-vehicle').textContent()).split(' · ')[0].trim();
  const playBtn = page.locator('.watch-play');
  const speed100 = page.locator('.watch-speed[data-speed="100"]');
  const chooseBtn = page.locator('.watch-missions-btn');

  // 1. the viewer opens idle, on its list of launches: pick one
  if (!(await expect((s, d) => d.picker, 'the launch list is open on arrival'))) return;
  const firstVehicle = await vehicleOf(FIRST[how]);
  if (!(await act(mission(FIRST[how]), `the "${FIRST[how]}" launch`))) return;
  if (!(await expect((s, d) => !d.picker && s.vehicle?.name === firstVehicle && s.playing, `picking "${FIRST[how]}" launches ${firstVehicle}`, 60_000))) return;
  await advancing('after the first launch');

  // 2. pause and play, with the flight running
  await act(playBtn, 'pause');
  if (await expect((s, d) => !s.playing && d.playLabel === 'Play', 'pause stops the flight and the button offers Play')) await standing('paused');
  if (how === 'keyboard') {
    // the space bar anywhere but on a control is the play/pause shortcut
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('Space');
    await expect((s, d) => s.playing && d.playLabel === 'Pause', 'the space bar plays again');
  } else {
    await act(playBtn, 'play');
    await expect((s, d) => s.playing && d.playLabel === 'Pause', 'play runs the flight again and the button offers Pause');
  }
  await advancing('after play');

  // 3. 100× (by keyboard with the space bar on the button: the button takes it, playback does not toggle)
  await act(speed100, '100×');
  await expect((s, d) => s.warp === 100 && d.pressed.join() === '100', '100× sets the time warp to 100 and marks the button');
  t.check((await state()).playing, `${how}: 100× paused the flight`);

  // 4. Choose a launch → a second launch, while the first is flying
  await act(chooseBtn, 'Choose a launch');
  if (!(await expect((s, d) => d.picker, 'Choose a launch opens the list'))) return;
  if (how === 'keyboard') {
    await page.keyboard.press('Escape');
    await expect((s, d) => !d.picker, 'Escape closes the list');
    await act(chooseBtn, 'Choose a launch (again)');
    if (!(await expect((s, d) => d.picker, 'Choose a launch opens the list again'))) return;
  }
  const secondVehicle = await vehicleOf(SECOND);
  const cursorBefore = (await state()).cursorTimeS;
  if (!(await act(mission(SECOND), `the "${SECOND}" launch`))) return;
  if (!(await expect((s, d) => !d.picker && s.vehicle?.name === secondVehicle && s.cursorTimeS < cursorBefore && s.playing,
    `picking "${SECOND}" replaces the flight with a new ${secondVehicle} count-down`, 60_000))) return;
  await advancing('after the second launch');

  // 5. 100× again (a new launch starts at the automatic pace), to the end card
  await act(speed100, '100× (second flight)');
  await expect((s) => s.warp === 100, '100× sets the time warp on the second flight');
  if (!(await expect((s, d) => d.end, 'the pad abort reaches its end card', 120_000))) return;

  // 6. Another launch
  const another = page.locator('.watch-end .watch-btn', { hasText: 'Another launch' });
  if (!t.check(await another.count() === 1, `${how}: the end card has no "Another launch" button`)) return;
  await act(another, 'Another launch');
  await expect((s, d) => d.picker && !d.end, 'Another launch opens the list in place of the end card');
  t.log(`${how}: every control answered`);
}
