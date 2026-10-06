# FX-1 s3 — opening a design over unsaved changes asks first / เปิดแบบทับงานที่ยังไม่บันทึกต้องถามก่อน (M-BUILD-007)

```yaml
envelope: v2
package: FX-1 (Build data safety)
step: s3
wave: K1
lane: B
items: [M-BUILD-007]
priority: {M-BUILD-007: P1 (data loss)}
change_kind: bug-fix; failing regressions committed first
owner_authorization: {date: 2026-10-05, quote: "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high", scope: "wave K1 (D-65)"}
decisions_used: [D-75 ("A rating-only recompute does not count as a design edit; design identity follows the parts."), D-63]
plan: plan v2.0 S10 §10.4 (FX-1), row M-BUILD-007; §10.12 (numeric-drafts after M-LEARNING-005, merged)
base_sha_verified_on: {sha: bdbfeff, date: 2026-10-06, recheck: "review round: origin/main 095806a adds 1a7960e (R1.6 PR 2b: src/main.ts, src/ui/workspace-mission.ts), records and a workflow; no file of this branch; `git merge-tree` with it is clean, and the size is measured against a build of 095806a"}
branch: claude/b-fx1-s3
files: [src/ui/build/explore-store.ts, src/ui/build/explore-level.ts, src/ui/build/satellite-workspace.ts, src/ui/build/satellite-level.ts, src/ui/build/requirements-page.ts, src/ui/build/build-screen.ts, src/i18n/en.ts, src/i18n/th.ts, src/i18n/ru.ts, tests/build-unsaved-open.test.ts, tests/browser/journeys/build-unsaved-open.mjs]
not_touched: [src/design/**, src/physics/**, stored formats (design store, kept drafts), CSS, budgets.json, existing tests]
failing_before_fix: [unit tests/build-unsaved-open.test.ts 13 of 15 on bdbfeff, journey build-unsaved-open on bdbfeff, review round — 3 more unit tests and a journey step on f00b288 (commit 46ed9a7)]
size: {against: "origin/main 095806a, and this branch merged onto it", precache_code_kB: "14723.3 → 14727.6 (+4.3; ceiling 14724, over by 3.6)", index_js_kB: "2629.4 → 2632.8 (+3.4; ceiling 2632, over by 0.8)", i18n_js_kB: "1723.4 → 1724.3 (+0.9; ok)", index_css_kB: "177.0 → 177.0", review_round: "+0.2 kB code"}
review: second agent (P1, storage-adjacent) before merge; budget needs the owner
```

## What was wrong (on `bdbfeff`)

Nothing in `src/ui/build` asked before a design took the place of the one on screen:

- **Open** in the rocket designer's and the satellite designer's "Your designs" (`ExploreStore.openRecord` → `host.open`) replaced the design at once.
- **Import a file** kept the file, then opened it the same way; a file of the other kind was opened in the other designer the same way (`openSaved`, `SatelliteLevel.open`).
- **A requirements row** (`RequirementsPage.openRow`) put its design on the satellite bench (`SatelliteWorkspace.replace`).
- **In a design lesson** (T01) both of the last two replaced the lesson's design on the desk, so the student's lesson work was lost while the lesson stayed open with its locks on a design that was not the lesson's. The only put-aside in the code was the student's own design while a lesson is open (`enterLesson`/`leaveLesson`).

A student who changed a design and opened another lost the change with no word, unless they had saved it first.

## The fix

**When it asks.** `ExploreStore.unsaved(record?)` asks the designer which design opening `record` would replace (`ExploreStoreHost.replacing`), then compares:

| The design that would be replaced | Asks? |
|---|---|
| saved, and as its record (payload ratings aside, D-75) | no |
| saved, but changed since (a part, a number, its name) | yes |
| its record is gone (deleted in another tab, or here) | yes |
| never saved, as it started: an untouched catalogue remix, the first parts design, a template, a requirements row as opened, with its default name (which follows the interface language) | no |
| never saved and changed, or renamed | yes |
| refused by the checker (cannot be saved) | yes; "Save it, then open" then says why |

