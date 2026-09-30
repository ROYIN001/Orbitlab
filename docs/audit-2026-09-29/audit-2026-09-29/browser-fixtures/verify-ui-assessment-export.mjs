// Audit-only verification of the real downloaded assessment evidence; no browser state.
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createServer } from '../source-integrated/node_modules/vite/dist/node/index.js';
const name = 'orbitlab-QA-Test-2026-09-29-19-56.orbitlab-results.json';
const originalPath = `C:/Users/Royin/Downloads/${name}`;
const audit = new URL('../', import.meta.url);
const preserved = new URL(name, audit);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const original = readFileSync(originalPath);
if (existsSync(preserved)) {
  if (sha(readFileSync(preserved)) !== sha(original)) throw new Error('Existing evidence differs');
} else copyFileSync(originalPath, preserved);
const root = new URL('../source-integrated/', import.meta.url);
const server = await createServer({ root: fileURLToPath(root), configFile: false, server: { middlewareMode: true }, appType: 'custom' });
try {
  const [{ verifyResults }, { scoreAttempt, LEVEL_WEIGHT }, { BUILTIN_QUESTIONS }] = await Promise.all([
    server.ssrLoadModule('/src/lessons/progress.ts'),
    server.ssrLoadModule('/src/lessons/assessment/score.ts'),
    server.ssrLoadModule('/src/lessons/assessment/bank.ts'),
  ]);
  const file = JSON.parse(original.toString('utf8'));
  const changed = structuredClone(file);
  changed.student += '-negative-control';
  const checks = [];
  for (const attempt of file.progress.assessments) {
    const score = scoreAttempt(attempt, BUILTIN_QUESTIONS, []);
    const earnedWeight = score.questions.reduce((sum, q) => sum + q.credit * LEVEL_WEIGHT[q.level], 0);
    const totalWeight = score.questions.reduce((sum, q) => sum + LEVEL_WEIGHT[q.level], 0);
    checks.push({ kind: attempt.kind, seed: attempt.seed, startedAt: attempt.startedAt, finishedAt: attempt.finishedAt,
      preparedCount: attempt.questions.length, answerCount: attempt.answers.length,
      skipped: attempt.answers.filter((a) => a.skipped).length,
      answered: attempt.answers.filter((a) => !a.skipped && a.value !== null).length,
      correct: score.questions.filter((q) => q.correct).length,
      percent: score.percent, exportedSummaryPercent: file.summary?.percent,
      summaryScoreMatches: score.percent === file.summary?.percent,
      earnedWeight, totalWeight, questionTypes: [...new Set(attempt.questions.map((p) => BUILTIN_QUESTIONS.find((q) => q.id === p.id)?.type))],
      retainedValues: attempt.answers.filter((a) => !a.skipped),
    });
  }
  const result = { checkedAt: new Date().toISOString(), runtime: { node: process.version, v8: process.versions.v8, platform: process.platform },
    provenance: { originalPath, preservedPath: fileURLToPath(preserved), rawFileBytes: original.length, sha256: sha(original),
      exportedAt: file.exportedAt, studentLabel: file.student, storedChecksum: file.checksum },
    checksumValid: await verifyResults(file), alteredCopyRejected: !(await verifyResults(changed)),
    savedCasePasses: Object.values(file.progress.lessons).filter((v) => v.passed).length,
    assessmentChecks: checks,
    limits: ['QA-Test is a synthetic acceptance run, not the owner\'s score.', 'Question types present in this draw do not prove all item types were answered in the UI.',
      'Browser draft/language/review visuals are separate UI evidence; this script only inspects the exported file.', 'No browser or application state was changed.'],
  };
  if (!result.checksumValid || !result.alteredCopyRejected || checks.length !== 1 || !checks[0].summaryScoreMatches || checks[0].correct !== 5 || checks[0].skipped !== 20) throw new Error('Acceptance evidence did not match expected controlled run');
  writeFileSync(new URL('ui-assessment-export-validation.json', audit), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} finally { await server.close(); }
