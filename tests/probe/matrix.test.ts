import { describe, it } from 'vitest';
import { Simulation } from '../../src/physics/simulation';
import { DEFAULT_GUIDANCE, DEFAULT_FAILURE } from '../../src/physics/defaults';
import { orbitById } from '../../src/data/orbits';
import { VEHICLES } from '../../src/data/vehicles';
import type { MissionConfig } from '../../src/types';

export interface Row {
  veh: string; site: string; orbit: string; frac: number; mass: number;
  reached: string; ap: number; pe: number; inc: number;
  tIns: number; tMaxQ: number; maxQ: number; tMeco: number; tSeco: number; tFair: number;
  status: string; note: string; fail: string; tEnd: number;
}

export function flyOne(vehId: string, siteId: string, orbitId: string, mass: number, maxTime: number, guidanceOver: Partial<typeof DEFAULT_GUIDANCE> = {}): Row {
  const cfg: MissionConfig = {
    vehicleId: vehId, satelliteId: 'cubesats', siteId, orbit: orbitById(orbitId),
    launchTime: new Date(Date.UTC(2026, 8, 15, 12, 0, 0)),
    guidance: { ...DEFAULT_GUIDANCE, ...guidanceOver }, failure: { ...DEFAULT_FAILURE },
    boosterRecovery: false, payloadMassOverride: mass,
  };
  const sim = new Simulation(cfg, { headless: true });
  let guard = 0;
  while (!sim.done && sim.state.t < maxTime && guard++ < 1500000) sim.step(sim.suggestedDt());
  const ev = (k: string) => sim.events.find((e) => e.key === k);
  const el = sim.state.elements;
  const fails = sim.events.filter((e) => e.severity === 'fail' || e.severity === 'warn').map((e) => `${Math.round(e.t)}:${e.key}`);
  return {
    veh: vehId, site: siteId, orbit: orbitId, frac: 0, mass,
    reached: ev('evt.targetOrbit') ? 'YES' : ev('evt.offTargetOrbit') ? 'OFF' : 'no',
    ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000), inc: +(el.i * 180 / Math.PI).toFixed(2),
    tIns: Math.round(ev('evt.parkingOrbit')?.t ?? -1), tMaxQ: Math.round(sim.state.maxQ.t), maxQ: Math.round(sim.state.maxQ.value / 100) / 10,
    tMeco: Math.round(ev('evt.meco')?.t ?? -1), tSeco: Math.round(ev('evt.seco')?.t ?? -1), tFair: Math.round(ev('evt.fairingSep')?.t ?? -1),
    status: sim.state.status, note: sim.state.note, fail: fails.slice(0, 4).join(' '), tEnd: Math.round(sim.state.t),
  };
}

export function fmt(r: Row): string {
  return [
    r.veh.padEnd(12), r.orbit.padEnd(4), String(Math.round(r.frac * 100)).padStart(3) + '%',
    String(r.mass).padStart(6) + 'kg', r.reached.padEnd(3),
    `${String(r.pe).padStart(6)}x${String(r.ap).padStart(7)}km`, `i=${String(r.inc).padStart(6)}`,
    `ins=${String(r.tIns).padStart(5)}`, `mq=${String(r.tMaxQ).padStart(4)}/${String(r.maxQ).padStart(5)}kPa`,
    `meco=${String(r.tMeco).padStart(4)}`, `fair=${String(r.tFair).padStart(4)}`, `seco=${String(r.tSeco).padStart(5)}`,
    r.status.padEnd(8), r.note.padEnd(12), r.fail,
  ].join(' ');
}

describe('matrix', () => {
  it('default guidance, no autotune', () => {
    const orbits = ['leo', 'iss', 'sso', 'gto'];
    const out: string[] = [];
    for (const v of VEHICLES) {
      for (const o of orbits) {
        const base = o === 'gto' ? v.payloadGTO : v.payloadLEO;
        if (!base) continue;
        for (const f of [0.25, 0.5, 0.9]) {
          const mass = Math.round(base * f);
          const maxTime = o === 'gto' ? 8 * 3600 : 3 * 3600;
          let r: Row;
          try {
            r = flyOne(v.id, v.sites[0], o, mass, maxTime);
          } catch (e) {
            r = { veh: v.id, site: v.sites[0], orbit: o, frac: f, mass, reached: 'ERR', ap: 0, pe: 0, inc: 0, tIns: -1, tMaxQ: -1, maxQ: 0, tMeco: -1, tSeco: -1, tFair: -1, status: 'err', note: String(e).slice(0, 60), fail: '', tEnd: 0 };
          }
          r.frac = f;
          out.push(fmt(r));
          console.log(fmt(r));
        }
      }
    }
    console.log('\n===TABLE===\n' + out.join('\n'));
  }, 3600000);
});
