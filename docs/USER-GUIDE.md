# Orbitlab user guide

A walkthrough for flying your first mission and making sense of what the simulator shows
you while it flies — written for a student rather than for a contributor. If you want the
equations and the sources behind them, that is [docs/PHYSICS.md](PHYSICS.md); this guide
sticks to what you see on screen and what it means.

## 0. Three sections, three levels

Orbitlab is being grown into one space program in three **sections**: **Launch** (this
simulator), **Orbit** (orbits, orbit changes and what satellites do) and **Build** (designing a
rocket and a satellite). Each section has the same three **levels** — Watch, Explore and
Engineer — and the top bar has a tab for each section. The current tab carries its level as a
badge; pressing any tab opens the menu of that section's levels, so a section and a level are
picked together. On a phone the switch is one button that opens a table of every section and
level. The ORBITLAB name at the left of the bar goes back to the landing page. A tab marked with
a dot is a section still to come (Campaign, roadmap phase 6): its menu lists what the roadmap
brings to it. In Thai the launch section's first level is called รับชม (watching), the other
sections' first level พื้นฐาน (the basics), and the second level ทดลอง everywhere.
**Orbit** opens on its playground (section 0a below). **Build** takes real rockets apart, remixes
them, builds new ones from parts and tests them before they fly (section 0b below), and designs
satellites, tests them and flies them (section 0c); what is still to come to it (designing a rocket
from parts at the Engineer level) is listed at its Engineer level, from
[ROADMAP-PART2-3.md](ROADMAP-PART2-3.md). Everything after section 0c is about Launch, and about the
lessons (section 18), which a teacher can now write and check.

- **Home** — the landing page, a page you scroll (the wheel scrolls it; it does not move the
  scene). Its first screen is the featured rocket on its pad: **Watch a launch** plays the
  featured flight (Soyuz to the space station) straight away, **Start with a lesson** opens the
  lessons. Below it, one at a time, are the ways in — Watch, Explore, Engineer, the lessons and
  the Orbit section — each with a picture of it in the language you chose and a button that
  takes you there. At the end is the Earth with the International Space Station where it is
  now, and for the city you pick, when it next passes over and when you can next see it with
  the naked eye (a bright star gliding across the sky for a few minutes, the station sunlit in
  a dark sky), in the city's local time. With *reduce motion* set in your system, the pictures
  and the camera keep still.

Once a flight is in orbit, **Continue in Orbit** — under the telemetry panel, and on the viewer's
end card — puts the orbit on screen into the Orbit section's playground (section 0a), with the
spacecraft's mass, what is left of its own propellant, and the orbit lifetime analysis started
from it. The flight itself carries on in Launch.
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
- **Explore** — the mission builder below, lighter: the same simulation and the same
  physics as Engineer, with the settings an engineer tunes computed and shown instead of
  asked for (see **Explore** below).
- **Engineer** — the whole workspace, with every guidance parameter open.

**Explore.** The level is chosen in the top bar only, from the Launch tab's menu. A mission is set up in three steps,
one on screen at a time, with tabs to move between them — **Rocket**, **Payload**, **Orbit**:

1. **Rocket** — the quick starts, then the vehicles as cards, each with what it lifts to low
   orbit on a logarithmic bar (Electron's 300 kg to Saturn V's 118 t), the launch site, and
   whether the first stage comes home.
2. **Payload** — what is flown and its mass, drawn against the vehicle's rating for the
   orbit's class, with a tick at the 90 % the verdict calls tight.
3. **Orbit** — the presets and the perigee, apogee and inclination. Picking a plane that has
   to be launched into at its time (the ISS's, a sun-synchronous one) sets the next launch
   window. The argument of perigee, the RAAN mode and the LTAN come with the preset. Below:
   the weather (calm, crosswind or wind shear, for a six-DOF flight), the guidance, and the
   challenges.

The verdict above **Launch** is a light — ready, flyable with a caution, not flyable as set —
and under it the change that answers it, one press each: the next launch window, another
site whose range-safety corridor reaches the plane (or an inclination this one can fly),
the heaviest payload the verdict passes (found by bisection, the insertion flown where the
budget calls it marginal), and for a stack that the flown insertion probe says does not
reach orbit, the auto-tuner. None is offered during a lesson.

The **guidance** is the vehicle's own pitch programme — the pitch-over altitude, the kick and
its duration, the pitch-program rate, the gravity-turn ceiling, the loft — the one
`tests/fleet-defaults.test.ts` and the six-DOF fleet fly to every reference orbit each vehicle
can reach (LEO, the ISS plane, SSO, GTO, at 25, 50 and 90 % of the rated payload) with no
tuning; the closed-loop limits are the vehicle's and the parking orbit the planner's. The card
shows the values flown. Anything changed at the Engineer level — a guidance value, the
auto-tuner's result, the flexible body, the autopilot, navigation, control failures, PEG or
IGM, a dispersed flight — is still flown in Explore, since a level never touches the mission:
the card marks it (✎), names it, and **Back to the computed values** removes it. A lesson
that asks the student to change the guidance (2.1, the acceleration limit) shows its fields.

The **challenges** are the failure scenarios, each set for its moment: an engine out at T+80 s,
a thrust loss at T+100 s, a premature separation at T+90 s, a range-safety destruct at T+70 s,
a launch abort at T+60 s, the pad fire six seconds before liftoff; the separation failures
strike at their separations. The Engineer level sets the moment and the stage itself.

In flight, the set-up gives way to a summary of what is flying (**New mission** brings the
set-up back); the telemetry panel starts with the flight against its target orbit —
apoapsis and periapsis against the target's, the inclination, the Δv left — and shows one
chart at a time (altitude, speed, dynamic pressure, acceleration, the apsides, Δv left); the
6-DOF manual controls appear only while a flight is under manual command. A moment after the
flight's outcome a card says what happened and why, the orbit reached against the target, the
Δv left and where the ascent's went (gravity, drag, steering), and the next step, and offers to
fly again, to keep watching (it folds into a tab), to carry the orbit on into Orbit, and every
number at the Engineer level. The result table under the controls is the Engineer level's.

Switching level or section never touches the flight: leave the viewer half-way up and the
workspace shows the same launch with every instrument on it, and a flight left running while
you look at Orbit is still flying when you come back. Every section and level has its own
address — `#/launch/watch`, `#/orbit/explore`, `#/home` and so on — the browser's Back button
moves between them, and the app reopens where you left it. The older addresses `#/watch`,
`#/explore` and `#/engineer` still work: they open the launch section, and the address bar shows
the new form.

**Offline or online data.** The cloud in the top bar says where Orbitlab's data come from, and
opens the **Data sources** window. **Offline**, the default, sends no request outside: the app
uses the data bundled with it, each dated ("data as of …"), and the platform's own fonts — the
right setting for a closed network, a classroom or no connection. Online also loads the
interface's web fonts. **Online** fetches current data from the sources that publish them
and falls back to the bundled copy, saying why, whenever they cannot be reached. The window lists
each dataset with its date and where it came from: the space weather (the solar flux F10.7 and
the Kp index, from NOAA), which the orbit lifetime and re-entry read; the satellite catalogue
(CelesTrak); and the Earth's orientation (the IERS), which is always the bundled copy because the
IERS cannot be read from a page.

**Installing Orbitlab and using it offline.** The published site can be installed as an app
(Chrome or Edge: the install icon in the address bar; Android: *Add to Home screen*; iPhone
and iPad: *Share → Add to Home Screen*), and once it has been opened online it works with no
network at all — the page, the physics and auto-tune workers and the Earth textures are all kept
on the device, and the fonts and the landing page's pictures too once they have loaded. When a new version is published, a note
at the bottom of the page offers **Reload**; until you press it, the version you have keeps
running.

## 0a. The Orbit section: the orbit playground

The Orbit section opens on one orbit and three ways of looking at it. The tabs over the picture
switch between them:

- **3-D**: the orbit about the Earth, which turns with the time of day and is lit by the Sun of
  that moment. **P** and **A** mark the perigee and the apogee, and **☊** the ascending node,
  where the orbit crosses the equator going north. Drag to turn the view; the wheel or a pinch
  zooms; a double-click shows the whole orbit. An orbit drawn in red passes below the ground:
  it would hit the Earth.
- **Ground track**: the point under the satellite on a map, a revolution back as a dashed line
  and the next ones solid, with the night side and the point under the Sun.
- **Newton's cannon**: a cannon on a mountain above the air, firing sideways. Set the speed and
  press **Fire**. Up to about 7.8 km/s the ball falls back, further round the Earth each time;
  faster, it goes all the way round (an orbit); above the escape speed, about 11 km/s, it never
  comes back.

Under the picture are the clock, how fast it runs, and **⟲**, which goes back to the start.
Space pauses and resumes.

The three levels:

- **Watch**: a tour in seven steps, from Newton's cannon to the space station, Hohmann's
  transfer to geostationary height, a Molniya orbit, a geostationary satellite standing over
  78.5° E (the slot Thaicom's satellites use) and a sun-synchronous orbit; then eight steps with
  the real satellites of the bundled catalogue, where they are now: the space station and its next
  passes over the place, THEOS-2 on its sun-synchronous track, the navigation and weather
  satellites, the Earth-imaging satellites, the debris of Fengyun-1C, and the Long March 5B stages
  that fell uncontrolled. **Next** and **Back** move between the steps; **Try it yourself** opens
  Explore on the orbit on screen.
- **Explore**: choose an orbit from the list, or set its perigee and apogee altitudes, its
  inclination i, its node Ω and its argument of perigee ω with the sliders or the number boxes.
  Dragging the perigee above the apogee takes the apogee along. **Earth's bulge (J2)** lets the
  equatorial bulge turn the orbit's plane and perigee. **Kepler's second law** shades twelve
  slices the satellite sweeps in equal times. The panel on the right gives the orbit's period,
  speeds and altitudes, and Kepler's three laws with this orbit's own numbers.
- **Engineer**: the classical elements themselves (a, e, i, Ω, ω and the mean anomaly M₀), and
  the orbit's energy, angular momentum, the drift of the node and the perigee, the nodal
  period, how far the track steps west each revolution, and the local time at the ascending
  node. **Repeating ground track** finds the circular orbit whose track repeats after N
  revolutions in D days. 143 revolutions in 10 days, sun-synchronous, gives 786 km: Sentinel-2's
  orbit.

**Maneuvers** (Explore and Engineer) plans a change of orbit from the one set above. Choose one
and its numbers, and the plan appears on the right: each burn, where and when it is made
(T+ on the clock) and how big it is, the total Δv, the transfer time and the orbit it ends on.
The 3-D view draws the orbits of the plan as dashed lines and numbers the burns. Press play,
and the satellite flies the plan, burn by burn.

- **Hohmann transfer** and **Bi-elliptic transfer** go to a circle at the height you give.
  The bi-elliptic plan also says what Hohmann would have cost.
- **Plane change** turns the orbit's plane to the inclination you give, at the node farther
  from the Earth.
- **Circularise at apogee (GTO → GEO)** rounds the orbit off at apogee and turns it towards
  the equator, in one burn or split over several apogees.
- **Phasing** moves the satellite along its own orbit in a few revolutions.
- **Deorbit burn** brings the perigee down, and says when the satellite reaches 100 km.
- **Low-thrust spiral** is an electric thruster's slow climb, Edelbaum's way.
- **Your own burns** takes up to five burns, each at a point of the orbit (now, perigee,
  apogee, a node, or after a set time), with prograde, normal and radial parts.

**Plan from now** starts the plan at the time on the clock, and **Carry on from the new orbit**
makes the orbit at the end the playground's. At the Engineer level, **Rendezvous (Lambert)**
plans a transfer to a satellite in your orbit's plane, at a height and a phase you choose. The
**Porkchop** tab plots the total Δv of every departure time and time of flight: the white ring
is the cheapest, the red one the transfer planned. Click a point to plan it instead. The tour
at Watch has a step for Hohmann's transfer.

**Spacecraft**, under the maneuver's numbers, says whose tanks the plan is paid from:

- **None** shows the Δv alone.
- **From your launch** uses the spacecraft a flight handed on, with what is left of its own
  propellant.
- **Your own** takes a mass, propellant, Isp and thrust. It starts as the catalogue's weather
  satellite: 1 800 kg, 400 N, Isp 315 s.

The plan then gives each burn's propellant and how long its engine runs, the Δv in the tanks,
what is burned and what is left. It says so when the tanks run dry, and in which burn. **Carry
on from the new orbit** leaves the spacecraft lighter by what it burned.

**What satellites do** (Explore and Engineer) turns the orbit into what it is for. Its three
applications are:

- **Communications from geostationary orbit.** Choose where the dish stands: a Thai city, St
  Petersburg or Moscow, or coordinates you type in. What you type stays in the page; the browser
  is never asked for your location. The playground then says where the dish points (azimuth and
  elevation), how far away the satellite is, and how long a signal takes up and down, compared
  with a satellite 550 km up. It also says how much of the Earth the satellite sees above the
  lowest elevation you set. The ground track draws the station and that footprint. At the
  Engineer level the link budget follows: path loss, dish gain, G/T, C/N₀ and Eb/N₀, from a
  frequency, EIRP, dish, noise temperature, losses and data rate you choose.
- **Earth observation.** A camera's swath and ground sample distance (or, at the Engineer
  level, its focal length, pixel pitch and pixels), how far apart the day's tracks are, how much
  of that gap the camera sees looking straight down, and how far tilting the satellite reaches.
  The ground track draws the swath along the next revolution.
- **Thailand's satellites.** THEOS, THEOS-2, NAPA-1, NAPA-2 and Thaicom 4, 6, 7 and 8, each with
  its operator, builder, launch, orbit, camera, identifiers and sources. **Show its orbit** puts
  its catalogue orbit in the playground. That is its shape, not where it is today; to see where
  it is now, use **Real satellites** (below).

For Thaicom 8 from Bangkok, the dish points south-west (239.5°), 59.9° up. For THEOS-2, the
10.3 km swath covers well under 1 % of the gap between two of the day's tracks, which is why the
satellite tilts.

After **Continue in Orbit** from a flight, the list says **From your launch** and the playground
starts from where the flight was. **Orbit lifetime**, under the orbit's figures, runs the
long-term analysis on whatever orbit the playground is showing. With a flight's spacecraft it
uses that spacecraft, as it is now; without one it starts from an estimate you can change in the
dialog. At Watch, the flight's orbit is the first card, before the tour.

The model is Kepler's orbit plus the secular drift of J2, nothing more: no drag and no Sun or
Moon. [VALIDATION.md](VALIDATION.md) §5 holds it to real orbits.

### Real satellites (Explore and Engineer)

The switch at the top of the left panel changes between **Your orbit** and **Real satellites**.
Real satellites are drawn where they are, from the element sets they are tracked by, propagated
by SGP4, the theory those sets are made for. The clock starts at this moment and runs at the
speed you choose; **⟲** brings it back to now, and **Live** shows while it is now.

- **Group**: the space stations, Thailand's satellites, the navigation satellites (GPS, GLONASS,
  Galileo, BeiDou), the weather satellites, the Earth-imaging satellites (civil, commercial, and
  the military ones whose element sets are published), or the debris of Fengyun-1C, destroyed by
  an anti-satellite test in 2007. The group is drawn as points in 3-D and on the ground track.
