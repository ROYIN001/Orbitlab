/**
 * A frame-backed read-only view of a `Simulation`.
 *
 * The 3-D renderer, the camera rig and the HUD read `VisualFrame`s, but the
 * orbital map (`ui/map.ts`) and the onboard overlay (`ui/onboard.ts`) still
 * take a `Simulation`, and those two files belong to another wave. Rather than
 * leave the map and the overlay stuck on the live clock while the rest of the
 * app is scrubbing, this module hands them an object that *is* the mission —
 * same plan, same site, same target orbit — but whose clock, state vector,
 * debris, telemetry and event log are those of the frame being displayed.
 *
 * It is built with `Object.create(sim)`, so everything not explicitly
 * shadowed (the mission plan, the config, the vehicle spec, and every method
 * on `Simulation.prototype`, including `julianDate()`, which reads the
 * shadowed `state.t`) resolves against the live simulation. Only the fields
 * that change with time are overridden, and the expensive ones (debris,
 * telemetry, events) are getters, so an animation frame that does not draw the
 * map costs nothing.
 *
 * **What is rewound, exactly.** The view is not a full time machine, and the
 * gap matters to whoever converts the next 2-D panel:
 *
 * - `state`: every field `VisualFrame` carries — clock, status, ascent phase,
 *   note, r/v/dir, throttle, thrust, mass, q, Mach, g, altitudes, speeds,
 *   downrange, lat/lon, θ, pitch command, vz, next burn time, payload/destroyed/
 *   liftoff flags, the classical elements, max Q and the Δv loss budget.
 * - `vehicle`: `activeIndex`, `fairingAttached`, and per-stage `attached`,
 *   `ignited`, `ignitionTime`, `sepTime`, `engineFraction` and `propellant`
 *   (reconstructed from the frame's propellant fraction), plus per-booster
 *   `attached`, `propellant` and `burnoutTime`. That is enough for
 *   `deltaVRemaining()` to be coherent with the frame.
 * - `debris`, `telemetry`, `events`: truncated to the displayed instant. A
 *   debris record carries the frame's `outcome`, `recovery` (phase, landed and
 *   burning) and `impact`, which is what the telemetry panel's spent-stage list
 *   reads; the integrator-only fields (mass, area, cd, recovery propellant and
 *   thrust) read 0 rather than the live object's values.
 *
 * Still **live**, because no frame field describes them: `state.currentBurn`,
 * `burnStartTime`, `burnDvRemaining`, `burnPlaneNormal`, `predictedApoapsis`,
 * and the per-stage `cutoff` / `burnedOut` / `ignitions` / `cutoffTime` flags.
 * Nothing the map or the onboard overlay reads touches them; anything that
 * starts to needs a frame field first.
 *
 * Nothing here writes to the simulation, and the view is never handed to
 * physics code.
 */
import type { Simulation, SimState, Debris, SimEvent, TelemetrySample } from '../physics/simulation';
import type { VisualFrame } from '../physics/frame';
import type { VehicleModel } from '../physics/vehicle';

export interface FrameSimView {
  /** Point the view at another frame of the same mission. */
  setFrame(frame: VisualFrame): void;
  /** The view itself, typed as the Simulation the 2-D panels expect. */
  readonly sim: Simulation;
}

