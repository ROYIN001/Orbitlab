/**
 * A custom vehicle, checked before it flies (roadmap S02).
 *
 * A mission may carry its vehicle inline (`MissionConfig.vehicleSpec`), from a
 * mission file today and from the builders of Phase 3 later
 * (docs/ROADMAP-PART2-3.md). The physics trusts a `VehicleSpec` the way it
 * trusts the catalogue's, so everything a file could get wrong is caught here:
 * the wrong type, NaN and Infinity, masses and dimensions that are not
 * positive, engine figures no chemical engine has, a stage count or a strap-on
 * arrangement the model does not fly, ids the model reserves for itself, and
 * fields this version does not know (a field it does not know could change
 * what the vehicle is). Each problem names its path in the spec, so a file can
 * be fixed from the message alone.
 *
 * The bounds are PLAUSIBILITY bounds, not capability: they take in every
 * vehicle in the catalogue with room to spare (Super Heavy's 33 engines and
 * 3 400 t of propellant, an SRB's 16 MN) and reject what is a typo or a unit
 * slip — a thrust in kN where N was meant is a vehicle that never leaves the
 * pad, which is the pre-flight verdict's to say, but an Isp of 3 000 s is no
 * chemical engine. A valid vehicle may still be unable to fly its mission;
 * that is the feasibility verdict's business, not this file's.
 */
import type { VehicleSpec } from '../types';
import { SITES } from '../data/sites';
import { isCatalogueVehicle, vehicleById } from '../data/vehicles';

export interface VehicleSpecIssue {
  /** where in the spec, `stages[1].engine.ispVac` */
  path: string;
  message: string;
}

/** The most stages the model is asked to fly (the catalogue's deepest stack has four). */
export const MAX_STAGES = 6;
/** Strap-on groups on the first stage, and units in one group. */
export const MAX_BOOSTER_GROUPS = 4;
export const MAX_BOOSTERS_PER_GROUP = 12;
/** Ids the vehicle model uses for parts of its own. */
export const RESERVED_PART_IDS: readonly string[] = ['spacecraft', 'fairing', 'payload', 'stage', 'active'];
/** A vehicle's, stage's or strap-on group's id: Latin letters, digits, "-" and "_", starting with a letter or a digit, at most 40 characters. */
export const PART_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;
const ID = PART_ID_PATTERN;
/**
 * The upper bounds the checks below hold a stage, a strap-on group and a
 * vehicle to, by name, so that a builder that changes a part (the remix of
 * roadmap D02) can refuse what the validator would refuse and say which bound.
 */
export const PART_LIMITS = {
  engineCount: 50,
  stageDryMass: 1e6, stagePropellantMass: 1e7,
  boosterDryMass: 1e6, boosterPropellantMass: 5e6,
  diameter: 15, length: 100, height: 200,
} as const;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const describe = (v: unknown): string => (typeof v === 'number' ? String(v) : v === null ? 'null' : Array.isArray(v) ? 'an array' : typeof v);

class Checker {
  readonly issues: VehicleSpecIssue[] = [];

  add(path: string, message: string): void {
    this.issues.push({ path, message });
  }

  /** Fields the version knows; anything else is reported. */
  known(o: Obj, path: string, fields: readonly string[]): void {
    for (const key of Object.keys(o)) if (!fields.includes(key)) this.add(`${path}${path ? '.' : ''}${key}`, 'is not a field of this version');
  }