- **Overflights of** a place, under the group's list: every pass of the group's satellites over a
  city or your coordinates in the next 24 hours or 3 days whose highest point is at least the
  elevation you choose (30° by default), soonest first: when, how high and in which direction,
  the off-nadir angle a camera must look at to see the place, whether the place is in daylight
  (optical cameras need it, radars do not) and whether the satellite is heading north or south.
  For 95 imaging satellites whose instruments are published, each pass also says what the
  instrument can make of it: a camera needs daylight and the place inside its swath (Landsat,
  Sentinel-2) or within the angle it can turn to (Pléiades, WorldView, THEOS-2); a radar
  (Sentinel-1, COSMO-SkyMed, ALOS) sees by night and through cloud, but only to its side and within
  its band of incidence angles. **Only when its instrument can image the place** keeps just those,
  and **Show on the map** under a pass picks the satellite, sets the clock two minutes before and
  draws the pass on the ground track with the edges of the ground its instrument can reach: a
  camera's swath or pointing reach either side, a radar's band on its side.
  Engineer adds the distance from the ground track, the local solar time, the timing
  uncertainty and a link to the instrument's source. It is when the place *could* be seen, not
  that it is: that takes the operator's tasking and, for a camera, a clear sky.
- **When it will come down**, for a satellite whose perigee is under 700 km: its orbit is carried
  down with the Sun as measured and forecast to a predicted re-entry, with the window of ±20 % of
  the time left that the agencies use. The drag comes, as you choose, from the object's own decay,
  fitted as the agencies fit it to the tracking — to the decay rate its element set carries, or,
  for an object read from a file with several of its sets (a history you downloaded), to how far
  it fell between the first and the last — or from a mass, mean cross-section and C_D you give.
  An eccentric orbit, a stage left in a transfer orbit, is carried step by step with the Sun's and
  the Moon's pull, which takes some seconds. The ground track then shows where it may come down:
  its track through the window when the window is two days or less, and otherwise the band of
  latitudes its orbit covers (a satellite can fall anywhere under its orbit). More than a year away, the orbit lifetime analysis is
  the tool. **Case study: the Long March 5B core stages** predicts the four 21.6-tonne stages from
  their first element sets and sets each prediction beside the re-entry on record; **Case study:
  NAPA-2** predicts the Royal Thai Air Force's CubeSat five years ahead from its first element set,
  by its size and with the drag fitted, beside the day it came down.
- **Worksheets from real cases**, under the group's list: a printable sheet of questions and,
  apart, its answer key with the working, on a case from the record — the collision of Iridium 33
  and Cosmos 2251 (the conjunction message's data, its encounter plane, the miss in standard
  deviations, why 10⁻⁵¹ was wrong), the Long March 5B stage that launched Tianhe (Cauchy's area,
  C_D·A/m, the ±20 % window against the day it fell) and THEOS-2 over Bangkok (the J₂ turn that
  makes an orbit sun-synchronous, how far it sees tilted 45°, the local time it passes). Each is
  made in the page in the language on screen, as HTML to open and print, its units and option
  letters in that language's own script. Each case is also a graded lesson (§18, lessons
  6.1–6.3): while a case's lesson is open and not yet passed, its answer key here waits, and the
  Long March 5B case study leaves out the error of the stage of Tianhe, which lesson 6.2 asks for.
- **Search** by name, catalogue number or international designator, then pick a satellite. Its
  orbit and its track are drawn. The right panel gives its catalogue number and designator, the
  epoch of its element set and how old the set is, where it is now, its period, its mean perigee
  and apogee, its inclination, and whether SGP4 or SDP4 (deep space) carries it. The Engineer
  level adds the mean elements, the drag term B* and the position and velocity in TEME.
