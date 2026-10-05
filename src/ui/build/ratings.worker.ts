/** The ratings search of src/design/ratings.ts in a worker (src/ui/build/ratings-job.ts). */
import type { VehicleSpec } from '../../types';
import { computedRatings } from '../../design/ratings';
import type { RatingsReply } from './ratings-job';
import { BUILD_RATING_OPTIONS } from './ratings-budget';

const send = (reply: RatingsReply): void => self.postMessage(reply);
self.onmessage = (event: MessageEvent<VehicleSpec>): void => {
  try {
    const result = computedRatings(event.data, { ...BUILD_RATING_OPTIONS, onFlight: (rating, flights) => send({ type: 'progress', rating, flights }) });
    send({ type: 'result', result });
  } catch (error) {
    send({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
