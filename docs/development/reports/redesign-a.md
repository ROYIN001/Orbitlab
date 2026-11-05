# Redesign A ("Mission Control"): fonts, top bar, Watch and the classroom look / ออกแบบหน้าตาใหม่ แบบ A

One report for the redesign package (D-25), one section per step. S0 makes room
under the unchanged ceilings; S1–S3 change the look and are reviewed by the
owner on screenshots.

| Field | Value |
|---|---|
| Package | Redesign A (direction A "Mission Control"), steps S0–S3 |
| Branch | S0: `claude/friendly-keller-78iuc9` at `5bef72f` (based on `origin/main` `5588be1`). S1: `claude/u-redesign-a-s1`, stacked on S0 (waiting: merges after S0). S2: `claude/u-redesign-a-s2`, stacked on S1 (waiting: merges after S1) |
| Fragment | S0: [`changes/claude-friendly-keller-78iuc9.md`](../../../changes/claude-friendly-keller-78iuc9.md). S1: [`changes/claude-u-redesign-a-s1.md`](../../../changes/claude-u-redesign-a-s1.md). S2: [`changes/claude-u-redesign-a-s2.md`](../../../changes/claude-u-redesign-a-s2.md) |
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

## S1 — foundation: IBM Plex fonts, no Thai letter-spacing, line icons in the top bar, the mint Lessons button

Change type: **look change** (visual; the owner reviews it on screenshots). No
`budgets.json` change, no new dependency, no i18n key added or removed.

Owner's authorization, 2026-11-05, in chat, verbatim: "เริ่มทำได้เลยครับ
โหมดการเรียนที่คุณเสนอ ให้ใช้เฉพาะตอนที่เป็นโหมดการเรียนในบทเรียนเท่านั้นครับ
ส่วนรูปแบบอื่นๆ จัดแบบผสมให้เหมาะสมเลยครับ เช่น โหมดรับชม
ให้เน้นเห็นภาพจำลองมีแค่ข้อมูลพื้นฐานประกอบพอ".

### Choices in this step (taken under "mix sensibly"; the owner can reverse each at the screenshot review)

- **Fonts.** Online only, IBM Plex Sans Thai + IBM Plex Sans (Google's Plex
  Sans Thai has no basic Cyrillic, U+0400–045F) + IBM Plex Mono. Offline the
  system fallbacks are unchanged, except that the playback mission clock now
  reads `var(--mono)` (the phone clock already did). Canvas text that named
  "DM Sans" or "Space Grotesk" uses the Plex families, numbers in Plex Mono;
  the offline exports `src/ui/report.ts` and `src/worksheets/html.ts` keep
  their own stacks.
- **Thai is never letter-spaced**; the ORBITLAB wordmark keeps its tracking
  through `lang="en"` in the top bar and in the About dialog.
- **Line icons**: profile = person, My work = folder, About = info circle,
  Camera sequence = video camera, help = help circle, Lessons = book; also the
  section and level icons and the menu chevron. The lessons page title uses the
  same book icon. Lucide/Feather-derived paths are credited in NOTICE.md.
- **Lessons button**: a mint outline (no gold); its current-page marker is the
  accent-weak background plus an inset accent underline (the section tabs'
  underline; contrast for WCAG 1.4.11, the old cream outline is gone); the
  new-lesson glow is mint.
- **User docs** that named the removed glyphs or the gold button are reworded.

The package's full choices list (S0–S3, and what is deferred) is above,
unchanged.

### What changed

1. **Fonts.** `src/ui/web-fonts.ts`: `WEB_FONTS_URL` =
   `…css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap`
   (the online-only logic is unchanged), and two constants for canvas text,
   `CANVAS_SANS` (`"IBM Plex Sans Thai", "IBM Plex Sans", system-ui, sans-serif`)
   and `CANVAS_MONO` (`"IBM Plex Mono", ui-monospace, monospace`), since a
   canvas cannot read the CSS tokens. `src/style.css`: `--mono` gains
   `"IBM Plex Mono"` in front, `--sans` is
   `"IBM Plex Sans Thai", "IBM Plex Sans", "Noto Sans Thai", system-ui, …`,
   `--display: var(--sans)` (the token stays, so its uses keep reading it);
   the header comment names the new families; `.mission-clock > span` uses
   `var(--mono)`. Canvas: `src/ui/charts.ts` (legend, title, axis name),
   `src/ui/onboard.ts` (captions and events `CANVAS_SANS`; the g-load and tile
   values `CANVAS_MONO`), `src/ui/rendezvous-plot.ts`, `src/ui/map.ts`,
   `src/ui/build/tunnel-map.ts`, and `src/render/cosmonaut.ts` (its only text is
   "СССР", so the literal is `"IBM Plex Sans", Arial, sans-serif`). The two
   constants cost less than writing the stack out at each of the 14 sites: the
   literal version measured `index-*.js` 2,654,108 B, the constants 2,653,439 B.
   No CSS asks for a weight outside 400–700.
2. **Thai letter-spacing.** `src/style.css`, after `.eyebrow`:
   `:lang(th) { letter-spacing: normal !important; }` with a one-line why.
   `setLang` writes `html[lang]` (`src/i18n/index.ts`), so the rule covers every
   letter-spacing declaration while the interface is Thai, in the app's own
   document. The owner's Soyuz Anatomy pages (`public/anatomy/`, their own
   document in the anatomy dialog's iframe, pinned by sha256) keep their
   tracking, as the owner made them. This is listed for the screenshot review.
   EN and RU keep their tracking. `index.html` `.brand-name` and the About dialog's wordmark
   (`src/ui/dialogs.ts`, `name.lang = 'en'`) keep the −0.6 px.
