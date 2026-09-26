/**
 * Worksheets (roadmap E05): every answer worked from the flight is the
 * flight's own number, each student's sheet is drawn from their name and the
 * class code (the same inputs, the same sheet), the sheets carry no answer
 * and the key carries them all, in three languages; the Word file is a
 * well-formed package.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setLang } from '../src/i18n';
import { Simulation } from '../src/physics/simulation';
import { G0, MU_EARTH, R_EARTH } from '../src/physics/constants';
import { vehicleById } from '../src/data/vehicles';
import { BUILTIN_LESSONS } from '../src/lessons/catalog';
import { lessonConfig } from '../src/lessons/config';
import { flightEnded } from '../src/lessons/grader';
import { flightElements } from '../src/lessons/measures';
import { BUILTIN_QUESTIONS, FLIGHT_DATA } from '../src/lessons/assessment/bank';
import { rng } from '../src/lessons/assessment/draw';
import { FLIGHT_QUESTION_IDS, flightQuestion, valueAt } from '../src/worksheets/flight-questions';
import { buildClass, buildWorksheet, type WorksheetInput } from '../src/worksheets/build';
import { answerKeyHtml, worksheetsHtml } from '../src/worksheets/html';
import { answerKeyDocx, worksheetsDocx } from '../src/worksheets/docx';
import { crc32 } from '../src/worksheets/zip';
import type { Domain } from '../src/lessons/types';

function withLang(lang: 'en' | 'ru' | 'th'): void {
  const g = globalThis as { document?: unknown };
  if (!g.document) g.document = { documentElement: {} };
  setLang(lang);
}
afterEach(() => withLang('en'));

const lesson = BUILTIN_LESSONS.find((l) => l.id === 'orbit-first')!;
let sim: Simulation;
beforeAll(() => {
  sim = new Simulation(lessonConfig(lesson.mission), { headless: true });
  let guard = 0;
  while (!flightEnded(lesson, sim) && !sim.done && guard++ < 2_000_000) sim.step(sim.suggestedDt());
}, 120_000);

const input = (over: Partial<WorksheetInput> = {}): Omit<WorksheetInput, 'student'> => ({
  flight: sim, lang: 'en', generatedAt: new Date('2026-09-26T10:00:00Z'), lesson, classCode: '4821',
  flightCount: 8, bankCount: 4, domains: [1, 2, 3, 4, 5, 6] as Domain[], bank: BUILTIN_QUESTIONS, data: FLIGHT_DATA, ...over,
});
const numberIn = (text: string, at: RegExp): number => Number(at.exec(text)![1].replace(/[\s ,]/g, (c) => (c === ',' ? '' : '')));

describe('questions worked from the flight', () => {
  it('have for an answer the flight\'s own numbers, worked as the student is asked to', () => {
    const tel = sim.telemetry;
    const meco = sim.events.find((e) => e.key === 'evt.meco')!.t;
    const ascent = tel.filter((s) => s.t >= 0 && s.t <= sim.events.find((e) => e.key === 'evt.seco')!.t);
    const r = rng(7);
    const q = (id: string) => flightQuestion(id, sim, 'en', r)!;
    for (const id of FLIGHT_QUESTION_IDS) expect(q(id), id).not.toBeNull();

    const alt = q('altAt');
    const tAlt = numberIn(alt.prompt, /T\+(\d+) s/);
    expect(alt.answer.value).toBeCloseTo(valueAt(tel, tAlt, 'alt')!, 6);
    expect(Math.abs(alt.answer.value! - tel.reduce((a, b) => (Math.abs(b.t - tAlt) < Math.abs(a.t - tAlt) ? b : a)).alt / 1000)).toBeLessThan(1);
    expect(q('maxQ').answer.value).toBeCloseTo(Math.max(...ascent.map((s) => s.q)) / 1000, 6);
    expect(Math.abs(q('maxQTime').answer.value! - sim.state.maxQ.t)).toBeLessThan(1.5);
    expect(q('maxG').answer.value).toBeCloseTo(Math.max(...ascent.map((s) => s.gLoad)), 6);
    expect(q('mecoTime').answer.value).toBe(meco);

    // thrust-to-weight from the numbers printed in the prompt
    const twr = q('twr');
    const [F, m] = [numberIn(twr.prompt, /give ([\d,]+) kN/), numberIn(twr.prompt, /mass of ([\d.,]+) t/)];
    expect(twr.answer.value).toBeCloseTo(F / (m * G0), 6);
    expect(F / (m * G0)).toBeGreaterThan(1.2);

    // the first stage's ideal Δv, and what the ascent lost of it
    const stage = vehicleById('falcon9').stages[0].engine;
    const m0 = sim.telemetry.find((s) => s.t >= -1e-6)!.mass / 1000;
    const dv = q('stageDv');
    expect(dv.prompt).toContain(`${Math.round((stage.ispSL + stage.ispVac) / 2)} s`);
    expect(numberIn(dv.prompt, /from ([\d.,]+) t/)).toBeCloseTo(m0, 0);
    expect(dv.answer.value!).toBeGreaterThan(3000);
    const loss = q('stageLoss');
    expect(loss.answer.value!).toBeGreaterThan(500);
    expect(loss.answer.value!).toBeLessThan(dv.answer.value!);

    // the orbit reached: period and perigee speed from its apsides
    const el = flightElements(sim);
    const a = R_EARTH + (el.periapsisAlt + el.apoapsisAlt) / 2;
    expect(q('period').answer.value!).toBeCloseTo((2 * Math.PI * Math.sqrt(a ** 3 / MU_EARTH)) / 60, 1);
    const rp = R_EARTH + el.periapsisAlt;
    expect(q('perigeeSpeed').answer.value!).toBeCloseTo(Math.sqrt(MU_EARTH * (2 / rp - 1 / a)) / 1000, 3);
  });

  it('leave out what the flight did not do: no orbit, no period', () => {
    const short = new Simulation(lessonConfig(lesson.mission), { headless: true });
    while (short.state.t < 60) short.step(short.suggestedDt());
    expect(flightQuestion('period', short, 'en', rng(1))).toBeNull();
    expect(flightQuestion('mecoTime', short, 'en', rng(1))).toBeNull();
  });
});

describe('a class\'s worksheets', () => {
  it('draw each student\'s own numbers from the name and the class code, the same every time', () => {
    const a = buildClass(input(), ['Somchai', 'Ivan Petrov']);
    const b = buildClass(input(), ['Somchai', 'Ivan Petrov']);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a[0].seed).not.toBe(a[1].seed);
    expect(a[0].sections[2].items.length).toBe(8);
    expect(a[0].sections[3].items.length).toBe(4);
    // the same name in another class is another sheet
    expect(buildWorksheet({ ...input({ classCode: '1111' }), student: 'Somchai' }).seed).not.toBe(a[0].seed);
    // across a class the drawn times differ
    const times = new Set(buildClass(input({ flightCount: 11 }), Array.from({ length: 20 }, (_, i) => `S${i}`))
      .map((s) => s.sections[2].items.find((i) => /altitude at T\+/.test(i.prompt))?.prompt));
    expect(times.size).toBeGreaterThan(3);
  });

  it('keep the answers off the sheets and put every one in the key', () => {
    const sheets = buildClass(input(), ['Somchai', 'Ivan Petrov']);
    const html = worksheetsHtml(sheets);
    const key = answerKeyHtml(sheets);
    expect(html.match(/<article>/g)).toHaveLength(2);
    expect(html).not.toContain('class="a"');
    for (const s of sheets) for (const sec of s.sections) for (const item of sec.items) {
      expect(html).toContain(item.prompt.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      expect(key).toContain(item.answer.text.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      if (item.answer.working) expect(html).not.toContain(item.answer.working.slice(0, 40).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;'));
    }
    expect(key).toContain('Somchai');
    // the event table does not give away what the questions ask: the peak q, the lift-off's T/W
    expect(html).not.toContain(`${sim.events.find((e) => e.key === 'evt.maxQ')!.params!.q} kPa`);
    expect(sheets[0].sections[1].table!.some(([, text]) => /max-Q|T\/W/i.test(text))).toBe(false);
    // charts drawn for print, with no script and nothing fetched
    expect(html).not.toMatch(/<script|https?:\/\/(?!www\.w3\.org)/);
    expect(html).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
  });

  it('are written in the language on screen', () => {
    for (const [lang, script] of [['ru', /\p{Script=Cyrillic}/u], ['th', /\p{Script=Thai}/u]] as const) {
      withLang(lang);
      const [sheet] = buildClass(input({ lang }), ['A']);
      for (const s of sheet.sections) {
        expect(s.title, lang).toMatch(script);
        for (const item of s.items) expect(item.prompt, `${lang}: ${item.prompt}`).toMatch(script);
      }
    }
  });
});

/** CRC-32 bit by bit, independently of the writer's table. */
function slowCrc(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** The entries of a stored zip, read independently of the writer, each checked against its CRC. */
function unzip(bytes: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = new Map<string, Uint8Array>();
  let at = 0;
  while (view.getUint32(at, true) === 0x04034b50) {
    const method = view.getUint16(at + 8, true), crc = view.getUint32(at + 14, true), size = view.getUint32(at + 18, true);
    const nameLen = view.getUint16(at + 26, true), extra = view.getUint16(at + 28, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 30, at + 30 + nameLen));
    const raw = bytes.subarray(at + 30 + nameLen + extra, at + 30 + nameLen + extra + size);
    expect(method, name).toBe(0);
    const data = raw;
    expect(slowCrc(data), name).toBe(crc);
    out.set(name, data);
    at += 30 + nameLen + extra + size;
  }
  expect(view.getUint32(bytes.length - 22, true)).toBe(0x06054b50);
  expect(view.getUint16(bytes.length - 22 + 10, true)).toBe(out.size);
  return out;
}

