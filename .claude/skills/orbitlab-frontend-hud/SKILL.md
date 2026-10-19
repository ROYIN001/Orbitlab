---
name: orbitlab-frontend-hud
description: "Maintain OrbitLab HUD, telemetry panels and flight charts, and the attitude-loop inspector UI. Use when changing their layout, readouts, interactions, or update behavior while preserving displayed-frame consistency, accessibility, and TH/EN/RU support."
---

# OrbitLab HUD and Telemetry UI

## Scope and evidence baseline

This custom skill incorporates the source-review findings for public commit
`1dd8d945c3b6ad716c8bcf90806d5c0c355e0699` (reviewed 2026-10-18), together with
CSS/browser guidance. It is not a copied third-party skill or validation of the
current local checkout. Inspect current project instructions, relevant UI code,
tokens, formatters, and refresh logic before editing; treat snapshot examples
below as evidence to recheck, not permanent product specifications.

Keep changes within the user's task. A review request does not authorize
installation or application edits. Preserve established styling, wording, and
behavior unless an in-scope change requires an explained adjustment. Where this
skill differs from the current project instructions (`docs/DECISIONS.md`,
`docs/development/SESSION-PROTOCOL.md`, `docs/development/VERIFICATION.md`,
`budgets.json`, read with their own status and precedence notes), follow the
project instructions within the user's task and report the difference; report a
requirement the task leaves unmet rather than widening the task. Under those
instructions, a look or wording change that is a choice rather than a fix is the
owner's decision (SESSION-PROTOCOL §1 step 3); when the task leaves such a choice
open, raise it as a question with options (§2) instead of deciding it. Any visual
change names the owner as reviewer (§6); machine checks do not replace the
owner's screenshot review. This skill does not
authorize an unrelated redesign, global token replacement, weakened tests, or
deployment, and it is not a deterministic enforcement mechanism.

## Layout, interaction, and language

- Reuse existing color, type, spacing, and surface tokens and component conventions.
  Do not impose a new palette, a global 2-4 px radius limit, or a ban on pill shapes.
  The reviewed UI legitimately uses several radii and inspector block shapes.
- Preserve intentional HUD overlays, docking/floating, resizing, collapsing, and
  their existing persistence. Keep an accessible way to restore hidden panels.
  Prevent clipped labels/controls and unintended obstruction of essential controls
  and readouts; do not interpret this as banning all overlap with the scene canvas.
  At the baseline the G2 scene contract (the owner's answers and signature in
  `docs/DECISIONS.md`, checked by `tests/browser/scene-floor.mjs` S1-S6) sets the
  scene's minimum height, keeps other panels from covering the scene, keeps the
  key-events timeline, play/pause, and clock wholly on the first screen when the
  window is wider than 860 px, tall enough for both, and the guide is closed
  (reachable by scrolling otherwise), and in a scene under 380 px keeps the title
  to one line and folds the telemetry card. The test also caps the share of a
  short scene the overlays cover together, a threshold set from measurements.
- Respect mode-dependent `#gl`, `#map`, and `#onboard` visibility. Keep the flight
  view usable without forcing all three canvases to be visible together. The
  scene views (`#gl`, and `#map` or `#onboard` when shown) skip drawing while a
  modal `dialog.dialog` is open, an opaque page covers the scene, or the tab is
  hidden; the HUD's refresh is not gated by this. The loop inspector is
  deliberately a non-modal dialog so the scene stays drawn beside it.
- Preserve keyboard navigation, meaningful accessible names, visible focus, and
  usable controls at mobile sizes and zoom. Pair status colors with meaningful
  text/icons or other non-color cues. Check contrast against relevant scene
  backgrounds and respect reduced-motion behavior for decorative UI motion.
