# CO-8 — Adopting plan v2.0: decisions, session protocol, package register (PR1 draft)

```yaml
envelope: v2
package: CO-8
step: PR1 (docs); PR2 (banners) follows after PR1 merges
family: CO
wave: K0
lane: I (W drafts)
items: [M-PLATFORM-075, M-PLATFORM-077]
change_kind: docs   # Markdown that no code or test reads
execution_authorized: true   # wave K0, D-65 (ก)
owner_authorization: {date: 2026-10-05, quote: "D-65 (ก): wave K0 authorized", scope: "wave K0 (answer sheet A-1)"}
adoption: "Adopted: pending owner approval (Merge Desk)"
base_sha_verified_on: {sha: 75c8cf4, date: 2026-10-05}
report: docs/development/reports/CO-8-adoption.md
```

## Status

**Adopted: pending owner approval (Merge Desk).** The owner has not yet approved "adopt v2.0". Gate GCO needs the owner to approve the K0 usage set of the plan (S01, S05, S06, S08 set A, S18) and CO-8 to merge, with v2.0 marked adopted for K0–K1. This PR is written so that nothing in it claims adoption. It records what the owner has already decided, and it marks every adoption step as pending. When the owner approves, the approval's date and words replace the "pending" lines in SESSION-PROTOCOL.md, PROGRESS.md, docs/README.md and this report, in this PR or a records PR, and the Merge Desk card is updated.

## What this PR changes

| File | Change |
|---|---|
| `docs/DECISIONS.md` | New section "Decided 2026-10-05": one row per answer (80), plus the Merge Desk working method, the owner's note on #84, G2 HOLD and the K1 authorization; the D-59 move table (S07 §07.6). The D-3/D-4 deferred row and the "Still open" list now point to the answers. Thai summary line. |
| `docs/development/SESSION-PROTOCOL.md` | New. §1 Merge Desk (S18 §18.14a) with its exemption; §2 the rules the owner decided (D-65, D-38, D-63, D-25); §3–§7 the protocol of M-PLATFORM-077 (one row per package, two-step status, one CHANGELOG line per PR, 14-day stale branches, "docs touched or N/A", never-do list); the registry.tsv question. |
| `docs/development/PROGRESS.md` | K0 rows brought up to the merges (CO-1, CO-4 step 1, CO-5 step 0, CO-6 merged; HU-1 step 1, CO-2 added; CO-7 and CO-3 PR1 merged; G2 HOLD; CO-8); new "Plan v2.0 package register" (93 rows) above the R1–R3 history. |
| `docs/README.md` | New "Development" table (PLAN, DECISIONS, SESSION-PROTOCOL, PROGRESS, VERIFICATION, reports) and the list of docs that code or tests read. |
| `CHANGELOG.md` | One line. |
| this report | New. |

## Facts recorded (as of 2026-10-05)

**K0 merges** (squash; no admin override; approved by the owner at the Merge Desk or in chat):

| PR | Package | Merge SHA | Publication |
|---|---|---|---|
| #84 | CO-1 | `1784cac` | Published by Pages 37333861041 (`d7ee6fb`, 15:58:59Z) |
| #85 | HU-1 step 1 | `8b37d92` | Pages 37328117383 at `8b37d92` failed (`learner-profiles` reload stall, known intermittent); published by 37333861041 |
| #89 | CO-6 | `2391597` | Published by 37333861041 |
| #86 | CO-4 step 1 | `d7ee6fb` | Published by 37333861041 at 2026-10-05T15:58:59Z |
| #91 | CO-5 (Pages shards) | `47f8efa` | Not yet recorded |
| #88 | CO-2 | `75c8cf4` | Not yet recorded |
| #87 | CO-7 | `6e0ef23` | Not yet recorded |
| #90 | CO-3 PR1 | `2275e0d` | Not yet recorded |

The #87 and #90 rows are placeholders; their SHAs are written in by the records PR after they merge. The CI run ids of the merges are also left for that PR.

**Owner's words recorded verbatim** (all 2026-10-05):

- Merge Desk instruction: "งานแต่ละส่วนเมื่อทำเสร็จแล้วทำสรุปมาว่าทำอะไรบ้าง แล้วทำแบบให้ผมกดเลือกได้เลยว่าให้กด merge มั้ย บันทึกเข้าไปในวิธีทำงานต่อจากนี้ของทั้งงานด้วยครับ" → SESSION-PROTOCOL §1, DECISIONS. The exemption for a base merge whose conflicts touch only CHANGELOG/PROGRESS (approval kept if CI is green on the new head) is in §1 step 3.
- G2, 14:49Z, Merge Desk G2 page: **HOLD — G2 not signed.** "ให้ฉากแสดงการปล่อยได้ตามมาตรฐานขั้นต่ำในทั้งโหมด ทดลองและวิศวกร พวกเครื่องมืออื่นๆให้ย้ายออไปข้างหรือไม่ก็ไว้ข้างล่างแบบเลื่อนลงไปดูเอง ต้องไม่มาบังพื้นที่หน้าจอหลักและแถบtimeline สถานการณ์สำคัญ" The F5 fix (the flight scene collapsing at 1100×650 and at 125–150 % zoom) is first in K1.
- #84 note: "ขยายเพดานได้" — recorded as a note on that approval only, not as a standing raise.
- #87 note: "ใช้คำว่า ห้องปฏิบัติการ" — applied in #87.
- Chat: "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ" — K1 authorized once K0 is verified complete.

## The 80 answers

