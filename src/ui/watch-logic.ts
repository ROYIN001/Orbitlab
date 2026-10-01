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
import { APOLLO_AT_MOON, APOLLO_CM } from '../physics/sim/apollo';
import { STATIONKEEPING_M } from '../physics/sim/apollo-rendezvous';
import type { SimEvent } from '../physics/simulation';
import { OMEGA_EARTH } from '../physics/constants';
import { VOSTOK_CAPSULE } from '../physics/rigid/escape';

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
  // Vostok-1 from its orbit home (C01): the orbit, the retro-fire, the stuck separation, the entry, the ejection, the steppe
  | 'vostokOrbit' | 'vostokRetro' | 'vostokCoast' | 'vostokSeparation' | 'vostokEntry' | 'vostokEjection' | 'vostokDrogue' | 'vostokMain' | 'vostokLanding'
  // a flight on to the station (G07)
  | 'rvPlan' | 'rvPhasing' | 'rvBurn' | 'rvApproach' | 'rvFlyaround' | 'rvStationkeeping' | 'rvFinal' | 'rvContact' | 'rvCapture' | 'rvDocked'
  // Apollo from its parking orbit (C01): the restart for the Moon, the transposition, the extraction,
  // and on to the Moon: the evasive burn, the coast, the midcourse correction, the Moon's sphere of influence
  | 'apolloParking' | 'tliBurn' | 'tliDone' | 'transposition' | 'apolloDocked' | 'extraction' | 'translunarCoast'
  | 'evasiveBurn' | 'midcourseBurn' | 'lunarSoi' | 'lunarApproach' | 'loiBurn' | 'lunarOrbit' | 'circularizeBurn'
  // and down to the surface: undocking, the descent orbit, the three programs of the powered descent, the landing
  | 'lmUndocked' | 'doiBurn' | 'descentOrbit' | 'brakingPhase' | 'approachPhase' | 'landingPhase' | 'lunarLanding'
  // and back to Columbia: the stay, the lift-off, the coelliptic sequence, the terminal phase, the docking, the jettison
  | 'onTheMoon' | 'lunarLiftoff' | 'lmInOrbit' | 'csiBurn' | 'coelliptic' | 'cdhBurn' | 'tpiBurn' | 'terminalPhase'
  | 'rendezvousBraking' | 'lmStationkeeping' | 'redocked' | 'lmJettison'
  // and home: the burn for the Earth, the coast, its correction, the CM on its own, the entry, the parachutes, the water
  | 'teiBurn' | 'homewardCoast' | 'returnMccBurn' | 'cmSeparation' | 'apolloEntry' | 'apolloDrogues' | 'apolloMains' | 'apolloSplashdown';

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
  apolloParking: { label: 'watch.beat.apolloParking', text: 'watch.say.apolloParking' },
  tliBurn: { label: 'watch.beat.tliBurn', text: 'watch.say.tliBurn' },
  tliDone: { label: 'watch.beat.tliDone', text: 'watch.say.tliDone' },
  transposition: { label: 'watch.beat.transposition', text: 'watch.say.transposition' },
  apolloDocked: { label: 'watch.beat.apolloDocked', text: 'watch.say.apolloDocked' },
  extraction: { label: 'watch.beat.extraction', text: 'watch.say.extraction' },
  translunarCoast: { label: 'watch.beat.translunarCoast', text: 'watch.say.translunarCoast' },
  evasiveBurn: { label: 'watch.beat.evasiveBurn', text: 'watch.say.evasiveBurn' },
  midcourseBurn: { label: 'watch.beat.midcourseBurn', text: 'watch.say.midcourseBurn' },
  lunarSoi: { label: 'watch.beat.lunarSoi', text: 'watch.say.lunarSoi' },
  lunarApproach: { label: 'watch.beat.lunarApproach', text: 'watch.say.lunarApproach' },
  loiBurn: { label: 'watch.beat.loiBurn', text: 'watch.say.loiBurn' },
  lunarOrbit: { label: 'watch.beat.lunarOrbit', text: 'watch.say.lunarOrbit' },
  circularizeBurn: { label: 'watch.beat.circularizeBurn', text: 'watch.say.circularizeBurn' },
  lmUndocked: { label: 'watch.beat.lmUndocked', text: 'watch.say.lmUndocked' },
  doiBurn: { label: 'watch.beat.doiBurn', text: 'watch.say.doiBurn' },
  descentOrbit: { label: 'watch.beat.descentOrbit', text: 'watch.say.descentOrbit' },
  brakingPhase: { label: 'watch.beat.brakingPhase', text: 'watch.say.brakingPhase' },
  approachPhase: { label: 'watch.beat.approachPhase', text: 'watch.say.approachPhase' },
  landingPhase: { label: 'watch.beat.landingPhase', text: 'watch.say.landingPhase' },
  lunarLanding: { label: 'watch.beat.lunarLanding', text: 'watch.say.lunarLanding' },
  onTheMoon: { label: 'watch.beat.onTheMoon', text: 'watch.say.onTheMoon' },
  lunarLiftoff: { label: 'watch.beat.lunarLiftoff', text: 'watch.say.lunarLiftoff' },
  lmInOrbit: { label: 'watch.beat.lmInOrbit', text: 'watch.say.lmInOrbit' },
  csiBurn: { label: 'watch.beat.csiBurn', text: 'watch.say.csiBurn' },
  coelliptic: { label: 'watch.beat.coelliptic', text: 'watch.say.coelliptic' },
  cdhBurn: { label: 'watch.beat.cdhBurn', text: 'watch.say.cdhBurn' },
  tpiBurn: { label: 'watch.beat.tpiBurn', text: 'watch.say.tpiBurn' },
  terminalPhase: { label: 'watch.beat.terminalPhase', text: 'watch.say.terminalPhase' },
  rendezvousBraking: { label: 'watch.beat.rendezvousBraking', text: 'watch.say.rendezvousBraking' },
  lmStationkeeping: { label: 'watch.beat.lmStationkeeping', text: 'watch.say.lmStationkeeping' },
  redocked: { label: 'watch.beat.redocked', text: 'watch.say.redocked' },
  lmJettison: { label: 'watch.beat.lmJettison', text: 'watch.say.lmJettison' },
  teiBurn: { label: 'watch.beat.teiBurn', text: 'watch.say.teiBurn' },
  homewardCoast: { label: 'watch.beat.homewardCoast', text: 'watch.say.homewardCoast' },
  returnMccBurn: { label: 'watch.beat.returnMccBurn', text: 'watch.say.returnMccBurn' },
  cmSeparation: { label: 'watch.beat.cmSeparation', text: 'watch.say.cmSeparation' },
  apolloEntry: { label: 'watch.beat.apolloEntry', text: 'watch.say.apolloEntry' },
  apolloDrogues: { label: 'watch.beat.apolloDrogues', text: 'watch.say.apolloDrogues' },
  apolloMains: { label: 'watch.beat.apolloMains', text: 'watch.say.apolloMains' },
  apolloSplashdown: { label: 'watch.beat.apolloSplashdown', text: 'watch.say.apolloSplashdown' },
  capsuleSep: { label: 'watch.beat.capsuleSep', text: 'watch.say.capsuleSep' },
  capsuleArc: { label: 'watch.beat.capsuleArc', text: 'watch.say.capsuleArc' },
  retroFire: { label: 'watch.beat.retroFire', text: 'watch.say.retroFire' },
  capsuleEntry: { label: 'watch.beat.capsuleEntry', text: 'watch.say.capsuleEntry' },
  capsuleDrogue: { label: 'watch.beat.drogue', text: 'watch.say.capsuleDrogue' },
  capsuleMain: { label: 'watch.beat.capsuleMain', text: 'watch.say.capsuleMain' },
  capsuleSplash: { label: 'watch.beat.splashdown', text: 'watch.say.capsuleSplash' },
  vostokOrbit: { label: 'watch.beat.vostokOrbit', text: 'watch.say.vostokOrbit' },
  vostokRetro: { label: 'watch.beat.vostokRetro', text: 'watch.say.vostokRetro' },
  vostokCoast: { label: 'watch.beat.vostokCoast', text: 'watch.say.vostokCoast' },
  vostokSeparation: { label: 'watch.beat.vostokSeparation', text: 'watch.say.vostokSeparation' },
  vostokEntry: { label: 'watch.beat.capsuleEntry', text: 'watch.say.vostokEntry' },
  vostokEjection: { label: 'watch.beat.vostokEjection', text: 'watch.say.vostokEjection' },
  vostokDrogue: { label: 'watch.beat.drogue', text: 'watch.say.vostokDrogue' },
  vostokMain: { label: 'watch.beat.capsuleMain', text: 'watch.say.vostokMain' },
  vostokLanding: { label: 'watch.beat.vostokLanding', text: 'watch.say.vostokLanding' },
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
  // C01: Vostok's instrument module letting go at last, and Gagarin leaving on his seat
  { key: 'evt.vostokSeparation', beat: 'vostokSeparation', hold: 20 },
  { key: 'evt.ejection', beat: 'vostokEjection', hold: 15 },
  { key: 'evt.escapeMain', beat: 'mainChute', hold: 15 },
  { key: 'evt.escapeMainLow', beat: 'mainChute', hold: 15 },
  { key: 'evt.escapeSoftLanding', beat: 'softLanding', hold: 10 },
  // G07: the plan is read out after the separation; the contact is its own moment
  { key: 'evt.rendezvousPlan', beat: 'rvPlan', hold: 20 },
  // C01: Apollo's injection for the Moon, and the minutes after it
  { key: 'evt.tli', beat: 'tliDone', hold: 25 },
  { key: 'evt.slaPanels', beat: 'transposition', hold: 100 },
  { key: 'evt.csmSeparation', beat: 'transposition', hold: 60 },
  { key: 'evt.csmDocked', beat: 'apolloDocked', hold: 30 },
  { key: 'evt.lmExtraction', beat: 'extraction', hold: 40 },
  // on to the Moon: each three-second burn and a few seconds after it; the sphere of influence for five minutes
  { key: 'evt.evasive', beat: 'evasiveBurn', hold: 20 },
  { key: 'evt.mcc', beat: 'midcourseBurn', hold: 20 },
  { key: 'evt.lunarSoi', beat: 'lunarSoi', hold: 300 },
  { key: 'evt.undocking', beat: 'lmUndocked', hold: 60 },
  // home: the one correction, a second's burn and the seconds after it
  { key: 'evt.transearthMcc', beat: 'returnMccBurn', hold: 20 },
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
        const vostok = capsule && frame.abort!.capsule === 'vostok';
        // Vostok's retro-fire is the 40 s of its burn, read from the engine (`abortBeat`)
        if (vostok && b.key === 'evt.retroFire') continue;
        if (vostok && b.key === 'evt.escapeDrogue') return 'vostokDrogue';
        if (vostok && (b.key === 'evt.escapeMain' || b.key === 'evt.escapeMainLow')) return 'vostokMain';
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
  if (frame.apollo) return apolloBeat(frame);
  // C01: Vostok once round the Earth, before its retro-fire
  if (frame.status === 'orbit' && deorbitAt(frame, events) !== null) return 'vostokOrbit';
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

