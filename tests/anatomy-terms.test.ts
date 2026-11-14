/**
 * The Soyuz Anatomy pages' Thai words (scripts/anatomy-terms.mjs; owner,
 * 2026-11-13 and 2026-11-14): the pages in public/anatomy/ are in the words
 * Thai agencies and press write, and a page exported again from the owner's
 * Anatomy project, which still has the earlier words, is caught here before it
 * is published. The rules themselves are checked on short lines: what they
 * change, and what they must leave (a step is not a stage, a cargo ship's
 * cargo is not the rocket's payload).
 */
import { describe, expect, it } from 'vitest';
import { ANATOMY_PAGES } from '../src/data/anatomy';

// The script is plain Node, loaded by path so the test needs no node types (as tests/bundle-budget.test.ts).
interface TermsScript {
  applyTerms(name: string, text: string): string;
  anatomyPages(): { name: string; path: string; text: string }[];
}
const SCRIPT = '../scripts/anatomy-terms.mjs';
const { applyTerms, anatomyPages } = (await import(/* @vite-ignore */ SCRIPT)) as TermsScript;

const A = 'soyuz-2-1a-soyuz-ms.html', B = 'soyuz-2-1b-fregat-st31.html';

/** Where two texts first differ, with a little of each around it (the pages are 4.5 MB: never print them whole). */
const firstDifference = (was: string, now: string): string => {
  let i = 0;
  while (i < was.length && was[i] === now[i]) i++;
  const cut = (s: string) => s.slice(Math.max(0, i - 30), i + 40).replace(/[\r\n]/g, ' ');
  return `at ${i}: "${cut(was)}" would become "${cut(now)}"`;
};

describe('the Anatomy pages in the Thai words of Thai sources', () => {
  const pages = anatomyPages();

  it('checks every page the app shows', () => {
    expect(pages.map((p) => `anatomy/${p.name}`).sort()).toEqual(ANATOMY_PAGES.map((p) => p.page).sort());
  });

  it('are as the rules leave them (after replacing a page: `npm run anatomy:terms`, then `npm run anatomy`)', () => {
    for (const page of pages) {
      const next = applyTerms(page.name, page.text);
      expect(next === page.text ? '' : firstDifference(page.text, next), page.name).toBe('');
    }
  });

  it('keep their mixed line endings: a page read and written back is the same text', () => {
    for (const page of pages) {
      expect(page.text.includes('\r\n'), page.name).toBe(true);
      expect(/[^\r]\n/.test(page.text), page.name).toBe(true);
    }
  });
});

