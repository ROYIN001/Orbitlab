import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const DEFAULT_OUT = 'tests/browser/artifacts/verification';
export const CONFIGS = { unit: 'vite.config.ts', heavy: 'vitest.heavy.config.ts', 'sixdof-fleet': 'vitest.sixdof-fleet.config.ts' };
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const readJSON = file => JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
export function writeJSON(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}
export function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = resolve(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Verification does not accept symlinks: ${file}`);
    return entry.isDirectory() ? walk(file) : [file];
  }).sort();
}
export const posix = file => file.split(sep).join('/');
export function fileManifest(files, root = ROOT) {
  const entries = files.map(file => ({ file: posix(relative(root, file)), sha256: sha256(readFileSync(file)) })).sort((a, b) => a.file.localeCompare(b.file, 'en'));
  return { sha256: sha256(JSON.stringify(entries)), files: entries };
}
export function directoryManifest(dir, root = dir) { return fileManifest(walk(dir), root); }
export function sourceIdentity(root = ROOT) {
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  const candidates = git('ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0').filter(Boolean);
  // Refreshed snapshots get their own identity; outputs and screenshots are never source inputs.
  const relevant = file => (/^(src\/|tests\/|scripts\/|public\/|\.github\/|[^/]+\.(?:json|ts|html))/.test(file)
    && !/^(public\/data\/|tests\/probe\/|tests\/browser\/(?:artifacts|screenshots)\/)/.test(file))
    || ['docs/ROADMAP-PART2-3.md', 'docs/SIXDOF-VEHICLE-DATA.md', 'docs/history/phase4-2026-10-01/T03-CURRICULA-RESEARCH.md'].includes(file);
  const files = candidates.filter(relevant).map(file => resolve(root, file));
  return { commit: git('rev-parse', 'HEAD'), tree: git('rev-parse', 'HEAD^{tree}'), ...fileManifest(files, root) };
}
export function snapshots(root = ROOT) { return directoryManifest(resolve(root, 'public/data'), root); }
export function runtime(root = ROOT) {
  return {
    node: process.version, v8: process.versions.v8, platform: process.platform, arch: process.arch,
    vitest: readJSON(resolve(root, 'node_modules/vitest/package.json')).version,
    playwright: readJSON(resolve(root, 'node_modules/playwright/package.json')).version,
    packageLock: sha256(readFileSync(resolve(root, 'package-lock.json'))),
  };
}
export function workflow() {
  return { runId: process.env.GITHUB_RUN_ID ?? null, attempt: process.env.GITHUB_RUN_ATTEMPT ?? null, sha: process.env.GITHUB_SHA ?? null };
}
export const assertionKey = assertion => `${assertion.file}::${assertion.name}`;
export function discoverFiles(suite, root = ROOT) {
  if (!(suite in CONFIGS)) throw new Error(`Unknown suite ${suite}`);
  const dir = suite === 'unit' ? 'tests' : `tests/${suite}`;
  return walk(resolve(root, dir)).map(file => posix(relative(root, file))).filter(file => file.endsWith('.test.ts')
    && (suite !== 'unit' || !/^tests\/(?:heavy|sixdof-fleet|probe)\//.test(file)));
}
export function collectCases(suite, out, root = ROOT) {
  if (!(suite in CONFIGS)) throw new Error(`Unknown suite ${suite}`);
  mkdirSync(dirname(out), { recursive: true });
  execFileSync(process.execPath, [resolve(root, 'node_modules/vitest/vitest.mjs'), 'list', '--config', CONFIGS[suite], '--no-staticParse', '--maxWorkers=2', `--json=${out}`], { cwd: root, stdio: 'inherit' });
  const cases = readJSON(out).map(test => ({ file: posix(relative(root, test.file)), name: test.name })).sort((a, b) => assertionKey(a).localeCompare(assertionKey(b), 'en'));
  const files = discoverFiles(suite, root);
  if (!cases.length || new Set(cases.map(assertionKey)).size !== cases.length) throw new Error(`Empty or duplicate ${suite} test collection`);
  if (JSON.stringify([...new Set(cases.map(test => test.file))].sort()) !== JSON.stringify([...files].sort())) throw new Error(`${suite} collection does not cover its discovered files`);
  return { files, assertions: cases };
}
export async function browserInventory(smoke = false, root = ROOT) {
  const dir = resolve(root, 'tests/browser/journeys');
  const names = [];
  for (const file of readdirSync(dir).filter(file => file.endsWith('.mjs')).sort()) {
    const mod = await import(pathToFileURL(resolve(dir, file)).href);
    if (!smoke || mod.smoke) names.push(file.slice(0, -4));
  }
  if (!names.length) throw new Error('No browser journeys collected');
  return names;
}
export function same(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} differs from the verification plan`);
}
export function baseReport(plan, id, kind, root = ROOT) {
  const source = sourceIdentity(root);
  const environment = runtime(root);
  same(source, plan.source, 'Source');
  same(environment, plan.runtime, 'Runtime');
  same(workflow(), plan.workflow, 'Workflow');
  return { schema: 1, id, kind, planSha256: sha256(JSON.stringify(plan)), source, runtime: environment, workflow: workflow(), snapshots: snapshots(root), startedAt: new Date().toISOString(), state: 'running', ok: false };
}
export function finishReport(report, start, code, signal, root = ROOT) {
  report.finishedAt = new Date().toISOString();
  report.elapsedMs = Math.round(performance.now() - start);
  report.exit = code;
  report.signal = signal ?? null;
  report.state = signal ? 'interrupted' : 'finished';
  report.ok = code === 0 && !signal;
  try {
    same(sourceIdentity(root), report.source, 'Source changed during execution');
    same(snapshots(root), report.snapshots, 'Snapshots changed during execution');
  } catch (error) {
    report.ok = false;
    report.errors = [...(report.errors ?? []), String(error.message)];
  }
  return report;
}
export function annotate(message, title = 'verification failed') {
  const escape = text => String(text).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  if (process.env.GITHUB_ACTIONS) console.error(`::error title=${escape(title)}::${escape(message)}`);
  else console.error(`${title}: ${message}`);
}
