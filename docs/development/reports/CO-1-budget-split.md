# CO-1: separate code and data-snapshot precache ceilings

## Envelope

| Field | Value |
|---|---|
| Package | CO-1 (master plan v2.0, wave K0, lane T) |
| Step | 1 (single PR) |
| Items | M-PLATFORM-063 |
| change_kind | quality-improving (gate tooling); the app's output does not change, and nothing under `src/` changed |
| owner_authorization | 2026-10-05, decision sheet A-1: "D-65 (ก): wave K0 authorized; D-38 (ก)" |
| base_sha_verified_on | `5f9aa2e` (main tip, "Progress: record the publication of #80, #81 and #82 (#83)") |
| Branch / PR | `claude/t-co1-s1`, [PR #84](https://github.com/ROYIN001/Orbitlab/pull/84) |
| Files | `scripts/bundle-budget.mjs`, `budgets.json`, `tests/bundle-budget.test.ts`, this report, one `CHANGELOG.md` line, one `docs/development/PROGRESS.md` row |

The owner's D-38 (ก) answer: "Split code and data-snapshot ceilings now; #76's +320 kB counts on the data side; #75/#77/#80 raises accepted with named offsets (index → EQ-7, i18n → EQ-6, precache/installed size → EQ-8; CSS approved explicitly); CO-1's data headroom is itself a D-38 approval."

## What changed

- `scripts/bundle-budget.mjs` reads the precache manifest from `dist/sw.js` as before. It still counts every entry once, and now it also splits the entries into two groups:
  - `precache data/`: every entry whose URL starts with `data/`. These are the three snapshots from `public/data`: earth-orientation, satellites and space-weather.
  - `precache code`: every other entry. That covers chunks, workers, CSS, `index.html`, icons, textures, lessons and the web manifest.
- Each group has its own ceiling in `budgets.json`. A build over the code ceiling fails with `code ceiling`. A build over the data ceiling fails with `data ceiling`. If the data has used more than 80 % of its headroom, the script prints a `WARNING:` line and does not fail. Headroom runs from the measured baseline in `_precache_split.dataBaselineKB` up to the data ceiling.
- The `precache` total ceiling stays at 16103 kB, and so does every other group's ceiling. The two new ceilings add up to exactly 16103 kB, so the total is not raised.
- The pure functions are exported for the unit tests: `groupPrecache`, `checkPrecacheSplit`, `precacheLimits`, `precacheManifest` and `DATA_PREFIX`. The check itself runs only when the file is run as a command, so `node scripts/bundle-budget.mjs [build.log]` and `npm run budget` run it (also through a symlink: the guard compares real paths). The split is checked when `budgets.json` names it, as every other group is; naming one of its three values without the others fails, so the gate cannot be half-configured. A `budgets.json` without the split (the CLI fixtures of `tests/verification/bundle-budget.test.mjs`) behaves exactly as before. It is still plain Node with no dependencies.
- PR CI (`ci.yml`) and Pages (`deploy.yml`) both run the same script with the same rule, so the code group gets the same check in both. Only the data group differs, because PR CI uses the committed snapshots and Pages uses refreshed ones. Neither workflow needed a change.
- `budgets.json` `_notes`: the new `d38` entry records the ruling and the named offsets. The `set` entries for `precache code`, `precache data/` and `precache` record the measured sizes and the reasons. The `groups` note describes the split.

## Before and after on the base build

The base build was made with `npx vite build` at `5f9aa2e` using the committed snapshots. I then ran `node scripts/bundle-budget.mjs build.log`.

| Group | Before: size / ceiling (kB) | After: size / ceiling (kB) | Result |
|---|---|---|---|
| precache (total) | 15822.7 / 16103 | 15822.7 / 16103 | ok, same bytes as before |
| precache code | not checked | 14703.5 / 14704 | ok |
| precache data/ | not checked | 1119.2 / 1399 | ok |
| every other group | unchanged | unchanged | ok |

Exact bytes at `5f9aa2e` (69 entries, manifest `17af3820ac2c9a`):

- Code: 14,703,533 bytes. That is chunks and workers 10,021,560, textures 3,824,557, lessons 783,585, icons 55,642, `index.html` 17,567 and `manifest.webmanifest` 622.
- Data: 1,119,201 bytes. That is satellites 1,018,936, earth-orientation 75,123 and space-weather 25,142.
- Total: 15,822,734 bytes, which equals code + data and is the same total the unmodified script reported.

## Chosen ceilings and why

**Code ceiling: 14704 kB.**
- The code group measured 14703.533 kB on main tip `5f9aa2e`. I rounded that up to the next whole kB, which gives +0.467 kB of headroom.
- This is the smallest rounding `budgets.json` uses. Other groups are rounded up by 1–3 kB, and I did not use the older +2 % convention. As a result, none of the 320 kB that #76 added to the single ceiling is left for code.
- Raising this ceiling requires D-38 with a named offset.

**Data ceiling: 1399 kB.**
- 1399 kB = 16103 − 14704. Per D-38 (ก), #76's +320 kB counts on the data side, so the data group gets what remains of the merged total.
- Headroom over the refreshed baseline of 1126.9 kB is 272.1 kB. At the higher measured growth rate (1.4 kB/day, below) that lasts about 193 days, and at the lower rate (1.0 kB/day) about 281 days. CO-1 asks for at least 90 days.
- The warning starts above 1126.9 + 0.8 × 272.1 = 1344.6 kB.
- This headroom is itself a D-38 approval and counts in KPI-30 and KPI-03.

**Data baseline: 1126.9 kB** (`_precache_split.dataBaselineKB`).
- This is the refreshed `data/` size in Pages 37223857005 and 37230585947.

## Data growth: method and numbers

Neither the GitHub Actions log download (it redirects to blob storage) nor the Pages artifacts could be fetched from this container: the proxy answered 403. So I could not read `dist/data` from Pages directly. Instead I worked it out from the budget tables that the Pages and PR CI build jobs print, which I read through the GitHub job-log API.

Method:
- Refreshed data ≈ Pages `precache` − the code group for the same app code.
- The code group = PR CI `precache` (committed snapshots, 1119.201 kB) − 1119.201.
- For `09cc2f5` and `77d3c00`, the code group is my local measurement at `5f9aa2e`. Those commits have the same app code: `git diff` outside docs, tests and `*.md` is empty, and Pages printed the same chunk sizes as my build.
- Each figure is printed to 0.1 kB, so each derived value is good to about ±0.1 kB.

| Run | SHA | Time (UTC) | Pages precache kB | Code group kB (source) | Refreshed data kB |
|---|---|---|---|---|---|
| committed snapshots | (fetched 2026-09-26 21:44Z / 09-27 14:37Z) | — | — | — | 1119.2 |
| Pages 37103651001 | `472645f` | 10-03 06:38 | 15737.9 | 14610.7 (PR CI 37102480388: 15729.9) | 1127.2 |
| Pages 37150596767 (cron) | `fbefa18` | 10-03 20:12 | 15729.8 | 14610.7 (same code as `472645f`) | 1119.1 |
| Pages 37172926281 | `7ddab75` | 10-04 03:05 | 15787.4 (budget failed) | 14659.5 (PR CI 37172156819: 15778.7, quoted from `budgets.json` `_notes`, not re-read) | 1127.9 |
| Pages 37193082491 | `1d5b76b` | 10-04 09:46 | 15789.3 | 14659.5 (same code as `7ddab75`; only `budgets.json` differs) | 1129.8 |
| Pages 37223857005 | `77d3c00` | 10-04 18:19 | 15830.4 | 14703.5 (local at `5f9aa2e`) | 1126.9 |
| Pages 37230585947 | `09cc2f5` | 10-04 20:04 | 15830.4 | 14703.5 (local at `5f9aa2e`) | 1126.9 |

I also compared pairs of runs on unchanged code. With the code the same, the precache delta equals the data delta:
- `472645f` → `fbefa18`: −8.1 kB in 13.6 h.
- `7ddab75` → `1d5b76b`: +1.9 kB in 6.7 h.
- `77d3c00` → `09cc2f5`: 0.0 kB in 1.75 h.

Short-term, the size moves both ways by a few kB. There is no steady day-to-day climb.

Long-term rate, from the committed fetch (2026-09-26 21:44Z) onward:
- To the latest refresh (1126.9 kB, 7.93 days later): +7.7 kB, about 1.0 kB/day.
- To the highest refresh seen (1129.8 kB, 7.50 days later): +10.6 kB, about 1.4 kB/day. I used this higher rate for the 90-day check: 90 days ≈ 127 kB, well inside the 272.1 kB headroom.

The committed snapshots have not changed since `0cc79d9` (2026-09-28); they were fetched 2026-09-26/27. The Deploy runs I looked at only cover 2026-10-03 to 2026-10-04, so this is about 8 days of measured growth. The rate should be checked again once more cron runs exist.

## Tests actually run

- **Unit tests written first, run on base:** `npx vitest run tests/bundle-budget.test.ts` with the new tests and the unmodified `scripts/bundle-budget.mjs` and `budgets.json` gave **6 failed | 2 passed (8)**. The 2 that passed are the two existing tests. The 6 new tests failed for the expected reasons: `AssertionError: expected undefined to be 'data/'`, `TypeError: groupPrecache is not a function` (four tests) and `TypeError: precacheLimits is not a function`.
- **After the change:** `npx vitest run tests/bundle-budget.test.ts tests/repo-hygiene.test.ts` passed, **17 of 17** across 2 files. The new tests cover:
  - code + data equals the old single sum, and only paths under `data/` count as data;
  - data growth within the headroom passes;
  - data past 80 % of the headroom warns without failing;
  - data over its ceiling fails with "data ceiling" and not "code ceiling";
  - code over its ceiling fails with "code ceiling" and not "data ceiling";
  - the two ceilings in `budgets.json` add up to no more than `precache`.
- **`npm run typecheck`** (`tsc --noEmit`): passed with no errors.
- **`node scripts/bundle-budget.mjs build.log` on the base build:** `bundle budget: ok`. The total precache was 15822.7 kB, the same as the unmodified script reported on the same `dist/`.
- **The command line on the real base `dist/`, with files grown temporarily** (I restored them and the final run printed ok again):
  - Data at the refreshed baseline: data 1126.9 kB, total 15830.4 kB (the same as Pages 37230585947). Result: ok.
  - Data +230 kB (1349.2 kB): `WARNING: … 222.3 of its 272.1 kB headroom (82 %) is used`. Result: ok, exit 0.
  - Data +290 kB (1409.2 kB): `FAIL: data ceiling`, exit 1.
  - Code +1.0 kB (`index.html`): `FAIL: code ceiling`, exit 1.
- **`npm run snapshots`** (a refresh from the network): all three sources answered 403 through this container's proxy. The script kept the committed snapshots and made no change. I could not do a refreshed build locally; the refreshed figures above come from Pages logs.

## PR CI, the first failure and its fix

- The first PR CI runs (37254601510 on `1b6b935`, 37254611751 on `47641b9`) failed in `plan`: `node --test tests/verification/*.test.mjs` failed 7 of 59. The existing CLI fixture test `tests/verification/bundle-budget.test.mjs` writes `budgets.json` files without the new keys, and the first version of the script refused any `budgets.json` without them. The author had run only the vitest files; this Node test was missed. The independent second-agent review found the same failure.
- Fix: the split is enforced when `budgets.json` names it, and a partial split fails. The existing fixture tests are unchanged and pass again, including "nonfinite ceilings cannot disable enforcement", which again fails on the `1e999` ceiling it was written for rather than on a missing key. Four CLI tests were added to that file (data/ counted apart and passing; code over → "code ceiling" only; data over → "data ceiling" only, and 80 % → warning with exit 0; half-configured split fails). Scope note: `tests/verification/bundle-budget.test.mjs` is not in CO-1's listed files; it is the existing CLI test of the same script, so the new cases were added there rather than in a new file. The fixture helper gained an optional `data` argument; no existing case changed.
- Also from the review: the import guard resolves `argv[1]` with `realpathSync` (run through a symlink it used to exit 0 silently), and on GitHub Actions the 80 % warning is also printed as a `::warning::` annotation so it shows in the run summary.
- Local after the fix: `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` 63/63; `npx vitest run tests/bundle-budget.test.ts tests/repo-hygiene.test.ts` 17/17; `npm run typecheck` clean; `npm run budget` ok (code 14703.5 / 14704, data 1119.2 / 1399, total 15822.7 / 16103).
- Second-agent review: confirmed the grouping, the totals, `budgets.json` and `_notes.d38` against the owner's ruling, the tests and the report's numbers (4 of 6 claim areas); CI and Pages were not confirmed because of the failure above, which this fix addresses. The PR CI run on the fixed head is recorded on the PR.

## Limitations

- The refreshed data sizes are derived from rounded budget tables, not read from `dist/data` in Pages; the artifacts could not be downloaded here (403).
- The growth rate rests on about 8 days and 6 Pages runs. Data can also shrink: at `fbefa18` it was 0.1 kB below the committed size.
- Code headroom is 0.5 kB. Any code change that adds more than that to the precache will fail `code ceiling` until a raise is approved under D-38 with a named offset. That is intended under criterion (2), but it means CO-2's ceiling review will see requests.
- The named offsets (EQ-1, EQ-6, EQ-7, EQ-8) and their sizes are the plan's assumptions, not yet measured. Only EQ-8 offsets the installed (precache) size. EQ-1 and EQ-6 reduce downloaded bytes, not the precache.
- No speed or performance claim is made.

## Handoff

- After merge, the Pages run (and one cron or dispatch run) must pass the budget with refreshed snapshots. Record its run ID, the `precache code` and `precache data/` lines, and the deployment record in this report and in the PROGRESS row. **Criterion (6) stays open until then.**
- If Pages fails for a reason other than the budget, for example the `learner-profiles` journey timeout seen in Pages 37219398466 and 37223857005, do not re-run it blindly. Record the journey, the message and the run ID for M-PLATFORM-061 (R7.1), and let the owner choose between one full re-run and waiting for a fix.
- CO-2 (ceiling review table) can now use the D-38 entry in `budgets.json` `_notes`.
