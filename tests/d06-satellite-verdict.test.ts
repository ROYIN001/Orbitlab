/**
 * "Fly it" says the Launch section's verdict before the student flies
 * (roadmap D06; Phase 4 stage 3b, task I2, item 1 — the stage-3a integration
 * review's first doubt): src/design/satellite-verdict.ts.
 *
 * CRITERIA:
 * - the verdict is the setup panel's on the mission the Launch section reads
 *   back: the document "Fly it" hands over, through a JSON round trip and the
 *   Launch section's own parser (`parseMissionDocument`), judged the way
 *   `SetupPanel.feasibility` judges it — `getConfig()` of that state
 *   (`missionConfigFromState`), `openTopVehicle`, one `planMission`, the
 *   insertion probe only when `marginalMission` says so, then
 *   `missionVerdict` — restated here from src/ui/panel.ts (`refresh`,
 *   `refreshInsertionProbe`, `feasibility`), since the panel needs a
 *   document. Equal exactly: level, cause, the plane-window flag and the
 *   text. For every template, on the Launch section's default rocket
 *   (Soyuz-2.1a, asked from Baikonur), on Electron and on Falcon 9.
 * - NAPA-2 on the default Soyuz-2.1a is "Not flyable as set" for the reason
 *   the review found (no restartable upper stage: the 200 × 540 km
 *   insertion is final), so it is said before the click.
 * - the rockets that can fly it (`designRockets`) are exactly those of the
 *   offered ones whose verdict is not a failure, in the order offered, each
 *   with the verdict `designVerdict` gives it alone.
 * - THE STATES PINNED BELOW were read from a probe run of `designVerdict`
 *   (2026-10-01, launch time 2026-10-01 12:00 UTC) before this test was
 *   written, except NAPA-2 on Soyuz-2.1a, which the review had reported.
 *   They are the record of what the verdict says of the templates today,
 *   not a tolerance: a change to any of them is a change to the planner, the
 *   verdict or a template, and is to be read, not re-pinned blindly.
 */
import { describe, expect, it } from 'vitest';
import { SATELLITE_TEMPLATES } from '../src/data/satellite-templates';
import { VEHICLES, openTopVehicle, missionVehicle, vehicleById } from '../src/data/vehicles';
import { missionSatellite } from '../src/data/satellites';
import { siteById } from '../src/data/sites';
import { planMission, resolveTarget, type MissionPlan } from '../src/physics/mission';
import { probeInsertion, type InsertionProbe } from '../src/physics/autotune';
import { RAD } from '../src/physics/constants';
import { marginalMission, missionVerdict, type Feasibility } from '../src/config/verdict';
import { parseMissionDocument } from '../src/config/mission-file';
import { defaultMissionState, missionConfigFromState } from '../src/lessons/config';
import { designFromTemplate } from '../src/design/satellite-model';
import { designMissionDocument, designMissionIssues, designSite, type DesignFlight } from '../src/design/satellite-launch';
import { designRockets, designVerdict } from '../src/design/satellite-verdict';
import { t } from '../src/i18n';

const FROM = new Date(Date.UTC(2026, 9, 1, 12));
/** The Launch section's default mission: Soyuz-2.1a from Baikonur (`defaultMissionState`). */
const DEFAULT = defaultMissionState();

/** `SetupPanel.feasibility()` on the mission the Launch section reads back from the document. */
function panelVerdict(flight: DesignFlight, designId: string): Feasibility {
  const design = designFromTemplate(designId, `s-${designId}`, `My ${designId}`);
  const doc = designMissionDocument(design, flight);
  const parsed = parseMissionDocument(JSON.parse(JSON.stringify(doc)), defaultMissionState());
  expect(parsed.issues).toEqual([]);
  const s = parsed.state;
  const cfg = missionConfigFromState(s);
  const satellite = missionSatellite(s);
  const spec = openTopVehicle(missionVehicle(s), satellite);
  const site = siteById(s.siteId);
  let plan: MissionPlan | null = null;
  try { plan = planMission(cfg, site, spec); } catch { plan = null; }
  let insertion: InsertionProbe | null = null;
  if (plan && marginalMission(spec, satellite, s.payloadMass, plan, s.orbit)) {
    try { insertion = probeInsertion({ ...cfg, dynamics: { ...(cfg.dynamics ?? { wind: 'calm', seed: 20260919 }), model: 'pointMass' } }); } catch { insertion = null; }
  }
  return missionVerdict({
    spec, site, orbit: s.orbit, satellite, payloadMass: s.payloadMass,
    inclinationDeg: resolveTarget(s.orbit, site, s.launchTime).inclination * RAD,
    plan, insertion, failureMode: s.failure.mode, siteReassigned: false,
  });
}

/** The three rockets of the task, as "Fly it" flies them: the Launch section's own from its site, the others from their first site that reaches the plane. */
const ROCKETS: Record<string, DesignFlight> = {
  soyuz21a: { vehicle: vehicleById(DEFAULT.vehicleId), siteId: DEFAULT.siteId, from: FROM },
  electron: { vehicle: vehicleById('electron'), from: FROM },
  falcon9: { vehicle: vehicleById('falcon9'), from: FROM },
};

