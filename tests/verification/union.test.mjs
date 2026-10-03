import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { verifyUnion, aggregate } from '../../scripts/verification/aggregate.mjs';
import { discoverFiles, readJSON, runtime, sha256, snapshots, sourceIdentity, workflow, writeJSON } from '../../scripts/verification/lib.mjs';
import { selectShard } from '../browser/shard.mjs';

function fixture(mode = 'ci') {
  const source = { commit: 'same-commit', tree: 'same-tree', sha256: 'same-source', files: [] };
  const environment = { node: 'v22.23.3', v8: 'same-v8', platform: 'linux', arch: 'x64', vitest: '5.0.1', playwright: '1.63.0', packageLock: 'same-lock' };
  const baseline = { sha256: 'baseline', files: [] };
  const fresh = mode === 'pages' ? { sha256: 'fresh', files: [] } : baseline;
  const plan = { schema: 1, mode, source, runtime: environment, workflow: { runId: '10', attempt: '1', sha: 'same-commit' }, snapshots: baseline,
    suites: { unit: { files: ['tests/a.test.ts', 'tests/b.test.ts', 'tests/c.test.ts'], assertions: ['a', 'b', 'c'].map(letter => ({ file: `tests/${letter}.test.ts`, name: `suite > ${letter}` })) }, browser: { names: ['a', 'b', 'c', 'd', 'e'], smoke: mode === 'ci' } },
    gates: [{ id: 'typecheck', kind: 'command' }, { id: 'build', kind: 'build' }, ...[1, 2, 3].map(index => ({ id: `unit-${index}of3`, kind: 'vitest', suite: 'unit', shard: `${index}/3` })), ...[1, 2].map(index => ({ id: `browser-${index}of2`, kind: 'browser', suite: 'browser', shard: `${index}/2` }))] };
  if (mode === 'pages') plan.gates.push({ id: 'snapshot-check', kind: 'command' });
  const dist = { sha256: 'same-dist', files: [{ file: 'index.html', sha256: 'index' }, { file: 'sw.js', sha256: 'worker' }] };
  const reports = plan.gates.map(gate => {
    const report = { schema: 1, ...gate, planSha256: sha256(JSON.stringify(plan)), source, runtime: environment, workflow: plan.workflow, snapshots: gate.id === 'build' || gate.id === 'snapshot-check' ? fresh : baseline, state: 'finished', finishedAt: '2026-10-03T00:00:00Z', elapsedMs: 1000, exit: 0, signal: null, ok: true };
    if (gate.kind === 'build') report.dist = dist;
    if (gate.kind === 'vitest') {
      const index = Number(gate.shard[0]) - 1;
      report.assignedFile = null;
      report.assertions = [{ ...plan.suites.unit.assertions[index], status: 'passed' }];
      report.files = [plan.suites.unit.files[index]];
      report.counts = { total: 1, passed: 1, failed: 0, pending: 0 };
      report.rawSha256 = 'raw';
      report.workerRuntime = [{ node: environment.node, v8: environment.v8, platform: environment.platform, arch: environment.arch }];
    }
    if (gate.kind === 'browser') Object.assign(report, { dist, artifactSnapshots: fresh, journeys: selectShard(plan.suites.browser.names, gate.shard).map(name => ({ name, failures: [], seconds: 1, browserVersion: '151.0.0.0' })), browserRuntime: { configuredExecutableSha256: 'same-chromium', actualVersions: ['151.0.0.0'], playwright: environment.playwright } });
    return structuredClone(report);
  });
  return { plan, reports };
}

test('all default cases and journeys pass exactly once on the same artifact', () => {
  const { plan, reports } = fixture();
  const result = verifyUnion(plan, reports, { build: 'success', test: 'success', browser: 'success' });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.equal(result.coverage.unit.unique, 3);
  assert.equal(result.coverage.browser.unique, 5);
});

test('Pages accepts refreshed snapshots only when schema validation and the browser share the built data', () => {
  const { plan, reports } = fixture('pages');
  assert.equal(verifyUnion(plan, reports).ok, true);
  reports.find(report => report.id === 'snapshot-check').snapshots.sha256 = 'different-fresh-data';
  assert.equal(verifyUnion(plan, reports).ok, false);
});

const mutations = {
  'missing gate': reports => reports.pop(),
  'duplicate gate': reports => reports.push(structuredClone(reports[0])),
  'source changed': reports => { reports[2].source.sha256 = 'other-source'; },
  'runtime changed': reports => { reports[2].runtime.node = 'v24.0.0'; },
  'different workflow attempt': reports => { reports[2].workflow.attempt = '2'; },
  'plan changed': reports => { reports[2].planSha256 = 'different-plan'; },
  'interrupted job': reports => { reports[2].state = 'interrupted'; },
  'nonzero process': reports => { reports[2].exit = 1; },
  'missing completion': reports => { delete reports[2].finishedAt; },
  'skipped case': reports => { reports[2].assertions[0].status = 'pending'; },
  'pending count': reports => { reports[2].counts.pending = 1; },
  'mixed worker runtime': reports => { reports[2].workerRuntime[0].v8 = 'other-v8'; },
  'duplicate case': reports => { reports[3].assertions = reports[2].assertions; },
  'extra case': reports => { reports[2].assertions.push({ file: 'tests/a.test.ts', name: 'unplanned', status: 'passed' }); },
  'missing file': reports => { reports[2].files = []; },
  'wrong shard': reports => { reports[2].shard = '3/3'; },
  'changed committed snapshot': reports => { reports[2].snapshots.sha256 = 'other-data'; },
  'missing journey': reports => { reports[5].journeys.pop(); },
  'failed journey': reports => { reports[5].journeys[0].failures = ['real click timed out']; },
  'different build artifact': reports => { reports[5].dist.sha256 = 'other-dist'; },
  'different Chromium': reports => { reports[5].browserRuntime.configuredExecutableSha256 = 'other-browser'; },
  'missing actual Chromium version': reports => { delete reports[5].journeys[0].browserVersion; },
  'missing raw result identity': reports => { delete reports[2].rawSha256; },
};
for (const [name, mutate] of Object.entries(mutations)) test(`rejects ${name}`, () => {
  const { plan, reports } = fixture();
  mutate(reports);
  assert.equal(verifyUnion(plan, reports).ok, false, name);
});

