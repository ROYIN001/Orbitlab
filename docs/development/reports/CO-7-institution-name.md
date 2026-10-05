# CO-7 — neutral name for the `rtaf-academy` pack (D-42 (ก))

## Envelope

| Field | Value |
|---|---|
| Package | CO-7, step 1 (wave K0, lane L-C) |
| Item | M-LEARNING-054 |
| change_kind | bug-fix |
| owner_authorization | 2026-10-05, decision sheet A-1 "all as proposed": "D-42 (ก): neutral institution name now; restore the name when written permission exists; NAPA-1/2 kept" |
| Rule | DEC:D-2 (docs/DECISIONS.md): no service or academy name or emblem in the UI without written permission |
| Base | `5f9aa2e` (origin/main) |
| Branch | `claude/lc-co7-s1` |
| Status | In PR; not merged; not published |

## What changed

Only the pack's **displayed identity** — its title, audience and curriculum
(framework) label, in EN, TH and RU — in `src/lessons/pack-sources/rtaf-academy.ts`,
and the generated `public/lessons/packs/rtaf-academy.orbitlab-lesson.json`
written from it by `scripts/lesson-packs.ts`.

Unchanged: the pack id `rtaf-academy`; every lesson id (`rtaf-napa1-sso`,
`rtaf-elements`, `rtaf-6u-adcs`, and the referenced `ctl-inspector`,
`ctl-margins`, `adv-docking`); criteria; `reviewed: false`; the pack
description, which keeps the public curriculum documents as bibliography; the
curriculum codes (`NKRAFA วอ 462` etc.), which cite those documents. Stored
progress is keyed by `PROGRESS_STORAGE_KEY` and lesson ids, not by any pack
title, so no learner's record moves.

### Before / after

| Field | Lang | Before | After |
|---|---|---|---|
| title | en | Royal Thai Air Force Academy: space flight dynamics and control | Space flight dynamics and control: an institution-level lab |
| title | th | โรงเรียนนายเรืออากาศ: พลศาสตร์การบินอวกาศและระบบควบคุม | พลศาสตร์การบินอวกาศและระบบควบคุม — แลบระดับสถาบัน |
| title | ru | Академия ВВС Таиланда: динамика космического полёта и управление | Динамика космического полёта и управление: лаборатория вузовского уровня |
| audience | en | Cadets, BEng Aeronautical Engineering, years 4–5 | Undergraduates in aeronautical engineering (BEng), years 4–5 |
| audience | th | นักเรียนนายเรืออากาศ หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมอากาศยาน ชั้นปีที่ 4–5 | นักศึกษาปริญญาตรี สาขาวิชาวิศวกรรมอากาศยาน ชั้นปีที่ 4–5 |
| audience | ru | Курсанты, бакалавриат по авиационной технике, 4–5 курсы | Студенты бакалавриата по авиационной технике, 4–5 курсы |
| framework | en | Navaminda Kasatriyadhiraj Royal Thai Air Force Academy, BEng Aeronautical Engineering (2025 revision): programme learning outcomes and course descriptions | A public BEng Aeronautical Engineering programme (2025 revision): programme learning outcomes and course descriptions (sources in the pack description) |
| framework | th | โรงเรียนนายเรืออากาศนวมินทกษัตริยาธิราช หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมอากาศยาน (หลักสูตรปรับปรุง พ.ศ. 2568): ผลลัพธ์การเรียนรู้ของหลักสูตรและคำอธิบายรายวิชา | หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมอากาศยาน ที่เผยแพร่สาธารณะ (หลักสูตรปรับปรุง พ.ศ. 2568): ผลลัพธ์การเรียนรู้ของหลักสูตรและคำอธิบายรายวิชา (แหล่งที่มาอยู่ในคำอธิบายชุดบทเรียน) |
| framework | ru | Академия ВВС Таиланда им. Навамина Кашатрияттирата, бакалавриат по авиационной технике (редакция 2025 г.): результаты обучения по программе и описания дисциплин | Открытая программа бакалавриата по авиационной технике (редакция 2025 г.): результаты обучения по программе и описания дисциплин (источники — в описании набора) |

The Thai title is the plan's suggested wording. **HU-3 (a native Thai reader)
should check the Thai wording**, in particular "แลบ" (vs "ห้องปฏิบัติการ") and
"นักศึกษาปริญญาตรี" for the audience.

### Generated JSON

`public/lessons/packs/rtaf-academy.orbitlab-lesson.json`: 9 lines changed
(hunks at lines 7–9, 12–14, 17–19: `pack.title`, `pack.audience`,
`pack.framework` × en/ru/th). Nothing else in the file changed. New SHA-256
`67d9c2c3999cf5d387d414f55d240915c0cabe1a7cf6d370fc5e3cbde4e96cf0`
(was `325e3843…896b`). `scripts/lesson-packs.ts --check`: all five packs
"up to date".

### Review provenance hash (outside the listed files)

`tests/lesson-review.test.ts` binds `PACK_REVIEWS['rtaf-academy'].contentSha256`
in `src/lessons/review.ts` to the shipped bytes, and fails on any edit until the
metadata is updated deliberately. The one hash line was updated to the new
digest. Every human review of this pack (owner, teacher, en/ru/th) is still
`pending`, so no recorded review is invalidated. This file was not in CO-7's
allowed list; it is flagged for the reviewer.

## Every name hit (base `5f9aa2e`)

Search terms: Royal Thai Air Force (Academy), Air Force Academy, Navaminda,
NKRAFA, RTAF, โรงเรียนนายเรืออากาศ, นายเรืออากาศ, นวมินทกษัตริยาธิราช,
กองทัพอากาศ, Академия ВВС, ВВС Таиланда, академии; over `src/`,
`public/lessons/` and `src/i18n/`. Lines are on base.

