import { describe, expect, it } from 'vitest';
import { AeroEnvelopeEvents } from '../src/physics/rigid/envelope-events';
import { DEG } from '../src/physics/constants';

const body = { id: 'vehicle', name: 'Upper stage', scope: 'vehicle' as const };
const envelope = () => ({ modelVersion: 'test-v1', bodyId: 'upper', configurationId: 'upper-full',
  angleOfAttack: 35 * DEG, sideslip: -2 * DEG, aeroWithinEnvelope: false });

describe('recorded aerodynamic envelope limits', () => {
  it('records the first accepted exceedance with immutable SI metadata across configuration changes', () => {
    const recorder = new AeroEnvelopeEvents();
    const telemetry = envelope();
    expect(recorder.observe(0, undefined, body)).toBeUndefined();
    expect(recorder.observe(1, { ...telemetry, aeroWithinEnvelope: true }, body)).toBeUndefined();
    const event = recorder.observe(2, telemetry, body)!;
    expect(event).toEqual({ t: 2, key: 'evt.aeroEnvelopeExceeded', severity: 'warn', params: {
      scope: 'vehicle', name: 'Upper stage', bodyId: 'upper', configurationId: 'upper-full', modelVersion: 'test-v1',
      angleOfAttackRad: 35 * DEG, sideslipRad: -2 * DEG,
    } });
    telemetry.angleOfAttack = 0;
    telemetry.configurationId = 'payload';
    expect(event.params?.angleOfAttackRad).toBe(35 * DEG);
    expect(event.params?.configurationId).toBe('upper-full');
    expect(recorder.observe(3, { ...telemetry, aeroWithinEnvelope: true }, body)).toBeUndefined();
    expect(recorder.observe(4, telemetry, body)).toBeUndefined();
  });

  it('keeps each detached body separate and starts clean for another flight', () => {
    const recorder = new AeroEnvelopeEvents();
    recorder.observe(2, envelope(), body);
    for (const id of ['debris-1', 'debris-2']) {
      const debris = { id, name: 'First stage', scope: 'debris' as const };
      const telemetry = { ...envelope(), bodyId: undefined, configurationId: undefined };
      expect(recorder.observe(20, telemetry, debris)?.params).toMatchObject({ scope: 'debris', bodyId: id, configurationId: '' });
      expect(recorder.observe(21, telemetry, debris)).toBeUndefined();
    }
    expect(new AeroEnvelopeEvents().observe(2, envelope(), body)).toBeDefined();
  });

  it('records an out-of-range Mach flag even when angle of attack is small', () => {
    const recorder = new AeroEnvelopeEvents();
    expect(recorder.observe(3, { ...envelope(), angleOfAttack: 0, sideslip: 0 }, body)).toBeDefined();
  });
});
