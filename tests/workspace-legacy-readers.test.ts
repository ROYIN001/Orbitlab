/**
 * Legacy readers (plan S10 §10.3.1): what was stored or handed on before #77
 * (the first-launch template) and #80 (the design reference) still reads as it
 * did, and what this version stores still reads in a build from before them:
 * da67341's readers, copied verbatim in tests/eo-sto/da67341/.
 */
import { describe, expect, it } from 'vitest';
import { missionDocument, parseMissionDocument, saveStoredMission, type MissionState } from '../src/config/mission-file';
import { validMission } from '../src/projects/validation';
import { defaultMissionState } from '../src/lessons/config';
import { parseDesignRef, type DesignRef } from '../src/design/design-ref';
import { parseHandoff } from '../src/orbit/handoff';
import { FIRST_LAUNCH, quickstartMission } from '../src/ui/quickstart';
import { WorkspaceMission, missionSummary } from '../src/ui/workspace-mission';
import * as old from './eo-sto/da67341/mission-file';
import { validMission as oldValidMission } from './eo-sto/da67341/validation';
import { WorkspaceMission as OldWorkspaceMission, missionSummary as oldMissionSummary } from './eo-sto/da67341/workspace-mission';
import { parseHandoff as oldParseHandoff } from './eo-sto/da67341/handoff';
import { FROM, MissionPage, PRE77_MISSION, flownDesign, memory } from './eo-sto/harness';

/** A hand-off as a build from before #80 made it: da67341's own `handoffFromState`, as JSON (run once on da67341's source; the probe is not kept). */
const PRE80_HANDOFF = '{"format":"orbitlab.handoff","version":1,"r":[7000000,0,0],"v":[0,7546,0],"jd":2461318.5,"spacecraft":{"mass":1000,"area":4,"cd":2.2,"cr":1.3,"kind":"earthObs","propulsion":{"thrust":22,"isp":220,"propellantMass":50}},"label":"Bird in LEO","origin":{"mission":null,"vehicleName":"Falcon 9","missionTime":512.5}}';
const fallback = defaultMissionState();
/** The page's storage holding `mission`, counting the page's writes. */
function storage(mission: string) {
  const m = memory(), writes: string[] = [];
  m.values.set('orbitlab.mission', mission);
  return { writes, mission: () => m.values.get('orbitlab.mission'), store: { ...m.store, setItem: (k: string, v: string) => { writes.push(k); m.store.setItem(k, v); } } };
}
/** What this version stores for `state`, with or without a design reference. */
function stored(state: MissionState, design?: DesignRef): Record<string, unknown> {
  const m = memory();
  saveStoredMission(state, m.store, design);
  return JSON.parse(m.values.get('orbitlab.mission')!);
}

describe('§10.3.1 the first-launch template (#77): mission origin "template"', () => {
  it('da67341\'s WorkspaceMission and today\'s answer persists() and entering() alike on every sequence of the old origins', () => {
    type Rules = Pick<WorkspaceMission, 'loaded' | 'adopt' | 'persists' | 'entering' | 'origin'> & { viewing(origin: 'demo' | 'watch'): void };
    const ops: ((ws: Rules) => unknown)[] = [(ws) => ws.viewing('demo'), (ws) => ws.viewing('watch'), (ws) => ws.loaded('a'), (ws) => ws.loaded('b'),
      (ws) => ws.adopt(), (ws) => ws.persists('a'), (ws) => ws.persists('b'),
      ...['a', 'b'].flatMap((doc) => [true, false].flatMap((has) => [true, false].map((underway) => (ws: Rules) => ws.entering({ doc, stored: has, underway }))))];
    const differing: string[] = [];
    let sequences = 0;
    const walk = (seq: number[]): void => {
      if (seq.length < 4) { for (let i = 0; i < ops.length; i++) walk([...seq, i]); return; }
      const then = new OldWorkspaceMission(), now = new WorkspaceMission();
      const a = JSON.stringify(seq.map((i) => [ops[i](then), then.origin])), b = JSON.stringify(seq.map((i) => [ops[i](now), now.origin]));
      sequences++;
      if (a !== b) differing.push(`${seq.join(',')}: ${a} / ${b}`);
    };
    walk([]);
    expect(sequences).toBe(15 ** 4);
    expect(differing).toEqual([]);
  });

  it('a mission stored before #77 comes back byte for byte: in Engineer, from Home\'s viewer, and around Home\'s template', () => {
    for (const how of ['start-up in Engineer', 'Home, then Explore', 'Home\'s template, then Engineer'] as const) {
      const s = storage(PRE77_MISSION), page = new MissionPage(s.store, how !== 'start-up in Engineer');
      if (how === 'Home, then Explore') page.enter();
      if (how === 'Home\'s template, then Engineer') { page.template(quickstartMission(FIRST_LAUNCH, FROM)); page.enter(); }
      expect(s.mission(), how).toBe(PRE77_MISSION);
      expect(page.doc() === PRE77_MISSION, how).toBe(how !== 'Home\'s template, then Engineer');
    }
  });
});

