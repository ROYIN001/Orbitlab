/**
 * FX-3 step 3 (M-ORBIT-007, S10 §10.6): the Watch tour's real-satellite
 * steps say when the satellite catalogue is loading or could not be loaded,
 * and Try again loads it, in each of the three languages.
 *
 * The service worker is blocked so that the page's requests reach the
 * route: the catalogue snapshot (data/satellites.json) is refused until Try
 * again is pressed, and then answers a moment late, so the loading line can
 * be seen. The fresh context is in the offline data mode: no request goes to
 * CelesTrak. Nothing asks for the catalogue again by itself.
 *
 * Written 2026-10-06 for FX-3 step 3. Not smoke.
 */
export const timeoutMs = 300_000;

const CASES = [
  {
    lang: 'en', next: 'Next', title: 'The International Space Station, right now', retry: 'Try again', alt: 'Altitude',
    loading: 'Loading the element sets…', failed: 'The element sets could not be loaded:',
  },
  {
    lang: 'th', next: 'ถัดไป', title: 'สถานีอวกาศนานาชาติ ณ ขณะนี้', retry: 'ลองอีกครั้ง', alt: 'ความสูง',
    loading: 'กำลังโหลดชุดค่าองค์ประกอบวงโคจร…', failed: 'โหลดชุดค่าองค์ประกอบวงโคจรไม่ได้:',
  },
  {
    lang: 'ru', next: 'Далее', title: 'Международная космическая станция прямо сейчас', retry: 'Повторить', alt: 'Высота',
    loading: 'Загрузка элементов орбит…', failed: 'Элементы орбит не удалось загрузить:',
  },
];
const SNAPSHOT = /\/data\/satellites\.json(\?|$)/;
/** The playground's own steps before the first real-satellite one (src/orbit/tour.ts). */
const PLAYGROUND_STEPS = 7;

export default async function fx3CatalogueRetry(t) {
  for (const c of CASES) {
    const app = await t.open({ hash: '#/orbit/watch', viewport: 'desktop', lang: c.lang, contextOptions: { serviceWorkers: 'block' } });
    const { page } = app;
    const celestrak = [];
    page.on('request', (r) => { if (/celestrak/i.test(new URL(r.url()).hostname)) celestrak.push(r.url()); });
    let refuse = true, asked = 0;
    await page.route(SNAPSHOT, async (route) => {
      asked++;
      if (refuse) { await route.abort('internetdisconnected'); return; }
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });

    // the playground's steps, then the first real-satellite one: the ISS
    const card = page.locator('.pg-tour');
    await card.waitFor({ state: 'visible', timeout: 60_000 });
    for (let k = 0; k < PLAYGROUND_STEPS; k++) await card.getByRole('button', { name: new RegExp(`^${c.next}`) }).click();
    await card.getByRole('heading', { name: c.title }).waitFor({ timeout: 30_000 });

    // refused: the card says why, and offers Try again
    const retry = card.getByRole('button', { name: c.retry, exact: true });
    const failed = await t.until(async () => (await retry.count()) === 1 && (await card.innerText()).includes(c.failed), { timeoutMs: 60_000, intervalMs: 250 });
    if (!t.check(failed, `${c.lang}: the tour card shows no "${c.failed} …" and "${c.retry}" while the catalogue is refused: ${(await card.innerText()).replace(/\s+/g, ' ').slice(0, 300)}`)) {
      await app.shot(`${c.lang}-no-failed-state`);
      await app.context.close();
      continue;
    }
    await app.shot(`${c.lang}-failed`);
    const refused = asked;
    t.check(refused >= 1, `${c.lang}: the catalogue snapshot was never asked for`);
    // a while on the step: nothing asks again by itself
    await new Promise((r) => setTimeout(r, 2000));
    t.check(asked === refused, `${c.lang}: the catalogue was asked for again without Try again (${asked - refused} more)`);

    // Try again: loading, then the ISS's readouts
    refuse = false;
    await retry.click();
    const loading = await t.until(async () => (await card.innerText()).includes(c.loading), { timeoutMs: 5000, intervalMs: 100 });
    t.check(loading, `${c.lang}: after Try again the card does not say "${c.loading}"`);
    if (loading) await app.shot(`${c.lang}-loading`);
    const ready = await t.until(async () => {
      const text = await card.innerText();
      // the readouts' labels are set in capitals (playground.css): innerText gives them so
      return text.toLowerCase().includes(c.alt.toLowerCase()) && !text.includes(c.loading) && !text.includes(c.failed) && (await retry.count()) === 0;
    }, { timeoutMs: 60_000, intervalMs: 250 });
    t.check(ready, `${c.lang}: after Try again the card does not show the ISS's readouts: ${(await card.innerText()).replace(/\s+/g, ' ').slice(0, 300)}`);
    await app.shot(`${c.lang}-ready`);
    t.check(asked === refused + 1, `${c.lang}: Try again asked for the catalogue ${asked - refused} times, not once`);
    t.check(celestrak.length === 0, `${c.lang}: offline mode asked CelesTrak: ${celestrak.join(', ')}`);
    app.checkErrors();
    await app.context.close();
  }
}
