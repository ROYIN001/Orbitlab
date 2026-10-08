## CHANGELOG

- Build (R0.4, M-PLAN-020): `npm run budget` also prints a report-only table with no ceilings: raw, gzip and brotli kB for every group, an `initial load` group read from `dist/index.html` (the page and every script, module preload and stylesheet it links: 5074.6 kB raw, 1431.5 kB gzip on main `3e15303`) and a `textures` group (3789.4 kB, sent as it is); `budgets.json` and the pass/fail verdict are unchanged.

## PROGRESS

| R0.4 step 1 (M-PLAN-020, wave K1; tooling, T lane) | In PR; not merged; not published | `scripts/bundle-budget.mjs` prints, after the gate's table, gzip -9 and brotli q11 sizes (each file compressed alone; JPEG/PNG at raw size) for every group, plus `initial load` (index.html, index, i18n, lesson-file, download and catalog chunks, index CSS: 7 files) and `textures` (6 files). Reported only: no ceilings and `budgets.json` untouched. The gate's lines, messages and exit code are byte-identical to `4de951f` on the real dist and on all 13 existing fixtures. Test-first (6 new tests in `tests/verification/bundle-budget-report.test.mjs`, all failing on the base). Checks: `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` 79/79, `tests/bundle-budget.test.ts` 8/8, typecheck, budget ok. App bundle unchanged; the check takes about 6 s longer. | [R0.4 step 1 report](reports/R0.4-s1-budget-report.md) |
