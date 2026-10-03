import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { verifyUnion, aggregate, verificationMetadata } from '../../scripts/verification/aggregate.mjs';
import { discoverFiles, notice, readJSON, runtime, sha256, snapshots, sourceIdentity, workflow, writeJSON } from '../../scripts/verification/lib.mjs';
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

function metadataFixture(mode = 'ci') {
  const { plan, reports } = fixture(mode);
  Object.assign(plan.source, { commit: 'a'.repeat(40), sha256: 'b'.repeat(64) });
  for (const report of reports) {
    report.source = structuredClone(plan.source);
    report.planSha256 = sha256(JSON.stringify(plan));
    if (report.dist) report.dist.sha256 = 'c'.repeat(64);
    if (report.browserRuntime) report.browserRuntime.configuredExecutableSha256 = 'd'.repeat(64);
  }
  return { plan, reports };
}

test('successful metadata preserves exact union counts/identity without changing stored evidence', () => {
  const { plan, reports } = metadataFixture('pages');
  const result = verifyUnion(plan, reports);
  const before = structuredClone(result);
  assert.equal(result.ok, true);
  assert.deepEqual(verificationMetadata(plan, result, reports), {
    ok: true, sourceCommit: 'a'.repeat(40), sourceSha256: 'b'.repeat(64),
    suites: {
      unit: { expected: 3, unique: 3, missing: 0, unexpected: 0, duplicate: 0, nonpassing: 0 },
      browser: { expected: 5, unique: 5, missing: 0, unexpected: 0, duplicate: 0, nonpassing: 0 },
    },
    actualBrowserVersions: ['151.0.0.0'], distSha256: 'c'.repeat(64),
  });
  assert.deepEqual(result, before);
});

test('failed metadata retains missing/unexpected/duplicate/nonpassing counts and actual browser identity', () => {
  const { plan, reports } = metadataFixture();
  reports[2].assertions = [
    { ...plan.suites.unit.assertions[0], status: 'failed' },
    { ...plan.suites.unit.assertions[0], status: 'pending' },
    { file: 'tests/a.test.ts', name: 'outsider', status: 'passed' },
  ];
  reports[3].assertions = [];
  reports[4].assertions = [];
  reports[5].journeys[0].failures = ['private error payload https://example.invalid/secret'];
  reports[5].ok = false;
  reports[5].exit = 1;
  const result = verifyUnion(plan, reports);
  const before = structuredClone(result);
  const metadata = verificationMetadata(plan, result, reports);
  assert.equal(metadata.ok, false);
  assert.deepEqual(metadata.suites.unit, { expected: 3, unique: 2, missing: 2, unexpected: 1, duplicate: 1, nonpassing: 2 });
  assert.deepEqual(metadata.suites.browser, { expected: 5, unique: 5, missing: 0, unexpected: 0, duplicate: 0, nonpassing: 1 });
  assert.equal(metadata.sourceCommit, plan.source.commit);
  assert.equal(metadata.sourceSha256, plan.source.sha256);
  assert.equal(metadata.distSha256, 'c'.repeat(64));
  assert.deepEqual(metadata.actualBrowserVersions, ['151.0.0.0']);
  assert.ok(!JSON.stringify(metadata).includes('private error'));
  assert.ok(!JSON.stringify(metadata).includes('https://'));
  assert.deepEqual(result, before);
});

test('metadata never presents mixed/incomplete browser/build provenance as validated identity', () => {
  const mutations = [
    reports => { reports.find(report => report.id === 'build').source.sha256 = 'e'.repeat(64); },
    reports => { reports.push(structuredClone(reports.find(report => report.id === 'build'))); },
    reports => { delete reports.find(report => report.id === 'build').finishedAt; },
    reports => { for (const report of reports.filter(report => report.kind === 'browser')) report.workflow.attempt = '2'; },
    reports => { for (const report of reports.filter(report => report.kind === 'browser')) report.artifactSnapshots.sha256 = 'mixed'; },
    reports => { for (const report of reports.filter(report => report.kind === 'browser')) report.browserRuntime.actualVersions = ['151.0.0.0', '150.0.0.0']; },
    reports => { for (const report of reports.filter(report => report.kind === 'browser')) delete report.journeys[0].browserVersion; },
  ];
  for (const mutate of mutations) {
    const { plan, reports } = metadataFixture();
    mutate(reports);
    const result = verifyUnion(plan, reports);
    assert.equal(result.ok, false);
    assert.deepEqual(verificationMetadata(plan, result, reports).actualBrowserVersions, []);
  }
  const { plan, reports } = metadataFixture();
  reports[5].source.sha256 = 'e'.repeat(64);
  reports[5].journeys[0].failures = ['failed with bad provenance'];
  assert.equal(verificationMetadata(plan, verifyUnion(plan, reports), reports).suites.browser.nonpassing, 1);
});

