/** Scientific observations and regression execution are deliberately independent.
 * This module has no filesystem or physics imports so reports can also be read by UI.
 */
export type ReferenceStatus = 'met' | 'missed' | 'inconclusive';
export interface ValidationProvenance {
  commit: string;
  workingTreeDirty: boolean;
  /** SHA-256 of the path and contents of source, tests, scripts and build manifests. */
  sourceDigest: string;
  sourceDigestAfter: string;
  sourceStable: boolean;
  changedSourceFiles?: string[];
  node: string;
  platform: string;
}
export interface RunnerOutcome {
  status: 'passed' | 'failed' | 'incomplete';
  command: string;
  exitCode: number | null;
  passed: number;
  failed: number;
  skipped: number;
  todo: number;
  total: number;
  files: number;
}
export const RATING_REFERENCES = [
  ['soyuz21a', 'payloadLEO'], ['falcon9', 'payloadLEO'], ['longmarch2d', 'payloadLEO'], ['vegac', 'payloadLEO'],
  ['ariane64', 'payloadLEO'], ['electron', 'payloadLEO'], ['falcon9', 'payloadGTO'], ['ariane64', 'payloadGTO'],
] as const;
export interface RatingMeasurement {
  id: string;
  publishedKg: number;
  computedKg: number;
  converged: boolean;
  stoppedBy?: string;
  flights: number;
  failsAtKg: number;
  orbit: unknown;
  catalogueSources: string[];
}
export interface ReferenceComparison {
  id: string;
  status: ReferenceStatus;
  observed: number | null;
  expected: number | null;
  unit: 'kg';
  relativeError: number | null;
  tolerance: { relative: number; comparison: string; source: string };
  measurement: RatingMeasurement | null;
  assumptions: string[];
  sources: string[];
  knownDiscrepancy: string | null;
  reason: string | null;
}
export interface ScientificValidationReport {
  schemaVersion: 1;
  generatedAt: string;
  scope: string;
  reviewStatus: 'automated-unreviewed';
  discrepancyBaseline: { commit: string; date: string; reportPath: string };
  provenance: ValidationProvenance;
  regression: RunnerOutcome;
  collection: RunnerOutcome;
  references: ReferenceComparison[];
  referenceSummary: Record<ReferenceStatus, number>;
  /** Raw collector output preserves inputs, numerical precision and limitations. */
  observations: { rocket: unknown; satellite: unknown };
  discrepancies: { id: string; description: string; sources: string[]; proposal?: string }[];
  limitations: string[];
}

/** Historical source-backed findings; current measurements live in references/observations. */
export const SCIENTIFIC_BASELINE = {
  commit: '91ee372e222e3c0496c57f6590e1ccece03a9079',
  date: '2026-10-02',
  reportPath: 'docs/stage1-2026-10-02/README.md',
} as const;
export const KNOWN_SCIENTIFIC_DISCREPANCIES: ScientificValidationReport['discrepancies'] = [
  {
    id: 'SCI-01',
    description: 'Stage 1 recorded that sizing charged fairing mass only to the first-stage delta-v equation; deltaVRemaining also discarded it at the first staging boundary or immediately on an upper stage. Runtime carried attached fairing mass until its actual release rule. The collected insertion and full-target results are different requirements.',
    sources: ['src/design/sizing.ts', 'src/physics/vehicle.ts', 'src/physics/sim/staging.ts', 'tests/design-sizing.test.ts', 'scripts/audit-stage1/rocket.test.ts'],
    proposal: 'Before changing physics, introduce an explicit carried-fairing burn phase in the sizing/budget calculation. Evaluate a conservative retained-fairing bound, then a stage mass split at a flown release event; keep the runtime release rule and reference tolerances unchanged. Fly all three original requests to the requested target, report infeasibility, and evaluate engine-count discontinuities. A blanket +500 m/s and resizing without fairing do not establish an isolated fairing loss or successful target delivery.',
  },
  {
    id: 'SCI-02', description: 'Stage 1 recorded Build using mean-Sun local time while Launch used true solar right ascension. Existing launch regressions check node error after an equation-of-time correction. Raw and corrected errors remain distinct in satellite observations.',
    sources: ['src/orbit/kepler.ts', 'src/physics/mission.ts', 'tests/d06-satellite-launch.test.ts', 'scripts/audit-stage1/satellite.test.ts'],
  },
  {
    id: 'SCI-03', description: 'Vega-C reference-rating disagreement is recorded separately from expected-discrepancy regression success. Its fine SSO predicate bracket is diagnostic and must not replace the production rating search.',
    sources: ['tests/design-ratings.test.ts', 'src/design/ratings.ts', 'scripts/audit-stage1/rocket.test.ts'],
  },
  {
    id: 'CONTENT-01', description: 'Communications, weather and science templates have previously recorded negative delta-v margins and existing warnings. Current measured budgets are observations, not independent reference acceptance tests.',
    sources: ['tests/d06-satellite-templates.test.ts', 'src/design/satellite-model.ts', 'scripts/audit-stage1/satellite.test.ts'],
  },
];

/** The original rating test compares the ratio rounded to three decimals.
 * Preserve that exact existing criterion, including its boundary behavior.
 */
export function ratingReferenceStatus(computed: number, published: number, converged: boolean): ReferenceStatus {
  if (!converged || !Number.isFinite(computed) || computed < 0 || !Number.isFinite(published) || published <= 0) return 'inconclusive';
  return Math.abs(+(computed / published).toFixed(3) - 1) <= 0.25 ? 'met' : 'missed';
}

