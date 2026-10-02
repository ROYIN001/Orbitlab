# WebGL startup recovery

A reader using Microsoft Edge on a desktop reported “Error creating WebGL
context.” Graphics acceleration was already enabled; Edge's Graphics Feature
Status reported WebGL2 disabled or unavailable. Their Problems Detected report
then identified: “GPU process was unable to boot: GPU process crashed too many
times with software GL. Disabled Features: all.” Browser restart, updates and
device-side graphics troubleshooting are needed; the specific cause of those
GPU process crashes is not established by that report.

Three.js uses WebGL 2. This exact message occurs when both the requested
attributes and Three's attribute-free diagnostic probe fail. Stage 2 changed
neither renderer creation nor the context lifecycle. The last successful Pages
deployment inspected was `91ee372` (deployment 6795491655); Stage 2 `f2d2678`
had merged but its deployment had failed.

## Change

- Both renderers retry a rejected high-performance GPU request with default
  GPU preference. The retry happens before Three's attribute-free probe can
  establish different attributes. Antialiasing, logarithmic depth, shadows,
  color, resolution and simulation settings retain their existing behavior.
- A typed context error includes browser context-creation diagnostics. The
  recovery screen has localized guidance, a focused heading, a keyboard-usable
  reload button and expandable technical details. Other startup errors retain
  a generic diagnosis rather than being called WebGL failures.
- Launch, reset and flight keyboard actions wait for startup; preview waits
  for the scene. A failed startup cannot create a partial flight session from
  those controls.

These changes cannot force WebGL on when Edge or the device disables it.

## Deployment investigation

Deployment run 37066834767 failed in `case-worksheet-exports` on a 45-second
click timeout. Run 36932214271, on the earlier `91ee372`, had the same failure.
The signed full logs were inaccessible in this environment. Local reproduction
completed all 24 downloads in 134.7 seconds without a failure, so the precise
intermittent timeout cause was not established.

The journey now uses the current “Hide tips” label, identifies the case and
action in the CI error's first line, and puts complete failure details and
screenshots in CI's existing artifact directory. Its timeouts and assertions
are unchanged. It also joins the pull-request smoke suite so a repeat of this
deployment blocker is checked before merge.

## Checks

The focused renderer, translation and architecture suites cover the fallback,
unchanged attributes, restored canvas methods/listeners, diagnostic capture
and distinct unrelated errors. The `webgl-startup` browser journey injects
GPU-preference rejection, complete WebGL unavailability and an unrelated
renderer failure; it checks working simulation after fallback, Thai recovery,
safe flight controls and keyboard reload after availability returns.

Run `npm run build`, `npm run budget`, and
`node tests/browser/run.mjs webgl-startup case-worksheet-exports` for the
affected production journeys. These use Chromium with controlled faults;
changing its user-agent to Edge is not a claim to have tested the reader's
physical GPU or Microsoft Edge installation.
