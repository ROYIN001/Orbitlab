/** The instructor's re-check in a Web Worker (roadmap T02; src/lessons/recheck-job.ts). */
import { checkResults, type RecheckInput } from './recheck';
import type { RecheckReply } from './recheck-job';

const send = (reply: RecheckReply): void => self.postMessage(reply);
self.onmessage = (event: MessageEvent<RecheckInput>): void => {
  checkResults(event.data, {
    onFiles: (files, total) => send({ type: 'files', files: [...files], total }),
    onRecord: (record, done, total) => send({ type: 'record', record, done, total }),
  }).then((result) => send({ type: 'result', result }), (error: unknown) => send({ type: 'error', message: error instanceof Error ? error.message : String(error) }));
};