3. **Line icons.** `index.html` `#logo-sprite` gains 14 stroke symbols
   (`#i-launch`, `-orbit`, `-build`, `-campaign`, `-watch`, `-explore`,
   `-engineer`, `-chev`, `-profile`, `-work`, `-about`, `-camera`, `-help`,
   `-lessons`; viewBox 0 0 24 24, no `clipPath`, so `scripts/icons.mjs` still
   takes only the logo); the sprite comment says so and names Lucide. The ◉ ▤ ⓘ ◈
   spans of `#btn-profile`, `#btn-work`, `#btn-about` and `#btn-camera-plan`
   become `<svg class="icon" aria-hidden="true"><use href="#i-…" /></svg>`;
   `#btn-data-mode` keeps its own SVG. `src/style.css` `.icon` (1.15 em, 1 em after the review fixes; stroke
   `currentColor`, round caps). `src/ui/dialogs.ts` exports `icon(name, cls)`,
   the `logoMark` pattern. `src/ui/section-nav-model.ts` drops `glyph` and
   `LEVEL_GLYPHS` (a section or level is drawn with `#i-<id>`; the model stays
   DOM-free); `src/ui/section-nav.ts` draws `icon(id, 'mode-glyph')` and
   `icon('chev', 'nav-chev')` in the five places the glyph spans were, so the
   class-based rules in `modes.css` still apply. `src/ui/help.ts` draws
   `icon('help')` before its label (the label stays the last span, so the
   icon-only breakpoint still works). `src/ui/lessons/lesson-mode.ts`: the
   Lessons button and the lessons page title draw `icon('lessons')`;
   `.lesson-badge` keeps its class and its n/N text. The accessible names do
   not change: the glyphs were already `aria-hidden`.
4. **Lessons button** (`src/ui/lessons/lessons.css`): `.lesson-btn` is
   `border-color: var(--accent-line); color: var(--accent) !important;
   font-weight: 600`, hover `border-color: var(--accent)`; the `.fresh` glow and
   `@keyframes lesson-glow` use `rgba(139, 229, 205, …)` at the same alphas, its
   three iterations still inside the `no-preference` query; `.lesson-badge` is
   accent on accent-weak; `[aria-current='page']` is
   `background: var(--accent-weak); box-shadow: inset 0 -2px 0 var(--accent)`.
   The `:root` `--lesson*` tokens stay gold for the lesson items inside the app
   (also `src/ui/build/satellite.css`); `--lesson-deep`, used only by the old
   gradient, is removed. The file comment no longer says gold sets the way in
   apart.
5. **Docs.** README.md (My work, Learner profiles, About named by their icons;
   Typography names the Plex families), docs/USER-GUIDE.md (My work, the learner
   button, the About button, the Lessons button "a mint outline with a book
   icon"; the HUD's ▤ at the HUD section is a scene button and is left as it
   is), NOTICE.md (Web fonts names the Plex families; a new "Interface icons"
   subsection credits Lucide, ISC, with its licence text, and Feather's MIT
   portions; the "own pictures" item points to it).

### Tests changed

- `tests/web-fonts.test.ts`, new case: the URL asks for exactly
  `IBM Plex Sans Thai`, `IBM Plex Sans`, `IBM Plex Mono`, in that order. The
  existing cases are unchanged.
- `tests/section-nav-model.test.ts`, new case "draws only icons the sprite
  has": every section id, every level, every `href="#i-…"` in `index.html` and
  every `icon('<name>'` in `src/ui/**/*.ts` must be a `<symbol id="i-…">` in
  `index.html`, and the list must contain `help`, `lessons`, `chev` and
  `profile`, so a pattern that stops matching fails. With `#i-help` renamed in
  `index.html` the case fails (`#i-help: expected false to be true`); restored,
  it passes.
- No assertion was removed or loosened; no test pinned the glyphs, the fonts,
  the gold or any letter-spacing value.

### Files

`index.html`, `src/style.css`, `src/ui/web-fonts.ts`, `src/ui/dialogs.ts`,
`src/ui/section-nav-model.ts`, `src/ui/section-nav.ts`, `src/ui/help.ts`,
`src/ui/lessons/lesson-mode.ts`, `src/ui/lessons/lessons.css`,
`src/ui/charts.ts`, `src/ui/onboard.ts`, `src/ui/rendezvous-plot.ts`,
`src/ui/map.ts`, `src/ui/build/tunnel-map.ts`, `src/render/cosmonaut.ts`,
`tests/web-fonts.test.ts`, `tests/section-nav-model.test.ts`, `README.md`,
`docs/USER-GUIDE.md`, `NOTICE.md`, `changes/claude-friendly-keller-78iuc9.md`,
this report.

### Measured (this container, `npx vite build`, then `node scripts/bundle-budget.mjs`)

