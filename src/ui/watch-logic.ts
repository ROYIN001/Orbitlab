/**
 * What the launch viewer says and how fast it plays, for one instant.
 *
 * Pure functions of the displayed frame and the recorded event log, like
 * `phaseInfo` in ui/phase.ts, so they behave identically live and replayed and
 * can be tested without a DOM. They return i18n keys, never text.
 *
 * The narration band in the engineering workspace is written for someone who
 * knows what closed-loop guidance and a periapsis are. The viewer is for
 * someone who does not: every "beat" here is one plain sentence about what the
 * rocket is doing and why, and the numbers on screen are the three anyone can
 * read (time, height, speed).
 */
import type { VisualFrame } from '../physics/frame';
import type { SimEvent } from '../physics/simulation';
import { OMEGA_EARTH } from '../physics/constants';

export type WatchBeat =
  | 'countdown' | 'liftoff' | 'climb' | 'transonic' | 'maxQ' | 'gravityTurn' | 'boosterSep' | 'boosterSepCross' | 'boosterSepSolid'
  | 'fairingSep' | 'stageSep' | 'upperStage' | 'coast' | 'burn' | 'orbit' | 'deployed' | 'failed'
  // a stage flown home
  | 'boostback' | 'entryBurn' | 'landingBurn' | 'boosterLanded' | 'boosterLandedShip' | 'boosterCaught'
  // a ship flown home from a suborbital cut-off
  | 'suborbital' | 'shipCoast' | 'shipEntry' | 'bellyFlop' | 'shipFlip' | 'splashdown'
  // a launch abort (G06): what went wrong, the way out, the crew's way down
  | 'padFire' | 'boosterCollision' | 'stagingFailure' | 'abortTower' | 'abortFairing' | 'abortSeparation'
  | 'escapeCoast' | 'escapeCapsule' | 'escapeModules' | 'ballistic' | 'drogue' | 'mainChute' | 'mainDescent' | 'softLanding' | 'crewSafe'
  // a capsule flown home from a suborbital flight (C01: Mercury-Redstone 3)
  | 'capsuleCutoff' | 'capsuleSep' | 'capsuleArc' | 'retroFire' | 'capsuleEntry' | 'capsuleDrogue' | 'capsuleMain' | 'capsuleSplash'
  // a flight on to the station (G07)
  | 'rvPlan' | 'rvPhasing' | 'rvBurn' | 'rvApproach' | 'rvFlyaround' | 'rvStationkeeping' | 'rvFinal' | 'rvContact' | 'rvCapture' | 'rvDocked';

