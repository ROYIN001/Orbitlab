# Redesign A ("Mission Control"): fonts, top bar, Watch and the classroom look / ออกแบบหน้าตาใหม่ แบบ A

One report for the redesign package (D-25), one section per step. S0 makes room
under the unchanged ceilings; S1–S3 change the look and are reviewed by the
owner on screenshots.

| Field | Value |
|---|---|
| Package | Redesign A (direction A "Mission Control"), steps S0–S3 |
| Branch | `claude/friendly-keller-78iuc9` (based on `origin/main` `5588be1`) |
| Fragment | [`changes/claude-friendly-keller-78iuc9.md`](../../../changes/claude-friendly-keller-78iuc9.md) |
| Status | In PR; not merged; not published |

## The owner's authorization (D-65)

Owner, in chat, **2026-11-05**, verbatim:

> "เริ่มทำได้เลยครับ โหมดการเรียนที่คุณเสนอ ให้ใช้เฉพาะตอนที่เป็นโหมดการเรียนในบทเรียนเท่านั้นครับ ส่วนรูปแบบอื่นๆ จัดแบบผสมให้เหมาะสมเลยครับ เช่น โหมดรับชม ให้เน้นเห็นภาพจำลองมีแค่ข้อมูลพื้นฐานประกอบพอ"

(Start now. The classroom style you proposed is used only while studying a
lesson. The other modes are mixed sensibly; for example Watch puts the
simulation first, with only basic information beside it.)

## Choices taken under "mix sensibly"

These are choices made in this package to fill in "จัดแบบผสมให้เหมาะสม". The
owner did not decide them, and can reverse any of them at the screenshot
review.

- **S0 first.** An identical-output offset goes first (the dead `.section-*`
  CSS and the line indentation of the built `index.html`); `budgets.json` is
  not changed.
- **Fonts.** The online-only web fonts become IBM Plex Sans Thai, IBM Plex Sans
  (for basic Cyrillic) and IBM Plex Mono; the offline system fallbacks are
  unchanged. Canvas text that hard-codes "DM Sans" or "Space Grotesk" moves to
  the Plex families (numbers in Plex Mono), except the offline exports
  `report.ts` and `worksheets/html.ts`. The playback mission clock uses
  `var(--mono)`.
- **Thai text is never letter-spaced.** The brand wordmark keeps its tracking
  through `lang="en"`, also in the About dialog.
- **Top-bar icons** become inline SVG symbols in the existing `#logo-sprite`:
  profile = person, My work = folder, About = info circle, Camera sequence =
  video camera, help = help circle, lessons = book; also the section and level
  icons and the menu chevron. Paths taken from Lucide/Feather get a NOTICE.md
  entry (ISC/MIT) and a sprite comment. The lessons page title uses the same
  book icon.
- **Lessons button**: a mint outline (no gold). The current page has the
  accent-weak background and an inset accent underline; the new-lesson glow
  turns mint.
- **User docs** that name the removed glyphs or the gold button are reworded
  (README.md, docs/USER-GUIDE.md, the fonts section of NOTICE.md).
- **Watch**: the scene first; a compact clock block at the top centre (label,
  mission time, altitude · speed) built from the existing stats; one
  left-aligned lower-third caption; the existing controls; nothing over the
  middle of the scene. On a phone the clock gets its own row (mockup E5). The
  state chip is pinned to the last grid column. In short scenes the caption
  sentence is cut to one line (the full sentence stays in the live region).
  The lesson strip hides in Watch and on the landing page only
  (`body[data-section='home']`), not in Orbit or Build. The `.hud-fold` fix is
  not part of this package (a separate bug-fix PR later).
- **Classroom theme**: light tokens (white cards, ink `#0f1b2d`, muted
  `#4d5b6e`, lines `#dde3ea`, accent `#1f3fae`) scoped to the lesson study
  views only — `body:is([data-lessons-page='catalog'],[data-lessons-page='test']) .lessons-page`
  — and the in-flight `.lesson-strip`; not the teacher pages (worksheets,
  author, check). The 3-D scene stays dark. The `assess.pathLegend` strings in
  EN/TH/RU stop naming a colour (no key change). The classroom font stays IBM
  Plex Sans Thai.
- **Deferred** (not built): Explore question cards, the Engineer flight-wall
  preset, the event rail, progress tracks, a projector mode (`?present=1`),
  glyph icons in the scene and HUD outside the top bar, and new pictures for
  `public/home` and the social preview.

## Open question for the owner

**Q1 (D-65/D-38).** Does "เริ่มทำได้เลยครับ" (2026-11-05) cover S0, the
identical-output offset below? It leaves `budgets.json` unchanged and the room
it frees is set aside for S1–S3. Without S0, S1–S3 together are about 0.5 kB of
CSS and 2.6 kB of precache code over the ceilings, and each would need its own
D-38 raise. Until the owner answers, S0 is a *proposed* offset; no code comment
records it as the owner's.