  number(o: Obj, key: string, path: string, min: number, max: number, opts: { optional?: boolean; exclusiveMin?: boolean; integer?: boolean } = {}): number | undefined {
    const v = o[key], at = `${path}${path ? '.' : ''}${key}`;
    if (v === undefined) {
      if (!opts.optional) this.add(at, 'is required');
      return undefined;
    }
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      this.add(at, `must be a finite number (got ${describe(v)})`);
      return undefined;
    }
    if (opts.integer && !Number.isInteger(v)) this.add(at, `must be a whole number (got ${v})`);
    if (opts.exclusiveMin ? v <= min : v < min) this.add(at, `must be ${opts.exclusiveMin ? 'more than' : 'at least'} ${min} (got ${v})`);
    else if (v > max) this.add(at, `must be at most ${max} (got ${v})`);
    return v;
  }

  string(o: Obj, key: string, path: string, opts: { optional?: boolean; max?: number; pattern?: RegExp; allowEmpty?: boolean } = {}): string | undefined {
    const v = o[key], at = `${path}${path ? '.' : ''}${key}`;
    if (v === undefined) {
      if (!opts.optional) this.add(at, 'is required');
      return undefined;
    }
    if (typeof v !== 'string') { this.add(at, `must be text (got ${describe(v)})`); return undefined; }
    if (!opts.allowEmpty && !v.trim()) this.add(at, 'must not be empty');
    else if (v.length > (opts.max ?? 80)) this.add(at, `must be at most ${opts.max ?? 80} characters`);
    else if (opts.pattern && !opts.pattern.test(v)) this.add(at, 'must be Latin letters, digits, "-" or "_", starting with a letter or a digit, at most 40 characters');
    return v;
  }

  boolean(o: Obj, key: string, path: string): void {
    const v = o[key];
    if (v !== undefined && typeof v !== 'boolean') this.add(`${path}${path ? '.' : ''}${key}`, `must be true or false (got ${describe(v)})`);
  }
}

const ENGINE_FIELDS = ['name', 'count', 'thrustSL', 'thrustVac', 'ispSL', 'ispVac', 'minThrottle', 'solid', 'peakFactor', 'vacuumOnly', 'startupS', 'tailoffS'];
const BOOSTER_FIELDS = ['id', 'name', 'count', 'dryMass', 'propellantMass', 'engine', 'diameter', 'length', 'igniteAt', 'sepDelay', 'color', 'conicalTop', 'baseOffset', 'thrustSteps'];
const STAGE_FIELDS = ['id', 'name', 'dryMass', 'propellantMass', 'engine', 'diameter', 'length', 'restartable', 'sepDelay', 'ignitionDelay',
  'throttleWithBoosters', 'boosters', 'color', 'accentColor', 'profile', 'fins', 'gridFins', 'legs', 'flaps', 'nozzleLength', 'jettisons', 'engineEvents', 'cutoffAt',
  'hotStage'];
const FAIRING_FIELDS = ['mass', 'diameter', 'length', 'sepAltitude', 'sepTime', 'adapter', 'noseLength', 'color'];
const VEHICLE_FIELDS = ['id', 'name', 'country', 'manufacturer', 'height', 'payloadLEO', 'payloadGTO', 'payloadSSO', 'fairing', 'escapeSystem',
  'stages', 'sites', 'maxQ', 'maxAccel', 'maxQThrottle', 'recoverable', 'recoveryReserve', 'returnReserve', 'guidanceDefaults',
  'guidanceDefaultsSixDof', 'dragArea', 'crewCapable', 'notes', 'derivedFrom', 'padBurnS', 'crewedProfile', 'cargoShipProfile'];
/** Guidance fields a vehicle's own programme may set, with their stored-unit bounds (validation.ts's GUIDANCE_FIELDS, widened to cover the catalogue). */
const GUIDANCE_BOUNDS: Record<string, [number, number]> = {
  pitchOverAltitude: [0, 20000], kickAngle: [0, 60], kickDuration: [0, 120], maxTurnRate: [0, 10], loftAltitude: [0, 1e6],
  gravityTurnEnd: [0, 3e5], parkingAltitude: [0, 3e6], pitchMax: [-90, 90], pitchMin: [-90, 90], slewRate: [0, 50],
  maxAccel: [0, 200], maxTimeToGo: [0, 2e4],
  // a vehicle's own hand-over time (C01, PHY-01): part of a spec, never a user setting
  closedLoopStart: [0, 2e4],
};

/** Whether `raw` is a well-formed stored pitch programme (`checkPitchProgram`), for a mission file that carries one. */
export function pitchProgramValid(raw: unknown): boolean {
  const c = new Checker();
  checkPitchProgram(c, raw, 'pitchProgram');
  return raw !== undefined && c.issues.length === 0;
}

