import { describe, expect, it } from 'vitest';
import { CameraPolicy } from '../src/render/camera-policy';

describe('R2.2 camera policy', () => {
  it('starts cinematic and lets the programme pick the view at each phase', () => {
    const p = new CameraPolicy();
    expect(p.cinematic).toBe(true);
    expect(p.onPhase('exterior')).toBe('exterior');
    expect(p.onPhase('space')).toBe('space');
  });

  it('keeps a view the user picked across liftoff, staging and orbit', () => {
    const p = new CameraPolicy();
    expect(p.choose('onboard')).toBe('onboard');
    expect(p.owner).toBe('manual');
    for (const planned of ['exterior', 'exterior', 'space', 'map'] as const) expect(p.onPhase(planned)).toBeNull();
  });

  it('Cinematic returns the programme\'s view for the current phase', () => {
    const p = new CameraPolicy();
    p.choose('map');
    expect(p.resume('space', 'map')).toBe('space');
    expect(p.cinematic).toBe(true);
    expect(p.onPhase('exterior')).toBe('exterior');
  });

  it('with no phase to go by (a lost vehicle) Cinematic keeps the current view', () => {
    const p = new CameraPolicy();
    p.choose('space');
    expect(p.resume(null, 'space')).toBe('space');
  });

  it('follows another object from outside under the programme, and returns to the plan', () => {
    const p = new CameraPolicy();
    expect(p.onTarget('other', 'space', 'space')).toBe('exterior');
    expect(p.onTarget('vehicle', 'space', 'exterior')).toBe('space');
    expect(p.onTarget('vehicle', null, 'exterior')).toBe('exterior');
  });

  it('a manual view that cannot show the new target falls back to exterior and stays manual', () => {
    const p = new CameraPolicy();
    p.choose('onboard');
    expect(p.onTarget('other', 'exterior', 'onboard')).toBe('exterior');
    expect(p.owner).toBe('manual');
    p.choose('space');
    expect(p.onTarget('other', 'exterior', 'space')).toBeNull();
    expect(p.onTarget('vehicle', 'exterior', 'space')).toBeNull();
  });

  it('a new viewer launch resets ownership; the dialog switch sets it without a view', () => {
    const p = new CameraPolicy();
    p.choose('map');
    p.reset();
    expect(p.cinematic).toBe(true);
    p.setCinematic(false);
    expect(p.owner).toBe('manual');
    p.setCinematic(true);
    expect(p.owner).toBe('cinematic');
  });
});