/** Label and sentence of each beat. Literal keys, so the i18n suite sees their call sites. */
export const WATCH_BEATS: Record<WatchBeat, { label: string; text: string }> = {
  countdown: { label: 'watch.beat.countdown', text: 'watch.say.countdown' },
  liftoff: { label: 'watch.beat.liftoff', text: 'watch.say.liftoff' },
  climb: { label: 'watch.beat.climb', text: 'watch.say.climb' },
  maxQ: { label: 'watch.beat.maxQ', text: 'watch.say.maxQ' },
  gravityTurn: { label: 'watch.beat.gravityTurn', text: 'watch.say.gravityTurn' },
  boosterSep: { label: 'watch.beat.boosterSep', text: 'watch.say.boosterSep' },
  boosterSepCross: { label: 'watch.beat.boosterSep', text: 'watch.say.boosterSepCross' },
  boosterSepSolid: { label: 'watch.beat.boosterSep', text: 'watch.say.boosterSepSolid' },
  transonic: { label: 'watch.beat.transonic', text: 'watch.say.transonic' },
  fairingSep: { label: 'watch.beat.fairingSep', text: 'watch.say.fairingSep' },
  stageSep: { label: 'watch.beat.stageSep', text: 'watch.say.stageSep' },
  upperStage: { label: 'watch.beat.upperStage', text: 'watch.say.upperStage' },
  coast: { label: 'watch.beat.coast', text: 'watch.say.coast' },
  burn: { label: 'watch.beat.burn', text: 'watch.say.burn' },
  orbit: { label: 'watch.beat.orbit', text: 'watch.say.orbit' },
  deployed: { label: 'watch.beat.deployed', text: 'watch.say.deployed' },
  failed: { label: 'watch.beat.failed', text: 'watch.say.failed' },
  boostback: { label: 'watch.beat.boostback', text: 'watch.say.boostback' },
  entryBurn: { label: 'watch.beat.entryBurn', text: 'watch.say.entryBurn' },
  landingBurn: { label: 'watch.beat.landingBurn', text: 'watch.say.landingBurn' },
  boosterLanded: { label: 'watch.beat.boosterLanded', text: 'watch.say.boosterLanded' },
  boosterLandedShip: { label: 'watch.beat.boosterLandedShip', text: 'watch.say.boosterLandedShip' },
  boosterCaught: { label: 'watch.beat.boosterCaught', text: 'watch.say.boosterCaught' },
  suborbital: { label: 'watch.beat.suborbital', text: 'watch.say.suborbital' },
  shipCoast: { label: 'watch.beat.shipCoast', text: 'watch.say.shipCoast' },
  shipEntry: { label: 'watch.beat.shipEntry', text: 'watch.say.shipEntry' },
  bellyFlop: { label: 'watch.beat.bellyFlop', text: 'watch.say.bellyFlop' },
  shipFlip: { label: 'watch.beat.shipFlip', text: 'watch.say.shipFlip' },
  splashdown: { label: 'watch.beat.splashdown', text: 'watch.say.splashdown' },
  padFire: { label: 'watch.beat.padFire', text: 'watch.say.padFire' },
  boosterCollision: { label: 'watch.beat.separationFault', text: 'watch.say.boosterCollision' },
  stagingFailure: { label: 'watch.beat.separationFault', text: 'watch.say.stagingFailure' },
  abortTower: { label: 'watch.beat.abortTower', text: 'watch.say.abortTower' },
  abortFairing: { label: 'watch.beat.abortFairing', text: 'watch.say.abortFairing' },
  abortSeparation: { label: 'watch.beat.abortSeparation', text: 'watch.say.abortSeparation' },
  escapeCoast: { label: 'watch.beat.escapeCoast', text: 'watch.say.escapeCoast' },
  capsuleCutoff: { label: 'watch.beat.capsuleCutoff', text: 'watch.say.capsuleCutoff' },
  capsuleSep: { label: 'watch.beat.capsuleSep', text: 'watch.say.capsuleSep' },
  capsuleArc: { label: 'watch.beat.capsuleArc', text: 'watch.say.capsuleArc' },
  retroFire: { label: 'watch.beat.retroFire', text: 'watch.say.retroFire' },
  capsuleEntry: { label: 'watch.beat.capsuleEntry', text: 'watch.say.capsuleEntry' },
  capsuleDrogue: { label: 'watch.beat.drogue', text: 'watch.say.capsuleDrogue' },
  capsuleMain: { label: 'watch.beat.capsuleMain', text: 'watch.say.capsuleMain' },
  capsuleSplash: { label: 'watch.beat.splashdown', text: 'watch.say.capsuleSplash' },
  escapeCapsule: { label: 'watch.beat.escapeCapsule', text: 'watch.say.escapeCapsule' },
  escapeModules: { label: 'watch.beat.escapeCapsule', text: 'watch.say.escapeModules' },
  ballistic: { label: 'watch.beat.ballistic', text: 'watch.say.ballistic' },
  drogue: { label: 'watch.beat.drogue', text: 'watch.say.drogue' },
  mainChute: { label: 'watch.beat.mainChute', text: 'watch.say.mainChute' },
  mainDescent: { label: 'watch.beat.mainDescent', text: 'watch.say.mainDescent' },
  softLanding: { label: 'watch.beat.softLanding', text: 'watch.say.softLanding' },
  crewSafe: { label: 'watch.beat.crewSafe', text: 'watch.say.crewSafe' },
  rvPlan: { label: 'watch.beat.rvPlan', text: 'watch.say.rvPlan' },
  rvPhasing: { label: 'watch.beat.rvPhasing', text: 'watch.say.rvPhasing' },
  rvBurn: { label: 'watch.beat.rvBurn', text: 'watch.say.rvBurn' },
  rvApproach: { label: 'watch.beat.rvApproach', text: 'watch.say.rvApproach' },
  rvFlyaround: { label: 'watch.beat.rvFlyaround', text: 'watch.say.rvFlyaround' },
  rvStationkeeping: { label: 'watch.beat.rvStationkeeping', text: 'watch.say.rvStationkeeping' },
  rvFinal: { label: 'watch.beat.rvFinal', text: 'watch.say.rvFinal' },
  rvContact: { label: 'watch.beat.rvContact', text: 'watch.say.rvContact' },
  rvCapture: { label: 'watch.beat.rvCapture', text: 'watch.say.rvCapture' },
  rvDocked: { label: 'watch.beat.rvDocked', text: 'watch.say.rvDocked' },
};

