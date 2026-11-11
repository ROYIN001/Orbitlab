/**
 * EduSat-3U handed to the rest of Orbitlab: the section's plain figures
 * (`satelliteRecord`, src/structure/edusat-design.ts) made into the app's
 * satellite record on the app's side (src/structure-host/satellite.ts). Every
 * design the section can make is a sound `SatelliteDesign`, passes the
 * checks the Build section runs before it hands a design on, and arrives
 * whole — its mass, its orbit — as each destination reads it back with its
 * own code: the Orbit section's reading of the state vector and the mass its
 * lifetime analysis takes, and the Launch section's mission parser.
 *
 * And the hand-off itself (src/structure-host/handoff.ts) against a stand-in
 * for the app's doors: what is refused and why, what is kept of Launch's
 * mission before a send replaces it, and when it may be put back.
 */
import { describe, expect, it } from 'vitest';
import { BATTERY_OPTIONS, PAYLOAD_OPTIONS } from '../src/structure/edusat';
import { eduFigures, massOf, satelliteRecord, type EduDesign } from '../src/structure/edusat-design';
import { RECEIPT_TOLERANCE, checkReceipt, type HandoffReceipt, type SatelliteRecord } from '../src/structure/handoff';
import { POWER_ENV } from '../src/structure-host/power-env';
import { handoffPreview, satelliteDesign } from '../src/structure-host/satellite';
import { launchReceipt, structureHandoff, type LaunchKept, type StructureAppHost } from '../src/structure-host/handoff';
import { satelliteDesignProblems } from '../src/config/satellite-design';
import { designDateJd, designHandoff } from '../src/design/satellite-model';
import { designLaunch, designMissionDocument, designMissionIssues, designSite } from '../src/design/satellite-launch';
import { handoffOrbit, heldFromHandoff } from '../src/orbit/playground-model';
import { craftFromHandoff, defaultCraft } from '../src/orbit/budget';
import { missionDocument, missionFileText, parseMissionDocument, type MissionState } from '../src/config/mission-file';
import { defaultMissionState } from '../src/lessons/config';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';

const DESIGNS: EduDesign[] = BATTERY_OPTIONS.flatMap((battery) => PAYLOAD_OPTIONS.map((payload) => ({ battery, payload })));
const FROM = new Date('2026-11-09T00:00:00Z');
const flight = { vehicle: vehicleById('soyuz21b'), siteId: 'vostochny', from: FROM };
/** a Launch panel on another mission than the default (another rocket, site, orbit and payload), so nothing it holds can pass for the hand-off's */
const ON_THE_PANEL = (): MissionState => ({
  ...defaultMissionState(), vehicleId: 'falcon9', siteId: 'cape', orbitId: 'gto', orbit: { ...orbitById('gto') }, payloadMass: 5000,
});
const recordOf = (d: EduDesign, name = 'EduSat-3U'): SatelliteRecord => satelliteRecord(eduFigures(d, POWER_ENV), 'test-edusat', name);

