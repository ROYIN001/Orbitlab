import { parseSync } from '../source-integrated/node_modules/vite/dist/node/index.js';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('../source-integrated/', import.meta.url));
const baseline = '9737f2134b1daaf228ab61c5b7e0bf618ae6a3cc';
const sha = text => createHash('sha256').update(text).digest('hex');
function normalized(text, file) {
  const parsed = parseSync(file, text, {lang:'ts'});
  if (parsed.errors.length) throw new Error(JSON.stringify(parsed.errors));
  const localized = [];
  function walk(node, parent, key, path) {
    if (!node || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map((v,i) => walk(v,parent,key,`${path}[${i}]`));
    const literal = (node.type === 'Literal' || node.type === 'StringLiteral') && typeof node.value === 'string';
    const propertyValue = parent?.type === 'Property' && key === 'value';
    const propertyName = parent?.key?.name ?? parent?.key?.value;
    const localeProperty = propertyValue && ['en','ru','th'].includes(propertyName);
    const dictionaryProperty = propertyValue && /^src\/i18n\/(en|ru|th)\.ts$/.test(file);
    const translationArgument = parent?.type === 'CallExpression' && parent.callee?.type === 'Identifier' && parent.callee.name === 'T' && key === 'arguments';
    const allowed = literal && (localeProperty || dictionaryProperty || translationArgument);
    if (allowed) localized.push({path,value:node.value});
    const out = {};
    for (const [k,v] of Object.entries(node)) {
      if (['start','end','loc','range','raw','comments','leadingComments','trailingComments'].includes(k)) continue;
      out[k] = allowed && k === 'value' ? '<localized-text>' : walk(v,node,k,`${path}.${k}`);
    }
    return out;
  }
  const ast = walk(parsed.program,null,'','program');
  return {hash:sha(JSON.stringify(ast)),localized};
}
const probeA = "const x = { en: 'A', ru: 'Б', th: 'ก', id: 'stable', min: 1 };";
const probeB = probeA.replace("'A'","'Changed'");
const probeC = probeA.replace('min: 1','min: 2');
if (normalized(probeA,'probe.ts').hash !== normalized(probeB,'probe.ts').hash || normalized(probeA,'probe.ts').hash === normalized(probeC,'probe.ts').hash) throw new Error('Verifier self-check failed');
const files = execFileSync('git',['diff','--name-only',baseline,'--','src'],{cwd,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
const rows = files.map(file => {
  const before = execFileSync('git',['show',`${baseline}:${file}`],{cwd,encoding:'utf8'});
  const after = readFileSync(`${cwd}/${file}`,'utf8');
  const a = normalized(before,file), b = normalized(after,file);
  if (a.hash !== b.hash) throw new Error(`Non-localized structure changed: ${file}`);
  const old = new Map(a.localized.map(r=>[r.path,r.value]));
  const changes = b.localized.filter(r=>old.get(r.path)!==r.value).map(r=>({path:r.path,before:old.get(r.path),after:r.value}));
  return {file,beforeSha256:sha(before),afterSha256:sha(after),unchangedNonLocalizedAstSha256:a.hash,changedStrings:changes.length,changes};
});
const result = {verifiedAt:new Date().toISOString(),baseline,method:'Vite TypeScript AST: remove positions/comments and mask only en/ru/th property values, T(...) translation arguments and i18n dictionary values. All other AST fields, IDs, keys, numbers, formulas and control flow must match.',selfChecks:{localizedChangeAllowed:true,numericCriteriaChangeRejected:true},fileCount:rows.length,changedStrings:rows.reduce((n,r)=>n+r.changedStrings,0),allNonLocalizedAstEqual:true,files:rows};
writeFileSync(new URL('text-only-verification.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({fileCount:result.fileCount,changedStrings:result.changedStrings,allNonLocalizedAstEqual:result.allNonLocalizedAstEqual}));