- **Passes over** a place, under the satellite's figures: choose a city or type coordinates (they
  stay in the page), and the lowest elevation that counts. The next three days' passes are
  listed, each with when the satellite rises, is highest and sets, in which direction and how
  high as you see it (the air's refraction included). Each pass also says whether you can see it:
  only when the satellite is in sunlight and your sky is dark (the Sun 6° or more below the
  horizon), and, for a satellite with a standard magnitude, about how bright it gets (a magnitude:
  smaller is brighter). The first line counts down to the next pass. Times are your device's clock. The map draws the place, and the circle of ground from
  which the satellite is above that elevation.
- **Position error (estimate)** says how far off the satellite may be: an element set does not
  carry its own accuracy, so the page estimates it from published studies, from the kind of orbit
  and the set's age. **How far off it may be** draws the band widening with that age and names the
  studies. At the Engineer level each pass gives its timing uncertainty.
- **Close approaches** screens every object loaded — the catalogue's groups and a file you read —
  against the satellite picked, for 24 hours, 3 or 7 days from the moment on screen: each pass
  nearer than the limit you choose, when, how near, and an estimated probability of collision
  from both element sets' estimated error and the size you give the pair. Engineer adds the miss
  split radial, along-track and cross-track, the relative speed and each set's uncertainty. It is
  what CelesTrak's SOCRATES does with the same data, and it shows traffic, not collisions: the
  page recalls that Iridium 33 and Cosmos 2251 were 152nd on the list the day they collided. The
  screening runs off the page's own thread, so a whole catalogue read from a file (some 30 000
  objects) can be screened while the page stays usable, and stopped. **Show it** under an approach
  moves the clock to five minutes before it, draws the other object's orbit and the meeting point
  in 3-D, the point below the meeting and the other object's track on the ground track, and the
  *encounter plane*: the other object at its miss distance with the pair's
  combined size round it, and the combined position uncertainty as ellipses — the probability is
  the share of the uncertainty inside the circle. A probability smaller than 10⁻¹⁰ is shown as
  *below 10⁻¹⁰*: the numbers do not carry a precision finer than that.
- **A conjunction data message**, under the screening: an operator is warned of an approach to its
  satellite by such a message (CCSDS 508.0-B-1, from the combined space operations centre through
  Space-Track), which carries each object's position uncertainty from the tracking. Read one in its
  text form (KVN) and the page gives the probability from the message's own uncertainties, with its
  encounter plane, beside the probability the message states. The file is read in the page and
  sent nowhere.
- **Put this orbit in the playground** takes the satellite's orbit as it is at that moment into
  Your orbit, to plan maneuvers from. From there Kepler and J2 carry it, not SGP4, so over days
  the two part company.
- **Read a file of element sets** opens a file you have: TLE or 3LE, or OMM as JSON, CSV, XML or
  KVN, from CelesTrak or from your own Space-Track account. It is read in the page and sent
  nowhere. Whatever cannot be read is listed, line by line or set by set, with the reason.

Offline (the default) the element sets are the snapshot bundled with this version, dated in the
right panel. Online they come from CelesTrak, at most once in two hours and one list at a time,
as CelesTrak asks, and from the snapshot whenever CelesTrak cannot be reached; a list that cannot
be read keeps its own group from the snapshot, and the panel says which. A published site is rebuilt every day
with a fresh snapshot. An element set is a fraction of a kilometre to a few kilometres off at
its epoch, and further as it ages; [VALIDATION.md](VALIDATION.md) §6 holds SGP4 to its
reference.

## 0b. The Build section: rockets taken apart, remixed, built and tested

Build is where rockets are taken apart and put together (satellites are section 0c). Press
**Build** in the top bar; its menu chooses Watch, Explore or Engineer. (The landing page has no
Build chapter yet, so the top bar is the way in.) Every rocket here is made from one parts
catalogue, the same one the 21 real rockets are assembled from, and every figure is worked out by
the physics the launches fly. What the builder cannot know is marked as an estimate, and the
section below the three levels says what those estimates mean.

### Watch: real rockets, taken apart

- **Choose a rocket** from the list, or step through all 21 with ‹ and ›. They are grouped into
  today's rockets and historical ones.
- **The drawing** is to scale, with a scale bar at the bottom. **Taken apart** moves the stages
  apart along the axis, the strap-ons out to the sides and the fairing's two halves apart;
  **Assembled** stands the rocket up. Each strap-on group is drawn as one unit on each side and
  labelled with how many there are.
- **Click or tap a part, or its label,** to open its catalogue card: its engines (how many, their
  thrust and specific impulse at sea level and in vacuum, how far they throttle down, what they
  burn, and what one engine weighs, with how far that figure can be trusted), its dry mass,
  propellant, diameter and length, its structural ratio and propellant fraction, and its sources
  as links. A vacuum engine shows no sea-level figures. A solid motor's thrust is its mean over the
  burn. Labels can also be reached with Tab and opened with Enter; Escape closes the card.
- **Stage by stage** gives each stage's ideal Δv (split into "with strap-ons" and "core alone"
  where there are strap-ons), its burn time, its thrust-to-weight at ignition, its structural
  ratio ε and its propellant fraction. It is worked at half the rated low-orbit payload, with
  vacuum Isp and no gravity or drag losses, from the catalogue's rounded figures: estimates. Falcon
  Heavy's and Angara-A5's cores show 0 m/s alone, and a note says why: the figures count them at
  full throttle, while in flight they throttle to 55 % and 30 % beside their strap-ons. On a phone
  each stage is a card.
- **The tour** has five steps, each on a real rocket: Saturn V (a rocket is a stack of stages),
  Falcon 9 (why rockets stage: the rocket equation), Soyuz (strap-ons and the parallel phase),
  Atlas V (why an upper stage can push less than its weight) and Ariane 64 (the fairing). Saturn
  V's 110.6 m counts the Apollo spacecraft and its escape tower, which are not drawn. If you pick
  another rocket, **Show it** brings back the step's own.

### Explore: remix a real rocket, or build one from parts

Choose **Remix a real rocket** or **Build from parts**. Each keeps its own design, name and
payload. The drawing, the figures at a glance, the stage-by-stage table and **Before it flies**
follow every change.

- **Remix a real rocket.** Pick the rocket to start from; unchanged, it shows exactly the real
  rocket's figures. For each stage, stretch or shrink its propellant (50–200 %), change its engine
  to one that burns the same propellant, and change the number of engines. Take strap-ons off or
  add catalogue strap-ons (up to four groups), and fit another fairing. A stage keeps the real
  rocket's steering, thrusters and drawing while its engines are unchanged; a stage whose engines
  you change gets generic ones and is named after its engines. Swapping engines changes the dry
  mass by the engines' published masses. A stretch scales the propellant, the tank structure and
  the stage's length; how much the structure grows is an estimate.
- **Build from parts.** Choose the launch site, then stack stages (**Add a stage on top**, up to
  six). Each stage is a catalogue body, or **A body of my own**: its dry mass with the engines
  included, its propellant, diameter, length and propellant type. Give each stage an engine and a
  number of them, then add strap-ons (catalogue bodies) and a fairing. A kerosene tank needs a
  kerosene engine, and a solid body needs a solid motor.
- **Before it flies** lists, in plain words and with the numbers, what **Will not fly** (red, ✕)
  and each **Warning** (orange, !): a rocket that will not leave the pad, an upper stage too weak
  for the planner, a stage that cannot throttle down to the acceleration limit, an upper stage
  wider than its fairing, and so on. **What is estimated or assumed** lists the builder's
  approximations. If the builder cannot make a change it says why, and the drawing shows the last
  rocket it could make. Some details are only in English, under "Technical detail (in English)".
- **Payload ratings.** A rocket you changed shows "unknown" until you press **Compute ratings**.
  That flies test flights, about 1–2 s, with a **Stop** button; any edit stops it too. The results
  are the model's estimates, not a manufacturer's figures (below). The Launch section judges a
  mission by the rocket's ratings, and a rating of 0 counts as none: compute them before you fly,
  or Launch's Explore level will say the rocket will not fly.
- **Your designs.** **Save** keeps the design in this browser; **Save as new** makes a copy. Each
  saved design can be opened, renamed, exported or deleted (after a confirmation; Escape cancels a
  rename or a delete). **Export this design** and **Import a file** use `.orbitlab.json` files,
  and an import is all or nothing. If the browser's storage is full or switched off, the page says
  so: export the design as a file instead. The rocket on the bench is also kept in this browser
  across a reload, in both modes; that is not a saved design, and **Start again** clears it. A
  saved design keeps the rocket, not how it was made: a remix reopens with its stretches back at
  100 %, and the payload is not kept.
- **Fly it** opens Launch at the same level, with your rocket and payload, bound for a 500 km low
  orbit from its first launch site (the payload is called the CubeSat rideshare dispenser, whatever
  its mass). Change the mission there. It flies as a point mass unless you tick **Fly it in six-DOF
  (experimental)**: six-DOF also flies the rocket's attitude, but with generic steering and
  thrusters where real rockets have their own, so it is an experiment, not a prediction. The
  first-use guide in Launch moves past "choose a Quick start example", which would replace your
  rocket.

### Engineer: design and test

The level is called **Design and test**. The rocket chosen under **Launch vehicle** is used by
every tab: a real rocket, the design open in Explore (listed as "(open in Explore)", once Explore
has been opened in this session), a saved design, or a launcher sized here.

