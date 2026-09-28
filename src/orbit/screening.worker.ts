import { screenSets, type ScreeningReply, type ScreeningRequest } from './screening-job';

const send = (reply: ScreeningReply): void => self.postMessage(reply);
self.onmessage = (event: MessageEvent<ScreeningRequest>): void => {
  // in the worker nothing else waits for the thread: no need to yield between slices
  screenSets(event.data, (fraction) => { send({ type: 'progress', fraction }); }, async () => {}).then(
    (list) => send({ type: 'result', list: list ?? [] }),
    (error: unknown) => send({ type: 'error', message: error instanceof Error ? error.message : String(error) }),
  );
};
