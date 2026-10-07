/**
 * EO-STO-1 (plan S10 §10.3 PR 3): the stored bytes, return values and error
 * codes of the repository and of the page's mission code are main's at 23ede7f
 * on every step of these sequences: first start and later starts, typing, two
 * tabs, outside writes, a full disk, damaged and newer records, learners,
 * reset, backups, visit-only — and the §10.3.1 mission paths (the first-launch
 * template, `MissionDocument.design` on "Fly it" and on restore,
 * `OrbitHandoff.origin.design`), each also in a second, read-only tab. The
 * harness and the reference copies are in tests/eo-sto/.
 */
import { describe, expect, it } from 'vitest';
import { WORKSPACE_KEYS, type RawStorage } from '../src/workspace/registry';
import { LEGACY_PROFILE_ID, PROFILE_CATALOG_KEY, profileStorageKey } from '../src/workspace/repository';
import { emptyProgress } from '../src/lessons/progress';
import * as missionFile from '../src/config/mission-file';
import * as designRef from '../src/design/design-ref';
import * as workspaceMission from '../src/ui/workspace-mission';
import { handoffFromState, parseHandoff } from '../src/orbit/handoff';
import { FIRST_LAUNCH, quickstartMission } from '../src/ui/quickstart';
import { CURRENT, FROM, PRE77_MISSION, attempt, differential, flownDesign, storedValue, type Entry, type Impl, type Step, type World } from './eo-sto/harness';

const LEGACY = LEGACY_PROFILE_ID, RECORD = profileStorageKey(LEGACY);
function progress(): string {
  const p = emptyProgress();
  p.lessons = { one: { attempts: 2, hintsShown: 1, passed: true }, two: { attempts: 1, hintsShown: 0, passed: false } };
  p.assessments = [{ kind: 'pre', seed: 1, startedAt: '2026-10-03T00:00:00Z', questions: [], answers: [] }];
  return JSON.stringify(p);
}
/** What a build from before learner profiles left in localStorage: good, unreadable, newer and device-only values. */
const seed = (w: World) => {
  for (const [k, v] of [['orbitlab.student', 'Ana'], ['orbitlab.mission', PRE77_MISSION], ['orbitlab.lessons', progress()],
    ['orbitlab.designs', '{"version":1,"designs":['], ['orbitlab.experiments.v1', '{"version":99,"experiments":[],"future":{"x":1}}'],
    ['orbitlab.lessons.recovery.2', '{bad bytes'], ['orbitlab.sound', 'off'], ['orbitlab.lang', 'th'], ['orbitlab.dataset.cache', 'device']]) w.disk.values.set(k, v);
  return w.disk.values.size;
};
const typed = (w: World, tab: string, key: string, ...values: string[]) => { for (const v of values) w.binding(tab).setItem(key, v); return w.binding(tab).getItem(key); };

const STARTS_TABS_WRITES: Step[] = [
  ['originals from before profiles', seed],
  ['first start: the originals move into a learner', (w) => w.open('A')],
  ['typing a number, one save a keystroke', (w) => typed(w, 'A', 'orbitlab.numeric-drafts.v1', ...['1', '12', '12.5'].map((kick) => JSON.stringify({ v: 1, fields: { kick } })))],
  ['a save over unreadable and newer values keeps them in quarantine', (w) => {
    typed(w, 'A', 'orbitlab.designs', '{"version":1,"designs":[]}'); typed(w, 'A', 'orbitlab.experiments.v1', '{"version":1,"experiments":[]}');
    return w.binding('A').getItem('orbitlab.import.quarantine.v1');
  }],
  ['a preference removed', (w) => w.binding('A').removeItem('orbitlab.sound')],
  ['every workspace key read', (w) => WORKSPACE_KEYS.map((k) => w.binding('A').getItem(k))],
  ['a key outside the workspace is refused', (w) => w.binding('A').setItem('orbitlab.dataset.cache', 'x')],
  ['a second tab on the same learner is read-only', (w) => w.open('B')],
  ['the second tab reads; its write is refused', (w) => [w.binding('B').getItem('orbitlab.lang'), attempt(() => typed(w, 'B', 'orbitlab.lang', 'en'))]],
  ['the first tab writes; the second reads it', (w) => [typed(w, 'A', 'orbitlab.lang', 'ru'), w.binding('B').getItem('orbitlab.lang')]],
  ['another writer saves the record; both tabs read the new bytes', (w) => {
    const r = JSON.parse(w.disk.values.get(RECORD)!); r.values['orbitlab.lang'] = 'en'; r.revision++; w.disk.values.set(RECORD, JSON.stringify(r));
    return [w.binding('A').getItem('orbitlab.lang'), w.binding('B').getItem('orbitlab.lang')];
  }],
  ['a full disk refuses a save; nothing is half-written', (w) => {
    w.disk.deny(RECORD); const refused = attempt(() => typed(w, 'A', 'orbitlab.lang', 'th')); w.disk.deny(null);
    return [refused, w.binding('A').getItem('orbitlab.lang')];
  }],
  ['a caller changes the backup it was given; the stored work does not change', (w) => {
    (w.repo('A').exportProfile() as { profiles: { values: Record<string, string> }[] }).profiles[0].values['orbitlab.lang'] = 'changed';
    return w.binding('A').getItem('orbitlab.lang');
  }],
  ['an old build writes an original again', (w) => { w.disk.values.set('orbitlab.student', 'Ana B.'); }],
  ['reload: a start with an original left', (w) => w.open('A')],
  ['reload: a start with no original left', (w) => { w.disk.values.delete('orbitlab.student'); return w.open('A'); }],
  ['the first tab closes; the second reloads and owns the learner', (w) => { w.repo('A').close(); return w.open('B'); }],
  ['the second tab saves', (w) => typed(w, 'B', 'orbitlab.lang', 'th')],
];

