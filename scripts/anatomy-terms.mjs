/**
 * The Soyuz Anatomy pages' Thai, in the words Thai agencies and press write
 * (owner, 2026-11-13 and 2026-11-14; docs/development/reports/
 * structure-assembly-pilot.md §15.2 and §16):
 *
 *   node scripts/anatomy-terms.mjs            rewrite public/anatomy/*.html in place
 *   node scripts/anatomy-terms.mjs --check    say which pages would change; exit 1 if any
 *
 * The pages are exported from the owner's own Anatomy project, which still has
 * the earlier words: a page exported again brings them back. Run this on it,
 * then `npm run anatomy` and, for the 2.1b page, `npm run structure` with a
 * new DATA_REVISION (their files carry the page's hash). tests/anatomy-terms
 * .test.ts fails while a page here would still be changed by these rules.
 *
 * What changes, and only where the word means that thing:
 * - a rocket stage is ท่อน (ขั้น stays where it is a step: ขั้นตอน, ขั้นถัดไป);
 *   the upper stage Fregat is ท่อนบน Fregat
 * - the core is ท่อนกลาง
 * - the fairing is แฟริ่ง, the pages' own other word for it, with ฝาครอบหัวจรวด
 *   beside it where it is introduced
 * - what the rocket carries is เพย์โหลด (a cargo ship's cargo stays สัมภาระ)
 * - propellant is เชื้อเพลิง, with สารออกซิไดซ์ where both are meant; a
 *   propulsion system is ระบบขับเคลื่อน (the escape tower's motor unit stays
 *   ชุดขับดัน)
 * - a spacecraft's attitude control is การควบคุมการทรงตัว
 *
 * Nothing but those words: every other byte of a page, its mixed line endings
 * included, is written back as it was read. The rules are applied in order and
 * a page they have been applied to is not changed by them again.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const lit = (from, to) => (s) => s.split(from).join(to);
const re = (pattern, to) => (s) => s.replace(pattern, to);

/** Every page. The order matters: the longer phrase before the word inside it. */
const COMMON = [
  // the static list of sources said 2.1b where the page's own data says 2.1a (owner, 2026-11-13)
  lit('ประวัติ KBKhA: RD0110 บน Soyuz-2.1b</a><span>ยืนยัน RD0110 เป็นเครื่องยนต์ขั้นที่สามของ Soyuz-2.1b',
    'ประวัติ KBKhA: RD0110 บน Soyuz-2.1a</a><span>ยืนยัน RD0110 เป็นเครื่องยนต์ขั้นที่สามของ Soyuz-2.1a'),

  // stage
  lit('ขั้นส่งวงโคจร Fregat', 'ท่อนบน Fregat'),
  lit('Fregat · ขั้นส่งวงโคจร', 'Fregat · ท่อนบน'),
  lit('ขั้นส่งวงโคจร', 'ท่อนบน'),
  lit('ขั้นส่งหรือปรับวงโคจร', 'ท่อนบนสำหรับส่งหรือปรับวงโคจร'),
  lit('และขั้น Fregat', 'และท่อนบน Fregat'),
  lit('โครงคั่นขั้น', 'โครงคั่นระหว่างท่อน'),
  lit('โครงถักระหว่างขั้น', 'โครงถักระหว่างท่อน'),
  lit('โครงเปิดระหว่างขั้น', 'โครงเปิดระหว่างท่อน'),
  lit('แผนกำจัดขั้นจรวด', 'แผนกำจัดท่อนจรวด'),
  lit('แผนกำจัดขั้น', 'แผนกำจัดท่อนจรวด'),
  lit('วิถีกำจัดขั้น', 'วิถีกำจัดท่อนจรวด'),
  // (on the truss's own card "the upper stage" is the one above it, Block I, and ท่อนบน now names Fregat)
  lit('เครื่องยนต์ขั้นบน', 'เครื่องยนต์ท่อนที่สาม'),
  lit('วงแหวนต่อกับขั้นล่างและขั้นบน', 'วงแหวนต่อกับท่อนกลางและท่อนที่สาม'),
  lit('สิ้นสุดการนำส่งขั้นหลัก', 'สิ้นสุดการนำส่งของจรวดทั้งสามท่อน'),
  lit('"label":"ขั้นเหนือ Block I"', '"label":"ท่อนบน"'),
  lit('<dt>ขั้นเหนือ Block I</dt>', '<dt>ท่อนบน</dt>'),
  lit('ขั้นจรวด', 'ท่อนจรวด'),
  lit('แยกขั้น', 'แยกท่อน'),
  lit("value:'3 ขั้น'", "value:'3 ท่อน'"),
  lit('เครื่องขั้นสาม', 'เครื่องยนต์ท่อนที่สาม'),
  lit('ส่วนขั้นสาม', 'ส่วนท่อนที่สาม'),
  re(/ขั้น(ที่ ?(?:[123]|หนึ่ง|สอง|สาม))/g, 'ท่อน$1'),
  re(/ขั้น(ล่าง|บน|แรก|หลัก|เหนือ)/g, 'ท่อน$1'),
  re(/(สาม|สี่|อีก|เป็น|นับ|เหนือ|กลาง)ขั้น(?!ตอน|ต้น|ถัด|สุดท้าย)/g, '$1ท่อน'),
  re(/เป็นท่อน ([123])/g, 'เป็นท่อนที่ $1'),
  lit('3 ขั้น:', '3 ท่อน:'),

  // core
  lit('แกนกลาง', 'ท่อนกลาง'),

  // fairing
  lit('หัวครอบขนาดใหญ่หุ้ม', 'แฟริ่ง (ฝาครอบหัวจรวด) ขนาดใหญ่หุ้ม'),
  lit('หัวครอบปกป้องยาน', 'แฟริ่ง (ฝาครอบหัวจรวด) ปกป้องยาน'),
  lit('หัวครอบ', 'แฟริ่ง'),

  // payload (a cargo ship's own cargo, "สัมภาระเติม…", is cargo)
  lit('พื้นที่แทนชุดสัมภาระ', 'พื้นที่แทนเพย์โหลด'),
  re(/สัมภาระ(?!เติม)/g, 'เพย์โหลด'),

  // propellant and propulsion
  lit('ระบบสารขับดัน H₂O₂/N₂', 'ระบบ H₂O₂/N₂'),
  lit('เผาไหม้สารขับดันเอง', 'เผาไหม้เชื้อเพลิงเอง'),
  lit('แผงหัวฉีดสารขับดัน', 'แผงหัวฉีด'),
  lit('หัวฉีดท่าทาง / จัดสารขับดัน', 'หัวฉีดควบคุมการทรงตัว / จัดเชื้อเพลิง'),
  lit('หัวฉีดท่าทางช่วยจัดสารขับดัน', 'หัวฉีดควบคุมการทรงตัวช่วยจัดเชื้อเพลิงในถัง'),
  lit('หัวฉีดท่าทางและการจัดสารขับดัน', 'หัวฉีดควบคุมการทรงตัวและการจัดเชื้อเพลิงในถัง'),
  lit('จัดสารขับดัน', 'จัดเชื้อเพลิงในถัง'),
  lit('ทางเดินสารขับดัน', 'ทางเดินของเชื้อเพลิงและสารออกซิไดซ์'),
  lit('วงจรสารขับดัน', 'วงจรเชื้อเพลิงและสารออกซิไดซ์'),
  lit("label:'สารขับดัน'", "label:'สารออกซิไดซ์และเชื้อเพลิง'"),
  lit('ออกซิไดเซอร์', 'สารออกซิไดซ์'),
  lit('คู่สารขับดัน', 'เชื้อเพลิงและสารออกซิไดซ์'),
  lit('ระบบขับดัน', 'ระบบขับเคลื่อน'),

  // a spacecraft's attitude
  lit('ควบคุมท่าทาง', 'ควบคุมการทรงตัว'),
  lit('สำหรับท่าทาง', 'สำหรับควบคุมการทรงตัว'),
];

