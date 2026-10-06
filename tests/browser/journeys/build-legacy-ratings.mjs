/**
 * FX-1 s2 (M-BUILD-006; owner, 2026-10-06, "คำนวณใหม่ให้อัตโนมัติเมื่อเปิดแบบจรวด"):
 * a rocket design kept before FX-1 PR1, whose ratings carry no completion
 * mark, has them computed again when it is opened in the Build section. Save
 * an Electron copy through the page; replace its saved bytes with what an
 * older build kept after an unfinished search (a LEO lower bound, no GTO, no
 * mark); reload and open it. The page opens at once, the ratings search runs
 * with its progress line and Stop, and the record ends up with the finished
 * ratings and the mark, its revision (`updated`) unchanged (D-75). Opened
 * again, it is not searched again; saved and renamed, it keeps the mark.
 */
import { putWorkspaceFixture, workspaceValue } from '../workspace-storage.mjs';

export const timeoutMs = 240_000;

const DESIGNS = 'orbitlab.designs';

export default async function buildLegacyRatings(t) {
  const app = await t.open({ hash: '#/build/explore' });
  const { page } = app;
  const rocketTab = page.locator('[data-k="craft:rocket"]:visible');
  if (await rocketTab.count()) await rocketTab.first().click();
  const picker = page.locator('#bx-picker-select');
  if (!t.check(await picker.waitFor({ timeout: 60_000 }).then(() => true).catch(() => false), 'the Explore builder has no vehicle picker')) return;
  await picker.selectOption('electron');
  await page.click('[data-k="store:save"]');
  const saved = await t.until(async () => (await workspaceValue(page, DESIGNS))?.designs?.[0] ?? null, { timeoutMs: 30_000 });
  if (!t.check(saved, 'Save kept nothing')) return;
  t.check(saved.ratingsFinal === true, 'a copy of Electron with its published ratings was not saved as final');

  // what an older build kept after an unfinished search
  const legacy = { ...saved, design: { ...saved.design, payloadLEO: 120, payloadGTO: 0 } };
  delete legacy.ratingsFinal;
  await putWorkspaceFixture(page, { [DESIGNS]: JSON.stringify({ version: 1, designs: [legacy] }) });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await app.ready();
  if (await rocketTab.count()) await rocketTab.first().click();
  const open = page.locator(`[data-k="open:${legacy.id}"]`);
  if (!t.check(await open.waitFor({ timeout: 60_000 }).then(() => true).catch(() => false), 'the kept design is not listed')) return;
  await open.click();
  t.check(await t.until(async () => (await page.locator('[data-k="ratings-stop"]').count()) > 0, { timeoutMs: 15_000 }),
    'opening the old design did not start the ratings search (no progress line with Stop)');
  const rerated = await t.until(async () => {
    const d = (await workspaceValue(page, DESIGNS))?.designs?.[0];
    return d?.ratingsFinal === true ? d : null;
  }, { timeoutMs: 150_000 });
  if (!t.check(rerated, 'the finished search was not kept with the mark')) return;
  t.log(`kept: LEO ${legacy.design.payloadLEO} → ${rerated.design.payloadLEO} kg, GTO ${legacy.design.payloadGTO} → ${rerated.design.payloadGTO} kg`);
  t.check(rerated.updated === legacy.updated && rerated.created === legacy.created, `the recompute changed the revision: ${legacy.updated} → ${rerated.updated}`);
  t.check(rerated.design.payloadLEO !== 120 && rerated.design.payloadLEO > 0, `LEO kept as ${rerated.design.payloadLEO} kg`);
  const { payloadLEO: _a, payloadGTO: _b, payloadSSO: _c, ...restBefore } = legacy.design;
  const { payloadLEO: _d, payloadGTO: _e, payloadSSO: _f, ...restAfter } = rerated.design;
  t.check(JSON.stringify(restAfter) === JSON.stringify(restBefore), 'the recompute changed more of the design than its ratings');
  t.check(/Computed in \d+ test flights/.test(await page.locator('.bx-ratings').innerText()), 'the ratings box does not say the search finished');

  // opened again: final, not searched again
  await page.click(`[data-k="open:${legacy.id}"]`);
  await page.waitForTimeout(2000);
  t.check(await page.locator('[data-k="ratings-stop"]').count() === 0, 'a design with final ratings was searched again');
  const after = (await workspaceValue(page, DESIGNS))?.designs?.[0];
  t.check(JSON.stringify(after) === JSON.stringify(rerated), 'opening a final design wrote to it');

  // Save keeps the mark the record opened with (the ratings are known final), and so does Rename
  await page.click('[data-k="store:save"]');
  const resaved = await t.until(async () => {
    const d = (await workspaceValue(page, DESIGNS))?.designs?.[0];
    return d && d.updated !== rerated.updated ? d : null;
  }, { timeoutMs: 30_000 });
  t.check(resaved?.ratingsFinal === true, 'Save dropped the mark of a design whose ratings are final');
  await page.click(`[data-k="rename:${legacy.id}"]`);
  await page.fill(`[data-k="renameTo:${legacy.id}"]`, 'Renamed Electron');
  await page.click(`[data-k="renameOk:${legacy.id}"]`);
  const renamed = await t.until(async () => {
    const d = (await workspaceValue(page, DESIGNS))?.designs?.[0];
    return d?.name === 'Renamed Electron' ? d : null;
  }, { timeoutMs: 30_000 });
  t.check(renamed?.ratingsFinal === true, 'Rename dropped the mark');
}
