/**
 * FX-1 (M-BUILD-008; plan v2.0 S10 §10.4; D-22): a design file saved by a
 * newer version of Orbitlab, imported in the Build section's rocket designer.
 *
 * An Electron remix is saved, and its design written back as the next format
 * version's file. With a field this version does not know (`hull`, and one in
 * the second stage's engine) the file is refused whole: nothing kept, nothing
 * opened, and the message names the fields, says the file is newer and that
 * nothing was imported — in English, Thai and Russian, each with a screenshot
 * for the owner. The same file without those fields is kept and opened, and
 * says it is newer without claiming anything was left out.
 */
import { workspaceValue } from '../workspace-storage.mjs';

export const timeoutMs = 180_000;

const DESIGNS = 'orbitlab.designs';
const ROCKET = '.bx-grid:not([hidden])';
const kept = async (page) => (await workspaceValue(page, DESIGNS))?.designs ?? [];

const SAYS = {
  en: { newer: /newer version/, nothing: /nothing was imported/, leftOut: /left out/ },
  th: { newer: /ใหม่กว่า/, nothing: /ไม่ได้นำเข้าอะไร/, leftOut: /ข้ามไป/ },
  ru: { newer: /более новой версией/, nothing: /ничего не импортировано/, leftOut: /пропущен/ },
};

/** The rocket designer with an Electron remix saved; the saved record. */
async function savedRocket(t, page) {
  await page.click('[data-k="craft:rocket"]');
  const picker = page.locator('#bx-picker-select');
  if (!t.check(await picker.waitFor({ timeout: 60_000 }).then(() => true, () => false), 'the rocket designer has no vehicle picker')) return null;
  await picker.selectOption('electron');
  await page.click(`${ROCKET} [data-k="store:save"]`);
  const rec = await t.until(async () => (await kept(page)).find((d) => d.kind === 'vehicle' && d.design.derivedFrom === 'electron'), { timeoutMs: 30_000 });
  t.check(rec, 'the Electron remix was not saved');
  return rec ?? null;
}

/** Import `design` as the next format version's design file; the message the store shows then (once it replaced the one before). */
async function importNewer(t, page, name, design) {
  const doc = { format: 'orbitlab.design', version: 2, kind: 'vehicle', name, created: '2027-01-01T00:00:00.000Z', updated: '2027-01-01T00:00:00.000Z', design };
  const msg = page.locator(`${ROCKET} .bx-store-msg`);
  const said = () => msg.locator('p').innerText({ timeout: 500 }).catch(() => '');
  const before = await said();
  await page.locator(`${ROCKET} [data-k="store:file"]`).setInputFiles({ name: 'newer-vehicle.orbitlab.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(doc)) });
  await t.until(async () => (await said()) !== before, { timeoutMs: 10_000 });
  return msg;
}

export default async function buildNewerFile(t) {
  for (const lang of ['en', 'th', 'ru']) {
    const app = await t.open({ hash: '#/build/explore', lang });
    const { page } = app;
    const rec = await savedRocket(t, page);
    if (!rec) continue;
    const says = SAYS[lang];

    // fields this version does not know: refused whole, and named
    const unknown = structuredClone(rec.design);
    unknown.hull = 'composite';
    unknown.stages[1].engine.cooling = 'regenerative';
    const before = (await kept(page)).length;
    const msg = await importNewer(t, page, 'From the future', unknown);
    const text = await msg.locator('p').innerText().catch(() => '');
    t.check(await msg.getAttribute('data-level') === 'error', `${lang}: the refused file is not said as an error: ${await msg.getAttribute('data-level')}`);
    t.check(text.includes('hull') && text.includes('stages[1].engine.cooling'), `${lang}: the message does not name the unknown fields: ${text}`);
    t.check(says.newer.test(text) && says.nothing.test(text) && !says.leftOut.test(text), `${lang}: the message does not match the refusal: ${text}`);
    t.check((await kept(page)).length === before, `${lang}: a refused file was kept`);
    await page.locator('#pwa-toast .pwa-toast-close').click({ timeout: 1000 }).catch(() => {});
    await msg.evaluate((n) => n.scrollIntoView({ block: 'center' }));
    await app.shot(`refused-${lang}`);

    // the same file with nothing this version does not know: kept and opened, and says it is newer
    if (lang === 'en') {
      const whole = await importNewer(t, page, 'From the future, whole', structuredClone(rec.design));
      t.check(await t.until(async () => (await kept(page)).some((d) => d.name === 'From the future, whole'), { timeoutMs: 10_000 }), 'a newer file this version reads whole was not kept');
      const said = await whole.locator('p').innerText().catch(() => '');
      t.check(says.newer.test(said) && !says.leftOut.test(said), `a newer file taken whole: ${said}`);
      await app.shot('taken-en');
    }
    app.checkErrors();
  }
}
