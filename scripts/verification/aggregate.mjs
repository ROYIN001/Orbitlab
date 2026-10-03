import { appendFileSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { selectShard } from '../../tests/browser/shard.mjs';
import { annotate, assertionKey, DEFAULT_OUT, notice, readJSON, runtime, same, sha256, sourceIdentity, walk, workflow, writeJSON } from './lib.mjs';

// Metadata only: this never changes union acceptance, coverage, or the stored evidence.
export function verificationMetadata(plan, result, reports = []) {
  reports = Array.isArray(reports) ? reports.filter(report => report && typeof report === 'object') : [];
  const gates = Array.isArray(plan?.gates) ? plan.gates.filter(gate => gate && typeof gate === 'object') : [];
  const equal = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);
  const hash = (value, lengths = [64]) => typeof value === 'string' && lengths.includes(value.length) && /^[a-f\d]+$/i.test(value) ? value : null;
  const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
  const completed = report => report?.state === 'finished' && report.finishedAt && Number.isFinite(report.elapsedMs) && report.elapsedMs >= 0 && !report.signal;
  const identity = report => {
    const gate = gates.find(gate => gate.id === report.id);
    return plan?.schema === 1 && gate && report.schema === 1 && report.kind === gate.kind
      && reports.filter(other => other.id === report.id).length === 1
      && report.planSha256 === sha256(JSON.stringify(plan))
      && equal(report.source, plan.source) && equal(report.runtime, plan.runtime) && equal(report.workflow, plan.workflow);
  };
  const refreshed = reports.find(report => report.id === 'snapshot-check');
  const build = reports.find(report => report.id === 'build');
  const validBuild = build && identity(build) && completed(build) && build.ok === true && build.exit === 0
    && hash(build.dist?.sha256) && Array.isArray(build.dist.files) && build.dist.files.some(file => file?.file === 'index.html') && build.dist.files.some(file => file?.file === 'sw.js')
    && (plan.mode === 'pages'
      ? refreshed && identity(refreshed) && completed(refreshed) && refreshed.ok === true && refreshed.exit === 0 && equal(build.snapshots, refreshed.snapshots)
      : equal(build.snapshots, plan.snapshots));
  const browserReports = reports.filter(report => {
    if (report.kind !== 'browser' || !validBuild || !identity(report) || !completed(report) || ![0, 1].includes(report.exit)) return false;
    const gate = gates.find(gate => gate.id === report.id);
    const versions = report.browserRuntime?.actualVersions;
    let selected;
    try { selected = selectShard(plan.suites.browser.names, gate.shard); }
    catch { return false; }
    return report.shard === gate.shard && equal(report.snapshots, plan.snapshots)
      && equal(report.dist, build.dist) && equal(report.artifactSnapshots, build.snapshots)
      && hash(report.browserRuntime?.configuredExecutableSha256) && Array.isArray(versions) && versions.length === 1
      && typeof versions[0] === 'string' && versions[0].length <= 64 && /^\d+(?:\.\d+)+$/.test(versions[0])
      && Array.isArray(report.journeys) && report.journeys.length > 0
      && report.journeys.every(journey => journey?.browserVersion === versions[0])
      && equal(report.journeys.map(journey => journey.name), selected);
  });
  const suites = {};
  for (const suite of ['unit', 'heavy', 'sixdof-fleet', 'browser']) {
    const coverage = result.coverage?.[suite];
    if (!coverage) continue;
    suites[suite] = {
      expected: count(coverage.expected), unique: count(coverage.unique),
      missing: count(coverage.missing?.length), unexpected: count(coverage.unexpected?.length), duplicate: count(coverage.duplicates?.length),
      nonpassing: suite === 'browser'
        ? reports.filter(report => gates.some(gate => gate.id === report.id && gate.kind === 'browser'))
          .reduce((total, report) => total + (Array.isArray(report.journeys) ? report.journeys : [])
            .filter(journey => !Array.isArray(journey?.failures) || journey.failures.length > 0 || !Number.isFinite(journey.seconds)).length, 0)
        : count(coverage.failed?.length),
    };
  }
  return {
    ok: result.ok === true,
    sourceCommit: hash(plan?.source?.commit, [40, 64]), sourceSha256: hash(plan?.source?.sha256),
    suites, actualBrowserVersions: [...new Set(browserReports.flatMap(report => report.browserRuntime.actualVersions))].sort().slice(0, 8),
    distSha256: validBuild ? build.dist.sha256 : null,
  };
}