Source: the owner's answers from the decision page (one JSON record per key: choice, optional note, timestamp 2026-10-05T01:42Z–02:33Z), checked one by one against the plan branch's `OWNER-DECISIONS-2026-10-05.md`. They match.

- 80 answers recorded, one DECISIONS row each, with the key, the Thai option text verbatim, an English gloss and the owner's note verbatim where there is one (5 notes: D-36.A3, D-35, D-55, D-74, D-16; the #84, #87 and G2 notes above came from the Merge Desk, not the decision page).
- 60 as the plan proposed; 11 differ from the proposal (D-69, D-21, D-26, D-23 "when", D-10, D-51, D-53, D-58, D-16, D-18, D-20 "DOI"); 9 were the owner's choice with no proposal (D-23 "who", D-71 ×4, D-72, D-73, D-74, D-51 "WGS-84").
- Every answer maps to a D-id except **A1-11-G3**, which is a gate confirmation (G3), not a decision id; it is recorded with the id "G3". B1-D27-plan maps to two ids (D-27, D-56) and B2-D3-D4 to D-3/D-4, as the page labelled them.
- The A2-D36-A3 note is kept word for word.

**Points the owner may want to look at:**

- **D-23 "when"** was answered "(ข) ไม่รับ / ต้องการแก้" (not accepted / wants a change) without saying what change. Recorded as such; it is to be asked again before any institutional pilot.
- **D-16 note** ends mid-word as stored: "ให้คะแนนเป็นระดับตัวเลขพร้อมมีเกณฑ์ผ่าน/ไม่ผ". Recorded exactly as stored; the reading "numeric levels with a pass/fail threshold" is marked as a gloss to confirm.
- **D-36** was answered "(ก) ยืนยันตามภาพ…" at 01:55Z, before the G2 review; G2 is on HOLD since 14:49Z. Both are recorded; G2 is not signed.
- **D-36.A3 note** narrows "read-only as built": values that can still really be adjusted stay editable, and only values past their window need a restart. CO-4 step 1 (#86) holds in-flight edits for the next launch; whether each value is still adjustable in flight is a follow-up for CO-4 / G2.
- **D-55 note** asks for a system test manual before anything goes to the person running tests; it is a condition on R4.4.

## Files outside the S06 allowed list

`CHANGELOG.md` (one line per PR, repository rule) and this report (`docs/development/reports/CO-8-adoption.md`, one report per task under D-25) are not in the CO-8 allowed list; both are added under those rules.

## Spec items not done in this PR, and why

| CO-8 spec item | Done? | Why |
|---|---|---|
| PLAN.md v1.2 → v2.0 at the same path, as an index page with S02–S19 split under `docs/development/plan/` (and `$F` tables under `plan/data/`) | No | That *is* the adoption, and the owner has not approved it. Copying the plan into main now would present the draft as the plan of record. It goes in as soon as the owner approves (each file < 1 MB, no new `ALLOWED` entry, per the spec's size note). |
| DECISIONS expanded to D-28…D-66 with "proposed"/"decided" | Partly | Every id the owner answered is recorded as decided. The ids nobody answered (D-28…D-32 record-only rows, D-52, D-66 and the rest of sheet D) are not added: D-28…D-32 restate existing records and belong with the adopted plan; sheet D has not been asked. |
| D-59 row with the move table | Yes | In DECISIONS. |
| PROGRESS rewritten as one row per package (93 rows) with lifecycle columns; R1–R3 history under it | Partly | The 93-row register is added with the spec's columns, and the R1–R3 history is kept below it. The old v1.2 status table stays on top until adoption, so nothing reads as adopted. CI run ids are left for the records PR. |
| SESSION-PROTOCOL.md | Yes | §1–§2 bind now (owner's own words); §3–§7 take effect on adoption. |
| `docs/README.md` with PLAN v2.0 first | Partly | The development section, DECISIONS, the protocol and the docs that code reads are listed. PLAN.md is listed as v1.2 with v2.0 pending, because v2.0 is not in main. The "four modes" wording of the USER-GUIDE row is unchanged; it changes with the adoption PR after the guide is checked. |
| `registry.tsv` proposal | Asked | Written as an open question to the owner in SESSION-PROTOCOL; not committed. |
| `.github/pull_request_template.md` | No | The spec gives it to lane T in the same train; not in this lane's write set. |
| PR2: banners (S19 App D) | No | The spec makes PR2 a separate PR after PR1 merges; the banners say documents are replaced by v2.0, which would claim adoption. |
| Step 4: KPI-31 re-check and the first lifecycle timestamp | No | After merge, by definition. |
| `ROADMAP-PART2-3.md`, `SIXDOF-VEHICLE-DATA.md`, `T03-CURRICULA-RESEARCH.md` | Not touched | Forbidden by the spec. |

## Checks run

- `npx vitest run tests/repo-hygiene.test.ts`
- `node --test tests/verification/*.test.mjs`

Both pass on this branch: repo-hygiene 9/9; verification 62/62. Relative links in the changed files were checked to resolve to existing files.

## Hand-offs

- Owner: approve adoption of the K0 usage set (Merge Desk), or say what to change; answer D-23 "when" again; confirm the D-16 note; say whether `registry.tsv` should be committed.
- Integration session: after #87 and #90 merge, write their SHAs into PROGRESS (rows and register) and the CI/Pages run ids of all K0 merges; after the adoption approval, PLAN.md v2.0 + `docs/development/plan/`, then PR2 (banners).
- K1 (new session, once K0 is verified complete): the F5 fix first, then G2 again.
