/**
 * The satellite builder's own epoch (roadmap D06; the integration of Phase 4
 * stage 3, track B's open problem 3): the figures are read on a design date
 * the workspace holds — shown, editable, today unless set, kept with the
 * draft — not on the Launch section's launch time, which moved them between
 * visits. src/design/satellite-model.ts (`designDateJd`, the kept draft) and
 * src/ui/build/satellite-workspace.ts, run here over a stand-in storage.
 *
 * Exact checks, written before their first run: a date is its day's 0 h UTC
 * as a Julian date; a day that is not one (or outside 1957–2200) is refused;
 * the draft keeps the date and a draft kept before it had one restores
 * without it; the workspace's figures and its lifetime run's start are
 * `designFigures` on that date, the same design on the same date giving the
 * same figures whatever day it is now, and a new date moving them.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { julianDate } from '../src/physics/orbital';
import {
  SATELLITE_DRAFT_KEY, designDateJd, designDateOf, designFigures, designFromTemplate, keptSatelliteText, restoreKeptSatellite,
} from '../src/design/satellite-model';
import { SatelliteWorkspace } from '../src/ui/build/satellite-workspace';

describe('the design date', () => {
  it('is its day\'s start as a Julian date, and only a real day of 1957–2200', () => {
    expect(designDateJd('2026-10-01')).toBe(julianDate(new Date(Date.UTC(2026, 9, 1))));
    expect(designDateJd('2000-01-01')).toBe(2451544.5);
    for (const bad of ['', '2026-02-30', '2026-13-01', '2026-1-1', '1956-12-31', '2201-01-01', '2026-10-01T00:00', 'today']) expect(designDateJd(bad)).toBeNull();
    expect(designDateOf(new Date(Date.UTC(2026, 9, 1, 23, 59)))).toBe('2026-10-01');
  });

  it('is kept with the draft, and a draft kept before it restores without one', () => {
    const d = designFromTemplate('napa2', 's1', 'Mine');
    expect(restoreKeptSatellite(keptSatelliteText({ design: d, recordId: null, defaultName: 'x', date: '2027-03-20' }))!.date).toBe('2027-03-20');
    expect(restoreKeptSatellite(keptSatelliteText({ design: d, recordId: null, defaultName: 'x' }))!.date).toBeUndefined();
    // a date that is not a day is dropped, the design kept
    const odd = restoreKeptSatellite(keptSatelliteText({ design: d, recordId: null, defaultName: 'x', date: '2027-02-30' }))!;
    expect(odd.date).toBeUndefined();
    expect(odd.design).toEqual(d);
  });
});

describe('the workspace\'s figures on the design date', () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 9, 1, 15, 30)));
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); },
    });
    vi.stubGlobal('addEventListener', () => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts on today, works the figures out on it, and keeps a new date with the draft', () => {
    const ws = new SatelliteWorkspace();
    expect(ws.date).toBe('2026-10-01');
    expect(ws.jd()).toBe(designDateJd('2026-10-01'));
    const first = ws.worked().fig!;
    expect(first).toEqual(designFigures(ws.design, designDateJd('2026-10-01')!));
    expect(ws.setDate('2026-06-21')).toBe(true);
    const later = ws.worked().fig!;
    expect(later.jd).toBe(designDateJd('2026-06-21'));
    expect(later).toEqual(designFigures(ws.design, designDateJd('2026-06-21')!));
    // the date moves what depends on the Sun, and nothing is left stale
    expect(later.eclipse.beta.value).not.toBe(first.eclipse.beta.value);
    expect(ws.worked().stale).toBe(false);
    // a day that is not one changes nothing
    expect(ws.setDate('2026-06-31')).toBe(false);
    expect(ws.date).toBe('2026-06-21');
    // kept with the draft a moment later, and read back the next visit, on another day
    vi.advanceTimersByTime(1000);
    expect(JSON.parse(store.get(SATELLITE_DRAFT_KEY)!).date).toBe('2026-06-21');
    vi.setSystemTime(new Date(Date.UTC(2026, 11, 25, 9)));
    const next = new SatelliteWorkspace();
    expect(next.date).toBe('2026-06-21');
    expect(next.worked().fig).toEqual(later);
  });

  it('keeps the design date when another design is opened', () => {
    const ws = new SatelliteWorkspace();
    ws.setDate('2027-01-15');
    ws.replace({ design: designFromTemplate('theos2', 's2', 'T'), recordId: null, defaultName: 'T' });
    expect(ws.date).toBe('2027-01-15');
    expect(ws.worked().fig!.jd).toBe(designDateJd('2027-01-15'));
  });
});
