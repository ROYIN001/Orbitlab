/**
 * The Frames menu and the 3-D frames' text (roadmap E01): the values as each
 * standard writes them, the symbols in the notation in force, and the stored
 * choice of groups. The drawing itself is covered by the browser run.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { angleText } from '../src/render/frames';
import { frameSymbols, loadFrameGroups, FRAMES_STORAGE_KEY } from '../src/ui/frames-menu';
import { setNotationPreference } from '../src/ui/notation';
import { DEG } from '../src/physics/constants';

const memory = (value?: string): Storage => {
  const map = new Map<string, string>(value === undefined ? [] : [[FRAMES_STORAGE_KEY, value]]);
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); } } as Storage;
};
afterEach(() => setNotationPreference('auto', memory()));

describe('angle values', () => {
  it('writes ISO bearings over 0–360° and ГОСТ\'s from the launch azimuth signed, with a true minus', () => {
    expect(angleText('yaw', -10 * DEG, 'iso')).toBe('350.0°');
    expect(angleText('track', 370 * DEG, 'iso')).toBe('10.0°');
    expect(angleText('yaw', -10 * DEG, 'gost')).toBe('−10.0°');
    expect(angleText('alpha', -2.345 * DEG, 'iso')).toBe('−2.3°');
    expect(angleText('pitch', 90 * DEG, 'gost')).toBe('90.0°');
    expect(angleText('sidereal', -1 * DEG, 'gost')).toBe('359.0°');
    // no negative zero
    expect(angleText('beta', -0.01 * DEG, 'iso')).toBe('0.0°');
  });
});

describe('symbols', () => {
  it('follow the notation in force', () => {
    setNotationPreference('iso', memory());
    expect(frameSymbols.angle('pitch')).toEqual({ base: 'Θ' });
    expect(frameSymbols.angle('track')).toEqual({ base: 'χ' });
    expect(frameSymbols.angle('sidereal')).toEqual({ base: 'θ', sub: 'G' });
    expect(frameSymbols.axis('y', 'g')).toEqual({ base: 'y', sub: 'g' });
    setNotationPreference('gost', memory());
    expect(frameSymbols.angle('pitch')).toEqual({ base: 'ϑ' });
    expect(frameSymbols.angle('roll')).toEqual({ base: 'γ' });
    expect(frameSymbols.angle('path')).toEqual({ base: 'θ' });
    expect(frameSymbols.angle('track')).toEqual({ base: 'Ψ' });
    expect(frameSymbols.angle('sidereal')).toEqual({ base: 'S' });
  });
});

describe('the stored choice', () => {
  it('starts with every frame off, and keeps only groups it knows, in the menu\'s order', () => {
    expect(loadFrameGroups(memory())).toEqual([]);
    expect(loadFrameGroups(memory('["inertial","body"]'))).toEqual(['body', 'inertial']);
    expect(loadFrameGroups(memory('["nonsense","orbital"]'))).toEqual(['orbital']);
    expect(loadFrameGroups(memory('not json'))).toEqual([]);
    expect(loadFrameGroups(memory('{"body":true}'))).toEqual([]);
  });
});