describe('EduSat-3U handed on to Orbit and Launch', () => {
  for (const d of DESIGNS) {
    it(`${d.battery} with ${d.payload}: a sound design, read back whole by both destinations`, () => {
      const record = recordOf(d);
      const sat = satelliteDesign(record);
      const sent = handoffPreview(sat);
      expect(satelliteDesignProblems(sat)).toEqual([]);
      expect(Math.abs(sat.bus.dryMass - massOf(d))).toBeLessThan(RECEIPT_TOLERANCE.kg);
      expect([sat.propulsion, sat.payload, sat.kind]).toEqual([null, null, 'science']);
      // what is shown before sending is the app's own record: its mass, its 3U body, its orbit
      expect(sent).toMatchObject({ name: 'EduSat-3U', massKg: sat.bus.dryMass, perigee: 500e3, apogee: 500e3, sso: true });
      expect(sent.size).toEqual({ width: 0.1, height: 0.1, depth: 0.3405 });
      expect(sent.inclination).toBeCloseTo(97.4, 1);

      // Orbit: what its playground holds, read as `heldHandoff` reads it (src/ui/orbit/playground.ts), on the orbit it loads
      const h = designHandoff(sat, designDateJd('2026-11-09')!, 'EduSat-3U');
      expect(h).not.toBeNull();
      const launchCraft = craftFromHandoff(h!); // null: no engine
      const atOrbit: HandoffReceipt = { ...heldFromHandoff(h!, handoffOrbit(h!), launchCraft, launchCraft), replaced: 0 };
      expect(checkReceipt(sent, atOrbit)).toEqual({ mass: true, orbit: true, whole: true, ok: true });
      expect(atOrbit.analysisMass).toBe(atOrbit.mass);
      // the learner's own spacecraft chosen in Orbit's planner: the satellite still arrived whole, and its analyses use the other mass
      const own = defaultCraft();
      const withOwn = heldFromHandoff(h!, handoffOrbit(h!), own, launchCraft);
      expect(checkReceipt(sent, { ...withOwn, replaced: 0 }).ok).toBe(true);
      expect(withOwn.analysisMass).toBe(own.mass);

      // Launch: Build's checks before "Fly it" pass, and the Launch section's parser takes every value
      expect(designLaunch(sat).problems).toEqual([]);
      expect(designMissionIssues(sat, flight)).toEqual([]);
      const parsed = parseMissionDocument(JSON.parse(missionFileText(designMissionDocument(sat, flight))), ON_THE_PANEL());
      expect(parsed.usable).toBe(true);
      expect(parsed.issues).toEqual([]);
      const atLaunch = launchReceipt(parsed.state, parsed.issues.length);
      expect(checkReceipt(sent, atLaunch).ok).toBe(true);
      expect([parsed.state.vehicleId, atLaunch.siteId]).toEqual(['soyuz21b', designSite(sat, flight)]);
      // what the panel held before is not what is read back
      expect(checkReceipt(sent, launchReceipt(ON_THE_PANEL(), 0)).ok).toBe(false);
    });
  }

  it('flies from Vostochny, the site the section names', () => {
    expect(designSite(satelliteDesign(recordOf(DESIGNS[0])), flight)).toBe('vostochny');
  });

  it('calls a receipt wrong when the mass, the orbit or a replaced value says so', () => {
    const sent = handoffPreview(satelliteDesign(recordOf(DESIGNS[0])));
    const good: HandoffReceipt = { mass: sent.massKg, perigeeAlt: sent.perigee, apogeeAlt: sent.apogee, inclination: sent.inclination, replaced: 0 };
    expect(checkReceipt(sent, good).ok).toBe(true);
    expect(checkReceipt(sent, { ...good, inclination: 'sso' }).ok).toBe(true);
    expect(checkReceipt(sent, { ...good, mass: sent.massKg + 0.001 })).toMatchObject({ mass: false, ok: false });
    expect(checkReceipt(sent, { ...good, apogeeAlt: sent.apogee + 2000 })).toMatchObject({ orbit: false, ok: false });
    expect(checkReceipt(sent, { ...good, inclination: sent.inclination + 1 })).toMatchObject({ orbit: false, ok: false });
    expect(checkReceipt(sent, { ...good, inclination: 'site' })).toMatchObject({ orbit: false, ok: false });
    expect(checkReceipt(sent, { ...good, replaced: 1 })).toMatchObject({ whole: false, ok: false });
  });
});

/**
 * A stand-in for the app's doors: a Launch panel that holds one mission and a
 * stored copy, takes a mission through the Launch section's own parser, and
 * an Orbit that holds whatever it was last given.
 */
function fakeApp(start: MissionState = ON_THE_PANEL()) {
  let panel = start;
  let stored: string | null = missionFileText(missionDocument(start));
  const log: string[] = [];
  const host: StructureAppHost = {
    toOrbit: (h, level) => {
      log.push(`orbit:${level}`);
      const craft = craftFromHandoff(h);
      return { ...heldFromHandoff(h, handoffOrbit(h), craft, craft), replaced: 0 };
    },
    toLaunch: (doc, level) => {
      const parsed = parseMissionDocument(JSON.parse(missionFileText(doc)), panel);
      if (!parsed.usable) return null;
      panel = parsed.state;
      stored = missionFileText(missionDocument(panel));
      log.push(`launch:${level}`);
      return launchReceipt(panel, parsed.issues.length);
    },
    launchMission: (): LaunchKept => ({ shown: missionDocument(panel), stored }),
    restoreLaunch: (kept, level) => {
      const parsed = parseMissionDocument(kept.stored === null ? kept.shown : JSON.parse(kept.stored), panel);
      if (!parsed.usable) return false;
      panel = parsed.state;
      stored = kept.stored;
      log.push(`restore:${level}`);
      return true;
    },
  };
  return {
    host, log,
    panel: (): MissionState => panel,
    stored: (): string | null => stored,
    /** the learner makes another mission in Launch */
    edit: (next: MissionState): void => { panel = next; stored = missionFileText(missionDocument(next)); },
  };
}

