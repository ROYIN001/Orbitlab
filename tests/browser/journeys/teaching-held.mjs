/**
 * The teaching tools held back (owner, 2026-10-17; src/ui/held.ts): the
 * self-study lessons and the placement test stay, and nothing of the rest shows.
 * The lessons page has two tabs; the instructor pages' addresses open nothing;
 * the catalogue has no curriculum packs and no buttons to open a lesson file or
 * export results; a lesson's strip has no "Copy link"; a scenario link opens no
 * lesson; My work has no "Prepare a class". Runs only while they are held.
 */
import assert from 'node:assert/strict';
import { TEACHER_TOOLS } from '../held.mjs';

export const held = TEACHER_TOOLS ? 'the teaching tools are shown: nothing is held back to check' : null;
export const smoke = true;
export const timeoutMs = 180_000;

export default async function teachingHeld(t) {
  const app = await t.open({ hash: '#/lessons', lang: 'th' });
  const { page } = app;
  await page.locator('.lesson-tracks .lesson-card-item').first().waitFor();
  const tabs = await page.locator('.lessons-page-tabs a').evaluateAll((links) => links.map((a) => a.getAttribute('href')));
  assert.deepEqual(tabs, ['#/lessons', '#/lessons/test'], 'only the lessons and the placement test');
  assert.equal(await page.locator('.lesson-pack').count(), 0, 'no curriculum packs');
  assert.equal(await page.locator('.lessons-page input[type="file"]').count(), 0, 'no lesson-file input');
  assert.equal(await page.getByRole('button', { name: 'ส่งออกผลการเรียน', exact: true }).count(), 0, 'no results export');
  assert.equal(await page.getByRole('button', { name: 'เปิดไฟล์บทเรียน…', exact: true }).count(), 0, 'no lesson-file button');

  // a self-study lesson still opens, with its strip but no link to copy
  await page.locator('.lesson-tracks .lesson-card-item:not([disabled])').first().click();
  await page.locator('.lesson-strip .lesson-strip-head').waitFor();
  assert.equal(await page.locator('.lesson-strip').getByRole('button', { name: 'คัดลอกลิงก์' }).count(), 0, 'no "Copy link" on the strip');

  // the placement test still opens; the instructor pages' addresses do not
  await page.evaluate(() => { location.hash = '#/lessons/test'; });
  assert.ok(await t.until(() => page.evaluate(() => document.body.dataset.lessonsPage === 'test')), 'the placement test opens');
  for (const hash of ['#/lessons/worksheets', '#/lessons/author', '#/lessons/check']) {
    await page.evaluate((h) => { location.hash = h; }, hash);
    await page.waitForTimeout(300);
    const view = await page.evaluate(() => document.body.dataset.lessonsPage ?? null);
    assert.ok(!['worksheets', 'author', 'check'].includes(view), `${hash} opened the held page`);
  }

  // My work: no "Prepare a class"
  await page.evaluate(() => { location.hash = '#/home'; });
  await page.locator('#btn-work').click();
  await page.locator('.work-content [role="tablist"]').waitFor();
  assert.equal(await page.locator('#work-tab-classroom').count(), 0, 'no Prepare a class tab');
  assert.equal(await page.locator('.work-content [role="tab"]').count(), 3);
  await page.keyboard.press('Escape');

  // a scenario link opens no lesson, and is taken out of the address
  await app.goto('?scenario=z1#/home');
  await page.waitForTimeout(500);
  assert.equal(new URL(page.url()).searchParams.get('scenario'), null, 'the scenario parameter is cleared');
  assert.equal(await page.locator('.lesson-strip .lesson-strip-head').count(), 0, 'a scenario link started a lesson');
  await app.shot('lessons');
  app.checkErrors();
}
