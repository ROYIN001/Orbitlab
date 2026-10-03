import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { annotate, DEFAULT_OUT, directoryManifest, readJSON, same, sourceIdentity, workflow } from './lib.mjs';

export function validatePublish(build, union, actualDist, source, currentWorkflow, node) {
  if (!union.ok || !build.ok || build.state !== 'finished' || build.exit !== 0) throw new Error('A required release gate failed or is incomplete');
  if (union.mode !== 'pages' || union.planSha256 !== build.planSha256) throw new Error('Mixed release plan');
  same(build.source, union.source, 'Build/union source');
  same(source, union.source, 'Publisher source');
  same(build.workflow, union.workflow, 'Build/union workflow');
  same(currentWorkflow, union.workflow, 'Publisher workflow');
  if (source.commit !== currentWorkflow.sha || node !== build.runtime.node) throw new Error('Wrong publish commit or Node runtime');
  same(actualDist, build.dist, 'Final Pages artifact');
  return true;
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [buildFile = `${DEFAULT_OUT}/build.report.json`, unionFile = `${DEFAULT_OUT}/union.json`, dist = 'dist'] = process.argv.slice(2);
  try {
    validatePublish(readJSON(buildFile), readJSON(unionFile), directoryManifest(resolve(dist)), sourceIdentity(), workflow(), process.version);
    console.log('Pages artifact matches all completed gates for this source and workflow.');
  } catch (error) {
    annotate(error.message, 'Pages artifact rejected');
    process.exitCode = 1;
  }
}