export function verifyUnion(plan, reports, jobResults = {}) {
  const issues = [];
  const add = (id, message) => issues.push({ id, message });
  const check = (actual, expected, id, label) => { try { same(actual, expected, label); } catch (error) { add(id, error.message); } };
  if (plan.schema !== 1 || !plan.gates?.length || !plan.suites) add('plan', 'Invalid or empty verification plan');
  for (const [job, result] of Object.entries(jobResults)) {
    const unusedScientificSuite = ['heavy', 'sixdof-fleet'].includes(job) && !plan.suites[job];
    if (result !== 'success' && !(result === 'skipped' && unusedScientificSuite)) add(job, `Required workflow job ${result}`);
  }
  const seenReports = new Set();
  const bySuite = {};
  const browsers = [];
  const build = reports.find(report => report.id === 'build');
  const refreshed = reports.find(report => report.id === 'snapshot-check');
  for (const report of reports) {
    const gate = plan.gates.find(gate => gate.id === report.id);
    if (!gate) { add(report.id, 'Unexpected gate report'); continue; }
    if (seenReports.has(report.id)) add(report.id, 'Duplicate gate report');
    seenReports.add(report.id);
    if (report.schema !== 1 || report.kind !== gate.kind || report.planSha256 !== sha256(JSON.stringify(plan))) add(report.id, 'Wrong schema, kind or plan identity');
    if (!report.ok || report.state !== 'finished' || report.exit !== 0 || report.signal || !report.finishedAt || !Number.isFinite(report.elapsedMs) || report.elapsedMs < 0) add(report.id, 'Failed, skipped, interrupted or incomplete gate');
    check(report.source, plan.source, report.id, 'Source');
    check(report.runtime, plan.runtime, report.id, 'Runtime');
    check(report.workflow, plan.workflow, report.id, 'Workflow');
    if (gate.kind === 'vitest') {
      if (report.suite !== gate.suite || report.shard !== (gate.shard ?? null) || report.assignedFile !== (gate.file ?? null)) add(report.id, 'Wrong suite/shard/file assignment');
      check(report.snapshots, plan.snapshots, report.id, 'Committed snapshots');
      const inventory = plan.suites[gate.suite];
      if (!report.assertions?.length || !report.files?.length || report.counts?.total !== report.assertions?.length || report.counts?.passed !== report.counts?.total || report.counts?.failed !== 0 || report.counts?.pending !== 0 || !report.rawSha256 || !report.workerRuntime?.length) add(report.id, 'Missing or incomplete assertions/runtime/raw results');
      if (report.workerRuntime?.some(worker => ['node', 'v8', 'platform', 'arch'].some(key => worker[key] !== report.runtime[key]))) add(report.id, 'Mixed worker runtime');
      if (gate.file && (report.files?.length !== 1 || report.files[0] !== gate.file)) add(report.id, 'Wrong file executed');
      if (report.files?.some(file => !inventory.files.includes(file))) add(report.id, 'Unexpected test file');
      (bySuite[gate.suite] ??= []).push(report);
    } else if (gate.kind === 'browser') {
      if (report.shard !== gate.shard) add(report.id, 'Wrong browser shard');
      check(report.journeys?.map(journey => journey.name), selectShard(plan.suites.browser.names, gate.shard), report.id, 'Browser selection');
      if (!report.journeys?.length || report.journeys.some(journey => !Array.isArray(journey.failures) || journey.failures.length || !Number.isFinite(journey.seconds))) add(report.id, 'Failed or incomplete browser journeys');
      if (!report.browserRuntime?.configuredExecutableSha256 || report.browserRuntime?.actualVersions?.length !== 1 || report.journeys?.some(journey => journey.browserVersion !== report.browserRuntime.actualVersions[0])) add(report.id, 'Missing or mixed Chromium executable/version identity');
      check(report.dist, build?.dist, report.id, 'Exact build artifact');
      check(report.artifactSnapshots, build?.snapshots, report.id, 'Artifact snapshots');
      check(report.snapshots, plan.snapshots, report.id, 'Browser checkout snapshots');
      browsers.push(report);
    }
  }
  for (const gate of plan.gates) if (!seenReports.has(gate.id)) add(gate.id, 'Missing required gate report');
  if (['ci', 'pages'].includes(plan.mode)) {
    if (!build?.dist?.files?.length || !build.dist.files.some(file => file.file === 'index.html') || !build.dist.files.some(file => file.file === 'sw.js')) add('build', 'Missing or incomplete build artifact identity');
    if (plan.mode === 'pages') check(build?.snapshots, refreshed?.snapshots, 'snapshot-check', 'Validated refreshed snapshots');
    else check(build?.snapshots, plan.snapshots, 'build', 'Committed build snapshots');
    check(reports.find(report => report.id === 'typecheck')?.snapshots, plan.snapshots, 'typecheck', 'Typecheck snapshots');
    if (new Set(browsers.map(report => JSON.stringify(report.browserRuntime))).size !== 1) add('browser', 'Missing or mixed Chromium runtime');
  }
  const coverage = {};
  for (const [suite, inventory] of Object.entries(plan.suites)) {
    const suiteReports = suite === 'browser' ? browsers : (bySuite[suite] ?? []);
    const expected = suite === 'browser' ? inventory.names : inventory.assertions.map(assertionKey);
    const actual = suite === 'browser' ? suiteReports.flatMap(report => (report.journeys ?? []).map(journey => journey.name)) : suiteReports.flatMap(report => (report.assertions ?? []).map(assertionKey));
    const keys = new Set(actual);
    const expectedKeys = new Set(expected);
    const missing = expected.filter(key => !keys.has(key));
    const unexpected = actual.filter(key => !expectedKeys.has(key));
    const duplicates = actual.filter((key, index) => actual.indexOf(key) !== index);
    if (missing.length || unexpected.length || duplicates.length) add(suite, `Coverage mismatch: ${missing.length} missing, ${unexpected.length} unexpected, ${duplicates.length} duplicate`);
    const failed = suiteReports.flatMap(report => (report.assertions ?? []).filter(assertion => assertion.status !== 'passed'));
    if (failed.length) add(suite, `${failed.length} failed/skipped/todo assertions`);
    if (suite !== 'browser') {
      const actualFiles = suiteReports.flatMap(report => report.files ?? []);
      check([...actualFiles].sort(), [...inventory.files].sort(), suite, 'Exact file union');
    }
    coverage[suite] = { expected: expected.length, actual: actual.length, unique: keys.size, missing, unexpected, duplicates, failed };
  }
  return { schema: 1, generatedAt: new Date().toISOString(), ok: issues.length === 0, mode: plan.mode, planSha256: sha256(JSON.stringify(plan)), source: plan.source, runtime: plan.runtime, workflow: plan.workflow, coverage, issues, duration: [{ id: 'collection', elapsedMs: plan.collectionElapsedMs ?? null, ok: true }, ...reports.map(report => ({ id: report.id, elapsedMs: report.elapsedMs, ok: report.ok }))] };
}

