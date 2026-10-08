# EQ-1: the precache does not download a first visit twice

This is EQ-1 of the master plan v2.0 (S09 §09.5). It covers M-PLATFORM-021: a first visit downloaded the app twice because the service-worker precache fetched every file past the browser's cache. EQ-1 comes after FX-7 step 0 (PR #102), which changed the same function and added the revision check this change reuses (D-63).

```yaml
envelope: v2
package: EQ-1
step: 1                      # the package's single PR
family: EQ
wave: K1
lane: T
items: [M-PLATFORM-021]
priority: {M-PLATFORM-021: P1}
change_kind: perf (identical cache contents); tests written failing first
or_ids: [OR-1, OR-2]
owner_authorization: {date: 2026-10-05, quote: "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high", scope: "D-65 K1"}
base: {branch: origin/main, sha: 1a7960ee296651e3a7678039ed3810b583456dc2, date: 2026-10-06}
base_sha_verified_on: {sha: 1a7960e, recheck: "src/pwa/sw-core.ts precache(): Promise.all over every entry, scope.fetch(url, { cache: 'reload' }), revision checked (FX-7 step 0) — present"}
files: [src/pwa/sw-core.ts, tests/pwa.test.ts]
not_touched: [manifest format, cache names, prepareOffline (repair path), respond(), register.ts, vite.config.ts]
kpi_targets: {KPI-02: "bytes sent twice on a first visit, 9,438.5 kB -> 0 (plan); measured 9,469.2 -> 15.1 kB (index.html only)"}
report: docs/development/reports/EQ-1-s1-precache-transfer.md
```

## What failed

`precache()` in `src/pwa/sw-core.ts` downloaded every manifest entry that no older precache held with `scope.fetch(url, { cache: 'reload' })`. All the downloads ran at once under `Promise.all`. `reload` skips the browser's HTTP cache, so on a first visit every file the page had just loaded was downloaded a second time a few seconds later: the page, its main script, the dictionaries, the textures and the data snapshots. PB measured 9,438.5 kB of 15,834.2 kB at `5f9aa2e` (S01, KPI-02). On `1a7960e` the scratch measurement below finds 9,469.2 kB sent twice, in 15 files.

## Failing before the fix

The tests were committed alone first (`8493f47`, "regression — precache downloads again what the browser already holds"). They use a new fetch double, `browserScope`, in `tests/pwa.test.ts`. It puts a model of the browser's HTTP cache in front of the existing fake server. A request whose cache mode lets the browser answer from that cache gets the held copy without the network. A request with `reload`, `no-store` or `no-cache` goes to the server and is logged. The existing `fakeScope` fixture is not changed.

On `8493f47` (base code), `npx vitest run tests/pwa.test.ts`:

```
× reuses on a first visit the copies the page has just downloaded, verified, and downloads only the rest
× downloads again, past the HTTP cache, a held copy that is not its revision or was refused, and verifies the download
× holds only a few files in memory at once: at most six are fetched, verified and stored together
AssertionError: expected [ …(4) ] to deeply equal [ Array(1) ]
AssertionError: expected [ …(4) ] to deeply equal [ …(2) ]
AssertionError: expected 20 to be less than or equal to 6
Tests  3 failed | 21 passed (24)
```

The fourth new test passes on the base and after the fix. It is a guard: "fails the install when the held copy and the download past the HTTP cache are both other bytes, and the running version stays".

## The fix

`src/pwa/sw-core.ts`, +51/−20 lines, of which most are comments:

- **`fetchVerified(scope, url, entry)`, new.** It first asks with `{ cache: 'force-cache' }`. That returns the copy the browser already holds, or downloads the file normally when there is none. The bytes are hashed with `contentRevision`, the same SHA-256 check FX-7 step 0 and the repair path use. A copy is used only when it is `ok` and its revision is `entry.revision`. Otherwise the file is downloaded again with `{ cache: 'reload' }`, and that download goes through exactly the checks it went through after FX-7 step 0. A response that is not ok throws `precache: <url> answered <status>`. A response with other bytes throws `precache: <url> answered revision <got>, not <want>`. Either way the install fails and the running version stays.
- **`precache()`.** Copying from an older precache is unchanged: same revision, bytes checked. Every other file goes through `fetchVerified`. Files are fetched, verified and stored by six workers that take entries from one queue (`PRECACHE_CONCURRENCY = 6`), not all at once. After a failure no new file is started. The completion marker is written only after every file is stored, as before.
- The file's header comment says the first install takes the page's files from the HTTP cache.