/** A stored pitch programme (`GuidanceParams.pitchProgram`): [s, deg] pairs, times rising from 0, pitch within ±90°. */
function checkPitchProgram(c: Checker, raw: unknown, path: string): void {
  if (raw === undefined) return;
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > 200) { c.add(path, `must be 2 to 200 [time s, pitch deg] pairs (got ${describe(raw)})`); return; }
  let last = -Infinity;
  raw.forEach((pair, i) => {
    const ok = Array.isArray(pair) && pair.length === 2 && pair.every((x) => typeof x === 'number' && Number.isFinite(x));
    if (!ok) { c.add(`${path}[${i}]`, `must be a [time s, pitch deg] pair (got ${describe(pair)})`); return; }
    const [t, pitch] = pair as [number, number];
    if (t < 0 || t > 2e4 || !(t > last)) c.add(`${path}[${i}]`, `time must rise, from 0 to 20 000 s (got ${t})`);
    if (pitch < -90 || pitch > 90) c.add(`${path}[${i}]`, `pitch must be within ±90° (got ${pitch})`);
    last = t;
  });
}

function checkEngine(c: Checker, raw: unknown, path: string, groundLit: boolean): void {
  if (!isObj(raw)) { c.add(path, `must be an engine (got ${describe(raw)})`); return; }
  c.known(raw, path, ENGINE_FIELDS);
  c.string(raw, 'name', path);
  c.number(raw, 'count', path, 1, PART_LIMITS.engineCount, { integer: true });
  const thrustVac = c.number(raw, 'thrustVac', path, 0, 2e7, { exclusiveMin: true });
  const ispVac = c.number(raw, 'ispVac', path, 50, 480);
  const vacuumOnly = raw.vacuumOnly === true;
  // a vacuum-only engine's sea-level pair is a placeholder the model never reads (EngineSpec.vacuumOnly)
  const thrustSL = c.number(raw, 'thrustSL', path, 0, 2e7);
  const ispSL = c.number(raw, 'ispSL', path, 0, 480);
  if (!vacuumOnly && thrustSL !== undefined && thrustVac !== undefined && thrustSL > thrustVac) c.add(`${path}.thrustSL`, `must not exceed thrustVac (${thrustSL} > ${thrustVac}): an engine loses thrust to the air, never gains it`);
  if (!vacuumOnly && ispSL !== undefined && ispVac !== undefined && ispSL > ispVac) c.add(`${path}.ispSL`, `must not exceed ispVac (${ispSL} > ${ispVac})`);
  if (groundLit && !vacuumOnly && thrustSL !== undefined && ispSL !== undefined && (thrustSL <= 0 || ispSL <= 0)) {
    c.add(path, 'lights on the pad, so it needs a sea-level thrust and specific impulse above zero');
  }
  if (groundLit && vacuumOnly) c.add(`${path}.vacuumOnly`, 'cannot be set on an engine that lights on the pad');
  c.number(raw, 'minThrottle', path, 0, 1, { optional: true, exclusiveMin: true });
  c.boolean(raw, 'solid', path);
  c.boolean(raw, 'vacuumOnly', path);
  c.number(raw, 'peakFactor', path, 1, 3, { optional: true });
  c.number(raw, 'startupS', path, 0, 10, { optional: true, exclusiveMin: true });
  c.number(raw, 'tailoffS', path, 0, 10, { optional: true, exclusiveMin: true });
}

function checkBooster(c: Checker, raw: unknown, path: string): string | undefined {
  if (!isObj(raw)) { c.add(path, `must be a strap-on group (got ${describe(raw)})`); return undefined; }
  c.known(raw, path, BOOSTER_FIELDS);
  const id = c.string(raw, 'id', path, { pattern: ID });
  c.string(raw, 'name', path);
  c.number(raw, 'count', path, 1, MAX_BOOSTERS_PER_GROUP, { integer: true });
  c.number(raw, 'dryMass', path, 0, PART_LIMITS.boosterDryMass, { exclusiveMin: true });
  c.number(raw, 'propellantMass', path, 0, PART_LIMITS.boosterPropellantMass, { exclusiveMin: true });
  const igniteAt = c.number(raw, 'igniteAt', path, 0, 600, { optional: true });
  checkEngine(c, raw.engine, `${path}.engine`, igniteAt === undefined || igniteAt === 0);
  c.number(raw, 'diameter', path, 0, PART_LIMITS.diameter, { exclusiveMin: true });
  c.number(raw, 'length', path, 0, PART_LIMITS.length, { exclusiveMin: true });
  c.number(raw, 'sepDelay', path, 0, 60, { optional: true });
  c.string(raw, 'color', path, { optional: true, max: 32 });
  c.boolean(raw, 'conicalTop', path);
  c.number(raw, 'baseOffset', path, -100, 100, { optional: true });
  checkThrustSteps(c, raw.thrustSteps, `${path}.thrustSteps`);
  return id;
}

