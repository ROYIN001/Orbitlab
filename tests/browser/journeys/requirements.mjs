/**
 * D07's requirements page (roadmap D07; Phase 4 map §3), as a student meets
 * it: from the satellite bench's "Start from requirements" to
 * `#/build/engineer/requirements`, the form filled for Bangkok at 0.5 m and
 * 5 days, a run stopped and run again (the lifetime search and the table in
 * their workers), a row the bench cannot take saying why, a row that meets
 * every requirement opened on the bench, and back on the page that row set
 * beside what the bench works out for it: every figure the same, but those
 * the page names a reason for. Then the page on a Thai phone (375×812): no
 * sideways scroll, the orbits as cards.
 */
export const timeoutMs = 360_000;

/** The document never scrolls sideways, nor the Build screen's own scroller; what sticks out, if it does. */
async function sideways(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const screen = document.querySelector('#build-screen');
    const doc = document.scrollingElement.scrollWidth;
    return doc > vw || (screen && screen.scrollWidth > screen.clientWidth + 1) ? `${doc} px wide in ${vw}` : null;
  });
}

export default async function requirements(t) {
  const app = await t.open({ hash: '#/build/engineer', viewport: { width: 1440, height: 900 } });
  const { page } = app;
  await page.click('[data-k="craft:satellite"]');
  await page.click('[data-k="sb:toRequirements"]');
  const opened = await page.waitForFunction(() => location.hash === '#/build/engineer/requirements' && !!document.querySelector('.brq-form'),
    null, { timeout: 30_000 }).then(() => true, () => false);
  if (!t.check(opened, `"Start from requirements" did not open the page (hash ${await page.evaluate(() => location.hash)})`)) return;

  // Bangkok, 0.5 m, 5 days
  await page.selectOption('[data-k="rq:target"]', 'bangkok');
  await page.fill('[data-k="rq:gsd"]', '0.5');
  await page.fill('[data-k="rq:revisitDays"]', '5');
  const cost = (await page.textContent('.brq-run')).replace(/\s+/g, ' ');
  t.check(/\b94 orbits to try \(repeat cycles of 1 to 5 days\)/.test(cost), `the page does not say what the run will take: ${cost}`);

  // a run, stopped
  await page.click('[data-k="rq:run"]');
  await page.waitForSelector('[data-k="rq:stop"]', { timeout: 10_000 });
  await page.waitForTimeout(1000);
  await page.click('[data-k="rq:stop"]');
  await page.waitForSelector('[data-k="rq:run"]', { timeout: 10_000 });
  const stopped = await page.textContent('.brq-run [role="status"]').catch(() => '');
  t.check(/^Stopped/.test(stopped ?? ''), `a Stop is not said: ${stopped}`);
  t.check(!(await page.$('.brq-table')), 'a stopped run left a table');

  // and run again, to the end
  const t0 = Date.now();
  await page.click('[data-k="rq:run"]');
  const done = await page.waitForSelector('.brq-table', { timeout: 240_000 }).then(() => true, () => false);
  if (!t.check(done, 'the table did not come')) return;
  t.log(`table in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  const summary = await page.textContent('.brq-results > .bx-note');
  t.check(/^94 orbits; \d+ of them meet every requirement/.test(summary), `the summary: ${summary}`);
  t.check(await page.evaluate(() => document.querySelectorAll('.brq-plots canvas[role="img"]').length === 2), 'the two charts are not drawn');

  // the highest row needs a focal length past the bench's 100 m: it says so and stays
  await page.locator('.brq-table tbody tr').first().locator('.brq-open').click();
  const refused = await page.textContent('.brq-refused').catch(() => null);
  t.check(/Focal length/.test(refused ?? '') && await page.evaluate(() => location.hash) === '#/build/engineer/requirements',
    `a row the bench cannot take: ${refused}`);

  // a row that meets every requirement, on the bench
  await page.click('[data-k="rq:only"]');
  const row = page.locator('.brq-table tbody tr.meets').first();
  if (!t.check(await row.count() === 1, 'no row meets every requirement')) return;
  const altitude = (await row.locator('th').first().locator('.bsat-nw').textContent()).trim();
  await row.locator('.brq-open').click();
  const onBench = await page.waitForFunction(() => location.hash === '#/build/engineer' && !!document.querySelector('.bsb-grid:not([hidden])'),
    null, { timeout: 20_000 }).then(() => true, () => false);
  if (!t.check(onBench, 'the row did not open on the bench')) return;
  const name = await page.textContent('.bsb-name');
  t.check(name.includes(altitude), `the bench's design is not the row's (${altitude}): ${name}`);
  await page.click('#bsb-tab-camera');
  const gsd = await page.$$eval('.bsb-results .bsat-row', (rows) => rows.map((r) => r.textContent).find((s) => /straight down/.test(s)) ?? '');
  t.check(/0\.50\s*m/.test(gsd), `the bench's ground sample is not the 0.5 m asked: ${gsd}`);

  // back on the page, the row beside the bench
  await page.click('[data-k="sb:toRequirements"]');
  await page.waitForSelector('.brq-compare', { timeout: 10_000 });
  const lines = await page.$$eval('.brq-compare-table tbody tr', (rows) => rows.map((r) => ({
    same: r.classList.contains('same'), why: r.querySelector('.brq-why')?.textContent ?? '', text: r.textContent,
  })));
  t.check(lines.length >= 12, `the row beside the bench has ${lines.length} lines`);
  for (const l of lines) t.check(l.same || l.why !== '', `a figure differs from the bench with no reason: ${l.text}`);
  t.check(lines.filter((l) => !l.same).length === 4, `not the four figures that differ: ${lines.filter((l) => !l.same).map((l) => l.text).join(' | ')}`);
  t.check(await sideways(page) === null, `the page scrolls sideways at 1440 px: ${await sideways(page)}`);
  app.checkErrors();

  // a Thai phone
  const phone = await t.open({ hash: '#/build/engineer/requirements', viewport: { width: 375, height: 812 }, lang: 'th', touch: true });
  await phone.page.waitForSelector('.brq-form', { timeout: 30_000 });
  t.check(/[฀-๿]/.test(await phone.page.textContent('#brq-title')), 'the page is not in Thai');
  await phone.page.fill('[data-k="rq:revisitDays"]', '2');
  await phone.page.click('[data-k="rq:run"]');
  const cards = await phone.page.waitForSelector('.brq-table', { timeout: 240_000 }).then(() => true, () => false);
  if (t.check(cards, 'no table on the phone')) {
    t.check(await phone.page.$eval('.brq-table tbody tr', (tr) => getComputedStyle(tr).display) === 'block', 'the orbits are not cards on a phone');
    t.check(await sideways(phone.page) === null, `the page scrolls sideways at 375 px: ${await sideways(phone.page)}`);
  }
  phone.checkErrors();
}
