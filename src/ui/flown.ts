/**
 * A historical flight set beside the real one (roadmap C01): the times its
 * events were flown at and the orbit it reached, matched to the events the
 * simulation raises, for the viewer's caption, the result tables and the
 * timeline. Pure: nothing here draws.
 *
 * The flown values themselves live with each mission (`WatchMission.flown`,
 * src/ui/watch-missions.ts), with their sources in docs/PHYSICS.md §13.
 */
import type { SimEvent } from '../physics/sim/types';

/** The simulation's events a flown one is matched to. */
export type FlownKey = 'evt.maxQ' | 'evt.ceco' | 'evt.mixtureShift' | 'evt.interstageSep' | 'evt.towerJettison' | 'evt.boosterSep' | 'evt.fairingSep' | 'evt.meco' | 'evt.stageCutoff' | 'evt.stageSep' | 'evt.seco'
  | 'evt.payloadSep' | 'evt.boosterLandedZone' | 'evt.boosterLandedShip' | 'evt.contact'
  | 'evt.ignition' | 'evt.tli' | 'evt.slaPanels' | 'evt.csmSeparation' | 'evt.csmDocked' | 'evt.lmExtraction'
  | 'evt.evasive' | 'evt.mcc' | 'evt.lunarSoi' | 'evt.loi' | 'evt.lunarOrbit' | 'evt.circularize'
  | 'evt.undocking' | 'evt.separationBurn' | 'evt.doi' | 'evt.pdi' | 'evt.throttleRecovery' | 'evt.highGate' | 'evt.lowGate'
  | 'evt.lunarLanding' | 'evt.lmEngineOff'
  | 'evt.lunarLiftoff' | 'evt.lmInsertion' | 'evt.csi' | 'evt.cdh' | 'evt.tpi' | 'evt.lmMcc' | 'evt.braking' | 'evt.stationkeeping' | 'evt.lmDocked' | 'evt.lmJettison' | 'evt.asSeparation'
  | 'evt.tei' | 'evt.transearth' | 'evt.transearthMcc' | 'evt.cmSmSeparation' | 'evt.entryInterface' | 'evt.drogues' | 'evt.cmSplashdown';

export interface FlownEvent {
  key: FlownKey;
  /** when it was flown, s after liftoff */
  t: number;
  /** which occurrence of `key` in the simulation (1 = the first) */
  n?: number;
  /** a planned, rounded or secondary value rather than a measured one */
  approx?: boolean;
}

export interface FlownOrbit {
  /** km */
  perigee: number;
  apogee: number;
  /** deg */
  inclination: number;
  approx?: boolean;
}

export interface FlownRecord {
  events: FlownEvent[];
  /** the orbit the payload was left in */
  orbit?: FlownOrbit;
}

/** Row labels: the timeline's own short names, and one for the docking. */
export const FLOWN_LABEL: Record<FlownKey, string> = {
  'evt.maxQ': 'tl.evt.maxQ',
  'evt.ceco': 'tl.evt.ceco',
  'evt.mixtureShift': 'tl.evt.mixtureShift',
  'evt.interstageSep': 'tl.evt.interstageSep',
  'evt.towerJettison': 'tl.evt.towerJettison',
  'evt.boosterSep': 'tl.evt.boosterSep',
  'evt.fairingSep': 'tl.evt.fairingSep',
  'evt.meco': 'tl.evt.meco',
  'evt.stageCutoff': 'tl.evt.stageCutoff',
  'evt.stageSep': 'tl.evt.stageSep',
  'evt.seco': 'tl.evt.seco',
  'evt.payloadSep': 'tl.evt.payloadSep',
  'evt.boosterLandedZone': 'tl.evt.boosterLandedZone',
  'evt.boosterLandedShip': 'tl.evt.boosterLandedShip',
  'evt.contact': 'flown.docked',
  'evt.ignition': 'tl.evt.ignition',
  'evt.tli': 'tl.evt.tli',
  'evt.slaPanels': 'tl.evt.slaPanels',
  'evt.csmSeparation': 'tl.evt.csmSeparation',
  'evt.csmDocked': 'tl.evt.csmDocked',
  'evt.lmExtraction': 'tl.evt.lmExtraction',
  'evt.evasive': 'tl.evt.evasive',
  'evt.mcc': 'tl.evt.mcc',
  'evt.lunarSoi': 'tl.evt.lunarSoi',
  'evt.loi': 'tl.evt.loi',
  'evt.lunarOrbit': 'tl.evt.lunarOrbit',
  'evt.circularize': 'tl.evt.circularize',
  'evt.undocking': 'tl.evt.undocking',
  'evt.separationBurn': 'tl.evt.separationBurn',
  'evt.doi': 'tl.evt.doi',
  'evt.pdi': 'tl.evt.pdi',
  'evt.throttleRecovery': 'tl.evt.throttleRecovery',
  'evt.highGate': 'tl.evt.highGate',
  'evt.lowGate': 'tl.evt.lowGate',
  'evt.lunarLanding': 'tl.evt.lunarLanding',
  'evt.lmEngineOff': 'tl.evt.lmEngineOff',
  'evt.lunarLiftoff': 'tl.evt.lunarLiftoff',
  'evt.lmInsertion': 'tl.evt.lmInsertion',
  'evt.csi': 'tl.evt.csi',
  'evt.cdh': 'tl.evt.cdh',
  'evt.tpi': 'tl.evt.tpi',
  'evt.lmMcc': 'tl.evt.lmMcc',
  'evt.braking': 'tl.evt.braking',
  'evt.stationkeeping': 'tl.evt.stationkeeping',
  'evt.lmDocked': 'tl.evt.lmDocked',
  'evt.lmJettison': 'tl.evt.lmJettison',
  'evt.asSeparation': 'tl.evt.asSeparation',
  'evt.tei': 'tl.evt.tei',
  'evt.transearth': 'tl.evt.transearth',
  'evt.transearthMcc': 'tl.evt.transearthMcc',
  'evt.cmSmSeparation': 'tl.evt.cmSmSeparation',
  'evt.entryInterface': 'tl.evt.entryInterface',
  'evt.drogues': 'tl.evt.drogues',
  'evt.cmSplashdown': 'tl.evt.cmSplashdown',
};