| | S0 | S1 | change |
|---|---|---|---|
| `dist/index.html` | 13,070 B | 15,296 B | +2,226 B (the sprite's 14 symbols and the four `<use>` icons) |
| `index-*.css` | 177,340 B (177.3 / 179 kB) | 177,492 B (177.5 / 179 kB) | +152 B |
| `index-*.js` | 2,653,921 B (2653.9 / 2655 kB) | 2,653,439 B (2653.4 / 2655 kB) | −482 B |
| `i18n-*.js` | 1,732,544 B (1732.5 / 1733 kB) | 1,732,544 B | 0 |
| other chunks | 771.4 / 772 kB | 771.4 / 772 kB | 0 |
| precache code | 14,675,404 B (14675.4 / 14679 kB) | 14,677,300 B (14677.3 / 14679 kB) | +1,896 B |
| precache | 15794.6 / 16078 kB | 15796.5 / 16078 kB | +1,896 B |
| precache data/ | 1119.2 / 1399 kB | 1119.2 / 1399 kB | 0 |
| `bundle budget` (with the build log) | ok | ok; no `INEFFECTIVE_DYNAMIC_IMPORT` | |

**Budget line: within the unchanged ceilings** (no `budgets.json` change).
Room left for S2–S3: `index-*.css` 1,508 B, `index-*.js` 1,561 B, precache
code 1,700 B.

Changed source lines: 176 in `src/` and `index.html` (+103 / −73), 20 in
`tests/` (+18 / −2).

### Tests run

| Command | Result |
|---|---|
| `npm run -s typecheck` | passed |
| `npx vitest run` web-fonts, section-nav-model, privacy-inventory, i18n, architecture, bundle-budget | 6 files, 50 / 50 passed (2 new cases) |
| `npx vitest run` camera-dialog-copy, chart-marker-export, chart-summary, rendezvous, report, vostok-render (they import changed modules), css-motion, repo-hygiene, hud-layout, telemetry-layout | 10 files, 106 / 106 passed |
| `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` | 94 / 94 passed |
| `npx vite build && node scripts/bundle-budget.mjs <build log>` | bundle budget: ok (table above) |
| `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tests/browser/run.mjs --dist <copy of this build> stage2-preflight r2-viewport-scene-floor` | 2 / 2 journeys passed in 444.2 s (r2-viewport-scene-floor 332.5 s: G2 S1–S6 in TH, EN and RU with the Thai rule; stage2-preflight 104.2 s: every top-bar tool on screen and hit at its centre at 320 px in EN, RU and TH) |
| Look check (scratch Playwright script, not committed) | TH and EN at 1700 px, RU at 1300 px, TH at 390 px: 34 `svg.icon` elements drawn, none blank |
| After the review fixes: stage2-preflight (with its new laptop check), r2-viewport-matrix, and the top-bar heights and widths before and after | see "S1 review fixes" below |

Not run here: the full `npx vitest run` (`select-checks` falls back to the full
set because `index.html` changed), the rest of the browser smoke set, heavy
and sixdof-fleet. CI runs them.

Docs touched: README (top-bar items, Typography), USER-GUIDE (My work, learner
profiles, privacy, Lessons button), NOTICE (web fonts, interface icons).
IMPLEMENTATION-STATUS: N/A.

Reviewers: the owner (a look change: screenshots in TH, EN and RU at 1720,
1300, 1240, 1040, 860, 640 and 320 px, online and offline; the breakpoints are
the ones after the review fixes below).

### S1 review fixes

Same change type (look change). Seven findings: six applied, one left for a
separate bug-fix PR.

1. **The top bar is as wide as at S0 again.** At d07f597 the Campaign tab ran
   over the Lessons button: a click at the button's centre opened the Campaign
   menu in EN at 1100 px and TH at 1181 px. `src/style.css` `.icon` is 1 em (was
   1.15 em). `src/ui/modes.css`: `.nav-chev` gets `margin-inline: -0.25em` (the
   chevron path uses only the middle half of its box, so it takes the old ▾'s
   room); the sections' icons give way at 1240 px (`.nav-tab-btn .mode-glyph
   { display: none }` moved out of the 1040 px block into its own block; the
   tabs' padding stays at 1040 px; the 860 px block still shows the icons on the
   phone row).
2. **The tools' labels and the product name give way earlier.** With the Plex
   fonts the switch is wider online too: the tool labels and the language label
   now hide at 1720 px (was 1600 px), the product name at 1300 px (was 1180 px).
   Only the brand rule moves; the shared 1180 px layout breakpoints stay. The
   give-way comment in `modes.css` says the widths were measured again in Thai
   and English, and no longer says "measured in Russian".
3. **The phone top bar keeps its height.** Inside the 640 px block,
   `#topbar .quiet-btn { padding: 7px 5px; }` keeps the tools on one row (they
   stay at least 27 px wide).
4. **Forced colours.** `src/ui/lessons/lessons.css`:
   `@media (forced-colors: active) { .lesson-btn[aria-current='page'] { border: 2px solid Highlight; } }`.
   It uses the border, not the outline, so the `:focus-visible` ring still
   shows.
5. **Thai letter-spacing claim.** "What changed" item 2 above now says the rule
   covers the app's own document, and that the owner's Soyuz Anatomy pages keep
   their tracking. Nothing is injected into those pinned pages.
6. **Branch and fragment** (SESSION-PROTOCOL §5, `changes/README.md`). S1 has
   its own branch, `claude/u-redesign-a-s1`, stacked on S0 (waiting: merges
   after S0), and its own fragment, `changes/claude-u-redesign-a-s1.md`, with
   S1's CHANGELOG line and PROGRESS row. S0's fragment holds only S0's line and
   row again (as at `5bef72f`). CHANGELOG.md and PROGRESS.md are untouched. The
   local `claude/friendly-keller-78iuc9` was not moved; S0's PR is its commit
   `5bef72f`.
7. **Not applied here: the Russian tabs already ran over the tools at S0.** It
   is a bug fix (one change type per PR), and the fix the review measured
   (an ellipsis on the tab names) changes the look, so it is left for a separate
   bug-fix PR and the owner. After these fixes Russian is better than at S0 at
   most widths, but not at all of them (below).

New regression check: `tests/browser/journeys/stage2-preflight.mjs` runs its
toolbar check on a laptop too, in EN and TH at 1100×800 and 1181×800: every
top-bar tool on screen and hit at its centre. RU is left out until item 7 is
fixed. No check was removed or loosened.

Choices taken in these fixes under "mix sensibly" (the owner can reverse each
at the screenshot review): the give-way widths 1720 / 1300 / 1240 px, the
tighter tool padding on a phone, the forced-colours border, and leaving the
anatomy pages' tracking as the owner made them. The package's choices list
above is unchanged.

Owner's authorization, 2026-11-05, in chat, verbatim: "เริ่มทำได้เลยครับ
โหมดการเรียนที่คุณเสนอ ให้ใช้เฉพาะตอนที่เป็นโหมดการเรียนในบทเรียนเท่านั้นครับ
ส่วนรูปแบบอื่นๆ จัดแบบผสมให้เหมาะสมเลยครับ เช่น โหมดรับชม
ให้เน้นเห็นภาพจำลองมีแค่ข้อมูลพื้นฐานประกอบพอ".

#### Measured top bar (Chromium, offline fonts, scratch Playwright script, not committed)

Height of `#topbar` in px, `#/launch/engineer`, 740 px tall:

