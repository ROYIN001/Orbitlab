/**
 * Assembling to a reference (src/structure/assembly.ts) with the two models'
 * own rules (src/structure/soyuz.ts, src/structure/edusat.ts): install,
 * refusals with the reason a hint gives, remove, undo, restart, and a
 * completion that checks the relations, not the count.
 */
import { describe, expect, it } from 'vitest';
import {
  EMPTY_ASSEMBLY, checkAssembly, install, nextUnits, remove, restart, restoreAssembly, specProblems, undo,
  type AssemblySpec, type AssemblyState,
} from '../src/structure/assembly';
import { SOYUZ_ASSEMBLY, SOYUZ_UNITS, soyuzCategory, soyuzCertainty } from '../src/structure/soyuz';
import { EDUSAT_ASSEMBLY, EDU_UNITS, FACES, slotOfUnit } from '../src/structure/edusat';

/** Install every unit of a spec into its reference slot, in an order that works. */
function assembleAll(spec: AssemblySpec): AssemblyState {
  let state = EMPTY_ASSEMBLY;
  for (let guard = 0; guard < 100 && nextUnits(spec, state).length; guard++) {
    for (const unit of nextUnits(spec, state)) {
      const r = install(spec, state, unit, { slot: spec.units.find((u) => u.id === unit)!.slots[0], orientation: 0 });
      if (r.ok) state = r.state;
    }
  }
  return state;
}

describe('the two models\' references', () => {
  it('are consistent and can be assembled in some order', () => {
    expect(specProblems(SOYUZ_ASSEMBLY)).toEqual([]);
    expect(specProblems(EDUSAT_ASSEMBLY)).toEqual([]);
    expect(checkAssembly(SOYUZ_ASSEMBLY, assembleAll(SOYUZ_ASSEMBLY)).complete).toBe(true);
    expect(checkAssembly(EDUSAT_ASSEMBLY, assembleAll(EDUSAT_ASSEMBLY)).complete).toBe(true);
  });

  it('start with only the base unit possible', () => {
    expect(nextUnits(SOYUZ_ASSEMBLY, EMPTY_ASSEMBLY)).toEqual(['core']);
    expect(nextUnits(EDUSAT_ASSEMBLY, EMPTY_ASSEMBLY)).toEqual(['frame']);
  });
});

