// Compatibility entry point: audit and scheduled runs use the same collection and runner.
import { spawnSync } from 'node:child_process';
import { basename, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { createPlan } from '../verification/create-plan.mjs';
import { DEFAULT_OUT, readJSON } from '../verification/lib.mjs';

const [file, planFile = `${DEFAULT_OUT}/plan.json`, out = DEFAULT_OUT] = process.argv.slice(2);
if (!existsSync(planFile)) await createPlan('heavy', dirname(planFile));
const plan = readJSON(planFile);
if (!plan.suites.heavy?.files.includes(file)) throw new Error('Select exactly one reviewed heavy file from the current plan');
const result = spawnSync(process.execPath, ['scripts/verification/run-vitest.mjs', `heavy-${basename(file, '.test.ts')}`, planFile, out], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
