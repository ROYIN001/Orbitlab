/**
 * Flight recorder.
 *
 * The recorder owns the live simulation's clock: instead of calling
 * `sim.advance()`, the app calls `recorder.advance()`, which runs the same
 * step loop and snapshots a `VisualFrame` along the way. Replay never
 * re-simulates — seeking reads the stored frames and interpolates between
 * them — so what the user scrubs back to is exactly what was flown.
 *
 * Cadence (in *mission* time, not wall time, so the recording is identical at
 * any time warp):
 *
 * - prelaunch / ascent / orbital burn: every simulation step, capped at 10 Hz
 *   (steps drop to 0.02 s near cut-off and a 50 Hz recording of the last
 *   seconds of a Soyuz ascent buys nothing a 10 Hz one does not).
 * - atmospheric coast (below 140 km): every 2 s.
 * - orbital coast: every 10 s while a burn is less than two minutes away,
 *   every 30 s otherwise.
 * - always the frame on both sides of any step that emitted an event, so every
 *   event time is the timestamp of a stored frame (see `advance`).
 *
 * Memory: measured, not guessed. `FRAME_BYTES` below is fitted to a heap
 * measurement (node --expose-gc: heapUsed with the frame array reachable,
 * minus heapUsed after it is released, over a Falcon 9 / ISS and an Ariane 64 /
 * GTO recording), which is the only number that means anything — the earlier
 * hand-counted "sum of the fields" estimate was 2.3x low. A three-stage,
 * one-booster, six-debris legacy frame retains ~4.7 kB. This calibration
 * now adds the separately measured rigid telemetry maps. Packed rotation storage
 * is counted separately. These estimates exclude browser/render/simulation heap;
 * `maxFrames` bounds ordinary frames, not protected events.
 * On overflow the *coast* frames are thinned first and ascent frames only if
 * there is no coast left to give, because what a user scrubs back to is
 * liftoff, max Q and staging, not the 143rd minute of a parking orbit. Event
 * frames are never thinned at all, so seeking to a callout is exact however
 * hard the recording has been squeezed.
 *
 * Live stepping (roadmap T02; owner decision 2, 2026-09-29): a point-mass flight
 * is flown in the whole steps `Simulation.suggestedDt` asks for, never in steps
 * cut to the length of an animation frame, so the flight a student watched is
 * bit for bit the headless flight of the same mission (`sim.step(sim.suggestedDt())`
 * until the end) and an instructor's copy can re-fly it exactly. Six-DOF already
 * flew whole control ticks and carried the rest of a frame over; a point-mass
 * step is up to 60 s long in a high coast, though, so waiting for a whole step
 * would freeze the picture and the clock for most of a minute at 1×. The live
 * point-mass flight therefore runs *ahead* of the instant on screen by less than
 * one step, and `recordNow` draws that instant between the two step boundaries
 * around it, exactly as a replay seek draws a time between two stored frames
 * (`interpolateFrames`). What the recording shows — its frames and events — ends
 * at the instant on screen: the frame and the events of the step still ahead are
 * held back until the clock reaches them, so nothing on screen runs ahead of the
 * picture (tests/live-stepping.test.ts; measurements in docs/PHYSICS.md §2n).
 */
import { captureFrame, cloneFrame, interpolateFrames, type VisualFrame } from '../physics/frame';
import type { Simulation, SimEvent, SimStatus } from '../physics/simulation';
import { chronologicalEvents, eventPrefix, eventsThrough } from '../physics/events';
import { AttitudeTrack, type AttitudeWindow } from './attitude-track';

/**
 * How far back an event can be stamped when it is detected, s: max Q is
 * reported at its peak once the dynamic pressure is 3 % off it, which on
 * Falcon 9's throttle bucket is 19 s later. Frames this close to the head are
 * not thinned, so the frame at the peak is still there to pin.
 */
const RETRO_EVENT_WINDOW_S = 30;
import { quatRotate } from '../physics/rigid/math';
import type { RigidTelemetry } from '../physics/rigid/telemetry';

/** Altitude below which a coast is still an atmospheric one, m. */
const ATMOSPHERIC_CEILING = 140e3;
/** Fastest recording rate in mission time, s. */
const DENSE_INTERVAL = 0.1;

