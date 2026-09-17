# Orbitlab

Physics-based rocket launch and orbital-insertion simulator that runs in the browser.
Pick a real launch vehicle, a payload, a launch site and a target orbit, then fly the
mission from the pad to orbit with four camera views and an engineering telemetry panel.

Built with Vite, TypeScript and Three.js. Interface in English, Russian and Thai.

The workspace is three columns on a desktop — mission setup, viewport, telemetry — two on a
tablet, and a single stack on a phone with the viewport first.

## Features

- **Full 3D ascent physics** in an Earth-centered inertial frame: inverse-square gravity
  (J2 oblateness in orbit), US Standard Atmosphere 1976 with an exponential upper
  atmosphere, Mach-dependent drag, pressure-dependent thrust and specific impulse,
  real staging tables, Earth-rotation velocity credit, RK4 integration.
- **18 launch vehicles**: Soyuz-2.1a, Soyuz-2.1b/Fregat, Proton-M/Briz-M, Angara-A5/Briz-M,
  Falcon 9 Block 5, Falcon Heavy, Atlas V 551, Vulcan Centaur VC4, Ariane 64, Vega-C,
  Long March 2D, Long March 3B/E, Long March 5, H3-22, H-IIA 202 (historical), PSLV-XL,
  Electron, Starship. Parallel boosters (including air-lit ones), hot staging,
  solid-motor thrust profiles, throttle buckets at max-Q, acceleration limits, first-stage
  recovery with entry and landing burns.
- **15 launch sites**: Baikonur, Plesetsk, Vostochny, Cape Canaveral/KSC, Vandenberg,
  Wallops, Starbase, Kourou, Jiuquan, Taiyuan, Xichang, Wenchang, Tanegashima,
  Sriharikota and Mahia — each with its own latitude, elevation, range-safety azimuth
  corridor and the inclination band that corridor implies. The lowest and highest
  inclination are measured from the corridor itself, so a site never offers a plane no
  azimuth in its own window could fly: Vandenberg's 147–201° corridor reaches 61.6°–104.9°
  and nothing below it, which is why the 53° Starlink launches from there need a dogleg
  the model does not fly.
- **Orbit presets** (ISS, Starlink, sun-synchronous at 600 km, polar, GPS/GLONASS MEO,
  GTO, GEO, Molniya, Tundra) plus fully custom orbits. Launch-window computation for the ISS plane
  and for sun-synchronous local-time constraints (RAAN targeting).
- **Guidance and mission sequencing**: vertical rise, pitch-over kick, gravity turn with a
  pitch-program rate limit, explicit closed-loop steering into the parking orbit, coast and
  circularisation, apogee-raising burns split across perigee passes for low-thrust stages,
  combined plane change and circularisation at apogee, and the spacecraft's own propulsion
  for the final orbit raising. An auto-tuner searches the pitch program for the best margin.
- **Failure scenarios**: engine-out, total thrust loss, premature separation, stuck fairing,
  range-safety destruct, or a random failure.
- **Four views**: exterior chase camera, illustrative onboard/crew view with attitude
  indicator and g-meter, space view around the Earth, and a 2D orbital map with ground
  track, predicted and target orbits, day/night terminator and stage impact points.
- **Engineering telemetry**: live plots of altitude, speed, dynamic pressure, g-load,
  apsides, remaining Δv, pitch command and mass over the whole flight or zoomed to the
  ascent, with event markers and a playhead; Δv budget with gravity, drag and steering
  losses; event log; CSV export.
- **Pre-flight feasibility verdict**: before launch the status note says whether the mission
  is flyable — whether the payload fits the vehicle's rated capability for the orbit class
  (LEO, SSO/polar, GTO/GEO) and whether the target inclination is reachable from the site.
- **Phase narration and a camera sequence**: the viewport names the phase and explains it in
  one line, and the camera follows a per-phase programme you can set yourself.
- **Physics & sources dialog**: a localized summary of the model with the data sources and
  the credits.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # physics and mission tests (vitest)
