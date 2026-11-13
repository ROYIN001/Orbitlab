/**
 * The ways into the Structure & Assembly section from the rest of the app
 * (owner, 2026-11-13), in the built app:
 *
 * - Home: a chapter of its own, pictured in the page's language, whose button
 *   opens the section at a first look;
 * - Launch: a link on the line of the mission's steps, there only for the
 *   catalogue's Soyuz-2.1b, at the level Launch is at, and no taller than
 *   that line (the scene's controls stay where they are); gone on a narrow
 *   screen;
 * - Build: a link beside the Anatomy button for the same vehicle, on one row
 *   with it, to the section's assembly.
 *
 * None of them fetches the section's code before it is pressed.
 */
export const timeoutMs = 300_000;

export default async function structureEntries(t) {
  const app = await t.open({ hash: '#/home', viewport: { width: 1440, height: 900 }, lang: 'th', contextOptions: { reducedMotion: 'reduce' } });
  const { page } = app;
  const fetched = [];
  page.on('requestfinished', (r) => { const u = r.url(); if (/\/assets\/structure-[\w-]+\.js$/.test(u)) fetched.push(u.split('/').pop()); });
  const box = async (sel) => page.locator(sel).first().evaluate((e) => { const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), bottom: Math.round(b.bottom) }; });
  const go = (hash) => page.evaluate((h) => { location.hash = h; }, hash);
  const hash = () => page.evaluate(() => location.hash);

  // ── Home: the chapter, its picture in the page's language, its button
  const chapter = page.locator('.home-feature[data-feature="structure"]');
  t.check(await chapter.count() === 1, 'the landing page has a chapter for the section');
  const order = await page.locator('.home-feature').evaluateAll((list) => list.map((e) => e.dataset.feature));
  t.check(order.join(',') === 'watch,explore,engineer,structure,lessons,orbit', `in its place among the chapters: ${order.join(', ')}`);
  const picture = await chapter.locator('img').evaluate(async (img) => {
    img.loading = 'eager';
    try { await img.decode(); } catch { /* reported by its size below */ }
    return { src: img.src.split('/').pop(), width: img.naturalWidth, missing: img.classList.contains('missing') };
  });
  t.check(picture.src === 'structure.th.webp' && picture.width === 1280 && !picture.missing, `its picture is the section in Thai: ${JSON.stringify(picture)}`);
  t.check(fetched.length === 0, 'nothing of the section is fetched by the landing page');
  await chapter.locator('button').click();
  await t.until(async () => (await hash()) === '#/structure/watch/soyuz-st31', { timeoutMs: 30_000 });
  t.check(true, 'its button opens the section at a first look');
  await page.waitForFunction(() => !!window.orbitlab?.structure?.section, null, { timeout: 120_000 });
  t.check(fetched.length > 0, `the section's code came when it was opened: ${fetched[0]}`);

  // ── Launch: the link is there for the catalogue's Soyuz-2.1b only, at Launch's level, and moves nothing
  await go('#/launch/explore');
  await page.locator('.vehicle-card[data-vehicle="falcon9"]').waitFor({ timeout: 60_000 });
  const link = page.locator('#mission-structure');
  await page.locator('.vehicle-card[data-vehicle="falcon9"]').click();
  await t.until(async () => (await page.locator('#mission-steps li').count()) > 0, { timeoutMs: 30_000 });
  await page.waitForTimeout(600);
  t.check(await link.isHidden(), 'no link for a vehicle the section has no model of');
  const before = { cams: await box('#camera-tabs'), steps: await box('#mission-steps') };
  await page.locator('.vehicle-card[data-vehicle="soyuz21b"]').click();
  await t.until(async () => link.isVisible(), { timeoutMs: 30_000 });
  t.check((await link.getAttribute('href')) === '#/structure/explore/soyuz-st31' && (await link.textContent()) === 'ดูโครงสร้างของจรวดลำนี้', `the link for Soyuz-2.1b: ${await link.getAttribute('href')}`);
  const after = { cams: await box('#camera-tabs'), steps: await box('#mission-steps'), link: await box('#mission-structure') };
  t.check(after.cams.y === before.cams.y && after.steps.y === before.steps.y, `the scene's controls stay where they were: ${JSON.stringify({ before: before.cams.y, after: after.cams.y })}`);
  t.check(after.link.h <= after.steps.h && after.link.y >= after.steps.y - 1 && after.link.bottom <= after.steps.bottom + 1 && after.link.x >= after.steps.x + after.steps.w,
    `the link is on the steps' line and no taller: ${JSON.stringify(after.link)} beside ${JSON.stringify(after.steps)}`);
  // at Launch's other level it leads to the same depth of the section
  await go('#/launch/engineer');
  await t.until(async () => (await link.getAttribute('href')) === '#/structure/engineer/soyuz-st31', { timeoutMs: 30_000 });
  t.check(true, 'the link follows Launch\'s level');
  // watching, the steps and the link are both away
  await go('#/launch/watch');
  await t.until(async () => link.isHidden(), { timeoutMs: 30_000 });
  t.check(await page.locator('#mission-steps').isHidden(), 'at the Watch level neither the steps nor the link are shown');
  // a narrow screen: the line is full, the link gives way
  await go('#/launch/explore');
  await t.until(async () => link.isVisible(), { timeoutMs: 30_000 });
  await page.setViewportSize({ width: 600, height: 900 });
  await t.until(async () => link.isHidden(), { timeoutMs: 15_000 });
  t.check(true, 'on a screen narrower than 700 px the link is left out');
  await page.setViewportSize({ width: 1440, height: 900 });
  await t.until(async () => link.isVisible(), { timeoutMs: 15_000 });
  await link.click();
  await t.until(async () => (await hash()) === '#/structure/explore/soyuz-st31', { timeoutMs: 30_000 });
  t.check(true, 'pressed, it opens the section on the rocket');

  // ── Build: beside the Anatomy button for the same vehicle, on one row, to the assembly
  await go('#/build/watch');
  const picker = page.locator('.bs-picker-select');
  await picker.waitFor({ timeout: 60_000 });
  await picker.selectOption('falcon9');
  await page.waitForTimeout(500);
  t.check(await page.locator('.bs-structure-open').count() === 0, 'Build offers no such link for another vehicle');
  await picker.selectOption('soyuz21b');
  const open = page.locator('.bs-structure-open');
  await open.waitFor({ timeout: 30_000 });
  const row = { link: await box('.bs-structure-open'), anatomy: await box('.bs-anatomy-open') };
  t.check((await open.getAttribute('href')) === '#/structure/watch/soyuz-st31/assemble' && (await open.textContent()) === 'ลองประกอบ', `Build's link for Soyuz-2.1b: ${await open.getAttribute('href')}`);
  t.check(row.link.y === row.anatomy.y && row.link.x >= row.anatomy.x + row.anatomy.w, `on one row with the Anatomy button: ${JSON.stringify(row)}`);
  await open.click();
  await t.until(async () => (await hash()) === '#/structure/watch/soyuz-st31/assemble', { timeoutMs: 30_000 });
  await page.waitForFunction(() => window.orbitlab?.structure?.section?.store?.mode === 'assemble', null, { timeout: 60_000 });
  t.check(true, 'pressed, it opens the rocket\'s assembly');
  await app.context.close();
}
