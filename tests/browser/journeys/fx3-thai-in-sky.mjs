/**
 * FX-3 step 2 (M-ORBIT-001, S10 §10.6): from the Thai satellites panel, one
 * click opens Real satellites on Thailand's group with the same satellite
 * picked, in each of the three languages. The panel's note no longer says
 * that following real satellites comes with a later phase.
 *
 * The fresh context is in the offline data mode, so Real satellites reads
 * the bundled catalogue snapshot: no request goes to CelesTrak.
 *
 * Written 2026-10-06 for FX-3 step 2. Not smoke.
 */
export const timeoutMs = 240_000;

const CASES = [
  { lang: 'en', inSky: 'Show in Real satellites', stale: /next phase/i },
  { lang: 'th', inSky: 'แสดงใน ดาวเทียมจริง', stale: /ระยะถัดไป/ },
  { lang: 'ru', inSky: 'Показать в разделе «Реальные спутники»', stale: /следующий этап/ },
];

export default async function fx3ThaiInSky(t) {
  for (const c of CASES) {
    const app = await t.open({ hash: '#/orbit/explore', viewport: 'desktop', lang: c.lang });
    const { page } = app;
    const celestrak = [];
    page.on('request', (r) => { if (/celestrak/i.test(new URL(r.url()).hostname)) celestrak.push(r.url()); });

    // What satellites do: Thailand's satellites, and THEOS-2's orbit in the playground
    const kind = page.locator('.pg-controls .pg-apps select').first();
    await kind.waitFor({ state: 'visible', timeout: 60_000 });
    await kind.selectOption('thai');
    const theos2 = page.locator('.pg-thai li').filter({ hasText: 'THEOS-2' }).first();
    await theos2.locator('button').click();
    const results = page.locator('.pg-apps-results');
    await results.waitFor({ state: 'visible', timeout: 30_000 });
    const note = await results.innerText();
    t.check(!c.stale.test(note), `${c.lang}: the Thai panel still says tracking comes later: ${note.slice(-240)}`);
    await app.shot(`${c.lang}-thai-panel`);

    // Show in Real satellites: the Thai group, THEOS-2 picked
    const open = results.getByRole('button', { name: c.inSky, exact: true });
    if (!t.check(await open.count() === 1, `${c.lang}: no "${c.inSky}" button under THEOS-2`)) { await app.context.close(); continue; }
    await open.click();
    const picked = await t.until(async () => {
      const group = await page.locator('.pg-controls select:has(option[value="debris"])').inputValue({ timeout: 1000 }).catch(() => '');
      const on = await page.locator('.pg-sky-item[aria-pressed="true"]').allInnerTexts().catch(() => []);
      return group === 'thai' && on.length === 1 && /THEOS-2/.test(on[0]) && /58016/.test(on[0]) ? on[0] : null;
    }, { timeoutMs: 60_000, intervalMs: 250 });
    t.check(picked, `${c.lang}: Real satellites did not open on the Thai group with THEOS-2 picked`);
    const mode = await page.locator('.pg-mode[aria-pressed="true"]').innerText().catch(() => '');
    t.check(/Real satellites|ดาวเทียมจริง|Реальные спутники/.test(mode), `${c.lang}: the mode switch says "${mode}", not Real satellites`);
    await app.shot(`${c.lang}-real-satellites`);
    t.check(celestrak.length === 0, `${c.lang}: offline mode asked CelesTrak: ${celestrak.join(', ')}`);
    app.checkErrors();
    await app.context.close();
  }
}
