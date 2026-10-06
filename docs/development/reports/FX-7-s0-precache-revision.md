# FX-7 step 0 — precache checks each file's revision / ตรวจ revision ทุกไฟล์ตอนติดตั้ง

Package FX-7 of the master plan v2.0 (S10 §10.10), step 0 only: M-PLATFORM-022 step 0, the revision check in `precache()`. It goes before EQ-1 (S09), which changes the same function (D-63). Steps 1–3 of FX-7 are **not** started.

```yaml
envelope: v2
package: FX-7
step: 0
family: FX
wave: K1
lane: T
items: [M-PLATFORM-022]   # step 0 (fold; S10 §10.10 first row)
change_kind: bug-fix
or_ids: [OR-2]
execution_authorized: true
owner_authorization: {date: 2026-10-05, quote: "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high", scope: "D-65 K1"}
base_sha_verified_on: {sha: 272a3b9, date: 2026-10-05, recheck: "src/pwa/sw-core.ts precache(): fetch then cache.put with no contentRevision check; prepareOffline() checks it — present"}
allowed_write_paths: [src/pwa/sw-core.ts, tests/pwa.test.ts, CHANGELOG.md, docs/development/PROGRESS.md, docs/development/reports/FX-7-s0-precache-revision.md]
oracle: []
failing_before_fix: [unit "fails the install when a download answers other bytes than its revision…", unit "keeps the running version whole when an update download answers other bytes…", unit "does not carry wrong bytes forward from an older cache…", unit "fails the install when a wrong copy in an older cache cannot be replaced…"]
perf_evidence: none
kpi_targets: {KPI-14: "M-PLATFORM-022 step 0 closed"}
rollback: {method: revert, data_compat: "no manifest, cache-name or stored-data change"}
reviewers: [second-agent, owner]
report: docs/development/reports/FX-7-s0-precache-revision.md
```

## The defect, on `272a3b9`

`precache()` in `src/pwa/sw-core.ts` downloaded each entry with `{ cache: 'reload' }` and put the response into the new version's cache without checking its bytes, while the repair path (`prepareOffline()`) proves each download's `contentRevision` (SHA-256, first 16 hex, the same hash `vite.config.ts` writes into the manifest) before putting it. A deploy that lands during an install (for example the daily data deploy on a slow classroom Wi-Fi) could therefore leave version N's cache holding version N+1's bytes under N's revision, and the offline app could run a mix of versions.

## The fix

In `precache()`, after the `response.ok` check: hash a clone of the response with `contentRevision` and throw (`precache: <url> answered revision <got>, not <want>`) when it is not `entry.revision`. The mismatched response is never put, the completion marker (`MANIFEST_KEY`) is not written, the install promise rejects, the waiting worker is never installed, and the running version's cache is untouched. A file copied forward from an older cache at the same revision is hashed the same way before it is put: an older cache may have been installed before this check and hold other bytes under a completion marker. When its bytes do not match, it is not copied; it is downloaded instead and that download is verified like any other, so a mismatch there fails the install (second-agent review, option B). When the bytes match, the cached responses, cache name and manifest are exactly as before. Source change: `src/pwa/sw-core.ts` +8/−2 over the base (three code lines, five comment lines).

Per S10's wording ("ถ้าไม่ตรง การติดตั้งต้องล้มและรุ่นที่รันอยู่ทำงานต่อ"), the whole install fails, not only the entry. A retry (the browser's next update check) succeeds once the server answers the manifest's bytes; the new test covers that.

## Tests

Test-first, separate commit. `tests/pwa.test.ts`:

- **New:** a v1 install while the server already answers v2's `index.html` → `precache` rejects naming `index.html`; the cache holds no `index.html` and no completion marker, and no entry holds v2's bytes.
- **New:** v1 installed, then v2's install meets other bytes for `assets/index-b.js` → rejects; v1's cache keeps the same keys and bytes; v2's cache has neither that file nor the marker; after the server settles, the same v2 manifest installs with v2's bytes.
- **New (review):** an older cache holding other bytes for `textures/earth.jpg` under the same revision → the v2 install downloads that file again and caches the right bytes; when the download is wrong too, the install fails and neither the file nor the completion marker is put.
- **Fixture changes (disclosed; S10 asked for the old `pwa.test.ts` to stay green unchanged, which is not possible):**
  - `manifestOf` used fake revisions (`length + body`); it now uses the build's real revision (SHA-256 via `crypto.subtle`, 16 hex, computed once at the top of the file), as `tests/classroom-pwa.test.ts` already does, and throws for a body it has no revision for. No assertion changed.
  - "installs a new deploy beside the old one…" installed v1 from a server that already answered v2's `index.html` at the same URL, which is the mixed install this fix forbids. It now installs v1 from v1's server, then deploys v2 (`Object.assign(server, serverOf(V2))`). Its assertions are unchanged.

Failing before the fix (test commit on base `272a3b9`):

```
× fails the install when a download answers other bytes than its revision, so no cache holds a mix of versions (FX-7 step 0)
× keeps the running version whole when an update download answers other bytes, and installs once the bytes match
AssertionError: promise resolved "undefined" instead of rejecting
Tests  2 failed | 16 passed (18)
```

Failing before the review fix (its test commit on `f673a3d`):

```
× does not carry wrong bytes forward from an older cache: it downloads that file again, verified (FX-7 step 0)
× fails the install when a wrong copy in an older cache cannot be replaced by a matching download
AssertionError: expected [ …(2) ] to deeply equal [ …(3) ]
AssertionError: promise resolved "undefined" instead of rejecting
Tests  2 failed | 18 passed (20)
```

Passing after the fix:

```
vitest tests/pwa.test.ts                   20 passed (20)
vitest tests/classroom-pwa.test.ts         14 passed (14)
vitest pwa + classroom-pwa + bundle-budget + repo-hygiene   4 files, 51 passed (51)
npm run typecheck                          clean (exit 0)
node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs   64 passed, 0 failed
```

Browser journeys, run later on this branch's build: `pwa-offline` passed (92.6 s). `classroom-preparation` was not counted: on this container it fails identically on main (an offline repair reported ready) and passes in Pages 37387979381, so it says nothing about this change. EO-PWA-1 was not run.

## Size and memory

- `sw.js` gains about 200 bytes minified (two hash calls and one error string). `sw.js` is not in the precache manifest (`vite.config.ts` filters it out), so the precache budgets (total, code, `data/`) do not change. Estimated, not built.
- Each download, and each file copied from an older cache, is now buffered once (a clone hashed with `crypto.subtle.digest`), as the repair path already does. Downloads still run together under `Promise.all`, so the install's peak memory can approach the bytes downloaded (up to the ~15.7 MB precache on a first install). EQ-1 (S09) plans to bound the concurrency; this step does not change it.
