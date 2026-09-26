# Orbitlab

Physics-based rocket launch and orbital-insertion simulator that runs in the browser.
Pick a real launch vehicle, a payload, a launch site and a target orbit, then fly the
mission from the pad to orbit with four camera views, a scrubbable flight recording and
an engineering telemetry panel.

Built with Vite, TypeScript and Three.js. Interface in English, Russian and Thai.

The workspace is three columns on a desktop — mission setup, viewport, telemetry — two on a
tablet, and a single stack on a phone with the viewport first.

## Features

- **Full 3D ascent physics** in an Earth-centered inertial frame: inverse-square gravity
  (J2 oblateness in orbit), US Standard Atmosphere 1976 with an exponential upper
  atmosphere, Mach-dependent drag, pressure-dependent thrust and specific impulse,
  real staging tables, Earth-rotation velocity credit, RK4 integration.
- **18 launch vehicles** from 16 launch sites — see [Fleet](#fleet) below. Parallel
  boosters (including air-lit ones), hot staging, per-motor solid thrust profiles,
  throttle buckets at max-Q, acceleration limits, first-stage recovery with entry and
  landing burns — flown back with a boostback to Landing Zones 1 and 2, to a drone ship, or
  into the Starbase tower's arms — and Starship's suborbital test flights, the ship flying
  itself home to a splashdown.
- **Orbit presets** (ISS, Starlink, sun-synchronous at 600 km, polar, GPS/GLONASS MEO,
  GTO, GEO, Molniya, Tundra) plus fully custom orbits. Launch-window computation for the ISS
  plane and for sun-synchronous local-time constraints (RAAN targeting).
- **Guidance and mission sequencing**: vertical rise, pitch-over kick, gravity turn with a
  pitch-program rate limit, explicit closed-loop steering into the parking orbit, coast and
  circularisation, apogee-raising burns split across perigee passes for low-thrust stages,
  combined plane change and circularisation at apogee, direct insertion for a single-shot
  stack close to its target, and the spacecraft's own propulsion for the final orbit
  raising. An auto-tuner searches the pitch program for the best margin.
- **Failure scenarios**: engine-out, total thrust loss, premature separation, stuck fairing,
  range-safety destruct, or a random failure.
- **A recorded, scrubbable flight**. A `FlightRecorder` stores a `VisualFrame` snapshot at
  an adaptive cadence as the mission flies — dense through ascent and any burn, sparse
  through a long coast, and always on both sides of an event — so the timeline scrubber
  under the viewport rewinds the 3-D view, the HUD, the map, the onboard overlay and the
  phase narration together, exactly to what was flown. The event bar marks staging, max Q,
  fairing jettison, burns and failures on the same timeline; clicking a marker seeks to it.
  Scrubbing never stops the live flight: it keeps recording behind the cursor, and **Live**
  jumps back to the head. The live flight and the replay cursor keep separate time-warp
  controls, so scrubbing fast through a recording never makes the live mission sprint.
- **Four views**: exterior chase camera, illustrative onboard/crew view with attitude
  indicator and g-meter, space view around the Earth, and a 2D orbital map with ground
  track, predicted and target orbits, day/night terminator and stage impact points.
- **Engineering telemetry**: live plots of altitude, speed, dynamic pressure, g-load,
  apsides, remaining Δv, pitch command and mass over the whole flight or zoomed to the
  ascent, with event markers and a playhead; Δv budget with gravity, drag and steering
  losses; event log; CSV export.
- **Pre-flight feasibility verdict**: before launch the status note says whether the mission
  is flyable — whether the payload fits the vehicle's rated capability for the orbit class
  (LEO, SSO/polar, GTO/GEO), whether the target inclination is inside the launch site's
  range-safety corridor (both ends of it), and whether the stack can actually deliver the
  orbit: the planner's own ascent-Δv margin, a direct insertion nothing can raise, and the Δv
  the planned burns need against what is left to fly them. For a configuration the budget
  already calls marginal it also flies the ascent and the insertion headlessly and asks
  whether the stack reaches an orbit at all — the one question a static budget provably
  cannot answer for a launcher whose orbit is made by a kick stage.
- **Phase narration and a camera sequence**: the viewport names the flight phase and
  explains it in one line, next to the mission clock and the latest callout, and the camera
  follows a per-phase programme you can set yourself — identically live and in replay.
- **Physics & sources dialog**: a localized summary of the model with the data sources and
  the credits.
- **WebMCP tools** (see [below](#webmcp-tools)) for a page-attached agent to read the flight
  and drive the simulator programmatically.

## Fleet

Payload figures are rated kg to the orbit class from the vehicle's own reference orbit
(see [Vehicle data](#vehicle-data) below) — treat every number as approximate (±10 %) and
not directly comparable vehicle-to-vehicle, since the reference orbit differs.

| Vehicle | Country | Stages | Launch sites | Payload → LEO | → GTO | → SSO |
| --- | --- | ---: | --- | ---: | ---: | ---: |
| Soyuz-2.1a | RU | 2 | Baikonur, Plesetsk, Vostochny | 7,430 kg | – | – |
| Soyuz-2.1b / Fregat-M | RU | 3 | Baikonur, Plesetsk, Vostochny | 8,670 kg | 1,900 kg | 4,900 kg |
| Proton-M / Briz-M | RU | 4 | Baikonur | 23,000 kg | 6,920 kg | – |
| Angara-A5 / Briz-M | RU | 3 | Plesetsk, Vostochny | 24,500 kg | 5,400 kg | – |
| Falcon 9 Block 5 | US | 2 | Cape Canaveral SLC-40, Kennedy LC-39A, Vandenberg | 22,800 kg | 8,300 kg | 15,000 kg |
| Falcon Heavy | US | 2 | Cape Canaveral SLC-40, Kennedy LC-39A | 63,800 kg | 26,700 kg | – |
| Atlas V 551 | US | 2 | Cape Canaveral, Vandenberg | 18,850 kg | 8,900 kg | – |
| Vulcan Centaur VC4 | US | 2 | Cape Canaveral, Vandenberg | 21,400 kg | 11,600 kg | 18,500 kg |
| Ariane 64 | EU | 2 | Kourou | 21,600 kg | 11,500 kg | 15,000 kg |
| Vega-C | EU | 4 | Kourou | 3,300 kg | – | 2,300 kg |
| Long March 2D | CN | 2 | Jiuquan, Taiyuan, Xichang | 3,500 kg | – | 1,300 kg |
| Long March 3B/E | CN | 3 | Xichang | 11,500 kg | 5,500 kg | – |
| H-IIA 202 (historical) | JP | 2 | Tanegashima | 10,000 kg | 4,100 kg | 3,600 kg |
| Long March 5 | CN | 2 | Wenchang | 25,000 kg | 14,000 kg | 15,000 kg |
| H3-22 | JP | 2 | Tanegashima | 10,000 kg | 4,000 kg | 4,000 kg |
| PSLV-XL | IN | 4 | Sriharikota | 3,800 kg | 1,425 kg | 1,750 kg |
| Electron | NZ/US | 3 | Mahia, Wallops | 300 kg | – | 200 kg |
| Starship (Super Heavy) | US | 2 | Starbase, Cape Canaveral | 100,000 kg | 27,000 kg | – |

Falcon 9, Falcon Heavy and Starship also support **first-stage recovery** (reserves
propellant for an entry and landing burn); Soyuz-2.1a, Falcon 9 and Starship support
**crewed** payloads.

### Launch sites

Each site carries its own latitude, elevation and a range-safety azimuth corridor, and the
reachable inclination band is measured from that corridor rather than assumed — a site
never offers a plane no azimuth in its own window could fly.

| Site | Country | Reachable inclination |
| --- | --- | --- |
| Baikonur Cosmodrome | KZ | 51.6°–91.8° |
| Plesetsk Cosmodrome | RU | 62.8°–102.6° |
| Vostochny Cosmodrome | RU | 51.7°–100.9° |
| Cape Canaveral SLC-40 | US | 28.5°–57.6° |
| Kennedy LC-39A | US | 28.6°–57.7° |
| Vandenberg SFB | US | 61.6°–104.9° |
| Wallops Flight Facility | US | 38.0°–72.3° |
| Starbase (Boca Chica) | US | 26.0°–31.8° |
| Guiana Space Centre (Kourou) | FR | 5.2°–96.5° |
| Wenchang Space Launch Site | CN | 19.5°–86.9° |
| Tanegashima Space Center | JP | 30.4°–96.0° |
| Satish Dhawan Space Centre (Sriharikota) | IN | 13.7°–86.7° |
| Jiuquan Satellite Launch Center | CN | 41.0°–103.1° |
| Taiyuan Satellite Launch Center | CN | 63.0°–103.5° |
| Xichang Satellite Launch Center | CN | 28.5°–31.0° |
| Rocket Lab LC-1 (Mahia) | NZ | 39.0°–103.4° |

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # physics, mission and tool tests (vitest)
npm run test:heavy # the delivered-orbit matrix with wind (about 15 minutes)
npm run typecheck  # tsc --noEmit
npm run build      # typecheck, then a static site in dist/
npm run snapshots  # refresh the bundled data snapshots in public/data/ (needs the network)
```

Requires Node.js 20 or newer and a browser with WebGL 2.

## Using the simulator

The app is organised on two axes (roadmap S01, [docs/ROADMAP-PART2-3.md](docs/ROADMAP-PART2-3.md)):
three **sections** — **Launch** (this simulator), **Orbit** and **Build** — and in each of them
three **levels**, Watch, Explore and Engineer. The top bar has a switch for each. Every section
and level has its own address, `#/<section>/<level>` (`#/launch/watch`, `#/orbit/explore`, …)
plus `#/home` for the landing page, so it can be linked to and Back moves between them; the last
section and level are remembered. The addresses from before the sections — `#/watch`,
`#/explore`, `#/engineer` — open the launch section and are rewritten to the new form, and a
mission link (`?m=…`) always opens in the launch workspace. **Orbit** opens on its playground
(roadmap O01, `src/ui/orbit/`): an orbit by its elements, drawn in 3-D about the turning Earth,
as its ground track, and as Newton's cannon:

- **Watch** is a seven-step narrated tour.
- **Explore** sets the orbit by its perigee, apogee, i, Ω and ω, with Kepler's three laws in the
  orbit's own numbers.
- **Engineer** sets the classical elements, shows J2's drift of the node and the perigee, and
  designs a repeating ground track.

Its maneuver planner (O02, `src/orbit/maneuvers.ts`) plans Hohmann and bi-elliptic transfers,
plane changes, GTO→GEO, phasing, deorbit burns, Edelbaum's low-thrust spiral and the user's own
prograde/normal/radial burns, draws each plan and flies it. At the Engineer level it adds a
Lambert rendezvous chosen on a porkchop plot. With a spacecraft (the one a flight handed on, or
one described by hand) every plan is budgeted against its own propellant by the rocket equation
(O03, `src/orbit/budget.ts`). The model is Kepler plus first-order J2, held to
the Landsat and Sentinel-2 orbits; the planner is held to Vallado's and Curtis's worked
examples ([docs/VALIDATION.md](docs/VALIDATION.md) §4). **Continue in Orbit** (under the telemetry panel,
and on the viewer's end card) puts the orbit a flight reached into the playground, with the
spacecraft in it and the orbit-lifetime analysis (roadmap S03, `src/orbit/handoff.ts`). Build is
still being built: it shows, in all three languages, what it will hold and in what order, and
nothing on it pretends to work.

The cloud in the top bar switches the data between **offline**, the default — the snapshots bundled in `public/data/`,
each dated, so `dist/` works on a network with no internet — and **online**, which fetches from
the sources and falls back to the snapshot (roadmap S04, `src/provider/`).

The launch section's levels, with the landing page:

- **Home** — the landing page over the live scene. One button plays a launch.
- **Watch** — a launch viewer for people with no background in spaceflight: the scene
  fills the window, three big numbers (mission time, altitude in km, speed over the
  ground in km/h) and one plain-language sentence about what the rocket is doing now.
  Playback runs at an automatic pace — real time for liftoff, max-Q and every separation,
  faster through the long quiet stretches — or at a fixed speed. The launch list holds
  nine real flights — among them Bandwagon-1 and Arabsat-6A with their boosters landing
  back at the Cape and on a drone ship, Starship Flight 5 with its tower catch and
  splashdown, and the three Soyuz launch aborts (T-10-1, 18a, MS-10) flown to the crew on
  the ground — each flown to its target, and every stage it flies home landed, by
  `tests/watch-missions.test.ts`; the camera follows a returning stage for its landing,
  and the flight ends on a card that offers another launch or the mission builder.
- **Explore** — the mission builder below in its learning layout.
- **Engineer** — the full workspace with every guidance parameter.

The mission builder:

1. Choose the launch vehicle, payload, launch site and target orbit in the left panel.
   Editing any orbit field turns the preset into a custom orbit.
2. For ISS-plane or sun-synchronous missions, click **Next window** to move the launch
   time to the next opportunity when the ascent plane matches the target RAAN.
3. Optionally open **Guidance parameters** and press **Auto-tune pitch program**; it flies
   the ascent headlessly for a grid of kick angles, pitch-program rates and lofts and keeps
   the one with the largest Δv margin.
4. Press **Launch**. Use the time-warp control (or `,` / `.` keys) during long coasts, and
   **Skip to next event** to jump to the next planned burn.
5. Switch cameras with the tabs above the viewport or with keys `1`–`4`. Drag to rotate the
   exterior and space cameras; scroll or pinch to zoom. The buttons beside the tabs reset the
   view, toggle the glow around the plume and the city lights, and go full screen.
   **Camera sequence** in the top bar
   assigns a view to each flight phase and switches automatically as the flight moves
   through them, in live playback and in replay alike; a manual choice lasts until the next
   phase begins.
6. The band under the viewport narrates the phase — what is happening and one line of why —
   next to the mission clock and the latest callout.
7. **Scrub the flight.** The timeline under the controls covers the whole recording, with
   markers for every event; drag it, click a marker, or use `←`/`→`/`Home`/`End` to rewind
   the 3-D view, HUD, map, onboard overlay and narration together. The live flight keeps
   recording behind the cursor — **Live** (or `Shift`+`Space` to pause the live flight
   itself) brings you back to it.
8. The telemetry charts cover the whole recorded flight; the **Ascent** button zooms them to
   liftoff → parking orbit. Max Q, MECO, fairing jettison, SECO and the orbital burns are
   marked, and a playhead follows the timeline cursor.
9. Export the flight data as CSV from the telemetry panel.

### Keyboard

| Key | Action |
| --- | --- |
| Space | play / pause (never while a button or a field has focus) |
| Shift + Space | play / pause the *live* flight while you are replaying |
| `1`–`4` | exterior / onboard / space / orbital map |
| `,` `.` | step the time warp down / up |
| ← → | seek ±5 s on the timeline (±30 s with shift), including while a button has focus |
| Home / End | start of the recording / back to the live head |
| `H` | cycle the telemetry card on the picture: compact → full → hidden |
| `D` | dock that card into the telemetry panel, or float it over the picture again |
| ← ↑ → ↓ *(header focused)* | move the floating card 10 px, 40 px with shift; alt+arrows resize it |
| Escape | close a dialog, or hand the focus back from the card's header |

On a phone the page becomes one column in reading order — viewport and playback first,
then mission setup with the Launch button, then the telemetry panel. There is no panel
drawer: nothing is hidden behind a topbar toggle at any width.

### Languages

The interface, every data-derived label (vehicle notes, satellite and site names, stage
names) and every event callout are available in English, Russian and Thai (`src/i18n`),
selectable from the top bar. Vehicle model names, engine names and country codes are left
untranslated on purpose — they are proper names, and the Russian and Thai press write them
the same way.

### Typography

In online mode the interface asks Google Fonts for DM Sans (text), Space Grotesk (figures
and headings) and Noto Sans Thai. Offline — the default — it does not ask (the owner's choice,
2026-09-26; `src/ui/web-fonts.ts`), so a closed network sees no request leave the page. The
fonts are a progressive enhancement, not a dependency: every family is declared with a system
fallback stack (`system-ui`, `-apple-system`, `Segoe UI`, `Roboto`) and `display=swap`, so
offline, behind a firewall or with remote fonts blocked the app renders in the platform's own
UI font with the same metrics-driven layout. Nothing is measured in a way that assumes the web
fonts loaded. They are deliberately not self-hosted in `public/`: three families at four
weights each is about 900 kB of woff2 for a static-hosted demo.

## Physics

The model is documented in [docs/PHYSICS.md](docs/PHYSICS.md): frames, forces, atmosphere,
propulsion, guidance law derivation, mission sequencing, launch geometry, the orbit
propagator and the flight recorder, with the assumptions and limitations. A student-facing
walkthrough of a mission — what each phase means, how to read the telemetry, and a glossary
pointer — is in [docs/USER-GUIDE.md](docs/USER-GUIDE.md). [docs/README.md](docs/README.md) lists
every document in reading order, and [docs/IMPLEMENTATION-STATUS.md](docs/IMPLEMENTATION-STATUS.md)
says where the project stands.

### Vehicle data

Vehicle data come from public sources (manufacturer user guides, press kits, encyclopedic
summaries) and are rounded; treat every figure as approximate (about ±10 %). Structural
max-Q limits are estimates. For vehicles flown with a low-thrust orbital stage (Briz-M,
Fregat), the published LEO payload refers to the configuration without that stage.

A rated payload is a number **for a particular orbit from a particular site**, and the
simulator does not pretend otherwise: Soyuz-2.1a is rated 7,430 kg to 240 km × 51.6° from
Baikonur and 6,800 kg for the same orbit from Plesetsk, while the mission presets here are
420–600 km circular, which costs another 150–300 m/s. Where the reference orbit is known it
is recorded next to the rating in `RATING_ORBITS` (`src/data/vehicles.ts`) and the mission
setup panel prints it under the rated payload ("Rating measured to: LEO 240 km · 51.6° ·
Baikonur Cosmodrome"). Vulcan Centaur
is modelled in its **VC4** configuration — four GEM-63XL solids, 21,400 kg to the ISS orbit
and 11,600 kg to GTO; the 24,400–25,600 kg figures often quoted belong to the six-booster
VC6. Solid motors carry their published peak-to-mean thrust ratio (P120C 1.52, PSOM-XL
1.53, GEM-63XL 1.41, S139 1.43, …) on top of a mean thrust chosen so that grain mass over
mass flow reproduces the published burn time.

## WebMCP tools

When the page is opened in a browser (or an embedding surface) that exposes
`navigator.modelContext` or `document.modelContext` — [WebMCP](https://github.com/webmachinelearning/webmcp)'s
proposal for letting an on-page agent call back into the app it is looking at — Orbitlab
registers nine tools (`src/mcp.ts`) so that agent can read the flight and fly a mission the
same way a person at the keyboard would. This is entirely optional: registration is
best-effort, wrapped so a single failing tool or a browser with no WebMCP support never
breaks the app, and every tool that needs a mission returns `{ ok: false }` rather than
throwing when none is configured yet.

| Tool | What it does |
| --- | --- |
| `read_flight_state` | The current cursor time, live/replay mode and playback speed, and the frame on screen: altitude, speed, apsides, stage, flight phase, Δv remaining, the last and next event. |
| `list_missions` | Every vehicle (with its sites and rated payloads), launch site, satellite/payload and orbit preset `configure_mission` accepts. |
| `configure_mission` | Set vehicle, site, payload, orbit (a preset or custom perigee/apogee/inclination/RAAN), launch time and guidance overrides — validated the same way the setup panel validates them — and preview the mission paused on the pad. |
| `launch_mission` | Configure (if arguments are given) and launch, exactly like the Launch button. |
| `control_playback` | `play`, `pause`, `warp`, `live`, `skip_next`, `skip_previous` — the same controls as the playback bar, acting on the live flight while at the recording head and on the replay cursor while scrubbed behind it. |
| `seek` | Move the cursor to a mission time, in seconds after liftoff. |
| `set_camera` | Switch between the exterior, onboard, space and orbital-map views. |
| `get_events` | The recorded event log, optionally filtered to events at or after a given time and capped to a limit. |
| `export_csv` | The whole recorded flight — telemetry samples and events — as CSV text, in the same format the telemetry panel downloads. |

Every tool declares a JSON Schema for its input, MCP annotations (`readOnlyHint`,
`destructiveHint`, `idempotentHint`), and validates the way the setup panel does: an unknown
vehicle id, a site the chosen vehicle does not fly from, a guidance override outside the
panel's own range, or a malformed date raises a descriptive error rather than doing something
unexpected. A mission that is well-formed but *infeasible* — an over-capacity payload, an
unreachable inclination, and so on — is **not** rejected: `configure_mission` and
`launch_mission` apply and preview (or fly) it exactly as they would if a person set the same
numbers on the panel, and return `ok: true` with the verdict in the result's `feasibility`
field, so check `feasibility.level` before treating `ok: true` as "this mission will fly."
`createMcpTools` (the handlers) is pure and DOM-free, and is unit-tested against a minimal
fake of the app shell in `tests/mcp.test.ts`; `registerMcpTools` (the `document`/`navigator`
lookup) is the thin part that actually touches the browser.

## Project layout

```
src/physics/    atmosphere, orbital mechanics, integrator, vehicle model, guidance,
                mission planner, simulation loop, auto-tuner, flight recorder frames
src/data/       launch vehicles, sites, orbit presets, satellites
src/render/     Three.js scene (floating origin, Earth shaders), rocket, debris,
                trails, launch pad, cameras
src/replay/     flight recorder, replay player, frame-backed simulation view, explosions
src/ui/         setup panel, HUD, phase narration, telemetry charts, orbital map,
                onboard overlay, timeline/event bar, dialogs, app modes, landing
                page and launch viewer; src/ui/orbit/ the orbit playground
src/i18n/       English, Russian and Thai dictionaries
src/orbit/      the Orbit section's physics: Kepler and J2 (O01), the playground's presets,
                rules and tour, maneuvers, Lambert and Edelbaum (O02), the propellant budget
                (O03), the hand-off (S03)
src/provider/   offline and online data: the providers, datasets, snapshots (S04)
src/design/     the user's designs, kept locally and as files (S05)
src/mcp.ts      WebMCP tools
public/data/    bundled data snapshots, each dated
scripts/        snapshot refresh (npm run snapshots)
tests/          vitest suites (unit tests and full missions to orbit)
```

## Deployment

The `Deploy to GitHub Pages` workflow builds and publishes the site on every push to
`main`. Enable Pages in the repository settings with **GitHub Actions** as the source.
The Vite base path is relative, so the build also works from any sub-folder.

## Acknowledgements

Earth textures are the planet textures from the three.js examples (NASA Blue Marble
derivatives). Atmosphere: US Standard Atmosphere 1976 and the exponential model tabulated in
Vallado, *Fundamentals of Astrodynamics and Applications*.