/**
 * Retained heap of one stored frame, bytes, fitted to a measurement rather than
 * counted off the field list. Method: record a mission headless, drop the
 * simulation and the recorder, and take `process.memoryUsage().heapUsed` with
 * the frame array reachable minus the same after releasing it, with four forced
 * GCs on each side (`node --expose-gc`).
 *
 * Measured (V8 22 / Node 24):
 * - Falcon 9 → ISS, 3 456 frames, 2 stages / 0 boosters / 1 debris: 2 656 B/frame
 * - Soyuz-2.1a → ISS, 3 916 frames, 3 / 1 / 6: 4 537 B/frame
 * - Ariane 64 → GTO (6 h), 5 413 frames, 3 / 1 / 6: 4 721 B/frame
 *
 * The constants below reproduce those legacy measurements to within ~9 % on
 * the high side. `stats().bytes` adds exact packed rotation allocation, but the
 * rigid addition below comes from a separate clone/release measurement and
 * remains an estimate rather than a bound on browser memory.
 */
const FRAME_BYTES = { base: 1800, stage: 220, booster: 160, debris: 420 };
/** Node 24.19, 3000 deep copies per actual captured configuration. Across six
 * Falcon/Soyuz prelaunch/ascent/staged fixtures (4.7–16.2 kB/frame), the combined
 * estimator is 1–11% above retained heap. Engine maps dominate the Soyuz stack;
 * empty rigid debris still carries quaternion, inertia, vectors and metadata.
 * See docs/SIXDOF-BROWSER-QA.md for method and limits. */
const RIGID_BYTES = { body: 1250, engine: 170 };

function rigidBytes(value: RigidTelemetry | undefined): number {
  if (!value) return 0;
  // Clone/GC trials measured at most 431 extra bytes for the weather/revision
  // provenance; allow 600, including optional numerical settings.
  return RIGID_BYTES.body + (value.windProfile ? 600 : 0)
    + Object.keys(value.engineDeflections).length * RIGID_BYTES.engine
    + flexBytes(value) + loopBytes(value);
}

/** G03's attitude-loop record: 1 523 B measured for one with target and load
 * relief (node --expose-gc, 20 000 records), plus 70 B for each further vector —
 * the rates the controller read, and the filtered moment with P05's notch. */
function loopBytes(value: RigidTelemetry): number {
  const loop = value.attitudeLoop;
  if (!loop) return 0;
  return 1620 + (loop.momentFilteredBody ? 70 : 0);
}

/** P05's flexible-body telemetry, when modelled: an estimate from its shape
 * (objects about 16 B per field plus headers, 8 B per array number). */
function flexBytes(value: RigidTelemetry): number {
  const flex = value.flex;
  if (!flex) return 0;
  return 120 + (flex.slosh ? 80 + flex.slosh.tanks.length * 140 : 0)
    + (flex.bending ? 360 + 16 * (flex.bending.shapeX.length + flex.bending.shapeW.length) : 0) + (flex.notch ? 120 : 0);
}

/** E02's equation record: 1 595 B measured for a six-DOF one (node --expose-gc, 20 000
 * records); a point-mass one lacks the four rate and attitude vectors, about 350 B. */
function eomBytes(frame: VisualFrame): number {
  return frame.eom ? (frame.eom.q0 ? 1600 : 1250) : 0;
}

function frameBytes(frame: VisualFrame): number {
  return FRAME_BYTES.base + eomBytes(frame) + frame.stages.length * FRAME_BYTES.stage
    + frame.boosters.length * FRAME_BYTES.booster + frame.debris.length * FRAME_BYTES.debris
    + rigidBytes(frame.rigid) + frame.debris.reduce((sum, body) => sum + rigidBytes(body.rigid), 0);
}

/**
 * Hard ceiling on stored frames. 12 000 × the measured ~4.7 kB is ≈57 MB, and
 * even at the most pessimistic measurement anyone has taken of this recording
 * (≈10.9 kB/frame, heap delta across the whole recording run, which also counts
 * the simulation's own telemetry growth) it is ≈131 MB — under the ~150 MB
 * target on both readings. A 6-hour GTO mission records ~5 400 frames, so the
 * backstop is not normally reached at all.
 */
const DEFAULT_MAX_FRAMES = 12000;
/** About 101 MB at the largest measured reference shape, before rotation tracks
 * and other application memory. Event boundaries survive compaction; dense
 * rotation history is independent of this ordinary visual-frame ceiling. */
const RIGID_MAX_FRAMES = 6000;

export interface RecorderStats {
  frames: number;
  events: number;
  /** Calibrated frame estimate including rigid maps, plus packed rotation bytes. */
  bytes: number;
  /** bytes attributed to one frame of this mission's shape */
  bytesPerFrame: number;
  /** how many times the oldest coast frames have been thinned */
  decimations: number;
  /** Packed numeric rotation tracks, independently bounded per physical body. */
  rotationBytes: number;
  rotationWindows: Array<AttitudeWindow & { bodyId: string }>;
}

/**
 * What reading a recording needs — the replay cursor, the app's frame loop and
 * the WebMCP tools. `FlightRecorder` is one; the main-thread mirror of a
 * recording made in the physics worker (src/session/mirror.ts) is the other.
 */
