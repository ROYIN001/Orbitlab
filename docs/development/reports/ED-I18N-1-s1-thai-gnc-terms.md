---
package: ED-I18N-1
step: s1 (decided Thai terms sweep and deny-list test)
items: [M-LEARNING-029]
priority: {M-LEARNING-029: P1}
change_kind: bug-fix (Thai strings contradicting the decided glossary D5)
owner_authorization: 'D-65, owner, 2026-10-05: "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high"'
decisions: [D5 (2026-09-28 plan; ER-6 in plan S08/S18), listed in docs/DECISIONS.md]
base: 4de951f (origin/main)
branch: claude/lc-i18n1-s1
wave_lane: K1 / L-C
status: In PR; not merged; not published
---

# ED-I18N-1 step 1 — guidance = การนำวิถี, navigation = การนำร่อง, everywhere (M-LEARNING-029)

## What was wrong on `4de951f`

D5 (docs/DECISIONS.md, "decided" list; the 2026-09-28 plan's table: "guidance
= การนำวิถี, navigation = การนำร่อง; เลิกใช้ 'การนำทาง' ในความหมายวิศวกรรม")
was not applied. The Thai text used three words for guidance (การนำวิถี,
การนำทาง, นำร่อง), two for navigation (การนำร่อง, การนำทาง), and called the
attitude autopilot นำร่อง too. Examples a learner meets side by side:

- the Engineer setup said "การนำทางขาขึ้น: PEG และ IGM" for ascent guidance
  next to "การนำร่อง (INS / GNSS)" for navigation, and the loop inspector's
  tabs were "การนำทาง" (guidance) and "การนำร่อง" (navigation);
- the placement test taught "การนำทาง: ฉันอยู่ที่ไหน การนำวิถี: …"
  (navigation = การนำทาง), the opposite of the setup labels;
- lesson 2.3 was titled "การนำทางเฉื่อย…" while its hint pointed at
  "การนำร่อง (INS / GNSS)";
- "Every guidance parameter" was "พารามิเตอร์นำร่องทุกตัว", and the
  flexible-vehicle autopilot was "ระบบนำร่อง", the same words as the
  navigation system.

## Failing before (`tests/i18n-thai-terms.test.ts`, commit e087c84 alone on `4de951f`)

```
 FAIL  tests/i18n-thai-terms.test.ts > Thai guidance and navigation terms (D5) > uses no rejected word anywhere in the Thai text
AssertionError: expected [ …(66) ] to deeply equal []
+   "src/i18n/th.ts:4104 «นำทาง»: …up.explicit.title': 'การนำทางขาขึ้น: PEG และ IGM (G01)',…",
+   "src/i18n/th.ts:4115 «นำทาง»: …loop.tab.guidance': 'การนำทาง',…",
+   "src/lessons/assessment/bank/guidance.ts:23 «นำทาง»: … 'การนำทาง: ฉันอยู่ที่ไหน การนำวิถี: …",
+   "src/ui/rigid-controls.ts:14 «นำร่องอัตโนมัติ»: …ิธีควบคุมการบิน', auto:'นำร่องอัตโนมัติ', manual:'สั่งอั…",
+   "public/lessons/packs/ru-24-05-06.orbitlab-lesson.json:254 «นำทาง»: … \"th\": \"การนำทางเฉื่อยที่แก้ไขด้วยตัวจับดาว…",
    … (66 in all)
 FAIL  tests/i18n-thai-terms.test.ts > Thai guidance and navigation terms (D5) > says นำร่อง only for navigation, and นำวิถี never for navigation alone
AssertionError: expected [ …(26) ] to deeply equal []
+   "th.ts home.card.engineerText: «นำร่อง» for \"Every guidance parameter, telemetry charts, failure scenarios and full 6-DOF fli\"",
+   "th.ts mc.col.law: «นำร่อง» for \"Guidance\"",
+   "th.ts setup.flex.notch: «นำร่อง» for \"Bending filter: notch and flexible-vehicle autopilot\"",
+   "bank.114.prompt: «นำร่อง» for \"Why does the autopilot of a long, flexible launcher carry a notch filter?\"",
    … (26 in all)
      Tests  2 failed | 2 passed (4)
```

The other two tests (the scan reads what it should; lesson 2.2's hint quotes
the setup labels) passed before and after: they are guards.

## The test

`tests/i18n-thai-terms.test.ts` (new file; no existing test changed):

1. **Rejected words, as raw text**, in every `src/**/*.ts`, every
   `public/lessons/**/*.json` and `index.html`: "นำทาง" (guidance or
   navigation said the rejected way) and "นำร่องอัตโนมัติ" (the autopilot
   called by the navigation word). One compound is kept: ดาวเทียมนำทาง (see
   below).
2. **The concept against the English**, for every dictionary key (en/th) and
   every {en, th} pair of the built-in lessons, case lessons, tracks, the
   placement bank, the help, result and profile copy and the shipped lesson
   packs: นำร่อง only where the English says navigation; นำวิถี never where
   the English says navigation and not guidance.
3. A scan sanity check (each source above contributes pairs) and lesson 2.2's
   hint quoting `setup.explicit.title` (without "(G01)") and
   `setup.explicit.law` exactly.

## The fix — every replaced string

Thai only; EN and RU are unchanged. The rule for each: guidance → การนำวิถี /
นำวิถี; navigation → การนำร่อง / นำร่อง; autopilot → ระบบรักษาท่าทาง, the
word the app already uses for it (`setup.control.title` "ระบบรักษาท่าทาง
อัตโนมัติ", `loop.intro`, `dlg.physics.loopText`, `ftest.note`), and the
"Autopilot" mode label → "อัตโนมัติ" (the flight-control help already said
"เปลี่ยนกลับเป็นอัตโนมัติ"; the other mode is "สั่งอัตราหมุนเอง"). Only the
phrase shown changed in each string.

| File | Key or place (lesson / question id) | Before | After |
|---|---|---|---|
| i18n/th.ts | `dlg.physics.framesText` | ระบบนำร่องและควบคุมทำงานทุก 0.01 วินาที | ระบบนำวิถีและควบคุมทำงานทุก 0.01 วินาที |
| i18n/th.ts | `dlg.physics.limitsText` | โลกทรงกลม ระบบนำร่องใช้เพื่อการศึกษา | โลกทรงกลม ระบบนำวิถีใช้เพื่อการศึกษา |
| i18n/th.ts | `cmp.standard` | การนำร่องมาตรฐาน | การนำวิถีมาตรฐาน |
| i18n/th.ts | `home.card.engineerText` | พารามิเตอร์นำร่องทุกตัว | พารามิเตอร์นำวิถีทุกตัว |
| i18n/th.ts | `home.feature.engineerTitle` | เจาะลึกระบบนำร่อง เทเลเมทรี | เจาะลึกระบบนำวิถี เทเลเมทรี |
| i18n/th.ts | `build.eng.review.end.insertionAbandoned` | ระบบนำร่องยกเลิกการเข้าสู่วงโคจร | ระบบนำวิถียกเลิกการเข้าสู่วงโคจร |
| i18n/th.ts | `build.eng.review.notice.guidance` | บินด้วยโปรแกรมนำร่องของจรวดต้นแบบ | บินด้วยโปรแกรมนำวิถีของจรวดต้นแบบ |
| i18n/th.ts | `build.eng.review.notice.none` | บินด้วยโปรแกรมนำร่องของตัวเอง | บินด้วยโปรแกรมนำวิถีของตัวเอง |
| i18n/th.ts | `build.ex.ratings.computedNote` | ใช้โปรแกรมนำร่องที่แบบนี้มีอยู่ | ใช้โปรแกรมนำวิถีที่แบบนี้มีอยู่ |
| i18n/th.ts | `setup.mc.note` | แยกตามกฎนำร่อง | แยกตามกฎนำวิถี |
| i18n/th.ts | `mc.intro` | ใช้กฎนำร่องแบบไหน | ใช้กฎนำวิถีแบบไหน |
| i18n/th.ts | `mc.compare` | บินทั้งสามกฎนำร่อง | บินทั้งสามกฎนำวิถี |
| i18n/th.ts | `mc.col.law` | กฎนำร่อง | กฎนำวิถี |
| i18n/th.ts | `mc.point.about.cutoff` | ความแม่นยำของการนำร่องช่วงขึ้นเอง | ความแม่นยำของการนำวิถีช่วงขึ้นเอง |
| i18n/th.ts | `flown.note` | แบบจำลองบินด้วยระบบนำทางของตัวเอง | แบบจำลองบินด้วยระบบนำวิถีของตัวเอง |
| i18n/th.ts | `ftest.note` | โดยไม่แตะระบบนำทาง | โดยไม่แตะระบบนำวิถี |
| i18n/th.ts | `ftest.note` | เมื่อระบบนำทางตามทิศความเร็ว | เมื่อระบบนำวิถีตามทิศความเร็ว |
| i18n/th.ts | `setup.nav.note` | ระบบนำทางช่วงขึ้นบิน | ระบบนำวิถีช่วงขึ้นบิน |
| i18n/th.ts | `setup.explicit.title` | การนำทางขาขึ้น: PEG และ IGM (G01) | การนำวิถีขาขึ้น: PEG และ IGM (G01) |
| i18n/th.ts | `setup.explicit.law` | การนำทางของขั้นบน | การนำวิถีของขั้นบน |
| i18n/th.ts | `setup.explicit.engage` | คืนการควบคุมให้การนำทางแบบมาตรฐาน | คืนการควบคุมให้การนำวิถีแบบมาตรฐาน |
| i18n/th.ts | `loop.tab.guidance` | การนำทาง | การนำวิถี |
| i18n/th.ts | `guide.none` | ไม่มีการนำทางแบบชัดแจ้ง | ไม่มีการนำวิถีแบบชัดแจ้ง |
| i18n/th.ts | `evt.guidanceEngaged` | การนำทาง {law} เริ่มควบคุม | การนำวิถี {law} เริ่มควบคุม |
| i18n/th.ts | `evt.guidanceResumed` | การนำทาง {law} กลับมาควบคุม | การนำวิถี {law} กลับมาควบคุม |
| i18n/th.ts | `evt.guidanceShort` | ใช้การนำทางแบบมาตรฐานต่อ | ใช้การนำวิถีแบบมาตรฐานต่อ |
| i18n/th.ts | `evt.guidanceDiverged` | ใช้การนำทางแบบมาตรฐานต่อ | ใช้การนำวิถีแบบมาตรฐานต่อ |
| i18n/th.ts | `loop.eyebrow` | การนำวิถี การนำทาง และการควบคุม | การนำวิถี การนำร่อง และการควบคุม |
| i18n/th.ts | `home.section.orbitText` | การสำรวจโลก และการนำทาง รวมถึง | การสำรวจโลก และการนำร่อง รวมถึง |
| i18n/th.ts | `lesson.measure.nav.positionError` | ความคลาดเคลื่อนตำแหน่งของระบบนำทาง | ความคลาดเคลื่อนตำแหน่งของระบบนำร่อง |
| i18n/th.ts | `assess.domain.4` | การนำวิถีและการนำทาง | การนำวิถีและการนำร่อง |
| i18n/th.ts | `mc.q.imu.about` | เมื่อเปิดระบบนำทางเฉื่อย (G02) | เมื่อเปิดระบบนำร่องเฉื่อย (G02) |
| i18n/th.ts | `mc.unit.noImu` | ภารกิจนี้ไม่มีระบบนำทางเฉื่อย | ภารกิจนี้ไม่มีระบบนำร่องเฉื่อย |
| i18n/th.ts | `control.mode.auto` | นำร่องอัตโนมัติ | อัตโนมัติ |
| i18n/th.ts | `loop.mode.auto` | นำร่องอัตโนมัติ | อัตโนมัติ |
| i18n/th.ts | `setup.flex.notch` | ฟิลเตอร์นอตช์และระบบนำร่องสำหรับจรวดยืดหยุ่น | ฟิลเตอร์นอตช์และระบบรักษาท่าทางสำหรับจรวดยืดหยุ่น |
| i18n/th.ts | `setup.flex.note` | เมื่อเปิดการดัดโค้ง ระบบนำร่องบังคับตามค่า | เมื่อเปิดการดัดโค้ง ระบบรักษาท่าทางบังคับตามค่า |
| i18n/th.ts | `setup.flex.bandwidthRatio` | แบนด์วิดท์ระบบนำร่อง | แบนด์วิดท์ระบบรักษาท่าทาง |
| i18n/review.ts | `lesson.review.objective.ru-24-05-06` | ประเมินการควบคุม การนำทาง การตอบสนอง | ประเมินการควบคุม การนำร่อง การตอบสนอง |
| ui/rigid-controls.ts | rigid-controls.ts:14 | auto:'นำร่องอัตโนมัติ | auto:'อัตโนมัติ |
| ui/rigid-controls.ts | rigid-controls.ts:14 | เปลี่ยนกลับเป็นอัตโนมัติเพื่อให้นำร่องตามภารกิจ | เปลี่ยนกลับเป็นอัตโนมัติเพื่อให้นำวิถีตามภารกิจ |
| lessons/catalog.ts | catalog.ts:40 | การนำวิถีและการนำทาง | การนำวิถีและการนำร่อง |
| lessons/builtin/track2.ts | track2.ts:80 (guid-peg, hint 1) | การนำทางขาขึ้น: PEG และ IGM → การนำทางของขั้นบน | การนำวิถีขาขึ้น: PEG และ IGM → การนำวิถีของขั้นบน |
| lessons/builtin/track2.ts | track2.ts:87 (guid-nav) | การนำทางเฉื่อยโดยไม่มี GNSS | การนำร่องเฉื่อยโดยไม่มี GNSS |
| lessons/builtin/track2.ts | track2.ts:91 (guid-nav) | เครื่องรับนำทางด้วยดาวเทียม | เครื่องรับนำร่องด้วยดาวเทียม |
| lessons/builtin/track2.ts | track2.ts:91 (guid-nav) | ระบบนำทางมีเพียงหน่วยวัดเฉื่อย | ระบบนำร่องมีเพียงหน่วยวัดเฉื่อย |
| lessons/builtin/track2.ts | track2.ts:91 (guid-nav) | ตำแหน่งของระบบนำทางให้อยู่ภายใน 500 ม. | ตำแหน่งของระบบนำร่องให้อยู่ภายใน 500 ม. |
| lessons/builtin/track2.ts | track2.ts:96 (guid-nav) | กรอบนำทางทั้งหมดเอียง | กรอบนำร่องทั้งหมดเอียง |
| lessons/builtin/track2.ts | track2.ts:96 (guid-nav) | ไจโรเลเซอร์เกรดนำทาง | ไจโรเลเซอร์เกรดนำร่อง |
| lessons/builtin/track2.ts | track2.ts:107 (guid-nav, criterion label) | ไม่มีการนำทางด้วยดาวเทียม | ไม่มีการนำร่องด้วยดาวเทียม |
| lessons/builtin/track2.ts | track2.ts:115 (guid-nav, hint 3) | เกรดนำทางดียิ่งกว่า | เกรดนำร่องดียิ่งกว่า |
| lessons/builtin/track3.ts | track3.ts:46 (fail-gyro-fdir) | ภายใต้ระบบนำร่องอัตโนมัติ | ภายใต้ระบบรักษาท่าทางอัตโนมัติ |
| lessons/builtin/track3.ts | track3.ts:51 (fail-gyro-fdir) | ระบบนำร่องจึง «แก้» | ระบบรักษาท่าทางจึง «แก้» |
| lessons/assessment/bank/control.ts | control.ts:53 (c-unstable-simple) | ระบบนำร่องอัตโนมัติ | ระบบรักษาท่าทางอัตโนมัติ |
| lessons/assessment/bank/control.ts | control.ts:77 (c-more-gain) | ระบบนำร่องอัตโนมัติ | ระบบรักษาท่าทางอัตโนมัติ |
| lessons/assessment/bank/control.ts | control.ts:98 (c-notch) | ระบบนำร่องอัตโนมัติ | ระบบรักษาท่าทางอัตโนมัติ |
| lessons/assessment/bank/control.ts | control.ts:146 (c-maxq-margins) | ระบบนำร่องอัตโนมัติ | ระบบรักษาท่าทางอัตโนมัติ |
| lessons/assessment/bank/control.ts | control.ts:164 (c-slosh) | และระบบนำร่องถูกปรับ | และระบบรักษาท่าทางถูกปรับ |
| lessons/assessment/bank/failures.ts | failures.ts:190 (f-imu-votes) | และระบบนำทางใช้ A กับ B | และระบบนำร่องใช้ A กับ B |
| lessons/assessment/bank/failures.ts | failures.ts:197 (f-order-fdir) | ระบบนำทางปรับไปใช้หน่วยที่ปกติ | ระบบนำร่องปรับไปใช้หน่วยที่ปกติ |
| lessons/assessment/bank/guidance.ts | guidance.ts:16 (g-gnc) | «การนำวิถี การนำทาง และการควบคุม» (GNC) การนำทางทำหน้าที่อะไร | «การนำวิถี การนำร่อง และการควบคุม» (GNC) การนำร่องทำหน้าที่อะไร |
| lessons/assessment/bank/guidance.ts | guidance.ts:23 (g-gnc) | การนำทาง: ฉันอยู่ที่ไหน | การนำร่อง: ฉันอยู่ที่ไหน |
| lessons/assessment/bank/guidance.ts | guidance.ts:52 (g-gnss-alone) | การนำทางด้วยดาวเทียมอย่างเดียว | การนำร่องด้วยดาวเทียมอย่างเดียว |
| lessons/assessment/bank/guidance.ts | guidance.ts:138 (g-ins-error) | ความแม่นยำระดับนำทางของเซนเซอร์ | ความแม่นยำระดับนำร่องของเซนเซอร์ |
| lessons/assessment/bank/guidance.ts | guidance.ts:149 (g-gyro-bias) | เข้าสู่กรอบนำทางผิดทิศ | เข้าสู่กรอบนำร่องผิดทิศ |
| lessons/assessment/bank/guidance.ts | guidance.ts:217 (g-multi-imu) | ระบบนำทางอินทิเกรต | ระบบนำร่องอินทิเกรต |
| lessons/assessment/bank/guidance.ts | guidance.ts:221 (g-multi-peg) | ปัจจุบันจากระบบนำทาง | ปัจจุบันจากระบบนำร่อง |
| lessons/assessment/bank/guidance.ts | guidance.ts:250 (g-order-kalman) | ที่รวมการนำทางเฉื่อยกับ GNSS | ที่รวมการนำร่องเฉื่อยกับ GNSS |
| lessons/pack-sources/ru-24-05-06.ts | ru-24-05-06.ts:151 (ru-bins-astro) | การนำทางเฉื่อยที่แก้ไขด้วยตัวจับดาว | การนำร่องเฉื่อยที่แก้ไขด้วยตัวจับดาว |
| lessons/pack-sources/ru-24-05-06.ts | ru-24-05-06.ts:155 (ru-bins-astro) | ระบบนำทางจึงอาศัย | ระบบนำร่องจึงอาศัย |
| lessons/pack-sources/ru-24-05-06.ts | ru-24-05-06.ts:155 (ru-bins-astro) | ตำแหน่งของระบบนำทางให้อยู่ภายใน 1 000 ม. | ตำแหน่งของระบบนำร่องให้อยู่ภายใน 1 000 ม. |
| lessons/pack-sources/ru-24-05-06.ts | ru-24-05-06.ts:160 (ru-bins-astro) | ของระบบนำทางเฉื่อยจะโต | ของระบบนำร่องเฉื่อยจะโต |
| lessons/pack-sources/ru-24-05-06.ts | ru-24-05-06.ts:160 (ru-bins-astro) | กรอบนำทางเอียง | กรอบนำร่องเอียง |
| lessons/pack-sources/ru-24-05-06.ts | ru-24-05-06.ts:160 (ru-bins-astro) | หน่วยวัดเฉื่อยเกรดนำทาง | หน่วยวัดเฉื่อยเกรดนำร่อง |
| lessons/pack-sources/ru-24-05-06.ts | ru-24-05-06.ts:176 (ru-bins-astro, hint 3) | หน่วยวัดเฉื่อยเกรดนำทาง | หน่วยวัดเฉื่อยเกรดนำร่อง |
| lessons/pack-sources/ru-24-05-06.ts | ru-24-05-06.ts:168 (ru-bins-astro, criterion label) | ไม่มีการนำทางด้วยดาวเทียม | ไม่มีการนำร่องด้วยดาวเทียม |

Counts: 37 keys in `th.ts` + 1 in `review.ts`, 2 strings in
`rigid-controls.ts`, 9 built-in lesson texts (`catalog.ts` track 2 title,
tracks 2–3), 15 placement-test texts, 5 texts of pack `ru-24-05-06` (its
source and the regenerated `public/lessons/packs/ru-24-05-06.orbitlab-lesson.json`,
written by `node --experimental-strip-types scripts/lesson-packs.ts`).

Left as they were (already D5): `setup.guidance`, `hud.phase.closedLoop`,
`phase.detail.closedLoop`, `dlg.physics.guidance(Text)`, `setup.auto.title`,
`setup.challenge.note`, `nav.level.launch.*`, `loop.block.guidance`,
`loop.guidance.auto`, `loop.tab.navigation`, `setup.nav.title/enable/grade.navigation`,
`nav.none`, `setup.faults.needsNav`, `fault.about.*`, `assess.domainShort.4`,
`exp.input.guidanceLaw`, the help and result copy, and lesson 2.3's hint
"การนำร่อง (INS / GNSS) → …".

### Kept: ดาวเทียมนำทาง (a question for the owner, not blocking)

Six `th.ts` keys (`sat.navigation.name`, `skytour.gnss.title`,
`sky.group.gnss`, `sky.about.gnss`, `data.set.satellites`,
`build.sat.tpl.navigation.about`) and three bank texts (`basics.ts`, GPS and
GLONASS) say ดาวเทียมนำทาง, "navigation satellite". It is the established
Thai name of a GNSS satellite (ระบบดาวเทียมนำทาง), a satellite's name rather
than the vehicle's navigation, and the swap would read as "pilot satellite"
(นำร่อง also means pilot/pioneer, as in โครงการนำร่อง). D5's text bans
"การนำทาง" in the engineering sense; it does not name this compound, and the
2026-09-30 review (REMAINING-WORK-TH.md, I18N-03/04/05) left it as an open
question. The test allows exactly this compound and nothing else; changing it
later is one line per string plus removing `KEPT` from the test.

### Pack provenance hash

`tests/lesson-review.test.ts` binds each shipped pack's file to
`PACK_REVIEWS[id].contentSha256` in `src/lessons/review.ts` ("edits require
a deliberate metadata update"). The pack's bytes changed, so that one line
moved from `ecfa2550…4197` to `81c3e320…aaa1` (the SHA-256 of the regenerated
file). The assertion is unchanged, and every review of `ru-24-05-06` (owner,
teacher, en/ru/th language) is still `pending`, so no sign-off is carried to
new text. Same step as CO-7 (#87, owner-merged) took for `rtaf-academy`.

### Placement bank wording before FX-2's bank versioning

The plan orders FX-2 (M-LEARNING-027, bank versioning; still open) before this
sweep. The bank changes here are Thai wording only: question ids, option order
and which options are correct are unchanged, and answers are stored as option
indices (`Answer.value`), so no attempt grades differently.

## Where the plan and the code differ (the code was followed)

- The 2026-09-28 plan pointed at `th.ts` lines 2141/2324–2326/2459 and
  REMAINING-WORK-TH at 3067–3109; the strings have moved (now about 3920–4146
  and 4398). The sweep was done by searching the text, not by line.
- The plan listed `builtin/*.ts` and `catalog.ts`; the same wrong words were
  also in the placement bank, `review.ts`, `rigid-controls.ts` and pack
  `ru-24-05-06` (source and JSON). All are fixed, since the item says
  "everywhere". `src/ui/profiles/text.ts` has none.
- M-LEARNING-030 (docs/GLOSSARY.md) is the package's other item and is not in
  this step.

## Tests run

- `tests/i18n-thai-terms.test.ts`: 2 failed / 2 passed on `4de951f`
  (above); 4/4 after.
- `npm run -s typecheck`: clean.
- vitest (related files): `i18n`, `i18n-thai-terms`, `assessment`,
  `lesson-pack-format`, `lesson-pack-names`, `lesson-review`,
  `lesson-packs`, `rigid-controls`, `lessons-ui-core`, `teacher-lessons`,
  `scenario-link`, `case-lessons`, `lessons`, `lessons-round2`,
  `lessons-history`, `instructor-mode`: all pass. (`lesson-review` failed on
  the provenance hash until the metadata line above was updated.)
- `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`:
  73/73.
- Browser journeys `fx3-thai-in-sky` (Thai UI) and `pwa-offline` (the pack
  file is precached): 2/2. No journey reads these strings.
- `node --experimental-strip-types scripts/lesson-packs.ts`: only
  `ru-24-05-06` written; the others unchanged.

## Size (`npx vite build; node scripts/bundle-budget.mjs`, against a build of `4de951f`)

| Group | main | this branch | Δ | ceiling room after |
|---|---|---|---|---|
| i18n-*.js | 1 724 676 B | 1 724 745 B | +69 B | 255 B |
| index-*.js | 2 633 274 B | 2 633 256 B | −18 B | 744 B |
| index-*.css | 176 994 B | 176 994 B | 0 | 6 B |
| recheck.worker-*.js | 886.8 kB | 886.9 kB | +0.1 kB | 15.1 kB |
| other chunks | 769.9 kB | 770.0 kB | +0.1 kB | 1.0 kB |
| precache code | 14 693.3 kB | 14 693.6 kB | +0.3 kB | 30.4 kB |

Every group is within its ceiling; `budgets.json` is unchanged. Thai
characters are 3 bytes each: นำทาง → นำวิถี/นำร่อง adds one character, นำร่อง
↔ นำวิถี adds none, the autopilot's ระบบรักษาท่าทาง adds five, and the mode
label "อัตโนมัติ" removes six.
