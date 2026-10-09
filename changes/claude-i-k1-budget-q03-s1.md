## CHANGELOG

- Budgets (D-38, owner card q03 B): one-time K1 allowance for the remaining bug-fix and data-safety work — `i18n-*.js` 1727→1729, `index-*.js` 2636→2638, `index-*.css` 177→178, other chunks 771→772 kB; precache code unchanged (14724 kB); ratchets back at GK1.

## PROGRESS

| D-38 K1 one-time allowance (budget, owner card q03 B and q03-1 B, 2026-10-09) | In PR; not merged; not published | `budgets.json` only: `i18n-*.js` 1727→1729, `index-*.js` 2636→2638, `index-*.css` 177→178, other chunks 771→772 kB; precache code not raised (14698.8 / 14724 kB). Measured on main `4349137` (after #145 and #144, which together put `index-*.js` 0.2 kB over its 2636 kB ceiling): index 2636.2, i18n 1726.4, CSS 177.0, other chunks 770.4, precache code 14698.8 kB; on `007b039` index was 2635.4 kB. Offsets EQ-6/EQ-7 (K2) and the CO-4 M-LAUNCH-026 CSS dedupe; all K1 ceilings, precache code included, are lowered at GK1 in one PR. `tests/bundle-budget.test.ts` 8/8, `tests/verification/*.test.mjs` 91/91 | [DECISIONS](../DECISIONS.md) "Decided 2026-10-09" |
