# S2a — Orbit budget & hand-off: notes

Session S2a of [PLAN-2026-09-28.md](PLAN-2026-09-28.md), items A2, A3 and A6
of [Orbitlab-audit-TH.md](Orbitlab-audit-TH.md) (details:
[orbit-review.md](orbit-review.md) findings 1–3). Branch
`claude/audit0927-s2a-orbit-budget`, from `dba7b0a`.

## What changed

| Item | Rule (DOM-free, unit-tested) | On the page |
|---|---|---|
| A2 — more propellant than mass gave ∞ Δv | `craftProblem(craft)` in `src/orbit/budget.ts`: mass > 0, 0 ≤ propellant < mass, Isp > 0, thrust > 0 (finite). `deltaVAvailable()` and `budgetFor()` throw a `RangeError` for a craft it rejects, so they never return Infinity/NaN; the only UI caller (`OrbitPlayground.budget`) checks first and has no budget for such a craft. `CRAFT_LIMITS` and `maxPropellant(mass)` hold the field ranges. | The propellant slider and number box end 1 kg below the current mass (read when used, so the field is not rebuilt under the user's click). A craft that is still impossible — the mass lowered below the propellant — is said under the fields (`aria-invalid` on the field at fault); the plan shows "No budget…" and no Δv/propellant rows; "Carry on" is disabled with its reason. |
| A3 — Carry on with no propellant | `adoptBlock(plan, now, craft)` in `src/orbit/budget.ts`: `'notYet'` (no burn, still running — the button is not there, as before), `'craft'` (A2), `'fuel'` (tanks run dry), or `null`. With no craft chosen (Δv only) the ideal plan may still be carried on from (unchanged). | A short plan is labelled "Ideal plan, propellant unlimited…"; the plan and the animation stay. "Carry on from the new orbit" is shown disabled with "Not enough propellant: the spacecraft would not reach this orbit, so it cannot carry on from it." `adopt()` refuses a blocked plan too. |
| A6 — Continue in Orbit stayed on Real satellites | `handoffEntry({ mode, apps })` in `src/orbit/playground-model.ts`: leave sky mode; forget the real satellite an orbit came from (`skyLabel`) and the Thai satellite an application was describing (`thaiId`); keep the rest of the application (station etc.). | `setHandoff()` applies it for a fresh hand-off before `loadHandoff()`, and frames the 3-D view on the new orbit. |

**Extra (separate commit, the D3 alternative):** beside the disabled
button, "Carry on as far as the propellant goes" adopts the orbit the
spacecraft really reaches — `reachedState(plan, budget, j2)` in
`src/orbit/budget.ts`: the burns the tanks hold, the burn they run dry in
only as far as its propellant goes (Δv = Isp·g₀·ln(m_before/m_after) along
the burn), none after; a spiral as far along as that Δv takes it (its Δv
grows evenly with time). The spacecraft carries on with empty tanks,
coasting to the clock if that is later than the burn.

Also (found while checking A2 in the browser): a craft field's `change`
now patches the craft source as it is now instead of forcing `'own'` — a
number box still focused sends `change` on blur, which could come after
"None" was picked and switched the spacecraft back to "Your own" (a
`replaceChildren` error inside the blur).

New i18n keys, all in en/ru/th: `mv.craft.err.{mass,propellant,overMass,isp,thrust}`,
`mv.b.badCraft`, `mv.b.ideal`, `mv.adopt.fuel`, `mv.adopt.craft`,
`mv.adoptReached`, `mv.adoptReached.title`.

No file outside the session's list was touched (`src/main.ts` was read
only). Built-in flights are untouched: nothing under `src/physics/`,
`src/config/` or the launch path changed.

## Tests

- `tests/budget.test.ts`: the 100 kg / 1 000 kg case orbit-review.md ran
  and the 101 / 1 001 kg browser repro are refused; every accepted craft
  (range ends included) gives finite numbers and keeps propellant below
  mass before and after the burns; the propellant slider's end is always a
  valid craft; the carry-on rule for the zero-propellant Hohmann, a craft
  that can fly it, no craft, an impossible craft and a spiral under way;
  `reachedState` — a part burn from a circle (speed = circular + what the
  tanks gave), a full first burn and part of the second, empty tanks
  staying on the start orbit, a plan the tanks hold, a spiral.
- `tests/orbit-playground.test.ts`: `handoffEntry`.

`npm run typecheck && npm test` on the final head: typecheck clean; 128
test files, 1 683 tests, all passing (1 670 before this session).

## Browser check (npm run dev, Chromium via Playwright, English)

Script kept out of the repo (scratchpad); results:

- **A2** Engineer → Hohmann → Your own. Mass 2 000, propellant 1 000,
  then mass 101: "The propellant is part of the spacecraft's mass: it must
  be less than 101 kg.", propellant box `aria-invalid="true"`, box `max`
  100, plan "No budget…", Carry on disabled, no ∞/NaN/Infinity anywhere
  in the playground. Typing 1 001 with mass 101 clamps to 100; the slider's
  end is 100; both valid (Δv in the tanks 14.257 km/s, left 28.1 kg).
- **A3** propellant 0: "Ideal plan, propellant unlimited…", "Not enough
  propellant: the plan is 3,846 m/s short…", Carry on disabled with its
  reason; a forced click leaves the plan in place. Mass 10 000 /
  propellant 8 000 / Isp 320: no label, Carry on enabled. "None: Δv
  only": Carry on enabled (unchanged behaviour).
- **A3 extra** mass 1 000 / propellant 300 / Isp 315 → "Carry on as far
  as the propellant goes" → the plan closes, the orbit is 420 × 6 485 km
  (vis-viva by hand from 7.66 + 1.102 km/s at 420 km: apogee ≈ 6 490 km).
- **A6** Explore → Orbit → Real satellites; Launch → launch (Soyuz-2.1a),
  warp to orbit → Continue in Orbit: route `#/orbit/explore`, title "Orbit
  playground", "Your orbit" pressed, preset "From your launch", hand-off
  "Crewed spacecraft · 406 × 427 km · i 51.6°" — no extra click. No page
  errors.

## Left for others / not done

- `src/ui/orbit/dom.ts` (`Field`) was not changed: the propellant field's
  moving upper end is done with a scale and limits read when used.
- The 3-D drawing and animation of a short plan still fly the ideal plan
  (D3: kept, and labelled); drawing where the tanks run dry would be a
  follow-up if wanted.
- Pre-existing, not in scope: `apps.thaiId` survives choosing a preset or
  moving the sliders (only a hand-off clears it now), so the Earth
  observation result's equator repeat grid can still use a Thai
  satellite's published cycle (`eoReport`, src/ui/orbit/playground.ts)
  for an orbit that is no longer that satellite's.