const LEARNERS: Step[] = [
  ['first start on an empty browser', (w) => w.open('A')],
  ['work in the first learner', (w) => [typed(w, 'A', 'orbitlab.lessons', progress()), typed(w, 'A', 'orbitlab.mission', PRE77_MISSION)]],
  ['two more learners, one renamed', async (w) => [await w.repo('A').create('Bea'), await w.repo('A').create('ชัย Чай'), await w.repo('A').rename('a-1', 'Bea R.')]],
  ['a second tab picks Bea from the chooser', async (w) => [await w.open('B'), await w.repo('B').select('a-1'), await w.open('B')]],
  ['Bea works in the second tab; the first lists the learners', (w) => [typed(w, 'B', 'orbitlab.designs', '{"version":1,"designs":[]}'), w.repo('A').listWithStatus()]],
  ['one record cut short, one from a newer version', (w) => {
    w.disk.values.set(profileStorageKey('a-2'), '{"version":1,"id":"a-2","na');
    w.disk.values.set(profileStorageKey('a-1'), JSON.stringify({ version: 99, id: 'a-1', name: 'Bea', values: {}, future: true }));
    return [w.repo('A').listWithStatus(), w.repo('A').list(), w.repo('A').rawProfile('a-1'), w.repo('A').profileRow('a-2')];
  }],
  ['selecting the unreadable learner is refused', (w) => w.repo('A').select('a-2')],
  ['the second tab, on the newer record', (w) => w.binding('B').getItem('orbitlab.designs')],
  ['reset one lesson; the old binding is fenced', async (w) => { const old = w.binding('A'); await w.repo('A').reset('learning', 'one'); return old.getItem('orbitlab.lessons'); }],
  ['reload, reset exams, reload', async (w) => [await w.open('A'), await w.repo('A').reset('exams'), await w.open('A'), w.binding('A').getItem('orbitlab.lessons')]],
  ['back up the learner, and every readable learner', (w) => [w.impl.archiveText(w.repo('A').exportProfile()), w.impl.archiveText(w.repo('A').exportAll())]],
  ['restore: a new learner, into it (keep), into it (replace), all', async (w) => {
    const one = w.impl.archiveText(w.repo('A').exportProfile()), all = w.impl.archiveText(w.repo('A').exportAll());
    const other = one.replace('"orbitlab.lessons"', '"orbitlab.homeCity":"Chiang Mai","orbitlab.lessons"');
    return [await w.repo('A').importArchive(one), await w.repo('A').importArchive(other, { targetId: 'a-3', mode: 'keep' }),
      await w.repo('A').importArchive(other, { targetId: 'a-3', mode: 'replace' }), await w.repo('A').importProfiles(all)];
  }],
  ['restore with an unreadable mission: kept in quarantine', (w) => {
    const text = w.impl.archiveText(w.repo('A').exportProfile()).replace(JSON.stringify(PRE77_MISSION), JSON.stringify('{"mission":1}'));
    return w.repo('A').importArchive(text);
  }],
  ['restore refused: a newer backup, a broken file', async (w) => {
    const settle = (p: Promise<unknown>) => p.then((v) => v, (e: Error) => `${e.name}: ${(e as { code?: string }).code}`);
    return [await settle(w.repo('A').importArchive('{"format":"orbitlab.workspace","version":2}')), await settle(w.repo('A').importArchive('{"format":'))];
  }],
  ['learners up to the limit of 40', async (w) => {
    const made: string[] = [];
    for (let i = 0; i < 45; i++) { try { made.push((await w.repo('A').create(`L${i}`)).id); } catch (e) { return [made, String(e)]; } }
    return made;
  }],
  ['delete the unreadable learner', (w) => w.repo('A').delete('a-2')],
  ['delete the active learner: back to the chooser', (w) => w.repo('A').delete(LEGACY)],
];