/**
 * The two Soyuz-2.1a pages (a crewed Soyuz MS, a Progress cargo ship), after
 * the rules above: the spacecraft's own propulsion and what a Progress carries
 * to the station. The 2.1b page has one of these phrases in the script the
 * three pages share, for a spacecraft it does not show; it is left there, so
 * that page's bytes, and the model files made from them, stay as they are.
 */
const SPACECRAFT = [
  lit('เชื้อเพลิงขับดันของ Progress', 'เชื้อเพลิงของระบบขับเคลื่อน Progress'),
  lit('สารออกซิไดซ์ขับดันของ Progress', 'สารออกซิไดซ์ของระบบขับเคลื่อน Progress'),
  lit('ชุดขับดันของยาน', 'ระบบขับเคลื่อนของยาน'),
  lit('ถังขับดันของยาน', 'ถังของระบบขับเคลื่อนของยาน'),
  lit('ก๊าซอัดถังขับดัน', 'ก๊าซอัดถังของระบบขับเคลื่อน'),
  lit('โมดูลเครื่องมือและขับดัน', 'โมดูลเครื่องมือและขับเคลื่อน'),
  lit('(ห้องขับดัน)', '(ห้องระบบขับเคลื่อน)'),
  // (the Progress page's own note: the 580 kg is fuel and oxidiser together, and the card tells the two apart)
  lit('สารขับดันส่งให้สถานี', 'เชื้อเพลิงและสารออกซิไดซ์ส่งให้สถานี'),
  lit('เก็บสารขับดันสำหรับส่งให้สถานี', 'เก็บเชื้อเพลิงและสารออกซิไดซ์สำหรับส่งให้สถานี'),
  lit('สารขับดัน', 'เชื้อเพลิง'),
];

/** The rules of a page, by its file name. */
export function rulesFor(name) {
  return /^soyuz-2-1a-/.test(name) ? [...COMMON, ...SPACECRAFT] : COMMON;
}

/** A page's text with the rules applied. */
export function applyTerms(name, text) {
  return rulesFor(name).reduce((s, rule) => rule(s), text);
}

const here = dirname(fileURLToPath(import.meta.url));
export const ANATOMY_DIR = join(here, '..', 'public', 'anatomy');

/** The pages, read and written as UTF-8 with nothing done to their line endings. */
export function anatomyPages(dir = ANATOMY_DIR) {
  return readdirSync(dir).filter((f) => f.endsWith('.html')).sort().map((name) => ({ name, path: join(dir, name), text: readFileSync(join(dir, name), 'utf8') }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes('--check');
  let changed = 0;
  for (const page of anatomyPages()) {
    const next = applyTerms(page.name, page.text);
    if (next === page.text) { console.log(`${page.name}: as the rules leave it`); continue; }
    changed++;
    if (check) console.log(`${page.name}: would change`);
    else { writeFileSync(page.path, next, 'utf8'); console.log(`${page.name}: rewritten — now run npm run anatomy${page.name.includes('2-1b') ? ' and npm run structure (new DATA_REVISION)' : ''}`); }
  }
  if (check && changed) process.exit(1);
}
