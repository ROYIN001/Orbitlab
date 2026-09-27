# Orbit module review — 2026-09-27

Scope: read-only inspection of `source/` at c03f163d4d9d93a7ac361b85b9e285730041d465. No source edits, installations, browser interaction, or test suites. One small direct execution of the existing budget module is described below. All paths below are relative to `source/`.

## What is actually implemented

- Watch has a seven-step narrated visual tour: falling cannonball, orbiting cannonball, ISS, Hohmann transfer, Molniya, GEO, SSO (`src/orbit/tour.ts:42`). It changes the actual playground model rather than showing mock pictures.
- Explore provides presets, perigee/apogee/inclination/node/periapsis controls, J2 and equal-area sectors, 3-D/ground-track/cannon views, eight maneuver types, propellant budgets, ground stations, communication link geometry, camera/swath geometry, and sourced Thai-satellite descriptions.
- Engineer adds classical elements, orbital energy/angular momentum/drift readouts, repeat-ground-track design, manual burn details, Lambert rendezvous with an interactive porkchop plot, radio link budgets, and optics parameters.
- Real satellites has six bundled/online catalogue groups, name/number search, local TLE and OMM imports, SGP4/SDP4 propagation, ground tracks, local pass predictions, estimated uncertainty, close-approach screening, group overflights, re-entry estimates, and the four Long March 5B case studies.
- Bundled catalogue is dated 2026-09-26: 2,409 records / 2,406 distinct NORAD objects. Groups: stations 22, Thai 7, GNSS 172, weather 72, imaging 167, debris 1,969. Latest epoch 2026-09-26T16:10:54.609Z; some individual debris records are from 2026-08-27 and GNSS records from 2026-09-03. Individual age and uncertainty are shown; the headline newest timestamp is not a freshness guarantee for every record.
- OfflineProvider reads bundled snapshots. OnlineProvider has an eight-second timeout, source-format checks, snapshot fallback with a reason, and a recent-answer cache. This is real infrastructure, although a full disconnected-browser run is outside this agent's scope.
- Existing tests substantially cover pure orbital math, maneuver plans, budget equations, catalogue parsing/provider fallback, passes, SGP4 reference cases, uncertainty, conjunctions and reentry. I found no interaction-level coverage of the UI transitions below; `tests/browser/pwa-offline.mjs` exercises the launch flight rather than Orbit workflows. Test presence is not a claim that tests were run in this review.

## Highest-value findings

### 1. Continuing a launch can leave the user looking at unrelated real satellites

Severity P2; high confidence, static control-flow finding.

Trigger: in Explore/Engineer, open Orbit → Real satellites; return to Launch, complete an orbital flight, then click Continue in Orbit.

Expected: the orbit and spacecraft just handed on from the flight become the visible Orbit scene. Actual: `continueInOrbit()` stores the handoff and routes back, but `setHandoff()` / `loadHandoff()` never clear `mode === 'sky'`. The animation and controls therefore still display Real satellites. Only Watch automatically exits sky mode. Users must discover the Playground button to see the launch they just continued.

Evidence: `src/main.ts:775-778`; `src/ui/orbit/playground.ts:300-322`, `205-213`, `430`, `864`.

### 2. Fuel can exceed total spacecraft mass, producing infinite available delta-v

Severity P2; high confidence, existing model function reproduced directly under Node.

Trigger: choose any maneuver, Own spacecraft, set total mass to 100 kg and propellant to 1,000 kg. Both inputs are within their independent UI limits.

Expected: show an input error or constrain propellant to below total mass before calculating a physical budget. Actual: `deltaVAvailable()` clamps fuel to mass, makes dry mass zero, and returns Infinity. The plan can say it has enough fuel and the resulting spacecraft can carry more propellant than its entire mass.

Evidence: `src/ui/orbit/maneuver-panel.ts:169-172`; `src/orbit/budget.ts:58-60`, `67-87`.

Direct execution of unmodified `budgetFor` with two burns totaling 3,500 m/s, mass 100 kg, propellant 1,000 kg, Isp 315 s, thrust 400 N returned: available `Infinity`; enough `true`; used 67.794 kg; final total mass 32.206 kg; remaining propellant 932.206 kg. No browser assertion is claimed.

### 3. The spacecraft still reaches and adopts an orbit when its own fuel budget says the plan cannot be flown

Severity P2; high confidence, static UI/model integration finding (zero-fuel budget reproduced).

Trigger: choose Hohmann from a low orbit, select Own spacecraft, set propellant to zero, then click Carry on from the new orbit.

Expected: either stop adoption for the selected physical spacecraft, or explicitly offer an idealized preview without consuming/preserving a misleading spacecraft state. Actual: the warning is displayed, but Adopt availability depends only on plan burns/arrival; the callback applies `craftAfter(budget)` and then takes the ideal complete `stateNow(arrival)` regardless of `budget.enough`. The normal animation also follows the full ideal plan. With zero fuel the craft retains its mass and jumps to the completed destination orbit.

