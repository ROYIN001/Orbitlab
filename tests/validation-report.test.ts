import { describe, expect, it } from 'vitest';
import {
  buildScientificReport, RATING_REFERENCES, ratingReferenceStatus, runnerOutcome,
  type RatingMeasurement, type RunnerOutcome, type ValidationProvenance,
} from '../src/validation/report';

const provenance: ValidationProvenance = {
  commit: 'a'.repeat(40), workingTreeDirty: false, sourceDigest: 'b'.repeat(64), sourceDigestAfter: 'b'.repeat(64),
  sourceStable: true, node: 'v22.23.3', platform: 'linux/x64',
};
const passed: RunnerOutcome = {
  status: 'passed', command: 'vitest run', exitCode: 0, passed: 67, failed: 0, skipped: 0, todo: 0, total: 67, files: 6,
};
function inputs() {
  const ratings: RatingMeasurement[] = RATING_REFERENCES.map(([id, rating]) => ({
    id: `${id} ${rating}`, publishedKg: 3300, computedKg: id === 'vegac' ? 4330 : 3300,
    converged: true, flights: 8, failsAtKg: 4350, orbit: { siteId: 'kourou' }, catalogueSources: [],
  }));
  return { generatedAt: '2026-10-02T00:00:00.000Z', provenance, regression: passed, collection: { ...passed, passed: 3, total: 3, files: 3 }, ratings, rocket: null, satellite: null };
}

describe('scientific reference reporting', () => {
  it('retains a known scientific miss when its regression is green', () => {
    const report = buildScientificReport(inputs());
    expect(report.regression.status).toBe('passed');
    expect(report.referenceSummary).toEqual({ met: 7, missed: 1, inconclusive: 0 });
    const vega = report.references.find(row => row.id === 'vegac payloadLEO')!;
    expect(vega.status).toBe('missed');
    expect(vega.knownDiscrepancy).toContain('SCI-03');
    expect(vega.relativeError).toBeCloseTo(4330 / 3300 - 1, 12);
    expect(report.reviewStatus).toBe('automated-unreviewed');
  });

  it('does not convert an unrelated regression failure into a reference miss', () => {
    const report = buildScientificReport({ ...inputs(), regression: { ...passed, status: 'failed', passed: 66, failed: 1, exitCode: 1 } });
    expect(report.regression.status).toBe('failed');
    expect(report.referenceSummary).toEqual({ met: 7, missed: 1, inconclusive: 0 });
  });

  it('retains the existing three-decimal-ratio criterion at both boundaries', () => {
    expect(ratingReferenceStatus(1250.4, 1000, true)).toBe('met');
    expect(ratingReferenceStatus(1250.6, 1000, true)).toBe('missed');
    expect(ratingReferenceStatus(749.6, 1000, true)).toBe('met');
    expect(ratingReferenceStatus(749.4, 1000, true)).toBe('missed');
    expect(ratingReferenceStatus(1000, 1000, false)).toBe('inconclusive');
    for (const [computed, published] of [[NaN, 1000], [Infinity, 1000], [1000, 0], [-1, 1000]]) {
      expect(ratingReferenceStatus(computed, published, true)).toBe('inconclusive');
    }
  });

  it('reports missing and budget-exhausted measurements as inconclusive', () => {
    const input = inputs();
    input.ratings.pop();
    input.ratings[0] = { ...input.ratings[0], converged: false, stoppedBy: 'flightBudget' };
    const report = buildScientificReport(input);
    expect(report.referenceSummary).toEqual({ met: 5, missed: 1, inconclusive: 2 });
    expect(report.references[0].reason).toContain('flightBudget');
    expect(report.references.at(-1)!.reason).toContain('No measurement');
  });

  it('invalidates reference conclusions if collection fails or source changes during the run', () => {
    for (const input of [
      { ...inputs(), collection: { ...passed, status: 'failed' as const } },
      { ...inputs(), provenance: { ...provenance, sourceStable: false, sourceDigestAfter: 'c'.repeat(64) } },
    ]) {
      const report = buildScientificReport(input);
      expect(report.referenceSummary).toEqual({ met: 0, missed: 0, inconclusive: 8 });
      expect(report.references.every(row => row.reason)).toBe(true);
    }
  });

  it('marks a dirty workspace without pretending the commit reproduces it', () => {
    const report = buildScientificReport({ ...inputs(), provenance: { ...provenance, workingTreeDirty: true } });
    expect(report.provenance.workingTreeDirty).toBe(true);
    expect(report.limitations.some(text => text.includes('commit alone does not reproduce'))).toBe(true);
    expect(report.referenceSummary.missed).toBe(1);
  });
});

describe('scientific report runner accounting', () => {
  it('rejects zero-test and missing-file success reports', () => {
    expect(runnerOutcome({ success: true, testResults: [] }, 0, 'vitest', 6).status).toBe('incomplete');
    expect(runnerOutcome({ success: true, testResults: [{ assertionResults: [{ status: 'passed' }] }] }, 0, 'vitest', 6).status).toBe('incomplete');
    expect(runnerOutcome(null, 0, 'vitest', 6).status).toBe('incomplete');
  });

  it('separates skipped and todo assertions and preserves process failures', () => {
    const result = { success: true, testResults: [{ assertionResults: ['passed', 'pending', 'skipped', 'todo'].map(status => ({ status })) }] };
    expect(runnerOutcome(result, 0, 'vitest', 1)).toMatchObject({ status: 'passed', passed: 1, failed: 0, skipped: 2, todo: 1, total: 4 });
    expect(runnerOutcome(result, 1, 'vitest', 1).status).toBe('failed');
    expect(runnerOutcome(result, null, 'vitest', 1).status).toBe('failed');
  });
});