- **Test stand.** Pick an engine: one on the rocket (each stage, or one strap-on of each group) or
  any engine in the parts catalogue. Set how many, how much propellant, the throttle, and if you
  like **Shut it down early**. Choose where it fires: a vacuum chamber, sea level, or a launch
  site's height (the page gives the air pressure there). You get the total impulse, the burn time,
  the peak thrust, the delivered specific impulse and the propellant burned, and curves of thrust,
  mass flow and Isp against time, with close-ups of start-up and tail-off (both the model's
  estimates). **The model beside the data** sets the catalogue's published figures next to what the
  stand measured, with the difference: where they differ, the model departs from the data (for
  Vulcain 2.1's sea-level Isp, by 5 %). The stand fires the engine as a flight does, with the same
  throttle limits and solid-motor thrust curve. It refuses a vacuum engine in air and a shutdown
  of a solid motor, says why, and offers the way out.
- **Wind tunnel.** Choose what is in the tunnel (the whole rocket or from a given stage up,
  strap-ons on or off, fairing on or off, propellant left, payload), then C_N, C_A, C_m or the
  centre of pressure, over 0–10° or 0–90°. Point at a cell, or select the map and use the arrow
  keys, to read its value. Hatched cells lie beyond the 15° the tables are built for. Below the
  map: the drag coefficient at zero angle, which is the curve the point-mass flight flies, and the
  static margin in diameters. Above zero the air turns the nose back into the wind; below zero only
  the steering of the engines keeps the rocket pointed, as on almost every launcher. The tables
  are the model's estimates, not wind-tunnel data, and fins and the nose's shape do not change
  them.
- **Readiness review.** Choose the target orbit, the launch site (one of the rocket's own) and the
  payload. The checklist has six parts: the specification; the design's warnings, in Explore's
  words; the mission plan on paper; a test flight (point mass, calm air; always flown for a rocket
  of your own); the Launch section's own verdict; and notices. A line at the top says **Ready to
  fly**, ready with warnings to read first, or **Not ready**, with the number of failing checks.
  The test flight asks only whether the rocket gets into orbit at all; the orbit it shows is the
  one at that moment, not the target. A rocket still flying, never lost, when the test ends at
  2 400 s counts as reaching orbit, and the row says so. **Fly it** works only when nothing fails,
  and opens Launch at the Engineer level with exactly the mission reviewed. A rocket of your own
  with no payload rating always fails the verdict ("no rating"): press **Compute its payload
  ratings** (1–2 s, estimates), and the review runs again on the same mission with them. A mission
  to a sun-synchronous orbit is then judged against the computed low-orbit rating.
- **Optimal staging.** Start from a real rocket (Saturn V first) or the rocket on the bench, then
  change the number of stages (1–5), each stage's Isp and structural ratio, the Δv and the payload.
  You get each stage's share of the Δv, its mass ratio and mass, and the payload ratio; when there
  is no answer, the page says why. With two stages, a chart shows the payload ratio against the
  split, with the best split marked. Strap-ons are left out, and the page says so. **Compare with
  the real vehicle** sets the rocket's own split beside the best one. Saturn V's first stage takes
  3.88 km/s where the loss-free best gives it 1.75. The method counts no losses and treats each
  stage's structure as fixed; real gravity losses depend on how the Δv is split, which is one
  reason to give a high-thrust first stage more. Falcon 9, Long March 2D, Electron and Starship
  give their first stage less than the optimum.
- **Sizing.** Give a payload, an orbit, a launch site, a fairing (or **Narrowest that fits**) and
  any **Extra Δv**; for each stage choose an engine, a structural ratio, a diameter and a
  thrust-to-weight. You get the design Δv and where it comes from, each stage (engines, T/W, mass,
  length), a drawing to scale, the figures, the warnings, and everything that is an estimate or a
  default. The design Δv is the planner's allowance, and real rockets may need more: the 1 t
  launcher the page starts on runs out of propellant short of orbit and needs about +500 m/s,
  mostly because of the 800 kg fairing "the narrowest that fits" gives it. **Check readiness**
  reviews the launcher for its mission. **Open in the builder** loads it into Explore's parts
  builder, where you can change, save and fly it; there its lengths and fairing are no longer
  marked as estimates, but they still are.

### What the estimates mean, and what the builder will not do

- **"Ideal" Δv** is the rocket equation with vacuum Isp and no gravity, drag or steering losses. A
  real ascent pays those losses too, so a rocket needs more ideal Δv than its orbit's speed.
- **Figures marked "estimate"** are the builder's approximations, not published data: a stretched
  tank's structure, a sized stage's length, the defaults a design of your own has not set (the
  dynamic-pressure and acceleration limits are the fleet's middle values, the fairing comes off at
  115 km), and every computed rating. The country a design of your own takes from its launch site
  is shown as a default, not an estimate. The catalogue's own figures are rounded public ones, good
  to about ±10 %, and some have no source; the part card says so.
- **Computed payload ratings** are the heaviest payload the model delivered in test flights of the
  design, point mass, in calm air, on the guidance programme it carries, to 200 km at the site's
  lowest inclination (or the original rocket's published rating orbit) and to the standard
  transfer orbit. Against eight published ratings they came within 25 % for seven; Vega-C's
  low-orbit rating comes out 31 % high. A remix keeps the original's guidance programme, which may
  not suit it, so a big change can lower its rating; how much of a drop is the programme's has not
  been shown.
- **The builder will not**
  - re-count an engine entry that stands for several engines at once (YF-75, for one);
  - swap or re-count a solid motor (stretch or shrink it instead);
  - put an engine on tanks of another propellant;
  - put a vacuum-only engine on the first stage, or fire one in air on the test stand;
  - shut down a solid motor on the test stand;
  - make a rocket past the program's limits (six stages, four strap-on groups, 50 engines to a
    stage);
  - size strap-ons or solid stages (sizing makes stacks of liquid stages only);
  - stretch or re-engine strap-ons in a remix, or take strap-ons of your own in the parts builder.

### Small things that help

- **Typing numbers:** a decimal comma or a point both work (0,08 or 0.08), and spaces between
  thousands (11 400). In English and Thai "11,400" is eleven thousand four hundred; in Russian it
  is 11.4. A box turns red if it cannot read a number. The Up and Down arrow keys step the value.
- **Escape** closes a part card and cancels a rename or a delete.
- **Watch and Explore** both list **Taken apart** first and **Assembled** second; Explore opens
  assembled.
- **The Engineer level's "Coming" list** notes that building from parts is already at the
  Explore level, with a link there.

## 0c. The Build section: satellites designed, tested and flown

Build designs satellites too. At Explore and Engineer, the switch above the level ("Build a"
**Rocket** or **Satellite**) changes what is on the bench: at Explore the satellite is **Design a
satellite**, at Engineer the **Satellite bench**, and both work on the same design. (Watch takes
rockets apart only.) Every figure is worked out as you type, by the same satellite physics at both
levels, for a day you choose. What the designer cannot know is marked as an estimate, and the last
part of this section says what those estimates mean.

### Explore: design a satellite

- **Where it starts.** Pick a template. Under "Thai satellites": **NAPA-2**, the Royal Thai Air
  Force's 6U CubeSat (10 kg, on the orbit it flew), or a **THEOS-2-class** imager. Under "Classes
  of satellite": communications and weather (in GEO), Earth observation, navigation and science,
  each the Launch section's class with its typical mass, engine and size. **Start again from the
  template** puts it back as it was.
- **What you change.** The orbit (perigee, apogee and inclination; with **Sun-synchronous** on,
  the inclination follows the height), the design life, the dry mass, the loads, the cells' area and
  how they are mounted (Sun-tracking wings, on the body, or on a spinning drum), the battery, the
  propellant, the radio's power and data rate, and the camera's focal length and pixels. Each
  number carries a mark: **sourced** (point at the mark to read the source, or see the sources at
  the Engineer level), **estimate**, or **yours** once you have changed it.
- **What it gives.** **At a glance** and **The figures** follow every change: the eclipse (on the
  design date, and the year's longest), the array and battery that eclipse needs and the margin
  you have, the Δv budget against what the tanks hold, the torques the satellite meets and the wheel
  they call for, the downlink's margin and highest data rate, and the camera's detail on the ground,
  its swath and the finest detail its aperture allows. **What works and what does not** says, in
  words and numbers, what **Will not work**, each **Warning** and each **Note**, including what is
  estimated.
- **The design date.** The figures are worked out for one day, shown at the top of both levels:
  the Sun's angle to the orbit, and with it the eclipse and the power, change through the year. It
  is today on your own calendar unless you set it, and **Today** brings it back. It is kept with
  the design you are working on in this browser, not with a saved design. The bench's lifetime run
  starts on it, and **Send to Orbit** places the satellite on it.
- **Your designs.** **Save**, **Save as new**, export and import work as for rockets, with
  `.orbitlab.json` files. A rocket's file imported here is opened in the rocket designer, and a
  satellite's file imported there is opened here; the page says so. The design on the desk comes
  back after a reload in the same browser.

### Send to Orbit

Under **Fly it in the Orbit section**, **Send to Orbit** puts the satellite in its orbit in the
Orbit section, with no launch. The playground labels it "From your satellite design", the **Orbit
lifetime** analysis flies its own mass, drag area, C_D and C_R, and the manoeuvre planner its own
engine and propellant (a design with no engine is said to have none). It is held back until the
checks accept the design.

### Fly it in the Launch section

- **Launch vehicle:** the Launch section's current rocket first, then the fleet. The box
  says what will fly: the rocket and its launch site, the target orbit (a preset's name, or "a
  custom orbit of 520 × 540 km, sun-synchronous with the ascending node at 22:30"), the mass with
  full tanks, what the satellite's own engine will do, and whether it fits the fairing. That last is
  an estimate: the usable space is taken as 85 % of the fairing's diameter and 80 % of its length,
  and a satellite's width is the diagonal of its box, since a box's corners reach further out than
  its sides.
- **The verdict before you click.** The box shows the Launch section's own verdict on the mission
  it will open, with the same light and words as the Launch panel: **Ready to fly**, **Flyable,
  with a caution** or **Not flyable as set**, and the same sentence. When it says "Not flyable as
  set", it lists the rockets in the menu that the same verdict lets fly your satellite; click one to
  pick it. NAPA-2 on the Launch section's default Soyuz-2.1a, for one, is not flyable as set:
  Soyuz-2.1a has no upper stage that can light again to finish its orbit. While you type a number
  the verdict fades until it is worked out again. **Fly it** stays available on a failing verdict,
  as Launch itself lets you try.
- **Fly it** opens the Launch section with your satellite as the mission's payload, flown point
  mass; change the rest of the mission there. The launch site is one whose range-safety corridor
  reaches the orbit's plane: on Soyuz a sun-synchronous design flies from Plesetsk, not Baikonur;
  on Falcon 9, Atlas V or Vulcan, from Vandenberg. A satellite whose orbit's plane is set launches
  in the first window after the Launch section's launch time. A mission that carries your
  satellite is saved as a version-3 mission file; an older copy of Orbitlab says the file is newer.
- **Its engine.** A chemical engine flies as the last stage, for any burn after the launcher lets
  the satellite go. An electric engine (Isp above 480 s) cannot: the Launch section flies burns, not
  months of gentle thrust, so there the satellite flies with no engine of its own, its propellant
  still in its mass. **Send to Orbit** keeps the engine for the planner. Empty tanks fly with no
  engine either.
- **When Fly it is held back:** while a number is half typed or the checks refuse the design, and
  when the satellite's C_D·A/m is outside 0.0001–1 m²/kg, the range anything in orbit has. The box
  says which.
- After the flight, **Continue in Orbit** takes the satellite on with its own mass, drag area, C_D
  and C_R.
- **The node can land a few minutes from the design's local time.** The Launch section aims a
  node's local time at the true Sun, the designer at the mean Sun, and the two differ through the
  year by up to about 16 minutes (10.5 minutes on 1 October).

### Engineer: the satellite bench

The bench works on the design open in Explore (**Open it in Explore** goes back to it). It has six
tabs — **Power**, **Propulsion**, **Attitude**, **Radio**, **Camera** and **Lifetime** — and each
gives **Its numbers** (every number of that subsystem, among them some Explore does not show: the
ascending node of a plane that is not sun-synchronous, on Power, and the wavelength the
diffraction limit is worked at, 0.55 µm unless you change it, an estimate, on Camera), **What they
give**, and **Where these numbers come from**. **Solar activity for the air** chooses one of
ECSS's fixed levels for the air's drag.

**Lifetime** runs the Orbit section's lifetime analysis (the mean-element method) on the design's
orbit, mass and drag area, from the design date, for the design life plus 25 years, at the level
chosen, so the answer is the same every time; **Stop** stops it. It says when the satellite comes
down, or where it still is at the end, and whether it meets the 25-year rule. A satellite with no
engine must come down within 25 years of the end of its mission. One with an engine holds its orbit
through the mission (its Δv budget pays for that), so its 25 years start when the mission ends: from
its design orbit, it must come down within 25 years.

### Start from requirements

**Start from requirements**, on the bench (its address is `#/build/engineer/requirements`), works
the orbit and the satellite out from what the mission must do. **Back to the satellite bench**
returns.

- **Say what the mission needs.** A template with a camera (the THEOS-2 class, NAPA-2 or Earth
  observation; its mass stays fixed, and is marked an estimate). The place to watch: Bangkok,
  Chiang Mai, Hat Yai, Ubon Ratchathani, Saint Petersburg, Moscow, or your own coordinates. The
  coarsest detail on the ground (GSD), the longest wait between looks, and how far the camera may
  tilt. Daylight looks only, or not. Sun-synchronous at a local time (the descending node's time is
  shown beside the ascending one's), or a fixed inclination. The life; the solar activity (a fixed
  ECSS level, so the results repeat); the 25-year rule, or none; the data a day, the stations that
  bring it down and their lowest elevation; and the repeat cycles to try. Every box shows its
  bounds.
- **Run it.** Before it runs, the page says how many orbits it will try and about how long it will
  take. **Work out the table** first finds the lowest altitude that lasts the life (and the life
  plus 25 years), then tries the orbits, both off the page's thread, with **Stop** at any time; a
  run after a Stop reuses the lifetime search. With **Sun-synchronous** off and daylight looks on,
  each orbit is walked for about two months, which takes much longer, and the estimate says so. A
  table worked out for older requirements says so too.
- **Read the table.** One row per repeat-ground-track orbit between 150 and 5 000 km, highest
  first (on a phone, a card each): its height and inclination; the camera and aperture the GSD
  needs, and the swath; the longest wait between looks, found by flying the ground track over the
  place (not the "days to cover" a grid argument gives); the contact a day, the highest data rate
  and the data a day; the longest eclipse, the array and the battery; the lifetime, or for a
  satellite with an engine the Δv to hold the orbit (one with none "comes down within the life");
  the Δv to dispose of it, as a range; and **what binds**, the requirement nearest to failing, as a
  percentage of what is allowed or carried. Over 100 % is not met, and every unmet requirement is
  listed. **Only the orbits that meet every requirement** filters the rest out. A row inside the
  lifetime search's bracket says "not proven to last". The GSD is met looking straight down; the
  row gives the coarser one at the largest tilt.
- **The charts:** the lifetime against altitude, with the life asked and the life plus 25 years;
  and the aperture the GSD needs against altitude, with the template's aperture and the altitude
  where the two cross.
- **Open a row.** **Open** puts the row's design on the bench (replacing the design there, without
  asking), where every figure is worked out again. Back on the page, the row stands beside the
  bench's figures, and each that differs says why: the eclipse (the table works it from a formula,
  the bench by following the orbit), the array and the battery (the bench keeps every load on
  through the shadow), and the highest rate (the table uses the template's transmitter, the bench
  the one the row sized). Run the bench's **Lifetime** to check the row's lifetime. If you change
  the design on the bench, the page says that its Bench column is the design as it was opened.
- **What the page estimates:** the mass and bus stay the template's; the drag area is a tumbling
  estimate; the disposal Δv is a range (the higher end is the one judged); with daylight looks only,
  the payload is taken as switched off in the shadow; the aperture comes from the diffraction limit,
  which no free worked example checks.

### What the satellite's estimates mean

- **The class templates** carry their class's typical mass, engine and size, not any one
  satellite's. **The THEOS-2 class** carries eoPortal's 425 kg, labelled an estimate, and an example
  camera that gives THEOS-2's published 0.5 m and 10.3 km from 621 km, not its real design.
  **NAPA-2** has its published mass, size and the orbit it flew; its radio is a CubeSat X-band
  transceiver's and its camera one that gives its published 5 m: estimates, not its own.
- **The ground station** that receives the downlink is NASA's 11.28 m dish, far larger than a
  school's, so the data rates come out generous.
- **The drag area** is the satellite tumbling: a quarter of the body's surface, plus half the
  wings'. The same area is what sunlight pushes on.
- **Sized for the worst case:** the torques (the gravity gradient at a 45° tilt, the magnetic field
  over the pole), the loads (the same in sunlight and shadow), and a low orbit's end of life (a
  controlled re-entry, the perigee lowered to 50 km).
- **Some templates do not close, and say so:** the communications and weather satellites' tanks are
  668 and 632 m/s short of fifteen years in their slot, and the science class's 26 m/s short of its
  controlled re-entry. That is what their classes' propellant holds, not a fault in the designer.
- **Charge cycles a year** count an eclipse every revolution, so they read "at most".

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
the Build section ([ROADMAP-PART2-3.md](ROADMAP-PART2-3.md), S02). The Build section makes one
and hands it over with **Fly it** (section 0b); a file (or a link) that carries one opens with the
vehicle listed first in the vehicle menu as "*name* — custom vehicle", and it flies like any
other. Every figure in it is checked before it flies — masses and sizes above zero, engine figures
a chemical engine can have, at most six stages, strap-ons on the first stage only — and a vehicle
that fails the check is not flown: the note names the vehicle as reset. Picking a catalogue vehicle from the menu drops the custom one.

Since version 3 a file can carry a **satellite of its own** too, designed in the Build section and
handed over with **Fly it** (section 0c). It is listed first in the payload menu as "*name* — custom
satellite" (the name as its designer wrote it, not translated), it flies with its own mass, size
and engine, and picking a catalogue satellite drops it. Under the payload mass a note says whether
it fits the fairing: an estimate, the usable space taken as 85 % of the fairing's diameter and 80 %
of its length, so "May not fit" and "Does not fit" are warnings and do not stop a launch. Only a
mission that carries such a satellite is written as version 3; an older copy of Orbitlab says the
file is newer and falls back to a satellite it knows. WebMCP's `configure_mission` cannot make such
a satellite; given the loaded one's id, it keeps it.

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
way. The sound comes from where the rocket is: turn the camera and it moves round your head
(wear headphones to hear it best). Near the ground you hear it twice, directly and off the
ground a moment later, and the two make the whooshing sweep of a rocket climbing away; the
farther it is, the more of it comes back from the surroundings as a long rolling echo. Close
by, the roar crackles with the shocks of the exhaust. With the flight sped up, the sound is
quieter and plays without the delay (the picture would otherwise be minutes ahead of it);
paused, it is silent. These sounds are synthesised in the browser. The model is in
PHYSICS.md §11.

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
and the pressure of sunlight. The air is NRLMSISE-00's, the model the European space standards
name for orbit decay, at the satellite's height, latitude and local time. The Sun's activity,
which sets how much air there is, is taken as measured by default: day by day from 1954 (GFZ),
then NOAA's latest months and days and its forecast, then the mean of the last six solar cycles —
the result says how far each reaches, and the data mode decides whether NOAA's figures are the
bundled ones or fetched now. The forecast's high and low sides show how much the answer can move;
ECSS's fixed quiet, moderate and active levels are there for a what-if (at 400 km a CubeSat lasts
some ten weeks with an active Sun and three and a half years with a quiet one). With
the measured Sun, seven satellites of known shape came down within 25 % of their dates on record,
usually a little early. The *mean elements* method
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
the stack by about 15° on Falcon 9.

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