describe('Soyuz-2.1b/Fregat: refusals say what is wrong', () => {
  const S = SOYUZ_ASSEMBLY;
  const withCore = (install(S, EMPTY_ASSEMBLY, 'core', { slot: 'core', orientation: 0 }) as { state: AssemblyState }).state;

  it('names what a unit still needs', () => {
    const r = install(S, EMPTY_ASSEMBLY, 'stage3', { slot: 'stage3', orientation: 0 });
    expect(r).toMatchObject({ ok: false, refusal: { code: 'missing', unit: 'stage3', missing: ['interstage'] } });
    const fairing = install(S, withCore, 'fairing-left', { slot: 'fairing-left', orientation: 0 });
    expect(fairing).toMatchObject({ ok: false, refusal: { code: 'missing', missing: ['stage3', 'payload'] } });
  });

  it('refuses a strap-on in another block\'s place, naming whose place it is', () => {
    const r = install(S, withCore, 'booster-b', { slot: 'booster-v', orientation: 0 });
    expect(r).toMatchObject({ ok: false, refusal: { code: 'wrongSlot', unit: 'booster-b', slot: 'booster-v', owner: 'booster-v', expected: ['booster-b'] } });
  });

  it('refuses a strap-on turned from the reference\'s way round', () => {
    for (const orientation of [1, 2, 3]) {
      expect(install(S, withCore, 'booster-g', { slot: 'booster-g', orientation })).toMatchObject({ ok: false, refusal: { code: 'wrongOrientation', orientation } });
    }
    expect(install(S, withCore, 'booster-g', { slot: 'booster-g', orientation: 0 }).ok).toBe(true);
  });

  it('never places a unit twice, nor two units in one slot', () => {
    const again = install(S, withCore, 'core', { slot: 'core', orientation: 0 });
    expect(again).toMatchObject({ ok: false, refusal: { code: 'alreadyPlaced', unit: 'core' } });
    const taken = install(S, withCore, 'interstage', { slot: 'core', orientation: 0 });
    expect(taken).toMatchObject({ ok: false, refusal: { code: 'slotTaken', slot: 'core', by: 'core' } });
  });

  it('will not take off a unit others rest on, and says which', () => {
    let state = withCore;
    for (const b of ['booster-b', 'booster-d'] as const) state = (install(S, state, b, { slot: b, orientation: 0 }) as { state: AssemblyState }).state;
    expect(remove(S, state, 'core')).toMatchObject({ ok: false, refusal: { code: 'holds', dependents: ['booster-b', 'booster-d'] } });
    const off = remove(S, state, 'booster-d');
    expect(off.ok).toBe(true);
    expect(Object.keys(off.state.placed).sort()).toEqual(['booster-b', 'core']);
    expect(remove(S, off.state, 'booster-d')).toMatchObject({ ok: false, refusal: { code: 'notPlaced' } });
  });

  it('undoes installs, removals and a restart, in reverse order', () => {
    let state = withCore;
    state = (install(S, state, 'interstage', { slot: 'interstage', orientation: 0 }) as { state: AssemblyState }).state;
    state = (remove(S, state, 'interstage') as { state: AssemblyState }).state;
    state = restart(state);
    expect(state.placed).toEqual({});
    state = undo(state).state;
    expect(Object.keys(state.placed)).toEqual(['core']);
    state = undo(state).state; // the removal undone
    expect(Object.keys(state.placed).sort()).toEqual(['core', 'interstage']);
    state = undo(state).state; // the install undone
    state = undo(state).state; // the core
    expect(state.placed).toEqual({});
    expect(undo(state)).toMatchObject({ ok: false, refusal: { code: 'nothingToUndo' } });
  });

  it('is complete only with every unit in its own place, the right way round and every relation held', () => {
    const full = assembleAll(S);
    const check = checkAssembly(S, full);
    expect(check).toMatchObject({ complete: true, placed: SOYUZ_UNITS.length, total: SOYUZ_UNITS.length, issues: [] });
    // the same count is not enough: a state with a unit out of place, turned, or resting on nothing is incomplete
    const misplaced = { ...full, placed: { ...full.placed, 'booster-b': { slot: 'booster-v', orientation: 0 }, 'booster-v': { slot: 'booster-b', orientation: 0 } } };
    expect(Object.keys(misplaced.placed)).toHaveLength(SOYUZ_UNITS.length);
    expect(checkAssembly(S, misplaced).complete).toBe(false);
    expect(checkAssembly(S, misplaced).issues.map((i) => i.code)).toEqual(['misplaced', 'misplaced']);
    const turned = { ...full, placed: { ...full.placed, fregat: { slot: 'fregat', orientation: 2 } } };
    expect(checkAssembly(S, turned).issues).toEqual([{ code: 'misoriented', unit: 'fregat', orientation: 2 }]);
    const floating = { ...full, placed: Object.fromEntries(Object.entries(full.placed).filter(([u]) => u !== 'stage3')) };
    // Block I gone: its slot is empty, and Fregat and both fairing halves rest on nothing
    expect(checkAssembly(S, floating).issues.map((i) => ('unit' in i ? `${i.code}:${i.unit}` : `${i.code}:${i.slot}`)).sort())
      .toEqual(['emptySlot:stage3', 'missingUnit:stage3', 'unsupported:fairing-left', 'unsupported:fairing-right', 'unsupported:fregat']);
    const doubled = { ...full, placed: { ...full.placed, extra: { slot: 'core', orientation: 0 } } };
    expect(checkAssembly(S, doubled).issues.map((i) => i.code).sort()).toEqual(['shared', 'unknownUnit']);
  });

  it('restores a stored assembly by the same rules, dropping what they no longer allow', () => {
    const stored = { core: { slot: 'core', orientation: 0 }, 'booster-b': { slot: 'booster-b', orientation: 0 }, stage3: { slot: 'stage3', orientation: 0 }, nonsense: 3, fregat: { slot: 'payload', orientation: 0 } };
    const back = restoreAssembly(S, stored);
    // Block I has no interstage under it, Fregat is in the payload's place, the rest is not a placement
    expect(Object.keys(back.placed).sort()).toEqual(['booster-b', 'core']);
    expect(back.history).toEqual([]);
    expect(restoreAssembly(S, 'junk')).toEqual(EMPTY_ASSEMBLY);
  });
});

