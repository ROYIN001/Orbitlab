/**
 * The numbers a lesson can grade (roadmap E03), each read from the recorded
 * flight: the simulation's state at its head, its telemetry and its event log.
 * DOM-free, so a test can grade a headless flight exactly as the page grades
 * the one on screen.
 */
import { MU_EARTH, RAD } from '../physics/constants';
import { wrapPi, type OrbitalElements } from '../physics/orbital';
import { norm } from '../physics/vec3';
import { physicalApsides } from '../physics/rigid/orbit-prediction';
import { satelliteById } from '../data/satellites';
import type { LessonFlight, MeasureId } from './types';
import { unitText } from './text';

export interface MeasureDef {
  /** the unit it is given in (a symbol, the same in every language) */
  unit: string;
  /**
   * `history`: a peak over the whole flight, so a bound on it can be broken
   * before the flight ends; `final`: read when the flight has ended.
   */
  over: 'history' | 'final';
  /** decimals to show */
  digits: number;
  /**
   * `at`: the mission time the flight ended for grading. A value that goes on
   * changing after it (the Δv left, once the payload separates and the
   * spacecraft's own is shown) is read there, so a flight graded long after
   * its insertion grades the same as one graded at it.
   */
  read(flight: LessonFlight, at?: number): number | null;
}

const finite = (v: number): number | null => (Number.isFinite(v) ? v : null);

/**
 * The orbit the flight is in. A six-DOF flight coasts under J2, so its apsides
 * are the lowest and highest altitude of the next revolution rather than the
 * osculating ellipse of one instant (as the fleet acceptance reads them).
 */
export function flightElements(flight: LessonFlight): OrbitalElements {
  const el = flight.state.elements;
  if (flight.cfg.dynamics?.model !== 'sixDof' || !(el.e < 1) || el.periapsisAlt < 120e3) return el;
  try {
    const apsides = physicalApsides({ r: flight.state.r, v: flight.state.v });
    return apsides ? { ...el, ...apsides } : el;
  } catch {
    return el;
  }
}

function peak(flight: LessonFlight, field: 'q' | 'gLoad'): number {
  let max = 0;
  for (const s of flight.telemetry) if (s.t >= 0 && s[field] > max) max = s[field];
  return max;
}

function firstEvent(flight: LessonFlight, keys: readonly string[]): number | null {
  let t: number | null = null;
  for (const e of flight.events) if (keys.includes(e.key) && (t === null || e.t < t)) t = e.t;
  return t;
}