/** Apollo between its events (C01): in the parking orbit, burning for the Moon, on its way. */
function apolloBeat(frame: VisualFrame): WatchBeat {
  switch (frame.apollo!.phase) {
    case 'parking': return 'apolloParking';
    case 'tli': return 'tliBurn';
    case 'transposition': return 'transposition';
    case 'docked': return 'apolloDocked';
    case 'evasive': return 'evasiveBurn';
    case 'midcourse': return 'midcourseBurn';
    case 'approach': return 'lunarApproach';
    case 'loi': return 'loiBurn';
    case 'lunarOrbit': return 'lunarOrbit';
    case 'circularize': return 'circularizeBurn';
    case 'undocked': return 'lmUndocked';
    case 'doi': return 'doiBurn';
    case 'descentOrbit': return 'descentOrbit';
    case 'descent': {
      const d = frame.apollo!.descent?.phase;
      return d === 'approach' ? 'approachPhase' : d === 'landing' || d === 'vertical' ? 'landingPhase' : 'brakingPhase';
    }
    // the first minutes on the Moon, then the stay
    case 'landed': return frame.apollo!.landed && frame.t - frame.apollo!.landed.t > 120 ? 'onTheMoon' : 'lunarLanding';
    case 'ascent': return 'lunarLiftoff';
    case 'lmOrbit': return frame.apollo!.rendezvous && frame.apollo!.rendezvous.dh < 20 * 1852 && frame.apollo!.lunar && frame.apollo!.lunar.pe > 30e3 ? 'coelliptic' : 'lmInOrbit';
    case 'csi': return 'csiBurn';
    case 'cdh': return 'cdhBurn';
    case 'tpi': return 'tpiBurn';
    case 'lmMidcourse':
    case 'terminal': return 'terminalPhase';
    case 'braking': return 'rendezvousBraking';
    case 'stationkeeping': return 'lmStationkeeping';
    case 'redocked': return 'redocked';
    case 'csmOrbit': return 'lmJettison';
    case 'tei': return 'teiBurn';
    case 'transearth': return 'homewardCoast';
    case 'returnMidcourse': return 'returnMccBurn';
    case 'cmSeparated': return 'cmSeparation';
    case 'entry': return 'apolloEntry';
    case 'drogues': return 'apolloDrogues';
    case 'mains': return 'apolloMains';
    case 'splashdown': return 'apolloSplashdown';
    default: return 'translunarCoast';
  }
}

