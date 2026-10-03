import { RATING_REFERENCES, ratingReferenceStatus, type ScientificValidationReport } from './report';

export const VALIDATION_REPORT_MAX_BYTES = 1024 * 1024;
export type ReportReadErrorCode = 'size' | 'json' | 'structure';
export class ReportReadError extends Error {
  constructor(readonly code: ReportReadErrorCode) { super(`Invalid scientific report: ${code}`); this.name = 'ReportReadError'; }
}
type RecordValue = Record<string, unknown>;
const fail = (): never => { throw new ReportReadError('structure'); };
const record = (value: unknown): RecordValue => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : fail();
const text = (value: unknown, max = 4096): value is string => typeof value === 'string' && value.length <= max;
const count = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= 1_000_000;
const number = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const bool = (value: unknown): value is boolean => typeof value === 'boolean';
const nullableText = (value: unknown): boolean => value === null || text(value);
const strings = (value: unknown, max = 50): value is string[] => Array.isArray(value) && value.length <= max && value.every(item => text(item));
const hash = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
const commit = (value: unknown): value is string => typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(value);
const date = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value));
const near = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a), Math.abs(b));

/** Bound all nested observations too, before inspecting the schema. Iterative to avoid stack overflow. */
function bounded(value: unknown): void {
  const pending = [{ value, depth: 0 }];
  let nodes = 0;
  while (pending.length) {
    const item = pending.pop()!;
    if (++nodes > 50_000 || item.depth > 32) fail();
    if (typeof item.value === 'string' && !text(item.value)) fail();
    if (typeof item.value === 'number' && !number(item.value)) fail();
    if (item.value === null || typeof item.value !== 'object') continue;
    const entries = Object.entries(item.value);
    if (entries.length > 10_000) fail();
    for (const [key, child] of entries) {
      if (['__proto__', 'constructor', 'prototype'].includes(key) || key.length > 512) fail();
      pending.push({ value: child, depth: item.depth + 1 });
    }
  }
}

function runner(value: unknown): RecordValue {
  const row = record(value);
  if (!['passed', 'failed', 'incomplete'].includes(row.status as string) || !text(row.command)
    || !['passed', 'failed', 'skipped', 'todo', 'total', 'files'].every(key => count(row[key]))
    || !(row.exitCode === null || (count(row.exitCode) && row.exitCode <= 255))) fail();
  if (row.total !== (row.passed as number) + (row.failed as number) + (row.skipped as number) + (row.todo as number)) fail();
  if (row.status === 'passed' && (row.exitCode !== 0 || row.failed !== 0 || !(row.passed as number > 0) || !(row.files as number > 0))) fail();
  return row;
}

/** Validate structure and internal arithmetic, not authenticity or scientific correctness.
 * The UI must continue to label the result as an unverified, user-imported report.
 */
export function readScientificReport(source: string): ScientificValidationReport {
  if (new TextEncoder().encode(source).byteLength > VALIDATION_REPORT_MAX_BYTES) throw new ReportReadError('size');
  let parsed: unknown;
  try { parsed = JSON.parse(source); } catch { throw new ReportReadError('json'); }
  bounded(parsed);
  const report = record(parsed);
  if (report.schemaVersion !== 1 || !date(report.generatedAt) || !text(report.scope)
    || report.reviewStatus !== 'automated-unreviewed' || !strings(report.limitations, 30)) fail();
  const baseline = record(report.discrepancyBaseline);
  if (!commit(baseline.commit) || !text(baseline.date, 10) || !/^\d{4}-\d{2}-\d{2}$/.test(baseline.date) || !text(baseline.reportPath)) fail();
  const provenance = record(report.provenance);
  if (!commit(provenance.commit) || !bool(provenance.workingTreeDirty) || !bool(provenance.sourceStable)
    || !hash(provenance.sourceDigest) || !hash(provenance.sourceDigestAfter)
    || !text(provenance.node, 80) || !text(provenance.platform, 80)
    || (provenance.changedSourceFiles !== undefined && !strings(provenance.changedSourceFiles, 10_000))) fail();
  if (provenance.sourceStable && (provenance.sourceDigest !== provenance.sourceDigestAfter
    || (Array.isArray(provenance.changedSourceFiles) && provenance.changedSourceFiles.length))) fail();
  runner(report.regression);
  const collection = runner(report.collection);
  const observations = record(report.observations);
  if (!Object.hasOwn(observations, 'rocket') || !Object.hasOwn(observations, 'satellite')) fail();
  if (collection.status === 'passed' && (observations.rocket === null || observations.satellite === null)) fail();
  if (!Array.isArray(report.discrepancies) || report.discrepancies.length > 30) fail();
  for (const item of report.discrepancies as unknown[]) {
    const issue = record(item);
    if (!text(issue.id, 100) || !text(issue.description) || !strings(issue.sources)
      || (issue.proposal !== undefined && !text(issue.proposal))) fail();
  }
  const ids = new Set<string>(RATING_REFERENCES.map(([vehicle, rating]) => `${vehicle} ${rating}`));
  if (!Array.isArray(report.references) || report.references.length !== ids.size) fail();
  const summary = { met: 0, missed: 0, inconclusive: 0 };
  for (const item of report.references as unknown[]) {
    const row = record(item);
    if (!text(row.id) || !ids.delete(row.id) || !['met', 'missed', 'inconclusive'].includes(row.status as string)
      || row.unit !== 'kg' || !strings(row.assumptions, 30) || !strings(row.sources)
      || !nullableText(row.knownDiscrepancy) || !nullableText(row.reason)) fail();
    const status = row.status as keyof typeof summary;
    summary[status]++;
    const tolerance = record(row.tolerance);
    if (tolerance.relative !== 0.25 || tolerance.comparison !== 'abs(round(computed / published, 3) - 1) <= 0.25'
      || tolerance.source !== 'tests/design-ratings.test.ts') fail();
    if (!(row.observed === null || (number(row.observed) && row.observed >= 0))
      || !(row.expected === null || (number(row.expected) && row.expected > 0))
      || !(row.relativeError === null || number(row.relativeError))) fail();
    if (row.observed === null || row.expected === null) {
      if (row.observed !== null || row.expected !== null || row.relativeError !== null || status !== 'inconclusive') fail();
    } else if (!number(row.relativeError) || !near(row.relativeError, (row.observed as number) / (row.expected as number) - 1)) fail();
    if (row.measurement === null) {
      if (status !== 'inconclusive' || row.observed !== null) fail();
    } else {
      const measured = record(row.measurement);
      if (measured.id !== row.id || !number(measured.computedKg) || measured.computedKg < 0
        || !number(measured.publishedKg) || measured.publishedKg <= 0 || !bool(measured.converged)
        || !count(measured.flights) || !number(measured.failsAtKg) || measured.failsAtKg < measured.computedKg
        || !strings(measured.catalogueSources) || !Object.hasOwn(measured, 'orbit')
        || (measured.stoppedBy !== undefined && !['timeBudget', 'flightBudget'].includes(measured.stoppedBy as string))
        || row.observed !== measured.computedKg || row.expected !== measured.publishedKg) fail();
      if (status !== 'inconclusive' && (!provenance.sourceStable || collection.status !== 'passed'
        || status !== ratingReferenceStatus(measured.computedKg as number, measured.publishedKg as number, measured.converged as boolean))) fail();
    }
  }
  const declared = record(report.referenceSummary);
  if (!Object.keys(summary).every(key => declared[key] === summary[key as keyof typeof summary])) fail();
  return parsed as ScientificValidationReport;
}
