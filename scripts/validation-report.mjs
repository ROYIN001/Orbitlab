#!/usr/bin/env node
/** Node 22: node --experimental-strip-types scripts/validation-report.mjs [--out DIR] [--check-references] */
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildScientificReport, runnerOutcome } from '../src/validation/report.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
let output = resolve(root, 'tests/browser/artifacts/validation');
let checkReferences = false;
for (let index = 0; index < args.length; index++) {
  if (args[index] === '--out' && args[index + 1]) output = resolve(args[++index]);
  else if (args[index] === '--check-references') checkReferences = true;
  else if (args[index] === '--help') {
    console.log('Usage: node --experimental-strip-types scripts/validation-report.mjs [--out DIR] [--check-references]\nRuns selected existing regressions and fresh collectors with one worker. Reference misses remain visible; --check-references also makes them a failing exit status.');
    process.exit(0);
  } else throw new Error(`Unknown or incomplete argument: ${args[index]}`);
}
mkdirSync(output, { recursive: true });
const run = mkdtempSync(resolve(output, 'run-'));
const git = (...params) => execFileSync('git', params, { cwd: root, encoding: 'utf8' }).trim();
const sha256 = data => createHash('sha256').update(data).digest('hex');
function sourceSnapshot() {
  const paths = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' }).split('\0'))]
    .filter(path => /^(src\/|tests\/|scripts\/|package(?:-lock)?\.json$|tsconfig\.json$|vite.*config\.ts$)/.test(path))
    .filter(path => !path.startsWith(`${relative(root, output)}/`) && !path.startsWith('tests/browser/artifacts/'))
    .sort();
  const files = paths.map(path => ({ path, sha256: existsSync(resolve(root, path)) ? sha256(readFileSync(resolve(root, path))) : 'deleted' }));
  return { digest: sha256(JSON.stringify(files)), files };
}
const commit = git('rev-parse', 'HEAD');
const dirtyBefore = !!git('status', '--porcelain', '--untracked-files=normal');
const before = sourceSnapshot();
writeFileSync(resolve(run, 'source-manifest.json'), `${JSON.stringify(before, null, 2)}\n`);
const regressionFiles = [
  'tests/design-sizing.test.ts', 'tests/design-ratings.test.ts', 'tests/d06-satellite-model.test.ts',
  'tests/d06-satellite-templates.test.ts', 'tests/d06-satellite-launch.test.ts', 'tests/d06-build-orbit-handoff.test.ts',
];
const vitest = resolve(root, 'node_modules/vitest/vitest.mjs');
async function execute(name, params, expectedFiles) {
  const jsonPath = resolve(run, `${name}.json`);
  const parameters = [vitest, 'run', ...params, '--maxWorkers=1', '--reporter=json', `--outputFile=${jsonPath}`];
  const command = `node node_modules/vitest/vitest.mjs run ${params.join(' ')} --maxWorkers=1 --reporter=json --outputFile=${relative(root, jsonPath)}`;
  console.log(`Running ${name} with one worker…`);
  const log = createWriteStream(resolve(run, `${name}.log`));
  const child = spawn(process.execPath, parameters, { cwd: root, env: { ...process.env, ORBITLAB_AUDIT_DIR: run }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log, { end: false });
  child.stderr.pipe(log, { end: false });
  const exitCode = await new Promise((done, reject) => { child.on('error', reject); child.on('close', done); });
  await new Promise(done => log.end(done));
  const result = readJson(jsonPath);
  const outcome = runnerOutcome(result, exitCode, command, expectedFiles);
  console.log(`${name}: ${outcome.status}; ${outcome.passed} passed, ${outcome.failed} failed, ${outcome.skipped} skipped, ${outcome.todo} todo.`);
  return outcome;
}
function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}
const regression = await execute('regression', regressionFiles, regressionFiles.length);
// Continue collection after regression failures so a report can show their independent scientific outcome.
const collection = await execute('collection', ['--config', 'scripts/validation-vitest.config.ts'], 3);
const after = sourceSnapshot();
writeFileSync(resolve(run, 'source-manifest-after.json'), `${JSON.stringify(after, null, 2)}\n`);
const beforeHashes = new Map(before.files.map(file => [file.path, file.sha256]));
const afterHashes = new Map(after.files.map(file => [file.path, file.sha256]));
const changedSourceFiles = [...new Set([...beforeHashes.keys(), ...afterHashes.keys()])].filter(path => beforeHashes.get(path) !== afterHashes.get(path));
const report = buildScientificReport({
  generatedAt: new Date().toISOString(),
  provenance: {
    commit, workingTreeDirty: dirtyBefore || !!git('status', '--porcelain', '--untracked-files=normal'),
    sourceDigest: before.digest, sourceDigestAfter: after.digest,
    sourceStable: before.digest === after.digest && commit === git('rev-parse', 'HEAD'),
    changedSourceFiles,
    node: process.version, platform: `${process.platform}/${process.arch}`,
  },
  regression, collection, ratings: readJson(resolve(run, 'ratings-evidence.json')) ?? [],
  rocket: readJson(resolve(run, 'rocket/evidence.json')),
  satellite: readJson(resolve(run, 'satellite-evidence.json')),
});
// Preserve an explicit missing-artifact failure even when the runner exits successfully.
if (!report.observations.rocket || !report.observations.satellite) {
  if (report.collection.status === 'passed') report.collection.status = 'incomplete';
  for (const reference of report.references) { reference.status = 'inconclusive'; reference.reason = 'A required collector artifact is missing.'; }
  report.referenceSummary = { met: 0, missed: 0, inconclusive: report.references.length };
}
const json = `${JSON.stringify(report, null, 2)}\n`;
for (const dir of [run, output]) {
  writeFileSync(resolve(dir, 'validation-report.json'), json);
  writeFileSync(resolve(dir, 'validation-report.md'), renderMarkdown(report, dir === run ? '.' : relative(output, run)));
}
console.log(`Report: ${resolve(output, 'validation-report.md')}\nReferences: ${report.referenceSummary.met} met, ${report.referenceSummary.missed} missed, ${report.referenceSummary.inconclusive} inconclusive. Review: ${report.reviewStatus}.`);
if (regression.status !== 'passed' || report.collection.status !== 'passed' || !report.provenance.sourceStable || report.referenceSummary.inconclusive > 0 || (checkReferences && report.referenceSummary.missed > 0)) process.exitCode = 1;