### One run on its own (P08)

Any run of a set can be flown alone, watched and replayed like any flight. **Click a run on the
scatter**: the setup panel gets the set's seed and the run's number (and its guidance law, in
six-DOF, as the set flew it); launch it. Or open **Dispersed flight: one Monte Carlo run** in the
Engineer mode's setup, tick it, and type a set seed and a run number: the section lists what that
run drew — each stage's thrust, Isp, propellant and dry mass, the air's density, and in six-DOF the
steady wind (and a fresh IMU with navigation on). It works in point-mass too, where the vehicle
and the density are dispersed (point-mass has no wind or IMU). The run is part of the mission, so
a mission file or link carries it and the flight report names it. Untick it to fly nominal again.

## 18. Lessons and the placement test

The gold **Lessons** button in the top bar (and **Start with a lesson** on the landing page) opens the
lessons page: a page of its own over the whole window below the top bar, like a mode, with five
tabs — **Lessons**, **Placement test**, **Worksheets**, and for teachers **Write a scenario** and
**Check results** — and **Back to the simulator** (or Esc, or the browser's Back). On a phone the
tabs sit in one row that scrolls sideways. Its addresses are `#/lessons`, `#/lessons/test`,
`#/lessons/worksheets`, `#/lessons/author` and `#/lessons/check`, so each can be linked to.
The lessons are training missions with a goal and pass criteria, graded as soon as the flight ends,
and three cases from the record, worked from their data. They are listed in six tracks — orbital
mechanics, guidance and navigation, failures, attitude control, advanced missions, real cases —
each with its number (1.1 … 6.3), a ✓ once passed and ● once tried. All twenty-four are written:
5.3–5.5 fly the historical missions of roadmap C01, and 6.1–6.3 are P2.5's cases, worked in the
Orbit section rather than flown. Track 6 is the built-in cases': a teacher's lesson put there shares
their numbers.

**A lesson.** Pick one: its mission is loaded into the setup panel, the app goes to the mode it
needs (Explore or Engineer), and the settings it fixes are greyed out with a 🔒 — in lesson 1.2
only the launch time may change, in 1.4 only the payload mass. A strip over the workspace holds
the task, the criteria and the buttons. Launch; each criterion shows *waiting*, *so far ✓*
(a bound that could still be broken), ✓ or ✗ — a peak such as q is failed the moment it is
passed, everything else when the flight ends. Some lessons then ask for numbers you work out from
your own flight (the period of the orbit you reached, the Δv of a burn, the peak load on the
crew): type them in and **Check**. A wrong answer is only marked ✗, and can be worked again;
**Show the answers** gives the values, and a number once shown never counts as an unaided pass in
this browser (a lesson flies the same flight again, so the same number would do): typed in right, it
gives **Passed with help**, recorded as such in your progress and the results file and marked ◐ on
the lesson's card, and **Next** still opens the next lesson. **Clear the answers I have seen**
(on the strip while the lesson keeps any) forgets them, so your next attempt can pass unaided. The
grades are formative: a worksheet's answer key is on the same
device. The grade is taken once the flight has ended and kept, so scrubbing back through the replay
never changes it; the orbit it reads is the one at insertion, as the event log's "Target orbit
achieved" line gives it, however late the page reaches the end under time warp — the heights on
screen drift afterwards (the Earth's bulge, J₂) and do not change the grade. **Hint** reveals up to three hints, one at a time (the
results file says how many you used); **Start again** puts the lesson's mission back; **Copy
link** gives an address that opens the lesson (`?lesson=orbit-first`). A setting the lesson fixes
that is changed anyway — by a mission link or over WebMCP — fails the flight, and the strip says
which one.

| | Lesson | What you change | Passed when |
|---|---|---|---|
| 1.1 | Your first orbit | nothing | the 500 km orbit is reached, and its period (±1 min) and speed (±0.05 km/s) are worked out |
| 1.2 | Into the station's plane | the launch time | the ISS plane is reached directly: i within 0.1°, Ω within 0.5° |
| 1.3 | A Hohmann transfer | nothing | the 2 000 km circle is reached, and the apogee burn's Δv (±5 %) and the period are worked out with vis-viva |
| 1.4 | Payload and Δv | the payload mass | at least 17.5 t to 500 km with 150 m/s of Δv left |
| 1.5 | Range safety and the launch site | the launch site | a site whose corridor licenses a polar launch, and the orbit |
| 2.1 | Aerodynamic loads (Soyuz-2.1a) | the guidance (the acceleration limit) | peak q at most 25 kPa, the orbit reached, and the peak read (±1 kPa) |
| 2.2 | PEG and IGM (Engineer) | the upper-stage guidance | 18.8 t to 500 km with an engine lost at T+80 s: the target orbit, explicit guidance engaged, 20 m/s left |
| 2.3 | Inertial navigation without GNSS (Engineer, six-DOF) | the IMU grade | the position error within 500 m up to MECO, GNSS still off |
| 2.4 | Monte Carlo 3σ (Engineer, six-DOF) | a Monte Carlo set, and the run you fly | a run of the set seeded 1 flown on its own to orbit, its perigee and its miss from the target read (±1 km) |
| 3.1 | One engine out | the payload mass | the orbit with an engine lost at T+80 s, carrying at least 17.5 t |
| 3.2 | A stuck gyro and the FDIR (Engineer, six-DOF) | the FDIR switch | the orbit, with IMU 1 voted out |
| 3.3 | The crew's escape | nothing | the crew lands, and the peak load on them is read (±10 %) |
| 4.1 | Reading the control loop (Engineer, six-DOF) | nothing | the pitch crossover and phase margin at max-Q read from the loop inspector (±10 %) |
| 4.2 | Gains with margins (Engineer, six-DOF) | the pitch–yaw gains | at max-Q, a phase margin of 30° and a gain margin of 6 dB |
| 4.3 | A step test in flight (Engineer, six-DOF) | the pitch–yaw gains, and the test you fly | a 2° pitch step flown before MECO overshoots by 6 % at most, and its overshoot is read (±5 points) |
| 4.4 | Bending and the notch filter (Engineer, six-DOF) | the flexible-vehicle settings | through max-Q with the bending on and no breakup |
| 5.1 | Bringing the booster home | the payload mass | at least 9 t to 500 km with the first stage on Landing Zone 1 |
| 5.2 | Rendezvous and docking | the rendezvous profile | docked within 4 h of launch, and the time read (±0.1 h) |
| 5.3 | Sputnik-1 (1957) | the payload mass | the 215 × 939 km orbit reached, and its period read (±0.2 min) |
| 5.4 | Vostok-1 (1961) | the target orbit | the 181 × 327 km orbit Gagarin reached, and its period read (±0.2 min) |
| 5.5 | Apollo 11: the way to the Moon (1969) | the target orbit | the S-IVB relit for the translunar injection (apogee past 300 000 km), and its Δv read (±3 %) |
| 6.1 | THEOS-2 over Bangkok (Orbit section) | — worked from the data | the turn a sun-synchronous plane needs (±0.0005 °/day) and J₂'s (±0.01 °/day), the mean height (±2 km), the reach tilted 45° (±10 km), the local time over Bangkok (±0.02 h), and why a camera satellite flies such an orbit |
| 6.2 | The Long March 5B stage of Tianhe (Orbit section) | — worked from the data | the tumbling cross-section (±1 m²) and C_D·A/m (±0.0003 m²/kg), the ±20 % window's two ends and the time actually left (±0.05 day each), the prediction's error (±1 point), the time broadside (±0.5 day), and why a window is given |
| 6.3 | Iridium 33 and Cosmos 2251 (Engineer, Orbit section) | — worked from the data | the miss (±5 m), the speed (±0.05 km/s) and angle (±2°) of the meeting, the combined radius (±0.1 m), σ along the miss (±5 %, at least 0.5 m) and the miss in σ (±5 %, at least 1), the cautious probability against 1 in 10 000 (±30 times), and why 10⁻⁵¹ was wrong |

The three historical lessons fly the vehicles, pads and dates of the real flights: the R-7 of
1957 from Gagarin's Start with no upper stage, Vostok-K with Blok E, and Saturn V from LC-39A.
The Moon is not part of the flight model, so Apollo 11 ends at the injection: the S-IVB raises
the apogee to the Moon's distance, and what the Moon's gravity does three days later is left out.

**A case lesson** (6.1–6.3) flies nothing. It opens the Orbit section's **Real satellites** at the
case's satellite and tool — THEOS-2 with its overflights of Bangkok; the station, with the re-entry
tool and its Long March 5B case study; the station, with the close approaches — at the lesson's
level. The strip holds **The data**, the case sheet's own table (with the encounter plane for
Iridium–Cosmos), and the sheet's questions: numbers to type, with their units, and one answer to
choose. They are graded by the case sheet's key, with its tolerances (the table above), so the
lesson and the printed key cannot disagree. The data are fixed when the lesson opens — THEOS-2's
element set as the catalogue on screen has it, and the Sun's activity the re-entry is predicted with
— so the table, the key and the grade stay together however the catalogue or the forecast changes
meanwhile; the results file says which set and which forecast were used, and each **Check** counts
as an attempt. After a pass (or once the answers are shown) each answer comes with its working, and
the answer key and the Tianhe stage's error open in the Orbit section. **Show the tool** goes back to
the case's tool; **Worksheet** makes the case's sheet, and its key once it gives nothing away. If
the data cannot be read (the catalogue did not load), **Start again** reads them again.