| | S0 `5bef72f` | S1 `d07f597` | S1 with the fixes |
|---|---|---|---|
| EN 320 px | 139 | 173 | 135 |
| RU 320 px | 180 | 173 | 173 |
| RU 340 px | 139 | 173 | 135 |
| RU 560 px | 100 | 135 | 100 |
| the other 26 cases (EN, RU, TH at 320–860 px) | | | at or below S0 |

How far the last section tab runs past the start of the tools, in px
(`#/launch/explore`; negative = room left), S0 / S1 / S1 with the fixes:

| Width | EN | TH | RU |
|---|---|---|---|
| 1000 | 16 / 67 / 29 | 4 / 55 / 17 | 136 / 187 / 149 |
| 1041 | 74 / 129 / 12 | 61 / 117 / 0 | 194 / 249 / 132 |
| 1100 | 15 / 70 / −31 | 2 / 58 / −37 | 135 / 190 / 73 |
| 1181 | 38 / 93 / −72 | 25 / 81 / −78 | 158 / 213 / −8 |
| 1240 | −19 / 34 / −101 | −25 / 22 / −107 | 99 / 154 / −41 |
| 1601 | 74 / 130 / −194 | 28 / 84 / −200 | 288 / 343 / −134 |
| 1680 | −5 / 51 / −233 | −33 / 5 / −239 | 209 / 264 / −173 |
| 1760 | −50 / −23 / −45 | −73 / −45 / −68 | 129 / 184 / 139 |
| 1800 | −70 / −43 / −65 | −93 / −65 / −88 | 89 / 144 / 99 |

Tools covered at their centre (14 widths from 1000 to 1800 px): with the fixes,
none in EN or TH (d07f597: `#btn-lessons` at 1000, 1041, 1100, 1181 and
1601 px in both). In RU, none from 1181 to 1720 px (S0 had `#btn-lessons`
covered at every one of them); still covered at 1000, 1041, 1100, 1760 and
1800 px, as at S0, and at 1000 px `#btn-help` is now covered too (13 px more
than S0). That is inside the old Russian overlap of item 7.

**Budget line: within the unchanged ceilings** (no `budgets.json` change).
`index-*.css` 177,492 → 177,658 B (+166 B; 177.7 / 179 kB), `index-*.js`
2,653,439 B and `dist/index.html` 15,296 B unchanged, precache code 14677.5 /
14679 kB, precache 15796.7 / 16078 kB. Room left for S2–S3: `index-*.css`
1,342 B, `index-*.js` 1,561 B, precache code about 1,534 B.

Files: `src/style.css`, `src/ui/modes.css`, `src/ui/lessons/lessons.css`,
`tests/browser/journeys/stage2-preflight.mjs`,
`changes/claude-friendly-keller-78iuc9.md`, `changes/claude-u-redesign-a-s1.md`
(new), this report.

| Command | Result |
|---|---|
| `npm run -s typecheck` | passed |
| `npx vitest run` web-fonts, section-nav-model, privacy-inventory, i18n, architecture, bundle-budget | 6 files, 50 / 50 passed |
| `npx vite build && node scripts/bundle-budget.mjs <build log>` | bundle budget: ok (numbers above); no `INEFFECTIVE_DYNAMIC_IMPORT` |
| `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tests/browser/run.mjs --dist <d07f597's CSS, the new check in place> stage2-preflight` | failing before: 0 / 1, 4 failures (`#btn-lessons` covered in EN and TH at 1100×800 and 1181×800) |
| `… --dist <copy of this build> stage2-preflight` | 1 / 1 passed in 132.5 s |
| `… --dist <copy of this build> r2-viewport-matrix` | 1 / 1 passed in 787.8 s (journey 785.9 s, every part including the phone TORU part; no FAIL lines) |
| `… --dist <copy of this build> r2-viewport-scene-floor` | 1 / 1 passed in 334.5 s (G2 S1–S6 in TH, EN and RU) |

Not run here: the full `npx vitest run`, the rest of the browser smoke set,
heavy and sixdof-fleet. CI runs them.

## S2 — Watch scene-first: the clock block at the top centre, one lower-third caption, nothing over the middle

Change type: **look change** (visual; the owner reviews it on screenshots).
Branch `claude/u-redesign-a-s2`, stacked on S1 (waiting: merges after S1);
fragment [`changes/claude-u-redesign-a-s2.md`](../../../changes/claude-u-redesign-a-s2.md).
Docs touched: N/A (USER-GUIDE's "just the picture, three numbers … and one
sentence" is still true; README and IMPLEMENTATION-STATUS do not describe where
Watch puts them).

Reviewers: the owner (a look change: the Watch face, soyuzIss at about T+124 s,
at 1440×900, 1100×650, 390×844 and 844×390 in TH, EN and RU).

Owner's authorization, 2026-11-05, in chat, verbatim: "เริ่มทำได้เลยครับ
โหมดการเรียนที่คุณเสนอ ให้ใช้เฉพาะตอนที่เป็นโหมดการเรียนในบทเรียนเท่านั้นครับ
ส่วนรูปแบบอื่นๆ จัดแบบผสมให้เหมาะสมเลยครับ เช่น โหมดรับชม
ให้เน้นเห็นภาพจำลองมีแค่ข้อมูลพื้นฐานประกอบพอ". This step is the "เช่น
โหมดรับชม ให้เน้นเห็นภาพจำลองมีแค่ข้อมูลพื้นฐานประกอบพอ" part: the scene
first, only the basic information beside it.

### Choices in this step (taken under "mix sensibly"; the owner can reverse each at the screenshot review)

- The scene first: the full-width dark band behind the bottom of the scene
  (`.watch-bottom::before`) is gone; only two small cards are left on the scene.
- A compact clock block at the top centre, between the mission title and the
  state chip: its label, the mission time large, then altitude · speed on one
  line. It is the existing three readouts (`watch.stat.*`, the same values and
  formatting), moved and restyled; the numbers are in `var(--mono)` (IBM Plex
  Mono online, the system monospace offline).
- One caption card at the bottom left (max 640 px, a 3 px accent edge), the
  beat label in sentence case at 15 px with no letter-spacing (EN and RU were
  upper case and tracked), the sentence at 17 px (15.5 px on a phone).
