import { spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { annotate, baseReport, CONFIGS, DEFAULT_OUT, finishReport, posix, readJSON, sha256, writeJSON } from './lib.mjs';

const [id, planFile = `${DEFAULT_OUT}/plan.json`, out = DEFAULT_OUT] = process.argv.slice(2);
const plan = readJSON(planFile);
const gate = plan.gates.find(gate => gate.id === id && gate.kind === 'vitest');
if (!gate) throw new Error(`Unknown Vitest gate ${id}`);
const reportFile = resolve(out, `${id}.report.json`);
const rawFile = resolve(out, `${id}.vitest.json`);
const report = baseReport(plan, id, 'vitest');
Object.assign(report, { suite: gate.suite, assignedFile: gate.file ?? null, shard: gate.shard ?? null });
writeJSON(reportFile, report);
const args = ['node_modules/vitest/vitest.mjs', 'run', '--config', CONFIGS[gate.suite], ...(gate.file ? [gate.file, '--maxWorkers=1'] : [`--shard=${gate.shard}`]), '--reporter=verbose', '--reporter=json', `--outputFile.json=${rawFile}`];
report.command = [process.execPath, ...args];
const start = performance.now();
const runtimeFile = resolve(out, `${id}.runtime.jsonl`);
const preload = resolve(out, `${id}.runtime.cjs`);
rmSync(rawFile, { force: true });
rmSync(runtimeFile, { force: true });
writeFileSync(preload, `require('node:fs').appendFileSync(${JSON.stringify(runtimeFile)}, JSON.stringify({node:process.version,v8:process.versions.v8,platform:process.platform,arch:process.arch,argv:process.argv})+'\\n');\n`);
const child = spawn(process.execPath, args, { stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: [process.env.NODE_OPTIONS, `--require=${preload}`].filter(Boolean).join(' ') } });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { report.errors = [String(error)]; });
child.on('close', (code, signal) => {
  finishReport(report, start, code ?? 1, signal);
  try {
    if (!existsSync(rawFile)) throw new Error('Vitest did not write a result');
    const data = readJSON(rawFile);
    report.rawSha256 = sha256(readFileSync(rawFile));
    const processes = readFileSync(runtimeFile, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
    const workers = processes.filter(worker => posix(worker.argv?.[1] ?? '').includes('/vitest/dist/workers/'));
    report.workerRuntime = processes.map(({ argv, ...environment }) => environment);
    if (!workers.length || processes.some(worker => ['node', 'v8', 'platform', 'arch'].some(key => worker[key] !== report.runtime[key]))) throw new Error('Missing or mixed test-worker runtime');
    report.files = data.testResults.map(test => posix(test.name).split('/tests/').pop()).map(file => file.startsWith('tests/') ? file : `tests/${file}`);
    report.assertions = data.testResults.flatMap(test => {
      const normalized = posix(test.name);
      const marker = normalized.lastIndexOf('/tests/');
      const file = marker >= 0 ? normalized.slice(marker + 1) : normalized;
      return test.assertionResults.map(assertion => ({ file, name: [...(assertion.ancestorTitles ?? []), assertion.title].join(' > '), status: assertion.status, durationMs: assertion.duration ?? null, failures: assertion.failureMessages ?? [] }));
    });
    report.counts = { total: data.numTotalTests, passed: data.numPassedTests, failed: data.numFailedTests, pending: data.numPendingTests };
    if (!data.success || !report.assertions.length || report.assertions.length !== data.numTotalTests || report.assertions.some(assertion => assertion.status !== 'passed')) throw new Error('Failed, skipped, empty or incomplete Vitest results');
    if (gate.file && (report.files.length !== 1 || report.files[0] !== gate.file)) throw new Error('Wrong file executed in this job');
  } catch (error) {
    report.ok = false;
    report.errors = [...(report.errors ?? []), String(error.message)];
  }
  for (const assertion of report.assertions ?? []) if (assertion.status !== 'passed') annotate(`${assertion.file}: ${assertion.name}: ${assertion.failures.join('\n') || assertion.status}`, 'Vitest case failed');
  for (const error of report.errors ?? []) annotate(error, id);
  writeJSON(reportFile, report);
  process.exitCode = report.ok ? 0 : 1;
});