**The placement test** is 25 questions in six areas — 1 the basics of spaceflight, 2 orbital
mechanics, 3 rocket performance, 4 guidance and navigation, 5 attitude control, 6 failures and
safety — five from the basics and four from each of the others, easy to hard, with no clock. The
questions and the numbers in the calculations are drawn for you from a bank of 157 (at least 25
in every area), always to the same plan, so no two tests are alike but all are the same size and
difficulty. Where a question is only knowledge it offers
**I don't know**; where being sure of a wrong answer would matter it asks how sure you are. The
questions come in several kinds: one answer of four; **several answers** (choose every right one);
**put in order** (click the items first to last); a calculation; a value **read off a chart** of a
flight flown in this simulator or off a **diagram** drawn with your own numbers (a ground track, a
step response, a Bode plot); a diagram with lettered points (an orbit's apsides and nodes, the
forces on a rocket, dispersed flights, three inertial units voting); **predict, then observe**,
which shows the two flights after you answer; and **which vehicle is this?**, with a photograph of
the real vehicle (from Wikimedia Commons, under free licences; the author is named in the answers,
since it would give the answer away, and all are listed in `public/lessons/vehicles/CREDITS.txt`).
The recommended start is always a lesson already written: the nearest one to the area you most
need. The result is a radar
of the six areas and a level for each (beginner, basic, proficient), your strengths, what to work
on, your misconceptions — wrong answers you were sure of — and the recommended path through the
lessons: which you can skip, which to go over, and a ★ where to start. Every lesson stays open
whatever it says. **Answers and explanations** goes through every question. After the lessons,
the **test after the lessons** asks different questions to the same plan, and the radar shows
both.