function renderMarkdown(report, artifacts) {
  const p = report.provenance;
  const lines = [
    '# Scientific validation report', '',
    `Generated: ${report.generatedAt}. Review: **${report.reviewStatus}**.`, '',
    report.scope, '',
    `Source commit: \`${p.commit}\`. Uncommitted changes: **${p.workingTreeDirty ? 'yes' : 'no'}**. Source stable during run: **${p.sourceStable ? 'yes' : 'no'}**.`, '',
    `Source SHA-256: \`${p.sourceDigest}\`. Runtime: ${p.node}, ${p.platform}.`, '',
    `Raw runner output, source manifest and collector artifacts: [${artifacts}/](${artifacts}/).`, '',
    '## Execution and reference acceptance', '',
    `Regression runner: **${report.regression.status}**, ${report.regression.passed}/${report.regression.total} passed; ${report.regression.failed} failed, ${report.regression.skipped} skipped, ${report.regression.todo} todo.`, '',
    `Observation collection: **${report.collection.status}**, ${report.collection.passed}/${report.collection.total} completed assertions. This is not scientific acceptance.`, '',
    `Reference comparisons: **${report.referenceSummary.met} met / ${report.referenceSummary.missed} missed / ${report.referenceSummary.inconclusive} inconclusive**.`, '',
    '| Reference | Computed kg | Published kg | Error | Status |', '|---|---:|---:|---:|---|',
    ...report.references.map(row => `| ${row.id} | ${row.observed ?? '—'} | ${row.expected ?? '—'} | ${row.relativeError === null ? '—' : `${(100 * row.relativeError).toFixed(2)}%`} | ${row.status} |`), '',
    'Criterion is unchanged from tests/design-ratings.test.ts: abs(round(computed / published, 3) - 1) ≤ 0.25. Displayed error comes from the unrounded ratio; classification uses the rounded ratio required by the existing test. Each JSON row retains the orbit, convergence, bracket and source paths.', '',
    '## Assumptions', '', ...report.references[0].assumptions.map(text => `- ${text}`), '',
    ...observationMarkdown(report.observations),
    '## Known discrepancies and investigation', '',
    `Findings recorded ${report.discrepancyBaseline.date} at commit \`${report.discrepancyBaseline.commit}\`; inspect current observations before concluding they persist.`, '',
    ...report.discrepancies.flatMap(row => [`### ${row.id}`, '', row.description, '', ...(row.proposal ? [`Proposed investigation: ${row.proposal}`, ''] : []), `Sources: ${row.sources.map(source => `\`${source}\``).join(', ')}.`, '']),
    'Full sizing probes, the +500 m/s target-delivery result, fairing events, template budgets and both raw/corrected node errors are retained in validation-report.json under observations; they are not added to the eight published-reference comparisons.', '',
    '## Limits', '', ...report.limitations.map(text => `- ${text}`), '',
    '## Reproduction', '', '```sh', 'source /workspace/orbitlab-env/activate.sh # cloud instance; elsewhere use Node 22 and npm ci',
    'node --experimental-strip-types scripts/validation-report.mjs',
    '# Add --check-references to return a failing exit status for reference misses.', '```', '',
    `Regression command: \`${report.regression.command}\``, '', `Collection command: \`${report.collection.command}\``, '',
  ];
  return lines.join('\n');
}

