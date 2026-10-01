/**
 * The lesson packs on the built app (roadmap T03): the five bundled packs are
 * in the service worker's precache, the lessons page fetches them and lists
 * each as a group with its curriculum codes and a draft's notice, and a
 * point-mass pack lesson (12.1, Kepler's third law on a transfer orbit:
 * Falcon 9 to GTO, about 550 s of flight) opened from its card is flown live,
 * answered from the result's heights and graded a pass. Then (T03b) a pack's
 * design lesson (13.4: a THEOS-2-class imager's cells and battery) opened
 * from its card fails as it starts and passes with the worked design handed
 * in. tests/lesson-packs.test.ts and tests/lesson-packs-design.test.ts work
 * every pack lesson's solution headless; this checks the page.
 * Point-mass, about a minute on a loaded 4-core machine (64 s on 2026-10-01): smoke.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const smoke = true;
export const timeoutMs = 300_000;

const PACKS = ['ipst-basic', 'ipst-earth-space', 'ipst-physics', 'rtaf-academy', 'ru-24-05-06'];

export default async function lessonPacks(t) {
  // offline: every pack file is precached, as the rest of public/ is
  if (t.distDir) {
    const sw = join(t.distDir, 'sw.js');
    if (t.check(existsSync(sw), 'dist/sw.js is missing')) {
      const code = readFileSync(sw, 'utf8');
      for (const id of PACKS) t.check(code.includes(`lessons/packs/${id}.orbitlab-lesson.json`), `${id} is not in the precache manifest`);
    }
  }

  const app = await t.open({ hash: '#/lessons' });
  const { page } = app;
  const listed = await t.until(() => page.evaluate(() => document.querySelectorAll('.lesson-pack').length === 5), { timeoutMs: 60_000, intervalMs: 500 });
  if (!t.check(listed, 'the five lesson packs did not appear on the lessons page')) return;
  const packs = await page.evaluate(() => [...document.querySelectorAll('.lesson-pack')].map((p) => ({
    id: p.dataset.pack, draft: !!p.querySelector('.lesson-pack-draft'), cards: p.querySelectorAll('.lesson-card-item').length, codes: p.querySelectorAll('.lesson-code').length,
  })));
  t.log(packs.map((p) => `${p.id}: ${p.cards} lessons, ${p.codes} codes`).join('; '));
  t.check(packs.map((p) => p.id).join() === PACKS.join(), `packs listed: ${packs.map((p) => p.id).join()}`);
  t.check(packs.every((p) => p.draft), 'a pack awaiting review does not say it is a draft');
  t.check(packs.every((p) => p.cards >= 4 && p.codes >= p.cards), 'a pack lists too few lessons or codes');
  // the pack's lessons are not the app's: the progress count is unchanged
  const badge = await page.textContent('#btn-lessons .lesson-badge');
  t.check(/\/24$/.test(badge ?? ''), `the progress count took the packs in: ${badge}`);

  // 12.1, from its card
  await page.evaluate(() => document.querySelector('.lesson-pack[data-pack="ipst-earth-space"] .lesson-card-item').scrollIntoView({ block: 'center' }));
  await page.click('.lesson-pack[data-pack="ipst-earth-space"] .lesson-card-item', { noWaitAfter: true });
  const opened = await t.until(() => page.evaluate(() => document.body.dataset.lesson === 'ipst-a-kepler3'
    && /IPST/.test(document.querySelector('.lesson-strip .lesson-eyebrow')?.textContent ?? '')), { timeoutMs: 60_000, intervalMs: 500 });
  if (!t.check(opened, 'lesson 12.1 did not open under its pack')) return;
  const launched = await app.mcp('launch_mission', {});
  if (!t.check(launched.ok, `launch_mission: ${JSON.stringify(launched)}`)) return;
  await app.mcp('control_playback', { action: 'warp', warp: 1000 });
  const t0 = Date.now();
  const graded = await t.until(() => page.evaluate(() => document.querySelectorAll('.lesson-answers input').length === 3), { timeoutMs: 180_000, intervalMs: 1000 });
  if (!t.check(graded, 'the flight did not end for grading')) { await app.shot('not-graded'); return; }
  t.log(`flown to its grade in ${((Date.now() - t0) / 1000).toFixed(0)} s`);

  // what a student types: the heights of the event log's "Target orbit achieved" line, through Kepler's third law
  const events = await app.mcp('get_events', {});
  const insertion = events.events.find((e) => e.key === 'evt.targetOrbit');
  if (!t.check(insertion, 'no "Target orbit achieved" in the event log')) return;
  const hp = Number(insertion.params.pe), ha = Number(insertion.params.ap);
  const MU = 398600.4418, R = 6378.137, rp = R + hp, ra = R + ha, a = (rp + ra) / 2;
  const answers = [a.toFixed(1), (2 * Math.PI * Math.sqrt(a ** 3 / MU) / 60).toFixed(2), ((ra - rp) / (ra + rp)).toFixed(4)];
  const inputs = page.locator('.lesson-answers input');
  for (let i = 0; i < 3; i++) await inputs.nth(i).fill(answers[i]);
  await page.click('.lesson-answers button[type="submit"]', { noWaitAfter: true });
  const verdict = await t.until(async () => {
    const r = await app.mcp('get_lesson_result', {});
    return r?.flightEnded && r.verdict !== 'open' && !r.awaitingAnswers?.length ? r.verdict : null;
  }, { timeoutMs: 30_000, intervalMs: 500 });
  t.check(verdict === 'pass', `lesson 12.1 graded ${verdict} with ${answers.join(', ')} (${hp} × ${ha} km)`);
  // and "Next" goes on in the pack, to 12.2
  const next = await page.evaluate(() => [...document.querySelectorAll('.lesson-actions button')].some((b) => /12\.2/.test(b.textContent ?? '')));
  t.check(next, '"Next" does not go on to the pack\'s next lesson, 12.2');
  await app.shot('graded');

  // T03b: a pack's design lesson (13.4, sunlight into electricity: a THEOS-2-class imager's cells and battery)
  // opens the satellite designer from its card, fails as it starts, and passes with the worked design handed in
  await page.evaluate(() => { location.hash = '#/lessons'; });
  await t.until(() => page.evaluate(() => document.querySelectorAll('.lesson-pack').length === 5), { timeoutMs: 60_000, intervalMs: 500 });
  const designCard = page.locator('.lesson-pack[data-pack="ipst-physics"] .lesson-card-item', { hasText: '13.4 ' }).first();
  await designCard.scrollIntoViewIfNeeded();
  await designCard.click({ noWaitAfter: true });
  const desk = await t.until(() => page.evaluate(() => document.body.dataset.lesson === 'ipst-p-solar-power'
    && !!document.querySelector('.lesson-strip.design:not([hidden])') && !!document.querySelector('input[data-path="power.arrayArea"]')), { timeoutMs: 60_000, intervalMs: 500 });
  if (!t.check(desk, 'lesson 13.4 did not open the designer under its pack')) return;
  const locked = await page.evaluate(() => [document.querySelector('input[data-path="power.payloadW"]')?.disabled, document.querySelector('input[data-path="power.arrayArea"]')?.disabled]);
  t.check(locked[0] === true && locked[1] === false, `13.4's locks: payload ${locked[0]}, cells ${locked[1]}`);
  await page.click('.lesson-design-answers button[type=submit]');
  const failed = await t.until(() => page.evaluate(() => document.querySelectorAll('.lesson-strip .lesson-crit.fail').length === 2), { timeoutMs: 60_000, intervalMs: 500 });
  t.check(failed, 'the start design of 13.4 did not fail its power and battery criteria');
  for (const [path, value] of [['power.arrayArea', '6.5'], ['power.batteryWh', '1800']]) {
    const box = page.locator(`input[data-path="${path}"]:visible`);
    await box.fill(value);
    await box.press('Tab');
  }
  // the longest eclipse, as "At a glance" prints it
  const eclipse = (await page.locator('.bsat-summary .bx-sum').nth(1).locator('dd').textContent()).replace(/[^0-9.]/g, '');
  await page.fill('.lesson-design-answers input', eclipse);
  await page.click('.lesson-design-answers button.lesson-primary');
  const handedIn = await t.until(() => page.evaluate(() => (document.querySelector('.lesson-strip .lesson-note.pass') && document.querySelector('.lesson-strip .lesson-note.ok') ? 'pass'
    : document.querySelector('.lesson-strip .lesson-note.fail')?.textContent ?? null)), { timeoutMs: 60_000, intervalMs: 500 });
  t.check(handedIn === 'pass', `lesson 13.4 with 6.5 m², 1 800 Wh and ${eclipse} min: ${handedIn}`);
  await app.shot('design-handed-in');
  app.checkErrors();
}
