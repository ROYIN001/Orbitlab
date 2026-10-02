/**
 * Download the three case worksheets and keys as HTML and DOCX, in Thai
 * and Russian, from the built app. All case selection, answer revelation,
 * language and format changes go through visible controls. Fresh contexts
 * keep the deliberately revealed QA attempts out of anyone's real progress.
 * No init script, WebMCP call or storage/state injection is used here.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const smoke = false;
export const timeoutMs = 600_000;

const SOURCE = fileURLToPath(new URL('../../../', import.meta.url));
const CASES = [{ id: 'theos2', number: '6.1' }, { id: 'cz5b', number: '6.2' }, { id: 'iridium', number: '6.3' }];
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

export default async function caseWorksheetExports(t) {
  const out = resolve(process.env.CASE_EXPORT_DIR || join(SOURCE, 'tests/browser/artifacts/case-worksheet-exports'));
  mkdirSync(out, { recursive: true });
  const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: SOURCE, encoding: 'utf8' }).trim();
  const sources = ['src/worksheets/cases.ts', 'src/worksheets/html.ts', 'src/worksheets/docx.ts', 'src/ui/lessons/worksheet-view.ts', 'src/i18n/en.ts', 'src/i18n/th.ts', 'src/i18n/ru.ts'];
  const evidence = {
    startedAtUTC: new Date().toISOString(), sourceSha, eventSha: process.env.GITHUB_SHA ?? null,
    node: process.version, chromium: t.browser.version(), base: t.base,
    sourceHashes: Object.fromEntries(sources.map((p) => [p, sha(readFileSync(join(SOURCE, p)))])),
    builtIndexSha256: t.distDir ? sha(readFileSync(join(t.distDir, 'index.html'))) : null,
    scope: '3 cases × 2 languages × worksheet/key × HTML/DOCX = 24 actual browser downloads; intentionally revealed QA answers, not learner passes or document visual acceptance.',
    stateSetup: 'Fresh contexts; public page navigation and visible controls only; no storage/state injection.',
    files: [], pages: [], actions: [], completed: false,
  };
  const saveManifest = () => writeFileSync(join(out, 'manifest.json'), JSON.stringify(evidence, null, 2) + '\n');
  const act = (caseId, step) => { evidence.actions.push({ case: caseId, step, atUTC: new Date().toISOString() }); t.log(`${caseId}: ${step}`); };
  saveManifest();

  try {
    for (const { id, number } of CASES) {
      const context = await t.browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, locale: 'en-GB', acceptDownloads: true });
      const page = await context.newPage();
      page.setDefaultTimeout(45_000);
      const errors = [];
      const consoleErrors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      const pageRecord = { case: id, uncaughtErrors: errors, consoleErrors, screenshot: null };
      evidence.pages.push(pageRecord);
      let step = 'open the lesson catalogue';
      try {
        await page.goto(`${t.base}#/lessons`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
        await page.waitForSelector('#loading.hidden', { state: 'attached', timeout: 120_000 });
        step = 'select English and dismiss the first-mission tips';
        await page.locator('#lang-select').selectOption('en');
        const skip = page.getByRole('button', { name: 'Hide tips', exact: true });
        if (await skip.isVisible()) await skip.click();
        assert.equal(await page.locator('#btn-data-mode').getAttribute('data-mode'), 'offline', 'fresh QA context should use bundled offline data');
        // the track's own card: the packs below the tracks (T03) list the same lesson again under their codes
        step = `open lesson ${number}`;
        const card = page.locator('.lesson-tracks .lesson-card-item').filter({ has: page.locator('b').filter({ hasText: new RegExp(`^${number.replace('.', '\\.')} `) }) });
        await card.waitFor({ state: 'visible', timeout: 120_000 });
        assert.equal(await card.count(), 1, `one track card for lesson ${number}`);
        // opening a case works its figures out on the page: on a CI runner the Iridium case keeps the
        // page busy past the 45 s default, so the click gets the same budget as the waits around it
        await card.click({ timeout: 120_000 });
        await page.waitForSelector(`body[data-lesson="case-${id}"] .lesson-case-answers`, { timeout: 120_000 });
        step = 'reveal the answers';
        await page.getByRole('button', { name: 'Show the answers', exact: true }).click();
        await page.locator('.lesson-case-working').first().waitFor({ state: 'visible' });
        act(id, `opened lesson ${number} and revealed QA answers through its button`);
        step = 'open the worksheet';
        await page.getByRole('button', { name: 'Worksheet', exact: true }).click();
        await page.locator('.ws-case').waitFor({ state: 'visible' });

        for (const lang of ['th', 'ru']) {
          step = `select ${lang}`;
          await page.locator('#lang-select').selectOption(lang);
          assert.equal(await page.locator('html').getAttribute('lang'), lang);
          assert.match(await page.locator('.ws-case .ws-what').innerText(), new RegExp(number.replace('.', '\\.')));
          for (const format of ['html', 'docx']) {
            step = `select ${format} export`;
            await page.locator('.ws-form select').selectOption(format);
            for (const key of [false, true]) {
              const expected = `orbitlab-case-${id}${key ? '-key' : ''}-${lang}.${format}`;
              step = `download ${expected}`;
              const button = page.locator(key ? '.ws-case .ws-actions button:not(.lesson-primary)' : '.ws-case .ws-actions button.lesson-primary');
              assert.equal(await button.count(), 1, `one ${key ? 'key' : 'worksheet'} export button`);
              const [download] = await Promise.all([
                page.waitForEvent('download', { timeout: 90_000 }),
                button.click(),
              ]);
              assert.equal(download.suggestedFilename(), expected, 'download belongs to the selected case/language/format');
              await download.saveAs(join(out, expected));
              assert.equal(await download.failure(), null, `${expected}: completed download`);
              const bytes = readFileSync(join(out, expected));
              assert.ok(bytes.length > 500, `${expected}: nonempty document`);
              if (format === 'docx') assert.equal(bytes.subarray(0, 4).toString('hex'), '504b0304', 'DOCX ZIP signature');
              else assert.match(bytes.toString('utf8'), new RegExp(`<html lang="${lang}"`), 'HTML language matches selection');
              evidence.files.push({ name: expected, case: id, lesson: number, lang, key, format, bytes: bytes.length, sha256: sha(bytes), downloadedAtUTC: new Date().toISOString() });
              act(id, `downloaded ${expected} (${bytes.length} bytes)`);
              saveManifest();
            }
          }
        }
        step = 'capture the export controls';
        await page.locator('.ws-case').scrollIntoViewIfNeeded();
        const screenshot = `${id}-export-controls.png`;
        await page.screenshot({ path: join(out, screenshot) });
        pageRecord.screenshot = screenshot;
        assert.equal(errors.length, 0, `${id}: uncaught page errors: ${errors.join(' | ')}`);
      } catch (error) {
        evidence.error = { case: id, step, message: String(error?.stack ?? error) };
        // This journey owns its browser contexts, so the runner's shotAll()
        // cannot see them. Save failure evidence where CI uploads screenshots.
        const failureDir = t.shots ?? out;
        mkdirSync(failureDir, { recursive: true });
        writeFileSync(join(failureDir, `case-worksheet-${id}-failure.json`), JSON.stringify(evidence, null, 2) + '\n');
        try { await page.screenshot({ path: join(failureDir, `case-worksheet-${id}-failure.png`), fullPage: true }); } catch { /* original error is retained */ }
        // CI annotations retain the first line: include the case and action,
        // while the cause and evidence file keep Playwright's full call log.
        throw new Error(`${id}: ${step}: ${String(error?.message ?? error).split('\n')[0]}`, { cause: error });
      } finally {
        saveManifest();
        await context.close();
      }
    }
    assert.equal(evidence.files.length, 24);
    assert.equal(new Set(evidence.files.map((f) => f.name)).size, 24);
    evidence.completed = true;
    evidence.finishedAtUTC = new Date().toISOString();
    t.log(`24/24 actual downloads saved in ${out}; DOCX pagination still needs independent rendering and visual review`);
  } finally {
    saveManifest();
  }
}
