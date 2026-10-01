/**
 * Worksheets from real cases (roadmap P2.5): each answer is the published
 * data worked as the key says, the sheet carries every question and no
 * answer, the key every answer, and in Russian and Thai the words are in
 * their own script (as tests/worksheets.test.ts asks of the flight sheets).
 */
import { afterAll, describe, expect, it } from 'vitest';
import { CASE_IDS, CZ5B_SPACE_WEATHER, caseKey, caseWorksheet, cz5bNumbers, cz5bStormNumbers, iridiumNumbers, theos2Numbers } from '../src/worksheets/cases';
import { CASE_CHOICE_ITEMS, CASE_ITEM_IDS } from '../src/worksheets/case-ids';
import { letterOf } from '../src/worksheets/bank-items';
import { answerKeyHtml, worksheetsHtml } from '../src/worksheets/html';
import { measuredActivity, type SolarDaily } from '../src/physics/propagator/activity';
import HISTORY from '../src/data/solar-daily.json';
import { setLang, type Lang } from '../src/i18n';
import { elementsFromRecord } from '../src/orbit/omm';
import { parseSnapshot } from '../src/provider/data-provider';

const activity = measuredActivity(HISTORY as SolarDaily, null).series;
const SNAPSHOT_FILE = import.meta.glob('../public/data/satellites.json', { import: 'default', eager: true }) as Record<string, unknown>;
const snap = parseSnapshot(Object.values(SNAPSHOT_FILE)[0], 'satellites');
const theos2 = elementsFromRecord(snap.data.groups.find((g) => g.id === 'thai')!.sets.find((r) => r.NORAD_CAT_ID === 58016)!);
const at = new Date('2026-09-27T12:00:00Z');

/** The language, as tests/worksheets.test.ts sets it without a page. */
function withLang(lang: Lang): void {
  const g = globalThis as { document?: unknown };
  if (!g.document) g.document = { documentElement: {} };
  setLang(lang);
}
afterAll(() => withLang('en'));

describe('the cases\' numbers (P2.5)', () => {
  it('Iridium 33 and Cosmos 2251: 226 m apart at 11.6 km/s, nearly square across, the published probabilities', () => {
    const n = iridiumNumbers();
    expect(n.miss).toBeCloseTo(226.3, 1);
    expect(n.speed / 1000).toBeCloseTo(11.65, 1);
    expect(n.angle).toBeGreaterThan(95);
    expect(n.angle).toBeLessThan(110);
    expect(n.radius).toBeCloseTo(19.942, 6);
    // Shepperd's Table 2: 2.6 × 10⁻⁵¹ and 0.033, within a tenth of a decade (tests/conjunction.test.ts)
    expect(Math.abs(n.logPcMessage - Math.log10(2.6e-51))).toBeLessThan(0.1);
    expect(Math.abs(Math.log10(n.pcCautious) - Math.log10(0.033))).toBeLessThan(0.1);
    expect(n.sigmaMiss).toBeLessThanOrEqual(n.sigma[0]);
    expect(n.sigmaMiss).toBeGreaterThanOrEqual(n.sigma[1]);
  });

  it('the Long March 5B stage of Tianhe: Cauchy\'s area, its C_D A/m, and the prediction inside its window', () => {
    const n = cz5bNumbers(activity);
    expect(n.area).toBeCloseTo((Math.PI * 5 * 31.7 + Math.PI * 25 / 2) / 4, 9);
    expect(n.b).toBeCloseTo(2.2 * n.area / 21600, 12);
    expect(n.actual).toBeGreaterThan(n.left * 0.8);
    expect(n.actual).toBeLessThan(n.left * 1.2);
  });

  /**
   * T03b (the research's B5, IPST ว 3.1 ม.6/9): the space-weather question.
   * Its indices (src/worksheets/cases.ts `CZ5B_SPACE_WEATHER`) and this
   * check were fixed before the first prediction ran: the quiet run, with the
   * stage's days' own flux rounded and a field as quiet as theirs, comes
   * within 5 % of the prediction with the Sun as measured, and the storm's
   * comes down sooner. The first run gave quiet 9.27 days, storm 6.99 and
   * the measured Sun 9.32 (recorded, not tuned).
   */
  it('the Long March 5B stage through a storm: the days\' own flux, the quiet run within 5 % of the measured Sun\'s, the storm\'s sooner', () => {
    const h = HISTORY as SolarDaily;
    const k0 = Math.round((Date.parse('2021-04-29') - Date.parse(h.from)) / 86400e3);
    const days = h.f107.slice(k0, k0 + 10);
    expect(Math.round(days.reduce((s, x) => s + x, 0) / days.length / 5) * 5).toBe(CZ5B_SPACE_WEATHER.f107);
    expect(Math.max(...h.ap.slice(k0, k0 + 10))).toBeLessThanOrEqual(8);
    const n = cz5bNumbers(activity), w = cz5bStormNumbers();
    expect(Math.abs(w.quiet / n.left - 1)).toBeLessThan(0.05);
    expect(w.storm).toBeLessThan(w.quiet);
    // computed once, whatever the Sun or the language of the sheet
    expect(cz5bStormNumbers()).toBe(w);
  });

  it('THEOS-2: J₂ turns its plane at the sun-synchronous rate, within 1 %', () => {
    const n = theos2Numbers(theos2);
    expect(n.required).toBeCloseTo(0.98565, 4);
    expect(Math.abs(n.j2 / n.required - 1)).toBeLessThan(0.01);
    expect(n.h / 1000).toBeGreaterThan(600);
    expect(n.h / 1000).toBeLessThan(640);
    // 03:20 UTC at 100.5° E: 10:02, inside the published 10:00–10:30
    expect(n.lst).toBeGreaterThan(10);
    expect(n.lst).toBeLessThan(10.5);
  });
});