export function aggregate(planFile, resultsDir, output, { emit = true } = {}) {
  let plan;
  try { plan = readJSON(planFile); }
  catch (error) {
    const result = { schema: 1, generatedAt: new Date().toISOString(), ok: false, mode: 'unknown', source: { commit: process.env.GITHUB_SHA ?? null }, coverage: {}, duration: [], issues: [{ id: 'plan', message: `Missing or unreadable collection plan: ${error.message}` }] };
    writeJSON(output, result);
    if (emit) notice(JSON.stringify(verificationMetadata(null, result)));
    if (emit) annotate(result.issues[0].message, 'Verification failed');
    if (emit && process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Verification: failed\n\n${result.issues[0].message}\n\n`);
    return result;
  }
  const issues = [];
  const reports = [];
  for (const file of walk(resolve(resultsDir)).filter(file => file.endsWith('.report.json'))) {
    try {
      const report = readJSON(file);
      if (report.kind === 'vitest') {
        const raw = file.replace(/\.report\.json$/, '.vitest.json');
        if (sha256(readFileSync(raw)) !== report.rawSha256) throw new Error('Raw result identity differs from the report');
      }
      reports.push(report);
    } catch (error) { issues.push({ id: basename(file), message: String(error.message) }); }
  }
  const jobResults = JSON.parse(process.env.VERIFICATION_JOB_RESULTS ?? '{}');
  let result;
  try { result = verifyUnion(plan, reports, jobResults); }
  catch (error) {
    result = { schema: 1, generatedAt: new Date().toISOString(), ok: false, mode: plan.mode ?? 'unknown', source: plan.source ?? { commit: null }, coverage: {}, duration: [], issues: [{ id: 'plan-or-report', message: `Malformed verification evidence: ${error.message}` }] };
  }
  try {
    same(sourceIdentity(), plan.source, 'Aggregator source');
    same(runtime(), plan.runtime, 'Aggregator runtime');
    same(workflow(), plan.workflow, 'Aggregator workflow');
  } catch (error) { issues.push({ id: 'aggregator', message: error.message }); }
  result.issues.push(...issues);
  result.ok = result.issues.length === 0;
  writeJSON(output, result);
  if (emit) notice(JSON.stringify(verificationMetadata(plan, result, reports)));
  if (emit) for (const issue of result.issues) annotate(issue.message, issue.id);
  const lines = [`### Verification: ${result.ok ? 'passed' : 'failed'}`, '', `Source: \`${result.source.commit}\` · mode: ${result.mode}`, '', '| Gate | Seconds | Result |', '|---|---:|---|', ...result.duration.map(gate => `| ${gate.id} | ${Number.isFinite(gate.elapsedMs) ? (gate.elapsedMs / 1000).toFixed(1) : '?'} | ${gate.ok ? 'passed' : 'failed/incomplete'} |`), '', ...Object.entries(result.coverage).map(([suite, coverage]) => `${suite}: ${coverage.unique}/${coverage.expected} unique cases; ${coverage.missing.length} missing, ${coverage.duplicates.length} duplicate.`), '', ...result.issues.map(issue => `- ${issue.id}: ${issue.message}`), ''];
  if (emit && process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'));
  if (emit) console.log(JSON.stringify({ ok: result.ok, source: result.source.commit, coverage: Object.fromEntries(Object.entries(result.coverage).map(([suite, coverage]) => [suite, `${coverage.unique}/${coverage.expected}`])), issues: result.issues }, null, 2));
  return result;
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [plan = `${DEFAULT_OUT}/plan.json`, dir = DEFAULT_OUT, output = `${DEFAULT_OUT}/union.json`] = process.argv.slice(2);
  process.exitCode = aggregate(plan, dir, output).ok ? 0 : 1;
}
