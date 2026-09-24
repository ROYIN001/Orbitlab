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
  | 'countdown' | 'liftoff' | 'climb' | 'maxQ' | 'gravityTurn' | 'boosterSep' | 'boosterSepCross'
  | 'fairingSep' | 'stageSep' | 'upperStage' | 'coast' | 'burn' | 'orbit' | 'deployed' | 'failed'
  // a stage flown home
  | 'boostback' | 'entryBurn' | 'landingBurn' | 'boosterLanded' | 'boosterLandedShip' | 'boosterCaught'
  // a ship flown home from a suborbital cut-off
  | 'suborbital' | 'shipCoast' | 'shipEntry' | 'bellyFlop' | 'shipFlip' | 'splashdown';

/** Label and sentence of each beat. Literal keys, so the i18n suite sees their call sites. */
export const WATCH_BEATS: Record<WatchBeat, { label: string; text: string }> = {
  countdown: { label: 'watch.beat.countdown', text: 'watch.say.countdown' },
  liftoff: { label: 'watch.beat.liftoff', text: 'watch.say.liftoff' },
  climb: { label: 'watch.beat.climb', text: 'watch.say.climb' },
  maxQ: { label: 'watch.beat.maxQ', text: 'watch.say.maxQ' },
  gravityTurn: { label: 'watch.beat.gravityTurn', text: 'watch.say.gravityTurn' },
  boosterSep: { label: 'watch.beat.boosterSep', text: 'watch.say.boosterSep' },
  boosterSepCross: { label: 'watch.beat.boosterSep', text: 'watch.say.boosterSepCross' },
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
];
const LONGEST_HOLD = Math.max(...EVENT_BEATS.map((b) => b.hold));
/** Speed below which a ship coming home is falling belly first, m/s over the ground. */
const BELLYFLOP_SPEED = 450;
/** The flight's end card waits this long after the last stage flown home came down, s. */
const RETURN_SETTLE = 10;
const RETURN_DOWN = new Set(['evt.boosterLandedZone', 'evt.boosterLanded', 'evt.boosterLandedShip', 'evt.boosterCaught', 'evt.stageImpact']);
/** seconds after liftoff that are "liftoff" rather than the climb */
const LIFTOFF_HOLD = 12;
/** below this the rocket is still rising almost straight up */
const CLIMB_ALTITUDE = 4000;

/**
 * The beat on screen at this instant.
 *
 * `crossSeparation` picks the Soyuz wording for the strap-on separation: four
 * boosters peeling away together is the "Korolev cross", which is worth
 * naming to anyone watching one.
 */
export function watchBeat(frame: VisualFrame | null, events: readonly SimEvent[], crossSeparation = false): WatchBeat {
  if (!frame) return 'countdown';
  if (frame.status === 'failed' || frame.destroyed) return 'failed';
  if (frame.status === 'prelaunch' || !frame.liftoff) return 'countdown';
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.t > frame.t + 1e-6) continue;
    if (frame.t - e.t > LONGEST_HOLD) break;
    for (const b of EVENT_BEATS) {
      if (b.key === e.key && frame.t - e.t <= b.hold) {
        return b.beat === 'boosterSep' && crossSeparation ? 'boosterSepCross' : b.beat;
      }
    }
  }
  switch (frame.status) {
    case 'ascent': {
      const since = frame.t - Math.max(0, frame.liftoffT ?? 0);
      if (since < LIFTOFF_HOLD) return 'liftoff';
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

/**
 * How the flight on screen has ended, if it has: in orbit, with a splashdown
 * (a suborbital ship flown home), or lost. The end card waits for every stage
 * flown home to be down and a few seconds more, so it does not cover a
 * landing.
 */
export function flightEnding(frame: VisualFrame | null, events: readonly SimEvent[]): 'orbit' | 'splashdown' | 'failed' | null {
  if (!frame) return null;
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