What did not change: the cache contents (the same bytes under the same URLs), the cache name, the manifest and its version, the completion marker, the repair path `prepareOffline()` (it still uses `reload`), `respond()`, and the page side.

### Why `force-cache`, and why it is safe

`force-cache` returns any copy the browser holds, fresh or stale. That alone could store a stale copy, which is why the base code used `reload`. Here no copy is stored unless its bytes hash to the manifest revision. A stale or foreign copy therefore costs one local read and one hash, and is then replaced by a verified download. A 64-bit revision match means the bytes are the build's bytes.

The `default` mode would reuse a copy only while the server's `Cache-Control` says it is fresh. That would work on GitHub Pages (`max-age=600`, and the install starts seconds after the page loads). It would not work on a server that sends `no-cache` or no freshness at all, such as this repository's journey server or a school's intranet copy, where the result would be a full second download. With the revision check in place, `force-cache` gives the same result on any server. The measurements below cover both kinds of header.

### Where this differs from the plan text, and why

The S09 §09.5 text said to try option (ข) first. That text is in the plan v2.0 draft (`sections/S09-eq-identical-output.md`); S09 is not among `docs/development/plan/*.md` on `main`. It proposed `cache: 'no-cache'`, a conditional request per file answered by 304. It allowed option (ก), reuse with a revision check and a `reload` fallback, "only if (ข) does not reach KPI-02", because (ก) "must buffer responses to hash them". The code has changed since: on `1a7960e`, FX-7 step 0 already buffers and hashes every response in `precache()`. So (ก) adds no buffering over the base. (ข) would still send about 70 requests per install and needs the server to send validators: on a server with neither ETag nor Last-Modified, a `no-cache` request is a full download. The task for this branch asks for (ก): reuse the response the browser already has when its bytes match the manifest revision, falling back to `cache: 'reload'`. This change follows the code and the task, and says so here.

Option (ก) in the plan also asks for bounded concurrency and for hashing per entry. Both are done: six at a time, and each worker hashes its own entry. It also asks for the install's peak memory to be measured on a low-cost Android phone (HU-6) before merge. **That has not been done**, because no such device is available to this session. Compared with the base, at most six responses are in memory at once instead of every response in the manifest.

## Tests

New, in `tests/pwa.test.ts` (`describe('precache transfer without a second download (EQ-1, M-PLATFORM-021)')`):

1. A first visit where the page holds `index.html`, its script and the texture: only the physics worker reaches the network, every file is cached with its v1 bytes, and the completion marker is written.
2. A held v1 `index.html` (an earlier visit) and a kept 404 for v2's script, with v2 installing: both are downloaded again with `reload` and stored with v2's bytes. The correctly held texture never reaches the network.
3. Guard: v1 installed, then v2 installs while the browser holds v1's `index.html` and the server already answers a third deploy's. The install rejects naming `index.html` and a `reload` of it was tried. The new cache has neither that file nor the marker, and v1's cache keeps the same keys and bytes.
4. 20 files: at most six are between their fetch and their `cache.put` at once, more than one runs in parallel, and all 20 plus the marker are stored.

No existing test or assertion changed. The existing `fakeScope` ignores the cache mode, so its tests see one fetch per file as before. The `sw.fetched` lists asserted in "precaches every file…", "does not carry wrong bytes forward…" and "installs a new deploy beside the old one…" are unchanged and pass.

After the fix:

```
✓ reuses on a first visit the copies the page has just downloaded, verified, and downloads only the rest
✓ downloads again, past the HTTP cache, a held copy that is not its revision or was refused, and verifies the download
✓ fails the install when the held copy and the download past the HTTP cache are both other bytes, and the running version stays
✓ holds only a few files in memory at once: at most six are fetched, verified and stored together
vitest tests/pwa.test.ts tests/classroom-pwa.test.ts   2 files, 38 passed (38)
```

## Measured: one first visit

