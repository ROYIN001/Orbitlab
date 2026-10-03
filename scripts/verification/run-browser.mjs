import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runJourneys } from '../../tests/browser/run.mjs';
import { selectShard } from '../../tests/browser/shard.mjs';
import { annotate, baseReport, DEFAULT_OUT, directoryManifest, finishReport, readJSON, same, sha256, writeJSON } from './lib.mjs';

const [id, planFile = `${DEFAULT_OUT}/plan.json`, buildFile = `${DEFAULT_OUT}/build.report.json`, out = DEFAULT_OUT] = process.argv.slice(2);
const plan = readJSON(planFile);
const gate = plan.gates.find(gate => gate.id === id && gate.kind === 'browser');
if (!gate) throw new Error(`Unknown browser gate ${id}`);
const report = baseReport(plan, id, 'browser');
report.suite = 'browser';
report.shard = gate.shard;
const reportFile = resolve(out, `${id}.report.json`);
writeJSON(reportFile, report);
const start = performance.now();
try {
  const build = readJSON(buildFile);
  if (!build.ok || build.state !== 'finished' || build.kind !== 'build' || build.planSha256 !== report.planSha256) throw new Error('Missing or failed build provenance');
  same(build.source, report.source, 'Build source');
  same(build.runtime, report.runtime, 'Build runtime');
  same(build.workflow, report.workflow, 'Build workflow');
  same(directoryManifest(resolve('dist')), build.dist, 'Downloaded build artifact');
  // Source snapshots in this checkout are committed. The actual browser data is the refreshed dist.
  report.artifactSnapshots = build.snapshots;
  report.dist = build.dist;
  const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
  const executable = process.env.CHROMIUM || chromium.executablePath();
  report.browserRuntime = { configuredExecutableSha256: sha256(readFileSync(executable)), playwright: report.runtime.playwright };
  const expected = selectShard(plan.suites.browser.names, gate.shard);
  const { results, ok } = await runJourneys({ smoke: plan.suites.browser.smoke, shard: gate.shard });
  report.journeys = results;
  if (results.some(result => typeof result.browserVersion !== 'string' || !result.browserVersion)) throw new Error('Missing actual launched browser version');
  report.browserRuntime.actualVersions = [...new Set(results.map(result => result.browserVersion))].sort();
  if (report.browserRuntime.actualVersions.length !== 1) throw new Error('Mixed Chromium versions within this shard');
  same(results.map(result => result.name), expected, 'Executed browser journeys');
  finishReport(report, start, ok ? 0 : 1, null);
  same(directoryManifest(resolve('dist')), build.dist, 'Build artifact changed during browser tests');
} catch (error) {
  finishReport(report, start, 1, null);
  report.errors = [String(error.stack ?? error)];
  annotate(error.message, id);
}
writeJSON(reportFile, report);
process.exitCode = report.ok ? 0 : 1;
