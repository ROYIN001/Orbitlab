# NAPA-1 re-entered: its entry, the refresh's Thai queries and the snapshot (part B of #234; bug fix)

> **สรุปสำหรับเจ้าของ (ภาษาไทย)**
> NAPA-1 กลับเข้าสู่บรรยากาศเมื่อ 2 พ.ย. 2026 (CelesTrak SATCAT 46320) PR นี้ทำเครื่องหมายว่ากลับเข้าสู่บรรยากาศแล้วแบบเดียวกับ NAPA-2 เอา 46320 และคำค้น `NAME=NAPA` ออกจากการดึงข้อมูลรายวัน (กลุ่มไทยจึงได้ข้อมูลใหม่อีกครั้ง) และตัดชุดข้อมูลวงโคจรของ NAPA-1 ชุดเดียวออกจากไฟล์ snapshot (418 ไบต์) ข้อความ EN/RU/TH ใช้ถ้อยคำที่คุณอนุมัติ (ไม่มีวันที่ในประโยค) ภาษาไทยและรัสเซียยังไม่มีเจ้าของภาษาตรวจ แก้ assertion เดิม 1 ข้อตามที่อนุมัติ ไม่ขยายเพดาน budget (precache code เหลือ 82 B)

| Field | Value |
|---|---|
| Package | none: part B of the satellite-refresh bug fix (#234; [report](satellite-refresh.md), follow-ups 1 and 2) |
| change_kind | bug fix (data, refresh queries, wording) |
| Authorization | the owner's answer in chat, 2026-11-25 at 11:56:29Z, "เอาตามที่คุณแนะนำครับ", to the session's question of 10:55:00Z (option ก: a follow-up PR, no date in the sentence), for the changed assertion and the wording ([DECISIONS](../../DECISIONS.md), "Decided 2026-11-25, later (…)"); the rest under the standing bug-fix approval ([SESSION-PROTOCOL](../SESSION-PROTOCOL.md) §1 step 3) |
| Lanes | P-D (`src/data/**`), L-C (the wording); `src/provider/satellites.ts` borrowed, as for #234 |
| Base | main `15f25e8a` |
| Branch | `claude/pd-napa1-s1` |

## The defect

NAPA-1 re-entered on 2026-11-02 (SATCAT 46320: `DECAY_DATE` 2026-11-02, `OPS_STATUS_CODE` D; read 2026-11-25). Since 2026-11-03 CelesTrak has answered the Thai group's `NAME=NAPA` with 404. Since #234 that 404 keeps only the Thai group from the committed snapshot, so the Thai sets (THEOS-2's among them, used by the Watch tour, the `theos2` case and `fx3-thai-in-sky`) stay those of 2026-09-26. The app still shows NAPA-1 in orbit; SGP4 on its set of 2026-09-25 puts it inside the Earth intermittently from 2026-12-02 and always after 2026-12-05.

## The change

- `src/data/thai-satellites.ts`: NAPA-1 `reentered: '2026-11-02'`, as NAPA-2 has; a comment that the orbit is the catalogue's on `THAI_SATELLITES_AS_OF`.
- `src/provider/satellites.ts`: 46320 out of `THAI_NORAD_IDS`; `NAME=NAPA` out of the Thai queries (8 queries in all); the comment says NAPA-1 and NAPA-2 have re-entered and `NAME=NAPA` answers 404.
- `public/data/satellites.json`: NAPA-1's one set (epoch 2026-09-25T05:10:52.935744) out, −418 B, by `node -e` over `JSON.parse`/`JSON.stringify` (the file round-trips byte for byte); `asOf` stays 2026-09-26T16:10:54.609Z. The first edit by hand since `92dd8ca6`; each Pages build refreshes its own copy.
- Wording (approved): `thai.napa1.about`'s last sentence — EN "…Put into an orbit about 500 km up, it has since come down."; RU "…Выведенный на высоту около 500 км, он уже сошёл с орбиты."; TH "…ถูกส่งขึ้นสู่วงโคจรสูงราว 500 กม. และกลับเข้าสู่บรรยากาศแล้ว"; NAPA-1 out of `sky.about.thai` in all three. No native speaker has checked the TH and RU sentences.
- Comments in `src/orbit/playground-model.ts` and `src/ui/orbit/applications-panel.ts` name NAPA-1 beside NAPA-2.