/** Build a view of `sim` that reports whatever frame it is pointed at. */
export function createFrameSimView(sim: Simulation): FrameSimView {
  const view = Object.create(sim) as Simulation & Record<string, unknown>;
  const live = sim.state;
  // A private state object, mutated in place: no allocation per animation frame.
  const state: SimState = {
    ...live,
    r: { ...live.r }, v: { ...live.v }, dir: { ...live.dir },
    elements: { ...live.elements },
    maxQ: { ...live.maxQ },
    losses: { ...live.losses },
  };
  // The stage and booster objects are shadowed one by one as well. Leaving
  // `vehicle.stages` pointing at the live array made the view incoherent: a
  // rewound `activeIndex` over live propellant and live `attached` flags, which
  // is what made `deltaVRemaining()` disagree with the frame on screen.
  const vehicle = Object.create(sim.vehicle) as VehicleModel;
  const stages = sim.vehicle.stages.map((st) => {
    const view = Object.create(st) as typeof st;
    view.boosters = st.boosters.map((b) => Object.create(b) as typeof b);
    return view;
  });
  Object.defineProperty(vehicle, 'stages', { value: stages, enumerable: true });
  let frame: VisualFrame | null = null;
  let debrisCache: Debris[] = [];
  let debrisFor = -1;
  const telemetryCache: TelemetrySample[] = [];
  let telemetryCut = -1;
  const eventsCache: SimEvent[] = [];
  let eventsCut = -1;

  const apply = (f: VisualFrame): void => {
    state.t = f.t;
    state.status = f.status;
    state.ascentPhase = f.ascentPhase;
    state.note = f.note;
    state.r.x = f.r.x; state.r.y = f.r.y; state.r.z = f.r.z;
    state.v.x = f.v.x; state.v.y = f.v.y; state.v.z = f.v.z;
    state.dir.x = f.dir.x; state.dir.y = f.dir.y; state.dir.z = f.dir.z;
    state.throttle = f.throttle;
    state.thrust = f.thrust;
    state.mass = f.mass;
    state.q = f.q;
    state.mach = f.mach;
    state.gLoad = f.gLoad;
    state.altitude = f.altitude;
    state.altitudeAGL = f.altitudeAGL;
    state.airspeed = f.airspeed;
    state.speed = f.speed;
    state.downrange = f.downrange;
    state.lat = f.lat;
    state.lon = f.lon;
    state.theta = f.theta;
    state.pitchCmd = f.pitchCmd;
    state.vz = f.vz;
    state.nextBurnTime = f.nextBurnTime;
    state.payloadSeparated = f.payloadSeparated;
    state.destroyed = f.destroyed;
    state.liftoff = f.liftoff;
    const e = f.elements;
    state.elements.a = e.a; state.elements.e = e.e; state.elements.i = e.i;
    state.elements.raan = e.raan; state.elements.argp = e.argp; state.elements.nu = e.nu;
    state.elements.energy = e.energy; state.elements.h = e.h; state.elements.u = e.u;
    state.elements.periapsisAlt = e.periapsisAlt;
    state.elements.apoapsisAlt = e.apoapsisAlt;
    state.elements.period = e.period;
    state.maxQ.value = f.maxQ.value; state.maxQ.t = f.maxQ.t; state.maxQ.alt = f.maxQ.alt;
    state.losses.dvThrust = f.losses.dvThrust;
    state.losses.gravity = f.losses.gravity;
    state.losses.drag = f.losses.drag;
    state.losses.steering = f.losses.steering;
    vehicle.activeIndex = f.activeStageIndex;
    vehicle.fairingAttached = f.fairingAttached;
    // Per-stage state, so `vehicle.stages[]` agrees with the frame rather than
    // with the live flight running on ahead of it. `bi` walks the frame's flat
    // booster list, which `captureFrame` emits stage by stage in the same order.
    let bi = 0;
    for (let i = 0; i < stages.length; i++) {
      const st = stages[i];
      const sf = f.stages[i];
      if (sf) {
        st.attached = sf.attached;
        st.ignited = !!sf.ignited;
        if (sf.ignitionTime !== undefined) st.ignitionTime = sf.ignitionTime;
        if (sf.sepTime !== undefined) st.sepTime = sf.sepTime;
        if (sf.engineFraction !== undefined) st.engineFraction = sf.engineFraction;
        st.propellant = sf.propellantFraction * st.spec.propellantMass;
      }
      for (const b of st.boosters) {
        const bf = f.boosters[bi++];
        if (!bf || bf.id !== b.spec.id) continue;
        b.attached = bf.attached;
        b.propellant = bf.propellantFraction * b.spec.propellantMass;
        if (bf.burnoutTime !== undefined) b.burnoutTime = bf.burnoutTime;
      }
    }
    frame = f;
  };

  /** Make `out` the first `n` entries of `src`, reusing the array it already has. */
  const fit = <T>(out: T[], src: T[], n: number): void => {
    if (out.length > n) out.length = n;
    for (let i = out.length; i < n; i++) out.push(src[i]);
  };

  /** Last index of `arr` whose `t` is at or before `time` (exclusive upper bound). */
  const cut = (arr: { t: number }[], time: number): number => {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid].t <= time + 1e-6) lo = mid + 1; else hi = mid;
    }
    return lo;
  };

  Object.defineProperties(view, {
    state: { value: state, enumerable: true },
    vehicle: { value: vehicle, enumerable: true },
    debris: {
      enumerable: true,
      get(): Debris[] {
        const f = frame;
        if (!f) return [];
        if (debrisFor !== f.t || debrisCache.length !== f.debris.length) {
          debrisFor = f.t;
          debrisCache = f.debris.map((d) => ({
            id: d.id, name: d.name, r: d.r, v: d.v, dir: d.dir,
            mass: 0, area: 0, cd: 0, visual: d.visual, alive: d.alive,
            createdAt: d.createdAt, outcome: d.outcome,
            // The recovery record is the frame's two-field summary widened to
            // the simulation's shape: only `phase`, `landed` and `burning` are
            // recorded, and they are the only three the telemetry panel and
            // the renderer read. The propellant/thrust fields are the
            // integrator's own and have no frame equivalent, so they read 0
            // rather than leaking the live booster's numbers into a rewound
            // view.
            recovery: d.recovery
              ? {
                propellant: 0, thrustVac: 0, thrustSL: 0, mdot: 0, entryBurnLeft: 0,
                burning: d.burning, phase: d.recovery.phase, landed: d.recovery.landed,
              }
              : undefined,
            impact: d.impact,
          }));
        }
        return debrisCache;
      },
    },
    telemetry: {
      enumerable: true,
      get(): TelemetrySample[] {
        const f = frame;
        if (!f) return [];
        const n = cut(sim.telemetry, f.t);
        if (n !== telemetryCut) {
          telemetryCut = n;
          // Grown and shrunk in place rather than re-`slice`d. Both source
          // arrays are append-only, so index i means the same sample for the
          // whole flight and the copy costs the delta, not the whole array —
          // `sim.telemetry` reaches tens of thousands of entries on a long
          // mission and the map reads this getter on every animation frame.
          fit(telemetryCache, sim.telemetry, n);
        }
        return telemetryCache;
      },
    },
    events: {
      enumerable: true,
      get(): SimEvent[] {
        const f = frame;
        if (!f) return [];
        const n = cut(sim.events, f.t);
        if (n !== eventsCut) {
          eventsCut = n;
          fit(eventsCache, sim.events, n);
        }
        return eventsCache;
      },
    },
  });

  // Until the first `setFrame` the view reports the state the mission was
  // constructed with (the vehicle on the pad), which is what a preview shows.
  return {
    sim: view,
    setFrame(f: VisualFrame): void { apply(f); },
  };
}
