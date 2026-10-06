# F5 offset (D-38): the built page without its source comments

| Field | Value |
|---|---|
| Package | D-38 offset for the G2 layout fix (finding F5); wave K1, lane T |
| change_kind | identical output (build only; no app code, no `budgets.json`) |
| owner_authorization | 2026-10-05, owner in chat: "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high" (K1 authorized, D-65) |
| Base | `06abb1f` (origin/main, published by Pages 37359895259) |
| Status | In PR; not merged; not published |

## Why

CO-1 (#84) set the precache **code** ceiling at the measured size rounded up
to the next whole kB: 14704 kB against 14703.5 kB at `5f9aa2e`. On `06abb1f` it
measures **14703.8 kB**, 0.2 kB under. The G2 layout fix (F5: the launch scene
keeps a minimum size in Explore and Engineer; its own PR) adds about 1 kB of
CSS and JS to the first view and measured **14704.8 kB**, over the ceiling.

D-38 lets a ceiling rise only with the measured size, the feature, a named
offset and the owner's approval. This PR is the other way round: it makes
the code group smaller by an identical-output change first, so F5 fits under
the **unchanged** 14704 kB ceiling and no raise is asked for.

## What changes

`index.html` carries 15 comments (2 630 bytes) for the people who read the
source. Vite copied them into the built page, which every visitor downloads
and the service worker precaches. A build plugin (`vite.config.ts`,
`htmlCommentsPlugin`, using `scripts/html-comments.mjs`) now drops them from
`dist/index.html`. The source file is unchanged.

Only the comment goes; the whitespace around it stays, so no two elements or
words that were apart come together.

## Why the output is identical

- Nothing in the app reads a comment node: the three uses of
  `firstChild`/`lastChild`/`nextSibling` in `src/` are on nodes the app
  creates itself (`loop-inspector.ts`, `telemetry.ts`, `chart-export.ts`).
- `tests/verification/html-comments.test.mjs`:
  - every comment in `index.html` sits between tags (a tag before it, a tag
    after it, only whitespace between) and never inside `<script>`,
    `<style>`, `<textarea>`, `<title>` or `<template>`;
  - the built page equals the source with exactly the comment spans cut out
    (computed independently by offset), with the same tags in the same order
    and the same text; the doctype is kept.

## Measured (this container, `npx vite build`, committed snapshots)

| | `06abb1f` | this PR |
|---|---|---|
| `dist/index.html` | 17 567 B | 14 914 B |
| precache code | 14703.8 kB | 14701.1 kB |
| precache data/ | 1119.2 kB | 1119.2 kB |
| `npm run budget` | ok | ok |

Budget line: **lowered** (usage); no ceiling changes. Per S09 rule 9 the T lane
lowers ceilings in its next ratchet PR, not here; the 2.7 kB is named as the
offset that the F5 PR uses.

## Tests run

| Command | Result |
|---|---|
| `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` | 66/66 passed |
| `npx vitest run tests/repo-hygiene.test.ts` | 9/9 passed |
| `npm run typecheck` | passed |
| `npm run build` then `node scripts/bundle-budget.mjs` | ok; 0 comments left in `dist/index.html` |

Docs touched: N/A (README, IMPLEMENTATION-STATUS and USER-GUIDE describe no build detail this changes).