This is a scratch harness, not committed: `scratchpad/eq1tools/measure-first-visit.mjs`. It serves a build under `/Orbitlab/`, opens `#/explore` in Chromium 1194 (SwiftShader), waits for the worker to take the page and for the completion marker, and counts what the server sent. "Sent twice" is the bytes of every file answered 200 more than once. There are two header modes:
- **pages**, as GitHub Pages answers: `Cache-Control: max-age=600`, ETag, Last-Modified, 304 on a match.
- **nocache**, as `tests/browser/serve.mjs` answers: `Cache-Control: no-cache`, no validators.

Each row was run twice. The two builds are `origin/main` `1a7960e` and this branch.

| Build | Headers | Requests | kB sent | kB sent twice (files) | Controller (ms) | Precached entries |
|---|---|---|---|---|---|---|
| main `1a7960e` | pages | 84 | 25,323.2 | **9,469.2** (15) | 6,723 / 6,696 | 69 |
| main `1a7960e` | nocache | 84 | 25,323.2 | **9,469.2** (15) | 6,706 / 6,792 | 69 |
| this branch | pages | 70 | 15,869.4 | **15.1** (1) | 6,552 / 6,835 | 69 |
| this branch | nocache | 70 | 15,869.4 | **15.1** (1) | 6,860 / 7,100 | 69 |

A first visit now sends 9,453.8 kB less (−37 %) and 14 fewer requests, under both kinds of header. Time to offline-ready did not get worse: the medians are 6.7 s before and 6.8 s after, within the noise of this machine. The same 69 entries are cached (68 files and the completion marker).

The 15.1 kB still sent twice is `index.html` (15,076 B). The page is loaded as `/Orbitlab/` (the navigation), and the precache asks for `/Orbitlab/index.html`. These are two different keys in the HTTP cache, so the browser holds no copy under the precached URL. Removing this last 0.16 % would mean precaching the page under the scope URL, which depends on how each server maps `/` to `index.html`. That is left out of this change; KPI-02 is 15.1 kB, not 0.

"Controller" is the time from navigation until `navigator.serviceWorker.controller` is set. A first install claims the page when it activates, right after the install. It is wall-clock time on a shared 4-CPU container with a software GPU, so read it as a trend only.

## Checks run

- `npm run -s typecheck`: clean.
- `npx vitest run tests/pwa.test.ts tests/classroom-pwa.test.ts`: 38 passed (24 + 14). `tests/repo-hygiene.test.ts tests/bundle-budget.test.ts`: 17 passed. The full suite was not run locally (shared 4-CPU machine); CI runs it.
- `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`: 66 passed, 0 failed.
- Browser journeys on this branch's build, `CHROMIUM=/opt/pw-browsers/chromium node tests/browser/run.mjs …`:
  - `pwa-offline` passed (62.7 s): 69 files precached, the offline flight ran, and the page reloaded onto the new version.
  - `instructor-loading` (34.0 s), `lesson-packs` (31.1 s) and `workspace-navigation` (62.0 s) passed. These journeys install the worker and read its cache or go offline.
  - `classroom-preparation` failed with two checks: "failed disconnected repair was falsely reported ready" and "the disconnected repair error was not actionable". The same two checks fail on the `origin/main` build on this container (run with `--dist` on the main build, 53.2 s). The FX-7 step 0 report records the same failure on main here, and the journey passing in Pages CI. Those checks exercise the repair path `prepareOffline()`, which this change does not touch. CI decides.

## Size

`npx vite build; node scripts/bundle-budget.mjs`: `bundle budget: ok`. Every group is identical to the `origin/main` build (precache code 14,723.3 / 14,724 kB, `index-*.css` 177.0 / 177 kB, `i18n-*.js` 1,723.4 / 1,725 kB). The non-data files of the two builds have the same total, 19,351,833 B, so the precache code delta is **0 B**. `sw.js` grows from 11,566 to 11,833 B (**+267 B**). `sw.js` is left out of the precache manifest (`vite.config.ts`), so no precache budget moves. There is no new CSS and there are no new strings.

## Not done / for the reviewer

- The HU-6 Android peak-memory measurement that option (ก) asks for before merge (see above).
- `measure.mjs` and the Pages-header server of R0.4 step 8a are not on `main`. KPI-02 was measured with the scratch harness above, not with the plan's tool.
- The repair path `prepareOffline()` still uses `reload` for missing files. It runs only when a classroom asks to repair, after an install, so its files are rarely in the HTTP cache. It is outside this item.
