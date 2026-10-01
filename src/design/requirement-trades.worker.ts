import { tradeTable } from './requirement-trades';
import type { TradesReply, TradesRequest } from './requirement-trades-job';

const send = (reply: TradesReply): void => self.postMessage(reply);
self.onmessage = (event: MessageEvent<TradesRequest>): void => {
  const { req, template, opts } = event.data;
  try {
    send({ type: 'result', rows: tradeTable(req, template, { ...opts, onProgress: (fraction) => { send({ type: 'progress', fraction }); } }) });
  } catch (error) {
    send({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