describe('the case sheets (P2.5)', () => {
  const langs: Lang[] = ['en', 'ru', 'th'];
  it.each(langs.flatMap((lang) => CASE_IDS.map((id) => [lang, id] as const)))('%s, %s: every question on the sheet, every answer in the key, no answer on the sheet', (lang, id) => {
    withLang(lang);
    const sheet = caseWorksheet(id, { lang, generatedAt: at, activity, theos2 })!;
    expect(sheet).not.toBeNull();
    const items = sheet.sections.flatMap((s) => s.items);
    expect(items.length).toBeGreaterThanOrEqual(6);
    const html = worksheetsHtml([sheet]), key = answerKeyHtml([sheet]);
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    for (const i of items) {
      expect(html).toContain(esc(i.prompt));
      expect(key).toContain(esc(i.answer.text));
      if (i.answer.working) expect(html).not.toContain(esc(i.answer.working));
      if (i.kind === 'number') expect(Number.isFinite(i.answer.value)).toBe(true);
    }
    expect(html).not.toMatch(/<script/i);
    // the encounter plane's SVG names its namespace; nothing is fetched
    expect(html.replace(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '')).not.toMatch(/https?:\/\//);
    if (lang !== 'en') {
      const script = lang === 'ru' ? /[А-Яа-яЁё]/ : /[฀-๿]/;
      for (const s of sheet.sections) expect(s.title, s.title).toMatch(script);
      for (const i of items) expect(i.prompt, i.prompt).toMatch(script);
    }
  }, 60_000);

  // the Russian and Thai sheets once printed "226 m (± 5 m)" and "0,9856 °/d" after prompts in their own script
  it.each(['ru', 'th'] as const)('%s: the units on the sheet, in its key and in its tables are the language\'s own', (lang) => {
    withLang(lang);
    const latinUnit = /(^|[\s(;])(m|km|kg|h|km\/s|m²|m²\/kg|°\/d|km³\/s²)(?=$|[\s);,])/;
    for (const id of CASE_IDS) {
      const sheet = caseWorksheet(id, { lang, generatedAt: at, activity, theos2 })!;
      for (const i of sheet.sections.flatMap((s) => s.items)) {
        if (i.kind !== 'number') continue;
        expect(i.unit ?? '', `${id}: ${i.prompt}`).not.toMatch(/[A-Za-z]/);
        expect(i.answer.text, `${id}: ${i.prompt}`).not.toMatch(/[A-Za-z]/);
        expect(i.answer.tolerance ?? '', `${id}: ${i.prompt}`).not.toMatch(/[A-Za-z]/);
      }
      for (const [, value] of sheet.sections.flatMap((s) => s.table ?? [])) expect(value, `${id}: ${value}`).not.toMatch(latinUnit);
    }
    const key = answerKeyHtml([caseWorksheet('theos2', { lang, generatedAt: at, activity, theos2 })!]);
    expect(key).toContain(lang === 'ru' ? '°/сут' : '°/วัน');
  });

  // the Iridium sheet printed "2.6e-51" and a Russian "0.033"; the Russian C_x·A/m question sat under a table giving "C_D 2,2"
  it.each(langs)('%s: the data tables write their numbers and symbols as the language does', (lang) => {
    withLang(lang);
    const row = (id: typeof CASE_IDS[number], i: number) => caseWorksheet(id, { lang, generatedAt: at, activity, theos2 })!.sections[0].table![i][1];
    const published = row('iridium', 7);
    expect(published).toContain('× 10⁻⁵¹');
    expect(published).not.toMatch(/\de-/);
    expect(published).toContain(lang === 'ru' ? '0,033' : '0.033');
    const body = row('cz5b', 2);
    expect(body).toContain(lang === 'ru' ? 'C_x 2,2' : 'C_D 2.2');
  });

  // E03 track 6: the case lessons are graded by this key, so it must be the sheet's own and the same in every language
  it.each(CASE_IDS)('%s: every question has its id and a number\'s tolerance or a choice\'s option, and the key is the same in every language', (id) => {
    const keys = langs.map((lang) => {
      withLang(lang);
      const sheet = caseWorksheet(id, { lang, generatedAt: at, activity, theos2 })!;
      const items = sheet.sections.flatMap((s) => s.items);
      expect(items.map((i) => i.id)).toEqual(CASE_ITEM_IDS[id]);
      expect(sheet.sections[1].items.map((i) => i.id)).toEqual(CASE_ITEM_IDS[id]);
      for (const i of items) {
        if (i.kind === 'choice') {
          expect(CASE_CHOICE_ITEMS).toContain(i.id);
          // the key names the option by the letter the sheet prints beside it (it once said "c)" beside "в)")
          expect(i.answer.text.startsWith(`${letterOf(lang, i.answer.index!)}) `), i.answer.text).toBe(true);
        } else {
          expect(CASE_CHOICE_ITEMS).not.toContain(i.id);
          expect(Number.isFinite(i.answer.tol), i.id).toBe(true);
          expect(i.answer.tol!).toBeGreaterThan(0);
        }
      }
      return caseKey(sheet);
    });
    expect(keys[1]).toEqual(keys[0]);
    expect(keys[2]).toEqual(keys[0]);
    expect(Object.keys(keys[0])).toEqual(CASE_ITEM_IDS[id]);
  }, 60_000);

  it('keys the numbers the sheet works out', () => {
    withLang('en');
    const key = (id: typeof CASE_IDS[number]) => caseKey(caseWorksheet(id, { lang: 'en', generatedAt: at, activity, theos2 })!);
    const n = iridiumNumbers();
    expect(key('iridium').miss).toEqual({ kind: 'number', value: n.miss, tol: 5 });
    expect(key('iridium').why).toEqual({ kind: 'choice', value: 2, tol: 0 });
    const c = cz5bNumbers(activity);
    expect(key('cz5b').actual).toEqual({ kind: 'number', value: c.actual, tol: 0.05 });
    expect(key('cz5b').error.value).toBeCloseTo((c.left / c.actual - 1) * 100, 9);
    const w = cz5bStormNumbers();
    expect(key('cz5b').storm).toEqual({ kind: 'number', value: w.quiet - w.storm, tol: 0.05 });
    expect(key('theos2').j2).toEqual({ kind: 'number', value: theos2Numbers(theos2).j2, tol: 0.01 });
    expect(key('theos2').why.value).toBe(3);
    // the re-entry is predicted once for a Sun, however many sheets are built with it
    expect(cz5bNumbers(activity)).toBe(c);
  });

  it('asks for THEOS-2\'s set, and makes no sheet without it', () => {
    expect(caseWorksheet('theos2', { lang: 'en', generatedAt: at, activity, theos2: null })).toBeNull();
  });
});