export function buildScientificReport(input: {
  generatedAt: string;
  provenance: ValidationProvenance;
  regression: RunnerOutcome;
  collection: RunnerOutcome;
  ratings: RatingMeasurement[];
  rocket: unknown;
  satellite: unknown;
}): ScientificValidationReport {
  const trustworthy = input.provenance.sourceStable && input.collection.status === 'passed';
  const references: ReferenceComparison[] = RATING_REFERENCES.map(([vehicle, rating]) => {
    const id = `${vehicle} ${rating}`;
    const measurement = input.ratings.find(row => row.id === id) ?? null;
    const status = trustworthy && measurement
      ? ratingReferenceStatus(measurement.computedKg, measurement.publishedKg, measurement.converged)
      : 'inconclusive';
    const numerical = measurement && Number.isFinite(measurement.computedKg) && Number.isFinite(measurement.publishedKg) && measurement.publishedKg > 0;
    return {
      id, status, observed: numerical ? measurement.computedKg : null,
      expected: numerical ? measurement.publishedKg : null, unit: 'kg',
      relativeError: numerical ? measurement.computedKg / measurement.publishedKg - 1 : null,
      tolerance: { relative: 0.25, comparison: 'abs(round(computed / published, 3) - 1) <= 0.25', source: 'tests/design-ratings.test.ts' },
      measurement,
      assumptions: [
        'Existing computedRatings/delivers predicate: insertion probe plus ideal post-insertion burn budget; not a full finite-burn delivery validation.',
        'Existing ratingOrbits definitions and default search resolution; 40-flight budget with no wall-time cutoff.',
        'Launch epoch 2026-09-15T12:00:00.000Z; production rating guidance, point-mass dynamics, calm wind and failures off.',
        'Catalogue reference values are reused from this source snapshot, not independently reacquired or reviewed.',
      ],
      sources: ['tests/design-ratings.test.ts', 'src/design/ratings.ts', 'src/data/vehicles.ts', ...(measurement?.catalogueSources ?? [])],
      knownDiscrepancy: vehicle === 'vegac' ? 'SCI-03: the previously observed Vega-C LEO overestimate remains a reference miss when outside the unchanged criterion. The regression test explicitly expects the known miss.' : null,
      reason: !input.provenance.sourceStable ? 'Source changed during collection.'
        : input.collection.status !== 'passed' ? 'Evidence collection did not complete successfully.'
          : !measurement ? 'No measurement was produced for this reference.'
            : status === 'inconclusive' ? `Search or measurement incomplete${measurement.stoppedBy ? ` (${measurement.stoppedBy})` : ''}.` : null,
    };
  });
  return {
    schemaVersion: 1, generatedAt: input.generatedAt,
    scope: 'Eight published payload-rating comparisons, six selected scientific regression files, and Stage 1 sizing/satellite observations.',
    reviewStatus: 'automated-unreviewed', discrepancyBaseline: { ...SCIENTIFIC_BASELINE }, provenance: input.provenance,
    regression: input.regression, collection: input.collection, references,
    referenceSummary: {
      met: references.filter(row => row.status === 'met').length,
      missed: references.filter(row => row.status === 'missed').length,
      inconclusive: references.filter(row => row.status === 'inconclusive').length,
    },
    observations: { rocket: input.rocket, satellite: input.satellite },
    discrepancies: KNOWN_SCIENTIFIC_DISCREPANCIES.map(row => ({ ...row, sources: [...row.sources] })),
    limitations: [
      'Regression success means the selected assertions completed; some assert known discrepancies. It does not imply that all scientific reference requirements are met.',
      'Collector success means observations were recorded. Sizing insertion, full target delivery, template feasibility and raw versus corrected node errors must be interpreted separately.',
      'This bounded report does not run all heavy timeline, Falcon 9, six-degree-of-freedom, browser or physical-device validation suites.',
      'No teacher, native-speaker, participant or independent scientific review is claimed.',
      ...(input.provenance.workingTreeDirty ? ['The measured workspace contains uncommitted changes. The commit alone does not reproduce it; retain the source snapshot matching sourceDigest.'] : []),
      ...(!input.provenance.sourceStable ? ['Source changed during collection; reference results are inconclusive and the run must be repeated on stable source.'] : []),
    ],
  };
}

/** Interpret actual assertion results, keeping skipped/todo distinct and zero-test runs incomplete. */
export function runnerOutcome(result: {
  success?: boolean;
  testResults?: { assertionResults?: { status?: string }[] }[];
} | null, exitCode: number | null, command: string, expectedFiles: number): RunnerOutcome {
  const assertions = result?.testResults?.flatMap(file => file.assertionResults ?? []) ?? [];
  const passed = assertions.filter(row => row.status === 'passed').length;
  const failed = assertions.filter(row => row.status === 'failed').length;
  const skipped = assertions.filter(row => row.status === 'pending' || row.status === 'skipped' || row.status === 'disabled').length;
  const todo = assertions.filter(row => row.status === 'todo').length;
  const files = result?.testResults?.length ?? 0;
  const complete = passed > 0 && files === expectedFiles && assertions.length === passed + failed + skipped + todo;
  return {
    status: exitCode !== 0 || failed > 0 || result?.success === false ? 'failed'
      : complete && result?.success === true ? 'passed' : 'incomplete',
    command, exitCode, passed, failed, skipped, todo, total: assertions.length, files,
  };
}