## Checks

| Test | On main `15f25e8a` | With the fix |
|---|---|---|
| `tests/applications.test.ts`, NAPA-1's `reentered` (`toBeUndefined()` → `toBe('2026-11-02')`, the one changed assertion) | fails: `expected undefined to be '2026-11-02'` | passes |
| `tests/satellite-catalogue.test.ts`, new: "asks CelesTrak by name only for Thai satellites still in orbit" (each `reentered` equals SATCAT's decay date; no decayed number in `THAI_NORAD_IDS`; each `NAME=` query of the Thai group matches a satellite not re-entered) | fails: `NAPA-1: expected undefined to be '2026-11-02'` | passes |

2 of 40 fail on main in the four files most concerned (with `tests/refresh-snapshots.test.ts` and `tests/fx3-thai-moon-labels.test.ts`); 40 of 40 pass with the fix. Wrong versions: the fix with `NAME=NAPA` kept fails the guard (1 of 15 in `satellite-catalogue` and `refresh-snapshots`); with 46320 kept in `THAI_NORAD_IDS`, 6 of 24 fail in `satellite-catalogue` and `fx3-thai-moon-labels` (the snapshot test, the guard and four `fx3-thai-moon-labels` tests). The second agent's runs over the four files: `NAME=NAPA` kept, 1 of 40; 46320 kept, 6 of 40; the snapshot not edited, 1 of 40; only `reentered` set, 5 of 40. The guard also holds no `CATNR=` query to a decayed number.

`tests/refresh-snapshots.test.ts`: THEOS-2's stub set (58016, the kept Thai group's own answer) is dated 2026-09-15, after gnss's 2026-09-01, so a refresh that dated the file by a kept group's answers would fail the `asOf` check (#234's last review, the test nit): the second agent ran that wrong version (a kept group's answers folded into `newest` in `mergeCelestrakGp`), and it fails 1 of 2 there (expected 2026-09-01, received 2026-09-15), while it passes 2 of 2 with main's stub. Its comments follow the new queries (`MISS` is `NAME=THAICOM`; seven 404s in five groups; THEOS and `CATNR=40141` answering).

Typecheck. 13 related files, 183 of 183. Node verification and the full unit suite: on CI.

## Size

Built on main `15f25e8a` and on this branch (`npx vite build`, `node scripts/bundle-budget.mjs`: "bundle budget: ok"): `index-*.js` 2,669,386 → 2,669,391 B (+5), `i18n-*.js` 1,738,232 → 1,738,172 B (−60), so precache code −55 B (27 B → 82 B left under its ceiling); `data/satellites.json` 1,018,936 → 1,018,518 B (−418). No ceiling changed.

## D-64

`src/data` is on the D-64 list, so the list hash changes and no earlier heavy or fleet run stands: `heavy.yml` with `suite=both` runs on this PR's head (the PR names the run).

## Review

Second agent on `6180c4da`: confirmed 17 of 17 claims checked; 1 blocking finding (a `node_modules` symlink committed by mistake, removed), 2 minor findings (the wrong versions' files and the folded-`asOf` run, recorded above) and 3 nits (a `CATNR=` check in the guard and a comment's wording, applied; HANDOVER-K2's "1 to 5 tests", for the next records PR). No other place in the app assumes NAPA-1 is up.

## Follow-ups

- The online kept-404 stop (#234's report, follow-up 3) and kept groups in the snapshot (follow-up 5, R7.4): unchanged.