/**
 * Events that hold the screen for a while after they happen, newest first
 * wins. The window is mission time: long enough to read the sentence at 1×.
 */
const EVENT_BEATS: ReadonlyArray<{ key: string; beat: WatchBeat; hold: number }> = [
  { key: 'evt.boosterSep', beat: 'boosterSep', hold: 12 },
  { key: 'evt.stageSep', beat: 'stageSep', hold: 12 },
  { key: 'evt.fairingSep', beat: 'fairingSep', hold: 10 },
  { key: 'evt.maxQ', beat: 'maxQ', hold: 10 },
  // A stage flying home interleaves with the rest of the flight, the way a
  // launch broadcast cuts between them.
  { key: 'evt.boostbackStart', beat: 'boostback', hold: 14 },
  { key: 'evt.entryBurnStart', beat: 'entryBurn', hold: 12 },
  { key: 'evt.landingBurnStart', beat: 'landingBurn', hold: 12 },
  { key: 'evt.boosterLandedZone', beat: 'boosterLanded', hold: 15 },
  { key: 'evt.boosterLanded', beat: 'boosterLanded', hold: 15 },
  { key: 'evt.boosterLandedShip', beat: 'boosterLandedShip', hold: 15 },
  { key: 'evt.boosterCaught', beat: 'boosterCaught', hold: 15 },
  { key: 'evt.suborbitalTarget', beat: 'suborbital', hold: 15 },
  // C01: a capsule's separation on a suborbital flight (an orbital payload's has no beat of its own)
  { key: 'evt.payloadSep', beat: 'capsuleSep', hold: 12 },
  // G06: an abort reads as it happens; the way out is picked by `evt.abort`'s mode
  { key: 'evt.padFire', beat: 'padFire', hold: 8 },
  { key: 'evt.boosterCollision', beat: 'boosterCollision', hold: 6 },
  { key: 'evt.stagingFailure', beat: 'stagingFailure', hold: 8 },
  { key: 'evt.abort', beat: 'abortTower', hold: 12 },
  { key: 'evt.escapeCapsule', beat: 'escapeCapsule', hold: 10 },
  { key: 'evt.escapeDrogue', beat: 'drogue', hold: 12 },
  { key: 'evt.retroFire', beat: 'retroFire', hold: 12 },
  { key: 'evt.escapeMain', beat: 'mainChute', hold: 15 },
  { key: 'evt.escapeMainLow', beat: 'mainChute', hold: 15 },
  { key: 'evt.escapeSoftLanding', beat: 'softLanding', hold: 10 },
  // G07: the plan is read out after the separation; the contact is its own moment
  { key: 'evt.rendezvousPlan', beat: 'rvPlan', hold: 20 },
  { key: 'evt.contact', beat: 'rvContact', hold: 20 },
];
const ABORT_BEATS: Record<string, WatchBeat> = { tower: 'abortTower', fairing: 'abortFairing', separation: 'abortSeparation' };
/** Above this, a falling descent module is coasting or entering, not yet on its way to its parachutes, m. */
const BALLISTIC_ALTITUDE = 15e3;
/** Above this a capsule coming home is still on its arc, weightless; below it, entering the air (C01). */
const CAPSULE_ARC_ALTITUDE = 80e3;
const LONGEST_HOLD = Math.max(...EVENT_BEATS.map((b) => b.hold));
/** Speed below which a ship coming home is falling belly first, m/s over the ground. */
const BELLYFLOP_SPEED = 450;
/** The flight's end card waits this long after the last stage flown home came down, s. */
const RETURN_SETTLE = 10;
const RETURN_DOWN = new Set(['evt.boosterLandedZone', 'evt.boosterLanded', 'evt.boosterLandedShip', 'evt.boosterCaught', 'evt.stageImpact']);
/** seconds after liftoff that are "liftoff" rather than the climb */
const LIFTOFF_HOLD = 12;
/** Mach band the transonic beat holds for (the vapour cone's, render/vapour.ts) */
const TRANSONIC: readonly [number, number] = [0.9, 1.15];
/** below this the rocket is still rising almost straight up */
const CLIMB_ALTITUDE = 4000;

