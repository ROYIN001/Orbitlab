/** The physically based sky's helpers (roadmap V02): sunlight in the Earth's shadow and the twilight jellyfish. */
import { describe, expect, it } from 'vitest';
import { sunlitAt } from '../src/render/sky';
import { jellyfishIntensity, jellyfishRadius } from '../src/render/twilight-plume';
import { ATMOSPHERE_HEIGHT } from '../src/render/atmosphere';
import { R_EARTH } from '../src/physics/constants';

const SUN = { x: 1, y: 0, z: 0 };

describe('sunlight and shadow (V02)', () => {
  it('lights the day side, darkens the night side, and softens the limb', () => {
    expect(sunlitAt({ x: R_EARTH + 1e3, y: 0, z: 0 }, SUN)).toBe(1);
    expect(sunlitAt({ x: -(R_EARTH + 1e3), y: 0, z: 0 }, SUN)).toBe(0);
    // behind the Earth but high enough to see past it
    expect(sunlitAt({ x: -1e6, y: R_EARTH + 200e3, z: 0 }, SUN)).toBe(1);
    const edge = sunlitAt({ x: -1e6, y: R_EARTH + 20e3, z: 0 }, SUN);
    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(1);
  });
  it('models the atmosphere to 100 km', () => {
    expect(ATMOSPHERE_HEIGHT).toBe(100e3);
  });
});

describe('twilight jellyfish (V02)', () => {
  // at dusk: the pad is past sunset, the vehicle climbs over the terminator into sunlight
  const sunlitHigh = { thrust: 1e6, altitude: 110e3, r: { x: -1e6, y: R_EARTH + 110e3, z: 0 } };
  it('grows with altitude as the plume expands into near-vacuum', () => {
    expect(jellyfishRadius(30e3)).toBe(0);
    expect(jellyfishRadius(80e3)).toBeGreaterThan(10e3);
    expect(jellyfishRadius(300e3)).toBe(60e3);
  });
  it('glows only with the engines burning, the vehicle in sunlight and the observer in twilight', () => {
    const dusk = -0.12; // the sun about 7° below the observer's horizon
    expect(jellyfishIntensity(sunlitHigh, SUN, dusk)).toBeGreaterThan(0.8);
    expect(jellyfishIntensity({ ...sunlitHigh, thrust: 0 }, SUN, dusk)).toBe(0);
    expect(jellyfishIntensity({ ...sunlitHigh, r: { x: -(R_EARTH + 110e3), y: 0, z: 0 } }, SUN, dusk)).toBe(0);
    expect(jellyfishIntensity({ ...sunlitHigh, altitude: 20e3 }, SUN, dusk)).toBe(0);
    // broad daylight washes it out; deep night leaves it only a faint glow
    expect(jellyfishIntensity(sunlitHigh, SUN, 0.5)).toBe(0);
    expect(jellyfishIntensity(sunlitHigh, SUN, -0.6)).toBeLessThan(0.2);
  });
});
