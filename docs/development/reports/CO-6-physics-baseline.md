# CO-6 — Physics evidence baseline on the frozen Day 0 SHA / ฐานหลักฐานฟิสิกส์

```yaml
envelope: v2
package: CO-6
step: 1
family: CO
wave: K0
lane: P + Q (machine runs; this report is docs)
items: [M-PHYSICS-001]
change_kind: docs        # the runs change no code, golden or tolerance (KPI-21 = 0)
execution_authorized: true
owner_authorization: {date: 2026-10-05, quote: "D-65 (ก): wave K0 authorized (Day 0 machine runs included)", scope: "wave K0 (answer sheet A-1)"}
base_sha_verified_on: {sha: 5f9aa2e, date: 2026-10-05}
report: docs/development/reports/CO-6-physics-baseline.md
```

## Result: green on both suites

**Frozen SHA (Day 0 a):** `5f9aa2eeceb2c2706f5821117f76f92ac25ff4ee`. It is main on 2026-10-05; there are no open PRs before K0. Its `src/` equals the live `09cc2f5` (Pages 37230585947, deployment 6846305019).

| Suite | Run | Event | head_sha | Coverage (union) | Result |
|---|---|---|---|---|---|
| heavy (33 files) | [37242073733](https://github.com/ROYIN001/Orbitlab/actions/runs/37242073733) | schedule (Sunday cron, started 22:59Z 2026-10-04) | `5f9aa2e` | **257/257**: missing 0, unexpected 0, duplicate 0, nonpassing 0 | success, 33 files in 38 min wall time |
| sixdof-fleet (6 files) | [37253259356](https://github.com/ROYIN001/Orbitlab/actions/runs/37253259356) | workflow_dispatch `suite=sixdof-fleet` (K0 Day 0) | `5f9aa2e` | **164/164**: missing 0, unexpected 0, duplicate 0, nonpassing 0 | success, longest file 60 min |

- Both unions name the same source: `sourceCommit 5f9aa2e`, `sourceSha256 19259741e0a3649b964aef22baf7c7520535333824100800d4186c1f7085a219`. Node 22.23.3 (CI setup-node). Browser: none (Node suites).
- Union artifacts: `scientific-verification-union`, heavy id 11318293041 (zip SHA-256 `1dd62657…56d7`) and fleet id 11323531088 (zip SHA-256 `a7777ce5…8a8a`). The plan artifact of each run is uploaded too. The artifacts cannot be downloaded from this environment (blob storage answers 403); the counts above are the `Verification metadata` notice that `aggregate.mjs` writes into the coverage job's log, read through the API.
- Heavy inventory: 33 files / 257 cases equals `scripts/audit-heavy/heavy-expected.json` (schema 2) at this SHA.

**Machine-time rule (S06 CO-6):** the Sunday heavy cron's `head_sha` is the frozen SHA and its union is complete, so its result stands for the heavy half. Only `sixdof-fleet` was dispatched. The monthly fleet cron would otherwise next run on 2026-11-01.

### What this closes

| Gap (S06 §06.1 row 5) | Before | Now |
|---|---|---|
| Last heavy pass | 36804343856 on `9f9f36a` (before #36) | 37242073733 on `5f9aa2e` |
| Last fleet pass | 36942933112 on `91ee372` (before R1.4) | 37253259356 on `5f9aa2e` |

These are the first full heavy runs on a main that carries #36, and the first fleet run on a main that carries R1.4 (#68/#70/#71: finite fuel, `targetAttitude` basis). No bisect issue is needed. KPI-22 for GK0 is **green**.

### Physics-tree hashes (for D-64: reuse a passing run only if these are unchanged)

The owner answered D-64 (ก) on 2026-10-05: reuse is allowed for heavy and fleet only. That answer is recorded in DECISIONS.md through CO-8. Git object ids at `5f9aa2e`:

```
src/physics a1bc3e6d3234b583900035166ad427719cb51eee
src/data a5cc8d2f60d574f746c63497b85a4271308c7284
tests/heavy 8f48dabb89e8f639528529ae53addcd54c33b3be
tests/sixdof-fleet b4d9c79ef38452da7b791b75a33006e00224b19b
package-lock.json 65a140e5699009a08af1d7fc550f6bb617afdb58
src/design/requirement-trades.worker.ts 37b2e4c0dd3221a820a6a99cb697076edaf597f1
src/lessons/recheck.worker.ts 38c827730f7fa23a9842e8c22605ddf3ae006f43
src/orbit/lifetime-altitude.worker.ts a64f31c0cba3b37c462e02b9f18de1a7b09b22f2
src/orbit/reentry.worker.ts f8232cfac792c711f52cb8d7349b0b4cac873c56
src/orbit/screening.worker.ts e168cebfa8a21e99bfd10d7170f4eb29eac72abc
src/physics/attitude-tune.worker.ts 27fae705077ba464fbdaccfc151aa81de39373c6
src/physics/lifetime.worker.ts c0272c0861893045573010b837ecb1571e978d76
src/physics/monte-carlo.worker.ts b2aacf685fd7f1950a2f8383ca637585c935a96a
src/physics/tune.worker.ts 1eced5e041dbcf5c9e705e4dc3c52d9df3ab829b
src/session/flight.worker.ts 56510fdfbc6c279b40c06ea59e96a66f6f7c750c
src/ui/build/ratings.worker.ts a870a884ec225fe50e6b8df8a383998c8cfdc875
src/ui/build/readiness.worker.ts 9805afe7b20148d5cfd05af3ada327b29b660345
node 22.23.3
```

SHA-256 of the list above: `69bff28330e1bf101c4ad277ca8cc9ec904bda753e9dbf3dd1c6c93891dcab9e`.

Golden and fingerprint test files (SHA-256 at `5f9aa2e`):

```
be2b9766704679099dc210eb746cb8ef6c37efa3f02bbd2de28dea84b17b5e08  tests/d01-fleet-fingerprint.test.ts
2838a888773560d38d8830b9882fd7313897f7cdcd0bd5333c99efc998ff9e8b  tests/flex-golden-harness.ts
6a8716a1ba214403e8c401222a89ae51e278cf4fcb78a3837a8fd34ce2d1fbac  tests/heavy/flex-golden.test.ts
4fb89e08aba7fcb39c7d873eda9d3ceef7a90be105f38cf39e2edc7486767c84  tests/heavy/sixdof-fingerprint.test.ts
fcd6c7b72d9903d92277d558e10a1706fb615d79b2783a98fcf61e2c23dc5cb6  tests/rigid-flex-golden.test.ts
```

### What K0 changes against this baseline

- **No change to the physics tree:**
  - CO-1 (#84) changes the budget tooling only.
  - CO-4 step 1 (#86) changes `src/main.ts`, `src/ui/panel.ts` and `src/ui/flight-lifecycle.ts`, none of them in the physics tree. It does not change what any flight computes.
  - CO-7 (#87) changes lesson-pack display strings and `src/lessons/review.ts`.
  - HU-1 (#85) and CO-2 (#88) are docs.
- If the SHA published at GCO differs from `5f9aa2e`, these runs carry over only under D-64 (ก) and only if the list above is unchanged. Check it at GK0 with the same commands.

### Not done here

- No run was repeated and nothing was re-recorded (KPI-21 = 0).
- Scientific acceptance is separate (S18 §18.11) and stays with the scientific reviewer (D-55). These runs are execution evidence only: they show the suites pass on this source.

## สรุปภาษาไทย

ชุดทดสอบฟิสิกส์ทั้งสองชุดผ่านครบบนโค้ด `5f9aa2e` (เท่ากับเว็บที่ใช้งานอยู่):
- **heavy:** 257/257 กรณี (run 37242073733)
- **six-DOF fleet:** 164/164 กรณี (run 37253259356)

ไม่มีกรณีหาย ซ้ำ หรือล้ม ช่องว่างหลักฐานตั้งแต่ #36 และ R1.4 ปิดแล้ว ไม่ต้องหาสาเหตุ (bisect) และไม่มีการบันทึกค่าทับ
