# Stages 3 and 4: learning, trust and sustained use

This pass follows the October improvement plan: Stage 3 strengthens scientific evidence,
lesson review and experimentation; Stage 4 supports classroom preparation, backups and
maintenance. It preserves the existing physics and rendering settings.

## Delivered behavior

- A lazy-loaded My work dialog offers Experiments, Model limits, Prepare a class and Backups
  in English, Russian and Thai, with keyboard tabs and mobile layouts.
- Notebook entries retain predictions, chosen variables, complete flown mission inputs,
  manual commands, build provenance, displayed observation time and conclusions. Comparisons
  flag mismatched conditions. Restoring a mission does not claim to restore its trajectory.
- A repeatable scientific report records execution separately from published-reference
  acceptance, with source digests before/after collection. A bounded local viewer distinguishes
  historical findings from the current build and treats uploaded reports as unverified.
- Five bundled lesson packs have content-bound source/review metadata and an explicit human
  review checklist. No teacher approval, native-language approval or classroom timing is invented.
- Classroom preparation inspects the active service worker and actual cached responses,
  checks the current page against that version and repairs only matching SHA-256 content.
  It neither activates a waiting update nor downloads resources from a different app version.
- Project archives include four named saved collections. Strict validation precedes a preview
  with Keep existing defaults and explicit whole-collection replacement. A recovery journal
  retains prior values and refuses to overwrite observed later edits. Restoring reloads Home
  without stale shared-mission or lesson query parameters.

## Scope and limits

The Stage 1 Vega-C reference miss, sizing/fairing investigation and satellite observations
remain visible; this work does not tune physics or loosen scientific tolerances to hide them.
The report covers selected sizing, rating and satellite checks, not every physical model.
Use `npm run validate:science -- --check-references` to make reference misses fail the command.
Without that option, successful execution can coexist with a reported scientific miss.

All five curriculum packs remain drafts awaiting human review. External source URLs could
not be independently fetched in this cloud environment (gateway refusals); existing source
citations are retained without a new availability or accuracy certification.

Local storage can fail, be cleared or be edited by another tab. The import journal provides
checked recovery but cannot make multi-key localStorage writes atomic across tabs. Archives
exclude unsaved drafts, running trajectories, browser preferences and unrelated storage.
Notebook entries are bounded to 30 and 4 MB; archive imports to 8 MB; report imports to 1 MiB.
Classroom readiness is a current cache inspection and still needs an offline rehearsal on the
actual devices. No physical-device usability or frame-rate improvement is claimed.

## Validation

The focused checks cover notebook evidence and storage conflicts, strict archive validation
and recovery, lesson-review provenance, report import boundaries, cache integrity, translations,
architecture and repository hygiene. Real-browser journeys exercise flown experiments,
backup/download/restore, classroom operation without a network and workspace navigation.
`npm run validate:science` emits raw test outcomes and separate reference comparisons with the
source manifest; the PR records the final run and CI links. Generated evidence stays outside
the tracked source tree.

The combined build measured an initial index of 2536.9 kB, a shared catalog of 2201.1 kB,
and a lazy workspace chunk of 51.6 kB plus 4.8 kB CSS. The full precache was 15639.6 kB,
within its existing 15783 kB ceiling. New feature translations account for catalog growth;
the catalog still loads initially. Explicitly pure dictionary construction prevents unused
feature dictionaries from entering the instructor's recheck worker (884.5 kB, unchanged).
Worker and precache ceilings stay unchanged; the named workspace, catalog and global style
budgets record their specific reasons in `budgets.json`. These byte measurements do not claim
a frame-rate improvement or change simulation/rendering quality.

CI partitions the sorted smoke set automatically across two jobs, with a checked union and
no omitted or duplicated journeys. The full unit gate remains; deployment tests the
complete browser set against the site it publishes.
