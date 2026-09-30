import { createServer } from '../source-integrated/node_modules/vite/dist/node/index.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const out = new URL('./', import.meta.url);
const root = new URL('../source-integrated/', import.meta.url);
const server = await createServer({ root: fileURLToPath(root), configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
  const { allLessons, TRACKS, BUILTIN_ISSUES } = await server.ssrLoadModule('/src/lessons/catalog.ts');
  const lessons = allLessons();
  if (BUILTIN_ISSUES.length || lessons.length !== 24) throw new Error('Unexpected lesson inventory');
  function texts(value, path = '', rows = []) {
    if (value && typeof value === 'object' && ['en', 'th', 'ru'].every(k => typeof value[k] === 'string')) { rows.push({ path, ...value }); return rows; }
    if (Array.isArray(value)) value.forEach((v, i) => texts(v, `${path}[${i}]`, rows));
    else if (value && typeof value === 'object') for (const [k,v] of Object.entries(value)) texts(v, path ? `${path}.${k}` : k, rows);
    return rows;
  }
  const records = lessons.map(l => ({ id: l.id, track: l.track, order: l.order, texts: texts(l), criteria: l.criteria }));
  const source = ['catalog.ts', 'builtin/common.ts', 'builtin/coming.ts', ...Array.from({length:6},(_,i)=>`builtin/track${i+1}.ts`)].map(name => {
    const path = `src/lessons/${name}`, bytes = readFileSync(new URL(path, root));
    return {path, bytes: bytes.length, sha256:createHash('sha256').update(bytes).digest('hex')};
  });
  const trackTexts = texts(TRACKS);
  writeFileSync(new URL('lesson-extraction.json',out), JSON.stringify({generatedAt:new Date().toISOString(),source,lessonCount:records.length,localizedObjects:records.reduce((s,l)=>s+l.texts.length,0),trackTexts,records},null,2)+'\n');
  for (let n=1;n<=6;n++) {
    const rows = records.filter(l=>l.track===n);
    const format = t=>`${t.path}\nEN: ${t.en}\nRU: ${t.ru}\nTH: ${t.th}\n`;
    writeFileSync(new URL(`track${n}.txt`,out),rows.map(l=>`# ${l.track}.${l.order} ${l.id}\n`+l.texts.map(format).join('\n')+`\nCRITERIA: ${JSON.stringify(l.criteria)}\n`).join('\n'));
  }
  console.log(JSON.stringify({lessons:records.length,localizedObjects:records.reduce((s,l)=>s+l.texts.length,0),tracks:TRACKS.length,trackLocalizedObjects:trackTexts.length}));
} finally { await server.close(); }