**Worksheets** (the third tab, `#/lessons/worksheets`, or **Worksheet** on a lesson's strip once
its flight has ended) are printable sheets about a flight flown here — the open lesson's, or any
mission on screen, flown to its end. A sheet has the mission, its key events, the flight's charts
(altitude, speed, dynamic pressure, load factor, mass), questions worked from that flight — a value
read off a chart at a time drawn for the student, the peak q and its time, the peak load, the first
stage's burn time, the thrust-to-weight at lift-off, the first stage's ideal Δv and what the ascent
lost of it, the period and perigee speed of the orbit reached — and questions from the placement
test's bank in the areas you tick, with their diagrams and photographs. Type the class's names,
one to a line, and a class code: each student gets their own numbers, drawn from the name and the
code, so the same names and code always make the same sheets, in any language. **Download the
worksheets** makes one file with a page for each student and no answers; **Download the answer
key** makes a separate file with every student's answers, the tolerance that counts as right, and
how each is worked out with the flight's own numbers. Either as HTML to print (Print → Save as PDF)
or as a Word document to edit first. Values the questions ask for (max-Q, the lift-off T/W) are
left out of the sheet's event table. A flight's sheet goes with the lesson the flight was flown in,
or with none — not with whatever lesson is open when the sheet is made. With a case lesson open, the
tab also offers that case's sheet and key, one for the whole class, from the data the lesson froze.

**Keeping and handing in your work.** Progress and tests stay in this browser. **Export results**
writes a `.orbitlab-results.json` file with your name (if you type it), each lesson's attempts,
hints and graded flights, and your tests with their scores, sealed with a SHA-256 checksum that
shows whether the file was edited after export (a check against accidents, not a signature).

**Lessons of your own.** **Open lesson file…** reads a `.orbitlab-lesson.json` file: lessons and
placement-test questions in the same format the built-in ones are written in (`src/lessons/
lesson-file.ts`). A lesson is a mission document (as a mission file holds it, U01), the settings
it locks, its criteria — a measure within bounds (`maxQ`, `dvLeft`, `orbit.inclination`, …), the
outcome, an event, a number the student works out from the flight, or a check written in code —
its hints, and its texts in English, Russian and Thai (a missing language falls back to English).
A case lesson (`"kind": "case"`, with `"case"` one of `theos2`, `cz5b`, `iridium`) has no mission:
its criteria name the case sheet's questions (`"item"`, as `src/worksheets/case-ids.ts` lists them),
each optionally with a tolerance of its own for a number. A file that holds one, or a rocket of
your own, is written as version 2; one with a satellite of your own or a design lesson as version 3;
a file of flight lessons alone is still version 1, so an older copy of the app reads it.
A question is a choice, several answers (`multi`), an ordering (`order`, its items in the right
order), a calculation whose answer is an arithmetic expression of its drawn numbers, or a vehicle to
recognise, with its area (1–6, as above), level and explanation, and optionally a chart of a
recorded flight or one of the built-in diagrams (`src/lessons/assessment/diagrams.ts`). Anything that cannot be
used is left out, and the catalogue says what and why. Over WebMCP, `list_lessons`,
`start_lesson`, `get_lesson_result` and `get_assessment_result` let an assistant open a lesson for
the student (a case lesson too) and read how it is going — never the expected value of an answer.

**Design lessons.** A lesson can ask you to design a satellite instead of flying one. Opened, it
puts the satellite designer (or the bench, if the lesson says so) on the lesson's design, on the
day and at the solar activity the lesson fixes, so a grade comes out the same on any day; your own
design comes back when you leave the lesson. The parts the lesson locks are greyed and marked
"locked by the lesson", and the template, the design date and the solar activity are fixed. The
strip above the designer holds the task, the criteria (figures of the design within bounds, and
figures you work out and type) and, if the lesson has them, what the mission asks for. **Check the
design** grades the design as it stands; **Hand in** (every typed answer needed) keeps the design,
its figures and its grade with your results. Near a bound a figure is shown with as many decimals
as keep it on the side it was graded on (9.96 %, not 10 %), and a figure that does not apply says
why (no camera, not seen in 30 days, not a low orbit). Hints and **Start again** work as in flight
lessons. An example is the file `public/lessons/napa2-power.orbitlab-lesson.json` in the app's
source: open it with **Open lesson file…** and bring NAPA-2's power margin up to 10 %.

**Lesson packs.** Below the tracks, **Lesson packs matched to curricula** lists five packs, one
group each: IPST basic science (M.5–M.6), IPST Earth, astronomy and space (M.6), IPST additional
physics (M.4–M.6), the Royal Thai Air Force Academy's cadets, and Russia's speciality 24.05.06
(flight vehicle control systems). Each says who it is for and which curriculum it follows, and
**About this pack and its sources** names its sources and offers **Save the pack file**. Every pack
is a **draft awaiting review by Orbitlab's owner**: its curriculum codes and wording have not yet
been checked against the curriculum, and the page says so; use it with that in mind. A pack holds
lessons of its own (numbered by pack: 11.x IPST basic, 12.x Earth and space, 13.x physics, 14.x
RTAF, 15.x 24.05.06 — flights, a case and design lessons) and lists some of the app's own lessons
again, marked "Also under <track>" with a note on why they fit. Each lesson shows its curriculum
codes as chips; point at a chip to see whether it is an indicator, a learning outcome, a course or a
competence. Opened from a pack, a lesson's strip names the pack and shows the codes, and **Next**
goes to the pack's next lesson. The packs come with the app and open offline. They do not count
toward the progress count in the top bar or the placement test's path. In lessons that ask for an
orbit's numbers, read the heights from the event log's "Target orbit achieved" line (lesson 14.2's
speed is graded where the second stage's second burn ends, at insertion: work it with vis-viva from
those heights).

**For teachers: writing a scenario.** **Write a scenario** (`#/lessons/author`) makes a lesson for
your class. Under **What the students do**, choose **Fly a mission** or **Design a satellite**.
- **A flight** takes the mission on the setup panel as it stands, launch time and any rocket or
  satellite of your own included. Choose what students may not change (**Lock the whole mission** is
  the default; **Target orbit** holds the orbit only, the launch time has its own box) and add
  criteria: how the flight ends, a number within bounds (or the mission's own target), a number the
  student works out, an event that must or must not happen. You may say at which event the flight
  is graded.
- **A design** starts from the design open in Build → Satellite as it stands, with its design date
  and solar activity. Tick the parts students may not change (each locks its whole group) and add
  criteria: a figure of the design within bounds (at least, at most, between, or a value ± a
  tolerance), or a figure the student works out and types. Choosing "Down within 25 years of the
  mission's end" sets the criterion to "at least 1" (yes). The longest wait between looks needs the
  mission's place, which a lesson file can carry but this page does not write.
- Write the texts in any of the three languages; a text in one language only is used for all three,
  and the page says so once. Before you save, the page lists every problem: an event no flight has,
  an id a built-in or pack lesson already uses, a range whose lower bound is above its upper one, a
  negative tolerance. **Save lesson file**, **Make a link** and **Try it now** stay off until the
  problems are fixed.
- **Save lesson file** writes a `.orbitlab-lesson.json` file; give it to your class, and "Open lesson
  file" under Lessons adds it. **Make a link** gives a `?scenario=` address that carries the whole
  lesson (offered when it is short enough, up to 8 000 characters; otherwise use the file): opened,
  it adds the lesson to that browser and starts it. **Try it now** starts it here. **Copy link** on a
  lesson of your own also copies such a link, since `?lesson=<id>` means nothing in another browser.
- Your lessons are numbered 9.1, 9.2… in the order they are written in the file, and a later file's
  lessons continue the count. **Open lesson file…** names any lesson it did not add because its id is
  a built-in lesson's, and asks for it saved again under another id.

**For teachers: checking a class's results.** **Check results** (`#/lessons/check`) checks your
students' results files on your own computer. Open their results files (**Open results files**) and
your own lesson file (**Open your lesson file**; the app's lessons and the packs' need none), then
press **Check**. Each flight is flown again, its commands included, to the moment it was graded, and
graded again; a design lesson's result is not flown, its figures are worked out again from the
design handed in, on the day and at the solar activity it was graded at. Each result is:
- **Match**: the same grade and the same numbers;
- **Borderline**: a number too close to a limit to be sure;
- **Differs**: edited, made on another version of Orbitlab, or not the lesson the student had. A
  result that names its version but lacks its grading time, the moment on screen or its commands is
  not excused as an old one: if its numbers come out different, it differs;
- **Cannot re-fly** (for a design, **Cannot work out again**), with the reason: a six-DOF flight
  (minutes each) or a case lesson, a lesson of your own whose file is not open, a design result that
  kept no design, a damaged record (the rest of the class is still checked), or a result saved
  before this version whose numbers come out different. Such a result lacks the grading
  time, the commands and the version, so it can only be flown again approximately, and a difference
  says nothing about an edit; if its numbers come out the same, it is a match.

The check lists what each result lacks, says whether each file changed after it was saved, gives
its times in UTC, and **Save as CSV** keeps it. A teacher's lessons keep their catalogue numbers
here, and over WebMCP `check_results` runs the same check.

**Why a flight can be flown again.** Every flight you watch is the flight the simulator flies
without drawing it, so the same launch ends in the same orbit at any time warp or frame rate; an
Abort or a TORU command takes effect at the simulation's next step (at most a tenth of a second
later low in the atmosphere, up to a second on a far approach), and the picture moves on to it.
That is what lets your computer fly a student's flight again and get their numbers. A grade counts
only what the picture has reached, so lesson 5.2's docking is ticked when the picture docks.