describe('EduSat-3U: the stack goes in from the bottom up, the panels close it', () => {
  const E = EDUSAT_ASSEMBLY;

  it('takes any side panel on any face, cells out', () => {
    const upToRadio = (['frame', 'stack', 'payload', 'battery', 'eps', 'adcs', 'obc', 'radio'] as const)
      .reduce((s, u) => (install(E, s, u, { slot: u, orientation: 0 }) as { state: AssemblyState }).state, EMPTY_ASSEMBLY);
    expect(Object.keys(upToRadio.placed)).toHaveLength(8);
    const swapped = install(E, upToRadio, 'panel-px', { slot: 'face-nz', orientation: 0 });
    expect(swapped.ok).toBe(true);
    expect(install(E, upToRadio, 'panel-px', { slot: 'face-px', orientation: 1 })).toMatchObject({ ok: false, refusal: { code: 'wrongOrientation' } });
    // a panel's face is not a board's slot
    expect(install(E, upToRadio, 'panel-px', { slot: 'antenna', orientation: 0 })).toMatchObject({ ok: false, refusal: { code: 'wrongSlot', owner: 'antenna' } });
    // fill the faces in any order, then the antenna: complete
    let state = swapped.state;
    const free = FACES.filter((f) => f !== 'face-nz');
    for (const [k, unit] of (['panel-nx', 'panel-pz', 'panel-nz'] as const).entries()) state = (install(E, state, unit, { slot: free[k], orientation: 0 }) as { state: AssemblyState }).state;
    state = (install(E, state, 'antenna', { slot: 'antenna', orientation: 0 }) as { state: AssemblyState }).state;
    expect(checkAssembly(E, state)).toMatchObject({ complete: true, placed: EDU_UNITS.length });
  });

  it('refuses a board before the one under it, and the camera lens up', () => {
    const framed = ['frame', 'stack'].reduce((s, u) => (install(E, s, u, { slot: u, orientation: 0 }) as { state: AssemblyState }).state, EMPTY_ASSEMBLY);
    expect(install(E, framed, 'obc', { slot: 'obc', orientation: 0 })).toMatchObject({ ok: false, refusal: { code: 'missing', missing: ['adcs'] } });
    expect(install(E, framed, 'payload', { slot: 'payload', orientation: 1 })).toMatchObject({ ok: false, refusal: { code: 'wrongOrientation' } });
    expect(slotOfUnit('panel-nz')).toBe('face-nz');
  });
});

describe('the Soyuz parts\' kinds and certainty (this pilot\'s reading of the page)', () => {
  it('sorts known parts as the page describes them', () => {
    const c = (id: string, kind: string, role?: string) => soyuzCategory({ id, unit: id.split('.')[0], kind, role });
    expect(c('booster-b.stabilizer-fin', 'structural')).toBe('wall');
    expect(c('booster-b.upper-attachment', 'structural')).toBe('mount');
    expect(c('interstage.lattice-rising-8', 'structural')).toBe('load');
    expect(c('interstage.upper-interface.back', 'structural')).toBe('mount');
    expect(c('stage3.rd0124-main-gimbal-3-1', 'structural', 'single-axis-main-chamber-trunnion')).toBe('mechanism');
    expect(c('booster-g.vernier-trunnion-2-b', 'engine', 'steering-trunnion')).toBe('mechanism');
    expect(c('booster-g.frame-foot-1-a', 'engine', 'engine-frame-foot')).toBe('mount');
    expect(c('booster-g.turbine', 'engine', 'turbine')).toBe('propulsion');
    expect(c('fregat.avionics-bay-2-battery', 'interior', 'chemical-battery')).toBe('equipment');
    expect(c('stage3.rd0124-tank-support-5.8-4', 'interior', 'tank-to-shell-support')).toBe('load');
    expect(c('core.skin-section-1.back', 'shell')).toBe('wall');
    expect(c('fairing.st-barrel-1.right.back', 'shell', 'fairing-white')).toBe('wall');
  });

  it('never calls an inside or representative part\'s shape more than an estimate', () => {
    const k = (id: string, kind: string, role?: string) => soyuzCertainty({ id, unit: id.split('.')[0], kind, role });
    expect(k('payload.envelope-ring-0.back', 'structural', 'representative-payload-envelope')).toBe('estimated');
    expect(k('fregat.acs-cluster-link-3', 'structural', 'representative-structural-support')).toBe('estimated');
    expect(k('booster-g.turbine', 'engine', 'turbine')).toBe('estimated');
    expect(k('core.oxygen-tank', 'interior', 'vehicle-propellant-tank')).toBe('estimated');
    expect(k('core.skin-section-1.back', 'shell')).toBe('image');
    expect(k('booster-b.stabilizer-fin', 'structural')).toBe('image');
  });
});