Evidence: `src/ui/orbit/maneuver-panel.ts:293-315`; `src/ui/orbit/playground.ts:519-522`, `649-665`; `src/orbit/budget.ts:85-87`. The warning text explicitly says the tanks run dry (`src/i18n/en.ts:1317`), but the action says Carry on from the new orbit (`1026`).

### 4. Overflight results silently refer to the old city after the observer changes

Severity P2; high confidence, static cache-key and UI finding; straightforward browser repro.

Trigger: Real satellites → Find overflights for Bangkok; after completion select Moscow or another city in the same block.

Expected: invalidate the old results, label them with the city/settings that produced them, or recompute. Actual: the heading immediately becomes Overflights of the new city while the old list remains. `overKey()` records coordinates/elevation/days, but display eligibility only checks the source/group prefix. Changing a station clears individual passes, not `overSearch`; elevation and duration changes also leave an old result alongside new controls.

Evidence: `src/ui/orbit/sky-panel.ts:484-515`, `526-551`.

### 5. Re-entry results do not identify the parameters actually used and survive edits

Severity P2; high confidence, static finding.

Trigger: predict a selected low satellite's re-entry, then change mass, area or drag coefficient. Alternatively change inputs while the asynchronous space-weather request is pending.

Expected: mark the previous result stale and retain its parameter set; each run should calculate with an immutable copy of its submitted parameters. Actual: the result stays next to the new inputs because display eligibility only checks satellite-key prefix. While loading, the key captures the old parameters but `predictReentry()` reads mutable current parameters after the await. Thus a completed result can be associated with a key for a different input set.

Evidence: `src/ui/orbit/sky-panel.ts:597-605`, `628-653`.

Related provenance issue: `sun()` keeps only `.data` and drops `from/asOf/fallback` (`590-594`), so an Online space-weather fallback is not reported in this result as explicitly as the satellite catalogue's fallback.

### 6. Online/Offline switching can be overwritten by an earlier request and retains analyses from earlier orbital elements

Severity P2; high confidence, static async/cache finding.

Trigger A: start loading Real satellites Online; switch to Offline while the old request is pending. Expected: only the latest mode's load is accepted. Actual: callbacks unconditionally assign status, and reset has no abort/generation token. Whichever request resolves last wins, even if it belongs to the earlier mode.

Evidence: `src/main.ts:512-518`; `src/ui/orbit/playground.ts:235-237`; `src/ui/orbit/sky-panel.ts:132-145`.

Trigger B: after computing passes/screening/overflights/reentry, switch provider to retrieve newer elements for the same catalogue IDs. `reset()` clears only catalogue status and objects; cached passes use object key/location/elevation but not element epoch, and other results use similarly stable object/group prefixes. A newly dated satellite can therefore appear above an old prediction. Evidence: `src/ui/orbit/sky-panel.ts:143-145`, `639`, `727`, `806-814`.

### 7. Propagation failure during playback can leave old altitude, speed and position looking current

Severity P2; high confidence, static error-display finding; needs time-acceleration/import browser repro.

Trigger: display a successfully propagated object, then run time forward until SGP4 returns an error (e.g. a decaying imported low orbit).

Expected: clear or explicitly mark current readouts unavailable and show the new error. Actual: the error paragraph is only created during `facts()` construction. `updateLive()` updates age/uncertainty, then returns early on failure without clearing altitude/speed/latitude/longitude/TEME values. Time continues while the previous successful numbers remain. The track helper can also return a last-good state instead of no state.

Evidence: `src/ui/orbit/sky-panel.ts:382-392`, `911-925`, `197-201`. The low-level `skyState` error path is tested, but that does not verify these live DOM fields.

## Product/teaching assessment and concrete next ideas

The actual capability is much deeper than a simple orbit viewer. The combination of an intuitive cannon, live geometric changes, burn plans, real satellites and Thai context is a compelling teaching base. The biggest weakness in this source slice is keeping the explanation and the displayed result tied to the exact state the user is seeing: previous inputs, impossible spacecraft, prior catalogue data, and inactive modes can each produce apparently valid output.

After fixing those state boundaries, useful additions would be:

1. A visible experiment objective for Explore: predict, change one variable, observe, explain. Examples: keep GEO over Thailand; make an ISS-like orbit pass Bangkok; reach 700 km with a specified fuel limit.
2. A compact before/after card with changed input, observable outcome, and one sentence of why. The current page already calculates the required values.
3. Every computed result should carry a small immutable inputs/source/time summary, plus a Recalculate state when it no longer matches the controls.
4. Explicit result vocabulary distinguishing an ideal planned path, a fuel-feasible maneuver, an observed element set, and a prediction with assumptions.
5. A share/save experiment action for the playground state, maneuver, observer and chosen satellite, making completed explorations reusable as lessons and comparisons.

These are product recommendations, not claims that such features were authorized for implementation.
