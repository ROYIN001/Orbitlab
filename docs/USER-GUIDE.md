# Orbitlab user guide

A walkthrough for flying your first mission and making sense of what the simulator shows
you while it flies — written for a student rather than for a contributor. If you want the
equations and the sources behind them, that is [docs/PHYSICS.md](PHYSICS.md); this guide
sticks to what you see on screen and what it means.

## 0. Four ways in

The switch in the top bar picks how much of the simulator you see:

- **Home** — the landing page. **Watch a launch** plays the featured flight (Soyuz to the
  space station) straight away.
- **Watch** — just the picture, three numbers (mission time, altitude, speed over the
  ground) and one sentence about what is happening and why. **Choose a launch** lists six
  real rockets on typical missions; the speed buttons run the flight in real time (1×),
  faster, or at **Auto**, which keeps liftoff, max-Q and every separation in real time and
  hurries through the long coasts. When the rocket reaches orbit a card offers to keep
  watching, watch again, pick another launch, or plan a mission of your own.
- **Explore** — everything below this line, in the learning layout (the advanced guidance
  parameters stay folded away).
- **Engineer** — the same workspace with every guidance parameter open.

Switching mode never touches the flight: leave the viewer half-way up and the workspace
shows the same launch with every instrument on it. Each mode has its own address
(`#/watch` and so on), and the browser's Back button moves between them.

## 1. Set up a mission

The left-hand panel (top of the page on a phone) builds a `MissionConfig` in three steps.

1. **Vehicle & site.** Pick a launch vehicle from the dropdown — the card underneath shows
   its height, liftoff mass and thrust, thrust-to-weight ratio, stage count and rated
   payload to LEO/GTO/SSO. The site list below it only offers sites that vehicle actually
   flies from; picking a vehicle that cannot fly from your current site moves you to one
   that can and says so.
2. **Payload.** Choose a satellite/spacecraft (its mass fills in automatically) or type a
   payload mass of your own.
3. **Target orbit & launch time.** The pills (ISS, Starlink, sun-synchronous, polar, GPS,
   GLONASS, GTO, GEO, Molniya, Tundra) are ready-made targets; editing any number below them
   — perigee, apogee, inclination, argument of perigee, or the RAAN fields — turns the orbit
   into **Custom** without losing the rest. For a plane-specific target (the ISS orbit, or a
   sun-synchronous local time), **Next window** moves the launch time to the next moment the
   ascent plane actually reaches that RAAN; launching off-window still works, it just costs a
   plane-change burn at apogee (see [§5](#5-reading-the-telemetry-panel)).

Under **Guidance parameters** you can hand-tune the ascent (kick angle, pitch-program rate,
loft, pitch limits — see PHYSICS.md §5 for what each one does) or press **Auto-tune pitch
program**, which flies the ascent headlessly over a grid of values and keeps the one with
the largest remaining Δv. **Failure scenario** arms an engine-out, a thrust loss, a
premature separation, a stuck fairing, a range-safety destruct, or a random one of those, at
a mission time and stage you choose.

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

The small buttons beside the camera tabs reset the view, toggle the **glow** (the bloom around
the plume, the ignition flash and the city lights) and go full screen. If the picture falls below
about 24 frames per second the glow is switched off for a few seconds as a test: it stays off
only if that made the picture faster, and comes back otherwise. A screen or power-saving mode
that holds the browser at 30 fps therefore keeps its glow. Once you press the button your choice
is kept, also on your next visit. On a graphics card that cannot draw the high-range image the
glow needs, the button is greyed out and the scene is drawn without it.

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

## Glossary

Vehicle, propulsion, orbital-mechanics and operations terminology, in English, Russian and
Thai, is collected in [docs/PHYSICS.md → Glossary](PHYSICS.md#glossary-en--ru--th) — the
same table the interface's own translations are checked against.
