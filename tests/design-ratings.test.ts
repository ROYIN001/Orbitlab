/**
 * Computed payload ratings (src/design/ratings.ts): the heaviest payload a
 * vehicle is found, by flying it, to deliver to its rating orbits. Estimates.
 *
 * VALIDATION against published ratings. The bound was fixed before the first
 * run: the computed LEO rating within ±25 % of the published `payloadLEO`,
 * for six catalogue vehicles of different kinds — an R-7 with liquid
 * strap-ons flown single-shot (Soyuz-2.1a, to its RATING_ORBITS 240 km ×
 * 51.6° from Baikonur), a two-stage kerolox launcher with a restartable upper
 * stage (Falcon 9), a single-shot hypergolic two-stager (Long March 2D, to its
 * RATING_ORBITS 200 km × 41° from Jiuquan), three solid stages and a liquid
 * kick stage (Vega-C), a hydrolox core with solid strap-ons (Ariane 64), and
 * a small launcher with a kick stage (Electron); the last four to the
 * catalogue's convention, 200 km at the site's lowest inclination. ±25 %
 * because the catalogue's own figures are ±10 % (src/data/vehicles.ts), the
 * planner's loss allowance is the low end of a ±500 m/s spread, and a
 * convention orbit is not always the one the published figure was quoted to.
 * Two GTO ratings (Falcon 9, Ariane 64) are held to the same bound against
 * `payloadGTO`, flown to the fleet's own `gto` preset.
 *
 * Every result, met or missed, is recorded here and in the validation notes;
 * a miss is kept as a recorded miss, not tuned.
 *
 * RESULTS (recorded after the run; kg computed / published, ratio):
 *   Soyuz-2.1a LEO   7 021 /  7 430   0.945   met
 *   Falcon 9 LEO    20 031 / 22 800   0.879   met
 *   Long March 2D   3 165 /  3 500   0.904   met
 *   Vega-C LEO       4 330 /  3 300   1.312   MISSED (31 % over; kept as a miss)
 *   Ariane 64 LEO   26 274 / 21 600   1.216   met
 *   Electron LEO       315 /    300   1.050   met
 *   Falcon 9 GTO     6 832 /  8 300   0.823   met
 *   Ariane 64 GTO   13 328 / 11 500   1.159   met
 * The LEO ratings are bounded by the probe flight (`noInsertion` just above
 * each); the GTO ratings by the burns after the insertion
 * (`burnsAfterInsertion`). Vega-C's miss is not explained by a measurement
 * here; candidates are the impulsive count of AVUM+'s burns (2.42 kN under a
 * 4 t payload burns for minutes) and the published 3 300 kg being quoted to
 * another orbit than the 200 km convention. Measured at review, after the
 * fix below: to its published reference orbit, 700 km × 98.2° from Kourou,
 * Vega-C rates 2 906 kg against the published 2 300 kg (`payloadSSO`), 1.26,
 * bounded by the burns after the insertion; so the orbit convention does not
 * explain the miss on its own, and the model is generous with Vega-C at both.
 *
 * FIXED AT REVIEW: `delivers` set only the typed rating of `ref.rating`'s
 * class to the payload, but the verdict files an orbit by its own reading;
 * a LEO rating orbit at 95° or more is SSO to it and was capped by the typed
 * `payloadSSO` (Vega-C to 700 km × 98.2° came out 2 297 kg, "overCapacity",
 * i.e. its own typed 2 300 kg). None of the rows below is such an orbit, so
 * none moved.
 *
 * AN EARLIER METHOD, RECORDED: the first run judged "delivers" by the verdict
 * and the probe alone. It gave the same LEO figures, but Falcon 9 GTO
 * 17 005 kg (2.05 ×) and Ariane 64 GTO 26 303 kg (2.29 ×): about what each
 * lifts to LEO, because the probe stops at the parking orbit and the
 * verdict's burn budget counts the whole last stage as full after the ascent.
 * The method was changed after that result (src/design/ratings.ts: the Δv
 * left at the probe's stop must cover the planned burns); the ±25 % bound
 * was not.
 *
 * Runtime: about 7 s for the eight ratings above (each call rates LEO and
 * GTO, 6–9 probe flights a rating, 0.15–1.9 s a vehicle), 10–12 s the whole
 * file on the machine it was written on.
 */
import { describe, expect, it } from 'vitest';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { CONVENTION_LEO_ALTITUDE, computedRatings, delivers, ratingOrbits } from '../src/design/ratings';
import { remix } from '../src/design/remix';
import { sizeVehicle } from '../src/design/sizing';
import { assemble } from '../src/design/assemble';

describe('computed ratings: the rating orbits', () => {
  it('takes a vehicle’s RATING_ORBITS entry, its origin’s for a remix, and the catalogue’s convention otherwise', () => {
    const soyuz = ratingOrbits(vehicleById('soyuz21a'));
    expect([soyuz.LEO.from, soyuz.LEO.siteId, soyuz.LEO.orbit.perigee, soyuz.LEO.orbit.apogee, soyuz.LEO.orbit.inclination]).toEqual(['ratingOrbits', 'baikonur', 240e3, 240e3, 51.6]);
    const copy = ratingOrbits(remix(vehicleById('soyuz21a'), [], 'soyuz-x', 'X').spec);
    expect(copy.LEO).toEqual(soyuz.LEO);
    const f9 = ratingOrbits(vehicleById('falcon9'));
    expect([f9.LEO.from, f9.LEO.siteId, f9.LEO.orbit.perigee, f9.LEO.orbit.inclination]).toEqual(['convention', 'cape', CONVENTION_LEO_ALTITUDE, 'site']);
    const gto = orbitById('gto');
    expect([f9.GTO.from, f9.GTO.orbit.perigee, f9.GTO.orbit.apogee, f9.GTO.orbit.inclination]).toEqual(['convention', gto.perigee, gto.apogee, 'site']);
    // the orbits carry the hand-set preset's id and name: nothing new to translate
    expect([f9.LEO.orbit.id, f9.GTO.orbit.id]).toEqual(['custom', 'gto']);
  });
});

