/**
 * FX-2 PR1 (M-LEARNING-001, S10 §10.5): while a design lesson's lifetime
 * check runs, its progress ticks leave the answer field alone — the same
 * element keeps the focus, the value typed and the caret, while the
 * figure on the progress line moves.
 *
 * No bundled design lesson asks for the lifetime (the only measure that
 * reports progress), so the journey opens a one-lesson file made from the
 * re-check fixture's `class-theos` (tests/fixtures/recheck/), which asks for
 * `sat.lifetime` and has one typed answer (the swath).
 *
 * Written 2026-10-05 for FX-2 PR1; its first run is pending (the integration
 * session runs the browser journeys). Not smoke: it waits on a worker run.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const timeoutMs = 180_000;

const SCENARIO = fileURLToPath(new URL('../../fixtures/recheck/scenario.orbitlab-lesson.json', import.meta.url));
const LESSON_ID = 'class-theos';

export default async function fx2DesignCheckFocus(t) {
  const scenario = JSON.parse(readFileSync(SCENARIO, 'utf8'));
  const lesson = scenario.lessons.find((l) => l.id === LESSON_ID);
  if (!t.check(lesson?.criteria?.some((c) => c.measure === 'sat.lifetime'), `${LESSON_ID} in the fixture no longer asks for the lifetime`)) return;
  const file = { ...scenario, lessons: [lesson] };

  const app = await t.open({ hash: '#/lessons', viewport: 'desktop' });
  const { page } = app;
  const input = page.locator('.lesson-catalog input[type=file]');
  await t.until(() => input.count().then((n) => n === 1), { timeoutMs: 60_000, intervalMs: 500 });
  await input.setInputFiles({ name: 'fx2.orbitlab-lesson.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
  const loaded = await t.until(() => page.evaluate(() => !!document.querySelector('.lesson-file-notice')), { timeoutMs: 30_000, intervalMs: 250 });
  if (!t.check(loaded, 'the lesson file was not taken')) return;

  const started = await app.mcp('start_lesson', { id: LESSON_ID });
  if (!t.check(started?.ok, `start_lesson: ${JSON.stringify(started)}`)) return;
  const answer = page.locator('.lesson-strip .lesson-design-answers input[type=text]').first();
  const ready = await t.until(() => answer.count().then((n) => n === 1), { timeoutMs: 60_000, intervalMs: 500 });
  if (!t.check(ready, 'the design strip did not show its answer field')) return;

  // start the check (the strip is built once for it, as designed), then type into the field it shows
  await page.click('.lesson-strip .lesson-design-answers button[type=submit]', { noWaitAfter: true });
  const running = await t.until(() => page.evaluate(() => !!document.querySelector('.lesson-strip .lesson-status p.lesson-note > span[role=status]')), { timeoutMs: 30_000, intervalMs: 100 });
  if (!t.check(running, 'the check did not start')) return;
  await answer.click();
  await answer.pressSequentially('123.4');
  await answer.press('ArrowLeft');
  await answer.press('ArrowLeft');
  // mark the element, so a rebuilt field (a new element with the draft restored) is told apart
  await page.evaluate(() => { document.activeElement.dataset.fx2 = 'kept'; });
  const shownText = () => page.evaluate(() => document.querySelector('.lesson-strip .lesson-status p.lesson-note > span[aria-hidden=true]')?.textContent ?? null);
  const first = await shownText();

  // progress moves: the figure seen changes at least twice while the field keeps everything
  const seen = new Set(first ? [first] : []);
  const moved = await t.until(async () => {
    const now = await shownText();
    if (now === null) return 'finished';
    seen.add(now);
    return seen.size >= 3 ? 'moved' : null;
  }, { timeoutMs: 90_000, intervalMs: 50 });
  t.log(`progress lines seen: ${[...seen].join(' | ')}`);
  if (!t.check(moved === 'moved', `the progress line did not move while focused (${moved}; seen ${seen.size})`)) { await app.shot('no-progress'); return; }

  const state = await page.evaluate(() => {
    const el = document.activeElement;
    return { kept: el?.dataset?.fx2 === 'kept', tag: el?.tagName, value: el?.value, caret: [el?.selectionStart, el?.selectionEnd], connected: !!el?.isConnected };
  });
  t.log(`focus after ticks: ${JSON.stringify(state)}`);
  t.check(state.kept && state.connected, `the focused answer field was replaced during the check (${JSON.stringify(state)})`);
  t.check(state.value === '123.4', `the typed value changed: ${state.value}`);
  t.check(state.caret[0] === 3 && state.caret[1] === 3, `the caret moved: ${state.caret}`);
  const announced = await page.evaluate(() => document.querySelector('.lesson-strip .lesson-status p.lesson-note > span[role=status]')?.textContent ?? '');
  t.check(announced.length > 0, 'the live region (role=status) is empty during the check');
  await app.shot('typing-during-check');
  app.checkErrors();
}
