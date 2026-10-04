import { describe, expect, it } from 'vitest';
import { missionSource } from '../src/ui/mission-source';

describe('R3.5 mission source', () => {
  const base = { origin: 'workspace' as const, lesson: false, customVehicle: false, customSatellite: false };
  it('names a catalogue mission, the user\'s design, a lesson and the viewer\'s launch', () => {
    expect(missionSource(base)).toBe('catalogue');
    expect(missionSource({ ...base, customVehicle: true })).toBe('design');
    expect(missionSource({ ...base, customSatellite: true })).toBe('design');
    expect(missionSource({ ...base, origin: 'watch' })).toBe('viewer');
    expect(missionSource({ ...base, origin: 'demo', customVehicle: true })).toBe('viewer');
    expect(missionSource({ ...base, lesson: true, origin: 'watch' })).toBe('lesson');
    expect(missionSource({ ...base, origin: 'template' })).toBe('template');
  });
});