describe('the hand-off through the app\'s doors', () => {
  const now = () => FROM;

  it('previews what the app would send: the app\'s own record of the section\'s figures', () => {
    const app = fakeApp();
    const env = structureHandoff(app.host, now);
    const record = recordOf(DESIGNS[1], 'EduSat-3U แบบทดลอง');
    expect(env.preview(record)).toEqual(handoffPreview(satelliteDesign(record)));
    expect(env.preview(record).name).toBe('EduSat-3U แบบทดลอง');
    // a preview hands nothing over
    expect(app.log).toEqual([]);
  });

  it('sends to Orbit at the level asked, and reports what Orbit then held', () => {
    const app = fakeApp();
    const env = structureHandoff(app.host, now);
    const r = env.send('orbit', recordOf(DESIGNS[0]), 'engineer');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(app.log).toEqual(['orbit:engineer']);
    expect(checkReceipt(r.sent, r.receipt!).ok).toBe(true);
    // nothing of Launch was touched, so nothing is offered to put back
    expect(env.canRestoreLaunch()).toBe(false);
    expect(app.panel().vehicleId).toBe('falcon9');
  });

  it('sends to Launch, and offers to put back exactly what Launch had', () => {
    const app = fakeApp();
    const before = { panel: app.panel(), stored: app.stored() };
    const env = structureHandoff(app.host, now);
    const r = env.send('launch', recordOf(DESIGNS[3]), 'watch');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(checkReceipt(r.sent, r.receipt!).ok).toBe(true);
    expect(app.panel().vehicleId).toBe('soyuz21b');
    expect(env.canRestoreLaunch()).toBe(true);
    // a second send keeps the first "before", not the satellite's own mission
    expect(env.send('launch', recordOf(DESIGNS[0]), 'watch').ok).toBe(true);
    expect(env.canRestoreLaunch()).toBe(true);
    expect(env.restoreLaunch('explore')).toBe(true);
    expect(app.log).toEqual(['launch:watch', 'launch:watch', 'restore:explore']);
    expect(app.panel()).toEqual(before.panel);
    expect(app.stored()).toBe(before.stored);
    // put back once: the offer ends
    expect(env.canRestoreLaunch()).toBe(false);
    expect(env.restoreLaunch('explore')).toBe(false);
  });

  it('does not put a kept mission back over one the learner has made since', () => {
    const app = fakeApp();
    const env = structureHandoff(app.host, now);
    expect(env.send('launch', recordOf(DESIGNS[0]), 'explore').ok).toBe(true);
    const theirs: MissionState = { ...defaultMissionState(), payloadMass: 1234 };
    app.edit(theirs);
    expect(env.canRestoreLaunch()).toBe(false);
    expect(env.restoreLaunch('explore')).toBe(false);
    expect(app.panel()).toEqual(theirs);
    // and the offer does not come back when Launch happens to hold the satellite's mission again by a later send
    expect(env.send('launch', recordOf(DESIGNS[0]), 'explore').ok).toBe(true);
    expect(env.restoreLaunch('explore')).toBe(true);
    // what comes back is the learner's own mission, the one the later send replaced
    expect(app.panel()).toEqual(theirs);
  });

  it('says why a send was not handed over, and hands nothing over', () => {
    const app = fakeApp();
    const env = structureHandoff(app.host, now);
    // a record the app's design checks refuse: a mass no satellite has
    const bad = { ...recordOf(DESIGNS[0]), massKg: -1 };
    const toLaunch = env.send('launch', bad, 'explore');
    expect(toLaunch.ok).toBe(false);
    if (!toLaunch.ok) expect(toLaunch.reason === 'checks' && toLaunch.issues > 0).toBe(true);
    expect(env.send('orbit', bad, 'explore')).toEqual({ ok: false, reason: 'design' });
    expect(app.log).toEqual([]);
    expect(env.canRestoreLaunch()).toBe(false);
    // Launch itself refusing the mission is said as such, and leaves no offer
    const closed: StructureAppHost = { ...app.host, toLaunch: () => null };
    const refused = structureHandoff(closed, now);
    expect(refused.send('launch', recordOf(DESIGNS[0]), 'explore')).toEqual({ ok: false, reason: 'launch' });
    expect(refused.canRestoreLaunch()).toBe(false);
  });

  it('keeps the kept mission when Launch cannot take it back', () => {
    const app = fakeApp();
    const stubborn: StructureAppHost = { ...app.host, restoreLaunch: () => false };
    const env = structureHandoff(stubborn, now);
    expect(env.send('launch', recordOf(DESIGNS[0]), 'explore').ok).toBe(true);
    expect(env.restoreLaunch('explore')).toBe(false);
    // still offered: nothing was lost by the failed try
    expect(env.canRestoreLaunch()).toBe(true);
  });
});
