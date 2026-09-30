/**
 * The wind tunnel's bench (roadmap D04), src/design/tunnel-view.ts: the grid
 * the screen sweeps, the configurations it offers, and the map and curves it
 * draws from src/design/tunnel.ts (validated on its own in
 * tests/design-tunnel.test.ts).
 *
 * The references: the point-mass flight's drag curve (`dragCoefficient`),
 * which the tunnel's zero-angle drag must be at every Mach number the curve is
 * drawn at, not only at the table's breakpoints; the tunnel's own points,
 * which the map must hold unchanged; and the definition of the static margin,
 * which fixes the sign the screen explains C_m by (C_m = −C_N · margin about
 * the centre of mass).
 *
 * The tables themselves are estimates, not measured data
 * (src/physics/rigid/aero-tables.ts): nothing here says they are right about a
 * real rocket. Every tolerance was fixed before the comparison it bounds was
 * run; all are rounding bounds.
 */
import { describe, expect, it } from 'vitest';
import {
  TUNNEL_ALPHAS, TUNNEL_LINE_MACH, TUNNEL_LINE_MAX_MACH, TUNNEL_MAP_MACH, TUNNEL_QUANTITIES, cgFromNose, defaultTunnelChoice, mapColour,
  mapPosition, pointValue, rampColour, sweepMap, tunnelBench, tunnelConfig, tunnelLines, tunnelMap,
} from '../src/design/tunnel-view';
import { tunnelSweep } from '../src/design/tunnel';
import { VEHICLES, vehicleById } from '../src/data/vehicles';
import { AERO_MACH } from '../src/physics/rigid/aero-tables';
import { dragCoefficient } from '../src/physics/aero';
import { watchPayload } from '../src/design/stage-table';

describe('the grid', () => {
  it('sweeps the tables\' own Mach numbers and 0–10° by 1°, or 0–90° by 5°', () => {
    expect(TUNNEL_MAP_MACH).toEqual(AERO_MACH);
    expect(TUNNEL_ALPHAS.small).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(TUNNEL_ALPHAS.wide).toHaveLength(19);
    expect(TUNNEL_ALPHAS.wide[18]).toBe(90);
  });

  it('draws its curves from 0 to 10 every 0.05, with every breakpoint on them', () => {
    expect(TUNNEL_LINE_MACH[0]).toBe(0);
    expect(TUNNEL_LINE_MACH[TUNNEL_LINE_MACH.length - 1]).toBe(TUNNEL_LINE_MAX_MACH);
    for (let i = 1; i < TUNNEL_LINE_MACH.length; i++) expect(TUNNEL_LINE_MACH[i]).toBeGreaterThan(TUNNEL_LINE_MACH[i - 1]);
    for (const m of AERO_MACH.filter((x) => x <= 10)) expect(TUNNEL_LINE_MACH).toContain(m);
    // every breakpoint up to 10 is a multiple of 0.05, so none adds a point
    expect(TUNNEL_LINE_MACH).toHaveLength(201);
  });
});

describe('the configurations', () => {
  it('knows a vehicle\'s strap-on groups, launcher stages and fairing', () => {
    expect(tunnelBench(vehicleById('falcon9'))).toEqual({ groups: [], launcherStages: 2, hasFairing: true });
    const a6 = tunnelBench(vehicleById('ariane64'));
    expect(a6.groups).toHaveLength(1);
    expect(a6.groups[0].count).toBe(4);
    expect(tunnelBench(vehicleById('saturnv')).hasFairing).toBe(false);
  });

  it('holds a choice to what the vehicle has', () => {
    const spec = vehicleById('ariane64');
    const c = defaultTunnelChoice(spec, 5000);
    expect(tunnelConfig(spec, c)).toEqual({ boostersOff: [false], stagesGone: 0, fairing: true, propellantFraction: 1 });
    expect(tunnelConfig(spec, { ...c, boostersOn: [false], stagesGone: 7, propellantFraction: 2 }))
      .toEqual({ boostersOff: [true], stagesGone: 1, fairing: true, propellantFraction: 1 });
    expect(tunnelConfig(vehicleById('saturnv'), { ...defaultTunnelChoice(vehicleById('saturnv'), 0), fairing: true }).fairing).toBe(false);
  });
});

