// Legacy command name, current format: verification reports + their exact collection plan.
// Old 27-file/246-case artifacts remain historical, not proof of current 33-file coverage.
import { aggregate } from '../verification/aggregate.mjs';
import { DEFAULT_OUT } from '../verification/lib.mjs';

const [results = DEFAULT_OUT, output = `${DEFAULT_OUT}/heavy-union.json`, plan = `${results}/plan.json`] = process.argv.slice(2);
process.exitCode = aggregate(plan, results, output).ok ? 0 : 1;
