# Orbitlab user guide

A walkthrough for flying your first mission and making sense of what the simulator shows
you while it flies — written for a student rather than for a contributor. If you want the
equations and the sources behind them, that is [docs/PHYSICS.md](PHYSICS.md); this guide
sticks to what you see on screen and what it means.

## 0. Three sections, three levels

Orbitlab is being grown into one space program in three **sections**: **Launch** (this
simulator), **Orbit** (orbits, orbit changes and what satellites do) and **Build** (designing a
rocket and a satellite). Each section has the same three **levels** — Watch, Explore and
Engineer — and the top bar has a switch for each: the section on the left, the level beside it.
Orbit and Build are being built: today they show what is coming, level by level and in the order
it will be built ([ROADMAP-PART2-3.md](ROADMAP-PART2-3.md)), and nothing on them pretends to
work. Everything below this section is about Launch.

- **Home** — the landing page. **Watch a launch** plays the featured flight (Soyuz to the
  space station) straight away; under it are the three sections, Launch with its three ways
  in.
- **Watch** — just the picture, three numbers (mission time, altitude, speed over the ground)
  and one sentence about what is happening and why. **Choose a launch** lists nine real flights,
  each flown as it was, only in daylight today: Soyuz to the space station, Falcon 9's
  Bandwagon-1 with its first stage back on Landing Zone 1, Falcon Heavy's Arabsat-6A with the
  side boosters back on Landing Zones 1 and 2 and the core on a drone ship, Starship Flight 5
  with the booster caught by the tower and the ship splashing down in the Indian Ocean, Ariane 6
  with 32 Amazon Leo satellites, Electron from New Zealand, and the three crews the Soyuz escape
  system has saved: Soyuz T-10-1 (a fire on the pad, 1983), Soyuz 18a (a stage separation
  failure at 145 km, 1975) and Soyuz MS-10 (a strap-on striking the core, 2018), each flown to
  the crew on the ground from Gagarin's Start, Baikonur's Site 1/5, where they really flew from
  (every other Soyuz from Baikonur stands on Site 31/6, today's crew pad). The speed buttons run the flight in real time (1×), faster, or at
  **Auto**, which keeps liftoff, max-Q, every separation and every landing in real time and
  hurries through the long coasts. The smoke a rocket leaves stays where it was left and drifts
  only with the flight's wind, and passing the speed of sound can wear a cloud of condensation
  round the fairing in humid air. The camera cuts to a stage flying home for its entry and
  landing and comes back to the rocket afterwards; **Follow the booster** / **Follow the
  rocket** takes it there or back at any time. When the rocket reaches orbit, or the ship is
  down in the water, a card offers to keep watching, watch again, pick another launch, or plan a
  mission of your own.
- **Explore** — everything below this line, in the learning layout (the advanced guidance
  parameters stay folded away).
- **Engineer** — the same workspace with every guidance parameter open.

Switching level or section never touches the flight: leave the viewer half-way up and the
workspace shows the same launch with every instrument on it, and a flight left running while
you look at Orbit is still flying when you come back. Every section and level has its own
address — `#/launch/watch`, `#/orbit/explore`, `#/home` and so on — the browser's Back button
moves between them, and the app reopens where you left it. The older addresses `#/watch`,
`#/explore` and `#/engineer` still work: they open the launch section, and the address bar shows
the new form.

**Installing Orbitlab and using it offline.** The published site can be installed as an app
(Chrome or Edge: the install icon in the address bar; Android: *Add to Home screen*; iPhone
and iPad: *Share → Add to Home Screen*), and once it has been opened online it works with no
network at all — the page, the physics and auto-tune workers and the Earth textures are all kept
on the device, and the fonts too once they have loaded. When a new version is published, a note
at the bottom of the page offers **Reload**; until you press it, the version you have keeps
running.

## 1. Set up a mission

The left-hand panel (top of the page on a phone) builds a `MissionConfig` in three steps.

1. **Vehicle & site.** Pick a launch vehicle from the dropdown — the card underneath shows
   its height, liftoff mass and thrust, thrust-to-weight ratio, stage count and rated
   payload to LEO/GTO/SSO. The site list below it only offers sites that vehicle actually
   flies from; picking a vehicle that cannot fly from your current site moves you to one
   that can and says so. Four sites at the end of the list are greyed out — Yasny, where
   Dnepr launched THEOS-1, Kapustin Yar, Svobodny and Palmachim: they are in the simulator
   with their real range-safety corridors, but no vehicle in the fleet flies from them yet.
   Palmachim is the one site that can only launch against the Earth's rotation (west over the
   Mediterranean, 141.5–146.6° of inclination).
2. **Payload.** Choose a satellite/spacecraft (its mass fills in automatically) or type a
   payload mass of your own.