/** Tags open and close in order (the parts are machine-written, without comments or CDATA). */
function wellFormed(xml: string): boolean {
  const stack: string[] = [];
  for (const m of xml.replace(/<\?xml[^>]*\?>/, '').matchAll(/<(\/?)([\w:]+)[^>]*?(\/?)>/g)) {
    if (m[3]) continue;
    if (!m[1]) stack.push(m[2]);
    else if (stack.pop() !== m[2]) return false;
  }
  return stack.length === 0;
}

describe('the Word documents', () => {
  it('are zip packages Word reads: content types, relationships, the document, and a picture for each figure', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
    const sheets = buildClass(input(), ['Somchai', 'Ivan Petrov']);
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    let pictures = 0;
    const docx = worksheetsDocx(sheets, (f) => (f.svg || f.image ? (pictures++, { bytes: png, type: 'png', width: 520, height: 260 }) : null));
    const files = unzip(docx);
    for (const name of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/_rels/document.xml.rels']) expect(files.has(name), name).toBe(true);
    const doc = new TextDecoder().decode(files.get('word/document.xml'));
    expect(wellFormed(doc)).toBe(true);
    expect(wellFormed(new TextDecoder().decode(files.get('word/_rels/document.xml.rels')))).toBe(true);
    expect([...files.keys()].filter((n) => n.startsWith('word/media/'))).toHaveLength(pictures);
    expect(doc.match(/<w:br w:type="page"\/>/g)).toHaveLength(1);
    // Word refuses a part whose children are out of the schema's order: borders, paragraph and run properties
    const inOrder = (block: RegExp, order: string[]) => {
      for (const m of doc.matchAll(block)) {
        const seen = [...m[1].matchAll(/<w:(\w+)/g)].map((x) => order.indexOf(x[1])).filter((i) => i >= 0);
        expect(seen, m[0].slice(0, 80)).toEqual([...seen].sort((a, b) => a - b));
      }
    };
    inOrder(/<w:tblBorders>(.*?)<\/w:tblBorders>/g, ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']);
    inOrder(/<w:pPr>(.*?)<\/w:pPr>/g, ['keepNext', 'pBdr', 'spacing', 'jc']);
    inOrder(/<w:rPr>(.*?)<\/w:rPr>/g, ['rFonts', 'b', 'bCs', 'i', 'iCs', 'color', 'sz', 'szCs']);
    // every table cell holds a paragraph
    for (const m of doc.matchAll(/<w:tc>(.*?)<\/w:tc>/g)) expect(m[1]).toContain('<w:p>');
    expect(doc).toContain('Somchai');
    const key = new TextDecoder().decode(unzip(answerKeyDocx(sheets)).get('word/document.xml'));
    expect(wellFormed(key)).toBe(true);
    for (const item of sheets[1].sections[2].items) expect(key).toContain(item.answer.text.replace(/&/g, '&amp;').replace(/</g, '&lt;'));
    expect(doc).not.toContain(sheets[1].sections[2].items[0].answer.working!.slice(0, 30));
  });
});
