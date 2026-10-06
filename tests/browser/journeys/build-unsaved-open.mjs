/**
 * FX-1 (M-BUILD-007; plan v2.0 S10 §10.4): opening a saved design over a
 * design with unsaved changes asks first, in the Build section's satellite
 * designer and in its rocket designer.
 *
 * Satellite: save NAPA-2 (A), start THEOS-2 and save it (B), change B's
 * array, then Open A. The page asks (the changes are still on screen, the
 * keyboard on "Save it, then open"); Escape keeps B as it is; asked again,
 * "Save it, then open" keeps B's change in its record and opens A; A, as
 * saved, gives way to B at once. Rocket: save an Electron remix, stretch its
 * first stage, Open it again: asked, "Open without saving" puts the saved one
 * back, and opened once more it opens at once. Then the question in Thai and
 * Russian, each with a screenshot for the owner.
 */
import { workspaceValue } from '../workspace-storage.mjs';

export const timeoutMs = 240_000;

const DESIGNS = 'orbitlab.designs';
const SAT = '.bsat-grid:not([hidden])';
const ROCKET = '.bx-grid:not([hidden])';

const kept = async (page) => (await workspaceValue(page, DESIGNS))?.designs ?? [];
const focusKey = (page) => page.evaluate(() => document.activeElement?.dataset?.k ?? null);

/** The rocket designer with an Electron remix saved and then stretched; the saved record. */
async function changedRocket(t, page) {
  await page.click('[data-k="craft:rocket"]');
  const picker = page.locator('#bx-picker-select');
  if (!t.check(await picker.waitFor({ timeout: 60_000 }).then(() => true, () => false), 'the rocket designer has no vehicle picker')) return null;
  await picker.selectOption('electron');
  const before = (await kept(page)).length;
  await page.click(`${ROCKET} [data-k="store:save"]`);
  const all = await t.until(async () => { const d = await kept(page); return d.length > before ? d : null; }, { timeoutMs: 30_000 });
  const rec = all?.find((d) => d.kind === 'vehicle' && d.design.derivedFrom === 'electron');
  if (!t.check(rec, 'the Electron remix was not saved')) return null;
  await page.fill(`${ROCKET} [data-k="stretch:0:1"]`, '120');
  await page.press(`${ROCKET} [data-k="stretch:0:1"]`, 'Tab');
  await page.waitForTimeout(500);
  return rec;
}

