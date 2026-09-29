import { predictFromRequest, type ReentryReply, type ReentryRequest } from './reentry-job';

const send = (reply: ReentryReply): void => self.postMessage(reply);
self.onmessage = (event: MessageEvent<ReentryRequest>): void => {
  try {
    send({ type: 'result', answer: predictFromRequest(event.data, (fraction) => { send({ type: 'progress', fraction }); }) });
  } catch (error) {
    send({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