The rocket designer keeps two drafts (remix and parts) and a record opens over the draft of its own kind (`draftFromSpec(...).mode`), so that is the draft checked; when it is not the one shown it is brought on screen first, so the question and "Save" are about the design the student sees. The payload the figures are read at is not part of a kept rocket and is not compared.

**The question.** `askReplace` (in `explore-store.ts`) is the existing delete-confirm pattern: an inline `role="alert"` line in the design's row of "Your designs" (or under the requirements row), with **Save it, then open** (keyboard starts here), **Open without saving**, and **Cancel**; Escape is Cancel, which puts the keyboard back on Open. Only existing classes (`bx-store-row`, `bx-confirm`, `watch-btn`): no CSS added.

- "Save it, then open" saves over the design's own record (as Save does; as a new one if it has none), then opens. If the save fails, what the store says is shown (in the store, or under the requirements row) and nothing is opened.
- An imported file is kept either way; when the question is asked, the message says it was saved, not opened.

**A design lesson.** Opening one of the student's own designs (Open, import, or a requirements row) during a lesson puts the lesson's desk aside (`SatelliteWorkspace` `park`): the student's own design, date and air come back on the desk, and the question, if any, is about that design. `BuildScreen.showDesignLesson` (the lesson strip's "open the design", and a check or hand-in with no lesson desk open) calls `resumeLesson`, which puts the lesson's design back as the student left it, with its date, air level and locks. Leaving or starting a lesson drops the parked desk as before. The browser keeps only the student's own draft, as before.

