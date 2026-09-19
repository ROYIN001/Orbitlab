import { describe, expect, it } from 'vitest';
import { AttitudeTrack } from '../src/replay/attitude-track';
import { type RigidTelemetry } from '../src/physics/rigid/telemetry';
import { quatAngularDistance, quatFromAxisAngle } from '../src/physics/rigid/math';
import { v3 } from '../src/physics/vec3';

function telemetry(angle = 0): RigidTelemetry {
  return { modelVersion: 'test', bodyId: 'stack', configurationId: 's1+s2',
    attitudeQ: quatFromAxisAngle(v3(1, 0, 0), angle), omegaBody: v3(0.2, 0, 0),
    cgBody: v3(), renderOffsetBody: v3(), inertiaBody: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    controlMode: 'auto', engineDeflections: {}, rcsPropellantKg: 0, saturated: false,
    angleOfAttack: 0, sideslip: 0, aeroWithinEnvelope: true, windECI: v3(), rawQuaternionNormError: 0 };
}

describe('compact attitude tracks', () => {
  it('retains full turns with a bounded angular/temporal interval, including a pending tail', () => {
    const track = new AttitudeTrack();
    for (let i = 0; i <= 4000; i++) track.record(i * 0.01, telemetry(i * 0.002));
    for (const t of [0, 3.14159, 15.70796, 22.123, 31.415926, 39.99, 40]) {
      const at = track.at(t, telemetry())!;
      expect(at).toBeDefined();
      expect(quatAngularDistance(at.attitudeQ, quatFromAxisAngle(v3(1, 0, 0), t * 0.2))).toBeLessThan(1e-12);
      expect(at.omegaBody).toEqual(v3(0.2, 0, 0));
    }
    expect(track.window().samples).toBeLessThanOrEqual(162);
    expect(track.window().bytes).toBeLessThan(20_000);
    const fast = new AttitudeTrack();
    for (let i = 0; i <= 100; i++) fast.record(i * 0.01, { ...telemetry(i * 0.02), omegaBody: v3(2, 0, 0) });
    expect(fast.window().samples).toBeGreaterThan(10); // angular travel, not 4 Hz, controls sampling
  });

  it('does not blend body/configuration/model changes and cannot mutate stored numeric data', () => {
    const track = new AttitudeTrack(), old = telemetry(), next = { ...telemetry(2), configurationId: 's2' };
    track.record(0, old); track.record(0.01, telemetry(0.002));
    track.record(0.02, next);
    const before = track.at(0.015, old)!;
    expect(quatAngularDistance(before.attitudeQ, quatFromAxisAngle(v3(1, 0, 0), 0.002))).toBeLessThan(1e-12);
    expect(track.at(0.02, old)).toBeUndefined();
    expect(quatAngularDistance(track.at(0.02, next)!.attitudeQ, next.attitudeQ)).toBeLessThan(1e-12);
    const copy = track.at(0.02, next)!; copy.attitudeQ.w = 99; copy.omegaBody.x = 99;
    next.attitudeQ.w = 88; next.omegaBody.x = 88;
    expect(track.at(0.02, next)!.omegaBody.x).toBe(0.2);
    expect(track.at(0.02, { ...next, modelVersion: 'another' })).toBeUndefined();
  });

  it('pins both sides of same-time configuration changes and reports retained-window loss', () => {
    const track = new AttitudeTrack(4), value = telemetry();
    for (let i = 0; i <= 10; i++) track.record(i / 4, telemetry(i / 20));
    expect(track.window()).toMatchObject({ samples: 4, truncated: true, from: 1.75, to: 2.5 });
    expect(track.window().bytes).toBe(4 * 68 + 64);
    expect(track.at(1, value)).toBeUndefined(); expect(track.at(2, value)).toBeDefined();
    const post = { ...telemetry(1), configurationId: 'post-event' };
    track.record(2.5, post);
    expect(track.at(2.5, value)).toBeUndefined();
    expect(quatAngularDistance(track.at(2.5, post)!.attitudeQ, post.attitudeQ)).toBeLessThan(1e-12);
    expect(track.at(3, post)).toBeUndefined();
  });
});