### Displayed identity — changed here

| File:line | Text | Action |
|---|---|---|
| src/lessons/pack-sources/rtaf-academy.ts:32–34 | pack title en/ru/th | neutral name |
| src/lessons/pack-sources/rtaf-academy.ts:39 | audience th (นักเรียนนายเรืออากาศ); en/ru "Cadets/Курсанты" | neutral |
| src/lessons/pack-sources/rtaf-academy.ts:42–44 | framework en/ru/th | neutral, points to the description |
| public/lessons/packs/rtaf-academy.orbitlab-lesson.json:7–9, 14, 17–19 | generated copies | regenerated |

### Displayed identity — NOT changed (outside CO-7's allowed files)

| File:line | Text | Note |
|---|---|---|
| src/i18n/classroom.ts:10, 50, 90 | `classroom.pack.rtaf-academy`: "Royal Thai Air Force Academy" / "Академия Королевских ВВС Таиланда" / "โรงเรียนนายเรืออากาศ" | Fallback pack label in the classroom panel (`src/ui/classroom/classroom-panel.ts:62, 96`) when the pack file has not loaded or is missing. Same violation; needs a follow-up with `src/i18n/classroom.ts` in scope. |

### Source citations — kept (bibliography, per the accepted proposal)

| File:line | Text |
|---|---|
| src/lessons/pack-sources/rtaf-academy.ts:48–50 | pack description: "the academy's public programme documents linked from nkrafa.rtaf.mi.th/curriculum", "โรงเรียนนายเรืออากาศ", "академии" |
| src/lessons/pack-sources/rtaf-academy.ts:57, 66, 75, 88, 125, 166 (and JSON :38–98, 250–258, 410–418, 624–632) | curriculum codes `NKRAFA วอ …`, `NKRAFA PLO4/7`, `NKRAFA AE 541` |
| src/lessons/review.ts:89, 93 | source URLs nkrafa.rtaf.mi.th, coe.or.th file name |
| src/i18n/review.ts:32–36, 73–77, 114–118 | `lesson.review.source.nkrafa/aero2025/…` titles: "NKRAFA …", "โรงเรียนนายเรืออากาศฯ …" (shown under the pack's Sources) |

### Satellite operator (agency name in satellite history) — not institution identity, not changed

| File:line | Text |
|---|---|
| src/lessons/pack-sources/rtaf-academy.ts:91–93 | lesson 14.1 brief: NAPA-1 "the Royal Thai Air Force's first satellite" |
| src/lessons/pack-sources/rtaf-academy.ts:169–171 | lesson 14.3 brief: NAPA-2 "the Royal Thai Air Force's" |
| src/lessons/pack-sources/ipst-physics.ts:164–166 (JSON :367–369) | NAPA-2 operator in an ipst-physics lesson |
| public/lessons/napa2-power.orbitlab-lesson.json:25, 27 | NAPA-2 operator |
| src/data/napa2.ts:2, 16; src/data/satellite-templates.ts:19, 71; src/data/thai-satellites.ts:3, 79, 87, 92, 100 | NAPA operator, source titles ("RTAF-SAT 1, 2") |
| src/i18n/en.ts:1409, 1496, 1497, 1733, 2629; ru.ts:1385, 1472, 1473, 1709, 2605; th.ts:1386, 1473, 1474, 1710, 2606 | Thai-satellite and NAPA-2 descriptions |

These name the Air Force as the satellites' operator, not an institution as
the pack's identity. D-42 confirms NAPA-1/NAPA-2 as satellite names and keeps
them; whether the operator attribution itself falls under DEC:D-2 is outside
CO-7 (plan item M-ORBIT-036, S02). NAPA-2 in the `ipst-physics` pack and the
NAPA-2 satellite template were checked and kept.

### Disclaimer and ids — not changed

| File:line | Text |
|---|---|
| src/i18n/en.ts:887, ru.ts:867, th.ts:869 | `about.disclaimer` ("not a product of the Royal Thai Air Force or of any academy") — the disclaimer DEC:D-2 requires |
| `rtaf-*` ids in index.ts:14, 21; packs.ts:30; review.ts:84–87; i18n keys | ids, unchanged by D-42 |
| src/lessons/pack-sources/ru-24-05-06.ts:7–8; src/lessons/types.ts:80; ru-24-05-06 JSON:23 | "academy" for other institutions (Mozhaisky) / generic word — not this institution |

## Tests

Deny-list test first: `tests/lesson-pack-names.test.ts` (new). Displayed
title/audience/framework of every pack source and every generated pack file,
EN/TH/RU, must not match the service or academy names; allowlist
`PERMITTED_PACKS` is empty (comment points at DEC:D-2 and D-42). It also pins
the pack id, `reviewed: false` and the lesson ids.

On base (`src/` and `public/` at `5f9aa2e`, new test only):

```
× no pack source names a service or academy in its displayed identity
× no generated pack file names a service or academy in its displayed identity
Tests  2 failed | 2 passed (4)
```

15 hits each (title en/th/ru, audience th, framework en/th/ru, by term).

After the change:

| Command | Result |
|---|---|
| `node --experimental-strip-types scripts/lesson-packs.ts --check` | 5/5 up to date |
| `npx vitest run` lesson-pack-names, lesson-packs, lesson-packs-design, lesson-pack-format, lesson-review, lesson-grading-end, classroom-pwa, phase4-walk, project-archive, attitude-loop, i18n, i18n-counts, repo-hygiene | 13 files, 174 tests passed |
| `npm run typecheck` | clean |

The full `vitest run` did not finish within the 10-minute limit of this
environment and was not used as evidence; CI runs it.