export interface RecordingSource {
  /** Stored frames, strictly increasing in mission time. Never mutate them. */
  readonly frames: readonly VisualFrame[];
  /** Events in occurrence order. */
  readonly events: readonly SimEvent[];
  readonly startTime: number;
  readonly headTime: number;
  readonly head: VisualFrame | null;
  indexAt(t: number): number;
  /** Decorate a fresh replay frame from the recorded rotation history. */
  applyRecordedAttitudes(frame: VisualFrame): VisualFrame;
  /** A copy of the live instant, for drawing. */
  recordNow(): VisualFrame;
  /**
   * The live instant, s of mission time: the time `recordNow` draws. A
   * point-mass simulation runs up to one step ahead of it (T02), so what the
   * app counts from — a skip, a fast-forward — reads this, not the simulation's clock.
   */
  readonly clock: number;
  stats(): RecorderStats;
}

/** Index of the last frame at or before `t` (0 when `t` precedes the start, -1 when empty). */
export function frameIndexAt(frames: readonly VisualFrame[], t: number): number {
  const n = frames.length;
  if (n === 0) return -1;
  if (t <= frames[0].t) return 0;
  if (t >= frames[n - 1].t) return n - 1;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t <= t) lo = mid; else hi = mid;
  }
  return lo;
}

/** One accepted rotation sample, as `AttitudeTrack.record` took it. */
export type AttitudeObserver = (key: string, t: number, telemetry: RigidTelemetry, force: boolean) => void;

/**
 * Decorate a replay frame from compact rotation histories keyed by body. Shared
 * by the recorder and its main-thread mirror, so both answer identically.
 */
export function applyAttitudeTracks(tracks: ReadonlyMap<string, AttitudeTrack>, frame: VisualFrame): VisualFrame {
  const apply = (fallbackId: string, telemetry: RigidTelemetry | undefined): boolean => {
    if (!telemetry) return false;
    const track = tracks.get(telemetry.bodyId ?? fallbackId);
    const pose = track?.at(frame.t, telemetry);
    telemetry.replayAttitudeAvailable = !!pose;
    if (!pose) return false;
    telemetry.attitudeQ = pose.attitudeQ; telemetry.omegaBody = pose.omegaBody;
    return true;
  };
  if (apply('vehicle', frame.rigid)) frame.dir = quatRotate(frame.rigid!.attitudeQ, { x: 1, y: 0, z: 0 });
  for (const debris of frame.debris) {
    if (apply(`debris-${debris.id}`, debris.rigid)) debris.dir = quatRotate(debris.rigid!.attitudeQ, { x: 1, y: 0, z: 0 });
  }
  return frame;
}

/** Bytes a recording retains: frames at the calibrated estimate plus packed rotations. */
export function recordingStats(frames: readonly VisualFrame[], events: number, decimations: number,
  tracks: ReadonlyMap<string, AttitudeTrack>): RecorderStats {
  let bytes = 0;
  for (const fr of frames) bytes += frameBytes(fr);
  const rotationWindows = [...tracks].map(([bodyId, track]) => ({ bodyId, ...track.window() }));
  const rotationBytes = rotationWindows.reduce((sum, track) => sum + track.bytes, 0);
  const shape = frames.length > 0 ? frames[frames.length - 1] : undefined;
  return {
    frames: frames.length,
    events,
    bytes: bytes + rotationBytes,
    bytesPerFrame: shape ? frameBytes(shape) : FRAME_BYTES.base,
    decimations,
    rotationBytes, rotationWindows,
  };
}