describe('computed ratings: what delivers', () => {
  it('lets no typed rating take part, whatever class the verdict files the orbit under', () => {
    // Vega-C's reference orbit, 700 km × 98.2°, which the verdict files as SSO:
    // 2 400 kg is over the typed payloadSSO (2 300 kg), and is not what stops it
    const v = vehicleById('vegac');
    const ref = { rating: 'LEO' as const, siteId: 'kourou', from: 'ratingOrbits' as const,
      orbit: { ...orbitById('custom'), perigee: 700e3, apogee: 700e3, inclination: 98.2, argPerigee: 0, raanMode: 'free' as const } };
    const r = delivers(v, ref, 2400);
    expect(r.cause).not.toBe('overCapacity');
    // measured: delivered up to about 2 900 kg
    expect(r.ok).toBe(true);
  }, 60_000);
});

describe('computed ratings: the search', () => {
  it('stops at its time and flight budgets and says so', () => {
    let clock = 0;
    const timed = computedRatings(vehicleById('electron'), { timeBudgetMs: 10, now: () => (clock += 20) });
    expect([timed.payloadLEO.converged, timed.payloadLEO.stoppedBy]).toEqual([false, 'timeBudget']);
    expect(timed.estimate).toBe(true);
    const counted = computedRatings(vehicleById('electron'), { maxFlights: 3 });
    expect([counted.payloadLEO.converged, counted.payloadLEO.stoppedBy, counted.flights <= 3]).toEqual([false, 'flightBudget', true]);
    // what it hands back as a rating was flown and delivered
    const ref = ratingOrbits(vehicleById('electron')).LEO;
    expect(delivers(vehicleById('electron'), ref, counted.payloadLEO.kg).ok).toBe(true);
  });

  it('rates a sized vehicle of one’s own, and the assembly takes the ratings', () => {
    const sized = sizeVehicle({ payloadKg: 1000, orbit: orbitById('leo'), siteId: 'kourou', extraDvMps: 500,
      stages: [{ enginePart: 'rutherford', epsilon: 0.08, diameterM: 1.8, targetTW: 1.3 }, { enginePart: 'rutherford-vac', epsilon: 0.09, diameterM: 1.8, targetTW: 0.7 }] });
    const r = computedRatings(sized.spec);
    expect(r.payloadLEO.converged).toBe(true);
    // sized for 1 t to 500 km with margin: it carries at least that to the 200 km rating orbit
    expect(r.payloadLEO.kg).toBeGreaterThanOrEqual(1000);
    const rated = assemble({ ...sized.design, ratings: { payloadLEO: r.payloadLEO.kg, payloadGTO: r.payloadGTO.kg } });
    expect(rated.estimates.map((e) => e.code)).not.toContain('noRatings');
    expect(rated.spec.payloadLEO).toBe(r.payloadLEO.kg);
    console.log(`ratings, sized 1 t launcher: LEO ${r.payloadLEO.kg} kg, GTO ${r.payloadGTO.kg} kg, ${r.flights} flights, ${Math.round(r.elapsedMs)} ms`);
  }, 60_000);
});

describe('computed ratings: validated against published ratings (bound ±25 %, fixed first)', () => {
  const rows: [string, 'payloadLEO' | 'payloadGTO'][] = [
    ['soyuz21a', 'payloadLEO'], ['falcon9', 'payloadLEO'], ['longmarch2d', 'payloadLEO'], ['vegac', 'payloadLEO'],
    ['ariane64', 'payloadLEO'], ['electron', 'payloadLEO'], ['falcon9', 'payloadGTO'], ['ariane64', 'payloadGTO'],
  ];
  it('computes each rating and records it against the published figure', () => {
    const results: Record<string, { published: number; computed: number; ratio: number; flights: number; ms: number; converged: boolean; cause?: string }> = {};
    for (const [id, which] of rows) {
      const v = vehicleById(id);
      const r = computedRatings(v);
      const c = r[which];
      results[`${id} ${which}`] = { published: v[which], computed: c.kg, ratio: +(c.kg / v[which]).toFixed(3), flights: c.flights,
        ms: Math.round(r.elapsedMs), converged: c.converged, ...(c.failCause ? { cause: c.failCause } : {}) };
      expect([id, which, c.converged]).toEqual([id, which, true]);
    }
    console.log(`ratings validation: ${JSON.stringify(results)}`);
    const within = Object.fromEntries(Object.entries(results).map(([k, r]) => [k, Math.abs(r.ratio - 1) <= 0.25]));
    expect(within).toEqual(EXPECTED_WITHIN);
  }, 240_000);
});

/** Which rows meet the ±25 % bound (all were expected to; the recorded misses are marked). */
const EXPECTED_WITHIN: Record<string, boolean> = {
  // Vega-C: 4 330 kg against 3 300 kg, 31 % over — a recorded miss (see the file comment)
  'soyuz21a payloadLEO': true, 'falcon9 payloadLEO': true, 'longmarch2d payloadLEO': true, 'vegac payloadLEO': false,
  'ariane64 payloadLEO': true, 'electron payloadLEO': true, 'falcon9 payloadGTO': true, 'ariane64 payloadGTO': true,
};
