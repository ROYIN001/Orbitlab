# Orbitlab master plan v2.0 (draft) — working copy for wave K0

This folder carries the master plan v2.0 draft into the repository so that the session executing wave K0 can read it. It is **not** the adopted plan yet: adoption (PLAN.md v2.0 at its own path, DECISIONS.md rows, PROGRESS rows, banners) is package **CO-8** of wave K0. Until CO-8 merges, `docs/development/PLAN.md` v1.2 and `PROGRESS.md` stay the documents of record, and where this draft disagrees with code or GitHub, code and GitHub are right (S00 §00.8).

Base: main `5f9aa2e`; live site `09cc2f5` (Pages 37230585947). Drafted 2026-10-04, refreshed after R3 completion.

## Contents

| Path | What |
|---|---|
| `sections/HEADER.md`, `sections/S00…S19` | The plan, one file per section (Thai). Start with `S01-executive-summary.md`. |
| `TIMELINE-TH.md` | Plain-language timeline for the owner (Thai). |
| `data/*.tsv` | The plan's tables (`$F` in the text): assignment (429 items → package), packages, decisions (D-28…D-75), KPIs, folds. |
| `ledger/` | Unified, de-duplicated work ledgers (`unified-*.jsonl/.md`), the document map and process lessons the plan was built from. |
| `perf-baseline/` | `measure.mjs` (startup / frame / storage / warp measurements with `--compare`), its README and the result summaries for `fbefa18` and `5f9aa2e`. The README's example paths (`../ol`) point to an exported build outside the repo; adjust them. Package R0.4 brings this tool into `scripts/` properly. |

The plan was written on a scratch copy; mentions of scratchpad paths, `master/final/` or generator scripts refer to that copy. The tables here are the same data.

## Owner decisions recorded so far (answer sheet A-1, 2026-10-05)

Answered by the owner in the decision page (Claude artifact `https://claude.ai/artifact/85LR92PyK5KXLTUfJkPJk7`, collection `answers`), all as the plan proposed:

| Item | Answer |
|---|---|
| D-38 interim rule | (ก) In force now: no budget-ceiling raise merges without a named identical-output offset package, until CO-1 merges. |
| D-65 start | (ก) **Wave K0 is authorized.** The next wave needs a separate authorization at GK0. |
| D-65 record | Confirmed: the R3 lane is closed; the earlier instruction ("ทำต่อเลยครับ") does not cover R4 or any v2.0 package. |
| D-63 | (ก) P0/P1 bugs that lose data or show false results go before identical-output work in the same files. |
| D-38 full | (ก) Split code and data-snapshot ceilings now; #76's +320 kB counts on the data side; #75/#77/#80 raises accepted with named offsets (index → EQ-7, i18n → EQ-6, precache → EQ-8; CSS approved explicitly); CO-1's data headroom is itself a D-38 approval. |
| D-42 | (ก) Neutral institution name now (lesson ids unchanged); restore the name when written permission exists. NAPA-1/2 confirmed as satellite names, kept. |
| D-12 | Acknowledged (#36 merged as one piece; missing evidence comes from CO-6). |
| D-59 | (ก) Close G0 with the move table in S07 §07.6. |
| D-33, D-34 | Confirmed as built. |
| G3 | Confirmed: "ระยะ3ทำเสร็จหมดแล้ว" covers the R3 screenshot review PROGRESS was waiting on (not D08/G2). |

**Update 2026-10-05:** the owner has answered all 80 answerable items (sheets A-1, A-2, B, C-K2, C-K3, C-K4). The full record, with the 11 answers that differ from the plan's proposal, the 9 owner-choice items and the owner's notes, is in [`OWNER-DECISIONS-2026-10-05.md`](OWNER-DECISIONS-2026-10-05.md). Answers to later-wave questions are decisions for those waves; they do not authorize any work beyond K0 (D-65). Sheet D items are deferred and not yet asked.