export class FlightRecorder implements RecordingSource {
  /**
   * The recording as the app sees it: stored frames up to the live instant,
   * strictly increasing in mission time. A point-mass flight can have stored
   * one frame more, at the end of the step it has flown ahead of the picture;
   * that frame is appended here once the clock reaches it (see the header).
   */
  readonly frames: VisualFrame[] = [];
  /** Every stored frame, the one still ahead of the live instant included. */
  private readonly stored: VisualFrame[] = [];
  /** `decimations` when `frames` was last rebuilt from `stored`. */
  private publishedDecimations = 0;
  /** Consumed detections, kept append-only independently of their timestamps. */
  private detectedEvents: SimEvent[] = [];
  /** Events in occurrence order for playback and display, up to the live instant. */
  get events(): readonly SimEvent[] {
    const ordered = chronologicalEvents(this.detectedEvents);
    return this.lookahead ? eventPrefix(ordered, eventsThrough(ordered, this.liveTime)) : ordered;
  }
  private sim: Simulation | null = null;
  private maxFrames: number;
  private decimations = 0;
  /** frames that must survive decimation (event boundaries, liftoff, failure) */
  private keep = new WeakSet<VisualFrame>();
  /** the stored frame `copyCache` is a copy of, for `recordNow` */
  private copySource: VisualFrame | null = null;
  private copyCache: VisualFrame | null = null;
  /** Render packets accumulate until one complete rigid physics step is due. */
  private rigidRemainder = 0;
  private attitudeTracks = new Map<string, AttitudeTrack>();
  /**
   * T02: a point-mass flight — flown in whole steps ahead of the picture. False
   * for six-DOF, whose live instant is the simulation's own clock.
   */
  private lookahead = false;
  /** The live instant on screen, s of mission time; never after `sim.state.t`. */
  private liveTime = 0;
  /**
   * The state at the start of the step that carried the simulation past the
   * live instant: the earlier end of the span `recordNow` draws inside.
   */
  private liveFrom: VisualFrame | null = null;
  /** Bumped by every step and every changed state, for the two caches below. */
  private revision = 0;
  /** The simulation's current state as a frame, captured once per revision. */
  private stateCache: { revision: number; frame: VisualFrame } | null = null;
  /** The frame drawn at the live instant, computed once per revision and instant. */
  private liveCache: { revision: number; t: number; frame: VisualFrame } | null = null;

  /**
   * @param observer told of every rotation sample the recorder accepts, so a
   *        mirror of this recording in another thread can keep the same
   *        rotation history (src/session/core.ts).
   */
  constructor(private readonly requestedMaxFrames?: number, private readonly observer?: AttitudeObserver) {
    this.maxFrames = requestedMaxFrames ?? DEFAULT_MAX_FRAMES;
  }

  /** How many times the oldest coast frames have been thinned so far. */
  get decimationCount(): number {
    return this.decimations;
  }

  /** Start (or restart) recording a mission; captures the frame on the pad. */
  start(sim: Simulation): void {
    this.sim = sim;
    this.maxFrames = this.requestedMaxFrames ?? (sim.rigidRuntime ? RIGID_MAX_FRAMES : DEFAULT_MAX_FRAMES);
    this.stored.length = 0;
    this.frames.length = 0;
    this.publishedDecimations = 0;
    this.detectedEvents = [];
    this.decimations = 0;
    this.keep = new WeakSet<VisualFrame>();
    this.copySource = null;
    this.copyCache = null;
    this.rigidRemainder = 0;
    this.lookahead = !sim.rigidRuntime;
    this.liveTime = sim.state.t;
    this.liveFrom = null;
    this.revision++;
    this.stateCache = null;
    this.liveCache = null;
    this.attitudeTracks.clear();
    this.recordAttitudes(true);
    const f = captureFrame(sim);
    this.stored.push(f);
    this.keep.add(f);
    this.pullEvents();
    this.publish();
  }

  get simulation(): Simulation | null {
    return this.sim;
  }
  /**
   * The live instant, s of mission time: what `recordNow` draws and what the
   * fast-forwards count towards. The simulation's own clock for six-DOF; for a
   * point-mass flight up to one step behind it (see the header).
   */
  get clock(): number {
    const sim = this.sim;
    if (!sim) return 0;
    return this.lookahead ? this.liveTime : sim.state.t;
  }
  /** Mission time of the first recorded frame (T-10 s on every vehicle). */
  get startTime(): number {
    return this.frames.length > 0 ? this.frames[0].t : 0;
  }
  /** Mission time of the recording head. */
  get headTime(): number {
    return this.frames.length > 0 ? this.frames[this.frames.length - 1].t : 0;
  }
  get head(): VisualFrame | null {
    return this.frames.length > 0 ? this.frames[this.frames.length - 1] : null;
  }
  /** The last stored frame, shown yet or not: what the step loop compares against. */
  private get last(): VisualFrame | null {
    return this.stored.length > 0 ? this.stored[this.stored.length - 1] : null;
  }

  /**
   * Bring `frames` up to the live instant: every stored frame at or before it.
   * Only the newest stored frame can lie after it (the live instant is inside
   * the last step flown), so after a decimation the list is rebuilt and
   * otherwise only its tail changes.
   */
  private publish(): void {
    const stored = this.stored, shown = this.frames;
    let n = stored.length;
    if (this.lookahead) while (n > 0 && stored[n - 1].t > this.liveTime + 1e-9) n--;
    if (this.publishedDecimations !== this.decimations) {
      shown.length = 0;
      for (let i = 0; i < n; i++) shown.push(stored[i]);
      this.publishedDecimations = this.decimations;
      return;
    }
    let common = Math.min(shown.length, n);
    while (common > 0 && shown[common - 1] !== stored[common - 1]) common--;
    shown.length = common;
    for (let i = common; i < n; i++) shown.push(stored[i]);
  }

