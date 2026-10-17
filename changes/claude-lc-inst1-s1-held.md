## CHANGELOG

- Lessons (owner, 2026-10-17): the site shows only the self-study lessons and the placement test; the teaching tools (Worksheets, Write a scenario and Check results pages and addresses, lesson packs, opening a lesson file, exporting results, lesson and scenario links, Prepare a class, the Orbit case worksheets) are held back behind one switch, `TEACHER_TOOLS` in `src/ui/held.ts`, with their code kept; their browser journeys are listed as held and not run, and the new journey `teaching-held` checks that nothing of them shows.

## PROGRESS

| Teaching tools held back (owner request 2026-10-17, DECISIONS "Decided 2026-10-17") | In PR; not merged; not published | One switch hides the teacher parts, code kept; 6 journeys held (case-worksheet-exports, classroom-preparation, instructor-loading, lesson-packs, recheck, fx2-design-check-focus), teacher steps skipped in mobile-smoke, profile-session-safety and workspace-navigation while held, new journey `teaching-held`; budget: no ceiling raised, `index-*.js` −626 B | [report](docs/development/reports/teaching-held.md) |
