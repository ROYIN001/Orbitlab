/** Bounded full-flight measurement helper. No Vitest registration or assertions:
 * a plain Vite SSR audit can import this without starting unrelated tests. */
import { Simulation, type SimEvent } from '../src/physics/simulation';
import { DEG } from '../src/physics/constants';
import { lerp, norm, sub, type Vec3 } from '../src/physics/vec3';
import { quatAngularDistance, quatSlerp, type Quat } from '../src/physics/rigid/math';
import { rigidMission } from './rigid-harness';
import { achievedElements, orbitMisses } from './fleet-harness';

export const MISSION_CHECKPOINTS = [50, 100, 200, 300, 400, 500, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000] as const;
const MAIN_EVENT_KEYS = new Set([
  'evt.ignition', 'evt.boosterIgnition', 'evt.liftoff', 'evt.maxQ', 'evt.meco', 'evt.seco',
  'evt.stageCutoff', 'evt.boosterBurnout', 'evt.boosterSep', 'evt.stageSep', 'evt.fairingSep',
  'evt.parkingOrbit', 'evt.payloadSep', 'evt.burnScheduled', 'evt.burnStart', 'evt.burnPaused',
  'evt.burnComplete', 'evt.targetOrbit', 'evt.offTargetOrbit',
]);

export interface MissionRawSample {
  t: number; r: Vec3; v: Vec3; q: Quat; configurationId: string;
}
function sample(sim: Simulation): MissionRawSample {
  const rigid = sim.state.rigid!;
  return { t: sim.state.t, r: { ...sim.state.r }, v: { ...sim.state.v }, q: { ...rigid.attitudeQ },
    configurationId: rigid.configurationId ?? '' };
}
function eventIdentity(event: SimEvent): string {
  const p = event.params ?? {};
  return [event.key, p.stage ?? '', p.n ?? '', p.kind ?? '', p.satId ?? '', p.name ?? ''].join('|');
}

export function runRigidMissionConvergence(id: 'leo' | 'iss', integrationStepS: number,
  progress?: (value: { id: string; integrationStepS: number; t: number; status: string }) => void) {
  const sim = new Simulation(rigidMission(id), { headless: true, rigidDt: integrationStepS });
  const checkpoints: MissionRawSample[] = [];
  const discontinuousCheckpoints: number[] = [];
  let ticks = 0, nextProgress = 0, maximumRate = 0, maximumNormError = 0, finite = true;
  let outsideAeroS = 0, saturatedS = 0, previous = sample(sim);
  while (!sim.isFailed() && (sim.state.status !== 'orbit' || !sim.state.payloadSeparated)
    && sim.state.t < 9000 && ticks < 902000 && finite) {
    ticks++;
    sim.step(sim.suggestedDt());
    const current = sample(sim), rigid = sim.state.rigid!, elapsed = current.t - previous.t;
    finite &&= [sim.state.mass, ...Object.values(current.r), ...Object.values(current.v),
      ...Object.values(current.q), ...Object.values(rigid.omegaBody)].every(Number.isFinite);
    maximumRate = Math.max(maximumRate, norm(rigid.omegaBody));
    maximumNormError = Math.max(maximumNormError, rigid.rawQuaternionNormError);
    if (!rigid.aeroWithinEnvelope) outsideAeroS += elapsed;
    if (rigid.saturated) saturatedS += elapsed;
    for (const t of MISSION_CHECKPOINTS) if (previous.t < t && current.t >= t) {
      if (previous.configurationId !== current.configurationId) {
        discontinuousCheckpoints.push(t);
        continue; // A separated body's CG/quaternion must never be blended.
      }
      const f = (t - previous.t) / elapsed;
      checkpoints.push({ t, r: lerp(previous.r, current.r, f), v: lerp(previous.v, current.v, f),
        q: quatSlerp(previous.q, current.q, f), configurationId: current.configurationId });
    }
    previous = current;
    if (current.t >= nextProgress) {
      progress?.({ id, integrationStepS, t: current.t, status: sim.state.status });
      nextProgress = Math.floor(current.t / 500) * 500 + 500;
    }
  }
  const events = [...sim.events].sort((a, b) => a.t - b.t).map(event => ({ ...event,
    params: event.params ? { ...event.params } : undefined }));
  return { id, integrationStepS, controlPeriodS: 0.01, config: sim.cfg, target: sim.plan.target,
    t: sim.state.t, status: sim.state.status, payloadSeparated: sim.state.payloadSeparated,
    targetReached: events.some(event => event.key === 'evt.targetOrbit'), finalState: sample(sim),
    achievedElements: achievedElements(sim), orbitMisses: orbitMisses(sim), ticks,
    maximumRate, maximumNormError, finite, outsideAeroS, saturatedS,
    modelVersion: sim.state.rigid?.modelVersion, dataRevision: sim.rigidRuntime?.snapshot?.dataRevision,
    massFlowModel: sim.state.rigid?.massFlowModel,
    remainingMassKg: sim.state.mass, remainingRcsKg: sim.state.rigid?.rcsPropellantKg,
    remainingMainFuelKg: sim.vehicle.active?.propellant, checkpoints, discontinuousCheckpoints,
    mainEvents: events.filter(event => MAIN_EVENT_KEYS.has(event.key)).map(event => ({ t: event.t, identity: eventIdentity(event) })),
    events };
}

export type MissionConvergenceRun = ReturnType<typeof runRigidMissionConvergence>;
export function compareRigidMissions(nominal: MissionConvergenceRun, reference: MissionConvergenceRun) {
  const common = nominal.checkpoints.filter(value => reference.checkpoints.some(other => other.t === value.t));
  const checkpoints = common.map(value => {
    const target = reference.checkpoints.find(other => other.t === value.t)!;
    return { t: value.t, sameConfiguration: value.configurationId === target.configurationId,
      positionDeltaM: norm(sub(value.r, target.r)), velocityDeltaMs: norm(sub(value.v, target.v)),
      attitudeDeltaDeg: quatAngularDistance(value.q, target.q) / DEG };
  });
  const mainEvents = nominal.mainEvents.map((event, index) => ({ identity: event.identity,
    referenceIdentity: reference.mainEvents[index]?.identity,
    timeDeltaS: reference.mainEvents[index] ? event.t - reference.mainEvents[index].t : null }));
  return { id: nominal.id, nominalStepS: nominal.integrationStepS, referenceStepS: reference.integrationStepS,
    sameClassification: nominal.status === reference.status && nominal.targetReached === reference.targetReached
      && nominal.payloadSeparated === reference.payloadSeparated,
    nominalEventCount: nominal.mainEvents.length, referenceEventCount: reference.mainEvents.length,
    checkpoints, mainEvents };
}