/** What the probe run read (see the header): level and cause, per template and rocket. */
const PINNED: Record<string, Record<keyof typeof ROCKETS, `${Feasibility['level']} ${Feasibility['cause']}`>> = {
  napa2: { soyuz21a: 'fail noRestart', electron: 'ok ready', falcon9: 'ok ready' },
  theos2: { soyuz21a: 'ok ready', electron: 'fail overCapacity', falcon9: 'ok ready' },
  earthObs: { soyuz21a: 'ok ready', electron: 'fail overCapacity', falcon9: 'ok ready' },
  comsat: { soyuz21a: 'fail noRating', electron: 'fail noRating', falcon9: 'warn inclination' },
  weather: { soyuz21a: 'fail noRating', electron: 'fail noRating', falcon9: 'warn inclination' },
  navigation: { soyuz21a: 'fail burnBudget', electron: 'fail overCapacity', falcon9: 'ok ready' },
  science: { soyuz21a: 'ok ready', electron: 'fail overCapacity', falcon9: 'ok ready' },
};

describe('the Launch section\'s verdict, said before "Fly it" (D06, I2)', () => {
  it('is the setup panel\'s verdict on the mission the Launch section reads back, for every template on Soyuz-2.1a, Electron and Falcon 9', () => {
    expect(Object.keys(PINNED).sort()).toEqual(SATELLITE_TEMPLATES.map((x) => x.id).sort());
    for (const tpl of SATELLITE_TEMPLATES) {
      const design = designFromTemplate(tpl.id, `s-${tpl.id}`, `My ${tpl.id}`);
      for (const [rocket, flight] of Object.entries(ROCKETS)) {
        const where = `${tpl.id} on ${rocket} from ${designSite(design, flight)}`;
        expect(designMissionIssues(design, flight), where).toEqual([]);
        const v = designVerdict(design, flight);
        expect(v, where).toEqual(panelVerdict(flight, tpl.id));
        expect(`${v.level} ${v.cause}`, where).toBe(PINNED[tpl.id][rocket as keyof typeof ROCKETS]);
        expect(v.text.length, where).toBeGreaterThan(0);
      }
    }
  });

  it('says NAPA-2 on the default Soyuz-2.1a is not flyable as set: no restartable upper stage, so the 200 × 540 km insertion is final', () => {
    const design = designFromTemplate('napa2', 's-napa2', 'My NAPA-2');
    const v = designVerdict(design, ROCKETS.soyuz21a);
    expect(designSite(design, ROCKETS.soyuz21a)).toBe('plesetsk');
    expect(v.level).toBe('fail');
    expect(v.cause).toBe('noRestart');
    expect(t('setup.light.fail')).toBe('Not flyable as set');
    // the panel's own sentence, with the insertion and the target in it
    expect(v.text).toMatch(/no restartable upper stage/);
    expect(v.text).toContain('200 × 540 km');
    expect(v.text).toContain('520 × 540 km');
  });

  it('offers the rockets that can fly it: those offered whose verdict is not a failure, in the order offered', () => {
    for (const tpl of SATELLITE_TEMPLATES) {
      const design = designFromTemplate(tpl.id, `s-${tpl.id}`, `My ${tpl.id}`);
      // as the designer offers them: the Launch section's own from its site, then the fleet
      const flights: DesignFlight[] = [ROCKETS.soyuz21a, ...VEHICLES.filter((v) => v.id !== DEFAULT.vehicleId).map((vehicle) => ({ vehicle, from: FROM }))];
      const can = designRockets(design, flights);
      const each = flights.map((f) => ({ id: f.vehicle.id, v: designVerdict(design, f) }));
      expect(can.map((r) => r.flight.vehicle.id), tpl.id).toEqual(each.filter((x) => x.v.level !== 'fail').map((x) => x.id));
      for (const r of can) expect(r.verdict, `${tpl.id} on ${r.flight.vehicle.id}`).toEqual(each.find((x) => x.id === r.flight.vehicle.id)!.v);
      // the three of the task, where the pinned states say they can
      for (const rocket of Object.keys(ROCKETS) as (keyof typeof ROCKETS)[]) {
        expect(can.some((r) => r.flight.vehicle.id === rocket), `${tpl.id}: ${rocket}`).toBe(!PINNED[tpl.id][rocket].startsWith('fail'));
      }
    }
    // NAPA-2: not the default Soyuz-2.1a, but Electron and Falcon 9 among others
    const napa = designRockets(designFromTemplate('napa2', 's', 'n'), [ROCKETS.soyuz21a, ROCKETS.electron, ROCKETS.falcon9]);
    expect(napa.map((r) => r.flight.vehicle.id)).toEqual(['electron', 'falcon9']);
  }, 60_000);
});