/**
 * The beat on screen at this instant.
 *
 * `crossSeparation` picks the Soyuz wording for the strap-on separation: four
 * boosters peeling away together is the "Korolev cross", which is worth
 * naming to anyone watching one. `solidBoosters` picks the solid-motor
 * wording: their separation motors and the smoke they leave (V03).
 */
export function watchBeat(frame: VisualFrame | null, events: readonly SimEvent[], crossSeparation = false, solidBoosters = false): WatchBeat {
  if (!frame) return 'countdown';
  if (frame.status === 'failed' || frame.destroyed) return 'failed';
  // a pad abort happens before liftoff: its events are what is on screen
  const padAbort = !frame.liftoff && (!!frame.abort || events.some((e) => e.key === 'evt.padFire' && e.t <= frame.t + 1e-6));
  if ((frame.status === 'prelaunch' || !frame.liftoff) && !padAbort) return 'countdown';
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.t > frame.t + 1e-6) continue;
    if (frame.t - e.t > LONGEST_HOLD) break;
    for (const b of EVENT_BEATS) {
      if (b.key === e.key && frame.t - e.t <= b.hold) {
        // C01: a capsule flight's cut-off, separation and parachutes are its own
        const capsule = frame.abort?.kind === 'return';
        if (b.key === 'evt.suborbitalTarget' && frame.status !== 'descent') return 'capsuleCutoff';
        if (b.key === 'evt.payloadSep') { if (capsule) return 'capsuleSep'; continue; }
        if (capsule && b.key === 'evt.escapeDrogue') return 'capsuleDrogue';
        if (capsule && (b.key === 'evt.escapeMain' || b.key === 'evt.escapeMainLow')) return 'capsuleMain';
        if (b.key === 'evt.abort') return ABORT_BEATS[String(e.params?.mode)] ?? b.beat;
        if (b.key === 'evt.escapeCapsule') return capsuleBeat(frame);
        if (b.beat === 'boosterSep') return crossSeparation ? 'boosterSepCross' : solidBoosters ? 'boosterSepSolid' : 'boosterSep';
        return b.beat;
      }
    }
  }
  if (frame.abort) return abortBeat(frame);
  if (frame.rendezvous) return rendezvousBeat(frame);
  switch (frame.status) {
    case 'ascent': {
      const since = frame.t - Math.max(0, frame.liftoffT ?? 0);
      if (since < LIFTOFF_HOLD) return 'liftoff';
      // V03: through the speed of sound, while the air still carries the water for a vapour cone
      if (frame.mach >= TRANSONIC[0] && frame.mach <= TRANSONIC[1] && frame.altitude < 15e3) return 'transonic';
      if (frame.activeStageIndex > 0) return 'upperStage';
      return frame.altitude < CLIMB_ALTITUDE ? 'climb' : 'gravityTurn';
    }
    case 'coast': return 'coast';
    case 'burn': return 'burn';
    case 'descent':
      switch (frame.descentPhase) {
        case 'entry': return groundSpeed(frame) < BELLYFLOP_SPEED ? 'bellyFlop' : 'shipEntry';
        case 'bellyflop': return 'bellyFlop';
        case 'flip':
        case 'landing': return 'shipFlip';
        default: return 'shipCoast';
      }
    case 'landed': return frame.note === 'shipLost' ? 'failed' : 'splashdown';
    default: return frame.payloadSeparated ? 'deployed' : 'orbit';
  }
}

