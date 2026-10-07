---
package: FX-3
step: s2 (plan v2.0 S10 §10.6, PR order item 2)
items: [M-ORBIT-001, M-ORBIT-029]
priority: {M-ORBIT-001: P1, M-ORBIT-029: P2}
change_kind: bug-fix (stale copy shown as current; D-11 label missing)
owner_authorization: 'D-65, owner, 2026-10-05: "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high"'
decisions: [D-11]
base: 6fea83f (origin/main)
branch: claude/o-fx3-s2
wave_lane: K1 / O
status: In PR; not merged; not published
---

# FX-3 step 2 — the Thai satellites panel and Real satellites; the Moon labelled (M-ORBIT-001, M-ORBIT-029)

## What was wrong on `6fea83f`

- **M-ORBIT-001.** Under a Thai satellite's facts the note read "… its shape,
  not where the satellite is now. Following real satellites comes with the
  Orbit section's next phase." (`use.thai.nominal`, EN/TH/RU). Real
  satellites has followed the Thai group since R02, and nothing on the panel
  led there.
- **M-ORBIT-029.** D-11 (docs/DECISIONS.md) says the Moon "is labelled in the
  app … as 'Apollo 11's week only (DE441 table)'". No string in the app said
  so, and README's lessons 5.3–5.5 paragraph said "the Moon itself is not
  modelled".

## The fix

M-ORBIT-001:

- `use.thai.nominal` keeps its first sentence in all three languages ("The
  orbit is the catalogue's as of {date}: its shape, not where the satellite
  is now.") and drops the stale one. The THEOS-2 mass note (two sources
  differ, neither shown) is untouched (`src/data/thai-satellites.ts`).
- New button `use.thai.inSky` — "Show in Real satellites" / "แสดงใน
  ดาวเทียมจริง" / "Показать в разделе «Реальные спутники»" — under the note
  (`applications-panel.ts`, `AppsHost.showInSky`). The playground
  (`playground.ts`) enters Real satellites in real time and calls
  `RealSky.showForTour('thai', norad)`, the path a case lesson already uses:
  the Thai group on screen, the satellite picked once the catalogue is in.
