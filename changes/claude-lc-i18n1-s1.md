## CHANGELOG

- Thai (ED-I18N-1, M-LEARNING-029): the decided terms (D5) are used everywhere: guidance = การนำวิถี, navigation = การนำร่อง. 40 interface strings, 9 built-in lesson texts, 15 placement-test texts and 5 lesson-pack texts no longer say การนำทาง for guidance or navigation, or นำร่อง for guidance or for the autopilot (now ระบบรักษาท่าทาง, as the autopilot's setup section already said, or "อัตโนมัติ" for the mode). Lesson 2.2's hint quotes the renamed setup labels exactly. A new deny-list test keeps it so. Thai only; EN and RU unchanged.

## PROGRESS

| ED-I18N-1 step 1 (M-LEARNING-029, wave K1, lane L-C) | In PR; not merged; not published | D5 sweep over `th.ts` (37 keys), `review.ts` (1), `rigid-controls.ts` (2), `catalog.ts`, built-in tracks 2–3, the placement bank (control, failures, guidance) and pack `ru-24-05-06` (source and regenerated JSON; its review provenance hash updated, all reviews still pending, as in CO-7); kept: ดาวเทียมนำทาง, the GNSS satellite's name (owner question in the report); new `tests/i18n-thai-terms.test.ts` (failed on main: 66 rejected words, 26 wrong-concept strings; 4/4 after); i18n-*.js +69 B, index-*.js −18 B, CSS 0, precache code +0.3 kB, all within ceilings; L-C | [ED-I18N-1 step 1 report](reports/ED-I18N-1-s1-thai-gnc-terms.md) |
