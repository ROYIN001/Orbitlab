/**
 * The Structure section's own text (src/ui/structure/text.ts: Thai, the
 * source; structure-en.ts and structure-ru.ts: drafts, fetched when their
 * language is on screen) held to the dictionaries' rules
 * (tests/i18n.test.ts): the same keys in the three, no empty or padded
 * value, the same {placeholders}, Arabic numerals in Thai, no Thai left in a
 * translation. And held to the code: every key the section names — by name,
 * or by a pattern such as `soyuz.unit.${unit}` — has words, and every key is
 * named by something.
 */
import { describe, expect, it } from 'vitest';
import { copy as en } from '../src/ui/structure/structure-en';
import { copy as ru } from '../src/ui/structure/structure-ru';
import { bindLanguage, hasLanguage, hasText, loadLanguage, num, th, tx, type Lang } from '../src/ui/structure/text';
import { th as thApp } from '../src/i18n/th';

const SRC = import.meta.glob(['../src/ui/structure/**/*.ts', '../src/structure/*.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const CODE = Object.entries(SRC).filter(([path]) => !/\/(?:text|structure-en|structure-ru)\.ts$/.test(path)).map(([, text]) => text);
const placeholders = (s: string): string[] => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();
/** the first words of every key: what tells a text key from any other dotted string in the code */
const HEADS = [...new Set(Object.keys(th).map((k) => k.split('.')[0]))];
const KEY = new RegExp(`^(?:${HEADS.join('|')})(?:\\.[\\w-]+)*$`);

describe('the Structure section\'s text', () => {
  it('has the same keys in all three languages, in the source\'s order', () => {
    expect(Object.keys(th).length).toBeGreaterThan(700);
    expect(Object.keys(en)).toEqual(Object.keys(th));
    expect(Object.keys(ru)).toEqual(Object.keys(th));
  });

  it('has no empty, padded or double-spaced value, and the same placeholders everywhere', () => {
    for (const [lang, dict] of Object.entries({ th, en, ru })) {
      for (const [k, v] of Object.entries(dict)) {
        expect(v.trim(), `${lang}: ${k}`).toBe(v);
        expect(v.length, `${lang}: ${k}`).toBeGreaterThan(0);
        expect(v.includes('  '), `${lang}: ${k}`).toBe(false);
        expect(placeholders(v), `${lang}: ${k}`).toEqual(placeholders(th[k] ?? ''));
      }
    }
  });

  it('writes Thai with Arabic numerals and the app\'s own unit words; leaves no Thai in a translation; translates what is words', () => {
    for (const [k, v] of Object.entries(th)) expect(/[๐-๙]/.test(v), k).toBe(false);
    // the units as Orbitlab's Thai names them (src/i18n/th.ts)
    expect([th['unit.kg'], th['unit.m'], th['unit.W'], th['unit.Wh'], th['unit.min'], th['unit.cm'], th['unit.mm'], th['unit.m2']])
      .toEqual(['กก.', 'ม.', 'วัตต์', 'วัตต์-ชม.', 'นาที', 'ซม.', 'มม.', 'ตร.ม.']);
    const appThai = Object.values(thApp).join('\n');
    for (const word of ['กก.', 'วัตต์-ชม.', 'เซลล์แสงอาทิตย์', 'เงามืดของโลก', 'ศูนย์กลางมวล', 'น้ำหนักบรรทุก', 'ท่อนที่', 'ฝาครอบหัวจรวด']) expect(appThai.includes(word), word).toBe(true);
    for (const [lang, dict] of Object.entries({ en, ru })) for (const [k, v] of Object.entries(dict)) expect(/[฀-๿]/.test(v), `${lang}: ${k}`).toBe(false);
    // what is a sentence in Thai is not left in English in the Russian
    for (const [k, v] of Object.entries(ru)) {
      if (!/[฀-๿]{12,}/.test(th[k]) || /^(?:model\.)/.test(k)) continue;
      expect(/[Ѐ-ӿ]/.test(v), `ru: ${k} = ${v}`).toBe(true);
    }
    for (const [k, v] of Object.entries(en)) if (/[฀-๿]{12,}/.test(th[k])) expect(/[A-Za-z]{3,}/.test(v), `en: ${k} = ${v}`).toBe(true);
  });

  it('keeps the models\' names as they are, and says each translation is a draft', () => {
    for (const k of ['model.soyuz-st31', 'model.soyuz-st31.short', 'model.edusat', 'model.edusat.short']) { expect(en[k], k).toBe(th[k]); expect(ru[k], k).toBe(th[k]); }
    expect(en['draft']).toMatch(/draft/i);
    expect(ru['draft']).toMatch(/Чернов/);
  });
});

describe('the section\'s text and its code', () => {
  const literal = new Set<string>(), patterns = new Set<string>();
  for (const text of CODE) {
    // a key in quotes, wherever it stands (a call, a choice of two, a list, a field of a model's description)
    for (const m of text.matchAll(/'([A-Za-z][\w-]*(?:\.[\w-]+)*)'/g)) {
      // a dotted one is held to be a key (and must have words); one of a single word counts only when it is a key
      if (m[1].includes('.') ? KEY.test(m[1]) : hasText(m[1])) literal.add(m[1]);
    }
    // a key made from a pattern
    for (const m of text.matchAll(/`([A-Za-z][\w-]*\.[^`\s]*\$\{[^`]+)`/g)) if (HEADS.includes(m[1].split('.')[0])) patterns.add(m[1]);
  }
  /** a pattern as a test of keys: each `${…}` stands for a run of key characters */
  const asRegExp = (pattern: string): RegExp => {
    let out = '', depth = 0, at = 0;
    for (let i = 0; i < pattern.length; i++) {
      if (depth === 0 && pattern.startsWith('${', i)) { out += pattern.slice(at, i).replace(/[.*+?^()|[\]\\]/g, '\\$&') + '[\\w.-]+?'; depth = 1; i++; continue; }
      if (depth > 0) { if (pattern[i] === '{') depth++; else if (pattern[i] === '}') { depth--; if (depth === 0) at = i + 1; } }
    }
    return new RegExp(`^${out}${pattern.slice(at).replace(/[.*+?^()|[\]\\]/g, '\\$&')}$`);
  };
  const tests = [...patterns].map((p) => ({ p, re: asRegExp(p) }));

  it('has words for every key the code names', () => {
    expect(literal.size).toBeGreaterThan(300);
    expect(patterns.size).toBeGreaterThan(50);
    const missing = [...literal].filter((k) => !hasText(k));
    expect(missing).toEqual([]);
    const empty = tests.filter(({ re }) => !Object.keys(th).some((k) => re.test(k))).map((t) => t.p);
    expect(empty, 'patterns that match no key').toEqual([]);
  });

  it('has no words that nothing names', () => {
    const unused = Object.keys(th).filter((k) => !literal.has(k) && !tests.some(({ re }) => re.test(k)));
    expect(unused).toEqual([]);
  });
});

describe('reading the text', () => {
  it('fills in the {params}, and gives the key back for one it has no words for', () => {
    expect(tx('asm.placed', { n: 3, total: 11 }, 'th')).toBe('ติดตั้งแล้ว 3/11');
    expect(tx('asm.no.wrongSlot', { unit: 'U', slot: 'S', expected: 'E' }, 'th')).toBe('ตำแหน่ง “S” ไม่ใช่ที่ของ U ในแบบอ้างอิง U อยู่ที่ “E”');
    expect(tx('no.such.key', undefined, 'th')).toBe('no.such.key');
    expect(hasText('asm.placed')).toBe(true);
    expect(hasText('no.such.key')).toBe(false);
  });

  it('shows the Thai until a language\'s copy has been fetched, then that language', async () => {
    let lang: Lang = 'th';
    bindLanguage(() => lang);
    expect(tx('mode.assemble')).toBe('ประกอบ');
    lang = 'ru';
    const before = hasLanguage('ru');
    if (!before) expect(tx('mode.assemble')).toBe('ประกอบ');
    await loadLanguage('ru');
    expect(hasLanguage('ru')).toBe(true);
    expect(tx('mode.assemble')).toBe(ru['mode.assemble']);
    await loadLanguage('en');
    expect(tx('mode.assemble', undefined, 'en')).toBe(en['mode.assemble']);
    expect(hasLanguage('th')).toBe(true);
    lang = 'th';
    expect(tx('mode.assemble')).toBe('ประกอบ');
    bindLanguage(() => 'th');
  });

  it('writes numbers the interface language\'s way', () => {
    expect(num(1234.5, 1, 'th')).toBe('1,234.5');
    expect(num(1234.5, 1, 'en')).toBe('1,234.5');
    expect(num(1234.5, 1, 'ru').replace(/\s/g, ' ')).toBe('1 234,5');
    expect(num(6, 2, 'th')).toBe('6.00');
    expect(num(0.295 * 100, 1, 'ru')).toBe('29,5');
  });
});
