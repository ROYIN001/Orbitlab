import { describe, expect, it } from 'vitest';
import { DEG, R_EARTH } from '../src/physics/constants';
import { DEFAULT_GUIDANCE } from '../src/physics/defaults';
import { alphaBudget, AscentGuidance, type GuidanceInputs } from '../src/physics/guidance';
import { v3 } from '../src/physics/vec3';

// Equator at +X: local up=+X, east=+Y, north=+Z. The kick is east.
const input = (changes: Partial<GuidanceInputs> = {}): GuidanceInputs => ({
  t: 0, r: v3(R_EARTH + 1000, 0, 0), v: v3(100, 0, 0), vAir: v3(100, 0, 0),
  altitude: 1000, altitudeAGL: 1000, q: 0, thrustAccelFull: 15, thrustAccel: 15,
  timeToGo: () => 300, stageBurnTimeLeft: 250, stageDvLeft: 4000, nextStageAccel: 10,
  kickStageAccel: 10, apoapsisAlt: 1500, isFirstStage: true, maxAccel: 40,
  maxQPlacard: 50000, requireDownrangeKick: true, ...changes,
});
const guidance = () => new AscentGuidance({ ...DEFAULT_GUIDANCE, pitchOverAltitude: 50, kickAngle: 4, kickDuration: 12 }, 90 * DEG, 0, 200000);

describe('wind-aware physical kick transition', () => {
  it.each([v3(100, -8, 0), v3(100, 2, 12), v3(-100, 8, 0)])('does not mistake upwind, crossrange or descending velocity for a completed downrange kick: %j', vAir => {
    const guide = guidance();
    expect(guide.update(input()).phase).toBe('kick');
    expect(guide.update(input({ t: 12, vAir })).phase).toBe('kick');
    expect(guide.update(input({ t: 14, vAir: v3(100, 8, 0) })).phase).toBe('gravityTurn');
  });

  it('requires both the signed downrange angle and the kick duration', () => {
    const guide = guidance();
    guide.update(input());
    expect(guide.update(input({ t: 11.99, vAir: v3(100, 8, 12) })).phase).toBe('kick');
    expect(guide.update(input({ t: 12, vAir: v3(100, 8, 12) })).phase).toBe('gravityTurn');
  });

  it('preserves legacy total-angle calibration when the physical-wind flag is absent', () => {
    const guide = guidance();
    guide.update(input({ requireDownrangeKick: undefined }));
    expect(guide.update(input({ t: 12, vAir: v3(100, -8, 0), requireDownrangeKick: undefined })).phase).toBe('gravityTurn');
  });

  it('leaves a calm downrange kick identical in both models', () => {
    const physical = guidance(), legacy = guidance();
    for (const t of [0, 6, 12, 14, 20]) {
      const vAir = v3(100, t < 12 ? 2 : 8, 0);
      const a = physical.update(input({ t, vAir, vGround: { ...vAir } }));
      const b = legacy.update(input({ t, vAir, requireDownrangeKick: undefined }));
      expect(a).toEqual(b);
    }
  });

  it('follows established ground downrange velocity despite a headwind or crosswind air vector', () => {
    const guide = guidance();
    guide.update(input());
    const command = guide.update(input({ t: 12, vAir: v3(100, -4, 12), vGround: v3(100, 8, 0) }));
    expect(command.phase).toBe('gravityTurn');
    expect(command.dir.y).toBeGreaterThan(0);
    expect(Math.abs(command.dir.z)).toBeLessThan(1e-12);
  });

  it('retains the actual air-relative angle budget when the ground trajectory points elsewhere', () => {
    const guide = guidance();
    guide.update(input());
    const q = 40000;
    const command = guide.update(input({ t: 12, q, vAir: v3(100, 0, 0), vGround: v3(100, 30, 30) }));
    expect(command.phase).toBe('gravityTurn');
    expect(Math.acos(command.dir.x)).toBeLessThanOrEqual(alphaBudget(q) + 1e-12);
    expect(command.dir.y).toBeGreaterThan(0);
    expect(command.dir.z).toBeGreaterThan(0);
  });
});
