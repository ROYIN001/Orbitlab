import { describe, it } from 'vitest';
import { writeFileSync } from 'node:fs';
const _l: string[] = [];
const LOG = (s: string) => _l.push(s);
import { VEHICLES } from '../../src/data/vehicles';
import { VehicleModel, liftoffThrust, engineMassFlow } from '../../src/physics/vehicle';
import { G0 } from '../../src/physics/constants';

describe('data probe', () => {
  it('table', () => {
    for (const v of VEHICLES) {
      const pl = v.payloadLEO;
      const vm = new VehicleModel(v, pl);
      const m0 = vm.totalMass();
      const T = liftoffThrust(v);
      const dv = vm.deltaVRemaining();
      const fairing = v.fairing ? `fair ${v.fairing.mass}kg d${v.fairing.diameter} L${v.fairing.length} sep${v.fairing.sepAltitude/1000}km` : 'no fairing';
      LOG(`\n=== ${v.id} ${v.name} h=${v.height} payloadLEO=${pl} GTO=${v.payloadGTO} SSO=${v.payloadSSO ?? '-'}`);
      LOG(`  liftoffMass(with LEO payload)=${(m0/1000).toFixed(1)} t  T_SL=${(T/1000).toFixed(0)} kN  T/W=${(T/(m0*9.80665)).toFixed(3)}  idealDv(LEO pl)=${dv.toFixed(0)} m/s  ${fairing}`);
      // dry-only structure fractions and burn times
      v.stages.forEach((s, i) => {
        const e = s.engine;
        const flow = e.count * engineMassFlow(e);
        const bt = flow > 0 ? s.propellantMass / flow : 0;
        const pmf = s.propellantMass / (s.propellantMass + s.dryMass);
        LOG(`   S${i} ${s.name}: dry=${s.dryMass} prop=${s.propellantMass} pmf=${pmf.toFixed(3)} d=${s.diameter} L=${s.length} eng=${e.name}x${e.count} Tvac=${(e.count*e.thrustVac/1000).toFixed(0)}kN ispVac=${e.ispVac} mdot=${flow.toFixed(1)} burn=${bt.toFixed(1)}s`);
        for (const b of s.boosters ?? []) {
          const be = b.engine;
          const bflow = be.count * engineMassFlow(be);
          const bbt = bflow > 0 ? b.propellantMass / bflow : 0;
          LOG(`     B ${b.name} x${b.count}: dry=${b.dryMass} prop=${b.propellantMass} pmf=${(b.propellantMass/(b.propellantMass+b.dryMass)).toFixed(3)} d=${b.diameter} L=${b.length} eng=${be.name}x${be.count} mdot=${bflow.toFixed(1)} burn=${bbt.toFixed(1)}s igniteAt=${b.igniteAt ?? 0} sepDelay=${b.sepDelay ?? 0}`);
        }
      });
      // stacked length vs height
      const stackLen = v.stages.reduce((a, s) => a + s.length, 0) + (v.fairing?.length ?? 0);
      LOG(`  sum(stage lengths)+fairing=${stackLen.toFixed(1)} vs height=${v.height}`);
    }
    writeFileSync('probe-out.txt', _l.join(String.fromCharCode(10)));
  });
});