- The existing controls (play, speeds, follow, Choose a launch) stay where
  they were, at the bottom, with the same classes.
- Nothing over the middle of the scene: the parking-orbit note (A9) moves from
  the top centre, where it would cover the clock, to just above the caption.
  After the review fixes it is there only where the lower third has room: in a
  short scene and in a scene up to 640 px wide it is back at the top centre, as
  before S2, and for its 12 s (it can be closed) it covers the clock, and in a
  short scene the camera tabs too. "Nothing over the middle" holds down to
  667×375. It does not hold in landscape scenes 640 px wide or less: there the
  caption and the camera tabs cover the centre, as they did before S2
  (measured below, "S2 review fixes").
- On a phone (≤ 860 px) the title and the state share the first row and the
  clock gets its own row under them (mockup E5); the time is 26 px there.
  After the review fixes a short scene from 720 to 860 px wide keeps the clock
  on the title row.
- The state chip is pinned to the last column, so it stays at the right while
  the launch list hides the clock.
- In a short scene (< 380 px, `data-short`, G2 compact) the clock is one line
  (its label kept) and the caption's sentence is cut to one line with an
  ellipsis; the whole sentence is still in the caption's text, which is the
  live region. After the review fixes the whole caption is that one line: the
  beat label, the sentence and the real-flight line side by side.
- The lesson strip hides in Watch and on the landing page only
  (`body[data-section='home']`), not in the Orbit or Build sections, where
  case and design lessons are answered in it.
- Not in this step: the `.hud-fold` fix (the fold button in a short Watch
  scene); it is a bug fix and goes in a separate bug-fix PR with its own
  regression check.

The package's choices list at the top of this report is unchanged.

### What changed

1. `src/ui/watch.ts`. The stats block is a field (`this.stats`); the
   constructor puts it in the scene's top band, before `#sim-state`
   (`root.parentElement?.querySelector('#sim-state')?.before(this.stats)`: the
   fx3 test's mock root has no parent, so there it simply stays detached). The
   `.watch-bar` wrapper is gone: `.watch-bottom` holds the parking note, the
   caption, the Moon note and the controls. The parking note's inline style is
   `position: static` in that column (it was absolute at the top centre; the
   review fixes move its position to `modes.css`). The
   launch list hides the clock (`this.stats.hidden` in `openPicker` /
   `closePicker`), as `.watch-ui.picking .watch-bottom` did when the clock was
   in the bottom band. No i18n key, logic or ARIA change: the caption keeps
   `aria-live="polite"`, the note `role="status"`, `#sim-state` its
   `aria-live`.
2. `src/ui/modes.css`. The Watch hide list gets `.lesson-strip`, and
   `body[data-section='home'] .lesson-strip` joins the same rule (the home
   mode's list is unchanged, because the Orbit and Build sections are `home`
   to the launch simulator). The Watch overlay rules are replaced: no scrim;
   the caption and the clock share one card look (`rgba(10, 16, 24, 0.88)`,
   `var(--line)`, radius 14 px); `body[data-mode='watch'] .scene-top` is a
   three-column grid (`minmax(0, 1fr) auto minmax(0, 1fr)`; two columns and a
   second row for the clock at ≤ 860 px); `body:not([data-mode='watch'])
   .watch-stats { display: none }` keeps the clock out of Explore and
   Engineer; the short-scene lines; the old 860 / 640 px stats sizes are gone.
   Specificity: `body[data-mode] .scene-top` (0,2,1) beats `.scene-top`
   (0,1,0) in style.css, whose `align-items: flex-start` still applies.

### Tests changed

- `tests/browser/journeys/watch-controls.mjs` (smoke). In every pass (mouse,
  keyboard, touch), right after the first launch is flying: the clock block has
  a box and sits wholly above `#camera-tabs`; there is exactly one
  `.watch-caption[aria-live="polite"]`; and nothing of the clock, the lower
  third, the title, the state, the camera tabs or the scene tools covers the
  centre of `#viewport`. The touch pass checks the same at 844×390 (and that
  the scene is short there, `data-short=true`) and goes back to its size. At the end of the mouse
  pass: Escape closes the list, the clock is back, and after
  `#/launch/explore` it is not visible (scene-floor's `OVERLAYS` cannot see a
  clock leaking into the top band).
- `tests/browser/journeys/teaching-held.mjs` (smoke). Case 6.1 (track 6, a
  built-in self-study lesson) opens the Orbit section with its strip on screen,
  which a hide rule on `body[data-mode='home']` would have broken.
- No assertion was removed or loosened, no timeout lengthened.

### Files

`src/ui/watch.ts`, `src/ui/modes.css`,
`tests/browser/journeys/watch-controls.mjs`,
`tests/browser/journeys/teaching-held.mjs`,
`changes/claude-u-redesign-a-s2.md` (new), this report.

Changed source lines: 82 in `src/` (+43 / −39), 48 in `tests/` (+48 / −0).

### Measured (this container, `npx vite build`, then `node scripts/bundle-budget.mjs`)

**Budget line: within the unchanged ceilings** (no `budgets.json` change).

| Group | S1 with its fixes | S2 | Ceiling |
|---|---|---|---|
| `index-*.css` | 177,658 B | 178,283 B (+625 B; 178.3 kB) | 179 kB |
| `index-*.js` | 2,653.4 kB | 2,653,495 B (2653.5 kB) | 2655 kB |
| `i18n-*.js` | 1732.5 kB | 1732.5 kB | 1733 kB |
| other chunks | 771.4 kB | 771.4 kB | 772 kB |
| precache code | 14677.5 kB | 14,678,147 B (14678.1 kB) | 14679 kB |
| precache | 15796.7 kB | 15797.3 kB | 16078 kB |

The CSS is 145 B over the plan's +0.48 kB: the two critique fixes (the
short-scene sentence on one line, the state chip pinned to its column), the
landing-page strip rule and `max-width: min(640px, 100%)` (a cut sentence
cannot push the caption past a narrow scene). Room left for S3: `index-*.css`
717 B, `index-*.js` 1,505 B, precache code 853 B. S3's plan estimate is
+0.49 kB of CSS and about +0.5 kB of precache code, so it still fits, with
little to spare.

