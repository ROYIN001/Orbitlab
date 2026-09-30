import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const resultsDir = path.resolve(process.argv[2] ?? 'collected-heavy');
const output = path.resolve(process.argv[3] ?? 'heavy-union.json');
const expected = JSON.parse(fs.readFileSync(path.join(here, 'heavy-expected.json'), 'utf8'));
const json = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const sha = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const expectedSha256 = sha(path.join(here, 'heavy-expected.json'));
const walk = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name); return e.isDirectory() ? walk(p) : [p];
}) : [];
const keyOf = (file, name) => file + '::' + name;
const expectedKeys = new Set(expected.assertions.map((a) => keyOf(a.file, a.name)));
const seen = new Map(), files = new Set(), duplicates = [], unexpected = [], runs = [], issues = [];
for (const resultPath of walk(resultsDir).filter((p) => path.basename(p) === 'result.json')) {
  const dir = path.dirname(resultPath), data = json(resultPath);
  const metadata = json(path.join(dir, 'provenance.json'));
  const exitPath = path.join(dir, 'exit.txt');
  const exitText = fs.existsSync(exitPath) ? fs.readFileSync(exitPath, 'utf8').trim() : '';
  const exit = /^\d+$/.test(exitText) ? Number(exitText) : null;
  const runtimesPath = path.join(dir, 'worker-runtime.jsonl');
  const runtimes = fs.existsSync(runtimesPath) ? fs.readFileSync(runtimesPath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse) : [];
  const workers = runtimes.filter((r) => (r.argv?.[1] ?? '').replace(/\\/g, '/').includes('/vitest/dist/workers/'));
  if (!workers.length || runtimes.some((r) => !/^v22\./.test(r.node)
      || ['node', 'v8', 'platform', 'arch', 'execPath'].some((k) => r[k] !== metadata[k]))) {
    issues.push({ file: metadata.file, kind: 'missing-or-wrong-worker-runtime' });
  }
  if (metadata.expectedSha256 !== expectedSha256) issues.push({ file: metadata.file, kind: 'wrong-expected-inventory' });
  for (const [environmentKey, metadataKey] of [['GITHUB_SHA', 'sourceCommit'], ['GITHUB_RUN_ID', 'githubRunId'], ['GITHUB_RUN_ATTEMPT', 'githubRunAttempt']]) {
    if (process.env[environmentKey] && metadata[metadataKey] !== process.env[environmentKey]) {
      issues.push({ file: metadata.file, kind: 'wrong-workflow-provenance', field: metadataKey });
    }
  }
  if (exit !== 0 || !data.success) issues.push({ file: metadata.file, kind: 'failed-or-incomplete-run', exit, success: data.success });
  const run = { file: metadata.file, resultPath: path.relative(resultsDir, resultPath), resultSha256: sha(resultPath),
    tests: data.numTotalTests, passed: data.numPassedTests, failed: data.numFailedTests,
    pending: data.numPendingTests, exit, provenance: metadata };
  runs.push(run);
  for (const f of data.testResults) {
    const normalized = f.name.replace(/\\/g, '/');
    const marker = normalized.indexOf('/tests/');
    const file = marker >= 0 ? normalized.slice(marker + 1) : normalized;
    files.add(file);
    if (file !== metadata.file) issues.push({ file, kind: 'wrong-file-in-job', assigned: metadata.file });
    for (const a of f.assertionResults) {
      const name = [...(a.ancestorTitles ?? []), a.title].join(' > ');
      const key = keyOf(file, name);
      const item = { file, name, fullName: a.fullName, status: a.status, durationMs: a.duration,
        ...(a.failureMessages?.length ? { failureMessages: a.failureMessages } : {}) };
      if (seen.has(key)) duplicates.push(item); else seen.set(key, item);
      if (!expectedKeys.has(key)) unexpected.push(item);
    }
  }
}
const missing = expected.assertions.filter((a) => !seen.has(keyOf(a.file, a.name)));
const missingFiles = expected.files.filter((f) => !files.has(f));
const failures = [...seen.values()].filter((a) => a.status === 'failed');
const nonPassed = [...seen.values()].filter((a) => a.status !== 'passed');
const runtimeTuples = [...new Set(runs.map((r) => JSON.stringify([r.provenance.node, r.provenance.v8, r.provenance.platform, r.provenance.arch])))];
const sourceTuples = [...new Set(runs.map((r) => JSON.stringify([r.provenance.sourceCommit, r.provenance.sourceTree, r.provenance.testsTree, r.provenance.packageLockSha256, r.provenance.configSha256, r.provenance.expectedSha256])))];
if (sourceTuples.length !== 1) issues.push({ kind: 'missing-or-mixed-source-provenance', sourceTuples });
if (runtimeTuples.length !== 1) issues.push({ kind: 'missing-or-mixed-runtime', runtimeTuples });
if (runs.length !== expected.files.length) issues.push({ kind: 'missing-or-duplicate-file-runs', expected: expected.files.length, actual: runs.length });
const ok = !missing.length && !unexpected.length && !duplicates.length && !nonPassed.length && !issues.length;
const result = {
  generatedAt: new Date().toISOString(), ok, expectedAssertions: expected.assertions.length, expectedFiles: expected.files.length,
  uniqueAssertions: seen.size, uniqueFiles: files.size, passed: [...seen.values()].filter((a) => a.status === 'passed').length,
  missingFiles, missing, unexpected, duplicates, failures, nonPassed, issues,
  sixDofLessons: [...seen.values()].filter((a) => a.file === 'tests/heavy/lessons-sixdof.test.ts'),
  runs, assertions: [...seen.values()], sourceTuples, runtimeTuples,
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ ok, expected: expected.assertions.length, actual: seen.size, passed: result.passed,
  files: files.size, missing: missing.length, unexpected: unexpected.length, duplicates: duplicates.length,
  nonPassed: nonPassed.length, issues }, null, 2));
process.exitCode = ok ? 0 : 1;