  private recordAttitudes(force = false): void {
    const sim = this.sim;
    if (!sim) return;
    const record = (fallbackId: string, telemetry: RigidTelemetry | undefined) => {
      if (!telemetry) return;
      const id = telemetry.bodyId ?? fallbackId;
      let track = this.attitudeTracks.get(id);
      if (!track) { track = new AttitudeTrack(); this.attitudeTracks.set(id, track); }
      track.record(sim.state.t, telemetry, force);
      this.observer?.(id, sim.state.t, telemetry, force);
    };
    record('vehicle', sim.state.rigid);
    for (const debris of sim.debris) if (debris.alive) record(`debris-${debris.id}`, debris.rigid);
  }

  /** Decorate a fresh replay frame from compact rotation history, never physics.
   * Outside a retained window the flag exposes the limitation to the UI. */
  applyRecordedAttitudes(frame: VisualFrame): VisualFrame {
    return applyAttitudeTracks(this.attitudeTracks, frame);
  }

  /**
   * Mission-time spacing the recorder wants at this point of the flight. Takes
   * loose fields rather than a frame so the live step loop can ask the question
   * without paying for a snapshot it may not keep.
   */
  private interval(status: SimStatus, t: number, altitude: number, nextBurnTime: number, range = Infinity, burning = false): number {
    switch (status) {
      case 'prelaunch':
      case 'ascent':
      case 'burn':
      case 'failed':
        return DENSE_INTERVAL;
      case 'rendezvous':
        // G07: sparse on the phasing orbits, dense on the approach and at the port
        if (burning) return 2;
        if (range < 300) return 0.5;
        if (range < 3000) return 2;
        if (range < 30e3) return 5;
        return nextBurnTime > t && nextBurnTime - t < 120 ? 5 : 30;
      case 'abort':
        // An escape: dense in the air, sparse on a ballistic arc above it.
        return altitude < ATMOSPHERIC_CEILING ? DENSE_INTERVAL : 10;
      case 'coast':
        if (altitude < ATMOSPHERIC_CEILING) return 2;
        return nextBurnTime > t && nextBurnTime - t < 120 ? 10 : 30;
      case 'orbit':
        // C01: Apollo flies its own burns in orbit, the injection for the Moon and the service engine's
        // (more than a kilonewton: not the S-IVB's hydrogen vent, a hundred newtons for hours)
        if (burning) return 1;
        return nextBurnTime > t && nextBurnTime - t < 120 ? 10 : 30;
      case 'descent':
        // A returning ship: sparse on its coast above the air, dense from the entry on.
        return altitude < ATMOSPHERIC_CEILING ? DENSE_INTERVAL : 30;
      case 'landed':
        return 30;
    }
  }

  private intervalOf(f: VisualFrame): number {
    return this.interval(f.status, f.t, f.altitude, f.nextBurnTime, f.rendezvous?.range, f.rendezvous?.phase === 'burn' || (f.status === 'orbit' && f.thrust > 1e3));
  }

  /**
   * Copy any events the simulation has emitted since the last check, and pin
   * the frames around each one so decimation can never take them.
   *
   * Storing the frames on both sides of an event-emitting step covers the
   * events stamped with the clock; it does not cover the ones stamped with a
   * time in the past. Max Q is the example: it is detected when the dynamic
   * pressure has fallen 3 % off the peak but reported *at the peak*, which on a
   * Falcon 9 is 19 s earlier. Pinning by lookup covers both kinds.
   */
  private pullEvents(): boolean {
    const sim = this.sim;
    if (!sim) return false;
    if (sim.events.length === this.detectedEvents.length) return false;
    for (let i = this.detectedEvents.length; i < sim.events.length; i++) {
      const e = sim.events[i];
      this.detectedEvents.push(e);
      const k = frameIndexAt(this.stored, e.t);
      if (k >= 0) {
        this.keep.add(this.stored[k]);
        if (k + 1 < this.stored.length) this.keep.add(this.stored[k + 1]);
      }
    }
    return true;
  }

  /** Append a frame if it is newer than the head; returns the stored frame. */
  private store(f: VisualFrame, important: boolean): VisualFrame {
    const head = this.last;
    if (head && f === head) {
      if (important) this.keep.add(head);
      return head;
    }
    if (head && f.t <= head.t + 1e-9) {
      // Same instant as the head. This happens when a step makes no progress
      // because it was aborted by a transition — flight termination is the
      // usual one: the clock stops at the break-up while the state changes
      // from 'ascent' to 'failed'. The later capture is the state *after* the
      // transition, which is what someone seeking to that second must see, so
      // it replaces the head rather than being dropped. (An out-of-order frame
      // from further back is dropped: the recording only moves forwards.)
      if (f.t < head.t - 1e-9) return head;
      this.stored[this.stored.length - 1] = f;
      if (important || this.keep.has(head)) this.keep.add(f);
      return f;
    }
    this.stored.push(f);
    if (important) this.keep.add(f);
    if (this.stored.length > this.maxFrames) this.decimate();
    return f;
  }