/**
 * C01: the days between the Earth and the Moon, by how long it is to the next
 * burn or milestone: 5,000× with hours to go, down to 10× for the last minute.
 */
function coastWarp(frame: VisualFrame): number {
  const next = frame.apollo?.next ?? 0;
  const tgo = next > frame.t ? next - frame.t : Infinity;
  return tgo > 5000 ? 5000 : tgo > 600 ? 1000 : tgo > 60 ? 100 : 10;
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
  if (a.kind === 'return' && a.capsule === 'vostok') {
    if (frame.status === 'landed' || a.phase === 'landed') return 'vostokLanding';
    if (a.phase === 'drogue') return 'vostokDrogue';
    if (a.phase === 'main') return 'vostokMain';
    // the burn's 40 s from the return's start, its first frame taken before the engine has run a step
    if ((a.motors.retro ?? 0) > 0 || frame.t - a.t0 < VOSTOK_CAPSULE.retro!.burn) return 'vostokRetro';
    return frame.altitude > CAPSULE_ARC_ALTITUDE ? 'vostokCoast' : 'vostokEntry';
  }
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
export function autoWarp(frame: VisualFrame | null, beat: WatchBeat, events: readonly SimEvent[] = []): number {
  if (!frame) return 1;
  const w = beatWarp(frame, beat, events);
  // A stage on its way home is worth watching whatever the rest of the
  // flight is doing: never faster than 5× while one flies, 2× once it is
  // back in the air.
  const home = returning(frame);
  return home.low ? Math.min(w, 2) : home.alive ? Math.min(w, 5) : w;
}

function beatWarp(frame: VisualFrame, beat: WatchBeat, events: readonly SimEvent[]): number {
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
    // C01: two and a half hours of parking orbit go by quickly, the last minute before the restart and
    // the burn at a pace to follow; the transposition's minutes slowly, the hour docked quickly
    case 'apolloParking': {
      const tli = frame.apollo?.tliTime;
      return tli !== undefined && tli - frame.t < 60 ? 5 : 100;
    }
    case 'tliBurn':
    case 'transposition':
      return 10;
    case 'apolloDocked':
      return 100;
    // the coast to the extraction as it was; after it, the days to the Moon by how far off the next burn is
    case 'translunarCoast':
      return frame.apollo && frame.apollo.phase !== 'translunar' ? coastWarp(frame) : 100;
    case 'lunarApproach':
    case 'lunarOrbit':
    case 'lmUndocked':
    case 'descentOrbit':
    case 'onTheMoon':
    case 'lmInOrbit':
    case 'coelliptic':
    case 'terminalPhase':
    case 'redocked':
    case 'lmJettison':
    case 'homewardCoast':
    case 'cmSeparation':
      return coastWarp(frame);
    // home: the burn for the Earth at 5×, the correction live; the entry's nine minutes at 2×, the drogues live,
    // the five minutes under the mains at 5×, the splash live
    case 'teiBurn':
    case 'apolloMains':
      return 5;
    case 'apolloEntry':
      return 2;
    case 'returnMccBurn':
    case 'apolloDrogues':
    case 'apolloSplashdown':
      return 1;
    // the seven minutes of the ascent, the thrusters' burns and the braking at 5×, the last metres to the docking live
    case 'lunarLiftoff':
    case 'csiBurn':
    case 'cdhBurn':
    case 'tpiBurn':
    case 'rendezvousBraking':
      return 5;
    // held 30 m off Columbia at 10×, the last metres in to the docking at 2×
    case 'lmStationkeeping': {
      const range = frame.apollo?.rendezvous?.range ?? Infinity;
      return range < STATIONKEEPING_M - 2 ? 2 : 10;
    }
    // the twelve minutes of the descent: the braking at 5×, the approach at 2×, Armstrong's landing and the
    // landing itself live
    case 'brakingPhase':
      return 5;
    case 'approachPhase':
      return 2;
    case 'doiBurn':
    case 'landingPhase':
    case 'lunarLanding':
      return 1;
    case 'evasiveBurn':
    case 'midcourseBurn':
      return 1;
    case 'lunarSoi':
      return 10;
    // the six minutes behind the Moon into lunar orbit at a pace to follow, the seventeen seconds rounding it off live
    case 'loiBurn':
      return 5;
    case 'circularizeBurn':
      return 1;
    // C01: Vostok's hour in orbit quickly, the last minute before the retro-fire and its 40 s at a pace to
    // follow; the ten minutes falling with the instrument module still on quickly, the entry and the parachutes
    // slower, the ejection and the landing live
    case 'vostokOrbit': {
      const at = deorbitAt(frame, events);
      return at !== null && at - frame.t < 60 ? 5 : 100;
    }
    case 'vostokRetro':
      return 5;
    case 'vostokCoast':
      return 20;
    case 'vostokSeparation':
      return 2;
    case 'vostokEntry':
      return frame.altitude > 30e3 ? 5 : 2;
    case 'vostokDrogue':
      return 2;
    case 'vostokMain':
      return frame.altitudeAGL > 400 ? 20 : frame.altitudeAGL > 80 ? 5 : 1;
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

/**
 * What the height and speed readouts show: over the ground, as a launch
 * broadcast does; C01: for Apollo on its way, the speed through space, and
 * from the Moon's sphere of influence on — as Mission Control's displays
 * switched there — the height above the Moon and the speed relative to it.
 */
export function watchReadout(frame: VisualFrame): { altitude: number; speed: number; moon: boolean } {
  const ap = frame.apollo;
  if (ap?.phase === 'landed') return { altitude: 0, speed: 0, moon: true };
  // C01: home, over the Earth and through its air: the height above the sea and the speed through the air
  if (ap?.phase === 'splashdown') return { altitude: 0, speed: 0, moon: false };
  if (ap && APOLLO_CM.includes(ap.phase)) return { altitude: frame.altitude, speed: frame.airspeed, moon: false };
  if (ap?.descent) {
    return { altitude: Math.max(0, ap.descent.alt), speed: Math.hypot(ap.descent.vh, ap.descent.vz), moon: true };
  }
  if (ap && APOLLO_AT_MOON.includes(ap.phase)) return { altitude: ap.moon.alt, speed: ap.moon.speed, moon: true };
  if (ap && ap.phase !== 'parking' && ap.phase !== 'tli') {
    return { altitude: frame.altitude, speed: Math.hypot(frame.v.x, frame.v.y, frame.v.z), moon: false };
  }
  return { altitude: frame.altitudeAGL, speed: groundSpeed(frame), moon: false };
}

/**
 * The flight is in orbit: a parking orbit or the final one. It is what the
 * viewer's missions are flown to (tests/watch-missions-flights.ts); it is NOT the
 * end of the flight — that is `missionOrbit` (audit 2026-09-27 A9).
 */
export function reachedOrbit(frame: VisualFrame | null, events: readonly SimEvent[]): boolean {
  if (!frame || frame.status === 'failed') return false;
  if (frame.status === 'orbit') return true;
  for (const e of events) {
    if (e.t > frame.t + 1e-6) break;
    if (e.key === 'evt.parkingOrbit' || e.key === 'evt.targetOrbit') return true;
  }
  return false;
}

/** The events that close an orbital flight: its orbital work is done, on the target or not. */
const FINAL_ORBIT = new Set(['evt.targetOrbit', 'evt.offTargetOrbit']);
const PARKING = new Set(['evt.parkingOrbit']);

/** The newest event of `keys` at or before the frame. */
function lastEvent(frame: VisualFrame, events: readonly SimEvent[], keys: ReadonlySet<string>): SimEvent | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.t <= frame.t + 1e-6 && keys.has(e.key)) return e;
  }
  return undefined;
}

