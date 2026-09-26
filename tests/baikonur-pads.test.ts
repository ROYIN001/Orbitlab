/**
 * Baikonur's two R-7 pads as drawn (roadmap V05, src/render/pads.ts): which
 * mission gets which, the rocket hanging in its launch table, the four arms at
 * the strap-ons and swinging clear at liftoff, and the ground left open over
 * the pit, with nothing standing over it.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildPad, R7_CLAMP_IN, R7_HANG, type PadBuild } from '../src/render/pads';
import { siteById } from '../src/data/sites';
import { vehicleById } from '../src/data/vehicles';
import { validateConfigInput } from '../src/config/validation';
import { watchMissionSettings, WATCH_MISSIONS } from '../src/ui/watch-missions';

const soyuz = vehicleById('soyuz21a');
const build = (padId?: string, azimuth = 62 * Math.PI / 180, vehicle = soyuz): PadBuild =>
  buildPad(siteById('baikonur'), vehicle, (g) => g, (color, metal = 0.1, rough = 0.7) => new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough }), { padId, azimuth });

/** The four arms' clamp tops in the pad's frame. */
function armTops(pad: PadBuild): THREE.Vector3[] {
  pad.group.updateMatrixWorld(true);
  const tops: THREE.Vector3[] = [];
  pad.group.traverse((o) => {
    if (o.userData.part !== 'r7Arm') return;
    const g = (o as THREE.Mesh).geometry;
    g.computeBoundingBox();
    // the top of the arm's own lattice, less the clamp's reach inward
    tops.push(new THREE.Vector3(-R7_CLAMP_IN, g.boundingBox!.max.y - 0.55, 0).applyMatrix4(o.matrixWorld));
  });
  return tops;
}

/** Whether pad-local (x, z) is over one of the pad's pits. */
const overPit = (pad: PadBuild, x: number, z: number, margin = 0) => (pad.holes ?? []).some((h) => {
  const dx = x - h.x, dz = z - h.z;
  const u = dx * h.ux + dz * h.uz, v = -dx * h.uz + dz * h.ux;
  return Math.abs(u) < h.halfL - margin && Math.abs(v) < h.halfW - margin;
});

describe("Baikonur's pads", () => {
  it('fly the three aborts and the first R-7 flights from Gagarin\'s Start and everything else from Site 31/6', () => {
    const baikonur = siteById('baikonur');
    expect(baikonur.pads?.map((p) => p.id)).toEqual(['site31', 'site1']);
    // G06's aborts, and (C01) Sputnik 1 and Vostok 1, which it was built for
    const gagarin = ['soyuzMs10', 'soyuzT10', 'soyuz18a', 'sputnik1', 'vostok1'] as const;
    for (const id of gagarin) expect(watchMissionSettings(id).padId).toBe('site1');
    for (const m of WATCH_MISSIONS.filter((x) => x.siteId === 'baikonur' && !(gagarin as readonly string[]).includes(x.id))) expect(watchMissionSettings(m.id).padId).toBeUndefined();
    const base = { vehicleId: 'soyuz21a', satelliteId: 'crew', siteId: 'baikonur', orbit: { ...watchMissionSettings('soyuzIss').orbit },
      launchTime: new Date('2026-09-20T12:00:00Z'), payloadMass: 7150, guidanceOverrides: {}, failure: { mode: 'none' as const, time: 0, stage: 0 }, boosterRecovery: false };
    expect(validateConfigInput({ ...base, padId: 'site1' })).toEqual([]);
    expect(validateConfigInput({ ...base, padId: 'site99' })).toContainEqual({ field: 'setup.site', code: 'selection' });
  });

  for (const padId of ['site1', 'site31']) {
    it(`${padId}: the rocket hangs in the table, held by four arms at its strap-ons that swing clear as it rises`, () => {
      const pad = build(padId);
      expect(pad.mountHeight).toBe(-R7_HANG);
      pad.animate(-5, 0);
      const rest = armTops(pad);
      expect(rest).toHaveLength(4);
      // `buildPad` raises the ground by the hang: heights here are from the rocket's base
      const strap = soyuz.stages[0].boosters![0];
      const strapR = soyuz.stages[0].diameter / 2 + strap.diameter / 2;
      for (const p of rest) {
        expect(Math.hypot(p.x, p.z)).toBeGreaterThan(strapR);
        expect(Math.hypot(p.x, p.z)).toBeLessThan(strapR + strap.diameter / 2);
        expect(p.y).toBeGreaterThan(strap.length * 0.7);
        expect(p.y).toBeLessThan(strap.length);
      }
      // one arm at each strap-on: on the launch azimuth and at right angles to it
      const az = 62 * Math.PI / 180, heading = new THREE.Vector2(Math.sin(az), -Math.cos(az));
      const bearings = rest.map((p) => Math.atan2(p.z, p.x) - Math.atan2(heading.y, heading.x));
      for (const b of bearings) expect(Math.abs(Math.sin(2 * b))).toBeLessThan(1e-9);
      pad.animate(1, 5);
      for (const p of armTops(pad)) expect(Math.hypot(p.x, p.z)).toBeGreaterThan(strapR + 8);
    });

    it(`${padId}: the ground is open over the pit, and no mast stands over it`, () => {
      const pad = build(padId);
      expect(pad.holes).toHaveLength(1);
      const ground = pad.terrainParts![0] as THREE.Mesh;
      const pos = ground.geometry.attributes.position, index = ground.geometry.index!;
      let inside = 0;
      for (let i = 0; i < index.count; i += 3) {
        let x = 0, z = 0;
        for (let k = 0; k < 3; k++) { x += pos.getX(index.getX(i + k)) / 3; z += pos.getZ(index.getX(i + k)) / 3; }
        if (overPit(pad, x, z)) inside++;
      }
      expect(inside).toBe(0);
      expect(index.count).toBeGreaterThan(10000);
      for (const [x, z] of pad.floodPositions ?? []) expect(overPit(pad, x, z, -5)).toBe(false);
    });
  }

  it('leaves a vehicle that is not an R-7 on the generic pad', () => {
    const pad = build(undefined, 0, vehicleById('protonm'));
    expect(pad.holes).toBeUndefined();
  });
});