  /**
   * Snapshot the current state for rendering and store it if the cadence wants
   * it. Returns the frame to draw.
   *
   * What comes back is never a frame the recording is holding on to: when the
   * step loop already captured this instant, or when this capture is kept, the
   * caller gets a copy. Everything the app draws travels through
   * `replay/simview.ts` into files this wave does not own, and the recording
   * has to be append-only in fact, not by convention. The copy is only paid on
   * the ticks that actually land on a stored frame — the common case in flight
   * is a capture that the cadence throws away, which is handed straight back.
   *
   * The copy of a stored frame is itself cached, keyed on the head's identity.
   * While the clock is not advancing — the app paused on the pad, or the user
   * studying one instant — this method was otherwise deep-copying three
   * vectors, every stage, every booster and every debris item sixty times a
   * second for a frame that cannot have changed. The cache is a copy, so the
   * recording is still untouchable; it is simply the same copy each tick.
   *
   * A point-mass flight flown ahead of the picture (T02, see the header) is
   * drawn at the live instant between the two step boundaries around it, the
   * frame computed once for each instant.
   */
  recordNow(): VisualFrame {
    const sim = this.sim;
    if (!sim) throw new Error('FlightRecorder.recordNow before start()');
    if (sim.events.length !== this.detectedEvents.length) return this.captureChangedState();
    if (this.lookahead && this.liveFrom && this.liveTime < sim.state.t) return this.liveBetween(this.liveFrom);
    const head = this.last;
    if (head && Math.abs(head.t - sim.state.t) < 1e-9) return this.copyOf(head);
    const f = captureFrame(sim);
    if (!head || f.t - head.t >= this.intervalOf(f) - 1e-9) {
      const stored = this.copyOf(this.store(f, false));
      this.publish();
      return stored;
    }
    return f;
  }

  /** T02: the frame on screen at the live instant, between `from` and the simulation's state. */
  private liveBetween(from: VisualFrame): VisualFrame {
    const cached = this.liveCache;
    if (cached && cached.revision === this.revision && cached.t === this.liveTime) return cached.frame;
    const frame = interpolateFrames(from, this.currentState(), this.liveTime);
    // `interpolateFrames` rebuilds the time from the span; the clock is the instant asked for.
    frame.t = this.liveTime;
    this.liveCache = { revision: this.revision, t: this.liveTime, frame };
    return frame;
  }

  /** The simulation's current state as a frame the recording does not hold. */
  private currentState(): VisualFrame {
    const cached = this.stateCache;
    if (cached && cached.revision === this.revision) return cached.frame;
    const frame = captureFrame(this.sim!);
    this.stateCache = { revision: this.revision, frame };
    return frame;
  }

  /**
   * T02: the simulation's own state, when the picture is behind it; null when
   * `recordNow` draws that state itself. The physics worker hands it to the
   * main thread's shell (src/session/mirror.ts), so the shell's clock and state
   * are the simulation's, as an `InlineSession`'s are. A frame the recording
   * does not hold.
   */
  simulationFrame(): VisualFrame | null {
    const sim = this.sim;
    if (!sim || !this.lookahead || !(this.liveTime < sim.state.t)) return null;
    return this.currentState();
  }

  /** Pin an accepted command/state change at the current live clock, even when
   * paused or coasting. At an identical timestamp store replaces the head with
   * the post-command state; all earlier times retain their earlier command.
   *
   * A point-mass flight takes the change at the simulation's clock, which is up
   * to one step ahead of the picture (T02), and the picture moves on to it, so
   * a command shows at once as it always did. */
  captureChangedState(): VisualFrame {
    const sim = this.sim;
    if (!sim) throw new Error('FlightRecorder.captureChangedState before start()');
    this.revision++;
    if (this.lookahead) { this.liveTime = sim.state.t; this.liveFrom = null; }
    const stored = this.store(captureFrame(sim), true);
    this.recordAttitudes(true);
    this.pullEvents();
    this.publish();
    return this.copyOf(stored);
  }

  /** A cached deep copy of a stored frame (see `recordNow`). */
  private copyOf(f: VisualFrame): VisualFrame {
    if (this.copySource !== f || !this.copyCache) {
      this.copySource = f;
      this.copyCache = cloneFrame(f);
    }
    return this.copyCache;
  }

