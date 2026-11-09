/**
 * The educational satellite's energy through a few orbits of sunlight and
 * shadow: its battery's charge, minute by minute, and when the loads cannot
 * all be powered — a time-stepped version of the steady-state sizing
 * Orbitlab's satellite builder does (SMAD's, src/orbit/power.ts), with the
 * same figures, so the two agree.
 *
 * The scenario, for learning (all of it said on screen):
 * - a circular orbit of `altitude` at sun angle β, its period and shadow from
 *   src/orbit/eclipse.ts (`circularPeriod`, `eclipseDuration`); the orbit
 *   starts as the satellite comes out of the shadow;
 * - in sunlight the panels give S·A·η·I_d / π: the satellite turns slowly
 *   about its long axis, square to the Sun, so on average 1/π of its cells'
 *   area faces the Sun (Orbitlab's `MOUNT_FACTOR.spinner`); nothing in the
 *   shadow;
 * - the panels' power reaches the loads through the regulator (X_d), and
 *   what the loads do not use charges the battery; through the shadow the
 *   battery gives it back. Battery in and out together lose what SMAD's two
 *   path efficiencies differ by (X_e = X_d · η_charge · η_BAT), with η_BAT the
 *   battery-to-load efficiency: so an orbit balances exactly at the array
 *   power `arrayPowerRequired` asks for, and a battery of
 *   `batteryCapacity` reaches its depth of discharge exactly at the end of
 *   the shadow (tests/structure-power.test.ts);
 * - the battery starts full; it holds at most its capacity (more is not
 *   stored: the regulator sheds it) and gives nothing below its allowed depth
 *   of discharge. When the loads need more than the panels give and the
 *   battery is at that floor, the loads are not powered: a shortfall, with
 *   its start, end and energy.
 *
 * Exact: the loads and the panels' power are constant between known
 * instants (sunrise, sunset, a load switching), so the charge is integrated
 * piece by piece in closed form, split where it reaches full or its floor.
 *
 * What it is not: no temperatures, no change of attitude while a camera
 * points, no battery ageing, no voltage, no real mission life. DOM-free; SI
 * inside (s, W), energies reported in Wh.
 */
import { BATTERY_TO_LOAD_EFFICIENCY, INHERENT_DEGRADATION, MOUNT_FACTOR, PATH_EFFICIENCY, SOLAR_FLUX_1AU } from '../orbit/power';
import { circularPeriod, eclipseDuration } from '../orbit/eclipse';
import type { EduLoad } from './edusat';

export interface PowerScenario {
  /** circular orbit's altitude, m */
  altitude: number;
  /** sun angle β, rad (0: the longest shadow) */
  beta: number;
  /** how many orbits to follow */
  orbits: number;
  /** solar flux, W/m² */
  flux: number;
  /** the cells' efficiency, inherent degradation, and the mount's factor (π: a spinner) */
  cellEff: number;
  Id: number;
  mountFactor: number;
  /** regulator path efficiencies by day and through the battery (SMAD X_d, X_e), and battery-to-load η_BAT */
  Xd: number;
  Xe: number;
  batteryEff: number;
  /** charge at the start, 0–1 of capacity */
  startCharge: number;
  /** the depth of discharge allowed, 0–1: the battery gives nothing below 1 − dod */
  dod: number;
}

/** The scenario the section uses: 500 km, β = 0 (the longest shadow at that height), three orbits, Orbitlab's sourced defaults. */
export const EDU_SCENARIO: PowerScenario = Object.freeze({
  altitude: 500e3,
  beta: 0,
  orbits: 3,
  flux: SOLAR_FLUX_1AU,
  cellEff: 0.295,
  Id: INHERENT_DEGRADATION,
  mountFactor: MOUNT_FACTOR.spinner,
  Xd: PATH_EFFICIENCY.PPT.Xd,
  Xe: PATH_EFFICIENCY.PPT.Xe,
  batteryEff: BATTERY_TO_LOAD_EFFICIENCY,
  startCharge: 1,
  dod: 0.3,
});

export interface PowerInput {
  /** the solar cells' total area, m² */
  cellArea: number;
  /** the battery's capacity, Wh */
  batteryWh: number;
  loads: readonly EduLoad[];
}

/** One stretch with constant power: the panels' power at the bus and the loads' demand, W. */
export interface PowerSegment { t0: number; t1: number; sunlit: boolean; supply: number; demand: number }

export interface ChargePoint {
  /** s from the start */
  t: number;
  /** battery charge, Wh */
  charge: number;
}

export interface Shortfall {
  /** s from the start */
  start: number;
  end: number;
  /** the loads' energy not delivered, Wh */
  unmetWh: number;
}

