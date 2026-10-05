# GK0 — KPI values at the close of wave K0 / ค่า KPI ปิดคลื่น K0

```yaml
envelope: v2
package: GK0 record (R7.2 for K0, integration session)
wave: K1 (records slot)
lane: I
change_kind: docs
owner_authorization: {date: 2026-10-05, quote: "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high", scope: "wave K1 (D-65)"}
candidate_sha: 06abb1f   # main after #93, published by Pages 37359895259
base_sha_verified_on: {sha: 272a3b9, date: 2026-10-05}
```

The K0 session sent these values to the owner in chat on 2026-10-05. Each one
below was checked again against GitHub (runs, PRs, Merge Desk) or measured
again before it was written. Definitions are plan S04 §04.2; each value says
where it comes from.

## Candidate

- **SHA `06abb1f`**: main after #93, the last K0 code PR. Pages
  [37359895259](https://github.com/ROYIN001/Orbitlab/actions/runs/37359895259) built it.
  Every job passed (plan, typecheck, unit 1–3, build, browser 1–3, verify,
  publish), and `publish` deployed it at 2026-10-05T19:25:46Z. All of K0 is live.
- The one commit after it, `272a3b9` (#94), is DECISIONS/CHANGELOG only
  (Markdown, no CI by path filter, no Pages rebuild).

## KPI rows

| KPI | Value at GK0 | Source and check |
|---|---|---|
| KPI-03 precache, code vs data | **code 14 703.8 / 14 704 kB; data/ 1 119.2 / 1 399 kB** (committed snapshots); total 15 823.0 / 16 103 kB | `npx vite build` + `node scripts/bundle-budget.mjs` on `06abb1f`, this session. CO-1 measured code 14 703.5 kB at `5f9aa2e`; +0.3 kB from #86/#87's UI text. Headroom under the code ceiling is 0.2 kB, so every K1 code PR that grows the first view needs a D-38 offset or approval (see F5 below). |
| KPI-14 open P0/P1 data-safety items | **11**: the plan's 12 (S10 §10.2) less M-LAUNCH-027 (LUI-01), fixed by #86 (`d7ee6fb`) | #86 merged and published (Pages 37333861041). The 11 left are R1.6/FX (S10) and go before identical-output work in the same files (D-63). |
| KPI-22 heavy + six-DOF fleet green on the pinned source | **heavy 257/257** ([37242073733](https://github.com/ROYIN001/Orbitlab/actions/runs/37242073733), schedule, success) and **fleet 164/164** ([37253259356](https://github.com/ROYIN001/Orbitlab/actions/runs/37253259356), dispatch, success), both at `5f9aa2e` | Run conclusions and head SHAs re-read on GitHub; counts from the CO-6 report (#89). `git diff 5f9aa2e 06abb1f -- src` touches only `src/i18n/classroom.ts`, `src/lessons/*`, `src/main.ts`, `src/ui/flight-lifecycle.ts` and `src/ui/panel.ts`: no physics, recorder, replay or worker file. So the 5f9aa2e result stands for the candidate and no new heavy run is needed at GK0. |
| KPI-28 PR CI time | **one data point**: #93's CI [37356862761](https://github.com/ROYIN001/Orbitlab/actions/runs/37356862761), wall 18:35:01–18:57:15Z (22 min 14 s). Its browser-smoke shard 1, which now carries `r2-shell-smoke`, took 19 min 52 s as a job (journeys 19 min 17 s); shard 2 took 11 min 44 s. About 16 min on #90, before the smoke slice. | The KPI needs the median of at least 5 runs (at least 3 for the smoke slice, CO-5). K1 PRs will provide them; the next value is due in kpi-GK1. Not a speed-up or slow-down claim yet. |
| KPI-30 ceiling raises without a named offset | **0 in K0** | CO-1 (#84) split the precache ceiling without raising the total. The owner's note on #84, "ขยายเพดานได้", is recorded as a note on that approval, not a standing raise (DECISIONS). No other K0 PR touched `budgets.json`. |
| KPI-31 PROGRESS rows true at merge | **10 of 10 K0 PRs** carried their own row in the merging diff | The rows say "merged, waiting for publish" or "In PR" at merge (SESSION-PROTOCOL §3 step 1). Step 2 (published) is done in this records PR for #93: its row said "In PR" at merge. |
| KPI-33 throughput and lead time | **10 PRs merged in K0** (#84–#93), all on 2026-10-05. Lead time from PR opened to merged: median **12.8 h** (#84 12.6, #85 12.6, #86 13.2, #87 14.6, #88 14.3, #89 11.8, #90 13.0, #91 1.6, #92 0.8, #93 0.7 h). | PR `created_at`/`merged_at` from GitHub. Most of the 12–15 h is waiting for the Merge Desk method to exist and for the owner (the cards went up when the method was adopted, ~14:00Z). |
| KPI-35 owner decision latency | **all 80** answerable set A/B/C items answered on 2026-10-05, 01:42–02:33Z. Merge Desk: 0–2 h from card to click (#84–#90 at 14:41–14:43Z, #88/#91 16:28–16:29Z, #92 18:15Z, #93 18:37Z). Follow-ups D-23 (when), the D-16 note, D-36.A3 and `registry.tsv` answered in chat ~19:55Z (#94). | Merge Desk `decisions` collection read this session; DECISIONS.md. Decision set B (S08, due in K1) was answered among the 80 (sheet B, 19 rows in DECISIONS). Nothing asked is open; sheet D stays deferred. |

## Gates

| Item | State |
|---|---|
| GCO | Every item done except **G2, on HOLD by the owner** (2026-10-05 14:49Z): "ให้ฉากแสดงการปล่อยได้ตามมาตรฐานขั้นต่ำในทั้งโหมด ทดลองและวิศวกร พวกเครื่องมืออื่นๆให้ย้ายออไปข้างหรือไม่ก็ไว้ข้างล่างแบบเลื่อนลงไปดูเอง ต้องไม่มาบังพื้นที่หน้าจอหลักและแถบtimeline สถานการณ์สำคัญ". The fix (F5) is K1's first item. |
| GK0 checklist (S05) | Pinned SHA `06abb1f` ✓ · PR CI and Pages journeys pass on it ✓ · heavy + fleet: not re-run, since no physics/recorder/worker file changed since the green `5f9aa2e` ✓ · budgets under every ceiling ✓ (KPI-03 above) · Pages from exact source, deployed 19:25:46Z ✓ · PROGRESS true (after this PR) ✓ · **R7.1 cross-system journey on the candidate: not run in K0** (carried to GK1) · retrospective: [K0-retro.md](K0-retro.md) ✓ · decision follow-through: see KPI-35 ✓ · K1 authorized by the owner (D-65) ✓ |

## Carried into K1

- G2 (F5 layout fix, new screenshot set, new review page).
- R0.4 (planned K0–K1; not started in K0).
- KPI-28: at least 3 more PR runs with the smoke slice.
- R7.1 cross-system journey, due at GK1.