/**
 * The flight has reached the orbit it was flown to, not merely a parking orbit
 * with burns still to fly (audit 2026-09-27 A9).
 *
 * Falcon 9 Bandwagon-1 reaches 200 × 588 km at T+07:59 and then coasts 46
 * minutes to the burn that raises it to 586 × 595 km; calling the first
 * "mission accomplished" put the end card and its 200 km over the rest of the
 * flight. The simulation says a flight's orbital work is done in one place
 * only (`reachTargetOrbit`): the status goes to 'orbit' and `evt.targetOrbit`
 * or `evt.offTargetOrbit` is logged. Nothing weaker will do — between a
 * cut-off and the plan for the next burn the stage tails off for a second or
 * two with nothing scheduled (`nextBurnTime` < 0, no `evt.burnScheduled` yet),
 * so "in orbit and no burn pending" would still end Bandwagon-1 at its parking
 * orbit. The same rule G07 follows for a flight to the station, which ends
 * docked rather than at its insertion.
 */
export function missionOrbit(frame: VisualFrame | null, events: readonly SimEvent[]): boolean {
  if (!frame || frame.status === 'failed') return false;
  // the status alone for a recording older than the events
  return frame.status === 'orbit' || !!lastEvent(frame, events, FINAL_ORBIT);
}

