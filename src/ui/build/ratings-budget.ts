/** The Build section's ratings-search budget, apart so the worker (ratings.worker.ts) takes no screen text with it. */
import type { RatingOptions } from '../../design/ratings';

/**
 * The Build section's search (D-67 (a)): bounded by its flight count, the
 * existing 40, and not by wall time, so a design gets the same ratings on a
 * school tablet as on a laptop — a slow device waits longer, with the
 * progress line and Stop. Never a lower bound kept as a rating (M-BUILD-006).
 */
export const BUILD_RATING_OPTIONS = { timeBudgetMs: Number.POSITIVE_INFINITY, maxFlights: 40 } as const satisfies RatingOptions;
