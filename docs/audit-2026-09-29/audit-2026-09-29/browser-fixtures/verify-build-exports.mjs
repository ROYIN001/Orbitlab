import { copyFileSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createServer } from '../source-integrated/node_modules/vite/dist/node/index.js';
const root = new URL('../source-integrated/', import.meta.url);
const audit = new URL('../', import.meta.url);
const folder = new URL('browser-build-export-selection/', audit);
mkdirSync(folder, { recursive: true });
const server = await createServer({ root: fileURLToPath(root), configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
  const { parseDesignDocument } = await server.ssrLoadModule('/src/design/design-store.ts');
  const files = [];
  for (const [name, expectedName, engineCount] of [['qa-draft-b-vehicle.orbitlab.json','QA-Draft-B',8], ['qa-falcon-a-vehicle.orbitlab (1).json','QA-Falcon-A',9]]) {
    const origin = `C:/Users/Royin/Downloads/${name}`, bytes = readFileSync(origin), raw = JSON.parse(bytes.toString('utf8'));
    const parsed = parseDesignDocument(raw);
    copyFileSync(origin,new URL(name,folder));
    const passed = !!parsed.input && parsed.issues.length === 0 && parsed.input.name === expectedName && parsed.input.design.stages[0].engine.count === engineCount;
    files.push({ origin, evidence:name, bytes:bytes.length, sha256:createHash('sha256').update(bytes).digest('hex'),
      name:raw.name, designName:raw.design.name, designId:raw.design.id, stageEngineCounts:raw.design.stages.map((s)=>s.engine.count),
      height:raw.design.height, stageCount:raw.design.stages.length, issues:parsed.issues, passed });
  }
  const result = { checkedAt:new Date().toISOString(),node:process.version,files,allPassed:files.every((x)=>x.passed),
    meaning:'Actual draft-B and saved-A downloads stay distinct: draft8 first-stage engines versus saved9. Production parser accepts both.',
    limits:['Browser imported-design selection/state must be verified separately; this script does not modify browser state.'] };
  writeFileSync(new URL('browser-build-export-selection.json',audit),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
  if(!result.allPassed)process.exitCode=1;
} finally { await server.close(); }
