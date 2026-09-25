/**
 * Fly the placement test's recorded flights (roadmap E03) and resample their
 * telemetry onto a fixed step. Used by tests/assessment.test.ts to write and
 * check `flights.json`; the app reads the file and never flies these.
 */
import { Simulation } from '../../physics/simulation';
import { DATASET_SPECS, seriesValue, sig, type FlightData, type FlightDataset } from './flights';

export function recordDataset(id: string): FlightDataset {
  const spec = DATASET_SPECS[id];
  const sim = new Simulation(spec.cfg(), { headless: true });
  let guard = 0;
  while (sim.state.t < spec.until && !sim.done && sim.state.status !== 'landed' && guard++ < 2_000_000) sim.step(sim.suggestedDt());
  const tel = sim.telemetry.filter((s) => s.t >= 0);
  const t: number[] = [];
  const series: FlightDataset['series'] = {};
  for (const key of spec.series) series[key] = [];
  let j = 0;
  for (let time = 0; time <= Math.min(spec.until, tel[tel.length - 1].t) + 1e-9; time += spec.step) {
    while (j < tel.length - 2 && tel[j + 1].t < time) j++;
    const a = tel[j], b = tel[Math.min(j + 1, tel.length - 1)];
    const u = b.t > a.t ? Math.min(1, Math.max(0, (time - a.t) / (b.t - a.t))) : 0;
    t.push(sig(time));
    for (const key of spec.series) series[key]!.push(sig(seriesValue(a, key) + (seriesValue(b, key) - seriesValue(a, key)) * u));
  }
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
