import { vehicleById } from '../data/vehicles';
import { flyMonteCarloRun } from './monte-carlo';
import type { MonteCarloReply, MonteCarloRequest } from './monte-carlo-job';

const send = (reply: MonteCarloReply): void => self.postMessage(reply);
self.onmessage = (event: MessageEvent<MonteCarloRequest>): void => {
  const { cfg, mc, index, law } = event.data;
  try {
    send({ type: 'run', run: flyMonteCarloRun(cfg, vehicleById(cfg.vehicleId), mc, index, law) });
  } catch (error) {
    send({ type: 'error', index, law, message: error instanceof Error ? error.message : String(error) });
  }
};
