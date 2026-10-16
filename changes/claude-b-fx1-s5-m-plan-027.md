## CHANGELOG

- Build (R3.4r, M-PLAN-027, P1 accessibility regression): on the Engineer benches the keyboard now stays on Stacked/Apart and Deployed/Stowed after they are pressed (it fell to the page); "Show the part" scrolls without animation when the reader asked for reduced motion; a strap-on group on the bench drawing is read out by the same name as on Watch and Explore ("Strap-ons ×4: Blok B/V/G/D boosters", not "Strap-ons ×4"); no new strings, no CSS.

## PROGRESS

| R3.4r M-PLAN-027 (P1 a11y, wave K1, lane B) | In PR; not merged; not published | The R3 benches' a11y regressions (R3CR-03, live since `09cc2f5`): keyboard focus lost after Stacked/Apart (`engineer-level.ts`) and Deployed/Stowed (`satellite-bench.ts`), `showPart` smooth-scrolling under reduced motion, a strap-on's accessible name differing from Watch/Explore. New `tests/build-bench-a11y.test.ts` (every drawn part of every catalogue vehicle named as Watch names it; 30 strap-on labels differed on `7b2a3cb`) and journey `bench-a11y` (5 failures on `7b2a3cb`); no strings, no CSS; `index-*.js` 2636.2 → 2636.4 kB within the q03 allowance (#146, ceiling 2638); second-agent review 0 blocking | [M-PLAN-027 report](reports/R3.4r-m-plan-027-bench-a11y.md) |