npm run build      # static site in dist/
```

Requires Node.js 20 or newer and a browser with WebGL 2.

## Using the simulator

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
   exterior and space cameras; scroll or pinch to zoom. **Camera sequence** in the top bar
   assigns a view to each flight phase and switches automatically as the flight moves
   through them, in live playback and in replay alike; a manual choice lasts until the next
   phase begins.
6. The band under the viewport narrates the phase — what is happening and one line of why —
   next to the mission clock and the latest callout.
7. The telemetry charts cover the whole recorded flight; the **Ascent** button zooms them to
   liftoff → parking orbit. Max Q, MECO, fairing jettison, SECO and the orbital burns are
   marked, and a playhead follows the timeline cursor.
8. Export the flight data as CSV from the telemetry panel.

### Keyboard

| Key | Action |
| --- | --- |
| Space | play / pause (never while a button or a field has focus) |
| Shift + Space | play / pause the *live* flight while you are replaying |
| `1`–`4` | exterior / onboard / space / orbital map |
| `,` `.` | step the time warp down / up |
| ← → | seek ±5 s on the timeline (±30 s with shift), including while a button has focus |
| Home / End | start of the recording / back to the live head |
| Escape | close a dialog |

On a phone the page becomes one column in reading order — viewport and playback first,
then mission setup with the Launch button, then the telemetry panel. There is no panel
drawer: nothing is hidden behind a topbar toggle at any width.

### Typography

The interface asks Google Fonts for DM Sans (text), Space Grotesk (figures and headings)
and Noto Sans Thai. They are a progressive enhancement, not a dependency: every family is
declared with a system fallback stack (`system-ui`, `-apple-system`, `Segoe UI`, `Roboto`)
and `display=swap`, so offline, behind a firewall or with remote fonts blocked the app
renders in the platform's own UI font with the same metrics-driven layout. Nothing is
measured in a way that assumes the web fonts loaded. They are deliberately not self-hosted
in `public/`: three families at four weights each is about 900 kB of woff2 for a
static-hosted demo.

## Physics

The model is documented in [docs/PHYSICS.md](docs/PHYSICS.md): frames, forces, atmosphere,
propulsion, guidance law derivation, mission sequencing, launch geometry and the orbit
propagator, with the assumptions and limitations.

Vehicle data come from public sources (manufacturer user guides, press kits, encyclopedic
summaries) and are rounded; treat every figure as approximate (about ±10 %). Structural
max-Q limits are estimates. For vehicles flown with a low-thrust orbital stage (Briz-M,
Fregat), the published LEO payload refers to the configuration without that stage.

A rated payload is a number **for a particular orbit from a particular site**, and the
simulator does not pretend otherwise: Soyuz-2.1a is rated 7 430 kg to 240 km × 51.6° from
Baikonur and 6 800 kg for the same orbit from Plesetsk, while the mission presets here are
420–600 km circular, which costs another 150–300 m/s. Where the reference orbit is known it
is recorded next to the rating in `RATING_ORBITS` (`src/data/vehicles.ts`). Vulcan Centaur
is modelled in its **VC4** configuration — four GEM-63XL solids, 21 400 kg to the ISS orbit
and 11 600 kg to GTO; the 24 400–25 600 kg figures often quoted belong to the six-booster
VC6. Solid motors carry their published peak-to-mean thrust ratio (P120C 1.52, PSOM-XL
1.53, GEM-63XL 1.41, S139 1.43, …) on top of a mean thrust chosen so that grain mass over
mass flow reproduces the published burn time.

## Project layout

```
src/physics/    atmosphere, orbital mechanics, integrator, vehicle model, guidance,
                mission planner, simulation loop, auto-tuner
src/data/       launch vehicles, sites, orbit presets, satellites
src/render/     Three.js scene (floating origin, Earth shaders), rocket, debris,
                trails, launch pad, cameras
src/ui/         setup panel, HUD, phase narration, telemetry charts, orbital map,
                onboard overlay, timeline, dialogs
src/i18n/       English, Russian and Thai dictionaries
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
