# The cabin view's latest callout: the event in the reader's words (bug fix)

| Field | Value |
|---|---|
| Package | none: a bug the Structure & Assembly session found and reported to the owner on 2026-11-14 ([structure-assembly-pilot.md](structure-assembly-pilot.md), §16.4, "The landing page's pictures are not retaken") |
| Items | none closed; no plan item |
| change_kind | bug fix (app code, `src/ui/onboard.ts`; no ceiling, no assertion changed) |
| The owner's words | 2026-11-20 at 23:41:37Z, verbatim: "ทำข้อ 1 ต่อได้เลยครับ" (go ahead with item 1), item 1 of the session's list of 23:39:56Z: this bug, and the landing pictures taken again once it is fixed |
| Base | main `23ce38a5` (the records PR #229) |
| Branch | `claude/friendly-keller-78iuc9`, started again from main `23ce38a5` |
| Status | In a pull request; not merged; not published. The owner's words name no merge, so the merge waits for the owner's word |

## The bug

In the cabin view (the onboard camera, key 2), the strip under the porthole
shows the flight's latest event. For an attached
vehicle past the aerodynamic model's envelope it read, on the live site:

> Estimated aerodynamic range exceeded: vehicle, Blok I (3rd stage, RD-0110) (α {alphaDeg}°, β {betaDeg}°).

The event log beside it showed the same event correctly: "tracked vehicle",
the angles in degrees, and in Russian and Thai the stage's own name.

## The cause

`OnboardOverlay.draw` wrote the callout as `t(last.key, last.params)`: the
event's own parameters, as the physics records them. Those carry ids and SI
values, not words: `scope: 'vehicle'`, the part's English label, and the
angles in radians as `angleOfAttackRad` and `sideslipRad`, while the
dictionary's line asks for `{alphaDeg}` and `{betaDeg}`. Every other place
that shows an event, the event log, the narration, the timeline, the charts,
the flight wall, the report and the worksheets, passes the parameters through
`localizeEventParams(vehicleSpec, params)` (`src/ui/names.ts`) first, which
puts ids into the reader's words, the angles into degrees in the standard's
body axes, and the rates into the chosen notation's axes. The cabin view was
the one place that did not. So the defect is not this event's alone: any
event whose line names a stage, a burn, a mode or an angle read raw there.

## The fix

`src/ui/onboard.ts`: the callout is `t(last.key, localizeEventParams(sim.vehicleSpec, last.params))`,
as the event log writes it. The callout is kept between frames, and was
written again only when the event or the language changed; what the
formatter gives also depends on the notation (ISO or ГОСТ), so it is now
written again when either changes. Nothing else changes: no string, no
layout, no other view.

## Checks

**Failing before.** `tests/onboard-callout.test.ts` (new) draws the real
`OnboardOverlay` on a recording canvas and reads the text it draws:

| Test | Before the fix | With the fix |
|---|---|---|
| the envelope event, in English, Russian and Thai, reads as the event log reads it, with no `{…}` left and the scope in words | fails (3): "…: vehicle, Blok I (α {alphaDeg}°, β {betaDeg}°)." | passes: "…: tracked vehicle, Blok I (α -2.3°, β -12.0°)." |
| the part named in Thai from the flight's own vehicle (Soyuz-2.1a) | fails: the English label | passes: "บล็อก I (ท่อนที่ 3, RD-0110)" |
| a change of notation, ISO to ГОСТ, writes the callout on screen again | fails: the raw "0.02" | passes: yaw "0.020", then "-0.020" |

5 of 5 fail on main's `src/ui/onboard.ts` and pass with the fix.

**Also run on this tree:** `npm run typecheck`; `npx vite build` and the
bundle budget (ok, no ceiling changed); the 18 test files that touch event
formatting, the cabin view or the envelope events, 304 of 304; node
verification 98 / 98. `scripts/verification/change-map.json`: the
`launch-ui` rule, which `src/ui/onboard.ts` falls under, lists
`tests/onboard-*.test.ts` among its unit files, so a change to the cabin view
selects this test.

**In a browser, on this build:** `r2-flight-shell`, which takes Watch's
onboard view during a flight, passed in 292.7 s, and `r2-shell-smoke` in
42.0 s (`tests/browser/run.mjs`, DejaVu Sans, 2026-11-20).

**Not checked here:** the whole unit suite and the other browser journeys
(CI runs them); the cabin view by eye in a flight that crosses the envelope,
which neither journey reaches.

## Not in this change

**The landing page's pictures.** The report that found the bug says the
eighteen pictures, taken on 2026-10-18 (#164), are best taken again once it
is fixed, since the Thai Explore picture shows the cabin view with the raw
line. That changes eighteen files a visitor sees, and the pictures show the
app of today, with every look change since 2026-10-18, so it is a step of
its own, with the pictures shown to the owner first.

## Follow-ups

1. **Take the landing page's eighteen pictures again** (`npm run shots`),
   after this fix is merged, and show them to the owner before they merge.
   *Owner (proposal):* this session, on the owner's word.