/**
 * The mission time of the retro-fire a spacecraft in orbit is waiting for
 * (C01: Vostok-1), from `evt.deorbitPlanned` at or before the frame; null
 * when none is to come.
 */
export function deorbitAt(frame: VisualFrame, events: readonly SimEvent[]): number | null {
  const e = lastEvent(frame, events, DEORBIT);
  const at = Number(e?.params?.t);
  return e && Number.isFinite(at) && at >= frame.t - 1 ? at : null;
}
const DEORBIT = new Set(['evt.deorbitPlanned']);

/** The parking orbit on screen, and the burn it is waiting for (audit 2026-09-27 A9). */
export interface ParkingMilestone {
  /** mission time of the insertion, s */
  t: number;
  /** periapsis and apoapsis heights, km */
  pe: number;
  ap: number;
  /** time to the next burn, s */
  tgo: number;
}

/**
 * The flight is coasting in a parking orbit with its next burn scheduled: a
 * milestone worth a word, not the end (audit 2026-09-27 A9). Null once that
 * burn lights, once the final orbit is reached, and for a flight to the
 * station, which reads its own plan out (G07).
 */
export function parkingMilestone(frame: VisualFrame | null, events: readonly SimEvent[]): ParkingMilestone | null {
  if (!frame || frame.status !== 'coast' || frame.rendezvous || frame.abort) return null;
  if (!(frame.nextBurnTime > frame.t)) return null;
  if (missionOrbit(frame, events)) return null;
  const parking = lastEvent(frame, events, PARKING);
  if (!parking) return null;
  const p = parking.params ?? {};
  return { t: parking.t, pe: Number(p.pe ?? frame.elements.periapsisAlt / 1000), ap: Number(p.ap ?? frame.elements.apoapsisAlt / 1000), tgo: frame.nextBurnTime - frame.t };
}