**What is kept, and what never leaves the device.** There are no accounts. Progress, results and
your lessons stay in the browser and in the files you choose to save. A results file keeps, besides
the name if one is typed, the placement tests' results and each lesson's attempts: its grades, the
answers typed, the hints and any answers shown, and, for each flight, the mission flown, the moment
it was graded, the moment on screen, the commands given and the app's version; for a design lesson,
the design handed in, its date, its solar activity and its figures. Checking results sends
nothing anywhere: the files are read and flown again in your browser. A results file can hold a
student's name, so keep the files where your school keeps marks. A `?scenario=` or `?m=`
link carries the lesson or the mission in its address, which reaches the web server that serves the
app as any address does; it holds nothing about any student. The checksum on a results file shows
whether it was changed after it was saved; it is a check against accidents, not a signature.

## 19. Historical missions

Real flights, replayed on the day and at the second they flew: Sputnik 1 (1957) and Yuri
Gagarin's Vostok 1 (1961) on the first R-7s, Alan Shepard's Mercury-Redstone 3 (1961), Apollo 11 on the Saturn V (1969), Soyuz MS-16 (the first crew on a
Soyuz-2.1a, 2020), Crew Dragon Demo-2 (2020), Soyuz MS-25 (2024), ORBCOMM-2 (the first Falcon 9 booster to land, 2015), the
first Angara-A5 (2014) and H-IIA with Hayabusa2 (2014). In **Watch** they are under *From
history* in the list of launches; in **Explore** and **Engineer** open *Historical missions* at
the top of the setup panel, which fills the settings as flown — change anything, then launch.

The two R-7s of 1957 and 1961 are in the vehicle list too, after the fleet and marked
*historical*: **R-7 Sputnik (8K71PS)**, whose core stage itself went into orbit, and **Vostok-K
(8K72K)** with its small Blok E third stage; each carries its own spacecraft (Sputnik 1, the
Vostok capsule) and flies from Gagarin's Start. **Mercury-Redstone** is there too, with the
**Mercury capsule** under its escape tower, from Launch Complex 5 at the Cape. Try them on other
orbits if you like — they are tested on the flights they made.

**Saturn V** is in the list too, with **Apollo CSM and LM** on top, from LC-39A as it stood in
1969 — the Mobile Launcher and its red umbilical tower, whose arms swing away as the rocket
rises. Watch the S-IC's centre engine stop at 2:15 (the other four keep going to 2:42), the ring
between the first two stages fall away half a minute after the S-II lights, the escape tower
leave six seconds later, the S-II's centre engine stop at 7:41 and its other four throttle back
at 8:18 as the mixture shifts, and the S-IVB put Apollo into its 186 km parking orbit. Two and a half hours later — at 100× it takes a minute
and a half — the S-IVB relights over the Pacific for the six-minute translunar injection, and the
camera comes in close for the transposition: the adapter's four panels spring open, Columbia backs
away, turns round and docks with Eagle, and an hour later pulls it out of the S-IVB. Then the
journey itself: a three-second burn of Columbia's big engine to get clear of the S-IVB, three days
of coasting — Watch runs them at up to 5,000×, slowing for each event, so the whole way takes a few
minutes — the one midcourse correction on the second day, the moment at 61 hours 40 minutes when
Mission Control switched its displays to the Moon, and the Moon itself growing until it fills the
view. Behind the Moon, out of touch with the Earth, the six-minute burn into lunar orbit — watched at 5×
— and two revolutions later the seventeen seconds that round the orbit off, 100 by 120 km. A day on,
Eagle undocks: from then the camera follows the lunar module alone, its legs out, with Columbia drifting
off beside it and then out of sight. Half a revolution later the descent engine drops Eagle's orbit to
15 km, and on the next pass, 480 km short of Tranquility Base, it lights for the twelve and a half
minutes down: the braking phase at 5× (the engine at full thrust until, six minutes in, the computer
throttles it back), the approach from high gate at 2×, and from 400 ft the landing live — down at about
a metre a second, as Armstrong flew it, the ground coming up with its craters and the LM's shadow on
them. The contact light comes on 1.7 m up, and the engine stops a second and a half later. The
twenty-one hours on the Moon pass in seconds; then the ascent stage lifts off the descent stage — the
camera looks down past it at the descent stage it leaves at Tranquility Base — straight up, then over into seven minutes of
climbing to orbit, and the rendezvous follows as it was flown: four burns of the lunar module's small
thrusters over three hours, the first to bring it 28 km under Columbia, the second to keep it there, the
third, when Columbia stands 26.6° above its horizon, to meet it; then braking in steps, station-keeping 30 m
off, and docking, watched from behind Eagle with Columbia ahead of it. Two hours later the ascent stage is let go and Columbia backs away from it. Behind
the Moon again, the service engine fires for two and a half minutes — watched at 5× — for home. Two and a
half days of coasting follow, with one small correction on the service module's thrusters (Columbia's was
1.5 m/s; the model, aimed more closely, needs a tenth of that or none). A quarter of an hour before the
air the command module leaves the service module, which drifts off and later breaks up, and turns its
heat shield forward; it meets the air 122 km up at 11 km/s over the Pacific, before dawn. The entry, at
2×, wrapped in the glow of the air it heats: the lift turned upward through
the first plunge, at 6½ g, then rolled left and right to fly the 2,400 km to the
recovery area; at 7.3 km the forward heat shield goes and the two drogues open, at 3 km the three
orange-and-white mains, and after five minutes under them — at 5× — Columbia splashes down within a few
kilometres of where it really did, and the end card sums up the flight. At Watch's own pace the eight
days take about forty minutes. The phase line under the clock
shows the lunar orbit's height, during the descent the program (P63, P64, P66), the height, the distance
to the site and the speeds, during the rendezvous the range to Columbia, the rate it closes at and the
height between the two orbits, on the way home the time to the air and the angle it will be met at, and
during the entry the height, the speed, the bank angle and the load; the line of the real flight beside
it gives the flown times. The model lights the descent
45 s before Eagle did and lifts off 43 s earlier, both for the same reason — its orbit keeps its shape
where the real one was pulled about by the Moon's uneven gravity — and from each keeps the flown timeline
to a few minutes.

Mercury-Redstone 3 never went into orbit: the Redstone burns for two and a half minutes and
throws Freedom 7 on a 15-minute arc, 187 km up and 487 km down range. Ten seconds after the
engine stops the capsule separates, turns its heat shield forward, fires its three retro-rockets
over the top (a test: on this flight they were not needed to come down), drops the empty pack,
and falls back into the air at 11 g; the drogue opens at 6.4 km, the big main parachute at 3.2 km,
and it lands in the Atlantic. Watch follows it all the way to the water. In Explore and Engineer
the setup keeps it a *suborbital* flight — the perigee is thousands of kilometres below the ground,
which is how a short arc like this is written as an orbit.

Because the date is the real one, the light is too: ORBCOMM-2 lifts off in the dark, as it did.
For the two Soyuz flights the space station's orbit is the one measured that day, so the launch
reaches its plane and the spacecraft flies on to dock as its crew did. Demo-2 flies Crew Dragon
the way it really goes up: on top of Falcon 9 with no fairing, the capsule itself the rocket's
nose; the payload list offers **Crew Dragon** with Falcon 9 only, and the flight ends when it
separates. Where the model differs
from the flight — a later Falcon 9 standing in for the 2015 one, the Hayabusa2 flight ending in
its parking orbit — is listed in [PHYSICS.md §13](PHYSICS.md).

Each historical flight is set beside the real one. In **Watch**, when the rocket does something
the real flight's timeline records — the strap-ons falling away, the main engine cutting off, the
booster landing, the spacecraft docking — the caption adds a line such as *Real flight: MECO at
T+02:33 (here T+02:13)*, and the end card has a table of every such event, the model's time
against the real one, and the orbit the payload was left in. In **Explore** and **Engineer** the
same table is under the mission result, and the telemetry charts mark the real flight's events in
orange beside the model's grey ones. A time marked ≈ is a planned, rounded or second-hand figure.
The table only appears while the settings are the historical flight's own: change the payload,
the date or the vehicle and it is a different flight. The model flies its own guidance, not the
real pitch programme, so the times differ by seconds to a minute; why, flight by flight, is in
[PHYSICS.md §13](PHYSICS.md).

## Glossary

Vehicle, propulsion, orbital-mechanics and operations terminology, in English, Russian and
Thai, is collected in [docs/PHYSICS.md → Glossary](PHYSICS.md#glossary-en--ru--th) — the
same table the interface's own translations are checked against.