## S0 — identical-output offset: dead section CSS and the built page's line indentation

Change type: **identical output** (D-63: it goes first in the package, in a
change of its own). No app behaviour, no `budgets.json`, no dependency.

### Why

At `5588be1` the CSS chunk has **679 B** left under its 179 kB ceiling and the
precache code group **609 B** under 14679 kB. S1–S3 need about 1.15 kB of CSS
and about 3.2 kB of precache code. This step makes both groups smaller without
changing what any visitor sees, so S1–S3 can fit under the **unchanged**
ceilings. The room is set aside for S1–S3 (Q1).

### What changed

1. **Dead CSS** (`src/ui/modes.css`): the rules for `.section-badge` (with its
   "in development" comment), `.section-inner`, `.section-eyebrow`,
   `.section-lead`, `.section-levels`, `.section-level` (and its
   `[aria-current]`, `strong` and `.mode-glyph` rules), `.section-level-text`,
   and inside the 860 px block `.section-levels` and `.section-lead`. No file in
   `src/`, `index.html`, `tests/` or `scripts/` uses these classes, and no class
   name is built from parts (grep for each class and for `section-` with a
   template or `+`). The Soyuz anatomy pages in `public/anatomy/` have their own
   `#soyuz-anatomy .section-eyebrow` rules and run in an iframe. Kept, because
   they are used: `.section-title` (`src/ui/panel.ts`), `.section-coming`,
   `.section-phase`, `.section-items`, `.section-item-id`, `.section-note` and
   `.section-actions` (`src/ui/build/engineer-level.ts`,
   `src/ui/orbit/playground.ts`).
2. **Built page without line indentation** (`scripts/html-comments.mjs`,
   `vite.config.ts`): a new `builtPage(html)` is `stripHtmlComments` followed by
   removing the spaces and tabs at the start of every line; a line break stays
   wherever one was. The build plugin uses it in place of `stripHtmlComments`.
   The source `index.html` is unchanged. The comments in both files say this,
   and that the offset is proposed for this package (this report).

### Why the output is identical

- **CSS.** The built `index-*.css` differs from `5588be1`'s exactly by the
  rules above (rule-by-rule diff of the two minified files: 10 rules removed and
  the two in the 860 px block; nothing else changes).
- **Page.** Whitespace at the start of a line only matters where whitespace is
  kept as written. `index.html` has no `<pre>`, `<textarea>`, `<style>` or
  inline script (its only script is the `src` one), no `<template>` or SVG
  `<text>`, no attribute value or tag text that spans lines, and no text node
  with content on more than one line once the comments are gone. The only
  `white-space: pre` rules in `src/` (`.mc-tooltip`,
  `.experiment-notebook pre`) are on elements the app builds itself, not in
  `index.html`; `pre-line` would drop the spaces around a line break anyway.
  Every run of whitespace keeps at least its line break, so no two tags or
  words come together.
- `tests/verification/html-comments.test.mjs`, new case "the built page also
  drops line indentation and nothing the layout sees": the tags and text of
  `builtPage(source)` equal those of `stripHtmlComments(source)` with whitespace
  runs collapsed as the page lays them out; the source has no `<pre>`,
  `<textarea>`, `<style>` or inline script and no attribute value across lines;
  no built line starts with indentation; at least 1.5 kB goes. The existing
  case still tests `stripHtmlComments` on its own.
- The built `dist/index.html` of this branch and of `5588be1`, with the asset
  hashes masked, have the same 381 tags and text tokens.
- Every other file of the two builds was compared: all 12 JS chunks that
  differ do so only in the content hashes of the file names they name (the
  index CSS and JS got new names); with those masked they are byte for byte
  the same. `sw.js` differs in the manifest's revisions, `build-info.json` in
  the build time and `SHA256SUMS` in the sums.
- Nothing reads the page's whitespace text nodes: they are still there, one
  line break each, so `childNodes` keeps its shape; the app's `textContent`
  comparisons are on leaf elements with one-line content.
- Vite indents the tags it injects after the `pre` transform (the script, the
  module preloads and the stylesheet): 12 B of indentation are left, on
  purpose; it is not worth a second hook.

### Measured (this container, `npx vite build`, then `node scripts/bundle-budget.mjs`)

