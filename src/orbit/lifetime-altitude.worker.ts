import { altitudesForLifetimes, type AltitudesRequest } from './lifetime-altitude';
import type { AltitudesReply } from './lifetime-altitude-job';

const send = (reply: AltitudesReply): void => self.postMessage(reply);
self.onmessage = (event: MessageEvent<AltitudesRequest>): void => {
  try {
    send({ type: 'result', results: altitudesForLifetimes(event.data, (fraction) => { send({ type: 'progress', fraction }); }) });
  } catch (error) {
    send({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