**Stored formats.** Unchanged: the design store, `orbitlab.build.explore.v1` and `orbitlab.build.satellite.v1` hold the same fields (a test reads the kept satellite draft's keys back).

### Where the code and the plan text differ

- S10 lists the choices as "save / keep aside (recoverable from the draft list) / discard". The code has no draft list (each designer keeps one draft per kind in the browser), and the item must not change a stored format, so there is no separate "keep aside": **Cancel** keeps the design on screen, and **Save it, then open** keeps it in "Your designs", from which it is reopened. A student who wants both the old record and the change keeps them with Cancel, then "Save as new".
- S10 names a step "in journey M-BUILD-024". No such journey is in `tests/browser/journeys` (M-BUILD-024 is `partial` in the registry), so the step is a new journey, `build-unsaved-open`.

### Not in this item (other Build paths that still replace a design without asking)

Package-level (S10 §10.4 acceptance "no path in Build drops an unsaved design without asking"), left for the rest of FX-1: the rocket designer's vehicle picker (`pickBase`) and "Start over", the Engineer level's "open in Explore" for a sized launcher (`openDesign`), and the satellite designer's template picker. Each is a deliberate "start from this" action, not an open, and each would take the same `askReplace`.

## Tests

### Failing first

Commits, all test-only, before the fix commit `b6c338a`:

- `81b9016` — `tests/build-unsaved-open.test.ts` (13 tests) and the journey.
- `17b6ffd` — two rocket tests corrected before the fix: they opened a record of the other kind (parts over a remix draft), which replaces the other draft and so rightly asks nothing; they now reopen the draft's own record, or a second remix. Still failing on `bdbfeff`.
- `44b1e26` — the journey typed into the stretch slider (`stretch:0:1`) instead of its number box (`stretch:0:0`); its satellite part, the one that fails on `bdbfeff`, is unchanged.
- `aebb0a5` — two more: a never-saved design that was only renamed is a change; a default name given again in Thai is not.

Unit, run against `bdbfeff`'s `src/` (13 of 15 failing; the two that pass are "opens at once" cases the fix must keep):

```
× asks, and replaces nothing, when the design on screen has changes no saved record keeps
× "Save, then open" keeps the changes in the design's own record, then opens the other
× opens at once over a design that is as it was saved, or never saved and as it started
× asks when the design's record is gone, or the design on screen was changed after it was saved
× asks before the row's design replaces a bench design with unsaved changes; "Open without saving" opens it
× opening a saved design during a lesson puts the lesson's design aside; back at the lesson, it is there as the student left it
× asks about the student's own unsaved design, put on screen with the lesson's aside
× asks, and opens nothing, over a changed draft never saved
× opens at once over a kept design as kept — a remix and a parts design — and over one whose ratings alone differ (D-75)
× asks about the draft the record would replace, and puts it on screen: a parts design changed while a remix is shown
× "Save, then open" keeps the changed draft in its own record, then opens
× in the satellite designer
× in the rocket designer
AssertionError: expected { id: 'skept', …(11) } to deeply equal { id: 'smuwu4kw0txxa', …(11) }
AssertionError: expected undefined to be null
TypeError: s.unsaved is not a function
AssertionError: expected { id: 'smuwu4kw0v88c', …(11) } to deeply equal { id: 'smuwu4kw0rng5', …(11) }
AssertionError: expected { …(4) } to be null
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
AssertionError: My Electron: expected "vi.fn()" to be called 2 times, but got 3 times
      Tests  13 failed | 2 passed (15)
```

Journey `build-unsaved-open` against a build of `bdbfeff`:

```
[build-unsaved-open] FAIL: opening a saved design over unsaved changes did not ask
[build-unsaved-open] FAIL: the design on screen was replaced without asking: "My NAPA-2 (6U CubeSat)", array 0.068
✗ build-unsaved-open (34.5 s)
```

Vitest runs in `node` (no DOM), so the unit tests run the store's and the requirements page's own methods on objects made from their prototypes, their drawing stubbed, over the real `SatelliteWorkspace`, `LocalDesignStore` (in memory) and explore model; the journey drives the page.

### After the fix

- `npx vitest run tests/build-unsaved-open.test.ts`: 15/15 (18/18 after the review round below).
- Related files (19 files, 223 tests, all pass): `build-unsaved-open`, `i18n`, `i18n-counts`, `d06-satellite-date`, `workspace-draft-flush`, `d06-build-orbit-handoff`, `d06-custom-satellite`, `architecture`, `build-legacy-ratings`, `d07-requirements-page`, `design-explore-drafts`, `phase4-walk`, `repo-hygiene`, `design-lessons`, `design-ref`, `design-store`, `explore`, `design-strip-progress`, `lessons-ui-core`. The full suite was not run locally (shared 4-CPU machine); CI runs it.
- `npm run -s typecheck`: clean.
- `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`: 66/66.
- Journeys (`CHROMIUM=/opt/pw-browsers/chromium node tests/browser/run.mjs …`): `build-unsaved-open` (54–64 s), `build-legacy-ratings`, `satellite`, `fx2-design-check-focus`, `requirements`, `lesson-packs`: 6/6 pass.
- Screenshots of the question in EN, TH and RU (for the owner, S10 §10.4 evidence) are written by the journey to `tests/browser/screenshots/build-unsaved-open-ask-{en,th,ru}.png` (not committed; the folder is ignored).

## Size

`npx vite build; node scripts/bundle-budget.mjs`, against a build of `bdbfeff` on the same machine (first round; the review round's figures against `origin/main` are below):

| Group | `bdbfeff` | this branch | change | ceiling |
|---|---|---|---|---|
| precache code | 14723.0 kB | 14727.1 kB | +4.1 kB | 14724 (over by 3.1) |
| `index-*.js` | 2629.1 kB | 2632.4 kB | +3.3 kB | 2632 (over by 0.4) |
| `i18n-*.js` | 1723.4 kB | 1724.3 kB | +0.9 kB | 1725 (ok) |
| `index-*.css` | 177.0 kB | 177.0 kB | 0 | 177 |

The budget check fails on precache code and `index-*.js`. `budgets.json` is not edited: the owner decides (raise for FX-1's data-safety work, as D-38's second round did for the FX-1 follow-up, or ask for a smaller fix). About 200 source lines added.

## Review round (blocking finding on `f00b288`)

**The finding (correct).** The question stays on screen while the student looks at another design, and its "Save it, then open" saved whatever design was on screen when it was clicked, not the design the question was about:

- Rocket designer: the remix untouched, the parts draft changed. Open on a parts record brings the parts draft on screen and asks. The student clicks the Remix tab (`setMode` redraws the store; the question stays), then "Save it, then open": the untouched remix was saved as a new record, and the open replaced the changed parts draft, unsaved.
- Satellite designer, during a lesson: the question parks the lesson. The lesson strip's "open the design" (`resumeLesson`) before the answer, then Save: the lesson's design was kept as one of the student's records, and the open that followed parked the lesson again and replaced the student's own unsaved design.
- The requirements page went through the same `saveFirst()`.

**Failing first** (commit `46ed9a7`, test-only; three unit tests and a journey step), on `f00b288`'s `src/`:

```
× "Save it, then open" keeps the student's own design, though the lesson's was brought back before the answer (review of f00b288)
× "Save, then open" keeps the student's own design, though the lesson's was brought back before the answer (review of f00b288)
× "Save, then open" keeps the draft the question was about, though the other draft was shown before the answer (review of f00b288)
AssertionError: the lesson's design kept as one of the student's: expected [ 'slesson' ] to not include 'slesson'
AssertionError: the lesson's design kept as one of the student's: expected [ 'slesson' ] to not include 'slesson'
AssertionError: the untouched remix was saved in place of the changed parts design: expected 'd4' to be null
      Tests  3 failed | 15 passed (18)

[build-unsaved-open] FAIL: "Save it, then open" did not keep the parts design the question was about: ["My NAPA-2 (6U CubeSat)","My THEOS-2-class imager","Electron remix","My rocket"]
✗ build-unsaved-open (57.4 s)
```

The journey step: save a parts design, rename it, Open it from the Remix tab (asked; the parts draft on screen), click the Remix tab, then "Save it, then open": the parts record must hold the new name. On `f00b288` the record kept its old name ("My rocket").

Before that, commit `1cdb5cf` (test-only) fixed the journey itself: closing the "ready offline" note for the owner's screenshot took the keyboard from the question, so when the note had appeared by then, the Escape that follows went to the page ("Escape did not close the question") and the journey stopped before the rocket part. The keyboard now goes back to the control that had it before the shot. No assertion changed.

**The fix** (commit `02a2d59`, the reviewer's first option). `ExploreStore.saveFirst(rec?)` first calls the designer's `replacing(rec)`, which puts the asked-about design back on screen: the rocket draft of the record's kind, or (satellite) the student's own design with a resumed lesson parked again. Then it saves, as before. When `replacing` says there is nothing to lose (never saved, as it started), nothing is saved and the open goes ahead. The store's question now calls `saveThenOpen(id)`, which fetches the record it asked about and passes it; a record deleted meanwhile is said by `openRecord` ("not found") and nothing is saved or opened. The requirements page passes no record (the bench is the student's own satellite). "Open without saving" was already right: the open replaces the draft of the record's kind, and parks a resumed lesson again. About 20 source lines in `explore-store.ts` (most of them comments), and a comment in `requirements-page.ts`; the branch is now about 215 source lines added.

**Checks after the fix.**

- `npx vitest run tests/build-unsaved-open.test.ts`: 18/18. The 19 related files above: 226/226.
- `npm run -s typecheck`: clean. `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`: 66/66.
- Journeys: `build-unsaved-open` (38 s), `build-legacy-ratings`, `requirements`, `satellite`: 4/4 pass.

**Size** against a build of `origin/main` `095806a`, and of this branch merged onto it (`git merge-tree`, clean), same machine:

| Group | `origin/main` | merged | change | ceiling |
|---|---|---|---|---|
| precache code | 14723.3 kB | 14727.6 kB | +4.3 kB | 14724 (over by 3.6) |
| `index-*.js` | 2629.4 kB | 2632.8 kB | +3.4 kB | 2632 (over by 0.8) |
| `i18n-*.js` | 1723.4 kB | 1724.3 kB | +0.9 kB | 1725 (ok) |
| `index-*.css` | 177.0 kB | 177.0 kB | 0 | 177 |

This round adds about 0.2 kB of code. `budgets.json` is not edited: the owner decides, as above.