test('a later failed budget step cannot be masked by a successful build report', () => {
  const { plan, reports } = fixture();
  const result = verifyUnion(plan, reports, { build: 'failure' });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(issue => issue.id === 'build' && issue.message.includes('workflow job')));
});

test('a suite intentionally absent from a scientific plan may skip; an enabled suite may not', () => {
  const plan = { schema: 1, mode: 'heavy', gates: [{ id: 'heavy-a', kind: 'vitest', suite: 'heavy', file: 'tests/heavy/a.test.ts' }], suites: { heavy: { files: ['tests/heavy/a.test.ts'], assertions: [{ file: 'tests/heavy/a.test.ts', name: 'a' }] } }, source: {}, runtime: {}, workflow: {}, snapshots: {} };
  const report = { schema: 1, id: 'heavy-a', kind: 'vitest', suite: 'heavy', assignedFile: 'tests/heavy/a.test.ts', shard: null, planSha256: sha256(JSON.stringify(plan)), source: {}, runtime: {}, workflow: {}, snapshots: {}, state: 'finished', finishedAt: 'now', elapsedMs: 1, exit: 0, signal: null, ok: true, files: ['tests/heavy/a.test.ts'], assertions: [{ file: 'tests/heavy/a.test.ts', name: 'a', status: 'passed' }], counts: { total: 1, passed: 1, failed: 0, pending: 0 }, rawSha256: 'raw', workerRuntime: [{}] };
  assert.equal(verifyUnion(plan, [report], { heavy: 'success', 'sixdof-fleet': 'skipped' }).ok, true);
  assert.equal(verifyUnion(plan, [report], { heavy: 'skipped', 'sixdof-fleet': 'skipped' }).ok, false);
});

test('reviewed heavy file inventory covers all 33 current files and 257 cases', () => {
  const reviewed = readJSON('scripts/audit-heavy/heavy-expected.json');
  assert.deepEqual([...reviewed.files].sort(), discoverFiles('heavy').sort());
  assert.equal(reviewed.files.length, 33);
  assert.equal(reviewed.assertions.length, 257);
  assert.equal(sha256(JSON.stringify(reviewed.assertions)), reviewed.sourceInventorySha256);
  assert.equal(new Set(reviewed.assertions.map(assertion => `${assertion.file}::${assertion.name}`)).size, 257);
  for (const file of reviewed.files) assert.ok(reviewed.assertions.some(assertion => assertion.file === file), file);
});

test('the file-backed aggregate rejects tampered raw artifacts and writes failure evidence', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'orbitlab-verification-'));
  try {
    const { plan, reports } = fixture();
    Object.assign(plan, { source: sourceIdentity(), runtime: runtime(), workflow: workflow(), snapshots: snapshots() });
    for (const report of reports) {
      Object.assign(report, { source: plan.source, runtime: plan.runtime, workflow: plan.workflow, snapshots: plan.snapshots, planSha256: sha256(JSON.stringify(plan)) });
      if (report.kind === 'vitest') {
        report.workerRuntime = [{ node: plan.runtime.node, v8: plan.runtime.v8, platform: plan.runtime.platform, arch: plan.runtime.arch }];
        const raw = '{"success":true}\n';
        report.rawSha256 = sha256(raw);
        writeFileSync(resolve(dir, `${report.id}.vitest.json`), raw);
      }
      if (report.kind === 'browser') report.artifactSnapshots = plan.snapshots;
      writeJSON(resolve(dir, `${report.id}.report.json`), report);
    }
    writeJSON(resolve(dir, 'plan.json'), plan);
    writeFileSync(resolve(dir, 'unit-1of3.vitest.json'), '{"success":false}\n');
    const result = aggregate(resolve(dir, 'plan.json'), dir, resolve(dir, 'union.json'), { emit: false });
    assert.equal(result.ok, false);
    assert.ok(result.issues.some(issue => issue.message.includes('Raw result identity')));
    assert.equal(JSON.parse(readFileSync(resolve(dir, 'union.json'), 'utf8')).ok, false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a missing collection plan still leaves structured failure evidence', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'orbitlab-missing-plan-'));
  try {
    const result = aggregate(resolve(dir, 'missing-plan.json'), dir, resolve(dir, 'union.json'), { emit: false });
    assert.equal(result.ok, false);
    assert.equal(result.issues[0].id, 'plan');
    assert.equal(readJSON(resolve(dir, 'union.json')).ok, false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
