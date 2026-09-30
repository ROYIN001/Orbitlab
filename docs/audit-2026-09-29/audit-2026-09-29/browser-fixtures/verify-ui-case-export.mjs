// Audit-only: copies and verifies the actual results file exported by the browser.
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { createServer } from '../source-integrated/node_modules/vite/dist/node/index.js';
const source = 'C:/Users/Royin/Downloads/orbitlab-QA-Test-2026-09-29-19-39.orbitlab-results.json';
const audit = new URL('../', import.meta.url);
const preserved = new URL('orbitlab-QA-Test-2026-09-29-19-39.orbitlab-results.json', audit);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const original = readFileSync(source);
if (existsSync(preserved)) {
  if (sha(readFileSync(preserved)) !== sha(original)) throw new Error('Existing evidence differs; not overwriting it');
} else copyFileSync(source, preserved);
const root = new URL('../source-integrated/', import.meta.url);
const server = await createServer({ root: fileURLToPath(root), configFile: false, server: { middlewareMode: true }, appType: 'custom' });
try {
  const mod = (path) => server.ssrLoadModule('/' + path);
  const [{ verifyResults, loadProgress, saveProgress }, { caseWorksheet, caseKey }, { gradeCaseLesson }, { TRACK6 }, { setLang }] = await Promise.all([
    mod('src/lessons/progress.ts'), mod('src/worksheets/cases.ts'), mod('src/lessons/case-grader.ts'),
    mod('src/lessons/builtin/track6.ts'), mod('src/i18n/index.ts'),
  ]);
  globalThis.document = { documentElement: {} };
  const file = JSON.parse(original.toString('utf8'));
  const checksumValid = await verifyResults(file);
  const tampered = structuredClone(file);
  tampered.student = `${tampered.student ?? ''}-altered-for-negative-control`;
  const alteredCopyRejected = !(await verifyResults(tampered));
  const records = [];
  const normalized = (value) => JSON.parse(JSON.stringify(value));
  const displayedSheet = (value) => {
    const sheet = normalized(value);
    for (const section of sheet.sections) for (const item of section.items) delete item.answer.value;
    return sheet;
  };
  for (const lesson of TRACK6) {
    const progress = file.progress.lessons[lesson.id];
    if (!progress?.passed) throw new Error(`Missing saved pass ${lesson.id}`);
    for (const recordType of ['passedRecord', 'last']) {
      const record = progress[recordType], data = record?.caseData, snapshot = data?.snapshot;
      if (!snapshot || data.case !== lesson.case) throw new Error(`Missing/wrong frozen snapshot ${lesson.id}/${recordType}`);
      setLang(snapshot.worksheet.lang);
      const oldKey = caseKey(snapshot.worksheet);
      const recreated = caseWorksheet(data.case, { ...snapshot.source, lang: snapshot.worksheet.lang, generatedAt: new Date(snapshot.generatedAt) });
      if (!recreated) throw new Error(`Cannot recreate ${lesson.id}/${recordType}`);
      const newKey = caseKey(recreated);
      const differences = Object.keys(oldKey).map((id) => ({ id, stored: oldKey[id].value, recreated: newKey[id]?.value,
        absoluteDifference: Math.abs(oldKey[id].value - newKey[id]?.value), tolerance: oldKey[id].tol,
        kindEqual: oldKey[id].kind === newKey[id]?.kind, toleranceEqual: oldKey[id].tol === newKey[id]?.tol }));
      const storedGrade = gradeCaseLesson(lesson, oldKey, record.answers, progress.revealed ?? {});
      const recreatedGrade = gradeCaseLesson(lesson, newKey, record.answers, progress.revealed ?? {});
      const activity = snapshot.source.activity;
      records.push({
        lessonId: lesson.id, case: data.case, recordType, recordedAt: record.at, worksheetLanguage: snapshot.worksheet.lang,
        recordedVerdict: record.verdict, storedKeyRegrade: storedGrade.verdict, recreatedKeyRegrade: recreatedGrade.verdict,
        criteriaCount: recreatedGrade.criteria.length, allCriteriaPass: recreatedGrade.criteria.every((c) => c.state === 'pass'),
        caseDataJsonCharacters: JSON.stringify(data).length, frozenSourceJsonCharacters: JSON.stringify(snapshot.source).length,
        frozenSourceSha256: sha(JSON.stringify(snapshot.source)),
        recreatedKeysExactlyEqual: isDeepStrictEqual(oldKey, newKey), recreatedWorksheetExactlyEqual: isDeepStrictEqual(snapshot.worksheet, normalized(recreated)),
        recreatedKeysNumericallyEquivalent: differences.every((d) => d.kindEqual && d.toleranceEqual && d.absoluteDifference <= 1e-10 * Math.max(1, Math.abs(d.stored))),
        displayedWorksheetExactlyEqual: isDeepStrictEqual(displayedSheet(snapshot.worksheet), displayedSheet(recreated)),
        keyDifferences: differences, maxAbsoluteKeyDifference: Math.max(...differences.map((d) => d.absoluteDifference)),
        theos2Epoch: data.theos2Epoch, activityTo: data.activityTo,
        activity: 'from' in activity ? { kind: 'daily', fromJD: activity.from, days: activity.f107.length, equalArrayLengths: activity.f107.length === activity.f107a.length && activity.f107.length === activity.ap.length } : { kind: 'constant', ...activity },
      });
    }
  }
  let storageValue = JSON.stringify(file.progress);
  const store = { getItem: () => storageValue, setItem: (_key, value) => { storageValue = value; } };
  const loaded = loadProgress(store);
  const savePassed = saveProgress(loaded, store);
  const roundtrip = loadProgress(store);
  const roundtripLessonsUnchanged = isDeepStrictEqual(file.progress.lessons, roundtrip.lessons);
  const codePaths = ['src/lessons/progress.ts', 'src/worksheets/cases.ts', 'src/lessons/case-grader.ts', 'src/lessons/builtin/track6.ts'];
  const result = {
    checkedAt: new Date().toISOString(), runtime: { node: process.version, v8: process.versions.v8, platform: process.platform },
    provenance: { downloadedFile: source, preservedFile: fileURLToPath(preserved), rawFileSha256: sha(original), rawFileBytes: original.length,
      exportedAt: file.exportedAt, studentLabel: file.student, storedChecksum: file.checksum,
      codeSha256: Object.fromEntries(codePaths.map((p) => [p, sha(readFileSync(new URL(p, root)))])) },
    checks: { checksumValid, alteredCopyRejected, savedPasses: Object.values(file.progress.lessons).filter((l) => l.passed).length,
      assessments: file.progress.assessments.length, recordsVerified: records.length,
      allSixRecordRegradesPass: records.every((r) => r.storedKeyRegrade === 'pass' && r.recreatedKeyRegrade === 'pass' && r.allCriteriaPass),
      allFrozenKeysExactlyRecreated: records.every((r) => r.recreatedKeysExactlyEqual),
      allFrozenWorksheetsExactlyRecreated: records.every((r) => r.recreatedWorksheetExactlyEqual),
      allKeysNumericallyEquivalent: records.every((r) => r.recreatedKeysNumericallyEquivalent),
      allDisplayedWorksheetsExactlyRecreated: records.every((r) => r.displayedWorksheetExactlyEqual),
      progressJsonCharacters: JSON.stringify(file.progress).length, progressUtf8Bytes: Buffer.byteLength(JSON.stringify(file.progress)),
      savePassed, roundtripLessonsUnchanged },
    records,
    limits: [
      'QA-Test is a synthetic UI acceptance run, not the owner\'s learning score or a psychometric assessment.',
      'Checksum detects accidental changes; it is not a digital signature or proof of authorship.',
      'This validates the actual downloaded export and module reconstruction; browser click/reload behavior is documented separately by the UI reviewer.',
      'Results export has no production progress-import/restore workflow. The in-memory save/load exercise does not claim one exists.',
      'No application/browser state was read or altered. The original download and preserved copy remain byte-identical.',
    ],
  };
  writeFileSync(new URL('ui-case-export-validation.json', audit), JSON.stringify(result, null, 2) + '\n');
  const rows = records.filter((r) => r.recordType === 'last').map((r) => `| ${r.lessonId} | ${r.criteriaCount}/${r.criteriaCount} ผ่าน | ${r.caseDataJsonCharacters.toLocaleString('en-US')} | ${r.activity.kind === 'daily' ? r.activity.days + ' วัน' : 'ไม่ใช้ series'} | ${r.recreatedKeysExactlyEqual ? 'ตรงทุกค่า' : 'ดู numerical differences ใน JSON'} |`).join('\n');
  const md = `# ตรวจไฟล์ผลกรณีศึกษาที่ส่งออกจาก UI จริง — 29 กันยายน 2026

ตรวจด้วย Node ${process.version} และ API ของ source-integrated โดยใช้ข้อมูล frozen ในไฟล์จริง ไม่อ่าน/แก้ browser state; ขั้นตอนตรวจ export ไม่แก้ production ส่วนการแก้คำซ้ำสองจุดระบุท้ายรายงาน

- ไฟล์ต้นฉบับ: ${source}
- สำเนาหลักฐาน: [${fileURLToPath(preserved).split(/[\\\\/]/).pop()}](${fileURLToPath(preserved).split(/[\\\\/]/).pop()}) — ${original.length.toLocaleString('en-US')} bytes, เหมือนต้นฉบับทุกไบต์
- SHA-256 ของไฟล์: ${sha(original)}
- checksum ที่ผลิตภัณฑ์บันทึก: ${file.checksum}; verifyResults = **${checksumValid}**; สำเนาในหน่วยความจำที่เปลี่ยนชื่อถูกปฏิเสธ = **${alteredCopyRejected}**
- Exported at: ${file.exportedAt}; ชื่อ QA-Test เป็นข้อมูลทดสอบสังเคราะห์ ไม่ใช่คะแนนความรู้ของเจ้าของเว็บ; ไม่มี assessment attempt ในไฟล์นี้

| บทเรียน | ตรวจคำตอบที่ UI บันทึกกับ key สร้างใหม่ | ขนาด caseData (JSON characters) | activity ที่เก็บ | การสร้าง key กลับ |
|---|---|---:|---|---|
${rows}

ตรวจทั้ง first passedRecord และ last รวม ${records.length} records: ผลผ่านตาม key ที่บันทึกและ key ที่สร้างใหม่ทั้งหมด = **${result.checks.allSixRecordRegradesPass}**. Worksheet ที่สร้างใหม่ตรงกับ snapshot ทั้งชุด = **${result.checks.allFrozenWorksheetsExactlyRecreated}**. ตัวเลขแยกรายข้อ/ค่าคลาดเคลื่อน/ขนาด/frozen-input hash/epoch อยู่ใน [JSON evidence](ui-case-export-validation.json)

ความเท่ากันระดับทศนิยมทุกบิตต่างจากความเท่ากันในการให้คะแนน: THEOS มีค่าคลาดเคลื่อนสูงสุด ${Math.max(...records.filter((r) => r.case === 'theos2').map((r) => r.maxAbsoluteKeyDifference))} ในค่า reach หน่วย km (เทียบ tolerance 10 km); J₂ และ height ต่างเพียงเลขทศนิยมท้าย ๆ. ค่าทั้งหมดเทียบเท่าทางตัวเลขภายในเกณฑ์ 1e-10×max(1,|value|) = **${result.checks.allKeysNumericallyEquivalent}**. ส่วนข้อความ ตาราง คำตอบแสดง และรูปที่ serialize กลับมาโดยไม่เทียบ answer.value ดิบตรงทั้งหมด = **${result.checks.allDisplayedWorksheetsExactlyRecreated}**. ไม่เปลี่ยน key/tolerance เพื่อให้ผ่าน

Progress รวม first-pass และ last ที่ซ้ำกันใช้ ${result.checks.progressJsonCharacters.toLocaleString('en-US')} JSON characters (${result.checks.progressUtf8Bytes.toLocaleString('en-US')} UTF-8 bytes). ทดสอบ loadProgress→saveProgress→loadProgress ใน storage จำลองแล้ว records ไม่เปลี่ยน = **${roundtripLessonsUnchanged}**. นี่ไม่ใช่การวัด quota ทุก browser และไม่ใช่ผล browser reload ซึ่งทีม UI บันทึกแยก

Checksum ไม่ใช่ลายเซ็นและไม่พิสูจน์ผู้ทำข้อสอบ; ผล export ยังไม่มี production importer สำหรับ restore. การตรวจนี้ยืนยันความครบและสร้างผลจาก frozen data กลับได้จริงของไฟล์ที่ดาวน์โหลดมา

ตรวจข้อความข้อสอบเพิ่มเติมแบบเจาะจุด: แก้คำไทยซ้ำ อ่านค่าค่าพุ่งเกิน ใน c-read-overshoot และ อ่านค่าค่าเผื่อเฟส ใน c-read-pm เป็น อ่านค่าพุ่งเกิน / อ่านค่าเผื่อเฟส แล้ว ตามที่ผู้ประสานงานอนุญาต (source-integrated/src/lessons/assessment/bank/control.ts:167,174). ตรวจ occurrence ก่อนแก้ว่ามีอย่างละหนึ่งตำแหน่งและ git diff --check ผ่าน; ไม่เปลี่ยน scoring/key/formula/policy และไม่ได้เพิ่มหรือรันทดสอบใหม่เฉพาะคำซ้ำ. การอ่านเจาะจุดนี้ไม่ใช่บรรณาธิกร TH/RU ทุกประโยคของคลัง157ข้อ
`;
  writeFileSync(new URL('ui-case-export-validation-TH.md', audit), md);
  console.log(JSON.stringify({ ...result.checks, fileSha256: sha(original), records: records.map(({ lessonId, recordType, recreatedKeyRegrade, recreatedKeysExactlyEqual, maxAbsoluteKeyDifference, caseDataJsonCharacters }) => ({ lessonId, recordType, recreatedKeyRegrade, recreatedKeysExactlyEqual, maxAbsoluteKeyDifference, caseDataJsonCharacters })) }, null, 2));
  if (!checksumValid || !alteredCopyRejected || !result.checks.allSixRecordRegradesPass || !roundtripLessonsUnchanged) process.exitCode = 1;
} finally { await server.close(); }