describe('the rules', () => {
  const each = (name: string, cases: [string, string][]) => { for (const [was, now] of cases) expect(applyTerms(name, was), was).toBe(now); };

  it('a rocket stage is ท่อน, the core ท่อนกลาง, the upper stage ท่อนบน', () => {
    each(B, [
      ['ขั้นที่ 1 • Блоки Б', 'ท่อนที่ 1 • Блоки Б'],
      ['เครื่องยนต์ขั้นที่สามของ Soyuz', 'เครื่องยนต์ท่อนที่สามของ Soyuz'],
      ['จรวดสามขั้น', 'จรวดสามท่อน'],
      ['บูสเตอร์เป็นขั้น 1 แกนกลางเป็นขั้น 2', 'บูสเตอร์เป็นท่อนที่ 1 ท่อนกลางเป็นท่อนที่ 2'],
      ['โครงถักระหว่างขั้น', 'โครงถักระหว่างท่อน'],
      ['ลำดับการแยกขั้น', 'ลำดับการแยกท่อน'],
      ['ขั้นส่งวงโคจร Fregat', 'ท่อนบน Fregat'],
      ['แกนกลาง — Block A', 'ท่อนกลาง — Block A'],
    ]);
  });

  it('a step stays ขั้น', () => {
    for (const line of ['ขั้นตอนถัดไป', 'ขั้นถัดไป', 'เลือกขั้นเพื่อเน้นชิ้นส่วน', 'ตรวจขั้นสุดท้ายและครอบแฟริ่ง', 'จับเชื่อมต่อในขั้นต้นของการเทียบท่า', 'ระหว่างขั้น', 'กำลังเปลี่ยนขั้น', 'เป็นขั้นตอนกลับโลก']) {
      expect(applyTerms(A, line), line).toBe(line);
    }
  });

  it('the fairing is แฟริ่ง, with ฝาครอบหัวจรวด beside it where it is introduced', () => {
    each(A, [
      ['เปิดหัวครอบ', 'เปิดแฟริ่ง'],
      ['หัวครอบปกป้องยานระหว่างผ่านบรรยากาศ', 'แฟริ่ง (ฝาครอบหัวจรวด) ปกป้องยานระหว่างผ่านบรรยากาศ'],
      ['หัวครอบขนาดใหญ่หุ้ม Fregat', 'แฟริ่ง (ฝาครอบหัวจรวด) ขนาดใหญ่หุ้ม Fregat'],
    ]);
  });

  it('what the rocket carries is เพย์โหลด; what a cargo ship carries to the station stays สัมภาระ', () => {
    each(A, [
      ['ภาพแทนสัมภาระในโมเดล', 'ภาพแทนเพย์โหลดในโมเดล'],
      ['สัมภาระเติมสถานี 580 กก.', 'สัมภาระเติมสถานี 580 กก.'],
      ['สัมภาระเติมบรรยากาศ', 'สัมภาระเติมบรรยากาศ'],
    ]);
  });

  it('propellant is เชื้อเพลิง, with สารออกซิไดซ์ where both are meant; propulsion is ระบบขับเคลื่อน', () => {
    each(A, [
      ['เผาไหม้สารขับดันเอง', 'เผาไหม้เชื้อเพลิงเอง'],
      ['ติดตามวงจรสารขับดัน', 'ติดตามวงจรเชื้อเพลิงและสารออกซิไดซ์'],
      ['คู่สารขับดันเก็บได้นาน N₂O₄ / UDMH', 'เชื้อเพลิงและสารออกซิไดซ์เก็บได้นาน N₂O₄ / UDMH'],
      ['ด้านออกซิไดเซอร์ของหัวฉีด', 'ด้านสารออกซิไดซ์ของหัวฉีด'],
      ['ระบบขับดันยาน', 'ระบบขับเคลื่อนยาน'],
      ['โมดูลเครื่องมือและขับดัน — PAO', 'โมดูลเครื่องมือและขับเคลื่อน — PAO'],
      ['สารขับดันส่งให้สถานี', 'เชื้อเพลิงและสารออกซิไดซ์ส่งให้สถานี'],
      ['หัวฉีดควบคุมท่าทาง', 'หัวฉีดควบคุมการทรงตัว'],
    ]);
    // the escape tower's motor unit is not a propulsion system of the vehicle
    for (const line of ['ชุดขับดันหนีฉุกเฉิน', 'ปลดชุดขับดันบนยอด']) expect(applyTerms(A, line), line).toBe(line);
  });

  it('the spacecraft rules are the 2.1a pages\' only: the 2.1b page, and the model files made from its bytes, stay as they are', () => {
    const line = 'โมดูลเครื่องมือและขับดัน (PAO)';
    expect(applyTerms(B, line)).toBe(line);
    expect(applyTerms(A, line)).toBe('โมดูลเครื่องมือและขับเคลื่อน (PAO)');
  });

  it('applied again, change nothing more', () => {
    const line = 'ขั้นที่ 1 กับแกนกลางและขั้นส่งวงโคจร Fregat ใต้หัวครอบ: สัมภาระ, สารขับดัน, ออกซิไดเซอร์, ระบบขับดัน, ควบคุมท่าทาง, จรวดสามขั้น';
    for (const name of [A, B]) {
      const once = applyTerms(name, line);
      expect(once).not.toBe(line);
      expect(applyTerms(name, once), name).toBe(once);
    }
  });
});
