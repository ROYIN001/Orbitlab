/**
 * The offline app in a real browser (roadmap U03), on its own. Not part of
 * `npm test`: the journey itself is tests/browser/journeys/pwa-offline.mjs,
 * run by the browser harness with the rest of the full suite. This keeps its
 * old command line working:
 *
 *   npm run build
 *   node tests/browser/pwa-offline.mjs                      # serves dist/ itself
 *   node tests/browser/pwa-offline.mjs http://localhost:4173/Orbitlab/ [screenshot-dir]
 *
 * Against a URL of your own, set DIST_SW to the served sw.js for the update
 * check; PLAYWRIGHT and CHROMIUM still pick another Playwright or browser.
 */
import { runJourneys } from './run.mjs';

const [base = null, shots = 'tests/browser/screenshots'] = process.argv.slice(2);
const { ok } = await runJourneys({ names: ['pwa-offline'], base, shots });
console.log(ok ? 'PASSED' : 'FAILED');
process.exit(ok ? 0 : 1);
