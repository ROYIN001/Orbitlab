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
import { POWER_ENV } from '../src/structure-host/power-env';
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

describe('what a record carries from before', () => {
  it('keeps the helper open or closed across a visit', () => {
    const p = freshProgress();
    expect(readProgress(writeProgress(p), specs).progress.guide).toBe(false);
    p.guide = true;
    expect(JSON.parse(writeProgress(p)).guide).toBe(true);
    expect(readProgress(writeProgress(p), specs).progress.guide).toBe(true);
    // anything but true is closed
    expect(readProgress(JSON.stringify({ version: 1, guide: 'yes' }), specs).progress.guide).toBe(false);
  });

  it('reads the first version\'s names for the satellite\'s ±Y panels and faces, so its assembly is whole', () => {
    // as the first version stored a finished EduSat: the ±Y panels named by the picture's z
    const v1 = ['frame', 'stack', 'payload', 'battery', 'eps', 'adcs', 'obc', 'radio', 'antenna'].map((u) => [u, { slot: u, orientation: 0 }]);
    const panels = [['panel-px', 'face-px'], ['panel-nx', 'face-nx'], ['panel-pz', 'face-pz'], ['panel-nz', 'face-nz']].map(([u, f]) => [u, { slot: f, orientation: 0 }]);
    const raw = JSON.stringify({ version: 1, model: 'edusat', mode: { edusat: 'assemble' }, assembly: { edusat: { placed: Object.fromEntries([...v1, ...panels]) } }, completed: { edusat: '2026-11-09T10:00:00.000Z' } });
    const { progress, note } = readProgress(raw, specs);
    expect(note).toBeNull();
    expect(Object.keys(progress.assembly.edusat.placed)).toHaveLength(13);
    // the panel that stood at the picture's +z is the specification's −Y one, on that face
    expect(progress.assembly.edusat.placed['panel-ny']).toEqual({ slot: 'face-ny', orientation: 0 });
    expect(progress.assembly.edusat.placed['panel-py']).toEqual({ slot: 'face-py', orientation: 0 });
    // a first-version panel on another face keeps the face it was on
    const swapped = JSON.parse(raw);
    swapped.assembly.edusat.placed['panel-pz'] = { slot: 'face-nz', orientation: 0 };
    swapped.assembly.edusat.placed['panel-nz'] = { slot: 'face-pz', orientation: 0 };
    const back = readProgress(JSON.stringify(swapped), specs).progress.assembly.edusat.placed;
    expect([back['panel-ny']?.slot, back['panel-py']?.slot]).toEqual(['face-py', 'face-ny']);
    // what is written is today's names only
    expect(writeProgress(progress)).not.toMatch(/panel-[pn]z|face-[pn]z/);
  });

  it('restores a unit listed before what it rests on, and drops a completion date that is not one', () => {
    const raw = JSON.stringify({ version: 1, assembly: { edusat: { placed: { stack: { slot: 'stack', orientation: 0 }, frame: { slot: 'frame', orientation: 0 } } } }, completed: { edusat: 'yesterday', 'soyuz-st31': '2026-11-09T10:00:00.000Z' } });
    const { progress } = readProgress(raw, specs);
    expect(Object.keys(progress.assembly.edusat.placed).sort()).toEqual(['frame', 'stack']);
    expect(progress.completed).toEqual({ edusat: null, 'soyuz-st31': '2026-11-09T10:00:00.000Z' });
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
    const a = eduFigures(REFERENCE_DESIGN, POWER_ENV);
    const b = eduFigures({ ...REFERENCE_DESIGN, payload: 'camera-night' }, POWER_ENV);
    expect(a.key).toBe(designKey(REFERENCE_DESIGN));
    expect(b.key).not.toBe(a.key);
    // a function of the design: the same design, the same figures, whatever was worked out in between
    expect(eduFigures({ ...REFERENCE_DESIGN }, POWER_ENV)).toEqual(a);
    expect(eduFigures({ battery: 'battery-1cell', payload: 'camera-day' }, POWER_ENV)).toEqual(a);
  });
});
