# ADR-Handoff: the Orbit hand-off, v1, with the optional DesignRef

- **Status:** Accepted as built (S03 v1; `origin.design` added by R3.1 in PR #80). Written by R0.2r (M-PLAN-013).
- **Contract in the plan:** PLAN.md §4 "CraftState/Handoff". This ADR covers the **envelope as shipped** only. The physical state (attitude, angular velocity, subsystem state, docking port and the rest) is ADR-CraftState, moved to R5.2 PR1 (see the [index](README.md)).

## Context

The Launch section hands the orbit a flight reached to the Orbit section (lifetime analysis P07, playground O01-O03). Build hands a designed satellite straight into its orbit ("Send to Orbit"). R3.1 added which design was flown, and its revision, so the learner can tell what they are looking at (`src/design/design-ref.ts:1-20`).

## Decision (as built)

1. **Envelope.** `format: 'orbitlab.handoff'`, `version: 1` (`src/orbit/handoff.ts:22-23`). Fields: `r`, `v` (m, m/s, the simulator's ECI frame), `jd` (UTC Julian date), `spacecraft` (mass, area, C_D, C_R, payload `kind`, `propulsion` or null), `label`, and `origin` (`mission` as a mission document or null, `vehicleName`, `missionTime`, optional `design`) (`src/orbit/handoff.ts:30-71`). Plain JSON, DOM-free, SI units (`:8-11`).
2. **When a hand-off exists.** `handoffAvailable(frame)`: past the pad, bound (`e < 1`), perigee above `HANDOFF_MIN_PERIGEE` = 100 km, exclusive (`src/orbit/handoff.ts:26`, `:84-86`).
3. **Built from what was flown.** `handoffFromFlight()` (`src/orbit/handoff.ts:120-144`) takes the state from the frame on screen (the replay cursor when replaying) and the mission from `flownMission(sim.cfg)`, never the setup draft (`src/main.ts:1028-1049`). Area, C_D and C_R are the satellite's own when finite and positive, else the class estimate (`src/orbit/handoff.ts:110`, `:133-136`). Mass is what is in orbit. `handoffFromState()` builds one inside the Orbit section with an empty origin (`:152-161`).
4. **DesignRef (optional).** `origin.design?: DesignRef` (`src/orbit/handoff.ts:64-69`). A `DesignRef` is `kind` (vehicle or satellite), `name`, `recordId`, `revision` (the saved record's `updated`, ISO 8601 UTC), `edited`, `specId` (`src/design/design-ref.ts:23-35`). No new store field: the revision is the last save time (`:6-10`). States: `saved`, `edited`, `unsaved` (`:37-42`). The version stays 1, so a hand-off without `design` reads as before (`src/orbit/handoff.ts:66-68`).
   - Launch → Orbit attaches it only when the flight on screen flies that design (`refFlies`, `src/design/design-ref.ts:71-73`; `src/main.ts:1045-1047`).
   - Build → Orbit attaches it after the satellite's hand-off is built (`src/ui/build/build-screen.ts:429-434`).
   - The playground shows it as "Design: …" (`src/ui/orbit/playground.ts:1133`).
5. **Reading one back.** `parseHandoff(raw)` returns a copy or `null`. It refuses: a wrong format or **any other version** (a newer one is refused, not half-read); non-finite numbers; non-positive mass, area, C_D, C_R, thrust or Isp; negative propellant; an unknown payload class; a malformed origin; an unbound orbit or a perigee at or below 100 km (`src/orbit/handoff.ts:186-208`).
6. **Invalid design data is refused, not shown.** `parseDesignRef(raw)` returns `undefined` when absent, a `DesignRef` when sound, `'invalid'` otherwise (`src/design/design-ref.ts:76-94`). Invalid means: not an object (including `null`); `kind` not vehicle/satellite; `name` or `specId` empty or over 200 characters; `edited` not boolean; neither "never saved" (`recordId` and `revision` both null) nor "saved" (a `recordId` and an ISO 8601 UTC `revision` that parses); or never saved but `edited` true (`:84-92`). `parseHandoff` refuses the **whole hand-off** when its design is `'invalid'` (`src/orbit/handoff.ts:202-203`), so a design it cannot vouch for is never shown as some other design.
7. **Stored missions differ.** The stored mission keeps the ref beside `mission` at its top level (`src/config/mission-file.ts:51-52`). On restore, an invalid or no-longer-flown ref is dropped and the mission still loads (`src/main.ts:1163-1164`). Here the ref is dropped, not the document.

## Consequences

- A v1 reader that ignores `origin.design` still reads every v1 hand-off.
- A bad design reference costs the whole hand-off on read-back, but only the reference on a stored mission.
- Any change to the state fields (attitude, angular rate and so on) needs version 2, because a v1 reader refuses other versions.

## Open points

- `parseHandoff` checks `origin.design` with `parseDesignRef` but returns a deep copy of the **raw** object (`src/orbit/handoff.ts:204-207`), not the parsed ref. Extra keys inside `design` (and elsewhere) pass through. Whether a reader should strip them is not decided.
- In-memory hand-offs from Launch (`src/main.ts:1036-1048`) are not passed through `parseHandoff`. On the Build path, `parseHandoff` runs before the design is attached (`src/design/satellite-handoff.ts:94`; `src/ui/build/build-screen.ts:434`). The refusal in point 6 therefore applies today only to a hand-off read back from JSON. No file or link reader exists yet (`src/orbit/handoff.ts:8-10`).
- The exported mission file (Share) does not carry the reference, and an Engineer rocket flown from the catalogue or a saved record without the Explore draft carries none ([R3 report](../reports/R3-design-views.md) "R3.1 ต่อ", scope line). Whether those should is open.
- The DesignRef holds identity and revision only. The plan's "immutable flown inputs" and "build/model provenance" are not in v1.
- Whether the different rule for stored missions (drop the ref) and hand-offs (drop the whole thing) is intended as a pair is not written anywhere else.

## Code references

- `src/orbit/handoff.ts:1-208` (envelope, builders, `parseHandoff`)
- `src/design/design-ref.ts:1-94` (DesignRef, `designRefFor`, `refFlies`, `parseDesignRef`)
- `src/main.ts:1028-1049` (`orbitHandoffNow`), `:1163-1164` (stored-mission ref)
- `src/ui/build/build-screen.ts:429-434` (Send to Orbit), `src/design/satellite-handoff.ts:94`
- `src/config/mission-file.ts:51-52`; `src/ui/orbit/playground.ts:1133`
- Tests: `tests/orbit-handoff.test.ts`, `tests/design-ref.test.ts`, `tests/design-handoff.test.ts`, `tests/d06-build-orbit-handoff.test.ts`
- Report: [R3 report](../reports/R3-design-views.md) §R3.1 and "R3.1 ต่อ"