/** How a flight on screen ends. */
export type WatchEnding = 'orbit' | 'splashdown' | 'crewSafe' | 'docked' | 'failed';

/**
 * After the final orbit, how long the end card waits for the payload to
 * separate, s. `reachTargetOrbit` releases it 15 s later (plus a tail-off); a
 * payload that never comes free must not hold the card back for ever.
 */
const PAYLOAD_WAIT = 30;
/** Moments of an orbital flight the end card waits a few seconds after, as it does after a landing (A9). */
const SETTLE_AFTER = new Set([...FINAL_ORBIT, 'evt.payloadSep']);

/**
 * How the flight on screen has ended, if it has: in orbit, with a splashdown
 * (a suborbital ship flown home), or lost. The end card waits for every stage
 * flown home to be down and a few seconds more, so it does not cover a
 * landing; an orbital flight's for its final orbit, not its parking orbit, and
 * for its payload to come free (audit 2026-09-27 A9).
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
  // C01: Apollo ends in the Pacific, twenty seconds after the splash
  if (frame.apollo) {
    if (frame.status === 'failed') return 'failed';
    const at = frame.apollo.splash?.t;
    return frame.apollo.phase === 'splashdown' && at !== undefined && frame.t - at >= 20 ? 'splashdown' : null;
  }
  // G06: after an abort, the end is the crew down and a few seconds more
  if (frame.abort) {
    if (frame.status !== 'landed') return null;
    // C01: a capsule home as planned ends in a splashdown; Vostok-1's, with Gagarin down after it on his own parachutes
    const planned = frame.abort.kind === 'return';
    const keys = planned ? ['evt.capsuleSplashdown', 'evt.capsuleLanding', 'evt.pilotLanding'] : ['evt.escapeLanded'];
    const down = [...events].reverse().find((e) => keys.includes(e.key) && e.t <= frame.t + 1e-6);
    return down && frame.t - down.t >= RETURN_SETTLE ? (planned ? 'splashdown' : 'crewSafe') : null;
  }
  if (frame.status === 'failed' || (frame.status === 'landed' && frame.note === 'shipLost')) return 'failed';
  // C01: a spacecraft with a retro-fire to come is not at its end in orbit (Vostok-1)
  if (frame.status === 'orbit' && deorbitAt(frame, events) !== null) return null;
  const ending = frame.status === 'landed' ? 'splashdown' : missionOrbit(frame, events) ? 'orbit' : null;
  if (!ending || returning(frame).alive) return null;
  // A9: the payload coming free is the moment an orbital flight was for
  const done = ending === 'orbit' ? lastEvent(frame, events, FINAL_ORBIT) : undefined;
  if (done && !frame.payloadSeparated && frame.t - done.t < PAYLOAD_WAIT) return null;
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.t > frame.t + 1e-6) continue;
    if (frame.t - e.t > RETURN_SETTLE) break;
    if (RETURN_DOWN.has(e.key) || (ending === 'orbit' && SETTLE_AFTER.has(e.key))) return null;
  }
  return ending;
}

/** How a stage flown home came down, for the end card. */
export type RecoveryOutcome = 'zone' | 'ship' | 'tower' | 'landed' | 'lost';

