/**
 * Engine nozzle layouts: where each stage's and strap-on's chambers sit on its
 * base, in the pattern the real vehicle uses (Falcon's octaweb, the Soyuz
 * four-chamber RD-107/108 with its verniers, Proton's six, Super Heavy's three
 * rings, and so on).
 *
 * Shared by the renderer, which draws a bell at each position, and the
 * six-DOF model, which puts a chamber there (src/physics/rigid/vehicle-data.ts),
 * so what is drawn is what is flown. Free of Three.js so the physics worker can
 * load it.
 */
import type { EngineSpec } from '../types';

export interface NozzlePos {
  x: number;
  z: number;
  /** exit radius, m */
  r: number;
  /** bell length, m */
  len: number;
}

export interface EngineLayout {
  nozzles: NozzlePos[];
  verniers: NozzlePos[];
  /** radius that the plume of the whole cluster should use, m */
  clusterRadius: number;
}

function ring(n: number, radius: number, r: number, len: number, phase = 0): NozzlePos[] {
  const out: NozzlePos[] = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    out.push({ x: Math.cos(a) * radius, z: Math.sin(a) * radius, r, len });
  }
  return out;
}

/**
 * Nozzle positions for a stage or booster group.
 * @param id stage or booster-group id
 * @param engine engine spec (count matters)
 * @param R body radius, m
 * @param nozzleLength override from the spec, m
 */