| | `5588be1` | S0 | change |
|---|---|---|---|
| `dist/index.html` | 15,076 B | 13,070 B | −2,006 B |
| leading whitespace in `dist/index.html` | 2,018 B | 12 B | −2,006 B |
| `index-*.css` | 178,321 B (178.3 / 179 kB) | 177,340 B (177.3 / 179 kB) | −981 B |
| `index-*.js` | 2,653,921 B (2653.9 / 2655 kB) | 2,653,921 B (2653.9 / 2655 kB) | 0 |
| `i18n-*.js` | 1,732,544 B (1732.5 / 1733 kB) | 1,732,544 B (1732.5 / 1733 kB) | 0 |
| other chunks | 771.4 / 772 kB | 771.4 / 772 kB | 0 |
| precache code | 14,678,391 B (14678.4 / 14679 kB) | 14,675,404 B (14675.4 / 14679 kB) | −2,987 B |
| precache | 15797.6 / 16078 kB | 15794.6 / 16078 kB | −2,987 B |
| precache data/ | 1119.2 / 1399 kB | 1119.2 / 1399 kB | 0 |
| `bundle budget` | ok | ok | |

**Budget line: lowered (usage); every ceiling unchanged.** Room after S0:
`index-*.css` 1,660 B, precache code 3,596 B; set aside for S1–S3 (Q1). Per
S09 rule 9 the ceilings are lowered in the T lane's next ratchet PR, not here.

### Files

`src/ui/modes.css`, `scripts/html-comments.mjs`, `vite.config.ts`,
`tests/verification/html-comments.test.mjs`,
`changes/claude-friendly-keller-78iuc9.md`, this report.

### Tests run

| Command | Result |
|---|---|
| `npm run -s typecheck` | passed |
| `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` | 94 / 94 passed (93 before + the new html-comments case) |
| `npx vitest run` css-motion, architecture, bundle-budget, hud-layout, privacy-inventory, repo-hygiene, telemetry-layout, pwa, classroom-pwa, section-plan | 10 files, 107 / 107 passed |
| `npx vite build && node scripts/bundle-budget.mjs` | bundle budget: ok (table above) |
| `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tests/browser/run.mjs pwa-offline r2-viewport-scene-floor r2-viewport-matrix` | 3 / 3 journeys passed in 1233.8 s (pwa-offline 70.1 s, 69 files precached; r2-viewport-matrix 819.5 s, with open finding F2 seen 4× at 320 px as before, not counted; r2-viewport-scene-floor 333.3 s) |

Not run here: the full `npx vitest run` (342 files; `select-checks` falls back
to the full set because `vite.config.ts` and `scripts/` changed), the browser
smoke set, heavy and sixdof-fleet. CI runs them.

Docs touched: N/A (README, IMPLEMENTATION-STATUS and USER-GUIDE describe no
build detail or class this changes).

### S0 review fixes

Same change type (identical output); the build output is unchanged.

1. `scripts/html-comments.mjs` header: the indentation offset is now called
   *proposed* for redesign A and points to this report, as the `vite.config.ts`
   comment already did (Q1 is open). Comment only.
2. `tests/verification/html-comments.test.mjs`, `tokens()`: a whitespace run
   between two tags or words is now a token (one space) instead of being thrown
   away, so the cases also catch two elements or words that were apart coming
   together. A broken `builtPage` that drops every line break
   (`.replace(/\n[ \t]*/g, '')`) passed the old case and fails the new one; the
   shipped `builtPage(source)` still has the same tokens as
   `stripHtmlComments(source)`, and the first case still passes (its two strings
   are identical). The test is stricter; no assertion is removed.
3. Not applied: the review asked the header table's Branch row to put S1–S3 on
   branches of their own, with their own fragments (SESSION-PROTOCOL §5: one
   step, one branch, one PR; identical output never mixes). This package's
   instructions keep one fragment (`changes/claude-friendly-keller-78iuc9.md`)
   and one report, so where S1–S3 are committed is left to whoever runs the
   next step, not decided in this fix. The row is unchanged.

Owner's authorization, 2026-11-05, in chat, verbatim: "เริ่มทำได้เลยครับ
โหมดการเรียนที่คุณเสนอ ให้ใช้เฉพาะตอนที่เป็นโหมดการเรียนในบทเรียนเท่านั้นครับ
ส่วนรูปแบบอื่นๆ จัดแบบผสมให้เหมาะสมเลยครับ เช่น โหมดรับชม
ให้เน้นเห็นภาพจำลองมีแค่ข้อมูลพื้นฐานประกอบพอ". The choices list above is
unchanged; each is a choice taken under "mix sensibly", which the owner can
reverse at the screenshot review.

**Budget line: unchanged from S0** (`index-*.css` 177.3 / 179 kB, `index-*.js`
2653.9 / 2655 kB, `i18n-*.js` 1732.5 / 1733 kB, other chunks 771.4 / 772 kB,
precache 15794.6 / 16078 kB, precache code 14675.4 / 14679 kB; every ceiling
unchanged).

Files: `scripts/html-comments.mjs`, `tests/verification/html-comments.test.mjs`,
this report.

| Command | Result |
|---|---|
| `npm run -s typecheck` | passed |
| `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` | 94 / 94 passed |
| `npx vite build && node scripts/bundle-budget.mjs` | bundle budget: ok (numbers above) |
