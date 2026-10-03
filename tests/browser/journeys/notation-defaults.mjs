import assert from 'node:assert/strict';

export const smoke = true;
export const timeoutMs = 120_000;

export default async function notationDefaults(t) {
  const app = await t.open({ hash: '#/launch/engineer' });
  const { page } = app;
  const select = page.locator('.notation-section select');
  await select.waitFor();
  assert.deepEqual(await select.locator('option').evaluateAll((nodes) => nodes.map((node) => node.value)), ['iso', 'gost']);
  assert.equal(await select.inputValue(), 'iso', 'English starts with the implicit ISO default');
  await page.locator('#lang-select').selectOption('ru');
  await page.waitForFunction(() => document.querySelector('.notation-section select')?.value === 'gost');
  await page.locator('#lang-select').selectOption('th');
  await page.waitForFunction(() => document.querySelector('.notation-section select')?.value === 'iso');
  await select.selectOption('gost');
  await page.locator('#lang-select').selectOption('en');
  assert.equal(await select.inputValue(), 'gost', 'A deliberate override survives language changes');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await app.ready();
  assert.equal(await select.inputValue(), 'gost', 'The current learner keeps their override after reload');
  assert.equal(await page.locator('#btn-reset-cam').count(), 0);
  t.log('Implicit language defaults and explicit override checked through real controls; no flight-profile claim');
}
