import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { createServer } from '../source-integrated/node_modules/vite/dist/node/index.js';
const audit = new URL('../', import.meta.url);
const servers = await Promise.all(['source-integrated','source'].map((p) => createServer({ root: fileURLToPath(new URL(`${p}/`, audit)), configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom' })));
try {
  const [current, old, expression] = await Promise.all([
    servers[0].ssrLoadModule('/src/lessons/assessment/bank.ts'), servers[1].ssrLoadModule('/src/lessons/assessment/bank.ts'),
    servers[0].ssrLoadModule('/src/lessons/assessment/expression.ts'),
  ]);
  const signature = (q) => ({ id:q.id,type:q.type,domain:q.domain,level:q.level,
    ...(q.options ? { correct:q.options.map((o)=>!!o.correct) } : {}),
    ...(q.type==='numeric' ? { params:q.params,answer:q.answer,unit:q.unit,tolPct:q.tolPct } : {}),
    ...(q.type==='order' ? { itemCount:q.items.length } : {}),
    ...(q.type==='vehicle' ? { vehicles:q.vehicles } : {}),
  });
  const changed = current.BUILTIN_QUESTIONS.filter((q,i)=>!isDeepStrictEqual(signature(q), signature(old.BUILTIN_QUESTIONS[i]))).map((q)=>q.id);
  const numeric = [], issues = [];
  for (const q of current.BUILTIN_QUESTIONS.filter((q)=>q.type==='numeric')) {
    let count=0;
    const enumerate=(index,values)=>{
      if(index===q.params.length){const answer=expression.evaluate(q.answer,values);count++; if(!Number.isFinite(answer)||answer<=0)issues.push({id:q.id,values,answer});return;}
      const p=q.params[index]; const n=Math.round((p.max-p.min)/p.step);
      for(let i=0;i<=n;i++)enumerate(index+1,{...values,[p.name]:p.min+i*p.step});
    };
    enumerate(0,{});numeric.push({id:q.id,combinations:count});
  }
  const tsiolkovsky = current.BUILTIN_QUESTIONS.find((q)=>q.id==='r-tsiolkovsky-calc');
  const liftoff = current.BUILTIN_QUESTIONS.find((q)=>q.id==='r-liftoff-accel');
  const textConsistency = Object.values(tsiolkovsky.prompt).every((s)=>/9[.,]81\b/.test(s)) && Object.values(liftoff.prompt).every((s)=>/9[.,]80665\b/.test(s));
  const workedCheck = expression.evaluate(tsiolkovsky.answer,{isp:300,m0:200,mf:50}) === 300*9.81*Math.log(4);
  const result={node:process.version, currentSource:'source-integrated',comparisonSource:'source (local handoff snapshot)',
    bankCount:current.BUILTIN_QUESTIONS.length,previousCount:old.BUILTIN_QUESTIONS.length,bankIssues:current.BANK_ISSUES,
    scoringStructureChanged:changed,numericFamilies:numeric.length,numericCombinations:numeric.reduce((sum,x)=>sum+x.combinations,0),numericIssues:issues,
    correctedTextConstantsMatchFormula:textConsistency,independentTsiolkovskyWorkedCheck:workedCheck,numeric,
    limits:['Comparison covers IDs/order/type/domain/level/answer flags/parameters/expressions/units/tolerances and order lengths; it is not an independent new semantic review of every localized option.',
      'The full numeric grid verifies finite positive answers from production expressions. Only the Tsiolkovsky example here is independently computed; historical independent 25-family checks are separate evidence.']};
  writeFileSync(new URL('learning-bank-final-compatibility.json',audit),JSON.stringify(result,null,2)+'\n');
  if(result.bankCount!==157||result.previousCount!==157||changed.length||result.bankIssues.length||issues.length||!textConsistency||!workedCheck)throw new Error('Bank check failed');
  console.log(JSON.stringify({questions:result.bankCount,numericFamilies:result.numericFamilies,numericCombinations:result.numericCombinations,scoringStructureChanged:changed,textConsistency,workedCheck}));
} finally {await Promise.all(servers.map((s)=>s.close()));}
