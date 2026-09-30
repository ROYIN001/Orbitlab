import { describe, expect, it } from 'vitest';
import fixture from '../src/data/iridium33-cosmos2251.json';
import { encounterPlane, encounterPlaneSvg, type EncounterPlane } from '../src/orbit/encounter-plane';
import { inertialVelocity, rtnAxes, rtnToFrame, type Mat3, type PosVel } from '../src/orbit/conjunction';
import { v3 } from '../src/physics/vec3';

function textPosition(svg: string, text: string): { x: number; y: number; anchor: string } {
  const tag = [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].find((m) => m[2] === text)?.[1];
  if (!tag) throw new Error(`Missing SVG label ${text}`);
  return { x: Number(tag.match(/\bx="([^"]+)"/)?.[1]), y: Number(tag.match(/\by="([^"]+)"/)?.[1]),
    anchor: tag.match(/text-anchor="([^"]+)"/)?.[1] ?? 'start' };
}

describe('encounter-plane label placement', () => {
  for (const paper of [false, true]) {
    it(`separates the actual Iridium 3σ label from Cosmos 2251 (${paper ? 'paper' : 'screen'})`, () => {
      const state = (o: { r: number[]; v: number[] }): PosVel => inertialVelocity({ r: v3(...o.r as [number, number, number]), v: v3(...o.v as [number, number, number]) });
      const a = state(fixture.iridium33), b = state(fixture.cosmos2251);
      const plane = encounterPlane(a, rtnToFrame(fixture.iridium33.cov as Mat3, rtnAxes(a)),
        b, rtnToFrame(fixture.cosmos2251.cov as Mat3, rtnAxes(b)), fixture.hardBodyRadius.iridium33 + fixture.hardBodyRadius.cosmos2251);
      const before = structuredClone(plane);
      const svg = encounterPlaneSvg(plane, { first: 'Iridium 33', second: 'Cosmos 2251', scale: 'plane' }, 280, paper);
      const sigma = textPosition(svg, '3σ'), second = textPosition(svg, 'Cosmos 2251');
      expect(sigma.anchor).toBe('end');
      expect(second.anchor).toBe('end');
      // Conservative 11 px per character bounds at the SVG's 11 px font.
      // The previous upper-right 3σ label intersected the second name.
      expect(sigma.x + 8).toBeLessThan(second.x - 'Cosmos 2251'.length * 11);
      expect(sigma.y - 11).toBeGreaterThan(140);
      expect(plane).toEqual(before);
    });
  }

  for (const angle of [-Math.PI / 2, -Math.PI / 4, 0, Math.PI / 4, Math.PI / 2]) {
    for (const missX of [-300, 300]) {
      it(`keeps the 3σ label inside the plot for angle ${angle} and miss ${missX}`, () => {
        const plane: EncounterPlane = { miss: { x: missX, y: 0 }, sigma: [1000, 10], angle, radius: 10 };
        const sigma = textPosition(encounterPlaneSvg(plane, { first: 'A', second: 'B', scale: 'plane' }), '3σ');
        const left = sigma.anchor === 'end' ? sigma.x - 22 : sigma.x;
        const right = sigma.anchor === 'end' ? sigma.x : sigma.x + 22;
        expect(left).toBeGreaterThanOrEqual(8);
        expect(right).toBeLessThanOrEqual(272);
        expect(sigma.y - 11).toBeGreaterThanOrEqual(20);
        expect(sigma.y).toBeLessThanOrEqual(248);
      });
    }
  }
});