test('metadata is bounded and allowlisted even for malformed or payload-bearing evidence', () => {
  const { plan, reports } = metadataFixture();
  const result = verifyUnion(plan, reports);
  plan.source.commit = 'https://example.invalid/private';
  plan.source.sha256 = 'private\n::error::payload';
  result.coverage['private-suite-name'] = result.coverage.unit;
  const metadata = verificationMetadata(plan, result, reports);
  assert.equal(metadata.sourceCommit, null);
  assert.equal(metadata.sourceSha256, null);
  assert.equal(metadata.distSha256, null);
  const encoded = JSON.stringify(metadata);
  assert.ok(encoded.length < 2048);
  assert.ok(!encoded.includes('private'));
  assert.doesNotThrow(() => verificationMetadata({ schema: 1, gates: 'malformed' }, { ok: false, coverage: {} }, [null, {}]));
});

test('workflow notice escapes message data and annotation properties onto one line', () => {
  const previous = process.env.GITHUB_ACTIONS;
  const original = console.log;
  const lines = [];
  try {
    process.env.GITHUB_ACTIONS = 'true';
    console.log = value => lines.push(value);
    notice('50%\r\n::error::payload', 'metadata,:\r\n');
    assert.deepEqual(lines, ['::notice title=metadata%2C%3A%0D%0A::50%25%0D%0A::error::payload']);
  } finally {
    console.log = original;
    if (previous === undefined) delete process.env.GITHUB_ACTIONS;
    else process.env.GITHUB_ACTIONS = previous;
  }
});

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

test('the final aggregate emits exactly one API-readable metadata notice on success and failure', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'orbitlab-metadata-notice-'));
  const previous = process.env.GITHUB_ACTIONS;
  const originalLog = console.log;
  const originalError = console.error;
  try {
    process.env.GITHUB_ACTIONS = 'true';
    console.error = () => {};
    const { plan, reports } = metadataFixture();
    Object.assign(plan, { source: sourceIdentity(), runtime: runtime(), workflow: workflow(), snapshots: snapshots() });
    for (const failed of [false, true]) {
      const lines = [];
      console.log = value => lines.push(value);
      for (const report of reports) {
        Object.assign(report, { source: plan.source, runtime: plan.runtime, workflow: plan.workflow, snapshots: plan.snapshots, planSha256: sha256(JSON.stringify(plan)) });
        if (report.kind === 'vitest') {
          report.workerRuntime = [{ node: plan.runtime.node, v8: plan.runtime.v8, platform: plan.runtime.platform, arch: plan.runtime.arch }];
          const raw = '{"success":true}\n';
          report.rawSha256 = sha256(raw);
          writeFileSync(resolve(dir, `${report.id}.vitest.json`), raw);
        }
        if (report.kind === 'browser') report.artifactSnapshots = plan.snapshots;
      }
      if (failed) {
        reports[5].journeys[0].failures = ['fixture failure'];
        reports[5].ok = false;
        reports[5].exit = 1;
      }
      for (const report of reports) writeJSON(resolve(dir, `${report.id}.report.json`), report);
      writeJSON(resolve(dir, 'plan.json'), plan);
      const result = aggregate(resolve(dir, 'plan.json'), dir, resolve(dir, 'union.json'));
      assert.equal(result.ok, !failed);
      const notices = lines.filter(line => line.startsWith('::notice '));
      assert.equal(notices.length, 1);
      const metadata = JSON.parse(notices[0].split('::').slice(2).join('::'));
      assert.deepEqual(metadata, verificationMetadata(plan, result, reports));
      assert.equal(metadata.sourceCommit, plan.source.commit);
      assert.equal(metadata.sourceSha256, plan.source.sha256);
      assert.equal(metadata.suites.unit.unique, 3);
      assert.equal(metadata.suites.browser.nonpassing, failed ? 1 : 0);
      assert.deepEqual(metadata.actualBrowserVersions, ['151.0.0.0']);
      assert.equal(metadata.distSha256, 'c'.repeat(64));
      assert.deepEqual(readJSON(resolve(dir, 'union.json')), result);
      assert.ok(notices[0].length < 2048);
    }
  } finally {
    console.log = originalLog;
    console.error = originalError;
    if (previous === undefined) delete process.env.GITHUB_ACTIONS;
    else process.env.GITHUB_ACTIONS = previous;
    rmSync(dir, { recursive: true, force: true });
  }
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