export interface FlownRow {
  key: FlownKey;
  n: number;
  real: number;
  approx: boolean;
  /** the simulation's time for it, s, or null if it has not happened (yet) */
  sim: number | null;
  /** sim − real, s */
  delta: number | null;
}

/** The nth occurrence of `key` in the simulation's events, or null. */
function nth(events: readonly SimEvent[], key: string, n: number): SimEvent | null {
  let seen = 0;
  for (const e of events) if (e.key === key && ++seen === n) return e;
  return null;
}

/** Each flown event beside the simulation's, in flown order. */
export function compareEvents(record: FlownRecord, events: readonly SimEvent[]): FlownRow[] {
  return [...record.events].sort((a, b) => a.t - b.t).map((f) => {
    const n = f.n ?? 1;
    const e = nth(events, f.key, n);
    return { key: f.key, n, real: f.t, approx: !!f.approx, sim: e ? e.t : null, delta: e ? e.t - f.t : null };
  });
}

/**
 * The orbit the simulation left its payload in: the last target orbit it
 * reported up to the payload's separation (the burns after it are the
 * spacecraft's own) or the suborbital arc it was cut off on, else the last
 * parking orbit. Before separation only a
 * target orbit counts — a parking orbit is a stop on the way, not where the
 * payload was left. km and degrees.
 */
export function simPayloadOrbit(events: readonly SimEvent[]): { perigee: number; apogee: number; inclination: number } | null {
  const sep = events.find((e) => e.key === 'evt.payloadSep')?.t;
  let target: SimEvent | null = null, parking: SimEvent | null = null;
  for (const e of events) {
    if (sep !== undefined && e.t > sep + 1e-6) break;
    if (!e.params) continue;
    // a suborbital flight's arc (C01: Mercury-Redstone 3) is judged at its cut-off, as an orbit is
    if (e.key === 'evt.targetOrbit' || e.key === 'evt.suborbitalTarget' || e.key === 'evt.suborbitalOffTarget') target = e;
    else if (e.key === 'evt.parkingOrbit') parking = e;
  }
  const best = target ?? (sep !== undefined ? parking : null);
  if (!best) return null;
  const p = best.params!;
  return { perigee: Number(p.pe), apogee: Number(p.ap), inclination: Number(p.inc) };
}

/**
 * The flown event the simulation has most recently matched, within `within`
 * seconds of mission time `t`: what the viewer's caption sets beside the
 * picture ("in the real flight: T+2:33").
 */
export function recentFlown(record: FlownRecord, events: readonly SimEvent[], t: number, within = 12): FlownRow | null {
  let best: FlownRow | null = null;
  for (const row of compareEvents(record, events)) {
    if (row.sim === null || row.sim > t || t - row.sim > within) continue;
    if (!best || row.sim > best.sim!) best = row;
  }
  return best;
}