The Watch face, soyuzIss paused at T+02:04, Chromium, offline fonts (a scratch
Playwright script against this build, not committed; screenshots in the
session's scratchpad for the owner's review). Pixels from the top of the page;
"middle" is what covers the centre of `#viewport`:

| Size | Scene (top, height, centre y) | Short | Clock (top–bottom) | Camera tabs top | Lower third top | Middle (parking note hidden) | Sentence cut |
|---|---|---|---|---|---|---|---|
| 1440×900 | 60, 840, 480 | no | 74–174 | 182 | 728 (RU 703) | nothing | no |
| 1100×650 | 60, 590, 355 | no | 74–174 | 182 | 478 (RU 453) | nothing | no |
| 390×844 | 135, 709, 490 | no | 202–293 (TH 294) | 301 (TH 302) | 614 (RU 591) | nothing | no |
| 844×390 | 89, 301, 240 | yes | 138–181 (TH 182) | 189 (TH 190) | 256 | nothing | yes |

The same in EN, TH and RU except where marked. In the 844×390 phone landscape
the lower third starts 16 px below the scene's centre with the sentence cut to
one line; the critique's estimate for a two-line sentence put it above the
centre. On a phone (≤ 860 px) the clock card spans the scene's width, under
the title and the state.

This table is the `3f70452` build, measured with the parking-orbit note hidden.
The review fixes below change the 844×390 row: the clock is back on the title
row and the lower third now starts at 279, not 256. They also add rows with the
note shown, and rows for 640×360 and 568×320.

### Tests run

| Command | Result |
|---|---|
| `npm run -s typecheck` | passed |
| `npx vitest run tests/watch-logic.test.ts tests/hud-layout.test.ts tests/css-motion.test.ts tests/architecture.test.ts` | 4 files, 60 / 60 passed |
| `npx vitest run tests/fx3-thai-moon-labels.test.ts tests/watch-missions.test.ts tests/i18n.test.ts tests/bundle-budget.test.ts tests/telemetry-layout.test.ts` | 5 files, 69 / 69 passed (WatchView on the mock root unchanged) |
| `npx vite build && node scripts/bundle-budget.mjs` | bundle budget: ok (numbers above) |
| `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tests/browser/run.mjs --dist <copy of this build> watch-controls r2-flight-shell teaching-held` | 3 / 3 passed in 436.4 s (watch-controls 135.6 s, mouse, keyboard and touch passes with the new checks; r2-flight-shell 236.0 s, Watch camera tabs and Cinematic; teaching-held 53.1 s with case 6.1) |
| `… --dist <copy of this build> watch-controls`, again after its 844×390 step also asserts that the scene is short | 1 / 1 passed in 145.7 s |
| `… --dist <copy of this build> r3-first-launch` | 1 / 1 passed in 109.8 s |
| `… --dist <the S1 build; Watch unchanged since d07f597> watch-controls teaching-held` | failing before: watch-controls 4 failures (the clock is not in the top band, mouse / keyboard / touch / touch at 844×390); teaching-held passes (it guards the hide rule S2 could have broken) |

Not run here: the full `npx vitest run`, the rest of the browser smoke set,
heavy and sixdof-fleet. CI runs them.

### S2 review fixes

Same change type (look change). Ten findings. Seven are applied, one of them
with a different value; one is applied only in this report, because another
fix replaces its code change; two are not applied, with the reasons given.

1. **The parking-orbit note goes back to the top centre where the lower third
   has no room.** Two findings: with the note shown, it covered the scene's
   centre at 390×844 (473–604 against 490) and in short scenes (844×390: 137–246
   against 240; 915×412: 146–256 against 236). `src/ui/watch.ts` now sets only
   the note's padding inline. `src/ui/modes.css` puts it in the lower-third
   column (`.watch-milestone { position: static; transform: none; width:
   min(460px, 100%) }`, after the `.watch-card` rule) and moves it back to the
   top centre, where it was before S2, in a short scene (`[data-short=true]`,
   top 16 px) and in a scene up to 640 px wide (top 12 px). With the note
   shown, the centre is clear at every size measured from 1440×900 down to
   667×375, in EN, TH and RU (table below). Trade-off: in those scenes the note
   covers the clock for its 12 s (it can be closed), and in a short scene the
   camera tabs too, as it covered the top band before S2.
   *Not applied:* the other finding's CSS (the note's sentence cut to one line
   at ≤ 860 px). It would cut the note for sighted phone users, and in an
   844×390 scene the note would still cover the centre (181–269). The parts of
   that finding about this report are applied (item 6).
2. **A short scene's caption is one line.** The beat label sat on its own line
   above the sentence, which was cut, so the real-flight line or the Moon note
   pushed the caption over the centre. `[data-short=true] .watch-caption` now
   takes the nowrap / ellipsis cut, and its children go inline
   (`display: inline; margin-right: 8px`), as the narration does in
   `style.css`. `[hidden]` still hides an empty `.watch-real`. At 844×390 the
   caption is 279–327, 48 px tall, in EN, TH and RU.
