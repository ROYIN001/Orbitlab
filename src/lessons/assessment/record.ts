/**
 * Fly the placement test's recorded flights (roadmap E03) and resample their
 * telemetry onto a fixed step. Used by tests/assessment.test.ts to write and
 * check `flights.json`; the app reads the file and never flies these.
 */
import { Simulation } from '../../physics/simulation';
import { DATASET_SPECS, resampleTelemetry, sig, type FlightData, type FlightDataset } from './flights';

export function recordDataset(id: string): FlightDataset {
  const spec = DATASET_SPECS[id];
  const sim = new Simulation(spec.cfg(), { headless: true });
  let guard = 0;
  while (sim.state.t < spec.until && !sim.done && sim.state.status !== 'landed' && guard++ < 2_000_000) sim.step(sim.suggestedDt());
  const { t, series } = resampleTelemetry(sim.telemetry, spec.until, spec.step, spec.series);
  const events = sim.chronologicalEvents.filter((e) => e.t >= 0 && e.t <= spec.until)
    .filter((e) => ['evt.maxQ', 'evt.meco', 'evt.stageSep', 'evt.boosterSep', 'evt.fairingSep', 'evt.seco', 'evt.engineOut', 'evt.abort', 'evt.abortCommand'].includes(e.key))
    .map((e): [number, string] => [sig(e.t), e.key]);
  return { t, series, events };
}

export function recordAll(): FlightData {
  const out: FlightData = {};
  for (const id of Object.keys(DATASET_SPECS)) out[id] = recordDataset(id);
  return out;
}