/** Parts a stage drops on its way (`StageSpec.jettisons`): times rising from 0, masses within its dry mass. */
function checkJettisons(c: Checker, raw: unknown, path: string, dryMass: unknown): void {
  if (raw === undefined) return;
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 10) { c.add(path, `must be 1 to 10 parts dropped (got ${describe(raw)})`); return; }
  let last = -Infinity, total = 0;
  raw.forEach((j, i) => {
    const at = `${path}[${i}]`;
    if (!isObj(j)) { c.add(at, `must be a part dropped (got ${describe(j)})`); return; }
    c.known(j, at, ['t', 'mass', 'part']);
    const t = c.number(j, 't', at, 0, 2e4);
    const mass = c.number(j, 'mass', at, 0, PART_LIMITS.stageDryMass, { exclusiveMin: true });
    if (j.part !== 'interstage' && j.part !== 'tower' && j.part !== 'aftSkirt') c.add(`${at}.part`, 'must be "interstage", "tower" or "aftSkirt"');
    if (t !== undefined && !(t > last)) c.add(`${at}.t`, `must rise (got ${t})`);
    if (t !== undefined) last = t;
    if (mass !== undefined && j.part !== 'tower') total += mass;
  });
  if (typeof dryMass === 'number' && total >= dryMass) c.add(path, `must drop less than the stage's dry mass (${total} of ${dryMass} kg)`);
}

/** A stage's planned engine events (`StageSpec.engineEvents`): times rising, shutdowns of engines it has, or a mixture shift. */
function checkEngineEvents(c: Checker, raw: unknown, path: string, engine: unknown): void {
  if (raw === undefined) return;
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 10) { c.add(path, `must be 1 to 10 engine events (got ${describe(raw)})`); return; }
  const count = isObj(engine) && typeof engine.count === 'number' ? engine.count : 0;
  let last = -Infinity;
  raw.forEach((e, i) => {
    const at = `${path}[${i}]`;
    if (!isObj(e)) { c.add(at, `must be an engine event (got ${describe(e)})`); return; }
    c.known(e, at, ['t', 'shutdown', 'mixture']);
    const t = c.number(e, 't', at, 0, 2e4);
    if (t !== undefined && !(t > last)) c.add(`${at}.t`, `must rise (got ${t})`);
    if (t !== undefined) last = t;
    if (e.shutdown !== undefined && (!Array.isArray(e.shutdown) || !e.shutdown.every((n) => Number.isInteger(n) && n >= 0 && n < count))) {
      c.add(`${at}.shutdown`, `must list engines of the stage, 0 to ${count - 1}`);
    }
    if (e.mixture !== undefined) {
      if (!isObj(e.mixture)) c.add(`${at}.mixture`, 'must be an operating point');
      else {
        c.known(e.mixture, `${at}.mixture`, ['thrustVac', 'thrustSL', 'ispVac', 'ispSL']);
        c.number(e.mixture, 'thrustVac', `${at}.mixture`, 0, 2e7, { exclusiveMin: true });
        c.number(e.mixture, 'thrustSL', `${at}.mixture`, 0, 2e7);
        c.number(e.mixture, 'ispVac', `${at}.mixture`, 50, 480);
        c.number(e.mixture, 'ispSL', `${at}.mixture`, 0, 480);
      }
    }
  });
}

/** Planned thrust levels (`BoosterGroupSpec.thrustSteps`): times rising from 0, levels in [0, 1], a level-0 cut-off last. */
function checkThrustSteps(c: Checker, raw: unknown, path: string): void {
  if (raw === undefined) return;
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 20) { c.add(path, `must be 1 to 20 thrust steps (got ${describe(raw)})`); return; }
  let last = -Infinity;
  raw.forEach((step, i) => {
    if (!isObj(step)) { c.add(`${path}[${i}]`, `must be a thrust step (got ${describe(step)})`); return; }
    c.known(step, `${path}[${i}]`, ['t', 'level']);
    const t = c.number(step, 't', `${path}[${i}]`, 0, 2e4);
    const level = c.number(step, 'level', `${path}[${i}]`, 0, 1);
    if (level === 0 && i !== raw.length - 1) c.add(`${path}[${i}].level`, 'a cut-off (level 0) must be the last step');
    if (t !== undefined && !(t > last)) c.add(`${path}[${i}].t`, `must rise (got ${t})`);
    if (t !== undefined) last = t;
  });
}

