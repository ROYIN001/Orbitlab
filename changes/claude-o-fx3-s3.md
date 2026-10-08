## CHANGELOG

- Orbit and Watch (FX-3 step 3: M-ORBIT-007): the Watch tour's real-satellite steps say "Loading the element sets…" while the satellite catalogue loads, and why it could not be loaded, with a Try again button, when it failed; Real satellites' panel offers the same button under the same line. Try again loads through the data provider, so CelesTrak is still asked at most once in two hours and the bundled snapshot still stands behind it. EN, TH and RU.

## PROGRESS

| FX-3 step 3 (M-ORBIT-007, wave K1, lane O) | In PR; not merged; not published | `RealSky.loadState()` draws the catalogue's state (loading, or `sky.failed` + new `sky.retry` button) for both the panel and the Watch tour card, which is shown without the panel; `RealSky.retry()` loads again only from the failed state, through the `DataProvider`; spacing inline, no CSS; unit test 6/6 with a fetch double (5 failed before), online case: each CelesTrak query asked at most once in two hours through failure and two retries; journey `fx3-catalogue-retry` EN/TH/RU (3 failures before), `pwa-offline` and `fx3-thai-in-sky` pass; precache code +0.3 kB for this step, +1.0 kB with step 2 against `23ede7f`, 0.2 kB over its ceiling (owner to decide); O | [FX-3 step 3 report](reports/FX-3-s3-catalogue-retry.md) |
