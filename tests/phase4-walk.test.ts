/**
 * Small fixes from Phase 4's last check in Chromium (task W). A student, a
 * cadet and a teacher used the built app in en, ru and th at 1440, 375 and
 * 360 px. Each fix that has a DOM-free part is held here.
 *
 * CRITERIA, fixed before the first run (exact strings: grammar, not a
 * measurement):
 * - "Open lesson file" and a `?scenario=` link: the notice gives each count
 *   with its word in the right form. For one lesson it says "1 lesson"
 *   («1 урок», «บทเรียน 1 บท»). Before, it said "1 lessons" (left open by I2,
 *   item 4 of its open problems).
 * - The satellite designer's sentences keep each number with its unit: the
 *   space after a digit is a no-break space, and a slash between two
 *   letters ("м²/кг", "W/m²", "Мбит/с") carries a word joiner, so no line
 *   ends after it. A slash between digits (a repeat cycle "15/1") and every
 *   other space are left as they are.
 * - The lesson strip keeps a lesson's own figures with their units the same
 *   way: in pack lesson 13.4 (ipst-p-solar-power) the brief's "3.5 m²" and
 *   the debrief's "5 400 times" no longer part at a line's end, and no digit
 *   in its brief, hints or debrief is followed by a breaking space. The
 *   designer's sentences and the strip use the same function.
 * - A flight lesson's strip writes its bounds and values in the reader's
 *   decimal sign, as the design strip and the check page do: the apogee
 *   "35786,0 км" and a tolerance "0,000002" in Russian, "35786.0 km" in
 *   English and "35786.0 กม." in Thai, with no grouping and a no-break space
 *   before the unit. A value that is not a number is "—". An angle's degree
 *   sign follows its number with no space, as the app writes angles
 *   everywhere else and as ГОСТ 8.417 and the SI brochure write them:
 *   "97,52°" in Russian, "28.50°" in English and Thai (review of W).
 * - The check page's CSV starts with a UTF-8 byte order mark, once, and is
 *   otherwise the core's text unchanged, so Excel reads a Thai or Russian
 *   student's name as written.
 * - A results file's name and a worksheet's keep a Thai name whole: its
 *   vowels and tones are combining marks and stay («สมชาย ใจดี» →
 *   "สมชาย-ใจดี", «วิชัย» → "วิชัย"); Cyrillic and Latin names are joined by
 *   a hyphen as before ("Иван-Петров", "Anna-Student"), with none at either
 *   end; a class code joins with nothing («ห้อง 5/1» → "ห้อง51").
 * - A saved design's file name keeps a Russian name's «й» and «ё», letters of
 *   their own, as it keeps a Thai name's marks: «Мой спутник» →
 *   "мой-спутник-satellite.orbitlab.json", not "мои-спутник-…"; «Ёлка-1» →
 *   "ёлка-1-…"; a Latin letter still drops its accent ("Café" → "cafe")
 *   (review of W).
 */
import { describe, expect, it } from 'vitest';
import { setLang, t, tCount } from '../src/i18n';
import { keepUnits } from '../src/ui/build/satellite-text';
import { keepUnits as stripKeepUnits } from '../src/ui/keep-units';
import { decimal, measureText, unitAfter } from '../src/ui/lessons/measure-text';
import { spreadsheetCsv } from '../src/ui/download';
import { nameForFile } from '../src/ui/file-name';
import { designFileName } from '../src/design/design-store';
import PHYSICS_PACK from '../public/lessons/packs/ipst-physics.orbitlab-lesson.json?raw';

const NBSP = ' ';
const say = (s: string): string => s.split(NBSP).join(' ');

function withLang<T>(lang: 'en' | 'ru' | 'th', fn: () => T): T {
  const g = globalThis as { document?: unknown };
  if (!g.document) g.document = { documentElement: {} };
  setLang(lang);
  try { return fn(); } finally { setLang('en'); }
}

const loaded = (lang: 'en' | 'ru' | 'th', lessons: number, questions: number): string => withLang(lang, () => say(t('lesson.file.loaded', {
  lessons: tCount('lesson.file.n.lessons', lessons), questions: tCount('lesson.file.n.questions', questions),
})));

describe('the lesson file notice counts in words (W)', () => {
  it('says one lesson in the singular', () => {
    expect(loaded('en', 1, 0)).toBe('Added from the file: 1 lesson and 0 placement-test questions.');
    expect(loaded('en', 3, 1)).toBe('Added from the file: 3 lessons and 1 placement-test question.');
    expect(loaded('ru', 1, 0)).toBe('Из файла добавлено: 1 урок и 0 вопросов входного теста.');
    expect(loaded('ru', 2, 5)).toBe('Из файла добавлено: 2 урока и 5 вопросов входного теста.');
    expect(loaded('ru', 21, 22)).toBe('Из файла добавлено: 21 урок и 22 вопроса входного теста.');
    expect(loaded('th', 1, 0)).toBe('เพิ่มจากไฟล์แล้ว: บทเรียน 1 บท และข้อสอบวัดพื้นฐาน 0 ข้อ');
  });
});