function checkStage(c: Checker, raw: unknown, path: string, index: number, ids: string[]): void {
  if (!isObj(raw)) { c.add(path, `must be a stage (got ${describe(raw)})`); return; }
  c.known(raw, path, STAGE_FIELDS);
  const id = c.string(raw, 'id', path, { pattern: ID });
  if (id !== undefined) ids.push(id);
  c.string(raw, 'name', path);
  c.number(raw, 'dryMass', path, 0, PART_LIMITS.stageDryMass, { exclusiveMin: true });
  c.number(raw, 'propellantMass', path, 0, PART_LIMITS.stagePropellantMass, { exclusiveMin: true });
  checkEngine(c, raw.engine, `${path}.engine`, index === 0);
  c.number(raw, 'diameter', path, 0, PART_LIMITS.diameter, { exclusiveMin: true });
  c.number(raw, 'length', path, 0, PART_LIMITS.length, { exclusiveMin: true });
  for (const key of ['restartable', 'fins', 'gridFins', 'legs', 'flaps']) c.boolean(raw, key, path);
  c.number(raw, 'sepDelay', path, 0, 60, { optional: true });
  c.number(raw, 'ignitionDelay', path, 0, 60, { optional: true });
  c.number(raw, 'throttleWithBoosters', path, 0, 1, { optional: true, exclusiveMin: true });
  c.string(raw, 'color', path, { optional: true, max: 32 });
  c.string(raw, 'accentColor', path, { optional: true, max: 32 });
  if (raw.profile !== undefined && raw.profile !== 'r7Core' && raw.profile !== 'r7Upper') c.add(`${path}.profile`, 'must be "r7Core" or "r7Upper"');
  c.number(raw, 'nozzleLength', path, 0, 20, { optional: true, exclusiveMin: true });
  checkJettisons(c, raw.jettisons, `${path}.jettisons`, raw.dryMass);
  checkEngineEvents(c, raw.engineEvents, `${path}.engineEvents`, raw.engine);
  c.number(raw, 'cutoffAt', path, 0, 2e4, { optional: true, exclusiveMin: true });
  if (raw.hotStage !== undefined) {
    // hot staging (`StageSpec.hotStage`): a stage above the first, lit a moment before the one below is shut down
    if (!isObj(raw.hotStage)) c.add(`${path}.hotStage`, `must be { leadS } (got ${describe(raw.hotStage)})`);
    else if (index === 0) c.add(`${path}.hotStage`, 'the first stage has no stage below it to fire through');
    else {
      c.known(raw.hotStage, `${path}.hotStage`, ['leadS']);
      c.number(raw.hotStage, 'leadS', `${path}.hotStage`, 0, 10, { exclusiveMin: true });
    }
  }
  if (raw.boosters !== undefined) {
    if (!Array.isArray(raw.boosters)) c.add(`${path}.boosters`, `must be a list of strap-on groups (got ${describe(raw.boosters)})`);
    else if (index !== 0) c.add(`${path}.boosters`, 'strap-ons are flown on the first stage only');
    else if (raw.boosters.length > MAX_BOOSTER_GROUPS) c.add(`${path}.boosters`, `must have at most ${MAX_BOOSTER_GROUPS} groups`);
    else raw.boosters.forEach((b, i) => { const bid = checkBooster(c, b, `${path}.boosters[${i}]`); if (bid !== undefined) ids.push(bid); });
  }
}

/**
 * Everything wrong with a custom vehicle, or an empty list. `raw` is whatever
 * a file held; nothing is assumed about it.
 */
