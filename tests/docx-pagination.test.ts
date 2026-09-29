import { afterEach, describe, expect, it } from 'vitest';
import { setLang } from '../src/i18n';
import { worksheetsDocx } from '../src/worksheets/docx';
import type { Worksheet, WsItem } from '../src/worksheets/types';

function documentXml(bytes: Uint8Array): string {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let at = 0; view.getUint32(at, true) === 0x04034b50;) {
    const size = view.getUint32(at + 18, true);
    const nameLength = view.getUint16(at + 26, true), extraLength = view.getUint16(at + 28, true);
    const start = at + 30 + nameLength + extraLength;
    const name = new TextDecoder().decode(bytes.subarray(at + 30, at + 30 + nameLength));
    if (name === 'word/document.xml') return new TextDecoder().decode(bytes.subarray(start, start + size));
    at = start + size;
  }
  throw new Error('Missing document.xml');
}

function language(lang: Worksheet['lang']): void {
  if (!(globalThis as { document?: unknown }).document) (globalThis as { document?: unknown }).document = { documentElement: {} };
  setLang(lang);
}
afterEach(() => language('en'));

describe('Word question pagination', () => {
  for (const lang of ['en', 'th', 'ru'] as const) {
    for (const kind of ['choice', 'multi', 'order'] as const) {
      it(`keeps the ${lang} ${kind} prompt, picture, hint and choices together but releases the next question`, () => {
        language(lang);
        const prompt = { en: 'First question', th: 'คำถามแรก', ru: 'Первый вопрос' }[lang];
        const options = ['Option A', 'Option B', 'Option C', 'Option D'];
        const item: WsItem = { kind, prompt, options, figure: { svg: '<svg/>', caption: 'Picture caption' }, answer: { text: 'A' } };
        const sheet: Worksheet = { lang, title: 'Pagination regression', subtitle: '', student: 'QA', code: 'QA', seed: 1,
          generatedAt: new Date('2026-09-29T12:00:00Z'), sections: [{ title: 'Questions', items: [item, { ...item, prompt: 'Second question' }] }] };
        const xml = documentXml(worksheetsDocx([sheet], () => ({ bytes: new Uint8Array([137, 80, 78, 71]), type: 'png', width: 100, height: 50 })));
        const paragraphs = [...xml.matchAll(/<w:p>(.*?)<\/w:p>/g)].map((m) => m[1]);
        const first = paragraphs.findIndex((p) => p.includes(prompt));
        const last = paragraphs.findIndex((p) => p.includes('Option D'));
        expect(first).toBeGreaterThan(-1);
        expect(last).toBeGreaterThan(first);
        // Both properties are needed: keepNext alone permits a wrapped option
        // itself to split, and keepLines alone permits breaks between options.
        for (const p of paragraphs.slice(first, last)) {
          expect(p, p.slice(0, 150)).toContain('<w:keepNext/>');
          expect(p, p.slice(0, 150)).toContain('<w:keepLines/>');
          expect(p.indexOf('<w:keepNext/>')).toBeLessThan(p.indexOf('<w:keepLines/>'));
        }
        expect(paragraphs[last]).toContain('<w:keepLines/>');
        expect(paragraphs[last]).not.toContain('<w:keepNext/>');
        expect(paragraphs[last + 1]).not.toContain('<w:keepNext/>');
        expect(paragraphs[last + 2]).toContain('Second question');
      });
    }
  }
});
