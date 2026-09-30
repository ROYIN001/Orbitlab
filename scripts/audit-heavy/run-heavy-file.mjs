import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const expected = JSON.parse(fs.readFileSync(path.join(here, 'heavy-expected.json'), 'utf8'));
const testFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const p = path.join(dir, entry.name);
  return entry.isDirectory() ? testFiles(p) : p.endsWith('.test.ts') ? [p.replace(/\\/g, '/')] : [];
});
if (JSON.stringify(testFiles('tests/heavy').sort()) !== JSON.stringify([...expected.files].sort())) {
  throw new Error('Heavy file inventory changed; update the reviewed matrix and expected coverage first');
}
const file = process.argv[2];
if (!expected.files.includes(file)) throw new Error('Select exactly one of the 27 expected heavy files');
if (process.versions.node.split('.')[0] !== '22') throw new Error('Node 22 is required');
const caseId = path.basename(file, '.test.ts');
const out = path.resolve('heavy-results', caseId);
fs.mkdirSync(out, { recursive: true });
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const hash = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const protectedPaths = ['src', 'tests', 'package.json', 'package-lock.json', 'vite.config.ts', 'vitest.heavy.config.ts'];
git('diff', '--exit-code', 'HEAD', '--', ...protectedPaths);
const provenance = {
  file, caseId, sourceCommit: git('rev-parse', 'HEAD'),
  sourceTree: git('rev-parse', 'HEAD:src'), testsTree: git('rev-parse', 'HEAD:tests'),
  packageLockSha256: hash('package-lock.json'), configSha256: hash('vitest.heavy.config.ts'),
  expectedSha256: hash(path.join(here, 'heavy-expected.json')),
  node: process.version, v8: process.versions.v8, execPath: process.execPath,
  platform: process.platform, arch: process.arch, startedAt: new Date().toISOString(),
  githubRunId: process.env.GITHUB_RUN_ID ?? null,
  githubRunAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
};
fs.writeFileSync(path.join(out, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
const runtimePreload = path.join(out, 'runtime.cjs');
const runtimeLog = path.join(out, 'worker-runtime.jsonl');
fs.writeFileSync(runtimePreload, `require('node:fs').appendFileSync(${JSON.stringify(runtimeLog)},JSON.stringify({pid:process.pid,node:process.version,v8:process.versions.v8,execPath:process.execPath,platform:process.platform,arch:process.arch,argv:process.argv})+'\\n');\n`);
const args = [
  'node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.heavy.config.ts', file,
  '--maxWorkers=1', '--reporter=verbose', '--reporter=json',
  `--outputFile.json=${path.join(out, 'result.json')}`,
];
fs.writeFileSync(path.join(out, 'command.json'), JSON.stringify({ executable: process.execPath, args }, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'checkpoint.json'), JSON.stringify({ state: 'running', ...provenance }, null, 2) + '\n');
const log = fs.createWriteStream(path.join(out, 'run.log'));
const start = performance.now();
const child = spawn(process.execPath, args, {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, NODE_OPTIONS: [process.env.NODE_OPTIONS, `--require=${runtimePreload}`].filter(Boolean).join(' ') },
});
child.stdout.on('data', (chunk) => { log.write(chunk); process.stdout.write(chunk); });
child.stderr.on('data', (chunk) => { log.write(chunk); process.stderr.write(chunk); });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', (error) => {
  fs.writeFileSync(path.join(out, 'spawn-error.txt'), String(error) + '\n');
});
child.on('close', (code, signal) => {
  log.end();
  const exit = code ?? 1;
  const end = { ...provenance, state: signal ? 'interrupted' : 'finished', exit, signal,
    finishedAt: new Date().toISOString(), elapsedMs: Math.round(performance.now() - start) };
  fs.writeFileSync(path.join(out, 'exit.txt'), String(exit) + '\n');
  fs.writeFileSync(path.join(out, 'checkpoint.json'), JSON.stringify(end, null, 2) + '\n');
  process.exitCode = exit;
});