export function engineLayout(id: string, engine: EngineSpec, R: number, nozzleLength?: number): EngineLayout {
  const L = (f: number) => nozzleLength ?? R * f;
  switch (id) {
    // --- SpaceX octaweb: eight around the rim, one in the middle
    case 's1': case 'core': case 'side': {
      const r = R * 0.205, len = R * 0.62;
      return { nozzles: [...ring(8, R * 0.70, r, len, Math.PI / 8), { x: 0, z: 0, r, len }], verniers: [], clusterRadius: R * 0.92 };
    }
    case 's2': return { nozzles: [{ x: 0, z: 0, r: R * 0.62, len: R * 1.5 }], verniers: [], clusterRadius: R * 0.7 };
    // --- Soyuz: RD-108A, four combustion chambers plus four verniers
    case 'blokA':
      return {
        nozzles: ring(4, R * 0.40, R * 0.30, R * 0.72, Math.PI / 4),
        verniers: ring(4, R * 0.84, R * 0.085, R * 0.22, 0),
        clusterRadius: R * 0.88,
      };
    // --- Soyuz strap-on: RD-107A, four chambers plus two verniers
    case 'blokBVGD':
      return {
        nozzles: ring(4, R * 0.42, R * 0.31, R * 0.74, Math.PI / 4),
        verniers: [{ x: R * 0.85, z: 0, r: R * 0.10, len: R * 0.26 }, { x: -R * 0.85, z: 0, r: R * 0.10, len: R * 0.26 }],
        clusterRadius: R * 0.9,
      };
    case 'blokI':
      return { nozzles: ring(4, R * 0.42, R * 0.26, R * 0.66, Math.PI / 4), verniers: ring(4, R * 0.82, R * 0.07, R * 0.2), clusterRadius: R * 0.85 };
    // --- Vostok-K's Blok E: the fixed RD-0109 chamber and its four steering nozzles
    case 'blokE':
      return { nozzles: [{ x: 0, z: 0, r: R * 0.36, len: R * 0.8 }], verniers: ring(4, R * 0.8, R * 0.06, R * 0.18, Math.PI / 4), clusterRadius: R * 0.55 };
    // --- Saturn V: four outer engines on a cross, one in the middle (the ring
    // first: its four are the ones that gimbal)
    case 'sic': {
      const r = R * 0.19, len = R * 0.56;
      return { nozzles: [...ring(4, R * 0.5, r, len, Math.PI / 4), { x: 0, z: 0, r, len }], verniers: [], clusterRadius: R * 0.8 };
    }
    case 'sii': {
      const r = R * 0.1, len = R * 0.3;
      return { nozzles: [...ring(4, R * 0.36, r, len, Math.PI / 4), { x: 0, z: 0, r, len }], verniers: [], clusterRadius: R * 0.5 };
    }
    case 'sivb': return { nozzles: [{ x: 0, z: 0, r: R * 0.15, len: R * 0.62 }], verniers: [], clusterRadius: R * 0.25 };
    // --- Proton: six RD-276 around the core tank
    case 'p1': return { nozzles: ring(6, R * 0.62, R * 0.21, R * 0.5), verniers: [], clusterRadius: R * 0.85 };
    case 'p2': return { nozzles: ring(4, R * 0.46, R * 0.26, R * 0.66, Math.PI / 4), verniers: [], clusterRadius: R * 0.8 };
    case 'p3': return { nozzles: [{ x: 0, z: 0, r: R * 0.40, len: R * 0.9 }], verniers: ring(4, R * 0.8, R * 0.07, R * 0.2), clusterRadius: R * 0.55 };
    // --- Super Heavy: 33 Raptors in three rings (3 / 10 / 20)
    case 'superheavy': {
      const r = R * 0.072, len = R * 0.19;
      return {
        nozzles: [...ring(3, R * 0.10, r, len), ...ring(10, R * 0.36, r, len, 0.2), ...ring(20, R * 0.72, r, len, 0.1)],
        verniers: [], clusterRadius: R * 0.95,
      };
    }
    case 'ship': {
      const r = R * 0.075, len = R * 0.2;
      return {
        nozzles: [...ring(3, R * 0.12, r, len), ...ring(3, R * 0.38, r * 1.7, len * 2.1, Math.PI / 3)],
        verniers: [], clusterRadius: R * 0.6,
      };
    }
    // --- single large solid motor (PSLV core)
    case 'ps1': return { nozzles: [{ x: 0, z: 0, r: R * 0.52, len: R * 0.95 }], verniers: [], clusterRadius: R * 0.62 };
    case 'ps2': return { nozzles: [{ x: 0, z: 0, r: R * 0.36, len: R * 0.9 }], verniers: ring(2, R * 0.85, R * 0.08, R * 0.2), clusterRadius: R * 0.45 };
    case 'ps3': return { nozzles: [{ x: 0, z: 0, r: R * 0.45, len: R * 0.9 }], verniers: [], clusterRadius: R * 0.5 };
    case 'ps4': return { nozzles: ring(2, R * 0.45, R * 0.2, R * 0.5), verniers: [], clusterRadius: R * 0.6 };
    // --- Electron: nine small Rutherfords
    case 'e1': {
      const r = R * 0.135, len = R * 0.4;
      return { nozzles: [...ring(8, R * 0.62, r, len), { x: 0, z: 0, r, len }], verniers: [], clusterRadius: R * 0.85 };
    }
    // --- two-chamber / two-engine first stages
    case 'ccb': return { nozzles: ring(2, R * 0.33, R * 0.30, R * 0.8), verniers: [], clusterRadius: R * 0.68 };
    case 'v1': return { nozzles: ring(2, R * 0.36, R * 0.30, R * 0.85), verniers: [], clusterRadius: R * 0.7 };
    case 'cz5core': return { nozzles: ring(2, R * 0.32, R * 0.26, R * 0.8), verniers: [], clusterRadius: R * 0.62 };
    case 'h3s1': return { nozzles: ring(2, R * 0.34, R * 0.28, R * 0.95), verniers: [], clusterRadius: R * 0.66 };
    case 'llpm': return { nozzles: [{ x: 0, z: 0, r: R * 0.30, len: R * 1.0 }], verniers: [], clusterRadius: R * 0.4 };
    // --- solid strap-ons: one nozzle each
    case 'gem63': case 'gem63xl': case 'p120c': case 'srb3': case 'psomg': case 'psoma':
      return { nozzles: [{ x: 0, z: 0, r: R * 0.62, len: R * 1.1 }], verniers: [], clusterRadius: R * 0.75 };
    case 'urm1': return { nozzles: [{ x: 0, z: 0, r: R * 0.55, len: R * 1.1 }], verniers: [], clusterRadius: R * 0.65 };
    case 'urm1core': return { nozzles: [{ x: 0, z: 0, r: R * 0.55, len: R * 1.1 }], verniers: ring(4, R * 0.8, R * 0.07, R * 0.2), clusterRadius: R * 0.65 };
    case 'k3': return { nozzles: ring(2, R * 0.36, R * 0.28, R * 0.8), verniers: [], clusterRadius: R * 0.68 };
    // --- Long March second stage: fixed YF-22 with four YF-23 steering verniers
    case 'cz2d2': case 'cz3b2':
      return { nozzles: [{ x: 0, z: 0, r: R * 0.42, len: L(1.0) }], verniers: ring(4, R * 0.82, R * 0.07, R * 0.2, Math.PI / 4), clusterRadius: R * 0.6 };
    default: {
      const n = Math.max(1, Math.min(engine.count, 8));
      if (n === 1) return { nozzles: [{ x: 0, z: 0, r: R * 0.5, len: L(1.0) }], verniers: [], clusterRadius: R * 0.6 };
      const rr = Math.min(R * 0.4, (R * 1.5) / n);
      return { nozzles: ring(n, R * 0.52, rr, L(0.9)), verniers: [], clusterRadius: R * 0.8 };
    }
  }
}