describe('§10.3.1 the design beside the stored mission (#80): MissionDocument.design', () => {
  it('a mission stored before #80 (no design) is read as before, and written no more often than before', () => {
    const s = storage(PRE77_MISSION), page = new MissionPage(s.store, false);
    expect(page.designRef).toBeNull();
    expect(page.doc()).toBe(PRE77_MISSION);
    expect(parseMissionDocument(JSON.parse(PRE77_MISSION), fallback)).toEqual(old.parseMissionDocument(JSON.parse(PRE77_MISSION), fallback));
    // before #80 the restore's preview stored it once
    expect(s.writes.length).toBeLessThanOrEqual(1);
    expect(s.mission()).toBe(PRE77_MISSION);
  });

  it('da67341\'s readers read what this version stores with a design exactly as the same mission without one', () => {
    const { doc, design } = flownDesign();
    for (const [what, state] of [['a catalogue mission', JSON.parse(PRE77_MISSION)], ['a flown design', doc]].map(([w, d]) => [w, parseMissionDocument(d, fallback).state] as const)) {
      const withRef = stored(state, design), without = stored(state);
      expect(withRef.design, what).toEqual(design);
      expect(old.parseMissionDocument(withRef, fallback), what).toEqual(old.parseMissionDocument(without, fallback));
      expect(old.parseMissionDocument(withRef, fallback).issues, what).toEqual([]);
      expect([oldValidMission(withRef), oldValidMission(without)], what).toEqual([true, true]);
      expect(oldMissionSummary(withRef), what).toEqual(oldMissionSummary(without));
      expect(oldMissionSummary(withRef), what).not.toBeNull();
      // today's readers agree with da67341's on it
      expect(parseMissionDocument(withRef, fallback), what).toEqual(old.parseMissionDocument(withRef, fallback));
      expect([validMission(withRef), missionSummary(withRef)], what).toEqual([true, oldMissionSummary(withRef)]);
    }
  });

  it('an unreadable design does not stop the mission loading, and the mission is kept', () => {
    const doc = JSON.stringify({ ...JSON.parse(PRE77_MISSION), design: { kind: 'rocket', name: '' } });
    expect(parseDesignRef(JSON.parse(doc).design)).toBe('invalid');
    const s = storage(doc), page = new MissionPage(s.store, false);
    expect(page.designRef).toBeNull();
    expect(page.doc()).toBe(PRE77_MISSION);
    expect(JSON.parse(s.mission()!).mission).toEqual(JSON.parse(PRE77_MISSION).mission);
  });

  it('known limitation: a tab of a build from before #80 that stores the mission again drops the design; the mission is unchanged', () => {
    const { doc, design } = flownDesign(), m = memory();
    const withRef = stored(parseMissionDocument(doc, fallback).state, design);
    old.saveStoredMission(old.parseMissionDocument(withRef, fallback).state, m.store);
    const { design: dropped, ...mission } = withRef;
    expect(dropped).toEqual(design);
    expect(JSON.parse(m.values.get('orbitlab.mission')!)).toEqual(mission);
    expect(m.values.get('orbitlab.mission')).toBe(JSON.stringify(missionDocument(parseMissionDocument(doc, fallback).state)));
  });
});

describe('§10.3.1 the design in the hand-off to Orbit (#80): OrbitHandoff.origin.design', () => {
  const before = JSON.parse(PRE80_HANDOFF), design = flownDesign().design;
  const withRef = { ...before, origin: { ...before.origin, design } };
  const badRef = { ...before, origin: { ...before.origin, design: { ...design, revision: 'last week' } } };

  it('a hand-off from before #80 reads as it was; one with a design keeps it; one with an unreadable design is refused', () => {
    expect(parseHandoff(before)).toEqual(before);
    expect(parseHandoff(withRef)).toEqual(withRef);
    expect(parseHandoff(badRef)).toBeNull();
  });

  it('da67341\'s parseHandoff takes #80\'s hand-off unchanged, its design carried along', () => {
    expect(oldParseHandoff(withRef)).toEqual(withRef);
    expect(oldParseHandoff(before)).toEqual(parseHandoff(before));
  });
});