3. **A short scene from 720 to 860 px wide keeps the clock on the title row.**
   At 860 px and below the clock took a second row even in a short scene. That
   pushed the Russian camera tabs over the centre at 800×360 and 740×360.
   A new `@media (min-width: 720px) and (max-width: 860px)` block gives
   `[data-short=true]` the three columns again and resets the clock's grid
   area. The tabs are back at 153–189 at 720–844 px in EN and RU (TH 153–190).
   The lower bound stays at 720 px: at 667 px the Russian clock would run into
   the state chip. New check: the touch pass of `watch-controls` switches to
   Russian, sets 800×360, asserts a short scene and runs the layout checks,
   then goes back to English and its own size. On the `3f70452` build it fails
   (one failure: "touch at 800×360 in Russian: the middle of the Watch scene is
   covered by camera-tabs"). With the fixes it passes.
4. **The clock's column is capped.** The middle track was `auto`. A wrapping
   flex row's max-content is all three readouts on one line, so Apollo 11's
   long Moon labels made the clock about 715 px wide. It ran over the state
   chip and squeezed the title at 861–1024 px. The track is now
   `fit-content(31rem)`, in the base rule and in item 3's block. *Changed
   value:* the finding proposed 28rem. With this page's 15 px root font, 28rem
   is 420 px, narrower than the Russian one-line short-scene clock (456 px). At
   28rem the one-line clock wrapped to two lines in TH and RU at 915×412,
   1100×420 and in the 720–860 px band, pushing the tabs down 22 px. 31rem
   (465 px) keeps every language's real clock on one line and still caps the
   Moon case. With the worst-case strings ("Above the Moon" / "Speed relative
   to the Moon" and their TH/RU strings, T+102:34:56) there is no overlap of
   title, clock and state, and no clipped title, in EN, TH and RU at 1440×900,
   1280×800, 1024×600, 900×700, 861×800, 1100×420, 915×412 and 720–844 px short
   scenes. The title keeps at least 102 px. Cost: under the cap the Moon
   clock wraps in a short scene, to two lines (RU three), and the camera tabs
   move down 22 px (RU 43 px); in Russian at 720–800×360 they then reach the
   centre, where the Moon note's caption (item 5) already covers it.
5. **The Moon note gets the caption's backing.** Without the bottom scrim it
   stood over the Earth's day side at 1.79–4.15:1. `src/ui/watch.ts` gives it
   `padding: 3px 10px; border-radius: 8px; background: rgba(10, 16, 24, 0.88)`,
   margin 0 (the −8 px would make it touch the caption card) and no text
   shadow: 6.45:1 even over white (computed). Cost: the lower third is 14 px
   taller while the note shows. In a scene 360 px tall (720–800×360) on Apollo
   11's Moon leg, the one-line caption then starts at 214, 11 px over the
   centre (225). Before this fix it started at 228. At 844×390 the caption is
   clear by 4 px (244 against 240). The contrast fix is kept: it is a WCAG
   1.4.3 failure, and the overlap only happens on that leg. In a tall phone
   scene the leg's caption also covers the centre at 360×740 (EN, RU),
   375×667 and 320×740 once the real-flight line shows too (measured below).
6. **This report.** The S2 measured table's middle column now says it was
   measured with the note hidden. The S2 choices say where "nothing over the
   middle" stops holding (below 667×375 in landscape, as before S2). Rows with
   the note shown, and rows for 640×360 and 568×320, are in the table below.
7. **The browser smoke set was run on this build** (both shards; results
   below), and `r2-viewport-scene-floor` too.
8. *Not applied:* hiding the caption visually while the note is up in a small
   scene. Item 1 already takes the note out of the lower third in every scene
   where this finding measured the stack running into the top band (320×740,
   844×390, 915×412). There the note no longer sits on top of the caption.
   This finding's fix would leave the note in the lower third, where in an
   844×390 scene it would reach the centre (a two- or three-line note, 88 px
   or more, above the controls). What is left is item 1's trade-off: for up
   to 12 s the note covers the camera tabs in a short scene (a keyboard user's
   focused tab can be under it). It can be closed, and it covered them the
   same way before S2. It is listed for the owner's screenshot review.
9. *Not applied:* limiting the short-scene cut to touch screens
   (`@media (pointer: coarse)`). A desktop zoomed to 150–200 % has a short
   scene too, and there the caption's sentence is cut to one line (56–68 % of
   it visible); screen readers still get all of it from the live region. The
   cut follows the owner's G2 compact answer (2026-10-06: "ฉากเตี้ยกว่า 380 px:
   ย่อป้ายให้เหลือบรรทัดเดียว และพับการ์ดเทเลเมทรีเป็นปุ่ม"), which is set by
   the scene's height, not by the pointer. The narration already drops its
   prose the same way on a zoomed desktop. Without the cut, the wrapped caption
   would reach 10–27 px past the centre. This is the owner's call (WCAG 1.4.4 /
   1.4.10 against G2 compact), so it is listed for the screenshot review and
   nothing is changed.

Files: `src/ui/modes.css`, `src/ui/watch.ts`,
`tests/browser/journeys/watch-controls.mjs`, `changes/claude-u-redesign-a-s2.md`,
this report. Changed source lines: 28 in `src/` (+20 / −8), 11 in `tests/`
(+9 / −2).

#### Measured (this container, `npx vite build`, then `node scripts/bundle-budget.mjs`)

**Budget line: within the unchanged ceilings** (no `budgets.json` change).

| Group | S2 (`3f70452`) | S2 with its review fixes | Ceiling |
|---|---|---|---|
| `index-*.css` | 178,283 B | 178,863 B (+580 B; 178.9 kB) | 179 kB |
| `index-*.js` | 2,653,495 B | 2,653,459 B (−36 B; 2653.5 kB) | 2655 kB |
| `i18n-*.js` | 1732.5 kB | 1732.5 kB | 1733 kB |
| other chunks | 771.4 kB | 771.4 kB | 772 kB |
| precache code | 14,678,147 B | 14,678,691 B (+544 B; 14678.7 kB) | 14679 kB |
| precache | 15797.3 kB | 15797.9 kB | 16078 kB |

Room left for S3: `index-*.css` 137 B, `index-*.js` 1,541 B, precache code
309 B. S3's plan estimate (+0.49 kB of CSS, about +0.5 kB of precache code)
no longer fits: S3 has to make that room with an identical-output offset of
its own, or stop and ask the owner (D-38). No ceiling changes here.