export interface PowerResult {
  /** orbit period, shadow and sunlight per orbit, s */
  period: number;
  eclipse: number;
  daylight: number;
  /** the panels' output in sunlight, W, and what of it reaches the bus (× X_d) */
  arrayPower: number;
  busPower: number;
  /** the battery: capacity, the floor it gives nothing below, Wh */
  capacityWh: number;
  floorWh: number;
  /** η into the battery, η out of it (η_BAT) */
  chargeEff: number;
  dischargeEff: number;
  segments: readonly PowerSegment[];
  /** the charge at each segment's ends and wherever it reaches full or its floor */
  curve: readonly ChargePoint[];
  minChargeWh: number;
  finalChargeWh: number;
  shortfalls: readonly Shortfall[];
  /** energy the panels could have given that the full battery could not take, Wh */
  shedWh: number;
  /** per orbit: the panels' energy at the bus and the loads' energy, Wh */
  perOrbit: { supplyWh: number; demandWh: number; sunlitDemandWh: number; eclipseDemandWh: number };
  /** the steady state the builder's SMAD sizing works from: averages by day and in shadow, W */
  dayLoad: number;
  eclipseLoad: number;
}

const HOUR = 3600;

/** The panels' output in sunlight, W: S·A·η·I_d over the mount's factor. */
export function arrayPower(s: PowerScenario, cellArea: number): number {
  return (s.flux * cellArea * s.cellEff * s.Id) / s.mountFactor;
}

/** The switching instants of one load in one orbit (s from sunrise), as on/off intervals. */
function loadIntervals(load: EduLoad, daylight: number, period: number): [number, number][] {
  if (load.window === 'always') return [[0, period]];
  const [from, to] = load.window === 'sunlit' ? [0, daylight] : [daylight, period];
  const start = from + (load.start ?? 0) * 60;
  const end = load.minutes === undefined ? to : start + load.minutes * 60;
  if (start < from || end > to || end < start) throw new RangeError(`load ${load.id} does not fit its ${load.window} window`);
  return [[start, end]];
}

/** The scenario's orbit cut into stretches of constant supply and demand, for `orbits` orbits. */
export function powerSegments(s: PowerScenario, input: PowerInput): { segments: PowerSegment[]; period: number; eclipse: number; daylight: number } {
  const period = circularPeriod(s.altitude);
  const eclipse = eclipseDuration(s.altitude, s.beta);
  const daylight = period - eclipse;
  const bus = arrayPower(s, input.cellArea) * s.Xd;
  const intervals = input.loads.map((l) => ({ watts: l.watts, on: loadIntervals(l, daylight, period) }));
  const cuts = new Set<number>([0, daylight, period]);
  for (const l of intervals) for (const [a, b] of l.on) { cuts.add(a); cuts.add(b); }
  const edges = [...cuts].filter((t) => t >= 0 && t <= period).sort((a, b) => a - b);
  const segments: PowerSegment[] = [];
  for (let k = 0; k < s.orbits; k++) {
    for (let i = 0; i + 1 < edges.length; i++) {
      const [a, b] = [edges[i], edges[i + 1]];
      if (b - a <= 1e-9) continue;
      const mid = (a + b) / 2;
      const sunlit = mid < daylight;
      const demand = intervals.reduce((sum, l) => sum + (l.on.some(([x, y]) => mid >= x && mid < y) ? l.watts : 0), 0);
      segments.push({ t0: k * period + a, t1: k * period + b, sunlit, supply: sunlit ? bus : 0, demand });
    }
  }
  return { segments, period, eclipse, daylight };
}

/**
 * Follow the battery through the scenario's orbits. Throws a `RangeError` for
 * a scenario or input outside physical bounds (a negative load, an
 * efficiency outside (0, 1], a depth of discharge outside (0, 1]).
 */
