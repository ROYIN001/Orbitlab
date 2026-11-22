# The onboard view's latest callout: the event in the reader's words (bug fix)

| Field | Value |
|---|---|
| Package | none: a bug the Structure & Assembly session found and reported to the owner on 2026-11-14 ([structure-assembly-pilot.md](structure-assembly-pilot.md), §16.4, "The landing page's pictures are not retaken") |
| Items | none closed; no plan item |
| change_kind | bug fix (app code, `src/ui/onboard.ts`; no ceiling, no assertion changed) |
| The owner's words | 2026-11-20 at 23:41:37Z, verbatim: "ทำข้อ 1 ต่อได้เลยครับ" (go ahead with item 1), item 1 of the session's list of 23:40:45Z, its answer to the owner's question of 23:39:56Z: this bug, and the landing pictures taken again once it is fixed. At 23:58:52Z, "เปิด PR แล้ว merge ได้เลยครับ" (open the PR, then go ahead and merge) |
| Base | main `23ce38a5` (the records PR #229) |
| Branch | `claude/friendly-keller-78iuc9`, started again from main `23ce38a5` |
| Status | In PR #230; not merged; not published. The owner's words of 23:58:52Z name no head: the session reads them as the order to merge once CI is green on the final head and the review's findings are fixed, telling the owner that head first (2026-11-22, the records PR after #231: #230 was squash-merged at 2026-11-21T00:33:01Z as `ffe3734d`, a tree identical to its final head `5a0d8335` (CI run 44842000345, 12 of 12 jobs), on the owner's words of 23:58:52Z as the session read them, after it told the owner that head at 00:31:50Z. Pages run 44844566221 published it at 00:59:35Z, 13 of 13 jobs, and the live site's `build-info.json` gave the commit `ffe3734` at 01:00:20Z. The records PR after #231 folded this PR's fragment, `changes/claude-friendly-keller-78iuc9.md`, into `CHANGELOG.md` and `docs/development/PROGRESS.md` and deleted it. Lines below that call this PR not merged or not published, or speak of the merge as to come, describe the time before.) |

## The bug

In the onboard view (the onboard camera, key 2), the strip under the porthole
shows the flight's latest event. For an attached vehicle past the
aerodynamic model's envelope, main's code writes, in English:

> Estimated aerodynamic range exceeded: vehicle, Blok I (3rd stage, RD-0110) (α {alphaDeg}°, β {betaDeg}°).

The report that found it saw the line in the Thai Explore picture it took
locally (`npm run shots -- th`); the live site serves the same `src/` as
main. The event log beside it shows the same event correctly: "tracked
vehicle", the angles in degrees, and in Russian and Thai the stage's own
name.

## The cause

`OnboardOverlay.draw` wrote the callout as `t(last.key, last.params)`: the
event's own parameters, as the physics records them. Those carry ids and SI
values, not words: `scope: 'vehicle'`, the part's English label, and the
angles in radians as `angleOfAttackRad` and `sideslipRad`, while the
dictionary's line asks for `{alphaDeg}` and `{betaDeg}`. Every other place
that shows an event as text, the event log, the HUD, the narration, the
timeline, the charts, the flight wall, the report and the worksheets, passes
the parameters through `localizeEventParams(vehicleSpec, params)`
(`src/ui/names.ts`) first, which puts ids into the reader's words, the angles
into degrees in the standard's body axes, and the rates into the chosen
notation's axes; the WebMCP and CSV exports give the raw values on purpose.
The onboard view was the one place that did not. So the defect is not this
event's alone: any event whose line names a stage, a burn, a mode or an
angle read raw there.

## The fix

`src/ui/onboard.ts`: the callout is `t(last.key, localizeEventParams(sim.vehicleSpec, last.params))`,
as the event log writes it. The `sim` it draws is the frame-backed view of
the flight (`src/replay/simview.ts`), which carries the flight's own vehicle
spec in a live flight, a replay and a loaded recording alike. The callout is
kept between frames, and was written again only when the event or the
language changed; what the formatter gives also depends on the notation (ISO
or ГОСТ), so it is now written again when either changes. Nothing else
changes: no string, no layout, no other view.

## Checks

**Failing before.** `tests/onboard-callout.test.ts` (new) draws the real
`OnboardOverlay` on a recording canvas and reads the text it draws:

| Test | Before the fix | With the fix |
|---|---|---|
| the envelope event, in English, Russian and Thai, reads as the event log reads it, with no `{…}` left and the scope in words | fails (3): "…: vehicle, Blok I (α {alphaDeg}°, β {betaDeg}°)." | passes: "…: tracked vehicle, Blok I (α -2.3°, β -12.0°)." |
| the part named in Thai from the flight's own vehicle (Soyuz-2.1a) | fails: the English label | passes: "บล็อก I (ท่อนที่ 3, RD-0110)" |
| a change of language, English to Thai, writes the callout on screen again | fails: the raw line | passes |
| a change of notation, ISO to ГОСТ, writes the callout on screen again | fails: the raw "0.02" | passes: yaw "0.020", then "-0.020" |

6 of 6 fail on main's `src/ui/onboard.ts` and pass with the fix. Three
mutations of the fix are each caught: the language left out of the cache
key (the language test), the notation left out (the notation test), and
`null` passed in place of the flight's vehicle spec (the Thai name test).

**Also run on this tree:** `npm run typecheck`; `npx vite build` and the
bundle budget (ok, no ceiling changed); node verification 98 / 98; the 62
unit files that `scripts/verification/select-checks.mjs` selects for this
diff, 722 of 722. `scripts/verification/change-map.json`: the `launch-ui`
rule, which `src/ui/onboard.ts` falls under, lists `tests/onboard-*.test.ts`
among its unit files, so a change to the onboard view selects this test.

**In a browser, on this build:** `r2-flight-shell`, which takes Watch's
onboard view during a flight, passed in 292.7 s, and `r2-shell-smoke` in
42.0 s (`tests/browser/run.mjs`, DejaVu Sans, 2026-11-20).

**Not checked here:** the whole unit suite and the other browser journeys
(CI runs them); the onboard view by eye in a flight that crosses the
envelope, which neither journey reaches.

## Not in this change

**The landing page's pictures.** The report that found the bug says the
eighteen pictures, taken on 2026-10-18 (#164), are best taken again once it
is fixed, since a Thai Explore picture taken now shows the onboard view with
the raw line (main's own picture shows the exterior view). That changes
eighteen files a visitor sees, and the pictures show the app of today, with
every look change since 2026-10-18, so it is a step of its own, with the
pictures shown to the owner first.

## Follow-ups

1. **Take the landing page's eighteen pictures again** (`npm run shots`),
   after this fix is merged, and show them to the owner before they merge.
   *Owner (proposal):* this session, on the owner's word.
   *2026-11-21 and 2026-11-22:* taken again on the owner's word in chat
   (23:40:33Z, "ถ่ายรูปหน้าแรกใหม่ต่อได้เลยครับ"), in PR #231, by
   `npm run shots -- en,ru,th` on main `ffe3734d`; the owner asked to see
   them before the merge (23:47:26Z, "ส่งรูปให้ดูก่อน merge ด้วยครับ"). The
   session sent the before-and-after sheets, one per language, in chat; the
   owner answered on 2026-11-22 at 00:00:43Z, "merge ได้เลยครับ". The link
   preview (`public/social/preview.jpg`) was not taken again. (2026-11-22,
   the records PR after #231: #231 merged at 00:34:11Z as `5be3b7d0`, a tree
   identical to its final head `4b5fda83` (CI run 44965673885, 12 of 12
   jobs). Pages run 44967260071 published it at 01:01:04Z, 13 of 13 jobs,
   and the live site's `build-info.json` gave the commit `5be3b7d` at
   01:01:12Z.)
