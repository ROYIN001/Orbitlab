/**
 * Roadmap D01: interstages as derived, massless display parts
 * (src/design/interstages.ts).
 *
 * The references: the stack as the renderer and the six-DOF geometry draw it
 * (`stackLayout` in src/physics/frame.ts), and the adapter height restated
 * here by hand, |Δd|·1.1 + 0.6 m for a diameter step of more than 50 mm.
 * Heights are held to 1e-12 m. That bound was fixed before the first
 * comparison: the formula is restated operand for operand, so the only room
 * for a difference is none, and 1e-12 m only allows for a different
 * association of the same additions in the stack total (values of up to
 * ~120 m, where one double ulp is ~1.4e-14 m).
 */
import { describe, expect, it } from 'vitest';
import { VEHICLES } from '../src/data/vehicles';
import { stackLayout } from '../src/physics/frame';
import { interstageParts } from '../src/design/interstages';

describe('D01 interstages: derived, massless display parts', () => {
  it('rebuild the drawn stack height of every vehicle with no mass', () => {
    for (const v of VEHICLES) {
      const parts = interstageParts(v);
      const launcher = v.stages.filter((s) => !s.isSpacecraft);
      const drawn = launcher.reduce((sum, s) => sum + s.length, 0) + parts.reduce((sum, p) => sum + p.height, 0);
      // 1e-12 m, fixed before the comparison (file comment)
      expect(Math.abs(drawn - stackLayout(v).total)).toBeLessThan(1e-12);
      for (const p of parts) {
        expect(p.mass).toBe(0);
        // the drawn adapter, restated: |Δd|·1.1 + 0.6 m for a step of more than 50 mm
        expect(Math.abs(p.upperDiameter - p.lowerDiameter)).toBeGreaterThan(0.05);
        expect(Math.abs(p.height - (Math.abs(p.upperDiameter - p.lowerDiameter) * 1.1 + 0.6))).toBeLessThan(1e-12);
      }
    }
  });

  it('place them where the stack changes diameter, and nowhere a fairing brings its own cone', () => {
    const at = (id: string) => interstageParts(VEHICLES.find((v) => v.id === id)!).map((p) => `${p.stageId}>${p.carries}`);
    // Falcon 9: 3.66 m stages under a 5.2 m fairing
    expect(at('falcon9')).toEqual(['s2>fairing']);
    // Soyuz-2.1a: Blok A 2.95 m to Blok I 2.66 m; the fairing's own 2.2 m cone
    // stands flush on Blok I
    expect(at('soyuz21a')).toEqual(['blokA>blokI']);
    // Saturn V: the S-II 10.1 m to the S-IVB 6.6 m, and no fairing
    expect(at('saturnv')).toEqual(['sii>sivb']);
    const f9 = interstageParts(VEHICLES.find((v) => v.id === 'falcon9')!)[0];
    // (5.2 − 3.66)·1.1 + 0.6 = 2.294 m, by hand
    expect(Math.abs(f9.height - 2.294)).toBeLessThan(1e-12);
  });

  it('add up to launcher stacks restated by hand, not by stackLayout', () => {
    // The first test sums the same interstageHeight calls stackLayout sums, so
    // it proves nothing is dropped or doubled, not that the total is right.
    // These are stage lengths and adapters added by hand from the spec's
    // figures, held to the file's 1e-12 m:
    //  Falcon 9   42 + 15 + (5.2 − 3.66)·1.1 + 0.6          = 59.294 m
    //  Soyuz-2.1a 27.8 + (2.95 − 2.66)·1.1 + 0.6 + 6.7      = 35.419 m, and
    //             with the 11.43 m fairing 46.849 m, the "46.85 m drawn" of
    //             the owner's figures quoted in src/data/vehicles.ts
    //  Saturn V   42 + 24.9 (flush, both 10.1 m) + 18.8
    //             + (10.1 − 6.6)·1.1 + 0.6                   = 90.15 m
    const stack = (id: string) => {
      const v = VEHICLES.find((x) => x.id === id)!;
      return v.stages.filter((s) => !s.isSpacecraft).reduce((sum, s) => sum + s.length, 0)
        + interstageParts(v).reduce((sum, p) => sum + p.height, 0);
    };
    expect(Math.abs(stack('falcon9') - 59.294)).toBeLessThan(1e-12);
    expect(Math.abs(stack('soyuz21a') - 35.419)).toBeLessThan(1e-12);
    expect(Math.abs(stack('soyuz21a') + VEHICLES.find((v) => v.id === 'soyuz21a')!.fairing!.length - 46.849)).toBeLessThan(1e-12);
    expect(Math.abs(stack('saturnv') - 90.15)).toBeLessThan(1e-12);
  });
});
