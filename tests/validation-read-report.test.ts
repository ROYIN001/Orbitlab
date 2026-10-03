import { describe, expect, it } from 'vitest';
import { readScientificReport, ReportReadError, VALIDATION_REPORT_MAX_BYTES } from '../src/validation/read-report';
import { buildScientificReport, RATING_REFERENCES, type ScientificValidationReport } from '../src/validation/report';
import { validationEn, validationRu, validationTh } from '../src/i18n/validation';

function fixture(): ScientificValidationReport {
  return buildScientificReport({
    generatedAt: '2026-10-02T12:00:00.000Z',
    provenance: {
      commit: 'a'.repeat(40), sourceDigest: 'b'.repeat(64), sourceDigestAfter: 'b'.repeat(64),
      sourceStable: true, workingTreeDirty: false, node: 'v22.23.3', platform: 'linux/x64',
    },
    regression: { status: 'passed', command: 'vitest run', exitCode: 0, passed: 67, failed: 0, skipped: 0, todo: 0, total: 67, files: 6 },
    collection: { status: 'passed', command: 'vitest run collectors', exitCode: 0, passed: 3, failed: 0, skipped: 0, todo: 0, total: 3, files: 3 },
    ratings: RATING_REFERENCES.map(([vehicle, rating]) => ({
      id: `${vehicle} ${rating}`, publishedKg: 1000, computedKg: vehicle === 'vegac' ? 1312 : 1000,
      converged: true, flights: 8, failsAtKg: 1500, orbit: { siteId: 'kourou' }, catalogueSources: [],
    })),
    rocket: { launchTime: '2026-09-15T12:00:00Z' }, satellite: { budgets: [] },
  });
}
const read = (value: unknown): ScientificValidationReport => readScientificReport(JSON.stringify(value));

describe('local scientific report reader', () => {
  it('accepts generated reports while keeping a known miss independent of passing regressions', () => {
    const report = read(fixture());
    expect(report.regression.passed).toBe(67);
    expect(report.referenceSummary).toEqual({ met: 7, missed: 1, inconclusive: 0 });
    expect(report.reviewStatus).toBe('automated-unreviewed');
  });

  it('accepts failed collection and inconclusive references without promoting their status', () => {
    const report = fixture();
    report.collection = { ...report.collection, status: 'failed', exitCode: 1, failed: 1, passed: 2 };
    report.references.forEach(row => { row.status = 'inconclusive'; row.reason = 'Collector failed.'; });
    report.referenceSummary = { met: 0, missed: 0, inconclusive: 8 };
    expect(read(report).referenceSummary.inconclusive).toBe(8);
  });

  it('rejects a forged summary, changed criterion and false acceptance even if the counts look green', () => {
    for (const mutate of [
      (report: ScientificValidationReport) => { report.referenceSummary = { met: 8, missed: 0, inconclusive: 0 }; },
      (report: ScientificValidationReport) => { report.references[3].status = 'met'; report.referenceSummary = { met: 8, missed: 0, inconclusive: 0 }; },
      (report: ScientificValidationReport) => { report.references[3].tolerance.relative = 0.5; },
      (report: ScientificValidationReport) => { report.references[3].relativeError = 0.1; },
      (report: ScientificValidationReport) => { report.references[0].measurement!.converged = false; },
    ]) {
      const report = fixture(); mutate(report);
      expect(() => read(report)).toThrow(ReportReadError);
    }
  });

  it('rejects inconsistent runner accounting and invalid source stability', () => {
    for (const mutate of [
      (report: ScientificValidationReport) => { report.regression.total++; },
      (report: ScientificValidationReport) => { report.regression.skipped = -1; },
      (report: ScientificValidationReport) => { report.collection.exitCode = 1; },
      (report: ScientificValidationReport) => { report.provenance.sourceDigestAfter = 'c'.repeat(64); },
      (report: ScientificValidationReport) => { report.provenance.changedSourceFiles = ['src/design/sizing.ts']; },
      (report: ScientificValidationReport) => { report.provenance.commit = 'dev'; },
      (report: ScientificValidationReport) => { report.provenance.sourceStable = false; },
    ]) {
      const report = fixture(); mutate(report);
      expect(() => read(report)).toThrow(ReportReadError);
    }
  });

  it('requires all eight distinct reference rows and a supported unreviewed schema', () => {
    const duplicate = fixture(); duplicate.references[0] = duplicate.references[1];
    expect(() => read(duplicate)).toThrow(ReportReadError);
    const missing = fixture(); missing.references.pop();
    expect(() => read(missing)).toThrow(ReportReadError);
    expect(() => read({ ...fixture(), schemaVersion: 2 })).toThrow(ReportReadError);
    expect(() => read({ ...fixture(), reviewStatus: 'human-reviewed' })).toThrow(ReportReadError);
    expect(() => read({ ...fixture(), observations: null })).toThrow(ReportReadError);
    expect(() => read({ ...fixture(), observations: { rocket: null, satellite: {} } })).toThrow(ReportReadError);
  });

  it('rejects oversized UTF-8, malformed JSON, dangerous keys and excessive nesting', () => {
    expect(() => readScientificReport('€'.repeat(Math.ceil(VALIDATION_REPORT_MAX_BYTES / 3)))).toThrow('size');
    expect(() => readScientificReport('{broken')).toThrow('json');
    expect(() => readScientificReport('{"__proto__":{"polluted":true}}')).toThrow('structure');
    const report = fixture();
    let nested: unknown = {};
    for (let level = 0; level < 40; level++) nested = { next: nested };
    report.observations.rocket = nested;
    expect(() => read(report)).toThrow('structure');
    report.observations.rocket = Array(10_001).fill(null);
    expect(() => read(report)).toThrow('structure');
  });

  it('treats imported prose and URLs as untrusted data, without altering them into executable content', () => {
    const report = fixture();
    report.scope = '<img src=x onerror=alert(1)>';
    report.references[0].sources = ['javascript:alert(1)'];
    const imported = read(report);
    expect(imported.scope).toBe(report.scope);
    expect(imported.references[0].sources).toEqual(['javascript:alert(1)']);
    // Validation does not authenticate text or links; the UI only renders text
    // and uses compiled-in source links from the historical baseline.
  });
});

describe('scientific trust panel translations', () => {
  it('keeps every key and interpolation parameter aligned in EN/RU/TH', () => {
    const params = (text: string): string[] => [...text.matchAll(/\{([^}]+)\}/g)].map(match => match[1]).sort();
    for (const dictionary of [validationRu, validationTh]) {
      expect(Object.keys(dictionary).sort()).toEqual(Object.keys(validationEn).sort());
      for (const key of Object.keys(validationEn)) {
        expect(dictionary[key].trim().length).toBeGreaterThan(0);
        expect(params(dictionary[key]), key).toEqual(params(validationEn[key]));
      }
    }
  });
});