  /**
   * One simulation step of `dt`, recorded; returns the time the step used.
   *
   * Scheduled actions commit when their clock is reached. Already-due actions
   * invoke the transition callback before integration, so their post-action
   * frame keeps the actual event time and pose. Arrival actions are captured
   * after the step; neighboring frames retain the pre-event state. This uses
   * recorded physical states, without re-simulation or invented timestamps.
   */
  private flyStep(sim: Simulation, dt: number, rigid: boolean): number {
    this.revision++;
    const head = this.last;
    // The pre-step frame: reuse the head when it already sits on this instant
    // (the common case in the dense phases, where the cadence matches the
    // step size), otherwise capture one speculatively and keep it only if it
    // earns its place — the cadence is due, or the step turned out to emit an
    // event stamped with this very time.
    const preIsHead = !!head && Math.abs(head.t - sim.state.t) < 1e-9;
    const pre = preIsHead ? head! : captureFrame(sim);
    const dueBefore = !head || pre.t - head.t >= this.intervalOf(pre) - 1e-9;
    const nEvents = sim.events.length;
    // Set inside the step's callback; typed wide so the compiler does not narrow it to null.
    let transitioned = null as VisualFrame | null;
    const used = sim.step(dt, () => {
      transitioned = this.store(captureFrame(sim), true);
      if (rigid) this.recordAttitudes(true);
    });
    if (rigid) this.recordAttitudes();
    // T02: the state this step started from, after any action it committed first.
    this.liveFrom = transitioned ?? pre;
    const fired = sim.events.length > nEvents;
    if (!transitioned && !preIsHead && (dueBefore || fired)) this.store(pre, fired);
    // The pre-step frame is already the head, so there is nothing to store —
    // but if the step emitted an event stamped with *this* time (the queue of
    // scheduled actions is drained before integrating, with the clock still
    // on the old time), the head has to be marked as an event boundary or
    // decimation is free to drop the only frame that event has.
    else if (!transitioned && preIsHead && fired) this.store(pre, true);
    const s = sim.state;
    const headNow = this.last;
    const dueAfter = !headNow || s.t - headNow.t >= this.interval(s.status, s.t, s.altitude, s.nextBurnTime, s.rendezvous?.range, s.rendezvous?.phase === 'burn' || (s.status === 'orbit' && s.thrust > 1e3)) - 1e-9;
    if (dueAfter || fired) this.store(captureFrame(sim), fired);
    if (fired) this.pullEvents();
    return used;
  }

  /**
   * Advance the live flight by `seconds` of mission time, recording as it
   * goes. Mirrors `Simulation.advance` step for step, so the flight is the one
   * the physics would have flown on its own.
   *
   * @param deadline optional `performance.now()` value to stop at. A step count
   *        is not a time budget: the same 6000 steps are a millisecond of coast
   *        and a tenth of a second of powered flight, so at a high warp the
   *        animation frame could be spent entirely inside the integrator and
   *        the display would freeze while the flight raced ahead. Stopping on
   *        the clock instead costs nothing but a slower advance on a slow
   *        machine, and the sequence of steps — hence the recorded flight — is
   *        unchanged either way.
   * @returns the mission time the live instant moved.
   */
  advance(seconds: number, maxSteps = 5000, deadline = Infinity): number {
    const sim = this.sim;
    if (!sim) return 0;
    if (sim.events.length !== this.detectedEvents.length) this.captureChangedState();
    const clocked = deadline !== Infinity && typeof performance !== 'undefined';
    if (this.lookahead) return this.advanceAhead(sim, seconds, maxSteps, deadline, clocked);
    const before = sim.state.t;
    let remaining = this.rigidRemainder + Math.max(0, seconds);
    let steps = 0;
    let limited = false;
    let stalled = false;
    while (remaining > 1e-6 && steps < maxSteps && sim.state.status !== 'failed') {
      // Rigid steps are substantially heavier: check every four so the wall
      // budget still protects interaction latency.
      if (clocked && (steps & 3) === 3 && performance.now() > deadline) { limited = true; break; }
      const suggested = sim.suggestedDt();
      if (remaining + 1e-10 < suggested) break;
      // A rendering packet must not shorten a rigid step. suggestedDt still
      // owns exact event boundaries; sim.step can re-clamp after a transition.
      const used = this.flyStep(sim, suggested, true);
      if (!(used > 0)) { stalled = true; break; }
      remaining -= used;
      steps++;
    }
    remaining = Math.max(0, remaining);
    if (stalled || sim.state.status === 'failed') this.rigidRemainder = 0;
    else if (limited || steps >= maxSteps) {
      // Keep only fractional time, never a queue of unserved warp work.
      const next = sim.suggestedDt();
      this.rigidRemainder = remaining % next;
      if (next - this.rigidRemainder < 1e-10) this.rigidRemainder = 0;
    } else this.rigidRemainder = remaining;
    this.publish();
    return sim.state.t - before;
  }