describe('the satellite designer\'s sentences keep numbers with their units (W)', () => {
  const WJ = '\u2060';
  it('binds a number to the word after it, and a slashed unit together', () => {
    expect(keepUnits('потоке 1361 Вт/м² и')).toBe(`потоке 1361${NBSP}Вт/${WJ}м² и`);
    expect(keepUnits(`коэффициент 0,0189${NBSP}м²/кг)`)).toBe(`коэффициент 0,0189${NBSP}м²/${WJ}кг)`);
    expect(keepUnits('makes 58.4 Mbit/s while')).toBe(`makes 58.4${NBSP}Mbit/${WJ}s while`);
  });
  it('leaves a slash between digits and the other spaces alone', () => {
    // the expected string was mistyped at the first run (it left "F10.7 140" with a plain space, against the rule above); corrected after it
    expect(keepUnits('the 15/1 orbit, F10.7 140, Ap 15')).toBe(`the 15/1${NBSP}orbit, F10.7${NBSP}140, Ap 15`);
    expect(keepUnits('no numbers here / at all')).toBe('no numbers here / at all');
  });
});

describe('the lesson strip keeps a lesson\'s figures with their units (W)', () => {
  const pack = JSON.parse(PHYSICS_PACK) as {
    lessons: { id: string; brief: Record<string, string>; debrief: Record<string, string>; hints: Record<string, string>[] }[];
  };
  const lesson = pack.lessons.find((l) => l.id === 'ipst-p-solar-power')!;
  it('is the designer\'s rule, from the module the strip imports', () => {
    expect(stripKeepUnits).toBe(keepUnits);
  });
  it('binds 13.4\'s "3.5 m²" and "5 400 times", in every language, and leaves no digit before a breaking space', () => {
    expect(keepUnits(lesson.brief.en)).toContain(`3.5${NBSP}m²`);
    expect(keepUnits(lesson.debrief.en)).toContain(`5${NBSP}400${NBSP}times`);
    for (const lang of ['en', 'ru', 'th']) {
      for (const text of [lesson.brief[lang], lesson.debrief[lang], ...lesson.hints.map((h) => h[lang])]) {
        expect(text).toBeTruthy();
        expect(keepUnits(text)).not.toMatch(/\d /);
        expect(say(keepUnits(text)).replace(/\u2060/g, '')).toBe(text);
      }
    }
  });
});

describe('a flight lesson\'s strip writes numbers in the reader\'s decimal sign (W)', () => {
  it('says the apogee and a tolerance as each language writes them', () => {
    expect(withLang('ru', () => measureText('orbit.apogee', 35786))).toBe(`35786,0${NBSP}км`);
    expect(withLang('en', () => measureText('orbit.apogee', 35786))).toBe(`35786.0${NBSP}km`);
    expect(withLang('th', () => measureText('orbit.apogee', 35786))).toBe(`35786.0${NBSP}กม.`);
    expect(withLang('ru', () => decimal(0.000002))).toBe('0,000002');
    expect(withLang('ru', () => decimal(10))).toBe('10');
    expect(withLang('en', () => decimal(24361.73591902372, 1))).toBe('24361.7');
    expect(withLang('ru', () => measureText('orbit.apogee', Number.NaN))).toBe('—');
  });
  it('writes an angle\'s degree sign straight after its number (review of W)', () => {
    expect(withLang('ru', () => measureText('orbit.inclination', 97.5234))).toBe('97,52°');
    expect(withLang('en', () => measureText('orbit.inclination', 28.5))).toBe('28.50°');
    expect(withLang('th', () => measureText('orbit.inclination', 28.5))).toBe('28.50°');
    expect(withLang('ru', () => unitAfter('km'))).toBe(`${NBSP}км`);
    expect(unitAfter('')).toBe('');
  });
});

describe('the check page\'s CSV opens in a spreadsheet with its names whole (W)', () => {
  it('puts one byte order mark before the core\'s text and changes nothing else', () => {
    const csv = 'file,student\nresults.json,สมชาย ใจดี\nresults2.json,Иван Петров\n';
    const out = spreadsheetCsv(csv);
    expect(out.charCodeAt(0)).toBe(0xfeff);
    expect(out.slice(1)).toBe(csv);
    expect(new TextEncoder().encode(out).slice(0, 3)).toEqual(new Uint8Array([0xef, 0xbb, 0xbf]));
  });
});

describe('a file named after a student or a class keeps a Thai name whole (W)', () => {
  it('keeps letters with their marks and digits, and joins the rest', () => {
    expect(nameForFile('สมชาย ใจดี')).toBe('สมชาย-ใจดี');
    expect(nameForFile('วิชัย ศรีสุข')).toBe('วิชัย-ศรีสุข');
    expect(nameForFile('Иван Петров')).toBe('Иван-Петров');
    expect(nameForFile('  Anna  Student! ')).toBe('Anna-Student');
    expect(nameForFile('ห้อง 5/1', '')).toBe('ห้อง51');
    expect(nameForFile('---')).toBe('');
  });
  it('keeps a Russian design name\'s «й» and «ё» in its file name (review of W)', () => {
    expect(designFileName({ name: 'Мой спутник', kind: 'satellite' })).toBe('мой-спутник-satellite.orbitlab.json');
    expect(designFileName({ name: 'Ёлка-1', kind: 'vehicle' })).toBe('ёлка-1-vehicle.orbitlab.json');
    expect(designFileName({ name: 'Café Ñandú', kind: 'satellite' })).toBe('cafe-nandu-satellite.orbitlab.json');
    expect(designFileName({ name: 'สมชาย ใจดี', kind: 'satellite' })).toBe('สมชาย-ใจดี-satellite.orbitlab.json');
  });
});
