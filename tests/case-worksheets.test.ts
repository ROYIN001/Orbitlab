/**
 * Worksheets from real cases (roadmap P2.5): each answer is the published
 * data worked as the key says, the sheet carries every question and no
 * answer, the key every answer, and in Russian and Thai the words are in
 * their own script (as tests/worksheets.test.ts asks of the flight sheets).
 */
import { afterAll, describe, expect, it } from 'vitest';
import { CASE_IDS, caseWorksheet, cz5bNumbers, iridiumNumbers, theos2Numbers } from '../src/worksheets/cases';
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

  it('asks for THEOS-2\'s set, and makes no sheet without it', () => {
    expect(caseWorksheet('theos2', { lang: 'en', generatedAt: at, activity, theos2: null })).toBeNull();
  });
});