const VISIT_ONLY: Step[] = [
  ['originals from before profiles', seed],
  ['a browser without Web Locks: visit-only', (w) => w.open('A', { locks: false })],
  ['visit-only work stays in memory', (w) => typed(w, 'A', 'orbitlab.lang', 'en')],
  ['visit-only delete is refused', (w) => w.repo('A').delete(w.binding('A').profileId)],
  ['visit-only backup', (w) => w.impl.archiveText(w.repo('A').exportProfile())],
  ['a tab with Web Locks migrates', (w) => w.open('B')],
  ['a catalogue from a newer version', (w) => { w.disk.values.set(PROFILE_CATALOG_KEY, '{"version":2,"profiles":{}}'); return w.open('C'); }],
  ['a catalogue that cannot be read', (w) => { w.disk.values.set(PROFILE_CATALOG_KEY, '{"version":1'); return w.open('D'); }],
];

/**
 * `orbitlab.mission` as 23ede7f stores it after Home's template is changed, and
 * after "Fly it": the reference run's bytes, printed once (the probe is not
 * kept); this branch's src/ is 23ede7f's. They also hold the template, parts
 * and catalogue content the copies are given, which EO-STO-1 takes live.
 */
const TEMPLATE_MISSION = '{"format":"orbitlab.mission","version":2,"mission":{"vehicleId":"falcon9","satelliteId":"cubesats","siteId":"cape","orbitId":"leo","orbit":{"id":"leo","name":"Low Earth orbit (500 km)","perigee":500000,"apogee":500000,"inclination":"site","argPerigee":0,"raanMode":"free","description":"Generic circular LEO at the minimum inclination of the launch site."},"launchTime":"2026-09-25T06:00:00.000Z","payloadMass":1200,"guidanceOverrides":{},"failure":{"mode":"none","time":60,"stage":0},"boosterRecovery":false,"dynamics":{"model":"sixDof","wind":"calm","seed":20260919}}}';
const FLOWN_MISSION = '{"format":"orbitlab.mission","version":2,"mission":{"vehicleId":"parts-t1","satelliteId":"cubesats","siteId":"cape","vehicleSpec":{"id":"parts-t1","name":"Parts","country":"US","manufacturer":"","height":72.39399999999999,"payloadLEO":0,"payloadGTO":0,"fairing":{"mass":1900,"diameter":5.2,"length":13.1,"sepAltitude":115000},"stages":[{"id":"s1","name":"First stage (9× Merlin 1D)","dryMass":22200,"propellantMass":410900,"engine":{"name":"Merlin 1D","count":9,"thrustSL":845000,"thrustVac":914000,"ispSL":282,"ispVac":311,"minThrottle":0.4},"diameter":3.66,"length":42},{"id":"s2","name":"Second stage (Merlin Vacuum)","dryMass":4300,"propellantMass":108000,"engine":{"name":"Merlin Vacuum","count":1,"thrustSL":700000,"thrustVac":981000,"ispSL":250,"ispVac":348,"minThrottle":0.4,"vacuumOnly":true},"diameter":3.66,"length":15}],"sites":["cape"],"maxQ":40000,"maxAccel":50},"orbitId":"leo","orbit":{"id":"leo","name":"Low Earth orbit (500 km)","perigee":500000,"apogee":500000,"inclination":"site","argPerigee":0,"raanMode":"free","description":"Generic circular LEO at the minimum inclination of the launch site."},"launchTime":"2026-09-25T06:00:00.000Z","payloadMass":5000,"guidanceOverrides":{},"failure":{"mode":"none","time":60,"stage":0},"boosterRecovery":false,"dynamics":{"model":"pointMass","wind":"calm","seed":20260919}},"design":{"kind":"vehicle","name":"Parts","specId":"parts-t1","recordId":"d-parts","revision":"2026-10-04T12:30:00.000Z","edited":false}}';
const design = flownDesign(), template = () => quickstartMission(FIRST_LAUNCH, FROM);
const mission = (w: World, tab: string) => w.binding(tab).getItem('orbitlab.mission');
/** §10.3.1: the page's mission over the learner's storage, in the owning tab and in a read-only one. */
const MISSION_PATHS: Step[] = [
  ['a mission stored before #77 and #80', (w) => { w.disk.values.set('orbitlab.mission', PRE77_MISSION); }],
  ['the first tab opens Engineer on it', async (w) => [await w.open('A'), w.page('A').ws.origin, mission(w, 'A')]],
  ['Home: the first-launch template; nothing is stored', (w) => { w.page('A').template(template()); return w.page('A').ws.origin; }],
  ['entering Engineer keeps the template, and the stored mission', (w) => { w.page('A').enter(); return w.page('A').ws.origin; }],
  ['the template changed: now it is stored', (w) => { w.page('A').edit((m) => { m.payloadMass = 1200; }); return w.page('A').ws.origin; }],
  ['Build: "Fly it" stores the design and its revision', (w) => { const flown = flownDesign(w.impl.mission); return w.page('A').flyIt(flown.doc, flown.design); }],
  ['reload: start-up restores the mission with its design', async (w) => [await w.open('A'), w.page('A').designRef]],
  ['"Continue in Orbit": the hand-off carries the design, in memory only', (w) => {
    const p = w.page('A'), h = handoffFromState({ r: { x: 7e6, y: 0, z: 0 }, v: { x: 0, y: 7546, z: 0 }, jd: 2461318.5,
      spacecraft: { mass: 1000, area: 4, cd: 2.2, cr: 1.3, kind: 'earthObs', propulsion: null }, label: 'Parts in LEO' });
    h.origin = { mission: p.m.missionDocument(p.panel), vehicleName: 'Parts', missionTime: 600, ...(p.designRef ? { design: p.designRef } : {}) };
    return parseHandoff(JSON.parse(JSON.stringify(h)))?.origin.design ?? null;
  }],
  ['a second tab on the learner opens Engineer, read-only', async (w) => [await w.open('B'), w.page('B').designRef]],
  ['read-only: template, Engineer, a change, "Fly it"', (w) => {
    const p = w.page('B'); p.template(template()); p.enter(); p.edit((m) => { m.payloadMass = 900; });
    const flown = flownDesign(w.impl.mission);
    return [p.flyIt(flown.doc, flown.design), p.ws.origin];
  }],
  ['read-only, from Home: template, Explore', async (w) => { await w.open('B'); const p = w.page('B', true); p.template(template()); p.enter(); return p.ws.origin; }],
];

