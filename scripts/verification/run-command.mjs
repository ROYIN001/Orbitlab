import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { annotate, baseReport, DEFAULT_OUT, directoryManifest, finishReport, readJSON, writeJSON } from './lib.mjs';

const args = process.argv.slice(2);
const split = args.indexOf('--');
if (split < 1) throw new Error('Usage: run-command.mjs ID [PLAN] [OUT] -- COMMAND [ARG...]');
const [id, planFile = `${DEFAULT_OUT}/plan.json`, out = DEFAULT_OUT] = args.slice(0, split);
const command = args.slice(split + 1);
if (!command.length) throw new Error('No command selected');
const plan = readJSON(planFile);
const gate = plan.gates.find(gate => gate.id === id && ['command', 'build'].includes(gate.kind));
if (!gate) throw new Error(`Unknown command gate ${id}`);
const reportFile = resolve(out, `${id}.report.json`);
const report = baseReport(plan, id, gate.kind);
report.command = command;
writeJSON(reportFile, report);
const start = performance.now();
const child = spawn(command[0], command.slice(1), { stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { report.errors = [String(error)]; });
child.on('close', (code, signal) => {
  finishReport(report, start, code ?? 1, signal);
  if (gate.kind === 'build' && report.ok) {
    try {
      report.dist = directoryManifest(resolve('dist'));
      if (!report.dist.files.some(file => file.file === 'index.html') || !report.dist.files.some(file => file.file === 'sw.js')) throw new Error('Incomplete build artifact');
    } catch (error) {
      report.ok = false;
      report.errors = [...(report.errors ?? []), String(error.message)];
    }
  }
  if (!report.ok) annotate((report.errors ?? [`Command exited ${code}, signal ${signal}`]).join('\n'), id);
  writeJSON(reportFile, report);
  process.exitCode = report.ok ? 0 : 1;
});