export function simulatePower(s: PowerScenario, input: PowerInput): PowerResult {
  const unit = (x: number) => x > 0 && x <= 1;
  if (!unit(s.cellEff) || !unit(s.Id) || !unit(s.Xd) || !unit(s.Xe) || !unit(s.batteryEff) || !unit(s.dod)) throw new RangeError('efficiencies and the depth of discharge must be in (0, 1]');
  if (!(s.Xe <= s.Xd * s.batteryEff)) throw new RangeError('X_e cannot exceed X_d · η_BAT: the battery would make energy');
  if (!(s.startCharge >= 0 && s.startCharge <= 1)) throw new RangeError('the start charge must be in [0, 1]');
  if (!(input.cellArea >= 0) || !(input.batteryWh > 0)) throw new RangeError('the cell area must be 0 or more and the battery more than 0 Wh');
  if (input.loads.some((l) => !(l.watts >= 0))) throw new RangeError('a load must be 0 W or more');
  if (!(Number.isInteger(s.orbits) && s.orbits >= 1)) throw new RangeError('orbits must be a whole number from 1');
  const { segments, period, eclipse, daylight } = powerSegments(s, input);
  const chargeEff = s.Xe / (s.Xd * s.batteryEff);
  const dischargeEff = s.batteryEff;
  const capacity = input.batteryWh * HOUR; // J
  const floor = capacity * (1 - s.dod);
  let e = capacity * s.startCharge;
  let min = e;
  let shed = 0;
  const curve: ChargePoint[] = [{ t: 0, charge: e / HOUR }];
  const shortfalls: Shortfall[] = [];
  let open: Shortfall | null = null;
  const closeShortfall = (t: number) => { if (open) { open.end = t; shortfalls.push(open); open = null; } };
  for (const seg of segments) {
    let t = seg.t0;
    const net = seg.supply - seg.demand; // W at the bus
    // the battery's own rate, W: charging is net × η_charge, discharging is net / η_BAT
    const rate = net >= 0 ? net * chargeEff : net / dischargeEff;
    while (t < seg.t1 - 1e-9) {
      if (rate > 0) {
        closeShortfall(t);
        if (e >= capacity - 1e-9) { shed += net * (seg.t1 - t); t = seg.t1; break; }
        const tFull = t + (capacity - e) / rate;
        if (tFull >= seg.t1) { e += rate * (seg.t1 - t); t = seg.t1; }
        else { e = capacity; t = tFull; curve.push({ t, charge: e / HOUR }); }
      } else if (rate < 0) {
        if (e <= floor + 1e-9) {
          // at the floor: the panels give what they can, the rest is not delivered
          if (!open) open = { start: t, end: t, unmetWh: 0 };
          open.unmetWh += ((seg.demand - seg.supply) * (seg.t1 - t)) / HOUR;
          t = seg.t1;
          break;
        }
        closeShortfall(t);
        const tFloor = t + (e - floor) / -rate;
        if (tFloor >= seg.t1) { e += rate * (seg.t1 - t); t = seg.t1; }
        else { e = floor; t = tFloor; curve.push({ t, charge: e / HOUR }); }
      } else {
        closeShortfall(t);
        t = seg.t1;
      }
    }
    min = Math.min(min, e);
    curve.push({ t: seg.t1, charge: e / HOUR });
  }
  const end = segments.length ? segments[segments.length - 1].t1 : 0;
  closeShortfall(end);
  const orbit = segments.filter((g) => g.t1 <= period + 1e-6);
  const energy = (pick: (g: PowerSegment) => number, only?: (g: PowerSegment) => boolean) =>
    orbit.filter((g) => !only || only(g)).reduce((sum, g) => sum + (pick(g) * (g.t1 - g.t0)) / HOUR, 0);
  const sunlitDemandWh = energy((g) => g.demand, (g) => g.sunlit);
  const eclipseDemandWh = energy((g) => g.demand, (g) => !g.sunlit);
  const array = arrayPower(s, input.cellArea);
  return {
    period, eclipse, daylight,
    arrayPower: array, busPower: array * s.Xd,
    capacityWh: capacity / HOUR, floorWh: floor / HOUR, chargeEff, dischargeEff,
    segments, curve, minChargeWh: min / HOUR, finalChargeWh: e / HOUR, shortfalls, shedWh: shed / HOUR,
    perOrbit: { supplyWh: energy((g) => g.supply), demandWh: sunlitDemandWh + eclipseDemandWh, sunlitDemandWh, eclipseDemandWh },
    dayLoad: daylight > 0 ? (sunlitDemandWh * HOUR) / daylight : 0,
    eclipseLoad: eclipse > 0 ? (eclipseDemandWh * HOUR) / eclipse : 0,
  };
}

/** The charge at time `t`, Wh, read off the curve (straight between its points). */
export function chargeAt(result: Pick<PowerResult, 'curve'>, t: number): number {
  const c = result.curve;
  if (!c.length) return 0;
  if (t <= c[0].t) return c[0].charge;
  for (let i = 1; i < c.length; i++) {
    if (t <= c[i].t) {
      const span = c[i].t - c[i - 1].t;
      return span > 0 ? c[i - 1].charge + ((c[i].charge - c[i - 1].charge) * (t - c[i - 1].t)) / span : c[i].charge;
    }
  }
  return c[c.length - 1].charge;
}
