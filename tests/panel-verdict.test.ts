/**
 * The pre-flight feasibility verdict (audit B12).
 *
 * `missionVerdict` is the pure half of `SetupPanel.feasibility()` so that it
 * can be pinned without a DOM — the suite runs in `environment: 'node'`, and
 * the panel needs a document the moment it is constructed.
 *
 * The specs here are **synthetic on purpose**. The first version of this
 * feature was demonstrated against `soyuz21a`'s shipping `payloadLEO`, and the
 * demonstration stopped reproducing the moment another wave revised that
 * number from 7 020 to 7 430 kg: the feature was fine, the evidence was not.
 * A verdict test should pin the rule, not a figure owned by `src/data`.
 */
import { describe, expect, it } from 'vitest';
import { missionVerdict, orbitClassOf, ratedPayload, reachableFromSite } from '../src/ui/panel';
import type { SiteExtra } from '../src/data/sites';
import type { OrbitSpec, VehicleSpec } from '../src/types';

const spec = { id: 'testbed', name: 'Testbed-1', payloadLEO: 10000, payloadGTO: 3000, payloadSSO: 8000 } as unknown as VehicleSpec;
const site = { id: 'testrange', name: 'Test Range', latitude: 28, minInclination: 28.5 } as unknown as SiteExtra;
const leo = { id: 'leo', name: 'LEO', perigee: 500e3, apogee: 500e3, inclination: 45, argPerigee: 0, raanMode: 'free' } as unknown as OrbitSpec;
const gto = { ...leo, id: 'gto', apogee: 35786e3 } as OrbitSpec;
const sso = { ...leo, id: 'sso', inclination: 97.8, raanMode: 'ltan' } as OrbitSpec;

const base = {
  spec, site, orbit: leo, payloadMass: 4000, inclinationDeg: 45,
  inclinationReachable: true as boolean | null, failureMode: 'none' as const, siteReassigned: false,
};

describe('mission verdict', () => {
  it('measures the payload against the rating of the orbit class', () => {
    expect(orbitClassOf(leo)).toBe('leo');
    expect(orbitClassOf(gto)).toBe('gto');
    expect(orbitClassOf(sso)).toBe('sso');
    expect(ratedPayload(spec, 'sso')).toEqual({ cap: 8000, cls: 'sso' });
    // no published SSO figure: judged on LEO and says which figure it used
    expect(ratedPayload({ ...spec, payloadSSO: undefined } as VehicleSpec, 'sso')).toEqual({ cap: 10000, cls: 'leo' });
  });

  it('reports a comfortable margin as ready', () => {
    const v = missionVerdict(base);
    expect(v.level).toBe('ok');
    expect(v.text).toContain('Ready to simulate');
  });

  it('fails a payload over the rating for that class', () => {
    const v = missionVerdict({ ...base, orbit: gto, payloadMass: 4000 });
    expect(v.level).toBe('fail');
    expect(v.text).toContain('exceeds');
  });

  it('warns above 90 % of the rating', () => {
    const v = missionVerdict({ ...base, payloadMass: 9500 });
    expect(v.level).toBe('warn');
    expect(v.text).toContain('Tight margin');
  });

  it('warns about an unreachable inclination and about an armed failure', () => {
    expect(reachableFromSite(site, 20)).toBe(false);
    expect(reachableFromSite(site, 97.8)).toBe(true); // 82.2° plane, seen from the south
    const inc = missionVerdict({ ...base, inclinationDeg: 20, inclinationReachable: null });
    expect(inc.level).toBe('warn');
    expect(inc.text).toContain('unreachable');
    const armed = missionVerdict({ ...base, failureMode: 'engineOut' });
    expect(armed.level).toBe('warn');
    expect(armed.text).toContain('Failure armed');
  });

  /**
   * The regression this file exists for. `siteReassigned` used to be set when
   * a vehicle change forced a different launch site and then never cleared,
   * which pinned the note to "this vehicle does not fly from the previous
   * site" for the rest of the session: every later tight margin, armed failure
   * or ready verdict was masked. The panel now clears the flag at the end of
   * `changed()`, i.e. as soon as the note has been rendered once, so the very
   * next edit reports the mission again.
   */
  it('reports the site change once and then reports the mission again', () => {
    const notice = missionVerdict({ ...base, payloadMass: 9500, siteReassigned: true });
    expect(notice.level).toBe('warn');
    expect(notice.text).toContain('does not fly from the previous site');
    // same state, notice consumed: the margin is visible again
    const after = missionVerdict({ ...base, payloadMass: 9500, siteReassigned: false });
    expect(after.text).toContain('Tight margin');
    const armed = missionVerdict({ ...base, failureMode: 'engineOut', siteReassigned: false });
    expect(armed.text).toContain('Failure armed');
  });

  it('never lets the site notice outrank a mission that cannot fly', () => {
    const over = missionVerdict({ ...base, payloadMass: 12000, siteReassigned: true });
    expect(over.level).toBe('fail');
    const none = missionVerdict({ ...base, spec: { ...spec, payloadGTO: 0 } as VehicleSpec, orbit: gto, payloadMass: 100, siteReassigned: true });
    expect(none.level).toBe('fail');
    expect(none.text).toContain('no published');
  });
});