const at = (trace: Entry[], step: string): Entry => trace.find((e) => e.step === step)!;
describe('EO-STO-1: every step stores what main (23ede7f) stores', () => {
  it('start-up, typing, two tabs, an outside writer and a full disk', async () => {
    const { current, diff } = await differential(STARTS_TABS_WRITES);
    expect(diff).toBe('');
    // not a vacuous match: the sequence did what it says
    expect(at(current, 'first start: the originals move into a learner').result).toBe('"durable"');
    expect(at(current, 'a second tab on the same learner is read-only').result).toBe('"locked"');
    expect(at(current, 'the second tab reads; its write is refused').result).toBe('["th","throws WorkspaceError: locked"]');
    expect(at(current, 'another writer saves the record; both tabs read the new bytes').result).toBe('["en","en"]');
    expect(at(current, 'a full disk refuses a save; nothing is half-written').result).toMatch(/^\["throws QuotaExceededError: \d+","en"\]$/);
    expect(at(current, 'a caller changes the backup it was given; the stored work does not change').result).toBe('"en"');
    expect(at(current, 'the first tab closes; the second reloads and owns the learner').result).toBe('"durable"');
  });

  it('learners: create, rename, damaged and newer records, reset, delete, backups and restores', async () => {
    const { current, diff } = await differential(LEARNERS);
    expect(diff).toBe('');
    expect(at(current, 'one record cut short, one from a newer version').result).toMatch(/"state":"newer".*"state":"unreadable"/);
    expect(at(current, 'reset one lesson; the old binding is fenced').result).toMatch(/WorkspaceError: stale/);
    expect(at(current, 'restore refused: a newer backup, a broken file').result).toBe('["WorkspaceError: newer","WorkspaceError: invalid"]');
    expect(at(current, 'learners up to the limit of 40').result).toMatch(/WorkspaceError: limit/);
    expect(at(current, 'delete the active learner: back to the chooser').tabs.A.status).toBe('chooser');
  });

  it('visit-only, and a catalogue that is newer or cannot be read', async () => {
    const { current, diff } = await differential(VISIT_ONLY);
    expect(diff).toBe('');
    expect(at(current, 'a browser without Web Locks: visit-only').result).toBe('"ephemeral"');
    expect(at(current, 'visit-only work stays in memory').disk).toEqual(at(current, 'originals from before profiles').disk);
  });

  it('§10.3.1: the template, "Fly it" and restore with the design, the hand-off, and a read-only tab', async () => {
    const { current, diff } = await differential(MISSION_PATHS);
    expect(diff).toBe('');
    const kept = (step: string) => storedValue(at(current, step), LEGACY, 'orbitlab.mission');
    // #77: the stored mission comes back byte for byte, and neither the template nor entering Engineer writes over it
    for (const step of ['the first tab opens Engineer on it', 'Home: the first-launch template; nothing is stored',
      'entering Engineer keeps the template, and the stored mission']) expect(kept(step), step).toBe(PRE77_MISSION);
    expect(JSON.parse(kept('the template changed: now it is stored')!).mission.payloadMass).toBe(1200);
    expect(kept('the template changed: now it is stored')).toBe(TEMPLATE_MISSION);
    // #80: "Fly it" stores the design beside the mission; start-up restores both, the same bytes
    const flown = kept('Build: "Fly it" stores the design and its revision')!;
    expect(JSON.parse(flown).design).toEqual(design.design);
    expect(kept('reload: start-up restores the mission with its design')).toBe(flown);
    expect(flown).toBe(FLOWN_MISSION);
    expect(at(current, '"Continue in Orbit": the hand-off carries the design, in memory only').result).toBe(JSON.stringify(design.design));
    // the hand-off and the read-only tab store nothing
    const after = at(current, 'reload: start-up restores the mission with its design').disk;
    for (const step of ['"Continue in Orbit": the hand-off carries the design, in memory only', 'a second tab on the learner opens Engineer, read-only',
      'read-only: template, Engineer, a change, "Fly it"', 'read-only, from Home: template, Explore']) expect(at(current, step).disk, step).toEqual(after);
    expect(at(current, 'a second tab on the learner opens Engineer, read-only').tabs.B.status).toBe('locked');
  });

  it('reports a difference that is only the order of the keys in one stored JSON value', async () => {
    // the plan's sabotage, kept: the catalogue written with its keys in another order, which every reader accepts
    const reordered = (s: RawStorage): RawStorage => ({
      get length() { return s.length; }, key: (i) => s.key!(i), getItem: (k) => s.getItem(k), removeItem: (k) => s.removeItem(k),
      setItem: (k, v) => s.setItem(k, k === PROFILE_CATALOG_KEY ? JSON.stringify((({ profiles, ...rest }) => ({ profiles, ...rest }))(JSON.parse(v))) : v),
    });
    const sabotaged: Impl = { ...CURRENT, make: (storage, ...rest) => CURRENT.make(reordered(storage), ...rest) };
    const { diff } = await differential(STARTS_TABS_WRITES, sabotaged);
    expect(diff).toMatch(/^step 2 "first start: the originals move into a learner": localStorage\["orbitlab\.profiles\.catalog\.v1"\] differs at character \d+:\n  src\/workspace: \{"profiles"/);
  });

  it('reports a difference that is only the order of the keys in the stored mission document (§10.3.1)', async () => {
    // the plan's sabotage on the mission's own write path: "Fly it" stores `design` ahead of the mission (mission-file.ts saveStoredMission)
    const saveStoredMission: typeof missionFile.saveStoredMission = (state, store, design) => {
      const doc = design ? { design, ...missionFile.missionDocument(state) } : missionFile.missionDocument(state);
      try { store?.setItem(missionFile.MISSION_STORE_KEY, JSON.stringify(doc)); } catch { /* storage off or full */ }
    };
    const sabotaged = { ...CURRENT, mission: { ...missionFile, ...designRef, ...workspaceMission, saveStoredMission } };
    const { diff } = await differential(MISSION_PATHS, sabotaged);
    expect(diff).toMatch(/^step 6 "Build: "Fly it" stores the design and its revision": localStorage\["orbitlab\.profile\.v1\.legacy-v1"\] differs at character \d+:\n  src\/workspace: .*\{\\"design\\":\{/);
  });
});
