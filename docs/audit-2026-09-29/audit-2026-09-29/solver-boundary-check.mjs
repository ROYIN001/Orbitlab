import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(here, 'source-integrated');
const { build } = await import(pathToFileURL(path.join(source, 'node_modules/vite/dist/node/index.js')).href);
const built = await build({ configFile: false, root: source, logLevel: 'silent', build: {
  ssr: path.join(here, 'solver-boundary-entry.ts'), write: false, target: 'node22',
  rollupOptions: { output: { inlineDynamicImports: true } },
} });
const chunk = (Array.isArray(built) ? built[0] : built).output.find(x => x.type === 'chunk' && x.isEntry);
const bundle = path.join(here, 'solver-boundary-modules.mjs');
fs.writeFileSync(bundle, chunk.code);
const { stateAt, orbitFromState, lambert, elementsFromState, MU_EARTH: mu, R_EARTH: earth } = await import(pathToFileURL(bundle).href);
const norm = v => Math.hypot(v.x, v.y, v.z);
const dot = (a,b) => a.x*b.x+a.y*b.y+a.z*b.z;
const add = (a,b) => ({ x:a.x+b.x, y:a.y+b.y, z:a.z+b.z });
const scale = (a,k) => ({ x:a.x*k, y:a.y*k, z:a.z*k });
const error = (a,b) => norm(add(a,scale(b,-1)));
const finite = st => [st?.r?.x,st?.r?.y,st?.r?.z,st?.v?.x,st?.v?.y,st?.v?.z].every(Number.isFinite);
const tau = 2*Math.PI;
function root(f, low, high) {
  for (let k=0;k<180;k++) { const mid=(low+high)/2; if(mid===low||mid===high)return mid; if(f(mid)>0)high=mid;else low=mid; }
  return (low+high)/2;
}
// Independent monotone bisection and eccentric-anomaly Cartesian formulae.
function smallOddRemainder(x,hyperbolic) {
  if(Math.abs(x)>.1)return hyperbolic?Math.sinh(x)-x:x-Math.sin(x);
  let term=x*x*x/6,sum=term;
  for(let k=2;k<20;k++){term*=(hyperbolic?1:-1)*x*x/((2*k)*(2*k+1));sum+=term;}
  return sum;
}
function conicReference(o,t) {
  const n=Math.sqrt(mu/Math.abs(o.a)**3), M=o.m0+n*t;
  if(o.e<1) {
    let m=M%tau; if(m>Math.PI)m-=tau;if(m< -Math.PI)m+=tau;
    const E=root(x=>(1-o.e)*x+o.e*smallOddRemainder(x,false)-m,-Math.PI,Math.PI);
    const b=Math.sqrt((1-o.e)*(1+o.e)), halfSin=Math.sin(E/2), d=(1-o.e)+2*o.e*halfSin*halfSin;
    return {r:{x:o.a*((1-o.e)-2*halfSin*halfSin),y:o.a*b*Math.sin(E),z:0},v:{x:-o.a*n*Math.sin(E)/d,y:o.a*n*b*Math.cos(E)/d,z:0}};
  }
  const sign=Math.sign(M)||1, m=Math.abs(M); let high=1;
  while(o.e*Math.sinh(high)-high<m)high*=2;
  const H=sign*root(x=>(o.e-1)*x+o.e*smallOddRemainder(x,true)-m,0,high), A=-o.a,b=Math.sqrt((o.e-1)*(o.e+1)),halfSinh=Math.sinh(H/2),d=(o.e-1)+2*o.e*halfSinh*halfSinh;
  return {r:{x:A*((o.e-1)-2*halfSinh*halfSinh),y:A*b*Math.sinh(H),z:0},v:{x:-A*n*Math.sinh(H)/d,y:A*n*b*Math.cosh(H)/d,z:0}};
}
// Universal-variable propagator: separate implementation, safeguarded bisection.
function stumpff(z) {
  if(Math.abs(z)<0.1) {
    let c=.5,s=1/6,tc=c,ts=s;
    for(let k=1;k<30;k++){tc*=-z/((2*k+1)*(2*k+2));ts*=-z/((2*k+2)*(2*k+3));c+=tc;s+=ts;}
    return {c,s};
  }
  if(z>0){const q=Math.sqrt(z);return {c:(1-Math.cos(q))/z,s:(q-Math.sin(q))/(q*q*q)};}
  const q=Math.sqrt(-z);return {c:(Math.cosh(q)-1)/(-z),s:(Math.sinh(q)-q)/(q*q*q)};
}
function universal(r0,v0,dt) {
  if(dt===0)return {r:{...r0},v:{...v0}};
  const r=norm(r0),sqrtMu=Math.sqrt(mu),rv=dot(r0,v0)/sqrtMu,alpha=2/r-dot(v0,v0)/mu;
  const equation=x=>{const {c,s}=stumpff(alpha*x*x);return (rv===0?0:rv*x*x*c)+(1-alpha*r)*x*x*x*s+r*x-sqrtMu*dt;};
  let high=1; for(let k=0;k<80 && equation(high)<0;k++)high*=2;
  if(!(equation(high)>=0))return null;
  const x=root(equation,0,high),{c,s}=stumpff(alpha*x*x),f=1-x*x*c/r,g=dt-x*x*x*s/sqrtMu;
  const position=add(scale(r0,f),scale(v0,g)),rm=norm(position),fdot=sqrtMu*(alpha*x*x*x*s-x)/(r*rm),gdot=1-x*x*c/rm;
  return {r:position,v:add(scale(r0,fdot),scale(v0,gdot))};
}
function rk4(r0,v0,dt,step=1) {
  let y=[r0.x,r0.y,r0.z,v0.x,v0.y,v0.z]; const count=Math.ceil(Math.abs(dt)/step),h=dt/count;
  const f=q=>{const r=Math.hypot(...q.slice(0,3)),k=-mu/r**3;return [q[3],q[4],q[5],k*q[0],k*q[1],k*q[2]];};
  for(let j=0;j<count;j++){const a=f(y),b=f(y.map((v,i)=>v+h*a[i]/2)),c=f(y.map((v,i)=>v+h*b[i]/2)),d=f(y.map((v,i)=>v+h*c[i]));y=y.map((v,i)=>v+h*(a[i]+2*b[i]+2*c[i]+d[i])/6);}
  return {r:{x:y[0],y:y[1],z:y[2]},v:{x:y[3],y:y[4],z:y[5]}};
}
const r0={x:earth+400e3,y:0,z:0}, circularV={x:0,y:Math.sqrt(mu/norm(r0)),z:0},period=tau*Math.sqrt(norm(r0)**3/mu);
const oracleChecks=[.5,1,10].map(k=>{const st=universal(r0,circularV,k*period),expected=scale(r0,k===.5?-1:1);return {kind:'circular',periods:k,positionErrorM:error(st.r,expected)};});
const ref600=universal(r0,circularV,600),rk600=rk4(r0,circularV,600,.5);
oracleChecks.push({kind:'independent RK4 circular 600s/0.5s',positionErrorM:error(ref600.r,rk600.r),velocityErrorMs:error(ref600.v,rk600.v)});
const kepler=[];
for(const e of [0,.95,.999,.999999,.999999999,1.000000001,1.000001,1.001,1.1])for(const m0 of [0,1e-8,Math.PI])for(const t of [0,-3600,3600,30*86400]) {
  const a=7e6/(1-e),o={a,e,m0,i:0,raan:0,argp:0,jd0:2461312.5},actual=stateAt(o,t,false),expected=conicReference(o,t);
  const positionErrorM=error(actual.r,expected.r),velocityErrorMs=error(actual.v,expected.v),positionToleranceM=Math.max(1,1e-8*norm(expected.r));
  kepler.push({e,m0,t,a,domain:e<=.95&&a<=earth+100e6?'direct UI ellipse range':'module conic / handoff-maneuver stress, beyond direct e slider',finite:finite(actual),positionErrorM,velocityErrorMs,positionToleranceM,pass:finite(actual)&&positionErrorM<=positionToleranceM&&velocityErrorMs<=.001});
}
const lambertRows=[];
for(const degrees of [0,.000001,.001,.1,1,179,179.9,179.999,179.999999,180])for(const dt of [60,600,2800,5400,86400,30*86400])for(const longWay of [false,true]) {
  const angle=degrees*Math.PI/180,r2={x:(earth+700e3)*Math.cos(angle),y:(earth+700e3)*Math.sin(angle),z:0},sol=lambert(r0,r2,dt,longWay);
  const row={degrees,dt,longWay,result:sol?'returned':'null',contract:degrees===180?'documented antipodal degeneracy':'positive TOF; less-than-one-revolution branch'};
  if(sol){const st=universal(r0,sol.v1,dt),el=elementsFromState(r0,sol.v1);Object.assign(row,{finite:finite({r:sol.v1,v:sol.v2}),perigeeM:el.periapsisAlt+earth,positionErrorM:st?error(st.r,r2):null,velocityErrorMs:st?error(st.v,sol.v2):null,oracleFinite:finite(st)});row.pass=row.finite&&row.oracleFinite&&row.positionErrorM<=1&&row.velocityErrorMs<=.001;row.v1=sol.v1;row.v2=sol.v2;}
  else row.pass=degrees===180?true:null; // no unproved existence claim for a null branch
  lambertRows.push(row);
}
const invalidTime=[0,-1,NaN].map(dt=>({dt:String(dt),returnsNull:lambert(r0,{x:0,y:earth+700e3,z:0},dt)===null}));
const keplerRkWitnesses=[];
for(const e of [.999999,.999999999,1.000000001])for(const t of [-3600,3600]) {
  const o={a:7e6/(1-e),e,m0:0,i:0,raan:0,argp:0,jd0:2461312.5},r={x:7e6,y:0,z:0},v={x:0,y:Math.sqrt(mu*(1+e)/7e6),z:0};
  const fine=rk4(r,v,t,.25),coarse=rk4(r,v,t,.5),actual=stateAt(o,t,false),reference=conicReference(o,t);
  keplerRkWitnesses.push({e,t,productionPositionErrorM:error(actual.r,fine.r),productionVelocityErrorMs:error(actual.v,fine.v),bisectionPositionErrorM:error(reference.r,fine.r),bisectionVelocityErrorMs:error(reference.v,fine.v),rkStepHalvingPositionDifferenceM:error(fine.r,coarse.r),rkStepHalvingVelocityDifferenceMs:error(fine.v,coarse.v)});
}
const conicRoundTrips=[];
for(const e of [.999999,.999999999,1.000000001])for(const t of [-3600,3600]) {
  const o={a:7e6/(1-e),e,m0:0,i:0,raan:0,argp:0,jd0:2461312.5},original=stateAt(o,t,false),recovered=orbitFromState(original.r,original.v,o.jd0+t/86400),again=stateAt(recovered,0,false);
  conicRoundTrips.push({e,t,recoveredE:recovered.e,recoveredM0:recovered.m0,positionErrorM:error(original.r,again.r),velocityErrorMs:error(original.v,again.v)});
}
const failures=lambertRows.filter(x=>x.result==='returned'&&!x.pass).sort((a,b)=>(b.positionErrorM??Infinity)-(a.positionErrorM??Infinity));
// RK4 cross-check a finite, non-impact failure if available; at most two hours.
const witness=failures.find(x=>x.perigeeM>earth&&x.dt<=7200&&x.oracleFinite);
let rkWitness=null;
if(witness){const angle=witness.degrees*Math.PI/180,target={x:(earth+700e3)*Math.cos(angle),y:(earth+700e3)*Math.sin(angle),z:0},fine=rk4(r0,witness.v1,witness.dt,.25),coarse=rk4(r0,witness.v1,witness.dt,.5);rkWitness={degrees:witness.degrees,dt:witness.dt,longWay:witness.longWay,positionErrorM:error(fine.r,target),velocityErrorMs:error(fine.v,witness.v2),stepHalvingPositionDifferenceM:error(fine.r,coarse.r),stepHalvingVelocityDifferenceMs:error(fine.v,coarse.v)};}
const summary={oracleChecks,kepler:{cases:kepler.length,passed:kepler.filter(x=>x.pass).length,failures:kepler.filter(x=>!x.pass).length},lambert:{cases:lambertRows.length,returned:lambertRows.filter(x=>x.result==='returned').length,passedReturned:lambertRows.filter(x=>x.result==='returned'&&x.pass).length,failedReturned:failures.length,null:lambertRows.filter(x=>x.result==='null').length,nonImpactFailures:failures.filter(x=>x.perigeeM>earth).length,maxReturnedPositionErrorM:Math.max(...lambertRows.filter(x=>x.result==='returned').map(x=>x.positionErrorM)),maxReturnedVelocityErrorMs:Math.max(...lambertRows.filter(x=>x.result==='returned').map(x=>x.velocityErrorMs))},invalidTime,rkWitness,keplerRkWitnesses};
const sourceHashes=Object.fromEntries(['src/orbit/kepler.ts','src/orbit/maneuvers.ts','src/physics/orbital.ts'].map(name=>[name,createHash('sha256').update(fs.readFileSync(path.join(source,name))).digest('hex')]));
const report={generatedAt:new Date().toISOString(),scope:'Actual module bundle. CPU numerical checks; no browser claim. Exact e=1 excluded (no parabolic element representation).',sourceHashes,tolerances:{positionM:1,relativeKeplerPosition:1e-8,velocityMs:.001},summary,kepler,lambert:lambertRows,conicRoundTrips};
fs.writeFileSync(path.join(here,'solver-boundary-results.json'),JSON.stringify(report,(_,v)=>typeof v==='number'&&!Number.isFinite(v)?String(v):v,2)+'\n');
console.log(JSON.stringify({summary,keplerFailures:kepler.filter(x=>!x.pass).slice(0,8),lambertFailures:failures.slice(0,8)},null,2));
