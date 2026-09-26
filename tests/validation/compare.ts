/**
 * Turns a flown mission and its reference into comparison rows.
 *
 * A row "agrees" when the model is inside the tolerance of `reference-data.ts`
 * and is labelled "gross" when it is more than `GROSS_FACTOR` tolerances away.
 * The tests pin the exact set of rows that disagree, so that a change to the
 * model, in either direction, shows up as a failure that has to be explained
 * in docs/VALIDATION.md.
 */
import type { FlownMission } from './flight-harness';
import { GROSS_FACTOR, TOLERANCE, type Falcon9Reference, type TimelineMilestone, type TimelineReference } from './reference-data';

export type Quantity = 'time' | 'speed' | 'altitude';

export interface Row {
  /** "<mission>/<milestone>/<quantity>", the key the disagreement lists use */
  key: string;
  quantity: Quantity;
  reference: number;
  /** NaN when the model never reached the milestone */
  model: number;
  tolerance: number;
  agrees: boolean;
  gross: boolean;
}

export function row(key: string, quantity: Quantity, reference: number, model: number | undefined): Row {
  const tolerance = TOLERANCE[quantity](reference);
  const m = model ?? Number.NaN;
  const err = Math.abs(m - reference);
  return {
    key, quantity, reference, model: m, tolerance,
    agrees: err <= tolerance,
    gross: !(err <= GROSS_FACTOR * tolerance),
  };
}

/** Every comparison a Falcon 9 webcast trace supports. */
export function falcon9Rows(ref: Falcon9Reference, flown: FlownMission): Row[] {
  const id = ref.id;
  const rows: Row[] = [];
  rows.push(row(`${id}/maxQ/time`, 'time', ref.maxQ, flown.eventTime('evt.maxQ')));
  for (const p of ref.trace) {
    const s = flown.at(p.t);
    rows.push(row(`${id}/T+${p.t}/altitude`, 'altitude', p.alt, s.alt));
    rows.push(row(`${id}/T+${p.t}/speed`, 'speed', p.v, s.vAir));
  }
  const meco = flown.eventTime('evt.meco');
  rows.push(row(`${id}/meco/time`, 'time', ref.meco, meco));
  const atMeco = meco === undefined ? undefined : flown.at(meco);
  rows.push(row(`${id}/meco/altitude`, 'altitude', ref.atMeco.alt, atMeco?.alt));
  rows.push(row(`${id}/meco/speed`, 'speed', ref.atMeco.v, atMeco?.vAir));
  if (ref.ses1 !== undefined) {
    // the second stage's ignition: the first `evt.ignition` after MECO
    rows.push(row(`${id}/ses1/time`, 'time', ref.ses1, flown.eventTimeAfter('evt.ignition', meco ?? 0)));
  }
  if (ref.seco1) {
    const seco = flown.eventTime('evt.seco');
    const s = seco === undefined ? undefined : flown.at(seco);
    rows.push(row(`${id}/seco1/time`, 'time', ref.seco1.t, seco));
    rows.push(row(`${id}/seco1/altitude`, 'altitude', ref.seco1.alt, s?.alt));
    rows.push(row(`${id}/seco1/speed`, 'speed', ref.seco1.v, s?.vAir));
  }
  return rows;
}

/** A table for a failure message or a probe: one line per row. */
export function formatRows(rows: readonly Row[]): string {
  const unit = (q: Quantity, x: number) => (q === 'altitude' ? `${(x / 1e3).toFixed(1)} km` : q === 'speed' ? `${x.toFixed(0)} m/s` : `${x.toFixed(1)} s`);
  return rows.map((r) => `${r.agrees ? 'ok  ' : r.gross ? 'GROSS' : 'diff'} ${r.key.padEnd(28)} ref ${unit(r.quantity, r.reference).padStart(10)}  model ${unit(r.quantity, r.model).padStart(10)}  ±${unit(r.quantity, r.tolerance)}`).join('\n');
}

/** The time of the milestone's event in a flown mission. */
export function milestoneTime(m: TimelineMilestone, flown: FlownMission): number | undefined {
  if (m.afterEvent) {
    const after = flown.eventTime(m.afterEvent);
    return after === undefined ? undefined : flown.eventTimeAfter(m.event, after);
  }
  return flown.events.filter((e) => e.key === m.event)[(m.nth ?? 1) - 1]?.t;
}

/** Graded rows for a published timeline: every time, every altitude, and the insertion apsides. */
export function timelineRows(ref: TimelineReference, flown: FlownMission): Row[] {
  const rows: Row[] = [];
  for (const m of ref.milestones) {
    const t = milestoneTime(m, flown);
    rows.push(row(`${ref.id}/${m.id}/time`, 'time', m.t, t));
    if (m.alt !== undefined) rows.push(row(`${ref.id}/${m.id}/altitude`, 'altitude', m.alt, t === undefined ? undefined : flown.at(t).alt));
    if (m.v !== undefined && m.vFrame === 'inertial') rows.push(row(`${ref.id}/${m.id}/speed`, 'speed', m.v, t === undefined ? undefined : flown.at(t).vInertial));
  }
  if (ref.insertion) {
    // The apsides the simulator announces at the end of the ascent.
    const e = flown.events.find((x) => x.key === 'evt.parkingOrbit' || x.key === 'evt.targetOrbit');
    const km = (k: string) => (typeof e?.params?.[k] === 'number' ? (e.params[k] as number) * 1e3 : undefined);
    rows.push(row(`${ref.id}/insertion/perigee`, 'altitude', ref.insertion.perigee, km('pe')));
    rows.push(row(`${ref.id}/insertion/apogee`, 'altitude', ref.insertion.apogee, km('ap')));
  }
  return rows;
}
