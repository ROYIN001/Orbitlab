/** The flight readiness review of src/design/readiness.ts in a worker (src/ui/build/readiness-job.ts). */
import { vehicleById } from '../../data/vehicles';
import { assessReadiness } from '../../design/readiness-core';
import type { ReadinessReply, ReadinessRequest } from './readiness-job';

const send = (reply: ReadinessReply): void => self.postMessage(reply);
self.onmessage = (event: MessageEvent<ReadinessRequest>): void => {
  const { id, vehicleId, spec, mission } = event.data;
  try {
    const vehicle = vehicleId !== undefined ? vehicleById(vehicleId) : spec!;
    send({ id, type: 'result', result: assessReadiness(vehicle, mission) });
  } catch (error) {
    send({ id, type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
