import { solveAttitudeTune, type AttitudeTuneReply, type AttitudeTuneRequest } from './attitude-tune-job';

const send = (reply: AttitudeTuneReply): void => self.postMessage(reply);
self.onmessage = (event: MessageEvent<AttitudeTuneRequest>): void => {
  try {
    const result = solveAttitudeTune(event.data, progress => send({ type: 'progress', progress }));
    send({ type: 'result', result });
  } catch (error) {
    send({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