/**
 * What an orbital flight's end card says, one line each: the orbit it ended
 * in, the payload, every stage flown home, and the docking when one was called
 * off (audit 2026-09-27 A9). Read from the events that closed each part of the
 * flight, so the card never repeats a parking orbit's numbers.
 */
export interface WatchSummary {
  /** the final orbit, heights km, inclination degrees; `at` is when it was reached */
  orbit: { pe: number; ap: number; inc: number; onTarget: boolean; at: number } | null;
  /** when the payload came free, or null when it has not */
  payloadAt: number | null;
  /** the spacecraft's catalogue id from `evt.payloadSep`, for its localized name */
  payloadId: string | null;
  /** each stage flown home, by its English name (the physics' label), in the order it left */
  recovery: { name: string; outcome: RecoveryOutcome; zone?: string }[];
  /** G07: the approach to the station was called off */
  dockingAborted: boolean;
}

const RECOVERY_EVENTS: Record<string, RecoveryOutcome> = {
  'evt.boosterLandedZone': 'zone', 'evt.boosterLandedShip': 'ship', 'evt.boosterCaught': 'tower', 'evt.boosterLanded': 'landed', 'evt.stageImpact': 'lost',
};

export function watchSummary(frame: VisualFrame, events: readonly SimEvent[]): WatchSummary {
  const now = events.filter((e) => e.t <= frame.t + 1e-6);
  const done = lastEvent(frame, events, FINAL_ORBIT);
  const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : null);
  let orbit: WatchSummary['orbit'] = null;
  if (done) {
    const p = done.params ?? {};
    // six-DOF: the apsides the verdict was reached on, unrounded
    const pe = num(p.peAltM) !== null ? num(p.peAltM)! / 1000 : num(p.pe);
    const ap = num(p.apAltM) !== null ? num(p.apAltM)! / 1000 : num(p.ap);
    if (pe !== null && ap !== null) orbit = { pe, ap, inc: num(p.inc) ?? frame.elements.i * 180 / Math.PI, onTarget: done.key === 'evt.targetOrbit', at: done.t };
  }
  if (!orbit && (frame.status === 'orbit' || frame.status === 'rendezvous') && frame.elements.e < 1) {
    orbit = {
      pe: frame.elements.periapsisAlt / 1000, ap: frame.elements.apoapsisAlt / 1000, inc: frame.elements.i * 180 / Math.PI,
      onTarget: frame.note !== 'orbitOffTarget', at: frame.t,
    };
  }
  const sep = now.find((e) => e.key === 'evt.payloadSep');
  // Each stage is matched to its own touchdown by name, in order: a Falcon
  // Heavy's two side boosters share one.
  const touchdowns = now.filter((e) => RECOVERY_EVENTS[e.key]);
  const recovery: WatchSummary['recovery'] = [];
  for (const d of frame.debris ?? []) {
    if (!d.recovery?.target || d.alive) continue;
    const i = touchdowns.findIndex((e) => e.params?.name === d.name);
    const e = i >= 0 ? touchdowns.splice(i, 1)[0] : undefined;
    const outcome: RecoveryOutcome = e ? RECOVERY_EVENTS[e.key] : d.outcome === 'landed' ? 'landed' : 'lost';
    const zone = typeof e?.params?.zone === 'string' ? e.params.zone : undefined;
    recovery.push(zone ? { name: d.name, outcome, zone } : { name: d.name, outcome });
  }
  return {
    orbit,
    payloadAt: sep ? sep.t : null,
    payloadId: typeof sep?.params?.satId === 'string' ? sep.params.satId : null,
    recovery,
    dockingAborted: frame.rendezvous?.phase === 'aborted',
  };
}