The Watch face on this build, soyuzIss paused about 3 s after the launch,
Chromium, offline fonts (the same kind of scratch Playwright script, not
committed; screenshots in the session's scratchpad). "Note" is the
parking-orbit note forced on with a sentence of its real length in each
language. Pixels from the top of the page; the same in EN, TH and RU (TH
within 1 px) except where marked:

| Size | Short | Centre y | Clock | Camera tabs | Caption | Middle, note hidden | Note, shown | Middle, note shown | The note covers |
|---|---|---|---|---|---|---|---|---|---|
| 1440×900 | no | 480 | 74–174 | 182–221 | 728–826 | nothing | 609–718 | nothing | nothing |
| 1100×650 | no | 355 | 74–174 | 182–221 | 478–576 | nothing | 359–468 | nothing | nothing |
| 1024×600 | no | 330 | 74–174 | 182–221 | 428–526 | nothing | 309–418 | nothing | nothing |
| 861×800 | no | 430 | 74–174 | 182–221 | 628–726 | nothing | 509–618 | nothing | nothing |
| 390×844 | no | 490 | 202–293 (RU 222–313) | 301–366 (RU 321–386) | 614–731 (RU 591) | nothing | 147–257 (RU 147–279) | nothing | the clock |
| 360×740 | no | 438 | 202–293 (TH, RU 222–313) | 301–366 (TH, RU 321–386) | 487–627 (TH 510) | nothing | 147–279 | nothing | the clock |
| 375×667 | no | 401 | 202–293 (RU 222–313) | 301–366 (RU 321–386) | 414–554 (TH 437) | nothing | 147–279 (TH 147–257) | nothing | the clock |
| 320×740 | no | 438 | 222–313 (RU 237–328) | 321–386 (RU 336–430) | 487–627 (RU 463) | nothing | 147–279 | nothing | the clock |
| 1100×420 | yes | 240 | 74–118 | 126–165 | 297–346 | nothing | 76–186 | nothing | clock, tabs |
| 915×412 | yes | 236 | 74–118 | 126–165 | 289–338 | nothing | 76–186 | nothing | clock, tabs |
| 844×390 | yes | 240 | 101–145 | 153–189 | 279–327 | nothing | 105–215 | nothing | clock, tabs |
| 800, 740 and 720×360 | yes | 225 | 101–145 | 153–189 | 249–297 | nothing | 105–215 | nothing | clock, tabs |
| 667×375 | yes | 232 | 138–181 | 189–226 | 264–312 | nothing | 105–215 | nothing | clock, tabs, camera tools |
| 640×360 | yes | 230 | 148–192 | 200–237 | 249–297 | camera tabs (TH nothing) | 116–225 | camera tabs (TH nothing) | clock, tabs, camera tools |
| 568×320 | yes | 210 | 148–192 | 200–237 | 209–257, over the tabs | camera tabs, caption | 116–225 | camera tabs, note, caption | clock, tabs, camera tools |

In a short scene the caption is one line, 48 px tall, in every language. The
title keeps at least 106 px (RU 720×360).

The Moon case, forced on the same page: Apollo 11's long Moon labels and
T+102:34:56 in the clock (the strings of item 4), the Moon note and the
real-flight line. Title, clock and state never overlap, and the title keeps
at least 102 px. The centre stays clear from 1440×900 down to 861×800, at
390×844, 1100×420, 915×412 and 844×390 (caption 244 against 240). It is
covered by the caption at 720–800×360 (214 against 225; in RU the camera tabs
too, 196–233, under the three-line clock), at 360×740 (EN 428, RU 410 against
438; TH clear), at 375×667 and at 320×740 (all three; in RU at those two
sizes the caption also runs over the camera tabs), and in the 640 px and
narrower landscape scenes. This case was not measured on the `3f70452`
build; there the Moon note was 14 px lower and the short-scene clock had no
cap.

#### Tests run

| Command | Result |
|---|---|
| `npm run -s typecheck` | passed |
| `npx vitest run tests/watch-logic.test.ts tests/hud-layout.test.ts tests/css-motion.test.ts tests/architecture.test.ts` | 4 files, 60 / 60 passed |
| `npx vite build && node scripts/bundle-budget.mjs` | bundle budget: ok (numbers above) |
| `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tests/browser/run.mjs --dist <copy of this build> watch-controls r2-flight-shell` | 2 / 2 passed in 346.0 s (watch-controls 124.7 s, with the new 800×360 Russian step; r2-flight-shell 210.5 s) |
| `… --dist <the 3f70452 build> watch-controls` | failing before: 1 failure, "touch at 800×360 in Russian: the middle of the Watch scene is covered by camera-tabs" |
| `… --dist <copy of this build> --smoke --shard=1/2` | 8 / 8 passed in 394.3 s |
| `… --dist <copy of this build> --smoke --shard=2/2` | 8 / 8 passed in 622.4 s (the smoke set's 16 journeys; the five held teaching journeys are not run, as on main) |
| `… --dist <copy of this build> r2-viewport-scene-floor` | 1 / 1 passed in 292.3 s |
| `… r2-viewport-scene-floor` on the `3f70452` build (the review's run) | 1 / 1 passed in 489.8 s |

Not run here: the full `npx vitest run`, heavy and sixdof-fleet. CI runs
them.

Choices taken in these fixes under "mix sensibly" (the owner can reverse each
at the screenshot review): the note at the top centre in short and ≤ 640 px
scenes (covering the clock, and in a short scene the tabs, for up to 12 s);
the 720 px lower bound; `fit-content(31rem)`; the Moon note's backing, at the
cost of 11 px over the centre in a 360 px tall scene on the Moon leg; the
short-scene caption cut kept on zoomed desktops. The package's choices list
above is unchanged.

Owner's authorization, 2026-11-05, in chat, verbatim: "เริ่มทำได้เลยครับ
โหมดการเรียนที่คุณเสนอ ให้ใช้เฉพาะตอนที่เป็นโหมดการเรียนในบทเรียนเท่านั้นครับ
ส่วนรูปแบบอื่นๆ จัดแบบผสมให้เหมาะสมเลยครับ เช่น โหมดรับชม
ให้เน้นเห็นภาพจำลองมีแค่ข้อมูลพื้นฐานประกอบพอ".
