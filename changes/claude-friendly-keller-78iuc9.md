## CHANGELOG

- Cabin view (bug fix; the owner's word in chat, 2026-11-20): the strip under the porthole writes the latest event as the event log does. An aerodynamic-envelope warning read "vehicle, Blok I (3rd stage, RD-0110) (α {alphaDeg}°, β {betaDeg}°)"; it now reads "tracked vehicle", the stage's name in the reader's language and the angles in degrees, and any event's stage, burn, mode or rate is written as everywhere else, in the chosen notation.

## PROGRESS

| The cabin view's latest callout (bug fix; found by the Structure & Assembly session and reported to the owner, 2026-11-14; the owner's word in chat, 2026-11-20 at 23:41:37Z, "ทำข้อ 1 ต่อได้เลยครับ") | In PR; not merged; not published | `src/ui/onboard.ts` writes the callout through `localizeEventParams(sim.vehicleSpec, params)`, as every other event view does, and writes it again when the language or the notation changes; `tests/onboard-callout.test.ts` (5, the real overlay on a recording canvas: the envelope event in three languages, the stage's Thai name, ISO to ГОСТ), all failing on main's file and passing with the fix; `change-map.json`'s `launch-ui` rule selects it; typecheck, build, budget, 304 of 304 in the 18 related test files, node verification 98 / 98 | [report](reports/onboard-callout.md) |
