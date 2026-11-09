/**
 * What the Structure section keeps in a learner's profile
 * (src/structure/progress.ts): a round trip, a damaged or newer record never
 * written over, a stored assembly restored by the rules, "my experiment" a
 * copy that never changes the reference, and figures that always belong to
 * the design they were computed for.
 */
import { describe, expect, it } from 'vitest';
import { STRUCTURE_STORE_KEY, freshProgress, readProgress, writeProgress } from '../src/structure/progress';
import { SOYUZ_ASSEMBLY } from '../src/structure/soyuz';
import { EDUSAT_ASSEMBLY } from '../src/structure/edusat';
import { REFERENCE_DESIGN, designKey, eduFigures } from '../src/structure/edusat-design';
import { WORKSPACE_KEYS, isWorkspaceKey } from '../src/workspace/registry';

const specs = { 'soyuz-st31': SOYUZ_ASSEMBLY, edusat: EDUSAT_ASSEMBLY };

describe('the Structure section\'s stored progress', () => {
  it('is a key of the profile, so it goes with the profile and nowhere else', () => {
    expect(WORKSPACE_KEYS).toContain(STRUCTURE_STORE_KEY);
    expect(isWorkspaceKey(STRUCTURE_STORE_KEY)).toBe(true);
  });

  it('round-trips the model, the activities, the assemblies, completion and my experiment', () => {
    const p = freshProgress();
    p.model = 'edusat';
    p.mode.edusat = 'experiment';
    p.assembly.edusat = { placed: { frame: { slot: 'frame', orientation: 0 }, stack: { slot: 'stack', orientation: 0 } }, history: [] };
    p.completed['soyuz-st31'] = '2026-11-09T10:00:00.000Z';
    p.experiment = { battery: 'battery-2cell', payload: 'camera-night' };
    p.showing = 'mine';
    const back = readProgress(writeProgress(p), specs);
    expect(back.writable).toBe(true);
    expect(back.progress).toEqual(p);
  });

  it('reads nothing, a damaged record or a newer one as fresh; writes over a damaged one (the profile sets it aside), never a newer one', () => {
    expect(readProgress(null, specs)).toEqual({ progress: freshProgress(), writable: true, note: null });
    for (const raw of ['{not json', '[1,2]', '{"version":"1"}', '{"version":0}']) {
      expect(readProgress(raw, specs), raw).toEqual({ progress: freshProgress(), writable: true, note: 'damaged' });
    }
    expect(readProgress(JSON.stringify({ version: 2, model: 'edusat' }), specs)).toEqual({ progress: freshProgress(), writable: false, note: 'newer' });
  });

  it('restores a stored assembly by the assembly rules and drops what is not a design', () => {
    const raw = JSON.stringify({
      version: 1, model: 'soyuz-st31', mode: { 'soyuz-st31': 'experiment', edusat: 'bogus' },
      assembly: { 'soyuz-st31': { placed: { stage3: { slot: 'stage3', orientation: 0 }, core: { slot: 'core', orientation: 0 } } } },
      experiment: { battery: 'battery-9cell', payload: 'camera-day' }, showing: 'mine',
    });
    const { progress } = readProgress(raw, specs);
    // Block I without its interstage does not come back; the rocket has no experiment
    expect(Object.keys(progress.assembly['soyuz-st31'].placed)).toEqual(['core']);
    expect(progress.mode['soyuz-st31']).toBe('explore');
    expect(progress.mode.edusat).toBe('explore');
    expect(progress.experiment).toBeNull();
    expect(progress.showing).toBe('reference');
  });
});

describe('the reference and my experiment', () => {
  it('keeps the reference frozen: an experiment is a copy', () => {
    expect(Object.isFrozen(REFERENCE_DESIGN)).toBe(true);
    const mine = { ...REFERENCE_DESIGN };
    mine.payload = 'camera-night';
    expect(REFERENCE_DESIGN.payload).toBe('camera-day');
  });

  it('labels every result with its design, and works it out again from the design alone (nothing older to show)', () => {
    const a = eduFigures(REFERENCE_DESIGN);
    const b = eduFigures({ ...REFERENCE_DESIGN, payload: 'camera-night' });
    expect(a.key).toBe(designKey(REFERENCE_DESIGN));
    expect(b.key).not.toBe(a.key);
    // a function of the design: the same design, the same figures, whatever was worked out in between
    expect(eduFigures({ ...REFERENCE_DESIGN })).toEqual(a);
    expect(eduFigures({ battery: 'battery-1cell', payload: 'camera-day' })).toEqual(a);
  });
});