/** A flight to the station between its events: what the spacecraft is doing now. */
function rendezvousBeat(frame: VisualFrame): WatchBeat {
  switch (frame.rendezvous!.phase) {
    case 'burn': return 'rvBurn';
    case 'approach': return 'rvApproach';
    case 'flyaround': return 'rvFlyaround';
    case 'stationkeeping': case 'retreat': return 'rvStationkeeping';
    case 'final': return 'rvFinal';
    case 'capture': return 'rvCapture';
    case 'docked': return 'rvDocked';
    case 'aborted': return 'orbit';
    default: return 'rvPhasing';
  }
}

/** The descent module coming free: out of the fairing, or, after a separation, from its own modules. */
function capsuleBeat(frame: VisualFrame): WatchBeat {
  return frame.abort?.mode === 'separation' ? 'escapeModules' : 'escapeCapsule';
}

/** The escape between its events: pulling clear, falling, under a parachute, down. */
function abortBeat(frame: VisualFrame): WatchBeat {
  const a = frame.abort!;
  if (a.kind === 'return') {
    // C01: the capsule coming home as planned
    if (frame.status === 'landed' || a.phase === 'landed') return 'capsuleSplash';
    if (a.phase === 'drogue') return 'capsuleDrogue';
    if (a.phase === 'main') return 'capsuleMain';
    return frame.altitude > CAPSULE_ARC_ALTITUDE ? 'capsuleArc' : 'capsuleEntry';
  }
  if (frame.status === 'landed' || a.phase === 'landed') return 'crewSafe';
  switch (a.phase) {
    case 'escape':
    case 'coast': return a.body === 'spacecraft' ? 'abortSeparation' : 'escapeCoast';
    case 'fall': return frame.altitude > BALLISTIC_ALTITUDE ? 'ballistic' : capsuleBeat(frame);
    case 'drogue': return 'drogue';
    default: return 'mainDescent';
  }
}

/** A stage still flying home, in the frame. */
function returning(frame: VisualFrame): { alive: boolean; low: boolean } {
  let alive = false, low = false;
  for (const d of frame.debris ?? []) {
    if (!d.alive || !d.recovery?.target) continue;
    alive = true;
    if (d.recovery.phase === 'entry' || d.recovery.phase === 'landing') low = true;
  }
  return { alive, low };
}

/**
 * The automatic playback speed: real time for everything worth seeing, faster
 * through the long quiet stretches.
 *
 * Liftoff, max-Q and every separation play at 1×. The first-stage climb after
 * the first 100 s goes at 2×, the upper stage and every later burn at 5×, and
 * a coast to a later burn at 50× until the last minute before that burn. Every
 * value is one of the workspace warp selector's presets, so the selector still
 * names the speed after a switch to the workspace. The warp only ever
 * reacts to what has happened — a separation cannot be seen coming live — so
 * each one is caught just after it starts and then held at 1×.
 */
export function autoWarp(frame: VisualFrame | null, beat: WatchBeat): number {
  if (!frame) return 1;
  const w = beatWarp(frame, beat);
  // A stage on its way home is worth watching whatever the rest of the
  // flight is doing: never faster than 5× while one flies, 2× once it is
  // back in the air.
  const home = returning(frame);
  return home.low ? Math.min(w, 2) : home.alive ? Math.min(w, 5) : w;
}

