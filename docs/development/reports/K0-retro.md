# K0 retrospective / ทบทวนหลังคลื่น K0

```yaml
envelope: v2
package: R7.2 (K0 retrospective, M-PLAN-026)
wave: K1 (records slot)
lane: I
change_kind: docs
owner_authorization: {date: 2026-10-05, quote: "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high", scope: "wave K1 (D-65)"}
```

Values are in [kpi-GK0.md](kpi-GK0.md). This page says what worked, what did
not, and what changes for K1.

## What K0 delivered

Ten PRs merged on 2026-10-05, each approved by the owner at the Merge Desk:

- CO-1 #84: precache budget split into code and data.
- HU-1 #85: user-study protocol, draft.
- CO-4 step 1 #86: LUI-01 fixed.
- CO-7 #87: neutral institution name.
- CO-2 #88: records match GitHub.
- CO-6 #89: physics baseline, heavy 257/257 and fleet 164/164.
- CO-3 #90: the G2 matrix journey and screenshots.
- CO-5 #91: three Pages shards.
- CO-8 #92: owner answers, Merge Desk and session protocol.
- CO-5 #93: smoke slice on PR CI.

All of it is live since Pages 37359895259 (`06abb1f`). The owner answered
80 + 5 decisions the same day.

## What worked

- **Merge Desk.** Card to click took 0–2 h once the page existed. A plain-Thai
  card with the CI run and the failing-before test let the owner decide
  without reading diffs.
- **Matrix evidence before the decision.** CO-3 measured the scene at every
  size before G2. That is why the owner could put G2 on hold with a precise
  instruction instead of a vague "looks wrong".
- **Sabotage runs.** Showing each new assertion failing (CO-3, CO-5) found
  real holes. CO-3's first version could not fail on a phone.

## What did not

- **G2 did not close.** The layout squeezed the scene to 2–95 px at short and
  zoomed windows (F5) and in the 861–1180 px band. The owner held G2 rather
  than sign a layout with a collapsing scene. Lesson: a measured size that
  is unusable is a finding to fix before asking for a signature, not only a
  number for the owner to choose from.
- **The code ceiling has no headroom.** CO-1 set the precache code ceiling at
  the measured size rounded up to the next kB (0.2 kB left on `06abb1f`), so
  the first K1 UI fix (F5, about +1 kB) is over it. That is D-38 working as
  intended. In practice every first-view change in K1 needs a named offset;
  F5 uses an identical-output one (#95, −2.65 kB).
- **One Pages run failed in K0** (37328117383, `learner-profiles` reload
  stall, intermittent since 37219398466/37223857005). It is not root-caused;
  it is a K1 known issue, and timeouts will not be raised.
- **R0.4 and the R7.1 cross-system journey were not started in K0.** Both
  carry to K1/GK1.
- **Lead time was 12–15 h for the first seven PRs** because they waited for
  the review method to exist. For K1, the cards go up as soon as each PR meets
  its Definition of Done.

## Changes for K1

1. **Fix before asking.** A gate review page shows the layout after its known
   findings are fixed, with the before/after numbers. For G2, F5 is fixed and
   asserted (`r2-viewport-scene-floor`, and S1–S4 in `r2-viewport-matrix`)
   before new screenshots go to the owner.
2. **Budget first.** Each code PR states its precache-code delta in its
   envelope, before review, together with the offset it uses.
3. **Shard balance.** Pages shards are split by journey index, so a new
   journey shifts every later one. New long journeys are named so that the
   two longest (`r2-viewport-matrix`, `r2-flight-shell`) never share a shard,
   and the PR gives its shard estimate.
4. **Re-estimate (S05 §05.11).** Measured throughput is 10 PRs in one day,
   but they were prepared over K0's setup. Use the K1 median lead time at
   GK1, not this one-off.