  /**
   * T02: the point-mass flight, in whole steps. The simulation steps exactly as
   * a headless loop does — `sim.step(sim.suggestedDt())` — until it has reached
   * or passed the new live instant; what a frame's length decides is only when
   * a step is flown, never how long it is. The picture then stands between the
   * two boundaries of the last step (`recordNow`).
   *
   * Time the wall-clock budget or the step count could not serve is dropped, as
   * it always was, rather than queued: the live instant stops at the
   * simulation's clock. A flight that fails is shown failed at once (at most
   * one step early, a tenth of a second in the air), since nothing follows it.
   */
  private advanceAhead(sim: Simulation, seconds: number, maxSteps: number, deadline: number, clocked: boolean): number {
    const before = this.liveTime;
    const target = before + (seconds > 0 ? seconds : 0);
    let steps = 0;
    // A nanosecond's grace, so a clock that sums to a boundary give or take the
    // last bit does not fly a whole further step (it changes when, never how).
    while (sim.state.t < target - 1e-9 && steps < maxSteps && sim.state.status !== 'failed') {
      if (clocked && (steps & 31) === 31 && performance.now() > deadline) break;
      this.flyStep(sim, sim.suggestedDt(), false);
      steps++;
    }
    const now = sim.state.t;
    this.liveTime = sim.state.status === 'failed' ? Math.max(before, now) : Math.max(before, Math.min(target, now));
    this.publish();
    return this.liveTime - before;
  }

  /**
   * Thin the recording when it outgrows its budget: drop every other coast or
   * orbit frame that is not an event boundary. Ascent frames are only touched
   * when there is no coast left to give, and event frames never are — what a
   * user scrubs back to is liftoff, max Q and staging.
   *
   * The budget is a real bound: the old version raised `maxFrames` by 50 %
   * whenever the coast pass came up empty, so a recording with nothing
   * thinnable grew without limit. The second pass thins any non-event frame
   * instead, and the ceiling only moves in the (unreachable in practice) case
   * where every frame is an event frame.
   */
  private decimate(): void {
    if (this.thin((f) => (f.status === 'coast' || f.status === 'orbit') && !this.keep.has(f))) return;
    if (this.thin((f) => !this.keep.has(f))) return;
    // Every frame is an event boundary: raise the ceiling rather than spin on
    // every push. Needs ~12 000 events in one mission to happen.
    this.maxFrames = Math.ceil(this.maxFrames * 1.5);
  }

  /** Drop every other frame matching `thinnable`; true when anything went. */
  private thin(thinnable: (f: VisualFrame) => boolean): boolean {
    const kept: VisualFrame[] = [];
    let dropped = 0;
    const last = this.stored.length - 1;
    // An event stamped in the past (max Q, at its peak) is pinned only when it
    // is detected, so the frames it may land on stay until then.
    const recent = this.stored[last].t - RETRO_EVENT_WINDOW_S;
    let seen = 0;
    for (let i = 0; i < this.stored.length; i++) {
      const f = this.stored[i];
      // `seen` counts candidates rather than array slots, so alternate
      // *candidates* go rather than alternate indices — a run of protected
      // frames in the middle no longer flips which half of the coast survives.
      if (i > 0 && i < last && f.t < recent && thinnable(f)) {
        if (seen++ % 2 === 1) { dropped++; continue; }
      }
      kept.push(f);
    }
    if (dropped === 0) return false;
    this.stored.length = 0;
    for (const f of kept) this.stored.push(f);
    this.decimations++;
    return true;
  }

  /** Index of the last frame at or before `t` (0 when `t` precedes the start). */
  indexAt(t: number): number {
    return frameIndexAt(this.frames, t);
  }

  /**
   * Bytes one frame of this mission's shape retains, using the measured
   * calibration in `FRAME_BYTES`. The stage and booster counts are fixed for a
   * mission, so they are read off the head; the debris count is not, so
   * `stats()` sums it per frame.
   */
  get bytesPerFrame(): number {
    const f = this.head ?? this.frames[0];
    if (!f) return FRAME_BYTES.base;
    return frameBytes(f);
  }

  stats(): RecorderStats {
    return recordingStats(this.frames, this.events.length, this.decimations, this.attitudeTracks);
  }

  /** Hard ceiling on stored frames (exposed so a test can check the budget). */
  get frameLimit(): number {
    return this.maxFrames;
  }
}
