import { autotune } from './autotune';
import type { MissionConfig } from '../types';
import type { TuneReply } from './tune-job';

const send = (reply: TuneReply): void => self.postMessage(reply);
self.onmessage = (event: MessageEvent<MissionConfig>): void => {
  try {
    const result = autotune(event.data, undefined, undefined, undefined,
      progress => send({ type: 'progress', progress }));
    send({ type: 'result', result });
  } catch (error) {
    send({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