- `thaiInSky(id)` (`src/orbit/playground-model.ts`): `{ group: 'thai', satnum }`
  for a satellite still up, null for NAPA-2 (re-entered 2026-07-05; the
  catalogue's GP sets are of objects in orbit) or an unknown id. It reads
  `reentered` instead of importing `THAI_NORAD_IDS` from
  `src/provider/satellites.ts`: `lifetime-altitude.ts` and
  `requirement-trades.ts` import the model, and that import put 0.4 and
  0.5 kB into their workers (measured). The test checks the two lists agree
  for every Thai satellite.
- **THEOS-2A check.** Not added. Public reports (Khaosod English, 13 Jan 2026,
  "Thailand Says Failed THEOS-2A to Fall Into Indian Ocean"; The Register,
  14 Jan 2026, "India's flagship PSLV rocket fails for the second time in a
  row"; TCIJ, "THEOS-2A Launch Fails After Rocket Malfunction") say it was
  lost when PSLV-C62 failed on 2026-01-12 (launch designation 2026-F01). It
  never reached orbit, so it has no catalogue number in orbit: the 2026-09-26
  snapshot's Thai group has seven sets (THEOS-2, THEOS, NAPA-1, Thaicom 4, 6,
  8, AsiaSat 6/Thaicom 7) and no THEOS-2A, and CelesTrak's `NAME=THEOS`
  answer has nothing to add. If the owner wants the lost satellite mentioned
  (a "lost at launch" entry with its sources), that is a data change in
  `src/data/thai-satellites.ts`, outside this package's files.

M-ORBIT-029:

- Watch (`src/ui/watch.ts`): a line under the caption, `watch.moonScope` —
  "The Moon: Apollo 11's week only (DE441 table)" / "ดวงจันทร์:
  เฉพาะสัปดาห์ของอะพอลโล 11 (ตาราง DE441)" / "Луна: только неделя полёта
  «Аполлон-11» (таблица DE441)" — shown exactly while the frame carries
  `apollo`, which is when `main.ts` places the Moon (`scene.setMoon`). It is
  outside the caption's `aria-live` region (a standing label, not news) and
  styled inline: no CSS added (the main CSS chunk is at its ceiling).
- README (the lessons 5.3–5.5 sentence, two lines): "the lesson's injection
  is an apogee raise to 370 000 km; the Moon is modelled for Apollo 11's week
  only, from JPL's DE441 table, in Watch's Apollo 11 flight".
- Unchanged and checked: no file in `src/orbit/**` or `src/ui/orbit/**` reads
  `moonState`, `moonPosition` or `lunar/ephemeris` (D-11: no general Orbit
  tool points at the Moon before L01).

## Where the plan and the code differ (the code was followed)

- **Files.** S10 §10.6 lists `src/ui/orbit/**`, `playground-model.ts`, keys
  `use.thai.*`, `pg.rep.*`, `sky.*` and README for FX-3, but asks for the
  Moon label "in Watch". The Orbit section never draws the Moon; the only
  place the app shows it is the Launch section's Watch flight of Apollo 11.
  So the label is in `src/ui/watch.ts` with one new key, `watch.moonScope`.
- **"Apollo lessons".** Lesson 5.5 (`adv-apollo`, `src/lessons/builtin/track5.ts`)
  flies `satelliteId: 'apollo'` to an apogee raise with no `orbit.injection`,
  so `ApolloFlight` never starts and the Moon is neither modelled nor drawn
  there. Its own text ("The Moon itself is not modelled here") is true for that
  flight and was left alone (lesson text is not this package's).
- **Not labelled here.** "Try a copy" of Watch's Apollo 11 in Explore
  (`tryWatchCopy` → `watchMissionSettings`) keeps `orbit.injection`, so that
  flight can draw the Moon in the Launch workspace, whose HUD is lane I's
  (`main.ts`). A follow-up for lane I: the same `watch.moonScope` line in the
  workspace HUD while `frame.apollo` is set.

## Tests

Written first and committed alone (`a3e154b`), then one test-only correction
(`8eb5d34`): the first version also imported `README.md?raw`, which
`tests/verification/workflow-paths.test.mjs` refuses (README is a Markdown file
CI skips; a test may read Markdown only when it is gated). The guard was not
touched; the README check was dropped from the unit test, and the plan leaves
document text to R7.5's tests. README was checked by grep instead:

```
$ git grep -n "the Moon itself is not modelled" -- README.md   # (none)
$ git grep -n "week only" -- README.md
README.md:132:the Moon is modelled for Apollo 11's week only, from JPL's DE441 table, in Watch's Apollo 11 flight).
```

Failing before the fix (`8eb5d34`, `npx vitest run tests/fx3-thai-moon-labels.test.ts`):

```
× no longer says that following real satellites is still to come, in any language
× knows which Thai satellites Real satellites shows: the Thai group, by catalogue number
× offers "Show in Real satellites" for each satellite in the Thai group, and it opens that one (en)
× offers "Show in Real satellites" for each satellite in the Thai group, and it opens that one (th)
× offers "Show in Real satellites" for each satellite in the Thai group, and it opens that one (ru)
× offers no Real satellites button for NAPA-2, which has re-entered
× the playground opens Real satellites on the Thai group with that satellite picked (source)
× Watch labels the Moon while it is on screen, and only then
× says it in Thai and Russian too
AssertionError: expected 'The orbit is the catalogue\'s as of {…' not to match /next phase|comes with/i
AssertionError: playground-model exports thaiInSky: expected 'undefined' to be 'function'
AssertionError: theos2: one button naming Real satellites: expected [] to have a length of 1 but got +0
AssertionError: theos2: one button naming ดาวเทียมจริง: expected [] to have a length of 1 but got +0
AssertionError: theos2: one button naming Реальные спутники: expected [] to have a length of 1 but got +0
AssertionError: expected 'Thailand\'s satellitesNAPA-2The Royal…' not to match /next phase/i
AssertionError: the apps host has a showInSky handler: expected '' not to be ''
AssertionError: the Moon is drawn: its scope is said: expected [] to have a length of 1 but got +0
AssertionError: en: expected [] to have a length of 1 but got +0
Tests  9 failed | 2 passed (11)
```

The two passing before are guards: the catalogue sentence is kept as it is,
and no Orbit tool reads the Moon's ephemeris.

New journey `tests/browser/journeys/fx3-thai-in-sky.mjs` (not smoke): in EN,
TH and RU, Orbit · Explore → What satellites do → Thailand's satellites →
THEOS-2 → "Show in Real satellites"; Real satellites must open on the Thai
group with THEOS-2 (58016) picked, and the offline data mode must make no
request to CelesTrak. On the main build (`6fea83f` code):

```
FAIL: en: the Thai panel still says tracking comes later: … Following real satellites comes with the Orbit section's next phase.
FAIL: en: no "Show in Real satellites" button under THEOS-2
FAIL: th: the Thai panel still says tracking comes later: … การติดตามดาวเทียมจริงจะมาในระยะถัดไปของส่วนวงโคจร
FAIL: th: no "แสดงใน ดาวเทียมจริง" button under THEOS-2
FAIL: ru: the Thai panel still says tracking comes later: … Слежение за настоящими спутниками — следующий этап раздела «Орбита».
FAIL: ru: no "Показать в разделе «Реальные спутники»" button under THEOS-2
✗ fx3-thai-in-sky (38.8 s)
```

After the fix (branch build): `✓ fx3-thai-in-sky (39.9 s)`, CelesTrak requests 0.

Run on the branch head:

- `npx vitest run tests/fx3-thai-moon-labels.test.ts tests/i18n.test.ts tests/i18n-counts.test.ts
  tests/architecture.test.ts tests/orbit-playground.test.ts tests/applications.test.ts
  tests/watch-logic.test.ts tests/watch-missions.test.ts tests/sky-tour.test.ts
  tests/orbit-handoff.test.ts tests/repo-hygiene.test.ts tests/section-plan.test.ts`: 12 files, 172/172.
- `npx vitest run tests/d07-coverage.test.ts tests/imaging.test.ts tests/d06-build-orbit-handoff.test.ts
  tests/d07-trades.test.ts tests/maneuver-setup.test.ts tests/d07-inverses.test.ts tests/case-lessons.test.ts`
  (the other importers of the touched modules): 7 files, 87/87.
- `npm run typecheck`: clean.
- `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`: 66/66.
- Journeys on the branch build: `fx3-thai-in-sky` ✓ (39.9 s), `mobile-smoke` ✓ (76.3 s), `watch-controls` ✓ (200.5 s; mouse, keyboard and touch: every control answered).
- Screenshots for the owner (local, not committed): the Thai panel and Real
  satellites in TH/EN/RU from the journey, and Watch's Apollo 11 at T+14:07
  with the Moon label in TH/EN/RU (an ad-hoc script; the label appeared about
  100 s into the flight at 100×).

## Size

`npx vite build; node scripts/bundle-budget.mjs`, main (`6fea83f` code) against the branch:

| group | main | branch | delta |
|---|---|---|---|
| index-*.js | 2 629 116 B | 2 629 814 B | +698 B |
| i18n-*.js | 1 723 438 B | 1 723 625 B | +187 B |
| index-*.css | 176 994 B | 176 994 B | 0 |
| workers | — | — | 0 |
| precache code | 14 723.0 kB | 14 723.9 kB | +0.9 kB (ceiling 14 724.0 kB) |

Budget: ok. `budgets.json` not edited. The first version of `thaiInSky`
imported `THAI_NORAD_IDS` and went over the code ceiling by 0.8 kB (workers
+0.9 kB); reading `reentered` instead removed that.

## Records

Not edited: `CHANGELOG.md`, `docs/development/PROGRESS.md`. The fragment is
`changes/claude-o-fx3-s2.md`.