export function vehicleSpecProblems(raw: unknown): VehicleSpecIssue[] {
  const c = new Checker();
  if (!isObj(raw)) { c.add('', `must be a vehicle (got ${describe(raw)})`); return c.issues; }
  c.known(raw, '', VEHICLE_FIELDS);
  const id = c.string(raw, 'id', '', { pattern: ID });
  if (id !== undefined && isCatalogueVehicle(id)) c.add('id', `"${id}" is a catalogue vehicle's id: a custom vehicle needs an id of its own`);
  c.string(raw, 'name', '');
  c.string(raw, 'country', '', { max: 16 });
  c.string(raw, 'manufacturer', '', { allowEmpty: true });
  c.number(raw, 'height', '', 0, PART_LIMITS.height, { exclusiveMin: true });
  c.number(raw, 'payloadLEO', '', 0, 5e5);
  c.number(raw, 'payloadGTO', '', 0, 5e5);
  c.number(raw, 'payloadSSO', '', 0, 5e5, { optional: true });
  c.number(raw, 'maxQ', '', 0, 2e5, { exclusiveMin: true });
  c.number(raw, 'maxAccel', '', 0, 150, { exclusiveMin: true });
  c.number(raw, 'dragArea', '', 0, 200, { optional: true, exclusiveMin: true });
  c.number(raw, 'recoveryReserve', '', 0, 0.5, { optional: true });
  c.number(raw, 'returnReserve', '', 0, 0.5, { optional: true });
  for (const key of ['recoverable', 'crewCapable']) c.boolean(raw, key, '');
  c.number(raw, 'padBurnS', '', 0, 60, { optional: true });
  c.string(raw, 'notes', '', { optional: true, max: 2000, allowEmpty: true });

  let origin: VehicleSpec | undefined;
  if (raw.derivedFrom !== undefined) {
    if (typeof raw.derivedFrom !== 'string' || !isCatalogueVehicle(raw.derivedFrom)) c.add('derivedFrom', `must name a catalogue vehicle (got ${JSON.stringify(raw.derivedFrom)})`);
    else origin = vehicleById(raw.derivedFrom);
  }
  // G06's escape is modelled on the Soyuz's own tower, fairing motors and descent module
  if (raw.escapeSystem !== undefined && (raw.escapeSystem !== 'soyuz' || origin?.escapeSystem !== 'soyuz')) {
    c.add('escapeSystem', 'the only escape system is the Soyuz\'s, for a vehicle derived from one that has it');
  }

  if (raw.fairing !== null) {
    if (!isObj(raw.fairing)) c.add('fairing', `must be a fairing, or null for an integrated payload bay (got ${describe(raw.fairing)})`);
    else checkFairing(c, raw.fairing, 'fairing');
  }

  if (!Array.isArray(raw.stages) || raw.stages.length === 0) c.add('stages', `must be a list of 1 to ${MAX_STAGES} stages`);
  else if (raw.stages.length > MAX_STAGES) c.add('stages', `must have at most ${MAX_STAGES} stages (got ${raw.stages.length})`);
  else {
    const ids: string[] = [];
    raw.stages.forEach((st, i) => checkStage(c, st, `stages[${i}]`, i, ids));
    const seen = new Set<string>();
    for (const part of ids) {
      if (RESERVED_PART_IDS.includes(part)) c.add('stages', `"${part}" is an id the vehicle model uses for itself`);
      if (seen.has(part)) c.add('stages', `"${part}" names two parts: every stage and strap-on group needs its own id`);
      seen.add(part);
    }
  }

  if (!Array.isArray(raw.sites) || raw.sites.length === 0) c.add('sites', 'must list at least one launch site');
  else raw.sites.forEach((site, i) => {
    if (typeof site !== 'string' || !SITES.some((s) => s.id === site)) c.add(`sites[${i}]`, `must be a launch site's id (got ${JSON.stringify(site)})`);
  });

  if (raw.maxQThrottle !== undefined) {
    const m = raw.maxQThrottle;
    if (!isObj(m)) c.add('maxQThrottle', `must be a throttle bucket (got ${describe(m)})`);
    else {
      c.known(m, 'maxQThrottle', ['qStart', 'qEnd', 'throttle']);
      const start = c.number(m, 'qStart', 'maxQThrottle', 0, 2e5);
      const end = c.number(m, 'qEnd', 'maxQThrottle', 0, 2e5);
      if (start !== undefined && end !== undefined && end < start) c.add('maxQThrottle.qEnd', 'must not be below qStart');
      c.number(m, 'throttle', 'maxQThrottle', 0, 1, { exclusiveMin: true });
    }
  }
  for (const key of ['guidanceDefaults', 'guidanceDefaultsSixDof']) checkGuidance(c, raw[key], key);
  for (const key of ['crewedProfile', 'cargoShipProfile']) if (raw[key] !== undefined) checkProfile(c, raw[key], key, raw.stages);
  return c.issues;
}

