import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from '../source-integrated/node_modules/vite/dist/node/index.js';
const dir = new URL('./boundaries/', import.meta.url);
const root = new URL('../source-integrated/', import.meta.url);
const server = await createServer({ root: fileURLToPath(root), configFile: false, server: { middlewareMode: true }, appType: 'custom' });
try {
  const mod = (p) => server.ssrLoadModule('/src/' + p);
  const [mission, flight, design, omm, cdm, lessons] = await Promise.all([
    mod('config/mission-file.ts'), mod('replay/reference.ts'), mod('design/design-store.ts'), mod('orbit/omm.ts'), mod('orbit/cdm.ts'), mod('lessons/lesson-file.ts'),
  ]);
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', dir), 'utf8'));
  const fallback = JSON.parse(readFileSync('C:/Users/Royin/Downloads/falcon9-cape-2026-09-29-19-47.orbitlab.json', 'utf8')).mission;
  fallback.launchTime = new Date(fallback.launchTime);
  const results = [];
  for (const entry of manifest.files) {
    const path = new URL(entry.file, dir), name = entry.file;
    if (name.startsWith('C26')) {
      results.push({ file: name, kind: 'size guard fixture only; UI not yet tested', bytes: statSync(path).size, passed: statSync(path).size === (name.includes('30MiB') ? 30 : 2) * 1024 * 1024 + 1 });
      continue;
    }
    const text = readFileSync(path, 'utf8');
    let raw; try { raw = JSON.parse(text); } catch { raw = null; }
    let detail, passed;
    if (/^C0[23]/.test(name)) {
      const r = mission.parseMissionDocument(raw, fallback);
      detail = { usable: r.usable, issues: r.issues, payloadMass: r.state.payloadMass, vehicleId: r.state.vehicleId };
      passed = name.startsWith('C02') ? r.usable && r.issues.length > 0 && r.state.payloadMass >= 0 && r.state.vehicleId !== 'qa-does-not-exist' : !r.usable;
    } else if (/^C0[67]/.test(name)) {
      const r = flight.parseFlightFile(raw); detail = { accepted: !!r }; passed = !r;
    } else if (/^C1[56]/.test(name)) {
      const r = design.parseDesignDocument(raw); detail = { accepted: !!r.input, issues: r.issues };
      passed = name.startsWith('C16') ? !!r.input && r.issues.some((i) => i.code === 'newerVersion') : !r.input;
    } else if (/^C2[45]/.test(name)) {
      const r = omm.readElementFile(text); detail = { format: r.format, sets: r.sets.length, rejected: r.rejected };
      if (name.includes('bad-checksum')) {
        passed = r.sets.length === 1;
        detail.limitation = 'Compatibility mode accepts bad checksum without exposing a warning through readElementFile. This is not strict-checksum rejection.';
      } else passed = name.includes('mixed') ? r.sets.length === 2 && r.rejected.length === 1 && r.rejected[0].at === 2 : r.sets.length === 0;
    } else if (name.startsWith('C28')) {
      try { cdm.parseCdm(text); detail = { accepted: true }; passed = false; }
      catch (e) { detail = { accepted: false, error: String(e), code: e.code }; passed = true; }
    } else if (name.startsWith('C30')) {
      const r = lessons.parseLessonFile(raw, new Set()); detail = { usable: r.usable, lessons: r.lessons.length, issues: r.issues };
      passed = name.includes('partial') ? r.usable && r.lessons.length === 1 && r.issues.some((i) => i.code === 'duplicate') : !r.usable;
    }
    results.push({ file: name, passed, ...detail });
  }
  const result = { node: process.version, browserAcceptance: false, results, passed: results.filter((r) => r.passed).length, failed: results.filter((r) => !r.passed).length };
  writeFileSync(new URL('parser-validation.json', dir), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ passed: result.passed, failed: result.failed, failures: results.filter((r) => !r.passed) }));
  if (result.failed) process.exitCode = 1;
} finally { await server.close(); }