- Use the existing TH/EN/RU translation system. Check long labels, line heights,
  and character widths in all supported languages, including narrow layouts;
  keep important values and controls readable rather than silently clipping them.
  Number formatting is not uniform at the baseline: the HUD card and the loop
  inspector use `toFixed` (a period in every language), the telemetry panel
  mostly does but uses `toLocaleString(getLang())` in a few rows, and charts draw
  their axis labels with `toFixed` but write their text description (the
  canvas's `aria-label`) with `Intl.NumberFormat`. Match the neighboring
  readouts; switching an existing readout between conventions is a wording
  choice for the owner.

## Displayed data, units, and formatting

- HUD readouts, charts, and inspectors must use the displayed `VisualFrame`
  (`this.shown`) or the frame-backed view (`simView.sim`, `src/replay/simview.ts`)
  at the current timeline cursor. That view is partial. Fields it does not rewind
  do not follow the cursor, for example `state.currentBurn`, `burnDvRemaining`,
  `predictedApoapsis`, the per-stage `cutoff`/`burnedOut` flags, and
  `plan.burns[].done`. Before displaying one, derive it from cursor-truncated
  recorded data, as `src/ui/telemetry.ts` does for completed burns from the event
  log. A new `VisualFrame` field instead changes `src/physics/frame.ts` and the
  worker frame protocol: make it only if the task covers that, and report it as
  physics work. During replay, do not read the current live simulation state for
  displayed telemetry. Preserve consistency through seek, pause, and
  return-to-live transitions. Keep intentionally live/export data paths distinct
  from displayed replay data.
- Throttled panels show the frame of their last refresh, so during playback they
  trail the picture by up to one refresh interval. Compare readouts with the
  picture when paused, or allow for that interval, rather than raising the rate.
- Show engineering units for dimensional quantities. Clearly label dimensionless
  quantities such as Mach, quaternion components, and ratios using established
  notation; do not invent units. Preserve conversion boundaries and precision.
  Flight-dynamics symbols, body axes, and signs come from `src/ui/notation.ts`
  (ISO 1151 or ГОСТ 20058-80, by language or Engineer setting); do not hard-code
  one standard's symbols.
- Where the meaning depends on a reference, make it clear in the readout or its
  surrounding label/legend: inertial versus air-relative speed, altitude datum,
  ECI/ECEF/target reference, and body-axis sign conventions where applicable.
  Keep the definition consistent between live and replay, not just the label.
- Follow the panel's existing formatter, and do not add new conflations: do not
  replace invalid data with zero or show NaN as infinity. At the baseline no
  shared formatter separates missing, invalid, and unbounded values; most panels
  show any non-finite value as `—`. `∞` appears for an unbound orbit's apoapsis
  and an undefined gain margin, but the values behind them (`elementsFromState`,
  `marginsFromCurve`) do not separate invalid input, so treat them as existing
  behavior to report, not as a pattern to copy to new readouts.
- Use supported `font-variant-numeric: tabular-nums` for changing numeric values.
  It equalizes digit widths, not entire strings. Reserve suitable space, align
  numbers, and use consistent decimals/sign formatting. Check boundaries such as
  99.9 to 100.0, negative values, locale separators, unavailable values, and font
  fallback. Slashed zero is a legibility choice, not a layout-stability guarantee.

## Refresh cadence and performance

- Preserve current throttling unless the authorized task calls for an evidence-based
  adjustment. The reviewed examples are roughly 10 Hz for HUD, 2 Hz for telemetry,
  and 5 Hz for the loop inspector; confirm current values and open/hidden behavior.
  Do not increase every panel to 15-30 Hz or per-frame updates by default.
- Separate physics stepping from display refresh. Batch necessary DOM changes and
  avoid repeated read/write interleaving that forces layout. Layout measurements
  can be necessary for interactions; measure/cache at suitable boundaries rather
  than banning every `getBoundingClientRect()` call or polling unnecessarily.
- `requestAnimationFrame` runs callbacks on the main thread and does not guarantee
  60 FPS. Set performance targets for an explicit device, resolution, and mission
  workload; measure frame times and UI cost before claiming an improvement.
  Avoid adding costly blur or visual effects without checking the affected view.
- New CSS and TH/EN/RU strings count against the `budgets.json` ceilings, which
  rise only under D-38; check the budget and report the measured size.

## Verification for an authorized UI change

Exercise the actual control/readout changed and relevant language/breakpoint
boundaries. For telemetry and layout changes, check timestamp/source alignment
and layout in live, paused, and replay states as applicable. For layout changes,
verify focus, overlay/dock/collapse behavior and restoration. Reuse existing
journeys and the current `docs/development/VERIFICATION.md`: its change-to-check
map gives early feedback, and the complete applicable gates still run. Report
what was and was not tested. A static source check is not proof of visual
correctness or measured performance.

## Source pointers

Use active-checkout equivalents first; the pinned files record the review baseline:

- [UI tokens and layout](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/src/style.css) and [inspector shapes](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/src/ui/loop-inspector.css).
- [Displayed-frame selection](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/src/main.ts#L2368-L2377), [refresh/frame-backed updates](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/src/main.ts#L2129-L2163), and [inspector recording/cadence](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/src/ui/loop-inspector.ts).
- [What the frame-backed view rewinds](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/src/replay/simview.ts#L20-L42).
- [HUD quantity formatting](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/src/ui/hud.ts#L939-L948) and [gain-margin representation](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/src/ui/loop-analysis.ts#L146).
- [G2 scene limits](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/tests/browser/scene-floor.mjs#L1-L71) and [flight-dynamics notation](https://github.com/ROYIN001/Orbitlab/blob/1dd8d945c3b6ad716c8bcf90806d5c0c355e0699/src/ui/notation.ts).
- [Numeric font variants](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-variant-numeric) and [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame).