function checkFairing(c: Checker, f: Obj, path: string): void {
  c.known(f, path, FAIRING_FIELDS);
  c.number(f, 'mass', path, 0, 2e4, { exclusiveMin: true });
  c.number(f, 'diameter', path, 0, 15, { exclusiveMin: true });
  const length = c.number(f, 'length', path, 0, 40, { exclusiveMin: true });
  c.number(f, 'sepAltitude', path, 0, 3e5);
  c.number(f, 'sepTime', path, 0, 2000, { optional: true });
  const adapter = c.number(f, 'adapter', path, 0, 40, { optional: true });
  if (adapter !== undefined && length !== undefined && adapter >= length) c.add(`${path}.adapter`, 'must be shorter than the fairing');
  const nose = c.number(f, 'noseLength', path, 0, 40, { optional: true, exclusiveMin: true });
  if (nose !== undefined && length !== undefined && nose + (adapter ?? 0) >= length) c.add(`${path}.noseLength`, 'must leave the fairing a cylinder');
  c.string(f, 'color', path, { optional: true, max: 32 });
}

function checkGuidance(c: Checker, g: unknown, key: string): void {
  if (g === undefined) return;
  if (!isObj(g)) { c.add(key, `must be a set of guidance values (got ${describe(g)})`); return; }
  c.known(g, key, [...Object.keys(GUIDANCE_BOUNDS), 'pitchProgram']);
  for (const [field, [min, max]] of Object.entries(GUIDANCE_BOUNDS)) c.number(g, field, key, min, max, { optional: true });
  checkPitchProgram(c, g.pitchProgram, `${key}.pitchProgram`);
}

/** What one kind of payload flies in place of the vehicle's own (`VehicleSpec.crewedProfile`, `cargoShipProfile`): a fairing, guidance, and stage cyclogram fields. */
function checkProfile(c: Checker, raw: unknown, path: string, stages: unknown): void {
  if (!isObj(raw)) { c.add(path, `must be a payload profile (got ${describe(raw)})`); return; }
  c.known(raw, path, ['fairing', 'guidanceDefaults', 'stages']);
  if (raw.fairing !== undefined) {
    if (!isObj(raw.fairing)) c.add(`${path}.fairing`, `must be a fairing (got ${describe(raw.fairing)})`);
    else checkFairing(c, raw.fairing, `${path}.fairing`);
  }
  checkGuidance(c, raw.guidanceDefaults, `${path}.guidanceDefaults`);
  if (raw.stages === undefined) return;
  const count = Array.isArray(stages) ? stages.length : 0;
  if (!Array.isArray(raw.stages) || raw.stages.length > count) { c.add(`${path}.stages`, `must be a list of at most ${count} stage cyclograms`); return; }
  raw.stages.forEach((st, i) => {
    const at = `${path}.stages[${i}]`;
    if (st === null) return;
    if (!isObj(st)) { c.add(at, `must be a stage's cyclogram, or null (got ${describe(st)})`); return; }
    c.known(st, at, ['cutoffAt', 'sepDelay', 'hotStage', 'jettisons']);
    c.number(st, 'cutoffAt', at, 0, 2e4, { optional: true, exclusiveMin: true });
    c.number(st, 'sepDelay', at, 0, 60, { optional: true });
    if (st.hotStage !== undefined) {
      if (!isObj(st.hotStage) || i === 0) c.add(`${at}.hotStage`, 'must be { leadS }, on a stage above the first');
      else {
        c.known(st.hotStage, `${at}.hotStage`, ['leadS']);
        c.number(st.hotStage, 'leadS', `${at}.hotStage`, 0, 10, { exclusiveMin: true });
      }
    }
    const own = Array.isArray(stages) && isObj(stages[i]) ? stages[i].dryMass : undefined;
    checkJettisons(c, st.jettisons, `${at}.jettisons`, own);
  });
}

/** The problems as one message, for an error thrown at a caller that sent a bad spec. */
export function vehicleSpecText(issues: readonly VehicleSpecIssue[]): string {
  return issues.map((i) => (i.path ? `${i.path} ${i.message}` : `the vehicle ${i.message}`)).join('; ');
}

export function assertVehicleSpec(raw: unknown): asserts raw is VehicleSpec {
  const issues = vehicleSpecProblems(raw);
  if (issues.length) throw new Error(`Invalid custom vehicle: ${vehicleSpecText(issues)}`);
}
