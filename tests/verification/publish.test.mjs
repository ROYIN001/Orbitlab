import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validatePublish } from '../../scripts/verification/check-publish.mjs';

function evidence() {
  const source = { commit: 'current-main', sha256: 'source' };
  const workflow = { sha: 'current-main', runId: '10', attempt: '1' };
  const dist = { sha256: 'dist', files: [{ file: 'index.html', sha256: 'index' }] };
  const build = { ok: true, state: 'finished', exit: 0, planSha256: 'plan', source, workflow, runtime: { node: 'v22.23.3' }, dist };
  const union = { ok: true, mode: 'pages', planSha256: 'plan', source, workflow };
  return JSON.parse(JSON.stringify({ source, workflow, dist, build, union }));
}
test('publisher accepts only the exact completed Pages artifact', () => {
  const { source, workflow, dist, build, union } = evidence();
  assert.equal(validatePublish(build, union, dist, source, workflow, 'v22.23.3'), true);
});
for (const [name, mutate] of Object.entries({
  'unverified union': evidence => { evidence.union.ok = false; },
  'incomplete build': evidence => { evidence.build.state = 'running'; },
  'other plan': evidence => { evidence.build.planSha256 = 'old-plan'; },
  'PR smoke union': evidence => { evidence.union.mode = 'ci'; },
  'other commit': evidence => { evidence.source.commit = 'old-main'; },
  'other run attempt': evidence => { evidence.workflow.attempt = '2'; },
  'modified final artifact': evidence => { evidence.dist.sha256 = 'changed'; },
})) test(`publisher rejects ${name}`, () => {
  const { source, workflow, dist, build, union } = (() => { const fixture = evidence(); mutate(fixture); return fixture; })();
  assert.throws(() => validatePublish(build, union, dist, source, workflow, 'v22.23.3'));
});
