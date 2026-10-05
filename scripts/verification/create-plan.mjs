import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { appendFileSync } from 'node:fs';
import { annotate, assertionKey, browserInventory, collectCases, DEFAULT_OUT, readJSON, runtime, same, sha256, snapshots, sourceIdentity, workflow, writeJSON } from './lib.mjs';

// PR CI runs the smoke journeys in two shards; Pages runs every journey in three (CO-5:
// two full shards measured 18.8 and 23.4 min of a 30 min job at 5f9aa2e, Pages 37230585947).
export function browserGates(mode) {
  const shards = mode === 'pages' ? 3 : 2;
  return Array.from({ length: shards }, (_, i) => ({ id: `browser-${i + 1}of${shards}`, kind: 'browser', suite: 'browser', shard: `${i + 1}/${shards}` }));
}

export async function createPlan(mode, out = DEFAULT_OUT) {
  if (!['ci', 'pages', 'heavy', 'sixdof-fleet', 'both'].includes(mode)) throw new Error(`Unknown verification mode ${mode}`);
  const suites = {};
  const gates = [];
  const source = sourceIdentity();
  const baselineSnapshots = snapshots();
  if (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== source.commit) throw new Error('Collected checkout is not this workflow SHA');
  const start = performance.now();
  const collection = { mode, sourceCommit: source.commit, sourceSha256: source.sha256, startedAt: new Date().toISOString(), state: 'running', ok: false };
  writeJSON(resolve(out, 'collection.json'), collection);
  try {
    if (mode === 'ci' || mode === 'pages') {
      suites.unit = collectCases('unit', resolve(out, 'unit-collected.json'));
      suites.browser = { names: await browserInventory(mode === 'ci'), smoke: mode === 'ci' };
      gates.push({ id: 'typecheck', kind: 'command' }, { id: 'build', kind: 'build' });
      if (mode === 'pages') gates.push({ id: 'snapshot-check', kind: 'command' });
      for (let shard = 1; shard <= 3; shard++) gates.push({ id: `unit-${shard}of3`, kind: 'vitest', suite: 'unit', shard: `${shard}/3` });
      gates.push(...browserGates(mode));
    } else {
      for (const suite of mode === 'both' ? ['heavy', 'sixdof-fleet'] : [mode]) {
        suites[suite] = collectCases(suite, resolve(out, `${suite}-collected.json`));
        if (suite === 'heavy') {
          const reviewed = readJSON('scripts/audit-heavy/heavy-expected.json');
          same(sha256(JSON.stringify(reviewed.assertions)), reviewed.sourceInventorySha256, 'Reviewed inventory checksum');
          same([...suites.heavy.files].sort(), [...reviewed.files].sort(), 'Reviewed heavy file inventory');
          same(suites.heavy.assertions.map(assertionKey).sort(), reviewed.assertions.map(assertionKey).sort(), 'Reviewed heavy assertion inventory');
        }
        for (const file of suites[suite].files) gates.push({ id: `${suite}-${file.split('/').pop().replace('.test.ts', '')}`, kind: 'vitest', suite, file });
      }
    }
    same(sourceIdentity(), source, 'Source changed during collection');
    same(snapshots(), baselineSnapshots, 'Snapshots changed during collection');
    collection.ok = true;
    const plan = { schema: 1, mode, createdAt: new Date().toISOString(), collectionElapsedMs: Math.round(performance.now() - start), source, runtime: runtime(), workflow: workflow(), snapshots: baselineSnapshots, suites, gates };
    writeJSON(resolve(out, 'plan.json'), plan);
    return plan;
  } catch (error) {
    collection.error = String(error.stack ?? error);
    throw error;
  } finally {
    Object.assign(collection, { finishedAt: new Date().toISOString(), elapsedMs: Math.round(performance.now() - start), state: 'finished' });
    writeJSON(resolve(out, 'collection.json'), collection);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ${mode} test collection\n\n${collection.ok ? 'Passed' : 'Failed'} in ${(collection.elapsedMs / 1000).toFixed(1)} s; source \`${source.commit}\`. No test bodies executed by collection.\n\n`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [mode = 'ci', out = DEFAULT_OUT] = process.argv.slice(2);
  try {
    const plan = await createPlan(mode, out);
    console.log(`${mode}: ${plan.gates.length} gates; ${Object.entries(plan.suites).map(([suite, inventory]) => `${suite} ${inventory.assertions?.length ?? inventory.names?.length} cases`).join(', ')}; collection ${(plan.collectionElapsedMs / 1000).toFixed(1)} s`);
  } catch (error) {
    annotate(error.message, 'Verification collection failed');
    process.exitCode = 1;
  }
}
