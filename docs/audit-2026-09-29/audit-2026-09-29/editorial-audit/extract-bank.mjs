import { createServer } from '../source-integrated/node_modules/vite/dist/node/index.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const out = new URL('./', import.meta.url);
const root = new URL('../source-integrated/', import.meta.url);
const sourceFiles = ['basics', 'orbits', 'rockets', 'guidance', 'control', 'failures'];
const server = await createServer({ root: fileURLToPath(root), configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
  const { BUILTIN_QUESTIONS: bank, BANK_ISSUES: issues } = await server.ssrLoadModule('/src/lessons/assessment/bank.ts');
  if (issues.length || bank.length !== 157) throw new Error('Unexpected bank inventory');
  const records = [];
  function walk(value, path, rows) {
    if (value && typeof value === 'object' && ['en', 'th', 'ru'].every(k => typeof value[k] === 'string')) {
      rows.push({ path, ...value }); return;
    }
    if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`, rows));
    else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k, rows);
  }
  for (const q of bank) {
    const texts = []; walk(q, '', texts);
    records.push({ id: q.id, domain: q.domain, type: q.type, texts, answer: q.answer, unit: q.unit,
      correctOptions: q.options?.flatMap((o, i) => o.correct ? [i] : []), params: q.params });
  }
  const source = sourceFiles.map(name => {
    const path = `src/lessons/assessment/bank/${name}.ts`;
    const bytes = readFileSync(new URL(path, root));
    return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  });
  writeFileSync(new URL('bank-extraction.json', out), JSON.stringify({ generatedAt: new Date().toISOString(), source, questionCount: bank.length, localizedObjects: records.reduce((n, q) => n + q.texts.length, 0), records }, null, 2) + '\n');
  for (let d = 1; d <= 6; d++) {
    const qs = records.filter(q => q.domain === d);
    const text = qs.map(q => `# ${q.id} [${q.type}] correct=${JSON.stringify(q.correctOptions ?? q.answer ?? '(vehicle/order)')} ${q.unit ?? ''}\n` +
      q.texts.map(t => `${t.path}\nEN: ${t.en}\nRU: ${t.ru}\nTH: ${t.th}\n`).join('\n')).join('\n');
    writeFileSync(new URL(`${sourceFiles[d-1]}.txt`, out), text);
  }
  console.log(JSON.stringify({ questions: records.length, localizedObjects: records.reduce((n, q) => n + q.texts.length, 0), domains: sourceFiles.map((name, i) => ({ name, questions: records.filter(q => q.domain === i+1).length, localizedObjects: records.filter(q => q.domain === i+1).reduce((n, q) => n+q.texts.length,0) })) }));
} finally { await server.close(); }