function observationMarkdown({ rocket, satellite }) {
  const fixed = (value, decimals = 2) => Number.isFinite(value) ? value.toFixed(decimals) : '—';
  const lines = ['## Current diagnostic observations', ''];
  if (rocket?.sizing) {
    lines.push('These are insertion probes; reaching insertion does not establish target delivery.', '',
      '| Request | Extra Δv m/s | Fairing kg | Insertion reached | Best perigee km | Apogee km |',
      '|---|---:|---:|---|---:|---:|',
      ...rocket.sizing.map(row => `| ${row.payloadKg} kg / ${row.siteId} | ${row.variation.extraDvMps} | ${row.fairing?.mass ?? 0} | ${row.probe.reachesOrbit} | ${fixed(row.probe.bestPerigee / 1000)} | ${fixed(row.probe.apoapsis / 1000)} |`), '');
    if (rocket.fullMission) lines.push(`Full target-delivery trial (1 t / Kourou / +500 m/s / 500 × 500 km): **onTarget ${rocket.fullMission.mission.onTarget}**. Residuals are retained in the JSON artifact.`, '');
    const separation = rocket.fairingTimeline?.find(row => row.key === 'evt.stageSep');
    const release = rocket.fairingTimeline?.find(row => row.key === 'evt.fairingSep');
    if (separation && release) lines.push(`First stage separation: ${fixed(separation.t)} s; fairing release: ${fixed(release.t)} s; upper-stage carriage after first separation: ${fixed(release.t - separation.t)} s. This timeline does not isolate a delta-v penalty.`, '');
  }
  if (satellite?.budgets) lines.push('Template budgets use the recorded insertion/lifetime/disposal assumptions at JD 2461314.5 and moderate activity; a negative margin is a shortfall.', '',
    '| Template | Available Δv m/s | Required Δv m/s | Margin m/s |', '|---|---:|---:|---:|',
    ...satellite.budgets.map(row => `| ${row.template} | ${fixed(row.outputs.dv.available.value)} | ${fixed(row.outputs.dv.required.value)} | ${fixed(row.outputs.dv.margin.value)} |`), '');
  if (satellite?.flights) lines.push('The existing launch regression bounds node error after correcting the equation of time. Raw design-node preservation is a separate observation.', '',
    '| Template | Raw node error ° | Corrected residual ° | Perigee error km | Apogee error km |', '|---|---:|---:|---:|---:|',
    ...satellite.flights.map(row => `| ${row.template} | ${fixed(row.outputs.errors.uncorrectedNodeDegrees, 3)} | ${fixed(row.outputs.errors.correctedNodeResidualDegrees, 3)} | ${fixed(row.outputs.errors.perigeeKm, 3)} | ${fixed(row.outputs.errors.apogeeKm, 3)} |`), '');
  return lines;
}
