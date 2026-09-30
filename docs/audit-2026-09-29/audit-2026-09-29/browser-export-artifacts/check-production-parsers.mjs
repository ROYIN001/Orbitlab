import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(here, '..', 'source-integrated');
const { build } = await import(pathToFileURL(path.join(source, 'node_modules/vite/dist/node/index.js')).href);
const built = await build({ configFile: false, root: source, logLevel: 'silent', build: {
  ssr: path.join(here, 'qa-production-entry.ts'), write: false, target: 'node22',
  rollupOptions: { output: { inlineDynamicImports: true } },
} });
const output = (Array.isArray(built) ? built[0] : built).output;
const chunk = output.find((entry) => entry.type === 'chunk' && entry.isEntry);
assert(chunk, 'Production parser bundle missing');
const bundle = path.join(here, 'qa-production-imports.mjs');
fs.writeFileSync(bundle, chunk.code);
const { parseFlightFile, flightFileText, drawDispersion, runSeed, vehicleById } = await import(pathToFileURL(bundle).href);
const name = 'falcon9-cape-2026-09-29-19-47.orbitlab-flight.json';
const ref = parseFlightFile(fs.readFileSync(path.join(here, name), 'utf8'));
assert(ref, 'Downloaded flight rejected by production parser');
const again = parseFlightFile(flightFileText(ref));
assert.deepEqual(again, ref, 'Roundtrip changed the accepted reference');
const mc = JSON.parse(fs.readFileSync(path.join(here, 'browser-monte-carlo-20.json'), 'utf8'));
assert.equal(mc.state, 'done'); assert.equal(mc.done, 20); assert.equal(mc.total, 20);
const [header, ...lines] = mc.csv.trim().split(/\r?\n/).map((row) => row.split(','));
const rows = lines.map((row) => Object.fromEntries(header.map((key, i) => [key, row[i]])));
assert.equal(rows.length, 20);
assert.deepEqual(rows.map((row) => Number(row.run)), Array.from({ length: 20 }, (_, i) => i));
assert.equal(new Set(rows.map((row) => row.law)).size, 1);
assert.equal(rows[0].law, 'standard');
const seeds = [], failures = [];
let dispersionValuesChecked = 0;
for (const row of rows) {
  const index = Number(row.run);
  seeds.push(runSeed(mc.seed, index));
  const draw = drawDispersion(vehicleById(mc.vehicleId), mc.dispersions, mc.seed, index);
  for (const value of draw.draws) {
    const key = value.key === 'wind' ? `wind_${value.axis}_ms` : value.key === 'density' ? 'density_pct' : `${value.element}_${value.key}_pct`;
    const setting = mc.dispersions[value.key];
    const expected = (setting.enabled ? setting.sigma * value.z : 0).toFixed(4);
    if (row[key] !== expected) failures.push({ index, key, expected, actual: row[key] });
    dispersionValuesChecked++;
  }
}
assert.equal(new Set(seeds).size, 20, 'Seed collision');
assert.deepEqual(failures, [], 'Browser CSV dispersions differ from seeded production draw');
const report = {
  flight: { file: name, productionParser: 'parseFlightFile (src/replay/reference.ts)', parsed: true, exactRoundTrip: true,
    label: ref.label, missionVehicle: ref.mission.mission.vehicleId, site: ref.mission.mission.siteId,
    launchJd: ref.launchJd, telemetrySamples: ref.telemetry.length, events: ref.events.length, pathPoints: ref.path.t.length,
    firstTime: ref.telemetry[0].t, maxTime: Math.max(...ref.telemetry.map((sample) => sample.t)), pathMaxTime: Math.max(...ref.path.t),
    allPathCoordinatesFinite: [...ref.path.x, ...ref.path.y, ...ref.path.z].every(Number.isFinite) },
  monteCarlo: { seed: mc.seed, law: rows[0].law, runs: rows.length, distinctIndices: new Set(rows.map((row) => row.run)).size,
    distinctRunSeeds: new Set(seeds).size, runSeeds: seeds, dispersionValuesChecked, exactFourDecimalDrawMatches: true,
    onTarget: rows.filter((row) => row.on_target === '1').length,
    outcomes: Object.fromEntries([...new Set(rows.map((row) => row.outcome))].map((outcome) => [outcome, rows.filter((row) => row.outcome === outcome).length])),
    summaryOnTarget: mc.laws[0].onTarget, summaryLost: mc.laws[0].lost,
    summaryMatchesCsv: mc.laws[0].onTarget === rows.filter((row) => row.on_target === '1').length && mc.laws[0].lost === rows.filter((row) => row.outcome === 'lost').length },
};
assert.equal(report.monteCarlo.summaryMatchesCsv, true);
fs.writeFileSync(path.join(here, 'production-parser-validation.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
