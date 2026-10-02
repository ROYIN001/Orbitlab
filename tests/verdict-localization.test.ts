/** A worker result must use the language selected when it is displayed. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { vehicleById } from '../src/data/vehicles';
import { siteById } from '../src/data/sites';
import { satelliteById } from '../src/data/satellites';
import { orbitById } from '../src/data/orbits';
import { assessMission, type VerdictInput } from '../src/config/verdict-core';
import { localizeVerdict } from '../src/config/verdict';
import { setLang, t, type Lang } from '../src/i18n';
import { planMission } from '../src/physics/mission';
import { DEFAULT_FAILURE, guidanceForVehicle } from '../src/physics/defaults';
import { localizeReadiness } from '../src/design/readiness';
import { assessReadiness } from '../src/design/readiness-core';

beforeEach(() => vi.stubGlobal('document', { documentElement: { lang: 'en' } }));
afterEach(() => { setLang('en'); vi.unstubAllGlobals(); });

const spec = vehicleById('falcon9');
const site = siteById('cape');
const satellite = satelliteById('cubesats');
const launchTime = new Date('2026-10-02T12:00:00Z');
const mission = {
  vehicleId: spec.id, satelliteId: satellite.id, siteId: site.id, orbit: orbitById('leo'), launchTime,
  guidance: guidanceForVehicle(spec), guidanceResolved: true,
  failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: 1000,
};
const input: VerdictInput = {
  spec, site, satellite, orbit: mission.orbit, payloadMass: 30000,
  inclinationDeg: 90, plan: null, failureMode: 'engineOut', siteReassigned: false,
};
const LANGUAGES: Lang[] = ['en', 'ru', 'th'];

describe('worker verdict localization', () => {
  it('preserves every simultaneous warning and formats masses in the current language', () => {
    const plan = planMission(mission, site, spec);
    // An explicit plane miss combines with the armed failure and overload.
    plan.target.raan = plan.raanExpected + Math.PI / 2;
    const result = structuredClone(assessMission({ ...input, plan }));
    expect([result.level, result.cause, result.offWindow]).toEqual(['fail', 'overCapacity', true]);
    const texts = new Set<string>();
    for (const lang of LANGUAGES) {
      setLang(lang);
      const verdict = localizeVerdict(result);
      const format = (n: number): string => n.toLocaleString(lang, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      expect(verdict.text).toBe([
        t('setup.verdict.failureArmed', { mode: t('setup.fail.engineOut') }),
        t('setup.verdict.offWindow', { error: '90.0' }),
        t('setup.verdict.overCapacity', {
          mass: format(30000), cap: format(spec.payloadLEO), class: t('orbit.class.leo'), vehicle: spec.name,
        }),
      ].join(' '));
      texts.add(verdict.text);
      expect([verdict.level, verdict.cause, verdict.offWindow]).toEqual(['fail', 'overCapacity', true]);
    }
    expect(texts.size).toBe(3);
  });

  it('localizes a previously computed readiness result without changing its flight data', () => {
    const assessment = structuredClone(assessReadiness(spec, mission));
    const texts = new Set<string>();
    for (const lang of LANGUAGES) {
      setLang(lang);
      const review = localizeReadiness(assessment);
      expect(review.plan).toBe(assessment.plan);
      expect(review.insertion).toBe(assessment.insertion);
      expect(review.items).toBe(assessment.items);
      expect(review.canFly).toBe(assessment.canFly);
      expect(review.verdict?.text).not.toMatch(/setup\.verdict|\{\w+\}/);
      texts.add(review.verdict!.text);
    }
    expect(texts.size).toBe(3);
  });

  it('keeps an unknown launch site’s supplied name as a fallback', () => {
    const result = assessMission({ ...input, payloadMass: 1000, failureMode: 'none',
      inclinationDeg: site.minInclination, siteReassigned: true,
      site: { ...site, id: 'test-site', name: 'A new launch site' },
    });
    for (const lang of LANGUAGES) {
      setLang(lang);
      expect(localizeVerdict(result).text).toBe(t('setup.verdict.siteChanged', { site: 'A new launch site' }));
    }
  });
});
