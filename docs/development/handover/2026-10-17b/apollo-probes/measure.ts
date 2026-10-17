/** Probe: one Apollo launch flown end to end, its figures measured (the sweep's columns). */
import { make, type Change } from './fly';
import { APOLLO11 } from '../../src/data/apollo11';
import { coastToPerilune } from '../../src/physics/lunar/cislunar';
import { moonState, sunState } from '../../src/physics/lunar/ephemeris';
import { selenographicToEci } from '../../src/physics/lunar/orientation';
import { add, cross, dot, norm, normalize, sub, type Vec3 } from '../../src/physics/vec3';
import { G0 } from '../../src/physics/constants';

const R2D = 180 / Math.PI;
const ang = (a: Vec3, b: Vec3) => Math.acos(Math.max(-1, Math.min(1, dot(normalize(a), normalize(b))))) * R2D;

export interface Row { [k: string]: unknown }

export function measure(name: string, change: Change, until = 720_000): Row {
  const sim = make(change);
  const row: Row = { name };
  const jd0 = () => sim.plan.jd0;
  let seen = 0, ign: { t: number; m: number; n: Vec3; prop: number } | undefined, minMoon = { d: Infinity, t: 0 };
  let maxStepMs = 0, beginMs = 0, periAt = Infinity;
  const t0 = performance.now();
  let guard = 0;
  while (!sim.isFailed() && sim.state.status !== 'landed' && sim.state.t < until && guard++ < 5_000_000) {
    const wasStarted = sim.apollo.started, wasPhase = sim.apollo.phase;
    const a = performance.now();
    sim.step(sim.suggestedDt());
    const dtMs = performance.now() - a;
    maxStepMs = Math.max(maxStepMs, dtMs);
    if (!wasStarted && (sim.apollo.started || sim.events.some((e) => ['evt.tliUnsolved', 'evt.lunarProfileTable', 'evt.lunarProfileOff'].includes(e.key)))) beginMs = Math.max(beginMs, dtMs);
    if (wasPhase !== 'tli' && sim.apollo.phase === 'tli') {
      const st = sim.vehicle.active;
      ign = { t: sim.state.t, m: sim.vehicle.totalMass(), n: cross(sim.state.r, sim.state.v), prop: st?.propellant ?? NaN };
    }
    for (; seen < sim.events.length; seen++) {
      const e = sim.events[seen], p = (e.params ?? {}) as Record<string, number>;
      switch (e.key) {
        case 'evt.parkingOrbit': row.park = `${p.pe}x${p.ap} ${p.inc}°`; break;
        case 'evt.targetOrbit': case 'evt.offTargetOrbit': row.parkRaan = p.raan; row.parkOn = e.key === 'evt.targetOrbit'; break;
        case 'evt.lunarProfileOff': case 'evt.lunarProfileTable': case 'evt.tliUnsolved': row.stop = e.key; break;
        case 'evt.tliPlanned': row.plan = `T+${p.min}min c3 ${p.c3}`; break;
        case 'evt.tli': case 'evt.tliShort': {
          row.tli = e.key === 'evt.tli' ? 'ok' : 'SHORT';
          row.c3 = p.c3; row.tliInc = p.inc;
          const s = sim.state, m1 = sim.vehicle.totalMass(), st = sim.vehicle.active;
          if (ign) {
            row.tliIgn = +(ign.t / 3600).toFixed(4);
            row.tliDv = Math.round(432 * G0 * Math.log(ign.m / m1)); // rocket equation at ~430 s
            row.tliPlane = +ang(ign.n, cross(s.r, s.v)).toFixed(3);
            row.sivbLeft = Math.round(st?.propellant ?? NaN);
          }
          periAt = e.t + 20;
          break;
        }
        case 'evt.evasive': row.evasive = p.dv; break;
        case 'evt.mcc': row.mcc = p.dv; break;
        case 'evt.mccSkipped': if (!row.tei) row.mcc = 'skipped'; break;
        case 'evt.lunarSoi': row.soi = +(e.t / 3600).toFixed(2); break;
        case 'evt.loi': row.loi = p.dv; break;
        case 'evt.loiSkipped': row.stop = `loiSkipped ${p.alt}`; break;
        case 'evt.lunarOrbit': if (!row.loiOrbit) row.loiOrbit = `${p.ap}x${p.pe} (${p.dv})`; break;
        case 'evt.circularize': row.loi2 = p.dv; break;
        case 'evt.doi': row.doi = p.dv; break;
        case 'evt.lmEngineOff': {
          row.landMiss = p.miss;
          const jd = jd0() + e.t / 86400, site = selenographicToEci(APOLLO11.landing.lat, APOLLO11.landing.lon, 1, jd);
          const sun = sub(sunState(jd).r, moonState(jd).r);
          row.sunEl = +(90 - ang(site, sun)).toFixed(1);
          row.landT = +(e.t / 3600).toFixed(3);
          break;
        }
        case 'evt.impact': row.stop = `impact ${p.speed}`; break;
        case 'evt.tei': row.tei = p.dv; break;
        case 'evt.teiUnsolved': row.stop = 'teiUnsolved'; break;
        case 'evt.transearthMcc': row.mcc5 = p.dv; break;
        case 'evt.entryInterface': row.ei = `${p.v} ${p.fpa}°`; break;
        case 'evt.cmSplashdown': {
          row.splash = `${p.lat},${p.lon}`; row.splashMissColumbia = p.miss; row.maxG = p.g;
          const g = (sim.apollo as unknown as { entryGuidance?: { target: { lat: number; lon: number } } }).entryGuidance;
          if (g) {
            const la = p.lat * Math.PI / 180, lo = p.lon * Math.PI / 180, tl = g.target.lat, tn = g.target.lon;
            const c = Math.sin(la) * Math.sin(tl) + Math.cos(la) * Math.cos(tl) * Math.cos(lo - tn);
            row.target = `${(tl * R2D).toFixed(2)},${(tn * R2D).toFixed(2)}`;
            row.splashMissTarget = +(Math.acos(Math.min(1, c)) * 6378.137).toFixed(1);
          }
          break;
        }
        case 'evt.spsCutoff': if (e.severity === 'warn') row.spsWarn = (row.spsWarn ?? '') + ` ${(e.t / 3600).toFixed(1)}h`; break;
        default: break;
      }
    }
    if (sim.state.t >= periAt) {
      periAt = Infinity;
      const s = sim.state, pl = coastToPerilune(jd0(), s.t, { r: s.r, v: s.v }, APOLLO11.mcc2.arrival + 12 * 3600);
      if (pl) { row.tliPeri = +((norm(pl.rel.r) - APOLLO11.siteRadius) / 1e3).toFixed(1); row.tliPeriT = Math.round(pl.t - APOLLO11.mcc2.arrival); }
      else row.tliPeri = 'none';
    }
    if (sim.apollo.started && ['coast', 'approach', 'midcourse', 'extracted', 'evasive'].includes(sim.apollo.phase)) {
      const d = norm(sub(sim.state.r, moonState(jd0() + sim.state.t / 86400).r));
      if (d < minMoon.d) minMoon = { d, t: sim.state.t };
    }
  }
  if (minMoon.d < Infinity) { row.periReached = Math.round((minMoon.d - APOLLO11.siteRadius) / 1e3); row.periReachedT = Math.round(minMoon.t - APOLLO11.mcc2.arrival); }
  row.end = `${sim.apollo.phase} ${(sim.state.t / 3600).toFixed(1)}h${sim.isFailed() ? ' FAILED' : ''}`;
  row.warns = sim.events.filter((e) => e.severity === 'warn' || e.severity === 'fail').map((e) => e.key).filter((k, i, a) => a.indexOf(k) === i).join(' ');
  row.wallS = +((performance.now() - t0) / 1000).toFixed(1);
  row.beginMs = Math.round(beginMs); row.maxStepMs = Math.round(maxStepMs);
  return row;
}

export { add };