export const MEASURES: Readonly<Record<MeasureId, MeasureDef>> = {
  'orbit.perigee': { unit: 'km', over: 'final', digits: 1, read: (f) => finite(flightElements(f).periapsisAlt / 1e3) },
  'orbit.apogee': { unit: 'km', over: 'final', digits: 1, read: (f) => finite(flightElements(f).apoapsisAlt / 1e3) },
  'orbit.inclination': { unit: '°', over: 'final', digits: 2, read: (f) => finite(flightElements(f).i * RAD) },
  'orbit.raanError': {
    unit: '°', over: 'final', digits: 2,
    read: (f) => {
      const target = f.plan.target.raan;
      return target === null ? null : finite(Math.abs(wrapPi(flightElements(f).raan - target)) * RAD);
    },
  },
  'orbit.period': {
    unit: 'min', over: 'final', digits: 1,
    read: (f) => {
      const a = flightElements(f).a;
      return a > 0 ? finite((2 * Math.PI * Math.sqrt(a ** 3 / MU_EARTH)) / 60) : null;
    },
  },
  'orbit.speed': { unit: 'km/s', over: 'final', digits: 2, read: (f) => finite(norm(f.state.v) / 1e3) },
  'orbit.eccentricity': { unit: '', over: 'final', digits: 4, read: (f) => finite(flightElements(f).e) },
  'orbit.semiMajorAxis': { unit: 'km', over: 'final', digits: 0, read: (f) => finite(flightElements(f).a / 1e3) },
  'maxQ': { unit: 'kPa', over: 'history', digits: 1, read: (f) => Math.max(f.state.maxQ.value, peak(f, 'q')) / 1e3 },
  'maxQTime': { unit: 's', over: 'final', digits: 0, read: (f) => (f.state.maxQ.value > 0 ? f.state.maxQ.t : null) },
  'maxG': { unit: 'g', over: 'history', digits: 2, read: (f) => peak(f, 'gLoad') },
  'dvLeft': {
    unit: 'm/s', over: 'final', digits: 0,
    read: (f, at) => {
      let last = null as (typeof f.telemetry)[number] | null;
      for (const s of f.telemetry) if (at === undefined || s.t <= at + 1e-6) last = s;
      return last ? finite(last.dvRemaining) : null;
    },
  },
  'payload': {
    unit: 'kg', over: 'final', digits: 0,
    read: (f) => f.cfg.payloadMassOverride ?? satelliteById(f.cfg.satelliteId).mass,
  },
  'insertionTime': { unit: 's', over: 'final', digits: 0, read: (f) => firstEvent(f, ['evt.seco', 'evt.parkingOrbit', 'evt.targetOrbit']) },
  'loss.gravity': { unit: 'm/s', over: 'final', digits: 0, read: (f) => finite(f.state.losses.gravity) },
  'loss.drag': { unit: 'm/s', over: 'final', digits: 0, read: (f) => finite(f.state.losses.drag) },
  'loss.steering': { unit: 'm/s', over: 'final', digits: 0, read: (f) => finite(f.state.losses.steering) },
  'burnDv': {
    // the orbital burns the sequencer planned after the ascent, as it announced them
    unit: 'm/s', over: 'final', digits: 0,
    read: (f) => {
      let sum = 0, any = false;
      for (const e of f.events) {
        if (e.key !== 'evt.burnComplete') continue;
        const scheduled = [...f.events].reverse().find((s) => s.key === 'evt.burnScheduled' && s.t <= e.t && s.params?.kind === e.params?.kind);
        const dv = Number(scheduled?.params?.dv);
        if (Number.isFinite(dv)) { sum += dv; any = true; }
      }
      return any ? sum : null;
    },
  },
  'abort.time': { unit: 's', over: 'final', digits: 1, read: (f) => firstEvent(f, ['evt.abort']) },
  'abort.maxG': {
    // the escape keeps its own peak; a frame-backed view may not carry it, and the telemetry does
    unit: 'g', over: 'final', digits: 1,
    read: (f) => {
      if (f.state.abort?.maxG) return f.state.abort.maxG;
      const t0 = firstEvent(f, ['evt.abort']);
      if (t0 === null) return null;
      let max = 0;
      for (const s of f.telemetry) if (s.t >= t0 && s.gLoad > max) max = s.gLoad;
      return max;
    },
  },
};

export const MEASURE_IDS = Object.keys(MEASURES) as MeasureId[];

/** The value a `target: 'mission'` bound stands for: what the mission's own target orbit asks for. */
export function missionTarget(flight: LessonFlight, measure: MeasureId): number | null {
  const t = flight.plan.target;
  switch (measure) {
    case 'orbit.perigee': return t.perigee / 1e3;
    case 'orbit.apogee': return t.apogee / 1e3;
    case 'orbit.inclination': return t.inclination * RAD;
    case 'orbit.raanError': return t.raan === null ? null : 0;
    case 'orbit.semiMajorAxis': return t.a / 1e3;
    default: return null;
  }
}

/** Shown with the measure's own number of decimals, and its unit as the interface language writes it. */
export function formatMeasure(measure: MeasureId, value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const def = MEASURES[measure];
  const text = value.toFixed(def.digits);
  return def.unit ? `${text} ${unitText(def.unit)}` : text;
}