describe('the map', () => {
  const spec = vehicleById('falcon9');
  const choice = defaultTunnelChoice(spec, watchPayload(spec));
  const r = sweepMap(spec, choice, 'small');

  it('holds the tunnel\'s points unchanged, rows by angle and columns by Mach number', () => {
    for (const q of TUNNEL_QUANTITIES) {
      const m = tunnelMap(r, q, TUNNEL_MAP_MACH, TUNNEL_ALPHAS.small);
      expect(m.values).toHaveLength(11);
      expect(m.values[0]).toHaveLength(13);
      m.machs.forEach((mach, mi) => m.alphas.forEach((a, ai) => {
        const p = r.points[mi * m.alphas.length + ai];
        expect([p.mach, p.alphaDeg]).toEqual([mach, a]);
        expect(m.values[ai][mi]).toBe(pointValue(p, r, q));
        expect(m.within[ai][mi]).toBe(p.withinEnvelope);
      }));
      expect(m.min).toBe(Math.min(...m.values.flat()));
      expect(m.max).toBe(Math.max(...m.values.flat()));
    }
    expect(() => tunnelMap(r, 'cN', TUNNEL_MAP_MACH, TUNNEL_ALPHAS.wide)).toThrow(RangeError);
  });

  it('measures the centre of pressure from the nose tip, inside the vehicle', () => {
    const m = tunnelMap(r, 'xcp', TUNNEL_MAP_MACH, TUNNEL_ALPHAS.small);
    expect(r.noseX - r.baseX).toBeGreaterThan(spec.height * 0.95);
    for (const row of m.values) for (const v of row) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(r.noseX - r.baseX);
    }
    expect(cgFromNose(r)).toBeCloseTo(r.noseX - r.cgX, 12);
  });

  it('draws C_m on a scale symmetric about zero, the others on their range', () => {
    const cm = tunnelMap(r, 'cm', TUNNEL_MAP_MACH, TUNNEL_ALPHAS.small);
    expect(cm.scale).toBe('diverging');
    expect(cm.lo).toBe(-cm.hi);
    expect(mapPosition(cm, 0)).toBe(0.5);
    const cn = tunnelMap(r, 'cN', TUNNEL_MAP_MACH, TUNNEL_ALPHAS.small);
    expect(cn.scale).toBe('sequential');
    expect([cn.lo, cn.hi]).toEqual([cn.min, cn.max]);
    expect(mapColour(cn, cn.min)).toBe(rampColour(0, 'sequential'));
  });

  it('marks what lies beyond the 15° the tables are built for, as the flight does', () => {
    const wide = sweepMap(spec, choice, 'wide');
    const m = tunnelMap(wide, 'cN', TUNNEL_MAP_MACH, TUNNEL_ALPHAS.wide);
    m.alphas.forEach((a, ai) => m.machs.forEach((mach, mi) => {
      // the flight's envelope: 15° and the table's last Mach number, 25, included
      expect(m.within[ai][mi], `${a}° M${mach}`).toBe(a <= 15);
    }));
  });
});

describe('the curves', () => {
  it('put the tunnel\'s zero-angle drag on the point-mass flight\'s curve at every Mach number drawn', () => {
    for (const id of ['falcon9', 'ariane64', 'soyuz21a', 'saturnv']) {
      const spec = vehicleById(id);
      const lines = tunnelLines(spec, defaultTunnelChoice(spec, watchPayload(spec)));
      expect(lines.mach).toEqual([...TUNNEL_LINE_MACH]);
      lines.mach.forEach((m, i) => {
        expect(lines.cdPointMass[i]).toBe(dragCoefficient(m));
        expect(Math.abs(lines.cD[i] - dragCoefficient(m)), `${id} M${m}`).toBeLessThan(1e-12);
      });
    }
  });

  it('give the flight\'s static margin at zero angle, and C_m has the sign the screen explains it by', () => {
    for (const spec of VEHICLES) {
      const choice = defaultTunnelChoice(spec, watchPayload(spec));
      const lines = tunnelLines(spec, choice, [0.6, 1.2, 3]);
      const r0 = tunnelSweep(spec, choice.payloadKg, tunnelConfig(spec, choice), [0.6, 1.2, 3], [0]);
      lines.marginCal.forEach((v, i) => expect(v).toBe(r0.points[i].staticMarginCal));
      // about the centre of mass C_m = −C_N · margin (calibres): positive C_m turns the nose further
      // into the angle when the margin is negative (unstable), and back when it is positive
      const r = tunnelSweep(spec, choice.payloadKg, tunnelConfig(spec, choice), [0.6, 1.2, 3], [2, 5, 10]);
      for (const p of r.points) {
        expect(Math.abs(p.cm + p.cN * p.staticMarginCal), `${spec.id} M${p.mach} ${p.alphaDeg}°`).toBeLessThan(1e-9 * Math.max(1, Math.abs(p.cm)));
        expect(Math.sign(p.cm)).toBe(-Math.sign(p.staticMarginCal));
      }
    }
  });

  it('moves the margin, and nothing aerodynamic, with the propellant left', () => {
    const spec = vehicleById('falcon9');
    const full = defaultTunnelChoice(spec, watchPayload(spec));
    const a = tunnelLines(spec, full, [0.6, 2]);
    const b = tunnelLines(spec, { ...full, propellantFraction: 0.2 }, [0.6, 2]);
    expect(b.cD).toEqual(a.cD);
    expect(b.referenceDiameter).toBe(a.referenceDiameter);
    b.marginCal.forEach((v, i) => expect(v).not.toBe(a.marginCal[i]));
  });
});

describe('the colours', () => {
  const luminance = (c: string): number => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  it('brighten steadily along the sequential scale', () => {
    let last = -1;
    for (let u = 0; u <= 1.0001; u += 0.05) {
      const l = luminance(rampColour(u, 'sequential'));
      expect(l).toBeGreaterThan(last);
      last = l;
    }
  });

  it('run through neutral grey at zero on the diverging scale, darkest there', () => {
    expect(rampColour(0.5, 'diverging')).toBe('#383835');
    for (const d of [0.1, 0.25, 0.4]) {
      expect(luminance(rampColour(0.5 + d, 'diverging'))).toBeGreaterThan(luminance(rampColour(0.5, 'diverging')));
      expect(luminance(rampColour(0.5 - d, 'diverging'))).toBeGreaterThan(luminance(rampColour(0.5, 'diverging')));
    }
    expect(rampColour(Number.NaN, 'sequential')).toBe(rampColour(0, 'sequential'));
    expect(mapPosition({ lo: 1, hi: 1 }, 1)).toBe(0.5);
  });
});