function beatWarp(frame: VisualFrame, beat: WatchBeat): number {
  switch (beat) {
    case 'gravityTurn':
      return frame.t - Math.max(0, frame.liftoffT ?? 0) < 100 ? 1 : 2;
    case 'upperStage':
    case 'burn':
      return 5;
    case 'coast': {
      const tgo = frame.nextBurnTime - frame.t;
      return frame.nextBurnTime > 0 && tgo < 60 ? 5 : 50;
    }
    case 'orbit':
    case 'deployed':
      return 10;
    case 'boostback':
    case 'bellyFlop':
      return 2;
    // half an hour across the planet, then a quarter of an hour of plasma
    case 'shipCoast':
      return 50;
    case 'shipEntry':
      return 10;
    // G06: the minutes of a ballistic arc and of a descent under the canopy go
    // quickly; the entry, the parachutes opening and the last few hundred
    // metres play at their own pace
    case 'ballistic':
      return frame.altitude > 80e3 ? 10 : 2;
    case 'mainDescent':
      return frame.altitudeAGL > 400 ? 20 : frame.altitudeAGL > 80 ? 5 : 1;
    // G07: the hours of phasing go by quickly, each burn and the approach at a pace to follow, the last metres in real time
    case 'rvPhasing': {
      const tgo = frame.nextBurnTime - frame.t;
      return frame.nextBurnTime > 0 && tgo < 90 ? 5 : 100;
    }
    case 'rvBurn':
      return 5;
    case 'rvApproach':
    case 'rvFlyaround':
      return 10;
    case 'rvStationkeeping':
      return 5;
    case 'rvFinal': {
      const axial = frame.rendezvous?.axial ?? Infinity;
      return axial > 30 ? 5 : axial > 5 ? 2 : 1;
    }
    case 'rvCapture':
    case 'rvDocked':
      return 25;
    default:
      return 1;
  }
}

/**
 * Speed over the ground, m/s: the inertial velocity less the Earth's rotation
 * at the vehicle. This is the figure a launch broadcast shows — it reads zero
 * on the pad, where the inertial speed at Baikonur is already 1 160 km/h.
 */
export function groundSpeed(frame: VisualFrame): number {
  const { r, v } = frame;
  // ω × r with ω along +z (ECI)
  const vx = v.x + OMEGA_EARTH * r.y;
  const vy = v.y - OMEGA_EARTH * r.x;
  return Math.hypot(vx, vy, v.z);
}

/** The flight has reached a stable orbit worth a "you made it" card. */
export function reachedOrbit(frame: VisualFrame | null, events: readonly SimEvent[]): boolean {
  if (!frame || frame.status === 'failed') return false;
  if (frame.status === 'orbit') return true;
  for (const e of events) {
    if (e.t > frame.t + 1e-6) break;
    if (e.key === 'evt.parkingOrbit' || e.key === 'evt.targetOrbit') return true;
  }
  return false;
}

/** How a flight on screen ends. */
export type WatchEnding = 'orbit' | 'splashdown' | 'crewSafe' | 'docked' | 'failed';

/**
 * How the flight on screen has ended, if it has: in orbit, with a splashdown
 * (a suborbital ship flown home), or lost. The end card waits for every stage
 * flown home to be down and a few seconds more, so it does not cover a
 * landing.
 */
export function flightEnding(frame: VisualFrame | null, events: readonly SimEvent[]): WatchEnding | null {
  if (!frame) return null;
  // G07: a flight to the station ends docked (or in orbit by it, when the docking was called off), not at the insertion
  // before its plan (the spacecraft still separating) the flight is already on its way to the station
  if (frame.status === 'rendezvous' && !frame.rendezvous) return null;
  const rv = frame.rendezvous;
  if (rv) {
    if (rv.phase === 'docked') return rv.dockedAt !== undefined && frame.t - rv.dockedAt >= RETURN_SETTLE ? 'docked' : null;
    return rv.phase === 'aborted' ? 'orbit' : null;
  }
  // G06: after an abort, the end is the crew down and a few seconds more
  if (frame.abort) {
    if (frame.status !== 'landed') return null;
    // C01: a capsule home as planned ends in a splashdown
    const planned = frame.abort.kind === 'return';
    const down = [...events].reverse().find((e) => e.key === (planned ? 'evt.capsuleSplashdown' : 'evt.escapeLanded') && e.t <= frame.t + 1e-6);
    return down && frame.t - down.t >= RETURN_SETTLE ? (planned ? 'splashdown' : 'crewSafe') : null;
  }
  if (frame.status === 'failed' || (frame.status === 'landed' && frame.note === 'shipLost')) return 'failed';
  const ending = frame.status === 'landed' ? 'splashdown' : reachedOrbit(frame, events) ? 'orbit' : null;
  if (!ending || returning(frame).alive) return null;
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.t > frame.t + 1e-6) continue;
    if (frame.t - e.t > RETURN_SETTLE) break;
    if (RETURN_DOWN.has(e.key)) return null;
  }
  return ending;
}
