import { propagate } from './propagator/propagate';
import type { LifetimeReply, LifetimeRequest } from './lifetime-job';

const send = (reply: LifetimeReply): void => self.postMessage(reply);
self.onmessage = (event: MessageEvent<LifetimeRequest>): void => {
  const { r0, v0, jd0, options } = event.data;
  try {
    const result = propagate(r0, v0, jd0, { ...options, onProgress: (fraction) => { send({ type: 'progress', fraction }); } });
    send({ type: 'result', result });
  } catch (error) {
    send({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
