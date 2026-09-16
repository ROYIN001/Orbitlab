# Orbitlab

Physics-based rocket launch and orbital-insertion simulator that runs in the browser.
Pick a real launch vehicle, a payload, a launch site and a target orbit, then fly the
mission from the pad to orbit with four camera views and an engineering telemetry panel.

Built with Vite, TypeScript and Three.js. Interface in English, Russian and Thai.

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
  Sriharikota and Mahia — each with its own latitude, elevation, minimum inclination and
  range-safety azimuth corridor.
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
  apsides, remaining Δv, pitch command and mass; Δv budget with gravity, drag and steering
  losses; event log; CSV export.

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
5. Switch cameras with the buttons or keys `1`–`4`. Drag to rotate the exterior and space
   cameras, scroll to zoom.
6. Export the flight data as CSV from the telemetry panel.

## Physics

The model is documented in [docs/PHYSICS.md](docs/PHYSICS.md): frames, forces, atmosphere,
propulsion, guidance law derivation, mission sequencing, launch geometry and the orbit
propagator, with the assumptions and limitations.

Vehicle data come from public sources (manufacturer user guides, press kits, encyclopedic
summaries) and are rounded; treat every figure as approximate (about ±10 %). Structural
max-Q limits are estimates. For vehicles flown with a low-thrust orbital stage (Briz-M,
Fregat), the published LEO payload refers to the configuration without that stage.

## Project layout

```
src/physics/    atmosphere, orbital mechanics, integrator, vehicle model, guidance,
                mission planner, simulation loop, auto-tuner
src/data/       launch vehicles, sites, orbit presets, satellites
src/render/     Three.js scene (floating origin, Earth shaders), rocket, debris,
                trails, launch pad, cameras
src/ui/         setup panel, HUD, telemetry charts, orbital map, onboard overlay
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
