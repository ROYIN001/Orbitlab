/**
 * FX-1 PR1, M-BUILD-006 (D-67 (a)): a payload-rating search that did not
 * converge is not a rating. The Build section used to keep `kg` of an
 * unconverged search — the bracket's lower end, or 0 when the budget ran out
 * before the empty stack flew — as the design's rating (explore-level.ts
 * `draft.ratings`, review-panel.ts `host.rated`), and Launch then judged the
 * vehicle unable to fly. D-67 (a): the search is bounded by its flight count
 * (40), not by wall time, so the result is the same on every device; a search
 * that stops anyway (at the flight limit) is reported as unfinished, with what
 * stopped it, and is not kept.
 */
import { describe, expect, it } from 'vitest';
import { vehicleById } from '../src/data/vehicles';
import { computedRatings } from '../src/design/ratings';
import { BUILD_RATING_OPTIONS, ratingsRecord, unfinishedRatings, unfinishedRatingsText } from '../src/ui/build/ratings-job';

const electron = vehicleById('electron');

describe('an unconverged ratings search is not a rating (M-BUILD-006)', () => {
  it('a search stopped by the time budget is not kept, and says what stopped it', () => {
    let clock = 0;
    const res = computedRatings(electron, { timeBudgetMs: 10, now: () => (clock += 20) });
    expect(res.payloadLEO.converged).toBe(false);
    expect(ratingsRecord('sig', res)).toBeNull();
    const u = unfinishedRatings(res);
    expect(u).toMatchObject({ stoppedBy: 'timeBudget', flights: res.flights });
    expect(unfinishedRatingsText(u!)).toMatch(/not finished/i);
  });

  it('a search stopped by the flight budget is not kept, and says what stopped it', () => {
    const res = computedRatings(electron, { maxFlights: 3 });
    expect(res.payloadGTO.converged).toBe(false);
    expect(ratingsRecord('sig', res)).toBeNull();
    const u = unfinishedRatings(res)!;
    expect(u).toMatchObject({ stoppedBy: 'flightBudget', flights: 3 });
    expect(u.leoAtLeastKg).toBe(res.payloadLEO.kg);
    expect(unfinishedRatingsText(u)).toMatch(/3 test flights/);
  });

  it('D-67 (a): the Build search has no wall-time budget, and a converged result is kept unchanged', () => {
    let clock = 0;
    // every reading of the clock 20 s later: a slow device
    const slow = computedRatings(electron, { ...BUILD_RATING_OPTIONS, now: () => (clock += 20_000) });
    expect([slow.payloadLEO.converged, slow.payloadGTO.converged]).toEqual([true, true]);
    expect(unfinishedRatings(slow)).toBeNull();
    const fast = computedRatings(electron, BUILD_RATING_OPTIONS);
    expect([slow.payloadLEO.kg, slow.payloadGTO.kg]).toEqual([fast.payloadLEO.kg, fast.payloadGTO.kg]);
    expect(ratingsRecord('sig', slow)).toEqual({ signature: 'sig', payloadLEO: slow.payloadLEO.kg, payloadGTO: slow.payloadGTO.kg });
    expect(BUILD_RATING_OPTIONS.maxFlights).toBe(40);
  });
});