export default async function buildUnsavedOpen(t) {
  const app = await t.open({ hash: '#/build/explore' });
  const { page } = app;
  await page.click('[data-k="craft:satellite"]');
  if (!t.check(await page.waitForSelector(`${SAT} .bsat-summary`, { timeout: 60_000 }).then(() => true, () => false), 'the satellite designer did not open')) return;

  // A: NAPA-2, saved
  await page.click(`${SAT} [data-k="store:save"]`);
  const a = (await t.until(async () => (await kept(page))[0], { timeoutMs: 30_000 }));
  if (!t.check(a, 'Save kept nothing')) return;
  // B: THEOS-2, saved, then changed
  await page.selectOption(`${SAT} [data-k="sx:template"]`, 'theos2');
  await page.click(`${SAT} [data-k="store:save"]`);
  const b = await t.until(async () => (await kept(page)).find((d) => d.id !== a.id), { timeoutMs: 30_000 });
  if (!t.check(b, 'the second design was not saved')) return;
  const area = page.locator(`${SAT} [data-k="sx:power.arrayArea"]`);
  await area.fill('0.77');
  await area.press('Tab');
  const nameBox = page.locator(`${SAT} [data-k="sx:name"]`);

  // Open A over B's unsaved change: asked, nothing replaced
  await page.click(`${SAT} [data-k="open:${a.id}"]`);
  const ask = page.locator(`${SAT} .bx-store [role="alert"]`);
  const asked = await ask.waitFor({ timeout: 5_000 }).then(() => true, () => false);
  t.check(asked, 'opening a saved design over unsaved changes did not ask');
  t.check(await nameBox.inputValue() === b.name && await area.inputValue() === '0.77',
    `the design on screen was replaced without asking: "${await nameBox.inputValue()}", array ${await area.inputValue()}`);
  if (!asked) return;
  t.check(/not saved/.test(await ask.innerText()), `the question does not say the changes are not saved: ${await ask.innerText()}`);
  t.check(await focusKey(page) === 'ask:save', `the keyboard is not on "Save it, then open": ${await focusKey(page)}`);
  await app.shot('ask-en');

  // Escape keeps the design on screen as it is
  await page.keyboard.press('Escape');
  t.check(await ask.count() === 0, 'Escape did not close the question');
  t.check(await area.inputValue() === '0.77', 'Escape lost the change');
  t.check(await focusKey(page) === `open:${a.id}`, `after Escape the keyboard is not back on Open: ${await focusKey(page)}`);

  // asked again: "Save it, then open" keeps the change in B's record, then opens A
  await page.click(`${SAT} [data-k="open:${a.id}"]`);
  await ask.waitFor({ timeout: 5_000 }).catch(() => {});
  await page.click(`${SAT} [data-k="ask:save"]`);
  const resaved = await t.until(async () => (await kept(page)).find((d) => d.id === b.id && d.design.power.arrayArea === 0.77), { timeoutMs: 15_000 });
  t.check(resaved, 'Save it, then open did not keep the change in its record');
  t.check(await t.until(async () => (await nameBox.inputValue()) === a.name, { timeoutMs: 10_000 }), `A was not opened after the save: "${await nameBox.inputValue()}"`);
  // A as saved gives way at once
  await page.click(`${SAT} [data-k="open:${b.id}"]`);
  t.check(await t.until(async () => (await nameBox.inputValue()) === b.name, { timeoutMs: 10_000 }), 'a design as saved did not give way at once');
  t.check(await ask.count() === 0, 'asked about a design with nothing unsaved');

  // the rocket designer: asked, and "Open without saving" puts the saved design back
  const rec = await changedRocket(t, page);
  if (!rec) return;
  const stretch = page.locator(`${ROCKET} [data-k="stretch:0:1"]`);
  await page.click(`${ROCKET} [data-k="open:${rec.id}"]`);
  const rocketAsk = page.locator(`${ROCKET} .bx-store [role="alert"]`);
  const rocketAsked = await rocketAsk.waitFor({ timeout: 5_000 }).then(() => true, () => false);
  t.check(rocketAsked, 'opening the saved rocket over a stretched stage did not ask');
  t.check(await stretch.inputValue() === '120', `the stretched rocket was replaced without asking: ${await stretch.inputValue()} %`);
  if (rocketAsked) {
    await page.click(`${ROCKET} [data-k="ask:open"]`);
    t.check(await t.until(async () => (await stretch.inputValue()) === '100', { timeoutMs: 10_000 }), `"Open without saving" did not open the saved rocket: ${await stretch.inputValue()} %`);
    await page.click(`${ROCKET} [data-k="open:${rec.id}"]`);
    await page.waitForTimeout(500);
    t.check(await rocketAsk.count() === 0, 'asked about a rocket with nothing unsaved');
  }
  app.checkErrors();

  // the question in Thai and in Russian
  for (const [lang, script] of [['th', /[฀-๿]/], ['ru', /[А-Яа-яЁё]/]]) {
    const other = await t.open({ hash: '#/build/explore', lang });
    const r = await changedRocket(t, other.page);
    if (!r) continue;
    await other.page.click(`${ROCKET} [data-k="open:${r.id}"]`);
    const q = other.page.locator(`${ROCKET} .bx-store [role="alert"]`);
    if (!t.check(await q.waitFor({ timeout: 5_000 }).then(() => true, () => false), `${lang}: no question`)) continue;
    const text = await q.innerText();
    t.check(script.test(text) && !/not saved/.test(text), `${lang}: the question is not translated: ${text}`);
    await q.scrollIntoViewIfNeeded();
    await other.shot(`ask-${lang}`);
    other.checkErrors();
  }
}