3. **Target orbit & launch time.** The pills (ISS, Starlink, sun-synchronous, polar, GPS,
   GLONASS, GTO, GEO, Molniya, Tundra) are ready-made targets; editing any number below them
   — perigee, apogee, inclination, argument of perigee, or the RAAN fields — turns the orbit
   into **Custom** without losing the rest. For a plane-specific target (the ISS orbit, or a
   sun-synchronous local time), **Next window** moves the launch time to the next moment the
   ascent plane actually reaches that RAAN; launching off-window still works, it just costs a
   plane-change burn at apogee (see [§5](#5-reading-the-telemetry-panel)).
   With Starship, **Suborbital test flight** turns the target into a Flight 5-style path:
   the ship is cut off short of orbit (perigee between −1000 and 0 km, below the ground) and
   flies itself home to a splashdown about an hour later; such a flight may carry no payload.

**Share & save the mission**, at the top of the panel, keeps a mission beyond the tab:
**Copy link** puts an address on the clipboard that opens Orbitlab on this exact mission —
vehicle, site, payload, orbit, launch time, guidance edits, failure scenario, recovery and every
Engineer setting (six-DOF or point mass, wind, slosh and bending, the autopilot's gains,
navigation, control-system failures, PEG/IGM) — and **Save file** / **Open file** do the same
through a `.orbitlab.json` file. The workspace also remembers the last mission by itself, so
closing the tab and coming back in Explore or Engineer finds it where you left it. A link or
file is checked the same way the WebMCP `configure_mission` tool checks its input: a value
that cannot be used (a perigee above the apogee, a gain out of range, a site the vehicle does
not fly from) goes back to its default, the rest of the mission is kept, and a note under the
buttons lists what was reset. The file carries a format version, so a file from a later
Orbitlab still opens as far as this one understands it, and says so.

Since version 2 a file can also carry a **vehicle of its own** — a custom rocket, the start of
the Build section ([ROADMAP-PART2-3.md](ROADMAP-PART2-3.md), S02). There is no builder on screen
yet; a file (or a link) that carries one opens with the vehicle listed first in the vehicle menu
as "*name* — custom vehicle", and it flies like any other. Every figure in it is checked before it
flies — masses and sizes above zero, engine figures a chemical engine can have, at most six
stages, strap-ons on the first stage only — and a vehicle that fails the check is not flown: the
note names the vehicle as reset. Picking a catalogue vehicle from the menu drops the custom one.

Under **Guidance parameters** you can hand-tune the ascent (kick angle, pitch-program rate,
loft, pitch limits — see PHYSICS.md §5 for what each one does) or press **Auto-tune pitch
program**, which flies the ascent headlessly over a grid of values and keeps the one with
the largest remaining Δv. **Failure scenario** arms an engine-out, a thrust loss, a
premature separation, a stuck fairing, a range-safety destruct, or a random one of those, at
a mission time and stage you choose; the historical failures of §6 and, on a crewed Soyuz, a
launch abort are there too. Under **Options**, **Recover first stage** keeps landing
propellant back; with it on, each recoverable stage gets a choice of where it lands — where it
comes down at sea, a drone ship, a landing zone of the launch site (LZ-1 and LZ-2 at Cape
Canaveral and Kennedy), the Starbase tower's arms for Super Heavy, or expended. Flying back to a
landing zone costs a boostback burn, so the stage keeps more propellant back and the payload
falls.

**The status line above the Launch button is a pre-flight verdict**, not decoration: it
reads *fail* (red) when the payload is over the vehicle's rated capability, the target orbit
is not published for it, the inclination lies outside the launch site's range-safety
corridor, or the stack cannot deliver the orbit at all — no restartable upper stage above a
direct insertion that closes lower down, or less Δv than the ascent and the planned burns
need. It reads *warn* (amber) when the inclination needs a plane change, the site was just
reassigned, the ascent stages are short on paper and an upper stage has to make the
difference up, the margin is tight, or a failure is armed; an armed failure is always
reported, alongside whatever else the verdict says. It reads *ok* (green) otherwise. It is
computed from data and the mission plan, not by flying the mission first — so it can tell you
a mission will not fly before you spend the time watching it try.

There is one exception, and it exists because of the one thing a static budget cannot see:
the ascent *losses*, which only a flight measures. When the plan already says the mission is
marginal — the ascent stages short of the orbit they are aimed at, or the payload at 90 % of
the rating or above — the panel flies the ascent and the insertion headlessly and asks a
single question: does the stack get into an orbit at all? If it does not, the verdict is red
whatever the budget says. That is what separates Proton-M / Briz-M carrying a 5.75 t
spacecraft to the space station (which flies, with the Briz-M making up the difference) from
the same rocket carrying the 7.15 t crew ship (which does not, because a 19.6 kN Briz-M
cannot close a 690 m/s gap before the trajectory falls back into the atmosphere) — two
missions the Δv budget alone reads as the same amber note.

Press **Launch**. The mission starts on the pad, T‑10 s.

## 2. What you're looking at

Four camera views, switchable from the tabs above the viewport or keys `1`–`4`:

- **Exterior** — a chase camera that follows the stack; drag to orbit it, scroll/pinch to
  zoom.
- **Onboard** — an illustrative crew/cargo view with an attitude indicator and a g-meter.
- **Space** — pulls back to show the Earth and the vehicle's position around it; once the
  vehicle is too small to see, a labelled marker takes its place.
- **Map** — a 2-D ground track with the predicted orbit, the target orbit, the day/night
  terminator, and where spent stages came down.

The small buttons beside the camera tabs open the **Frames** menu (below), reset the view,
toggle the **glow** (the bloom around the plume, the ignition flash and the city lights) and go
full screen. If the picture falls below about 24 frames per second the glow is switched off for
a few seconds as a test: it stays off only if that made the picture faster, and comes back
otherwise. A screen or power-saving mode that holds the browser at 30 fps therefore keeps its
glow. Once you press the button your choice is kept, also on your next visit. On a graphics card
that cannot draw the high-range image the glow needs, the button is greyed out and the scene is
drawn without it.

**Reference frames.** The first of those buttons opens the **Frames** menu (Explore and
Engineer). Tick any of four groups and they are drawn on the vehicle in the exterior and space
views, with the angles between them as arcs and their values beside them:

- **Body and air-path axes** — the vehicle's own axes and the axes of its velocity through the
  air, with the angle of attack α and the sideslip β;
- **Normal earth and flight-path axes** — the local horizon and the direction of flight over
  the ground, with pitch, yaw and roll, the flight-path angle and the track;
- **Orbital axes R, S, W** — radial, along the track and the orbit normal;
- **Earth-centred inertial and Earth-fixed axes** — at the centre of the planet (best seen in
  the space view), with the Greenwich sidereal angle between them.

Everything is written in the notation in force (see *Physics and sources*): ISO 1151 in English
and Thai, ГОСТ 20058-80 in Russian, unless the Engineer mode's setup fixes one. In ГОСТ the
normal Earth frame's x<sub>g</sub> lies along the launch azimuth, so yaw ψ and track Ψ read the
departure from it; in ISO they are bearings from north. With the nose within half a degree of
vertical — on the pad and through the vertical rise — yaw and roll have no value and only the
pitch is shown. Every frame is off to begin with, and your choice is kept for the next visit.
The details are in [PHYSICS.md §2k](PHYSICS.md).

**Sound** (the ♪ button, also in the viewer) is off until you turn it on — browsers only let a
page play sound after you click something — and stays as you left it. What you hear is
worked out for where the camera is: the roar grows with the engines' thrust and falls with
distance (6 dB each time it doubles); far away it is only the low rumble, because the air soaks
up the treble first; it comes **late**, at the speed of sound — watch the liftoff from the
press site 5 km away and the sound reaches you 15 s after the picture, and a separation high up
is heard long after it is seen; its pitch drops as the rocket pulls away (Doppler); and it fades
out as the rocket climbs into air too thin to carry it, whoever is listening. The onboard camera
hears the engines through the structure instead, muffled but steady. Ignition, stage and
fairing separation, landings and a vehicle's loss have sounds of their own, delayed the same
way. With the flight sped up, the sound is quieter and plays without the delay (the picture
would otherwise be minutes ahead of it); paused, it is silent. These sounds are synthesised in
the browser. The model is in PHYSICS.md §11.

**Real launch audio in the viewer.** With the sound on, *Soyuz to the space station* plays
NASA's broadcast of the real Soyuz MS-27 launch (8 April 2025, public domain) in step with the
mission clock, from the last minute of the countdown to the spacecraft's separation: the
Russian launch-control calls under NASA's English commentary. It plays at 1× — at the viewer's
*Auto* pace that is every event from ignition to orbit — and pauses while the flight is sped
up, picking up at the right second when it slows down again; the simulator's own sound steps
aside while it plays. The other five launches were broadcast by SpaceX, Arianespace and Rocket
Lab, whose broadcasts may not be republished, so they play the simulated sound. You can give
any of them a recording of your own under **Launch audio** in *Choose a launch*: pick the file
(an audio file or a video), say at what time in it the rocket lifts off (m:ss or h:mm:ss), and
it plays the same way. It is kept in this browser and never uploaded. There are no broadcasts
in Thai, so the commentary is in the language it was broadcast in whatever language the page
is in.

**The sky** is computed, not painted: sunlight scattered by the air molecules (Rayleigh — the
blue) and by haze (Mie — the white glare round the sun), with the ozone layer's absorption, in a
round atmosphere 100 km deep. So the colours follow from where the sun is and where the camera is:
a deep blue overhead at noon paling to the horizon; at dusk a red and orange band under a
darkening blue, and the Earth's shadow rising opposite; from orbit a thin bright blue line along
the limb. Launch at dusk or dawn and follow the rocket out of the Earth's shadow into sunlight:
above about 50 km its exhaust, with almost no air left to hold it in, balloons out over tens of
kilometres and catches the sun — the "twilight jellyfish" — a pale glowing dome with trailing
streamers against the darkened sky; pull the exterior camera back with the wheel (above the
atmosphere it goes out to a couple of hundred kilometres) to see it whole. On a graphics card too
slow for the scattering sky, the same test as the glow's switches back to the simpler painted sky
after the glow's own test; `?sky=gradient` in the address forces it.

**Camera sequence** (top bar) assigns one of those four views to each flight phase and
switches automatically as the mission moves through them — pad, liftoff, ascent, staging,
upper stage, coast, burn, deployment, orbit — in live flight and in replay alike. Picking a
camera yourself overrides the sequence until the next phase begins.

Top right of the picture is the **telemetry card**, and it is a window: drag it anywhere in
the viewport by the header strip along its top, resize it from the grip in its bottom-right
corner, and put it back with the ⌖ button (or a double-click on the header). Nothing ever
hides it — where it is and how big it is are your decisions, and both are remembered between
visits.

It starts *compact*: status and flight phase, altitude, inertial speed, vertical speed,
apoapsis × periapsis, active stage with its throttle, and Δv remaining — seven lines, clear
of the vehicle. The ▤ button (or the `H` key) cycles it **compact → full → hidden**: *full*
is the complete instrument grid, and the card opens itself out to the size that grid needs
and returns to the size it was when you step off *full* (a size you set yourself is kept,
and the grid fills as much of the window as you have opened); *hidden* leaves nothing but
the small chip, which is the whole window in that mode and can be dragged into any corner.

The ⇥ button (or the `D` key) **docks** the card into the telemetry panel beside the
viewport, as the first block under *Flight telemetry*. Docked, it shows every readout and
covers nothing at all; ⇤ (or `D` again) floats it back over the picture. On a phone the card
starts docked, because a window is most of a 375 px screen — floating is still one tap away.

The window is operable from the keyboard: tab to the header, then the arrow keys move it
10 px (40 px with shift), alt+arrows resize it, and Escape hands the focus back. Nothing is
lost in any placement or mode — the telemetry panel carries every readout at all times.

The band under the viewport is the **phase narration**: a title (e.g. "Gravity turn") and
one line of what is happening and why, next to the mission clock and the most recent
callout. It is the fastest way to know what phase you are watching without reading the raw
telemetry.

## 3. The flight, phase by phase

| Phase | What's happening |
| --- | --- |
| **Countdown** | On the pad. Liquid first stages ignite a few seconds before T‑0; the clock shown is T‑minus. |
| **Vertical rise** | Straight up, clearing the tower, before any commanded turn begins. |
| **Pitch-over** | A small commanded tilt toward the launch azimuth starts the turn downrange. |
| **Gravity turn** | Thrust stays along the body axis (zero angle of attack) and gravity alone bends the trajectory — this is what keeps aerodynamic loads low through max Q. |
| **Closed-loop guidance** | Once dynamic pressure has dropped, the vehicle actively steers toward the cut-off altitude, speed and plane rather than just following the turn. |
| **Coast** | Engines off, following a ballistic (or orbital) arc — either climbing to apoapsis before a planned burn, or already circling. |
| **Orbital burn** | An engine is firing to raise/lower an apsis, change plane, or circularise, with a Δv figure counting down. |
| **In orbit** | Stable orbit. If it matches the target, the note says so; if it's stable but off target, it says that too, with the shortfall. |
| **Mission failed** | The vehicle was lost — see [§6](#6-failures). |

Along the way you'll see events on the ticker and the timeline (more on that in
[§4](#4-scrubbing-a-recorded-flight)): **max Q** (peak dynamic pressure), **booster
separation**, **MECO** (main-engine cut-off) and **stage separation**, **fairing jettison**
(released once the free-molecular heating rate and the dynamic pressure both drop low
enough — see PHYSICS.md §4, not just a fixed altitude), **SECO** (second/upper-stage
cut-off), **target orbit** or **off target**, and **payload separation**. A crewed or
propelled spacecraft keeps flying and raising its own orbit after the launcher lets go — the
ticket doesn't end at SECO.

## 4. Scrubbing a recorded flight

Orbitlab records the whole mission as it flies, so you are never stuck watching it happen
once at real-time speed:

- The **timeline** under the playback controls covers the recording from T‑10 s to now.
  Drag it, click anywhere on it, or use `←`/`→` (±5 s, or ±30 s with Shift) and `Home`/`End`
  to move the cursor. Every marker on the bar is a recorded event — hover for its time,
  click to jump straight to it.
- Moving the cursor behind the recording head drops you into **replay**: the 3-D view, HUD,
  map, onboard overlay and phase narration all rewind together to that instant, because they
  are all driven from the same recorded snapshot. Nothing is re-simulated — scrubbing back
  to liftoff to look at max Q again shows you exactly what was flown.
- The **live mission keeps flying and recording** behind the cursor while you look at the
  past. **Live** (or pressing `End`) jumps the cursor back to the recording head. `Space`
  plays or pauses whichever clock the cursor is currently on — the live flight at the head,
  the replay cursor behind it — and `Shift`+`Space` always pauses or resumes the live flight
  itself, which is the way to freeze the mission while you keep studying an earlier moment.
- **Time warp** (`,`/`.` or the warp selector) speeds up whichever clock is active. The live
  flight and the replay cursor keep separate warps on purpose, so scrubbing fast through a
  recording never makes the live mission sprint ahead of you.
- **The physics runs in its own thread** (a Web Worker), so the speed you ask for no longer
  depends on how fast your graphics card draws. On a six-DOF flight the readout under the
  warp selector shows the speed actually achieved; on a software-rendered test machine drawing
  3 frames a second, a 10× Falcon 9 flight reached 8.6× this way against 0.5× with the physics
  on the drawing thread. The flight itself is the same either way: the worker runs the same
  simulation and recorder code on the same requests. Adding `?physics=inline` to the address
  flies the physics on the main thread as before, which is also what happens automatically in
  a browser that cannot start a module worker.
- **Skip to next event** jumps to the next planned burn (live) or the next recorded event
  (replay); the back-skip button goes to the previous one.

## 5. Reading the telemetry panel

The right-hand panel (bottom, on a phone) covers the whole recorded flight with a playhead
that follows the timeline cursor; **Ascent** zooms every chart to liftoff → parking orbit.

- **Charts**: altitude, inertial speed, dynamic pressure, g-load, apoapsis/periapsis, Δv
  remaining, commanded pitch and mass, each with its event markers (max Q, MECO, fairing,
  SECO, burns) so you can line up a spike or a kink with what caused it.
- **Δv budget**: what the ascent actually delivered, split into thrust, gravity loss, drag
  loss and steering loss (PHYSICS.md §4 derives each term). A loft-heavy ascent trades
  altitude for a larger steering loss; a shallow one trades it for gravity loss instead —
  comparing the two after a guidance change is the fastest way to see what a parameter
  actually cost.
- **Flight plan**: the burns the mission planner scheduled, and — for a mission flown
  off-window or with an inclination the site can't reach directly — the plane-change burn
  it added at apogee.
- **Spent-stage list**: every jettisoned booster, stage and fairing half, with where it came
  down (or that it reached orbit as debris).
- **Event log**: every event in the recording, in the same language as the rest of the
  interface.
- **Export CSV** writes the whole recorded flight — the same telemetry samples and events —
  to a file you can open in a spreadsheet.
- **Flight report** saves one HTML file ready for a lab report or a thesis: the mission's
  set-up (vehicle, site, payload, target orbit, launch time, flight model, wind, ascent guidance,
  navigation, slosh and bending, the autopilot, control-system failures, the failure scenario),
  the result with the target-against-actual orbit table, the key figures (mass at liftoff,
  maximum dynamic pressure and load factor and when, orbit insertion, Δv left), the event log,
  and the charts — the eight above redrawn over the whole flight (the ascent ones up to 30 s
  after insertion), plus every Engineer chart open on screen at the time, such as the Bode plot
  or the step response. It is written in the language on screen, needs no network, and prints
  to A4: open it and use *Print → Save as PDF*. It ends with a link that opens the same mission.
- **PNG**: hover over any chart — here or in the Engineer windows — or tab to it, and a small
  **PNG** button saves it redrawn on white at 2400 × 1200 pixels.

### How long will it stay up?

**Orbit lifetime**, beside the flight report, opens once the flight on screen is in orbit (a
perigee above 100 km). It carries that orbit on — for a month, a year, five or twenty-five years —
under the forces that act after the launch, each of which can be switched off to see what it does:
the Earth's oblateness (J2, which turns the orbit's plane and is why a sun-synchronous orbit
works), its pear shape (J3, J4), drag in an upper atmosphere that swells when the Sun is active,
the pull of the Sun and the Moon (which tilts a geostationary orbit by nearly a degree a year),
and the pressure of sunlight. Choose low, mean or high solar activity: at 400 km a CubeSat lasts
about four months at solar maximum and over a year at solar minimum. The *mean elements* method
covers decades in a moment with J2 and drag; the *full equations* include every force but are
slow, so keep them to months. The mass, cross-section and coefficients are filled in from the
payload and can be changed. The result is the date of re-entry, or the orbit at the end, and two
charts — perigee and apogee, inclination and eccentricity — which can be saved as PNG like any
other. The flight itself is not changed. The model is in PHYSICS.md §9a.

### Comparing two flights

**Compare with another flight**, above the event log, sets two flights side by side — PEG
against IGM, one set of autopilot gains against another, a nominal flight against one with a
control-system failure. **Use as reference** pins the flight on screen; change one thing and fly
again, and every chart carries the reference as a dashed trace in the same colour (labelled
*ref*), the 3-D view its path as a dashed violet line (turned with the Earth, so a reference
flown from the same pad on another day still lies over the same ground), and a table lists what
both flights have — orbit insertion, perigee, apogee and inclination at the end, maximum dynamic
pressure and when, maximum load factor, Δv left, and the times of max-Q, MECO, separation, SECO
and the orbit — with the difference. **Save flight** writes the flight to a
`.orbitlab-flight.json` file (its telemetry, events, path and mission) and **Open flight** reads
one back as the reference, so a comparison can span days or be handed to someone else. × stops
comparing.

## 6. Failures

Arming a failure scenario (or flying a payload the vehicle genuinely cannot lift) can end a
mission before orbit. The vehicle-lost overlay and the "Mission failed" phase cover:
**engine-out** (one engine's worth of thrust gone), **total thrust loss**, **premature
separation**, a **stuck fairing** (carried as dead weight instead of released), **range
safety** (a flight-termination destruct — armed automatically if the vehicle falls back
through 100 km under no power), a **structural break-up** (dynamic pressure exceeded the
vehicle's placard by 15%), or simply running the tanks dry short of orbital speed
(**suborbital**). Every one of these is deterministic and replayable: the same mission
configuration always fails the same way at the same instant, so a "why did that happen" is
always answerable by scrubbing back to it.

Three failures are the ones crewed Soyuz rockets really met: a **fire on the pad** (at the
time you set, from T−10 s), a **strap-on striking the core** as the strap-ons separate, and a
**stage that fails to separate** cleanly at the separation of the stage you choose. On any
other flight they lose the vehicle.

**The Soyuz escape system.** A Soyuz-2.1a carrying a crew has its launch escape system armed
from the countdown until the spacecraft is in orbit. When a failure is losing the rocket, it
fires on its own, and it can be fired on purpose: the **Launch abort** failure at a time, or
the red **Abort** button beside the playback controls in the Engineer mode. What happens
depends on when:

- up to T+114.5 s, the **escape tower** on the fairing's nose pulls the crew's section off the
  rocket at 14–16 g and away from the pad; the fairing's lattice fins open;
- from then until the fairing goes at T+157 s, **four motors on the fairing** do the tower's
  job, as on Soyuz MS-10;
- after that, the **spacecraft separates** from the rocket and its modules part, as on Soyuz 18a.

The descent module then drops free and comes down as a real one does: a ballistic fall from
high aborts, a drogue and then the 1 000 m² main parachute, the heat shield dropped, and six
soft-landing motors a metre above the ground. The flight follows the crew — the telemetry,
the g-load and the camera are theirs — while the rocket left behind falls or breaks up. The
flight ends with the crew on the ground ("Crew landed after an abort"); the event log gives
where and the highest g they took. The details and how the three historical aborts compare are
in [PHYSICS.md §8.3](PHYSICS.md).

## 7. The flexible vehicle (Engineer mode)

In the Engineer mode, with six-DOF physics, the setup has a **Flexible vehicle** section. Its
three options are off by default, and with all three off the flight is exactly the rigid one.

- **Propellant slosh**: the liquid in every tank sways under thrust (its first mode), pushing
  the stack sideways and turning it; a new burn starts it from rest.
- **Structural bending**: the stack bends in its first mode, the autopilot steers by what its
  IMU reads on the bent structure, and the stack **breaks up** where its shells are loaded
  past their allowable stress (the event log says where).
- **Bending filter**: a notch filter on the autopilot's pitch and yaw commands, centred on the
  predicted bending frequency, with the autopilot held below that frequency.

Turn on bending without the filter to see why launchers need one: the IMU feeds the bending
back into the engines and the first mode grows until the stack breaks up, within seconds of
liftoff on a Falcon 9. With the filter on, the same flight reaches orbit with centimetres of
bending. The section also sets where the IMU is (the instrument bay atop the upper stage, or
any station along the stack), the notch's depth (ζz), width (ζp) and centre, the ratio of
bending frequency to autopilot bandwidth, and the slosh and structural damping — a detuned
notch or a sensor in the wrong place is enough to lose the vehicle.

Two more charts appear in the telemetry panel: **bending and slosh** (the stack's largest
bending deflection and the largest slosh displacement, cm) and **shell stress** (the most
loaded section, % of its allowable). The 3-D view draws the bending at 25 times its size. The
CSV export adds the same quantities, per sample. The physics is in PHYSICS.md §2b.

## 8. Notation

Rates and angles are written in **ISO 1151** in English and Thai and in **ГОСТ 20058-80** in
Russian; the Engineer mode's setup can fix either (*Flight-dynamics notation*). The two differ
in more than letters: ISO's body y axis points to the right and z to the belly, ГОСТ's y to the
top and z to the right, so the pitch rate is q in one and ωz in the other, and a nose-right yaw
is positive in ISO (r) but negative in ГОСТ (ωy). Everything follows the choice — the telemetry
card, the charts, the 6-DOF controls and the rates you type into them, the event log and the
CSV. The full table, with each quantity's definition and sign, is in *Physics and sources*
(PHYSICS.md §2c).

## 9. The attitude-loop inspector (Engineer mode)

In a six-DOF flight in the Engineer mode, the 6-DOF panel under the timeline has an
**Attitude-loop inspector** button. It opens a window over the workspace (drag it by its title
bar; Esc or × closes it) with the autopilot drawn as a block diagram, left to right: guidance
(and the ascent's load relief), attitude error, attitude loop, rate error, rate loop, moment,
bending filter, actuators, vehicle, and the IMU feeding back. Each block shows the values of the
control step on screen for roll, pitch and yaw, in the axes and signs of the notation in force
(§8); a block outlined in orange is being held by a limit, and the tag on its row says which
(*stop*: slower than the gain asks, to stop on the target; *max*: at its limit). Below, four
charts cover the last 10, 30 or 120 s — attitude error, rate, moment and actuator use — the
rate and moment charts for the axis picked in the title bar. The play button runs and pauses
the flight or the replay as the main one does. The inspector reads the recording, so scrubbing
back shows the loop at any recorded instant. Details in PHYSICS.md §2d.

## 10. Live equations (Explore and Engineer mode)

The telemetry panel has two views: **Charts** and **Equations**. Equations shows the
equations the simulation is solving at the instant on screen — live, or wherever the replay
cursor stands — each as a formula in the notation in force (§8), then the same formula with the
numbers put in, and, where the flight provides an independent left-hand side, a **balance**
line: green when the recorded motion satisfies the equation within 1 %. The Explore mode shows
Newton's second law, dynamic pressure and Mach number, drag and lift, the rocket equation and
the ascent's Δv budget; the Engineer mode adds thrust against ambient pressure, vis-viva, gravity
with J2, the angles of attack and sideslip, Euler's rotation equations, quaternion kinematics and
the attitude autopilot. An equation with nothing to act on (no air, engines off, a coast
propagated analytically) says so. Details in PHYSICS.md §2e.

## 11. Frequency response, margins and step response (Engineer mode)

The attitude-loop inspector (§9) has three tabs: **Loop** (the block diagram), **Frequency
response** and **Step response**. The last two analyse the loop linearised about the flight's
state every half second, for the axis picked in the title bar, at the instant on screen (the
header says when the model was taken).

- **Frequency response**: the Bode plot of the loop gain |L| and its phase against ω on a
  logarithmic axis, with the 0 dB and −180° lines, ω_c (where |L| crosses 0 dB) and ω_g (where
  the phase crosses −180°) marked. Beside it a verdict — green when the closed loop is stable,
  red when it is not, with its least damped mode — then the phase margin, the gain margin, the
  gain-reduction margin when the loop has one, the number of unstable open-loop poles, and the
  model (its states, the actuator, the gimbal lag and the gains). The chart below charts the
  phase and gain margins over the flight so far, with a red line wherever the loop was unstable.
- **Step response**: the linear loop's answer to a 1° attitude step over 10 s — the command, the
  body's angle and, with P05's bending, what the IMU reads; the moment asked and delivered —
  with the rise time, overshoot, settling time and the angle after 10 s.
- **Feed-forward error** (both tabs): the autopilot feeds forward the air's moment; the slider
  makes that estimate wrong by −100 % (none) to +100 % (double) and redraws the plot, the margins
  and the step, to show how much the loop leans on it.

The linear loop has no rate, acceleration or gimbal limits, so a large step in flight is slower
than the chart. Details and checks against the nonlinear flight in PHYSICS.md §2f. The CSV adds
each plane's margins (`loop_pitch_pm_deg`, `loop_pitch_gm_db`, …) and `read_flight_state` a
`loopMargins` summary.

## 12. Tuning the autopilot and flight tests (Engineer mode)

**In the mission setup**, a six-DOF mission's *Attitude autopilot* section sets the roll channel's
and the pitch–yaw pair's K_θ and K_ω, rate limit and angular-acceleration ceiling, and how much of
the air's moment is fed forward (%). Left alone, the default autopilot flies; *Back to the default
autopilot* clears it.

**The inspector's Tuning tab** (§9) tries other gains on the loop the flight has linearised: move
K_θ, K_ω and the feed-forward and the tab redraws the loop gain, the 1° step and the phase margin
over the flight — flown dashed, trial in yellow — with both margins at the instant on screen
(green where the trial meets the targets). *Auto-tune* finds the widest-bandwidth gains that meet
the phase and gain margins you set, over the flight so far or at this instant, and says when no
gains can; *Use for the next launch* writes the trial into the mission setup. Rate and
acceleration limits act only in flight.

**The Flight test tab** flies a step or a doublet in the live flight about the axis picked in the
title bar, and draws the attitude reached against what the linear model predicted, with rise
time, overshoot, the difference between them and how long each limiter held the axis. It changes
the flight (the event log says when), and works only live, six-DOF, under the autopilot, one test
at a time; the result stays in the recording for replay. Details in PHYSICS.md §2g.

## 13. Inertial navigation (Engineer mode)

In a six-DOF mission's setup, the *Navigation (INS / GNSS)* section turns on an inertial
measurement unit — a navigation, tactical or MEMS grade, or your own figures — with GNSS fixes
(and an outage you can set) and a star tracker. The autopilot, ascent guidance and the cut-off
then fly on what the navigation believes rather than on the truth, so a poor unit without GNSS
puts the payload into a different orbit than the one it thinks it reached.

The attitude-loop inspector's **Navigation** tab (§9) charts the errors — true less estimated —
of position and velocity (radial, along-track, cross-track) and of attitude (roll, pitch, yaw in
the notation in force), each with the ±3σ the Kalman filter claims (dashed), GNSS outages marked,
and the orbit the navigation believes in less the true one. Beside them: GNSS and star-tracker
state, the errors against their 3σ, the orbit believed and true, the sensor biases true and
estimated, and the latest innovations. The CSV adds the same (`nav_*`) and `read_flight_state` a
`navigation` summary. Details in PHYSICS.md §2h.

## 14. Control-system failures and FDIR (Engineer mode)

In a six-DOF mission's setup, the *Control-system failures (G08)* section breaks the autopilot's
hardware at a set time: an actuator (a nozzle stuck, hard-over, slowed or wired backwards; an RCS
jet stuck on or dead), a sensor (one, two or all three IMUs reading the rate backwards, stuck,
biased or noisy, or failing outright; with navigation on, an accelerometer bias and the loss of
GNSS or the star tracker) or the flight computer (a hang, a gain of the wrong sign). Pick
**Scenario** for an accident — Proton-M 2013, Ariane 501, Vega VV17 — or a Falcon 9 nozzle
hard-over; it switches to the vehicle the scenario was written for and explains what happened.
Or build a list of up to eight failures, each with its time, the stage it waits for, and its
target.

**FDIR** switches fault detection, isolation and recovery on: the three IMUs vote (2 of 3), a
model of each nozzle actuator catches one that does not follow its command and shuts that engine
down if the stage can spare it, a jet firing unasked is closed off, and a backup computer takes
over from a hung one. Fly the same failure with FDIR on and off to see what it saves — and what it
cannot: a failure every IMU shares, a wiring error the monitors read as correct, a software error
the backup computer shares.

A failure can also be injected into a live flight with WebMCP's `inject_control_fault`. The
attitude-loop inspector (§9) marks the IMU, actuator and control-law blocks that failed, with each
unit's and engine's state; its rate chart shows what the IMUs read against the truth. The event log
reports every failure and every FDIR action; the CSV adds the failures' columns and
`read_flight_state` a `controlFaults` summary. A six-DOF launcher that loses control on the ascent
breaks up when its lateral load q·α passes 300 kPa·° — with or without the failures layer.
Details in PHYSICS.md §2i.

## 15. PEG and IGM ascent guidance (Engineer mode)

The *Ascent guidance: PEG and IGM (G01)* section picks the guidance the upper stages fly. The
first stage always flies its pitch program; once a later stage is lit, or the first stage is out
of the atmosphere (under 100 Pa above 70 km), **PEG** — the Space Shuttle's Powered Explicit
Guidance — or **IGM** — the Saturn V's Iterative Guidance Mode — steers to the insertion orbit's
perigee: its altitude and speed, a level flight path, and the orbit's plane. Both steer by the
linear tangent law from the stages still to burn; PEG corrects itself against a numerical
prediction of the cut-off, IGM solves in closed form with averaged gravity. If the stages left
cannot reach the target, the standard guidance takes over again (and the event log says so).
**Guidance cycle** sets how often the law re-solves (1 s by default).

In six-DOF flights with PEG or IGM the ascent load relief is also released at 4 °/s once the
dynamic pressure falls below 500 Pa, where the standard flight releases it all at once and swings
the stack by up to 24°.

The attitude-loop inspector's **Guidance** tab (§9) charts the time and velocity to go, the pitch
the law steers against the standard law's (and its yaw out of the target plane), and the orbit it
predicts at cut-off against the target, with the law's state. The cut-off itself is still decided
by the ascent on the orbit actually reached. The CSV adds `guide_*` columns and
`read_flight_state` an `explicitGuidance` summary. Details in PHYSICS.md §2j.

## 16. A flight to the station

With a **Soyuz-2.1a**, the **Crewed spacecraft** (a Soyuz MS) and the **ISS** orbit, section 03
of the setup offers **Flight to the station**: none (stay in the insertion
orbit), **two-orbit** (about 3 h, as Soyuz MS-28 flew it), **four-orbit** (about 6 h, as Soyuz
TMA-19M) or **two-day** (34 orbits, as Soyuz MS-01), and the **docking port**: Rassvet or
Prichal from below, Poisk from above, Zvezda's aft port from behind. Pick a launch window
(**Next window**) so the station's plane is the one the launch reaches.

The rocket puts the spacecraft into a 200 × 242 km orbit; from there the spacecraft flies
itself. Its engine fires for the profile's burns — the phase shows *Rendezvous burn* with the
burn and its Δv, and between them *Phasing* with the time to the next one — then the transfer
brings it 2.2 km behind and below the station, and **Kurs**, the automatic radio system, takes
over: the approach to 400 m, the **flyaround** onto the port's axis, **stationkeeping** 150 m
out, the **final approach** at a walking pace, then **contact**, capture and the hooks closing
13 minutes later. The telemetry panel's first chart is then *Relative motion*: the station at
the centre, its direction of flight to the right, up away from the Earth, the same scale both
ways, zooming in as the spacecraft closes. Near the station the exterior camera looks past the
spacecraft at it; the onboard camera (2) is the Soyuz's docking TV camera, with the port's
target to line up in its reticle and the range, closing speed and offset from the axis.

In the Engineer mode a **TORU** panel appears during the approach. **Take over (TORU)** hands
the spacecraft to you wherever it is: the translation buttons (or W/S, the arrows, X to stop)
set its velocity in toward the port, right and up as the TV picture shows them, the rotation
buttons its turn rates. Keep the target's cross on its disc and close at 0.1–0.35 m/s: a
contact faster, slower, more than 0.34 m off the axis, drifting sideways at 0.1 m/s or more, or
turned more than 7° (10° in roll) is not captured, and Kurs backs away for one more try before
the docking is called off. **Hand back to Kurs** lets it fly back to the stationkeeping point
and in again. How the profiles, the approach and the contact limits compare with real flights
is in [PHYSICS.md §9.2](PHYSICS.md).

## 17. Monte Carlo insertion accuracy (Engineer mode)

The *Monte Carlo: insertion accuracy (G05)* section opens a window that flies the mission in the
setup panel many times — always in six-DOF — each run with its own vehicle and air, to the end
of the mission, and shows how accurately the payload is put into orbit. The orbit is read at
two points, switched above the table: **at the end of the mission**, after every planned burn,
against the target orbit; and **at the ascent's cut-off**, against the insertion the mission
plans — the ascent guidance's own accuracy (a mission whose upper stage finishes the insertion
later, like Electron's, cuts off short of it on purpose).

**Settings.** *Runs* (20–2000, 200 by default) and a *Seed*: the same seed draws the same numbers,
whatever is switched off and whichever guidance flies, so two sets can be compared run by run.
*Fly the three guidance laws* flies every run with the standard guidance, PEG and IGM (§15) on
the same draws — three times the flights. Each dispersion can be switched off and its 1σ edited:
thrust 1 %, specific impulse 0.3 %, propellant loaded 0.5 %, dry mass 0.5 % (each per stage and
per strap-on group), air density 5 %, a steady wind of 5 m/s per horizontal axis added to the
mission's (with a new phase of its gusts), and — when the mission flies the inertial navigation
(§13) — a fresh realisation of its IMU's errors. Draws are normal, clipped at 3σ. The mission is
planned on the nominal vehicle; the dispersed one flies.

**Running.** *Start* spreads the runs over the computer's cores (all but one, at most 16); a
six-DOF run takes about a minute (longer for a mission that coasts to a higher orbit), so 200
runs take from about half an hour to a few hours. The
results fill in as the runs land, and *Stop* ends the set with what it has.

**Results.** The table gives, per guidance law, the runs in orbit and on target, and the perigee,
apogee, inclination and Δv left at the chosen point as mean ± 3σ, with the bias from the target
(or the planned insertion). The
chart plots each run's perigee against its apogee, with each law's 3σ ellipse and the planned
insertion; hovering a point shows the run. Histograms show the spread of each element for the
law chosen above them, with the planned value marked. **What drives the spread** regresses each
element on the numbers the runs drew: each dispersion's share of the variance, and *other* for
what it leaves — the gusts' and the IMU's realisations, and anything not linear (it needs three
runs per number drawn). Runs lost — broken up, or short of orbit — are counted with their cause.
*Download CSV* writes every run: its orbit, how it ended, and what it drew.

WebMCP's `run_monte_carlo` starts (`action: "start"`, with the same settings), reads
(`"status"`, optionally with the CSV) and stops the same set. Details in PHYSICS.md §2l, with what
the recorded sets found: Falcon 9 delivered to about a kilometre on every law, but even the
minimal dispersions lose a few runs to the air's loads, and leave a few in the wrong plane.

## Glossary

Vehicle, propulsion, orbital-mechanics and operations terminology, in English, Russian and
Thai, is collected in [docs/PHYSICS.md → Glossary](PHYSICS.md#glossary-en--ru--th) — the
same table the interface's own translations are checked against.
